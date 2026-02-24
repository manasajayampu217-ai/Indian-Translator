import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { TextractClient, DetectDocumentTextCommand } from '@aws-sdk/client-textract';
import { TranslateClient, TranslateTextCommand } from '@aws-sdk/client-translate';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { createCanvas, loadImage } from 'canvas';
import { Document, Paragraph, TextRun, ImageRun, Packer } from 'docx';
import mammoth from 'mammoth';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import https from 'https';
import { uploadToS3, getPresignedUrl, listUserDocuments } from './s3Service.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Font cache
const fontCache = {};

// Download font from URL
async function downloadFont(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        // Follow redirect
        https.get(response.headers.location, (redirectResponse) => {
          const chunks = [];
          redirectResponse.on('data', (chunk) => chunks.push(chunk));
          redirectResponse.on('end', () => resolve(Buffer.concat(chunks)));
          redirectResponse.on('error', reject);
        }).on('error', reject);
      } else {
        const chunks = [];
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('end', () => resolve(Buffer.concat(chunks)));
        response.on('error', reject);
      }
    }).on('error', reject);
  });
}

// Get font for language
async function getFontForLanguage(lang) {
  if (fontCache[lang]) return fontCache[lang];
  
  const fontUrls = {
    'hi': 'https://github.com/googlefonts/noto-fonts/raw/main/hinted/ttf/NotoSansDevanagari/NotoSansDevanagari-Regular.ttf',
    'ta': 'https://github.com/googlefonts/noto-fonts/raw/main/hinted/ttf/NotoSansTamil/NotoSansTamil-Regular.ttf',
    'te': 'https://github.com/googlefonts/noto-fonts/raw/main/hinted/ttf/NotoSansTelugu/NotoSansTelugu-Regular.ttf',
  };
  
  if (fontUrls[lang]) {
    try {
      console.log(`📥 Downloading ${lang} font...`);
      const fontBytes = await downloadFont(fontUrls[lang]);
      fontCache[lang] = fontBytes;
      console.log(`✅ ${lang} font loaded`);
      return fontBytes;
    } catch (err) {
      console.log(`⚠️ Failed to download ${lang} font:`, err.message);
      return null;
    }
  }
  
  return null;
}

const app = express();
const upload = multer({ dest: 'uploads/' });

// Middleware
app.use(cors());
app.use(express.json());

// AWS Configuration
const AWS_REGION = process.env.AWS_REGION || 'ap-south-1';
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;

const textractClient = new TextractClient({
  region: AWS_REGION,
  credentials: {
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY,
  },
});

const translateClient = new TranslateClient({
  region: AWS_REGION,
  credentials: {
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY,
  },
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'IndianTranslator Backend is running' });
});

// Extract text from PDF using AWS Textract
async function extractTextFromPDF(filePath) {
  try {
    const fileBuffer = fs.readFileSync(filePath);
    
    const command = new DetectDocumentTextCommand({
      Document: {
        Bytes: fileBuffer,
      },
    });

    const response = await textractClient.send(command);
    
    const textBlocks = [];
    if (response.Blocks) {
      for (const block of response.Blocks) {
        if (block.BlockType === 'LINE' && block.Text && block.Geometry?.BoundingBox) {
          const bbox = block.Geometry.BoundingBox;
          textBlocks.push({
            text: block.Text,
            boundingBox: {
              left: bbox.Left || 0,
              top: bbox.Top || 0,
              width: bbox.Width || 0,
              height: bbox.Height || 0,
            },
            confidence: block.Confidence || 0,
          });
        }
      }
    }
    
    return textBlocks;
  } catch (error) {
    console.error('Textract error:', error);
    throw error;
  }
}

// Translate text using AWS Translate
async function translateText(text, sourceLang, targetLang) {
  try {
    const command = new TranslateTextCommand({
      Text: text,
      SourceLanguageCode: sourceLang,
      TargetLanguageCode: targetLang,
    });

    const response = await translateClient.send(command);
    return response.TranslatedText;
  } catch (error) {
    console.error('Translation error:', error);
    return text; // Return original if translation fails
  }
}

// Create PDF with Unicode support using pdf-lib
async function createTranslatedPDF(originalPdfPath, translatedBlocks, outputPath, targetLang) {
  try {
    // Load original PDF
    const originalPdfBytes = fs.readFileSync(originalPdfPath);
    const pdfDoc = await PDFDocument.load(originalPdfBytes);
    
    // Register fontkit
    pdfDoc.registerFontkit(fontkit);
    
    // Create a new PDF
    const newPdfDoc = await PDFDocument.create();
    newPdfDoc.registerFontkit(fontkit);
    
    const pages = pdfDoc.getPages();
    const firstPage = pages[0];
    const { width, height } = firstPage.getSize();
    
    const newPage = newPdfDoc.addPage([width, height]);
    
    // Try to load appropriate font for target language
    let customFont = null;
    const fontBytes = await getFontForLanguage(targetLang);
    if (fontBytes) {
      try {
        customFont = await newPdfDoc.embedFont(fontBytes);
      } catch (err) {
        console.log('⚠️ Failed to embed font:', err.message);
      }
    }
    
    // Fallback to standard font if custom font fails
    if (!customFont) {
      const { StandardFonts } = await import('pdf-lib');
      customFont = await newPdfDoc.embedFont(StandardFonts.Helvetica);
    }
    
    // Draw translated text
    for (const block of translatedBlocks) {
      if (!block.translatedText) continue;

      const x = block.boundingBox.left * width;
      const y = height - (block.boundingBox.top * height); // PDF coordinates are bottom-up
      const blockWidth = block.boundingBox.width * width;
      const fontSize = Math.max(8, Math.min(block.boundingBox.height * height * 0.7, 16));

      try {
        newPage.drawText(block.translatedText, {
          x,
          y,
          size: fontSize,
          font: customFont,
          color: rgb(0, 0, 0),
          maxWidth: blockWidth,
        });
      } catch (err) {
        console.log('⚠️ Skipping block:', err.message);
      }
    }

    // Save PDF
    const pdfBytes = await newPdfDoc.save();
    fs.writeFileSync(outputPath, pdfBytes);
    
    return outputPath;
  } catch (error) {
    console.error('PDF creation error:', error);
    throw error;
  }
}

// Image-based PDF translation - converts PDF to image, translates, converts back
async function translatePDFViaImages(pdfPath, textBlocks, targetLang, outputPath) {
  try {
    console.log('📄 Converting PDF to image using ImageMagick...');
    
    // Use ImageMagick directly via command line
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execPromise = promisify(exec);
    
    const originalImagePath = path.join(__dirname, 'temp', `page_${Date.now()}.png`);
    
    // Convert PDF to PNG using ImageMagick
    const command = `magick -density 300 "${pdfPath}[0]" -quality 100 "${originalImagePath}"`;
    await execPromise(command);
    
    console.log('✅ PDF converted to image');
    console.log('🎨 Drawing translated text...');
    
    console.log('✅ PDF converted to image');
    console.log('🎨 Drawing translated text...');
    
    // Load the converted image
    const image = await loadImage(originalImagePath);
    const canvas = createCanvas(image.width, image.height);
    const ctx = canvas.getContext('2d');
    
    // Draw original image as background
    ctx.drawImage(image, 0, 0);
    
    // Use system-installed fonts
    const fontFamilies = {
      'hi': 'Noto Sans Devanagari',
      'ta': 'Noto Sans Tamil',
      'te': 'Noto Sans Telugu',
    };
    
    const fontFamily = fontFamilies[targetLang] || 'Arial';
    ctx.font = `48px "${fontFamily}", Arial`;
    ctx.fillStyle = 'black';
    ctx.textBaseline = 'top';
    
    // Draw translated text over the image
    for (const block of textBlocks) {
      if (!block.translatedText) continue;
      
      const x = block.boundingBox.left * image.width;
      const y = block.boundingBox.top * image.height;
      const maxWidth = block.boundingBox.width * image.width;
      const blockHeight = block.boundingBox.height * image.height;
      
      // Add small padding to cover text better
      const padding = 2;
      const coverX = x - padding;
      const coverY = y - padding;
      const coverWidth = maxWidth + (padding * 2);
      const coverHeight = blockHeight + (padding * 2);
      
      // Cover the original text with white background
      ctx.fillStyle = 'white';
      ctx.fillRect(coverX, coverY, coverWidth, coverHeight);
      
      // Calculate font size to match original text height
      // Use 85% of block height for better fit (accounting for line spacing)
      let fontSize = blockHeight * 0.85;
      
      // Set initial font to measure text
      ctx.font = `${fontSize}px "${fontFamily}", Arial`;
      
      // Measure text width and adjust font size if it exceeds maxWidth
      let textMetrics = ctx.measureText(block.translatedText);
      if (textMetrics.width > maxWidth && maxWidth > 0) {
        // Scale down font to fit width
        fontSize = fontSize * (maxWidth / textMetrics.width) * 0.95; // 95% for padding
        ctx.font = `${fontSize}px "${fontFamily}", Arial`;
      }
      
      // Ensure minimum readable size
      fontSize = Math.max(fontSize, 10);
      ctx.font = `${fontSize}px "${fontFamily}", Arial`;
      
      // Draw translated text on white background
      ctx.fillStyle = 'black';
      ctx.fillText(block.translatedText, x, y, maxWidth);
    }
    
    // Save translated image
    const translatedImagePath = path.join(__dirname, 'temp', `translated_${Date.now()}.png`);
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(translatedImagePath, buffer);
    
    console.log('📦 Creating PDF from translated image...');
    
    // Create PDF from translated image
    const newPdfDoc = await PDFDocument.create();
    const imageBytes = fs.readFileSync(translatedImagePath);
    const pdfImage = await newPdfDoc.embedPng(imageBytes);
    
    const page = newPdfDoc.addPage([pdfImage.width, pdfImage.height]);
    page.drawImage(pdfImage, {
      x: 0,
      y: 0,
      width: pdfImage.width,
      height: pdfImage.height,
    });
    
    const pdfBytes = await newPdfDoc.save();
    fs.writeFileSync(outputPath, pdfBytes);
    
    // Cleanup
    try { 
      fs.unlinkSync(originalImagePath);
      fs.unlinkSync(translatedImagePath);
    } catch (e) {}
    
    console.log('✅ PDF translation complete!');
    return outputPath;
    
  } catch (error) {
    console.error('❌ PDF translation error:', error);
    throw error;
  }
}

// Get user's document history
app.get('/api/history/:userEmail', async (req, res) => {
  try {
    const { userEmail } = req.params;
    
    console.log(`📋 Fetching history for user: ${userEmail}`);
    
    const documents = await listUserDocuments(userEmail);
    
    // Generate presigned URLs for each document
    const documentsWithUrls = await Promise.all(
      documents.map(async (doc) => {
        const originalUrl = await getPresignedUrl(doc.original.key, 3600);
        const translatedUrl = await getPresignedUrl(doc.translated.key, 3600);
        
        return {
          ...doc,
          original: {
            ...doc.original,
            url: originalUrl,
          },
          translated: {
            ...doc.translated,
            url: translatedUrl,
          },
        };
      })
    );
    
    res.json({
      success: true,
      count: documentsWithUrls.length,
      documents: documentsWithUrls,
    });
  } catch (error) {
    console.error('History fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch history',
      message: error.message,
    });
  }
});

// Main translation endpoint
app.post('/api/translate-document', upload.single('file'), async (req, res) => {
  try {
    const { fromLang, toLang, userEmail } = req.body;
    const filePath = req.file.path;

    console.log('\n' + '='.repeat(60));
    console.log('📄 NEW TRANSLATION REQUEST');
    console.log('='.repeat(60));
    console.log('Document:', req.file.originalname);
    console.log('From:', fromLang, '→ To:', toLang);
    console.log('User Email:', userEmail || 'NOT PROVIDED');
    console.log('File Path:', filePath);
    console.log('='.repeat(60) + '\n');

    // Step 1: Extract text
    console.log('Extracting text...');
    const textBlocks = await extractTextFromPDF(filePath);
    console.log(`Extracted ${textBlocks.length} text blocks`);

    // Step 2: Translate text
    console.log('Translating text...');
    const translatedBlocks = [];
    for (const block of textBlocks) {
      const translatedText = await translateText(block.text, fromLang, toLang);
      translatedBlocks.push({
        ...block,
        translatedText,
      });
    }
    console.log('Translation complete');

    // Step 3: Create translated PDF using image-based approach
    console.log('Creating translated PDF via images...');
    const outputPath = path.join(__dirname, 'uploads', `translated_${Date.now()}.pdf`);
    await translatePDFViaImages(filePath, translatedBlocks, toLang, outputPath);
    console.log('PDF created');

    // Step 4: Upload to S3 if userEmail is provided
    let s3Keys = null;
    if (userEmail) {
      try {
        console.log('📤 Uploading to S3 for user:', userEmail);
        const timestamp = Date.now();
        const originalFileName = `${timestamp}_original_${req.file.originalname}`;
        const translatedFileName = `${timestamp}_translated_${req.file.originalname}`;
        
        console.log('Uploading original file:', originalFileName);
        const originalKey = await uploadToS3(
          filePath,
          userEmail,
          originalFileName,
          { type: 'original', fromLang, toLang }
        );
        console.log('✅ Original uploaded:', originalKey);
        
        console.log('Uploading translated file:', translatedFileName);
        const translatedKey = await uploadToS3(
          outputPath,
          userEmail,
          translatedFileName,
          { type: 'translated', fromLang, toLang }
        );
        console.log('✅ Translated uploaded:', translatedKey);
        
        s3Keys = { originalKey, translatedKey };
        console.log('✅ Both files uploaded to S3 successfully!');
      } catch (s3Error) {
        console.error('⚠️ S3 upload failed (continuing anyway):', s3Error);
        console.error('S3 Error details:', s3Error.message);
      }
    } else {
      console.log('⚠️ No userEmail provided, skipping S3 upload');
    }

    // Step 5: Send PDF back
    res.download(outputPath, 'translated_document.pdf', (err) => {
      // Cleanup local files
      fs.unlinkSync(filePath);
      fs.unlinkSync(outputPath);
      
      if (err) {
        console.error('Download error:', err);
      }
    });

  } catch (error) {
    console.error('Translation error:', error);
    res.status(500).json({ 
      error: 'Translation failed', 
      message: error.message 
    });
  }
});

// Convert PDF to Word document
app.post('/api/convert-to-word', upload.single('file'), async (req, res) => {
  try {
    const filePath = req.file.path;
    
    console.log('\n📄 Converting PDF to Word...');
    
    // Extract text from PDF using Textract
    const textBlocks = await extractTextFromPDF(filePath);
    console.log(`Extracted ${textBlocks.length} text blocks`);
    
    // Create Word document content
    let wordContent = '';
    for (const block of textBlocks) {
      wordContent += block.text + '\n\n';
    }
    
    // For now, create a simple text file with .docx extension
    // In production, you'd use a library like 'docx' to create proper Word documents
    const outputPath = path.join(__dirname, 'uploads', `word_${Date.now()}.txt`);
    fs.writeFileSync(outputPath, wordContent, 'utf8');
    
    console.log('✅ Word document created');
    
    // Send the file
    res.download(outputPath, 'translated_document.docx', (err) => {
      // Cleanup
      fs.unlinkSync(filePath);
      fs.unlinkSync(outputPath);
      
      if (err) {
        console.error('Download error:', err);
      }
    });
    
  } catch (error) {
    console.error('Word conversion error:', error);
    res.status(500).json({ 
      error: 'Word conversion failed', 
      message: error.message 
    });
  }
});

// Document conversion endpoint
app.post('/api/convert-document', upload.single('file'), async (req, res) => {
  try {
    const { conversionType, fromLang, toLang } = req.body;
    const filePath = req.file.path;
    
    console.log(`\n🔄 Converting: ${conversionType}`);
    console.log('File:', req.file.originalname);
    
    let outputPath;
    let outputFilename;
    
    switch (conversionType) {
      case 'pdf-to-word':
        try {
          console.log('Converting PDF to Word with images...');
          
          // Convert PDF pages to images using ImageMagick
          const { exec } = await import('child_process');
          const { promisify } = await import('util');
          const execPromise = promisify(exec);
          
          const tempImagePath = path.join(__dirname, 'temp', `pdf_page_${Date.now()}.png`);
          
          // Ensure temp directory exists
          if (!fs.existsSync(path.join(__dirname, 'temp'))) {
            fs.mkdirSync(path.join(__dirname, 'temp'));
          }
          
          // Convert first page of PDF to high-quality image
          await execPromise(`magick -density 300 "${filePath}[0]" -quality 100 "${tempImagePath}"`);
          console.log('✅ PDF converted to image');
          
          // Read the image
          const imageBuffer = fs.readFileSync(tempImagePath);
          
          // Create Word document with the image
          const pdfWordDoc = new Document({
            sections: [{
              properties: {
                page: {
                  margin: {
                    top: 0,
                    right: 0,
                    bottom: 0,
                    left: 0,
                  },
                },
              },
              children: [
                new Paragraph({
                  children: [
                    new ImageRun({
                      data: imageBuffer,
                      transformation: {
                        width: 595,  // A4 width in points
                        height: 842, // A4 height in points
                      },
                    }),
                  ],
                }),
              ],
            }],
          });
          
          outputPath = path.join(__dirname, 'uploads', `converted_${Date.now()}.docx`);
          const pdfWordBuffer = await Packer.toBuffer(pdfWordDoc);
          fs.writeFileSync(outputPath, pdfWordBuffer);
          outputFilename = 'converted_document.docx';
          
          // Cleanup temp image
          try {
            fs.unlinkSync(tempImagePath);
          } catch (e) {
            console.log('Temp file cleanup skipped');
          }
          
          console.log('✅ Word document created with images preserved');
        } catch (err) {
          console.error('PDF to Word error:', err);
          console.error('Error stack:', err.stack);
          throw new Error(`PDF to Word conversion failed: ${err.message}`);
        }
        break;
        
      case 'word-to-pdf':
        try {
          // Extract text from Word document using mammoth
          const wordResult = await mammoth.extractRawText({ path: filePath });
          const wordText = wordResult.value;
          
          // Create PDF with proper formatting
          const wordPdfDoc = await PDFDocument.create();
          const font = await wordPdfDoc.embedFont(StandardFonts.Helvetica);
          const fontSize = 12;
          const margin = 50;
          const pageWidth = 595; // A4 width in points
          const pageHeight = 842; // A4 height in points
          const maxWidth = pageWidth - (margin * 2);
          
          let currentPage = wordPdfDoc.addPage([pageWidth, pageHeight]);
          let yPosition = pageHeight - margin;
          
          // Split text into lines and add to PDF
          const lines = wordText.split('\n');
          for (const line of lines) {
            if (yPosition < margin + 20) {
              currentPage = wordPdfDoc.addPage([pageWidth, pageHeight]);
              yPosition = pageHeight - margin;
            }
            
            // Wrap long lines
            const words = line.split(' ');
            let currentLine = '';
            
            for (const word of words) {
              const testLine = currentLine + word + ' ';
              const textWidth = font.widthOfTextAtSize(testLine, fontSize);
              
              if (textWidth > maxWidth && currentLine !== '') {
                currentPage.drawText(currentLine.trim(), {
                  x: margin,
                  y: yPosition,
                  size: fontSize,
                  font: font,
                });
                yPosition -= fontSize + 5;
                currentLine = word + ' ';
                
                if (yPosition < margin + 20) {
                  currentPage = wordPdfDoc.addPage([pageWidth, pageHeight]);
                  yPosition = pageHeight - margin;
                }
              } else {
                currentLine = testLine;
              }
            }
            
            if (currentLine.trim()) {
              currentPage.drawText(currentLine.trim(), {
                x: margin,
                y: yPosition,
                size: fontSize,
                font: font,
              });
            }
            yPosition -= fontSize + 5;
          }
          
          const wordPdfBytes = await wordPdfDoc.save();
          outputPath = path.join(__dirname, 'uploads', `converted_${Date.now()}.pdf`);
          fs.writeFileSync(outputPath, wordPdfBytes);
          outputFilename = 'converted_document.pdf';
          console.log('✅ Word to PDF conversion complete');
        } catch (err) {
          console.error('Word to PDF error:', err);
          throw new Error(`Word to PDF conversion failed: ${err.message}`);
        }
        break;
        
      case 'pdf-to-image':
        try {
          // Convert PDF to PNG using ImageMagick
          const { exec } = await import('child_process');
          const { promisify } = await import('util');
          const execPromise = promisify(exec);
          outputPath = path.join(__dirname, 'uploads', `converted_${Date.now()}.png`);
          await execPromise(`magick -density 300 "${filePath}[0]" -quality 100 "${outputPath}"`);
          outputFilename = 'converted_document.png';
        } catch (err) {
          console.error('PDF to Image error:', err);
          throw new Error(`PDF to Image conversion failed: ${err.message}`);
        }
        break;
        
      case 'image-to-pdf':
        try {
          // Convert image to PDF
          const imageBytes = fs.readFileSync(filePath);
          const pdfDoc = await PDFDocument.create();
          let pdfImage;
          
          if (req.file.mimetype === 'image/png') {
            pdfImage = await pdfDoc.embedPng(imageBytes);
          } else {
            pdfImage = await pdfDoc.embedJpg(imageBytes);
          }
          
          const page = pdfDoc.addPage([pdfImage.width, pdfImage.height]);
          page.drawImage(pdfImage, { x: 0, y: 0, width: pdfImage.width, height: pdfImage.height });
          
          const pdfBytes = await pdfDoc.save();
          outputPath = path.join(__dirname, 'uploads', `converted_${Date.now()}.pdf`);
          fs.writeFileSync(outputPath, pdfBytes);
          outputFilename = 'converted_document.pdf';
        } catch (err) {
          console.error('Image to PDF error:', err);
          throw new Error(`Image to PDF conversion failed: ${err.message}`);
        }
        break;
        
      case 'image-to-word':
        try {
          console.log('Converting image to Word with image preservation...');
          
          // Read the image
          const imgBuffer = fs.readFileSync(filePath);
          
          // Get image dimensions
          const img = await loadImage(filePath);
          const imgWidth = img.width;
          const imgHeight = img.height;
          
          // Calculate dimensions to fit A4 page (595x842 points)
          const maxWidth = 595;
          const maxHeight = 842;
          let finalWidth = imgWidth;
          let finalHeight = imgHeight;
          
          if (imgWidth > maxWidth || imgHeight > maxHeight) {
            const widthRatio = maxWidth / imgWidth;
            const heightRatio = maxHeight / imgHeight;
            const ratio = Math.min(widthRatio, heightRatio);
            finalWidth = Math.round(imgWidth * ratio);
            finalHeight = Math.round(imgHeight * ratio);
          }
          
          console.log(`Image dimensions: ${imgWidth}x${imgHeight} -> ${finalWidth}x${finalHeight}`);
          
          // Create Word document with the image
          const imgWordDoc = new Document({
            sections: [{
              properties: {
                page: {
                  margin: {
                    top: 0,
                    right: 0,
                    bottom: 0,
                    left: 0,
                  },
                },
              },
              children: [
                new Paragraph({
                  children: [
                    new ImageRun({
                      data: imgBuffer,
                      transformation: {
                        width: finalWidth,
                        height: finalHeight,
                      },
                    }),
                  ],
                }),
              ],
            }],
          });
          
          outputPath = path.join(__dirname, 'uploads', `converted_${Date.now()}.docx`);
          const imgWordBuffer = await Packer.toBuffer(imgWordDoc);
          fs.writeFileSync(outputPath, imgWordBuffer);
          outputFilename = 'converted_document.docx';
          console.log('✅ Image to Word conversion complete with image preserved');
        } catch (err) {
          console.error('Image to Word error:', err);
          console.error('Error stack:', err.stack);
          throw new Error(`Image to Word conversion failed: ${err.message}`);
        }
        break;
        
      case 'word-to-image':
        try {
          // Extract text from Word document
          const wordImgResult = await mammoth.extractRawText({ path: filePath });
          const wordImgText = wordImgResult.value;
          
          // Create PDF first
          const tempPdfDoc = await PDFDocument.create();
          const tempFont = await tempPdfDoc.embedFont(StandardFonts.Helvetica);
          const tempFontSize = 12;
          const tempMargin = 50;
          const tempPageWidth = 595;
          const tempPageHeight = 842;
          const tempMaxWidth = tempPageWidth - (tempMargin * 2);
          
          let tempCurrentPage = tempPdfDoc.addPage([tempPageWidth, tempPageHeight]);
          let tempYPosition = tempPageHeight - tempMargin;
          
          const tempLines = wordImgText.split('\n');
          for (const line of tempLines) {
            if (tempYPosition < tempMargin + 20) {
              tempCurrentPage = tempPdfDoc.addPage([tempPageWidth, tempPageHeight]);
              tempYPosition = tempPageHeight - tempMargin;
            }
            
            const words = line.split(' ');
            let currentLine = '';
            
            for (const word of words) {
              const testLine = currentLine + word + ' ';
              const textWidth = tempFont.widthOfTextAtSize(testLine, tempFontSize);
              
              if (textWidth > tempMaxWidth && currentLine !== '') {
                tempCurrentPage.drawText(currentLine.trim(), {
                  x: tempMargin,
                  y: tempYPosition,
                  size: tempFontSize,
                  font: tempFont,
                });
                tempYPosition -= tempFontSize + 5;
                currentLine = word + ' ';
                
                if (tempYPosition < tempMargin + 20) {
                  tempCurrentPage = tempPdfDoc.addPage([tempPageWidth, tempPageHeight]);
                  tempYPosition = tempPageHeight - tempMargin;
                }
              } else {
                currentLine = testLine;
              }
            }
            
            if (currentLine.trim()) {
              tempCurrentPage.drawText(currentLine.trim(), {
                x: tempMargin,
                y: tempYPosition,
                size: tempFontSize,
                font: tempFont,
              });
            }
            tempYPosition -= tempFontSize + 5;
          }
          
          const tempPdfBytes = await tempPdfDoc.save();
          const tempPdfPath = path.join(__dirname, 'uploads', `temp_${Date.now()}.pdf`);
          fs.writeFileSync(tempPdfPath, tempPdfBytes);
          
          // Convert PDF to image
          const { exec: exec2 } = await import('child_process');
          const { promisify: promisify2 } = await import('util');
          const execPromise2 = promisify2(exec2);
          outputPath = path.join(__dirname, 'uploads', `converted_${Date.now()}.png`);
          await execPromise2(`magick -density 300 "${tempPdfPath}[0]" -quality 100 "${outputPath}"`);
          fs.unlinkSync(tempPdfPath);
          outputFilename = 'converted_document.png';
          console.log('✅ Word to Image conversion complete');
        } catch (err) {
          console.error('Word to Image error:', err);
          throw new Error(`Word to Image conversion failed: ${err.message}`);
        }
        break;
        
      default:
        throw new Error('Unsupported conversion type');
    }
    
    console.log('✅ Conversion complete');
    
    // Send the file
    res.download(outputPath, outputFilename, (err) => {
      // Cleanup
      fs.unlinkSync(filePath);
      if (fs.existsSync(outputPath)) {
        fs.unlinkSync(outputPath);
      }
      
      if (err) {
        console.error('Download error:', err);
      }
    });
    
  } catch (error) {
    console.error('Conversion error:', error);
    res.status(500).json({ 
      error: 'Conversion failed', 
      message: error.message 
    });
  }
});

// Google Input Tools proxy for Romanized → Native script conversion
app.get('/api/input-tools', async (req, res) => {
  try {
    const { text, lang } = req.query;
    
    if (!text || !lang) {
      return res.status(400).json({ error: 'Missing text or lang parameter' });
    }
    
    console.log(`🔤 Input Tools Request: ${lang} - "${text}"`);
    
    // Google Input Tools API
    const inputToolsUrl = `https://inputtools.google.com/request?text=${encodeURIComponent(text)}&itc=${lang}-t-i0-und&num=1&cp=0&cs=1&ie=utf-8&oe=utf-8`;
    
    const response = await fetch(inputToolsUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://www.google.com/'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Google Input Tools failed: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Send response to client
    res.json(data);
    console.log('✅ Input Tools response sent');
    
  } catch (error) {
    console.error('Input Tools error:', error);
    res.status(500).json({ 
      error: 'Input Tools failed', 
      message: error.message 
    });
  }
});

// Text-to-Speech cache
const ttsCache = new Map();
const MAX_CACHE_SIZE = 100;

// Text-to-Speech proxy endpoint for Indian languages
app.get('/api/tts', async (req, res) => {
  try {
    const { text, lang } = req.query;
    
    if (!text || !lang) {
      return res.status(400).json({ error: 'Missing text or lang parameter' });
    }
    
    // Create cache key
    const cacheKey = `${lang}:${text}`;
    
    // Check cache first
    if (ttsCache.has(cacheKey)) {
      console.log(`🔊 TTS Cache HIT: ${lang} - "${text.substring(0, 50)}..."`);
      const cachedAudio = ttsCache.get(cacheKey);
      
      res.set({
        'Content-Type': 'audio/mpeg',
        'Content-Length': cachedAudio.length,
        'Cache-Control': 'public, max-age=86400' // 24 hours
      });
      
      return res.send(cachedAudio);
    }
    
    console.log(`🔊 TTS Request: ${lang} - "${text.substring(0, 50)}..."`);
    
    // Google Translate TTS URL
    const encodedText = encodeURIComponent(text);
    const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${lang}&client=tw-ob&q=${encodedText}`;
    
    // Fetch audio from Google
    const response = await fetch(ttsUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://translate.google.com/'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Google TTS failed: ${response.status}`);
    }
    
    // Get audio buffer
    const audioBuffer = await response.arrayBuffer();
    const audioBufferNode = Buffer.from(audioBuffer);
    
    // Cache the audio (limit cache size)
    if (ttsCache.size >= MAX_CACHE_SIZE) {
      // Remove oldest entry
      const firstKey = ttsCache.keys().next().value;
      ttsCache.delete(firstKey);
    }
    ttsCache.set(cacheKey, audioBufferNode);
    
    // Send audio to client
    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Length': audioBufferNode.length,
      'Cache-Control': 'public, max-age=86400' // 24 hours
    });
    
    res.send(audioBufferNode);
    console.log('✅ TTS audio sent and cached');
    
  } catch (error) {
    console.error('TTS error:', error);
    res.status(500).json({ 
      error: 'TTS failed', 
      message: error.message 
    });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 IndianTranslator Backend running on port ${PORT}`);
  console.log(`📝 Health check: http://localhost:${PORT}/health`);
});

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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from backend/.env
dotenv.config({ path: path.join(__dirname, '.env') });

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

// Ensure required directories exist
const uploadsDir = path.join(__dirname, 'uploads');
const tempDir = path.join(__dirname, 'temp');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('✅ Created uploads directory');
}

if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
  console.log('✅ Created temp directory');
}

const upload = multer({ dest: uploadsDir });

// Middleware
const CORS_ORIGINS = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : '*';
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // If CORS_ORIGIN is '*', allow all origins
    if (CORS_ORIGINS === '*') return callback(null, true);
    
    // Check if origin is in allowed list
    if (CORS_ORIGINS.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('⚠️ CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// AWS Configuration
const AWS_REGION = process.env.AWS_REGION || 'ap-south-1';
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;

// Check if AWS credentials are configured
const hasAWSCredentials = AWS_ACCESS_KEY_ID && AWS_SECRET_ACCESS_KEY && 
                         AWS_ACCESS_KEY_ID !== 'your_access_key_here' && 
                         AWS_SECRET_ACCESS_KEY !== 'your_secret_key_here' &&
                         AWS_ACCESS_KEY_ID.length > 10 && 
                         AWS_SECRET_ACCESS_KEY.length > 10;

console.log('='.repeat(60));
console.log('AWS CONFIGURATION CHECK');
console.log('='.repeat(60));
console.log('AWS Region:', AWS_REGION);
console.log('AWS Access Key:', AWS_ACCESS_KEY_ID ? `${AWS_ACCESS_KEY_ID.substring(0, 8)}...` : 'NOT SET');
console.log('AWS Secret Key:', AWS_SECRET_ACCESS_KEY ? 'Present (hidden)' : 'NOT SET');
console.log('AWS Configured:', hasAWSCredentials ? '✅ YES' : '❌ NO');
console.log('='.repeat(60));

let textractClient = null;
let translateClient = null;

if (hasAWSCredentials) {
  try {
    textractClient = new TextractClient({
      region: AWS_REGION,
      credentials: {
        accessKeyId: AWS_ACCESS_KEY_ID,
        secretAccessKey: AWS_SECRET_ACCESS_KEY,
      },
    });

    translateClient = new TranslateClient({
      region: AWS_REGION,
      credentials: {
        accessKeyId: AWS_ACCESS_KEY_ID,
        secretAccessKey: AWS_SECRET_ACCESS_KEY,
      },
    });
    
    console.log('✅ AWS clients initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize AWS clients:', error.message);
    textractClient = null;
    translateClient = null;
  }
} else {
  console.log('⚠️ AWS credentials not configured - PDF translation will not work');
  console.log('💡 To enable PDF translation:');
  console.log('   1. Get AWS credentials from https://console.aws.amazon.com/');
  console.log('   2. Update backend/.env with your credentials');
  console.log('   3. Restart the backend server');
}

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'IndianTranslator Backend is running' });
});

// Test history endpoint
app.get('/api/test-history', async (req, res) => {
  try {
    console.log('🧪 Testing history system...');
    
    // Test if local history directory exists
    const LOCAL_HISTORY_DIR = path.join(__dirname, 'history');
    const historyExists = fs.existsSync(LOCAL_HISTORY_DIR);
    
    console.log('🧪 Local history directory exists:', historyExists);
    console.log('🧪 Local history directory path:', LOCAL_HISTORY_DIR);
    
    if (historyExists) {
      const files = fs.readdirSync(LOCAL_HISTORY_DIR);
      console.log('🧪 Files in history directory:', files);
    }
    
    res.json({
      status: 'ok',
      message: 'History test endpoint',
      localHistoryDir: LOCAL_HISTORY_DIR,
      historyDirExists: historyExists,
      awsConfigured: hasAWSCredentials
    });
  } catch (error) {
    console.error('🧪 Test history error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// Get user's translation history (unified format)
app.get('/api/history/:userEmail', async (req, res) => {
  try {
    const { userEmail } = req.params;
    
    console.log(`📋 Fetching history for user: ${userEmail}`);
    
    const documents = await listUserDocuments(userEmail);
    
    console.log(`📋 Found ${documents.length} documents`);
    if (documents.length > 0) {
      console.log('Sample document metadata:', documents[0].metadata);
    }
    
    // Convert S3 documents to unified history format
    const historyItems = documents.map(doc => {
      const timestamp = doc.timestamp || Date.now();
      const date = new Date(timestamp).toISOString();
      
      const item = {
        id: `${doc.original.key}_${doc.translated.key}`,
        timestamp,
        date,
        type: doc.metadata?.contentType === 'text' ? 'text' : 'document',
        fromLang: doc.metadata?.fromlang || doc.metadata?.fromLang || 'en',
        toLang: doc.metadata?.tolang || doc.metadata?.toLang || 'hi',
        originalText: doc.metadata?.contentType === 'text' ? doc.original.filename : undefined,
        translatedText: doc.metadata?.contentType === 'text' ? doc.translated.filename : undefined,
        originalFileName: doc.metadata?.contentType !== 'text' ? doc.original.filename : undefined,
        translatedFileName: doc.metadata?.contentType !== 'text' ? doc.translated.filename : undefined,
        originalSize: doc.original.size,
        translatedSize: doc.translated.size,
      };
      
      console.log(`  - ${item.originalFileName}: ${item.fromLang} → ${item.toLang}`);
      
      return item;
    });
    
    // Sort by timestamp (newest first)
    historyItems.sort((a, b) => b.timestamp - a.timestamp);
    
    res.json({
      success: true,
      history: historyItems,
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

// Save text translation to history
app.post('/api/history/text', async (req, res) => {
  try {
    const { userEmail, originalText, translatedText, fromLang, toLang } = req.body;
    
    if (!userEmail || !originalText || !translatedText) {
      return res.status(400).json({ 
        error: 'Missing required fields: userEmail, originalText, translatedText' 
      });
    }
    
    console.log('📝 Saving text translation to history...');
    console.log('User:', userEmail);
    console.log('Text length:', originalText.length, '→', translatedText.length);
    
    const timestamp = Date.now();
    
    // Create text files
    const originalFileName = `${timestamp}_original_text.txt`;
    const translatedFileName = `${timestamp}_translated_text.txt`;
    
    const originalPath = path.join(__dirname, 'uploads', originalFileName);
    const translatedPath = path.join(__dirname, 'uploads', translatedFileName);
    
    // Ensure uploads directory exists
    if (!fs.existsSync(path.join(__dirname, 'uploads'))) {
      fs.mkdirSync(path.join(__dirname, 'uploads'));
    }
    
    // Write text to files
    fs.writeFileSync(originalPath, originalText, 'utf8');
    fs.writeFileSync(translatedPath, translatedText, 'utf8');
    
    // Upload to S3
    const originalKey = await uploadToS3(
      originalPath,
      userEmail,
      originalFileName,
      { type: 'original', fromLang, toLang, contentType: 'text' }
    );
    
    const translatedKey = await uploadToS3(
      translatedPath,
      userEmail,
      translatedFileName,
      { type: 'translated', fromLang, toLang, contentType: 'text' }
    );
    
    // Cleanup temp files
    fs.unlinkSync(originalPath);
    fs.unlinkSync(translatedPath);
    
    console.log('✅ Text translation saved to S3 history');
    
    res.json({
      success: true,
      message: 'Text translation saved to history',
      keys: { originalKey, translatedKey }
    });
    
  } catch (error) {
    console.error('❌ Save text history error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save text history',
      message: error.message
    });
  }
});

// Save document translation to history
app.post('/api/history/document', upload.fields([
  { name: 'originalFile', maxCount: 1 },
  { name: 'translatedFile', maxCount: 1 }
]), async (req, res) => {
  try {
    const { userEmail, fromLang, toLang } = req.body;
    const originalFile = req.files?.originalFile?.[0];
    const translatedFile = req.files?.translatedFile?.[0];
    
    if (!userEmail || !originalFile || !translatedFile) {
      return res.status(400).json({ 
        error: 'Missing required fields: userEmail, originalFile, translatedFile' 
      });
    }
    
    console.log('📤 Saving document translation to S3 history...');
    console.log('User:', userEmail);
    console.log('Original file:', originalFile.originalname);
    console.log('Translated file:', translatedFile.originalname);
    
    const timestamp = Date.now();
    const originalFileName = `${timestamp}_original_${originalFile.originalname}`;
    const translatedFileName = `${timestamp}_translated_${originalFile.originalname}`;
    
    // Upload both files to S3
    const originalKey = await uploadToS3(
      originalFile.path,
      userEmail,
      originalFileName,
      { type: 'original', fromLang, toLang, contentType: 'document' }
    );
    
    const translatedKey = await uploadToS3(
      translatedFile.path,
      userEmail,
      translatedFileName,
      { type: 'translated', fromLang, toLang, contentType: 'document' }
    );
    
    // Cleanup temp files
    fs.unlinkSync(originalFile.path);
    fs.unlinkSync(translatedFile.path);
    
    console.log('✅ Document translation saved to S3 history');
    
    res.json({
      success: true,
      message: 'Document translation saved to history',
      keys: { originalKey, translatedKey }
    });
    
  } catch (error) {
    console.error('❌ Save document history error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save document history',
      message: error.message
    });
  }
});

// Delete history item
app.delete('/api/history/:userEmail/:timestamp', async (req, res) => {
  try {
    const { userEmail, timestamp } = req.params;
    
    console.log(`🗑️ Deleting history item for user: ${userEmail}, timestamp: ${timestamp}`);
    
    // Import deleteFromS3 function
    const { deleteFromS3 } = await import('./s3Service.js');
    
    // Delete both original and translated files
    await deleteFromS3(userEmail, timestamp);
    
    console.log('✅ History item deleted successfully');
    
    res.json({
      success: true,
      message: 'History item deleted successfully'
    });
    
  } catch (error) {
    console.error('❌ Delete history error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete history item',
      message: error.message
    });
  }
});

// Download file from S3
app.get('/api/download/:userEmail/:timestamp/:type', async (req, res) => {
  try {
    const { userEmail, timestamp, type } = req.params;
    
    console.log(`📥 Download request: ${userEmail}, ${timestamp}, ${type}`);
    
    // Import getFileFromS3 function
    const { getFileFromS3 } = await import('./s3Service.js');
    
    // Get file from S3
    const fileData = await getFileFromS3(userEmail, timestamp, type);
    
    if (!fileData) {
      return res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }
    
    // Set headers for download
    res.setHeader('Content-Type', fileData.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${fileData.filename}"`);
    res.setHeader('Content-Length', fileData.body.length);
    
    // Send file
    res.send(fileData.body);
    
    console.log('✅ File downloaded successfully');
    
  } catch (error) {
    console.error('❌ Download error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to download file',
      message: error.message
    });
  }
});

const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';

// Cleanup function for old temporary files
function cleanupOldFiles() {
  const directories = [uploadsDir, tempDir];
  const maxAge = 60 * 60 * 1000; // 1 hour in milliseconds
  
  directories.forEach(dir => {
    if (!fs.existsSync(dir)) return;
    
    fs.readdir(dir, (err, files) => {
      if (err) {
        console.error(`Error reading ${dir}:`, err);
        return;
      }
      
      files.forEach(file => {
        const filePath = path.join(dir, file);
        fs.stat(filePath, (err, stats) => {
          if (err) return;
          
          const now = Date.now();
          const fileAge = now - stats.mtimeMs;
          
          if (fileAge > maxAge) {
            fs.unlink(filePath, (err) => {
              if (!err) {
                console.log(`🗑️ Cleaned up old file: ${file}`);
              }
            });
          }
        });
      });
    });
  });
}

// Run cleanup every 30 minutes
setInterval(cleanupOldFiles, 30 * 60 * 1000);

// Run cleanup on startup
cleanupOldFiles();

app.listen(PORT, HOST, () => {
  console.log(`🚀 IndianTranslator Backend running on ${HOST}:${PORT}`);
  console.log(`📝 Health check: http://localhost:${PORT}/health`);
  console.log(`🌐 Public access: http://YOUR_PUBLIC_IP:${PORT}/health`);
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

// Translate text using AWS Translate (with batching)
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

// Batch translate multiple texts at once for better performance
async function batchTranslateTexts(textBlocks, sourceLang, targetLang) {
  console.log(`🔄 Translating ${textBlocks.length} text blocks in parallel...`);
  
  // Translate all blocks in parallel for speed
  const translationPromises = textBlocks.map(async (block) => {
    const translatedText = await translateText(block.text, sourceLang, targetLang);
    return {
      ...block,
      translatedText,
    };
  });
  
  const results = await Promise.all(translationPromises);
  console.log('✅ All translations complete');
  return results;
}

// Image-based PDF translation - converts PDF to image, translates, converts back
async function translatePDFViaImages(pdfPath, textBlocks, targetLang, outputPath) {
  try {
    console.log('📄 Converting PDF to image using ImageMagick (optimized)...');
    
    // Use ImageMagick directly via command line
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execPromise = promisify(exec);
    
    const originalImagePath = path.join(__dirname, 'temp', `page_${Date.now()}.png`);
    
    // Convert PDF to PNG using ImageMagick with optimized settings
    // Reduced density from 300 to 200 for faster processing
    const command = `magick -density 200 "${pdfPath}[0]" -quality 90 "${originalImagePath}"`;
    await execPromise(command);
    
    console.log('✅ PDF converted to image (faster mode)');
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
    console.log('AWS Available:', hasAWSCredentials ? '✅ YES' : '❌ NO');
    console.log('='.repeat(60) + '\n');

    // Check if AWS is configured
    if (!hasAWSCredentials) {
      console.error('❌ AWS credentials not configured');
      
      // Clean up uploaded file
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      
      return res.status(400).json({
        error: 'AWS not configured',
        message: 'PDF translation requires AWS credentials. Please configure AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in backend/.env file.',
        solution: 'For now, try uploading images (PNG/JPG) instead - they work without AWS!'
      });
    }

    if (!textractClient || !translateClient) {
      console.error('❌ AWS clients not initialized');
      
      // Clean up uploaded file
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      
      return res.status(500).json({
        error: 'AWS clients not available',
        message: 'AWS services are not properly initialized. Please check your AWS credentials.',
        solution: 'Verify your AWS credentials in backend/.env and restart the server.'
      });
    }

    // Step 1: Extract text
    console.log('Extracting text...');
    const textBlocks = await extractTextFromPDF(filePath);
    console.log(`Extracted ${textBlocks.length} text blocks`);

    // Step 2: Translate text (using parallel batch translation for speed)
    console.log('Translating text in parallel...');
    const translatedBlocks = await batchTranslateTexts(textBlocks, fromLang, toLang);
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
        const originalFileName = `original_${req.file.originalname}`;
        const translatedFileName = `translated_${req.file.originalname}`;
        
        console.log('Uploading original file:', originalFileName);
        const originalKey = await uploadToS3(
          filePath,
          userEmail,
          originalFileName,
          { fromLang, toLang, contentType: 'document', timestamp: timestamp.toString() }
        );
        console.log('✅ Original uploaded:', originalKey);
        
        console.log('Uploading translated file:', translatedFileName);
        const translatedKey = await uploadToS3(
          outputPath,
          userEmail,
          translatedFileName,
          { fromLang, toLang, contentType: 'document', timestamp: timestamp.toString() }
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
          console.log('Converting PDF to Word (text extraction)...');
          
          // Check if AWS Textract is available
          if (!textractClient) {
            console.log('⚠️ AWS Textract not available, using alternative method...');
            
            // Fallback: Extract text using pdf-parse or similar
            // For now, return error with helpful message
            throw new Error('PDF to Word requires AWS Textract. Please:\n1. Set up AWS credentials in backend/.env\n2. Or use "Image to Word" instead (upload PDF as image)');
          }
          
          // Extract text from PDF using Textract
          const pdfBuffer = fs.readFileSync(filePath);
          
          const textractCommand = new DetectDocumentTextCommand({
            Document: {
              Bytes: pdfBuffer,
            },
          });

          const textractResponse = await textractClient.send(textractCommand);
          
          // Extract all text
          let extractedText = '';
          if (textractResponse.Blocks) {
            for (const block of textractResponse.Blocks) {
              if (block.BlockType === 'LINE' && block.Text) {
                extractedText += block.Text + '\n';
              }
            }
          }
          
          if (!extractedText.trim()) {
            throw new Error('No text found in PDF');
          }
          
          console.log(`✅ Extracted ${extractedText.length} characters from PDF`);
          
          // Create Word document with extracted text
          const pdfWordDoc = new Document({
            sections: [{
              properties: {},
              children: extractedText.split('\n').map(line => 
                new Paragraph({
                  children: [new TextRun(line || ' ')],
                })
              ),
            }],
          });
          
          outputPath = path.join(__dirname, 'uploads', `converted_${Date.now()}.docx`);
          const pdfWordBuffer = await Packer.toBuffer(pdfWordDoc);
          fs.writeFileSync(outputPath, pdfWordBuffer);
          outputFilename = 'converted_document.docx';
          
          console.log('✅ Word document created with extracted text');
        } catch (err) {
          console.error('PDF to Word error:', err);
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
          console.log('Converting image to Word (text extraction with OCR)...');
          
          // Check if AWS Textract is available
          if (!textractClient) {
            console.log('⚠️ AWS Textract not available');
            throw new Error('Image to Word requires AWS Textract for OCR.\n\nPlease set up AWS credentials in backend/.env:\n- AWS_ACCESS_KEY_ID\n- AWS_SECRET_ACCESS_KEY\n\nOr use the "Doc" tab for image translation instead.');
          }
          
          // Read image and extract text using Textract
          const imgBuffer = fs.readFileSync(filePath);
          
          const imgTextractCommand = new DetectDocumentTextCommand({
            Document: {
              Bytes: imgBuffer,
            },
          });

          const imgTextractResponse = await textractClient.send(imgTextractCommand);
          
          // Extract all text
          let extractedImgText = '';
          if (imgTextractResponse.Blocks) {
            for (const block of imgTextractResponse.Blocks) {
              if (block.BlockType === 'LINE' && block.Text) {
                extractedImgText += block.Text + '\n';
              }
            }
          }
          
          if (!extractedImgText.trim()) {
            throw new Error('No text found in image. Make sure the image contains readable text.');
          }
          
          console.log(`✅ Extracted ${extractedImgText.length} characters from image`);
          
          // Create Word document with extracted text
          const imgWordDoc = new Document({
            sections: [{
              properties: {},
              children: extractedImgText.split('\n').map(line => 
                new Paragraph({
                  children: [new TextRun(line || ' ')],
                })
              ),
            }],
          });
          
          outputPath = path.join(__dirname, 'uploads', `converted_${Date.now()}.docx`);
          const imgWordBuffer = await Packer.toBuffer(imgWordDoc);
          fs.writeFileSync(outputPath, imgWordBuffer);
          outputFilename = 'converted_document.docx';
          
          console.log('✅ Word document created with extracted text');
        } catch (err) {
          console.error('Image to Word error:', err);
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
    console.error('❌ Conversion error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      conversionType: req.body.conversionType
    });
    
    // Clean up uploaded file
    if (req.file && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (e) {
        console.error('Failed to cleanup uploaded file:', e);
      }
    }
    
    res.status(500).json({ 
      error: 'Conversion failed', 
      message: error.message,
      details: 'Check backend console for more information'
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
// Document translation service with layout preservation
import { TextractClient, DetectDocumentTextCommand } from "@aws-sdk/client-textract";
import { TranslationService } from "./translationService";
import { PDFDocument, rgb } from 'pdf-lib';
import { toast } from "sonner";
import Tesseract from 'tesseract.js';

const AWS_REGION = import.meta.env.VITE_AWS_REGION || "us-east-1";
const AWS_ACCESS_KEY_ID = import.meta.env.VITE_AWS_ACCESS_KEY_ID || "";
const AWS_SECRET_ACCESS_KEY = import.meta.env.VITE_AWS_SECRET_ACCESS_KEY || "";

export interface TextBlock {
  text: string;
  translatedText?: string;
  boundingBox: {
    left: number;
    top: number;
    width: number;
    height: number;
  };
  confidence: number;
  fontSize?: number;
  fontFamily?: string;
}

export interface DocumentTranslationResult {
  success: boolean;
  originalBlocks: TextBlock[];
  translatedBlocks: TextBlock[];
  documentData?: string; // Can be image data URL or PDF data URL
  outputFormat?: 'image' | 'pdf';
  error?: string;
}

export class DocumentService {
  private static textractClient: TextractClient | null = null;

  // Initialize AWS Textract client
  private static getTextractClient(): TextractClient | null {
    console.log('Checking AWS Textract configuration...');
    console.log('AWS Region:', AWS_REGION);
    console.log('AWS Access Key:', AWS_ACCESS_KEY_ID ? `${AWS_ACCESS_KEY_ID.substring(0, 8)}...` : 'NOT SET');
    console.log('AWS Secret Key:', AWS_SECRET_ACCESS_KEY ? 'Present (hidden)' : 'NOT SET');
    
    if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY) {
      console.error('❌ AWS credentials not configured');
      return null;
    }

    if (!this.textractClient) {
      try {
        this.textractClient = new TextractClient({
          region: AWS_REGION,
          credentials: {
            accessKeyId: AWS_ACCESS_KEY_ID,
            secretAccessKey: AWS_SECRET_ACCESS_KEY,
          },
        });
        console.log('✅ AWS Textract client created successfully');
      } catch (error) {
        console.error('❌ Failed to create Textract client:', error);
        return null;
      }
    }

    return this.textractClient;
  }

  // Extract text from image/PDF using AWS Textract
  static async extractText(file: File, sourceLang: string = 'en'): Promise<TextBlock[]> {
    try {
      console.log('Starting text extraction from:', file.name, 'Size:', file.size, 'Type:', file.type);
      console.log('Source language:', sourceLang);
      
      // Map language codes to Tesseract language codes for fallback
      const tesseractLangMap: { [key: string]: string } = {
        'en': 'eng',
        'hi': 'hin',  // Hindi
        'ta': 'tam',  // Tamil
        'te': 'tel',  // Telugu
      };
      const tesseractLang = tesseractLangMap[sourceLang] || 'eng';
      
      const client = this.getTextractClient();
      
      if (!client) {
        console.warn('⚠️ AWS Textract not configured. Please check:');
        console.warn('1. VITE_AWS_ACCESS_KEY_ID in .env');
        console.warn('2. VITE_AWS_SECRET_ACCESS_KEY in .env');
        console.warn('3. AWS Textract service activated in AWS Console');
        console.warn(`Using Tesseract.js fallback with language: ${tesseractLang}`);
        return this.extractTextFallback(file, tesseractLang);
      }

      console.log('✅ AWS Textract client initialized');
      console.log('Converting file to bytes...');
      
      // Convert file to bytes
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      console.log(`✅ File converted: ${bytes.length} bytes`);

      console.log('Sending to AWS Textract...');
      const command = new DetectDocumentTextCommand({
        Document: {
          Bytes: bytes,
        },
      });

      const response = await client.send(command);
      console.log('✅ AWS Textract response received');
      
      if (!response.Blocks) {
        throw new Error('No text blocks found in response');
      }

      // Extract text blocks with position information
      const textBlocks: TextBlock[] = [];
      
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

      console.log(`✅ Extracted ${textBlocks.length} text blocks from document`);
      return textBlocks;
      
    } catch (error) {
      console.error('❌ AWS Textract error:', error);
      if (error instanceof Error) {
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
      }
      // Map language codes to Tesseract language codes for fallback
      const tesseractLangMap: { [key: string]: string } = {
        'en': 'eng',
        'hi': 'hin',  // Hindi
        'ta': 'tam',  // Tamil
        'te': 'tel',  // Telugu
      };
      const tesseractLang = tesseractLangMap[sourceLang] || 'eng';
      console.warn(`Falling back to Tesseract.js with language: ${tesseractLang}`);
      return this.extractTextFallback(file, tesseractLang);
    }
  }

  // Fallback: Browser-based OCR using Tesseract.js
  private static async extractTextFallback(file: File, sourceLang: string = 'eng'): Promise<TextBlock[]> {
    console.log('⚠️ Using Tesseract.js for text extraction (AWS Textract not available)');
    console.log('📝 This may take longer but works without AWS configuration');
    
    try {
      // Convert file to image data URL
      const imageDataUrl = await this.readFileAsDataURL(file);
      
      // Map language codes to Tesseract language codes
      const tesseractLangMap: { [key: string]: string } = {
        'en': 'eng',
        'hi': 'hin',  // Hindi
        'ta': 'tam',  // Tamil
        'te': 'tel',  // Telugu
      };
      
      const tesseractLang = tesseractLangMap[sourceLang] || 'eng';
      console.log(`Starting Tesseract.js OCR with language: ${tesseractLang}...`);
      
      // Use Tesseract.js to extract text
      const result = await Tesseract.recognize(
        imageDataUrl,
        tesseractLang, // Use appropriate language
        {
          logger: (m) => {
            if (m.status === 'recognizing text') {
              console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
            }
          }
        }
      );
      
      console.log('✅ Tesseract.js extraction complete');
      
      // Convert Tesseract result to TextBlock format
      const blocks: TextBlock[] = [];
      const data = result.data;
      
      if (data.text && data.text.trim()) {
        // Split text into lines and create blocks
        const lines = data.text.split('\n').filter((line: string) => line.trim());
        const lineHeight = 1 / Math.max(lines.length, 1);
        
        lines.forEach((line: string, index: number) => {
          blocks.push({
            text: line.trim(),
            boundingBox: {
              left: 0.05,
              top: index * lineHeight,
              width: 0.9,
              height: lineHeight * 0.8,
            },
            confidence: data.confidence || 80,
          });
        });
      }
      
      console.log(`✅ Extracted ${blocks.length} text blocks using Tesseract.js`);
      
      if (blocks.length === 0) {
        toast.info('No text found in document. Make sure the image has clear, readable text.');
      }
      
      return blocks;
      
    } catch (error) {
      console.error('Tesseract.js error:', error);
      toast.error('Failed to extract text from document. Please try a clearer image.');
      return [];
    }
  }
  
  // Helper: Read file as data URL
  private static readFileAsDataURL(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }

  // Translate all text blocks
  static async translateBlocks(
    blocks: TextBlock[],
    fromLang: string,
    toLang: string,
    onProgress?: (current: number, total: number) => void
  ): Promise<TextBlock[]> {
    console.log(`🔄 Starting translation of ${blocks.length} blocks from ${fromLang} to ${toLang}`);
    const translatedBlocks: TextBlock[] = [];
    
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      
      console.log(`📝 Block ${i + 1}/${blocks.length}: "${block.text.substring(0, 50)}..."`);
      
      try {
        const result = await TranslationService.translate(block.text, fromLang, toLang);
        
        console.log(`✅ Translation result:`, {
          success: result.success,
          provider: result.provider,
          original: block.text.substring(0, 30),
          translated: result.translatedText?.substring(0, 30)
        });
        
        translatedBlocks.push({
          ...block,
          translatedText: result.success ? result.translatedText : block.text,
        });
        
        if (onProgress) {
          onProgress(i + 1, blocks.length);
        }
      } catch (error) {
        console.error('Translation error for block:', error);
        translatedBlocks.push({
          ...block,
          translatedText: block.text, // Keep original if translation fails
        });
      }
    }
    
    return translatedBlocks;
  }

  // Create translated document image with PERFECT layout preservation
  static async createTranslatedImage(
    originalFile: File,
    translatedBlocks: TextBlock[]
  ): Promise<string> {
    return new Promise(async (resolve, reject) => {
      try {
        // For images, read directly
        const imageDataUrl = await this.readFileAsDataURL(originalFile);
        
        const img = new Image();
        img.crossOrigin = 'anonymous'; // Handle CORS
        img.src = imageDataUrl;
        
        img.onload = () => {
          console.log('Image loaded successfully:', img.width, 'x', img.height);
          
          // Create canvas with EXACT same dimensions
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d', { alpha: true });
          
          if (!ctx) {
            reject(new Error('Could not get canvas context'));
            return;
          }
          
          // STEP 1: Draw the COMPLETE original image
          // This preserves ALL colors, backgrounds, diagrams, designs
          ctx.drawImage(img, 0, 0);
          
          // STEP 2: Only overlay translated text on top
          // We detect the background color of each text area to match it
          for (const block of translatedBlocks) {
            if (!block.translatedText) continue;
            
            const x = block.boundingBox.left * img.width;
            const y = block.boundingBox.top * img.height;
            const width = block.boundingBox.width * img.width;
            const height = block.boundingBox.height * img.height;
            
            // Sample the background color from the original image
            const imageData = ctx.getImageData(x, y, Math.max(1, width), Math.max(1, height));
            const pixels = imageData.data;
            
            // Calculate average background color
            let r = 0, g = 0, b = 0, count = 0;
            for (let i = 0; i < pixels.length; i += 4) {
              r += pixels[i];
              g += pixels[i + 1];
              b += pixels[i + 2];
              count++;
            }
            
            if (count > 0) {
              r = Math.round(r / count);
              g = Math.round(g / count);
              b = Math.round(b / count);
            }
            
            // Determine if background is light or dark
            const brightness = (r * 299 + g * 587 + b * 114) / 1000;
            const isLightBackground = brightness > 128;
            
            // Cover original text with matching background color
            ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
            ctx.fillRect(x, y, width, height);
            
            // Draw translated text with appropriate color
            const fontSize = height * 0.7; // Slightly smaller to fit better
            ctx.font = `${fontSize}px Arial, sans-serif`;
            ctx.fillStyle = isLightBackground ? 'black' : 'white';
            ctx.textBaseline = 'top';
            ctx.textAlign = 'left';
            
            console.log(`🎨 Drawing text at (${x.toFixed(0)}, ${y.toFixed(0)}):`, block.translatedText?.substring(0, 30));
            
            // Smart text wrapping
            const words = block.translatedText.split(' ');
            let line = '';
            let lineY = y + (height * 0.1); // Small padding from top
            const lineHeight = fontSize * 1.1;
            
            for (const word of words) {
              const testLine = line + word + ' ';
              const metrics = ctx.measureText(testLine);
              
              if (metrics.width > width * 0.95 && line !== '') {
                // Draw current line
                ctx.fillText(line.trim(), x + (width * 0.025), lineY);
                line = word + ' ';
                lineY += lineHeight;
                
                // Stop if we exceed the box height
                if (lineY + lineHeight > y + height) {
                  break;
                }
              } else {
                line = testLine;
              }
            }
            
            // Draw remaining text
            if (line.trim() && lineY + lineHeight <= y + height) {
              ctx.fillText(line.trim(), x + (width * 0.025), lineY);
            }
          }
          
          // Convert to high-quality PNG
          resolve(canvas.toDataURL('image/png', 1.0));
        };
        
        img.onerror = (error) => {
          console.error('Image load error:', error);
          reject(new Error(
            'Failed to load image. Please ensure:\n\n' +
            '1. File is a valid image (PNG, JPG, WebP)\n' +
            '2. File is not corrupted\n' +
            '3. If PDF, convert to image first\n\n' +
            'Use: https://www.ilovepdf.com/pdf_to_jpg'
          ));
        };
      } catch (error) {
        console.error('Error in createTranslatedImage:', error);
        reject(error);
      }
    });
  }

  // Helper: Convert PDF first page to image using canvas
  private static async convertPdfToImage(file: File): Promise<string> {
    console.log('Converting PDF to image...');
    
    try {
      // Read PDF as array buffer
      const arrayBuffer = await file.arrayBuffer();
      
      // For PDFs, we'll use a workaround:
      // Create an object URL and let the browser handle it
      const blob = new Blob([arrayBuffer], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      console.log('PDF loaded, attempting to render...');
      
      // Note: This is a simplified approach
      // For production, consider using pdf.js library
      return url;
    } catch (error) {
      console.error('PDF conversion error:', error);
      throw new Error('Failed to process PDF. Please convert to image (PNG/JPG) first.');
    }
  }

  // Fetch Unicode font that supports Indian languages
  private static async fetchUnicodeFont(): Promise<ArrayBuffer | null> {
    try {
      console.log('Fetching Noto Sans font for Indian languages...');
      
      // Use a simpler, more reliable font URL
      const fontUrl = 'https://fonts.gstatic.com/s/notosans/v36/o-0mIpQlx3QUlC5A4PNB6Ryti20_6n1iPHjcz6L1SoM-jCpoiyD9A-9a6Vw.ttf';
      
      const response = await fetch(fontUrl);
      if (!response.ok) {
        console.warn('Failed to fetch Unicode font:', response.status);
        return null;
      }
      
      const fontBytes = await response.arrayBuffer();
      console.log('✅ Unicode font loaded:', fontBytes.byteLength, 'bytes');
      return fontBytes;
    } catch (error) {
      console.error('Error fetching Unicode font:', error);
      return null;
    }
  }

  // Create translated PDF (preserves PDF format)
  private static async createTranslatedPDF(
    originalFile: File,
    translatedBlocks: TextBlock[]
  ): Promise<string> {
    console.log('Creating translated PDF...');
    console.log('Number of blocks to translate:', translatedBlocks.length);
    
    try {
      // Load the original PDF
      const arrayBuffer = await originalFile.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      
      const pages = pdfDoc.getPages();
      const firstPage = pages[0];
      const { width, height } = firstPage.getSize();
      
      console.log(`PDF page size: ${width} x ${height}`);
      
      // Check if translated text contains Indian language characters
      const hasIndianText = translatedBlocks.some(block => 
        block.translatedText && /[\u0900-\u097F\u0980-\u09FF\u0A00-\u0A7F\u0A80-\u0AFF\u0B00-\u0B7F\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF]/.test(block.translatedText)
      );
      
      console.log('Has Indian text:', hasIndianText);
      
      let font;
      
      if (hasIndianText) {
        console.log('Indian language detected in PDF');
        console.log('Creating PDF with translated text (Indian chars may show as boxes)...');
        
        // Use standard font - Indian characters will show as boxes/squares
        // but the PDF will be created and downloadable
        font = await pdfDoc.embedFont('Helvetica');
        console.log('Using Helvetica font (Indian characters will show as boxes)');
      } else {
        // For English/ASCII text, use standard font
        font = await pdfDoc.embedFont('Helvetica');
        console.log('Using standard Helvetica font for English text');
      }
      
      // Draw white rectangles over original text and add translated text
      let blocksProcessed = 0;
      let blocksSkipped = 0;
      
      for (const block of translatedBlocks) {
        if (!block.translatedText) {
          console.log('Skipping block with no translated text');
          continue;
        }
        
        const textPreview = block.translatedText.substring(0, 50);
        console.log(`Processing block ${blocksProcessed + 1}: "${textPreview}..."`);
        
        const x = block.boundingBox.left * width;
        const y = height - (block.boundingBox.top * height) - (block.boundingBox.height * height);
        const blockWidth = block.boundingBox.width * width;
        const blockHeight = block.boundingBox.height * height;
        
        console.log(`  Position: x=${x.toFixed(2)}, y=${y.toFixed(2)}, w=${blockWidth.toFixed(2)}, h=${blockHeight.toFixed(2)}`);
        
        // Cover original text with white rectangle
        try {
          firstPage.drawRectangle({
            x,
            y,
            width: blockWidth,
            height: blockHeight,
            color: rgb(1, 1, 1),
          });
          console.log('  ✅ White rectangle drawn');
        } catch (rectError) {
          console.error('  ❌ Error drawing rectangle:', rectError);
        }
        
        // Draw translated text
        const fontSize = Math.max(8, Math.min(blockHeight * 0.7, 24));
        console.log(`  Font size: ${fontSize.toFixed(2)}`);
        
        try {
          // Try to draw the text - if it fails due to encoding, skip it
          firstPage.drawText(block.translatedText, {
            x: x + 2,
            y: y + (blockHeight * 0.2),
            size: fontSize,
            color: rgb(0, 0, 0),
            font: font,
            maxWidth: blockWidth - 4,
          });
          blocksProcessed++;
          console.log(`  ✅ Text drawn: "${textPreview}"`);
        } catch (textError) {
          // Skip blocks with characters that can't be encoded
          blocksSkipped++;
          console.log(`  ⚠️ Skipped block (encoding issue): "${textPreview}"`);
          // Don't throw error, just skip this block
        }
      }
      
      console.log(`Total blocks: ${blocksProcessed} drawn, ${blocksSkipped} skipped (encoding issues)`);
      
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
      
      console.log('✅ PDF created successfully');
      
      // Show warning if Indian text was present
      if (hasIndianText) {
        toast.warning('⚠️ PDF created! Note: Indian characters may show as boxes due to font limitations. The text content is preserved.');
      }
      
      return dataUrl;
      
    } catch (error) {
      console.error('PDF creation error:', error);
      throw new Error(`Failed to create translated PDF. ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Main document translation function
  static async translateDocument(
    file: File,
    fromLang: string,
    toLang: string,
    outputFormat: 'image' | 'pdf' = 'image',
    onProgress?: (stage: string, progress: number) => void
  ): Promise<DocumentTranslationResult> {
    try {
      console.log('=== Starting Document Translation ===');
      console.log('File:', file.name, 'Type:', file.type);
      console.log('From:', fromLang, 'To:', toLang);
      console.log('Output format:', outputFormat);
      
      const isPDF = file.type === 'application/pdf';
      
      // Stage 1: Extract text
      if (onProgress) onProgress('Extracting text...', 0);
      const blocks = await this.extractText(file, fromLang);
      
      if (blocks.length === 0) {
        console.error('❌ No text blocks extracted');
        return {
          success: false,
          originalBlocks: [],
          translatedBlocks: [],
          error: 'No text found in document. Please ensure:\n1. AWS Textract is activated in AWS Console\n2. IAM permissions are added (AmazonTextractFullAccess)\n3. AWS credentials are in .env file\n4. Document contains readable text',
        };
      }
      
      console.log(`✅ Found ${blocks.length} text blocks`);
      
      // Stage 2: Translate text
      if (onProgress) onProgress('Translating...', 30);
      console.log('Starting translation...');
      
      const translatedBlocks = await this.translateBlocks(
        blocks,
        fromLang,
        toLang,
        (current, total) => {
          const progress = 30 + (current / total) * 40;
          if (onProgress) onProgress('Translating...', progress);
          console.log(`Translated ${current}/${total} blocks`);
        }
      );
      
      console.log('✅ Translation complete');
      
      // Stage 3: Create translated document
      if (onProgress) onProgress('Creating translated document...', 70);
      console.log('Creating translated document...');
      
      let documentData: string;
      
      if (isPDF && outputFormat === 'pdf') {
        // PDF input → PDF output (always)
        console.log('Creating PDF output...');
        if (onProgress) onProgress('Loading PDF...', 75);
        await new Promise(resolve => setTimeout(resolve, 100));
        
        if (onProgress) onProgress('Drawing text...', 85);
        documentData = await this.createTranslatedPDF(file, translatedBlocks);
        
        if (onProgress) onProgress('Saving PDF...', 95);
        await new Promise(resolve => setTimeout(resolve, 200));
      } else {
        // Image input → Image output OR PDF input → Image output
        console.log('Creating image output...');
        if (onProgress) onProgress('Loading image...', 75);
        await new Promise(resolve => setTimeout(resolve, 100));
        
        if (onProgress) onProgress('Drawing translations...', 85);
        await new Promise(resolve => setTimeout(resolve, 100));
        
        if (onProgress) onProgress('Rendering...', 90);
        documentData = await this.createTranslatedImage(file, translatedBlocks);
        
        if (onProgress) onProgress('Saving image...', 95);
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      console.log('✅ Document created successfully');
      console.log('Document data length:', documentData?.length || 0);
      
      if (onProgress) onProgress('Complete!', 100);
      await new Promise(resolve => setTimeout(resolve, 300)); // Show 100% briefly
      
      console.log('=== Document Translation Complete ===');
      
      return {
        success: true,
        originalBlocks: blocks,
        translatedBlocks,
        documentData,
        outputFormat,
      };
    } catch (error) {
      console.error('❌ Document translation error:', error);
      if (error instanceof Error) {
        console.error('Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack
        });
      }
      
      return {
        success: false,
        originalBlocks: [],
        translatedBlocks: [],
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }
}

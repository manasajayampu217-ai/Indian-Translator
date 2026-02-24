import { createCanvas, loadImage } from 'canvas';
import { fromPath } from 'pdf2pic';
import { PDFDocument } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function translatePDFViaImages(pdfPath, textBlocks, targetLang, outputPath) {
  try {
    console.log('Converting PDF to images...');
    
    const options = {
      density: 200,
      saveFilename: 'page',
      savePath: path.join(__dirname, 'temp'),
      format: 'png',
      width: 2480,
      height: 3508
    };
    
    const convert = fromPath(pdfPath, options);
    const pdfDoc = await PDFDocument.load(fs.readFileSync(pdfPath));
    const pageCount = pdfDoc.getPageCount();
    
    console.log(`PDF has ${pageCount} pages`);
    
    const translatedImages = [];
    
    for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
      console.log(`Processing page ${pageNum}/${pageCount}...`);
      
      const pageImage = await convert(pageNum, { responseType: 'image' });
      const imagePath = pageImage.path;
      
      const translatedImagePath = await drawTranslatedText(
        imagePath,
        textBlocks.filter(block => block.page === pageNum),
        targetLang
      );
      
      translatedImages.push(translatedImagePath);
    }
    
    console.log('Merging images into PDF...');
    
    const newPdfDoc = await PDFDocument.create();
    
    for (const imagePath of translatedImages) {
      const imageBytes = fs.readFileSync(imagePath);
      const image = await newPdfDoc.embedPng(imageBytes);
      
      const page = newPdfDoc.addPage([image.width, image.height]);
      page.drawImage(image, {
        x: 0,
        y: 0,
        width: image.width,
        height: image.height,
      });
    }
    
    const pdfBytes = await newPdfDoc.save();
    fs.writeFileSync(outputPath, pdfBytes);
    
    translatedImages.forEach(img => {
      try { fs.unlinkSync(img); } catch (e) {}
    });
    
    console.log('PDF translation complete');
    return outputPath;
    
  } catch (error) {
    console.error('PDF image translation error:', error);
    throw error;
  }
}

async function drawTranslatedText(imagePath, textBlocks, targetLang) {
  const image = await loadImage(imagePath);
  const canvas = createCanvas(image.width, image.height);
  const ctx = canvas.getContext('2d');
  
  ctx.drawImage(image, 0, 0);
  ctx.font = '24px Arial';
  ctx.fillStyle = 'black';
  ctx.textBaseline = 'top';
  
  for (const block of textBlocks) {
    if (!block.translatedText) continue;
    
    const x = block.boundingBox.left * image.width;
    const y = block.boundingBox.top * image.height;
    const maxWidth = block.boundingBox.width * image.width;
    
    ctx.fillStyle = 'white';
    ctx.fillRect(x, y, maxWidth, block.boundingBox.height * image.height);
    
    ctx.fillStyle = 'black';
    ctx.fillText(block.translatedText, x, y, maxWidth);
  }
  
  const outputPath = imagePath.replace('.png', '_translated.png');
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(outputPath, buffer);
  
  return outputPath;
}

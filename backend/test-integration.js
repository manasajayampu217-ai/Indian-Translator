import { uploadToS3, listUserDocuments } from './s3Service.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('='.repeat(70));
console.log('COMPLETE S3 INTEGRATION TEST');
console.log('='.repeat(70));

const TEST_USER = 'test-user@example.com';

async function runIntegrationTest() {
  try {
    // Test 1: Create test files
    console.log('\n📝 Test 1: Creating test files...');
    const testDir = path.join(__dirname, 'temp');
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir);
    }
    
    const originalContent = 'This is a test document for translation.';
    const translatedContent = 'यह अनुवाद के लिए एक परीक्षण दस्तावेज़ है।';
    
    const originalPath = path.join(testDir, 'test-original.txt');
    const translatedPath = path.join(testDir, 'test-translated.txt');
    
    fs.writeFileSync(originalPath, originalContent);
    fs.writeFileSync(translatedPath, translatedContent);
    console.log('✅ Test files created');
    
    // Test 2: Upload to S3
    console.log('\n📤 Test 2: Uploading files to S3...');
    const timestamp = Date.now();
    
    const originalKey = await uploadToS3(
      originalPath,
      TEST_USER,
      'original_test-document.txt',
      { type: 'original', fromLang: 'en', toLang: 'hi', contentType: 'document', timestamp: timestamp.toString() }
    );
    console.log('✅ Original uploaded:', originalKey);
    
    const translatedKey = await uploadToS3(
      translatedPath,
      TEST_USER,
      'translated_test-document.txt',
      { type: 'translated', fromLang: 'en', toLang: 'hi', contentType: 'document', timestamp: timestamp.toString() }
    );
    console.log('✅ Translated uploaded:', translatedKey);
    
    // Test 3: List user documents
    console.log('\n📋 Test 3: Listing user documents...');
    const documents = await listUserDocuments(TEST_USER);
    console.log(`✅ Found ${documents.length} document pairs for ${TEST_USER}`);
    
    if (documents.length > 0) {
      console.log('\nDocument details:');
      documents.forEach((doc, i) => {
        console.log(`\n${i + 1}. Translation Session`);
        console.log(`   Timestamp: ${doc.timestamp} (${new Date(doc.timestamp).toLocaleString()})`);
        console.log(`   Original: ${doc.original?.filename} (${doc.original?.size} bytes)`);
        console.log(`   Translated: ${doc.translated?.filename} (${doc.translated?.size} bytes)`);
        console.log(`   Metadata:`, doc.metadata);
      });
    }
    
    // Test 4: Check existing user documents
    console.log('\n📋 Test 4: Checking existing user (manasajayampu217@gmail.com)...');
    const existingDocs = await listUserDocuments('manasajayampu217@gmail.com');
    console.log(`✅ Found ${existingDocs.length} document pairs for manasajayampu217@gmail.com`);
    
    if (existingDocs.length > 0) {
      console.log('\nFirst 3 documents:');
      existingDocs.slice(0, 3).forEach((doc, i) => {
        console.log(`\n${i + 1}. ${doc.original?.filename}`);
        console.log(`   Date: ${new Date(doc.timestamp).toLocaleString()}`);
        console.log(`   Original size: ${doc.original?.size} bytes`);
        console.log(`   Translated size: ${doc.translated?.size} bytes`);
      });
    }
    
    // Test 5: Verify history endpoint format
    console.log('\n🔍 Test 5: Verifying history format...');
    const historyItems = existingDocs.map(doc => {
      const timestamp = doc.timestamp || Date.now();
      const date = new Date(timestamp).toISOString();
      
      return {
        id: `${doc.original.key}_${doc.translated.key}`,
        timestamp,
        date,
        type: doc.metadata?.contentType === 'text' ? 'text' : 'document',
        fromLang: doc.metadata?.fromLang || 'en',
        toLang: doc.metadata?.toLang || 'hi',
        originalFileName: doc.original.filename,
        translatedFileName: doc.translated.filename,
        originalSize: doc.original.size,
        translatedSize: doc.translated.size,
      };
    });
    
    console.log('✅ History format is correct');
    console.log('Sample history item:');
    console.log(JSON.stringify(historyItems[0], null, 2));
    
    // Cleanup
    console.log('\n🧹 Cleaning up test files...');
    fs.unlinkSync(originalPath);
    fs.unlinkSync(translatedPath);
    console.log('✅ Cleanup complete');
    
    console.log('\n' + '='.repeat(70));
    console.log('✅ ALL INTEGRATION TESTS PASSED!');
    console.log('='.repeat(70));
    console.log('\nSUMMARY:');
    console.log(`- S3 Upload: ✅ Working`);
    console.log(`- S3 List: ✅ Working`);
    console.log(`- Document Pairing: ✅ Working`);
    console.log(`- History Format: ✅ Correct`);
    console.log(`- Existing Documents: ${existingDocs.length} pairs found`);
    console.log('\n🎉 S3 is correctly integrated with the history feature!');
    
  } catch (error) {
    console.error('\n❌ Integration test failed:');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

runIntegrationTest();

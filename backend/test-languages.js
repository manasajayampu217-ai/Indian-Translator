// Test script to verify all language translations work
import { TranslateClient, TranslateTextCommand } from '@aws-sdk/client-translate';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

// Check if AWS credentials are configured
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;
const hasCredentials = AWS_ACCESS_KEY_ID && AWS_SECRET_ACCESS_KEY && 
                      AWS_ACCESS_KEY_ID !== 'your_access_key_here' && 
                      AWS_SECRET_ACCESS_KEY !== 'your_secret_key_here';

let translateClient = null;

if (hasCredentials) {
  translateClient = new TranslateClient({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
      accessKeyId: AWS_ACCESS_KEY_ID,
      secretAccessKey: AWS_SECRET_ACCESS_KEY,
    },
  });
}

async function testTranslation(text, fromLang, toLang) {
  try {
    console.log(`\n🔄 Testing: ${fromLang} → ${toLang}`);
    console.log(`Input: "${text}"`);
    
    const command = new TranslateTextCommand({
      Text: text,
      SourceLanguageCode: fromLang,
      TargetLanguageCode: toLang,
    });

    const response = await translateClient.send(command);
    console.log(`✅ Output: "${response.TranslatedText}"`);
    return true;
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    return false;
  }
}

async function runTests() {
  console.log('='.repeat(60));
  console.log('AWS TRANSLATE LANGUAGE TEST');
  console.log('='.repeat(60));
  
  // Check credentials first
  console.log('AWS Access Key:', AWS_ACCESS_KEY_ID ? `${AWS_ACCESS_KEY_ID.substring(0, 8)}...` : 'NOT SET');
  console.log('AWS Secret Key:', AWS_SECRET_ACCESS_KEY ? 'Present (hidden)' : 'NOT SET');
  console.log('AWS Configured:', hasCredentials ? '✅ YES' : '❌ NO');
  console.log('');
  
  if (!hasCredentials) {
    console.log('❌ AWS credentials not configured!');
    console.log('');
    console.log('📋 To fix this:');
    console.log('1. Edit backend/.env file');
    console.log('2. Add your AWS credentials:');
    console.log('   AWS_ACCESS_KEY_ID=your_actual_key');
    console.log('   AWS_SECRET_ACCESS_KEY=your_actual_secret');
    console.log('3. Get credentials from: https://console.aws.amazon.com/');
    console.log('');
    console.log('💡 Alternative: Use IMAGE translation instead of PDF');
    console.log('   Images work without AWS and support all languages!');
    console.log('');
    return;
  }
  
  const tests = [
    // English to Indian languages
    { text: 'Hello, how are you?', from: 'en', to: 'hi', desc: 'English → Hindi' },
    { text: 'Hello, how are you?', from: 'en', to: 'ta', desc: 'English → Tamil' },
    { text: 'Hello, how are you?', from: 'en', to: 'te', desc: 'English → Telugu' },
    
    // Indian languages to English
    { text: 'नमस्ते, आप कैसे हैं?', from: 'hi', to: 'en', desc: 'Hindi → English' },
    { text: 'வணக்கம், நீங்கள் எப்படி இருக்கிறீர்கள்?', from: 'ta', to: 'en', desc: 'Tamil → English' },
    { text: 'హలో, మీరు ఎలా ఉన్నారు?', from: 'te', to: 'en', desc: 'Telugu → English' },
    
    // Between Indian languages
    { text: 'नमस्ते', from: 'hi', to: 'ta', desc: 'Hindi → Tamil' },
    { text: 'வணக்கம்', from: 'ta', to: 'te', desc: 'Tamil → Telugu' },
    { text: 'హలో', from: 'te', to: 'hi', desc: 'Telugu → Hindi' },
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    const result = await testTranslation(test.text, test.from, test.to);
    if (result) {
      passed++;
    } else {
      failed++;
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('TEST RESULTS');
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`Total: ${tests.length}`);
  
  if (failed === 0) {
    console.log('\n🎉 All language translations are working!');
  } else {
    console.log('\n⚠️ Some translations failed. Check AWS credentials and permissions.');
  }
}

runTests().catch(console.error);

import fetch from 'node-fetch';

const BACKEND_URL = 'http://localhost:3001';
const TEST_EMAIL = 'manasajayampu217@gmail.com';

console.log('Testing Download Endpoint...\n');

async function testDownload() {
  try {
    // First, get history to find a valid timestamp
    console.log('1. Fetching history to get a valid timestamp...');
    const historyResponse = await fetch(`${BACKEND_URL}/api/history/${encodeURIComponent(TEST_EMAIL)}`);
    const historyData = await historyResponse.json();
    
    if (!historyData.success || historyData.history.length === 0) {
      console.log('❌ No history found for testing');
      return;
    }
    
    const firstItem = historyData.history[0];
    console.log(`✅ Found history item: ${firstItem.originalFileName}`);
    console.log(`   Timestamp: ${firstItem.timestamp}`);
    
    // Test download original
    console.log('\n2. Testing download original...');
    const originalUrl = `${BACKEND_URL}/api/download/${encodeURIComponent(TEST_EMAIL)}/${firstItem.timestamp}/original`;
    console.log(`   URL: ${originalUrl}`);
    
    const originalResponse = await fetch(originalUrl);
    console.log(`   Status: ${originalResponse.status}`);
    console.log(`   Headers:`, Object.fromEntries(originalResponse.headers.entries()));
    
    if (originalResponse.ok) {
      const buffer = await originalResponse.arrayBuffer();
      console.log(`✅ Original downloaded: ${buffer.byteLength} bytes`);
    } else {
      const error = await originalResponse.text();
      console.log(`❌ Original download failed:`, error);
    }
    
    // Test download translated
    console.log('\n3. Testing download translated...');
    const translatedUrl = `${BACKEND_URL}/api/download/${encodeURIComponent(TEST_EMAIL)}/${firstItem.timestamp}/translated`;
    console.log(`   URL: ${translatedUrl}`);
    
    const translatedResponse = await fetch(translatedUrl);
    console.log(`   Status: ${translatedResponse.status}`);
    
    if (translatedResponse.ok) {
      const buffer = await translatedResponse.arrayBuffer();
      console.log(`✅ Translated downloaded: ${buffer.byteLength} bytes`);
    } else {
      const error = await translatedResponse.text();
      console.log(`❌ Translated download failed:`, error);
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

testDownload();

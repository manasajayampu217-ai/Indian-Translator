import fetch from 'node-fetch';

const BACKEND_URL = 'http://localhost:3001';
const TEST_EMAIL = 'manasajayampu217@gmail.com';

console.log('Testing History API...\n');

async function testHistory() {
  try {
    console.log(`Fetching history for: ${TEST_EMAIL}`);
    const response = await fetch(`${BACKEND_URL}/api/history/${encodeURIComponent(TEST_EMAIL)}`);
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    const data = await response.json();
    
    console.log('\nResponse data:');
    console.log(JSON.stringify(data, null, 2));
    
    if (data.success && data.history) {
      console.log(`\n✅ Found ${data.history.length} history items`);
      
      if (data.history.length > 0) {
        console.log('\nFirst 3 items:');
        data.history.slice(0, 3).forEach((item, i) => {
          console.log(`\n${i + 1}. ${item.originalFileName || item.originalText}`);
          console.log(`   From: ${item.fromLang} → To: ${item.toLang}`);
          console.log(`   Date: ${item.date}`);
          console.log(`   Type: ${item.type}`);
        });
      }
    } else {
      console.log('\n❌ No history found or error occurred');
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

testHistory();

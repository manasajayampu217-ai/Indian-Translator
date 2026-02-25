import { S3Client, ListBucketsCommand, PutObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

const AWS_REGION = process.env.AWS_REGION;
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;
const S3_BUCKET = process.env.AWS_S3_BUCKET;

console.log('='.repeat(60));
console.log('AWS S3 CONNECTION TEST');
console.log('='.repeat(60));
console.log('Region:', AWS_REGION);
console.log('Bucket:', S3_BUCKET);
console.log('Access Key:', AWS_ACCESS_KEY_ID ? `${AWS_ACCESS_KEY_ID.substring(0, 8)}...` : 'NOT SET');
console.log('Secret Key:', AWS_SECRET_ACCESS_KEY ? 'Present' : 'NOT SET');
console.log('='.repeat(60));

if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY) {
  console.error('❌ AWS credentials not found in .env file');
  process.exit(1);
}

const s3Client = new S3Client({
  region: AWS_REGION,
  credentials: {
    accessKeyId: AWS_ACCESS_KEY_ID.trim(),
    secretAccessKey: AWS_SECRET_ACCESS_KEY.trim(),
  },
});

async function testS3Connection() {
  try {
    // Test 1: List buckets
    console.log('\n📋 Test 1: Listing buckets...');
    const listBucketsCommand = new ListBucketsCommand({});
    const bucketsResponse = await s3Client.send(listBucketsCommand);
    console.log('✅ Successfully connected to AWS S3');
    console.log('Available buckets:', bucketsResponse.Buckets?.map(b => b.Name).join(', '));
    
    // Test 2: Check if our bucket exists
    const bucketExists = bucketsResponse.Buckets?.some(b => b.Name === S3_BUCKET);
    if (bucketExists) {
      console.log(`✅ Bucket "${S3_BUCKET}" exists`);
    } else {
      console.log(`⚠️ Bucket "${S3_BUCKET}" not found in your account`);
      return;
    }
    
    // Test 3: List objects in bucket
    console.log('\n📋 Test 2: Listing objects in bucket...');
    const listCommand = new ListObjectsV2Command({
      Bucket: S3_BUCKET,
      MaxKeys: 10,
    });
    const listResponse = await s3Client.send(listCommand);
    console.log(`✅ Found ${listResponse.KeyCount || 0} objects in bucket`);
    
    if (listResponse.Contents && listResponse.Contents.length > 0) {
      console.log('Sample objects:');
      listResponse.Contents.slice(0, 5).forEach(obj => {
        console.log(`  - ${obj.Key} (${obj.Size} bytes)`);
      });
    }
    
    // Test 4: Upload a test file
    console.log('\n📤 Test 3: Uploading test file...');
    const testContent = `Test file created at ${new Date().toISOString()}`;
    const testKey = `test/connection-test-${Date.now()}.txt`;
    
    const putCommand = new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: testKey,
      Body: testContent,
      ContentType: 'text/plain',
      Metadata: {
        testFile: 'true',
        createdAt: new Date().toISOString(),
      }
    });
    
    await s3Client.send(putCommand);
    console.log(`✅ Successfully uploaded test file: ${testKey}`);
    
    // Test 5: List user documents
    console.log('\n📋 Test 4: Checking for user documents...');
    const userListCommand = new ListObjectsV2Command({
      Bucket: S3_BUCKET,
      Prefix: 'users/',
    });
    const userListResponse = await s3Client.send(userListCommand);
    console.log(`✅ Found ${userListResponse.KeyCount || 0} user documents`);
    
    if (userListResponse.Contents && userListResponse.Contents.length > 0) {
      console.log('User documents:');
      userListResponse.Contents.forEach(obj => {
        console.log(`  - ${obj.Key} (${obj.Size} bytes, ${obj.LastModified})`);
      });
    } else {
      console.log('  - No user documents found yet (this is normal for a new setup)');
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ ALL TESTS PASSED - S3 is configured correctly!');
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('\n❌ S3 Connection Test Failed:');
    console.error('Error:', error.message);
    console.error('Error Code:', error.code);
    console.error('Error Name:', error.name);
    
    if (error.code === 'InvalidAccessKeyId') {
      console.error('\n💡 Solution: Check your AWS_ACCESS_KEY_ID in .env file');
    } else if (error.code === 'SignatureDoesNotMatch') {
      console.error('\n💡 Solution: Check your AWS_SECRET_ACCESS_KEY in .env file');
    } else if (error.code === 'AccessDenied') {
      console.error('\n💡 Solution: Your IAM user needs S3 permissions (s3:ListBucket, s3:PutObject, s3:GetObject)');
    } else if (error.code === 'NoSuchBucket') {
      console.error(`\n💡 Solution: Create bucket "${S3_BUCKET}" in AWS Console or update AWS_S3_BUCKET in .env`);
    }
    
    process.exit(1);
  }
}

testS3Connection();

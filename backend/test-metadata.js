import { S3Client, ListObjectsV2Command, HeadObjectCommand } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const BUCKET = process.env.AWS_S3_BUCKET;
const USER_EMAIL = 'manasajayampu217@gmail.com';

async function checkMetadata() {
  try {
    console.log('Checking S3 metadata for recent files...\n');
    
    const listCommand = new ListObjectsV2Command({
      Bucket: BUCKET,
      Prefix: `users/${USER_EMAIL}/`,
      MaxKeys: 5,
    });
    
    const listResponse = await s3Client.send(listCommand);
    
    if (!listResponse.Contents || listResponse.Contents.length === 0) {
      console.log('No files found');
      return;
    }
    
    console.log(`Found ${listResponse.Contents.length} files\n`);
    
    for (const item of listResponse.Contents) {
      console.log('='.repeat(70));
      console.log('File:', path.basename(item.Key));
      console.log('Full Key:', item.Key);
      
      try {
        const headCommand = new HeadObjectCommand({
          Bucket: BUCKET,
          Key: item.Key,
        });
        
        const headResponse = await s3Client.send(headCommand);
        
        console.log('Metadata:', JSON.stringify(headResponse.Metadata, null, 2));
        console.log('Content-Type:', headResponse.ContentType);
        
      } catch (error) {
        console.log('Error fetching metadata:', error.message);
      }
      
      console.log('');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkMetadata();

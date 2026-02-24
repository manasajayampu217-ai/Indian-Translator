import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const AWS_REGION = process.env.AWS_REGION || 'ap-south-1';
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;
const S3_BUCKET = process.env.AWS_S3_BUCKET || 'indiantranslator-documents';

console.log('S3 Service Configuration:');
console.log('Region:', AWS_REGION);
console.log('Bucket:', S3_BUCKET);
console.log('Access Key:', AWS_ACCESS_KEY_ID ? `${AWS_ACCESS_KEY_ID.substring(0, 8)}...` : 'NOT SET');
console.log('Secret Key:', AWS_SECRET_ACCESS_KEY ? 'Present' : 'NOT SET');

if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY) {
  console.error('❌ AWS credentials not configured for S3!');
}

// Validate credentials before creating client
if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY) {
  throw new Error('AWS credentials are not configured. Please check your .env file.');
}

// Trim any whitespace from credentials
const accessKeyId = AWS_ACCESS_KEY_ID.trim();
const secretAccessKey = AWS_SECRET_ACCESS_KEY.trim();

const s3Client = new S3Client({
  region: AWS_REGION,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

/**
 * Upload a file to S3
 * @param {string} filePath - Local file path
 * @param {string} userEmail - User's email for folder organization
 * @param {string} fileName - Desired file name in S3
 * @param {object} metadata - Additional metadata
 * @returns {Promise<string>} - S3 key of uploaded file
 */
export async function uploadToS3(filePath, userEmail, fileName, metadata = {}) {
  try {
    const fileContent = fs.readFileSync(filePath);
    const fileExtension = path.extname(fileName);
    const timestamp = Date.now();
    
    // Create user-specific path: users/{email}/{timestamp}_{filename}
    const s3Key = `users/${userEmail}/${timestamp}_${fileName}`;
    
    const command = new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: s3Key,
      Body: fileContent,
      ContentType: getContentType(fileExtension),
      Metadata: {
        userEmail,
        uploadedAt: new Date().toISOString(),
        ...metadata
      }
    });

    await s3Client.send(command);
    console.log(`✅ Uploaded to S3: ${s3Key}`);
    
    return s3Key;
  } catch (error) {
    console.error('❌ S3 upload error:', error);
    throw error;
  }
}

/**
 * Get a presigned URL for downloading a file
 * @param {string} s3Key - S3 object key
 * @param {number} expiresIn - URL expiration in seconds (default: 1 hour)
 * @returns {Promise<string>} - Presigned URL
 */
export async function getPresignedUrl(s3Key, expiresIn = 3600) {
  try {
    const command = new GetObjectCommand({
      Bucket: S3_BUCKET,
      Key: s3Key,
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn });
    return url;
  } catch (error) {
    console.error('❌ Error generating presigned URL:', error);
    throw error;
  }
}

/**
 * List all documents for a specific user
 * @param {string} userEmail - User's email
 * @returns {Promise<Array>} - Array of document objects
 */
export async function listUserDocuments(userEmail) {
  try {
    const prefix = `users/${userEmail}/`;
    
    const command = new ListObjectsV2Command({
      Bucket: S3_BUCKET,
      Prefix: prefix,
    });

    const response = await s3Client.send(command);
    
    if (!response.Contents || response.Contents.length === 0) {
      return [];
    }

    // Group documents by translation session
    const documents = [];
    const sessions = {};

    for (const item of response.Contents) {
      const key = item.Key;
      const fileName = path.basename(key);
      
      // Extract timestamp and type from filename
      const match = fileName.match(/^(\d+)_(original|translated)_(.+)$/);
      if (match) {
        const [, timestamp, type, originalName] = match;
        
        if (!sessions[timestamp]) {
          sessions[timestamp] = {
            timestamp: parseInt(timestamp),
            date: new Date(parseInt(timestamp)).toISOString(),
          };
        }
        
        sessions[timestamp][type] = {
          key,
          fileName: originalName,
          size: item.Size,
          lastModified: item.LastModified,
        };
      }
    }

    // Convert sessions object to array
    for (const [timestamp, session] of Object.entries(sessions)) {
      if (session.original && session.translated) {
        documents.push(session);
      }
    }

    // Sort by timestamp (newest first)
    documents.sort((a, b) => b.timestamp - a.timestamp);

    return documents;
  } catch (error) {
    console.error('❌ Error listing user documents:', error);
    throw error;
  }
}

/**
 * Get content type based on file extension
 */
function getContentType(extension) {
  const types = {
    '.pdf': 'application/pdf',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
  };
  return types[extension.toLowerCase()] || 'application/octet-stream';
}

export default {
  uploadToS3,
  getPresignedUrl,
  listUserDocuments,
};

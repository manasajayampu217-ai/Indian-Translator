import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from backend/.env
dotenv.config({ path: path.join(__dirname, '.env') });

const AWS_REGION = process.env.AWS_REGION || 'ap-south-1';
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;
const S3_BUCKET = process.env.AWS_S3_BUCKET || 'indiantranslator-documents';

console.log('S3 Service Configuration:');
console.log('Region:', AWS_REGION);
console.log('Bucket:', S3_BUCKET);
console.log('Access Key:', AWS_ACCESS_KEY_ID ? `${AWS_ACCESS_KEY_ID.substring(0, 8)}...` : 'NOT SET');
console.log('Secret Key:', AWS_SECRET_ACCESS_KEY ? 'Present' : 'NOT SET');

// Check if AWS credentials are available
const AWS_AVAILABLE = AWS_ACCESS_KEY_ID && AWS_SECRET_ACCESS_KEY;

if (!AWS_AVAILABLE) {
  console.log('⚠️ AWS credentials not found. Using local file storage for history.');
} else {
  console.log('✅ AWS credentials found. Using S3 for history storage.');
}

// Create S3 client only if credentials are available
let s3Client = null;
if (AWS_AVAILABLE) {
  try {
    const accessKeyId = AWS_ACCESS_KEY_ID.trim();
    const secretAccessKey = AWS_SECRET_ACCESS_KEY.trim();

    s3Client = new S3Client({
      region: AWS_REGION,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  } catch (error) {
    console.error('❌ Failed to create S3 client:', error);
  }
}

// Local storage directory for history when AWS is not available
const LOCAL_HISTORY_DIR = path.join(__dirname, 'history');

// Ensure local history directory exists
if (!AWS_AVAILABLE) {
  if (!fs.existsSync(LOCAL_HISTORY_DIR)) {
    fs.mkdirSync(LOCAL_HISTORY_DIR, { recursive: true });
  }
}

/**
 * Upload a file to S3 or local storage
 * @param {string} filePath - Local file path
 * @param {string} userEmail - User's email for folder organization
 * @param {string} fileName - Desired file name
 * @param {object} metadata - Additional metadata
 * @returns {Promise<string>} - S3 key or local path of uploaded file
 */
export async function uploadToS3(filePath, userEmail, fileName, metadata = {}) {
  if (AWS_AVAILABLE && s3Client) {
    return uploadToS3Real(filePath, userEmail, fileName, metadata);
  } else {
    return uploadToLocal(filePath, userEmail, fileName, metadata);
  }
}

/**
 * Upload to actual S3
 */
async function uploadToS3Real(filePath, userEmail, fileName, metadata = {}) {
  try {
    console.log('📤 S3 Upload Starting:');
    console.log('  - File:', filePath);
    console.log('  - User:', userEmail);
    console.log('  - Filename:', fileName);
    console.log('  - Metadata:', JSON.stringify(metadata));
    
    const fileContent = fs.readFileSync(filePath);
    const fileExtension = path.extname(fileName);
    
    // Use timestamp from metadata if provided, otherwise create new one
    const timestamp = metadata.timestamp || Date.now();
    
    // Create user-specific path: users/{email}/{timestamp}_{filename}
    const s3Key = `users/${userEmail}/${timestamp}_${fileName}`;
    
    console.log('  - S3 Key:', s3Key);
    console.log('  - Bucket:', S3_BUCKET);
    console.log('  - File size:', fileContent.length, 'bytes');
    
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
    console.log(`✅ Uploaded to S3 successfully: ${s3Key}`);
    
    return s3Key;
  } catch (error) {
    console.error('❌ S3 upload error:', error);
    console.error('Error details:', error.message);
    console.error('Error code:', error.code);
    throw error;
  }
}

/**
 * Upload to local storage
 */
async function uploadToLocal(filePath, userEmail, fileName, metadata = {}) {
  try {
    const timestamp = Date.now();
    const userDir = path.join(LOCAL_HISTORY_DIR, userEmail);
    
    // Ensure user directory exists
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }
    
    const localFileName = `${timestamp}_${fileName}`;
    const localPath = path.join(userDir, localFileName);
    
    // Copy file to local history
    fs.copyFileSync(filePath, localPath);
    
    // Save metadata
    const metadataPath = localPath + '.meta.json';
    const metadataContent = {
      userEmail,
      uploadedAt: new Date().toISOString(),
      originalPath: filePath,
      ...metadata
    };
    fs.writeFileSync(metadataPath, JSON.stringify(metadataContent, null, 2));
    
    console.log(`✅ Uploaded to local storage: ${localPath}`);
    
    // Return a key similar to S3 format
    return `local/users/${userEmail}/${localFileName}`;
  } catch (error) {
    console.error('❌ Local upload error:', error);
    throw error;
  }
}

/**
 * Get a presigned URL for downloading a file (or local path)
 * @param {string} key - S3 object key or local key
 * @param {number} expiresIn - URL expiration in seconds (default: 1 hour)
 * @returns {Promise<string>} - Presigned URL or local file path
 */
export async function getPresignedUrl(key, expiresIn = 3600) {
  if (key.startsWith('local/')) {
    // For local files, return the file path (in production, you'd serve these via HTTP)
    const localPath = key.replace('local/', '');
    return `/history/${localPath}`;
  }
  
  if (AWS_AVAILABLE && s3Client) {
    try {
      const command = new GetObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
      });

      const url = await getSignedUrl(s3Client, command, { expiresIn });
      return url;
    } catch (error) {
      console.error('❌ Error generating presigned URL:', error);
      throw error;
    }
  }
  
  throw new Error('Neither AWS S3 nor local storage is available');
}

/**
 * List all documents for a specific user
 * @param {string} userEmail - User's email
 * @returns {Promise<Array>} - Array of document objects
 */
export async function listUserDocuments(userEmail) {
  if (AWS_AVAILABLE && s3Client) {
    return listUserDocumentsS3(userEmail);
  } else {
    return listUserDocumentsLocal(userEmail);
  }
}

/**
 * List documents from S3
 */
async function listUserDocumentsS3(userEmail) {
  try {
    const prefix = `users/${userEmail}/`;
    
    console.log('📋 Listing S3 documents:');
    console.log('  - Bucket:', S3_BUCKET);
    console.log('  - Prefix:', prefix);
    
    const command = new ListObjectsV2Command({
      Bucket: S3_BUCKET,
      Prefix: prefix,
    });

    const response = await s3Client.send(command);
    
    console.log('  - Found', response.Contents?.length || 0, 'objects');
    
    if (!response.Contents || response.Contents.length === 0) {
      console.log('  - No documents found for user');
      return [];
    }

    // Get metadata for each object
    const { HeadObjectCommand } = await import('@aws-sdk/client-s3');
    
    const itemsWithMetadata = await Promise.all(
      response.Contents.map(async (item) => {
        const key = item.Key;
        const fileName = path.basename(key);
        
        // Extract timestamp from S3 key (format: users/{email}/{timestamp}_{filename})
        // Try multiple filename formats:
        // Format 1: {timestamp}_original_{filename} or {timestamp}_translated_{filename}
        // Format 2: {timestamp1}_{timestamp2}_original_{filename} (legacy format)
        let match = fileName.match(/^(\d+)_(original|translated)_(.+)$/);
        
        if (!match) {
          // Try legacy format with two timestamps
          match = fileName.match(/^(\d+)_\d+_(original|translated)_(.+)$/);
        }
        
        let timestamp = null;
        let type = null;
        let originalName = null;
        
        if (match) {
          timestamp = parseInt(match[1]);
          type = match[2];
          originalName = match[3];
        } else {
          console.log('  - Could not parse filename:', fileName);
        }
        
        // Fetch metadata from S3
        let metadata = {};
        try {
          const headCommand = new HeadObjectCommand({
            Bucket: S3_BUCKET,
            Key: key,
          });
          const headResponse = await s3Client.send(headCommand);
          metadata = headResponse.Metadata || {};
        } catch (error) {
          console.log('  - Could not fetch metadata for:', fileName);
        }
        
        return {
          key,
          size: item.Size,
          lastModified: item.LastModified,
          timestamp,
          type,
          filename: originalName || fileName,
          metadata,
        };
      })
    );
    
    const processed = processDocumentListWithMetadata(itemsWithMetadata);
    
    console.log('  - Processed into', processed.length, 'document pairs');
    
    return processed;
  } catch (error) {
    console.error('❌ Error listing user documents from S3:', error);
    console.error('Error details:', error.message);
    throw error;
  }
}

/**
 * List documents from local storage
 */
async function listUserDocumentsLocal(userEmail) {
  try {
    const userDir = path.join(LOCAL_HISTORY_DIR, userEmail);
    
    if (!fs.existsSync(userDir)) {
      return [];
    }
    
    const files = fs.readdirSync(userDir);
    const items = [];
    
    for (const file of files) {
      if (file.endsWith('.meta.json')) continue; // Skip metadata files
      
      const filePath = path.join(userDir, file);
      const stats = fs.statSync(filePath);
      const key = `local/users/${userEmail}/${file}`;
      
      // Try to read metadata
      let metadata = {};
      const metadataPath = filePath + '.meta.json';
      if (fs.existsSync(metadataPath)) {
        try {
          metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
        } catch (e) {
          console.warn('Failed to read metadata for', file);
        }
      }
      
      items.push({
        key,
        size: stats.size,
        lastModified: stats.mtime,
        metadata,
      });
    }
    
    return processDocumentList(items, (item) => item);
  } catch (error) {
    console.error('❌ Error listing user documents from local storage:', error);
    throw error;
  }
}

/**
 * Process document list to group by translation sessions (with metadata)
 */
function processDocumentListWithMetadata(items) {
  const sessions = {};

  for (const item of items) {
    if (!item.timestamp || !item.type) {
      console.log('  - Skipping item without timestamp/type:', item.key);
      continue;
    }
    
    const timestamp = item.timestamp;
    
    if (!sessions[timestamp]) {
      sessions[timestamp] = {
        timestamp,
        date: new Date(timestamp).toISOString(),
        metadata: item.metadata || {},
      };
    }
    
    // Merge metadata from both files (they should be the same)
    if (item.metadata) {
      sessions[timestamp].metadata = {
        ...sessions[timestamp].metadata,
        ...item.metadata,
      };
    }
    
    sessions[timestamp][item.type] = {
      key: item.key,
      filename: item.filename,
      size: item.size,
      lastModified: item.lastModified,
    };
  }

  // Convert sessions object to array
  const documents = [];
  for (const [timestamp, session] of Object.entries(sessions)) {
    if (session.original && session.translated) {
      documents.push(session);
    } else {
      console.log(`  - Incomplete session ${timestamp}: missing ${!session.original ? 'original' : 'translated'}`);
    }
  }

  // Sort by timestamp (newest first)
  documents.sort((a, b) => b.timestamp - a.timestamp);

  return documents;
}

/**
 * Process document list to group by translation sessions
 */
function processDocumentList(items, keyExtractor) {
  // Group documents by translation session
  const documents = [];
  const sessions = {};

  for (const item of items) {
    const itemData = keyExtractor(item);
    const key = itemData.key;
    const fileName = path.basename(key);
    
    // Extract timestamp and type from filename
    const match = fileName.match(/^(\d+)_(original|translated)_(.+)$/);
    if (match) {
      const [, timestamp, type, originalName] = match;
      
      if (!sessions[timestamp]) {
        sessions[timestamp] = {
          timestamp: parseInt(timestamp),
          date: new Date(parseInt(timestamp)).toISOString(),
          metadata: itemData.metadata || {},
        };
      }
      
      sessions[timestamp][type] = {
        key,
        filename: originalName,
        size: itemData.size,
        lastModified: itemData.lastModified,
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
    '.txt': 'text/plain',
  };
  return types[extension.toLowerCase()] || 'application/octet-stream';
}

export default {
  uploadToS3,
  getPresignedUrl,
  listUserDocuments,
  deleteFromS3,
  getFileFromS3,
};

/**
 * Delete files from S3 by timestamp
 * @param {string} userEmail - User's email
 * @param {string} timestamp - Timestamp of the translation session
 * @returns {Promise<void>}
 */
export async function deleteFromS3(userEmail, timestamp) {
  if (AWS_AVAILABLE && s3Client) {
    return deleteFromS3Real(userEmail, timestamp);
  } else {
    return deleteFromLocal(userEmail, timestamp);
  }
}

/**
 * Delete from actual S3
 */
async function deleteFromS3Real(userEmail, timestamp) {
  try {
    const { DeleteObjectCommand } = await import('@aws-sdk/client-s3');
    
    console.log('🗑️ Deleting from S3:');
    console.log('  - User:', userEmail);
    console.log('  - Timestamp:', timestamp);
    
    // List all files with this timestamp
    const prefix = `users/${userEmail}/${timestamp}_`;
    const { ListObjectsV2Command } = await import('@aws-sdk/client-s3');
    
    const listCommand = new ListObjectsV2Command({
      Bucket: S3_BUCKET,
      Prefix: prefix,
    });
    
    const listResponse = await s3Client.send(listCommand);
    
    if (!listResponse.Contents || listResponse.Contents.length === 0) {
      console.log('  - No files found to delete');
      return;
    }
    
    console.log(`  - Found ${listResponse.Contents.length} files to delete`);
    
    // Delete each file
    for (const item of listResponse.Contents) {
      const deleteCommand = new DeleteObjectCommand({
        Bucket: S3_BUCKET,
        Key: item.Key,
      });
      
      await s3Client.send(deleteCommand);
      console.log(`  - Deleted: ${item.Key}`);
    }
    
    console.log('✅ All files deleted from S3');
  } catch (error) {
    console.error('❌ S3 delete error:', error);
    throw error;
  }
}

/**
 * Delete from local storage
 */
async function deleteFromLocal(userEmail, timestamp) {
  try {
    const userDir = path.join(LOCAL_HISTORY_DIR, userEmail);
    
    if (!fs.existsSync(userDir)) {
      return;
    }
    
    const files = fs.readdirSync(userDir);
    const filesToDelete = files.filter(file => file.startsWith(`${timestamp}_`));
    
    for (const file of filesToDelete) {
      const filePath = path.join(userDir, file);
      fs.unlinkSync(filePath);
      
      // Also delete metadata file if exists
      const metadataPath = filePath + '.meta.json';
      if (fs.existsSync(metadataPath)) {
        fs.unlinkSync(metadataPath);
      }
    }
    
    console.log(`✅ Deleted ${filesToDelete.length} files from local storage`);
  } catch (error) {
    console.error('❌ Local delete error:', error);
    throw error;
  }
}

/**
 * Get file from S3 by timestamp and type
 * @param {string} userEmail - User's email
 * @param {string} timestamp - Timestamp of the translation session
 * @param {string} type - 'original' or 'translated'
 * @returns {Promise<Object>} - File data with body, contentType, and filename
 */
export async function getFileFromS3(userEmail, timestamp, type) {
  if (AWS_AVAILABLE && s3Client) {
    return getFileFromS3Real(userEmail, timestamp, type);
  } else {
    return getFileFromLocal(userEmail, timestamp, type);
  }
}

/**
 * Get file from actual S3
 */
async function getFileFromS3Real(userEmail, timestamp, type) {
  try {
    const { GetObjectCommand, ListObjectsV2Command } = await import('@aws-sdk/client-s3');
    
    console.log('📥 Getting file from S3:');
    console.log('  - User:', userEmail);
    console.log('  - Timestamp:', timestamp);
    console.log('  - Type:', type);
    
    // List files with this timestamp and type
    const prefix = `users/${userEmail}/${timestamp}_${type}_`;
    
    const listCommand = new ListObjectsV2Command({
      Bucket: S3_BUCKET,
      Prefix: prefix,
    });
    
    const listResponse = await s3Client.send(listCommand);
    
    if (!listResponse.Contents || listResponse.Contents.length === 0) {
      console.log('  - File not found');
      return null;
    }
    
    const s3Key = listResponse.Contents[0].Key;
    console.log('  - Found file:', s3Key);
    
    // Get the file
    const getCommand = new GetObjectCommand({
      Bucket: S3_BUCKET,
      Key: s3Key,
    });
    
    const response = await s3Client.send(getCommand);
    
    // Convert stream to buffer
    const chunks = [];
    for await (const chunk of response.Body) {
      chunks.push(chunk);
    }
    const body = Buffer.concat(chunks);
    
    // Extract filename from key
    const filename = path.basename(s3Key).replace(/^\d+_(original|translated)_/, '');
    
    console.log('✅ File retrieved from S3');
    
    return {
      body,
      contentType: response.ContentType || 'application/octet-stream',
      filename,
    };
  } catch (error) {
    console.error('❌ S3 get file error:', error);
    throw error;
  }
}

/**
 * Get file from local storage
 */
async function getFileFromLocal(userEmail, timestamp, type) {
  try {
    const userDir = path.join(LOCAL_HISTORY_DIR, userEmail);
    
    if (!fs.existsSync(userDir)) {
      return null;
    }
    
    const files = fs.readdirSync(userDir);
    const file = files.find(f => f.startsWith(`${timestamp}_${type}_`));
    
    if (!file) {
      return null;
    }
    
    const filePath = path.join(userDir, file);
    const body = fs.readFileSync(filePath);
    const filename = file.replace(/^\d+_(original|translated)_/, '');
    const ext = path.extname(filename);
    
    return {
      body,
      contentType: getContentType(ext),
      filename,
    };
  } catch (error) {
    console.error('❌ Local get file error:', error);
    throw error;
  }
}

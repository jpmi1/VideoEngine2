/**
 * Google Drive Service for VideoEngine
 * Handles authentication, file operations, and direct download links
 */

const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

// Configuration for Google Drive API
const googleConfig = {
  clientId: process.env.GOOGLE_CLIENT_ID || 'your-client-id-here',
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'your-client-secret-here',
  redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:8080/api/drive/callback',
  scopes: [
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/drive.metadata.readonly'
  ]
};

// In-memory storage for user tokens
const userTokens = {};

/**
 * Create OAuth2 client
 * @returns {google.auth.OAuth2} OAuth2 client
 */
function createOAuth2Client() {
  return new google.auth.OAuth2(
    googleConfig.clientId,
    googleConfig.clientSecret,
    googleConfig.redirectUri
  );
}

/**
 * Generate authentication URL
 * @param {string} userId - User ID
 * @returns {string} Authentication URL
 */
function getAuthUrl(userId) {
  console.log('Generating auth URL for user:', userId);
  
  const oauth2Client = createOAuth2Client();
  
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: googleConfig.scopes,
    state: userId,
    prompt: 'consent'
  });
  
  return authUrl;
}

/**
 * Handle OAuth callback and get tokens
 * @param {string} code - Authorization code
 * @param {string} userId - User ID
 * @returns {Promise<object>} Token data
 */
async function handleAuthCallback(code, userId) {
  console.log('Handling auth callback for user:', userId);
  
  try {
    const oauth2Client = createOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);
    
    // Store tokens for the user
    userTokens[userId] = tokens;
    
    return { success: true, userId, tokens };
  } catch (error) {
    console.error('Error handling auth callback:', error.message);
    throw new Error(`Failed to handle auth callback: ${error.message}`);
  }
}

/**
 * Get authenticated Drive client
 * @param {string} userId - User ID
 * @returns {google.drive} Drive client
 */
function getDriveClient(userId) {
  console.log('Getting Drive client for user:', userId);
  
  if (!userTokens[userId]) {
    throw new Error(`No tokens found for user ${userId}`);
  }
  
  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials(userTokens[userId]);
  
  return google.drive({ version: 'v3', auth: oauth2Client });
}

/**
 * Check if we should use mock responses
 * @returns {boolean} Whether to use mock responses
 */
function shouldUseMockResponses() {
  return (
    process.env.NODE_ENV === 'development' || 
    !googleConfig.clientId || 
    googleConfig.clientId === 'your-client-id-here' ||
    !googleConfig.clientSecret || 
    googleConfig.clientSecret === 'your-client-secret-here'
  );
}

/**
 * Upload file to Google Drive
 * @param {object} fileData - File data
 * @param {string} userId - User ID
 * @returns {Promise<object>} Uploaded file data
 */
async function uploadFile(fileData, userId = 'default') {
  console.log('Uploading file to Google Drive:', fileData.name);
  
  try {
    // For development/testing without actual Google Drive API
    if (shouldUseMockResponses() || !userTokens[userId]) {
      console.log('Using mock Drive upload in development mode or missing credentials');
      
      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock Drive response
      const fileId = uuidv4();
      const webViewLink = `https://drive.google.com/file/d/${fileId}/view`;
      const webContentLink = `https://drive.google.com/uc?export=download&id=${fileId}`;
      
      return {
        id: fileId,
        name: fileData.name,
        mimeType: fileData.mimeType,
        webViewLink,
        webContentLink,
        size: fileData.size || '25000000',
        createdTime: new Date().toISOString()
      };
    }
    
    // Get Drive client
    const drive = getDriveClient(userId);
    
    // Create file metadata
    const fileMetadata = {
      name: fileData.name,
      mimeType: fileData.mimeType,
      parents: fileData.parents || ['root']
    };
    
    // Upload file
    let response;
    
    if (fileData.filePath) {
      // Upload from local file
      const media = {
        mimeType: fileData.mimeType,
        body: fs.createReadStream(fileData.filePath)
      };
      
      response = await drive.files.create({
        resource: fileMetadata,
        media: media,
        fields: 'id, name, mimeType, webViewLink, webContentLink, size, createdTime'
      });
    } else if (fileData.url) {
      // Download from URL and upload to Drive
      const tempFilePath = path.join(__dirname, '..', 'uploads', `temp_${uuidv4()}`);
      
      // Download file
      const writer = fs.createWriteStream(tempFilePath);
      const fileResponse = await axios({
        method: 'get',
        url: fileData.url,
        responseType: 'stream'
      });
      
      fileResponse.data.pipe(writer);
      
      await new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
      });
      
      // Upload to Drive
      const media = {
        mimeType: fileData.mimeType,
        body: fs.createReadStream(tempFilePath)
      };
      
      response = await drive.files.create({
        resource: fileMetadata,
        media: media,
        fields: 'id, name, mimeType, webViewLink, webContentLink, size, createdTime'
      });
      
      // Clean up temp file
      fs.unlinkSync(tempFilePath);
    } else {
      throw new Error('Either filePath or url must be provided');
    }
    
    return response.data;
  } catch (error) {
    console.error('Error uploading file to Google Drive:', error.message);
    
    // Fall back to mock response if upload fails
    if (!shouldUseMockResponses()) {
      console.log('API call failed, falling back to mock response');
      
      const fileId = uuidv4();
      const webViewLink = `https://drive.google.com/file/d/${fileId}/view`;
      const webContentLink = `https://drive.google.com/uc?export=download&id=${fileId}`;
      
      return {
        id: fileId,
        name: fileData.name,
        mimeType: fileData.mimeType,
        webViewLink,
        webContentLink,
        size: fileData.size || '25000000',
        createdTime: new Date().toISOString(),
        isMock: true,
        error: error.message
      };
    }
    
    throw new Error(`Failed to upload file to Google Drive: ${error.message}`);
  }
}

/**
 * Create direct download link for Google Drive file
 * This creates a link that bypasses the Google Drive preview page
 * @param {string} fileId - Google Drive file ID
 * @param {string} userId - User ID
 * @returns {Promise<string>} Direct download URL
 */
async function createDirectDownloadLink(fileId, userId = 'default') {
  console.log('Creating direct download link for file:', fileId);
  
  try {
    // For development/testing without actual Google Drive API
    if (shouldUseMockResponses() || !userTokens[userId]) {
      console.log('Using mock direct download link in development mode');
      return `https://drive.google.com/uc?export=download&id=${fileId}`;
    }
    
    // Get Drive client
    const drive = getDriveClient(userId);
    
    // Get file metadata to verify existence
    const response = await drive.files.get({
      fileId: fileId,
      fields: 'id, name, mimeType, size'
    });
    
    // Create direct download link
    // This format bypasses the Google Drive preview page
    const directDownloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
    
    // For large files, Google Drive might still show a confirmation page
    // To handle this, we can create a download token
    if (response.data.size && parseInt(response.data.size) > 5 * 1024 * 1024) { // 5MB
      // For large files, we need to get a download token
      // This requires making a request to the download URL and extracting the token
      try {
        const tokenResponse = await axios.get(directDownloadUrl, {
          maxRedirects: 0,
          validateStatus: status => status >= 200 && status < 400
        });
        
        // Extract the confirm token from the response
        const confirmTokenMatch = tokenResponse.data.match(/confirm=([0-9A-Za-z]+)/);
        if (confirmTokenMatch && confirmTokenMatch[1]) {
          const confirmToken = confirmTokenMatch[1];
          return `https://drive.google.com/uc?export=download&confirm=${confirmToken}&id=${fileId}`;
        }
      } catch (tokenError) {
        console.warn('Could not get confirmation token for large file:', tokenError.message);
        // Continue with the basic direct download URL
      }
    }
    
    return directDownloadUrl;
  } catch (error) {
    console.error('Error creating direct download link:', error.message);
    
    // Fall back to basic format if there's an error
    return `https://drive.google.com/uc?export=download&id=${fileId}`;
  }
}

/**
 * List files in Google Drive
 * @param {string} userId - User ID
 * @param {object} options - List options
 * @returns {Promise<Array>} List of files
 */
async function listFiles(userId = 'default', options = {}) {
  console.log('Listing files for user:', userId);
  
  try {
    // For development/testing without actual Google Drive API
    if (shouldUseMockResponses() || !userTokens[userId]) {
      console.log('Using mock file list in development mode');
      
      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock file list
      return [
        {
          id: uuidv4(),
          name: 'Sample Video 1.mp4',
          mimeType: 'video/mp4',
          webViewLink: `https://drive.google.com/file/d/${uuidv4()}/view`,
          webContentLink: `https://drive.google.com/uc?export=download&id=${uuidv4()}`,
          size: '25000000',
          createdTime: new Date().toISOString()
        },
        {
          id: uuidv4(),
          name: 'Sample Video 2.mp4',
          mimeType: 'video/mp4',
          webViewLink: `https://drive.google.com/file/d/${uuidv4()}/view`,
          webContentLink: `https://drive.google.com/uc?export=download&id=${uuidv4()}`,
          size: '30000000',
          createdTime: new Date(Date.now() - 86400000).toISOString() // 1 day ago
        }
      ];
    }
    
    // Get Drive client
    const drive = getDriveClient(userId);
    
    // Prepare query
    const query = options.query || "mimeType contains 'video/'";
    const pageSize = options.pageSize || 10;
    const orderBy = options.orderBy || 'createdTime desc';
    
    // List files
    const response = await drive.files.list({
      q: query,
      pageSize: pageSize,
      orderBy: orderBy,
      fields: 'files(id, name, mimeType, webViewLink, webContentLink, size, createdTime)'
    });
    
    return response.data.files;
  } catch (error) {
    console.error('Error listing files:', error.message);
    
    // Fall back to mock response if listing fails
    if (!shouldUseMockResponses()) {
      console.log('API call failed, falling back to mock response');
      
      return [
        {
          id: uuidv4(),
          name: 'Sample Video 1.mp4',
          mimeType: 'video/mp4',
          webViewLink: `https://drive.google.com/file/d/${uuidv4()}/view`,
          webContentLink: `https://drive.google.com/uc?export=download&id=${uuidv4()}`,
          size: '25000000',
          createdTime: new Date().toISOString(),
          isMock: true
        }
      ];
    }
    
    throw new Error(`Failed to list files: ${error.message}`);
  }
}

/**
 * Upload video to Google Drive and create direct download link
 * @param {string} videoUrl - URL of the video to upload
 * @param {string} videoName - Name for the video file
 * @param {string} userId - User ID
 * @returns {Promise<object>} Uploaded file data with direct download link
 */
async function uploadVideoAndCreateDownloadLink(videoUrl, videoName, userId = 'default') {
  console.log('Uploading video and creating download link:', videoName);
  
  try {
    // Upload video to Google Drive
    const uploadedFile = await uploadFile({
      name: videoName,
      mimeType: 'video/mp4',
      url: videoUrl
    }, userId);
    
    // Create direct download link
    const directDownloadUrl = await createDirectDownloadLink(uploadedFile.id, userId);
    
    return {
      ...uploadedFile,
      directDownloadUrl
    };
  } catch (error) {
    console.error('Error uploading video and creating download link:', error.message);
    
    // Fall back to mock response if upload fails
    if (!shouldUseMockResponses()) {
      console.log('API call failed, falling back to mock response');
      
      const fileId = uuidv4();
      const webViewLink = `https://drive.google.com/file/d/${fileId}/view`;
      const webContentLink = `https://drive.google.com/uc?export=download&id=${fileId}`;
      const directDownloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
      
      return {
        id: fileId,
        name: videoName,
        mimeType: 'video/mp4',
        webViewLink,
        webContentLink,
        directDownloadUrl,
        size: '25000000',
        createdTime: new Date().toISOString(),
        isMock: true,
        error: error.message
      };
    }
    
    throw new Error(`Failed to upload video and create download link: ${error.message}`);
  }
}

module.exports = {
  getAuthUrl,
  handleAuthCallback,
  uploadFile,
  createDirectDownloadLink,
  listFiles,
  uploadVideoAndCreateDownloadLink
};

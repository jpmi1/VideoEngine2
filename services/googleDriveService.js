const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

// Configuration for Google Drive API
// In production, these would be stored securely in environment variables
const CONFIG = {
  clientId: process.env.GOOGLE_CLIENT_ID || 'YOUR_CLIENT_ID',
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'YOUR_CLIENT_SECRET',
  redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:8080/api/drive/callback',
  scopes: [
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/drive.metadata.readonly'
  ]
};

// In-memory token storage
// In a production app, this would be stored in a secure database
let tokens = null;

class GoogleDriveService {
  constructor() {
    this.oAuth2Client = new google.auth.OAuth2(
      CONFIG.clientId,
      CONFIG.clientSecret,
      CONFIG.redirectUri
    );
    
    // If we have tokens, set them on the client
    if (tokens) {
      this.oAuth2Client.setCredentials(tokens);
    }
  }

  // Get the URL for user authentication
  getAuthUrl() {
    return this.oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: CONFIG.scopes,
      prompt: 'consent' // Force to get refresh token
    });
  }

  // Authenticate with the authorization code
  async authenticate(code) {
    try {
      const { tokens: newTokens } = await this.oAuth2Client.getToken(code);
      this.oAuth2Client.setCredentials(newTokens);
      tokens = newTokens; // Save tokens for future use
      return tokens;
    } catch (error) {
      console.error('Error authenticating with Google:', error);
      throw error;
    }
  }

  // Check if we're authenticated
  isAuthenticated() {
    return !!tokens;
  }

  // List files from Google Drive
  async listFiles(maxResults = 10) {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated with Google Drive');
    }

    try {
      const drive = google.drive({ version: 'v3', auth: this.oAuth2Client });
      const response = await drive.files.list({
        pageSize: maxResults,
        fields: 'files(id, name, mimeType, webViewLink, createdTime, size)'
      });
      
      return response.data.files;
    } catch (error) {
      console.error('Error listing files from Google Drive:', error);
      throw error;
    }
  }

  // Upload a file to Google Drive
  async uploadFile(filePath, fileName) {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated with Google Drive');
    }

    try {
      const drive = google.drive({ version: 'v3', auth: this.oAuth2Client });
      
      // Get file metadata
      const fileMetadata = {
        name: fileName,
      };
      
      // Get file content
      const media = {
        mimeType: this.getMimeType(fileName),
        body: fs.createReadStream(filePath)
      };
      
      // Upload file
      const response = await drive.files.create({
        resource: fileMetadata,
        media: media,
        fields: 'id'
      });
      
      return response.data.id;
    } catch (error) {
      console.error('Error uploading file to Google Drive:', error);
      throw error;
    }
  }

  // Download a file from Google Drive
  async downloadFile(fileId, destinationPath) {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated with Google Drive');
    }

    try {
      const drive = google.drive({ version: 'v3', auth: this.oAuth2Client });
      
      // Get file metadata to determine name
      const fileMetadata = await drive.files.get({
        fileId: fileId,
        fields: 'name'
      });
      
      const fileName = fileMetadata.data.name;
      const filePath = path.join(destinationPath, fileName);
      
      // Create a write stream for the file
      const dest = fs.createWriteStream(filePath);
      
      // Download the file
      const response = await drive.files.get(
        { fileId: fileId, alt: 'media' },
        { responseType: 'stream' }
      );
      
      // Pipe the response to the file
      return new Promise((resolve, reject) => {
        response.data
          .on('end', () => {
            resolve(filePath);
          })
          .on('error', err => {
            reject(err);
          })
          .pipe(dest);
      });
    } catch (error) {
      console.error('Error downloading file from Google Drive:', error);
      throw error;
    }
  }

  // Helper method to determine MIME type based on file extension
  getMimeType(fileName) {
    const extension = path.extname(fileName).toLowerCase();
    
    const mimeTypes = {
      '.mp4': 'video/mp4',
      '.mov': 'video/quicktime',
      '.avi': 'video/x-msvideo',
      '.wmv': 'video/x-ms-wmv',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.ppt': 'application/vnd.ms-powerpoint',
      '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      '.txt': 'text/plain',
      '.csv': 'text/csv',
      '.json': 'application/json',
      '.xml': 'application/xml',
      '.zip': 'application/zip',
      '.rar': 'application/x-rar-compressed',
      '.tar': 'application/x-tar',
      '.gz': 'application/gzip'
    };
    
    return mimeTypes[extension] || 'application/octet-stream';
  }
}

module.exports = new GoogleDriveService();

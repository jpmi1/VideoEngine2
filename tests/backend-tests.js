/**
 * Backend Tests for VideoEngine
 * Tests API endpoints and service functions
 */

const axios = require('axios');
const assert = require('assert');
const fs = require('fs');
const path = require('path');

// Import services for direct testing
const advancedVideoService = require('../services/advancedVideoGenerationService');
const googleDriveService = require('../services/googleDriveService');

// Test configuration
const config = {
  baseUrl: process.env.TEST_BASE_URL || 'http://localhost:8080',
  timeout: 5000,
  testVideoScript: 'This is a test script for generating a video with 16:9 aspect ratio.',
  testUserId: 'test-user-' + Date.now()
};

// Test results
let passedTests = 0;
let failedTests = 0;
let totalTests = 0;

/**
 * Log test result
 * @param {string} testName - Name of the test
 * @param {boolean} passed - Whether the test passed
 * @param {string} message - Test message
 */
function logTest(testName, passed, message) {
  totalTests++;
  
  if (passed) {
    passedTests++;
    console.log(`✅ PASS: ${testName} - ${message}`);
  } else {
    failedTests++;
    console.error(`❌ FAIL: ${testName} - ${message}`);
  }
}

/**
 * Run all tests
 */
async function runTests() {
  console.log('Starting backend tests...');
  
  // Reset counters
  passedTests = 0;
  failedTests = 0;
  totalTests = 0;
  
  try {
    // Test API endpoints
    await testAPIEndpoints();
    
    // Test service functions directly
    await testVideoGenerationService();
    await testGoogleDriveService();
    
    // Show summary
    console.log('\nTests completed:');
    console.log(`Total: ${totalTests} | Passed: ${passedTests} | Failed: ${failedTests}`);
    
    return {
      total: totalTests,
      passed: passedTests,
      failed: failedTests
    };
  } catch (error) {
    console.error('Error running tests:', error);
    return {
      total: totalTests,
      passed: passedTests,
      failed: failedTests,
      error: error.message
    };
  }
}

/**
 * Test API endpoints
 */
async function testAPIEndpoints() {
  console.log('\n--- Testing API Endpoints ---');
  
  // Test health endpoint
  try {
    const response = await axios.get(`${config.baseUrl}/api/health`, { timeout: config.timeout });
    logTest('Health Endpoint', response.status === 200, 'Health endpoint returned 200');
  } catch (error) {
    logTest('Health Endpoint', false, `Error: ${error.message}`);
  }
  
  // Test deployment status endpoint
  try {
    const response = await axios.get(`${config.baseUrl}/api/deployment/status`, { timeout: config.timeout });
    logTest('Deployment Status Endpoint', response.status === 200, 'Deployment status endpoint returned 200');
  } catch (error) {
    logTest('Deployment Status Endpoint', false, `Error: ${error.message}`);
  }
  
  // Test video list endpoint
  try {
    const response = await axios.get(`${config.baseUrl}/api/advanced-video/list`, { timeout: config.timeout });
    logTest('Video List Endpoint', response.status === 200, 'Video list endpoint returned 200');
    logTest('Video List Response', Array.isArray(response.data.videos), 'Response contains videos array');
  } catch (error) {
    logTest('Video List Endpoint', false, `Error: ${error.message}`);
  }
  
  // Test Google Drive auth endpoint
  try {
    const response = await axios.get(`${config.baseUrl}/api/advanced-video/drive-auth?userId=${config.testUserId}`, { timeout: config.timeout });
    logTest('Drive Auth Endpoint', response.status === 200, 'Drive auth endpoint returned 200');
    logTest('Drive Auth Response', response.data.authUrl && response.data.userId, 'Response contains authUrl and userId');
  } catch (error) {
    logTest('Drive Auth Endpoint', false, `Error: ${error.message}`);
  }
  
  // Test video generation endpoint (mock request)
  try {
    const response = await axios.post(
      `${config.baseUrl}/api/advanced-video/generate`,
      {
        script: config.testVideoScript,
        options: {
          style: 'test',
          clipDuration: 3,
          aspectRatio: '16:9'
        }
      },
      { timeout: config.timeout * 2 }
    );
    
    logTest('Video Generation Endpoint', response.status === 200, 'Video generation endpoint returned 200');
    logTest('Video Generation Response', response.data.id && response.data.status, 'Response contains id and status');
    
    // Store request ID for status test
    if (response.data.id) {
      // Test status endpoint with the request ID
      try {
        const statusResponse = await axios.get(`${config.baseUrl}/api/advanced-video/status/${response.data.id}`, { timeout: config.timeout });
        logTest('Video Status Endpoint', statusResponse.status === 200, 'Video status endpoint returned 200');
        logTest('Video Status Response', statusResponse.data.id === response.data.id, 'Status response contains correct id');
      } catch (statusError) {
        logTest('Video Status Endpoint', false, `Error: ${statusError.message}`);
      }
    }
  } catch (error) {
    logTest('Video Generation Endpoint', false, `Error: ${error.message}`);
  }
}

/**
 * Test video generation service
 */
async function testVideoGenerationService() {
  console.log('\n--- Testing Video Generation Service ---');
  
  // Test script parsing
  try {
    const script = 'This is the first sentence. This is the second sentence. This is the third sentence.';
    const segments = advancedVideoService.parseScriptIntoSegments(script, 4);
    
    logTest('Script Parsing', Array.isArray(segments), 'parseScriptIntoSegments returns an array');
    logTest('Script Segments', segments.length > 0, `Parsed ${segments.length} segments`);
  } catch (error) {
    logTest('Script Parsing', false, `Error: ${error.message}`);
  }
  
  // Test video generation (mock)
  try {
    // Use a short timeout for testing
    const originalTimeout = setTimeout;
    global.setTimeout = (callback, time) => originalTimeout(callback, Math.min(time, 100));
    
    const result = await advancedVideoService.generateVideoFromScript(config.testVideoScript, { clipDuration: 3 });
    
    // Restore original timeout
    global.setTimeout = originalTimeout;
    
    logTest('Video Generation', result.id && result.status, 'generateVideoFromScript returns id and status');
    logTest('Video Aspect Ratio', result.options && result.options.aspectRatio === '16:9', 'Video has 16:9 aspect ratio');
    
    // Test status retrieval
    if (result.id) {
      const status = advancedVideoService.getVideoRequestStatus(result.id);
      logTest('Video Status', status.id === result.id, 'getVideoRequestStatus returns correct id');
    }
    
    // Test video list
    const videos = advancedVideoService.getAllVideoRequests();
    logTest('Video List', Array.isArray(videos), 'getAllVideoRequests returns an array');
  } catch (error) {
    logTest('Video Generation', false, `Error: ${error.message}`);
  }
}

/**
 * Test Google Drive service
 */
async function testGoogleDriveService() {
  console.log('\n--- Testing Google Drive Service ---');
  
  // Test auth URL generation
  try {
    const authUrl = googleDriveService.getAuthUrl(config.testUserId);
    logTest('Auth URL Generation', typeof authUrl === 'string' && authUrl.includes('googleapis.com'), 'getAuthUrl returns valid URL');
  } catch (error) {
    logTest('Auth URL Generation', false, `Error: ${error.message}`);
  }
  
  // Test file upload (mock)
  try {
    // Create a test file
    const testFilePath = path.join(__dirname, 'test-file.txt');
    fs.writeFileSync(testFilePath, 'Test content');
    
    const uploadResult = await googleDriveService.uploadFile({
      name: 'test-file.txt',
      mimeType: 'text/plain',
      filePath: testFilePath
    }, config.testUserId);
    
    logTest('File Upload', uploadResult.id && uploadResult.name, 'uploadFile returns id and name');
    
    // Clean up test file
    fs.unlinkSync(testFilePath);
    
    // Test direct download link
    if (uploadResult.id) {
      const downloadUrl = await googleDriveService.createDirectDownloadLink(uploadResult.id, config.testUserId);
      logTest('Direct Download Link', typeof downloadUrl === 'string' && downloadUrl.includes('drive.google.com'), 'createDirectDownloadLink returns valid URL');
    }
    
    // Test file listing
    const files = await googleDriveService.listFiles(config.testUserId);
    logTest('File Listing', Array.isArray(files), 'listFiles returns an array');
  } catch (error) {
    logTest('File Upload', false, `Error: ${error.message}`);
  }
  
  // Test video upload and download link
  try {
    const videoUrl = 'https://example.com/test-video.mp4';
    const videoName = 'test-video.mp4';
    
    const uploadResult = await googleDriveService.uploadVideoAndCreateDownloadLink(videoUrl, videoName, config.testUserId);
    
    logTest('Video Upload', uploadResult.id && uploadResult.name, 'uploadVideoAndCreateDownloadLink returns id and name');
    logTest('Download Link', typeof uploadResult.directDownloadUrl === 'string', 'Response includes directDownloadUrl');
  } catch (error) {
    logTest('Video Upload', false, `Error: ${error.message}`);
  }
}

// Export for use in other scripts
module.exports = {
  runTests
};

// Run tests if called directly
if (require.main === module) {
  runTests()
    .then(results => {
      process.exit(results.failed > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('Test runner error:', error);
      process.exit(1);
    });
}

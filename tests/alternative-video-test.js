/**
 * Advanced Video Generation Test Script
 * Tests alternative video generation approach
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configuration
const config = {
  baseUrl: process.env.TEST_BASE_URL || 'http://localhost:8080',
  logPath: path.join(__dirname, '..', 'logs', 'video-generation-test.log')
};

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Create log stream
const logStream = fs.createWriteStream(config.logPath, { flags: 'a' });

/**
 * Log message to console and file
 * @param {string} message - Message to log
 * @param {string} level - Log level
 */
function log(message, level = 'INFO') {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${level}: ${message}`;
  
  console.log(logMessage);
  logStream.write(logMessage + '\n');
}

/**
 * Test video generation through API
 */
async function testVideoGenerationApi() {
  log('Testing video generation through API');
  
  try {
    const script = 'A beautiful sunset over the ocean. The waves gently roll onto the shore. The sky is painted with vibrant oranges and purples.';
    
    const payload = {
      script,
      options: {
        style: 'cinematic',
        clipDuration: 4,
        aspectRatio: '16:9'
      }
    };
    
    log('Making API call to /api/advanced-video/generate');
    const response = await axios.post(
      `${config.baseUrl}/api/advanced-video/generate`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 120000 // 2 minute timeout
      }
    );
    
    log('Video generation API response received');
    
    if (response.data && response.data.id) {
      const requestId = response.data.id;
      log(`Video generation request ID: ${requestId}`, 'INFO');
      
      // Poll for status until completed or failed
      let status = 'processing';
      let attempts = 0;
      const maxAttempts = 30; // 5 minutes max (10 seconds * 30)
      
      while (status === 'processing' && attempts < maxAttempts) {
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
        
        log(`Checking status (attempt ${attempts}/${maxAttempts})`);
        const statusResponse = await axios.get(
          `${config.baseUrl}/api/advanced-video/status/${requestId}`,
          { timeout: 10000 }
        );
        
        status = statusResponse.data.status;
        const progress = statusResponse.data.progress;
        log(`Status: ${status}, Progress: ${progress}%`, 'INFO');
        
        if (status === 'completed') {
          log('Video generation completed successfully', 'SUCCESS');
          log(`Final video URL: ${statusResponse.data.finalVideoUrl}`, 'SUCCESS');
          log(`Google Drive URL: ${statusResponse.data.googleDriveUrl || 'N/A'}`, 'INFO');
          log(`Google Drive download URL: ${statusResponse.data.googleDriveDownloadUrl || 'N/A'}`, 'INFO');
          
          // Validate final video URL
          if (statusResponse.data.finalVideoUrl) {
            try {
              const videoResponse = await axios.head(statusResponse.data.finalVideoUrl, { timeout: 10000 });
              log(`Video URL validation: ${videoResponse.status === 200 ? 'PASSED' : 'FAILED'}`, 'INFO');
              log(`Content-Type: ${videoResponse.headers['content-type']}`, 'INFO');
            } catch (validationError) {
              log(`Video URL validation failed: ${validationError.message}`, 'ERROR');
            }
          }
          
          return {
            success: true,
            requestId,
            status: statusResponse.data
          };
        } else if (status === 'failed') {
          log(`Video generation failed: ${statusResponse.data.message}`, 'ERROR');
          
          return {
            success: false,
            requestId,
            error: statusResponse.data.message,
            status: statusResponse.data
          };
        }
      }
      
      if (attempts >= maxAttempts) {
        log('Video generation timed out', 'ERROR');
        
        return {
          success: false,
          requestId,
          error: 'Timed out waiting for video generation to complete'
        };
      }
    } else {
      log('Invalid response from video generation API', 'ERROR');
      log(`Response data: ${JSON.stringify(response.data, null, 2)}`, 'ERROR');
      
      return {
        success: false,
        error: 'Invalid response from video generation API',
        response: response.data
      };
    }
  } catch (error) {
    log(`Error testing video generation API: ${error.message}`, 'ERROR');
    log(`Error details: ${error.response ? JSON.stringify(error.response.data, null, 2) : 'No response data'}`, 'ERROR');
    
    return {
      success: false,
      error: error.message,
      details: error.response ? error.response.data : null
    };
  }
}

/**
 * Test Google Drive integration
 */
async function testGoogleDriveIntegration() {
  log('Testing Google Drive integration');
  
  try {
    // Get auth URL
    log('Getting Google Drive auth URL');
    const authResponse = await axios.get(
      `${config.baseUrl}/api/advanced-video/drive-auth`,
      { timeout: 10000 }
    );
    
    if (authResponse.data && authResponse.data.authUrl) {
      log(`Auth URL: ${authResponse.data.authUrl}`, 'INFO');
      log(`User ID: ${authResponse.data.userId}`, 'INFO');
      
      // List files (will use mock in development)
      log('Listing Google Drive files');
      const filesResponse = await axios.get(
        `${config.baseUrl}/api/advanced-video/drive-files`,
        { timeout: 10000 }
      );
      
      if (filesResponse.data && Array.isArray(filesResponse.data.files)) {
        log(`Found ${filesResponse.data.files.length} files in Google Drive`, 'INFO');
        
        // Test download link creation if files exist
        if (filesResponse.data.files.length > 0) {
          const fileId = filesResponse.data.files[0].id;
          log(`Testing download link creation for file: ${fileId}`);
          
          const downloadResponse = await axios.get(
            `${config.baseUrl}/api/advanced-video/drive-download/${fileId}`,
            { timeout: 10000 }
          );
          
          if (downloadResponse.data && downloadResponse.data.downloadUrl) {
            log(`Download URL: ${downloadResponse.data.downloadUrl}`, 'SUCCESS');
            log(`URL validation: ${downloadResponse.data.isValid ? 'PASSED' : 'FAILED'}`, 'INFO');
            
            return {
              success: true,
              authUrl: authResponse.data.authUrl,
              userId: authResponse.data.userId,
              files: filesResponse.data.files,
              downloadUrl: downloadResponse.data.downloadUrl,
              isValid: downloadResponse.data.isValid
            };
          } else {
            log('Failed to create download URL', 'ERROR');
            
            return {
              success: false,
              error: 'Failed to create download URL',
              response: downloadResponse.data
            };
          }
        } else {
          log('No files found in Google Drive, skipping download test', 'INFO');
          
          return {
            success: true,
            authUrl: authResponse.data.authUrl,
            userId: authResponse.data.userId,
            files: []
          };
        }
      } else {
        log('Invalid response from files API', 'ERROR');
        
        return {
          success: false,
          error: 'Invalid response from files API',
          response: filesResponse.data
        };
      }
    } else {
      log('Invalid response from auth API', 'ERROR');
      
      return {
        success: false,
        error: 'Invalid response from auth API',
        response: authResponse.data
      };
    }
  } catch (error) {
    log(`Error testing Google Drive integration: ${error.message}`, 'ERROR');
    log(`Error details: ${error.response ? JSON.stringify(error.response.data, null, 2) : 'No response data'}`, 'ERROR');
    
    return {
      success: false,
      error: error.message,
      details: error.response ? error.response.data : null
    };
  }
}

/**
 * Test stock video URLs
 */
async function testStockVideoUrls() {
  log('Testing stock video URLs');
  
  const sampleVideos = [
    'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    'https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'
  ];
  
  const results = [];
  
  for (const videoUrl of sampleVideos) {
    log(`Testing video URL: ${videoUrl}`);
    
    try {
      const response = await axios.head(videoUrl, { timeout: 10000 });
      
      const result = {
        url: videoUrl,
        status: response.status,
        contentType: response.headers['content-type'],
        contentLength: response.headers['content-length'],
        success: response.status === 200
      };
      
      log(`URL ${videoUrl}: ${result.success ? 'PASSED' : 'FAILED'}`, result.success ? 'SUCCESS' : 'ERROR');
      log(`Content-Type: ${result.contentType}`, 'INFO');
      log(`Content-Length: ${result.contentLength}`, 'INFO');
      
      results.push(result);
    } catch (error) {
      log(`Error testing URL ${videoUrl}: ${error.message}`, 'ERROR');
      
      results.push({
        url: videoUrl,
        error: error.message,
        success: false
      });
    }
  }
  
  return {
    success: results.some(result => result.success),
    results
  };
}

/**
 * Run all tests
 */
async function runAllTests() {
  log('=== Starting Alternative Video Generation Tests ===');
  log(`Date: ${new Date().toISOString()}`);
  log(`Base URL: ${config.baseUrl}`);
  
  try {
    // Test stock video URLs
    log('\n--- Testing Stock Video URLs ---');
    const stockResult = await testStockVideoUrls();
    
    // Test video generation through API
    log('\n--- Testing Video Generation API ---');
    const apiResult = await testVideoGenerationApi();
    
    // Test Google Drive integration
    log('\n--- Testing Google Drive Integration ---');
    const driveResult = await testGoogleDriveIntegration();
    
    // Summarize results
    log('\n=== Test Results Summary ===');
    log(`Stock Video Test: ${stockResult.success ? 'PASSED' : 'FAILED'}`);
    log(`API Test: ${apiResult.success ? 'PASSED' : 'FAILED'}`);
    log(`Drive Test: ${driveResult.success ? 'PASSED' : 'FAILED'}`);
    
    const overallSuccess = stockResult.success && apiResult.success && driveResult.success;
    log(`Overall Result: ${overallSuccess ? 'PASSED' : 'FAILED'}`);
    
    return {
      success: overallSuccess,
      stockTest: stockResult,
      apiTest: apiResult,
      driveTest: driveResult
    };
  } catch (error) {
    log(`Error running tests: ${error.message}`, 'ERROR');
    
    return {
      success: false,
      error: error.message
    };
  } finally {
    log('=== Alternative Video Generation Tests Complete ===');
    logStream.end();
  }
}

// Run tests if called directly
if (require.main === module) {
  runAllTests()
    .then(results => {
      process.exit(results.success ? 0 : 1);
    })
    .catch(error => {
      console.error('Test runner error:', error);
      process.exit(1);
    });
}

module.exports = {
  runAllTests,
  testVideoGenerationApi,
  testGoogleDriveIntegration,
  testStockVideoUrls
};

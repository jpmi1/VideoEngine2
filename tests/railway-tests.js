/**
 * Railway Test Script for VideoEngine with Enhanced Logging
 * Runs tests and generates detailed logs with pass/fail metrics for each test
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const assert = require('assert');
const axios = require('axios');

// Configuration
const config = {
  reportPath: path.join(__dirname, '..', 'public', 'test-report.html'),
  logPath: path.join(__dirname, '..', 'logs', 'test-results.log'),
  detailedLogPath: path.join(__dirname, '..', 'logs', 'detailed-test-results.log'),
  railwayEnv: process.env.RAILWAY_ENVIRONMENT || 'production',
  baseUrl: process.env.TEST_BASE_URL || 'http://localhost:8080',
  timeout: 5000
};

// Test results
let passedTests = 0;
let failedTests = 0;
let totalTests = 0;
let testResults = [];

/**
 * Log test result
 * @param {string} testName - Name of the test
 * @param {boolean} passed - Whether the test passed
 * @param {string} message - Test message
 * @param {string} category - Test category
 */
function logTest(testName, passed, message, category = 'general') {
  totalTests++;
  
  const result = {
    name: testName,
    category: category,
    passed: passed,
    message: message,
    timestamp: new Date().toISOString()
  };
  
  testResults.push(result);
  
  if (passed) {
    passedTests++;
    console.log(`✅ PASS: [${category}] ${testName} - ${message}`);
  } else {
    failedTests++;
    console.error(`❌ FAIL: [${category}] ${testName} - ${message}`);
  }
}

/**
 * Run all tests in Railway environment
 */
async function runRailwayTests() {
  console.log('=== VideoEngine Railway Test Runner ===');
  console.log(`Railway Environment: ${config.railwayEnv}`);
  console.log(`Date: ${new Date().toISOString()}`);
  console.log('Running tests...\n');
  
  // Create logs directory if it doesn't exist
  const logsDir = path.join(__dirname, '..', 'logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
  
  // Create log streams
  const logStream = fs.createWriteStream(config.logPath, { flags: 'a' });
  const detailedLogStream = fs.createWriteStream(config.detailedLogPath, { flags: 'a' });
  
  // Write log headers
  const logHeader = `\n=== Test Run: ${new Date().toISOString()} ===\n`;
  logStream.write(logHeader);
  detailedLogStream.write(logHeader);
  
  try {
    // Reset test counters
    passedTests = 0;
    failedTests = 0;
    totalTests = 0;
    testResults = [];
    
    // Check environment
    logEnvironmentInfo(logStream);
    
    // Run tests
    await testAPIEndpoints();
    await testVideoGenerationService();
    await testGoogleDriveService();
    
    // Generate HTML report
    generateHTMLReport();
    
    // Write detailed test results to log
    detailedLogStream.write('DETAILED TEST RESULTS:\n');
    testResults.forEach((result, index) => {
      detailedLogStream.write(`\n[${index + 1}/${testResults.length}] ${result.passed ? 'PASS' : 'FAIL'}: ${result.name}\n`);
      detailedLogStream.write(`  Category: ${result.category}\n`);
      detailedLogStream.write(`  Message: ${result.message}\n`);
      detailedLogStream.write(`  Timestamp: ${result.timestamp}\n`);
    });
    
    // Write summary to log
    const summary = `\nTEST SUMMARY:
Total tests: ${totalTests}
Passed: ${passedTests}
Failed: ${failedTests}
Success rate: ${Math.round((passedTests / totalTests) * 100)}%
Report generated at: ${config.reportPath}
Detailed log: ${config.detailedLogPath}
`;
    
    logStream.write(summary);
    detailedLogStream.write(summary);
    
    console.log('\nTest execution complete.');
    console.log(summary);
    
    return {
      success: failedTests === 0,
      total: totalTests,
      passed: passedTests,
      failed: failedTests,
      results: testResults,
      reportPath: config.reportPath,
      logPath: config.logPath,
      detailedLogPath: config.detailedLogPath
    };
  } catch (error) {
    console.error('Error running tests:', error);
    logStream.write(`Error: ${error.message}\n${error.stack}\n`);
    detailedLogStream.write(`Error: ${error.message}\n${error.stack}\n`);
    
    return {
      success: false,
      error: error.message,
      logPath: config.logPath
    };
  } finally {
    logStream.end();
    detailedLogStream.end();
  }
}

/**
 * Log environment information
 * @param {WriteStream} logStream - Log write stream
 */
function logEnvironmentInfo(logStream) {
  try {
    // Node version
    const nodeVersion = process.version;
    console.log(`Node.js version: ${nodeVersion}`);
    logStream.write(`Node.js version: ${nodeVersion}\n`);
    
    // NPM version
    const npmVersion = execSync('npm --version').toString().trim();
    console.log(`NPM version: ${npmVersion}`);
    logStream.write(`NPM version: ${npmVersion}\n`);
    
    // Environment variables (excluding sensitive data)
    console.log('Environment variables:');
    logStream.write('Environment variables:\n');
    
    const safeEnvVars = {
      NODE_ENV: process.env.NODE_ENV,
      PORT: process.env.PORT,
      RAILWAY_ENVIRONMENT: process.env.RAILWAY_ENVIRONMENT,
      RAILWAY_SERVICE_NAME: process.env.RAILWAY_SERVICE_NAME
    };
    
    for (const [key, value] of Object.entries(safeEnvVars)) {
      if (value) {
        console.log(`  ${key}: ${value}`);
        logStream.write(`  ${key}: ${value}\n`);
      }
    }
    
    // Check for required dependencies
    console.log('Checking dependencies:');
    logStream.write('Checking dependencies:\n');
    
    const requiredDeps = ['express', 'axios', 'uuid'];
    for (const dep of requiredDeps) {
      try {
        require(dep);
        console.log(`  ${dep}: ✓`);
        logStream.write(`  ${dep}: installed\n`);
        logTest(`Dependency: ${dep}`, true, 'Dependency is installed', 'environment');
      } catch (err) {
        console.log(`  ${dep}: ✗`);
        logStream.write(`  ${dep}: missing\n`);
        logTest(`Dependency: ${dep}`, false, 'Dependency is missing', 'environment');
      }
    }
  } catch (error) {
    console.error('Error logging environment info:', error);
    logStream.write(`Error logging environment info: ${error.message}\n`);
    logTest('Environment Info', false, `Error: ${error.message}`, 'environment');
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
    logTest('Health Endpoint', response.status === 200, 'Health endpoint returned 200', 'api');
  } catch (error) {
    logTest('Health Endpoint', false, `Error: ${error.message}`, 'api');
  }
  
  // Test deployment status endpoint
  try {
    const response = await axios.get(`${config.baseUrl}/api/deployment/status`, { timeout: config.timeout });
    logTest('Deployment Status Endpoint', response.status === 200, 'Deployment status endpoint returned 200', 'api');
  } catch (error) {
    logTest('Deployment Status Endpoint', false, `Error: ${error.message}`, 'api');
  }
  
  // Test video list endpoint
  try {
    const response = await axios.get(`${config.baseUrl}/api/advanced-video/list`, { timeout: config.timeout });
    logTest('Video List Endpoint', response.status === 200, 'Video list endpoint returned 200', 'api');
    logTest('Video List Response', Array.isArray(response.data.videos), 'Response contains videos array', 'api');
  } catch (error) {
    logTest('Video List Endpoint', false, `Error: ${error.message}`, 'api');
  }
  
  // Test Google Drive auth endpoint
  try {
    const testUserId = 'test-user-' + Date.now();
    const response = await axios.get(`${config.baseUrl}/api/advanced-video/drive-auth?userId=${testUserId}`, { timeout: config.timeout });
    logTest('Drive Auth Endpoint', response.status === 200, 'Drive auth endpoint returned 200', 'api');
    logTest('Drive Auth Response', response.data.authUrl && response.data.userId, 'Response contains authUrl and userId', 'api');
  } catch (error) {
    logTest('Drive Auth Endpoint', false, `Error: ${error.message}`, 'api');
  }
  
  // Test video generation endpoint (mock request)
  try {
    const testScript = 'This is a test script for generating a video with 16:9 aspect ratio.';
    const response = await axios.post(
      `${config.baseUrl}/api/advanced-video/generate`,
      {
        script: testScript,
        options: {
          style: 'test',
          clipDuration: 3,
          aspectRatio: '16:9'
        }
      },
      { timeout: config.timeout * 2 }
    );
    
    logTest('Video Generation Endpoint', response.status === 200, 'Video generation endpoint returned 200', 'api');
    logTest('Video Generation Response', response.data.id && response.data.status, 'Response contains id and status', 'api');
    
    // Store request ID for status test
    if (response.data.id) {
      // Test status endpoint with the request ID
      try {
        const statusResponse = await axios.get(`${config.baseUrl}/api/advanced-video/status/${response.data.id}`, { timeout: config.timeout });
        logTest('Video Status Endpoint', statusResponse.status === 200, 'Video status endpoint returned 200', 'api');
        logTest('Video Status Response', statusResponse.data.id === response.data.id, 'Status response contains correct id', 'api');
      } catch (statusError) {
        logTest('Video Status Endpoint', false, `Error: ${statusError.message}`, 'api');
      }
    }
  } catch (error) {
    logTest('Video Generation Endpoint', false, `Error: ${error.message}`, 'api');
  }
}

/**
 * Test video generation service
 */
async function testVideoGenerationService() {
  console.log('\n--- Testing Video Generation Service ---');
  
  try {
    // Import service
    const advancedVideoService = require('../services/advancedVideoGenerationService');
    logTest('Service Import', true, 'Successfully imported video generation service', 'service');
    
    // Test script parsing
    try {
      const script = 'This is the first sentence. This is the second sentence. This is the third sentence.';
      const segments = advancedVideoService.parseScriptIntoSegments(script, 4);
      
      logTest('Script Parsing', Array.isArray(segments), 'parseScriptIntoSegments returns an array', 'service');
      logTest('Script Segments', segments.length > 0, `Parsed ${segments.length} segments`, 'service');
    } catch (error) {
      logTest('Script Parsing', false, `Error: ${error.message}`, 'service');
    }
    
    // Test video generation (mock)
    try {
      // Use a short timeout for testing
      const originalTimeout = setTimeout;
      global.setTimeout = (callback, time) => originalTimeout(callback, Math.min(time, 100));
      
      const testScript = 'This is a test script for generating a video with 16:9 aspect ratio.';
      const result = await advancedVideoService.generateVideoFromScript(testScript, { clipDuration: 3 });
      
      // Restore original timeout
      global.setTimeout = originalTimeout;
      
      logTest('Video Generation', result.id && result.status, 'generateVideoFromScript returns id and status', 'service');
      logTest('Video Aspect Ratio', result.options && result.options.aspectRatio === '16:9', 'Video has 16:9 aspect ratio', 'service');
      
      // Test status retrieval
      if (result.id) {
        const status = advancedVideoService.getVideoRequestStatus(result.id);
        logTest('Video Status', status.id === result.id, 'getVideoRequestStatus returns correct id', 'service');
      }
      
      // Test video list
      const videos = advancedVideoService.getAllVideoRequests();
      logTest('Video List', Array.isArray(videos), 'getAllVideoRequests returns an array', 'service');
    } catch (error) {
      logTest('Video Generation', false, `Error: ${error.message}`, 'service');
    }
  } catch (error) {
    logTest('Video Generation Service', false, `Error importing service: ${error.message}`, 'service');
  }
}

/**
 * Test Google Drive service
 */
async function testGoogleDriveService() {
  console.log('\n--- Testing Google Drive Service ---');
  
  try {
    // Import service
    const googleDriveService = require('../services/googleDriveService');
    logTest('Service Import', true, 'Successfully imported Google Drive service', 'drive');
    
    // Test auth URL generation
    try {
      const testUserId = 'test-user-' + Date.now();
      const authUrl = googleDriveService.getAuthUrl(testUserId);
      logTest('Auth URL Generation', typeof authUrl === 'string' && authUrl.includes('googleapis.com'), 'getAuthUrl returns valid URL', 'drive');
    } catch (error) {
      logTest('Auth URL Generation', false, `Error: ${error.message}`, 'drive');
    }
    
    // Test file upload (mock)
    try {
      // Create a test file
      const testFilePath = path.join(__dirname, 'test-file.txt');
      fs.writeFileSync(testFilePath, 'Test content');
      
      const testUserId = 'test-user-' + Date.now();
      const uploadResult = await googleDriveService.uploadFile({
        name: 'test-file.txt',
        mimeType: 'text/plain',
        filePath: testFilePath
      }, testUserId);
      
      logTest('File Upload', uploadResult.id && uploadResult.name, 'uploadFile returns id and name', 'drive');
      
      // Clean up test file
      fs.unlinkSync(testFilePath);
      
      // Test direct download link
      if (uploadResult.id) {
        const downloadUrl = await googleDriveService.createDirectDownloadLink(uploadResult.id, testUserId);
        logTest('Direct Download Link', typeof downloadUrl === 'string' && downloadUrl.includes('drive.google.com'), 'createDirectDownloadLink returns valid URL', 'drive');
      }
      
      // Test file listing
      const files = await googleDriveService.listFiles(testUserId);
      logTest('File Listing', Array.isArray(files), 'listFiles returns an array', 'drive');
    } catch (error) {
      logTest('File Upload', false, `Error: ${error.message}`, 'drive');
    }
    
    // Test video upload and download link
    try {
      const videoUrl = 'https://example.com/test-video.mp4';
      const videoName = 'test-video.mp4';
      const testUserId = 'test-user-' + Date.now();
      
      const uploadResult = await googleDriveService.uploadVideoAndCreateDownloadLink(videoUrl, videoName, testUserId);
      
      logTest('Video Upload', uploadResult.id && uploadResult.name, 'uploadVideoAndCreateDownloadLink returns id and name', 'drive');
      logTest('Download Link', typeof uploadResult.directDownloadUrl === 'string', 'Response includes directDownloadUrl', 'drive');
    } catch (error) {
      logTest('Video Upload', false, `Error: ${error.message}`, 'drive');
    }
  } catch (error) {
    logTest('Google Drive Service', false, `Error importing service: ${error.message}`, 'drive');
  }
}

/**
 * Generate HTML test report
 */
function generateHTMLReport() {
  // Create public directory if it doesn't exist
  const publicDir = path.join(__dirname, '..', 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }
  
  // Group test results by category
  const categorizedResults = {};
  testResults.forEach(result => {
    if (!categorizedResults[result.category]) {
      categorizedResults[result.category] = [];
    }
    categorizedResults[result.category].push(result);
  });
  
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>VideoEngine Railway Test Report</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      max-width: 1000px;
      margin: 0 auto;
      padding: 20px;
    }
    h1, h2, h3 {
      color: #333;
    }
    .summary {
      background-color: #f8f9fa;
      border-radius: 5px;
      padding: 15px;
      margin-bottom: 20px;
    }
    .passed {
      color: green;
    }
    .failed {
      color: red;
    }
    .test-section {
      margin-bottom: 30px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    th, td {
      border: 1px solid #ddd;
      padding: 8px;
      text-align: left;
    }
    th {
      background-color: #f2f2f2;
    }
    tr:nth-child(even) {
      background-color: #f9f9f9;
    }
    .environment {
      background-color: #e9f7fe;
      border-left: 4px solid #2196F3;
      padding: 15px;
      margin-bottom: 20px;
    }
    .progress-bar-container {
      width: 100%;
      background-color: #f3f3f3;
      border-radius: 4px;
      margin-bottom: 10px;
    }
    .progress-bar {
      height: 20px;
      border-radius: 4px;
      text-align: center;
      line-height: 20px;
      color: white;
    }
  </style>
</head>
<body>
  <h1>VideoEngine Railway Test Report</h1>
  
  <div class="summary">
    <h2>Test Summary</h2>
    <div class="progress-bar-container">
      <div class="progress-bar" style="width: ${Math.round((passedTests / totalTests) * 100)}%; background-color: ${failedTests > 0 ? '#ff9800' : '#4CAF50'};">
        ${Math.round((passedTests / totalTests) * 100)}%
      </div>
    </div>
    <p><strong>Total Tests:</strong> ${totalTests}</p>
    <p><strong>Passed:</strong> <span class="passed">${passedTests}</span></p>
    <p><strong>Failed:</strong> <span class="failed">${failedTests}</span></p>
    <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
    <p><strong>Environment:</strong> ${config.railwayEnv}</p>
  </div>
  
  <div class="environment">
    <h3>Railway Environment</h3>
    <p><strong>Node.js Version:</strong> ${process.version}</p>
    <p><strong>Railway Environment:</strong> ${process.env.RAILWAY_ENVIRONMENT || 'Not specified'}</p>
    <p><strong>Railway Service:</strong> ${process.env.RAILWAY_SERVICE_NAME || 'Not specified'}</p>
  </div>
  
  ${Object.keys(categorizedResults).map(category => `
    <div class="test-section">
      <h2>${category.charAt(0).toUpperCase() + category.slice(1)} Tests</h2>
      <table>
        <tr>
          <th>Test</th>
          <th>Result</th>
          <th>Message</th>
        </tr>
        ${categorizedResults[category].map(result => `
          <tr>
            <td>${result.name}</td>
            <td class="${result.passed ? 'passed' : 'failed'}">${result.passed ? 'PASS' : 'FAIL'}</td>
            <td>${result.message}</td>
          </tr>
        `).join('')}
      </table>
    </div>
  `).join('')}
  
  <div class="test-section">
    <h2>Fixed Issues</h2>
    <table>
      <tr>
        <th>Issue</th>
        <th>Fix</th>
      </tr>
      <tr>
        <td>Cannot read properties of null (reading 'classList')</td>
        <td>Added null checks before accessing classList property</td>
      </tr>
      <tr>
        <td>Cannot read properties of null (reading 'substring')</td>
        <td>Added null checks before calling substring method</td>
      </tr>
      <tr>
        <td>Cannot read properties of null (reading 'style')</td>
        <td>Added null checks in showSection function</td>
      </tr>
      <tr>
        <td>Event handlers accessing non-existent elements</td>
        <td>Implemented proper DOM element existence verification</td>
      </tr>
      <tr>
        <td>Missing error handling</td>
        <td>Added comprehensive error handling throughout the application</td>
      </tr>
      <tr>
        <td>Punycode deprecation warning</td>
        <td>Updated dependencies and added warning suppression</td>
      </tr>
    </table>
  </div>
  
  <footer>
    <p>Report generated on Railway at ${new Date().toISOString()}</p>
  </footer>
</body>
</html>
  `;
  
  fs.writeFileSync(config.reportPath, html);
}

// Run tests if called directly
if (require.main === module) {
  runRailwayTests()
    .then(results => {
      process.exit(results.success ? 0 : 1);
    })
    .catch(error => {
      console.error('Test runner error:', error);
      process.exit(1);
    });
}

module.exports = {
  runRailwayTests
};

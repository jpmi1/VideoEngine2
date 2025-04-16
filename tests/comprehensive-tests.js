/**
 * Comprehensive tests for VideoEngine API endpoints and services
 * This script tests all aspects of the application and generates detailed reports
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Create log file
const logFile = path.join(logsDir, 'comprehensive-test.log');
fs.writeFileSync(logFile, `Comprehensive Test - ${new Date().toISOString()}\n\n`, { flag: 'w' });

// Log function
const log = (message) => {
  const logMessage = `[${new Date().toISOString()}] ${message}\n`;
  console.log(message);
  fs.appendFileSync(logFile, logMessage);
};

// Start the server for local testing
let serverProcess = null;
const startServer = () => {
  try {
    log('Starting server for local testing...');
    // Use a separate process to start the server
    serverProcess = require('child_process').spawn('node', ['server.js'], {
      cwd: path.join(__dirname, '..'),
      stdio: 'pipe',
      detached: true
    });
    
    // Log server output
    serverProcess.stdout.on('data', (data) => {
      fs.appendFileSync(path.join(logsDir, 'server.log'), data);
    });
    
    serverProcess.stderr.on('data', (data) => {
      fs.appendFileSync(path.join(logsDir, 'server-error.log'), data);
    });
    
    // Wait for server to start
    log('Waiting for server to start...');
    return new Promise((resolve) => {
      setTimeout(() => {
        log('Server should be ready now');
        resolve();
      }, 3000);
    });
  } catch (error) {
    log(`Error starting server: ${error.message}`);
    return Promise.resolve();
  }
};

// Stop the server
const stopServer = () => {
  if (serverProcess) {
    log('Stopping server...');
    // Kill the process group
    if (process.platform === 'win32') {
      execSync(`taskkill /pid ${serverProcess.pid} /T /F`);
    } else {
      process.kill(-serverProcess.pid, 'SIGINT');
    }
    serverProcess = null;
  }
};

// Base URL - change this to your deployed URL for testing
const getBaseUrl = () => {
  // If API_URL environment variable is set, use it
  if (process.env.API_URL) {
    return process.env.API_URL;
  }
  
  // Otherwise use localhost
  return 'http://localhost:3000';
};

// Test categories
const testCategories = {
  API: 'API Endpoints',
  SERVICE: 'Service Functions',
  DRIVE: 'Google Drive Integration',
  ENVIRONMENT: 'Environment Configuration'
};

// Test results
const testResults = {
  [testCategories.API]: [],
  [testCategories.SERVICE]: [],
  [testCategories.DRIVE]: [],
  [testCategories.ENVIRONMENT]: []
};

// Add test result
const addTestResult = (category, name, success, message, data = null) => {
  testResults[category].push({
    name,
    success,
    message,
    data,
    timestamp: new Date().toISOString()
  });
  
  log(`[${category}] ${name}: ${success ? 'PASS' : 'FAIL'} - ${message}`);
};

// Test the health endpoint
const testHealth = async () => {
  try {
    const baseUrl = getBaseUrl();
    log(`Testing health endpoint at ${baseUrl}/api/health...`);
    const response = await axios.get(`${baseUrl}/api/health`);
    
    addTestResult(
      testCategories.API,
      'Health Endpoint',
      true,
      'Health endpoint returned 200',
      response.data
    );
  } catch (error) {
    addTestResult(
      testCategories.API,
      'Health Endpoint',
      false,
      `Error: ${error.message}`,
      error.response?.data
    );
  }
};

// Test the advanced video health endpoint
const testAdvancedVideoHealth = async () => {
  try {
    const baseUrl = getBaseUrl();
    log(`Testing advanced video health endpoint at ${baseUrl}/api/advanced-video/health...`);
    const response = await axios.get(`${baseUrl}/api/advanced-video/health`);
    
    addTestResult(
      testCategories.API,
      'Advanced Video Health Endpoint',
      true,
      'Advanced video health endpoint returned 200',
      response.data
    );
  } catch (error) {
    addTestResult(
      testCategories.API,
      'Advanced Video Health Endpoint',
      false,
      `Error: ${error.message}`,
      error.response?.data
    );
  }
};

// Test the video list endpoint
const testVideoList = async () => {
  try {
    const baseUrl = getBaseUrl();
    log(`Testing video list endpoint at ${baseUrl}/api/advanced-video/list...`);
    const response = await axios.get(`${baseUrl}/api/advanced-video/list`);
    
    // Verify response contains videos array
    if (response.data && Array.isArray(response.data.videos)) {
      addTestResult(
        testCategories.API,
        'Video List Endpoint',
        true,
        'Video list endpoint returned 200 with videos array',
        response.data
      );
      
      addTestResult(
        testCategories.API,
        'Video List Response',
        true,
        'Response contains videos array',
        { count: response.data.videos.length }
      );
    } else {
      addTestResult(
        testCategories.API,
        'Video List Endpoint',
        true,
        'Video list endpoint returned 200',
        response.data
      );
      
      addTestResult(
        testCategories.API,
        'Video List Response',
        false,
        'Response does not contain videos array',
        response.data
      );
    }
  } catch (error) {
    addTestResult(
      testCategories.API,
      'Video List Endpoint',
      false,
      `Error: ${error.message}`,
      error.response?.data
    );
    
    addTestResult(
      testCategories.API,
      'Video List Response',
      false,
      'Could not test response format due to endpoint error',
      null
    );
  }
};

// Test the generate endpoint
const testGenerateEndpoint = async () => {
  try {
    const baseUrl = getBaseUrl();
    log(`Testing generate endpoint at ${baseUrl}/api/advanced-video/generate...`);
    const response = await axios.post(`${baseUrl}/api/advanced-video/generate`, {
      prompt: 'Test prompt for generate endpoint',
      options: {
        duration: 5
      }
    });
    
    // Verify response contains expected fields
    if (response.data && response.data.id && response.data.status) {
      addTestResult(
        testCategories.API,
        'Video Generation Endpoint',
        true,
        'Generate endpoint returned 200 with expected fields',
        response.data
      );
      
      // Check if aspect ratio is 16:9
      if (response.data.options && response.data.options.aspectRatio === '16:9') {
        addTestResult(
          testCategories.API,
          'Video Aspect Ratio',
          true,
          'Video has 16:9 aspect ratio',
          { aspectRatio: response.data.options.aspectRatio }
        );
      } else {
        addTestResult(
          testCategories.API,
          'Video Aspect Ratio',
          false,
          'Video does not have 16:9 aspect ratio',
          { aspectRatio: response.data.options?.aspectRatio }
        );
      }
      
      return response.data.id;
    } else {
      addTestResult(
        testCategories.API,
        'Video Generation Endpoint',
        false,
        'Response does not contain expected fields',
        response.data
      );
      
      addTestResult(
        testCategories.API,
        'Video Aspect Ratio',
        false,
        'Could not test aspect ratio due to missing fields',
        null
      );
      
      return null;
    }
  } catch (error) {
    addTestResult(
      testCategories.API,
      'Video Generation Endpoint',
      false,
      `Error: ${error.message}`,
      error.response?.data
    );
    
    addTestResult(
      testCategories.API,
      'Video Aspect Ratio',
      false,
      'Could not test aspect ratio due to endpoint error',
      null
    );
    
    return null;
  }
};

// Test the status endpoint
const testStatusEndpoint = async (taskId) => {
  if (!taskId) {
    addTestResult(
      testCategories.API,
      'Video Status Endpoint',
      false,
      'No task ID available for status test',
      null
    );
    return;
  }
  
  try {
    const baseUrl = getBaseUrl();
    log(`Testing status endpoint at ${baseUrl}/api/advanced-video/status/${taskId}...`);
    const response = await axios.get(`${baseUrl}/api/advanced-video/status/${taskId}`);
    
    // Verify response contains expected fields
    if (response.data && response.data.id && response.data.status) {
      addTestResult(
        testCategories.API,
        'Video Status Endpoint',
        true,
        'Status endpoint returned 200 with expected fields',
        response.data
      );
    } else {
      addTestResult(
        testCategories.API,
        'Video Status Endpoint',
        false,
        'Response does not contain expected fields',
        response.data
      );
    }
  } catch (error) {
    addTestResult(
      testCategories.API,
      'Video Status Endpoint',
      false,
      `Error: ${error.message}`,
      error.response?.data
    );
  }
};

// Test the environment variables check endpoint
const testEnvCheck = async () => {
  try {
    const baseUrl = getBaseUrl();
    log(`Testing environment variables check endpoint at ${baseUrl}/api/env-check...`);
    const response = await axios.get(`${baseUrl}/api/env-check`);
    
    addTestResult(
      testCategories.ENVIRONMENT,
      'Environment Variables Check',
      true,
      'Environment variables check endpoint returned 200',
      response.data
    );
    
    // Check if required environment variables are set
    const envVars = response.data.environmentVariables;
    if (envVars) {
      const requiredVars = ['KLING_API_KEY_ID', 'KLING_API_KEY_SECRET'];
      const missingVars = requiredVars.filter(v => envVars[v] === 'Not set');
      
      if (missingVars.length === 0) {
        addTestResult(
          testCategories.ENVIRONMENT,
          'Required Environment Variables',
          true,
          'All required environment variables are set',
          { variables: requiredVars }
        );
      } else {
        addTestResult(
          testCategories.ENVIRONMENT,
          'Required Environment Variables',
          false,
          'Some required environment variables are not set',
          { missingVariables: missingVars }
        );
      }
    }
  } catch (error) {
    addTestResult(
      testCategories.ENVIRONMENT,
      'Environment Variables Check',
      false,
      `Error: ${error.message}`,
      error.response?.data
    );
  }
};

// Test service imports
const testServiceImports = () => {
  try {
    log('Testing service imports...');
    
    // Try to import the services
    const advancedVideoService = require('../services/advancedVideoService');
    const klingAiService = require('../services/klingAiService');
    const googleDriveService = require('../services/googleDriveService');
    
    addTestResult(
      testCategories.SERVICE,
      'Service Import',
      true,
      'Successfully imported all services',
      { 
        services: [
          'advancedVideoService', 
          'klingAiService', 
          'googleDriveService'
        ] 
      }
    );
    
    // Check if required functions exist
    if (typeof advancedVideoService.parseScriptIntoSegments === 'function') {
      addTestResult(
        testCategories.SERVICE,
        'Script Parsing',
        true,
        'parseScriptIntoSegments function exists',
        null
      );
    } else {
      addTestResult(
        testCategories.SERVICE,
        'Script Parsing',
        false,
        'parseScriptIntoSegments function does not exist',
        null
      );
    }
    
    if (typeof advancedVideoService.generateVideoFromScript === 'function') {
      addTestResult(
        testCategories.SERVICE,
        'Video Generation',
        true,
        'generateVideoFromScript function exists',
        null
      );
    } else {
      addTestResult(
        testCategories.SERVICE,
        'Video Generation',
        false,
        'generateVideoFromScript function does not exist',
        null
      );
    }
    
    if (typeof advancedVideoService.getVideoRequestStatus === 'function') {
      addTestResult(
        testCategories.SERVICE,
        'Video Status Check',
        true,
        'getVideoRequestStatus function exists',
        null
      );
    } else {
      addTestResult(
        testCategories.SERVICE,
        'Video Status Check',
        false,
        'getVideoRequestStatus function does not exist',
        null
      );
    }
    
    return {
      advancedVideoService,
      klingAiService,
      googleDriveService
    };
  } catch (error) {
    addTestResult(
      testCategories.SERVICE,
      'Service Import',
      false,
      `Error importing services: ${error.message}`,
      { stack: error.stack }
    );
    
    return null;
  }
};

// Test script parsing
const testScriptParsing = (services) => {
  if (!services || !services.advancedVideoService) {
    addTestResult(
      testCategories.SERVICE,
      'Script Parsing Test',
      false,
      'Services not available for testing',
      null
    );
    return;
  }
  
  try {
    log('Testing script parsing...');
    const testScript = 'This is a test script. It should be parsed into segments. Each segment should be a few seconds long. This will test the parsing functionality.';
    
    const segments = services.advancedVideoService.parseScriptIntoSegments(testScript, 4);
    
    if (Array.isArray(segments) && segments.length > 0) {
      addTestResult(
        testCategories.SERVICE,
        'Script Parsing Test',
        true,
        `Successfully parsed script into ${segments.length} segments`,
        { segments }
      );
    } else {
      addTestResult(
        testCategories.SERVICE,
        'Script Parsing Test',
        false,
        'Failed to parse script into segments',
        { segments }
      );
    }
  } catch (error) {
    addTestResult(
      testCategories.SERVICE,
      'Script Parsing Test',
      false,
      `Error parsing script: ${error.message}`,
      { stack: error.stack }
    );
  }
};

// Generate HTML report
const generateHtmlReport = () => {
  log('Generating HTML report...');
  
  // Calculate summary statistics
  const summary = {
    total: 0,
    passed: 0,
    failed: 0,
    categories: {}
  };
  
  Object.entries(testResults).forEach(([category, tests]) => {
    summary.categories[category] = {
      total: tests.length,
      passed: tests.filter(t => t.success).length,
      failed: tests.filter(t => !t.success).length
    };
    
    summary.total += tests.length;
    summary.passed += tests.filter(t => t.success).length;
    summary.failed += tests.filter(t => !t.success).length;
  });
  
  summary.passPercentage = Math.round((summary.passed / summary.total) * 100);
  
  // Generate HTML
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>VideoEngine Test Report</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }
    h1, h2, h3 {
      color: #0066cc;
    }
    .summary {
      background-color: #f5f5f5;
      padding: 20px;
      border-radius: 5px;
      margin-bottom: 30px;
    }
    .progress-container {
      width: 100%;
      background-color: #e0e0e0;
      border-radius: 4px;
      margin: 10px 0;
    }
    .progress-bar {
      height: 20px;
      border-radius: 4px;
      background-color: #4CAF50;
      text-align: center;
      line-height: 20px;
      color: white;
    }
    .category {
      margin-bottom: 30px;
    }
    .test {
      margin-bottom: 15px;
      padding: 15px;
      border-radius: 5px;
    }
    .test-pass {
      background-color: #e8f5e9;
      border-left: 5px solid #4CAF50;
    }
    .test-fail {
      background-color: #ffebee;
      border-left: 5px solid #f44336;
    }
    .test-details {
      margin-top: 10px;
      padding: 10px;
      background-color: #f9f9f9;
      border-radius: 4px;
      overflow-x: auto;
    }
    .timestamp {
      color: #666;
      font-size: 0.8em;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #ddd;
    }
    th {
      background-color: #f2f2f2;
    }
  </style>
</head>
<body>
  <h1>VideoEngine Test Report</h1>
  <p>Generated: ${new Date().toLocaleString()}</p>
  
  <div class="summary">
    <h2>Test Summary</h2>
    <div class="progress-container">
      <div class="progress-bar" style="width: ${summary.passPercentage}%">
        ${summary.passPercentage}%
      </div>
    </div>
    <p>Total Tests: ${summary.total}</p>
    <p>Passed: ${summary.passed}</p>
    <p>Failed: ${summary.failed}</p>
    
    <h3>Results by Category</h3>
    <table>
      <tr>
        <th>Category</th>
        <th>Total</th>
        <th>Passed</th>
        <th>Failed</th>
        <th>Pass Rate</th>
      </tr>
      ${Object.entries(summary.categories).map(([category, stats]) => `
        <tr>
          <td>${category}</td>
          <td>${stats.total}</td>
          <td>${stats.passed}</td>
          <td>${stats.failed}</td>
          <td>${Math.round((stats.passed / stats.total) * 100)}%</td>
        </tr>
      `).join('')}
    </table>
  </div>
  
  ${Object.entries(testResults).map(([category, tests]) => `
    <div class="category">
      <h2>${category}</h2>
      ${tests.map(test => `
        <div class="test ${test.success ? 'test-pass' : 'test-fail'}">
          <h3>${test.name}</h3>
          <p><strong>${test.success ? 'PASS' : 'FAIL'}</strong> - ${test.message}</p>
          <p class="timestamp">Timestamp: ${new Date(test.timestamp).toLocaleString()}</p>
          ${test.data ? `
            <div class="test-details">
              <pre>${JSON.stringify(test.data, null, 2)}</pre>
            </div>
          ` : ''}
        </div>
      `).join('')}
    </div>
  `).join('')}
</body>
</html>
  `;
  
  // Write HTML report to file
  const reportFile = path.join(logsDir, 'test-report.html');
  fs.writeFileSync(reportFile, html);
  
  log(`HTML report saved to ${reportFile}`);
  
  return reportFile;
};

// Run all tests
const runTests = async () => {
  log('Starting comprehensive tests...');
  
  // Test service imports first
  const services = testServiceImports();
  
  // Test script parsing
  testScriptParsing(services);
  
  // Start server for local testing if needed
  const isLocalTest = !process.env.API_URL;
  if (isLocalTest) {
    await startServer();
  }
  
  try {
    // Test API endpoints
    await testHealth();
    await testAdvancedVideoHealth();
    await testVideoList();
    await testEnvCheck();
    
    // Test video generation
    const taskId = await testGenerateEndpoint();
    
    // Test status endpoint
    await testStatusEndpoint(taskId);
  } finally {
    // Stop server if we started it
    if (isLocalTest) {
      stopServer();
    }
  }
  
  // Generate summary
  log('\nTest Summary:');
  Object.entries(testResults).forEach(([category, tests]) => {
    const passed = tests.filter(t => t.success).length;
    const total = tests.length;
    const percentage = Math.round((passed / total) * 100);
    
    log(`${category}: ${passed}/${total} (${percentage}%)`);
  });
  
  // Calculate overall results
  const totalTests = Object.values(testResults).flat().length;
  const passedTests = Object.values(testResults).flat().filter(t => t.success).length;
  const passPercentage = Math.round((passedTests / totalTests) * 100);
  
  log(`\nOverall: ${passedTests}/${totalTests} tests passed (${passPercentage}%)`);
  
  // Generate HTML report
  const reportFile = generateHtmlReport();
  
  // Return summary
  return {
    totalTests,
    passedTests,
    failedTests: totalTests - passedTests,
    passPercentage,
    reportFile,
    results: testResults
  };
};

// Run the tests if this file is executed directly
if (require.main === module) {
  runTests();
}

module.exports = {
  runTests,
  testHealth,
  testAdvancedVideoHealth,
  testVideoList,
  testGenerateEndpoint,
  testStatusEndpoint,
  testEnvCheck,
  testServiceImports,
  testScriptParsing,
  generateHtmlReport
};

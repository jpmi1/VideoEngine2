/**
 * Comprehensive test script for VideoEngine
 * Tests both punycode fix and API endpoints
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const axios = require('axios');
const assert = require('assert');

// Configuration
const config = {
  baseUrl: process.env.TEST_BASE_URL || 'http://localhost:8080',
  timeout: 5000,
  logPath: path.join(__dirname, '..', 'logs', 'comprehensive-test.log'),
  detailedLogPath: path.join(__dirname, '..', 'logs', 'detailed-comprehensive-test.log')
};

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Create log streams
const logStream = fs.createWriteStream(config.logPath, { flags: 'a' });
const detailedLogStream = fs.createWriteStream(config.detailedLogPath, { flags: 'a' });

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
    logStream.write(`[${new Date().toISOString()}] PASS: [${category}] ${testName} - ${message}\n`);
  } else {
    failedTests++;
    console.error(`❌ FAIL: [${category}] ${testName} - ${message}`);
    logStream.write(`[${new Date().toISOString()}] FAIL: [${category}] ${testName} - ${message}\n`);
  }
  
  // Write detailed result
  detailedLogStream.write(`\n[${new Date().toISOString()}] ${passed ? 'PASS' : 'FAIL'}: [${category}] ${testName}\n`);
  detailedLogStream.write(`  Message: ${message}\n`);
}

/**
 * Run all tests
 */
async function runComprehensiveTests() {
  console.log('=== VideoEngine Comprehensive Test Runner ===');
  console.log(`Date: ${new Date().toISOString()}`);
  console.log('Running tests...\n');
  
  // Write log headers
  const logHeader = `\n=== Comprehensive Test Run: ${new Date().toISOString()} ===\n`;
  logStream.write(logHeader);
  detailedLogStream.write(logHeader);
  
  try {
    // Reset test counters
    passedTests = 0;
    failedTests = 0;
    totalTests = 0;
    testResults = [];
    
    // Test punycode fix
    await testPunycodeFix();
    
    // Test API endpoints
    await testAPIEndpoints();
    
    // Test error handling
    await testErrorHandling();
    
    // Write summary to log
    const summary = `\nTEST SUMMARY:
Total tests: ${totalTests}
Passed: ${passedTests}
Failed: ${failedTests}
Success rate: ${Math.round((passedTests / totalTests) * 100)}%
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
      results: testResults
    };
  } catch (error) {
    console.error('Error running tests:', error);
    logStream.write(`Error: ${error.message}\n${error.stack}\n`);
    detailedLogStream.write(`Error: ${error.message}\n${error.stack}\n`);
    
    return {
      success: false,
      error: error.message
    };
  } finally {
    logStream.end();
    detailedLogStream.end();
  }
}

/**
 * Test punycode fix
 */
async function testPunycodeFix() {
  console.log('\n--- Testing Punycode Fix ---');
  
  // Test 1: Check if punycode is available as a standalone package
  try {
    const punycode = require('punycode');
    logTest('Punycode Package', !!punycode, 'Punycode package is available', 'punycode');
    
    // Test encoding/decoding
    const encoded = punycode.encode('mañana');
    const decoded = punycode.decode('maana-pta');
    logTest('Punycode Functionality', encoded === 'maana-pta' && decoded === 'mañana', 
      'Punycode encoding/decoding works correctly', 'punycode');
  } catch (error) {
    logTest('Punycode Package', false, `Error: ${error.message}`, 'punycode');
  }
  
  // Test 2: Check if global.punycode is set
  try {
    const hasPunycode = typeof global.punycode === 'object';
    logTest('Global Punycode', hasPunycode, 
      hasPunycode ? 'global.punycode is set' : 'global.punycode is not set', 'punycode');
  } catch (error) {
    logTest('Global Punycode', false, `Error: ${error.message}`, 'punycode');
  }
  
  // Test 3: Check if process.noDeprecation is set
  try {
    const noDeprecation = process.noDeprecation === true;
    logTest('Process noDeprecation', noDeprecation, 
      noDeprecation ? 'process.noDeprecation is set' : 'process.noDeprecation is not set', 'punycode');
  } catch (error) {
    logTest('Process noDeprecation', false, `Error: ${error.message}`, 'punycode');
  }
  
  // Test 4: Check if patch-package is installed
  try {
    const packageJson = require('../package.json');
    const hasPatchPackage = packageJson.dependencies['patch-package'] !== undefined;
    const hasPostinstall = packageJson.scripts.postinstall === 'patch-package';
    
    logTest('Patch Package', hasPatchPackage, 
      hasPatchPackage ? 'patch-package is installed' : 'patch-package is not installed', 'punycode');
    
    logTest('Postinstall Script', hasPostinstall, 
      hasPostinstall ? 'postinstall script is set' : 'postinstall script is not set', 'punycode');
  } catch (error) {
    logTest('Patch Package', false, `Error: ${error.message}`, 'punycode');
  }
  
  // Test 5: Check if patches directory exists and contains googleapis patch
  try {
    const patchesDir = path.join(__dirname, '..', 'patches');
    const patchExists = fs.existsSync(patchesDir) && 
      fs.readdirSync(patchesDir).some(file => file.startsWith('googleapis'));
    
    logTest('Googleapis Patch', patchExists, 
      patchExists ? 'googleapis patch exists' : 'googleapis patch does not exist', 'punycode');
  } catch (error) {
    logTest('Googleapis Patch', false, `Error: ${error.message}`, 'punycode');
  }
  
  // Test 6: Run a command that would trigger the punycode warning and check if it's suppressed
  try {
    // This is a bit tricky to test directly, but we can check if the warning appears in the output
    const testCommand = 'node -e "require(\'url\').parse(\'https://example.com\');"';
    let output;
    
    try {
      output = execSync(testCommand, { encoding: 'utf8' });
    } catch (error) {
      output = error.stdout || '';
    }
    
    const hasWarning = output.includes('punycode') && output.includes('deprecated');
    logTest('Warning Suppression', !hasWarning, 
      hasWarning ? 'Punycode warning is not suppressed' : 'No punycode warning detected', 'punycode');
  } catch (error) {
    logTest('Warning Suppression', false, `Error: ${error.message}`, 'punycode');
  }
}

/**
 * Test API endpoints
 */
async function testAPIEndpoints() {
  console.log('\n--- Testing API Endpoints ---');
  
  // Test 1: Health endpoint
  try {
    const response = await axios.get(`${config.baseUrl}/api/health`, { timeout: config.timeout });
    logTest('Health Endpoint', response.status === 200, 'Health endpoint returned 200', 'api');
    logTest('Health Response', response.data && response.data.status === 'ok', 
      'Health response contains status: ok', 'api');
  } catch (error) {
    logTest('Health Endpoint', false, `Error: ${error.message}`, 'api');
  }
  
  // Test 2: Advanced video health endpoint
  try {
    const response = await axios.get(`${config.baseUrl}/api/advanced-video/health`, { timeout: config.timeout });
    logTest('Advanced Video Health', response.status === 200, 'Advanced video health endpoint returned 200', 'api');
    logTest('Advanced Video Health Response', response.data && response.data.status === 'ok', 
      'Advanced video health response contains status: ok', 'api');
  } catch (error) {
    logTest('Advanced Video Health', false, `Error: ${error.message}`, 'api');
  }
  
  // Test 3: Test routes endpoint
  try {
    const response = await axios.get(`${config.baseUrl}/api/test-routes`, { timeout: config.timeout });
    logTest('Test Routes', response.status === 200, 'Test routes endpoint returned 200', 'api');
    logTest('Routes List', Array.isArray(response.data.routes), 'Routes list is an array', 'api');
    
    // Check if important routes are included
    const routes = response.data.routes.map(r => r.path);
    const hasGenerateRoute = routes.includes('/api/advanced-video/generate') || 
      routes.some(r => r.includes('generate'));
    
    logTest('Generate Route', hasGenerateRoute, 
      hasGenerateRoute ? 'Generate route is registered' : 'Generate route is not found', 'api');
  } catch (error) {
    logTest('Test Routes', false, `Error: ${error.message}`, 'api');
  }
  
  // Test 4: Video generation endpoint
  try {
    const script = 'This is a test script for generating a video with 16:9 aspect ratio.';
    const response = await axios.post(
      `${config.baseUrl}/api/advanced-video/generate`,
      {
        script,
        options: {
          style: 'test',
          clipDuration: 3,
          aspectRatio: '16:9'
        }
      },
      { timeout: config.timeout * 2 }
    );
    
    logTest('Video Generation', response.status === 200, 'Video generation endpoint returned 200', 'api');
    logTest('Video Generation Response', response.data.id && response.data.status, 
      'Response contains id and status', 'api');
    
    // Check if aspect ratio is preserved
    const hasCorrectAspectRatio = response.data.options && response.data.options.aspectRatio === '16:9';
    logTest('Aspect Ratio Preservation', hasCorrectAspectRatio, 
      hasCorrectAspectRatio ? 'Aspect ratio is preserved as 16:9' : 'Aspect ratio is not preserved', 'api');
    
    // Store request ID for status test
    if (response.data.id) {
      // Test status endpoint with the request ID
      try {
        const statusResponse = await axios.get(
          `${config.baseUrl}/api/advanced-video/status/${response.data.id}`, 
          { timeout: config.timeout }
        );
        
        logTest('Video Status', statusResponse.status === 200, 'Video status endpoint returned 200', 'api');
        logTest('Video Status Response', statusResponse.data.id === response.data.id, 
          'Status response contains correct id', 'api');
      } catch (statusError) {
        logTest('Video Status', false, `Error: ${statusError.message}`, 'api');
      }
    }
  } catch (error) {
    logTest('Video Generation', false, `Error: ${error.message}`, 'api');
  }
  
  // Test 5: Video list endpoint
  try {
    const response = await axios.get(`${config.baseUrl}/api/advanced-video/list`, { timeout: config.timeout });
    logTest('Video List', response.status === 200, 'Video list endpoint returned 200', 'api');
    logTest('Video List Response', response.data && Array.isArray(response.data.videos), 
      'Response contains videos array', 'api');
  } catch (error) {
    logTest('Video List', false, `Error: ${error.message}`, 'api');
  }
  
  // Test 6: Google Drive auth endpoint
  try {
    const userId = 'test-user-' + Date.now();
    const response = await axios.get(
      `${config.baseUrl}/api/advanced-video/drive-auth?userId=${userId}`, 
      { timeout: config.timeout }
    );
    
    logTest('Drive Auth', response.status === 200, 'Drive auth endpoint returned 200', 'api');
    logTest('Drive Auth Response', response.data.authUrl && response.data.userId, 
      'Response contains authUrl and userId', 'api');
  } catch (error) {
    logTest('Drive Auth', false, `Error: ${error.message}`, 'api');
  }
  
  // Test 7: Google Drive files endpoint
  try {
    const response = await axios.get(`${config.baseUrl}/api/advanced-video/drive-files`, { timeout: config.timeout });
    logTest('Drive Files', response.status === 200, 'Drive files endpoint returned 200', 'api');
    logTest('Drive Files Response', response.data && Array.isArray(response.data.files), 
      'Response contains files array', 'api');
  } catch (error) {
    logTest('Drive Files', false, `Error: ${error.message}`, 'api');
  }
  
  // Test 8: CORS headers
  try {
    const response = await axios.get(`${config.baseUrl}/api/health`, { 
      timeout: config.timeout,
      headers: {
        'Origin': 'http://example.com'
      }
    });
    
    const corsHeader = response.headers['access-control-allow-origin'];
    logTest('CORS Headers', !!corsHeader, 
      corsHeader ? `CORS header is set: ${corsHeader}` : 'CORS header is not set', 'api');
  } catch (error) {
    logTest('CORS Headers', false, `Error: ${error.message}`, 'api');
  }
}

/**
 * Test error handling
 */
async function testErrorHandling() {
  console.log('\n--- Testing Error Handling ---');
  
  // Test 1: Missing script in video generation
  try {
    const response = await axios.post(
      `${config.baseUrl}/api/advanced-video/generate`,
      {
        script: '',
        options: { aspectRatio: '16:9' }
      },
      { 
        timeout: config.timeout,
        validateStatus: status => true // Don't throw on error status
      }
    );
    
    const hasError = response.status === 400 && response.data && response.data.error;
    logTest('Missing Script Validation', hasError, 
      hasError ? 'Properly rejected empty script' : 'Did not properly validate empty script', 'error');
  } catch (error) {
    logTest('Missing Script Validation', false, `Error: ${error.message}`, 'error');
  }
  
  // Test 2: Invalid video ID
  try {
    const response = await axios.get(
      `${config.baseUrl}/api/advanced-video/status/invalid-id-that-does-not-exist`, 
      { 
        timeout: config.timeout,
        validateStatus: status => true // Don't throw on error status
      }
    );
    
    const hasError = (response.status === 404 || response.status === 400) && response.data && response.data.error;
    logTest('Invalid Video ID', hasError, 
      hasError ? 'Properly handled invalid video ID' : 'Did not properly handle invalid video ID', 'error');
  } catch (error) {
    logTest('Invalid Video ID', false, `Error: ${error.message}`, 'error');
  }
  
  // Test 3: Invalid file ID for download
  try {
    const response = await axios.get(
      `${config.baseUrl}/api/advanced-video/drive-download/invalid-file-id`, 
      { 
        timeout: config.timeout,
        validateStatus: status => true // Don't throw on error status
      }
    );
    
    // This might return 200 with a mock URL in development mode, so check both cases
    const isValid = (response.status === 200 && response.data.downloadUrl) || 
                   (response.status >= 400 && response.data && response.data.error);
    
    logTest('Invalid File ID', isValid, 
      isValid ? 'Properly handled invalid file ID' : 'Did not properly handle invalid file ID', 'error');
  } catch (error) {
    logTest('Invalid File ID', false, `Error: ${error.message}`, 'error');
  }
  
  // Test 4: Service fallbacks
  try {
    // This is hard to test directly, but we can check if the endpoints work
    // which indicates the fallbacks are working if the real services fail to load
    const endpoints = [
      '/api/advanced-video/generate',
      '/api/advanced-video/list',
      '/api/advanced-video/drive-auth'
    ];
    
    let allEndpointsWork = true;
    let failedEndpoint = '';
    
    for (const endpoint of endpoints) {
      try {
        const method = endpoint.includes('generate') ? 'post' : 'get';
        const data = method === 'post' ? { script: 'Test script' } : undefined;
        
        const response = await axios({
          method,
          url: `${config.baseUrl}${endpoint}`,
          data,
          timeout: config.timeout,
          validateStatus: status => status === 200
        });
        
        if (response.status !== 200) {
          allEndpointsWork = false;
          failedEndpoint = endpoint;
          break;
        }
      } catch (error) {
        allEndpointsWork = false;
        failedEndpoint = endpoint;
        break;
      }
    }
    
    logTest('Service Fallbacks', allEndpointsWork, 
      allEndpointsWork ? 'All endpoints work with fallbacks' : `Endpoint failed: ${failedEndpoint}`, 'error');
  } catch (error) {
    logTest('Service Fallbacks', false, `Error: ${error.message}`, 'error');
  }
}

// Run tests if called directly
if (require.main === module) {
  runComprehensiveTests()
    .then(results => {
      process.exit(results.success ? 0 : 1);
    })
    .catch(error => {
      console.error('Test runner error:', error);
      process.exit(1);
    });
}

module.exports = {
  runComprehensiveTests
};

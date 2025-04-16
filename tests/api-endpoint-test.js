// This file tests the API endpoints to ensure they are accessible
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Create log file
const logFile = path.join(logsDir, 'api-test.log');
fs.writeFileSync(logFile, `API Endpoint Test - ${new Date().toISOString()}\n\n`, { flag: 'w' });

// Log function
const log = (message) => {
  const logMessage = `[${new Date().toISOString()}] ${message}\n`;
  console.log(message);
  fs.appendFileSync(logFile, logMessage);
};

// Base URL - change this to your deployed URL for testing
const BASE_URL = process.env.API_URL || 'http://localhost:3000';

// Test the health endpoint
const testHealth = async () => {
  try {
    log('Testing health endpoint...');
    const response = await axios.get(`${BASE_URL}/api/health`);
    log(`Health endpoint response: ${JSON.stringify(response.data)}`);
    return {
      success: true,
      message: 'Health endpoint returned 200',
      data: response.data
    };
  } catch (error) {
    log(`Error testing health endpoint: ${error.message}`);
    if (error.response) {
      log(`Response data: ${JSON.stringify(error.response.data)}`);
    }
    return {
      success: false,
      message: `Error: ${error.message}`,
      error
    };
  }
};

// Test the advanced video health endpoint
const testAdvancedVideoHealth = async () => {
  try {
    log('Testing advanced video health endpoint...');
    const response = await axios.get(`${BASE_URL}/api/advanced-video/health`);
    log(`Advanced video health endpoint response: ${JSON.stringify(response.data)}`);
    return {
      success: true,
      message: 'Advanced video health endpoint returned 200',
      data: response.data
    };
  } catch (error) {
    log(`Error testing advanced video health endpoint: ${error.message}`);
    if (error.response) {
      log(`Response data: ${JSON.stringify(error.response.data)}`);
    }
    return {
      success: false,
      message: `Error: ${error.message}`,
      error
    };
  }
};

// Test the video list endpoint
const testVideoList = async () => {
  try {
    log('Testing video list endpoint...');
    const response = await axios.get(`${BASE_URL}/api/advanced-video/list`);
    log(`Video list endpoint response: ${JSON.stringify(response.data)}`);
    
    // Verify response contains videos array
    if (response.data && Array.isArray(response.data.videos)) {
      return {
        success: true,
        message: 'Video list endpoint returned 200 with videos array',
        data: response.data
      };
    } else {
      return {
        success: false,
        message: 'Response does not contain videos array',
        data: response.data
      };
    }
  } catch (error) {
    log(`Error testing video list endpoint: ${error.message}`);
    if (error.response) {
      log(`Response data: ${JSON.stringify(error.response.data)}`);
    }
    return {
      success: false,
      message: `Error: ${error.message}`,
      error
    };
  }
};

// Test the direct API route
const testDirectApiRoute = async () => {
  try {
    log('Testing direct API route...');
    const response = await axios.post(`${BASE_URL}/direct-api/advanced-video/generate`, {
      prompt: 'Test prompt for direct API route',
      options: {
        duration: 5
      }
    });
    log(`Direct API route response: ${JSON.stringify(response.data)}`);
    return {
      success: true,
      message: 'Direct API route returned 200',
      data: response.data
    };
  } catch (error) {
    log(`Error testing direct API route: ${error.message}`);
    if (error.response) {
      log(`Response data: ${JSON.stringify(error.response.data)}`);
    }
    return {
      success: false,
      message: `Error: ${error.message}`,
      error
    };
  }
};

// Test the regular generate endpoint
const testGenerateEndpoint = async () => {
  try {
    log('Testing generate endpoint...');
    const response = await axios.post(`${BASE_URL}/api/advanced-video/generate`, {
      prompt: 'Test prompt for generate endpoint',
      options: {
        duration: 5
      }
    });
    log(`Generate endpoint response: ${JSON.stringify(response.data)}`);
    
    // Verify response contains expected fields
    if (response.data && response.data.id && response.data.status) {
      return {
        success: true,
        message: 'Generate endpoint returned 200 with expected fields',
        data: response.data
      };
    } else {
      return {
        success: false,
        message: 'Response does not contain expected fields',
        data: response.data
      };
    }
  } catch (error) {
    log(`Error testing generate endpoint: ${error.message}`);
    if (error.response) {
      log(`Response data: ${JSON.stringify(error.response.data)}`);
      log(`Response status: ${error.response.status}`);
      log(`Response headers: ${JSON.stringify(error.response.headers)}`);
    }
    return {
      success: false,
      message: `Error: ${error.message}`,
      error
    };
  }
};

// Test the environment variables check endpoint
const testEnvCheck = async () => {
  try {
    log('Testing environment variables check endpoint...');
    const response = await axios.get(`${BASE_URL}/api/env-check`);
    log(`Environment variables check endpoint response: ${JSON.stringify(response.data)}`);
    return {
      success: true,
      message: 'Environment variables check endpoint returned 200',
      data: response.data
    };
  } catch (error) {
    log(`Error testing environment variables check endpoint: ${error.message}`);
    if (error.response) {
      log(`Response data: ${JSON.stringify(error.response.data)}`);
    }
    return {
      success: false,
      message: `Error: ${error.message}`,
      error
    };
  }
};

// Test the test-routes endpoint
const testRoutesEndpoint = async () => {
  try {
    log('Testing test-routes endpoint...');
    const response = await axios.get(`${BASE_URL}/api/test-routes`);
    log(`Test-routes endpoint response: ${JSON.stringify(response.data)}`);
    return {
      success: true,
      message: 'Test-routes endpoint returned 200',
      data: response.data
    };
  } catch (error) {
    log(`Error testing test-routes endpoint: ${error.message}`);
    if (error.response) {
      log(`Response data: ${JSON.stringify(error.response.data)}`);
    }
    return {
      success: false,
      message: `Error: ${error.message}`,
      error
    };
  }
};

// Test the status endpoint
const testStatusEndpoint = async () => {
  try {
    // First generate a video to get a task ID
    log('Generating video to test status endpoint...');
    const generateResponse = await axios.post(`${BASE_URL}/api/advanced-video/generate`, {
      prompt: 'Test prompt for status endpoint',
      options: {
        duration: 5
      }
    });
    
    if (!generateResponse.data || !generateResponse.data.id) {
      return {
        success: false,
        message: 'Failed to generate video for status test',
        data: generateResponse.data
      };
    }
    
    const taskId = generateResponse.data.id;
    log(`Testing status endpoint with task ID: ${taskId}`);
    
    // Now test the status endpoint
    const response = await axios.get(`${BASE_URL}/api/advanced-video/status/${taskId}`);
    log(`Status endpoint response: ${JSON.stringify(response.data)}`);
    
    // Verify response contains expected fields
    if (response.data && response.data.id && response.data.status) {
      return {
        success: true,
        message: 'Status endpoint returned 200 with expected fields',
        data: response.data
      };
    } else {
      return {
        success: false,
        message: 'Response does not contain expected fields',
        data: response.data
      };
    }
  } catch (error) {
    log(`Error testing status endpoint: ${error.message}`);
    if (error.response) {
      log(`Response data: ${JSON.stringify(error.response.data)}`);
    }
    return {
      success: false,
      message: `Error: ${error.message}`,
      error
    };
  }
};

// Run all tests
const runTests = async () => {
  log('Starting API endpoint tests...');
  
  const results = {
    health: await testHealth(),
    advancedVideoHealth: await testAdvancedVideoHealth(),
    videoList: await testVideoList(),
    directApiRoute: await testDirectApiRoute(),
    generateEndpoint: await testGenerateEndpoint(),
    statusEndpoint: await testStatusEndpoint(),
    envCheck: await testEnvCheck(),
    testRoutes: await testRoutesEndpoint()
  };
  
  log('\nTest Results:');
  let passCount = 0;
  let totalTests = 0;
  
  Object.entries(results).forEach(([test, result]) => {
    totalTests++;
    if (result.success) {
      passCount++;
      log(`${test}: PASS - ${result.message}`);
    } else {
      log(`${test}: FAIL - ${result.message}`);
    }
  });
  
  const passPercentage = Math.round((passCount / totalTests) * 100);
  
  log(`\nSummary: ${passCount}/${totalTests} tests passed (${passPercentage}%)`);
  
  // Create a detailed test report
  const reportFile = path.join(logsDir, 'api-test-report.json');
  fs.writeFileSync(reportFile, JSON.stringify({
    timestamp: new Date().toISOString(),
    summary: {
      total: totalTests,
      passed: passCount,
      failed: totalTests - passCount,
      percentage: passPercentage
    },
    results
  }, null, 2));
  
  log(`Test report saved to ${reportFile}`);
  
  return {
    summary: {
      total: totalTests,
      passed: passCount,
      failed: totalTests - passCount,
      percentage: passPercentage
    },
    results
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
  testDirectApiRoute,
  testGenerateEndpoint,
  testStatusEndpoint,
  testEnvCheck,
  testRoutesEndpoint
};

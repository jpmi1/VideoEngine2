/**
 * Railway Test Script for VideoEngine
 * Runs tests and generates a report in the Railway environment
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const backendTests = require('./backend-tests');

// Configuration
const config = {
  reportPath: path.join(__dirname, '..', 'public', 'test-report.html'),
  logPath: path.join(__dirname, '..', 'test-results.log'),
  railwayEnv: process.env.RAILWAY_ENVIRONMENT || 'production'
};

/**
 * Run tests in Railway environment
 */
async function runRailwayTests() {
  console.log('=== VideoEngine Railway Test Runner ===');
  console.log(`Railway Environment: ${config.railwayEnv}`);
  console.log(`Date: ${new Date().toISOString()}`);
  console.log('Running tests...\n');
  
  // Create log stream
  const logStream = fs.createWriteStream(config.logPath, { flags: 'a' });
  logStream.write(`\n=== Test Run: ${new Date().toISOString()} ===\n`);
  
  try {
    // Check environment
    logEnvironmentInfo(logStream);
    
    // Run backend tests
    console.log('Running backend tests...');
    const backendResults = await backendTests.runTests();
    
    // Generate HTML report
    generateHTMLReport(backendResults);
    
    // Log results
    logStream.write(`Backend tests: ${backendResults.passed}/${backendResults.total} passed\n`);
    logStream.write(`Report generated at: ${config.reportPath}\n`);
    
    console.log('\nTest execution complete.');
    console.log(`Backend tests: ${backendResults.passed}/${backendResults.total} passed`);
    console.log(`HTML report generated at: ${config.reportPath}`);
    console.log(`Log file: ${config.logPath}`);
    
    return {
      success: backendResults.failed === 0,
      backend: backendResults,
      reportPath: config.reportPath,
      logPath: config.logPath
    };
  } catch (error) {
    console.error('Error running tests:', error);
    logStream.write(`Error: ${error.message}\n${error.stack}\n`);
    
    return {
      success: false,
      error: error.message,
      logPath: config.logPath
    };
  } finally {
    logStream.end();
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
      } catch (err) {
        console.log(`  ${dep}: ✗`);
        logStream.write(`  ${dep}: missing\n`);
      }
    }
  } catch (error) {
    console.error('Error logging environment info:', error);
    logStream.write(`Error logging environment info: ${error.message}\n`);
  }
}

/**
 * Generate HTML test report
 * @param {object} backendResults - Backend test results
 */
function generateHTMLReport(backendResults) {
  // Create public directory if it doesn't exist
  const publicDir = path.join(__dirname, '..', 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }
  
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
  </style>
</head>
<body>
  <h1>VideoEngine Railway Test Report</h1>
  
  <div class="summary">
    <h2>Test Summary</h2>
    <p><strong>Backend Tests:</strong> ${backendResults.passed}/${backendResults.total} passed 
      (<span class="${backendResults.failed > 0 ? 'failed' : 'passed'}">${backendResults.failed > 0 ? 'FAILED' : 'PASSED'}</span>)
    </p>
    <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
    <p><strong>Environment:</strong> ${config.railwayEnv}</p>
  </div>
  
  <div class="environment">
    <h3>Railway Environment</h3>
    <p><strong>Node.js Version:</strong> ${process.version}</p>
    <p><strong>Railway Environment:</strong> ${process.env.RAILWAY_ENVIRONMENT || 'Not specified'}</p>
    <p><strong>Railway Service:</strong> ${process.env.RAILWAY_SERVICE_NAME || 'Not specified'}</p>
  </div>
  
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
    </table>
  </div>
  
  <div class="test-section">
    <h2>Implementation Notes</h2>
    <ul>
      <li>All videos are generated with 16:9 aspect ratio (1920x1080)</li>
      <li>Videos are uploaded to Google Drive with direct download links</li>
      <li>Test-Time Training approach maintains consistency between clips</li>
      <li>Frontend properly displays download links for completed videos</li>
      <li>Comprehensive error handling with fallbacks to mock implementations</li>
    </ul>
  </div>
  
  <div class="test-section">
    <h2>Recommendations</h2>
    <ul>
      <li>Ensure all DOM elements referenced in JavaScript exist in HTML</li>
      <li>Add proper environment variables for API keys and credentials</li>
      <li>Install ffmpeg for reference frame extraction functionality</li>
      <li>Run tests regularly to catch regressions</li>
    </ul>
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

# Railway Testing Guide for VideoEngine

This document explains how to run tests on the Railway server with enhanced logging and detailed test metrics.

## Overview

The updated testing setup includes:

1. **Enhanced Test Scripts**: Detailed test metrics for each test case
2. **Comprehensive Logging**: Detailed logs with pass/fail metrics for each test
3. **API Endpoints**: Access test results and logs directly through API endpoints
4. **Punycode Deprecation Fix**: Multiple layers of protection against the deprecation warning

## How to Run Tests on Railway

### Method 1: Using the API Endpoint (Recommended)

Once deployed to Railway, you can run tests by accessing the following endpoint:

```
https://your-railway-app-url.up.railway.app/api/run-tests
```

This will:
- Run all backend tests
- Generate detailed logs with pass/fail metrics for each test
- Generate an HTML test report
- Return a JSON response with test results

### Method 2: Using Railway CLI

If you have the Railway CLI installed, you can run tests using:

```bash
railway run npm run test:railway
```

### Method 3: Using Railway Dashboard

1. Go to your Railway dashboard
2. Open the shell for your service
3. Run the command: `npm run test:railway`

## Viewing Test Results

### Method 1: HTML Report

After running tests, you can view the HTML report at:

```
https://your-railway-app-url.up.railway.app/test-report
```

The HTML report includes:
- Overall test summary with pass/fail percentages
- Detailed results for each test category
- Environment information
- Fixed issues list

### Method 2: Test Logs API

View the detailed test logs with pass/fail metrics for each test:

```
https://your-railway-app-url.up.railway.app/api/test-logs
```

### Method 3: API Response

The `/api/run-tests` endpoint returns a JSON response with test results:

```json
{
  "success": true,
  "backend": {
    "total": 25,
    "passed": 25,
    "failed": 0
  },
  "reportUrl": "/test-report.html",
  "logUrl": "/api/test-logs",
  "timestamp": "2025-04-16T06:00:00.000Z"
}
```

## Punycode Deprecation Fix

The punycode deprecation warning has been fixed using a multi-layered approach:

1. **Package.json**: Added `--no-deprecation` flag to all Node.js commands
   ```json
   "scripts": {
     "start": "node --no-deprecation server.js",
     "test": "node --no-deprecation tests/run-tests.js"
   }
   ```

2. **Server.js**: Set `process.noDeprecation = true` at the top of the file
   ```javascript
   // Suppress punycode deprecation warning
   process.noDeprecation = true;
   ```

3. **Railway.json**: Added NODE_OPTIONS environment variable
   ```json
   "variables": {
     "NODE_OPTIONS": "--no-deprecation"
   }
   ```

4. **Node Version**: Updated to Node.js 16+ which has better handling of deprecated modules

## Log Files

The enhanced logging system creates several log files:

1. **server.log**: General server logs
2. **test-results.log**: Summary of test results
3. **detailed-test-results.log**: Detailed pass/fail metrics for each test

All logs are stored in the `/logs` directory and can be accessed through the `/api/test-logs` endpoint.

## Test Categories

Tests are organized into the following categories:

1. **API**: Tests for API endpoints
2. **Service**: Tests for video generation service
3. **Drive**: Tests for Google Drive integration
4. **Environment**: Tests for environment setup and dependencies

Each category has detailed pass/fail metrics in the logs and HTML report.

## Troubleshooting

If you encounter any issues:

1. Check the logs at `/api/test-logs`
2. Verify that the punycode deprecation warning is suppressed
3. Ensure all dependencies are installed
4. Check the Railway dashboard for any deployment issues

## Additional Notes

- The test system automatically creates necessary directories
- All console output is redirected to log files
- The HTML report is regenerated on each test run
- Test metrics are categorized for easier analysis

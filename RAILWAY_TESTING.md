# Railway Testing Setup for VideoEngine

This document explains how to run tests on the Railway server and view the test reports.

## Overview

The testing setup includes:

1. **Test Scripts**: Backend tests that verify API endpoints and service functions
2. **Railway Integration**: Endpoints to run tests and view reports directly in the Railway environment
3. **Automated Reporting**: HTML test reports generated automatically

## How to Run Tests on Railway

### Method 1: Using the API Endpoint

Once deployed to Railway, you can run tests by accessing the following endpoint:

```
https://your-railway-app-url.up.railway.app/api/run-tests
```

This will:
- Run all backend tests
- Generate an HTML test report
- Return a JSON response with test results

### Method 2: Using Railway CLI

If you have the Railway CLI installed, you can run tests using:

```bash
railway run npm test
```

### Method 3: Using Railway Dashboard

1. Go to your Railway dashboard
2. Open the shell for your service
3. Run the command: `npm test`

## Viewing Test Reports

### Method 1: Web Interface

After running tests, you can view the HTML report at:

```
https://your-railway-app-url.up.railway.app/test-report
```

### Method 2: API Response

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
  "timestamp": "2025-04-16T04:30:00.000Z"
}
```

## Configuration

The Railway testing setup is configured in the following files:

1. **package.json**: Contains test scripts
   ```json
   "scripts": {
     "test": "node tests/run-tests.js",
     "test:report": "node tests/run-tests.js > test-report.txt && cat test-report.txt"
   }
   ```

2. **railway.json**: Configures the Railway deployment
   ```json
   {
     "build": {
       "builder": "NIXPACKS",
       "buildCommand": "npm install"
     },
     "deploy": {
       "startCommand": "npm start",
       "healthcheckPath": "/api/health"
     },
     "variables": {
       "RAILWAY_TESTING_ENABLED": "true"
     }
   }
   ```

3. **server.js**: Includes test endpoints
   ```javascript
   app.get('/api/run-tests', async (req, res) => {
     // Run tests and return results
   });
   
   app.get('/test-report', (req, res) => {
     // Serve HTML test report
   });
   ```

## Environment Variables

The following environment variables affect testing:

- `RAILWAY_TESTING_ENABLED`: Set to "true" to enable testing endpoints
- `NODE_ENV`: Set to "production" for production environment
- `PORT`: The port to run the server on (set by Railway)

## Test Coverage

The tests verify:

1. API endpoints functionality
2. Video generation service
3. Google Drive integration
4. 16:9 aspect ratio enforcement
5. Error handling and fallbacks

## Troubleshooting

If tests fail on Railway:

1. Check the logs in the Railway dashboard
2. Verify environment variables are set correctly
3. Ensure all dependencies are installed
4. Check if the test report contains specific error messages

# VideoEngine with Kling AI Integration

This application provides video generation capabilities using Kling AI with 16:9 aspect ratio and Google Drive integration for direct downloads.

## Environment Variables Setup

This application uses environment variables for secure credential management. You need to set up the following environment variables:

### Required Environment Variables

```
# Kling AI API Credentials
KLING_API_KEY_ID=your_kling_api_key_id
KLING_API_KEY_SECRET=your_kling_api_key_secret

# Google Drive API Credentials (for Drive integration)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=your_google_redirect_uri
```

### Setting Up Environment Variables

#### For Development

1. Create a `.env` file in the root directory of the project
2. Add the environment variables as shown above
3. The application will automatically load these variables in development mode

Example `.env` file:
```
KLING_API_KEY_ID=cd7782f741d845d4b2b6a27df23880de
KLING_API_KEY_SECRET=30d2eaf0dc9d41d59850da4061a83c93
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback
```

#### For Railway Deployment

1. Go to your Railway project dashboard
2. Navigate to the "Variables" tab
3. Add each environment variable with its corresponding value
4. Deploy your application

## Installation and Setup

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Set up environment variables as described above
4. Start the server:
   ```
   npm start
   ```

## API Endpoints

### Video Generation

- `POST /api/advanced-video/generate` - Generate a video with Kling AI
  - Request body:
    ```json
    {
      "prompt": "A beautiful mountain landscape with a flowing river",
      "options": {
        "duration": 10,
        "enhancePrompt": true
      }
    }
    ```

- `GET /api/advanced-video/status/:taskId` - Check video generation status

### Google Drive Integration

- `POST /api/advanced-video/upload-to-drive` - Upload a video to Google Drive
  - Request body:
    ```json
    {
      "videoUrl": "https://example.com/video.mp4",
      "fileName": "my_video.mp4"
    }
    ```

- `GET /api/advanced-video/drive-download/:fileId` - Get a direct download link

### Testing and Monitoring

- `GET /api/env-check` - Check environment variables status
- `GET /api/health` - Health check endpoint
- `GET /api/run-tests` - Run tests
- `GET /test-report` - View test report
- `GET /api/test-logs` - View test logs

## Testing

Run the tests:
```
node tests/kling-ai-test.js
```

## Security Notes

- Never commit your `.env` file to version control
- Regularly rotate your API keys for better security
- Use environment variables for all sensitive credentials

# VideoEngine with 16:9 Aspect Ratio and Google Drive Integration

This application generates videos using Gemini Veo 2 with 16:9 aspect ratio and provides direct download links from Google Drive.

## Features

- **16:9 Aspect Ratio Videos**: All generated videos maintain a 16:9 aspect ratio (1920x1080)
- **Google Drive Integration**: Videos are uploaded to Google Drive with direct download links
- **Test-Time Training**: Maintains consistency between clips using reference frames
- **Script Parsing**: Automatically breaks scripts into 3-4 second clips
- **Responsive UI**: Clean interface for video generation and management

## Setup Instructions

### Prerequisites

- Node.js (v14+)
- npm or yarn
- ffmpeg (for reference frame extraction)

### Environment Variables

Create a `.env` file in the root directory with the following variables:

```
GEMINI_API_KEY=your_gemini_api_key_here
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
GOOGLE_REDIRECT_URI=https://your-app-url.up.railway.app/api/advanced-video/drive-callback
NODE_ENV=production
PORT=8080
```

### Installation

1. Clone this repository
2. Install dependencies:
   ```
   npm install
   ```
3. Start the server:
   ```
   npm start
   ```

## Google Drive Setup

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable the Google Drive API
4. Create OAuth 2.0 credentials (Web application)
5. Set the authorized redirect URI to match your GOOGLE_REDIRECT_URI
6. Add the Client ID and Client Secret to your environment variables

## Usage

1. Navigate to the application in your browser
2. Authenticate with Google Drive using the "Connect to Google Drive" button
3. Enter a script in the text area
4. Click "Generate Video" to start the generation process
5. Once complete, use the "Download from Google Drive" button to download your video

## API Endpoints

- `POST /api/advanced-video/generate` - Generate a video from a script
- `GET /api/advanced-video/status/:id` - Get video generation status
- `GET /api/advanced-video/list` - List all video generation requests
- `POST /api/advanced-video/upload-to-drive` - Upload a video to Google Drive
- `GET /api/advanced-video/drive-auth` - Get Google Drive authentication URL
- `GET /api/advanced-video/drive-files` - List files from Google Drive
- `GET /api/advanced-video/drive-download/:fileId` - Create direct download link

## Troubleshooting

- If you encounter issues with video generation, check that your Gemini API key is valid
- For Google Drive authentication issues, verify your OAuth credentials and redirect URI
- If reference frame extraction fails, ensure ffmpeg is installed on your server

## License

MIT

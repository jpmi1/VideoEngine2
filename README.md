# Video Engine - Railway Deployment

This is a simplified version of the Video Engine application, designed for easy deployment to Railway.app.

## Overview

This package contains a basic Express server with a placeholder frontend. It's designed to be deployed to Railway.app without the Angular/Ionic build issues that were encountered with the full version.

## Files Included

- `server.js` - A simple Express server that serves static files and provides a health check endpoint
- `package.json` - Dependencies and scripts for the application
- `nixpacks.toml` - Configuration for Railway's Nixpacks build system
- `www/index.html` - A placeholder frontend page

## Deployment Instructions

1. Create a new GitHub repository
2. Upload all files in this package to the repository, maintaining the folder structure
3. Connect your Railway.app account to the GitHub repository
4. Deploy the application on Railway
5. Once deployed, you can access the application at the URL provided by Railway

## Next Steps

After successful deployment, you can gradually add back the Angular/Ionic functionality:

1. Add the TikTok API integration
2. Implement the video generation workflow
3. Add the cloud storage connections
4. Develop the full user interface

## Support

If you encounter any issues with the deployment, please refer to the Railway.app documentation or contact support.

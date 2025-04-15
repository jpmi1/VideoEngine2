# VideoEngine - Bulk AI Video Creation App

This is a minimal working Angular/Ionic application structure for the VideoEngine application. This application is designed to be deployed to Railway.app.

## Features (Planned)

- Spreadsheet Import: Upload and process spreadsheets with video specifications
- Video Generation: Integration with multiple AI video generation APIs
- Cloud Storage: Connect to Google Drive and Box for storing videos
- TikTok Integration: Direct posting to TikTok with analytics

## Getting Started

1. Clone this repository
2. Install dependencies: `npm install`
3. Run locally: `npm start`
4. Build for production: `npm run build`

## Deployment

This application is configured for deployment to Railway.app using the included nixpacks.toml and railway.json files.

## Project Structure

- `/src`: Application source code
  - `/app`: Angular components and modules
  - `/assets`: Static assets
  - `/environments`: Environment configuration
  - `/theme`: Ionic theming
- `/www`: Build output directory
- `server.js`: Express server for serving the application
- `package.json`: Dependencies and scripts
- `angular.json`: Angular configuration
- `ionic.config.json`: Ionic configuration
- `nixpacks.toml`: Railway build configuration
- `railway.json`: Railway deployment configuration

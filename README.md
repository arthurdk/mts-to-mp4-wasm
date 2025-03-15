# MTS to MP4 Converter

A browser-based application that converts MTS video files to MP4 format using FFmpeg.wasm (WebAssembly). This tool runs entirely in your browser without the need to upload your videos to any server.

## Features

- Drag-and-drop or manual file selection
- Convert multiple files in a queue
- Progress tracking for individual files and overall conversion
- Download converted MP4 files directly in your browser
- No data sent to any server - all processing happens locally
- Displays fun conversion puns while you wait

## Requirements

To run this application, you'll need:

- A modern browser with WebAssembly support (Chrome, Firefox, Edge, Safari)
- For development: Node.js 14.0.0 or later

## Running Locally

1. Clone this repository
2. Install dependencies:
   ```
   npm install
   ```
3. Start the server:
   ```
   npm start
   ```
4. Open your browser and navigate to `http://localhost:3000`

## Docker Installation

This application can also be run using Docker for a containerized, isolated environment.

### Prerequisites

- Docker installed on your system

### Building the Docker Image

To build the Docker image, run:

```bash
docker build -t mts-to-mp4-converter .
```

Or use the npm script:

```bash
npm run docker:build
```

### Running the Docker Container

To run the application in a Docker container:

```bash
docker run -p 3000:3000 --name mts-converter mts-to-mp4-converter
```

Or use the npm script:

```bash
npm run docker:run
```

Then open your browser and navigate to `http://localhost:3000`.

### Using Docker Compose

For an easier setup, you can use Docker Compose:

```bash
docker-compose up -d
```

Or use the npm script:

```bash
npm run docker:compose:up
```

To stop and remove the Docker Compose services:

```bash
docker-compose down
```

Or use the npm script:

```bash
npm run docker:compose:down
```

### Docker Security Features

The Docker image includes several security enhancements:

- Runs on a lightweight Alpine Linux base
- Uses a non-root user (appuser) to run the application
- Properly sets file permissions
- Includes a health check to monitor application status
- Sets NODE_ENV to production for better performance
- Leverages security headers required for SharedArrayBuffer support

## How It Works

This application uses FFmpeg.wasm, which is a WebAssembly port of the popular FFmpeg multimedia framework. Here's how it works:

1. Upload your MTS files through the browser interface
2. FFmpeg.wasm loads in your browser (first load may take a moment)
3. Files are processed one at a time using WebAssembly
4. Converted files are provided as MP4 downloads directly in your browser
5. No data is sent to any external server - all processing happens locally

## Technical Details

- Uses FFmpeg.wasm version 0.9.8 for video conversion
- Requires Cross-Origin Opener Policy (COOP) and Cross-Origin Embedder Policy (COEP) headers for SharedArrayBuffer support
- File conversion happens one at a time to ensure optimal performance
- Uses a simple Node.js server for local development and to serve the required headers

## Troubleshooting

- **Error: Cannot read property 'FS' of null**: FFmpeg is still loading, please wait and try again
- **Browser crashes**: Try reducing the size of the files you're converting or use a more powerful device
- **WASM not supported**: Make sure you're using a modern browser with WebAssembly support

## License

bonjour 

## Acknowledgments

- [FFmpeg](https://ffmpeg.org/) - The core multimedia processing library
- [FFmpeg.wasm](https://github.com/ffmpegwasm/ffmpeg.wasm) - The WebAssembly port of FFmpeg

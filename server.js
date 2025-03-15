const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.json': 'application/json',
    '.wasm': 'application/wasm',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
};

const server = http.createServer((req, res) => {
    console.log(`${req.method} ${req.url}`);

    // Set CORS headers for ALL responses - required for SharedArrayBuffer (FFmpeg.wasm)
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');

    // Serve index.html for the root path
    let filePath = req.url === '/' ? './index.html' : '.' + req.url;
    
    // Get file extension
    const extname = String(path.extname(filePath)).toLowerCase();
    
    // Set default content type to binary
    let contentType = 'application/octet-stream';
    
    // Set the correct content type based on the file extension
    if (extname in MIME_TYPES) {
        contentType = MIME_TYPES[extname];
    }
    
    // Read the file
    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                // File not found
                fs.readFile('./404.html', (err, content) => {
                    res.writeHead(404, { 'Content-Type': 'text/html' });
                    res.end(content, 'utf-8');
                });
            } else {
                // Server error
                res.writeHead(500);
                res.end(`Server Error: ${error.code}`);
            }
        } else {
            // Success
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
    console.log(`IMPORTANT: Open this URL in your browser to use the application`);
    console.log(`-----------------------------------------------------------`);
    console.log(`For FFmpeg.wasm to work properly, the page must be served from`);
    console.log(`an actual server (like this one), not opened directly as a file.`);
}); 
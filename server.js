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
    
    // Add a simple test endpoint for SharedArrayBuffer support
    if (req.url === '/test-sab') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>SharedArrayBuffer Test</title>
            </head>
            <body>
                <h1>SharedArrayBuffer Test</h1>
                <div id="result"></div>
                <h2>Headers Received:</h2>
                <pre id="headers"></pre>
                
                <script>
                    // Test for SharedArrayBuffer support
                    const resultDiv = document.getElementById('result');
                    try {
                        const sab = new SharedArrayBuffer(1024);
                        resultDiv.innerHTML = '<p style="color:green">✅ SharedArrayBuffer is supported in this browser!</p>';
                        resultDiv.innerHTML += '<p>SharedArrayBuffer size: ' + sab.byteLength + '</p>';
                    } catch (e) {
                        resultDiv.innerHTML = '<p style="color:red">❌ SharedArrayBuffer is NOT supported: ' + e.message + '</p>';
                    }
                    
                    // Display headers
                    fetch('/headers-check')
                        .then(response => {
                            const headers = document.getElementById('headers');
                            headers.textContent = 'COOP: ' + response.headers.get('cross-origin-opener-policy') + 
                                               '\nCOEP: ' + response.headers.get('cross-origin-embedder-policy');
                        });
                </script>
            </body>
            </html>
        `);
        return;
    }
    
    // Simple endpoint to check headers
    if (req.url === '/headers-check') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok' }));
        return;
    }

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
    console.log(`-----------------------------------------------------------`);
    console.log(`To test SharedArrayBuffer support, go to: http://localhost:${PORT}/test-sab`);
}); 
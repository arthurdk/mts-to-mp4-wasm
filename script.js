// Global variables
let ffmpeg = null;
let filesForConversion = [];
let totalFiles = 0;
let convertedFiles = 0;
let failedFiles = 0;
let isConverting = false;
let maxParallelConversions = 4; // Fixed value, no longer configurable via slider
let activeConversions = 0;
let conversionQueue = [];
let currentConversions = {};
let lastPunTime = 0;
let ffmpegLoaded = false;
let cancelRequested = false;
let isFFmpegBusy = false; // Add a flag to track if FFmpeg is busy

// Conversion puns - just like in the original app!
const puns = [
    "Converting files faster than a cheetah on caffeine!",
    "Transforming your videos... it's like magic, but with more WebAssembly!",
    "Your videos are getting a digital makeover!",
    "Converting: Because 'MTS' sounds like a disease and 'MP4' sounds cool!",
    "Turning your MTS files into MP4s... like turning pumpkins into carriages!",
    "Compressing bits and bytes like a digital sandwich maker!",
    "MP4: Making Practically 4-midable videos from your MTS files!",
    "If videos were currency, you'd be getting a great exchange rate!",
    "Your videos are leveling up! Achievement unlocked: MP4 Format!",
    "Converting with the speed of light... minus about 299,792,458 m/s!",
    "Video conversion: Like translating from MTS-ish to MP4-anese!",
    "Working harder than a squirrel gathering nuts for winter!",
    "These files are getting more conversion than a religious retreat!",
    "FFmpeg.wasm: The superhero your videos deserve!",
    "Converting faster than you can say 'supercalifragilisticexpialidocious'!",
    "Turning MTS into MP4 like alchemy, but it actually works!",
    "These videos are getting more processed than cheese!",
    "Your patience is appreciated more than pizza at midnight!",
    "If this were any faster, we'd need a speeding ticket!",
    "Converting videos and making terrible puns... multitasking at its finest!"
];

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize FFmpeg
    initFFmpeg();
    
    // Get DOM elements
    const dropArea = document.getElementById('dropArea');
    const fileInput = document.getElementById('fileInput');
    const fileList = document.getElementById('fileList');
    const clearBtn = document.getElementById('clearBtn');
    const removeSelectedBtn = document.getElementById('removeSelectedBtn');
    const convertBtn = document.getElementById('convertBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    
    // Set up event listeners
    dropArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropArea.classList.add('dragover');
    });
    
    dropArea.addEventListener('dragleave', () => {
        dropArea.classList.remove('dragover');
    });
    
    dropArea.addEventListener('drop', (e) => {
        e.preventDefault();
        dropArea.classList.remove('dragover');
        handleFileSelection(e.dataTransfer.files);
    });
    
    fileInput.addEventListener('change', () => {
        handleFileSelection(fileInput.files);
    });
    
    clearBtn.addEventListener('click', clearSelection);
    
    removeSelectedBtn.addEventListener('click', removeSelected);
    
    convertBtn.addEventListener('click', startConversion);
    
    cancelBtn.addEventListener('click', cancelConversion);
    
    // File list selection
    fileList.addEventListener('click', (e) => {
        const li = e.target.closest('li');
        if (!li) return;
        
        // Toggle selection with Ctrl key
        if (e.ctrlKey || e.metaKey) {
            li.classList.toggle('selected');
        } else {
            // Clear other selections
            document.querySelectorAll('.file-list li.selected').forEach(item => {
                item.classList.remove('selected');
            });
            li.classList.add('selected');
        }
        
        // Enable/disable the remove selected button
        const hasSelection = document.querySelectorAll('.file-list li.selected').length > 0;
        removeSelectedBtn.disabled = !hasSelection;
    });
    
    // Start pun display
    setInterval(displayRandomPun, 5000);
});

// Initialize FFmpeg WASM
async function initFFmpeg() {
    try {
        // Update loading message
        document.getElementById('loadingText').textContent = 'Loading FFmpeg.wasm (this may take a moment)...';
        
        // Create FFmpeg instance (using older 0.9.8 API)
        const { createFFmpeg, fetchFile } = FFmpeg;
        ffmpeg = createFFmpeg({ 
            log: true,
            corePath: 'ffmpeg-wasm/ffmpeg-core.js',
            workerPath: 'ffmpeg-wasm/ffmpeg-core.worker.js', // Add the worker path explicitly
            wasmPath: 'ffmpeg-wasm/ffmpeg-core.wasm', // Add the wasm path explicitly
            // Add progress callback
            progress: (progress) => {
                // This will be called during file processing with a progress value between 0 and 1
                const currentFileId = ffmpeg.currentFileId;
                if (currentFileId && currentConversions[currentFileId]) {
                    updateFileProgress(currentFileId, progress.ratio);
                }
            }
        });
        
        // Add a property to track current file
        ffmpeg.currentFileId = null;
        
        // Load FFmpeg
        await ffmpeg.load();
        
        // Store reference to fetchFile for later use
        window.fetchFile = fetchFile;
        
        ffmpegLoaded = true;
        document.getElementById('loadingOverlay').style.display = 'none';
        console.log('FFmpeg loaded successfully');
    } catch (error) {
        console.error('Failed to load FFmpeg:', error);
        document.getElementById('loadingText').textContent = 'Failed to load FFmpeg: ' + error.message;
        alert('Failed to load FFmpeg: ' + error.message + '\nPlease check your internet connection and reload the page.');
    }
}

// Update progress for a specific file
function updateFileProgress(fileId, progress) {
    const conversion = currentConversions[fileId];
    if (!conversion) return;
    
    // Store the progress value in the conversion object
    conversion.progress = progress;
    
    // Update the progress element
    if (conversion.progressElement) {
        conversion.progressElement.style.width = `${Math.round(progress * 100)}%`;
        conversion.progressTextElement.textContent = `${Math.round(progress * 100)}%`;
    }
    
    // Update overall progress
    updateOverallProgress();
}

// Update overall progress
function updateOverallProgress() {
    // Calculate total progress across all files
    const totalProgress = Object.values(currentConversions).reduce((sum, conversion) => {
        let fileProgress = 0;
        if (conversion.status === 'completed') {
            fileProgress = 1;
        } else if (conversion.status === 'converting' && conversion.progress) {
            fileProgress = conversion.progress;
        }
        return sum + fileProgress;
    }, 0);
    
    const progress = totalFiles > 0 ? (totalProgress / totalFiles) * 100 : 0;
    
    document.querySelector('.progress-fill').style.width = `${progress}%`;
    document.getElementById('progressText').textContent = `${Math.round(progress)}%`;
    
    const completed = convertedFiles + failedFiles;
    const status = `Converting: ${completed}/${totalFiles} complete`;
    const details = `Success: ${convertedFiles} | Failed: ${failedFiles}`;
    
    document.getElementById('statusLabel').textContent = status;
    document.getElementById('detailsLabel').textContent = details;
}

// Handle file selection from drop or file input
function handleFileSelection(files) {
    if (isConverting) return;
    
    let newFilesAdded = false;
    
    for (const file of files) {
        // Filter only MTS files
        if (!file.name.toLowerCase().endsWith('.mts') && !file.name.toLowerCase().endsWith('.MTS')) {
            continue;
        }
        
        // Check if file is already in the list
        const exists = filesForConversion.some(existing => 
            existing.name === file.name && existing.size === file.size
        );
        
        if (!exists) {
            filesForConversion.push(file);
            
            // Create list item
            const li = document.createElement('li');
            li.dataset.fileIndex = filesForConversion.length - 1;
            
            const nameSpan = document.createElement('span');
            nameSpan.classList.add('file-name');
            nameSpan.innerHTML = `<i class="fas fa-file-video"></i>${file.name}`;
            
            const sizeSpan = document.createElement('span');
            sizeSpan.classList.add('file-size');
            sizeSpan.textContent = formatFileSize(file.size);
            
            li.appendChild(nameSpan);
            li.appendChild(sizeSpan);
            document.getElementById('fileList').appendChild(li);
            
            newFilesAdded = true;
        }
    }
    
    if (newFilesAdded) {
        updateFileCounter();
        document.getElementById('clearBtn').disabled = false;
        document.getElementById('convertBtn').disabled = false;
    }
}

// Format file size for display
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Update file counter and status
function updateFileCounter() {
    totalFiles = filesForConversion.length;
    document.getElementById('statusLabel').textContent = `${totalFiles} files selected`;
}

// Clear all files
function clearSelection() {
    if (isConverting) return;
    
    filesForConversion = [];
    document.getElementById('fileList').innerHTML = '';
    document.getElementById('clearBtn').disabled = true;
    document.getElementById('convertBtn').disabled = true;
    document.getElementById('removeSelectedBtn').disabled = true;
    
    totalFiles = 0;
    document.getElementById('statusLabel').textContent = 'Ready to convert';
    document.getElementById('detailsLabel').textContent = '';
}

// Remove selected files
function removeSelected() {
    if (isConverting) return;
    
    const selected = document.querySelectorAll('.file-list li.selected');
    if (selected.length === 0) return;
    
    // Remove in reverse order to avoid index shifting
    const indicesToRemove = Array.from(selected).map(el => parseInt(el.dataset.fileIndex));
    indicesToRemove.sort((a, b) => b - a); // Sort in descending order
    
    for (const index of indicesToRemove) {
        filesForConversion.splice(index, 1);
        selected[0].remove();
    }
    
    // Reindex remaining files
    document.querySelectorAll('.file-list li').forEach((li, index) => {
        li.dataset.fileIndex = index;
    });
    
    updateFileCounter();
    
    const hasFiles = filesForConversion.length > 0;
    document.getElementById('clearBtn').disabled = !hasFiles;
    document.getElementById('convertBtn').disabled = !hasFiles;
    document.getElementById('removeSelectedBtn').disabled = true;
}

// Start conversion process
async function startConversion() {
    if (!ffmpegLoaded) {
        alert('FFmpeg is not loaded yet. Please wait.');
        return;
    }
    
    if (filesForConversion.length === 0) {
        alert('Please select MTS files to convert.');
        return;
    }
    
    if (isConverting) {
        alert('Conversion is already in progress.');
        return;
    }
    
    // Reset state
    isConverting = true;
    convertedFiles = 0;
    failedFiles = 0;
    activeConversions = 0;
    cancelRequested = false;
    currentConversions = {};
    conversionQueue = [...filesForConversion];
    
    // Update UI state
    document.querySelector('.progress-fill').style.width = '0%';
    document.getElementById('progressText').textContent = '0%';
    document.getElementById('statusLabel').textContent = 'Starting conversion...';
    document.getElementById('detailsLabel').textContent = '';
    
    // Disable interactive elements
    document.getElementById('convertBtn').disabled = true;
    document.getElementById('clearBtn').disabled = true;
    document.getElementById('removeSelectedBtn').disabled = true;
    document.getElementById('fileInput').disabled = true;
    document.getElementById('cancelBtn').disabled = false;
    
    // Initialize conversions display
    const conversionsContainer = document.getElementById('currentConversions');
    conversionsContainer.innerHTML = '';
    
    // Create conversion elements for each file with progress bars
    filesForConversion.forEach(file => {
        const fileId = generateUniqueId();
        
        // Create the conversion element with progress bar
        const conversionElement = document.createElement('div');
        conversionElement.classList.add('conversion-item', 'waiting');
        
        const statusElement = document.createElement('div');
        statusElement.classList.add('conversion-status');
        statusElement.textContent = `Waiting: ${file.name}`;
        
        const progressContainer = document.createElement('div');
        progressContainer.classList.add('file-progress-container');
        
        const progressBar = document.createElement('div');
        progressBar.classList.add('file-progress-bar');
        
        const progressFill = document.createElement('div');
        progressFill.classList.add('file-progress-fill');
        progressFill.style.width = '0%';
        
        const progressText = document.createElement('div');
        progressText.classList.add('file-progress-text');
        progressText.textContent = '0%';
        
        progressBar.appendChild(progressFill);
        progressContainer.appendChild(progressBar);
        progressContainer.appendChild(progressText);
        
        conversionElement.appendChild(statusElement);
        conversionElement.appendChild(progressContainer);
        
        conversionsContainer.appendChild(conversionElement);
        
        // Store conversion information
        currentConversions[fileId] = {
            file,
            status: 'waiting',
            element: conversionElement,
            statusElement: statusElement,
            progressElement: progressFill,
            progressTextElement: progressText,
            progress: 0
        };
    });
    
    // Start processing queue
    processQueue();
}

// Generate unique ID for tracking conversions
function generateUniqueId() {
    return `file_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// Process the queue of files
async function processQueue() {
    // First start any pending conversions up to max preparation limit
    while (conversionQueue.length > 0 && activeConversions < maxParallelConversions && !cancelRequested) {
        const file = conversionQueue.shift();
        
        // Find the file entry in currentConversions
        const fileId = Object.keys(currentConversions).find(id => 
            currentConversions[id].file === file
        );
        
        if (fileId) {
            activeConversions++;
            
            // Update status to queued
            currentConversions[fileId].status = 'queued';
            currentConversions[fileId].statusElement.textContent = `Queued: ${file.name}`;
            currentConversions[fileId].element.className = 'conversion-item queued';
        }
    }
    
    // Process one file at a time if FFmpeg is not busy
    if (!isFFmpegBusy && !cancelRequested) {
        // Find the next queued file
        const nextFileId = Object.keys(currentConversions).find(id => 
            currentConversions[id].status === 'queued'
        );
        
        if (nextFileId) {
            isFFmpegBusy = true;
            const file = currentConversions[nextFileId].file;
            
            // Update status to converting
            currentConversions[nextFileId].status = 'converting';
            currentConversions[nextFileId].statusElement.textContent = `Converting: ${file.name}`;
            currentConversions[nextFileId].element.className = 'conversion-item converting';
            
            // Process file in a non-blocking way
            convertFile(file, nextFileId)
                .catch(error => {
                    console.error('Conversion error:', error);
                })
                .finally(() => {
                    isFFmpegBusy = false;
                    // Process the next file in queue when this one is done
                    setTimeout(processQueue, 0);
                });
        }
    }
    
    // Check if we're done
    if (activeConversions === 0 && (conversionQueue.length === 0 || cancelRequested)) {
        conversionComplete();
    }
}

// Convert a single file
async function convertFile(file, fileId) {
    try {
        // Set the current file ID in ffmpeg instance
        ffmpeg.currentFileId = fileId;
        
        // Initialize progress for this file
        currentConversions[fileId].progress = 0;
        updateFileProgress(fileId, 0);
        
        // Read file data
        const data = await window.fetchFile(file);
        
        // Get input and output filenames
        const inputName = file.name;
        const outputName = file.name.substring(0, file.name.lastIndexOf('.')) + '.mp4';
        
        // Write it to FFmpeg's virtual file system
        ffmpeg.FS('writeFile', inputName, data);
        
        // Run FFmpeg command - similar to the original app's settings
        await ffmpeg.run(
            '-y',
            '-i', inputName,
            '-c:v', 'libx264',
            '-preset', 'medium',
            '-c:a', 'aac',
            '-b:a', '192k',
            outputName
        );
        
        // Read the result
        const output = ffmpeg.FS('readFile', outputName);
        
        // Create a download link
        const outputBlob = new Blob([output.buffer], { type: 'video/mp4' });
        const url = URL.createObjectURL(outputBlob);
        
        // Clean up FFmpeg memory
        ffmpeg.FS('unlink', inputName);
        ffmpeg.FS('unlink', outputName);
        
        // Update UI
        updateConversionStatus(fileId, 'completed', outputName, url);
        convertedFiles++;
        
    } catch (error) {
        console.error('Error converting file:', file.name, error);
        updateConversionStatus(fileId, 'failed');
        failedFiles++;
    } finally {
        ffmpeg.currentFileId = null;
        activeConversions--;
        
        // Update overall progress
        updateOverallProgress();
    }
}

// Update conversion status in UI
function updateConversionStatus(fileId, status, outputName = null, downloadUrl = null) {
    const conversion = currentConversions[fileId];
    if (!conversion) return;
    
    conversion.status = status;
    
    if (status === 'completed' && downloadUrl) {
        const fileName = outputName || 'unknown.mp4';
        conversion.statusElement.innerHTML = `
            Completed: <a href="${downloadUrl}" download="${fileName}">${fileName}</a>
        `;
        conversion.progressElement.style.width = '100%';
        conversion.progressTextElement.textContent = '100%';
    } else if (status === 'failed') {
        conversion.statusElement.textContent = `Failed: ${conversion.file.name}`;
    } else if (status === 'cancelled') {
        conversion.statusElement.textContent = `Cancelled: ${conversion.file.name}`;
    } else if (status === 'queued') {
        conversion.statusElement.textContent = `Queued: ${conversion.file.name}`;
    }
    
    conversion.element.className = `conversion-item ${status}`;
}

// Cancel the conversion process
function cancelConversion() {
    if (!isConverting) return;
    
    if (confirm('Are you sure you want to cancel the conversion?')) {
        cancelRequested = true;
        conversionQueue = []; // Clear the queue
        
        // Update UI for waiting files
        Object.keys(currentConversions).forEach(id => {
            if (currentConversions[id].status === 'waiting') {
                updateConversionStatus(id, 'cancelled');
            }
        });
        
        // If no active conversions, complete now
        if (activeConversions === 0) {
            conversionComplete();
        } else {
            document.getElementById('statusLabel').textContent = 'Cancelling... Waiting for active conversions to finish';
        }
    }
}

// Conversion completed (successfully or cancelled)
function conversionComplete() {
    isConverting = false;
    
    // Re-enable UI elements
    document.getElementById('convertBtn').disabled = false;
    document.getElementById('clearBtn').disabled = false;
    document.getElementById('fileInput').disabled = false;
    document.getElementById('cancelBtn').disabled = true;
    
    // Update status
    if (cancelRequested) {
        document.getElementById('statusLabel').textContent = 'Conversion cancelled';
    } else {
        document.getElementById('statusLabel').textContent = 'Conversion complete!';
        // Show completion alert
        alert(`Conversion complete!\nConverted: ${convertedFiles}\nFailed: ${failedFiles}`);
    }
    
    document.getElementById('punDisplay').textContent = '';
}

// Display random conversion pun
function displayRandomPun() {
    if (!isConverting) return;
    
    const now = Date.now();
    if (now - lastPunTime >= 5000) {
        lastPunTime = now;
        const punIndex = Math.floor(Math.random() * puns.length);
        document.getElementById('punDisplay').textContent = puns[punIndex];
    }
} 
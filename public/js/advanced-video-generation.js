/**
 * Frontend JavaScript for Advanced Video Generation with 16:9 aspect ratio
 * and Google Drive direct download links
 */

// DOM Elements
const videoForm = document.getElementById('video-form');
const scriptInput = document.getElementById('script-input');
const generateBtn = document.getElementById('generate-btn');
const videoList = document.getElementById('video-list');
const statusArea = document.getElementById('status-area');
const driveAuthBtn = document.getElementById('drive-auth-btn');
const driveFilesList = document.getElementById('drive-files-list');

// User ID for Google Drive integration
let userId = localStorage.getItem('driveUserId') || generateUserId();

/**
 * Generate a unique user ID
 * @returns {string} User ID
 */
function generateUserId() {
  const userId = 'user_' + Math.random().toString(36).substring(2, 15);
  localStorage.setItem('driveUserId', userId);
  return userId;
}

/**
 * Initialize the application
 */
function init() {
  console.log('Initializing advanced video generation module');
  
  // Check for authentication success
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('auth') === 'success') {
    const authUserId = urlParams.get('userId');
    if (authUserId) {
      userId = authUserId;
      localStorage.setItem('driveUserId', userId);
      showToast('Successfully authenticated with Google Drive!');
      
      // Clear URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }
  
  // Load videos
  loadVideos();
  
  // Set up event listeners
  setupEventListeners();
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
  // Video generation form
  if (videoForm) {
    videoForm.addEventListener('submit', handleVideoGeneration);
  }
  
  // Google Drive authentication
  if (driveAuthBtn) {
    driveAuthBtn.addEventListener('click', handleDriveAuth);
  }
  
  // Tab switching
  document.querySelectorAll('.nav-link').forEach(tab => {
    tab.addEventListener('click', function(e) {
      e.preventDefault();
      const targetId = this.getAttribute('href').substring(1);
      
      // Hide all tab content
      document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.remove('show', 'active');
      });
      
      // Show selected tab content
      document.getElementById(targetId).classList.add('show', 'active');
      
      // Update active tab
      document.querySelectorAll('.nav-link').forEach(navLink => {
        navLink.classList.remove('active');
      });
      this.classList.add('active');
      
      // Load content for specific tabs
      if (targetId === 'drive-tab') {
        loadDriveFiles();
      }
    });
  });
}

/**
 * Handle video generation form submission
 * @param {Event} e - Form submit event
 */
async function handleVideoGeneration(e) {
  e.preventDefault();
  
  const script = scriptInput.value.trim();
  if (!script) {
    showToast('Please enter a script', 'error');
    return;
  }
  
  // Get options from form
  const options = {
    style: document.getElementById('style-input')?.value || 'cinematic',
    clipDuration: parseInt(document.getElementById('duration-input')?.value) || 4,
    aspectRatio: '16:9', // Ensure 16:9 aspect ratio
    resolution: '1920x1080' // Full HD resolution
  };
  
  // Disable form
  setFormDisabled(true);
  showToast('Generating video...', 'info');
  
  try {
    // Send request to API
    const response = await fetch('/api/advanced-video/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ script, options })
    });
    
    if (!response.ok) {
      throw new Error(`Error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Start polling for status
    pollVideoStatus(data.id);
    
    showToast('Video generation started!', 'success');
  } catch (error) {
    console.error('Error generating video:', error);
    showToast(`Failed to generate video: ${error.message}`, 'error');
    setFormDisabled(false);
  }
}

/**
 * Poll for video generation status
 * @param {string} requestId - Video request ID
 */
async function pollVideoStatus(requestId) {
  try {
    const response = await fetch(`/api/advanced-video/status/${requestId}`);
    
    if (!response.ok) {
      throw new Error(`Error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Update status display
    updateStatusDisplay(data);
    
    // Continue polling if not completed or failed
    if (data.status === 'processing') {
      setTimeout(() => pollVideoStatus(requestId), 2000);
    } else {
      // Reload videos when completed
      loadVideos();
      setFormDisabled(false);
      
      if (data.status === 'completed') {
        showToast('Video generation completed!', 'success');
      } else {
        showToast(`Video generation ${data.status}: ${data.message}`, 'error');
      }
    }
  } catch (error) {
    console.error('Error polling video status:', error);
    showToast(`Failed to get video status: ${error.message}`, 'error');
    setFormDisabled(false);
  }
}

/**
 * Update status display
 * @param {object} data - Status data
 */
function updateStatusDisplay(data) {
  if (!statusArea) return;
  
  let statusHtml = `
    <div class="card mb-3">
      <div class="card-header bg-${getStatusColor(data.status)}">
        <h5 class="card-title text-white mb-0">
          Status: ${data.status.charAt(0).toUpperCase() + data.status.slice(1)}
        </h5>
      </div>
      <div class="card-body">
        <div class="progress mb-3">
          <div class="progress-bar" role="progressbar" style="width: ${data.progress}%"
               aria-valuenow="${data.progress}" aria-valuemin="0" aria-valuemax="100">
            ${data.progress}%
          </div>
        </div>
        <p class="card-text">${data.message}</p>
  `;
  
  if (data.status === 'completed' && data.googleDriveDownloadUrl) {
    statusHtml += `
      <div class="mt-3">
        <h6>Download Links:</h6>
        <a href="${data.googleDriveDownloadUrl}" class="btn btn-primary" target="_blank">
          <i class="bi bi-download"></i> Download from Google Drive
        </a>
        <a href="${data.googleDriveUrl}" class="btn btn-outline-secondary ms-2" target="_blank">
          <i class="bi bi-google"></i> View in Google Drive
        </a>
      </div>
    `;
  }
  
  statusHtml += `
      </div>
    </div>
  `;
  
  statusArea.innerHTML = statusHtml;
}

/**
 * Get color for status
 * @param {string} status - Status string
 * @returns {string} Bootstrap color class
 */
function getStatusColor(status) {
  switch (status) {
    case 'completed': return 'success';
    case 'processing': return 'primary';
    case 'failed': return 'danger';
    default: return 'secondary';
  }
}

/**
 * Load videos from API
 */
async function loadVideos() {
  if (!videoList) return;
  
  try {
    const response = await fetch('/api/advanced-video/list');
    
    if (!response.ok) {
      throw new Error(`Error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.videos && data.videos.length > 0) {
      renderVideoList(data.videos);
    } else {
      videoList.innerHTML = '<div class="alert alert-info">No videos generated yet.</div>';
    }
  } catch (error) {
    console.error('Error loading videos:', error);
    videoList.innerHTML = `<div class="alert alert-danger">Failed to load videos: ${error.message}</div>`;
  }
}

/**
 * Render video list
 * @param {Array} videos - List of videos
 */
function renderVideoList(videos) {
  if (!videoList) return;
  
  let html = '<div class="row">';
  
  videos.forEach(video => {
    const createdDate = new Date(video.createdAt).toLocaleString();
    const completedDate = video.completedAt ? new Date(video.completedAt).toLocaleString() : 'N/A';
    
    html += `
      <div class="col-md-6 mb-4">
        <div class="card h-100">
          <div class="card-header bg-${getStatusColor(video.status)}">
            <h5 class="card-title text-white mb-0">
              ${video.status.charAt(0).toUpperCase() + video.status.slice(1)}
            </h5>
          </div>
          <div class="card-body">
            <h6 class="card-subtitle mb-2 text-muted">ID: ${video.id}</h6>
            <p class="card-text">
              <strong>Created:</strong> ${createdDate}<br>
              <strong>Completed:</strong> ${completedDate}<br>
              <strong>Progress:</strong> ${video.progress}%<br>
              <strong>Message:</strong> ${video.message}
            </p>
    `;
    
    if (video.status === 'completed' && video.googleDriveDownloadUrl) {
      html += `
        <div class="mt-3">
          <a href="${video.googleDriveDownloadUrl}" class="btn btn-primary" target="_blank">
            <i class="bi bi-download"></i> Download from Google Drive
          </a>
          <a href="${video.googleDriveUrl}" class="btn btn-outline-secondary ms-2" target="_blank">
            <i class="bi bi-google"></i> View in Google Drive
          </a>
        </div>
      `;
    }
    
    html += `
          </div>
          <div class="card-footer text-muted">
            <small>Aspect Ratio: ${video.options?.aspectRatio || '16:9'}</small>
          </div>
        </div>
      </div>
    `;
  });
  
  html += '</div>';
  videoList.innerHTML = html;
}

/**
 * Handle Google Drive authentication
 */
async function handleDriveAuth() {
  try {
    const response = await fetch(`/api/advanced-video/drive-auth?userId=${userId}`);
    
    if (!response.ok) {
      throw new Error(`Error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Store user ID
    userId = data.userId;
    localStorage.setItem('driveUserId', userId);
    
    // Redirect to Google auth page
    window.location.href = data.authUrl;
  } catch (error) {
    console.error('Error getting auth URL:', error);
    showToast(`Failed to get auth URL: ${error.message}`, 'error');
  }
}

/**
 * Load files from Google Drive
 */
async function loadDriveFiles() {
  if (!driveFilesList) return;
  
  try {
    const response = await fetch(`/api/advanced-video/drive-files?userId=${userId}`);
    
    if (!response.ok) {
      throw new Error(`Error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.files && data.files.length > 0) {
      renderDriveFiles(data.files);
    } else {
      driveFilesList.innerHTML = `
        <div class="alert alert-info">
          No video files found in Google Drive. 
          <a href="#" onclick="handleDriveAuth()">Authenticate</a> if you haven't already.
        </div>
      `;
    }
  } catch (error) {
    console.error('Error loading Drive files:', error);
    driveFilesList.innerHTML = `
      <div class="alert alert-danger">
        Failed to load files: ${error.message}
        <br>
        <a href="#" onclick="handleDriveAuth()">Authenticate with Google Drive</a>
      </div>
    `;
  }
}

/**
 * Render Google Drive files
 * @param {Array} files - List of files
 */
function renderDriveFiles(files) {
  if (!driveFilesList) return;
  
  let html = '<div class="row">';
  
  files.forEach(file => {
    const createdDate = new Date(file.createdTime).toLocaleString();
    const fileSizeMB = file.size ? (parseInt(file.size) / (1024 * 1024)).toFixed(2) + ' MB' : 'Unknown';
    
    html += `
      <div class="col-md-6 mb-4">
        <div class="card h-100">
          <div class="card-header bg-primary">
            <h5 class="card-title text-white mb-0">
              ${file.name}
            </h5>
          </div>
          <div class="card-body">
            <p class="card-text">
              <strong>Created:</strong> ${createdDate}<br>
              <strong>Size:</strong> ${fileSizeMB}<br>
              <strong>Type:</strong> ${file.mimeType}
            </p>
            <div class="mt-3">
              <a href="${file.webContentLink || '#'}" class="btn btn-primary ${!file.webContentLink ? 'disabled' : ''}" target="_blank">
                <i class="bi bi-download"></i> Download
              </a>
              <a href="${file.webViewLink}" class="btn btn-outline-secondary ms-2" target="_blank">
                <i class="bi bi-google"></i> View in Drive
              </a>
              <button class="btn btn-outline-primary ms-2" onclick="createDirectDownloadLink('${file.id}')">
                <i class="bi bi-link-45deg"></i> Direct Link
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  });
  
  html += '</div>';
  driveFilesList.innerHTML = html;
}

/**
 * Create direct download link for Google Drive file
 * @param {string} fileId - Google Drive file ID
 */
async function createDirectDownloadLink(fileId) {
  try {
    const response = await fetch(`/api/advanced-video/drive-download/${fileId}?userId=${userId}`);
    
    if (!response.ok) {
      throw new Error(`Error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Copy to clipboard
    navigator.clipboard.writeText(data.downloadUrl)
      .then(() => {
        showToast('Direct download link copied to clipboard!', 'success');
      })
      .catch(err => {
        console.error('Could not copy text: ', err);
        showToast('Direct download link created, but could not copy to clipboard', 'warning');
      });
  } catch (error) {
    console.error('Error creating direct download link:', error);
    showToast(`Failed to create direct download link: ${error.message}`, 'error');
  }
}

/**
 * Set form disabled state
 * @param {boolean} disabled - Whether to disable the form
 */
function setFormDisabled(disabled) {
  if (videoForm) {
    const elements = videoForm.elements;
    for (let i = 0; i < elements.length; i++) {
      elements[i].disabled = disabled;
    }
  }
  
  if (generateBtn) {
    generateBtn.disabled = disabled;
    generateBtn.innerHTML = disabled ? 
      '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Generating...' : 
      'Generate Video';
  }
}

/**
 * Show toast notification
 * @param {string} message - Toast message
 * @param {string} type - Toast type (success, error, info, warning)
 */
function showToast(message, type = 'info') {
  // Create toast container if it doesn't exist
  let toastContainer = document.getElementById('toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.className = 'position-fixed bottom-0 end-0 p-3';
    document.body.appendChild(toastContainer);
  }
  
  // Create toast element
  const toastId = 'toast-' + Date.now();
  const toast = document.createElement('div');
  toast.className = `toast align-items-center text-white bg-${getToastColor(type)} border-0`;
  toast.id = toastId;
  toast.setAttribute('role', 'alert');
  toast.setAttribute('aria-live', 'assertive');
  toast.setAttribute('aria-atomic', 'true');
  
  toast.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">
        ${message}
      </div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
    </div>
  `;
  
  toastContainer.appendChild(toast);
  
  // Initialize and show toast
  const bsToast = new bootstrap.Toast(toast, {
    autohide: true,
    delay: 5000
  });
  bsToast.show();
  
  // Remove toast after it's hidden
  toast.addEventListener('hidden.bs.toast', function() {
    toast.remove();
  });
}

/**
 * Get color for toast
 * @param {string} type - Toast type
 * @returns {string} Bootstrap color class
 */
function getToastColor(type) {
  switch (type) {
    case 'success': return 'success';
    case 'error': return 'danger';
    case 'warning': return 'warning';
    case 'info':
    default: return 'primary';
  }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', init);

/**
 * Fixed Advanced Video Generation Frontend JavaScript
 * Includes proper DOM element checks and error handling
 */

// DOM Elements - with null checks
let videoForm = null;
let scriptInput = null;
let generateBtn = null;
let videoList = null;
let statusArea = null;
let driveAuthBtn = null;
let driveFilesList = null;

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
 * Safely gets DOM elements and sets up event listeners
 */
function init() {
  console.log('Initializing advanced video generation module');
  
  // Safely get DOM elements
  videoForm = document.getElementById('video-form');
  scriptInput = document.getElementById('script-input');
  generateBtn = document.getElementById('generate-btn');
  videoList = document.getElementById('video-list');
  statusArea = document.getElementById('status-area');
  driveAuthBtn = document.getElementById('drive-auth-btn');
  driveFilesList = document.getElementById('drive-files-list');
  
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
 * Set up event listeners with proper null checks
 */
function setupEventListeners() {
  // Video generation form
  if (videoForm) {
    videoForm.addEventListener('submit', handleVideoGeneration);
  } else {
    console.warn('Video form element not found');
  }
  
  // Google Drive authentication
  if (driveAuthBtn) {
    driveAuthBtn.addEventListener('click', handleDriveAuth);
  } else {
    console.warn('Drive auth button not found');
  }
  
  // Tab switching - with proper null checks
  const navLinks = document.querySelectorAll('.nav-link');
  navLinks.forEach(tab => {
    if (tab && tab.getAttribute('href')) {
      tab.addEventListener('click', function(e) {
        e.preventDefault();
        const targetId = this.getAttribute('href');
        if (!targetId) return;
        
        // Remove # from the beginning if present
        const targetIdClean = targetId.startsWith('#') ? targetId.substring(1) : targetId;
        const targetElement = document.getElementById(targetIdClean);
        
        if (!targetElement) {
          console.warn(`Target element ${targetIdClean} not found`);
          return;
        }
        
        // Hide all tab content
        document.querySelectorAll('.tab-pane').forEach(pane => {
          if (pane) pane.classList.remove('show', 'active');
        });
        
        // Show selected tab content
        targetElement.classList.add('show', 'active');
        
        // Update active tab
        document.querySelectorAll('.nav-link').forEach(navLink => {
          if (navLink) navLink.classList.remove('active');
        });
        this.classList.add('active');
        
        // Load content for specific tabs
        if (targetIdClean === 'drive-tab') {
          loadDriveFiles();
        }
      });
    }
  });
}

/**
 * Handle video generation form submission
 * @param {Event} e - Form submit event
 */
async function handleVideoGeneration(e) {
  e.preventDefault();
  
  // Check if script input exists
  if (!scriptInput) {
    showToast('Script input element not found', 'error');
    return;
  }
  
  const script = scriptInput.value.trim();
  if (!script) {
    showToast('Please enter a script', 'error');
    return;
  }
  
  // Get options from form with null checks
  const styleInput = document.getElementById('style-input');
  const durationInput = document.getElementById('duration-input');
  
  const options = {
    style: styleInput ? styleInput.value : 'cinematic',
    clipDuration: durationInput ? parseInt(durationInput.value) : 4,
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
    if (data && data.id) {
      pollVideoStatus(data.id);
      showToast('Video generation started!', 'success');
    } else {
      throw new Error('Invalid response from server');
    }
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
 * Update status display with null check
 * @param {object} data - Status data
 */
function updateStatusDisplay(data) {
  if (!statusArea) {
    console.warn('Status area element not found');
    return;
  }
  
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
 * Load videos from API with null check
 */
async function loadVideos() {
  if (!videoList) {
    console.warn('Video list element not found');
    return;
  }
  
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
 * Render video list with null check
 * @param {Array} videos - List of videos
 */
function renderVideoList(videos) {
  if (!videoList) {
    console.warn('Video list element not found');
    return;
  }
  
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
 * Load files from Google Drive with null check
 */
async function loadDriveFiles() {
  if (!driveFilesList) {
    console.warn('Drive files list element not found');
    return;
  }
  
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
          <a href="#" onclick="handleDriveAuth(); return false;">Authenticate</a> if you haven't already.
        </div>
      `;
    }
  } catch (error) {
    console.error('Error loading Drive files:', error);
    driveFilesList.innerHTML = `
      <div class="alert alert-danger">
        Failed to load files: ${error.message}
        <br>
        <a href="#" onclick="handleDriveAuth(); return false;">Authenticate with Google Drive</a>
      </div>
    `;
  }
}

/**
 * Render Google Drive files with null check
 * @param {Array} files - List of files
 */
function renderDriveFiles(files) {
  if (!driveFilesList) {
    console.warn('Drive files list element not found');
    return;
  }
  
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
              <button class="btn btn-outline-primary ms-2" onclick="createDirectDownloadLink('${file.id}'); return false;">
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
  if (!fileId) {
    showToast('Invalid file ID', 'error');
    return;
  }
  
  try {
    const response = await fetch(`/api/advanced-video/drive-download/${fileId}?userId=${userId}`);
    
    if (!response.ok) {
      throw new Error(`Error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data.downloadUrl) {
      throw new Error('No download URL in response');
    }
    
    // Copy to clipboard
    try {
      await navigator.clipboard.writeText(data.downloadUrl);
      showToast('Direct download link copied to clipboard!', 'success');
    } catch (clipboardErr) {
      console.error('Could not copy text: ', clipboardErr);
      showToast('Direct download link created, but could not copy to clipboard', 'warning');
      // Show the URL in a modal or alert as fallback
      alert(`Direct download link: ${data.downloadUrl}`);
    }
  } catch (error) {
    console.error('Error creating direct download link:', error);
    showToast(`Failed to create direct download link: ${error.message}`, 'error');
  }
}

/**
 * Set form disabled state with null checks
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
  if (typeof bootstrap !== 'undefined' && bootstrap.Toast) {
    const bsToast = new bootstrap.Toast(toast, {
      autohide: true,
      delay: 5000
    });
    bsToast.show();
    
    // Remove toast after it's hidden
    toast.addEventListener('hidden.bs.toast', function() {
      toast.remove();
    });
  } else {
    // Fallback if Bootstrap is not available
    toast.style.display = 'block';
    setTimeout(() => {
      toast.remove();
    }, 5000);
  }
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
    default: return 'info';
  }
}

/**
 * Safe function to show a section
 * Ensures element exists before manipulating it
 * @param {string} sectionId - ID of the section to show
 */
function showSection(sectionId) {
  // Hide all sections
  const sections = document.querySelectorAll('.section');
  sections.forEach(section => {
    if (section) section.style.display = 'none';
  });
  
  // Show the selected section
  const selectedSection = document.getElementById(sectionId);
  if (selectedSection) {
    selectedSection.style.display = 'block';
  } else {
    console.warn(`Section with ID ${sectionId} not found`);
  }
  
  // Update active nav link
  const navLinks = document.querySelectorAll('.nav-link');
  navLinks.forEach(link => {
    if (!link) return;
    
    const linkTarget = link.getAttribute('href');
    if (!linkTarget) return;
    
    // Remove # if present
    const targetId = linkTarget.startsWith('#') ? linkTarget.substring(1) : linkTarget;
    
    if (targetId === sectionId) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', init);

// Add test script
const testScript = document.createElement('script');
testScript.src = '/tests/frontend-tests.js';
document.head.appendChild(testScript);

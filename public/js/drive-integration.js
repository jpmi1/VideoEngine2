// Google Drive Integration UI
document.addEventListener('DOMContentLoaded', function() {
  // Add Google Drive section to the page
  const mainContainer = document.querySelector('.container');
  
  // Create Google Drive section if it doesn't exist
  if (!document.getElementById('drive-section')) {
    const driveSection = document.createElement('div');
    driveSection.id = 'drive-section';
    driveSection.className = 'mt-4 section-content';
    driveSection.style.display = 'none';
    
    driveSection.innerHTML = `
      <div class="dashboard-card">
        <h2>Google Drive Integration</h2>
        <p>Connect to your Google Drive account to store and manage your generated videos.</p>
        
        <div id="drive-auth-section">
          <div class="alert alert-info">
            <i class="bi bi-info-circle"></i> You need to authenticate with Google Drive to use this feature.
          </div>
          <button id="drive-auth-button" class="btn btn-primary">Connect to Google Drive</button>
        </div>
        
        <div id="drive-content-section" style="display: none;">
          <div class="alert alert-success mb-3">
            <i class="bi bi-check-circle"></i> Connected to Google Drive
          </div>
          
          <h3>Your Files</h3>
          <div class="mb-3">
            <button id="drive-refresh-button" class="btn btn-outline-primary">
              <i class="bi bi-arrow-clockwise"></i> Refresh Files
            </button>
          </div>
          
          <div class="table-responsive">
            <table class="table table-striped">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody id="drive-files-list">
                <tr>
                  <td colspan="4" class="text-center">Loading files...</td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <h3>Upload to Drive</h3>
          <div class="mb-3">
            <label for="drive-upload-file" class="form-label">Select File</label>
            <input class="form-control" type="file" id="drive-upload-file">
          </div>
          <button id="drive-upload-button" class="btn btn-primary">Upload to Drive</button>
        </div>
      </div>
    `;
    
    mainContainer.appendChild(driveSection);
    
    // Add Drive to the navigation
    const dashboardCard = document.querySelector('.dashboard-card:nth-child(3)');
    if (dashboardCard) {
      dashboardCard.querySelector('.feature-icon').textContent = '☁️';
      dashboardCard.querySelector('h3').textContent = 'Cloud Storage';
      dashboardCard.querySelector('p').textContent = 'Connect to Google Drive to store videos';
      dashboardCard.querySelector('button').setAttribute('onclick', "showSection('drive')");
      dashboardCard.querySelector('button').textContent = 'Open Cloud Storage';
    }
    
    // Initialize Drive functionality
    initDriveIntegration();
  }
});

// Initialize Google Drive Integration
function initDriveIntegration() {
  const authButton = document.getElementById('drive-auth-button');
  const refreshButton = document.getElementById('drive-refresh-button');
  const uploadButton = document.getElementById('drive-upload-button');
  const filesList = document.getElementById('drive-files-list');
  const authSection = document.getElementById('drive-auth-section');
  const contentSection = document.getElementById('drive-content-section');
  
  // Check if already authenticated
  checkDriveAuth();
  
  // Auth button click handler
  if (authButton) {
    authButton.addEventListener('click', function() {
      // Get auth URL from backend
      fetch('/api/drive/auth-url')
        .then(response => response.json())
        .then(data => {
          if (data.authUrl) {
            // Open auth URL in a new window
            const authWindow = window.open(data.authUrl, '_blank', 'width=800,height=600');
            
            // Poll for auth completion
            const checkAuth = setInterval(function() {
              if (authWindow.closed) {
                clearInterval(checkAuth);
                checkDriveAuth();
              }
            }, 1000);
          } else {
            showToast('Error getting authentication URL', 'error');
          }
        })
        .catch(error => {
          console.error('Error getting auth URL:', error);
          showToast('Error connecting to Google Drive', 'error');
        });
    });
  }
  
  // Refresh button click handler
  if (refreshButton) {
    refreshButton.addEventListener('click', function() {
      loadDriveFiles();
    });
  }
  
  // Upload button click handler
  if (uploadButton) {
    uploadButton.addEventListener('click', function() {
      const fileInput = document.getElementById('drive-upload-file');
      if (fileInput.files.length === 0) {
        showToast('Please select a file to upload', 'warning');
        return;
      }
      
      const file = fileInput.files[0];
      const formData = new FormData();
      formData.append('file', file);
      formData.append('fileName', file.name);
      
      // Show loading state
      uploadButton.disabled = true;
      uploadButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Uploading...';
      
      // Upload file to Drive
      fetch('/api/drive/upload', {
        method: 'POST',
        body: formData
      })
        .then(response => response.json())
        .then(data => {
          if (data.success) {
            showToast('File uploaded successfully to Google Drive', 'success');
            fileInput.value = '';
            loadDriveFiles();
          } else {
            showToast(data.error || 'Error uploading file', 'error');
          }
        })
        .catch(error => {
          console.error('Error uploading file:', error);
          showToast('Error uploading file to Google Drive', 'error');
        })
        .finally(() => {
          // Reset button state
          uploadButton.disabled = false;
          uploadButton.textContent = 'Upload to Drive';
        });
    });
  }
  
  // Check if authenticated with Google Drive
  function checkDriveAuth() {
    fetch('/api/drive/files')
      .then(response => {
        if (response.ok) {
          // Authenticated, show content section
          authSection.style.display = 'none';
          contentSection.style.display = 'block';
          loadDriveFiles();
          return response.json();
        } else {
          // Not authenticated, show auth section
          authSection.style.display = 'block';
          contentSection.style.display = 'none';
          throw new Error('Not authenticated');
        }
      })
      .catch(error => {
        console.log('Not authenticated with Google Drive:', error);
      });
  }
  
  // Load files from Google Drive
  function loadDriveFiles() {
    filesList.innerHTML = '<tr><td colspan="4" class="text-center"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div></td></tr>';
    
    fetch('/api/drive/files')
      .then(response => response.json())
      .then(files => {
        if (files.length === 0) {
          filesList.innerHTML = '<tr><td colspan="4" class="text-center">No files found</td></tr>';
          return;
        }
        
        filesList.innerHTML = '';
        files.forEach(file => {
          const row = document.createElement('tr');
          
          // Format date
          const createdDate = new Date(file.createdTime);
          const formattedDate = createdDate.toLocaleDateString() + ' ' + createdDate.toLocaleTimeString();
          
          // Format file size
          let fileSize = '';
          if (file.size) {
            const size = parseInt(file.size);
            if (size < 1024) {
              fileSize = size + ' B';
            } else if (size < 1024 * 1024) {
              fileSize = (size / 1024).toFixed(2) + ' KB';
            } else {
              fileSize = (size / (1024 * 1024)).toFixed(2) + ' MB';
            }
          }
          
          row.innerHTML = `
            <td>${file.name}</td>
            <td>${file.mimeType.split('/').pop()}</td>
            <td>${formattedDate}</td>
            <td>
              <a href="${file.webViewLink}" target="_blank" class="btn btn-sm btn-outline-primary">
                <i class="bi bi-eye"></i> View
              </a>
            </td>
          `;
          
          filesList.appendChild(row);
        });
      })
      .catch(error => {
        console.error('Error loading files:', error);
        filesList.innerHTML = '<tr><td colspan="4" class="text-center text-danger">Error loading files</td></tr>';
      });
  }
}

// Helper function to show toast notifications
function showToast(message, type = 'info') {
  // Create toast container if it doesn't exist
  let toastContainer = document.getElementById('toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.className = 'position-fixed bottom-0 end-0 p-3';
    toastContainer.style.zIndex = '5';
    document.body.appendChild(toastContainer);
  }
  
  // Create toast element
  const toastId = 'toast-' + Date.now();
  const toast = document.createElement('div');
  toast.id = toastId;
  toast.className = `toast align-items-center text-white bg-${type === 'error' ? 'danger' : type === 'success' ? 'success' : type === 'warning' ? 'warning' : 'primary'}`;
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

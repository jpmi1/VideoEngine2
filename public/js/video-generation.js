// Video Generation UI
document.addEventListener('DOMContentLoaded', function() {
  // Add Video Generation section to the page
  const mainContainer = document.querySelector('.container');
  
  // Create Video Generation section if it doesn't exist
  if (!document.getElementById('video-section')) {
    // Update existing video section with enhanced functionality
    const videoSection = document.getElementById('video-section') || document.createElement('div');
    videoSection.id = 'video-section';
    videoSection.className = 'mt-4 section-content';
    if (!document.getElementById('video-section')) {
      videoSection.style.display = 'none';
    }
    
    videoSection.innerHTML = `
      <div class="dashboard-card">
        <h2>Video Generation</h2>
        <p>Generate videos using AI tools like Gemini Veo 2.</p>
        
        <ul class="nav nav-tabs mb-3" id="videoTabs" role="tablist">
          <li class="nav-item" role="presentation">
            <button class="nav-link active" id="create-tab" data-bs-toggle="tab" data-bs-target="#create-tab-pane" type="button" role="tab" aria-controls="create-tab-pane" aria-selected="true">Create Video</button>
          </li>
          <li class="nav-item" role="presentation">
            <button class="nav-link" id="list-tab" data-bs-toggle="tab" data-bs-target="#list-tab-pane" type="button" role="tab" aria-controls="list-tab-pane" aria-selected="false">My Videos</button>
          </li>
        </ul>
        
        <div class="tab-content" id="videoTabsContent">
          <div class="tab-pane fade show active" id="create-tab-pane" role="tabpanel" aria-labelledby="create-tab" tabindex="0">
            <form id="video-generation-form">
              <div class="mb-3">
                <label for="videoTitle" class="form-label">Video Title</label>
                <input type="text" class="form-control" id="videoTitle" placeholder="Enter video title" required>
              </div>
              
              <div class="mb-3">
                <label for="videoDescription" class="form-label">Video Description</label>
                <textarea class="form-control" id="videoDescription" rows="3" placeholder="Enter video description" required></textarea>
                <div class="form-text">Describe what you want in your video. Be specific about scenes, style, and content.</div>
              </div>
              
              <div class="row">
                <div class="col-md-6 mb-3">
                  <label for="videoStyle" class="form-label">Video Style</label>
                  <select class="form-select" id="videoStyle">
                    <option value="default">Default</option>
                    <option value="cinematic">Cinematic</option>
                    <option value="documentary">Documentary</option>
                    <option value="promotional">Promotional</option>
                    <option value="social">Social Media</option>
                    <option value="tutorial">Tutorial</option>
                  </select>
                </div>
                
                <div class="col-md-6 mb-3">
                  <label for="videoDuration" class="form-label">Duration (seconds)</label>
                  <input type="number" class="form-control" id="videoDuration" min="10" max="60" value="30">
                </div>
              </div>
              
              <button type="submit" class="btn btn-primary" id="generate-video-btn">Generate Video</button>
            </form>
          </div>
          
          <div class="tab-pane fade" id="list-tab-pane" role="tabpanel" aria-labelledby="list-tab" tabindex="0">
            <div class="d-flex justify-content-between align-items-center mb-3">
              <h3>Generated Videos</h3>
              <button id="refresh-videos-btn" class="btn btn-outline-primary">
                <i class="bi bi-arrow-clockwise"></i> Refresh
              </button>
            </div>
            
            <div id="videos-container" class="row">
              <div class="col-12 text-center py-5">
                <div class="spinner-border text-primary" role="status">
                  <span class="visually-hidden">Loading...</span>
                </div>
                <p class="mt-2">Loading videos...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Video Details Modal -->
      <div class="modal fade" id="videoDetailsModal" tabindex="-1" aria-labelledby="videoDetailsModalLabel" aria-hidden="true">
        <div class="modal-dialog modal-lg">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title" id="videoDetailsModalLabel">Video Details</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body" id="videoDetailsModalBody">
              <div class="text-center py-5">
                <div class="spinner-border text-primary" role="status">
                  <span class="visually-hidden">Loading...</span>
                </div>
                <p class="mt-2">Loading video details...</p>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
              <button type="button" class="btn btn-primary" id="uploadToDriveBtn" style="display: none;">Upload to Drive</button>
            </div>
          </div>
        </div>
      </div>
    `;
    
    if (!document.getElementById('video-section')) {
      mainContainer.appendChild(videoSection);
    }
    
    // Initialize Video Generation functionality
    initVideoGeneration();
  }
});

// Initialize Video Generation
function initVideoGeneration() {
  const generateForm = document.getElementById('video-generation-form');
  const refreshBtn = document.getElementById('refresh-videos-btn');
  const videosContainer = document.getElementById('videos-container');
  const uploadToDriveBtn = document.getElementById('uploadToDriveBtn');
  
  // Load videos on init
  loadVideos();
  
  // Form submission handler
  if (generateForm) {
    generateForm.addEventListener('submit', function(e) {
      e.preventDefault();
      
      const title = document.getElementById('videoTitle').value;
      const description = document.getElementById('videoDescription').value;
      const style = document.getElementById('videoStyle').value;
      const duration = document.getElementById('videoDuration').value;
      
      // Validate inputs
      if (!title || !description) {
        showToast('Please fill in all required fields', 'warning');
        return;
      }
      
      // Disable submit button and show loading state
      const submitBtn = document.getElementById('generate-video-btn');
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Generating...';
      
      // Send request to backend
      fetch('/api/video/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title,
          description,
          style,
          duration: parseInt(duration)
        })
      })
        .then(response => response.json())
        .then(data => {
          if (data.requestId) {
            showToast('Video generation started successfully', 'success');
            
            // Reset form
            generateForm.reset();
            
            // Switch to videos list tab
            const listTab = document.getElementById('list-tab');
            if (listTab) {
              const tabInstance = new bootstrap.Tab(listTab);
              tabInstance.show();
            }
            
            // Start polling for status
            pollVideoStatus(data.requestId);
          } else {
            showToast(data.error || 'Error starting video generation', 'error');
          }
        })
        .catch(error => {
          console.error('Error generating video:', error);
          showToast('Error starting video generation', 'error');
        })
        .finally(() => {
          // Reset button state
          submitBtn.disabled = false;
          submitBtn.textContent = 'Generate Video';
        });
    });
  }
  
  // Refresh button handler
  if (refreshBtn) {
    refreshBtn.addEventListener('click', function() {
      loadVideos();
    });
  }
  
  // Upload to Drive button handler
  if (uploadToDriveBtn) {
    uploadToDriveBtn.addEventListener('click', function() {
      const requestId = uploadToDriveBtn.dataset.requestId;
      if (!requestId) {
        showToast('No video selected for upload', 'warning');
        return;
      }
      
      // Disable button and show loading state
      uploadToDriveBtn.disabled = true;
      uploadToDriveBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Uploading...';
      
      // Send request to backend
      fetch(`/api/video/${requestId}/upload-to-drive`, {
        method: 'POST'
      })
        .then(response => response.json())
        .then(data => {
          if (data.success) {
            showToast('Video uploaded successfully to Google Drive', 'success');
            
            // Update video details in modal
            loadVideoDetails(requestId);
          } else {
            showToast(data.error || 'Error uploading video to Drive', 'error');
          }
        })
        .catch(error => {
          console.error('Error uploading to Drive:', error);
          showToast('Error uploading video to Google Drive', 'error');
        })
        .finally(() => {
          // Reset button state
          uploadToDriveBtn.disabled = false;
          uploadToDriveBtn.textContent = 'Upload to Drive';
        });
    });
  }
  
  // Load videos from backend
  function loadVideos() {
    videosContainer.innerHTML = `
      <div class="col-12 text-center py-5">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
        <p class="mt-2">Loading videos...</p>
      </div>
    `;
    
    fetch('/api/video/list')
      .then(response => response.json())
      .then(videos => {
        if (videos.length === 0) {
          videosContainer.innerHTML = `
            <div class="col-12 text-center py-5">
              <p>No videos generated yet. Create your first video!</p>
            </div>
          `;
          return;
        }
        
        videosContainer.innerHTML = '';
        videos.forEach(video => {
          const card = document.createElement('div');
          card.className = 'col-md-6 col-lg-4 mb-4';
          
          // Format date
          const createdDate = new Date(video.createdAt);
          const formattedDate = createdDate.toLocaleDateString() + ' ' + createdDate.toLocaleTimeString();
          
          // Status badge
          let statusBadge = '';
          if (video.status === 'pending') {
            statusBadge = '<span class="badge bg-warning">Pending</span>';
          } else if (video.status === 'processing') {
            statusBadge = '<span class="badge bg-info">Processing</span>';
          } else if (video.status === 'completed') {
            statusBadge = '<span class="badge bg-success">Completed</span>';
          } else if (video.status === 'failed') {
            statusBadge = '<span class="badge bg-danger">Failed</span>';
          }
          
          card.innerHTML = `
            <div class="card h-100">
              <div class="card-body">
                <h5 class="card-title">${video.title}</h5>
                <h6 class="card-subtitle mb-2 text-muted">
                  ${statusBadge} ${formattedDate}
                </h6>
                <p class="card-text">${video.description.substring(0, 100)}${video.description.length > 100 ? '...' : ''}</p>
              </div>
              <div class="card-footer">
                <button class="btn btn-primary btn-sm view-details-btn" data-request-id="${video.id}">
                  View Details
                </button>
                ${video.status === 'completed' ? `
                  <a href="${video.outputUrl}" class="btn btn-outline-primary btn-sm" target="_blank">
                    <i class="bi bi-play-fill"></i> Play
                  </a>
                ` : ''}
              </div>
            </div>
          `;
          
          videosContainer.appendChild(card);
        });
        
        // Add event listeners to view details buttons
        document.querySelectorAll('.view-details-btn').forEach(btn => {
          btn.addEventListener('click', function() {
            const requestId = this.dataset.requestId;
            showVideoDetails(requestId);
          });
        });
      })
      .catch(error => {
        console.error('Error loading videos:', error);
        videosContainer.innerHTML = `
          <div class="col-12 text-center py-5">
            <p class="text-danger">Error loading videos. Please try again.</p>
          </div>
        `;
      });
  }
  
  // Show video details in modal
  function showVideoDetails(requestId) {
    const modal = new bootstrap.Modal(document.getElementById('videoDetailsModal'));
    modal.show();
    
    loadVideoDetails(requestId);
  }
  
  // Load video details
  function loadVideoDetails(requestId) {
    const modalBody = document.getElementById('videoDetailsModalBody');
    modalBody.innerHTML = `
      <div class="text-center py-5">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
        <p class="mt-2">Loading video details...</p>
      </div>
    `;
    
    fetch(`/api/video/status/${requestId}`)
      .then(response => response.json())
      .then(video => {
        // Format dates
        const createdDate = new Date(video.createdAt);
        const formattedCreatedDate = createdDate.toLocaleDateString() + ' ' + createdDate.toLocaleTimeString();
        
        let formattedCompletedDate = 'N/A';
        if (video.completedAt) {
          const completedDate = new Date(video.completedAt);
          formattedCompletedDate = completedDate.toLocaleDateString() + ' ' + completedDate.toLocaleTimeString();
        }
        
        // Status badge
        let statusBadge = '';
        if (video.status === 'pending') {
          statusBadge = '<span class="badge bg-warning">Pending</span>';
        } else if (video.status === 'processing') {
          statusBadge = '<span class="badge bg-info">Processing</span>';
        } else if (video.status === 'completed') {
          statusBadge = '<span class="badge bg-success">Completed</span>';
        } else if (video.status === 'failed') {
          statusBadge = '<span class="badge bg-danger">Failed</span>';
        }
        
        // Video preview
        let videoPreview = '';
        if (video.status === 'completed' && video.outputUrl) {
          videoPreview = `
            <div class="mb-3">
              <h5>Preview</h5>
              <div class="ratio ratio-16x9">
                <video controls>
                  <source src="${video.outputUrl}" type="video/mp4">
                  Your browser does not support the video tag.
                </video>
              </div>
            </div>
          `;
        }
        
        // Google Drive info
        let driveInfo = '';
        if (video.driveFileId) {
          driveInfo = `
            <div class="alert alert-success">
              <i class="bi bi-cloud-check"></i> This video has been uploaded to Google Drive.
            </div>
          `;
        }
        
        modalBody.innerHTML = `
          <h4>${video.title} ${statusBadge}</h4>
          
          ${driveInfo}
          
          ${videoPreview}
          
          <div class="mb-3">
            <h5>Description</h5>
            <p>${video.description}</p>
          </div>
          
          <div class="row mb-3">
            <div class="col-md-6">
              <h5>Details</h5>
              <ul class="list-group">
                <li class="list-group-item d-flex justify-content-between align-items-center">
                  Status
                  ${statusBadge}
                </li>
                <li class="list-group-item d-flex justify-content-between align-items-center">
                  Style
                  <span>${video.style}</span>
                </li>
                <li class="list-group-item d-flex justify-content-between align-items-center">
                  Duration
                  <span>${video.duration} seconds</span>
                </li>
              </ul>
            </div>
            
            <div class="col-md-6">
              <h5>Timestamps</h5>
              <ul class="list-group">
                <li class="list-group-item d-flex justify-content-between align-items-center">
                  Created
                  <span>${formattedCreatedDate}</span>
                </li>
                <li class="list-group-item d-flex justify-content-between align-items-center">
                  Completed
                  <span>${formattedCompletedDate}</span>
                </li>
              </ul>
            </div>
          </div>
        `;
        
        // Show/hide Upload to Drive button
        const uploadToDriveBtn = document.getElementById('uploadToDriveBtn');
        if (uploadToDriveBtn) {
          if (video.status === 'completed' && !video.driveFileId) {
            uploadToDriveBtn.style.display = 'block';
            uploadToDriveBtn.dataset.requestId = video.id;
          } else {
            uploadToDriveBtn.style.display = 'none';
            uploadToDriveBtn.dataset.requestId = '';
          }
        }
      })
      .catch(error => {
        console.error('Error loading video details:', error);
        modalBody.innerHTML = `
          <div class="alert alert-danger">
            Error loading video details. Please try again.
          </div>
        `;
      });
  }
  
  // Poll for video status updates
  function pollVideoStatus(requestId, interval = 5000) {
    const statusCheck = setInterval(() => {
      fetch(`/api/video/status/${requestId}`)
        .then(response => response.json())
        .then(video => {
          if (video.status === 'completed' || video.status === 'failed') {
            // Stop polling when video is completed or failed
            clearInterval(statusCheck);
            
            // Refresh videos list
            loadVideos();
            
            // Show notification
            if (video.status === 'completed') {
              showToast('Video generation completed successfully', 'success');
            } else {
              showToast('Video generation failed', 'error');
            }
          }
        })
        .catch(error => {
          console.error('Error polling video status:', error);
          clearInterval(statusCheck);
        });
    }, interval);
  }
}

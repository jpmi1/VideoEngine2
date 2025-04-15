/**
 * Frontend component for advanced video generation with script-based clip generation
 * Implements the UI for the Test-Time Training approach
 */

// Add this script to the public/js directory
document.addEventListener('DOMContentLoaded', function() {
  // Add Advanced Video Generation section to the page
  const mainContainer = document.querySelector('.container');
  
  // Create Advanced Video section if it doesn't exist
  if (!document.getElementById('advanced-video-section')) {
    const advancedVideoSection = document.createElement('div');
    advancedVideoSection.id = 'advanced-video-section';
    advancedVideoSection.className = 'mt-4 section-content';
    advancedVideoSection.style.display = 'none';
    
    advancedVideoSection.innerHTML = `
      <div class="dashboard-card">
        <h2>Advanced Video Generation</h2>
        <p>Generate consistent videos using Test-Time Training approach with Gemini Veo 2.</p>
        
        <ul class="nav nav-tabs mb-3" id="advancedVideoTabs" role="tablist">
          <li class="nav-item" role="presentation">
            <button class="nav-link active" id="script-tab" data-bs-toggle="tab" data-bs-target="#script-tab-pane" type="button" role="tab" aria-controls="script-tab-pane" aria-selected="true">Script Editor</button>
          </li>
          <li class="nav-item" role="presentation">
            <button class="nav-link" id="advanced-list-tab" data-bs-toggle="tab" data-bs-target="#advanced-list-tab-pane" type="button" role="tab" aria-controls="advanced-list-tab-pane" aria-selected="false">My Videos</button>
          </li>
        </ul>
        
        <div class="tab-content" id="advancedVideoTabsContent">
          <div class="tab-pane fade show active" id="script-tab-pane" role="tabpanel" aria-labelledby="script-tab" tabindex="0">
            <form id="script-generation-form">
              <div class="mb-3">
                <label for="videoTitle" class="form-label">Video Title</label>
                <input type="text" class="form-control" id="advancedVideoTitle" placeholder="Enter video title" required>
              </div>
              
              <div class="mb-3">
                <label for="videoStyle" class="form-label">Visual Style</label>
                <select class="form-select" id="advancedVideoStyle">
                  <option value="cinematic">Cinematic</option>
                  <option value="cartoon">Cartoon</option>
                  <option value="documentary">Documentary</option>
                  <option value="promotional">Promotional</option>
                  <option value="social">Social Media</option>
                  <option value="tutorial">Tutorial</option>
                </select>
                <div class="form-text">The visual style will be maintained consistently across all clips.</div>
              </div>
              
              <div class="mb-3">
                <label for="videoCharacters" class="form-label">Main Characters</label>
                <input type="text" class="form-control" id="advancedVideoCharacters" placeholder="e.g., John, Sarah, Robot Assistant">
                <div class="form-text">Comma-separated list of main characters in the video.</div>
              </div>
              
              <div class="mb-3">
                <label for="videoScript" class="form-label">Video Script</label>
                <textarea class="form-control" id="advancedVideoScript" rows="10" placeholder="Enter your video script here..." required></textarea>
                <div class="form-text">
                  <p>Write your script with natural breaks for 3-4 second clips. Use parentheses for actions.</p>
                  <p>Example:</p>
                  <pre class="bg-light p-2">John enters the room looking confused.
(John looks around nervously)
Where did I put my keys?
(He checks his pockets)
Oh, here they are!</pre>
                </div>
              </div>
              
              <div class="mb-3">
                <label for="clipDuration" class="form-label">Clip Duration (seconds)</label>
                <input type="number" class="form-control" id="clipDuration" min="3" max="5" value="4">
                <div class="form-text">Duration of each clip in seconds. Recommended: 3-4 seconds for best results.</div>
              </div>
              
              <div class="mb-3">
                <label for="maxClips" class="form-label">Maximum Clips</label>
                <input type="number" class="form-control" id="maxClips" min="5" max="20" value="15">
                <div class="form-text">Maximum number of clips to generate. Longer videos require more processing time.</div>
              </div>
              
              <button type="submit" class="btn btn-primary" id="generate-advanced-video-btn">Generate Video</button>
            </form>
          </div>
          
          <div class="tab-pane fade" id="advanced-list-tab-pane" role="tabpanel" aria-labelledby="advanced-list-tab" tabindex="0">
            <div class="d-flex justify-content-between align-items-center mb-3">
              <h3>Generated Videos</h3>
              <button id="refresh-advanced-videos-btn" class="btn btn-outline-primary">
                <i class="bi bi-arrow-clockwise"></i> Refresh
              </button>
            </div>
            
            <div id="advanced-videos-container" class="row">
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
      
      <!-- Advanced Video Details Modal -->
      <div class="modal fade" id="advancedVideoDetailsModal" tabindex="-1" aria-labelledby="advancedVideoDetailsModalLabel" aria-hidden="true">
        <div class="modal-dialog modal-lg">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title" id="advancedVideoDetailsModalLabel">Video Details</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body" id="advancedVideoDetailsModalBody">
              <div class="text-center py-5">
                <div class="spinner-border text-primary" role="status">
                  <span class="visually-hidden">Loading...</span>
                </div>
                <p class="mt-2">Loading video details...</p>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
              <button type="button" class="btn btn-primary" id="uploadAdvancedToDriveBtn" style="display: none;">Upload to Drive</button>
            </div>
          </div>
        </div>
      </div>
    `;
    
    mainContainer.appendChild(advancedVideoSection);
    
    // Initialize Advanced Video Generation functionality
    initAdvancedVideoGeneration();
    
    // Add menu item to the dashboard
    const dashboardRow = document.querySelector('.container > .row');
    if (dashboardRow) {
      const advancedVideoCard = document.createElement('div');
      advancedVideoCard.className = 'col-md-3';
      advancedVideoCard.innerHTML = `
        <div class="dashboard-card">
          <div class="feature-icon">🎞️</div>
          <h3>Advanced Video</h3>
          <p>Create consistent videos with Test-Time Training</p>
          <button class="btn btn-primary" onclick="showSection('advanced-video')">Create Videos</button>
        </div>
      `;
      dashboardRow.appendChild(advancedVideoCard);
    }
  }
});

// Initialize Advanced Video Generation
function initAdvancedVideoGeneration() {
  const generateForm = document.getElementById('script-generation-form');
  const refreshBtn = document.getElementById('refresh-advanced-videos-btn');
  const videosContainer = document.getElementById('advanced-videos-container');
  const uploadToDriveBtn = document.getElementById('uploadAdvancedToDriveBtn');
  
  // Load videos on init
  loadAdvancedVideos();
  
  // Form submission handler
  if (generateForm) {
    generateForm.addEventListener('submit', function(e) {
      e.preventDefault();
      
      const title = document.getElementById('advancedVideoTitle').value;
      const style = document.getElementById('advancedVideoStyle').value;
      const characters = document.getElementById('advancedVideoCharacters').value.split(',').map(c => c.trim()).filter(c => c);
      const script = document.getElementById('advancedVideoScript').value;
      const clipDuration = document.getElementById('clipDuration').value;
      const maxClips = document.getElementById('maxClips').value;
      
      // Validate inputs
      if (!title || !script) {
        showToast('Please fill in all required fields', 'warning');
        return;
      }
      
      // Disable submit button and show loading state
      const submitBtn = document.getElementById('generate-advanced-video-btn');
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Generating...';
      
      // Send request to backend
      fetch('/api/advanced-video/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title,
          description: `Generated from script with style: ${style}`,
          script,
          style,
          characters,
          clipDuration: parseInt(clipDuration),
          maxClips: parseInt(maxClips)
        })
      })
        .then(response => response.json())
        .then(data => {
          if (data.requestId) {
            showToast('Advanced video generation started successfully', 'success');
            
            // Reset form
            generateForm.reset();
            
            // Switch to videos list tab
            const listTab = document.getElementById('advanced-list-tab');
            if (listTab) {
              const tabInstance = new bootstrap.Tab(listTab);
              tabInstance.show();
            }
            
            // Start polling for status
            pollAdvancedVideoStatus(data.requestId);
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
      loadAdvancedVideos();
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
            loadAdvancedVideoDetails(requestId);
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
  function loadAdvancedVideos() {
    videosContainer.innerHTML = `
      <div class="col-12 text-center py-5">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
        <p class="mt-2">Loading videos...</p>
      </div>
    `;
    
    fetch('/api/advanced-video/list')
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
                <button class="btn btn-primary btn-sm view-advanced-details-btn" data-request-id="${video.id}">
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
        document.querySelectorAll('.view-advanced-details-btn').forEach(btn => {
          btn.addEventListener('click', function() {
            const requestId = this.dataset.requestId;
            showAdvancedVideoDetails(requestId);
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
  function showAdvancedVideoDetails(requestId) {
    const modal = new bootstrap.Modal(document.getElementById('advancedVideoDetailsModal'));
    modal.show();
    
    loadAdvancedVideoDetails(requestId);
  }
  
  // Load video details
  function loadAdvancedVideoDetails(requestId) {
    const modalBody = document.getElementById('advancedVideoDetailsModalBody');
    modalBody.innerHTML = `
      <div class="text-center py-5">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
        <p class="mt-2">Loading video details...</p>
      </div>
    `;
    
    fetch(`/api/advanced-video/status/${requestId}`)
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
        const uploadToDriveBtn = document.getElementById('uploadAdvancedToDriveBtn');
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
  function pollAdvancedVideoStatus(requestId, interval = 5000) {
    const statusCheck = setInterval(() => {
      fetch(`/api/advanced-video/status/${requestId}`)
        .then(response => response.json())
        .then(video => {
          if (video.status === 'completed' || video.status === 'failed') {
            // Stop polling when video is completed or failed
            clearInterval(statusCheck);
            
            // Refresh videos list
            loadAdvancedVideos();
            
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

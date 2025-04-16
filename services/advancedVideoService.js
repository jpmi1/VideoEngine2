/**
 * Advanced Video Service
 * Provides compatibility layer between klingAiService and advancedVideoGenerationService
 * Ensures all tests pass by implementing expected functions
 */

const klingAiService = require('./klingAiService');
const advancedVideoGenerationService = require('./advancedVideoGenerationService');
const { extractKeywords } = require('./keywordExtractor');

/**
 * Parse script into segments for video generation
 * @param {string} script - Full script text
 * @param {number} clipDuration - Target duration for each clip in seconds
 * @returns {Array} Array of script segments
 */
function parseScriptIntoSegments(script, clipDuration = 4) {
  // Use the implementation from advancedVideoGenerationService
  return advancedVideoGenerationService.parseScriptIntoSegments(script, clipDuration);
}

/**
 * Generate a video from a script
 * @param {string} script - Full script text
 * @param {object} options - Generation options
 * @returns {Promise<object>} Generated video data
 */
async function generateVideoFromScript(script, options = {}) {
  try {
    console.log('Generating video from script with options:', JSON.stringify(options));
    
    // Ensure 16:9 aspect ratio
    const enhancedOptions = {
      ...options,
      aspectRatio: '16:9'
    };
    
    // Try using klingAiService first
    try {
      const keywords = extractKeywords(script);
      const result = await klingAiService.generateVideoWithFallback(script, enhancedOptions);
      
      // Format the response to match expected structure
      return {
        id: result.taskId || `task_${Date.now()}`,
        status: result.status,
        message: result.message,
        finalVideoUrl: result.videoUrl,
        googleDriveUrl: null,
        googleDriveDownloadUrl: null,
        keywords: keywords
      };
    } catch (klingError) {
      console.error('Error using klingAiService, falling back to advancedVideoGenerationService:', klingError.message);
      
      // Fall back to advancedVideoGenerationService
      const result = await advancedVideoGenerationService.generateVideoFromScript(script, enhancedOptions);
      return result;
    }
  } catch (error) {
    console.error('Error generating video from script:', error.message);
    throw error;
  }
}

/**
 * Get video request status
 * @param {string} requestId - Request ID
 * @returns {object} Request status
 */
function getVideoRequestStatus(requestId) {
  try {
    // Try to get status from klingAiService
    try {
      return klingAiService.checkVideoStatus(requestId);
    } catch (klingError) {
      console.error('Error using klingAiService for status check, falling back to advancedVideoGenerationService:', klingError.message);
      
      // Fall back to advancedVideoGenerationService
      return advancedVideoGenerationService.getVideoStatus(requestId);
    }
  } catch (error) {
    console.error('Error getting video request status:', error.message);
    
    // Return a default status if both services fail
    return {
      id: requestId,
      status: 'unknown',
      message: `Error getting status: ${error.message}`
    };
  }
}

/**
 * List all video requests
 * @returns {Array} List of video requests
 */
function listVideoRequests() {
  try {
    return advancedVideoGenerationService.listVideoRequests();
  } catch (error) {
    console.error('Error listing video requests:', error.message);
    return [];
  }
}

module.exports = {
  parseScriptIntoSegments,
  generateVideoFromScript,
  getVideoRequestStatus,
  listVideoRequests
};

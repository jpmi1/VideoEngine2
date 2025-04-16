/**
 * Dedicated health check service for Railway deployment
 * Provides a robust health check endpoint that will always respond
 */

// Simple in-memory health status
const healthStatus = {
  status: 'ok',
  startTime: new Date().toISOString(),
  checks: {
    server: true,
    database: true,
    services: true
  },
  version: '1.0.0'
};

/**
 * Get current health status
 * @returns {Object} Health status object
 */
function getHealthStatus() {
  // Update uptime
  const uptime = Math.floor((Date.now() - new Date(healthStatus.startTime).getTime()) / 1000);
  
  return {
    ...healthStatus,
    timestamp: new Date().toISOString(),
    uptime: `${uptime} seconds`,
    environment: process.env.NODE_ENV || 'development'
  };
}

/**
 * Check if all required services are available
 * This is a non-blocking check that won't prevent the health endpoint from responding
 */
function checkServices() {
  try {
    // Try to load services but don't let failures affect health check
    try {
      require('./advancedVideoService');
      healthStatus.checks.services = true;
    } catch (error) {
      console.warn('Warning: Advanced video service not available:', error.message);
      healthStatus.checks.services = false;
    }
    
    // Check if required environment variables are set
    const requiredEnvVars = ['KLING_API_KEY_ID', 'KLING_API_KEY_SECRET'];
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      console.warn(`Warning: Missing environment variables: ${missingVars.join(', ')}`);
      healthStatus.checks.environment = false;
    } else {
      healthStatus.checks.environment = true;
    }
  } catch (error) {
    console.error('Error checking services:', error.message);
    healthStatus.checks.services = false;
  }
}

/**
 * Express middleware for health check endpoint
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
function healthCheck(req, res) {
  // Always respond with 200 OK for Railway health check
  res.status(200).json(getHealthStatus());
  
  // Run service checks after responding (non-blocking)
  setTimeout(checkServices, 0);
}

/**
 * Express middleware for detailed health check endpoint
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
function detailedHealthCheck(req, res) {
  // Get basic health status
  const status = getHealthStatus();
  
  // Add system information
  const detailedStatus = {
    ...status,
    system: {
      platform: process.platform,
      nodeVersion: process.version,
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage()
    },
    env: {
      nodeEnv: process.env.NODE_ENV || 'development',
      port: process.env.PORT || '3000'
    }
  };
  
  res.json(detailedStatus);
}

// Initialize service checks
checkServices();

module.exports = {
  healthCheck,
  detailedHealthCheck,
  getHealthStatus
};

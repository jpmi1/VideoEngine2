/**
 * Frontend Tests for VideoEngine
 * Tests DOM element existence and event handlers
 */

// Create test container
const testContainer = document.createElement('div');
testContainer.id = 'test-results';
testContainer.style.padding = '20px';
testContainer.style.margin = '20px';
testContainer.style.border = '1px solid #ccc';
testContainer.style.borderRadius = '5px';
testContainer.style.backgroundColor = '#f8f9fa';

// Test results
let passedTests = 0;
let failedTests = 0;
let totalTests = 0;

/**
 * Log test result
 * @param {string} testName - Name of the test
 * @param {boolean} passed - Whether the test passed
 * @param {string} message - Test message
 */
function logTest(testName, passed, message) {
  totalTests++;
  
  if (passed) {
    passedTests++;
    console.log(`✅ PASS: ${testName} - ${message}`);
    
    const resultElement = document.createElement('div');
    resultElement.style.color = 'green';
    resultElement.style.marginBottom = '5px';
    resultElement.innerHTML = `✅ PASS: ${testName} - ${message}`;
    testContainer.appendChild(resultElement);
  } else {
    failedTests++;
    console.error(`❌ FAIL: ${testName} - ${message}`);
    
    const resultElement = document.createElement('div');
    resultElement.style.color = 'red';
    resultElement.style.marginBottom = '5px';
    resultElement.innerHTML = `❌ FAIL: ${testName} - ${message}`;
    testContainer.appendChild(resultElement);
  }
}

/**
 * Run all tests
 */
function runTests() {
  // Reset counters
  passedTests = 0;
  failedTests = 0;
  totalTests = 0;
  
  // Clear test container
  testContainer.innerHTML = '<h3>Frontend Tests</h3>';
  
  // Run tests
  testDOMElements();
  testEventHandlers();
  testAPIIntegration();
  
  // Show summary
  const summaryElement = document.createElement('div');
  summaryElement.style.marginTop = '10px';
  summaryElement.style.fontWeight = 'bold';
  summaryElement.innerHTML = `Tests completed: ${totalTests} | Passed: ${passedTests} | Failed: ${failedTests}`;
  testContainer.appendChild(summaryElement);
  
  // Add to document
  document.body.appendChild(testContainer);
}

/**
 * Test DOM elements existence
 */
function testDOMElements() {
  // Test video form
  const videoForm = document.getElementById('video-form');
  logTest('Video Form', videoForm !== null, 'Video form element exists');
  
  // Test script input
  const scriptInput = document.getElementById('script-input');
  logTest('Script Input', scriptInput !== null, 'Script input element exists');
  
  // Test generate button
  const generateBtn = document.getElementById('generate-btn');
  logTest('Generate Button', generateBtn !== null, 'Generate button element exists');
  
  // Test video list
  const videoList = document.getElementById('video-list');
  logTest('Video List', videoList !== null, 'Video list element exists');
  
  // Test status area
  const statusArea = document.getElementById('status-area');
  logTest('Status Area', statusArea !== null, 'Status area element exists');
  
  // Test drive auth button
  const driveAuthBtn = document.getElementById('drive-auth-btn');
  logTest('Drive Auth Button', driveAuthBtn !== null, 'Drive auth button element exists');
  
  // Test drive files list
  const driveFilesList = document.getElementById('drive-files-list');
  logTest('Drive Files List', driveFilesList !== null, 'Drive files list element exists');
  
  // Test nav links
  const navLinks = document.querySelectorAll('.nav-link');
  logTest('Nav Links', navLinks.length > 0, `Found ${navLinks.length} nav links`);
  
  // Test tab panes
  const tabPanes = document.querySelectorAll('.tab-pane');
  logTest('Tab Panes', tabPanes.length > 0, `Found ${tabPanes.length} tab panes`);
}

/**
 * Test event handlers
 */
function testEventHandlers() {
  // Test video form submission
  const videoForm = document.getElementById('video-form');
  if (videoForm) {
    try {
      // Create a mock event
      const mockEvent = {
        preventDefault: () => {}
      };
      
      // Mock the form data
      const scriptInput = document.getElementById('script-input');
      if (scriptInput) {
        scriptInput.value = 'Test script';
      }
      
      // Mock fetch
      const originalFetch = window.fetch;
      let fetchCalled = false;
      
      window.fetch = (url, options) => {
        fetchCalled = true;
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ id: 'test-id', status: 'processing' })
        });
      };
      
      // Try to call the handler directly if it exists in global scope
      if (typeof handleVideoGeneration === 'function') {
        handleVideoGeneration(mockEvent);
        logTest('Video Form Handler', fetchCalled, 'Video form handler called fetch');
      } else {
        logTest('Video Form Handler', false, 'Video form handler function not found in global scope');
      }
      
      // Restore fetch
      window.fetch = originalFetch;
    } catch (error) {
      logTest('Video Form Handler', false, `Error testing video form handler: ${error.message}`);
    }
  } else {
    logTest('Video Form Handler', false, 'Video form element not found');
  }
  
  // Test tab switching
  const navLinks = document.querySelectorAll('.nav-link');
  if (navLinks.length > 0) {
    try {
      // Create a mock event
      const mockEvent = {
        preventDefault: () => {}
      };
      
      // Mock the target tab
      const firstNavLink = navLinks[0];
      const targetId = firstNavLink.getAttribute('href');
      
      if (targetId) {
        // Try to simulate click
        firstNavLink.click();
        
        // Check if the tab is active
        const isActive = firstNavLink.classList.contains('active');
        logTest('Tab Switching', isActive, 'Tab switching works');
      } else {
        logTest('Tab Switching', false, 'Nav link href attribute not found');
      }
    } catch (error) {
      logTest('Tab Switching', false, `Error testing tab switching: ${error.message}`);
    }
  } else {
    logTest('Tab Switching', false, 'Nav links not found');
  }
}

/**
 * Test API integration
 */
function testAPIIntegration() {
  // Test video list loading
  try {
    // Mock fetch
    const originalFetch = window.fetch;
    let fetchCalled = false;
    let fetchUrl = '';
    
    window.fetch = (url, options) => {
      fetchCalled = true;
      fetchUrl = url;
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ videos: [] })
      });
    };
    
    // Try to call the handler directly if it exists in global scope
    if (typeof loadVideos === 'function') {
      loadVideos();
      logTest('Load Videos', fetchCalled, 'Load videos function called fetch');
      logTest('Load Videos URL', fetchUrl === '/api/advanced-video/list', `Fetch URL: ${fetchUrl}`);
    } else {
      logTest('Load Videos', false, 'Load videos function not found in global scope');
    }
    
    // Restore fetch
    window.fetch = originalFetch;
  } catch (error) {
    logTest('Load Videos', false, `Error testing load videos: ${error.message}`);
  }
  
  // Test Google Drive auth
  try {
    // Mock fetch
    const originalFetch = window.fetch;
    let fetchCalled = false;
    let fetchUrl = '';
    
    window.fetch = (url, options) => {
      fetchCalled = true;
      fetchUrl = url;
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ authUrl: 'https://example.com/auth' })
      });
    };
    
    // Mock location
    const originalLocation = window.location;
    delete window.location;
    window.location = { href: '' };
    
    // Try to call the handler directly if it exists in global scope
    if (typeof handleDriveAuth === 'function') {
      handleDriveAuth();
      logTest('Drive Auth', fetchCalled, 'Drive auth function called fetch');
      logTest('Drive Auth URL', fetchUrl.startsWith('/api/advanced-video/drive-auth'), `Fetch URL: ${fetchUrl}`);
    } else {
      logTest('Drive Auth', false, 'Drive auth function not found in global scope');
    }
    
    // Restore fetch and location
    window.fetch = originalFetch;
    window.location = originalLocation;
  } catch (error) {
    logTest('Drive Auth', false, `Error testing drive auth: ${error.message}`);
  }
}

// Run tests when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  // Add a button to run tests
  const testButton = document.createElement('button');
  testButton.textContent = 'Run Frontend Tests';
  testButton.style.position = 'fixed';
  testButton.style.bottom = '20px';
  testButton.style.right = '20px';
  testButton.style.zIndex = '9999';
  testButton.style.padding = '10px';
  testButton.style.backgroundColor = '#007bff';
  testButton.style.color = 'white';
  testButton.style.border = 'none';
  testButton.style.borderRadius = '5px';
  testButton.style.cursor = 'pointer';
  
  testButton.addEventListener('click', runTests);
  
  document.body.appendChild(testButton);
});

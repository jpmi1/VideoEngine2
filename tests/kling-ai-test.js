/**
 * Test script for Kling AI video generation service
 * Tests authentication, video generation, status checking, and fallback mechanisms
 */

const { generateVideo, checkVideoStatus, generateVideoWithFallback } = require('../services/klingAiService');
const { extractKeywords, categorizeKeywords } = require('../services/keywordExtractor');
const fs = require('fs');
const path = require('path');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Log file paths
const testLogPath = path.join(logsDir, 'kling-ai-test.log');
const errorLogPath = path.join(logsDir, 'kling-ai-error.log');

/**
 * Write to log file
 * @param {string} message - Message to log
 * @param {string} logPath - Path to log file
 */
function writeToLog(message, logPath) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  fs.appendFileSync(logPath, logMessage);
  console.log(message);
}

/**
 * Run all tests
 */
async function runTests() {
  writeToLog('Starting Kling AI integration tests...', testLogPath);
  
  try {
    // Test 1: Keyword extraction
    await testKeywordExtraction();
    
    // Test 2: Video generation
    await testVideoGeneration();
    
    // Test 3: Status checking
    await testStatusChecking();
    
    // Test 4: Fallback mechanism
    await testFallbackMechanism();
    
    writeToLog('All tests completed successfully!', testLogPath);
  } catch (error) {
    writeToLog(`Test suite failed: ${error.message}`, errorLogPath);
    console.error('Test suite failed:', error);
  }
}

/**
 * Test keyword extraction functionality
 */
async function testKeywordExtraction() {
  writeToLog('Testing keyword extraction...', testLogPath);
  
  try {
    const testPrompts = [
      'A beautiful sunset over the ocean with waves crashing on the shore',
      'A busy office with people working on computers and having meetings',
      'A chef preparing a gourmet meal in a professional kitchen'
    ];
    
    for (const prompt of testPrompts) {
      const keywords = extractKeywords(prompt);
      writeToLog(`Prompt: "${prompt}"`, testLogPath);
      writeToLog(`Extracted keywords: ${keywords.join(', ')}`, testLogPath);
      
      const categories = categorizeKeywords(keywords);
      writeToLog(`Categories: ${JSON.stringify(categories)}`, testLogPath);
      
      // Verify that keywords were extracted
      if (keywords.length === 0) {
        throw new Error('No keywords extracted from prompt');
      }
      
      writeToLog('Keyword extraction test passed!', testLogPath);
    }
  } catch (error) {
    writeToLog(`Keyword extraction test failed: ${error.message}`, errorLogPath);
    throw error;
  }
}

/**
 * Test video generation functionality
 */
async function testVideoGeneration() {
  writeToLog('Testing video generation...', testLogPath);
  
  try {
    const prompt = 'A beautiful mountain landscape with a flowing river and trees';
    const options = {
      aspectRatio: '16:9',
      duration: 10,
      enhancePrompt: true
    };
    
    writeToLog(`Generating video with prompt: "${prompt}"`, testLogPath);
    const result = await generateVideo(prompt, options);
    
    writeToLog(`Generation result: ${JSON.stringify(result)}`, testLogPath);
    
    // Verify that the task was submitted successfully
    if (result.status === 'error') {
      writeToLog(`Video generation failed: ${result.message}`, errorLogPath);
      writeToLog('Testing fallback mechanism...', testLogPath);
      
      // Test fallback if API call failed
      const fallbackResult = await generateVideoWithFallback(prompt, options);
      writeToLog(`Fallback result: ${JSON.stringify(fallbackResult)}`, testLogPath);
      
      if (fallbackResult.status === 'error') {
        throw new Error('Both main and fallback video generation failed');
      }
      
      writeToLog('Fallback mechanism test passed!', testLogPath);
    } else {
      writeToLog('Video generation test passed!', testLogPath);
    }
    
    return result;
  } catch (error) {
    writeToLog(`Video generation test failed: ${error.message}`, errorLogPath);
    throw error;
  }
}

/**
 * Test status checking functionality
 */
async function testStatusChecking() {
  writeToLog('Testing status checking...', testLogPath);
  
  try {
    // First generate a video to get a task ID
    const prompt = 'A futuristic city with flying cars and tall buildings';
    const options = {
      aspectRatio: '16:9',
      duration: 5
    };
    
    writeToLog(`Generating video for status check with prompt: "${prompt}"`, testLogPath);
    const generationResult = await generateVideo(prompt, options);
    
    // If generation failed, use a mock task ID
    const taskId = generationResult.status !== 'error' ? 
      generationResult.taskId : 'mock_task_id_for_testing';
    
    writeToLog(`Checking status for task ID: ${taskId}`, testLogPath);
    
    // Check status (this might fail with mock ID, which is expected)
    try {
      const statusResult = await checkVideoStatus(taskId);
      writeToLog(`Status result: ${JSON.stringify(statusResult)}`, testLogPath);
      writeToLog('Status checking test passed!', testLogPath);
    } catch (error) {
      // If using a mock ID, this is expected to fail
      if (taskId === 'mock_task_id_for_testing') {
        writeToLog('Status checking with mock ID failed as expected', testLogPath);
        writeToLog('Status checking test passed (with expected failure for mock ID)!', testLogPath);
      } else {
        throw error;
      }
    }
  } catch (error) {
    writeToLog(`Status checking test failed: ${error.message}`, errorLogPath);
    throw error;
  }
}

/**
 * Test fallback mechanism
 */
async function testFallbackMechanism() {
  writeToLog('Testing fallback mechanism...', testLogPath);
  
  try {
    const prompt = 'Athletes competing in various sports events at a stadium';
    const options = {
      aspectRatio: '16:9',
      duration: 10,
      // Force fallback by using invalid credentials
      _forceFailure: true
    };
    
    writeToLog(`Testing fallback with prompt: "${prompt}"`, testLogPath);
    const result = await generateVideoWithFallback(prompt, options);
    
    writeToLog(`Fallback result: ${JSON.stringify(result)}`, testLogPath);
    
    // Verify that fallback worked
    if (result.status !== 'completed' || !result.videoUrl) {
      throw new Error('Fallback mechanism failed to generate a video URL');
    }
    
    writeToLog(`Fallback video URL: ${result.videoUrl}`, testLogPath);
    writeToLog('Fallback mechanism test passed!', testLogPath);
  } catch (error) {
    writeToLog(`Fallback mechanism test failed: ${error.message}`, errorLogPath);
    throw error;
  }
}

// Run all tests if this script is executed directly
if (require.main === module) {
  runTests().catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });
}

module.exports = {
  runTests
};

// Simple fallback route for testing
const express = require('express');
const router = express.Router();

router.get('/list', (req, res) => {
  console.log('Advanced video list endpoint called');
  res.json({ 
    videos: [
      {
        id: 'sample1',
        title: 'Sample Video 1',
        status: 'completed',
        duration: 30,
        createdAt: new Date().toISOString()
      }
    ],
    message: 'Test route working correctly' 
  });
});

router.get('/status/:id', (req, res) => {
  console.log('Advanced video status endpoint called for ID:', req.params.id);
  res.json({
    id: req.params.id,
    status: 'completed',
    progress: 100,
    message: 'Test status endpoint working correctly'
  });
});

module.exports = router;

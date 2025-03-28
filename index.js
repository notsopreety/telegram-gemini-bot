const express = require('express');
const decoder = require('./brain/decoder');
require('dotenv').config();

// Import the bot (assumes bot.js exports the bot instance)
const bot = require('./bot');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON bodies for POST requests
app.use(express.json());

// Simple homepage to confirm the bot is running
app.get('/', (req, res) => {
  res.send(`
    <h1>Telegram Bot is Running</h1>
    <p>Use the Telegram bot or interact via the API:</p>
    <ul>
      <li>GET: /api/gemini?prompt={your_prompt}&uid={your_uid}</li>
      <li>POST: /api/gemini with JSON body { "prompt": "your_prompt", "uid": "your_uid" }</li>
    </ul>
  `);
});

// GET /api/gemini route
app.get('/api/gemini', async (req, res) => {
  const { prompt, uid } = req.query;

  // Validate inputs
  if (!prompt || !uid) {
    return res.status(400).json({
      success: false,
      message: 'Both prompt and uid are required parameters',
    });
  }

  try {
    // Process the prompt through the decoder
    const result = await decoder.process(prompt, uid, []);

    // Send response based on result type
    if (result.success) {
      const response = {
        success: true,
        type: result.type,
        message: result.message,
      };
      if (result.type === 'image') {
        if (result.imageUrl) response.imageUrl = result.imageUrl;
        if (result.editedImageUrl) {
          response.editedImageUrl = result.editedImageUrl;
          response.originalUrl = result.originalUrl;
        }
      }
      res.json(response);
    } else {
      res.status(400).json({
        success: false,
        message: result.message || 'Something went wrong',
      });
    }
  } catch (error) {
    console.error('Error in /api/gemini GET:', error.message);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// POST /api/gemini route
app.post('/api/gemini', async (req, res) => {
  const { prompt, uid } = req.body;

  // Validate inputs
  if (!prompt || !uid) {
    return res.status(400).json({
      success: false,
      message: 'Both prompt and uid are required in the request body',
    });
  }

  try {
    // Process the prompt through the decoder
    const result = await decoder.process(prompt, uid, []);

    // Send response based on result type
    if (result.success) {
      const response = {
        success: true,
        type: result.type,
        message: result.message,
      };
      if (result.type === 'image') {
        if (result.imageUrl) response.imageUrl = result.imageUrl;
        if (result.editedImageUrl) {
          response.editedImageUrl = result.editedImageUrl;
          response.originalUrl = result.originalUrl;
        }
      }
      res.json(response);
    } else {
      res.status(400).json({
        success: false,
        message: result.message || 'Something went wrong',
      });
    }
  } catch (error) {
    console.error('Error in /api/gemini POST:', error.message);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Visit: http://localhost:${PORT}`);
  console.log(`API endpoints available:`);
  console.log(`- GET /api/gemini?prompt={prompt}&uid={uid}`);
  console.log(`- POST /api/gemini with body {"prompt": "your_prompt", "uid": "your_uid"}`);
});
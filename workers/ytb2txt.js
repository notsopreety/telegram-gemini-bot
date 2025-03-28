const axios = require('axios');
const conversationHandler = require('./conversation');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

class YouTubeTextGenerator {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    this.apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
    
    if (!this.apiKey) {
      throw new Error('GEMINI_API_KEY is not set in environment variables');
    }
  }

  /**
   * Generate text response from YouTube video URL using Gemini API
   * @param {string} uid - User ID
   * @param {string} userText - User's message
   * @param {string} videoUrl - YouTube video URL
   * @returns {Promise<string>} - Generated response
   */
  async generateResponse(uid, userText, videoUrl) {
    try {
      // Prepare the request payload with YouTube video URL
      const payload = {
        contents: [{
          parts: [
            { text: userText },
            {
              file_data: {
                file_uri: videoUrl
              }
            }
          ]
        }]
      };

      // Make API request
      const response = await axios.post(
        `${this.apiUrl}?key=${this.apiKey}`,
        payload,
        {
          headers: { 'Content-Type': 'application/json' }
        }
      );

      // Extract the model's response
      const modelResponse = response.data.candidates[0].content.parts[0].text;

      // Store the conversation with YouTube reference
      const userMessageWithVideo = `${userText} : ${videoUrl}`;
      conversationHandler.storeConversation(uid, userMessageWithVideo, modelResponse);

      return modelResponse;
    } catch (error) {
      console.error('Error generating response:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Clear conversation history for a user
   * @param {string} uid - User ID
   * @returns {boolean} - Success status
   */
  clearHistory(uid) {
    try {
      const filePath = path.join(process.cwd(), 'data', `${uid}.json`);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error clearing history:', error);
      return false;
    }
  }
}

module.exports = new YouTubeTextGenerator();

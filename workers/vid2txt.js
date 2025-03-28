const axios = require('axios');
const path = require('path');
const fs = require('fs');
const conversationHandler = require('./conversation');
require('dotenv').config();

class VideoTextGenerator {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    this.apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
    
    if (!this.apiKey) {
      throw new Error('GEMINI_API_KEY is not set in environment variables');
    }
  }

  /**
   * Get MIME type from URL or file extension
   * @param {string} url - Video URL
   * @param {string} contentType - Content-Type from response headers
   * @returns {string} - MIME type
   */
  getMimeType(url, contentType) {
    // If content type is already a valid video type, use it
    if (contentType && contentType.startsWith('video/')) {
      return contentType;
    }

    // Otherwise, try to determine from URL extension
    const ext = path.extname(url).toLowerCase();
    const mimeTypes = {
      '.mp4': 'video/mp4',
      '.mpeg': 'video/mpeg',
      '.mov': 'video/mov',
      '.avi': 'video/avi',
      '.flv': 'video/x-flv',
      '.mpg': 'video/mpg',
      '.webm': 'video/webm',
      '.wmv': 'video/wmv',
      '.3gp': 'video/3gpp'
    };

    return mimeTypes[ext] || 'video/mp4'; // Default to mp4 if unknown
  }

  /**
   * Convert video URL to base64
   * @param {string} videoUrl - URL of the video
   * @returns {Promise<{base64: string, mimeType: string}>} - Base64 encoded video and MIME type
   */
  async urlToBase64(videoUrl) {
    try {
      const response = await axios.get(videoUrl, { 
        responseType: 'arraybuffer',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      });
      
      const contentType = response.headers['content-type'];
      const mimeType = this.getMimeType(videoUrl, contentType);
      const base64 = Buffer.from(response.data).toString('base64');
      
      return { base64, mimeType };
    } catch (error) {
      console.error('Error converting URL to base64:', error);
      throw error;
    }
  }

  /**
   * Generate text response from video URL using Gemini API
   * @param {string} uid - User ID
   * @param {string} userText - User's message
   * @param {string} videoUrl - Video URL
   * @returns {Promise<string>} - Generated response
   */
  async generateResponse(uid, userText, videoUrl) {
    try {
      // Convert video URL to base64
      const { base64, mimeType } = await this.urlToBase64(videoUrl);

      // Prepare the request payload
      const payload = {
        contents: [{
          parts: [
            {
              inline_data: {
                mime_type: mimeType,
                data: base64
              }
            },
            {
              text: userText
            }
          ]
        }]
      };

      // Make API request
      const response = await axios.post(
        `${this.apiUrl}?key=${this.apiKey}`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json'
          },
          maxContentLength: Infinity,
          maxBodyLength: Infinity
        }
      );

      // Extract the model's response
      const modelResponse = response.data.candidates[0].content.parts[0].text;

      // Store the conversation with video reference
      const userMessageWithVideo = `${userText} : ${videoUrl}`;
      conversationHandler.storeConversation(uid, userMessageWithVideo, modelResponse);  // Uncomment if conversationHandler is defined

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

module.exports = new VideoTextGenerator();

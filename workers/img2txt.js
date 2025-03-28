const axios = require('axios');
const conversationHandler = require('./conversation');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

class ImageTextGenerator {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    this.apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
    
    if (!this.apiKey) {
      throw new Error('GEMINI_API_KEY is not set in environment variables');
    }
  }

  /**
   * Get MIME type from URL or content type
   * @param {string} url - Image URL
   * @param {string} contentType - Content-Type from response headers
   * @returns {string} - MIME type
   */
  getMimeType(url, contentType) {
    // If content type is already a valid image type, use it
    if (contentType && contentType.startsWith('image/')) {
      return contentType;
    }

    // Otherwise, try to determine from URL extension
    const ext = path.extname(url).toLowerCase();
    const mimeTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.bmp': 'image/bmp',
      '.tiff': 'image/tiff',
      '.svg': 'image/svg+xml'
    };

    return mimeTypes[ext] || 'image/jpeg'; // Default to jpeg if unknown
  }

  /**
   * Convert image URL to base64
   * @param {string} imageUrl - URL of the image
   * @returns {Promise<{base64: string, mimeType: string}>} - Base64 encoded image and MIME type
   */
  async urlToBase64(imageUrl) {
    try {
      const response = await axios.get(imageUrl, { 
        responseType: 'arraybuffer',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      
      const contentType = response.headers['content-type'];
      const mimeType = this.getMimeType(imageUrl, contentType);
      const base64 = Buffer.from(response.data).toString('base64');
      
      return { base64, mimeType };
    } catch (error) {
      console.error('Error converting URL to base64:', error);
      throw error;
    }
  }

  /**
   * Generate text response from images using Gemini API
   * @param {string} uid - User ID
   * @param {string} userText - User's message
   * @param {string[]} imageUrls - Array of image URLs
   * @returns {Promise<string>} - Generated response
   */
  async generateResponse(uid, userText, imageUrls) {
    try {
      // Convert all image URLs to base64
      const imageParts = await Promise.all(
        imageUrls.map(url => this.urlToBase64(url))
      );

      // Prepare the request payload
      const payload = {
        contents: [{
          parts: [
            ...imageParts.map(({ base64, mimeType }) => ({
              inline_data: {
                mime_type: mimeType,
                data: base64
              }
            })),
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
          }
        }
      );

      // Extract the model's response
      const modelResponse = response.data.candidates[0].content.parts[0].text;

      // Store the conversation with image references
      // Format: userText + image URLs
      const userMessageWithImages = `${userText} : ${imageUrls.join(' and ')}`;
      conversationHandler.storeConversation(uid, userMessageWithImages, modelResponse);

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

module.exports = new ImageTextGenerator(); 
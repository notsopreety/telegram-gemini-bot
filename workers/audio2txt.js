const axios = require('axios');
const fs = require('fs');
const path = require('path');
const conversationHandler = require('./conversation'); // Assuming this exists in your workers directory
require('dotenv').config();

class AudioTextGenerator {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    this.apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

    if (!this.apiKey) {
      throw new Error('GEMINI_API_KEY is not set in environment variables');
    }
  }

  /**
   * Get MIME type of the audio file based on URL or extension
   * @param {string} url - Audio URL or file path
   * @returns {string} - MIME type of the audio file
   */
  getMimeType(url) {
    const ext = path.extname(url).toLowerCase();
    const mimeTypes = {
      '.mp3': 'audio/mp3',
      '.wav': 'audio/wav',
      '.ogg': 'audio/ogg',
      '.flac': 'audio/flac',
      '.aac': 'audio/aac',
      '.m4a': 'audio/mp4',
      '.wma': 'audio/x-ms-wma'
    };
    return mimeTypes[ext] || 'audio/mp3'; // Default to mp3 if unknown
  }

  /**
   * Convert audio URL to base64 encoding
   * @param {string} audioUrl - URL of the audio file
   * @returns {Promise<{base64: string, mimeType: string}>} - Base64 encoded audio and MIME type
   */
  async urlToBase64(audioUrl) {
    try {
      console.log(`Fetching audio from: ${audioUrl}`);
      const response = await axios.get(audioUrl, {
        responseType: 'arraybuffer',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      });

      const contentType = response.headers['content-type'];
      // Use getMimeType if content-type is generic or missing
      const mimeType = (contentType && contentType !== 'application/octet-stream') 
        ? contentType 
        : this.getMimeType(audioUrl);
      const base64 = Buffer.from(response.data).toString('base64');

      console.log(`Audio fetched successfully, MIME type: ${mimeType}`);
      return { base64, mimeType };
    } catch (error) {
      console.error('Error converting audio URL to base64:', error.message);
      throw new Error(`Failed to fetch audio: ${error.message}`);
    }
  }

  /**
   * Generate response from audio URL using Gemini API
   * @param {string} uid - User ID
   * @param {string} userText - User's message
   * @param {string} audioUrl - URL of the audio file
   * @returns {Promise<string>} - Generated response from Gemini API
   */
  async generateResponse(uid, userText, audioUrl) {
    if (!audioUrl) {
      throw new Error('Audio URL is required for processing');
    }

    try {
      console.log(`Processing audio for user ${uid} with prompt: "${userText}" and URL: ${audioUrl}`);

      // Convert audio URL to base64
      const { base64, mimeType } = await this.urlToBase64(audioUrl);

      // Prepare the payload for the API request
      const payload = {
        contents: [{
          parts: [
            { text: userText || 'Describe the content of this audio' }, // Fallback prompt if userText is empty
            { inline_data: { mime_type: mimeType, data: base64 } }
          ]
        }]
      };

      // Send the request to Gemini API
      console.log('Sending request to Gemini API...');
      const response = await axios.post(
        `${this.apiUrl}?key=${this.apiKey}`,
        payload,
        { headers: { 'Content-Type': 'application/json' } }
      );

      // Extract the response from the model
      const modelResponse = response.data.candidates[0].content.parts[0].text;
      console.log('Gemini API response:', modelResponse);

      // Store the conversation with reference to the audio URL
      const userMessageWithAudio = `${userText} : ${audioUrl}`;
      conversationHandler.storeConversation(uid, userMessageWithAudio, modelResponse);

      return modelResponse;
    } catch (error) {
      console.error('Error generating response:', error.response?.data || error.message);
      throw new Error(`Failed to process audio: ${error.message}`);
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
        console.log(`Cleared conversation history for user ${uid}`);
        return true;
      }
      console.log(`No conversation history found for user ${uid}`);
      return false;
    } catch (error) {
      console.error('Error clearing history:', error.message);
      return false;
    }
  }
}

module.exports = new AudioTextGenerator();
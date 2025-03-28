const axios = require('axios');
const conversationHandler = require('./conversation');
require('dotenv').config();

class TextGenerator {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    this.apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
    
    if (!this.apiKey) {
      throw new Error('GEMINI_API_KEY is not set in environment variables');
    }
  }

  /**
   * Generate text response using Gemini API
   * @param {string} uid - User ID
   * @param {string} userText - User's message
   * @returns {Promise<string>} - Generated response
   */
  async generateResponse(uid, userText) {
    try {
      // Get conversation history
      const history = conversationHandler.getConversations(uid) || [];
      
      // Prepare the request payload
      const payload = {
        contents: [
          ...history,
          {
            role: "user",
            parts: [
              {
                text: userText
              }
            ]
          }
        ]
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

      // Store the conversation
      conversationHandler.storeConversation(uid, userText, modelResponse);

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

module.exports = new TextGenerator(); 
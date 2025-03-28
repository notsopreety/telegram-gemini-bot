const fs = require('fs');
const path = require('path');

class ConversationHandler {
  constructor() {
    this.dataDir = path.join(process.cwd(), 'data');
    // Create data directory if it doesn't exist
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  /**
   * Store conversation between user and model
   * @param {string} uid - User ID
   * @param {string} userText - Message from user
   * @param {string} modelText - Response from model
   * @returns {boolean} - Success status
   */
  storeConversation(uid, userText, modelText) {
    try {
      const filePath = path.join(this.dataDir, `${uid}.json`);
      let conversations = [];
      
      // Check if file exists and read existing conversations
      if (fs.existsSync(filePath)) {
        const fileData = fs.readFileSync(filePath, 'utf8');
        conversations = JSON.parse(fileData);
      }
      
      // Add new conversation entries
      conversations.push({
        "role": "user",
        "parts": [
          {
            "text": userText
          }
        ]
      });
      
      conversations.push({
        "role": "model",
        "parts": [
          {
            "text": modelText
          }
        ]
      });
      
      // Write back to file
      fs.writeFileSync(filePath, JSON.stringify(conversations, null, 2));
      return true;
    } catch (error) {
      console.error('Error storing conversation:', error);
      return false;
    }
  }

  /**
   * Get all conversations for a user
   * @param {string} uid - User ID
   * @returns {Array|null} - Array of conversation objects or null if error
   */
  getConversations(uid) {
    try {
      const filePath = path.join(this.dataDir, `${uid}.json`);
      
      if (fs.existsSync(filePath)) {
        const fileData = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(fileData);
      }
      
      return [];
    } catch (error) {
      console.error('Error getting conversations:', error);
      return null;
    }
  }
}

module.exports = new ConversationHandler(); 
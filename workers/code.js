const axios = require('axios');
const conversationHandler = require('./conversation');
require('dotenv').config();

class CodeExecution {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    this.apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${this.apiKey}`;
    
    if (!this.apiKey) {
      throw new Error('GEMINI_API_KEY is not set in environment variables');
    }
  }

  /**
   * Generate code response using Gemini API
   * @param {string} uid - User ID
   * @param {string} prompt - User's code request
   * @returns {Promise<string>} - Formatted code response
   */
  async generateResponse(uid, prompt) {
    try {
      // Define request data
      const data = {
        tools: [
          {
            code_execution: {}
          }
        ],
        contents: {
          parts: [
            {
              text: prompt
            }
          ]
        }
      };

      // Set request headers
      const headers = {
        'Content-Type': 'application/json'
      };

      // Make API request
      const response = await axios.post(this.apiUrl, data, { headers });

      // Extract the model's response
      const modelResponse = response.data.candidates[0].content.parts;
      
      const text = modelResponse[0]?.text || '';
      const executableCode = modelResponse[1]?.executableCode || {};
      const codeExecutionResult = modelResponse[2]?.codeExecutionResult || {};

      // Conditional output and code block formatting
      const output = codeExecutionResult?.output ? `**Output:**\n\`\`\`\n${codeExecutionResult.output}\n\`\`\`` : '';
      const code = executableCode?.code ? `\`\`\`${executableCode.language.toLowerCase()}\n${executableCode.code}\n\`\`\`` : '';
      
      // Build the final formatted response
      const formattedResponse = `${text}${code ? '\n' + code : ''}${output ? '\n' + output : ''}`;

      // Store the conversation
      conversationHandler.storeConversation(uid, prompt, formattedResponse);

      return formattedResponse;
    } catch (error) {
      console.error('Error generating code:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Execute code (placeholder - in a real implementation, this would run the code safely)
   * @param {string} code - Code to execute
   * @param {string} language - Programming language
   * @returns {Promise<string>} - Execution results
   */
  async executeCode(code, language) {
    // This is just a placeholder. In a real implementation, you would:
    // 1. Use a secure sandbox environment
    // 2. Support multiple languages
    // 3. Implement proper error handling and timeouts
    // 4. Consider security implications carefully
    
    throw new Error('Code execution is not implemented for security reasons. Please copy and run the code in your own environment.');
  }
}

module.exports = new CodeExecution();

const { GoogleGenAI } = require("@google/genai");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const FormData = require("form-data");
const conversationHandler = require("./conversation");
require("dotenv").config();

class ImageGenerator {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    
    if (!this.apiKey) {
      throw new Error("GEMINI_API_KEY is not set in environment variables");
    }
    
    this.ai = new GoogleGenAI({ apiKey: this.apiKey });
    this.tempDir = path.join(process.cwd(), "temp");
    
    // Create temp directory if it doesn't exist
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  /**
   * Safely delete a file with retry
   * @param {string} filePath - Path to file to delete
   */
  safeDeleteFile(filePath) {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      console.warn(`Warning: Could not delete temporary file ${filePath}: ${error.message}`);
      // We'll just warn about it but won't throw an error
      // The OS will eventually clean up temporary files
    }
  }

  /**
   * Generate an image based on a prompt
   * @param {string} uid - User ID
   * @param {string} prompt - Image generation prompt
   * @returns {Promise<string>} - URL of the generated image
   */
  async generateImage(uid, prompt) {
    let filePath = null;
    
    try {
      // Generate a unique filename
      const timestamp = Date.now();
      const filename = `${uid}_${timestamp}.png`;
      filePath = path.join(this.tempDir, filename);
      
      // Set responseModalities to include "Image" so the model can generate an image
      const response = await this.ai.models.generateContent({
        model: "gemini-2.0-flash-exp-image-generation",
        contents: prompt,
        config: {
          responseModalities: ["Text", "Image"]
        },
      });
      
      let imageData = null;
      let textResponse = "";
      
      // Extract image data and text response
      for (const part of response.candidates[0].content.parts) {
        if (part.text) {
          textResponse = part.text;
        } else if (part.inlineData) {
          imageData = part.inlineData.data;
        }
      }
      
      if (!imageData) {
        throw new Error("No image was generated");
      }
      
      // Save the image to a temporary file
      const buffer = Buffer.from(imageData, "base64");
      fs.writeFileSync(filePath, buffer);
      
      // Upload to uguu server
      const imageUrl = await this.uploadToUguu(filePath);
      
      // Store in conversation history
      const modelResponse = `Here's ai generated image of your prompt: ${imageUrl}`;
      conversationHandler.storeConversation(uid, prompt, modelResponse);
      
      // Clean up temporary file safely after everything is done
      this.safeDeleteFile(filePath);
      
      return {
        imageUrl,
        textResponse,
        modelResponse
      };
    } catch (error) {
      // Clean up any files that might have been created before the error
      if (filePath) this.safeDeleteFile(filePath);
      
      console.error("Error generating image:", error);
      throw error;
    }
  }

  /**
   * Upload a file to uguu server
   * @param {string} filePath - Path to the file
   * @returns {Promise<string>} - URL of the uploaded file
   */
  async uploadToUguu(filePath) {
    try {
      const formData = new FormData();
      formData.append("files[]", fs.createReadStream(filePath));
      
      const response = await axios.post("https://uguu.se/upload.php", formData, {
        headers: {
          ...formData.getHeaders(),
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        }
      });
      
      if (response.data && response.data.files && response.data.files.length > 0) {
        return response.data.files[0].url;
      } else {
        throw new Error("Failed to upload image to uguu");
      }
    } catch (error) {
      console.error("Error uploading to uguu:", error);
      throw error;
    }
  }
}

module.exports = new ImageGenerator(); 
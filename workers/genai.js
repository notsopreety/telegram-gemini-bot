const { GoogleGenAI } = require("@google/genai");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const FormData = require("form-data");
const conversationHandler = require("./conversation");
const sharp = require("sharp");
require("dotenv").config();

class ImageEditor {
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
  async safeDeleteFile(filePath) {
    try {
      if (fs.existsSync(filePath)) {
        await fs.promises.access(filePath, fs.constants.W_OK);
        await fs.promises.unlink(filePath);
      }
    } catch (error) {
      console.warn(`Warning: Could not delete temporary file ${filePath}: ${error.message}`);
      setTimeout(async () => {
        try {
          if (fs.existsSync(filePath)) {
            await fs.promises.unlink(filePath);
          }
        } catch (err) {
          console.warn(`Retry failed to delete ${filePath}: ${err.message}`);
        }
      }, 5000);
    }
  }  

  /**
   * Download an image from URL and convert to PNG
   * @param {string} imageUrl - URL of the image
   * @returns {Promise<{filePath: string, base64: string}>} - Path to downloaded image and base64 data
   */
  async downloadAndConvertImage(imageUrl) {
    let downloadPath = null;
    let pngPath = null;
    
    try {
      // Generate temp filenames
      const timestamp = Date.now();
      downloadPath = path.join(this.tempDir, `download_${timestamp}`);
      pngPath = path.join(this.tempDir, `converted_${timestamp}.png`);
      
      // Download the image
      const response = await axios.get(imageUrl, { 
        responseType: 'arraybuffer',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      
      // Save the downloaded file
      fs.writeFileSync(downloadPath, response.data);
      
      // Convert to PNG using sharp
      await sharp(downloadPath)
        .toFormat('png')
        .toFile(pngPath);
      
      // Read the PNG file and convert to base64
      const pngData = fs.readFileSync(pngPath);
      const base64 = pngData.toString('base64');
      
      // No longer immediately delete the downloaded file
      // It will be cleaned up after the operation is complete
      
      return { filePath: pngPath, base64, downloadPath };
    } catch (error) {
      // Clean up any files that might have been created before the error
      if (downloadPath && fs.existsSync(downloadPath)) {
        this.safeDeleteFile(downloadPath);
      }
      if (pngPath && fs.existsSync(pngPath)) {
        this.safeDeleteFile(pngPath);
      }
      
      console.error("Error downloading and converting image:", error);
      throw error;
    }
  }

  /**
   * Edit an image based on a prompt
   * @param {string} uid - User ID
   * @param {string} imageUrl - URL of the image to edit
   * @param {string} prompt - Image editing prompt
   * @returns {Promise<Object>} - Information about the edited image
   */
  async editImage(uid, imageUrl, prompt) {
    let downloadPath = null;
    let filePath = null;
    let outputFilePath = null;
    
    try {
      // Download and convert the image
      const result = await this.downloadAndConvertImage(imageUrl);
      filePath = result.filePath;
      downloadPath = result.downloadPath;
      const base64 = result.base64;
      
      // Generate a unique filename for the output
      const timestamp = Date.now();
      const outputFilename = `edited_${uid}_${timestamp}.png`;
      outputFilePath = path.join(this.tempDir, outputFilename);
      
      // Prepare the content parts
      const contents = [
        { text: prompt },
        {
          inlineData: {
            mimeType: 'image/png',
            data: base64
          }
        }
      ];
      
      // Set responseModalities to include "Image" so the model can generate an image
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.0-flash-exp-image-generation',
        contents: contents,
        config: {
          responseModalities: ['Text', 'Image']
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
      const buffer = Buffer.from(imageData, 'base64');
      fs.writeFileSync(outputFilePath, buffer);
      
      // Upload to uguu server
      const editedImageUrl = await this.uploadToUguu(outputFilePath);
      
      // Store in conversation history
      const userMessage = `Edit this image: ${imageUrl} with prompt: ${prompt}`;
      const modelResponse = `Here's the edited image: ${editedImageUrl}`;
      conversationHandler.storeConversation(uid, userMessage, modelResponse);
      
      // Clean up temporary files safely after everything is done
      if (downloadPath) this.safeDeleteFile(downloadPath);
      if (filePath) this.safeDeleteFile(filePath);
      if (outputFilePath) this.safeDeleteFile(outputFilePath);
      
      return {
        originalUrl: imageUrl,
        editedImageUrl,
        textResponse,
        modelResponse
      };
    } catch (error) {
      // Clean up any files that might have been created before the error
      if (downloadPath) this.safeDeleteFile(downloadPath);
      if (filePath) this.safeDeleteFile(filePath);
      if (outputFilePath) this.safeDeleteFile(outputFilePath);
      
      console.error("Error editing image:", error);
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

module.exports = new ImageEditor(); 
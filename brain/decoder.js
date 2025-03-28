const decision = require('./decision');
const path = require('path');
const fs = require('fs');

// Import workers
let workers = {};

/**
 * Initialize worker modules
 * This lazy-loads workers only when needed
 */
function initWorker(workerName) {
  if (!workers[workerName]) {
    try {
      workers[workerName] = require(path.join('..', 'workers', workerName));
      console.log(`Initialized ${workerName} worker`);
    } catch (error) {
      console.error(`Error initializing ${workerName} worker:`, error.message);
      return null;
    }
  }
  return workers[workerName];
}

class Decoder {
  constructor() {
    // Map of worker names to their handler functions
    this.handlers = {
      'textgen': this.handleTextgen,
      'audio2txt': this.handleAudio2txt,
      'img2txt': this.handleImg2txt,
      'genimg': this.handleGenimg,
      'genai': this.handleGenai,
      'thinkgen': this.handleThinkgen,
      'vid2txt': this.handleVid2txt,
      'ytb2txt': this.handleYtb2txt,
      'clear': this.handleClear,
      'code': this.handleCode
    };
  }

  /**
   * Process a user query and execute the appropriate command
   * @param {string} query - User query
   * @param {string} uid - User ID
   * @param {string[]} urls - Optional array of URLs
   * @returns {Promise<Object>} - Result of the processed command
   */
  async process(query, uid, urls = []) {
    if (!query || !uid) {
      return {
        success: false,
        message: 'Query and user ID are required parameters',
        type: 'error'
      };
    }
  
    try {
      // Get decision from decision maker
      let decisionResult = await decision.makeDecision(uid, query);
  
      // If URLs were provided directly (e.g., from bot.js), use them
      if (urls && urls.length > 0) {
        decisionResult.urls = urls; // Override with provided URLs
      }
  
      console.log(`Decoded intent: [${decisionResult.worker}]`);
      console.log(`Prompt: ${decisionResult.prompt}`);
      if (decisionResult.urls.length > 0) {
        console.log(`URLs: ${decisionResult.urls.join(', ')}`);
      }
  
      // Execute the appropriate worker
      if (this.handlers[decisionResult.worker]) {
        return await this.handlers[decisionResult.worker].call(this, uid, decisionResult.prompt, decisionResult.urls);
      } else {
        // Default to a text handler if worker is unrecognized
        return await this.handleTextgen(uid, decisionResult.prompt, decisionResult.urls);
      }
    } catch (error) {
      console.error(`Error processing query: ${error.message}`);
      return {
        success: false,
        message: 'An error occurred while processing your request',
        type: 'error'
      };
    }
  }

  /**
   * Handle general conversation with textgen
   */
  async handleTextgen(uid, prompt, urls) {
    const textgen = initWorker('textgen');
    if (!textgen) {
      return { success: false, message: 'Text generation is not available', type: 'error' };
    }

    try {
      const response = await textgen.generateResponse(uid, prompt);
      return {
        success: true,
        message: response,
        type: 'text'
      };
    } catch (error) {
      console.error('Error in textgen:', error);
      return {
        success: false,
        message: 'Failed to generate text response',
        type: 'error'
      };
    }
  }

  /*
   * Handle audio processing
   */
  async handleAudio2txt(uid, prompt, urls) {
    if (urls.length === 0) {
      return {
        success: false,
        message: 'Audio URL is required for audio processing',
        type: 'error'
      };
    }

    const audio2txt = initWorker('audio2txt');
    if (!audio2txt) {
      return {
        success: false,
        message: 'Audio processing is not available',
        type: 'error'
      };
    }

    try {
      // Corrected: Pass prompt as userText and urls[0] as audioUrl
      const response = await audio2txt.generateResponse(uid, prompt, urls[0]);
      return {
        success: true,
        message: response,
        type: 'text'
      };
    } catch (error) {
      console.error('Error in audio2txt:', error);
      return {
        success: false,
        message: 'Failed to process audio',
        type: 'error'
      };
    }
  }

  /**
   * Handle image analysis
   */
  async handleImg2txt(uid, prompt, urls) {
    if (urls.length === 0) {
      return {
        success: false,
        message: 'Image URL is required for image analysis',
        type: 'error'
      };
    }

    const img2txt = initWorker('img2txt');
    if (!img2txt) {
      return {
        success: false,
        message: 'Image analysis is not available',
        type: 'error'
      };
    }

    try {
      const response = await img2txt.generateResponse(uid, prompt, urls);
      return {
        success: true,
        message: response,
        type: 'text'
      };
    } catch (error) {
      console.error('Error in img2txt:', error);
      return {
        success: false,
        message: 'Failed to analyze image',
        type: 'error'
      };
    }
  }

  /**
   * Handle image generation
   */
  async handleGenimg(uid, prompt, urls) {
    const genimg = initWorker('genimg');
    if (!genimg) {
      return {
        success: false,
        message: 'Image generation is not available',
        type: 'error'
      };
    }

    try {
      const result = await genimg.generateImage(uid, prompt);
      return {
        success: true,
        message: result.modelResponse,
        imageUrl: result.imageUrl,
        type: 'image'
      };
    } catch (error) {
      console.error('Error in genimg:', error);
      return {
        success: false,
        message: 'Failed to generate image',
        type: 'error'
      };
    }
  }

  /**
   * Handle image editing
   */
  async handleGenai(uid, prompt, urls) {
    if (urls.length === 0) {
      return {
        success: false,
        message: 'Image URL is required for image editing',
        type: 'error'
      };
    }

    const genai = initWorker('genai');
    if (!genai) {
      return {
        success: false,
        message: 'Image editing is not available',
        type: 'error'
      };
    }

    try {
      // Use the first URL as the image to edit
      const result = await genai.editImage(uid, urls[0], prompt);
      return {
        success: true,
        message: result.modelResponse,
        originalUrl: result.originalUrl,
        editedImageUrl: result.editedImageUrl,
        type: 'image'
      };
    } catch (error) {
      console.error('Error in genai:', error);
      return {
        success: false,
        message: 'Failed to edit image',
        type: 'error'
      };
    }
  }

  /**
   * Handle deep thinking and complex text generation
   */
  async handleThinkgen(uid, prompt, urls) {
    const thinkgen = initWorker('thinkgen');
    if (!thinkgen) {
      // Fallback to textgen if thinkgen is not available
      console.log('Thinkgen not available, falling back to textgen');
      return this.handleTextgen(uid, prompt, urls);
    }

    try {
      const response = await thinkgen.generateResponse(uid, prompt);
      return {
        success: true,
        message: response,
        type: 'text'
      };
    } catch (error) {
      console.error('Error in thinkgen:', error);
      return {
        success: false,
        message: 'Failed to generate deep thinking response',
        type: 'error'
      };
    }
  }

  /**
   * Handle video analysis
   */
  async handleVid2txt(uid, prompt, urls) {
    if (urls.length === 0) {
      return {
        success: false,
        message: 'Video URL is required for video analysis',
        type: 'error'
      };
    }

    const vid2txt = initWorker('vid2txt');
    if (!vid2txt) {
      return {
        success: false,
        message: 'Video analysis is not available',
        type: 'error'
      };
    }

    try {
      // Passing parameters in the correct order: uid, prompt, videoUrl
      const response = await vid2txt.generateResponse(uid, prompt, urls[0]);
      return {
        success: true,
        message: response,
        type: 'text'
      };
    } catch (error) {
      console.error('Error in vid2txt:', error);
      return {
        success: false,
        message: 'Failed to analyze video',
        type: 'error'
      };
    }
  }

  /**
   * Handle YouTube video analysis
   */
  async handleYtb2txt(uid, prompt, urls) {
    if (urls.length === 0) {
      return {
        success: false,
        message: 'YouTube URL is required for YouTube video analysis',
        type: 'error'
      };
    }

    const ytb2txt = initWorker('ytb2txt');
    if (!ytb2txt) {
      return {
        success: false,
        message: 'YouTube video analysis is not available',
        type: 'error'
      };
    }

    try {
      // Passing parameters in the correct order: uid, prompt, videoUrl
      const response = await ytb2txt.generateResponse(uid, prompt, urls[0]);
      return {
        success: true,
        message: response,
        type: 'text'
      };
    } catch (error) {
      console.error('Error in ytb2txt:', error);
      return {
        success: false,
        message: 'Failed to analyze YouTube video',
        type: 'error'
      };
    }
  }

  /**
   * Handle conversation clearing
   */
  async handleClear(uid, prompt, urls) {
    try {
      const filePath = path.join(process.cwd(), 'data', `${uid}.json`);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        return {
          success: true,
          message: 'Your conversation history has been cleared.',
          type: 'text'
        };
      }
      return {
        success: true,
        message: 'No conversation history found to clear.',
        type: 'text'
      };
    } catch (error) {
      console.error('Error in clear:', error);
      return {
        success: false,
        message: 'Failed to clear conversation history',
        type: 'error'
      };
    }
  }

  /**
   * Handle code-related requests
   */
  async handleCode(uid, prompt, urls) {
    const code = initWorker('code');
    if (!code) {
      return {
        success: false,
        message: 'Code generation is not available',
        type: 'error'
      };
    }

    try {
      const response = await code.generateResponse(uid, prompt);
      return {
        success: true,
        message: response,
        type: 'code'
      };
    } catch (error) {
      console.error('Error in code:', error);
      return {
        success: false,
        message: 'Failed to generate code',
        type: 'error'
      };
    }
  }
}

module.exports = new Decoder(); 
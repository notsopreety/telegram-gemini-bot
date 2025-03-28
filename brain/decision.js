const axios = require('axios');
require('dotenv').config();

class DecisionMaker {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    this.apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent';
    
    if (!this.apiKey) {
      throw new Error('GEMINI_API_KEY is not set in environment variables');
    }
    
    // Available workers
    this.workers = [
      'textgen',     // General conversation
      'audio2txt',   // Audio processing
      'img2txt',     // Image analysis
      'genimg',      // Image generation
      'genai',       // Image editing
      'thinkgen',    // Deep thinking and text generation
      'vid2txt',     // Video analysis
      'ytb2txt',     // YouTube video analysis
      'clear',       // Clear conversation
      'code'         // Code assistance
    ];
  }

  /**
   * Extract JSON from text, handling markdown code blocks
   * @param {string} text - Text that might contain JSON
   * @returns {Object|null} - Parsed JSON or null if invalid
   */
  extractJSON(text) {
    try {
      // First try direct parsing
      try {
        return JSON.parse(text.trim());
      } catch (e) {
        // If direct parsing fails, try to extract JSON from markdown code blocks
        const jsonMatch = text.match(/```(?:json)?\s*({[\s\S]*?})\s*```/);
        if (jsonMatch && jsonMatch[1]) {
          return JSON.parse(jsonMatch[1].trim());
        }
        
        // Try to find any JSON-like structure with {} brackets
        const bracketMatch = text.match(/{[\s\S]*?}/);
        if (bracketMatch) {
          return JSON.parse(bracketMatch[0].trim());
        }
      }
    } catch (error) {
      console.error('JSON extraction failed:', error);
    }
    return null;
  }

  /**
   * Determine which worker to use based on user query
   * @param {string} uid - User ID
   * @param {string} query - User query
   * @returns {Promise<Object>} - Decision with worker name, prompt, and any URLs
   */
  async makeDecision(uid, query) {
    try {
      // Prepare system instruction to guide the model
      const systemInstruction = {
        parts: [{
          text: `You are an advanced AI assistant designed to precisely determine user intent and route requests to the most suitable worker based on a detailed analysis of the user's message. Your primary task is to examine the input for specific content types, including strictly identifying YouTube video URLs (e.g., youtube.com or youtu.be) for the YouTube video worker and regular video URLs for the video worker, regardless of file extension. Additionally, accurately detect and classify other media types by their URL extensions—such as images, audio, or videos—and assign the appropriate worker. Handle any file extension gracefully, using the provided examples as a guide but not as a strict limit. Optimize your analysis for speed and accuracy, ensuring no misrouting occurs.

Available workers:
- textgen: Handles general conversation, questions, and text-based responses
- audio2txt: Processes audio files or voice messages and transcribes them or answers queries about the audio, song, or voice clips
- img2txt: Analyzes images and generates detailed descriptions or answers queries about the image
- genimg: Creates images from text descriptions
- genai: Edits images based on user instructions
- thinkgen: Performs deep reasoning and generates complex text responses
- vid2txt: Analyzes regular video files (not YouTube URLs) and describes content or answers queries about the video
- ytb2txt: Processes YouTube video URLs (e.g., youtube.com/watch?v=) exclusively and answers queries about the video
- clear: Resets or clears conversation history
- code: Assists with coding tasks, including writing, debugging, or running code

Supported file extension examples (not exhaustive):
- Images: .jpg, .png, .gif, .webp
- Audio: .mp3, .aac, .flac, .m4a, .m4p, .wav, .wma
- Video: .mp4, .mov

Output must strictly follow this JSON format:
{"worker":"workername","prompt":"main text/instruction","urls":["url1","url2"]}

Rules:
- Return only the raw JSON object, no additional text, explanations, or code fences.
- Include any URLs found in the user's query in the "urls" array.
- If the query implies a media attachment (e.g., "this image" or "this video") but no URL is present in the text, assume the URL will be provided separately and include an empty "urls" array.
- For non-YouTube video URLs, route to vid2txt regardless of extension; for images and audio, match by intent or extension examples, defaulting to textgen if unclear.
- Prioritize the most specific worker for the task based on content type and intent.`
        }]
      };

      // Prepare the content of the user query
      const contents = [{
        parts: [{
          text: query
        }]
      }];

      // Make API request
      const response = await axios.post(
        `${this.apiUrl}?key=${this.apiKey}`,
        {
          system_instruction: systemInstruction,
          contents: contents
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      // Extract the model's response
      const modelResponse = response.data.candidates[0].content.parts[0].text;
      console.log("Raw model response:", modelResponse);
      
      // Extract and parse JSON from the response
      const decision = this.extractJSON(modelResponse);
      
      if (!decision) {
        console.error('Could not extract valid JSON from response');
        // Fallback to textgen with original query
        return {
          worker: 'textgen',
          prompt: query,
          urls: []
        };
      }
      
      // Validate worker
      if (!this.workers.includes(decision.worker)) {
        console.warn(`Invalid worker: ${decision.worker}, falling back to textgen`);
        decision.worker = 'textgen';
      }
      
      // Ensure urls is an array
      if (!Array.isArray(decision.urls)) {
        decision.urls = [];
      }
      
      return {
        worker: decision.worker,
        prompt: decision.prompt || query,
        urls: decision.urls
      };
    } catch (error) {
      console.error('Error making decision:', error.response?.data || error.message);
      // Fallback to textgen as default
      return {
        worker: 'textgen',
        prompt: query,
        urls: []
      };
    }
  }
}

module.exports = new DecisionMaker();
# Telegram Gemini Bot
A versatile Telegram bot powered by Google's Gemini-2.0-Flash AI model. This bot can interact with audio, generate and compile code, create and edit images, perform deep thinking, analyze general and YouTube videos, make API calls, and operate seamlessly within Telegram.

---

## Features

- **Audio Interaction**: Transcribe and analyze audio files sent to the bot.
- **Code Generation & Compilation**: Create, debug, and compile code snippets based on user requests.
- **Image Generation**: Generate images from text prompts.
- **Image Editing**: Edit existing images based on user instructions (e.g., resizing, enhancing).
- **Deep Thinking**: Provide detailed, reasoned responses to complex queries.
- **Video Analysis**: Analyze uploaded videos or YouTube links, summarizing content or answering specific questions.
- **API Calling**: Integrate external APIs for extended functionality.
- **Telegram Bot Hosting**: Fully functional Telegram bot supporting private and group chats.

---

## Installation

### Prerequisites

- **Node.js**: Version 16 or higher.
- **Telegram Bot Token**: Obtain from [BotFather](https://t.me/botfather).
- **Gemini API Key**: Required for accessing the Gemini-2.0-Flash model.

### Steps

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/notsopreety/telegram-gemini-bot.git
   cd telegram-gemini-bot
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Set Up Environment Variables**:
   Create a `.env` file in the root directory with the following:
   ```env
   TELEGRAM_BOT_TOKEN=your_telegram_bot_token
   GEMINI_API_KEY=your_gemini_api_key
   ```

4. **Run the Bot**:
   - For development (with auto-restart):
     ```bash
     npm run dev
     ```
   - For production:
     ```bash
     npm start
     ```

---

## Usage

### Telegram Bot

- **Private Chats**: Send messages, audio, images, videos, or YouTube links directly to the bot.
- **Group Chats**: Mention the bot (e.g., `@YourBotUsername`) to trigger a response.
- **Examples**:
  - Audio: "What’s being said in this file?" (attach an audio file)
  - Code: "Generate a Python script to sort a list."
  - Image: "Create an image of a sunset over the ocean."
  - Edit Image: "Brighten this photo." (attach an image)
  - Deep Thinking: "Explain the meaning of life in detail."
  - Video: "Summarize this video." (attach a video or YouTube link)

### API Access

The bot includes a basic web server for API interactions (default port: 3000). Customize `index.js` to expose endpoints as needed.
Here's a concise and updated "API Access" section for your `README.md`. It reflects a simpler interaction model where users can talk to the bot like a real person, embedding URLs and text directly in the prompt, similar to how they would in Telegram.

---

### API Access

Interact with the Gemini-2.0-Flash-powered bot via a simple API hosted on port 3000. Talk to it naturally, including URLs and text in the prompt, just like chatting with a person.

#### Endpoints

- **GET `/api/gemini`**  
  - **URL**: `http://localhost:3000/api/gemini?prompt={your_message}&uid={user_id}`  
  - **Example**:  
    ```bash
    curl "http://localhost:3000/api/gemini?prompt=Who%20sings%20this%20https://f.uguu.se/pvbAYrYt.mp3&uid=user123"
    ```  
  - **Response**:  
    ```json
    {"success": true, "type": "text", "message": "This is sung by Artist X!"}
    ```

- **POST `/api/gemini`**  
  - **Body**: `{"prompt": "your_message", "uid": "user_id"}`  
  - **Example**:  
    ```bash
    curl -X POST http://localhost:3000/api/gemini -H "Content-Type: application/json" -d '{"prompt": "Describe this https://example.com/image.jpg", "uid": "user123"}'
    ```  
  - **Response**:  
    ```json
    {"success": true, "type": "text", "message": "It’s a sunny beach!"}
    ```

#### Notes
- **Prompt**: Include URLs and text naturally (e.g., "What’s in this https://example.com/video.mp4").
- **Responses**: JSON with `success`, `type` (text/image/code), and `message` (plus `imageUrl`/`editedImageUrl` for images).
- **Errors**: `{"success": false, "message": "Error message"}` (400/500 status).


## Scripts

- **`npm start`**: Launch the bot in production mode.
- **`npm run dev`**: Run with `nodemon` for development (auto-restarts on changes).
- **`npm run lint`**: Lint code with ESLint and fix issues.
- **`npm run format`**: Format code with Prettier.
- **`npm test`**: Placeholder for tests (currently outputs a message).

---

## Dependencies

- **`@google/genai`**: Gemini AI SDK.
- **`@google/generative-ai`**: Core Gemini library.
- **`axios`**: HTTP requests for API calls.
- **`dotenv`**: Environment variable management.
- **`express`**: Web server framework.
- **`form-data`**: Handles multipart form data.
- **`fs`**: File system utilities.
- **`node-telegram-bot-api`**: Telegram Bot API integration.
- **`path`**: File path utilities.
- **`sharp`**: Image processing.
---

## Contributing

We welcome contributions! Follow these steps:

1. Fork the repository.
2. Create a feature branch:
   ```bash
   git checkout -b feature/my-new-feature
   ```
3. Commit your changes:
   ```bash
   git commit -m "Add my new feature"
   ```
4. Push to your branch:
   ```bash
   git push origin feature/my-new-feature
   ```
5. Open a pull request on GitHub.

---

## License

This project is licensed under the [MIT License](LICENSE).

---

## Author

- [**Samir Thakuri**](https://github.com/notsopreety)

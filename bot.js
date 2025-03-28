const TelegramBot = require('node-telegram-bot-api');
const decoder = require('./brain/decoder');
require('dotenv').config();

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  throw new Error('TELEGRAM_BOT_TOKEN is not set in environment variables');
}

const bot = new TelegramBot(token, { polling: true });

let botUsername;

bot.getMe()
  .then((me) => {
    botUsername = me.username;
    console.log(`Bot started: @${botUsername}`);
  })
  .catch((err) => {
    console.error('Error getting bot info:', err);
  });

async function getMediaUrl(msg) {
  try {
    if (msg.photo) {
      const photo = msg.photo[msg.photo.length - 1];
      const file = await bot.getFile(photo.file_id);
      return `https://api.telegram.org/file/bot${token}/${file.file_path}`;
    } else if (msg.audio) {
      const file = await bot.getFile(msg.audio.file_id);
      return `https://api.telegram.org/file/bot${token}/${file.file_path}`;
    } else if (msg.video) {
      const file = await bot.getFile(msg.video.file_id);
      return `https://api.telegram.org/file/bot${token}/${file.file_path}`;
    }
    return null;
  } catch (error) {
    console.error('Error fetching media URL:', error);
    return null;
  }
}

function isMessageForBot(msg) {
  // Always process in private chats
  if (msg.chat.type === 'private') return true;

  // Check for explicit bot commands
  if (msg.text && (
    msg.text.startsWith('/gemini') || 
    msg.text.startsWith('/gemini@' + botUsername)
  )) return true;

  // Check for direct mention
  if (msg.text && botUsername) {
    const mention = `@${botUsername}`;
    return msg.text.includes(mention);
  }

  return false;
}

function extractUrls(text) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const matches = text.match(urlRegex);
  return matches || [];
}

bot.on('message', async (msg) => {
  // Ignore messages from bots
  if (msg.from.is_bot) return;

  // Check if the message is intended for this bot
  if (!isMessageForBot(msg)) return;

  const chatId = msg.chat.id;
  const userId = msg.from.id.toString();
  const messageId = msg.message_id;
  let text = msg.text || '';

  // Remove bot mention and /gemini command from text
  if (msg.chat.type !== 'private' && botUsername) {
    const mention = `@${botUsername}`;
    text = text.replace(new RegExp(`^/gemini(@${botUsername})?\\s*`, 'i'), '')
               .replace(mention, '')
               .trim();
  }

  let urls = extractUrls(text);

  // Check for attachments in the current message
  let mediaUrl = await getMediaUrl(msg);
  if (mediaUrl) {
    urls.push(mediaUrl);
  }

  // If replying to a message with media, fetch that media URL
  if (msg.reply_to_message) {
    const replyMediaUrl = await getMediaUrl(msg.reply_to_message);
    if (replyMediaUrl) {
      urls.push(replyMediaUrl);
    }
  }

  // Set a default prompt if there's media but no text
  if (urls.length > 0 && !text) {
    text = 'Process this';
  }

  // Skip if there's no text and no URLs
  if (!text && urls.length === 0) return;

  // Send initial processing message
  const processingMessage = await bot.sendMessage(chatId, '⏳ Processing your request...', {
    reply_to_message_id: messageId,
  });

  try {
    // Pass the raw prompt and URLs directly to decoder.process
    const result = await decoder.process(text, userId, urls);

    // Edit or delete processing message based on result
    try {
      if (result.success) {
        // Send final response and delete processing message
        switch (result.type) {
          case 'text':
            await bot.editMessageText(result.message, {
              chat_id: chatId,
              message_id: processingMessage.message_id,
              parse_mode: 'Markdown'
            });
            break;
          case 'image':
            await bot.deleteMessage(chatId, processingMessage.message_id);
            if (result.imageUrl) {
              await bot.sendPhoto(chatId, result.imageUrl, {
                caption: result.message || '',
                parse_mode: 'Markdown',
                reply_to_message_id: messageId,
              });
            } else if (result.editedImageUrl) {
              await bot.sendPhoto(chatId, result.editedImageUrl, {
                caption: result.message || 'Edited image',
                parse_mode: 'Markdown',
                reply_to_message_id: messageId,
              });
            }
            break;
          default:
            await bot.editMessageText(result.message || 'Response generated.', {
              chat_id: chatId,
              message_id: processingMessage.message_id,
              parse_mode: 'Markdown'
            });
        }
      } else {
        // Edit processing message with error
        await bot.editMessageText(result.message || 'Something went wrong.', {
          chat_id: chatId,
          message_id: processingMessage.message_id,
          parse_mode: 'Markdown'
        });
      }
    } catch (editError) {
      console.error('Error editing processing message:', editError);
      // Fallback to sending a new message if editing fails
      await bot.sendMessage(chatId, result.message || 'Response processed.', {
        parse_mode: 'Markdown',
        reply_to_message_id: messageId,
      });
    }
  } catch (error) {
    console.error('Error in processing:', error);
    await bot.editMessageText('An error occurred while processing your request.', {
      chat_id: chatId,
      message_id: processingMessage.message_id,
      parse_mode: 'Markdown'
    });
  }
});

// Handle /start command
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const welcomeMessage = 'Welcome! I am a Gemini AI bot. You can interact with me in two ways in group chats:\n' +
                         '1. Mention me directly with @botusername\n' +
                         '2. Use the /gemini command followed by your query';
  
  bot.sendMessage(chatId, welcomeMessage);
});

// Handle polling errors
bot.on('polling_error', (error) => {
  console.error('Polling error:', error);
});

console.log('Telegram Bot is running...');
const decisionMaker = require('./brain/decision');

async function example() {
  try {
    const uid = 'user123';
    
    // Test various queries to see how the decision maker routes them
    const queries = [
    //   "What's the weather like today?",
    //   "Generate an image of a cat playing piano",
    //   "make it look like a painting: https://example.com/image.jpg",
      "Say something about this video https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    //   "Help me write a function in JavaScript to calculate fibonacci numbers",
    //   "Can you clear our chat history?",
    //   "Describe what you see in this image: https://example.com/photo.jpg"
    ];
    
    for (const query of queries) {
      console.log(`\n\nUser Query: "${query}"`);
      const decision = await decisionMaker.makeDecision(uid, query);
      console.log(`Decision: [${decision.worker}] + ${decision.prompt}`);
      if (decision.urls.length > 0) {
        console.log(`URLs: ${decision.urls.join(', ')}`);
      }
    }
  } catch (error) {
    console.error('Error in example:', error);
  }
}

example();
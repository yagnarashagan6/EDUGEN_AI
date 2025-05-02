require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();

// CORS configuration
app.use(cors({
  origin: ['http://localhost:3000', 'https://edugen-ai-zeta.vercel.app'],
  methods: ['GET', 'POST'],
  credentials: true,
}));
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  const apiKeySet = !!process.env.OPENROUTER_API_KEY;
  res.status(200).json({
    status: 'OK',
    message: 'Server is running',
    apiKeySet: apiKeySet,
    environment: process.env.NODE_ENV || 'development',
  });
});

// Chat API endpoint
app.post('/api/chat', async (req, res) => {
  const { message } = req.body;

  // Validate input
  if (!message) {
    console.error('Chat Error: Message is required');
    return res.status(400).json({ error: 'Message is required' });
  }

  try {
    // Check API key
    if (!process.env.OPENROUTER_API_KEY) {
      throw new Error('OPENROUTER_API_KEY is not set in environment variables');
    }

    // Send request to OpenRouter API
    console.log('Sending request to OpenRouter API for message:', message);
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'meta-llama/llama-3.1-8b-instruct:free', // Fallback to a reliable free model
        messages: [
          {
            role: 'system',
            content: 'You are EduGen AI, a chatbot for students. Provide short, concise answers to educational queries, using bullet points when appropriate. Do not generate quiz questions.',
          },
          { role: 'user', content: message },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'http://localhost:3000', // Use localhost for local testing
          'X-Title': 'EduGen AI',
        },
        timeout: 15000, // 15-second timeout
      }
    );

    // Parse and send response
    const botResponse = response.data.choices[0].message.content;
    console.log('OpenRouter response received:', botResponse);
    res.json({ response: botResponse });
  } catch (error) {
    console.error('Chat Error:', error.response ? error.response.data : error.message);
    let errorMessage = 'Failed to get response from AI model';
    if (error.response) {
      errorMessage = error.response.data.error?.message || JSON.stringify(error.response.data);
    } else if (error.message) {
      errorMessage = error.message;
    }
    res.status(500).json({ error: `OpenRouter API error: ${errorMessage}` });
  }
});

// Generate quiz API endpoint
app.post('/api/generate-quiz', async (req, res) => {
  const { topic } = req.body;

  // Validate input
  if (!topic) {
    console.error('Quiz Error: Topic is required');
    return res.status(400).json({ error: 'Topic is required' });
  }

  try {
    // Check API key
    if (!process.env.OPENROUTER_API_KEY) {
      throw new Error('OPENROUTER_API_KEY is not set in environment variables');
    }

    // Send request to OpenRouter API
    console.log('Sending quiz request to OpenRouter API for topic:', topic);
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'meta-llama/llama-3.1-8b-instruct:free', // Fallback model
        messages: [
          {
            role: 'system',
            content: 'You are EduGen AI. Generate exactly 3 multiple-choice quiz questions based on the given topic. Each question must have a text, 3 options, and a correctAnswer. Format the response as a JSON array of objects, e.g., [{ "text": "Question", "options": ["A", "B", "C"], "correctAnswer": "A" }, ...].',
          },
          { role: 'user', content: `Generate a quiz on the topic: ${topic}` },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'http://localhost:3000',
          'X-Title': 'EduGen AI',
        },
        timeout: 15000, // 15-second timeout
      }
    );

    // Parse and send response
    const quizQuestions = JSON.parse(response.data.choices[0].message.content);
    console.log('OpenRouter quiz response received:', quizQuestions);
    res.json({ questions: quizQuestions });
  } catch (error) {
    console.error('Quiz Error:', error.response ? error.response.data : error.message);
    let errorMessage = 'Failed to generate quiz questions';
    if (error.response) {
      errorMessage = error.response.data.error?.message || JSON.stringify(error.response.data);
    } else if (error.message) {
      errorMessage = error.message;
    }
    res.status(500).json({ error: `OpenRouter API error: ${errorMessage}` });
  }
});

// Start the Express server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
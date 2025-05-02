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

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  if (!process.env.OPENROUTER_API_KEY) {
    return res.status(500).json({ error: 'OPENROUTER_API_KEY is not set in environment variables' });
  }

  try {
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'meta-llama/llama-3.1-8b-instruct:free',
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
          'HTTP-Referer': 'https://edugen-ai-zeta.vercel.app',
          'X-Title': 'EduGen AI',
        },
        timeout: 15000,
      }
    );

    const choices = response.data?.choices;
    const botResponse = choices?.[0]?.message?.content;

    if (!botResponse) {
      return res.status(500).json({ error: 'Invalid response format from OpenRouter API' });
    }

    res.json({ response: botResponse });

  } catch (error) {
    console.error('Chat Error:', error.response?.data || error.message);
    const errorMessage = error.response?.data?.error?.message || error.message || 'Unknown error';
    res.status(500).json({ error: `OpenRouter API error: ${errorMessage}` });
  }
});

// Generate quiz API endpoint
app.post('/api/generate-quiz', async (req, res) => {
  const { topic } = req.body;

  if (!topic) {
    return res.status(400).json({ error: 'Topic is required' });
  }

  if (!process.env.OPENROUTER_API_KEY) {
    return res.status(500).json({ error: 'OPENROUTER_API_KEY is not set in environment variables' });
  }

  try {
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'meta-llama/llama-3.1-8b-instruct:free',
        messages: [
          {
            role: 'system',
            content:
              'You are EduGen AI. Generate exactly 3 multiple-choice quiz questions based on the given topic. Each question must have a text, 3 options, and a correctAnswer. Format the response as a JSON array of objects, e.g., [{ "text": "Question", "options": ["A", "B", "C"], "correctAnswer": "A" }, ...].',
          },
          { role: 'user', content: `Generate a quiz on the topic: ${topic}` },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://edugen-ai-zeta.vercel.app',
          'X-Title': 'EduGen AI',
        },
        timeout: 15000,
      }
    );

    const choices = response.data?.choices;
    const content = choices?.[0]?.message?.content;

    if (!content) {
      return res.status(500).json({ error: 'Invalid response format from OpenRouter API' });
    }

    let quizQuestions;
    try {
      quizQuestions = JSON.parse(content);
    } catch (jsonError) {
      return res.status(500).json({ error: 'Quiz response could not be parsed as JSON' });
    }

    res.json({ questions: quizQuestions });

  } catch (error) {
    console.error('Quiz Error:', error.response?.data || error.message);
    const errorMessage = error.response?.data?.error?.message || error.message || 'Unknown error';
    res.status(500).json({ error: `OpenRouter API error: ${errorMessage}` });
  }
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

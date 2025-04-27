require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();

// CORS configuration
app.use(cors({
  origin: ['http://localhost:3000', 'https://edugen-ai-zeta.vercel.app']
}));
app.use(express.json());

// Chat API endpoint
app.post('/api/chat', async (req, res) => {
  const { message } = req.body;

  // Validate input
  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  try {
    // Send request to OpenRouter API for chat completion
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'mistralai/mistral-7b-instruct:free',
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
          'HTTP-Referer': 'https://edugen-ai-zeta.vercel.app', // Vercel frontend
          'X-Title': 'EduGen AI',
        },
      }
    );

    // Parse and send response
    const botResponse = response.data.choices[0].message.content;
    res.json({ response: botResponse });
  } catch (error) {
    console.error('Chat Error:', error.response ? error.response.data : error.message);
    res.status(500).json({ error: 'Failed to get response from AI model' });
  }
});

// Generate quiz API endpoint
app.post('/api/generate-quiz', async (req, res) => {
  const { topic } = req.body;

  // Validate input
  if (!topic) {
    return res.status(400).json({ error: 'Topic is required' });
  }

  try {
    // Send request to OpenRouter API to generate quiz
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'mistralai/mistral-7b-instruct:free',
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
          'HTTP-Referer': 'https://edugen-ai-zeta.vercel.app', // Vercel frontend
          'X-Title': 'EduGen AI',
        },
      }
    );

    // Parse the response for quiz questions and send it
    const quizQuestions = JSON.parse(response.data.choices[0].message.content);
    res.json({ questions: quizQuestions });
  } catch (error) {
    console.error('Quiz Error:', error.response ? error.response.data : error.message);
    res.status(500).json({ error: 'Failed to generate quiz questions' });
  }
});

// Start the Express server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

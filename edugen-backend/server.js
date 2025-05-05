require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();

// CORS setup
app.use(cors({
  origin: ['http://localhost:3000', 'https://edugen-ai-zeta.vercel.app'],
  credentials: true,
}));
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK' });
});

// Chat endpoint
app.post('/api/chat', async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'Message is required' });

  try {
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'meta-llama/llama-4-maverick:free',
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
          'HTTP-Referer': process.env.NODE_ENV === 'production'
            ? 'https://edugen-ai-zeta.vercel.app'
            : 'http://localhost:3000',
          'X-Title': 'EduGen AI',
        },
        timeout: 15000,
      }
    );

    const botMessage = response.data.choices?.[0]?.message?.content;
    if (!botMessage) throw new Error('No response from AI');

    res.json({ response: botMessage });
  } catch (err) {
    console.error('API error:', err.message);
    res.status(500).json({
      error: `OpenRouter API error: ${err.response?.data?.error?.message || err.message}`,
    });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

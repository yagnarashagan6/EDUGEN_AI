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
  if (!message) {
    console.error('No message provided');
    return res.status(400).json({ error: 'Message is required' });
  }

  if (!process.env.OPENROUTER_API_KEY) {
    console.error('OPENROUTER_API_KEY is not set');
    return res.status(500).json({ error: 'Server configuration error: API key missing' });
  }

  try {
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'meta-llama/llama-3.3-8b-instruct:free', // ✅ correct
 // Updated to a known free model
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
          'HTTP-Referer': process.env.SITE_URL || 'https://edugen-ai-zeta.vercel.app',
          'X-Title': 'EduGen AI',
        },
        timeout: 30000, // Increased to 30s
      }
    );

    const botMessage = response.data.choices?.[0]?.message?.content;
    if (!botMessage) {
      console.error('No content in response:', response.data);
      return res.status(500).json({ error: 'No response content from AI' });
    }

    res.json({ response: botMessage });
  } catch (err) {
    console.error('API error:', {
      message: err.message,
      status: err.response?.status,
      data: err.response?.data,
      code: err.code,
    });
    const errorMessage = err.response?.data?.error?.message || err.message;
    res.status(500).json({ error: `OpenRouter API error: ${errorMessage}` });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
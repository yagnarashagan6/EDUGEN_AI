require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors'); // Add CORS to allow frontend requests

const app = express();
app.use(cors()); // Enable CORS
app.use(express.json());

app.post('/api/chat', async (req, res) => {
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  try {
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'mistralai/mistral-7b-instruct:free', // Correct free model ID
        messages: [
          {
            role: 'system',
            content: 'You are EduGen AI, a helpful chatbot for students. Answer educational queries clearly and concisely, and generate quiz questions when requested.',
          },
          { role: 'user', content: message },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://edugen-ai-zeta.vercel.app', // Your site URL
          'X-Title': 'EduGen AI', // Optional: App name
        },
      }
    );

    const botResponse = response.data.choices[0].message.content;
    res.json({ response: botResponse });
  } catch (error) {
    console.error('Error:', error.response ? error.response.data : error.message);
    res.status(500).json({ error: 'Failed to get response from AI model' });
  }
});

app.listen(5000, () => console.log('Server running on port 5000'));
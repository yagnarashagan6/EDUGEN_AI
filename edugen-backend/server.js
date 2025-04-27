const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

const API_KEY = process.env.XAI_API_KEY || 'xai-ZbpK4HRWgZxj9WvqAync7slMp4g6mQvb1SGcgc6ltz8pByl8p3aB0LGsNEFUimhLPbavSsTqciiEjRrg'; // Replace with xAI or OpenAI key
const API_URL = 'https://api.x.ai/v1/grok'; // Use https://api.openai.com/v1/chat/completions for OpenAI

app.post('/api/chat', async (req, res) => {
  const { message } = req.body;

  try {
    const response = await axios.post(
      API_URL,
      {
        prompt: `You are EduGen AI, an assistant for students using the EduGen platform. Answer the following student question concisely and accurately, focusing on educational content or platform features: ${message}`,
        max_tokens: 150,
      },
      {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const aiResponse = response.data.choices[0].text.trim(); // Adjust based on API response format
    res.json({ response: aiResponse });
  } catch (error) {
    console.error('Error calling API:', error);
    res.status(500).json({ error: 'Failed to get response from AI' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
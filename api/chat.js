const axios = require('axios');

module.exports = async (req, res) => {
  // Ensure the request method is POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Extract the message from the request body
  const { message } = req.body;
  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  // Check for the OpenRouter API key in environment variables
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'OPENROUTER_API_KEY is not set' });
  }

  try {
    // Call the OpenRouter API
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
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://edugen-ai-zeta.vercel.app',
          'X-Title': 'EduGen AI',
        },
        timeout: 30000, // 30-second timeout
      }
    );

    // Validate the response structure
    const choices = response.data?.choices;
    if (!choices || !choices[0]?.message?.content) {
      return res.status(500).json({ error: 'Invalid response format from OpenRouter API' });
    }

    // Return the AI's response
    res.status(200).json({ response: choices[0].message.content });
  } catch (error) {
    console.error('Chat Error:', error.response?.data || error.message);
    const statusCode = error.response?.status || 500;
    const errorMessage = error.response?.data?.error?.message || error.message || 'Unknown error';
    res.status(statusCode).json({ error: `OpenRouter API error: ${errorMessage}` });
  }
};
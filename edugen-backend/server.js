// api/chat.js
import { Configuration, OpenAIApi } from 'openai';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Debug: Check if API key is loaded
    if (!process.env.OPENROUTER_API_KEY) {
      console.error('OpenRouter API key is missing');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    const configuration = new Configuration({
      apiKey: process.env.OPENROUTER_API_KEY,
      basePath: "https://openrouter.ai/api/v1",
      baseOptions: {
        headers: {
          "HTTP-Referer": "https://edugen-ai-zeta.vercel.app",
          "X-Title": "EduGen AI",
        },
      },
    });

    const openai = new OpenAIApi(configuration);

    const completion = await openai.createChatCompletion({
      model: "meta-llama/llama-3.1-8b-instruct:free",
      messages: [
        { 
          role: "system", 
          content: "You are EduGen AI, a helpful assistant for students. Provide clear, concise answers to educational questions." 
        },
        { role: "user", content: message }
      ],
      temperature: 0.7,
    });

    const response = completion.data.choices[0]?.message?.content || "I couldn't generate a response.";
    res.status(200).json({ response });

  } catch (error) {
    console.error('OpenRouter API error:', {
      message: error.message,
      stack: error.stack,
      response: error.response?.data
    });
    
    res.status(500).json({ 
      error: 'Failed to get response from AI',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
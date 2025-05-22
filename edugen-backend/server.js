// server.js
console.log("Running Node.js version:", process.version);

import express from 'express';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config();

const app = express();

// Enable CORS for your frontend domain(s)
app.use(cors({
  origin: ['https://edugen-ai-zeta.vercel.app', 'http://localhost:3000'],
  methods: ['POST', 'GET', 'OPTIONS'],
}));

app.use(express.json());

app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;
    if (typeof message !== 'string') {
      return res.status(400).json({ error: 'Invalid message format' });
    }

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "HTTP-Referer": "https://edugen-ai-zeta.vercel.app",
        "X-Title": "EduGen AI"
      },
      body: JSON.stringify({
        model: "meta-llama/llama-3.1-8b-instruct:free",
        messages: [
          { role: "system", content: "You are EduGen AI, a helpful assistant for students. Provide clear, concise answers to educational questions." },
          { role: "user", content: message }
        ],
        temperature: 0.7
      }),
      timeout: 120000
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(errText || `OpenRouter Error: ${response.status}`);
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || "I couldn't generate a response.";
    res.status(200).json({ response: reply });

  } catch (error) {
    console.error("Chat API Error:", error.message);
    res.status(500).json({
      error: 'Failed to get response from AI',
      message: error.message
    });
  }
});

// Fallback for any other routes
app.all('*', (req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

// Use Render's dynamic port
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`EduGen backend listening on port ${PORT}`);
});

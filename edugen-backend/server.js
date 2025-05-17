const express = require('express');
   const axios = require('axios');
   const cors = require('cors');
   const CONFIG = require('./config');

   const app = express();

   // CORS setup
   app.use(cors({
     origin: ['http://localhost:3000', 'https://edugen-ai-zeta.vercel.app'],
     credentials: true,
   }));
   app.use(express.json());

   // Health check endpoint
   app.get('/api/health', (req, res) => {
     res.status(200).json({ status: 'OK' });
   });

   // Chat endpoint
   app.post('/api/chat', async (req, res) => {
     const { message } = req.body;
     if (!message) {
       console.error('No message provided in request body');
       return res.status(400).json({ error: 'Message is required' });
     }

     const apiKey = CONFIG.OPENROUTER_API_KEY;
     if (!apiKey) {
       console.error('OPENROUTER_API_KEY is not set in configuration');
       return res.status(500).json({ error: 'Server configuration error: API key is missing' });
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
             Authorization: `Bearer ${apiKey}`,
             'Content-Type': 'application/json',
             'HTTP-Referer': CONFIG.SITE_URL || 'https://edugen-ai-zeta.vercel.app',
             'X-Title': 'EduGen AI',
           },
           timeout: 30000, // 30s timeout
         }
       );

       const botMessage = response.data.choices?.[0]?.message?.content;
       if (!botMessage) {
         console.error('No content in API response:', response.data);
         return res.status(500).json({ error: 'No response content from AI' });
       }

       res.json({ response: botMessage });
     } catch (err) {
       console.error('API error details:', {
         message: err.message,
         status: err.response?.status,
         data: err.response?.data,
         code: err.code,
       });

       let errorMessage = 'Failed to get a response from the AI service. Please try again later.';
       if (err.response?.status === 401) {
         errorMessage = 'Authentication error: Invalid API key. Please contact support.';
       } else if (err.response?.status === 429) {
         errorMessage = 'Rate limit exceeded. Please wait a moment and try again.';
       } else if (err.code === 'ECONNABORTED') {
         errorMessage = 'Request timed out. Please try again.';
       } else if (err.response?.data?.error?.message) {
         errorMessage = `OpenRouter API error: ${err.response.data.error.message}`;
       }

       res.status(500).json({ error: errorMessage });
     }
   });

   app.listen(CONFIG.PORT, () => console.log(`Server running on port ${CONFIG.PORT}`));
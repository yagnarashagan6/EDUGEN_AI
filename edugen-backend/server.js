import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const app = express();

// CORS configuration
const allowedOrigins = [
  "https://edugen-ai-zeta.vercel.app",
  "https://edugen-backend.onrender.com",
  "http://localhost:3000",
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));
app.use(express.json());

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  });
});

// Route 1: Chat
app.post("/api/chat", async (req, res) => {
  try {
    const { message } = req.body;

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "HTTP-Referer": "https://edugen-ai-zeta.vercel.app",
          "X-Title": "EduGen AI",
        },
        body: JSON.stringify({
          model: "deepseek/deepseek-r1-0528-qwen3-8b:free",
          messages: [
            {
              role: "system",
              content:
                "You are EduGen AI, a helpful assistant for students. Provide clear, concise answers to educational questions.",
            },
            { role: "user", content: message },
          ],
          temperature: 0.7,
        }),
        timeout: 120000,
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(errText || `OpenRouter Error: ${response.status}`);
    }

    const data = await response.json();
    const reply =
      data.choices?.[0]?.message?.content || "I couldn't generate a response.";
    res.status(200).json({ response: reply });
  } catch (error) {
    console.error("Chat API Error:", error.message);
    res.status(500).json({
      error: "Failed to get response from AI",
      message: error.message,
    });
  }
});

// Route 2: Quiz Generation
app.post("/api/generate-quiz", async (req, res) => {
  console.log("Quiz generation request received:", req.body);

  const { topic, count } = req.body;

  // Input validation
  if (!topic || typeof topic !== "string" || topic.trim().length === 0) {
    return res.status(400).json({
      error: "Invalid input",
      message: "Please provide a valid topic for the quiz",
    });
  }

  const questionCount = parseInt(count);
  if (isNaN(questionCount) || questionCount < 3 || questionCount > 10) {
    return res.status(400).json({
      error: "Invalid input",
      message: "Please request between 3 and 10 questions",
    });
  }

  const prompt = `Generate exactly ${questionCount} multiple choice quiz questions on the topic "${topic}". Follow these strict rules:
1. Each question must have:
   - A clear question text
   - Exactly 4 options (A, B, C, D)
   - One correct answer (must match exactly one option)
2. Format each question as JSON with:
   - "text": The question
   - "options": Array of 4 options (prefix with A), B), etc.)
   - "correctAnswer": The full correct option text
3. Return only a valid JSON array with no extra text

Example:
[
  {
    "text": "What is the capital of France?",
    "options": ["A) London", "B) Paris", "C) Berlin", "D) Madrid"],
    "correctAnswer": "B) Paris"
  }
]

Now generate ${questionCount} questions about "${topic}":`;

  try {
    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "HTTP-Referer": "https://edugen-ai-zeta.vercel.app",
          "X-Title": "EduGen AI",
        },
        body: JSON.stringify({
          model: "deepseek/deepseek-r1-0528-qwen3-8b:free",
          messages: [
            {
              role: "system",
              content:
                "You are a quiz generator. Return only valid JSON arrays with quiz questions in the exact specified format. Do not include any additional text or explanations.",
            },
            { role: "user", content: prompt },
          ],
          temperature: 0.7,
          response_format: { type: "json_object" },
        }),
        timeout: 120000,
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("OpenRouter API Error:", response.status, errText);
      throw new Error(`API Error: ${response.status} - ${errText}`);
    }

    const data = await response.json();
    console.log("OpenRouter response:", data);

    let content = data.choices?.[0]?.message?.content?.trim();
    if (!content) throw new Error("Empty response from AI");

    // Parse the response
    let questions;
    try {
      // First try to parse directly
      const parsed = JSON.parse(content);

      // Handle different response formats
      if (Array.isArray(parsed)) {
        questions = parsed;
      } else if (parsed.questions && Array.isArray(parsed.questions)) {
        questions = parsed.questions;
      } else {
        throw new Error("Response is not a valid array");
      }
    } catch (e) {
      console.log("Direct parse failed, trying to extract JSON");
      // Try to extract JSON from markdown code blocks
      const jsonMatch = content.match(/```(?:json)?\n([\s\S]*?)\n```/);
      if (jsonMatch && jsonMatch[1]) {
        questions = JSON.parse(jsonMatch[1]);
      } else {
        // Fallback to finding first [ and last ]
        const start = content.indexOf("[");
        const end = content.lastIndexOf("]");
        if (start === -1 || end === -1) {
          throw new Error("Could not find JSON array in response");
        }
        const jsonStr = content.substring(start, end + 1);
        questions = JSON.parse(jsonStr);
      }
    }

    // Validate each question
    const validated = questions.map((q, i) => {
      if (!q.text || typeof q.text !== "string") {
        throw new Error(`Question ${i + 1} missing text`);
      }
      if (!q.options || !Array.isArray(q.options) || q.options.length !== 4) {
        throw new Error(`Question ${i + 1} must have exactly 4 options`);
      }
      if (!q.correctAnswer || typeof q.correctAnswer !== "string") {
        throw new Error(`Question ${i + 1} missing correctAnswer`);
      }
      if (!q.options.includes(q.correctAnswer)) {
        throw new Error(
          `Question ${i + 1} correctAnswer doesn't match any option`
        );
      }
      return {
        text: q.text.trim(),
        options: q.options.map((opt) => opt.trim()),
        correctAnswer: q.correctAnswer.trim(),
      };
    });

    console.log("Successfully generated quiz:", validated);
    res.json({ questions: validated });
  } catch (error) {
    console.error("Quiz generation error:", error.message);
    res.status(500).json({
      error: "Failed to generate quiz",
      message: error.message,
      details: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
});

// 404 Handler
app.all("*", (req, res) => {
  res.status(404).json({ error: "Not Found" });
});

// Start server
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`EduGen backend listening on port ${PORT}`);
});

import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
import cors from "cors";
import rateLimit from "express-rate-limit";

dotenv.config();

const app = express();

// Trust proxy for Render deployment
app.set("trust proxy", 1);

// CORS configuration
const allowedOrigins = [
  "https://edugen-ai-zeta.vercel.app",
  "http://localhost:3000",
  "https://edugen-backend.onrender.com",
];

const corsOptions = {
  origin: (origin, callback) => {
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

// Rate limiting configuration
const apiLimiter = rateLimit({
  windowMs: 15 * 1000, // 15 seconds window
  max: 2, // limit each IP to 2 requests per windowMs
  message: { error: "Too many requests, please wait and try again." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply the limiter to chat and quiz endpoints only
app.use("/api/chat", apiLimiter);
app.use("/api/generate-quiz", apiLimiter);

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
          model: "google/gemma-3-27b-it:free",
          messages: [
            {
              role: "user",
              content: `You are EduGen AI 🎓, a comprehensive educational assistant for students. When explaining topics, follow these guidelines:

📚 CONTENT DEPTH: Provide detailed, thorough explanations that cover:
• Key concepts and definitions
• Step-by-step breakdowns when applicable
• Multiple perspectives or approaches
• Important connections to related topics

🌍 REAL-WORLD EXAMPLES: Always include:
• Practical, everyday examples students can relate to
• Current events or modern applications
• Industry use cases and career connections
• Historical context when relevant

💡 CLARITY & UNDERSTANDING: Make content accessible by:
• Using simple language with clear explanations
• Breaking complex ideas into digestible parts
• Providing analogies and metaphors
• Including visual descriptions where helpful

� EDUCATIONAL RESOURCES: Always provide actual clickable links to relevant resources:
• **YouTube Videos:** Include real YouTube links to specific educational videos related to the topic
• **GeeksforGeeks:** Provide direct links to relevant GeeksforGeeks articles (https://www.geeksforgeeks.org/)
• **W3Schools:** Include links to relevant W3Schools tutorials (https://www.w3schools.com/)
• **Khan Academy:** Link to specific Khan Academy lessons when applicable (https://www.khanacademy.org/)
• **Other Educational Sites:** Include links to Wikipedia, educational websites, and online courses

� RESOURCE FORMAT:
📺 **YouTube Videos:**
• [Specific Video Title](https://www.youtube.com/watch?v=VIDEO_ID) - Channel Name
• [Another Video Title](https://www.youtube.com/watch?v=VIDEO_ID) - Channel Name

📖 **Articles & Tutorials:**
• [Article Title](https://www.geeksforgeeks.org/specific-topic/) - GeeksforGeeks
• [Tutorial Title](https://www.w3schools.com/specific-tutorial/) - W3Schools
• [Lesson Title](https://www.khanacademy.org/specific-lesson/) - Khan Academy

🔗 **Additional Resources:**
• [Wikipedia Article](https://en.wikipedia.org/wiki/Topic_Name)
• [Educational Website](https://example-edu-site.com/topic)

📍 STRUCTURE: Organize responses with:
• Clear headings using emojis (🧮 math, 🧪 science, 📖 literature, etc.)
• Bullet points and numbered lists
• Key takeaways highlighted with ✨
• Practical tips marked with 💡
• Resource recommendations marked with 🔗

IMPORTANT: Always provide actual working URLs/links in markdown format [Link Text](URL) so they are clickable. Do not just suggest search terms - give real, specific links to educational content.

Student's question: ${message}`,
            },
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
          model: "google/gemma-3-27b-it:free",
          messages: [
            {
              role: "user",
              content: `You are a quiz generator 📝. Generate engaging quiz questions using subject-relevant emojis in the question text (e.g., 🧮 for math, 🧪 for science, 🌍 for geography, etc.). Return only valid JSON arrays with quiz questions in the exact specified format. Do not include any additional text or explanations. Format the questions with emojis where appropriate, but ensure the options remain clearly marked with A), B), C), D).

${prompt}`,
            },
          ],
          temperature: 0.7,
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
    let content = data.choices?.[0]?.message?.content?.trim();

    if (!content) throw new Error("Empty response from AI");

    let questions;
    try {
      // Strip markdown and parse JSON
      content = content.replace(/```json\n|\n```/g, "").trim();
      questions = JSON.parse(content);
      if (!Array.isArray(questions)) {
        console.error("Invalid response format:", content);
        throw new Error("Response is not a valid array");
      }
    } catch (parseError) {
      console.error(
        "JSON parse error:",
        parseError.message,
        "Raw content:",
        content
      );
      throw new Error("Failed to parse quiz data");
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

    if (validated.length !== questionCount) {
      throw new Error(
        `Expected ${questionCount} questions, got ${validated.length}`
      );
    }

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

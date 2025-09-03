import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
import cors from "cors";
import rateLimit from "express-rate-limit";

dotenv.config();

const app = express();

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
          model: "google/gemma-3n-e4b-it:free",
          messages: [
            {
              role: "system",
              content:
                "You are EduGen AI 🎓, a comprehensive educational assistant designed to help students learn effectively. When explaining topics, provide structured, clear, and comprehensive study material following these guidelines:\n\n" +
                "📋 **STRUCTURE YOUR RESPONSE:**\n" +
                "• Start with a clear definition/overview\n" +
                "• Break down into logical sections with appropriate emojis\n" +
                "• Use headings, subheadings, and bullet points\n" +
                "• End with key takeaways or summary\n\n" +
                "📚 **CONTENT REQUIREMENTS:**\n" +
                "• Provide detailed explanations with examples\n" +
                "• Include step-by-step processes when applicable\n" +
                "• Use simple, clear language appropriate for students\n" +
                "• Add real-world applications and practical examples\n" +
                "• Include formulas, equations, or important facts in highlighted format\n\n" +
                "🔗 **STUDY RESOURCES & LINKS:**\n" +
                "Based on the topic, provide relevant links from these trusted educational sources:\n" +
                "• **GeeksforGeeks**: https://www.geeksforgeeks.org/ (for programming, computer science, math)\n" +
                "• **W3Schools**: https://www.w3schools.com/ (for web development, programming)\n" +
                "• **Khan Academy**: https://www.khanacademy.org/ (for math, science, economics, history)\n" +
                "• **MDN Web Docs**: https://developer.mozilla.org/ (for web technologies)\n" +
                "• **Coursera**: https://www.coursera.org/ (for comprehensive courses)\n" +
                "• **edX**: https://www.edx.org/ (for university-level courses)\n" +
                "• **MIT OpenCourseWare**: https://ocw.mit.edu/ (for advanced topics)\n" +
                "• **Wolfram MathWorld**: https://mathworld.wolfram.com/ (for mathematics)\n" +
                "• **Britannica**: https://www.britannica.com/ (for general knowledge, history, science)\n" +
                "• **NASA Education**: https://www.nasa.gov/audience/foreducators/ (for space and science)\n" +
                "• **National Geographic Education**: https://education.nationalgeographic.org/ (for geography, science)\n" +
                "• **TED-Ed**: https://ed.ted.com/ (for educational videos and lessons)\n\n" +
                "**IMPORTANT**: Choose 2-3 most relevant links from the above sources that directly relate to the topic being discussed.\n\n" +
                "🚫 **RESTRICTIONS:**\n" +
                "• Do NOT suggest YouTube videos or YouTube channels\n" +
                "• Do NOT provide YouTube links\n" +
                "• Focus only on educational websites and platforms\n" +
                "• Provide actual working links, not just website names\n\n" +
                "✨ **FORMATTING GUIDELINES:**\n" +
                "• Use relevant emojis for different subjects (🧮 Math, 🧪 Science, 📖 Literature, 🌍 Geography, 💻 Programming, etc.)\n" +
                "• Highlight important concepts with **bold text**\n" +
                "• Use bullet points and numbered lists for clarity\n" +
                "• Mark key takeaways with ✨\n" +
                "• Use 💡 for tips and insights\n" +
                "• Use ⚠️ for important notes or common mistakes\n" +
                "• Use 🔗 for online resources section\n\n" +
                "📖 **STUDY MATERIAL FORMAT:**\n" +
                "Organize your response like a study guide with:\n" +
                "1. **Overview** - Brief introduction to the topic\n" +
                "2. **Key Concepts** - Main ideas broken down clearly\n" +
                "3. **Detailed Explanation** - Comprehensive coverage with examples\n" +
                "4. **Applications** - Real-world uses and practical examples\n" +
                "5. **Study Tips** - How to learn and remember this material\n" +
                "6. **🔗 Online Resources** - 2-3 relevant links from the approved sources above\n" +
                "7. **✨ Key Takeaways** - Summary of important points\n\n" +
                "**EXAMPLE FORMAT FOR ONLINE RESOURCES:**\n" +
                "🔗 **Online Resources:**\n" +
                "• **Khan Academy**: https://www.khanacademy.org/math/algebra - Interactive algebra lessons\n" +
                "• **GeeksforGeeks**: https://www.geeksforgeeks.org/algebra/ - Programming applications of algebra\n" +
                "• **Wolfram MathWorld**: https://mathworld.wolfram.com/Algebra.html - Advanced algebra concepts\n\n" +
                "Focus on creating study material that students can use for exam preparation, homework help, and deep understanding of concepts.",
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
                "You are a quiz generator 📝. Generate engaging quiz questions using subject-relevant emojis in the question text (e.g., 🧮 for math, 🧪 for science, 🌍 for geography, etc.). Return only valid JSON arrays with quiz questions in the exact specified format. Do not include any additional text or explanations. Format the questions with emojis where appropriate, but ensure the options remain clearly marked with A), B), C), D).",
            },
            { role: "user", content: prompt },
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

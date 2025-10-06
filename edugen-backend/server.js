import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
import cors from "cors";
import rateLimit from "express-rate-limit";
import admin from "firebase-admin";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

dotenv.config();

// =============== FIREBASE ADMIN SDK INITIALIZATION ===============
let db;
try {
  // Prevent re-initialization in serverless/hot-reload environments
  if (!admin.apps.length) {
    if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      throw new Error(
        "FIREBASE_SERVICE_ACCOUNT_KEY environment variable not set."
      );
    }
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    initializeApp({
      credential: cert(serviceAccount),
    });
    console.log("✅ Firebase Admin SDK initialized successfully.");
  } else {
    console.log("ℹ️ Firebase Admin SDK already initialized.");
  }
  db = getFirestore();
} catch (error) {
  console.error("❌ Firebase Admin initialization failed:", error.message);
  // Exit if Firebase Admin fails to initialize, as it's critical for caching.
  // process.exit(1);
}
// Export db if needed in other backend files
export { db };
// =================================================================

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
  max: 10, // Increased from 2 to allow more requests
  message: { error: "Too many requests, please wait and try again." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply the limiter to chat and quiz endpoints only
app.use("/api/chat", apiLimiter);
app.use("/api/generate-quiz", apiLimiter);

// News endpoint - no rate limiting to allow frequent updates
app.get("/api/news", async (req, res) => {
  try {
    const {
      category = "general",
      page = 1,
      country = "us,in",
      max = 10,
    } = req.query;
    const apiKey = "23ab6517111b7f89ae1b385dde66dee5"; // Your new GNews API key

    console.log(
      `Fetching news: category=${category}, page=${page}, country=${country}, max=${max}`
    );

    const countries = country.split(",");
    let allArticles = [];

    for (const countryCode of countries) {
      try {
        const apiUrl = `https://gnews.io/api/v4/top-headlines?category=${category}&lang=en&country=${countryCode}&max=${max}&page=${page}&apikey=${apiKey}`;

        const response = await fetch(apiUrl, {
          method: "GET",
          headers: {
            "User-Agent": "EduGen-AI/1.0",
          },
          timeout: 10000,
        });

        if (!response.ok) {
          console.warn(
            `Failed to fetch news for ${countryCode}:`,
            response.status,
            response.statusText
          );
          continue;
        }

        const data = await response.json();

        if (
          data.articles &&
          Array.isArray(data.articles) &&
          data.articles.length > 0
        ) {
          const processedArticles = data.articles.map((article) => ({
            ...article,
            country: countryCode,
            // Ensure image URL is valid
            image:
              article.image && article.image !== "null" && article.image !== ""
                ? article.image
                : `https://picsum.photos/400/220?random=${Math.floor(
                    Math.random() * 1000
                  )}`,
          }));
          allArticles = [...allArticles, ...processedArticles];
        }
      } catch (countryError) {
        console.warn(
          `Error fetching news from ${countryCode}:`,
          countryError.message
        );
        continue;
      }
    }

    // Remove duplicates based on title and URL
    const uniqueArticles = allArticles.filter(
      (article, index, self) =>
        index ===
        self.findIndex(
          (a) => a.title === article.title || a.url === article.url
        )
    );

    // Sort by publication date (newest first)
    uniqueArticles.sort(
      (a, b) => new Date(b.publishedAt) - new Date(a.publishedAt)
    );

    console.log(
      `Successfully fetched ${uniqueArticles.length} unique articles`
    );

    res.json({
      articles: uniqueArticles,
      totalArticles: uniqueArticles.length,
      success: true,
    });
  } catch (error) {
    console.error("Error fetching news:", error.message);
    res.status(500).json({
      error: "Failed to fetch news",
      message: error.message,
      success: false,
    });
  }
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    version: "1.0.2", // Updated version to verify deployment
    timestamp: new Date().toISOString(),
    model: "google/gemma-3-27b-it:free", // Show which model we're using
  });
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    service: "EduGen Node.js Backend (Study Mode)",
    timestamp: new Date().toISOString(),
  });
});

// =============== MODIFIED ROUTE: Chat with Caching Logic ===============
app.post("/api/chat", async (req, res) => {
  try {
    const { message } = req.body;

    console.log("=== STUDY MODE REQUEST ===");
    console.log("Message received:", message);

    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ error: "Valid message is required." });
    }

    const studentQuestion = message.trim().toLowerCase();

    // 1. Fetch staff-posted topics from Firestore
    let isStaffTopic = false;
    try {
      const tasksDocRef = db.collection("tasks").doc("shared");
      const tasksDoc = await tasksDocRef.get();
      if (tasksDoc.exists) {
        const staffTasks = tasksDoc.data().tasks || [];
        const staffTopics = staffTasks.map((task) =>
          task.content.toLowerCase()
        );
        isStaffTopic = staffTopics.includes(studentQuestion);
      }
    } catch (dbError) {
      console.error("Error fetching staff topics from Firestore:", dbError);
      // Proceed without caching if Firestore read fails
    }

    // 2. Caching logic for staff-posted topics
    if (isStaffTopic) {
      const cacheKey = studentQuestion.replace(/[^a-zA-Z0-9]/g, "_"); // Sanitize topic for doc ID
      const cacheRef = db.collection("cached_responses").doc(cacheKey);

      const cachedDoc = await cacheRef.get();

      if (cachedDoc.exists) {
        console.log("✅ Cache HIT for topic:", studentQuestion);
        return res.status(200).json({ response: cachedDoc.data().response });
      }

      console.log("⚠️ Cache MISS for topic:", studentQuestion);
    } else {
      console.log("💬 Not a staff topic, fetching fresh response.");
    }

    // 3. If it's a cache miss or not a staff topic, call the AI API
    const promptContent = `You are EduGen AI 🎓, an expert educational assistant. Your goal is to provide clear, concise, and structured answers for exam preparation. Keep all explanations brief and to the point.

Follow this format strictly:
1.  **📌 Overview:** A 1-2 sentence summary.
2.  **🔑 Key Concepts:** Define 2-3 core concepts concisely.
3.  **🌍 Real-World Example:** Provide one brief, clear example.
4.  **🔗 Connections to Other Topics:** Briefly mention one related topic.
5.  **✨ Key Takeaway for Exams:** Conclude with a single, powerful sentence starting with "For your exam, remember that...".

Here are some trusted online resources you can include in your answer if relevant:
- GeeksforGeeks: https://www.geeksforgeeks.org/
- GeeksforGeeks Practice: https://www.geeksforgeeks.org/explore
- W3Schools: https://www.w3schools.com/
- YouTube: https://www.youtube.com/

Student's question: ${message}`;

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
          messages: [{ role: "user", content: promptContent }],
          temperature: 0.7,
        }),
        timeout: 120000,
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("OpenRouter API Error:", response.status, errText);
      throw new Error(errText || `OpenRouter Error: ${response.status}`);
    }

    const data = await response.json();
    const reply =
      data.choices?.[0]?.message?.content || "I couldn't generate a response.";

    // 4. If it was a staff topic, save the new response to the cache
    if (isStaffTopic) {
      const cacheKey = studentQuestion.replace(/[^a-zA-Z0-9]/g, "_");
      const cacheRef = db.collection("cached_responses").doc(cacheKey);
      try {
        await cacheRef.set({
          response: reply,
          topic: studentQuestion,
          createdAt: new Date().toISOString(),
        });
        console.log("💾 Cached new response for topic:", studentQuestion);
      } catch (dbError) {
        console.error("Error saving response to cache:", dbError);
      }
    }

    console.log("Response sent, length:", reply?.length);
    res.status(200).json({ response: reply });
  } catch (error) {
    console.error("=== STUDY MODE ERROR ===");
    console.error("Error message:", error.message);
    res.status(500).json({
      error: "Failed to get response from AI. Please try again.",
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
    console.log("Using quiz model: google/gemma-3-27b-it:free");

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

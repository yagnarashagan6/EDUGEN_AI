import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { createClient } from '@supabase/supabase-js';

dotenv.config();

// =============== SUPABASE INITIALIZATION ===============
let supabase = null;
let cachingEnabled = false;

try {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseKey) {
    supabase = createClient(supabaseUrl, supabaseKey);
    cachingEnabled = true;
    console.log("✅ Supabase initialized - caching enabled");
  } else {
    console.log("ℹ️ Supabase not configured - caching disabled (server will work normally)");
  }
} catch (error) {
  console.warn("⚠️ Supabase initialization failed - caching disabled:", error.message);
  cachingEnabled = false;
}

export { supabase, cachingEnabled };
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

    // 1. Fetch staff-posted topics from Supabase (only if Supabase is enabled)
    let isStaffTopic = false;
    if (cachingEnabled && supabase) {
      try {
        const { data: tasksData, error } = await supabase
          .from('tasks')
          .select('tasks')
          .eq('id', 'shared')
          .single();

        if (!error && tasksData) {
          const staffTasks = tasksData.tasks || [];
          const staffTopics = staffTasks.map((task) =>
            task.content.toLowerCase()
          );
          isStaffTopic = staffTopics.includes(studentQuestion);
        }
      } catch (dbError) {
        console.error("Error fetching staff topics from Supabase:", dbError);
        // Proceed without caching if Supabase read fails
      }
    }

    // 2. Caching logic for staff-posted topics (only if Supabase is enabled)
    if (cachingEnabled && supabase && isStaffTopic) {
      const cacheKey = studentQuestion.replace(/[^a-zA-Z0-9]/g, "_"); // Sanitize topic for cache key

      try {
        const { data: cachedData, error } = await supabase
          .from('cached_responses')
          .select('response')
          .eq('topic', studentQuestion)
          .single();

        if (!error && cachedData) {
          console.log("✅ Cache HIT for topic:", studentQuestion);
          return res.status(200).json({ response: cachedData.response });
        }

        console.log("⚠️ Cache MISS for topic:", studentQuestion);
      } catch (cacheError) {
        console.warn("Cache read failed:", cacheError.message);
      }
    } else if (!cachingEnabled) {
      console.log("💬 Caching disabled, fetching fresh response.");
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

    // 4. If it was a staff topic, save the new response to the cache (only if Supabase is enabled)
    if (cachingEnabled && supabase && isStaffTopic) {
      try {
        const { error } = await supabase
          .from('cached_responses')
          .upsert({
            topic: studentQuestion,
            response: reply,
            created_at: new Date().toISOString(),
          }, {
            onConflict: 'topic'
          });

        if (error) throw new Error(error.message || JSON.stringify(error));
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
   - "subtopic": The specific subtopic (if applicable, else topic)
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
      if (!q.options.includes(q.correctAnswer)) {
        throw new Error(
          `Question ${i + 1} correctAnswer doesn't match any option`
        );
      }
      return {
        text: q.text.trim(),
        options: q.options.map((opt) => opt.trim()),
        correctAnswer: q.correctAnswer.trim(),
        explanation: q.explanation ? q.explanation.trim() : "",
        subtopic: q.subtopic ? q.subtopic.trim() : (subtopic || topic) // Fallback to provided subtopic/topic
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

// =============== RAG API PROXY ENDPOINTS ===============
const RAG_API_URL = process.env.RAG_API_URL || 'http://localhost:5000';

// List available PDFs
app.get("/api/rag/list-pdfs", async (req, res) => {
  try {
    const response = await fetch(`${RAG_API_URL}/api/rag/list-pdfs`);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("Error fetching PDF list:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Generate 16-mark answer using RAG
app.post("/api/rag/generate-answer", async (req, res) => {
  try {
    const { topic, subtopic, pdf_name } = req.body;
    
    if (!topic || !pdf_name) {
      return res.status(400).json({ 
        success: false, 
        error: "Topic and PDF name are required" 
      });
    }

    console.log(`Generating RAG answer for topic: ${topic}, PDF: ${pdf_name}`);

    const response = await fetch(`${RAG_API_URL}/api/rag/generate-answer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ topic, subtopic, pdf_name }),
      timeout: 60000, // 60 second timeout for RAG processing
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `RAG API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Cache the answer in Supabase if caching is enabled
    if (cachingEnabled && supabase && data.success) {
      try {
        const cacheKey = `${topic}_${subtopic || 'general'}`.toLowerCase().replace(/[^a-z0-9]/g, '_');
        await supabase
          .from('rag_answers')
          .upsert({
            topic: topic,
            subtopic: subtopic || null,
            pdf_name: pdf_name,
            answer: data.answer,
            sources: data.sources || [],
            created_at: new Date().toISOString(),
          }, {
            onConflict: 'topic,subtopic'
          });
        console.log(`✅ Cached RAG answer for: ${topic}`);
      } catch (cacheError) {
        console.warn("Failed to cache RAG answer:", cacheError);
      }
    }

    res.json(data);
  } catch (error) {
    console.error("Error generating RAG answer:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get cached RAG answer
app.post("/api/rag/get-cached-answer", async (req, res) => {
  try {
    if (!cachingEnabled || !supabase) {
      return res.status(503).json({ 
        success: false, 
        error: "Caching not enabled" 
      });
    }

    const { topic, subtopic } = req.body;
    
    let query = supabase
      .from('rag_answers')
      .select('*')
      .eq('topic', topic);
    
    if (subtopic) {
      query = query.eq('subtopic', subtopic);
    } else {
      query = query.is('subtopic', null);
    }

    const { data, error } = await query.single();

    if (error || !data) {
      return res.json({ success: false, cached: false });
    }

    res.json({ 
      success: true, 
      cached: true,
      answer: data.answer,
      sources: data.sources,
      pdf_name: data.pdf_name,
      created_at: data.created_at
    });
  } catch (error) {
    console.error("Error fetching cached answer:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});
// =================================================================

// Secure server-side upsert route for student data to bypass RLS when needed
app.post("/api/upsert-student", async (req, res) => {
  try {
    const secret = req.headers["x-service-secret"] || req.headers["X-Service-Secret"];
    if (!process.env.SERVICE_SECRET || secret !== process.env.SERVICE_SECRET) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { id, data } = req.body;
    if (!id || !data) {
      return res.status(400).json({ error: "Missing id or data" });
    }

    // Map camelCase to snake_case for students table
    const updateData = { id };
    if (data.name !== undefined) updateData.name = data.name;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.displayName !== undefined) updateData.name = data.displayName;
    if (data.dob !== undefined) updateData.dob = data.dob;
    if (data.streak !== undefined) updateData.streak = data.streak;
    if (data.progress !== undefined) updateData.progress = data.progress;
    if (data.quizCount !== undefined) updateData.quiz_count = data.quizCount;
    if (data.lastLogin !== undefined) updateData.last_login = data.lastLogin;
    if (data.photoURL !== undefined) updateData.photo_url = data.photoURL;
    if (data.image !== undefined) updateData.image = data.image;
    if (data.totalTimeSpentInMs !== undefined)
      updateData.total_time_spent_ms = data.totalTimeSpentInMs;
    if (data.dailySessions !== undefined)
      updateData.daily_sessions = data.dailySessions;
    if (data.formFilled !== undefined) updateData.form_filled = data.formFilled;
    if (data.regNumber !== undefined) updateData.reg_number = data.regNumber;
    if (data.rollNumber !== undefined) updateData.roll_number = data.rollNumber;
    if (data.department !== undefined) updateData.department = data.department;
    if (data.gender !== undefined) updateData.gender = data.gender;
    if (data.bloodGroup !== undefined) updateData.blood_group = data.bloodGroup;
    if (data.studentContact !== undefined) updateData.student_contact = data.studentContact;

    updateData.updated_at = new Date().toISOString();

    const { error } = await supabase.from("students").upsert(updateData, { onConflict: "email" });
    if (error) {
      console.error("Server upsert error:", error);
      return res.status(500).json({ error: error.message || JSON.stringify(error) });
    }

    return res.json({ success: true });
  } catch (err) {
    console.error("/api/upsert-student failed:", err.message || err);
    return res.status(500).json({ error: err.message || String(err) });
  }
});

// =============== ADAPTIVE QUIZ ENDPOINTS ===============
import adaptiveQuizService from './adaptiveQuizService.js';

// Generate baseline quiz (Agent 1)
app.post("/api/quiz/generate", async (req, res) => {
  try {
    const { topic, subtopics, difficulty, questionCount, cognitiveLevel, pdf_name } = req.body;

    if (!topic || !questionCount) {
      return res.status(400).json({
        success: false,
        error: "Topic and question count are required",
      });
    }

    console.log(`Generating quiz: ${topic}, ${questionCount} questions, ${difficulty} difficulty${pdf_name ? `, using PDF: ${pdf_name}` : ''}`);

    // Strategies: RAG (if PDF) -> Pure AI (Fallback)
    
    if (pdf_name) {
        try {
            console.log(`Attempting RAG generation with ${pdf_name}...`);
            const ragResponse = await fetch(`${RAG_API_URL}/api/rag/generate-quiz`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    topic,
                    subtopic: subtopics ? subtopics[0] : "", // RAG API expects single subtopic string or uses query
                    pdf_name,
                    difficulty,
                    question_count: parseInt(questionCount),
                    cognitive_level: cognitiveLevel
                }),
                timeout: 60000 // 60s timeout for RAG
            });
            
            if (ragResponse.ok) {
                const ragData = await ragResponse.json();
                if (ragData.success && ragData.questions && ragData.questions.length > 0) {
                    console.log("✅ RAG Quiz Generation Successful");
                    return res.json({
                        success: true,
                        questions: ragData.questions,
                        source: "RAG (" + pdf_name + ")",
                        context: ragData.context || '',  // Pass through context for admin
                        chunks_found: ragData.chunks_found || 0  // Pass through chunks for admin
                    });
                } else {
                    console.warn(`RAG Generation returned success=false: ${ragData.error}. Falling back to Pure AI.`);
                }
            } else {
                 console.warn(`RAG API returned status ${ragResponse.status}. Falling back to Pure AI.`);
            }
        } catch (ragError) {
             console.error("RAG Quiz Generation Error:", ragError.message);
             console.log("Falling back to Pure AI...");
        }
    }

    // Fallback or Default: Pure AI Generation
    const result = await adaptiveQuizService.generateMCQs({
      topic,
      subtopics: subtopics || [],
      difficulty: difficulty || "medium",
      questionCount: parseInt(questionCount),
      cognitiveLevel: cognitiveLevel || "application",
    });

    res.json(result);
  } catch (error) {
    console.error("Quiz generation error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Save quiz to database
app.post("/api/quiz/save", async (req, res) => {
  try {
    if (!cachingEnabled || !supabase) {
      return res.status(503).json({
        success: false,
        error: "Database not available",
      });
    }

    const { title, topic, subtopic, difficulty, questionCount, questions, quizType, staffId } = req.body;

    if (!title || !topic || !questions || !staffId) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields",
      });
    }

    const { data, error } = await supabase
      .from("quizzes")
      .insert({
        title,
        topic,
        subtopic,
        difficulty,
        question_count: questionCount,
        questions,
        quiz_type: quizType || "general",
        staff_id: staffId,
        is_published: false,
      })
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      quiz: data,
    });
  } catch (error) {
    console.error("Save quiz error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Publish quiz
app.post("/api/quiz/publish/:quizId", async (req, res) => {
  try {
    if (!cachingEnabled || !supabase) {
      return res.status(503).json({
        success: false,
        error: "Database not available",
      });
    }

    const { quizId } = req.params;

    const { data, error } = await supabase
      .from("quizzes")
      .update({
        is_published: true,
        published_at: new Date().toISOString(),
      })
      .eq("id", quizId)
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      quiz: data,
    });
  } catch (error) {
    console.error("Publish quiz error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Get all quizzes for staff
app.get("/api/quiz/list/:staffId", async (req, res) => {
  try {
    if (!cachingEnabled || !supabase) {
      return res.status(503).json({
        success: false,
        error: "Database not available",
      });
    }

    const { staffId } = req.params;

    const { data, error } = await supabase
      .from("quizzes")
      .select("*")
      .eq("staff_id", staffId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      quizzes: data || [],
    });
  } catch (error) {
    console.error("List quizzes error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Get published quizzes for students
app.get("/api/quiz/published", async (req, res) => {
  try {
    if (!cachingEnabled || !supabase) {
      return res.status(503).json({
        success: false,
        error: "Database not available",
      });
    }

    const { data, error } = await supabase
      .from("quizzes")
      .select("*")
      .eq("is_published", true)
      .order("published_at", { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      quizzes: data || [],
    });
  } catch (error) {
    console.error("Get published quizzes error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Submit quiz attempt
app.post("/api/quiz/submit", async (req, res) => {
  try {
    if (!cachingEnabled || !supabase) {
      return res.status(503).json({
        success: false,
        error: "Database not available",
      });
    }

    const { quizId, studentId, studentName, answers, timeTaken } = req.body;

    if (!quizId || !studentId || !answers) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields",
      });
    }

    // Get quiz to check answers
    const { data: quiz, error: quizError } = await supabase
      .from("quizzes")
      .select("*")
      .eq("id", quizId)
      .single();

    if (quizError) throw quizError;

    // Calculate score
    let score = 0;
    const processedAnswers = answers.map((answer, index) => {
      const question = quiz.questions[index];
      const isCorrect = answer.selectedAnswer === question.correctAnswer;
      if (isCorrect) score++;
      return {
        questionIndex: index,
        selectedAnswer: answer.selectedAnswer,
        isCorrect,
      };
    });

    // Calculate answer format
    const answerFormat = adaptiveQuizService.calculateAnswerFormat(processedAnswers);

    // Save attempt
    const { data: attempt, error: attemptError } = await supabase
      .from("quiz_attempts")
      .insert({
        quiz_id: quizId,
        student_id: studentId,
        student_name: studentName,
        answers: processedAnswers,
        answer_format: answerFormat,
        score,
        total_questions: quiz.question_count,
        time_taken_seconds: timeTaken,
      })
      .select()
      .single();

    if (attemptError) throw attemptError;

    // Calculate performance metrics
    const abilityEstimate = adaptiveQuizService.calculateAbilityEstimate(
      score,
      quiz.question_count,
      quiz.difficulty
    );

    const confidenceLevel = adaptiveQuizService.calculateConfidenceLevel(
      processedAnswers,
      quiz.difficulty
    );

    // Save performance data
    const { error: perfError } = await supabase
      .from("student_performance")
      .upsert({
        student_id: studentId,
        quiz_id: quizId,
        topic: quiz.topic,
        subtopic: quiz.subtopic,
        difficulty: quiz.difficulty,
        score,
        total_questions: quiz.question_count,
        percentage: (score / quiz.question_count) * 100,
        ability_estimate: abilityEstimate,
        confidence_level: confidenceLevel,
      });

    if (perfError) console.warn("Performance save error:", perfError);

    res.json({
      success: true,
      attempt,
      score,
      totalQuestions: quiz.question_count,
      percentage: (score / quiz.question_count) * 100,
      answerFormat,
    });
  } catch (error) {
    console.error("Submit quiz error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Analyze performance and group students (Agent 2)
app.post("/api/quiz/analyze/:quizId", async (req, res) => {
  try {
    if (!cachingEnabled || !supabase) {
      return res.status(503).json({
        success: false,
        error: "Database not available",
      });
    }

    const { quizId } = req.params;

    // Get all attempts for this quiz
    const { data: attempts, error: attemptsError } = await supabase
      .from("quiz_attempts")
      .select("*")
      .eq("quiz_id", quizId);

    if (attemptsError) throw attemptsError;

    if (!attempts || attempts.length === 0) {
      return res.json({
        success: true,
        message: "No attempts to analyze",
        analysis: [],
      });
    }

    // Get quiz details
    const { data: quiz, error: quizError } = await supabase
      .from("quizzes")
      .select("*")
      .eq("id", quizId)
      .single();

    if (quizError) throw quizError;

    // Prepare data for Agent 2
    const quizAttempts = attempts.map(attempt => ({
      studentId: attempt.student_id,
      studentName: attempt.student_name,
      answerFormat: attempt.answer_format,
      score: attempt.score,
      totalQuestions: attempt.total_questions,
      answers: attempt.answers,
      timeTaken: attempt.time_taken_seconds,
    }));

    console.log(`Analyzing ${attempts.length} attempts for quiz ${quizId}`);

    // Call Agent 2
    const analysisResult = await adaptiveQuizService.analyzePerformanceAndGroup(quizAttempts);

    if (!analysisResult.success) {
      throw new Error(analysisResult.error);
    }

    // Save student groups
    const groupInserts = analysisResult.analysis.map(student => ({
      quiz_id: quizId,
      student_id: student.studentId,
      student_name: student.studentName,
      answer_format: student.answerFormat,
      group_type: student.groupType,
      performance_score: student.overallScore,
      subtopic_scores: student.subtopicScores,
    }));

    const { error: groupError } = await supabase
      .from("student_groups")
      .upsert(groupInserts, { onConflict: "quiz_id,student_id" });

    if (groupError) console.warn("Group save error:", groupError);

    // Update performance with strengths/weaknesses
    for (const student of analysisResult.analysis) {
      await supabase
        .from("student_performance")
        .update({
          strengths: student.strengths,
          weaknesses: student.weaknesses,
          ability_estimate: student.abilityEstimate,
          confidence_level: student.confidenceLevel,
        })
        .eq("student_id", student.studentId)
        .eq("quiz_id", quizId);
    }

    res.json({
      success: true,
      analysis: analysisResult.analysis,
      groupSummary: analysisResult.groupSummary,
      answerFormatAnalysis: analysisResult.answerFormatAnalysis,
    });
  } catch (error) {
    console.error("Analyze performance error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Get student groups for a quiz
app.get("/api/quiz/groups/:quizId", async (req, res) => {
  try {
    if (!cachingEnabled || !supabase) {
      return res.status(503).json({
        success: false,
        error: "Database not available",
      });
    }

    const { quizId } = req.params;

    const { data, error } = await supabase
      .from("student_groups")
      .select("*")
      .eq("quiz_id", quizId)
      .order("performance_score", { ascending: false });

    if (error) throw error;

    // Group by type
    const grouped = {
      strength: data.filter(s => s.group_type === "strength"),
      average: data.filter(s => s.group_type === "average"),
      weakness: data.filter(s => s.group_type === "weakness"),
    };

    res.json({
      success: true,
      groups: grouped,
      total: data.length,
    });
  } catch (error) {
    console.error("Get groups error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Generate adaptive quiz for a group (Agent 3)
app.post("/api/quiz/adaptive", async (req, res) => {
  try {
    if (!cachingEnabled || !supabase) {
      return res.status(503).json({
        success: false,
        error: "Database not available",
      });
    }

    const { baselineQuizId, groupType, staffId } = req.body;

    if (!baselineQuizId || !groupType || !staffId) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields",
      });
    }

    // Get baseline quiz
    const { data: baselineQuiz, error: quizError } = await supabase
      .from("quizzes")
      .select("*")
      .eq("id", baselineQuizId)
      .single();

    if (quizError) throw quizError;

    // Get group performance
    const { data: groupStudents, error: groupError } = await supabase
      .from("student_groups")
      .select("*")
      .eq("quiz_id", baselineQuizId)
      .eq("group_type", groupType);

    if (groupError) throw groupError;

    if (!groupStudents || groupStudents.length === 0) {
      return res.status(404).json({
        success: false,
        error: `No students found in ${groupType} group`,
      });
    }

    // Calculate aggregate performance
    const avgScore = groupStudents.reduce((sum, s) => sum + s.performance_score, 0) / groupStudents.length;
    const allSubtopicScores = groupStudents.reduce((acc, s) => {
      Object.entries(s.subtopic_scores || {}).forEach(([subtopic, score]) => {
        if (!acc[subtopic]) acc[subtopic] = [];
        acc[subtopic].push(score);
      });
      return acc;
    }, {});

    const subtopicAvgs = Object.entries(allSubtopicScores).reduce((acc, [subtopic, scores]) => {
      acc[subtopic] = scores.reduce((sum, s) => sum + s, 0) / scores.length;
      return acc;
    }, {});

    // Identify strengths and weaknesses
    const strengths = Object.entries(subtopicAvgs)
      .filter(([_, score]) => score >= 80)
      .map(([subtopic]) => subtopic);
    
    const weaknesses = Object.entries(subtopicAvgs)
      .filter(([_, score]) => score < 50)
      .map(([subtopic]) => subtopic);

    const groupPerformance = {
      avgScore,
      strengths,
      weaknesses,
      subtopicScores: subtopicAvgs,
    };

    console.log(`Generating adaptive quiz for ${groupType} group (${groupStudents.length} students)`);

    // Call Agent 3
    const adaptiveResult = await adaptiveQuizService.generateAdaptiveQuiz({
      topic: baselineQuiz.topic,
      subtopics: baselineQuiz.subtopic ? [baselineQuiz.subtopic] : [],
      groupType,
      groupPerformance,
      baselineQuizData: baselineQuiz,
    });

    if (!adaptiveResult.success) {
      throw new Error(adaptiveResult.error);
    }

    // Save adaptive quiz
    const { data: newQuiz, error: saveError } = await supabase
      .from("quizzes")
      .insert({
        title: `${baselineQuiz.title} - Adaptive (${groupType})`,
        topic: baselineQuiz.topic,
        subtopic: baselineQuiz.subtopic,
        difficulty: adaptiveResult.metadata.difficulty,
        question_count: adaptiveResult.questions.length,
        questions: adaptiveResult.questions,
        quiz_type: "adaptive",
        parent_quiz_id: baselineQuizId,
        target_group: groupType,
        staff_id: staffId,
        is_published: false,
      })
      .select()
      .single();

    if (saveError) throw saveError;

    res.json({
      success: true,
      quiz: newQuiz,
      questions: adaptiveResult.questions,
      adaptiveStrategy: adaptiveResult.adaptiveStrategy,
      groupPerformance,
    });
  } catch (error) {
    console.error("Generate adaptive quiz error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Get student performance summary
app.get("/api/quiz/performance/:studentId", async (req, res) => {
  try {
    if (!cachingEnabled || !supabase) {
      return res.status(503).json({
        success: false,
        error: "Database not available",
      });
    }

    const { studentId } = req.params;

    const { data, error } = await supabase
      .from("student_performance")
      .select("*")
      .eq("student_id", studentId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      performance: data || [],
    });
  } catch (error) {
    console.error("Get performance error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Get detailed performance data for a specific quiz
app.get("/api/quiz/performance-details/:quizId", async (req, res) => {
  try {
    if (!cachingEnabled || !supabase) {
      return res.status(503).json({
        success: false,
        error: "Database not available",
      });
    }

    const { quizId } = req.params;

    // Get quiz details
    const { data: quiz, error: quizError } = await supabase
      .from("quizzes")
      .select("*")
      .eq("id", quizId)
      .single();

    if (quizError) throw quizError;

    // Get all quiz attempts for this quiz
    const { data: attempts, error: attemptsError } = await supabase
      .from("quiz_attempts")
      .select("*")
      .eq("quiz_id", quizId)
      .order("submitted_at", { ascending: false });

    if (attemptsError) throw attemptsError;

    if (!attempts || attempts.length === 0) {
      return res.json({
        success: true,
        performance: [],
      });
    }

    // Calculate subtopic-based performance for each student
    const performanceData = attempts.map(attempt => {
      const subtopicScores = {};
      const subtopicCounts = {};
      
      // Calculate score per subtopic
      attempt.answers.forEach((answer, index) => {
        const question = quiz.questions[index];
        if (question && question.subtopic) {
          const subtopic = question.subtopic;
          if (!subtopicScores[subtopic]) {
            subtopicScores[subtopic] = 0;
            subtopicCounts[subtopic] = 0;
          }
          subtopicCounts[subtopic]++;
          if (answer.isCorrect) {
            subtopicScores[subtopic]++;
          }
        }
      });

      // Convert to percentages
      const subtopicPercentages = {};
      Object.keys(subtopicScores).forEach(subtopic => {
        subtopicPercentages[subtopic] = (subtopicScores[subtopic] / subtopicCounts[subtopic]) * 100;
      });

      // Identify strengths and weaknesses
      const strengths = [];
      const weaknesses = [];
      Object.entries(subtopicPercentages).forEach(([subtopic, percentage]) => {
        if (percentage >= 80) {
          strengths.push(subtopic);
        } else if (percentage < 50) {
          weaknesses.push(subtopic);
        }
      });

      return {
        student_name: attempt.student_name,
        student_id: attempt.student_id,
        score: attempt.score,
        total_questions: attempt.total_questions,
        percentage: (attempt.score / attempt.total_questions) * 100,
        answer_format: attempt.answer_format,
        strengths,
        weaknesses,
        subtopic_scores: subtopicPercentages,
        submitted_at: attempt.submitted_at,
      };
    });

    res.json({
      success: true,
      performance: performanceData,
    });
  } catch (error) {
    console.error("Get performance details error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});
// =================================================================

// 404 Handler
app.all("*", (req, res) => {
  res.status(404).json({ error: "Not Found" });
});

// Start server
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`EduGen backend listening on port ${PORT}`);
});

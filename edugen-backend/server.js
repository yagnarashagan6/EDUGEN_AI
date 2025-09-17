import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { GoogleGenerativeAI } from "@google/generative-ai";
import pdfParse from "pdf-parse";
import mammoth from "mammoth";

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

// Prompts
const STUDY_SYSTEM_PROMPT = `You are EduGen AI 🎓, a comprehensive educational assistant for students. When explaining topics, follow these guidelines:

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

🔗 EDUCATIONAL RESOURCES: Always provide actual clickable links to relevant resources:
• **YouTube Videos:** Include real YouTube links to specific educational videos related to the topic
• **GeeksforGeeks:** Provide direct links to relevant GeeksforGeeks articles[](https://www.geeksforgeeks.org/)
• **W3Schools:** Include links to relevant W3Schools tutorials[](https://www.w3schools.com/)
• **Khan Academy:** Link to specific Khan Academy lessons when applicable[](https://www.khanacademy.org/)
• **Other Educational Sites:** Include links to Wikipedia, educational websites, and online courses

🔗 RESOURCE FORMAT:
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

CRITICAL: NEVER write "undefined" in any link. Use real URLs like:
- [GeeksforGeeks](https://www.geeksforgeeks.org/)
- [W3Schools](https://www.w3schools.com/) 
- [Khan Academy](https://www.khanacademy.org/)
- [YouTube](https://www.youtube.com/)
`;

const TALK_MODE_PROMPT =
  "You are a casual, friendly assistant. Respond like you're having a normal conversation with a friend. DO NOT use any educational formatting. DO NOT use bullet points. DO NOT use emojis. DO NOT use structured responses. DO NOT give detailed explanations unless specifically asked. Just give a simple, brief, conversational answer. Keep it short and natural.";

const RESUME_ANALYSIS_PROMPT = `
You are an expert HR hiring manager. Analyze the following resume.
Provide a very "short and sweet" analysis. Be direct and use concise language.

**📄 ATS Score & Feedback:**
Give a score out of 100 and a brief, one-sentence explanation.

**👍 Strengths:**
List 2 key strengths in a bulleted list.

**👎 Weaknesses:**
List 2 major weaknesses in a bulleted list.

**💡 Recommendations:**
Provide 2 actionable recommendations in a bulleted list.
`;

const GENERAL_DOC_PROMPT = `
Use the provided document context to give a short and sweet answer to the user's question. Be direct and concise.

--- DOCUMENT CONTEXT ---
{document_text}
--- END CONTEXT ---

User's Question: {user_question}
`;

const RESOURCE_LINKS = `
Here are some trusted online resources you can include in your answer if relevant:
- GeeksforGeeks: https://www.geeksforgeeks.org/
- GeeksforGeeks Practice: https://www.geeksforgeeks.org/explore
- W3Schools: https://www.w3schools.com/
- YouTube: https://www.youtube.com/
`;

// Function to extract text from file
async function extractTextFromFile(fileData, filename) {
  try {
    const base64Data = fileData.split(",")[1];
    const buffer = Buffer.from(base64Data, "base64");
    if (filename.endsWith(".pdf")) {
      const data = await pdfParse(buffer);
      return data.text;
    } else if (filename.endsWith(".docx")) {
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    }
    return null;
  } catch (e) {
    console.error("Error extracting text:", e);
    return null;
  }
}

// Function to get AI response with fallback
async function getAIResponse(fullPrompt) {
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
    "HTTP-Referer": "https://edugen-ai-zeta.vercel.app",
    "X-Title": "EduGen AI",
  };
  const body = {
    model: "google/gemma-2-27b-it:free", // Adjusted to valid model; change if needed
    messages: [
      {
        role: "user",
        content: fullPrompt,
      },
    ],
    temperature: 0.7,
  };

  try {
    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        timeout: 120000,
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      if (
        response.status === 429 ||
        errText.includes("quota") ||
        errText.includes("rate limit")
      ) {
        console.log("OpenRouter quota exceeded, falling back to Gemini.");
        return await getGeminiResponse(fullPrompt);
      }
      throw new Error(errText || `OpenRouter Error: ${response.status}`);
    }

    const data = await response.json();
    return (
      data.choices?.[0]?.message?.content || "I couldn't generate a response."
    );
  } catch (error) {
    throw error;
  }
}

// Gemini fallback function
async function getGeminiResponse(fullPrompt) {
  const genai = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
  const model = genai.getGenerativeModel({ model: "gemini-1.5-flash" });
  const result = await model.generateContent(fullPrompt);
  return result.response.text();
}

// Route 1: Chat
app.post("/api/chat", async (req, res) => {
  try {
    const { message, mode = "study", fileData, filename } = req.body;

    if (!message) {
      return res.status(400).json({ error: "No message provided." });
    }

    if (
      message.toLowerCase().includes("time") ||
      message.toLowerCase().includes("date")
    ) {
      const now = new Date();
      const formatted = now.toLocaleString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "numeric",
        hour12: true,
      });
      return res.json({
        response: `The current date and time is ${formatted}.`,
      });
    }

    let extractedText = null;
    if (fileData && filename) {
      extractedText = await extractTextFromFile(fileData, filename);
      if (!extractedText) {
        return res.json({
          response: "Sorry, I could not read the content of the document.",
        });
      }
    }

    let fullPrompt = "";
    if (extractedText) {
      const classificationPrompt = `Is the following text a resume or CV? Answer with only 'yes' or 'no'.\n\n${extractedText.substring(
        0,
        1000
      )}`;
      const classFullPrompt = `${TALK_MODE_PROMPT}\n\n${classificationPrompt}`;
      const isResumeResponse = await getAIResponse(classFullPrompt);
      if (isResumeResponse.toLowerCase().includes("yes")) {
        fullPrompt = `${RESUME_ANALYSIS_PROMPT}\n\n--- RESUME CONTENT ---\n${extractedText}`;
      } else {
        const docContext = GENERAL_DOC_PROMPT.replace(
          "{document_text}",
          extractedText
        ).replace("{user_question}", message);
        if (mode === "study") {
          fullPrompt = `${STUDY_SYSTEM_PROMPT}\n\n${docContext}\n\nPlease include relevant links from the following list if they help explain the topic:\n${RESOURCE_LINKS}`;
        } else {
          // Talk mode for documents - simple response
          fullPrompt = `${TALK_MODE_PROMPT}\n\n${docContext}\n\nIMPORTANT: Give only a brief, casual answer like you're texting a friend. No educational formatting, no structure, no detailed explanations.`;
        }
      }
    } else {
      if (mode === "study") {
        fullPrompt = `${STUDY_SYSTEM_PROMPT}\n\nStudent's question: ${message}`;
      } else {
        // Talk mode - simple conversational response
        fullPrompt = `${TALK_MODE_PROMPT}\n\nQuestion: ${message}\n\nIMPORTANT: Give only a brief, casual response like you're texting a friend. No educational content, no detailed explanations, no structure, no emojis.`;
      }
    }

    const reply = await getAIResponse(fullPrompt);
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

  const quizSystemPrompt = `You are a quiz generator 📝. Generate engaging quiz questions using subject-relevant emojis in the question text (e.g., 🧮 for math, 🧪 for science, 🌍 for geography, etc.). Return only valid JSON arrays with quiz questions in the exact specified format. Do not include any additional text or explanations. Format the questions with emojis where appropriate, but ensure the options remain clearly marked with A), B), C), D).`;

  const fullQuizPrompt = `${quizSystemPrompt}\n\n${prompt}`;

  try {
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "HTTP-Referer": "https://edugen-ai-zeta.vercel.app",
      "X-Title": "EduGen AI",
    };
    const body = {
      model: "google/gemma-2-27b-it:free", // Adjusted to valid model
      messages: [
        {
          role: "user",
          content: fullQuizPrompt,
        },
      ],
      temperature: 0.7,
    };

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        timeout: 120000,
      }
    );

    let content;
    if (!response.ok) {
      const errText = await response.text();
      if (
        response.status === 429 ||
        errText.includes("quota") ||
        errText.includes("rate limit")
      ) {
        console.log(
          "OpenRouter quota exceeded for quiz, falling back to Gemini."
        );
        content = await getGeminiResponse(fullQuizPrompt);
      } else {
        console.error("OpenRouter API Error:", response.status, errText);
        throw new Error(`API Error: ${response.status} - ${errText}`);
      }
    } else {
      const data = await response.json();
      content = data.choices?.[0]?.message?.content?.trim();
    }

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

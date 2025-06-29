import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

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

    if (!response.ok) throw new Error(await response.text());

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
  const { topic, count } = req.body;

  const prompt = `Generate exactly ${count} multiple choice quiz questions on the topic "${topic}". Each question must strictly follow this format:
- A question text
- Exactly four options prefixed with A), B), C), D)
- One correct answer exactly matching one of the options
Return JSON like:
[
  {
    "text": "Sample question?",
    "options": ["A) Option 1", "B) Option 2", "C) Option 3", "D) Option 4"],
    "correctAnswer": "B) Option 2"
  }
]`;

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
                "You are EduGen AI, a helpful assistant for students. Generate educational quiz questions in the exact JSON format specified, ensuring clear and accurate content.",
            },
            { role: "user", content: prompt },
          ],
          temperature: 0.7, // Match chat route's temperature for consistency
        }),
        timeout: 120000, // Match chat route's timeout
      }
    );

    if (!response.ok) throw new Error(await response.text());

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content?.trim();

    if (!content) throw new Error("Empty response from AI");

    // Strip code block if present
    if (content.startsWith("```")) {
      content = content
        .replace(/^```[a-zA-Z]*\n/, "")
        .replace(/```$/, "")
        .trim();
    }

    const start = content.indexOf("[");
    const end = content.lastIndexOf("]");
    if (start === -1 || end === -1)
      throw new Error("AI response is not valid JSON");

    const quizJson = content.substring(start, end + 1);
    const parsed = JSON.parse(quizJson);

    const validated = parsed.map((q, i) => {
      if (!q.text || !q.options || !q.correctAnswer)
        throw new Error(`Invalid question at index ${i}`);
      if (q.options.length !== 4)
        throw new Error(`Question ${i + 1} does not have exactly 4 options`);
      if (!q.options.includes(q.correctAnswer))
        throw new Error(`Correct answer mismatch at question ${i + 1}`);
      return q;
    });

    res.json({ questions: validated });
  } catch (err) {
    console.error("Quiz generation error:", err.message);
    res
      .status(500)
      .json({ error: "Failed to generate quiz", message: err.message });
  }
});

// 404 Handler
app.all("*", (req, res) => {
  res.status(404).json({ error: "Not Found" });
});

// Start server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Unified backend listening on port ${PORT}`);
});

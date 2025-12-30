// Adaptive Quiz Service using Groq API
// Three AI Agents for quiz generation, performance analysis, and adaptive quiz creation

import Groq from "groq-sdk";

const GROQ_API_KEY = "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";

const groq = new Groq({
  apiKey: GROQ_API_KEY,
});

// ============================================
// AGENT 1: MCQ Generation Agent
// ============================================
export async function generateMCQs({
  topic,
  subtopics = [],
  difficulty = "medium",
  questionCount = 5,
  cognitiveLevel = "application",
}) {
  try {
    const subtopicList = subtopics.length > 0 ? subtopics.join(", ") : topic;
    
    const prompt = `You are an expert educational assessment designer. Generate exactly ${questionCount} high-quality multiple-choice questions (MCQs) for the following:

**Topic**: ${topic}
**Subtopics**: ${subtopicList}
**Difficulty Level**: ${difficulty}
**Cognitive Level**: ${cognitiveLevel}

**Requirements**:
1. Each question must have:
   - A clear, unambiguous question text
   - Exactly 4 options labeled A), B), C), D)
   - One correct answer
   - Plausible distractors (wrong options that seem reasonable)

2. Difficulty guidelines:
   - **Easy**: Direct recall, basic concepts
   - **Medium**: Application of concepts, moderate complexity
   - **Hard**: Transfer of knowledge, complex scenarios, multi-step reasoning

3. Cognitive level guidelines:
   - **Recall**: Remember facts, definitions, formulas
   - **Application**: Apply concepts to solve problems
   - **Transfer**: Apply knowledge to new, unfamiliar situations

4. Return ONLY a valid JSON array with this exact structure:
[
  {
    "text": "Question text here",
    "options": ["A) Option 1", "B) Option 2", "C) Option 3", "D) Option 4"],
    "correctAnswer": "B) Option 2",
    "subtopic": "${subtopics[0] || topic}",
    "difficulty": "${difficulty}",
    "cognitiveLevel": "${cognitiveLevel}",
    "explanation": "Brief explanation of why the correct answer is right"
  }
]

Generate ${questionCount} questions now. Return ONLY the JSON array, no additional text.`;

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are an expert educational assessment designer. You generate high-quality, pedagogically sound multiple-choice questions. Always return valid JSON arrays only.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
      max_tokens: 4000,
    });

    let content = completion.choices[0]?.message?.content?.trim();
    
    if (!content) {
      throw new Error("Empty response from Groq API");
    }

    // Clean up markdown code blocks if present
    content = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    const questions = JSON.parse(content);

    if (!Array.isArray(questions) || questions.length !== questionCount) {
      throw new Error(`Expected ${questionCount} questions, got ${questions.length}`);
    }

    // Validate each question
    questions.forEach((q, i) => {
      if (!q.text || !q.options || q.options.length !== 4 || !q.correctAnswer) {
        throw new Error(`Invalid question structure at index ${i}`);
      }
      if (!q.options.includes(q.correctAnswer)) {
        throw new Error(`Correct answer not in options at index ${i}`);
      }
    });

    return {
      success: true,
      questions,
      metadata: {
        topic,
        subtopics,
        difficulty,
        questionCount,
        cognitiveLevel,
        generatedAt: new Date().toISOString(),
      },
    };
  } catch (error) {
    console.error("Agent 1 (MCQ Generation) Error:", error);
    return {
      success: false,
      error: error.message,
      questions: [],
    };
  }
}

// ============================================
// AGENT 2: Performance Analysis & Grouping Agent
// ============================================
export async function analyzePerformanceAndGroup(quizAttempts) {
  try {
    const prompt = `You are an expert educational psychometrician. Analyze the following quiz attempts and group students based on their performance patterns.

**Quiz Attempts Data**:
${JSON.stringify(quizAttempts, null, 2)}

**Your Task**:
1. Analyze each student's performance across subtopics
2. Identify strengths (≥80% correct), average (50-79%), and weaknesses (<50%)
3. Calculate per-subtopic performance
4. Group students into three categories:
   - **Strength**: Students with ≥80% overall and strong performance in most subtopics
   - **Average**: Students with 50-79% overall or mixed performance
   - **Weakness**: Students with <50% overall or consistent struggles

5. For each student, provide:
   - Overall performance score
   - Strengths (list of subtopics where they excel)
   - Weaknesses (list of subtopics where they struggle)
   - Recommended focus areas
   - Group assignment (strength/average/weakness)

6. Analyze answer format patterns to identify potential guessing or systematic errors

Return ONLY a valid JSON object with this structure:
{
  "analysis": [
    {
      "studentId": "uuid",
      "studentName": "name",
      "answerFormat": "aabcd",
      "overallScore": 85.5,
      "groupType": "strength",
      "strengths": ["subtopic1", "subtopic2"],
      "weaknesses": ["subtopic3"],
      "subtopicScores": {
        "subtopic1": 90,
        "subtopic2": 85,
        "subtopic3": 45
      },
      "recommendedFocus": ["subtopic3"],
      "abilityEstimate": 1.2,
      "confidenceLevel": 0.85
    }
  ],
  "groupSummary": {
    "strength": { "count": 5, "avgScore": 87.5 },
    "average": { "count": 4, "avgScore": 65.0 },
    "weakness": { "count": 3, "avgScore": 42.0 }
  },
  "answerFormatAnalysis": {
    "uniqueFormats": 11,
    "mostCommonFormat": "aabcd",
    "formatFrequency": { "aabcd": 2, "others": 10 }
  }
}`;

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are an expert educational psychometrician specializing in performance analysis and student grouping. Always return valid JSON only.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.3, // Lower temperature for more consistent analysis
      max_tokens: 4000,
    });

    let content = completion.choices[0]?.message?.content?.trim();
    
    if (!content) {
      throw new Error("Empty response from Groq API");
    }

    content = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const analysis = JSON.parse(content);

    return {
      success: true,
      analysis: analysis.analysis || [],
      groupSummary: analysis.groupSummary || {},
      answerFormatAnalysis: analysis.answerFormatAnalysis || {},
      analyzedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Agent 2 (Performance Analysis) Error:", error);
    return {
      success: false,
      error: error.message,
      analysis: [],
    };
  }
}

// ============================================
// AGENT 3: Adaptive Quiz Generation Agent
// ============================================
export async function generateAdaptiveQuiz({
  topic,
  subtopics = [],
  groupType, // 'strength', 'average', 'weakness'
  groupPerformance, // Performance data for the group
  baselineQuizData, // Original quiz data
}) {
  try {
    // Determine difficulty and question count based on group type
    let difficulty, questionCount, focusAreas;
    
    switch (groupType) {
      case "strength":
        difficulty = "hard";
        questionCount = 5; // Standard count
        focusAreas = groupPerformance.strengths || [];
        break;
      case "average":
        difficulty = "medium";
        questionCount = 6; // Slightly more for clarification
        focusAreas = [...(groupPerformance.strengths || []), ...(groupPerformance.weaknesses || [])];
        break;
      case "weakness":
        difficulty = "easy";
        questionCount = 8; // More questions to build confidence
        focusAreas = groupPerformance.weaknesses || [];
        break;
      default:
        difficulty = "medium";
        questionCount = 5;
        focusAreas = subtopics;
    }

    const prompt = `You are an expert adaptive learning specialist. Generate a personalized quiz for a group of students based on their performance.

**Context**:
- **Topic**: ${topic}
- **Subtopics**: ${subtopics.join(", ")}
- **Group Type**: ${groupType}
- **Group Performance Summary**: ${JSON.stringify(groupPerformance, null, 2)}
- **Focus Areas**: ${focusAreas.join(", ")}

**Baseline Quiz Data**:
${JSON.stringify(baselineQuizData, null, 2)}

**Adaptive Strategy**:
${groupType === "strength" 
  ? "- Increase difficulty to challenge strong students\n- Focus on advanced concepts and transfer of knowledge\n- Include complex, multi-step problems"
  : groupType === "average"
  ? "- Mix difficulty levels to reinforce strengths and address weaknesses\n- Include scaffolded questions with hints\n- Balance between review and new challenges"
  : "- Decrease difficulty to build confidence\n- Focus on prerequisite concepts and fundamentals\n- Include more straightforward questions with clear explanations"
}

**Requirements**:
1. Generate exactly ${questionCount} questions
2. Target difficulty: ${difficulty}
3. Focus on: ${focusAreas.join(", ")}
4. Ensure questions are different from the baseline quiz
5. Include a mix of cognitive levels appropriate for the group

Return ONLY a valid JSON object with this structure:
{
  "questions": [
    {
      "text": "Question text",
      "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
      "correctAnswer": "B) ...",
      "subtopic": "subtopic name",
      "difficulty": "${difficulty}",
      "cognitiveLevel": "application",
      "explanation": "Why this is correct",
      "scaffoldingHint": "Optional hint for struggling students"
    }
  ],
  "adaptiveStrategy": {
    "groupType": "${groupType}",
    "targetDifficulty": "${difficulty}",
    "questionCount": ${questionCount},
    "focusAreas": ${JSON.stringify(focusAreas)},
    "rationale": "Brief explanation of why this quiz is appropriate for this group"
  }
}`;

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are an expert adaptive learning specialist. You create personalized quizzes based on student performance data. Always return valid JSON only.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
      max_tokens: 4000,
    });

    let content = completion.choices[0]?.message?.content?.trim();
    
    if (!content) {
      throw new Error("Empty response from Groq API");
    }

    content = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const adaptiveQuiz = JSON.parse(content);

    // Validate questions
    if (!adaptiveQuiz.questions || !Array.isArray(adaptiveQuiz.questions)) {
      throw new Error("Invalid adaptive quiz structure");
    }

    adaptiveQuiz.questions.forEach((q, i) => {
      if (!q.text || !q.options || q.options.length !== 4 || !q.correctAnswer) {
        throw new Error(`Invalid question structure at index ${i}`);
      }
    });

    return {
      success: true,
      questions: adaptiveQuiz.questions,
      adaptiveStrategy: adaptiveQuiz.adaptiveStrategy,
      metadata: {
        topic,
        subtopics,
        groupType,
        difficulty,
        questionCount,
        generatedAt: new Date().toISOString(),
      },
    };
  } catch (error) {
    console.error("Agent 3 (Adaptive Quiz Generation) Error:", error);
    return {
      success: false,
      error: error.message,
      questions: [],
    };
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

// Calculate answer format from answers array
export function calculateAnswerFormat(answers) {
  return answers
    .map(a => a.selectedAnswer.charAt(0).toLowerCase())
    .join("");
}

// Calculate IRT-based ability estimate (simplified)
export function calculateAbilityEstimate(score, totalQuestions, difficulty) {
  const percentage = (score / totalQuestions) * 100;
  
  // Simple logistic transformation
  const difficultyWeight = {
    easy: 0.8,
    medium: 1.0,
    hard: 1.2,
  }[difficulty] || 1.0;
  
  // Transform percentage to ability scale (-3 to +3)
  const ability = ((percentage - 50) / 25) * difficultyWeight;
  
  return Math.max(-3, Math.min(3, ability));
}

// Calculate confidence level based on response pattern
export function calculateConfidenceLevel(answers, difficulty) {
  // Higher variance in responses = lower confidence
  const correctCount = answers.filter(a => a.isCorrect).length;
  const totalQuestions = answers.length;
  
  // Calculate variance
  const mean = correctCount / totalQuestions;
  const variance = answers.reduce((sum, a) => {
    const val = a.isCorrect ? 1 : 0;
    return sum + Math.pow(val - mean, 2);
  }, 0) / totalQuestions;
  
  // Lower variance = higher confidence
  const baseConfidence = 1 - Math.sqrt(variance);
  
  // Adjust for difficulty
  const difficultyAdjustment = {
    easy: 0.9,
    medium: 1.0,
    hard: 1.1,
  }[difficulty] || 1.0;
  
  return Math.max(0, Math.min(1, baseConfidence * difficultyAdjustment));
}

export default {
  generateMCQs,
  analyzePerformanceAndGroup,
  generateAdaptiveQuiz,
  calculateAnswerFormat,
  calculateAbilityEstimate,
  calculateConfidenceLevel,
};

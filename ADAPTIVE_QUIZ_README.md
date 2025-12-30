# Adaptive Quiz System - Implementation Guide

## 📋 Overview

This adaptive quiz system implements a sophisticated, AI-powered assessment platform that uses three specialized agents to create, analyze, and adapt quizzes based on student performance. The system groups students by answer format patterns and performance levels, then generates targeted quizzes for each group.

## 🎯 Key Features

### 1. **Three AI Agents (Groq API)**
- **Agent 1 - MCQ Generator**: Creates high-quality multiple-choice questions
- **Agent 2 - Performance Analyzer**: Groups students based on performance and answer patterns
- **Agent 3 - Adaptive Quiz Creator**: Generates personalized quizzes for each group

### 2. **Student Grouping**
- **Strength Group** (≥80%): Receives harder questions (5 questions, hard difficulty)
- **Average Group** (50-79%): Gets mixed difficulty with scaffolding (6 questions, medium difficulty)
- **Weakness Group** (<50%): Receives easier questions with support (8 questions, easy difficulty)

### 3. **Answer Format Analysis**
- Tracks 5-letter answer sequences (e.g., "aabcd")
- Identifies patterns and potential guessing behavior
- Calculates probability of format collisions
- Uses binomial distribution for statistical analysis

### 4. **IRT-Based Ability Estimation**
- Difficulty parameter (b)
- Discrimination parameter (a)
- Guessing parameter (c = 0.25 for 4-option MCQs)
- Confidence level calculation

## 🗄️ Database Schema

### Tables Created

1. **quizzes**
   - Stores quiz metadata and questions
   - Supports baseline and adaptive quiz types
   - Links to parent quiz for adaptive quizzes

2. **quiz_attempts**
   - Records student submissions
   - Stores answer format and score
   - Tracks time taken

3. **student_performance**
   - Tracks performance metrics per quiz
   - Stores strengths and weaknesses
   - IRT-based ability estimates

4. **student_groups**
   - Groups students by performance
   - Stores subtopic scores
   - Links to quiz and student

5. **question_bank**
   - Stores questions with IRT parameters
   - Tracks usage statistics
   - Supports difficulty calibration

## 🚀 Setup Instructions

### 1. Database Setup

Run the SQL schema to create all necessary tables:

```bash
# In Supabase SQL Editor, run:
c:\EDUGEN_AI\adaptive_quiz_schema.sql
```

### 2. Backend Setup

The backend service is already integrated into `edugen-backend/server.js`. The Groq SDK has been installed.

**API Key**: Already configured in `adaptiveQuizService.js`
```javascript
const GROQ_API_KEY = "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";
```

### 3. Frontend Integration

The Quiz Container has been added to the Staff Dashboard:
- **Sidebar Option**: "Quiz" (icon: question-circle)
- **Component**: `QuizContainer.js`
- **Styles**: `QuizContainer.css`

## 📊 Usage Workflow

### For Staff

#### Step 1: Create Baseline Quiz
1. Navigate to **Quiz** in sidebar
2. Click **Create Quiz** tab
3. Fill in:
   - Quiz Title
   - Topic
   - Subtopics (comma-separated)
   - Difficulty (easy/medium/hard)
   - Question Count (3-10)
   - Cognitive Level (recall/application/transfer)
4. Click **Generate Questions**
5. Review generated questions
6. Click **Save Quiz**
7. Click **Publish** to make it available to students

#### Step 2: Analyze Student Performance
1. After students complete the quiz, go to **Manage Quizzes** tab
2. Find the published baseline quiz
3. Click **Analyze** button
4. System will:
   - Call Agent 2 to analyze all attempts
   - Group students by performance
   - Calculate answer format patterns
   - Store results in database

#### Step 3: View Student Groups
1. Click **Student Groups** tab
2. View three groups:
   - **Strength Group** (green): High performers
   - **Average Group** (blue): Mid-range performers
   - **Weakness Group** (red): Struggling students
3. See each student's:
   - Name
   - Performance score
   - Answer format

#### Step 4: Generate Adaptive Quizzes
1. Click **Adaptive Quizzes** tab
2. Select baseline quiz from dropdown
3. Choose target group (Strength/Average/Weakness)
4. Click **Generate Adaptive Quiz**
5. System will:
   - Call Agent 3 with group performance data
   - Generate appropriate questions
   - Adjust difficulty and count
   - Save as new quiz
6. Publish the adaptive quiz for the target group

## 🔌 API Endpoints

### Quiz Generation
```http
POST /api/quiz/generate
Content-Type: application/json

{
  "topic": "Data Structures",
  "subtopics": ["Arrays", "Linked Lists"],
  "difficulty": "medium",
  "questionCount": 5,
  "cognitiveLevel": "application"
}
```

### Save Quiz
```http
POST /api/quiz/save
Content-Type: application/json

{
  "title": "Data Structures Quiz 1",
  "topic": "Data Structures",
  "subtopic": "Arrays",
  "difficulty": "medium",
  "questionCount": 5,
  "questions": [...],
  "quizType": "baseline",
  "staffId": "uuid"
}
```

### Publish Quiz
```http
POST /api/quiz/publish/:quizId
```

### Submit Quiz Attempt
```http
POST /api/quiz/submit
Content-Type: application/json

{
  "quizId": "uuid",
  "studentId": "uuid",
  "studentName": "John Doe",
  "answers": [
    { "selectedAnswer": "A) Option 1" },
    { "selectedAnswer": "B) Option 2" }
  ],
  "timeTaken": 300
}
```

### Analyze Performance
```http
POST /api/quiz/analyze/:quizId
```

### Get Student Groups
```http
GET /api/quiz/groups/:quizId
```

### Generate Adaptive Quiz
```http
POST /api/quiz/adaptive
Content-Type: application/json

{
  "baselineQuizId": "uuid",
  "groupType": "strength",
  "staffId": "uuid"
}
```

## 📈 Statistical Analysis

### Answer Format Probability

For a 5-question MCQ with 4 choices:

**Single Student, Specific Format:**
```
P(format = "aabcd") = (1/4)^5 = 1/1024 ≈ 0.0009766
```

**12 Students, At Least One Match:**
```
X ~ Binomial(n=12, p=1/1024)
P(X ≥ 1) = 1 - (1023/1024)^12 ≈ 0.0117
```

**Expected Distinct Formats:**
```
E[distinct] ≈ 12 - (12 × 11)/(2 × 1024) ≈ 11.94
```

### IRT Ability Estimation

**Simplified Logistic Model:**
```javascript
ability = ((percentage - 50) / 25) * difficultyWeight

difficultyWeight = {
  easy: 0.8,
  medium: 1.0,
  hard: 1.2
}
```

**Confidence Level:**
```javascript
variance = Σ(xi - mean)² / n
confidence = 1 - √variance
```

## 🎨 UI Components

### Quiz Container Tabs

1. **Create Quiz**
   - Form for quiz parameters
   - AI-powered question generation
   - Question preview and editing
   - Save and publish options

2. **Manage Quizzes**
   - Grid view of all quizzes
   - Status indicators (Published/Draft)
   - Quick actions (Publish, Analyze)
   - Quiz metadata display

3. **Student Groups**
   - Three-section layout
   - Color-coded groups
   - Student cards with scores
   - Answer format display

4. **Adaptive Quizzes**
   - Baseline quiz selector
   - Group type selector
   - Generation button
   - Strategy explanation

## 🔄 Adaptive Strategy

### Strength Group
- **Difficulty**: Hard
- **Question Count**: 5
- **Focus**: Advanced concepts, transfer of knowledge
- **Approach**: Challenge with complex, multi-step problems

### Average Group
- **Difficulty**: Medium
- **Question Count**: 6
- **Focus**: Mixed - reinforce strengths, address weaknesses
- **Approach**: Scaffolded questions with hints

### Weakness Group
- **Difficulty**: Easy
- **Question Count**: 8
- **Focus**: Prerequisite concepts, fundamentals
- **Approach**: Build confidence with clear explanations

## 🛠️ Troubleshooting

### Common Issues

1. **Groq API Errors**
   - Check API key is valid
   - Verify rate limits not exceeded
   - Ensure proper JSON formatting in prompts

2. **Database Errors**
   - Verify all tables created successfully
   - Check RLS policies are enabled
   - Ensure staff_id is correctly passed

3. **Frontend Issues**
   - Clear browser cache
   - Check console for errors
   - Verify API endpoints are accessible

### Debug Mode

Enable debug logging in `adaptiveQuizService.js`:
```javascript
console.log("Agent 1 Response:", completion);
console.log("Agent 2 Analysis:", analysisResult);
console.log("Agent 3 Adaptive Quiz:", adaptiveResult);
```

## 📝 Future Enhancements

1. **Advanced IRT Implementation**
   - Full 2PL/3PL models
   - Item calibration based on usage data
   - Adaptive difficulty adjustment during quiz

2. **Enhanced Analytics**
   - Learning curves
   - Skill mastery tracking
   - Predictive performance modeling

3. **Question Bank Management**
   - Import/export questions
   - Tag-based filtering
   - Difficulty calibration tools

4. **Student Features**
   - Practice mode
   - Explanation viewing
   - Progress tracking
   - Personalized recommendations

## 📚 References

- **IRT Theory**: Item Response Theory for Psychologists (Embretson & Reise)
- **Adaptive Testing**: Computerized Adaptive Testing (Wainer et al.)
- **Groq API**: https://console.groq.com/docs
- **Supabase**: https://supabase.com/docs

## 🤝 Support

For issues or questions:
1. Check the troubleshooting section
2. Review API endpoint documentation
3. Inspect browser console for errors
4. Check backend logs for API failures

## 📄 License

This adaptive quiz system is part of the EduGen AI platform.

---

**Created**: 2025-12-29
**Version**: 1.0.0
**Author**: Antigravity AI

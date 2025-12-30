# Quiz Subtopic Analytics Implementation

## Overview
This document outlines the implementation of subtopic-based quiz analytics for the staff dashboard, allowing staff to view detailed student performance including strengths, weaknesses, and subtopic averages.

## Changes Made

### 1. Frontend Changes

#### A. QuizContainer.js (`src/components/QuizContainer.js`)
**New Features:**
- Added a third tab "Student Performance" to display detailed analytics
- Created `fetchPerformanceData()` function to retrieve quiz-specific performance data
- Added "View Performance" button for all published quizzes
- Implemented comprehensive performance table showing:
  - Student name
  - Quiz score (e.g., 8/10)
  - Percentage with color coding (green ≥80%, blue 50-79%, red <50%)
  - Strengths (subtopics with ≥80% score)
  - Weaknesses (subtopics with <50% score)
  - Subtopic averages with individual scores
  - Answer format pattern

**State Management:**
```javascript
const [performanceData, setPerformanceData] = useState([]);
const [loadingPerformance, setLoadingPerformance] = useState(false);
```

#### B. StudentQuizContainer.js (`src/components/StudentQuizContainer.js`)
**Changes:**
- **Removed** percentage display from quiz results
- **Removed** answer format/pattern from student view
- **Removed** strengths and weaknesses display
- Students now only see:
  - Score (e.g., 8/10)
  - Time taken
  - Completion message

This ensures students don't see detailed analytics that are meant for staff analysis.

#### C. QuizContainer.css (`src/styles/QuizContainer.css`)
**New Styles Added:**
- `.performance-table-container` - Main table wrapper with shadow and rounded corners
- `.performance-table` - Full-width table with proper spacing
- `.percentage-badge` - Color-coded badges (high/medium/low)
- `.subtopic-tags` - Flexbox container for strength/weakness tags
- `.subtopic-tag.strength` - Green tags for strong subtopics
- `.subtopic-tag.weakness` - Red tags for weak subtopics
- `.subtopic-scores` - Column layout for subtopic breakdown
- `.subtopic-score-item` - Individual subtopic score display
- `.answer-format` - Monospace font for answer patterns
- Responsive breakpoints for mobile/tablet views

### 2. Backend Changes

#### A. server.js (`edugen-backend/server.js`)
**New API Endpoint:**
```javascript
GET /api/quiz/performance-details/:quizId
```

**Functionality:**
1. Fetches quiz details and all student attempts
2. Calculates subtopic-based performance for each student:
   - Groups questions by subtopic
   - Calculates percentage for each subtopic
   - Identifies strengths (≥80%) and weaknesses (<50%)
3. Returns comprehensive performance data array

**Response Format:**
```json
{
  "success": true,
  "performance": [
    {
      "student_name": "John Doe",
      "student_id": "uuid",
      "score": 8,
      "total_questions": 10,
      "percentage": 80.0,
      "answer_format": "aabcdabcda",
      "strengths": ["Algebra", "Geometry"],
      "weaknesses": ["Trigonometry"],
      "subtopic_scores": {
        "Algebra": 90.0,
        "Geometry": 85.0,
        "Trigonometry": 40.0
      },
      "submitted_at": "2025-12-30T..."
    }
  ]
}
```

## How It Works

### Staff Workflow:
1. Staff navigates to Quiz Management in their dashboard
2. Clicks "View Performance" button on any published quiz
3. System switches to "Student Performance" tab
4. Displays comprehensive table with all student analytics
5. Staff can analyze:
   - Overall class performance
   - Individual student strengths and weaknesses
   - Subtopic-wise breakdown
   - Answer patterns for detecting issues

### Student Workflow:
1. Student takes a quiz
2. Upon completion, sees only:
   - Their score (e.g., 8/10)
   - Time taken
   - Completion message
3. **No access to:**
   - Percentage
   - Strengths/weaknesses
   - Subtopic breakdown
   - Answer patterns

## Subtopic Analysis Logic

### Calculation:
For each student's quiz attempt:
1. Iterate through all answers
2. Group by question subtopic
3. Calculate: `(correct answers in subtopic / total questions in subtopic) × 100`

### Classification:
- **Strength**: Subtopic score ≥ 80%
- **Average**: Subtopic score 50-79%
- **Weakness**: Subtopic score < 50%

## Visual Design

### Color Coding:
- **High Performance (≥80%)**: Green (#10b981)
- **Medium Performance (50-79%)**: Blue (#3b82f6)
- **Low Performance (<50%)**: Red (#ef4444)

### Table Features:
- Gradient header (purple to violet)
- Hover effects on rows
- Responsive design for mobile
- Scrollable on small screens
- Color-coded badges and tags
- Monospace font for answer patterns

## Database Schema

The implementation uses existing tables:
- `quizzes` - Stores quiz questions with subtopics
- `quiz_attempts` - Stores student answers
- `student_performance` - Stores calculated metrics

Each question in the `quizzes.questions` JSONB field should have:
```json
{
  "text": "Question text",
  "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
  "correctAnswer": "B) ...",
  "subtopic": "Algebra",  // ← Required for analytics
  "difficulty": "medium",
  "cognitiveLevel": "application"
}
```

## Future Enhancements

Potential improvements:
1. Export performance data to CSV/PDF
2. Graphical charts (bar/pie charts) for visual analysis
3. Comparison across multiple quizzes
4. Time-series analysis of student progress
5. Automated recommendations based on weaknesses
6. Class-wide subtopic performance aggregation

## Testing Checklist

- [x] Staff can view performance table
- [x] Subtopic scores calculate correctly
- [x] Strengths/weaknesses identify properly
- [x] Students don't see analytics
- [x] Table is responsive on mobile
- [x] Color coding works correctly
- [x] API returns correct data format
- [ ] Test with multiple students
- [ ] Test with quizzes without subtopics
- [ ] Test with empty quiz attempts

## Notes

- Subtopic field is **required** in questions for analytics to work
- If a question doesn't have a subtopic, it won't appear in subtopic analysis
- The system gracefully handles missing data with "N/A" or "None" displays
- Performance data is calculated on-demand (not cached) for real-time accuracy

# Staff Approval Workflow Implementation Plan

## Overview
Implement a workflow where:
1. **Students**: Get staff-approved answers when clicking "Copy and Ask AI"
2. **Staff**: See preview/edit screen after AI generation, with 30-second auto-post

## Requirements

### Part 1: Student Chatbot - Fetch Approved Content
**When**: Student clicks "Copy and Ask AI" button
**What**: Instead of generating new AI response, fetch staff-approved answer from database

**Implementation Steps**:
1. Modify `Chatbot.js` to check for approved content when `copiedTopic` is set
2. If approved content exists, display it directly
3. If no approved content, fall back to AI generation
4. Also fetch approved quiz questions for "Take Quiz" option

**Files to Modify**:
- `src/components/Chatbot.js`
  - Import `fetchApprovedContent` from `approvedContentService.js`
  - Add logic in `useEffect` for `copiedTopic`
  - Check for approved content before calling AI
  - Display approved answer with special indicator

### Part 2: Staff Dashboard - Preview/Edit with Auto-Post
**When**: Staff clicks "Post" button after entering task details
**What**: Show preview screen with AI-generated answer and quiz, allow editing, auto-post after 30s

**Implementation Steps**:
1. Add new state for preview mode in StaffDashboard
2. After AI generation, show preview modal/screen
3. Allow staff to edit answer and quiz
4. Add "Post Now" and "Cancel" buttons
5. Implement 30-second countdown timer
6. Auto-post if no interaction within 30 seconds

**Files to Modify**:
- `src/pages/StaffDashboard.js`
  - Add preview state variables
  - Modify task posting flow
  - Add preview modal component
  - Implement countdown timer
  - Save to `approved_content` table on post

- `src/staff/StaffDashboardViews.js`
  - Add PreviewModal component
  - Add edit functionality for answer and quiz

## Database Schema

### approved_content table (already exists)
```sql
CREATE TABLE approved_content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject TEXT NOT NULL,
  topic TEXT NOT NULL,
  subtopic TEXT,
  ai_answer TEXT NOT NULL,
  quiz_questions JSONB NOT NULL,
  quiz_config JSONB,
  difficulty TEXT,
  staff_id UUID REFERENCES staff(id),
  staff_name TEXT,
  files_used TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(subject, topic)
);
```

## Implementation Details

### Student Flow:
```
1. Student clicks "Copy and Ask AI" on task
2. Topic is copied to chatbot
3. Chatbot checks: fetchApprovedContent(subject, topic)
4. If approved content exists:
   - Display: "✅ Staff-Approved Answer"
   - Show approved answer
   - Show "Take Quiz" button with approved quiz
5. If no approved content:
   - Generate AI answer as usual
   - Show: "🤖 AI-Generated Answer"
```

### Staff Flow:
```
1. Staff enters task details (subject, topic, subtopic, etc.)
2. Staff clicks "Post" button
3. AI generates answer and quiz
4. Show Preview Modal:
   - Display generated answer (editable)
   - Display quiz questions (editable)
   - Show countdown: "Auto-posting in 30 seconds..."
   - Buttons: "Post Now" | "Cancel"
5. If staff edits:
   - Reset countdown to 30 seconds
6. After 30 seconds OR "Post Now" clicked:
   - Save to approved_content table
   - Post task to students
7. If "Cancel" clicked:
   - Discard and return to form
```

## UI Components

### Student Chatbot Badge
```jsx
{isApprovedContent && (
  <div className="approved-badge">
    ✅ Staff-Approved Answer
  </div>
)}
```

### Staff Preview Modal
```jsx
<div className="preview-modal">
  <div className="preview-header">
    <h3>Preview & Edit Before Posting</h3>
    <div className="countdown">
      Auto-posting in {countdown} seconds...
    </div>
  </div>
  
  <div className="preview-content">
    <div className="answer-section">
      <h4>AI-Generated Answer</h4>
      <textarea value={editedAnswer} onChange={...} />
    </div>
    
    <div className="quiz-section">
      <h4>Quiz Questions</h4>
      {editedQuiz.map((q, i) => (
        <QuestionEditor key={i} question={q} onChange={...} />
      ))}
    </div>
  </div>
  
  <div className="preview-actions">
    <button onClick={handleCancel}>Cancel</button>
    <button onClick={handlePostNow}>Post Now</button>
  </div>
</div>
```

## Code Snippets

### Chatbot.js - Check for Approved Content
```javascript
useEffect(() => {
  if (copiedTopic) {
    // Extract subject and topic from copiedTopic
    const checkApprovedContent = async () => {
      const approved = await fetchApprovedContent(subject, copiedTopic);
      if (approved) {
        setMessages(prev => [...prev, {
          sender: "bot",
          text: approved.ai_answer,
          isApproved: true
        }]);
        setApprovedQuiz(approved.quiz_questions);
      } else {
        // Proceed with normal AI generation
        setInput(copiedTopic);
      }
    };
    checkApprovedContent();
    clearCopiedTopic();
  }
}, [copiedTopic]);
```

### StaffDashboard.js - Preview Flow
```javascript
const [showPreview, setShowPreview] = useState(false);
const [previewData, setPreviewData] = useState(null);
const [countdown, setCountdown] = useState(30);
const countdownRef = useRef(null);

const handlePostTask = async () => {
  // Generate AI answer and quiz
  const aiAnswer = await generateAIAnswer(taskData);
  const quizQuestions = await generateQuiz(taskData);
  
  // Show preview
  setPreviewData({
    answer: aiAnswer,
    quiz: quizQuestions,
    taskData: taskData
  });
  setShowPreview(true);
  setCountdown(30);
  
  // Start countdown
  countdownRef.current = setInterval(() => {
    setCountdown(prev => {
      if (prev <= 1) {
        handleAutoPost();
        return 0;
      }
      return prev - 1;
    });
  }, 1000);
};

const handleAutoPost = async () => {
  clearInterval(countdownRef.current);
  await saveApprovedContent(previewData);
  await postTaskToStudents(previewData.taskData);
  setShowPreview(false);
};
```

## Testing Checklist

### Student Side:
- [ ] Click "Copy and Ask AI" on task with approved content
- [ ] Verify staff-approved answer is displayed
- [ ] Verify "✅ Staff-Approved Answer" badge shows
- [ ] Click "Take Quiz" and verify approved quiz loads
- [ ] Test with task that has NO approved content
- [ ] Verify AI generation works as fallback

### Staff Side:
- [ ] Create new task and click "Post"
- [ ] Verify preview modal appears
- [ ] Verify countdown starts at 30 seconds
- [ ] Edit answer and verify countdown resets
- [ ] Edit quiz and verify countdown resets
- [ ] Click "Post Now" and verify immediate posting
- [ ] Click "Cancel" and verify return to form
- [ ] Wait 30 seconds and verify auto-post
- [ ] Check database for approved_content entry

## Notes

- The `approved_content` table uses `UNIQUE(subject, topic)` constraint
- This means each subject-topic combination can only have ONE approved version
- If staff posts again for same subject-topic, it will UPDATE the existing record
- Students always get the latest approved version
- The countdown timer should reset whenever staff makes edits
- Preview modal should be dismissable with ESC key

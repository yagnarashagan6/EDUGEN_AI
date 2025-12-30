# Quiz Loading Issue - Root Cause & Solution

## 📋 Problem Summary

Students were unable to load staff-approved quizzes when clicking "Take Quiz". Instead, the system attempted to generate new quizzes, which failed due to missing OpenRouter API credentials.

---

## 🔍 Root Cause Analysis

### Issue #1: Topic/Subject Mismatch ⚠️

**The Problem:**
- Staff saves approved content with: `subject="Ground-Based Sensors"`, `topic="soil monitoring, crop health monitoring..."`
- Student searches with: `topic="Ground-Based Sensors - soil monitoring, crop health monitoring..."`
- **Result:** No match found!

**Why it happens:**
```javascript
// Staff Dashboard (StaffDashboard.js lines 235-246)
let indexSubject = 'General';
let indexTopic = dataToPost.taskData.topic;

if (dataToPost.taskData.subtopic) {
    indexSubject = dataToPost.taskData.topic;  // "Ground-Based Sensors"
    indexTopic = dataToPost.taskData.subtopic;  // "soil monitoring..."
}

// Student Dashboard (StudentDashboard.js line 1048 - OLD CODE)
.eq('topic', currentTopic.trim())  // Searches for full "Ground-Based Sensors - soil monitoring..."
```

### Issue #2: Missing OpenRouter API Key 🔑

**Error Log:**
```
OpenRouter API Error: 401 {"error":{"message":"No cookie auth credentials found","code":401}}
```

**Location:** `edugen-backend/server.js` line 388
```javascript
Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`
```

**Impact:** When approved quiz isn't found, fallback quiz generation fails.

---

## ✅ Solution Implemented

### Enhanced Quiz Lookup Logic

I've updated `StudentDashboard.js` to use **3 search strategies**:

#### Strategy 1: Exact Topic Match
```javascript
const { data: exactMatch } = await supabase
  .from('approved_content')
  .select('*')
  .eq('topic', currentTopic.trim())
  .maybeSingle();
```

#### Strategy 2: Subject + Topic Match
```javascript
if (!approvedQuiz && taskSubject) {
  const { data: subjectMatch } = await supabase
    .from('approved_content')
    .select('*')
    .eq('subject', taskSubject)
    .eq('topic', currentTopic.trim())
    .maybeSingle();
}
```

#### Strategy 3: Case-Insensitive Partial Match
```javascript
if (!approvedQuiz) {
  const { data: partialMatches } = await supabase
    .from('approved_content')
    .select('*')
    .ilike('topic', `%${currentTopic.trim()}%`)
    .limit(5);
}
```

### Added Comprehensive Logging

The system now logs:
- 🔍 Search attempts for each strategy
- ✅ Successful matches
- ❌ Failed searches
- 📋 Partial matches found
- 📚 Task subject information

---

## 🧪 Testing Instructions

### 1. Check Browser Console

When a student clicks "Take Quiz", you should see:
```
🔍 Checking for approved quiz for topic: "Ground-Based Sensors - soil monitoring..."
📚 Task subject: "Agriculture Technology"
🔍 Trying subject-based search: subject="Agriculture Technology", topic="Ground-Based Sensors..."
✅ Found approved quiz by subject + topic match
✅ Loading staff-approved quiz with 5 questions
```

### 2. Verify Database Content

Run this query in Supabase SQL Editor:
```sql
SELECT subject, topic, subtopic, 
       jsonb_array_length(quiz_questions) as question_count
FROM approved_content
ORDER BY created_at DESC;
```

### 3. Test the Fix

1. **Staff:** Create and approve a quiz for a topic
2. **Student:** Click "Take Quiz" for that topic
3. **Expected:** Quiz loads immediately without generation
4. **Check Console:** Should see "✅ Loading staff-approved quiz"

---

## 🔧 Additional Fixes Needed

### Fix #1: Add OpenRouter API Key

**File:** `edugen-backend/.env`

Add this line:
```env
OPENROUTER_API_KEY=your_actual_api_key_here
```

**How to get the key:**
1. Go to https://openrouter.ai/
2. Sign in / Create account
3. Go to Keys section
4. Copy your API key
5. Paste in `.env` file

### Fix #2: Restart Backend Server

After adding the API key:
```powershell
# Stop the current backend (Ctrl+C in the terminal)
cd C:\EDUGEN_AI\edugen-backend
npm start
```

---

## 📊 Database Schema Reference

### `approved_content` Table Structure
```sql
CREATE TABLE approved_content (
  id UUID PRIMARY KEY,
  subject TEXT NOT NULL,           -- Main topic or "General"
  topic TEXT NOT NULL,             -- Subtopic or full topic
  subtopic TEXT,                   -- Optional additional subtopic
  ai_answer TEXT,                  -- Staff-approved answer
  quiz_questions JSONB,            -- Array of quiz questions
  quiz_config JSONB,               -- Quiz configuration
  difficulty TEXT,                 -- Easy, Medium, Hard
  staff_id TEXT NOT NULL,
  staff_name TEXT,
  files_used JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(subject, topic)
);
```

---

## 🎯 Expected Behavior After Fix

### Before Fix:
1. Student clicks "Take Quiz"
2. System searches for approved quiz → **Not Found**
3. System tries to generate new quiz → **401 Error**
4. Student sees error message

### After Fix:
1. Student clicks "Take Quiz"
2. System searches using 3 strategies → **Found!**
3. Quiz loads immediately
4. Student takes the staff-approved quiz

---

## 📝 Files Modified

1. **`src/pages/StudentDashboard.js`** (lines 1042-1120)
   - Enhanced quiz lookup with 3 search strategies
   - Added comprehensive logging
   - Improved error handling

---

## 🚀 Next Steps

1. **Test the current fix** - Check if quizzes now load
2. **Add OpenRouter API key** - For fallback quiz generation
3. **Monitor console logs** - Verify search strategies are working
4. **Report results** - Let me know which strategy successfully finds your quizzes

---

## 💡 Pro Tips

### Debugging Quiz Matching

If quizzes still don't load, check the console for:
```
📋 Found X partial matches: ["topic1", "topic2", ...]
```

This tells you what's actually in the database vs. what the student is searching for.

### Manual Database Check

To see exactly what's stored:
```sql
SELECT 
  subject,
  topic,
  subtopic,
  created_at
FROM approved_content
WHERE subject ILIKE '%ground%' 
   OR topic ILIKE '%ground%';
```

---

## 📞 Support

If issues persist, provide:
1. Browser console logs (full output when clicking "Take Quiz")
2. Database query result from the manual check above
3. Screenshot of the task in student dashboard

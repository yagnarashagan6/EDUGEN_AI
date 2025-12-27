# Error Analysis and Fixes for EDUGEN_AI

## Summary of Errors

Your application is experiencing **5 distinct types of errors**:

1. **HTTP 406 (Not Acceptable)** - Supabase API requests
2. **HTTP 400 (Bad Request)** - NULL constraint violation
3. **HTTP 403 (Forbidden)** - Row Level Security policy violation
4. **ReferenceError** - Undefined variable `doc`
5. **HTTP 500 (Internal Server Error)** - Backend quiz generation

---

## Error 1: HTTP 406 (Not Acceptable) - Supabase Requests

### **Error Message:**
```
Failed to load resource: the server responded with a status of 406 ()
/rest/v1/goals?select=goals&student_id=eq.f6fd9be0-1ce3-4232-914c-85b9ed1933f3
/rest/v1/marks?select=*&student_id=eq...
```

### **Root Cause:**
Supabase is rejecting requests because they're missing the required `Accept: application/json` header or proper authentication headers.

### **Fix:**
The Supabase client should automatically add these headers. Check your Supabase client initialization in `src/supabase.js`:

**Current code (lines 1-12):**
```javascript
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});
```

**Add global headers:**
```javascript
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
  global: {
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
  },
});
```

---

## Error 2: HTTP 400 - NULL Constraint Violation

### **Error Message:**
```
Error: null value in column "email" of relation "students" violates not-null constraint
at updateStudentData (supabase.js:1018:1)
```

### **Root Cause:**
You're trying to upsert a student record without providing an email value. Looking at line 980 in `supabase.js`:

```javascript
.upsert(updateData, { onConflict: "email" })
```

The issue is that `updateData` doesn't always include an email, but you're using `onConflict: "email"` which requires the email field.

### **Fix:**
**Option 1: Always include email in updateData**
```javascript
export const updateStudentData = async (studentId = null, data) => {
  try {
    const userId = studentId || supabaseAuth.currentUser?.uid;
    if (!userId) {
      throw new Error("No user ID provided");
    }

    // Get current user email if not provided
    const userEmail = data.email || supabaseAuth.currentUser?.email;
    if (!userEmail) {
      throw new Error("Email is required for student updates");
    }

    const updateData = {
      id: userId,
      email: userEmail, // ALWAYS include email
    };
    
    // ... rest of the mapping code
```

**Option 2: Change onConflict to use 'id' instead**
```javascript
const { data: result, error } = await supabase
  .from("students")
  .upsert(updateData, { onConflict: "id" }) // Changed from "email" to "id"
  .select();
```

---

## Error 3: HTTP 403 - Row Level Security Policy Violation

### **Error Message:**
```
Error: new row violates row-level security policy for table "task_status"
at saveTaskCompletion (supabase.js:700:1)
```

### **Root Cause:**
Your Supabase Row Level Security (RLS) policies are blocking the insert/update operation. The authenticated user doesn't have permission to write to the `task_status` table.

### **Fix:**
You need to update your RLS policies in Supabase. Go to your Supabase dashboard:

**SQL to run in Supabase SQL Editor:**

```sql
-- Allow students to insert their own task status
CREATE POLICY "Students can insert their own task status"
ON task_status
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = student_id);

-- Allow students to update their own task status
CREATE POLICY "Students can update their own task status"
ON task_status
FOR UPDATE
TO authenticated
USING (auth.uid() = student_id)
WITH CHECK (auth.uid() = student_id);

-- Allow students to read their own task status
CREATE POLICY "Students can read their own task status"
ON task_status
FOR SELECT
TO authenticated
USING (auth.uid() = student_id);
```

**Alternative: If policies already exist, check if they're correct:**
```sql
-- View existing policies
SELECT * FROM pg_policies WHERE tablename = 'task_status';

-- Drop existing policies if needed
DROP POLICY IF EXISTS "policy_name" ON task_status;
```

---

## Error 4: ReferenceError - doc is not defined

### **Error Message:**
```
ReferenceError: doc is not defined
at updateTaskProgress (StudentDashboard.js:1390:1)
```

### **Root Cause:**
At line 1390 in `StudentDashboard.js`, you're using `doc` from Firebase, but you've migrated to Supabase. The code still has Firebase references.

**Current code (lines 1377-1397):**
```javascript
const updateTaskProgress = async (taskId, step) => {
  const user = auth.currentUser;
  if (!user) return;

  const progressKey = `taskProgress_${user.uid}_${taskId}`;
  const currentProgress = JSON.parse(
    localStorage.getItem(progressKey) || "{}"
  );
  const updatedProgress = { ...currentProgress, [step]: Date.now() };
  localStorage.setItem(progressKey, JSON.stringify(updatedProgress));
  setTaskProgress((prev) => ({ ...prev, [taskId]: updatedProgress }));

  try {
    const userRef = doc(db, "students", user.uid); // ❌ Firebase code
    await updateDoc(userRef, {
      [`taskProgress.${taskId}`]: updatedProgress,
    });
  } catch (error) {
    console.error("Error updating task progress:", error);
  }
};
```

### **Fix:**
Replace Firebase code with Supabase:

```javascript
const updateTaskProgress = async (taskId, step) => {
  const user = auth.currentUser;
  if (!user) return;

  const progressKey = `taskProgress_${user.uid}_${taskId}`;
  const currentProgress = JSON.parse(
    localStorage.getItem(progressKey) || "{}"
  );
  const updatedProgress = { ...currentProgress, [step]: Date.now() };
  localStorage.setItem(progressKey, JSON.stringify(updatedProgress));
  setTaskProgress((prev) => ({ ...prev, [taskId]: updatedProgress }));

  try {
    // Use Supabase instead of Firebase
    const { error } = await supabase
      .from("students")
      .update({
        task_progress: {
          ...userData?.task_progress,
          [taskId]: updatedProgress
        }
      })
      .eq("id", user.uid);

    if (error) {
      console.error("Error updating task progress:", error);
    }
  } catch (error) {
    console.error("Error updating task progress:", error);
  }
};
```

**Also check for other Firebase imports that need to be removed:**
Look for these imports at the top of `StudentDashboard.js`:
```javascript
import { doc, updateDoc, setDoc, getDoc, collection, addDoc } from "firebase/firestore";
import { db } from "../firebase";
```

These should be removed or replaced with Supabase equivalents.

---

## Error 5: HTTP 500 - Backend Quiz Generation

### **Error Message:**
```
POST http://localhost:10000/api/generate-quiz 500 (Internal Server Error)
```

### **Root Cause:**
Your backend server at `localhost:10000` is encountering an error when generating quizzes. This could be due to:
1. Missing API keys (OpenAI, Gemini, etc.)
2. Backend code errors
3. Database connection issues

### **Fix:**
Check your backend server logs to see the specific error. The backend terminal should show the error details.

**Common fixes:**

**1. Check environment variables in `edugen-backend/.env`:**
```env
OPENAI_API_KEY=your_key_here
GEMINI_API_KEY=your_key_here
# or whatever AI service you're using
```

**2. Check the backend route handler:**
Look for the `/api/generate-quiz` endpoint in your backend code and ensure:
- API keys are loaded correctly
- Error handling is in place
- The AI service is responding

**3. Add better error logging:**
In your backend `server.js` or route file:
```javascript
app.post('/api/generate-quiz', async (req, res) => {
  try {
    // ... quiz generation logic
  } catch (error) {
    console.error('Quiz generation error:', error);
    res.status(500).json({ 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});
```

---

## Additional Issues Found

### **Issue: Mixed Firebase and Supabase Code**

Your code has references to both Firebase and Supabase. You need to complete the migration:

**Lines to check in StudentDashboard.js:**
- Line 1114: `const goalsRef = doc(db, "students", user.uid, "goals", "list");`
- Line 1115: `await setDoc(goalsRef, { goals: updatedGoals });`
- Line 1167: `const goalsRef = doc(db, "students", user.uid, "goals", "list");`
- Line 1168: `await setDoc(goalsRef, { goals: updatedGoals });`
- Line 1210: `const goalsRef = doc(db, "students", user.uid, "goals", "list");`
- Line 1211: `await setDoc(goalsRef, { goals: updatedGoals });`
- Line 1247: `const feedbackColRef = collection(db, "students", user.uid, "feedback");`
- Line 1248: `await addDoc(feedbackColRef, { ... });`

All of these need to be replaced with Supabase equivalents using the `saveGoals` function that's already imported.

---

## Priority Order for Fixes

1. **HIGHEST PRIORITY**: Fix Error 4 (ReferenceError) - This is breaking functionality
2. **HIGH**: Fix Error 3 (RLS policies) - Preventing data saves
3. **HIGH**: Fix Error 2 (NULL constraint) - Preventing student updates
4. **MEDIUM**: Fix Error 5 (Backend 500) - Quiz generation not working
5. **LOW**: Fix Error 1 (406 errors) - May be related to other fixes

---

## Implementation Steps

### Step 1: Fix the ReferenceError (Error 4)
1. Remove Firebase imports from `StudentDashboard.js`
2. Replace all `doc()`, `setDoc()`, `updateDoc()`, `getDoc()`, `collection()`, `addDoc()` calls with Supabase equivalents
3. Use the existing Supabase functions like `saveGoals()`, `updateStudentData()`, etc.

### Step 2: Fix RLS Policies (Error 3)
1. Open Supabase SQL Editor
2. Run the SQL commands provided above
3. Test task completion functionality

### Step 3: Fix NULL Constraint (Error 2)
1. Update `updateStudentData` function in `supabase.js`
2. Ensure email is always included or change onConflict to 'id'

### Step 4: Fix Backend Quiz Generation (Error 5)
1. Check backend logs
2. Verify environment variables
3. Add error logging

### Step 5: Fix 406 Errors (Error 1)
1. Add global headers to Supabase client
2. Test API calls

---

## Testing Checklist

After implementing fixes:

- [ ] Can complete a quiz without errors
- [ ] Task completion saves to database
- [ ] Student data updates successfully
- [ ] Goals can be added/updated/deleted
- [ ] No 406 errors in console
- [ ] No 403 errors in console
- [ ] No 400 errors in console
- [ ] No ReferenceErrors in console
- [ ] Backend quiz generation works

---

## Need Help?

If you encounter issues after implementing these fixes, check:
1. Browser console for detailed error messages
2. Supabase dashboard logs
3. Backend server terminal output
4. Network tab in browser DevTools to see exact request/response

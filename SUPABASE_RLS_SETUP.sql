# Supabase Row Level Security (RLS) Policies Setup

## Instructions
Run these SQL commands in your Supabase SQL Editor to fix the 403 Forbidden errors.

**How to access SQL Editor:**
1. Go to https://supabase.com/dashboard
2. Select your project: `atvczvzygjsqrelrwtic`
3. Click on "SQL Editor" in the left sidebar
4. Paste and run each section below

---

## 1. Enable RLS on Required Tables

```sql
-- Enable RLS on task_status table if not already enabled
ALTER TABLE task_status ENABLE ROW LEVEL SECURITY;

-- Enable RLS on feedback table if not already enabled
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
```

---

## 2. Task Status Policies

### Drop existing policies (if any)
```sql
-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Students can insert their own task status" ON task_status;
DROP POLICY IF EXISTS "Students can update their own task status" ON task_status;
DROP POLICY IF EXISTS "Students can read their own task status" ON task_status;
DROP POLICY IF EXISTS "Students can delete their own task status" ON task_status;
```

### Create new policies
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

-- Allow students to delete their own task status
CREATE POLICY "Students can delete their own task status"
ON task_status
FOR DELETE
TO authenticated
USING (auth.uid() = student_id);
```

---

## 3. Feedback Table Policies

### Drop existing policies (if any)
```sql
-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Students can insert their own feedback" ON feedback;
DROP POLICY IF EXISTS "Students can read their own feedback" ON feedback;
DROP POLICY IF EXISTS "Staff can read all feedback" ON feedback;
```

### Create new policies
```sql
-- Allow students to insert their own feedback
CREATE POLICY "Students can insert their own feedback"
ON feedback
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = student_id);

-- Allow students to read their own feedback
CREATE POLICY "Students can read their own feedback"
ON feedback
FOR SELECT
TO authenticated
USING (auth.uid() = student_id);

-- Allow staff to read all feedback (optional)
CREATE POLICY "Staff can read all feedback"
ON feedback
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM staff
    WHERE staff.id = auth.uid()
  )
);
```

---

## 4. Students Table Policies (if needed)

### Check existing policies
```sql
-- View existing policies on students table
SELECT * FROM pg_policies WHERE tablename = 'students';
```

### Update if needed
```sql
-- Drop existing update policy if it's too restrictive
DROP POLICY IF EXISTS "Students can update their own data" ON students;

-- Create policy allowing students to update their own data
CREATE POLICY "Students can update their own data"
ON students
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);
```

---

## 5. Verify Policies

```sql
-- Check all policies on task_status
SELECT * FROM pg_policies WHERE tablename = 'task_status';

-- Check all policies on feedback
SELECT * FROM pg_policies WHERE tablename = 'feedback';

-- Check all policies on students
SELECT * FROM pg_policies WHERE tablename = 'students';
```

---

## 6. Test the Policies

After running the above commands, test by:
1. Completing a quiz in your app
2. Submitting feedback
3. Updating student progress
4. Check browser console for any remaining 403 errors

---

## Troubleshooting

### If you still get 403 errors:

**Check if the user is authenticated:**
```sql
-- Run this in SQL Editor to see current auth status
SELECT auth.uid();
```

**Check table structure:**
```sql
-- Verify task_status table has student_id column
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'task_status';

-- Verify feedback table has student_id column
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'feedback';
```

**If student_id column doesn't exist, create it:**
```sql
-- Add student_id to task_status if missing
ALTER TABLE task_status 
ADD COLUMN IF NOT EXISTS student_id UUID REFERENCES auth.users(id);

-- Add student_id to feedback if missing
ALTER TABLE feedback 
ADD COLUMN IF NOT EXISTS student_id UUID REFERENCES auth.users(id);
```

---

## Notes

- These policies ensure that students can only access their own data
- Staff members can read feedback from all students
- All policies use `auth.uid()` which returns the currently authenticated user's ID
- Make sure your application is properly authenticating users before making database calls

---

## After Running These Commands

1. Refresh your application
2. Try completing a quiz
3. Try submitting feedback
4. Check the browser console - the 403 errors should be gone!

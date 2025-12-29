
-- 1. Enable RLS on students table
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Students can read their own data" ON students;
DROP POLICY IF EXISTS "Students can update their own data" ON students;
DROP POLICY IF EXISTS "Students can insert their own data" ON students;

-- 3. Allow students to read their own data (CRITICAL for login check)
CREATE POLICY "Students can read their own data"
ON students
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- 4. Allow students to update their own data
CREATE POLICY "Students can update their own data"
ON students
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 5. Allow students to insert their own data (CRITICAL for first-time login)
CREATE POLICY "Students can insert their own data"
ON students
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- 6. Verify policies
SELECT * FROM pg_policies WHERE tablename = 'students';

-- Alternative fix for goals table RLS policies
-- This version uses a different approach that's more compatible

-- First, disable RLS temporarily to drop policies
ALTER TABLE goals DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view their own goals" ON goals;
DROP POLICY IF EXISTS "Users can insert their own goals" ON goals;
DROP POLICY IF EXISTS "Users can update their own goals" ON goals;
DROP POLICY IF EXISTS "Users can delete their own goals" ON goals;

-- Re-enable RLS
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;

-- Create new policies with explicit casting
-- SELECT policy
CREATE POLICY "Users can view their own goals"
ON goals FOR SELECT
TO authenticated
USING (student_id = (auth.uid())::text);

-- INSERT policy
CREATE POLICY "Users can insert their own goals"
ON goals FOR INSERT
TO authenticated
WITH CHECK (student_id = (auth.uid())::text);

-- UPDATE policy
CREATE POLICY "Users can update their own goals"
ON goals FOR UPDATE
TO authenticated
USING (student_id = (auth.uid())::text)
WITH CHECK (student_id = (auth.uid())::text);

-- DELETE policy
CREATE POLICY "Users can delete their own goals"
ON goals FOR DELETE
TO authenticated
USING (student_id = (auth.uid())::text);

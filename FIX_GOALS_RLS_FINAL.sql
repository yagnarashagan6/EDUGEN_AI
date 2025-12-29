-- Fix for goals table RLS policies
-- student_id is UUID type, so we don't need to cast it

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own goals" ON goals;
DROP POLICY IF EXISTS "Users can insert their own goals" ON goals;
DROP POLICY IF EXISTS "Users can update their own goals" ON goals;
DROP POLICY IF EXISTS "Users can delete their own goals" ON goals;

-- Create new policies without type casting (both are UUID)
CREATE POLICY "Users can view their own goals"
ON goals FOR SELECT
TO authenticated
USING (student_id = auth.uid());

CREATE POLICY "Users can insert their own goals"
ON goals FOR INSERT
TO authenticated
WITH CHECK (student_id = auth.uid());

CREATE POLICY "Users can update their own goals"
ON goals FOR UPDATE
TO authenticated
USING (student_id = auth.uid())
WITH CHECK (student_id = auth.uid());

CREATE POLICY "Users can delete their own goals"
ON goals FOR DELETE
TO authenticated
USING (student_id = auth.uid());

-- Ensure RLS is enabled
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;

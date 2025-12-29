-- Fix RLS policies for goals table to allow proper access
-- This fixes the 406 (Not Acceptable) errors

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own goals" ON goals;
DROP POLICY IF EXISTS "Users can insert their own goals" ON goals;
DROP POLICY IF EXISTS "Users can update their own goals" ON goals;
DROP POLICY IF EXISTS "Users can delete their own goals" ON goals;

-- Create new policies that work correctly with proper type casting
-- Note: student_id is TEXT, so we cast auth.uid() to TEXT
CREATE POLICY "Users can view their own goals"
ON goals FOR SELECT
USING (student_id = auth.uid()::text);

CREATE POLICY "Users can insert their own goals"
ON goals FOR INSERT
WITH CHECK (student_id = auth.uid()::text);

CREATE POLICY "Users can update their own goals"
ON goals FOR UPDATE
USING (student_id = auth.uid()::text)
WITH CHECK (student_id = auth.uid()::text);

CREATE POLICY "Users can delete their own goals"
ON goals FOR DELETE
USING (student_id = auth.uid()::text);

-- Ensure RLS is enabled
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;

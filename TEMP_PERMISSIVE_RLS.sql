-- TEMPORARY: Allow all authenticated users to read all student records
-- This is for debugging only - we'll restrict it later

-- Drop the restrictive policy
DROP POLICY IF EXISTS "Students can read their own data" ON students;

-- Create a temporary permissive policy
CREATE POLICY "Temp: All authenticated can read students"
ON students
FOR SELECT
TO authenticated
USING (true);

-- Verify the policy was created
SELECT policyname, cmd, qual::text 
FROM pg_policies 
WHERE tablename = 'students' AND cmd = 'SELECT';

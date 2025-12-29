-- First, let's check if there's a mismatch between auth.uid() and the student IDs
-- Run this to see what auth.uid() returns when you're logged in
SELECT auth.uid() as current_user_id;

-- Then check if that ID exists in the students table
SELECT id, email, form_filled FROM students WHERE id = auth.uid();

-- If the above returns nothing, let's see all students
SELECT id, email, form_filled FROM students LIMIT 10;

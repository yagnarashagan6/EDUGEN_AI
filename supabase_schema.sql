-- ============================================
-- SUPABASE DATABASE SCHEMA FOR EDUGEN AI
-- ============================================
-- This script creates all tables needed to replace Firestore
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. NOTES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  url TEXT,
  type TEXT CHECK (type IN ('youtube', 'article', 'file')),
  subject TEXT NOT NULL,
  shared_with TEXT[] DEFAULT ARRAY['all']::TEXT[],
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. MESSAGES TABLE (Chat)
-- ============================================
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_id TEXT UNIQUE NOT NULL,
  messages JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 3. STAFF TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS staff (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT,
  form_filled BOOLEAN DEFAULT FALSE,
  stats JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 4. STUDENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  dob DATE,
  streak INTEGER DEFAULT 0,
  progress INTEGER DEFAULT 0,
  quiz_count INTEGER DEFAULT 0,
  last_login TIMESTAMPTZ,
  photo_url TEXT,
  total_time_spent_ms BIGINT DEFAULT 0,
  daily_sessions JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 5. TASK_STATUS TABLE (Student's task completion)
-- ============================================
CREATE TABLE IF NOT EXISTS task_status (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  task_id TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  topic TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, task_id)
);

-- ============================================
-- 6. MARKS TABLE (Assignment marks)
-- ============================================
CREATE TABLE IF NOT EXISTS marks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  assignment_id UUID NOT NULL,
  marks INTEGER,
  feedback TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, assignment_id)
);

-- ============================================
-- 7. SUBMISSIONS TABLE (Assignment submissions)
-- ============================================
CREATE TABLE IF NOT EXISTS submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  assignment_id UUID NOT NULL,
  link TEXT,
  download_link TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  file_name TEXT,
  file_type TEXT,
  resource_type TEXT,
  public_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, assignment_id)
);

-- ============================================
-- 8. GOALS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  goals JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id)
);

-- ============================================
-- 9. NOTIFICATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  notification_data JSONB NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 10. FEEDBACK TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  feedback_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 11. ANALYTICS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  analytics_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 12. TASKS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tasks JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default shared tasks document
INSERT INTO tasks (id, tasks) 
VALUES ('00000000-0000-0000-0000-000000000001', '[]'::jsonb)
ON CONFLICT DO NOTHING;

-- ============================================
-- 13. LEADERBOARD TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS leaderboard (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  streak INTEGER DEFAULT 0,
  progress INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id)
);

-- ============================================
-- 14. CIRCULARS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS circulars (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  content TEXT,
  circular_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 15. ASSIGNMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject TEXT NOT NULL,
  drive_link TEXT,
  deadline TIMESTAMPTZ,
  posted_at TIMESTAMPTZ DEFAULT NOW(),
  staff_id UUID REFERENCES staff(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 16. STUDENT_ACTIVITIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS student_activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  subject TEXT,
  activity_data JSONB,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 17. SETTINGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  setting_key TEXT UNIQUE NOT NULL,
  setting_value JSONB NOT NULL,
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 18. APPROVED_CONTENT TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS approved_content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject TEXT NOT NULL,
  topic TEXT NOT NULL,
  subtopic TEXT,
  ai_answer TEXT,
  quiz_questions JSONB,
  quiz_config JSONB,
  difficulty TEXT,
  staff_id TEXT NOT NULL,
  staff_name TEXT,
  files_used JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(subject, topic)
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Notes indexes
CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_subject ON notes(subject);
CREATE INDEX IF NOT EXISTS idx_notes_timestamp ON notes(timestamp DESC);

-- Messages indexes
CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);

-- Task status indexes
CREATE INDEX IF NOT EXISTS idx_task_status_student_id ON task_status(student_id);
CREATE INDEX IF NOT EXISTS idx_task_status_task_id ON task_status(task_id);

-- Marks indexes
CREATE INDEX IF NOT EXISTS idx_marks_student_id ON marks(student_id);
CREATE INDEX IF NOT EXISTS idx_marks_assignment_id ON marks(assignment_id);

-- Submissions indexes
CREATE INDEX IF NOT EXISTS idx_submissions_student_id ON submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_submissions_assignment_id ON submissions(assignment_id);

-- Goals indexes
CREATE INDEX IF NOT EXISTS idx_goals_student_id ON goals(student_id);

-- Notifications indexes
CREATE INDEX IF NOT EXISTS idx_notifications_student_id ON notifications(student_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);

-- Feedback indexes
CREATE INDEX IF NOT EXISTS idx_feedback_student_id ON feedback(student_id);

-- Analytics indexes
CREATE INDEX IF NOT EXISTS idx_analytics_student_id ON analytics(student_id);

-- Leaderboard indexes
CREATE INDEX IF NOT EXISTS idx_leaderboard_student_id ON leaderboard(student_id);
CREATE INDEX IF NOT EXISTS idx_leaderboard_progress ON leaderboard(progress DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_streak ON leaderboard(streak DESC);

-- Assignments indexes
CREATE INDEX IF NOT EXISTS idx_assignments_staff_id ON assignments(staff_id);
CREATE INDEX IF NOT EXISTS idx_assignments_posted_at ON assignments(posted_at DESC);
CREATE INDEX IF NOT EXISTS idx_assignments_deadline ON assignments(deadline);

-- Student activities indexes
CREATE INDEX IF NOT EXISTS idx_student_activities_student_id ON student_activities(student_id);
CREATE INDEX IF NOT EXISTS idx_student_activities_timestamp ON student_activities(timestamp DESC);

-- Settings indexes
CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(setting_key);

-- Approved content indexes
CREATE INDEX IF NOT EXISTS idx_approved_content_subject_topic ON approved_content(subject, topic);
CREATE INDEX IF NOT EXISTS idx_approved_content_staff_id ON approved_content(staff_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE marks ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard ENABLE ROW LEVEL SECURITY;
ALTER TABLE circulars ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE approved_content ENABLE ROW LEVEL SECURITY;

-- Notes policies
CREATE POLICY "Users can read notes shared with them"
  ON notes FOR SELECT
  TO authenticated
  USING ('all' = ANY(shared_with) OR auth.uid()::text = ANY(shared_with));

CREATE POLICY "Authenticated users can insert notes"
  ON notes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notes"
  ON notes FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notes"
  ON notes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Messages policies (accessible by both participants)
CREATE POLICY "Users can read their messages"
  ON messages FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert messages"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update messages"
  ON messages FOR UPDATE
  TO authenticated
  USING (true);

-- Staff policies
CREATE POLICY "Staff can read all staff data"
  ON staff FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Staff can update their own data"
  ON staff FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Staff can insert their own data"
  ON staff FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Students policies
CREATE POLICY "Students can read all student data"
  ON students FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Students can update their own data"
  ON students FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Students can insert their own data"
  ON students FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Task status policies
CREATE POLICY "Students can read their own task status"
  ON task_status FOR SELECT
  TO authenticated
  USING (auth.uid() = student_id);

CREATE POLICY "Students can manage their own task status"
  ON task_status FOR ALL
  TO authenticated
  USING (auth.uid() = student_id);

-- Marks policies
CREATE POLICY "Students can read their own marks"
  ON marks FOR SELECT
  TO authenticated
  USING (auth.uid() = student_id);

CREATE POLICY "Staff can manage all marks"
  ON marks FOR ALL
  TO authenticated
  USING (true);

-- Submissions policies
CREATE POLICY "Students can read their own submissions"
  ON submissions FOR SELECT
  TO authenticated
  USING (auth.uid() = student_id);

CREATE POLICY "Students can manage their own submissions"
  ON submissions FOR ALL
  TO authenticated
  USING (auth.uid() = student_id);

-- Goals policies
CREATE POLICY "Students can read their own goals"
  ON goals FOR SELECT
  TO authenticated
  USING (auth.uid() = student_id);

CREATE POLICY "Students can manage their own goals"
  ON goals FOR ALL
  TO authenticated
  USING (auth.uid() = student_id);

-- Notifications policies
CREATE POLICY "Students can read their own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = student_id);

CREATE POLICY "Students can manage their own notifications"
  ON notifications FOR ALL
  TO authenticated
  USING (auth.uid() = student_id);

-- Feedback policies
CREATE POLICY "Students can read their own feedback"
  ON feedback FOR SELECT
  TO authenticated
  USING (auth.uid() = student_id);

CREATE POLICY "Authenticated users can insert feedback"
  ON feedback FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Analytics policies
CREATE POLICY "Students can read their own analytics"
  ON analytics FOR SELECT
  TO authenticated
  USING (auth.uid() = student_id);

CREATE POLICY "Students can manage their own analytics"
  ON analytics FOR ALL
  TO authenticated
  USING (auth.uid() = student_id);

-- Tasks policies (shared, readable by all)
CREATE POLICY "Authenticated users can read tasks"
  ON tasks FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage tasks"
  ON tasks FOR ALL
  TO authenticated
  USING (true);

-- Leaderboard policies
CREATE POLICY "Authenticated users can read leaderboard"
  ON leaderboard FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage leaderboard"
  ON leaderboard FOR ALL
  TO authenticated
  USING (true);

-- Circulars policies
CREATE POLICY "Authenticated users can read circulars"
  ON circulars FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Staff can manage circulars"
  ON circulars FOR ALL
  TO authenticated
  USING (true);

-- Assignments policies
CREATE POLICY "Authenticated users can read assignments"
  ON assignments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Staff can manage assignments"
  ON assignments FOR ALL
  TO authenticated
  USING (true);

-- Student activities policies
CREATE POLICY "Students can read their own activities"
  ON student_activities FOR SELECT
  TO authenticated
  USING (auth.uid() = student_id);

CREATE POLICY "Students can insert their own activities"
  ON student_activities FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = student_id);

-- Settings policies
CREATE POLICY "Authenticated users can read settings"
  ON settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage settings"
  ON settings FOR ALL
  TO authenticated
  USING (true);

-- Approved content policies
CREATE POLICY "Authenticated users can read approved content"
  ON approved_content FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Staff can manage approved content"
  ON approved_content FOR ALL
  TO authenticated
  USING (true);

-- ============================================
-- ENABLE REALTIME
-- ============================================

-- Enable realtime for all tables
ALTER PUBLICATION supabase_realtime ADD TABLE notes;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE staff;
ALTER PUBLICATION supabase_realtime ADD TABLE students;
ALTER PUBLICATION supabase_realtime ADD TABLE task_status;
ALTER PUBLICATION supabase_realtime ADD TABLE marks;
ALTER PUBLICATION supabase_realtime ADD TABLE submissions;
ALTER PUBLICATION supabase_realtime ADD TABLE goals;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE feedback;
ALTER PUBLICATION supabase_realtime ADD TABLE analytics;
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE leaderboard;
ALTER PUBLICATION supabase_realtime ADD TABLE circulars;
ALTER PUBLICATION supabase_realtime ADD TABLE assignments;
ALTER PUBLICATION supabase_realtime ADD TABLE student_activities;
ALTER PUBLICATION supabase_realtime ADD TABLE settings;
ALTER PUBLICATION supabase_realtime ADD TABLE approved_content;

-- ============================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for all tables with updated_at
CREATE TRIGGER update_notes_updated_at BEFORE UPDATE ON notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_staff_updated_at BEFORE UPDATE ON staff
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON students
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_task_status_updated_at BEFORE UPDATE ON task_status
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_marks_updated_at BEFORE UPDATE ON marks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_submissions_updated_at BEFORE UPDATE ON submissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_goals_updated_at BEFORE UPDATE ON goals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_analytics_updated_at BEFORE UPDATE ON analytics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leaderboard_updated_at BEFORE UPDATE ON leaderboard
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_circulars_updated_at BEFORE UPDATE ON circulars
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assignments_updated_at BEFORE UPDATE ON assignments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_approved_content_updated_at BEFORE UPDATE ON approved_content
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- COMPLETE!
-- ============================================
-- All tables, indexes, RLS policies, and triggers have been created.
-- You can now use these tables with your Supabase client.

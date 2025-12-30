-- ============================================
-- APPROVED_CONTENT TABLE SETUP
-- ============================================

-- 1. Create Table
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

-- 2. Indexes
CREATE INDEX IF NOT EXISTS idx_approved_content_subject_topic ON approved_content(subject, topic);
CREATE INDEX IF NOT EXISTS idx_approved_content_staff_id ON approved_content(staff_id);

-- 3. RLS
ALTER TABLE approved_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read approved content"
  ON approved_content FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Staff can manage approved content"
  ON approved_content FOR ALL
  TO authenticated
  USING (true);

-- 4. Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE approved_content;

-- 5. Trigger
CREATE TRIGGER update_approved_content_updated_at BEFORE UPDATE ON approved_content
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 6. Reload Schema Cache (to ensure PostgREST sees the new table immediately)
NOTIFY pgrst, 'reload schema';

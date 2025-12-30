-- ============================================
-- ADAPTIVE QUIZ SYSTEM SCHEMA
-- ============================================
-- Add these tables to support adaptive quiz functionality

-- ============================================
-- 1. QUIZZES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS quizzes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  topic TEXT NOT NULL,
  subtopic TEXT,
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
  question_count INTEGER NOT NULL,
  questions JSONB NOT NULL, -- Array of question objects
  quiz_type TEXT CHECK (quiz_type IN ('baseline', 'adaptive', 'general')) DEFAULT 'general',
  parent_quiz_id UUID REFERENCES quizzes(id) ON DELETE SET NULL, -- For adaptive quizzes
  target_group TEXT, -- For adaptive quizzes: 'strength', 'average', 'weakness'
  staff_id UUID REFERENCES staff(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_published BOOLEAN DEFAULT FALSE,
  published_at TIMESTAMPTZ
);

-- ============================================
-- 2. QUIZ_ATTEMPTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  student_name TEXT NOT NULL,
  answers JSONB NOT NULL, -- Array of {questionIndex, selectedAnswer, isCorrect}
  answer_format TEXT NOT NULL, -- 5-letter sequence like "aabcd"
  score INTEGER NOT NULL,
  total_questions INTEGER NOT NULL,
  time_taken_seconds INTEGER,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 3. STUDENT_PERFORMANCE TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS student_performance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  subtopic TEXT,
  difficulty TEXT,
  score INTEGER NOT NULL,
  total_questions INTEGER NOT NULL,
  percentage DECIMAL(5,2),
  strengths JSONB DEFAULT '[]'::jsonb, -- Array of subtopics
  weaknesses JSONB DEFAULT '[]'::jsonb, -- Array of subtopics
  ability_estimate DECIMAL(5,2), -- IRT-based ability estimate
  confidence_level DECIMAL(5,2), -- Confidence in ability estimate
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, quiz_id)
);

-- ============================================
-- 4. STUDENT_GROUPS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS student_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  student_name TEXT NOT NULL,
  answer_format TEXT NOT NULL, -- 5-letter sequence
  group_type TEXT CHECK (group_type IN ('strength', 'average', 'weakness')) NOT NULL,
  performance_score DECIMAL(5,2),
  subtopic_scores JSONB DEFAULT '{}'::jsonb, -- {subtopic: score}
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(quiz_id, student_id)
);

-- ============================================
-- 5. QUESTION_BANK TABLE (for IRT calibration)
-- ============================================
CREATE TABLE IF NOT EXISTS question_bank (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question_text TEXT NOT NULL,
  options JSONB NOT NULL, -- Array of 4 options
  correct_answer TEXT NOT NULL,
  topic TEXT NOT NULL,
  subtopic TEXT,
  difficulty_level TEXT CHECK (difficulty_level IN ('easy', 'medium', 'hard')),
  cognitive_level TEXT CHECK (cognitive_level IN ('recall', 'application', 'transfer')),
  tags JSONB DEFAULT '[]'::jsonb,
  -- IRT parameters
  difficulty_param DECIMAL(5,2), -- Item difficulty (b parameter)
  discrimination_param DECIMAL(5,2), -- Item discrimination (a parameter)
  guessing_param DECIMAL(5,2) DEFAULT 0.25, -- Guessing parameter (c parameter)
  -- Usage statistics
  times_used INTEGER DEFAULT 0,
  times_correct INTEGER DEFAULT 0,
  avg_time_seconds DECIMAL(8,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Quizzes indexes
CREATE INDEX IF NOT EXISTS idx_quizzes_staff_id ON quizzes(staff_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_topic ON quizzes(topic);
CREATE INDEX IF NOT EXISTS idx_quizzes_quiz_type ON quizzes(quiz_type);
CREATE INDEX IF NOT EXISTS idx_quizzes_parent_quiz_id ON quizzes(parent_quiz_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_published ON quizzes(is_published);

-- Quiz attempts indexes
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz_id ON quiz_attempts(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_student_id ON quiz_attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_answer_format ON quiz_attempts(answer_format);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_submitted_at ON quiz_attempts(submitted_at DESC);

-- Student performance indexes
CREATE INDEX IF NOT EXISTS idx_student_performance_student_id ON student_performance(student_id);
CREATE INDEX IF NOT EXISTS idx_student_performance_quiz_id ON student_performance(quiz_id);
CREATE INDEX IF NOT EXISTS idx_student_performance_topic ON student_performance(topic);

-- Student groups indexes
CREATE INDEX IF NOT EXISTS idx_student_groups_quiz_id ON student_groups(quiz_id);
CREATE INDEX IF NOT EXISTS idx_student_groups_student_id ON student_groups(student_id);
CREATE INDEX IF NOT EXISTS idx_student_groups_group_type ON student_groups(group_type);
CREATE INDEX IF NOT EXISTS idx_student_groups_answer_format ON student_groups(answer_format);

-- Question bank indexes
CREATE INDEX IF NOT EXISTS idx_question_bank_topic ON question_bank(topic);
CREATE INDEX IF NOT EXISTS idx_question_bank_subtopic ON question_bank(subtopic);
CREATE INDEX IF NOT EXISTS idx_question_bank_difficulty ON question_bank(difficulty_level);
CREATE INDEX IF NOT EXISTS idx_question_bank_cognitive_level ON question_bank(cognitive_level);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_bank ENABLE ROW LEVEL SECURITY;

-- Quizzes policies
CREATE POLICY "Staff can manage their own quizzes"
  ON quizzes FOR ALL
  TO authenticated
  USING (auth.uid() = staff_id);

CREATE POLICY "Students can read published quizzes"
  ON quizzes FOR SELECT
  TO authenticated
  USING (is_published = true);

-- Quiz attempts policies
CREATE POLICY "Students can read their own attempts"
  ON quiz_attempts FOR SELECT
  TO authenticated
  USING (auth.uid() = student_id);

CREATE POLICY "Students can insert their own attempts"
  ON quiz_attempts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Staff can read all attempts"
  ON quiz_attempts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM quizzes q
      WHERE q.id = quiz_attempts.quiz_id
      AND q.staff_id = auth.uid()
    )
  );

-- Student performance policies
CREATE POLICY "Students can read their own performance"
  ON student_performance FOR SELECT
  TO authenticated
  USING (auth.uid() = student_id);

CREATE POLICY "Staff can read all performance data"
  ON student_performance FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM quizzes q
      WHERE q.id = student_performance.quiz_id
      AND q.staff_id = auth.uid()
    )
  );

CREATE POLICY "System can manage performance data"
  ON student_performance FOR ALL
  TO authenticated
  USING (true);

-- Student groups policies
CREATE POLICY "Students can read their own group"
  ON student_groups FOR SELECT
  TO authenticated
  USING (auth.uid() = student_id);

CREATE POLICY "Staff can read all groups"
  ON student_groups FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM quizzes q
      WHERE q.id = student_groups.quiz_id
      AND q.staff_id = auth.uid()
    )
  );

CREATE POLICY "System can manage groups"
  ON student_groups FOR ALL
  TO authenticated
  USING (true);

-- Question bank policies
CREATE POLICY "Authenticated users can read question bank"
  ON question_bank FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Staff can manage question bank"
  ON question_bank FOR ALL
  TO authenticated
  USING (true);

-- ============================================
-- ENABLE REALTIME
-- ============================================

ALTER PUBLICATION supabase_realtime ADD TABLE quizzes;
ALTER PUBLICATION supabase_realtime ADD TABLE quiz_attempts;
ALTER PUBLICATION supabase_realtime ADD TABLE student_performance;
ALTER PUBLICATION supabase_realtime ADD TABLE student_groups;
ALTER PUBLICATION supabase_realtime ADD TABLE question_bank;

-- ============================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================

CREATE TRIGGER update_quizzes_updated_at BEFORE UPDATE ON quizzes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_student_performance_updated_at BEFORE UPDATE ON student_performance
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_student_groups_updated_at BEFORE UPDATE ON student_groups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_question_bank_updated_at BEFORE UPDATE ON question_bank
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to calculate answer format from answers array
CREATE OR REPLACE FUNCTION calculate_answer_format(answers JSONB)
RETURNS TEXT AS $$
DECLARE
  format TEXT := '';
  answer JSONB;
BEGIN
  FOR answer IN SELECT * FROM jsonb_array_elements(answers)
  LOOP
    format := format || LOWER(SUBSTRING(answer->>'selectedAnswer' FROM 1 FOR 1));
  END LOOP;
  RETURN format;
END;
$$ LANGUAGE plpgsql;

-- Function to group students by performance
CREATE OR REPLACE FUNCTION group_students_by_performance(p_quiz_id UUID)
RETURNS TABLE (
  student_id UUID,
  student_name TEXT,
  answer_format TEXT,
  group_type TEXT,
  performance_score DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    qa.student_id,
    qa.student_name,
    qa.answer_format,
    CASE 
      WHEN (qa.score::DECIMAL / qa.total_questions * 100) >= 80 THEN 'strength'::TEXT
      WHEN (qa.score::DECIMAL / qa.total_questions * 100) >= 50 THEN 'average'::TEXT
      ELSE 'weakness'::TEXT
    END as group_type,
    (qa.score::DECIMAL / qa.total_questions * 100) as performance_score
  FROM quiz_attempts qa
  WHERE qa.quiz_id = p_quiz_id
  ORDER BY performance_score DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- COMPLETE!
-- ============================================

-- Create table for storing RAG-generated answers
-- This table stores answers generated from PDFs using the RAG model
-- Answers are shared across all students for a given topic

CREATE TABLE IF NOT EXISTS rag_answers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  topic TEXT NOT NULL,
  subtopic TEXT,
  pdf_name TEXT NOT NULL,
  answer TEXT NOT NULL,
  sources TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint: one answer per topic+subtopic combination
  UNIQUE(topic, subtopic)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_rag_answers_topic ON rag_answers(topic);
CREATE INDEX IF NOT EXISTS idx_rag_answers_pdf_name ON rag_answers(pdf_name);
CREATE INDEX IF NOT EXISTS idx_rag_answers_created_at ON rag_answers(created_at DESC);

-- Enable Row Level Security
ALTER TABLE rag_answers ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read RAG answers (students and staff)
CREATE POLICY "Anyone can read RAG answers"
  ON rag_answers
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow only staff (or service role) to insert/update RAG answers
-- You may need to add a check for staff role here if you have role-based access
CREATE POLICY "Service role can insert/update RAG answers"
  ON rag_answers
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Optional: Allow staff users to insert/update
-- Uncomment if you have a staff role check
-- CREATE POLICY "Staff can insert/update RAG answers"
--   ON rag_answers
--   FOR ALL
--   TO authenticated
--   USING (auth.uid() IN (SELECT id FROM staff))
--   WITH CHECK (auth.uid() IN (SELECT id FROM staff));

--  Function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_rag_answers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to call the function before update
CREATE TRIGGER trigger_update_rag_answers_updated_at
  BEFORE UPDATE ON rag_answers
  FOR EACH ROW
  EXECUTE FUNCTION update_rag_answers_updated_at();

-- Grant permissions
GRANT SELECT ON rag_answers TO authenticated;
GRANT ALL ON rag_answers TO service_role;

COMMENT ON TABLE rag_answers IS 'Stores AI-generated answers from PDF documents using RAG model. Answers are shared across all students for each topic.';
COMMENT ON COLUMN rag_answers.topic IS 'Main topic of the answer';
COMMENT ON COLUMN rag_answers.subtopic IS 'Optional subtopic for more specific answers';
COMMENT ON COLUMN rag_answers.pdf_name IS 'Name of the PDF file used to generate the answer';
COMMENT ON COLUMN rag_answers.answer IS 'The generated answer text (markdown formatted)';
COMMENT ON COLUMN rag_answers.sources IS 'Array of source filenames used in answer generation';

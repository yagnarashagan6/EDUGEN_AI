# RAG-Based Answer Generation Implementation Guide

## Overview
This implementation adds a PDF upload feature to the staff dashboard that connects to a RAG (Retrieval-Augmented Generation) model. When staff post a task, they can select a PDF and the RAG model will extract information from it, which the AI then uses to generate a structured 16-mark answer. This answer is shared with ALL students for that topic.

## Architecture

### Components Created:
1. **RAG API (Flask)** - `c:\EDUGEN_AI\rag model\rag_api.py`
2. **Node.js Backend Proxy** - Updated `c:\EDUGEN_AI\edugen-backend\server.js`
3. **Supabase Schema** - `c:\EDUGEN_AI\SUPABASE_RAG_ANSWERS_SCHEMA.sql`
4. **Frontend Components** - To be added to Staff Dashboard

### Data Flow:
```
Staff uploads PDF → Stored in rag model/pdfs/ folder
     ↓
Staff posts task with topic + PDF selection
     ↓
Frontend calls /api/rag/generate-answer
     ↓
Node backend proxies to Flask RAG API
     ↓
RAG API:
  - Retrieves relevant chunks from PDF using vector search
  - Sends to Groq AI with enhanced prompt for 16-mark answer
  - Returns structured answer
     ↓
Backend caches answer in Supabase rag_answers table
     ↓
All students access same answer for that topic
```

## Setup Instructions

### 1. Install Python Dependencies
```powershell
cd "c:\EDUGEN_AI\rag model"
pip install -r requirements.txt
```

### 2. Configure Environment Variables

Add to `c:\EDUGEN_AI\rag model\.env`:
```env
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=llama-3.3-70b-versatile
RAG_API_PORT=5000
```

Add to `c:\EDUGEN_AI\edugen-backend\.env`:
```env
RAG_API_URL=http://localhost:5000
```

### 3. Create Supabase Table

Run the SQL in `c:\EDUGEN_AI\SUPABASE_RAG_ANSWERS_SCHEMA.sql` in your Supabase SQL editor.

### 4. Start the RAG API Server

```powershell
cd "c:\EDUGEN_AI\rag model"
python rag_api.py
```

This starts the Flask server on port 5000.

### 5. Modify Staff Dashboard Frontend

You need to add the following to `StaffDashboardViews.js`:

#### A. Add state for PDF management (add to StaffDashboard.js state):
```javascript
const [availablePDFs, setAvailablePDFs] = useState([]);
const [selectedPDF, setSelectedPDF] = useState('');
const [uploadingPDF, setUploadingPDF] = useState(false);
const [generatingAnswer, setGeneratingAnswer] = useState(false);
```

#### B. Add function to fetch available PDFs:
```javascript
const fetchAvailablePDFs = useCallback(async () => {
  try {
    const response = await fetch('http://localhost:10000/api/rag/list-pdfs');
    const data = await response.json();
    if (data.success) {
      setAvailablePDFs(data.pdfs);
    }
  } catch (error) {
    console.error('Error fetching PDFs:', error);
    addNotification('Failed to load PDFs', 'error');
  }
}, [addNotification]);
```

#### C. Add PDF upload handler:
```javascript
const handlePDFUpload = useCallback(async (file) => {
  if (!file || !file.name.endsWith('.pdf')) {
    addNotification('Please select a PDF file', 'warning');
    return;
  }

  setUploadingPDF(true);
  try {
    const formData = new FormData();
    formData.append('file', file);

    // Upload directly to RAG API
    const response = await fetch('http://localhost:5000/api/rag/upload-pdf', {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();
    if (data.success) {
      addNotification(`PDF "${data.filename}" uploaded successfully!`, 'success');
      fetchAvailablePDFs(); // Refresh the list
    } else {
      addNotification(data.error || 'Upload failed', 'error');
    }
  } catch (error) {
    console.error('Error uploading PDF:', error);
    addNotification('Failed to upload PDF', 'error');
  } finally {
    setUploadingPDF(false);
  }
}, [addNotification, fetchAvailablePDFs]);
```

#### D. Modify postTask function to generate RAG answer:

Add this BEFORE saving the task in the postTask function:

```javascript
// Generate RAG answer if PDF is selected
let ragAnswer = null;
if (selectedPDF) {
  setGeneratingAnswer(true);
  try {
    const response = await fetch('http://localhost:10000/api/rag/generate-answer', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        topic: taskTopic,
        subtopic: taskSubtopic || '',
        pdf_name: selectedPDF,
      }),
    });

    const data = await response.json();
    if (data.success) {
      ragAnswer = data.answer;
      addNotification(
        `AI generated a comprehensive answer from ${selectedPDF}!`,
        'success'
      );
    } else {
      addNotification(
        `Warning: Could not generate answer from PDF: ${data.error}`,
        'warning'
      );
    }
  } catch (error) {
    console.error('Error generating RAG answer:', error);
    addNotification(
      'Warning: Failed to generate answer from PDF',
      'warning'
    );
  } finally {
    setGeneratingAnswer(false);
  }
}

// Add ragAnswer to newTask object:
const newTask = {
  id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  content: taskContent,
  topic: taskTopic,
  subtopic: taskSubtopic || "",
  difficulty: taskDifficulty,
  numQuestions: taskQuestions,
  subject: staffData.subject || "General",
  staffId: user.uid,
  staff_id: user.uid,
  staffName: staffData.name || "Staff",
  postedAt: new Date().toISOString(),
  date: new Date().toLocaleDateString(),
  completedBy: [],
  pdfUsed: selectedPDF || null,  // NEW
  ragAnswer: ragAnswer || null,   // NEW - The generated answer
};
```

#### E. Update TasksContainer UI in StaffDashboardViews.js:

Replace lines 155-206 with:

```javascript
<div className="task-form">
  <h3>Post a New Task/Topic</h3>

  {/* PDF Upload Section */}
  <div style={{ marginBottom: '15px', padding: '10px', background: '#f5f5f5', borderRadius: '8px' }}>
    <h4 style={{ margin: '0 0 10px 0', fontSize: '14px' }}>
      📄 Select PDF for Answer Generation (Optional)
    </h4>
    
    {availablePDFs.length > 0 ? (
      <select
        value={selectedPDF}
        onChange={(e) => setSelectedPDF(e.target.value)}
        className="goal-input"
        style={{ marginBottom: '10px' }}
      >
        <option value="">-- None (Manual Answer) --</option>
        {availablePDFs.map((pdf) => (
          <option key={pdf.name} value={pdf.name}>
            {pdf.name} ({pdf.size_mb} MB)
          </option>
        ))}
      </select>
    ) : (
      <p style={{ fontSize: '12px', color: '#666', margin: '5px 0' }}>
        No PDFs uploaded yet. Upload one below.
      </p>
    )}

    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
      <input
        type="file"
        accept=".pdf"
        onChange={(e) => {
          if (e.target.files[0]) {
            handlePDFUpload(e.target.files[0]);
          }
        }}
        style={{ flex: 1 }}
        disabled={uploadingPDF}
      />
      {uploadingPDF && <span>Uploading...</span>}
    </div>
  </div>

  {/* Topic and Subtopic */}
  <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
    <input
      type="text"
      id="task-topic"
      placeholder="Topic"
      className="goal-input"
      aria-label="Task topic"
      style={{ flex: 1 }}
    />
    <input
      type="text"
      id="task-subtopic"
      placeholder="Subtopic"
      className="goal-input"
      aria-label="Task subtopic"
      style={{ flex: 1 }}
    />
  </div>

  {/* Difficulty and Questions */}
  <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
    <select
      id="task-difficulty"
      className="goal-input"
      aria-label="Task difficulty"
      style={{ flex: 1 }}
    >
      <option value="Easy">Easy</option>
      <option value="Medium">Medium</option>
      <option value="Hard">Hard</option>
    </select>
    <input
      type="number"
      id="task-questions"
      placeholder="No. of Questions"
      className="goal-input"
      aria-label="Number of questions"
      defaultValue={5}
      min={1}
      max={20}
      style={{ flex: 1 }}
    />
  </div>

  {selectedPDF && (
    <div style={{
      padding: '10px',
      background: '#e3f2fd',
      borderRadius: '4px',
      marginBottom: '10px',
      fontSize: '13px'
    }}>
      ✨ AI will generate a 16-mark answer from <strong>{selectedPDF}</strong>
    </div>
  )}

  <button
    onClick={postTask}
    className="add-goal-btn"
    aria-label="Post task"
    disabled={generatingAnswer}
  >
    {generatingAnswer ? 'Generating Answer...' : 'Post Task'}
  </button>
</div>
```

#### F. Pass new props to TasksContainer:

In StaffDashboard.js, update the TasksContainer call:

```javascript
<TasksContainer
  activeContainer={activeContainer}
  postTask={postTask}
  loading={loading}
  tasks={tasks}
  deleteTask={deleteTask}
  availablePDFs={availablePDFs}
  selectedPDF={selectedPDF}
  setSelectedPDF={setSelectedPDF}
  handlePDFUpload={handlePDFUpload}
  uploadingPDF={uploadingPDF}
  generatingAnswer={generatingAnswer}
/>
```

#### G. Add useEffect to load PDFs on mount:

```javascript
useEffect(() => {
  fetchAvailablePDFs();
}, [fetchAvailablePDFs]);
```

### 6. Student Dashboard Integration

Students will access the RAG answer when they view a task. You need to:

1. Modify the task display to show the RAG answer if available
2. Add a function to fetch cached answers:

```javascript
const fetchTaskAnswer = async (topic, subtopic) => {
  try {
    const response = await fetch('http://localhost:10000/api/rag/get-cached-answer', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ topic, subtopic }),
    });

    const data = await response.json();
    if (data.success && data.cached) {
      return data.answer;
    }
    return null;
  } catch (error) {
    console.error('Error fetching task answer:', error);
    return null;
  }
};
```

3. Display the answer in markdown format using a library like `react-markdown`

## How It Works

### For Staff:
1. Staff uploads PDF files through the dashboard
2. When posting a task, optionally select a PDF
3. System generates a comprehensive 16-mark answer from the PDF
4. Answer is stored and linked to the task

### For Students:
1. Students see tasks posted by staff
2. If a task has a RAG-generated answer, they can view it
3. All students get the SAME answer for a given topic
4. Answer is formatted with markdown for better readability

## Key Features

✅ **PDF Upload and Management**
- Upload PDFs directly from staff dashboard
- List all available PDFs with file sizes
- Select PDF for answer generation

✅ **AI-Powered Answer Generation**
- Uses RAG to extract relevant content from PDFs
- Groq AI generates comprehensive 16-mark answers
- Structured format with introduction, key points, examples, and conclusion

✅ **Answer Caching and Sharing**
- Answers stored in Supabase for fast access
- Single answer per topic shared with all students
- No redundant API calls for same topic

✅ **Graceful Degradation**
- Works without PDF (manual answers)
- Handles API failures gracefully
- Clear user feedback during processing

## Testing

1. **Start both servers**:
   ```powershell
   # Terminal 1 - RAG API
   cd "c:\EDUGEN_AI\rag model"
   python rag_api.py

   # Terminal 2 - Node Backend
   cd c:\EDUGEN_AI\edugen-backend
   npm start

   # Terminal 3 - React Frontend
   cd c:\EDUGEN_AI
   npm start
   ```

2. **Test PDF upload**:
   - Navigate to staff dashboard → Tasks
   - Upload a PDF file
   - Verify it appears in the dropdown

3. **Test answer generation**:
   - Select a PDF
   - Enter topic (e.g., "Object Oriented Programming")
   - Post task
   - Check console for generation progress
   - Verify answer is saved (check Supabase)

4. **Test student access**:
   - Login as student
   - View the task
   - See the generated answer

## Troubleshooting

**RAG API not starting**:
- Check if port 5000 is available
- Verify Python dependencies are installed
- Check GROQ_API_KEY in .env

**PDF upload fails**:
- Check file size (max 16MB)
- Ensure `pdfs` folder exists in `rag model/rag model/`
- Check CORS settings

**Answer generation fails**:
- Verify RAG API is running
- Check if PDF was ingested into ChromaDB
- Verify GROQ_API_KEY is valid
- Check backend logs for errors

**Students can't see answers**:
- Verify Supabase RLS policies
- Check if answer was cached
- Verify frontend is calling correct endpoint

## Future Enhancements

1. **Batch PDF Processing**: Upload multiple PDFs at once
2. **PDF Ingestion UI**: Trigger ChromaDB ingestion from dashboard
3. **Answer Regeneration**: Allow staff to regenerate answers
4. **Answer Editing**: Let staff edit AI-generated answers
5. **Analytics**: Track which answers are most viewed
6. **PDF Preview**: Show PDF content before selection

## Notes

- Ensure the `chroma_db` directory exists in `rag model/rag model/` with ingested PDFs
- The system uses Groq AI which has rate limits - handle gracefully
- Consider adding a loading overlay during answer generation
- Add proper error boundaries for better UX

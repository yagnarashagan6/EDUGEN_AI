# 📚 EduGen AI - RAG-Based Answer Generation System

## 🎯 Overview

This system enables staff to upload PDF documents and automatically generate comprehensive, structured 16-mark answers using RAG (Retrieval-Augmented Generation) technology. The generated answers are shared with all students for each topic, ensuring consistency and quality.

## ✨ Key Features

- **📄 PDF Upload & Management**: Staff can upload and manage PDF documents
- **🤖 AI-Powered Answer Generation**: Automatically generates 16-mark exam-quality answers
- **💾 Answer Caching**: One answer per topic, shared across all students
- **🔄 Seamless Integration**: Works with existing task posting system
- **⚡ Fast & Efficient**: Cached answers loaded instantly
- **🎨 Structured Formatting**: Markdown-formatted answers with clear sections

## 🏗️ Architecture

```
┌─────────────────┐
│ Staff Dashboard │
│   (React App)   │
└────────┬────────┘
         │ 1. Upload PDF / Post Task
         ↓
┌────────────────────┐
│  Node.js Backend   │ ← Main API Server (Port 10000)
│  (server.js)       │
└────────┬───────────┘
         │ 2. Proxy request
         ↓
┌────────────────────┐
│   Flask RAG API    │ ← RAG Processing Server (Port 5000)
│   (rag_api.py)     │
│                    │
│  ┌──────────────┐  │
│  │  Vector DB   │  │ 3. Retrieve relevant chunks
│  │  (ChromaDB)  │  │
│  └──────────────┘  │
└────────┬───────────┘
         │ 4. Generate answer with Groq AI
         ↓
┌────────────────────┐
│   Groq AI API      │ ← LLM for answer generation
│ (llama-3.3-70b)    │
└────────┬───────────┘
         │ 5. Return structured answer
         ↓
┌────────────────────┐
│    Supabase DB     │ ← Cache answers for reuse
│  (rag_answers)     │
└────────────────────┘
         │
         ↓
   All Students Access Same Answer
```

## 📦 What's Included

### Backend Files
- `rag model/rag_api.py` - Flask API for RAG operations
- `rag model/requirements.txt` - Python dependencies
- `rag model/.env.example` - Environment configuration template
- `edugen-backend/server.js` - Node.js proxy endpoints

### Database
- `SUPABASE_RAG_ANSWERS_SCHEMA.sql` - Supabase table schema

### Documentation
- `RAG_IMPLEMENTATION_GUIDE.md` - Detailed implementation guide
- `RAG_SUMMARY.md` - Quick setup summary
- `README_RAG.md` - This file

## 🚀 Quick Start

### Prerequisites
- Python 3.8+
- Node.js 16+
- Supabase account
- Groq API key ([Get one here](https://console.groq.com/keys))

### Installation

#### 1. Install Python Dependencies
```powershell
cd "c:\EDUGEN_AI\rag model"
pip install -r requirements.txt
```

#### 2. Configure Environment

**Create `rag model/.env`:**
```env
GROQ_API_KEY=your_actual_groq_api_key
GROQ_MODEL=llama-3.3-70b-versatile
RAG_API_PORT=5000
```

**Add to `edugen-backend/.env`:**
```env
RAG_API_URL=http://localhost:5000
```

#### 3. Set Up Database

Run the SQL in `SUPABASE_RAG_ANSWERS_SCHEMA.sql` in your Supabase SQL editor.

#### 4. Update Frontend

Follow the detailed instructions in `RAG_IMPLEMENTATION_GUIDE.md` to update:
- `src/pages/StaffDashboard.js`
- `src/staff/StaffDashboardViews.js`

### Running the System

You need **3 terminals** running simultaneously:

```powershell
# Terminal 1: RAG API Server
cd "c:\EDUGEN_AI\rag model"
python rag_api.py

# Terminal 2: Node.js Backend
cd c:\EDUGEN_AI\edugen-backend
npm start

# Terminal 3: React Frontend
cd c:\EDUGEN_AI
npm start
```

## 📖 Usage

### For Staff:

1. **Upload a PDF**
   - Go to Staff Dashboard → Tasks
   - Click on the file input under "Select PDF for Answer Generation"
   - Choose a PDF file (max 16MB)
   - Wait for upload confirmation

2. **Post a Task with AI Answer**
   - Select the uploaded PDF from the dropdown
   - Enter Topic (e.g., "Object Oriented Programming")
   - Optionally enter Subtopic
   - Set Difficulty and Number of Questions
   - Click "Post Task"
   - System will generate a comprehensive 16-mark answer

3. **View Generated Answers**
   - Answers are automatically cached in the database
   - Same answer is shared with all students for that topic

### For Students:

1. **View Tasks**
   - Navigate to Student Dashboard → Tasks
   - Click on a task to view details

2. **Read AI-Generated Answer**
   - If the task has a RAG answer, it will be displayed
   - Answer is formatted with markdown for easy reading
   - Includes introduction, key points, examples, and conclusion

## 🔧 API Endpoints

### RAG API (Flask - Port 5000)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/rag/health` | GET | Health check |
| `/api/rag/list-pdfs` | GET | List available PDFs |
| `/api/rag/upload-pdf` | POST | Upload a new PDF |
| `/api/rag/generate-answer` | POST | Generate answer from PDF |
| `/api/rag/quick-answer` | POST | Get quick answer (testing) |

### Node.js Backend (Port 10000)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/rag/list-pdfs` | GET | List PDFs (proxied) |
| `/api/rag/generate-answer` | POST | Generate answer (proxied + cached) |
| `/api/rag/get-cached-answer` | POST | Retrieve cached answer |

## 📊 Database Schema

### `rag_answers` Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `topic` | TEXT | Main topic |
| `subtopic` | TEXT | Optional subtopic |
| `pdf_name` | TEXT | Source PDF filename |
| `answer` | TEXT | Generated answer (markdown) |
| `sources` | TEXT[] | Array of source files |
| `created_at` | TIMESTAMPTZ | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | Last update timestamp |

**Unique Constraint**: (topic, subtopic) - Ensures one answer per topic/subtopic combination

## 🎨 Answer Format

Each generated answer follows this structure:

```markdown
### Introduction
Brief overview of the topic (2-3 sentences)

### Main Content
Detailed explanation with:
- Key concepts and definitions
- Core principles
- Relevant examples
- Practical applications

### Key Points
1. Point 1 with explanation
2. Point 2 with explanation
...
8-10 detailed points

### Real-world Applications
- Application 1
- Application 2
- Application 3

### Conclusion
Summary and key takeaways
```

## 🐛 Troubleshooting

### RAG API won't start
```powershell
# Check if port 5000 is available
netstat -ano | findstr :5000

# Verify Python dependencies
pip list

# Check .env file exists
dir "c:\EDUGEN_AI\rag model\.env"
```

### PDF Upload Fails
- Check file size (max 16MB)
- Verify `rag model/pdfs/` folder exists
- Check RAG API console for errors

### Answer Generation Fails
- Verify GROQ_API_KEY is valid
- Check if PDF was uploaded successfully
- Review RAG API logs
- Ensure ChromaDB has ingested PDFs

### Students Can't See Answers
- Check Supabase RLS policies
- Verify answer was cached (check database)
- Check browser console for errors

## 📝 Important Notes

### PDF Ingestion
The system requires PDFs to be ingested into ChromaDB before use:
1. Place PDFs in `rag model/rag model/pdfs/`
2. Run the ingestion script (if available)
3. Verify `chroma_db` folder has data

### Rate Limits
- Groq API has rate limits
- Consider implementing request queuing for production
- Add retry logic for failed requests

### Performance
- First answer generation: 10-30 seconds
- Cached answers: Instant (<1 second)
- Large PDFs may take longer to process

## 🔐 Security

- ✅ RLS policies protect student data
- ✅ Only authenticated staff can upload PDFs
- ✅ Service role required for answer caching
- ✅ Input validation on all endpoints
- ✅ File size limits prevent abuse

## 🚧 Future Enhancements

- [ ] Batch PDF uploads
- [ ] PDF preview before selection
- [ ] Answer regeneration option
- [ ] Manual answer editing
- [ ] Answer quality ratings
- [ ] Analytics dashboard
- [ ] Multi-language support
- [ ] PDF text extraction preview

## 📚 Additional Resources

- [Groq API Documentation](https://console.groq.com/docs)
- [LangChain Documentation](https://python.langchain.com/)
- [ChromaDB Documentation](https://docs.trychroma.com/)
- [Supabase Documentation](https://supabase.com/docs)

## 🆘 Support

For issues or questions:
1. Check `RAG_IMPLEMENTATION_GUIDE.md` for detailed instructions
2. Review troubleshooting section above
3. Check console logs for error messages
4. Verify all environment variables are set

## 📄 License

This is part of the EduGen AI system. All rights reserved.

---

**Built with ❤️ using RAG, Groq AI, and modern web technologies**

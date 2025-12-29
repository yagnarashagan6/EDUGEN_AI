# RAG Implementation Checklist

Use this checklist to track your implementation progress.

## ✅ Setup Phase

- [ ] **Install Python Dependencies**
  ```powershell
  cd "c:\EDUGEN_AI\rag model"
  pip install -r requirements.txt
  ```

- [ ] **Configure RAG API Environment**
  - [ ] Copy `.env.example` to `.env`
  - [ ] Add your Groq API key
  - [ ] Verify GROQ_MODEL is set to `llama-3.3-70b-versatile`

- [ ] **Configure Backend Environment**
  - [ ] Add `RAG_API_URL=http://localhost:5000` to `edugen-backend/.env`

- [ ] **Set Up Supabase Database**
  - [ ] Open Supabase SQL Editor
  - [ ] Run `SUPABASE_RAG_ANSWERS_SCHEMA.sql`
  - [ ] Verify `rag_answers` table exists
  - [ ] Check RLS policies are enabled

## 🔧 Backend Phase

- [ ] **Verify Node.js Backend Changes**
  - [ ] Check `edugen-backend/server.js` has RAG endpoints
  - [ ] Verify imports  at top of file
  - [ ] Confirm RAG_API_URL constant is defined

- [ ] **Test RAG API**
  - [ ] Start RAG API: `python rag_api.py`
  - [ ] Visit http://localhost:5000/api/rag/health
  - [ ] Should see: `{"status": "healthy", ...}`

- [ ] **Test Backend Proxy**
  - [ ] Start backend: `npm start` (in edugen-backend)
  - [ ] Test endpoint: http://localhost:10000/api/rag/list-pdfs
  - [ ] Should return: `{"success": true, "pdfs": [...], ...}`

## 🎨 Frontend Phase

### StaffDashboard.js

- [ ] **Add State Variables** (around line 150)
  ```javascript
  const [availablePDFs, setAvailablePDFs] = useState([]);
  const [selectedPDF, setSelectedPDF] = useState('');
  const [uploadingPDF, setUploadingPDF] = useState(false);
  const [generatingAnswer, setGeneratingAnswer] = useState(false);
  ```

- [ ] **Add fetchAvailablePDFs Function** (after other useCallbacks)
  - [ ] Copy code from RAG_IMPLEMENTATION_GUIDE.md section B
  - [ ] Verify it's a useCallback with [addNotification] dependency

- [ ] **Add handlePDFUpload Function** (after fetchAvailablePDFs)
  - [ ] Copy code from section C
  - [ ] Verify it uses FormData correctly
  - [ ] Check it calls fetchAvailablePDFs after upload

- [ ] **Modify postTask Function** (around line 1059)
  - [ ] Add RAG answer generation code BEFORE creating newTask
  - [ ] Copy code from section D
  - [ ] Add `pdfUsed` and `ragAnswer` fields to newTask object

- [ ] **Update TasksContainer Props** (around line 1316)
  - [ ] Add new props to TasksContainer component
  - [ ] Copy from section F

- [ ] **Add useEffect for PDF Loading** (with other useEffects)
  - [ ] Copy from section G
  - [ ] Place near other useEffects that run on mount

### StaffDashboardViews.js

- [ ] **Update TasksContainer Component** (line 139)
  - [ ] Add new props to function signature
  - [ ] Update PropTypes at bottom of file

- [ ] **Replace Task Form UI** (lines 155-206)
  - [ ] Copy new UI code from section E
  - [ ] Includes PDF upload section
  - [ ] Has PDF selector dropdown
  - [ ] Shows generation status

## 🧪 Testing Phase

- [ ] **Test PDF Upload**
  - [ ] Start all 3 servers (RAG API, Backend, Frontend)
  - [ ] Login as staff
    - [ ] Navigate to Tasks section
  - [ ] Upload a test PDF
  - [ ] Verify it appears in dropdown
  - [ ] Check `rag model/rag model/pdfs/` folder for file

- [ ] **Test Answer Generation**
  - [ ] Select uploaded PDF from dropdown
  - [ ] Enter topic: "Test Topic"
  - [ ] Enter subtopic: "Test Subtopic" (optional)
  - [ ] Click "Post Task" 
  - [ ] Wait for "Generating Answer..." status
  - [ ] Verify success notification
  - [ ] Check Supabase `rag_answers` table for entry

- [ ] **Test Answer Caching**
  - [ ] Post another task with SAME topic
  - [ ] Should be instant (cached)
  - [ ] Check console for "Cache HIT" message

- [ ] **Test Student Access** (Future)
  - [ ] Login as student
  - [ ] View posted task
  - [ ] Verify answer is displayed
  - [ ] Check formatting is correct

## 📝 Documentation Phase

- [ ] **Update Project README**
  - [ ] Add RAG feature to main features list
  - [ ] Add link to RAG_README.md

- [ ] **Document PDF Ingestion** (if needed)
  - [ ] Create guide for ingesting PDFs into ChromaDB
  - [ ] Document which PDFs are currently available

- [ ] **Create User Guide**
  - [ ] Staff: How to upload PDFs
  - [ ] Staff: How to generate answers
  - [ ] Students: How to view answers

## 🚀 Deployment Phase (Future)

- [ ] **Prepare for Production**
  - [ ] Set up hosted RAG API server
  - [ ] Update RAG_API_URL for production
  - [ ] Add error monitoring
  - [ ] Set up PDF storage solution
  - [ ] Configure rate limiting
  - [ ] Add request queuing

- [ ] **Security Review**
  - [ ] Review RLS policies
  - [ ] Check file upload validation
  - [ ] Verify API authentication
  - [ ] Test  error handling

## ✨ Bonus Features (Optional)

- [ ] Add PDF preview before upload
- [ ] Implement answer editing for staff
- [ ] Add answer quality ratings
- [ ] Create analytics dashboard
- [ ] Implement batch PDF upload
- [ ] Add answer regeneration option
- [ ] Multi-language support

---

## 📊 Progress Tracker

**Setup:** 0/4 complete
**Backend:** 0/6 complete
**Frontend:** 0/10 complete
**Testing:** 0/7 complete
**Documentation:** 0/3 complete

**Total Progress:** 0/30 tasks complete (0%)

---

## 📌 Important Notes

- Keep all 3 servers running during development
- Check console logs for errors
- Test with small PDFs first (< 5MB)
- Verify Groq API quota if generation fails
- Clear browser cache if seeing old UI

## 🆘 Need Help?

1. Check `RAG_IMPLEMENTATION_GUIDE.md` for detailed code
2. Review `README_RAG.md` for architecture understanding
3. Check `RAG_SUMMARY.md` for quick reference
4. Look at backend/frontend console logs for errors

Good luck with your implementation! 🚀

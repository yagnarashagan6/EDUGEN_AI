# Quick Start Guide: Testing RAG File Upload Feature

## Prerequisites

Before starting, ensure you have:
1. ✅ Node.js and npm installed
2. ✅ Python 3.8+ installed
3. ✅ Groq API key configured
4. ✅ All dependencies installed

## Step 1: Start All Servers

You need **3 terminals** running concurrently:

### Terminal 1: RAG API Server
```powershell
cd "c:\EDUGEN_AI\rag model\rag model"
python rag_api.py
```
**Expected Output:**
```
 * Running on http://127.0.0.1:5000
 * ReSTARTING with stat
ChromaDB initialized successfully
```

### Terminal 2: Node.js Backend
```powershell
cd c:\EDUGEN_AI\edugen-backend
npm start
```
**Expected Output:**
```
Server running on port 10000
RAG proxy endpoints enabled
```

### Terminal 3: React Frontend
```powershell
cd c:\EDUGEN_AI
npm start
```
**Expected Output:**
```
Compiled successfully!
Local: http://localhost:3000
```

## Step 2: Login as Staff

1. Navigate to `http://localhost:3000`
2. Click on "Staff Login"
3. Login with your staff credentials
4. You should see the staff dashboard

## Step 3: Access Tasks Section

1. In the staff dashboard sidebar, click on **"Tasks"** icon
2. You should see "Tasks Management" container open
3. Scroll to see the new "Document Library for AI Answer Generation" section

## Step 4: Upload Documents

### Upload a Test PDF:

1. Click the file input under "Document Library for AI Answer Generation"
2. Select one or more files (PDF, DOC, DOCX, or TXT)
   - Test files should be educational content (e.g., textbooks, notes)
3. Click "Open"
4. Watch for "Uploading..." indicator
5. Success notification: "Successfully uploaded X file(s)!"

**Where files are stored:**
```
c:\EDUGEN_AI\rag model\rag model\pdfs\
```

## Step 5: Select Documents for AI Answer

1. After upload, documents appear as checkboxes in a grid
2. Check one or more documents you want to use
3. Green panel appears: "X document(s) selected - AI will generate..."

## Step 6: Post a Task with AI Answer

### Fill in task details:

**Topic:** `Machine Learning Basics`
**Subtopic:** `Supervised Learning`
**Difficulty:** `Medium`
**No. of Questions:** `5`

### Post the task:

1. Click **"Post Task"** button
2. Watch button change to "Generating AI Answer..."
3. Wait 5-10 seconds for RAG processing
4. Success notification appears
5. Task is added to the list below

## Step 7: Verify the Task

1. Scroll down to "Your Posted Tasks" section
2. Find your newly created task
3. Task should have:
   - Topic and subtopic
   - Difficulty level
   - Number of questions
   - **filesUsed** array (in database)
   - **ragAnswer** field (in database)

## Step 8: View in Database (Optional)

### Check Supabase `tasks` table:
```sql
SELECT id, topic, subtopic, "filesUsed", "ragAnswer" 
FROM tasks 
WHERE topic = 'Machine Learning Basics'
ORDER BY "postedAt" DESC 
LIMIT 1;
```

You should see:
- `filesUsed`: `["your_file.pdf"]`
- `ragAnswer`: Long structured answer text

## Visual Test Cases

### ✅ Test Case 1: Upload Single PDF
- **Action:** Upload 1 PDF file
- **Expected:** File appears in library, size shown

### ✅ Test Case 2: Upload Multiple Files
- **Action:** Select 3 different files
- **Expected:** All 3 upload, all 3 appear in library

### ✅ Test Case 3: Select Multiple Documents
- **Action:** Check 2 documents
- **Expected:** Green panel shows "2 document(s) selected"

### ✅ Test Case 4: Post Without Selection
- **Action:** Post task without selecting files
- **Expected:** Task posts normally, no RAG answer generated

### ✅ Test Case 5: Post With Selection
- **Action:** Select 1+ files, post task
- **Expected:** "Generating AI Answer..." shown, then success

### ✅ Test Case 6: Invalid FileType
- **Action:** Try to upload .exe or .jpg
- **Expected:** Warning: "Unsupported file format..."

### ✅ Test Case 7: RAG API Offline
- **Action:** Stop RAG API, try to post task with files
- **Expected:** Warning shown, task still posts without answer

## Troubleshooting

### Problem: "Failed to fetch PDFs"
**Solution:**
- Check if Node backend is running on port 10000
- Check if RAG API is running on port 5000
- Check browser console for CORS errors

### Problem: "Upload failed"
**Solution:**
- Verify file size < 16MB
- Check RAG API terminal for errors
- Ensure `pdfs` folder exists in `rag model/rag model/`

### Problem: "Failed to generate answer"
**Solution:**
- Check if Groq API key is valid in `.env`
- Verify ChromaDB has ingested documents
- Check RAG API terminal for errors
- Ensure topic matches document content

### Problem: Files not appearing in library
**Solution:**
- Hard refresh browser (Ctrl + Shift + R)
- Check Network tab for `/api/rag/list-pdfs` response
- Verify files are in `rag model/rag model/pdfs/`

## Expected User Experience

### 📱 Visual Timeline:

```
1. Staff opens Tasks ━━━━━━━━━━━━━━━━▶ See upload section
   
2. Click "Choose Files" ━━━━━━━━━━▶ File picker opens
   
3. Select files ━━━━━━━━━━━━━━━━━▶ "Uploading..." shown
   
4. Upload complete ━━━━━━━━━━━━━━▶ Files appear in grid
   
5. Check boxes ━━━━━━━━━━━━━━━━━▶ Green panel shows count
   
6. Enter topic, click Post ━━━━━━▶ "Generating AI Answer..."
   
7. Wait 5-10s ━━━━━━━━━━━━━━━━━▶ Success! Task posted
```

## Next: Student Dashboard Testing

Once tasks with RAG answers are posted, test student dashboard:

1. Login as student
2. Navigate to tasks
3. Click on task with AI answer
4. Should see "View AI Answer" or similar
5. Answer displays formatted content
6. "Copy and Ask AI" in study mode fetches same answer

## Performance Expectations

| Action | Expected Time |
|--------|--------------|
| File upload (5MB PDF) | 2-5 seconds |
| Fetch PDF list | < 1 second |
| Generate RAG answer | 5-15 seconds |
| Task post (no RAG) | 1-2 seconds |
| Task post (with RAG) | 6-17 seconds total |

## Demo Workflow

**Perfect Demo Script:**

1. Open staff dashboard ✓
2. Go to Tasks ✓
3. Upload a programming textbook PDF ✓
4. Show documents in library ✓
5. Select the PDF ✓
6. Topic: "Object Oriented Programming" ✓
7. Subtopic: "Inheritance" ✓
8. Click Post Task ✓
9. Watch "Generating..." ✓
10. Success notification ✓
11. Show task in list ✓
12. (Future) Switch to student view ✓
13. (Future) Show AI answer to student ✓

## Success Criteria

✅ Files upload successfully
✅ Documents appear in library UI
✅ Multi-select works smoothly
✅ Progress indicators show
✅ AI answers generate successfully  
✅ Tasks store filesUsed and ragAnswer
✅ Error messages are user-friendly
✅ System works without RAG (graceful degradation)

## Questions?

Refer to:
- `RAG_FILE_UPLOAD_IMPLEMENTATION.md` - Full implementation details
- `RAG_IMPLEMENTATION_GUIDE.md` - Detailed guide
- `RAG_IMPLEMENTATION_CHECKLIST.md` - Implementation checklist
- `README_RAG.md` - Architecture overview

---

**Last Updated:** December 29, 2025
**Feature Status:** ✅ Implemented - Ready for Testing
**Backend Status:** ⚠️ Requires RAG API server running

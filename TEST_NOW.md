# 🎯 Quick Test Guide - RAG File Upload

## ✅ Servers Running:
- Frontend: http://localhost:3000 ✅
- Backend: http://localhost:10000 ✅  
- RAG API: http://localhost:5000 ✅

## 🧪 Quick Test (5 minutes):

### Step 1: Open Staff Dashboard
```
http://localhost:3000 → Staff Login
```

### Step 2: Go to Tasks
```
Sidebar → Tasks Icon → Tasks Management opens
```

### Step 3: Upload Document
```
Document Library section (top of form)
↓
Click "Choose Files"
↓
Select a PDF file
↓
Wait for "Successfully uploaded!" notification
```

### Step 4: Post Task with AI
```
☑ Check the uploaded PDF from grid
↓
Topic: "Machine Learning"
Subtopic: "Neural Networks"
Difficulty: Medium
Questions: 5
↓
Click "Post Task"
↓
Button shows "Generating AI Answer..."
↓
Wait 5-15 seconds
↓
Success! ✅
```

### Step 5: Verify
```
Scroll down → See task in list
Database → Check task.ragAnswer field
```

## 🔧 If Something Doesn't Work:

**File won't upload?**
- Check browser console (F12)
- Verify file is PDF and < 16MB

**No RAG answer generated?**
- Check GROQ_API_KEY in `.env`
- Check RAG API terminal for errors
- Try with a different topic

**PDFs not showing?**
- Hard refresh (Ctrl + Shift + R)
- Check Network tab for API call

## 📂 Files to Check:

✅ `RAG_SYSTEM_READY.md` - Full setup guide
✅ `IMPLEMENTATION_COMPLETE.md` - Feature overview
✅ `QUICK_START_RAG_TESTING.md` - Detailed testing

## 🎉 You're Ready!

Everything is set up and running. Just test it in the browser now! 🚀

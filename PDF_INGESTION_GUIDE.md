# PDF Ingestion Guide for RAG System

## Problem: "No specific context found in the uploaded document"

If you're seeing this message, it means **the PDF has not been indexed** in the vector database yet. The RAG system needs to process and index PDFs before it can extract context from them.

## Why This Happens

1. **Uploading ≠ Indexing**: When you upload a PDF through the staff dashboard, it only saves the file to the `rag model/pdfs/` folder
2. **Separate Indexing Step**: You need to run a separate script to **ingest** the PDF into ChromaDB (the vector database)
3. **One-Time Process**: Once indexed, the PDF will be available for all future queries

## Solution: Run the PDF Ingestion Script

### Step 1: Navigate to RAG Model Directory

```powershell
cd "c:\EDUGEN_AI\rag model"
```

### Step 2: Run the Ingestion Script

```powershell
python ingest_pdfs.py
```

### What This Does:

1. **Scans** all PDFs in the `pdfs/` folder
2. **Loads** each PDF and extracts text
3. **Splits** text into chunks (1000 characters each, 200 overlap)
4. **Embeds** chunks using HuggingFace model (all-MiniLM-L6-v2)
5. **Stores** embeddings in ChromaDB at `chroma_db/` folder

### Expected Output:

```
[INGEST] Starting PDF ingestion...
[INGEST] PDF Directory: c:\EDUGEN_AI\rag model\pdfs
[INGEST] DB Directory: c:\EDUGEN_AI\rag model\chroma_db
[INGEST] Found 1 PDF files

[INGEST] Processing: tif.pdf
[INGEST] Loaded 50 pages from tif.pdf
[INGEST] Created 250 chunks from tif.pdf

[INGEST] Adding 250 total chunks to ChromaDB...
[INGEST] Added batch 1/3
[INGEST] Added batch 2/3
[INGEST] Added batch 3/3

[INGEST] ✅ Successfully ingested 250 chunks from 1 PDFs
[INGEST] Database saved to: c:\EDUGEN_AI\rag model\chroma_db
```

## After Ingestion

Once the PDF is indexed:

1. **RAG will find context** when you post tasks with that PDF
2. **Admin dashboard** will show the extracted context
3. **Quiz generation** will use the PDF content

## Troubleshooting

### Error: "No module named 'langchain'"

Install dependencies:
```powershell
cd "c:\EDUGEN_AI\rag model"
pip install -r requirements.txt
```

### Error: "PDF file not found"

Make sure the PDF is in the correct folder:
```powershell
dir "c:\EDUGEN_AI\rag model\pdfs"
```

### Error: "ChromaDB permission denied"

Delete the existing database and try again:
```powershell
Remove-Item -Recurse -Force "c:\EDUGEN_AI\rag model\chroma_db"
python ingest_pdfs.py
```

## Re-Indexing PDFs

If you:
- Add new PDFs
- Update existing PDFs
- Delete PDFs

You need to **re-run the ingestion script**:

```powershell
cd "c:\EDUGEN_AI\rag model"
python ingest_pdfs.py
```

The script will:
- ✅ Add new PDFs to the database
- ✅ Update existing PDFs
- ✅ Keep all previous data

## AI Models Used

### For RAG Answers (Topics/Subtopics):
- **Embedding**: HuggingFace all-MiniLM-L6-v2
- **Generation**: Groq llama-3.3-70b-versatile
- **Database**: ChromaDB

### For RAG Quizzes:
- **Embedding**: HuggingFace all-MiniLM-L6-v2
- **Generation**: Groq llama-3.3-70b-versatile
- **Fallback**: OpenRouter gemma-3-27b-it (if RAG fails)
- **Database**: ChromaDB

## Verification

After ingestion, test it:

1. **Go to Staff Dashboard**
2. **Post a task** with:
   - Topic: "Historical and Cultural Perspectives"
   - Subtopic: "Subsistence Foraging"
   - Select PDF: "tif.pdf"
3. **Check Admin Dashboard** (`/admin`)
4. **You should see**:
   - RAG Extracted Context (actual text from PDF)
   - AI Generated Answer (based on that context)
   - Chunks Found: > 0

## Quick Reference

| Action | Command |
|--------|---------|
| Navigate to RAG folder | `cd "c:\EDUGEN_AI\rag model"` |
| Install dependencies | `pip install -r requirements.txt` |
| Ingest PDFs | `python ingest_pdfs.py` |
| Check PDFs | `dir pdfs` |
| Check database | `dir chroma_db` |
| Delete database | `Remove-Item -Recurse -Force chroma_db` |

## Important Notes

1. **First-time setup**: Run ingestion for ALL PDFs before using RAG
2. **New PDFs**: Run ingestion whenever you add new PDFs
3. **Performance**: Ingestion can take 1-5 minutes depending on PDF size
4. **Storage**: ChromaDB folder will grow with more PDFs (normal)
5. **No internet needed**: Embedding model downloads once, then runs locally

---

**Need Help?** Check the console output for detailed error messages.

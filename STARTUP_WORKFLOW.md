# Updated Startup Workflow

## ✅ Automatic PDF Ingestion

The `start-all-backends.ps1` script now **automatically checks and ingests PDFs** before starting the RAG API!

## How It Works

When you run `.\start-all-backends.ps1`, it will:

1. **Check for PDFs** in `rag model/pdfs/` folder
2. **Check ChromaDB** to see if PDFs are already indexed
3. **Auto-ingest** if needed (first time or new PDFs added)
4. **Start RAG API** after ingestion is complete
5. **Start other services** (Node.js backend, React frontend)

## What You'll See

### First Time (No ChromaDB):
```
🐍 Starting RAG API (Python Flask) on port 5000...
📚 ChromaDB not found. PDFs need to be ingested...

========================================
  PDF Ingestion Required
========================================

Found 1 PDF file(s) that need to be indexed:
  - tif.pdf

🚀 Running PDF ingestion (this may take a few minutes)...

[INGEST] Starting PDF ingestion...
[INGEST] Processing: tif.pdf
[INGEST] Created 250 chunks from tif.pdf
[INGEST] ✅ Successfully ingested 250 chunks from 1 PDFs

✅ PDF ingestion completed successfully!

========================================

✅ RAG API started
```

### Subsequent Runs (PDFs Already Indexed):
```
🐍 Starting RAG API (Python Flask) on port 5000...
✅ PDFs already indexed in ChromaDB
✅ RAG API started
```

## Benefits

✅ **No manual steps** - Just run one script
✅ **Automatic detection** - Knows when ingestion is needed
✅ **One-time process** - Only ingests when necessary
✅ **Fast startup** - Skips ingestion if already done
✅ **Error handling** - Shows warnings if ingestion fails

## When Ingestion Runs

Ingestion will run automatically when:
- ✅ First time running the script
- ✅ ChromaDB folder doesn't exist
- ✅ ChromaDB folder is empty
- ✅ You delete the `chroma_db` folder

Ingestion will be **skipped** when:
- ✅ ChromaDB already exists with data
- ✅ PDFs are already indexed

## Adding New PDFs

1. **Add PDF** to `rag model/pdfs/` folder
2. **Delete ChromaDB** folder: `Remove-Item -Recurse -Force "rag model\chroma_db"`
3. **Run script**: `.\start-all-backends.ps1`
4. **Ingestion runs** automatically and indexes all PDFs

## Manual Ingestion (If Needed)

If you want to manually re-ingest PDFs:

```powershell
cd "rag model"
python ingest_pdfs.py
```

Or use the helper script:

```powershell
.\ingest-pdfs.ps1
```

## Troubleshooting

### Ingestion Fails
- Check Python is installed: `python --version`
- Install dependencies: `pip install -r "rag model\requirements.txt"`
- Check error messages in the output

### RAG Still Not Finding Context
- Check if ingestion completed successfully
- Verify ChromaDB folder exists: `dir "rag model\chroma_db"`
- Check admin dashboard for "Chunks Found" > 0

### Want to Force Re-ingestion
```powershell
Remove-Item -Recurse -Force "rag model\chroma_db"
.\start-all-backends.ps1
```

## Summary

**Before**: You had to manually run PDF ingestion in a separate terminal
**Now**: Just run `.\start-all-backends.ps1` and everything happens automatically! 🎉

The script is now **truly one-command startup** for the entire EduGen AI system.

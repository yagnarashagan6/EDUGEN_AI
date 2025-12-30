# 🚀 How to Run All Backends

## Single Command to Start Everything

```powershell
.\start-all-backends.ps1
```

## What This Does

The script automatically:
1. ✅ Checks if ports 5000, 5001, and 3000 are in use
2. ✅ Kills any existing processes on those ports
3. ✅ Starts **RAG API** (Python Flask) on port 5000
4. ✅ Starts **Node.js Backend** on port 5001
5. ✅ Starts **React Frontend** on port 3000
6. ✅ Opens each service in a separate PowerShell window

## Service URLs

After running the script, you can access:

- 🐍 **RAG API**: http://localhost:5000
  - Health check: http://localhost:5000/api/rag/health
  
- 🟢 **Node.js Backend**: http://localhost:5001
  - Health check: http://localhost:5001/api/health
  
- ⚛️ **React Frontend**: http://localhost:3000
  - Main application interface

## Prerequisites

### 1. Python Dependencies (for RAG API)
```bash
cd "rag model"
pip install -r requirements.txt
```

### 2. Node.js Dependencies (for Backend)
```bash
cd edugen-backend
npm install
```

### 3. React Dependencies (for Frontend)
```bash
npm install
```

### 4. Environment Variables

Make sure you have `.env` files configured:

#### `rag model/.env`
```env
GROQ_API_KEY=your_groq_api_key_here
```

#### `edugen-backend/.env`
```env
OPENROUTER_API_KEY=your_openrouter_key
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_supabase_key
SERVICE_SECRET=your_service_secret
RAG_API_URL=http://localhost:5000
```

#### Root `.env`
```env
REACT_APP_SUPABASE_URL=your_supabase_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Troubleshooting

### Port Already in Use
The script automatically kills processes on ports 5000, 5001, and 3000. If you still have issues:

```powershell
# Manually check what's using a port
Get-NetTCPConnection -LocalPort 5000

# Kill a specific process
Stop-Process -Id <ProcessID> -Force
```

### Python Not Found
Make sure Python is installed and in your PATH:
```powershell
python --version
```

### Node.js Not Found
Make sure Node.js is installed:
```powershell
node --version
npm --version
```

## Stopping All Services

Simply close all the PowerShell windows that were opened by the script.

Or use Task Manager to end the processes:
- `python.exe` (RAG API)
- `node.exe` (Node.js Backend)
- `node.exe` (React Frontend)

## Manual Start (Alternative)

If you prefer to start services manually:

### Terminal 1 - RAG API
```powershell
cd "rag model"
python rag_api.py
```

### Terminal 2 - Node.js Backend
```powershell
cd edugen-backend
npm start
```

### Terminal 3 - React Frontend
```powershell
npm start
```

---

**Happy Coding! 🎉**

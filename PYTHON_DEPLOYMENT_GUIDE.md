# EduGen AI - Python Backend Deployment Guide

## Overview

This guide helps you deploy the Python backend (`chatbot.py`) to Render for handling Talk Mode and file uploads.

## Prerequisites

- Render account (free tier is fine)
- Google Gemini API key

## Deployment Steps

### 1. Create New Web Service on Render

1. Go to https://render.com/dashboard
2. Click "New" → "Web Service"
3. Connect your GitHub repository (EDUGEN_AI)
4. Choose "Deploy from a folder" if needed

### 2. Configure Service Settings

- **Name**: `edugen-python-backend`
- **Environment**: Python 3
- **Region**: Choose closest to your users
- **Branch**: main (or your default branch)
- **Root Directory**: `edugen-backend` (since files are in this folder)

### 3. Build & Deploy Settings

- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `gunicorn --bind 0.0.0.0:$PORT chatbot:app`
- **Plan**: Free

### 4. Environment Variables

Add these environment variables in Render:

- **GOOGLE_API_KEY**: `AIzaSyDJQsaP2sY1KxQWP1x3Q1z3Q1z3Q1z3Q1z` (or your actual key)
- **PYTHON_VERSION**: `3.9.0`

### 5. Expected Deployment URL

After deployment, your Python backend will be available at:
`https://edugen-python-backend.onrender.com`

### 6. Test the Deployment

Once deployed, test these endpoints:

- Health check: `GET https://edugen-python-backend.onrender.com/health`
- Chat endpoint: `POST https://edugen-python-backend.onrender.com/chat`

## Files Ready for Deployment

✅ `chatbot.py` - Main Flask application (Talk Mode)
✅ `requirements.txt` - Python dependencies
✅ `render-python.yaml` - Render configuration (optional)

## Architecture Split

- **Study Mode**: Node.js backend at `https://edugen-backend-zbjr.onrender.com`
- **Talk Mode**: Python backend at `https://edugen-python-backend.onrender.com`

## Next Steps After Deployment

1. Update the Python backend URL in your frontend if different from expected
2. Test both Study Mode and Talk Mode functionality
3. Verify file upload works in Talk Mode

## Troubleshooting

- Check Render logs if deployment fails
- Ensure all environment variables are set
- Verify Python version compatibility
- Check that all dependencies install correctly

## File Structure in Repository

```
edugen-backend/
├── chatbot.py              # Python Flask app (Talk Mode)
├── server.js              # Node.js Express app (Study Mode)
├── requirements.txt       # Python dependencies
├── package.json          # Node.js dependencies
├── render-python.yaml    # Python deployment config
└── render.yaml           # Node.js deployment config
```

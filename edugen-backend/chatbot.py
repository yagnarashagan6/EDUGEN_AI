import os
import sys
import datetime
import time
import base64
import io
import random
import google.generativeai as genai
from flask import Flask, request, jsonify
from flask_cors import CORS
import PyPDF2
from docx import Document

app = Flask(__name__)
CORS(app, origins=["https://edugen-ai-zeta.vercel.app", "http://localhost:3000"])

GOOGLE_API_KEY = os.environ.get('GOOGLE_API_KEY', 'AIzaSyDJQsaP2sY1KxQWP1x3Q1z3Q1z3Q1z3Q1z')
if not GOOGLE_API_KEY:
    print("Error: GOOGLE_API_KEY environment variable not set.")
    sys.exit(1)

genai.configure(api_key=GOOGLE_API_KEY)

try:
    # Using a fast and capable model suitable for conversation and analysis
    model = genai.GenerativeModel('gemini-2.0-flash-exp')
except Exception as e:
    print(f"Error initializing Gemini model: {e}")
    sys.exit(1)

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy", "service": "EduGen Python Backend (Talk Mode)"})

# --- PROMPTS (Specialized for Talk and Document Analysis) ---

# UPDATED: Kept only the prompts relevant to this server's function
TALK_MODE_PROMPT = "You are a helpful and friendly assistant. Answer the user's question directly and keep your answer very short and concise. Do not use formatting like bolding or lists unless absolutely necessary."

RESUME_ANALYSIS_PROMPT = """
You are an expert HR hiring manager. Analyze the following resume.
Provide a very "short and sweet" analysis. Be direct and use concise language.

**📄 ATS Score & Feedback:**
Give a score out of 100 and a brief, one-sentence explanation.

**👍 Strengths:**
List 2 key strengths in a bulleted list.

**👎 Weaknesses:**
List 2 major weaknesses in a bulleted list.

**💡 Recommendations:**
Provide 2 actionable recommendations in a bulleted list.
"""

GENERAL_DOC_PROMPT = """
You are a helpful assistant. Use the provided document context to give a short and sweet answer to the user's question. Be direct and concise.

--- DOCUMENT CONTEXT ---
{document_text}
--- END CONTEXT ---

User's Question: {user_question}
"""

def extract_text_from_file(file_data, filename):
    """Extracts text from PDF or DOCX file data."""
    try:
        # Assumes file_data is a base64 string
        decoded_data = base64.b64decode(file_data.split(',')[1])
        if filename.endswith('.pdf'):
            pdf_file = io.BytesIO(decoded_data)
            pdf_reader = PyPDF2.PdfReader(pdf_file)
            return "".join(page.extract_text() + "\n" for page in pdf_reader.pages)
        elif filename.endswith('.docx'):
            docx_file = io.BytesIO(decoded_data)
            doc = Document(docx_file)
            return "".join(para.text + "\n" for para in doc.paragraphs)
        return None
    except Exception as e:
        print(f"Error extracting text: {e}")
        return None

def get_gemini_response(full_prompt):
    """Fetches response from Gemini API with exponential backoff."""
    max_retries = 5
    base_delay = 1
    for attempt in range(max_retries):
        try:
            response = model.generate_content(full_prompt)
            return response.text
        except Exception as e:
            if "429" in str(e) and attempt < max_retries - 1:
                delay = (base_delay * 2 ** attempt) + random.uniform(0, 1)
                print(f"Rate limit exceeded. Retrying in {delay:.2f}s...")
                time.sleep(delay)
            else:
                print(f"An unrecoverable error occurred: {e}")
                return "Sorry, an error occurred while processing your request."
    return "The service is currently busy. Please try again in a moment."

@app.route('/chat', methods=['POST'])
def chat():
    try:
        data = request.json
        user_message = data.get("message", "")
        file_data = data.get("fileData")
        filename = data.get("filename")

        print("=== TALK MODE REQUEST ===")
        print(f"Message: {user_message}")
        print(f"File data provided: {bool(file_data)}")
        print(f"Filename: {filename}")

        if not user_message and not (file_data and filename):
            return jsonify({"error": "No message or file provided."}), 400

        if file_data and filename:
            extracted_text = extract_text_from_file(file_data, filename)
            if not extracted_text:
                return jsonify({"response": "Sorry, I could not read the content of the document."})
            
            # Classify if it's a resume to use the specialized prompt
            classification_prompt = f"Is the following text a resume or CV? Answer with only 'yes' or 'no'.\n\n{extracted_text[:1000]}"
            is_resume_response = get_gemini_response(classification_prompt).strip().lower()

            if 'yes' in is_resume_response:
                # If user asks a question with resume, use general doc prompt, otherwise analyze it
                if user_message:
                     final_prompt = GENERAL_DOC_PROMPT.format(document_text=extracted_text, user_question=user_message)
                else:
                     final_prompt = f"{RESUME_ANALYSIS_PROMPT}\n\n--- RESUME CONTENT ---\n{extracted_text}"
            else:
                final_prompt = GENERAL_DOC_PROMPT.format(document_text=extracted_text, user_question=user_message)
            
            response_text = get_gemini_response(final_prompt)
        else:
            # This is the simple talk mode path
            if "time" in user_message.lower() or "date" in user_message.lower():
                now = datetime.datetime.now()
                return jsonify({"response": f"The current date and time is {now.strftime('%A, %B %d, %Y, %I:%M %p')}."})
                
            final_prompt = f"{TALK_MODE_PROMPT}\n\nUser's question: {user_message}"
            response_text = get_gemini_response(final_prompt)
            
        return jsonify({"response": response_text})
    
    except Exception as e:
        print(f"Error in chat endpoint: {str(e)}")
        return jsonify({"error": "Failed to process request"}), 500

if __name__ == '__main__':
    # Make sure to run on a port, e.g., 5000, that your frontend will call
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
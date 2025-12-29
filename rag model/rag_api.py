"""
RAG API for EduGen AI - Flask-based REST API for PDF retrieval and answer generation
This API integrates with the existing retrieve.py RAG model
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.utils import secure_filename
import os
import sys
from dotenv import load_dotenv
import PyPDF2
from pathlib import Path

# Add the nested 'rag model' directory to Python path
nested_rag_dir = os.path.join(os.path.dirname(__file__), 'rag model')
if os.path.exists(nested_rag_dir):
    sys.path.insert(0, nested_rag_dir)

# Import the existing RAG functions
from retrieve import get_relevant_context, groq_summarize, parse_llm_output, DB_DIR

load_dotenv()

app = Flask(__name__)
CORS(app, origins=["http://localhost:3000", "https://edugen-ai-zeta.vercel.app"])

# Configuration
UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), 'pdfs')
ALLOWED_EXTENSIONS = {'pdf'}
MAX_FILE_SIZE = 16 * 1024 * 1024  # 16MB

# Ensure upload folder exists
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def extract_text_from_pdf(pdf_path, max_pages=50):
    """Extract text from PDF for quick preview"""
    try:
        with open(pdf_path, 'rb') as file:
            reader = PyPDF2.PdfReader(file)
            text = ""
            for i, page in enumerate(reader.pages[:max_pages]):
                text += page.extract_text() + "\n"
            return text
    except Exception as e:
        print(f"Error extracting PDF text: {e}")
        return None

@app.route('/api/rag/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "service": "EduGen RAG API",
        "db_dir": DB_DIR,
        "upload_folder": UPLOAD_FOLDER
    }), 200

@app.route('/api/rag/list-pdfs', methods=['GET'])
def list_pdfs():
    """List all available PDFs in the upload folder"""
    try:
        pdf_files = []
        if os.path.exists(UPLOAD_FOLDER):
            for filename in os.listdir(UPLOAD_FOLDER):
                if filename.endswith('.pdf'):
                    file_path = os.path.join(UPLOAD_FOLDER, filename)
                    file_size = os.path.getsize(file_path)
                    pdf_files.append({
                        "name": filename,
                        "size": file_size,
                        "size_mb": round(file_size / (1024 * 1024), 2)
                    })
        
        return jsonify({
            "success": True,
            "pdfs": pdf_files,
            "count": len(pdf_files)
        }), 200
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/api/rag/upload-pdf', methods=['POST'])
def upload_pdf():
    """Upload a PDF file for RAG processing"""
    try:
        # Check if file is in request
        if 'file' not in request.files:
            return jsonify({"success": False, "error": "No file provided"}), 400
        
        file = request.files['file']
        
        if file.filename == '':
            return jsonify({"success": False, "error": "No file selected"}), 400
        
        if not allowed_file(file.filename):
            return jsonify({"success": False, "error": "Only PDF files are allowed"}), 400
        
        # Check file size
        file.seek(0, 2)  # Seek to end
        file_size = file.tell()
        file.seek(0)  # Reset to beginning
        
        if file_size > MAX_FILE_SIZE:
            return jsonify({
                "success": False,
                "error": f"File too large. Maximum size is {MAX_FILE_SIZE / (1024 * 1024)}MB"
            }), 400
        
        # Save file
        filename = secure_filename(file.filename)
        file_path = os.path.join(UPLOAD_FOLDER, filename)
        file.save(file_path)
        
        return jsonify({
            "success": True,
            "filename": filename,
            "message": "PDF uploaded successfully. You can now use it for answer generation.",
            "size_mb": round(file_size / (1024 * 1024), 2)
        }), 200
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/api/rag/generate-answer', methods=['POST'])
def generate_answer():
    """
    Generate a 16-mark structured answer from PDF using RAG
    
    Request body:
    {
        "topic": "Python",
        "subtopic": "Object Oriented Programming",
        "pdf_name": "python.pdf"
    }
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"success": False, "error": "No data provided"}), 400
        
        topic = data.get('topic', '').strip()
        subtopic = data.get('subtopic', '').strip()
        pdf_name = data.get('pdf_name', '').strip()
        
        if not topic:
            return jsonify({"success": False, "error": "Topic is required"}), 400
        
        if not pdf_name:
            return jsonify({"success": False, "error": "PDF name is required"}), 400
        
        # Construct the query
        query = f"{topic}"
        if subtopic:
            query += f" - {subtopic}"
        
        print(f"[RAG API] Generating answer for: {query} from {pdf_name}")
        
        # Get relevant context from RAG
        results = get_relevant_context(query, subject_filter=pdf_name)
        
        if not results or len(results) == 0:
            return jsonify({
                "success": False,
                "error": "No relevant information found in the PDF for this topic"
            }), 404
        
        # Use Groq to generate a comprehensive answer
        groq_api_key = os.getenv("GROQ_API_KEY")
        
        if not groq_api_key:
            return jsonify({
                "success": False,
                "error": "GROQ_API_KEY not configured"
            }), 500
        
        # Enhanced prompt for 16-mark answer
        enhanced_prompt = f"""Based on the provided context, create a comprehensive, well-structured answer for the topic: "{query}". 
        
This answer is for a 16-mark exam question, so it should be detailed and thorough.

Follow this structure:
1. **Introduction** (2-3 sentences): Provide an overview of the topic
2. **Main Content** (detailed explanation with multiple paragraphs):
   - Define key concepts and terms
   - Explain core principles and mechanisms
   - Include relevant examples and use cases
   - Discuss advantages, disadvantages, or applications where relevant
3. **Detailed Points**: Break down the topic into 8-10 key points, each explained in 2-3 sentences
4. **Real-world Applications**: Provide 2-3 practical examples
5. **Conclusion** (2-3 sentences): Summarize the importance and key takeaways

Format the answer with proper markdown formatting:
- Use **bold** for important terms
- Use bullet points for lists
- Use numbered lists for sequential steps
- Include clear headings with ### for sections

Make it comprehensive enough to score full marks (16/16) in an exam."""

        # Build context from retrieved documents
        chunks = []
        for doc in results[:10]:  # Use more chunks for comprehensive answer
            txt = doc.page_content.replace("\n", " ").strip()
            chunks.append(txt)
        context_text = "\n\n".join(chunks)
        
        # Call Groq API
        try:
            from groq import Groq
            client = Groq(api_key=groq_api_key)
            
            # Use a more powerful model for better answers
            model = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
            
            system_msg = """You are an expert educational assistant creating comprehensive exam answers. 
Your answers should be detailed, well-structured, and worthy of full marks in academic examinations.
Use the provided context to create accurate, informative answers."""
            
            user_msg = f"{enhanced_prompt}\n\n**Context from PDF:**\n{context_text}"
            
            response = client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": system_msg},
                    {"role": "user", "content": user_msg}
                ],
                max_tokens=2000,  # Allow longer responses for 16-mark answers
                temperature=0.3,  # Lower temperature for more focused answers
            )
            
            generated_answer = response.choices[0].message.content.strip()
            
            # Parse answer and sources
            answer_text, sources = parse_llm_output(generated_answer)
            
            if not answer_text:
                answer_text = generated_answer
            
            # Add source metadata
            if not sources:
                sources = [pdf_name]
            
            return jsonify({
                "success": True,
                "answer": answer_text,
                "sources": sources,
                "topic": topic,
                "subtopic": subtopic,
                "pdf_used": pdf_name,
                "chunks_found": len(results)
            }), 200
            
        except Exception as groq_error:
            print(f"[RAG API] Groq API error: {groq_error}")
            return jsonify({
                "success": False,
                "error": f"Failed to generate answer: {str(groq_error)}"
            }), 500
        
    except Exception as e:
        print(f"[RAG API] Error: {e}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/api/rag/quick-answer', methods=['POST'])
def quick_answer():
    """
    Get a quick answer from PDF (for testing)
    """
    try:
        data = request.get_json()
        query = data.get('query', '').strip()
        pdf_name = data.get('pdf_name', '').strip()
        
        if not query or not pdf_name:
            return jsonify({"success": False, "error": "Query and PDF name are required"}), 400
        
        # Get relevant context
        results = get_relevant_context(query, subject_filter=pdf_name)
        
        if not results:
            return jsonify({"success": False, "error": "No results found"}), 404
        
        # Get quick summary
        groq_answer = groq_summarize(results, query)
        
        if groq_answer:
            answer, sources = parse_llm_output(groq_answer)
            return jsonify({
                "success": True,
                "answer": answer,
                "sources": sources
            }), 200
        else:
            # Fallback to simple extraction
            simple_answer = " ".join([doc.page_content[:200] for doc in results[:3]])
            return jsonify({
                "success": True,
                "answer": simple_answer,
                "sources": [pdf_name]
            }), 200
            
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

if __name__ == '__main__':
    port = int(os.getenv('RAG_API_PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)

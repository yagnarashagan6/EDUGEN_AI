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

# Lazy import function for RAG (to avoid blocking server startup with model downloads)
def get_rag_functions():
    """Lazy import RAG functions to avoid blocking server startup"""
    from retrieve import get_relevant_context, groq_summarize, parse_llm_output, DB_DIR
    return get_relevant_context, groq_summarize, parse_llm_output, DB_DIR

load_dotenv()

app = Flask(__name__)
CORS(app, origins=["http://localhost:3000", "https://edugen-ai-zeta.vercel.app"])

# Configuration
UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), 'pdfs')
ALLOWED_EXTENSIONS = {'pdf', 'doc', 'docx', 'txt'}
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
        "upload_folder": UPLOAD_FOLDER
    }), 200

@app.route('/api/rag/list-pdfs', methods=['GET'])
def list_pdfs():
    """List all available documents from local storage"""
    try:
        files_list = []
        if os.path.exists(UPLOAD_FOLDER):
            for filename in os.listdir(UPLOAD_FOLDER):
                if '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS:
                    file_path = os.path.join(UPLOAD_FOLDER, filename)
                    file_size = os.path.getsize(file_path)
                    files_list.append({
                        "name": filename,
                        "size": file_size,
                        "size_mb": round(file_size / (1024 * 1024), 2)
                    })
        
        return jsonify({
            "success": True,
            "pdfs": files_list,
            "count": len(files_list),
            "storage": "local"
        }), 200
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/api/rag/upload-pdf', methods=['POST'])
def upload_pdf():
    """Upload a file to local storage for RAG processing"""
    print("[RAG API] ===== UPLOAD REQUEST RECEIVED =====")
    try:
        # Check if file is in request
        if 'file' not in request.files:
            return jsonify({"success": False, "error": "No file provided"}), 400
        
        file = request.files['file']
        
        if file.filename == '':
            return jsonify({"success": False, "error": "No file selected"}), 400
        
        if not allowed_file(file.filename):
            return jsonify({"success": False, "error": "Only PDF, DOC, DOCX, and TXT files are allowed"}), 400
        
        # Check file size
        file.seek(0, 2)  # Seek to end
        file_size = file.tell()
        file.seek(0)  # Reset to beginning
        
        if file_size > MAX_FILE_SIZE:
            return jsonify({
                "success": False,
                "error": f"File too large. Maximum size is {MAX_FILE_SIZE / (1024 * 1024)}MB"
            }), 400
        
        # Save file locally for RAG processing
        filename = secure_filename(file.filename)
        local_file_path = os.path.join(UPLOAD_FOLDER, filename)
        print(f"[RAG API] Saving file locally: {local_file_path}")
        file.save(local_file_path)
        print(f"[RAG API] File saved successfully: {filename}")
        
        return jsonify({
            "success": True,
            "filename": filename,
            "size_mb": round(file_size / (1024 * 1024), 2),
            "storage": "local",
            "message": "File uploaded successfully"
        }), 200
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@app.route('/api/rag/delete-pdf', methods=['POST'])
def delete_pdf():
    """Delete a file from local storage"""
    try:
        data = request.get_json()
        filename = data.get('filename')
        
        if not filename:
            return jsonify({"success": False, "error": "Filename is required"}), 400
        
        # Delete from local storage
        file_path = os.path.join(UPLOAD_FOLDER, filename)
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
                return jsonify({
                    "success": True,
                    "message": f"File '{filename}' deleted successfully"
                }), 200
            except Exception as error:
                return jsonify({
                    "success": False,
                    "error": f"Failed to delete file: {str(error)}"
                }), 500
        else:
            return jsonify({
                "success": False,
                "error": "File not found"
            }), 404
            
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
        
        # Lazy import RAG functions
        get_relevant_context, groq_summarize, parse_llm_output, DB_DIR = get_rag_functions()
        
        # Get relevant context from RAG
        results = get_relevant_context(query, subject_filter=pdf_name)
        
        if not results or len(results) == 0:
            print(f"[RAG API] No relevant information found in PDF. Switching to General AI Answer generation.")
            context_text = "No specific context found in the uploaded document. Please generate a comprehensive answer based on your general academic knowledge."
            sources = ["General AI Knowledge (Topic not found in PDF)"]
        else:
            # Build context from retrieved documents
            chunks = []
            for doc in results[:10]:  # Use more chunks for comprehensive answer
                txt = doc.page_content.replace("\n", " ").strip()
                chunks.append(txt)
            context_text = "\n\n".join(chunks)
            sources = [pdf_name]

        # Use Groq to generate a comprehensive answer
        groq_api_key = os.getenv("GROQ_API_KEY")
        
        if not groq_api_key:
            return jsonify({
                "success": False,
                "error": "GROQ_API_KEY not configured"
            }), 500
        
        print(f"[RAG API] Using Groq API Key: {groq_api_key[:8]}...")
        
        # Enhanced prompt for 16-mark answer
        enhanced_prompt = f"""Create a comprehensive, well-structured answer for the topic: "{query}". 
        
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
            answer_text, extracted_sources = parse_llm_output(generated_answer)
            
            if not answer_text:
                answer_text = generated_answer
            
            # Add source metadata
            final_sources = extracted_sources if extracted_sources else sources
            
            return jsonify({
                "success": True,
                "answer": answer_text,
                "sources": final_sources,
                "topic": topic,
                "subtopic": subtopic,
                "pdf_used": pdf_name,
                "chunks_found": len(results),
                "context": context_text  # Add context for admin dashboard
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
        
        # Lazy import RAG functions
        get_relevant_context, groq_summarize, parse_llm_output, DB_DIR = get_rag_functions()
        
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

@app.route('/api/rag/generate-quiz', methods=['POST'])
def generate_quiz():
    """
    Generate MCQs from PDF using RAG
    Expects: { topic, subtopic (opt), pdf_name, difficulty, question_count, cognitive_level }
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({"success": False, "error": "No data provided"}), 400
            
        topic = data.get('topic', '').strip()
        subtopic = data.get('subtopic', '').strip()
        pdf_name = data.get('pdf_name', '').strip()
        difficulty = data.get('difficulty', 'medium')
        question_count = int(data.get('question_count', 5))
        cognitive_level = data.get('cognitive_level', 'application')
        
        if not topic or not pdf_name:
            return jsonify({"success": False, "error": "Topic and PDF name are required"}), 400
            
        # Construct query
        query = f"Generate {question_count} {difficulty} {cognitive_level} multiple choice questions about {topic}"
        if subtopic:
            query += f" specifically regarding {subtopic}"
            
        print(f"[RAG API] Generating quiz for: {query} from {pdf_name}")
        
        # Check if PDF exists
        pdf_path = os.path.join(UPLOAD_FOLDER, pdf_name)
        print(f"[RAG API] Looking for PDF at: {pdf_path}")
        print(f"[RAG API] PDF exists: {os.path.exists(pdf_path)}")
        
        if not os.path.exists(pdf_path):
            available_files = os.listdir(UPLOAD_FOLDER) if os.path.exists(UPLOAD_FOLDER) else []
            print(f"[RAG API] Available PDFs: {available_files}")
            return jsonify({
                "success": False, 
                "error": f"PDF file '{pdf_name}' not found. Available files: {available_files}"
            }), 404
        
        # Lazy import
        get_relevant_context, _, parse_llm_output, _ = get_rag_functions()
        
        # Get context
        print(f"[RAG API] Retrieving context from vector DB for: {pdf_name}")
        results = get_relevant_context(topic if not subtopic else f"{topic} {subtopic}", subject_filter=pdf_name)
        
        if not results:
             print(f"[RAG API] No context found in vector DB for quiz. PDF may not be indexed yet.")
             print(f"[RAG API] Tip: The PDF needs to be processed and indexed in the vector database first.")
             return jsonify({
                 "success": False, 
                 "error": "No relevant content found in PDF. The PDF may not be indexed in the vector database yet."
             }), 404
             
        # Build context
        chunks = []
        for doc in results[:8]:
            chunks.append(doc.page_content.replace("\n", " ").strip())
        context_text = "\n\n".join(chunks)
        
        groq_api_key = os.getenv("GROQ_API_KEY")
        if not groq_api_key:
             return jsonify({"success": False, "error": "GROQ_API_KEY missing"}), 500

        print(f"[RAG API] Using Groq API Key: {groq_api_key[:8]}...")
        
        from groq import Groq
        client = Groq(api_key=groq_api_key)
        model = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")

        prompt = f"""You are an expert assessment generator. Create exactly {question_count} multiple choice questions (MCQs) for the topic "{topic}" (Subtopic: "{subtopic}") based on the provided text context.

Context from document ({pdf_name}):
{context_text}

Requirements:
1. Difficulty: {difficulty}
2. Cognitive Level: {cognitive_level}
3. Generate exactly {question_count} valid JSON objects.
4. Each question must have "text", "options" (array of 4 strings, labeled A, B, C, D), "correctAnswer", and "subtopic".
5. IMPORTANT: Instead of a generic explanation, you MUST provide the specific "subtopic" that the question maps to. This is CRITICAL for analytics.
6. Return ONLY a JSON array. No markdown, no intro text.

Example format:
[
  {{
    "text": "Question?",
    "options": ["A) Opt1", "B) Opt2", "C) Opt3", "D) Opt4"],
    "correctAnswer": "B) Opt2",
    "subtopic": "Specific Subtopic Name"
  }}
]
"""
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": "You are a JSON-only response bot. You output valid JSON arrays of quiz questions."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.5,
            max_tokens=3000
        )
        
        content = response.choices[0].message.content.strip()
        # Clean markdown
        content = content.replace("```json", "").replace("```", "").strip()
        
        import json
        try:
            questions = json.loads(content)
            if not isinstance(questions, list):
                raise ValueError("Response is not a list")
            return jsonify({
                "success": True,
                "questions": questions,
                "source": pdf_name,
                "context": context_text,  # Add context for admin dashboard
                "chunks_found": len(results)  # Add chunks count for admin dashboard
            }), 200
        except Exception as json_err:
            print(f"JSON Parse Error: {json_err}, Content: {content[:100]}...")
            return jsonify({"success": False, "error": "Failed to parse AI response"}), 500

    except Exception as e:
        print(f"[RAG API] Error generating quiz: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

if __name__ == '__main__':
    port = int(os.getenv('RAG_API_PORT', 5000))
    print(f"[RAG API] Starting server on port {port} (debug mode: OFF)")
    app.run(host='0.0.0.0', port=port, debug=False)


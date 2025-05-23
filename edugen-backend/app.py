from flask import Flask, request, jsonify
from flask_cors import CORS
import openai
import os
from dotenv import load_dotenv
import json
import logging
import traceback

load_dotenv()

app = Flask(__name__)
CORS(app, resources={r"/generate-quiz": {"origins": "http://localhost:3000"}})

# Set up logging to console and file
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s %(levelname)s: %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('quiz_generation.log')
    ]
)
logger = logging.getLogger(__name__)

openai.api_key = os.getenv("OPENROUTER_API_KEY")
openai.api_base = "https://openrouter.ai/api/v1"

@app.route('/generate-quiz', methods=['POST'])
def generate_quiz():
    logger.debug("Received request for /generate-quiz")
    data = request.get_json()
    if not data or 'topic' not in data:
        logger.error("Invalid request: No topic provided")
        return jsonify({"error": "Topic is required"}), 400
    topic = data.get("topic", "AI")
    logger.debug(f"Generating quiz for topic: {topic}")

    if not openai.api_key:
        logger.error("OPENROUTER_API_KEY is not set")
        return jsonify({"error": "API key is missing"}), 500

    prompt = f'''Generate 3 unique multiple-choice questions about "{topic}" for a high school or college-level student. Each question must:
- Be clear, concise, and relevant to the topic.
- Have exactly 4 answer options.
- Include a correct answer that matches one of the options.
- Be returned as a valid JSON array with no additional text, markdown, or code blocks (e.g., no ```json or extra explanations).
Return only the JSON array, like:
[
  {{
    "text": "What is the primary function of a CPU?",
    "options": ["Store data", "Process instructions", "Manage memory", "Display graphics"],
    "correctAnswer": "Process instructions"
  }}
]'''

    try:
        logger.debug("Sending request to OpenRouter API")
        response = openai.ChatCompletion.create(
            model="meta-llama/llama-3-70b-instruct",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            max_tokens=1000
        )
        logger.debug("Received response from OpenRouter API: %s", json.dumps(response, indent=2))

        raw = response['choices'][0]['message']['content']
        logger.debug(f"Raw response: {raw}")

        try:
            questions = json.loads(raw)
        except json.JSONDecodeError as e:
            logger.error(f"JSON parsing error: {str(e)}")
            return jsonify({"error": "Invalid JSON response from AI", "details": str(e)}), 500

        # Validate question format and content
        if not isinstance(questions, list) or len(questions) < 1:
            logger.error("Invalid or empty question list: %s", questions)
            return jsonify({"error": "No questions returned by AI"}), 500

        for i, q in enumerate(questions):
            if not isinstance(q, dict) or \
               "text" not in q or not q["text"] or \
               "options" not in q or not isinstance(q["options"], list) or len(q["options"]) != 4 or \
               "correctAnswer" not in q or q["correctAnswer"] not in q["options"]:
                logger.error(f"Invalid question format at index {i}: {q}")
                return jsonify({"error": f"Invalid question format from AI at question {i + 1}"}), 500

        logger.debug(f"Generated questions: {json.dumps(questions, indent=2)}")
        return jsonify({"questions": questions[:3]})
    except Exception as e:
        error_msg = f"Error generating quiz: {str(e)}\n{traceback.format_exc()}"
        logger.error(error_msg)
        print(error_msg)  # Ensure error is visible in console
        return jsonify({"error": f"Failed to generate quiz: {str(e)}"}), 500

if __name__ == '__main__':
    app.run(port=5000, debug=True)
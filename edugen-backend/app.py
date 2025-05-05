from flask import Flask, request, jsonify
import requests
import os

app = Flask(__name__)

# Replace this with your actual OpenRouter API key
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "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")

@app.route("/api/generate-quiz", methods=["POST"])
def generate_quiz():
    data = request.json
    topic = data.get("topic", "Artificial Intelligence")
    num_questions = data.get("numQuestions", 3)

    prompt = f"""
    Generate {num_questions} multiple-choice questions on the topic "{topic}".
    Each question must include:
    1. A question text
    2. Four options
    3. The correct answer

    Return the result in valid JSON as a list of objects like:
    {{
      "text": "...",
      "options": ["A", "B", "C", "D"],
      "correctAnswer": "B"
    }}
    """

    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
    }

    payload = {
        "model": "mistralai/mixtral-8x7b-instruct",  # or change to llama4 if available
        "messages": [
            {"role": "user", "content": prompt}
        ]
    }

    try:
        res = requests.post("https://openrouter.ai/api/v1/chat/completions", json=payload, headers=headers)
        res.raise_for_status()
        raw_output = res.json()["choices"][0]["message"]["content"]

        # Try to safely evaluate the JSON output
        import json
        questions = json.loads(raw_output)
        return jsonify(questions), 200

    except Exception as e:
        return jsonify({"error": str(e), "raw_response": res.text if 'res' in locals() else None}), 500


if __name__ == "__main__":
    app.run(debug=True)

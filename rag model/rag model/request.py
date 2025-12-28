import os, requests
key = os.getenv("GROQ_API_KEY") or "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"
r = requests.get("https://api.groq.ai/v1/models", headers={"Authorization":f"Bearer {key}"}, timeout=10)
print(r.status_code, r.text[:1000])
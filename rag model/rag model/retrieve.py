import os
import sys
from dotenv import load_dotenv
from langchain_community.vectorstores import Chroma
from langchain_huggingface import HuggingFaceEmbeddings

# Load environment variables from .env (optional). Install with: pip install python-dotenv
load_dotenv()

DB_DIR = "chroma_db"

def get_relevant_context(topic_query, subject_filter=None):
    """
    topic_query: The student's question.
    subject_filter: (Optional) The specific filename to search inside. 
                    e.g., "HRM QB ANSWERS new.docx.pdf"
    """
    embedding_function = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
    vector_db = Chroma(persist_directory=DB_DIR, embedding_function=embedding_function)

    print(f"\n[RAG] Searching for: '{topic_query}'...")
    if subject_filter:
        print(f"[Filter] Restricted to: {subject_filter}")

    # Set up the search arguments
    search_kwargs = {"k": 5, "fetch_k": 10}
    
    # Apply filter if provided (ChromaDB specific syntax)
    if subject_filter:
        search_kwargs["filter"] = {"source": f"pdfs\\{subject_filter}"} 
        # Note: on Windows paths often use backslash \, checking exact metadata is safest.
        # Ideally, we match strictly on how ingest saved it.

    results = vector_db.max_marginal_relevance_search(
        topic_query,
        **search_kwargs
    )

    # Return the raw matching documents so we can synthesize a single answer
    return results


def parse_llm_output(text):
    """Parse assistant text to extract an answer and any 'Sources:' line.
    Returns (answer_text, [sources...])
    """
    if not text:
        return None, []
    lines = [l.strip() for l in text.splitlines() if l.strip()]
    sources = []
    remaining = []
    for line in lines:
        low = line.lower()
        if low.startswith("sources:") or low.startswith("source:"):
            parts = line.split(':', 1)
            if len(parts) > 1:
                srcs = parts[1]
                for s in srcs.replace(';', ',').split(','):
                    s = s.strip()
                    if s:
                        sources.append(s)
        else:
            remaining.append(line)
    answer = "\n".join(remaining).strip()
    if not answer:
        answer = text.strip()
    return answer, sources


def synthesize_answer(results, topic_query, max_sentences=3):
    """Create a single, readable answer from a list of LangChain documents.
    Uses a simple scoring heuristic to prefer sentences containing query keywords.
    """
    import re

    if not results:
        return None

    texts = [doc.page_content.replace("\n", " ").strip() for doc in results[:6]]
    combined = " ".join(texts)
    combined = re.sub(r"\s+", " ", combined)

    # Split into sentences
    sentences = re.split(r'(?<=[\.!?])\s+', combined)
    if not sentences:
        return combined

    query_words = [w.lower() for w in re.findall(r"\w+", topic_query) if len(w) > 2]

    scored = []
    for i, s in enumerate(sentences):
        s_clean = s.strip()
        low = s_clean.lower()
        score = 0
        # reward sentences that contain query words
        for q in query_words:
            if q in low:
                score += 10
        # slightly reward longer sentences (up to a small cap)
        score += min(3, len(s_clean) / 100)
        # penalize very short fragments
        if len(s_clean) < 25:
            score -= 5
        scored.append((score, i, s_clean))

    # choose top sentences by score, then restore original order
    scored_sorted = sorted(scored, key=lambda x: (-x[0], x[1]))
    selected = scored_sorted[:max_sentences]
    selected_sorted = sorted(selected, key=lambda x: x[1])
    answer_sents = [s for (_score, _i, s) in selected_sorted]

    answer = " ".join(answer_sents)
    answer = re.sub(r"\s+", " ", answer).strip()
    if not re.search(r"[\.\?!]$", answer):
        answer = answer + '.'
    # Capitalize first char
    if answer:
        answer = answer[0].upper() + answer[1:]
    return answer


def groq_summarize(results, query, model=None, max_chunks=5):
    """Use Groq to produce a concise answer.
    Tries the official Groq SDK first, falls back to HTTP if SDK unavailable.
    Requires `GROQ_API_KEY` env var. Returns None if unavailable.
    """
    import os
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        return None
    if not results:
        return None

    # Try official SDK first
    try:
        from groq import Groq
        client = Groq(api_key=api_key)
        chosen_model = model or os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")
        # Override decommissioned models
        if chosen_model == "mixtral-8x7b-32768":
            chosen_model = "openai/gpt-oss-120b"
            print("[Summarizer] Overriding decommissioned model to openai/gpt-oss-120b")

        # Build context
        chunks = []
        for doc in results[:max_chunks]:
            txt = doc.page_content.replace("\n", " ").strip()
            src = doc.metadata.get("source", "").split("\\")[-1]
            chunks.append(f"[{src}] {txt}")
        context_text = "\n\n".join(chunks)

        system_msg = (
            "You are a concise assistant. Answer the user's question using ONLY the provided context. "
            "If the answer is not present, say you don't know. Provide a brief answer (1-3 sentences). "
            "At the end, include a line that starts with 'Sources:' and list the source filenames used."
        )
        user_msg = f"Question: {query}\n\nContext:\n{context_text}"

        resp = client.chat.completions.create(
            model=chosen_model,
            messages=[
                {"role": "system", "content": system_msg},
                {"role": "user", "content": user_msg}
            ],
            max_tokens=300,
            temperature=0.0,
        )
        text = resp.choices[0].message.content.strip()
        if text:
            return text
        return None

    except Exception as e:
        print(f"[Summarizer] Groq SDK failed: {e}. Falling back to HTTP...")

    # Fallback to HTTP
    try:
        import requests
        endpoint_base = os.getenv("GROQ_ENDPOINT", "https://api.groq.com/v1")

        chosen_model = model or os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")
        # Override decommissioned models
        if chosen_model == "mixtral-8x7b-32768":
            chosen_model = "openai/gpt-oss-120b"
            print("[Summarizer] Overriding decommissioned model to openai/gpt-oss-120b")
        print(f"[Summarizer] Using Groq model: {chosen_model}")

        # Build context
        chunks = []
        for doc in results[:max_chunks]:
            txt = doc.page_content.replace("\n", " ").strip()
            src = doc.metadata.get("source", "").split("\\")[-1]
            chunks.append(f"[{src}] {txt}")
        context_text = "\n\n".join(chunks)

        system_msg = (
            "You are a concise assistant. Answer the user's question using ONLY the provided context. "
            "If the answer is not present, say you don't know. Provide a brief answer (1-3 sentences). "
            "At the end, include a line that starts with 'Sources:' and list the source filenames used."
        )
        user_msg = f"Question: {query}\n\nContext:\n{context_text}"

        payload = {
            "model": chosen_model,
            "messages": [
                {"role": "system", "content": system_msg},
                {"role": "user", "content": user_msg}
            ],
            "max_tokens": 300,
            "temperature": 0.0,
        }

        r = requests.post(f"{endpoint_base}/chat/completions", json=payload, headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}, timeout=20)
        r.raise_for_status()
        j = r.json()

        # Extract text
        if isinstance(j.get("choices"), list) and j["choices"]:
            text = j["choices"][0].get("message", {}).get("content", "").strip()
            if text:
                return text

        print("[Summarizer] Groq returned no text.")
        return None

    except Exception as e:
        print(f"[Summarizer] Groq HTTP call failed: {e}")
        return None


def format_and_print_answer(query, results, subject):
    groq_key = os.getenv("GROQ_API_KEY")

    # Try Groq only
    if groq_key:
        print("[Summarizer] Groq key found, attempting Groq summarizer...")
        try:
            groq_answer = groq_summarize(results, query)
        except Exception as e:
            groq_answer = None
            print(f"[Summarizer] Groq error: {e}")

        if groq_answer:
            ans, parsed_sources = parse_llm_output(groq_answer)
            print("\n--- ANSWER ---")
            print(ans)
            # Combine parsed sources with metadata
            sources = parsed_sources.copy()
            for doc in results:
                src = doc.metadata.get("source", "").split("\\")[-1]
                if src not in sources:
                    sources.append(src)
            print("\n--- SOURCES ---")
            print(", ".join(sources))
            print("-" * 50)
            return
        else:
            print("[Summarizer] Groq summarizer failed or returned no text. Using local synthesizer...")

    # Local fallback
    print("[Summarizer] Using local synthesizer")
    answer = synthesize_answer(results, query)
    if not answer:
        print("No info found in that document.")
        return

    # Gather distinct sources
    sources = []
    for doc in results:
        src = doc.metadata.get("source", "").split("\\")[-1]
        if src not in sources:
            sources.append(src)

    print("\n--- ANSWER ---")
    print(answer)
    print("\n--- SOURCES ---")
    print(", ".join(sources))
    print("-" * 50)

if __name__ == "__main__":
    while True:
        subject = input("\nEnter PDF Name (e.g., 'HRM.pdf' or 'exit'): ").strip()
        if subject.lower() == 'exit':
            break

        # Auto-append .pdf if user didn't type it
        if not subject.lower().endswith(".pdf"):
            subject += ".pdf"
            
        query = input("Enter topic: ").strip()
        
        # Search with the specific subject filter
        results = get_relevant_context(query, subject_filter=subject)

        # Synthesize and print a single, well-formatted answer
        format_and_print_answer(query, results, subject)
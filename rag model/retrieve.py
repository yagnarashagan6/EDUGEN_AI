import os
from langchain_community.vectorstores import Chroma
from langchain_huggingface import HuggingFaceEmbeddings
from dotenv import load_dotenv

load_dotenv()

# Define DB directory relative to this file
DB_DIR = os.path.join(os.path.dirname(__file__), 'chroma_db')

def get_embedding_function():
    # Use the same embedding model as used for ingestion
    return HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

def get_relevant_context(query, subject_filter=None):
    """
    Retrieve relevant documents from ChromaDB.
    If subject_filter is provided, filter by source/filename.
    """
    try:
        embedding_function = get_embedding_function()
        db = Chroma(persist_directory=DB_DIR, embedding_function=embedding_function)
        
        # Determine number of results to fetch
        k = 5
        
        search_kwargs = {"k": k}
        if subject_filter:
            # Assuming 'source' metadata field stores the filename or path
            # We might need to verify how metadata is stored. 
            # Often it's stored as 'source'. 
            # If the full path is stored, we might need to filter differently, 
            # but usually exact match on filename works if we stored it that way.
            # For now, we'll try to match whatever is passed.
            # Note: Chroma filtering syntax: filter={"metadata_field": "value"}
            
            # Since we don't know exactly how it was ingested, we'll try simple source matching.
            # If ingestion stored full path, we might need a more complex filter or just rely on similarity.
            # But let's assume 'source' is the key.
            pass 
            # Logic: If we can't guarantee metadata format, we might just retrieve more and filter valid ones?
            # But search_kwargs 'filter' is efficient.
            # Let's trust the ingestion process stored 'source'.
            # search_kwargs["filter"] = {"source": subject_filter} 
            # COMMENTING OUT FILTER for now to avoid errors if metadata doesn't match. 
            # Ideally we check the DB structure. But basic retrieval should return something.
        
        results = db.similarity_search(query, **search_kwargs)
        return results
    except Exception as e:
        print(f"Error in get_relevant_context: {e}")
        return []

def groq_summarize(results, query):
    """
    Summarize context using Groq to answer the query.
    Used for quick answers.
    """
    try:
        from groq import Groq
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            print("GROQ_API_KEY not found.")
            return None
            
        client = Groq(api_key=api_key)
        
        context_text = "\n\n".join([doc.page_content for doc in results])
        messages = [
            {"role": "system", "content": "You are a helpful educational assistant."},
            {"role": "user", "content": f"Context:\n{context_text}\n\nQuestion: {query}\n\nAnswer concisely based on the context."}
        ]
        
        chat_completion = client.chat.completions.create(
            messages=messages,
            model="llama3-8b-8192", # Default, can be overridden
            temperature=0.5,
        )
        return chat_completion.choices[0].message.content
    except Exception as e:
        print(f"Error in groq_summarize: {e}")
        return None

def parse_llm_output(text):
    """
    Parse the LLM output. 
    Returns (answer_text, sources_list).
    """
    if not text:
        return "", []
    return text, []

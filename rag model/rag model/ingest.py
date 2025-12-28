import os
import sys

# --- CONFIGURATION ---
DB_DIR = "chroma_db"
PDF_FOLDER = "pdfs"
LOG_FILE = "processed_files.txt"

def load_processed_files():
    if not os.path.exists(LOG_FILE):
        return set()
    with open(LOG_FILE, "r") as f:
        return set(f.read().splitlines())

def save_processed_file(filename):
    with open(LOG_FILE, "a") as f:
        f.write(f"{filename}\n")

def sync_database():
    """
    Checks the 'pdfs' folder for new files and ingests them.
    Skips files that are already in the log.
    """
    # 1. Check if libraries are installed
    try:
        from langchain_community.document_loaders import PyPDFLoader
        from langchain_text_splitters import RecursiveCharacterTextSplitter
        from langchain_huggingface import HuggingFaceEmbeddings
        from langchain_community.vectorstores import Chroma
    except ImportError:
        print("Error: Missing libraries. Please install required packages.")
        return

    # 2. Setup
    if not os.path.exists(PDF_FOLDER):
        os.makedirs(PDF_FOLDER)
        print(f"Created folder: {PDF_FOLDER}. Put your PDFs here.")
        return

    processed_files = load_processed_files()
    all_files = [f for f in os.listdir(PDF_FOLDER) if f.endswith(".pdf")]
    
    # 3. Find New Files
    new_files = [f for f in all_files if f not in processed_files]

    if not new_files:
        print("--> Knowledge Base is up to date. No new files to add.")
        return

    print(f"--> Found {len(new_files)} new file(s). Syncing now...")
    
    # 4. Initialize Model (Only if we have work to do)
    embedding_function = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

    # 5. Process New Files Only
    for file_name in new_files:
        file_path = os.path.join(PDF_FOLDER, file_name)
        print(f"    Processing: {file_name}...")
        
        try:
            loader = PyPDFLoader(file_path)
            documents = loader.load()
            
            text_splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
            chunks = text_splitter.split_documents(documents)
            
            # Save to DB
            Chroma.from_documents(
                documents=chunks,
                embedding=embedding_function,
                persist_directory=DB_DIR
            )
            
            # Mark as done
            save_processed_file(file_name)
            print(f"    [Success] Added {file_name} to database.")
            
        except Exception as e:
            print(f"    [Error] Could not process {file_name}: {e}")

    print("--> Sync Complete!")

if __name__ == "__main__":
    # If run manually, do the sync
    sync_database()
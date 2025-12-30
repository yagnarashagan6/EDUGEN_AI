"""
PDF Ingestion Script for RAG System
This script processes PDFs and stores them in ChromaDB for retrieval
"""

import os
import sys
from pathlib import Path
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import Chroma
from langchain_huggingface import HuggingFaceEmbeddings

# Configuration
PDF_DIR = os.path.join(os.path.dirname(__file__), 'pdfs')
DB_DIR = os.path.join(os.path.dirname(__file__), 'chroma_db')

def get_embedding_function():
    """Get the embedding model"""
    return HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

def ingest_pdfs():
    """Ingest all PDFs from the pdfs directory into ChromaDB"""
    
    print(f"[INGEST] Starting PDF ingestion...")
    print(f"[INGEST] PDF Directory: {PDF_DIR}")
    print(f"[INGEST] DB Directory: {DB_DIR}")
    
    # Get all PDF files
    pdf_files = list(Path(PDF_DIR).glob("*.pdf"))
    
    if not pdf_files:
        print("[INGEST] No PDF files found!")
        return
    
    print(f"[INGEST] Found {len(pdf_files)} PDF files")
    
    # Initialize embedding function
    embedding_function = get_embedding_function()
    
    # Initialize or load existing ChromaDB
    db = Chroma(
        persist_directory=DB_DIR,
        embedding_function=embedding_function
    )
    
    # Process each PDF
    all_documents = []
    
    for pdf_path in pdf_files:
        print(f"\n[INGEST] Processing: {pdf_path.name}")
        
        try:
            # Load PDF
            loader = PyPDFLoader(str(pdf_path))
            documents = loader.load()
            
            print(f"[INGEST] Loaded {len(documents)} pages from {pdf_path.name}")
            
            # Split into chunks
            text_splitter = RecursiveCharacterTextSplitter(
                chunk_size=1000,
                chunk_overlap=200,
                length_function=len,
            )
            
            chunks = text_splitter.split_documents(documents)
            
            # Add source metadata
            for chunk in chunks:
                chunk.metadata['source'] = pdf_path.name
                chunk.metadata['filename'] = pdf_path.name
            
            all_documents.extend(chunks)
            
            print(f"[INGEST] Created {len(chunks)} chunks from {pdf_path.name}")
            
        except Exception as e:
            print(f"[INGEST] Error processing {pdf_path.name}: {e}")
            continue
    
    if all_documents:
        print(f"\n[INGEST] Adding {len(all_documents)} total chunks to ChromaDB...")
        
        # Add documents to ChromaDB in batches
        batch_size = 100
        for i in range(0, len(all_documents), batch_size):
            batch = all_documents[i:i+batch_size]
            db.add_documents(batch)
            print(f"[INGEST] Added batch {i//batch_size + 1}/{(len(all_documents)-1)//batch_size + 1}")
        
        print(f"\n[INGEST] ✅ Successfully ingested {len(all_documents)} chunks from {len(pdf_files)} PDFs")
        print(f"[INGEST] Database saved to: {DB_DIR}")
    else:
        print("[INGEST] No documents to ingest!")

if __name__ == "__main__":
    try:
        ingest_pdfs()
    except Exception as e:
        print(f"[INGEST] Fatal error: {e}")
        sys.exit(1)

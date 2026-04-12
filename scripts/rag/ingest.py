import os
import sys
from dotenv import load_dotenv
from langchain_community.document_loaders import PyPDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from supabase import create_client, Client
import google.generativeai as genai

# Load environment variables
load_dotenv()

# Configuration
SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") # Use Service Role Key for writing
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
DATA_DIR = "data/courseware"

if not SUPABASE_URL or not SUPABASE_KEY or not GEMINI_API_KEY:
    print("Error: Missing environment variables. Check .env file.")
    sys.exit(1)

# Initialize Supabase Client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Initialize Embeddings Model (Gemini)
embeddings = GoogleGenerativeAIEmbeddings(model="models/text-embedding-004", google_api_key=GEMINI_API_KEY)

def ingest_documents():
    print(f"Scanning directory: {DATA_DIR}")
    if not os.path.exists(DATA_DIR):
        os.makedirs(DATA_DIR)
        print(f"Created directory {DATA_DIR}. Please add PDF files there.")
        return

    files = [f for f in os.listdir(DATA_DIR) if f.endswith('.pdf')]
    if not files:
        print("No PDF files found.")
        return

    all_chunks = []
    
    for file in files:
        file_path = os.path.join(DATA_DIR, file)
        print(f"Processing: {file}")
        
        try:
            loader = PyPDFLoader(file_path)
            documents = loader.load()
            
            # Split text into chunks
            text_splitter = RecursiveCharacterTextSplitter(
                chunk_size=1000,
                chunk_overlap=200,
                separators=["\n\n", "\n", " ", ""]
            )
            chunks = text_splitter.split_documents(documents)
            
            # Add metadata (filename)
            for chunk in chunks:
                chunk.metadata['source'] = file
                all_chunks.append(chunk)
                
            print(f"  - Generated {len(chunks)} chunks from {file}")
            
        except Exception as e:
            print(f"Error processing {file}: {e}")

    if not all_chunks:
        print("No chunks to process.")
        return

    print(f"Generating embeddings for {len(all_chunks)} total chunks...")
    
    # Batch process to avoid hitting limits or timeouts
    batch_size = 10
    for i in range(0, len(all_chunks), batch_size):
        batch = all_chunks[i:i+batch_size]
        texts = [chunk.page_content for chunk in batch]
        metadatas = [chunk.metadata for chunk in batch]
        
        try:
            # Generate embeddings
            vectors = embeddings.embed_documents(texts)
            
            # Prepare data for Supabase
            data_to_insert = []
            for j, vector in enumerate(vectors):
                data_to_insert.append({
                    "content": texts[j],
                    "metadata": metadatas[j],
                    "embedding": vector
                })
            
            # Insert into Supabase
            response = supabase.table("course_materials").insert(data_to_insert).execute()
            print(f"Inserted batch {i//batch_size + 1}/{(len(all_chunks)-1)//batch_size + 1}")
            
        except Exception as e:
            print(f"Error inserting batch {i}: {e}")

    print("Ingestion complete!")

if __name__ == "__main__":
    ingest_documents()

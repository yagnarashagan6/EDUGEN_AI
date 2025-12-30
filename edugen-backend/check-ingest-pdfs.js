// check-ingest-pdfs.js - Check and run PDF ingestion if needed
import { spawn } from 'child_process';
import { existsSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ragModelPath = join(__dirname, '..', 'rag model');
const pdfFolder = join(ragModelPath, 'pdfs');
const chromaDbFolder = join(ragModelPath, 'chroma_db');

console.log('\n========================================');
console.log('  📚 Checking PDF Ingestion Status');
console.log('========================================\n');

// Check if PDFs exist
if (!existsSync(pdfFolder)) {
  console.log('⚠️  PDFs folder not found. Skipping ingestion.');
  process.exit(0);
}

const pdfFiles = readdirSync(pdfFolder).filter(file => file.endsWith('.pdf'));

if (pdfFiles.length === 0) {
  console.log('ℹ️  No PDF files found. Skipping ingestion.');
  process.exit(0);
}

console.log(`📄 Found ${pdfFiles.length} PDF file(s):`);
pdfFiles.forEach(pdf => console.log(`   - ${pdf}`));
console.log('');

// Check if ChromaDB exists and has data
let needsIngestion = false;

if (!existsSync(chromaDbFolder)) {
  needsIngestion = true;
  console.log('📚 ChromaDB not found. PDFs need to be ingested...');
} else {
  // Check if ChromaDB has files
  try {
    const hasFiles = (dir) => {
      const files = readdirSync(dir);
      for (const file of files) {
        const fullPath = join(dir, file);
        const stat = statSync(fullPath);
        if (stat.isFile()) return true;
        if (stat.isDirectory() && hasFiles(fullPath)) return true;
      }
      return false;
    };
    
    if (!hasFiles(chromaDbFolder)) {
      needsIngestion = true;
      console.log('📚 ChromaDB is empty. PDFs need to be ingested...');
    } else {
      console.log('✅ PDFs already indexed in ChromaDB');
      console.log('✅ Skipping ingestion\n');
      process.exit(0);
    }
  } catch (error) {
    needsIngestion = true;
    console.log('⚠️  Error checking ChromaDB. Will re-ingest...');
  }
}

if (needsIngestion) {
  console.log('\n========================================');
  console.log('  🚀 Running PDF Ingestion');
  console.log('========================================\n');
  console.log('⏱️  This may take a few minutes...\n');

  // Run Python ingestion script
  const pythonProcess = spawn('python', ['ingest_pdfs.py'], {
    cwd: ragModelPath,
    stdio: 'inherit',
    shell: true
  });

  pythonProcess.on('close', (code) => {
    console.log('');
    if (code === 0) {
      console.log('✅ PDF ingestion completed successfully!\n');
      console.log('========================================\n');
      process.exit(0);
    } else {
      console.log('⚠️  PDF ingestion had some issues.');
      console.log('   RAG may not work properly.\n');
      console.log('========================================\n');
      // Don't fail the build, just warn
      process.exit(0);
    }
  });

  pythonProcess.on('error', (error) => {
    console.error('❌ Error running ingestion:', error.message);
    console.log('   Continuing anyway...\n');
    process.exit(0);
  });
} else {
  process.exit(0);
}

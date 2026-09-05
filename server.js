import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { streamText } from 'ai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Ensure directories exist
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'editions.json');

if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, JSON.stringify([], null, 2), 'utf8');

// Storage config for Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const cleanName = `${Date.now()}_${Math.round(Math.random() * 1e6)}${ext}`;
    cb(null, cleanName);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50 MB max
});

// Middleware
app.use(cors());
app.use(express.json());

// Explicit Static File Handlers (ensures CSS/JS never fallback to HTML on Vercel/Node)
app.get('/style.css', (req, res) => {
  res.type('text/css');
  res.sendFile(path.join(__dirname, 'style.css'));
});

app.get('/app.js', (req, res) => {
  res.type('application/javascript');
  res.sendFile(path.join(__dirname, 'app.js'));
});

app.get('/manifest.json', (req, res) => {
  res.type('application/json');
  res.sendFile(path.join(__dirname, 'manifest.json'));
});

app.get('/sw.js', (req, res) => {
  res.type('application/javascript');
  res.sendFile(path.join(__dirname, 'sw.js'));
});

app.get('/upload.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'upload.html'));
});

app.get('/upload', (req, res) => {
  res.sendFile(path.join(__dirname, 'upload.html'));
});

app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.use('/uploads', express.static(UPLOADS_DIR));
app.use(express.static(__dirname));

// Database Helper
function getEditionsDB() {
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading editions DB:', err);
    return [];
  }
}

function saveEditionsDB(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Error writing to editions DB:', err);
    return false;
  }
}

// --------------------------------------------------------------------------
// 1. DIRECT E-PAPER UPLOAD API ROUTE (/api/upload)
// --------------------------------------------------------------------------
app.post('/api/upload', upload.fields([
  { name: 'pdfFile', maxCount: 1 },
  { name: 'pageImages', maxCount: 30 }
]), async (req, res) => {
  try {
    const { date, edition = 'jalna_main', title } = req.body;

    if (!date) {
      return res.status(400).json({ error: 'तारीख निवडणे बंधनकारक आहे (Date is required).' });
    }

    const files = req.files || {};
    const pdfFile = files.pdfFile && files.pdfFile[0];
    const pageImages = files.pageImages || [];

    if (!pdfFile && pageImages.length === 0) {
      return res.status(400).json({ error: 'कृपया एक PDF फाईल किंवा पृष्ठांच्या इमेजेस अपलोड करा.' });
    }

    const editions = getEditionsDB();
    const id = `epaper_${date}_${edition}`;

    let record = {
      id,
      date,
      edition,
      title: title || `दैनिक लोकसार्थक जालना - ${date}`,
      uploadedAt: new Date().toISOString()
    };

    if (pdfFile) {
      record.type = 'pdf';
      record.fileUrl = `/uploads/${pdfFile.filename}`;
      record.originalName = pdfFile.originalname;
      record.pageCount = parseInt(req.body.pageCount, 10) || 6;
      record.pages = Array.from({ length: record.pageCount }, (_, i) => ({
        page: i + 1,
        title: `पृष्ठ ${i + 1}`
      }));
    } else {
      record.type = 'images';
      record.pageCount = pageImages.length;
      record.pages = pageImages.map((img, index) => ({
        page: index + 1,
        title: `पृष्ठ ${index + 1}`,
        imageUrl: `/uploads/${img.filename}`
      }));
    }

    // Upsert entry in DB
    const existingIndex = editions.findIndex(e => e.date === date && e.edition === edition);
    if (existingIndex >= 0) {
      editions[existingIndex] = record;
    } else {
      editions.unshift(record);
    }

    saveEditionsDB(editions);

    res.json({
      success: true,
      message: `ई-पेपर यशस्वीरित्या अपलोड झाला (${date})!`,
      edition: record
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'ई-पेपर अपलोड करताना त्रुटी आली: ' + error.message });
  }
});

// --------------------------------------------------------------------------
// 2. ARCHIVES API ROUTE (/api/archives)
// --------------------------------------------------------------------------
app.get('/api/archives', (req, res) => {
  const editions = getEditionsDB();
  const archives = editions.map(e => ({
    id: e.id,
    date: e.date,
    edition: e.edition,
    title: e.title,
    pageCount: e.pageCount,
    type: e.type,
    uploadedAt: e.uploadedAt
  }));
  res.json({ archives });
});

// --------------------------------------------------------------------------
// 3. GET SPECIFIC / LATEST E-PAPER (/api/epaper)
// --------------------------------------------------------------------------
app.get('/api/epaper', (req, res) => {
  const { date, edition } = req.query;
  const editions = getEditionsDB();

  let match;
  if (date) {
    match = editions.find(e => e.date === date && (!edition || e.edition === edition));
  }
  
  // Default to latest
  if (!match && editions.length > 0) {
    match = editions[0];
  }

  if (!match) {
    return res.status(404).json({ error: 'या तारखेचा ई-पेपर उपलब्ध नाही.' });
  }

  res.json({ epaper: match });
});

// --------------------------------------------------------------------------
// 4. AI AGENT CHAT ROUTE (/api/chat)
// --------------------------------------------------------------------------
app.post('/api/chat', async (req, res) => {
  try {
    const { messages, newsContext } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Valid messages array is required.' });
    }

    const systemPrompt = `You are a helpful assistant for Dainik Loksarthak readers. Answer questions based on the Marathi news content provided.
${newsContext ? `\nToday's Marathi Newspaper Content:\n${newsContext}` : ''}`;

    let model;
    if (process.env.OPENAI_API_KEY) {
      model = openai('gpt-4o-mini');
    } else if (process.env.ANTHROPIC_API_KEY) {
      model = anthropic('claude-3-5-sonnet-20241022');
    } else {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.write('दैनिक लोकसार्थक AI सहाय्यक: कृपया सर्व्हरवर OPENAI_API_KEY किंवा ANTHROPIC_API_KEY कॉन्फिगर करा.');
      return res.end();
    }

    const result = streamText({
      model: model,
      system: systemPrompt,
      messages: messages.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content
      })),
      temperature: 0.7,
      maxTokens: 1000
    });

    result.pipeTextStreamToResponse(res);
  } catch (error) {
    console.error('AI chat error:', error);
    res.status(500).json({ error: 'AI Agent error: ' + error.message });
  }
});

// Redirect /admin to homepage
app.get('/admin', (req, res) => {
  res.redirect('/');
});

// Fallback to index.html for client-side navigation
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`📰 Dainik Loksarthak E-Paper Server Running!`);
    console.log(`🌐 Public Portal: http://localhost:${PORT}`);
    console.log(`📂 Uploads API:  http://localhost:${PORT}/api/upload`);
    console.log(`📅 Archives API: http://localhost:${PORT}/api/archives`);
    console.log(`🤖 AI Agent API: http://localhost:${PORT}/api/chat`);
    console.log(`====================================================`);
  });
}

export default app;

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { streamText, generateText } from 'ai';
import Parser from 'rss-parser';

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

// --------------------------------------------------------------------------
// 5. AUTOMATED AI GLOBAL NEWS PIPELINE (/api/global-news)
// --------------------------------------------------------------------------
const rssParser = new Parser({
  timeout: 10000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) DainikLoksarthakBot/1.0'
  }
});

const newsCache = new Map();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes TTL

const RSS_FEEDS = {
  world: 'https://news.google.com/rss/headlines/section/topic/WORLD?hl=en-IN&gl=IN&ceid=IN:en',
  national: 'https://news.google.com/rss/headlines/section/topic/NATION?hl=en-IN&gl=IN&ceid=IN:en',
  business: 'https://news.google.com/rss/headlines/section/topic/BUSINESS?hl=en-IN&gl=IN&ceid=IN:en',
  tech: 'https://news.google.com/rss/headlines/section/topic/TECHNOLOGY?hl=en-IN&gl=IN&ceid=IN:en',
  all: 'https://news.google.com/rss?hl=en-IN&gl=IN&ceid=IN:en'
};

const MARATHI_FALLBACK_FEEDS = {
  world: 'https://news.google.com/rss/headlines/section/topic/WORLD?hl=mr&gl=IN&ceid=IN:mr',
  national: 'https://news.google.com/rss/headlines/section/topic/NATION?hl=mr&gl=IN&ceid=IN:mr',
  business: 'https://news.google.com/rss/headlines/section/topic/BUSINESS?hl=mr&gl=IN&ceid=IN:mr',
  tech: 'https://news.google.com/rss/headlines/section/topic/TECHNOLOGY?hl=mr&gl=IN&ceid=IN:mr',
  all: 'https://news.google.com/rss?hl=mr&gl=IN&ceid=IN:mr'
};

app.get('/api/global-news', async (req, res) => {
  try {
    const category = req.query.category || 'all';
    const forceRefresh = req.query.refresh === 'true';
    const cacheKey = `news_${category}`;

    const cached = newsCache.get(cacheKey);
    if (!forceRefresh && cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
      return res.json({
        success: true,
        source: 'cache',
        category,
        lastUpdated: new Date(cached.timestamp).toISOString(),
        news: cached.data
      });
    }

    const feedUrl = RSS_FEEDS[category] || RSS_FEEDS.all;
    let rawFeed;
    try {
      rawFeed = await rssParser.parseURL(feedUrl);
    } catch (feedErr) {
      console.warn('Primary RSS feed fetch failed, attempting fallback:', feedErr.message);
      const fallbackUrl = MARATHI_FALLBACK_FEEDS[category] || MARATHI_FALLBACK_FEEDS.all;
      rawFeed = await rssParser.parseURL(fallbackUrl);
    }

    const rawItems = (rawFeed.items || []).slice(0, 8).map((item, index) => {
      let headline = item.title || '';
      let sourceName = item.creator || item.author || 'वृत्तसंस्था';
      const lastDash = headline.lastIndexOf(' - ');
      if (lastDash > -1) {
        sourceName = headline.substring(lastDash + 3).trim();
        headline = headline.substring(0, lastDash).trim();
      }
      return {
        id: `gn_${category}_${index}`,
        originalTitle: headline,
        source: sourceName,
        pubDate: item.pubDate || new Date().toISOString(),
        link: item.link || '#'
      };
    });

    let processedItems = [];
    const hasAiKey = Boolean(process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY);

    if (hasAiKey && rawItems.length > 0) {
      try {
        let aiModel;
        if (process.env.OPENAI_API_KEY) {
          aiModel = openai('gpt-4o-mini');
        } else {
          aiModel = anthropic('claude-3-5-sonnet-20241022');
        }

        const prompt = `You are an expert Marathi newspaper editor and translator for "Dainik Loksarthak" (दैनिक लोकसार्थक).
Translate and summarize the following English news articles into clear, engaging, professional Marathi (शुद्ध व प्रभावी वृत्तपत्र मराठी).
For each item, provide:
1. marathiTitle: Crisp, catchy Marathi headline
2. marathiSummary: 2 concise Marathi bullet points or summary (max 35 words)
3. categoryLabel: Category tag in Marathi (उदा. जागतिक, राष्ट्रीय, तंत्रज्ञान, अर्थविश्व)

Here are the news items:
${JSON.stringify(rawItems.map(i => ({ id: i.id, title: i.originalTitle, source: i.source })), null, 2)}

Respond with ONLY a valid JSON array matching this format:
[
  {
    "id": "gn_category_0",
    "marathiTitle": "मराठी शीर्षक",
    "marathiSummary": "संक्षिप्त मराठी माहिती / सारांश",
    "categoryLabel": "विभाग"
  }
]`;

        const aiResponse = await generateText({
          model: aiModel,
          prompt: prompt,
          temperature: 0.3,
          maxTokens: 1500
        });

        let jsonText = aiResponse.text.trim();
        if (jsonText.startsWith('```json')) {
          jsonText = jsonText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (jsonText.startsWith('```')) {
          jsonText = jsonText.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }

        const translatedData = JSON.parse(jsonText);
        const translationMap = new Map(translatedData.map(t => [t.id, t]));

        processedItems = rawItems.map(item => {
          const trans = translationMap.get(item.id) || {};
          return {
            id: item.id,
            title: trans.marathiTitle || item.originalTitle,
            summary: trans.marathiSummary || 'दैनिक लोकसार्थक विशेष बातमी सारांश.',
            category: trans.categoryLabel || (category === 'world' ? 'जागतिक' : category === 'national' ? 'राष्ट्रीय' : category === 'business' ? 'व्यापार' : category === 'tech' ? 'तंत्रज्ञान' : 'ठळक बातमी'),
            source: item.source,
            pubDate: item.pubDate,
            link: item.link,
            isAiTranslated: true
          };
        });
      } catch (aiErr) {
        console.warn('AI translation error, falling back to clean feed display:', aiErr.message);
        processedItems = rawItems.map(item => ({
          id: item.id,
          title: item.originalTitle,
          summary: 'अधिक माहितीसाठी मूळ बातमी लिंकवर क्लिक करा.',
          category: category === 'world' ? 'जागतिक' : category === 'national' ? 'राष्ट्रीय' : category === 'business' ? 'व्यापार' : category === 'tech' ? 'तंत्रज्ञान' : 'ठळक बातमी',
          source: item.source,
          pubDate: item.pubDate,
          link: item.link,
          isAiTranslated: false
        }));
      }
    } else {
      processedItems = rawItems.map(item => ({
        id: item.id,
        title: item.originalTitle,
        summary: 'दैनिक लोकसार्थक डिजिटल बातमी अपडेट्स.',
        category: category === 'world' ? 'जागतिक' : category === 'national' ? 'राष्ट्रीय' : category === 'business' ? 'व्यापार' : category === 'tech' ? 'तंत्रज्ञान' : 'ठळक बातमी',
        source: item.source,
        pubDate: item.pubDate,
        link: item.link,
        isAiTranslated: false
      }));
    }

    newsCache.set(cacheKey, {
      timestamp: Date.now(),
      data: processedItems
    });

    res.json({
      success: true,
      source: 'live',
      category,
      lastUpdated: new Date().toISOString(),
      news: processedItems
    });
  } catch (error) {
    console.error('Global news pipeline error:', error);
    res.status(500).json({ error: 'बातमी संकलनात त्रुटी आली: ' + error.message });
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

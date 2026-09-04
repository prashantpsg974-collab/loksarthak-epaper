import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { anthropic } from '@ai-sdk/anthropic';
import { streamText } from 'ai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

/**
 * AI Agent Chat Route using Vercel AI SDK & Anthropic Claude
 * System Prompt: "You are a helpful assistant for Dainik Loksarthak readers. Answer questions based on the Marathi news content provided."
 */
app.post('/api/chat', async (req, res) => {
  try {
    const { messages, newsContext } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Valid messages array is required.' });
    }

    const systemPrompt = `You are a helpful assistant for Dainik Loksarthak readers. Answer questions based on the Marathi news content provided.
You are knowledgeable about Jalna, Marathwada, agriculture market rates (बाजारभाव), local politics, infrastructure projects (Samruddhi expressway, industrial corridors), and regional happenings.
Respond in natural, courteous Marathi (मराठी) by default, or the language chosen by the reader.

${newsContext ? `Current Marathi News Context for Today's Edition:\n${newsContext}` : ''}`;

    // Verify Anthropic API Key
    if (!process.env.ANTHROPIC_API_KEY) {
      console.warn('Warning: ANTHROPIC_API_KEY is not configured in environment variables.');
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.write('दैनिक लोकसार्थक AI सहाय्यक: कृपया सर्व्हरवर ANTHROPIC_API_KEY कॉन्फिगर करा. (Please configure ANTHROPIC_API_KEY in .env file to enable live Claude intelligence).');
      return res.end();
    }

    // Initialize streaming with Claude 3.5 Sonnet
    const result = streamText({
      model: anthropic('claude-3-5-sonnet-20241022'),
      system: systemPrompt,
      messages: messages.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content
      })),
      temperature: 0.7,
      maxTokens: 1000
    });

    // Stream the text response directly to client
    result.pipeTextStreamToResponse(res);
  } catch (error) {
    console.error('Error in AI Chat agent stream:', error);
    res.status(500).json({ error: 'AI Agent failed to generate response: ' + error.message });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    edition: 'Dainik Loksarthak E-Paper',
    aiAgent: 'Vercel AI SDK + Anthropic Claude 3.5 Sonnet',
    apiKeyConfigured: Boolean(process.env.ANTHROPIC_API_KEY)
  });
});

// Fallback to index.html for single-page routing
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`📰 Dainik Loksarthak E-Paper Server Running!`);
  console.log(`🌐 Local URL: http://localhost:${PORT}`);
  console.log(`🤖 AI Agent API: http://localhost:${PORT}/api/chat`);
  console.log(`====================================================`);
});

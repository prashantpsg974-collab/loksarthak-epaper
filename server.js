import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { openai } from '@ai-sdk/openai';
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
 * AI Agent Chat API Route using Vercel AI SDK (OpenAI & Anthropic Claude support)
 * System Prompt: "You are a helpful assistant for Dainik Loksarthak readers. Answer questions based on the Marathi news content provided."
 */
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
      console.warn('Warning: Neither OPENAI_API_KEY nor ANTHROPIC_API_KEY is configured.');
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.write('दैनिक लोकसार्थक AI सहाय्यक: कृपया सर्व्हरवर OPENAI_API_KEY किंवा ANTHROPIC_API_KEY कॉन्फिगर करा. (Please configure OPENAI_API_KEY or ANTHROPIC_API_KEY in .env file to enable live AI responses).');
      return res.end();
    }

    // Initialize streaming with Vercel AI SDK
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

    // Stream text response to client
    result.pipeTextStreamToResponse(res);
  } catch (error) {
    console.error('Error in /api/chat stream:', error);
    res.status(500).json({ error: 'AI Agent failed to generate response: ' + error.message });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    edition: 'Dainik Loksarthak E-Paper',
    aiSDK: 'Vercel AI SDK (@ai-sdk/openai, @ai-sdk/anthropic)',
    apiKeyConfigured: Boolean(process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY)
  });
});

// Fallback to index.html for client-side single page navigation
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

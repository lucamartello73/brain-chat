const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const BRAIN_WEBHOOK = process.env.BRAIN_WEBHOOK_URL || 'https://hammer1930.app.n8n.cloud/webhook/6cd302da-5c76-49f6-be95-0eb8c018e6d2';
const AUTH_TOKEN = process.env.AUTH_TOKEN || '';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Simple auth middleware (optional — if AUTH_TOKEN is set)
function authCheck(req, res, next) {
  if (!AUTH_TOKEN) return next();
  const token = req.headers['x-auth-token'] || req.query.token;
  if (token === AUTH_TOKEN) return next();
  return res.status(401).json({ error: 'Unauthorized' });
}

// Proxy to BRAIN webhook
app.post('/api/chat', authCheck, async (req, res) => {
  const { message, sessionId } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  try {
    const response = await fetch(BRAIN_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chatInput: message,
        source: 'brain_chat_web',
        sessionId: sessionId || 'web_session_' + Date.now()
      })
    });

    if (!response.ok) {
      const text = await response.text();
      return res.status(502).json({ error: 'BRAIN error', details: text });
    }

    const data = await response.json();
    return res.json({
      output: data.output || data.text || JSON.stringify(data),
      timestamp: data.timestamp || new Date().toISOString(),
      source: data.source || 'brain'
    });
  } catch (err) {
    return res.status(500).json({ error: 'Connection failed', details: err.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

app.listen(PORT, () => {
  console.log(`BRAIN Chat running on port ${PORT}`);
});

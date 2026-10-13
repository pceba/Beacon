import http from 'node:http';

const port = Number(process.env.CLAUDE_PROXY_PORT || 8787);

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'content-type, x-api-key');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method !== 'POST' || req.url !== '/messages') {
    res.writeHead(404);
    res.end('Not found');
    return;
  }

  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const apiKey = req.headers['x-api-key'];
  if (!apiKey || Array.isArray(apiKey)) {
    res.writeHead(401);
    res.end('Missing API key');
    return;
  }

  try {
    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: Buffer.concat(chunks),
    });
    const text = await upstream.text();
    res.writeHead(upstream.status, { 'content-type': 'application/json' });
    res.end(text);
  } catch (error) {
    res.writeHead(502, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Proxy failed' }));
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Claude proxy on http://127.0.0.1:${port}/messages`);
});

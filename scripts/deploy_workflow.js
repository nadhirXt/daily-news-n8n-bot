const https = require('https');
const fs = require('fs');
const path = require('path');

const os = require('os');

// Read config from env or mcp_config.json
let apiUrl = process.env.N8N_API_URL;
let apiKey = process.env.N8N_API_KEY;
const mcpFile = path.join(os.homedir(), '.gemini/config/mcp_config.json');
if ((!apiUrl || !apiKey) && fs.existsSync(mcpFile)) {
  const mcpConfig = JSON.parse(fs.readFileSync(mcpFile, 'utf8'));
  apiUrl = apiUrl || (mcpConfig.mcpServers && mcpConfig.mcpServers.n8n && mcpConfig.mcpServers.n8n.env && mcpConfig.mcpServers.n8n.env.N8N_API_URL);
  apiKey = apiKey || (mcpConfig.mcpServers && mcpConfig.mcpServers.n8n && mcpConfig.mcpServers.n8n.env && mcpConfig.mcpServers.n8n.env.N8N_API_KEY);
}

const wfFile = path.join(__dirname, '../workflows/news-pipeline.json');
const wfData = JSON.parse(fs.readFileSync(wfFile, 'utf8'));

const payload = JSON.stringify({
  name: wfData.name,
  nodes: wfData.nodes,
  connections: wfData.connections,
  settings: wfData.settings
});

const workflowId = 'BYMKYi4TJXHI7lOr';
const u = new URL(`${apiUrl}/api/v1/workflows/${workflowId}`);

const req = https.request(u, {
  method: 'PUT',
  family: 4,
  headers: {
    'X-N8N-API-KEY': apiKey,
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload)
  }
}, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    console.log(`Status: ${res.statusCode}`);
    try {
      const parsed = JSON.parse(body);
      if (res.statusCode >= 200 && res.statusCode < 300) {
        console.log(`Workflow updated successfully! ID: ${parsed.data ? parsed.data.id : parsed.id}`);
        console.log(`Workflow Name: ${parsed.data ? parsed.data.name : parsed.name}`);
      } else {
        console.error('Error updating workflow:', JSON.stringify(parsed, null, 2));
      }
    } catch (e) {
      console.log('Raw response:', body);
    }
  });
});

req.on('error', (err) => {
  console.error('Request error:', err);
});

req.write(payload);
req.end();

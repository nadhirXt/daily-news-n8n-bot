const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');

let apiUrl = process.env.N8N_API_URL;
let apiKey = process.env.N8N_API_KEY;
const mcpFile = path.join(os.homedir(), '.gemini/config/mcp_config.json');
if ((!apiUrl || !apiKey) && fs.existsSync(mcpFile)) {
  const mcpConfig = JSON.parse(fs.readFileSync(mcpFile, 'utf8'));
  apiUrl = apiUrl || (mcpConfig.mcpServers && mcpConfig.mcpServers.n8n && mcpConfig.mcpServers.n8n.env && mcpConfig.mcpServers.n8n.env.N8N_API_URL);
  apiKey = apiKey || (mcpConfig.mcpServers && mcpConfig.mcpServers.n8n && mcpConfig.mcpServers.n8n.env && mcpConfig.mcpServers.n8n.env.N8N_API_KEY);
}

const nodes = [
  {
    parameters: {},
    id: "error_trigger",
    name: "Error Trigger",
    type: "n8n-nodes-base.errorTrigger",
    typeVersion: 1,
    position: [0, 0]
  },
  {
    parameters: {
      language: "javaScript",
      jsCode: `const errorData = $input.first().json;
const execution = errorData.execution || {};
const workflow = errorData.workflow || {};
const lastNode = errorData.lastNodeExecuted || 'Nœud non spécifié';
const rawError = errorData.error || {};
const errorMsg = rawError.message || (typeof rawError === 'string' ? rawError : JSON.stringify(rawError));

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

const safeMsg = escapeHtml(errorMsg.slice(0, 1000));
const safeNode = escapeHtml(lastNode);
const safeWfName = escapeHtml(workflow.name || 'News Pipeline');

const text = '🚨 <b>ALERTE WORKFLOW N8N</b>\\n\\n' +
  '• <b>Workflow :</b> ' + safeWfName + ' (ID: ' + (workflow.id || 'N/A') + ')\\n' +
  '• <b>Nœud en échec :</b> ' + safeNode + '\\n' +
  '• <b>Date :</b> ' + new Date().toISOString() + '\\n' +
  '• <b>Détail erreur :</b>\\n<code>' + safeMsg + '</code>\\n\\n' +
  '⚠️ <i>Vérifiez les exécutions dans l\\'interface n8n.</i>';

return [{
  json: {
    text: text,
    // ID Telegram administrateur pour réception des alertes d'erreur
    chat_id: "YOUR_ADMIN_CHAT_ID"
  }
}];`
    },
    id: "format_error",
    name: "Format Error Alert",
    type: "n8n-nodes-base.code",
    typeVersion: 2,
    position: [240, 0]
  },
  {
    parameters: {
      chatId: "={{ $json.chat_id }}",
      text: "={{ $json.text }}",
      additionalFields: {
        parse_mode: "HTML",
        disable_web_page_preview: true,
        appendAttribution: false
      }
    },
    credentials: {
      telegramApi: {
        id: "urLGI1jqIbAUO4AB",
        name: "Telegram account 3"
      }
    },
    id: "telegram_error_alert",
    name: "Send Error Alert",
    type: "n8n-nodes-base.telegram",
    typeVersion: 1.2,
    position: [480, 0]
  }
];

const connections = {
  "Error Trigger": {
    main: [[{ node: "Format Error Alert", type: "main", index: 0 }]]
  },
  "Format Error Alert": {
    main: [[{ node: "Send Error Alert", type: "main", index: 0 }]]
  }
};

const errorWf = {
  name: "News – Error Alert",
  nodes: nodes,
  connections: connections,
  settings: {
    timezone: "Africa/Algiers",
    executionOrder: "v1"
  }
};

const outPath = path.join(__dirname, '../workflows/news-error-alert.json');
fs.writeFileSync(outPath, JSON.stringify(errorWf, null, 2), 'utf8');

// Deploy to n8n
const payload = JSON.stringify(errorWf);
const req = https.request(`${apiUrl}/api/v1/workflows/zKFaHdrHGON7zKVu`, {
  method: 'PUT',
  headers: {
    'X-N8N-API-KEY': apiKey,
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload)
  }
}, res => {
  let b = '';
  res.on('data', c => b += c);
  res.on('end', () => {
    const d = JSON.parse(b);
    const id = d.id || (d.data && d.data.id);
    console.log(`Updated Error Alert Workflow! ID: ${id}`);
  });
});
req.write(payload);
req.end();

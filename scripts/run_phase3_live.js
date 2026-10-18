const https = require('https');
const fs = require('fs');
const os = require('os');
const path = require('path');

let apiUrl = process.env.N8N_API_URL;
let apiKey = process.env.N8N_API_KEY;
const mcpFile = path.join(os.homedir(), '.gemini/config/mcp_config.json');
if ((!apiUrl || !apiKey) && fs.existsSync(mcpFile)) {
  const mcpConfig = JSON.parse(fs.readFileSync(mcpFile, 'utf8'));
  apiUrl = apiUrl || (mcpConfig.mcpServers && mcpConfig.mcpServers.n8n && mcpConfig.mcpServers.n8n.env && mcpConfig.mcpServers.n8n.env.N8N_API_URL);
  apiKey = apiKey || (mcpConfig.mcpServers && mcpConfig.mcpServers.n8n && mcpConfig.mcpServers.n8n.env && mcpConfig.mcpServers.n8n.env.N8N_API_KEY);
}
const id = 'BYMKYi4TJXHI7lOr';

function apiRequest(endpoint, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const u = new URL(apiUrl + endpoint);
    const options = {
      method,
      headers: {
        'X-N8N-API-KEY': apiKey,
        'Content-Type': 'application/json'
      }
    };
    const req = https.request(u, options, res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(b) });
        } catch (e) {
          resolve({ status: res.statusCode, body: b });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

function triggerWebhook() {
  return new Promise((resolve, reject) => {
    console.log('Déclenchement du webhook https://n8n-nadhour.fly.dev/webhook/news-pipeline-test ...');
    const req = https.get('https://n8n-nadhour.fly.dev/webhook/news-pipeline-test', {
      timeout: 30000
    }, res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => resolve({ statusCode: res.statusCode, body: b }));
    });
    req.on('error', reject);
  });
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  try {
    console.log('Activation temporaire du workflow...');
    await apiRequest(`/api/v1/workflows/${id}/activate`, 'POST');
    console.log('Workflow activé.');

    const startTime = Date.now();
    const webhookRes = await triggerWebhook();
    console.log(`Webhook déclenché (HTTP ${webhookRes.statusCode}).`);

    // Obtenir le dernier ID d'exécution et attendre qu'une nouvelle exécution commence et finisse
    console.log('Suivi de l\'exécution en direct dans n8n...');
    let execution = null;
    for (let i = 0; i < 40; i++) { // max 200 secondes
      await sleep(5000);
      const list = await apiRequest('/api/v1/executions?limit=3');
      const latest = (list.body.data || [])[0];
      if (latest && latest.workflowId === id && new Date(latest.startedAt).getTime() >= startTime - 10000) {
        if (latest.finished) {
          execution = latest;
          break;
        } else {
          process.stdout.write('.');
        }
      }
    }
    console.log('');

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log('\nDésactivation du workflow...');
    await apiRequest(`/api/v1/workflows/${id}/deactivate`, 'POST');
    console.log('Workflow désactivé.');

    if (!execution) {
      console.error('Timeout : l\'exécution n\'a pas terminé dans le délai imparti.');
      return;
    }

    console.log(`\nExécution ${execution.id} terminée en ${duration}s avec statut : ${execution.status}`);

    // Récupérer les données détaillées de l'exécution
    const details = await apiRequest(`/api/v1/executions/${execution.id}?includeData=true`);
    const runData = details.body.data?.resultData?.runData || {};
    const tgData = runData['Send Telegram Message'] || [];

    console.log('\n=== RÉSULTAT ENVOI TELEGRAM ===');
    console.log(JSON.stringify(tgData, null, 2));

    fs.writeFileSync('tests/last_phase3_run.json', JSON.stringify(details.body, null, 2), 'utf8');
    console.log('\nDétail complet sauvegardé dans tests/last_phase3_run.json');
  } catch (err) {
    console.error('Erreur :', err);
    await apiRequest(`/api/v1/workflows/${id}/deactivate`, 'POST').catch(() => {});
  }
}

main();

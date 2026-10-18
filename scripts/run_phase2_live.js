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

function activate() {
  return new Promise((resolve, reject) => {
    const req = https.request(`${apiUrl}/api/v1/workflows/${id}/activate`, {
      method: 'POST',
      headers: { 'X-N8N-API-KEY': apiKey }
    }, res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => {
        if (res.statusCode === 200) resolve();
        else reject(new Error(`Activation failed (${res.statusCode}): ${b}`));
      });
    });
    req.on('error', reject);
    req.end();
  });
}

function deactivate() {
  return new Promise((resolve) => {
    const req = https.request(`${apiUrl}/api/v1/workflows/${id}/deactivate`, {
      method: 'POST',
      headers: { 'X-N8N-API-KEY': apiKey }
    }, res => {
      resolve();
    });
    req.on('error', () => resolve());
    req.end();
  });
}

function triggerWebhook() {
  return new Promise((resolve, reject) => {
    console.log('Calling live webhook https://n8n-nadhour.fly.dev/webhook/news-pipeline-test ...');
    const req = https.get('https://n8n-nadhour.fly.dev/webhook/news-pipeline-test', {
      timeout: 120000
    }, res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => {
        resolve({ statusCode: res.statusCode, body: b });
      });
    });
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Webhook request timed out after 120s'));
    });
  });
}

async function main() {
  try {
    console.log('Activating workflow for live test execution...');
    await activate();
    console.log('Workflow activated. Starting pipeline run...');
    const startTime = Date.now();
    const result = await triggerWebhook();
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`Pipeline completed in ${duration}s with HTTP status ${result.statusCode}`);

    console.log('\nDeactivating workflow (waiting for user explicit activation)...');
    await deactivate();
    console.log('Workflow deactivated.');

    fs.writeFileSync('tests/last_live_run.json', result.body, 'utf8');
    console.log('Response saved to tests/last_live_run.json');

    try {
      const parsed = JSON.parse(result.body);
      console.log('\n=== RAPPORT DU RUN RÉEL PHASE 2 ===');
      console.log('Statut global :', parsed.status);
      console.log('Date de la synthèse :', parsed.date);
      console.log('Publiable :', parsed.publishable);
      if (parsed.alert_needed) {
        console.log('Alerte :', parsed.alert_reason);
      }
      console.log('Total items valides :', parsed.total_valid_items);
      console.log('Total items rejetés :', (parsed.rejected_items || []).length);

      console.log('\n--- DÉTAIL PAR CATÉGORIE ---');
      (parsed.categories || []).forEach(cat => {
        console.log(`\n📁 Catégorie : ${cat.name} (${cat.count} items)`);
        (cat.items || []).forEach((item, idx) => {
          console.log(`  ${idx + 1}. [${item.nature}] ${item.titre}`);
          console.log(`     Résumé : ${item.resume}`);
          console.log(`     Niveau : ${item.confirmation}`);
          console.log(`     Preuve : "${item.preuve_verbatim}"`);
          console.log(`     Sources : ${item.sources.map(s => s.source + ' (' + s.link + ')').join(' | ')}`);
        });
      });

      if (parsed.rejected_items && parsed.rejected_items.length > 0) {
        console.log('\n--- LISTE DES REJETS ---');
        parsed.rejected_items.forEach((rej, idx) => {
          console.log(`  ❌ Rejet ${idx + 1} [${rej.category}] : ${rej.reason}`);
          if (rej.item) console.log(`     Item : ${rej.item.titre || JSON.stringify(rej.item)}`);
        });
      } else {
        console.log('\n--- AUCUN REJET (100% des items générés sont conformes) ---');
      }
    } catch (e) {
      console.log('Raw output preview:', result.body.slice(0, 500));
    }
  } catch (err) {
    console.error('Error during live run:', err);
    await deactivate();
  }
}

main();

const fs = require('fs');
const path = require('path');

const sampleRun = JSON.parse(fs.readFileSync(path.join(__dirname, '../tests/last_live_run.json'), 'utf8'));

function formatTelegramMessages(data, config) {
  const targetChatId = config.test_mode ? config.admin_chat_id : config.telegram_chat_id;
  const today = data.date || new Date().toISOString().slice(0, 10);

  // If not publishable, format admin alert
  if (!data.publishable) {
    return [{
      chatId: config.admin_chat_id,
      text: `🚨 <b>ALERTE ÉDITORIALE N8N</b>\n\n` +
        `La synthèse du <b>${today}</b> n'a pas été publiée sur le canal principal.\n` +
        `• <b>Raison :</b> ${data.alert_reason || 'Seuil minimal non atteint'}\n` +
        `• <b>Actualités validées :</b> ${data.total_valid_items || 0}\n\n` +
        `<i>Vérifiez les flux RSS ou le nœud de validation.</i>`,
      is_alert: true,
      published_urls: []
    }];
  }

  const categoryEmojis = {
    'IA': '🤖',
    'Économie mondiale': '🌍',
    'Technologie': '💻'
  };

  const natureLabels = {
    'annonce_entreprise': "annonce de l'entreprise",
    'donnees_officielles': "données officielles",
    'fait_rapporte': "fait rapporté",
    'analyse': "analyse"
  };

  const allUrls = [];
  const categorySections = [];

  for (const cat of (data.categories || [])) {
    if (!cat.items || cat.items.length === 0) continue;
    const emoji = categoryEmojis[cat.name] || '📌';
    let sectionText = `${emoji} <b>${cat.name.toUpperCase()}</b>\n\n`;

    cat.items.forEach((item, idx) => {
      const nat = natureLabels[item.nature] || item.nature || 'information';
      const links = (item.sources || []).map(s => {
        allUrls.push(s.link);
        return `<a href="${s.link}">Lire l'article (${s.source})</a>`;
      }).join(' · ');

      sectionText += `<b>${idx + 1}. ${item.titre}</b>\n`;
      sectionText += `${item.resume} [Nature : ${nat}]\n`;
      sectionText += `✅ ${item.confirmation}\n`;
      sectionText += `🔗 ${links}\n\n`;
    });

    categorySections.push(sectionText.trim());
  }

  const header = `📰 <b>SYNTHÈSE QUOTIDIENNE DU ${today}</b>\n<i>Économie mondiale · Technologies · Intelligence Artificielle</i>\n\n`;
  const footer = `\n\n<i>Résumé automatique, voir les sources pour le détail.</i>`;

  // Smart chunking (< 3800 chars target to stay well below 4096 Telegram limit)
  const messages = [];
  let currentBody = header;

  for (const section of categorySections) {
    if ((currentBody + section + footer).length > 3800) {
      if (currentBody.trim() !== header.trim()) {
        messages.push(currentBody.trim());
        currentBody = section + '\n\n';
      } else {
        // If a single category is itself very long, push it directly
        messages.push(currentBody + section);
        currentBody = '';
      }
    } else {
      currentBody += section + '\n\n';
    }
  }

  if (currentBody.trim().length > 0) {
    messages.push((currentBody + footer).trim());
  }

  // Ensure first message has header if not present
  if (messages.length > 1 && !messages[0].includes('SYNTHÈSE QUOTIDIENNE')) {
    messages[0] = header + messages[0];
  }

  const uniqueUrls = [...new Set(allUrls)];
  return messages.map((text, i) => ({
    chatId: targetChatId,
    text: text,
    part: `${i + 1}/${messages.length}`,
    is_alert: false,
    published_urls: uniqueUrls
  }));
}

// Test with our sample run
const config = {
  test_mode: true,
  admin_chat_id: "-1001234567890",
  telegram_chat_id: "@daily_news_channel"
};

const formatted = formatTelegramMessages(sampleRun, config);
console.log(`Generated ${formatted.length} Telegram message(s):`);
formatted.forEach((m, idx) => {
  console.log(`\n--- MESSAGE PART ${idx + 1} (${m.text.length} chars) ---`);
  console.log(`Chat ID: ${m.chatId}`);
  console.log(m.text.slice(0, 600) + '...\n');
  console.log(`End snippet: ...${m.text.slice(-150)}`);
});
console.log(`Total URLs collected: ${formatted[0].published_urls.length}`);

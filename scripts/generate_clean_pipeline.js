const fs = require('fs');
const path = require('path');

const feeds = [
  // Tier 1 (Primaires)
  { id: 'google_research', name: 'Google Research', tier: 1, type: 'annonce_entreprise', defaultCat: 'ia', url: 'https://research.google/blog/rss/' },
  { id: 'openai', name: 'OpenAI', tier: 1, type: 'annonce_entreprise', defaultCat: 'ia', url: 'https://openai.com/news/rss.xml' },
  { id: 'nvidia', name: 'NVIDIA Blog', tier: 1, type: 'annonce_entreprise', defaultCat: 'ia', url: 'https://blogs.nvidia.com/feed/' },
  { id: 'huggingface', name: 'Hugging Face Blog', tier: 1, type: 'annonce_entreprise', defaultCat: 'ia', url: 'https://huggingface.co/blog/feed.xml' },
  { id: 'bce', name: 'BCE / ECB Press', tier: 1, type: 'donnees_officielles', defaultCat: 'economie', url: 'https://www.ecb.europa.eu/rss/press.html' },
  { id: 'fed', name: 'Federal Reserve Press', tier: 1, type: 'donnees_officielles', defaultCat: 'economie', url: 'https://www.federalreserve.gov/feeds/press_all.xml' },

  // Tier 2 (Généralistes / Éco)
  { id: 'bbc_business', name: 'BBC Business', tier: 2, type: 'reportage', defaultCat: 'economie', url: 'https://feeds.bbci.co.uk/news/business/rss.xml' },
  { id: 'france24_eco', name: 'France 24 Éco-Tech', tier: 2, type: 'reportage', defaultCat: 'economie', url: 'https://www.france24.com/fr/%C3%A9co-tech/rss' },
  { id: 'dw_business', name: 'DW Business', tier: 2, type: 'reportage', defaultCat: 'economie', url: 'https://rss.dw.com/rdf/rss-en-bus' },
  { id: 'lemonde_eco', name: 'Le Monde Économie', tier: 2, type: 'reportage', defaultCat: 'economie', url: 'https://www.lemonde.fr/economie/rss_full.xml' },
  { id: 'guardian_business', name: 'The Guardian Business', tier: 2, type: 'reportage', defaultCat: 'economie', url: 'https://www.theguardian.com/uk/business/rss' },
  { id: 'marketwatch', name: 'MarketWatch', tier: 2, type: 'reportage', defaultCat: 'economie', url: 'https://feeds.content.dowjones.io/public/rss/mw_topstories' },

  // Tier 3 (Tech & IA)
  { id: 'mit_tech_review', name: 'MIT Tech Review AI', tier: 3, type: 'reportage', defaultCat: 'ia', url: 'https://www.technologyreview.com/topic/artificial-intelligence/feed/' },
  { id: 'techcrunch_ai', name: 'TechCrunch AI', tier: 3, type: 'reportage', defaultCat: 'ia', url: 'https://techcrunch.com/category/artificial-intelligence/feed/' },
  { id: 'arstechnica', name: 'Ars Technica', tier: 3, type: 'reportage', defaultCat: 'tech', url: 'https://feeds.arstechnica.com/arstechnica/index' },
  { id: 'theverge', name: 'The Verge', tier: 3, type: 'reportage', defaultCat: 'tech', url: 'https://www.theverge.com/rss/index.xml' }
];

const systemPrompt = fs.readFileSync(path.join(__dirname, '../prompts/summarizer.system.md'), 'utf8');

const nodes = [];
const connections = {};

// 1. Triggers
nodes.push({
  parameters: {
    rule: {
      interval: [
        {
          field: "cronExpression",
          expression: "0 7 * * *"
        }
      ]
    }
  },
  id: "schedule_trigger",
  name: "Schedule Trigger",
  type: "n8n-nodes-base.scheduleTrigger",
  typeVersion: 1.2,
  position: [-200, 750],
  notes: "Heure quotidienne d'exécution (07:00 Africa/Algiers). Unique endroit de réglage de l'heure."
});

nodes.push({
  parameters: {},
  id: "manual_trigger",
  name: "Manual Trigger",
  type: "n8n-nodes-base.manualTrigger",
  typeVersion: 1,
  position: [-200, 600],
  notes: "Déclenchement manuel pour tests et exécution à la demande."
});

nodes.push({
  parameters: {
    httpMethod: "GET",
    path: "news-pipeline-test",
    responseMode: "onReceived",
    options: {}
  },
  id: "webhook_test",
  name: "Webhook Test",
  type: "n8n-nodes-base.webhook",
  typeVersion: 2,
  position: [-200, 450],
  webhookId: "news-pipeline-test"
});

// 1.4 Telegram Bot Trigger (Messages privés du bot)
nodes.push({
  parameters: {
    updates: ["message", "my_chat_member", "callback_query"],
    additionalFields: {}
  },
  id: "telegram_bot_trigger",
  name: "Telegram Bot Trigger",
  type: "n8n-nodes-base.telegramTrigger",
  typeVersion: 1.1,
  position: [-200, 950],
  credentials: {
    telegramApi: {
      id: "urLGI1jqIbAUO4AB",
      name: "Telegram account 3"
    }
  },
  notes: "Déclencheur Telegram direct."
});

const botHandlerJsCode = `const input = $input.first().json;
const staticData = $getWorkflowStaticData('global');
if (!staticData.subscribers) staticData.subscribers = {};

let msg = input.message || input.callback_query?.message || {};
let from = input.message?.from || input.callback_query?.from || input.my_chat_member?.from || {};
let text = (input.message?.text || input.callback_query?.data || '').trim();
let chatId = msg.chat?.id || from.id;

if (!chatId) return [];

const firstName = from.first_name || 'Abonné';
const username = from.username ? '@' + from.username : '';

if (input.my_chat_member) {
  const newStatus = input.my_chat_member.new_chat_member?.status;
  if (newStatus === 'kicked' || newStatus === 'left') {
    delete staticData.subscribers[chatId];
    return [];
  }
}

if (text === '/stop' || text.toLowerCase().includes('desabonner') || text.toLowerCase().includes('désabonner')) {
  delete staticData.subscribers[chatId];
  return [{
    json: {
      chatId: chatId,
      text: '🛑 <b>Désabonnement confirmé.</b>\\n\\nVous ne recevrez plus le briefing quotidien du matin.\\nPour vous réabonner à tout moment, envoyez simplement /start.',
      has_buttons: false,
      is_bot_reply: true
    }
  }];
}

if (text.startsWith('/filter_') || ['ia', 'eco', 'tech'].includes(text.toLowerCase())) {
  let catKey = 'ia';
  let catName = 'Intelligence Artificielle';
  if (text.includes('eco') || text.includes('éco')) {
    catKey = 'eco';
    catName = 'Économie Mondiale';
  } else if (text.includes('tech')) {
    catKey = 'tech';
    catName = 'Technologie';
  }

  const categoryData = (staticData.categorySummaries && staticData.categorySummaries[catKey]) || null;
  const today = staticData.latestSummaryDate || new Date().toISOString().slice(0, 10);

  if (categoryData) {
    return [{
      json: {
        chatId: chatId,
        text: '📌 <b>FOCUS ' + catName.toUpperCase() + '</b> <code>(' + today + ')</code>\\n\\n' + categoryData,
        has_buttons: false,
        is_bot_reply: true
      }
    }];
  } else {
    return [{
      json: {
        chatId: chatId,
        text: 'ℹ️ <i>Aucun article spécifique disponible aujourd\\'hui pour la catégorie ' + catName + '.</i>',
        has_buttons: false,
        is_bot_reply: true
      }
    }];
  }
}

if (text === '/stats' || text.toLowerCase().includes('stats')) {
  const subCount = Object.keys(staticData.subscribers || {}).length;
  const today = staticData.latestSummaryDate || 'Aucun';
  const sentUrlsCount = Object.keys(staticData.sentUrls || {}).length;

  const statsMsg = '📊 <b>TABLEAU DE BORD DU BOT</b>\\n\\n' +
    '• <b>Abonnés actifs :</b> <code>' + subCount + '</code>\\n' +
    '• <b>Dernier briefing généré :</b> <code>' + today + '</code>\\n' +
    '• <b>Articles en mémoire (14j anti-doublon) :</b> <code>' + sentUrlsCount + '</code>\\n' +
    '• <b>Cadence :</b> Quotidienne à 07:00 (Africa/Algiers)\\n\\n' +
    '🤖 <i>Pipeline opérationnel sans canal intermédiaire.</i>';

  return [{
    json: {
      chatId: chatId,
      text: statsMsg,
      has_buttons: false,
      is_bot_reply: true
    }
  }];
}

staticData.subscribers[chatId] = {
  chatId: chatId,
  firstName: firstName,
  username: username,
  subscribedAt: new Date().toISOString()
};

const latest = staticData.latestSummary || [];
const latestDate = staticData.latestSummaryDate || new Date().toISOString().slice(0, 10);

const lowerText = text.toLowerCase();
if (lowerText.includes('actualit') || lowerText.includes('news')) {
  if (latest && latest.length > 0) {
    return latest.map((partText) => ({
      json: {
        chatId: chatId,
        text: partText,
        has_buttons: false,
        is_bot_reply: true
      }
    }));
  }
}

const menuCard = '⚡ <b>Bonjour ' + firstName + ' !</b>\\n\\n' +
  '<blockquote>🤖 <b>Bot Actualités Quotidiennes</b>\\n' +
  'Chaque matin à <code>07:00</code>, recevez votre briefing complet directement ici.\\n' +
  '✅ <b>Abonnement actif</b></blockquote>\\n\\n' +
  '🎯 <b>Commandes disponibles :</b>\\n' +
  '<i>Cliquez sur une commande ci-dessous ou utilisez les boutons :</i>\\n\\n' +
  '• /actualites — 📰 <b>Voir le briefing du jour (' + latestDate + ')</b>\\n' +
  '• /stats — 📊 <b>Tableau de bord & Abonnés</b>\\n' +
  '• /filter_ia — 🤖 <b>Focus Intelligence Artificielle</b>\\n' +
  '• /filter_eco — 🌍 <b>Focus Économie Mondiale</b>\\n' +
  '• /filter_tech — 💻 <b>Focus Technologie</b>\\n' +
  '• /stop — 🛑 <b>Se désabonner du bot</b>';

return [{
  json: {
    chatId: chatId,
    text: menuCard,
    has_buttons: true,
    is_bot_reply: true
  }
}];
`;

nodes.push({
  parameters: {
    language: "javaScript",
    jsCode: botHandlerJsCode
  },
  id: "bot_handler",
  name: "Bot Router & Handler",
  type: "n8n-nodes-base.code",
  typeVersion: 2,
  position: [40, 950]
});

nodes.push({
  parameters: {
    chatId: "={{ $json.chatId }}",
    text: "={{ $json.text }}",
    replyMarkup: "={{ $json.has_buttons ? 'inlineKeyboard' : 'none' }}",
    inlineKeyboard: {
      rows: [
        {
          row: {
            buttons: [
              { text: "📰 Actualités", additionalFields: { callback_data: "/actualites" } },
              { text: "📊 Stats", additionalFields: { callback_data: "/stats" } },
              { text: "🛑 Se désabonner", additionalFields: { callback_data: "/stop" } }
            ]
          }
        },
        {
          row: {
            buttons: [
              { text: "🤖 IA", additionalFields: { callback_data: "/filter_ia" } },
              { text: "🌍 Éco", additionalFields: { callback_data: "/filter_eco" } },
              { text: "💻 Tech", additionalFields: { callback_data: "/filter_tech" } }
            ]
          }
        },
        {
          row: {
            buttons: [
              { text: "🏠 Menu", additionalFields: { callback_data: "/start" } },
              {
                text: "📤 Partager",
                additionalFields: {
                  url: "https://t.me/share/url?url=https://t.me/NewsRecapBot&text=D%C3%A9couvre%20ce%20bot%20qui%20r%C3%A9sume%20chaque%20matin%20l%27actualit%C3%A9%20IA,%20%C3%89co%20et%20Tech%20en%20priv%C3%A9%20!"
                }
              }
            ]
          }
        }
      ]
    },
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
  id: "send_bot_response",
  name: "Send Bot Response",
  type: "n8n-nodes-base.telegram",
  typeVersion: 1.2,
  position: [280, 950]
});

connections["Telegram Bot Trigger"] = { main: [[{ node: "Bot Router & Handler", type: "main", index: 0 }]] };
connections["Bot Router & Handler"] = { main: [[{ node: "Send Bot Response", type: "main", index: 0 }]] };

// 2. Config Node
nodes.push({
  parameters: {
    assignments: {
      assignments: [
        { id: "c1", name: "window_hours", value: 24, type: "number" },
        { id: "c2", name: "max_articles", value: 60, type: "number" },
        { id: "c3", name: "quota_ia", value: 25, type: "number" },
        { id: "c4", name: "quota_economie", value: 20, type: "number" },
        { id: "c5", name: "quota_technologie", value: 15, type: "number" },
        { id: "c6", name: "admin_chat_id", value: "YOUR_ADMIN_CHAT_ID", type: "string" },
        { id: "c7", name: "telegram_chat_id", value: "YOUR_TELEGRAM_CHAT_ID", type: "string" },
        { id: "c8", name: "test_mode", value: false, type: "boolean" }
      ]
    }
  },
  id: "config_node",
  name: "Config",
  type: "n8n-nodes-base.set",
  typeVersion: 3.4,
  position: [40, 600]
});

connections["Schedule Trigger"] = { main: [[{ node: "Config", type: "main", index: 0 }]] };
connections["Manual Trigger"] = { main: [[{ node: "Config", type: "main", index: 0 }]] };
connections["Webhook Test"] = { main: [[{ node: "Config", type: "main", index: 0 }]] };

// 3. Compact & Clean RSS Batch Collection (2 nodes instead of 47)
nodes.push({
  parameters: {
    language: "javaScript",
    jsCode: `return ${JSON.stringify(feeds, null, 2)}.map(f => ({ json: f }));`
  },
  id: "feed_list",
  name: "Liste Flux RSS",
  type: "n8n-nodes-base.code",
  typeVersion: 2,
  position: [280, 600],
  notes: "Définition des 16 sources avec métadonnées (tier, catégorie, type)."
});
connections["Config"] = { main: [[{ node: "Liste Flux RSS", type: "main", index: 0 }]] };

nodes.push({
  parameters: {
    url: "={{ $json.url }}"
  },
  id: "rss_read_batch",
  name: "Lecture RSS",
  type: "n8n-nodes-base.rssFeedRead",
  typeVersion: 1.2,
  position: [520, 600],
  onError: "continueRegularOutput",
  notes: "Collecte automatique de tous les flux en parallèle."
});
connections["Liste Flux RSS"] = { main: [[{ node: "Lecture RSS", type: "main", index: 0 }]] };

// 4. Code Node: Normaliser
const normalizerJsCode = `const items = $input.all();
const config = $('Config').first().json || {};
const windowHours = config.window_hours || 24;
const maxArticles = config.max_articles || 60;
const quotas = {
  ia: config.quota_ia || 25,
  economie: config.quota_economie || 20,
  tech: config.quota_tech || 15
};

const now = Date.now();
const windowMs = windowHours * 3600 * 1000;
const retentionMs = 14 * 24 * 3600 * 1000;

const staticData = $getWorkflowStaticData('global');
if (!staticData.sentUrls) staticData.sentUrls = {};

for (const [url, timestamp] of Object.entries(staticData.sentUrls)) {
  if (now - timestamp > retentionMs) {
    delete staticData.sentUrls[url];
  }
}

function cleanUrl(raw) {
  if (!raw) return '';
  try {
    const u = new URL(raw.trim());
    const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'ref', 'source', 'fbclid', 'gclid'];
    trackingParams.forEach(p => u.searchParams.delete(p));
    return u.toString();
  } catch (e) {
    return raw.trim().split('?')[0];
  }
}

function normalizeTitle(t) {
  return (t || '').toLowerCase()
    .normalize('NFD').replace(/[\\u0300-\\u036f]/g, '')
    .replace(/[^a-z0-9]/g, ' ')
    .split(/\\s+/)
    .filter(w => w.length > 2);
}

function titleSimilarity(wordsA, wordsB) {
  if (!wordsA.length || !wordsB.length) return 0;
  const setA = new Set(wordsA);
  const setB = new Set(wordsB);
  let common = 0;
  for (const w of setA) {
    if (setB.has(w)) common++;
  }
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : common / union;
}

const seenUrls = new Set();
const seenTitles = [];
let duplicatesCount = 0;
let alreadySentCount = 0;
let filteredOldCount = 0;
const rawArticles = [];

const iaRegex = /\\b(ai|artificial intelligence|intelligence artificielle|llm|llms|gpt|gemini|openai|anthropic|claude|deepmind|copilot|deep learning|machine learning|neural|gpu|gpus|nvidia|hugging face|mistral|generative ai|genai|agent|agents)\\b/i;
const ecoRegex = /\\b(inflation|taux|banque centrale|bce|fed|federal reserve|fmi|imf|pib|gdp|croissance|recession|marche|marches|bourse|actions|obligations|economie|economy|dette|deficit|chomage|employment|tarifs|commerce|trade|oil|petrole)\\b/i;
const techRegex = /\\b(tech|technologie|technology|cyber|cybersecurite|software|logiciel|apple|microsoft|google|amazon|meta|hardware|semiconducteur|chips|cloud|quantum|robotique|robotics)\\b/i;

for (const item of items) {
  const d = item.json;
  let feedMeta = {};
  try {
    feedMeta = item.pairedItem ? $('Liste Flux RSS').itemMatching(item.pairedItem.item)?.json : {};
  } catch (e) {}
  const feedSource = d.feedSource || feedMeta?.name || 'Source inconnue';
  const feedTier = d.feedTier || feedMeta?.tier || 2;
  const feedType = d.feedType || feedMeta?.type || 'reportage';
  const feedDefaultCategory = d.feedDefaultCategory || feedMeta?.defaultCat || 'tech';

  const title = (d.title || '').trim();
  const rawLink = d.link || d.guid || '';
  const link = cleanUrl(rawLink);

  if (!title || !link) continue;

  if (staticData.sentUrls[link]) {
    alreadySentCount++;
    continue;
  }

  if (seenUrls.has(link)) {
    duplicatesCount++;
    continue;
  }

  const titleWords = normalizeTitle(title);
  let isDupTitle = false;
  for (const seen of seenTitles) {
    if (titleSimilarity(titleWords, seen.words) >= 0.60) {
      isDupTitle = true;
      seen.sources.add(feedSource);
      duplicatesCount++;
      break;
    }
  }
  if (isDupTitle) continue;

  seenUrls.add(link);
  seenTitles.push({ words: titleWords, sources: new Set([feedSource]), title });

  let pubDate = null;
  if (d.isoDate) pubDate = new Date(d.isoDate);
  else if (d.pubDate) pubDate = new Date(d.pubDate);

  if (pubDate && !isNaN(pubDate.getTime())) {
    if (now - pubDate.getTime() > windowMs) {
      filteredOldCount++;
      continue;
    }
  }

  const rawSnippet = d.contentSnippet || d.content || d.summary || title;
  const cleanSnippet = rawSnippet.replace(/<[^>]*>?/gm, ' ').replace(/\\s+/g, ' ').trim().slice(0, 1200);

  const fullText = (title + ' ' + cleanSnippet).toLowerCase();
  let category = feedDefaultCategory || 'tech';
  if (iaRegex.test(fullText)) {
    category = 'ia';
  } else if (ecoRegex.test(fullText)) {
    category = 'economie';
  } else if (techRegex.test(fullText)) {
    category = 'tech';
  }

  rawArticles.push({
    titre: title,
    source: feedSource,
    tier: feedTier,
    type: feedType,
    date_iso: pubDate ? pubDate.toISOString() : new Date().toISOString(),
    link: link,
    categorie: category,
    texte: cleanSnippet,
    titleWords
  });
}

function selectQuotas(articles, qIa, qEco, qTech, totalMax) {
  const byCat = { ia: [], economie: [], tech: [] };
  articles.forEach(a => {
    if (byCat[a.categorie]) byCat[a.categorie].push(a);
    else byCat.tech.push(a);
  });

  const sortFn = (a, b) => {
    if (a.tier !== b.tier) return a.tier - b.tier;
    return new Date(b.date_iso).getTime() - new Date(a.date_iso).getTime();
  };

  byCat.ia.sort(sortFn);
  byCat.economie.sort(sortFn);
  byCat.tech.sort(sortFn);

  const selectedIa = byCat.ia.slice(0, qIa);
  const selectedEco = byCat.economie.slice(0, qEco);
  const selectedTech = byCat.tech.slice(0, qTech);

  let combined = [...selectedIa, ...selectedEco, ...selectedTech];
  if (combined.length > totalMax) {
    combined.sort(sortFn);
    combined = combined.slice(0, totalMax);
  }

  return {
    articles: combined,
    counts: {
      ia: selectedIa.length,
      economie: selectedEco.length,
      tech: selectedTech.length,
      total: combined.length
    }
  };
}

const selection = selectQuotas(rawArticles, quotas.ia, quotas.economie, quotas.tech, maxArticles);

return [{
  json: {
    articles: selection.articles,
    stats: {
      total_brut: items.length,
      deja_envoyes_14j: alreadySentCount,
      doublons_detectes: duplicatesCount,
      hors_fenetre_24h: filteredOldCount,
      apres_filtrage: rawArticles.length,
      selection_finale: selection.counts
    }
  }
}];
`;

nodes.push({
  parameters: {
    language: "javaScript",
    jsCode: normalizerJsCode
  },
  id: "normaliser",
  name: "Normaliser",
  type: "n8n-nodes-base.code",
  typeVersion: 2,
  position: [760, 600]
});
connections["Lecture RSS"] = { main: [[{ node: "Normaliser", type: "main", index: 0 }]] };

// 5. Node: Prepare Gemini Payload
const prepareGeminiJsCode = `const input = $input.first().json;
const articles = input.articles || [];
const systemPrompt = ${JSON.stringify(systemPrompt)};

const articlesMap = {};
const promptArticles = articles.map((art, idx) => {
  const id = 'A' + String(idx + 1).padStart(3, '0');
  articlesMap[id] = {
    titre: art.titre,
    source: art.source,
    tier: art.tier,
    type: art.type,
    link: art.link,
    texte: art.texte,
    date_iso: art.date_iso
  };
  return {
    article_id: id,
    titre: art.titre,
    source: art.source,
    tier: art.tier,
    type: art.type,
    date: art.date_iso,
    texte: art.texte
  };
});

const today = new Date().toISOString().slice(0, 10);
const userPrompt = 'Date du briefing : ' + today + '\\n\\n' +
  'Voici la liste des ' + promptArticles.length + ' articles collectés pour le briefing quotidien :\\n\\n' +
  JSON.stringify(promptArticles, null, 2);

const geminiPayload = {
  system_instruction: {
    parts: [{ text: systemPrompt }]
  },
  contents: [
    {
      role: "user",
      parts: [{ text: userPrompt }]
    }
  ],
  generationConfig: {
    temperature: 0.1,
    responseMimeType: "application/json",
    responseSchema: {
      type: "OBJECT",
      properties: {
        date: { type: "STRING" },
        categories: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              name: { type: "STRING" },
              items: {
                type: "ARRAY",
                items: {
                  type: "OBJECT",
                  properties: {
                    titre: { type: "STRING" },
                    resume: { type: "STRING" },
                    article_ids: { type: "ARRAY", items: { type: "STRING" } },
                    preuve: { type: "STRING" },
                    nature: { type: "STRING" }
                  },
                  required: ["titre", "resume", "article_ids", "preuve", "nature"]
                }
              }
            },
            required: ["name", "items"]
          }
        }
      },
      required: ["date", "categories"]
    }
  }
};

return [{
  json: {
    gemini_payload: geminiPayload,
    articlesMap: articlesMap,
    total_articles_sent: promptArticles.length
  }
}];`;

nodes.push({
  parameters: {
    language: "javaScript",
    jsCode: prepareGeminiJsCode
  },
  id: "prepare_gemini",
  name: "Prepare Gemini Payload",
  type: "n8n-nodes-base.code",
  typeVersion: 2,
  position: [1000, 600]
});
connections["Normaliser"] = { main: [[{ node: "Prepare Gemini Payload", type: "main", index: 0 }]] };

// 6. Node: Call Gemini Flash (HTTP Request)
nodes.push({
  parameters: {
    method: "POST",
    url: "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent",
    authentication: "genericCredentialType",
    genericAuthType: "httpHeaderAuth",
    sendHeaders: true,
    headerParameters: {
      parameters: [
        { name: "Content-Type", value: "application/json" }
      ]
    },
    sendBody: true,
    specifyBody: "json",
    jsonBody: "={{ JSON.stringify($json.gemini_payload) }}",
    options: {
      timeout: 120000
    }
  },
  credentials: {
    httpHeaderAuth: {
      id: "x2tFAYeo4Q8b4Ezg",
      name: "Gemini API Key"
    }
  },
  id: "call_gemini",
  name: "Call Gemini Flash",
  type: "n8n-nodes-base.httpRequest",
  typeVersion: 4.2,
  position: [1240, 600],
  retryOnFail: true,
  maxTries: 3,
  waitBetweenTries: 2000,
  onError: "continueRegularOutput"
});
connections["Prepare Gemini Payload"] = { main: [[{ node: "Call Gemini Flash", type: "main", index: 0 }]] };

// 7. Node: Valider & Reconstruire
const validatorJsCode = `const geminiRes = $input.first().json;
const prepareNode = $('Prepare Gemini Payload').first().json;
const articlesMap = prepareNode.articlesMap || {};

function normalizeTextForComparison(text) {
  if (!text) return '';
  return text.toLowerCase()
    .normalize('NFD').replace(/[\\u0300-\\u036f]/g, '')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\\s+/g, ' ')
    .trim();
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function extractNumbers(text) {
  if (!text) return [];
  let clean = text.replace(/(\\d)\\s+(\\d{3})\\b/g, '$1$2');
  clean = clean.replace(/(\\d),(\\d{3})\\b/g, '$1$2');
  clean = clean.replace(/(\\d),(\\d{1,2})\\b/g, '$1.$2');
  const matches = clean.match(/[-+]?\\b\\d+(?:\\.\\d+)?%?\\b/g) || [];
  return matches.map(m => m.replace('%', ''));
}

let parsedSummary = null;
let parseError = null;

try {
  let rawText = '';
  if (geminiRes.candidates && geminiRes.candidates[0] && geminiRes.candidates[0].content && geminiRes.candidates[0].content.parts) {
    rawText = geminiRes.candidates[0].content.parts[0].text;
  } else if (geminiRes.text) {
    rawText = geminiRes.text;
  }
  parsedSummary = JSON.parse(rawText);
} catch (e) {
  parseError = e.message;
}

if (!parsedSummary || !parsedSummary.categories) {
  let failureReason = "JSON Gemini invalide ou introuvable : " + (parseError || "Structure categories absente");
  if (geminiRes && geminiRes.error) {
    if (geminiRes.error.status === 429 || (geminiRes.error.message && geminiRes.error.message.includes('429'))) {
      failureReason = "Quota Gemini dépassé (Rate Limit 429)";
    } else {
      failureReason = "Erreur Gemini API : " + (geminiRes.error.message || JSON.stringify(geminiRes.error));
    }
  }
  return [{
    json: {
      status: "error",
      publishable: false,
      alert_reason: failureReason,
      error: failureReason,
      raw_response: geminiRes
    }
  }];
}

const validatedCategories = [];
const allValidItems = [];
const rejectedItems = [];

for (const cat of parsedSummary.categories) {
  const catName = cat.name;
  const validItemsInCat = [];

  for (const item of (cat.items || [])) {
    if (!item.article_ids || !Array.isArray(item.article_ids) || item.article_ids.length === 0) {
      rejectedItems.push({ item, category: catName, reason: "Aucun article_id fourni" });
      continue;
    }

    const citedArticles = [];
    let unknownId = null;
    for (const id of item.article_ids) {
      if (!articlesMap[id]) {
        unknownId = id;
        break;
      }
      citedArticles.push(articlesMap[id]);
    }

    if (unknownId) {
      rejectedItems.push({ item, category: catName, reason: "Article ID '" + unknownId + "' inconnu dans le mapping RSS" });
      continue;
    }

    const rawProof = (item.preuve || '').trim();
    const normProof = normalizeTextForComparison(rawProof);
    const proofWords = rawProof.split(/\\s+/).filter(w => w.length > 0);

    if (normProof.length < 10) {
      rejectedItems.push({ item, category: catName, reason: "Preuve trop courte (< 10 caractères normalisés) : '" + rawProof + "'" });
      continue;
    }
    if (proofWords.length > 15) {
      rejectedItems.push({ item, category: catName, reason: "Preuve dépasse 15 mots (" + proofWords.length + " mots)" });
      continue;
    }

    let proofFound = false;
    for (const art of citedArticles) {
      const normSource = normalizeTextForComparison(art.titre + ' ' + (art.texte || ''));
      if (normSource.includes(normProof)) {
        proofFound = true;
        break;
      }
    }

    if (!proofFound) {
      rejectedItems.push({ item, category: catName, reason: "Preuve non trouvée textuellement dans les articles cités : '" + rawProof + "'" });
      continue;
    }

    const numbersInItem = extractNumbers((item.titre || '') + ' ' + (item.resume || ''));
    const sourceNumbers = new Set();
    citedArticles.forEach(art => {
      extractNumbers(art.titre + ' ' + (art.texte || '')).forEach(n => sourceNumbers.add(n));
    });

    let halluNum = null;
    for (const num of numbersInItem) {
      if (!sourceNumbers.has(num)) {
        halluNum = num;
        break;
      }
    }

    if (halluNum) {
      rejectedItems.push({ item, category: catName, reason: "Chiffre '" + halluNum + "' absent des textes sources cités" });
      continue;
    }

    const sources = citedArticles.map(art => ({
      source: art.source,
      link: art.link,
      tier: art.tier
    }));

    const distinctSourceNames = new Set(sources.map(s => s.source));
    const confirmation = distinctSourceNames.size >= 2
      ? "Confirmé par " + distinctSourceNames.size + " sources"
      : "Source unique";

    const sanitizedTitle = escapeHtml(item.titre);
    const sanitizedResume = escapeHtml(item.resume);

    const validItem = {
      titre: sanitizedTitle,
      resume: sanitizedResume,
      nature: item.nature || 'fait_rapporte',
      confirmation: confirmation,
      sources: sources,
      article_ids: item.article_ids,
      preuve_verbatim: item.preuve
    };

    validItemsInCat.push(validItem);
    allValidItems.push(validItem);
  }

  validatedCategories.push({
    name: catName,
    items: validItemsInCat,
    count: validItemsInCat.length
  });
}

const configNode = $('Config').first().json || {};
let publishable = true;
const quotaDeficits = [];
for (const cat of validatedCategories) {
  if (cat.items.length < 1) {
    if (!configNode.test_mode) {
      publishable = false;
    }
    quotaDeficits.push(cat.name + " (" + cat.items.length + " item(s))");
  }
}
if (allValidItems.length < 3) {
  publishable = false;
  quotaDeficits.push("Moins de 3 actualités validées au total (" + allValidItems.length + ")");
}

return [{
  json: {
    status: publishable ? "success" : "warning",
    publishable: publishable,
    alert_needed: !publishable,
    alert_reason: publishable ? null : "Seuil minimal non atteint : " + quotaDeficits.join(", "),
    date: parsedSummary.date || new Date().toISOString().slice(0, 10),
    categories: validatedCategories,
    total_valid_items: allValidItems.length,
    rejected_items: rejectedItems,
    stats: {
      total_items_generated: rejectedItems.length + allValidItems.length,
      valid_count: allValidItems.length,
      rejected_count: rejectedItems.length
    }
  }
}];`;

nodes.push({
  parameters: {
    language: "javaScript",
    jsCode: validatorJsCode
  },
  id: "valider_reconstruire",
  name: "Valider & Reconstruire",
  type: "n8n-nodes-base.code",
  typeVersion: 2,
  position: [1480, 600]
});
connections["Call Gemini Flash"] = { main: [[{ node: "Valider & Reconstruire", type: "main", index: 0 }]] };

// 8. Node: Formater Messages Telegram
const telegramFormatterJsCode = `const data = $input.first().json;
const config = $('Config').first().json || {};
const today = data.date || new Date().toISOString().slice(0, 10);
const staticData = $getWorkflowStaticData('global');
if (!staticData.subscribers) staticData.subscribers = {};

let isScheduleTrigger = false;
try {
  isScheduleTrigger = Boolean($('Schedule Trigger').first());
} catch (e) {}

if (isScheduleTrigger && staticData.lastSentDate === today && !config.test_mode) {
  return [];
}

if (!data.publishable) {
  const alertText = '🚨 <b>ALERTE ÉDITORIALE N8N</b>\\n\\n' +
    'Le briefing du <b>' + today + '</b> n\\'a pas été publié.\\n' +
    '• <b>Raison :</b> ' + (data.alert_reason || 'Seuil minimal non atteint') + '\\n' +
    '• <b>Actualités validées :</b> ' + (data.total_valid_items || 0) + '\\n\\n' +
    '<i>Vérifiez les flux RSS ou le journal des rejets dans n8n.</i>';

  return [{
    json: {
      chatId: config.admin_chat_id,
      text: alertText,
      is_alert: true,
      published_urls: []
    }
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

const categoryHeaders = {
  'IA': '🤖 <b>I N T E L L I G E N C E   A R T I F I C I E L L E</b>',
  'Économie mondiale': '🌍 <b>É C O N O M I E   M O N D I A L E</b>',
  'Technologie': '💻 <b>T E C H N O L O G I E</b>'
};

const allUrls = [];
const categorySections = [];
const categorySummaries = {};

for (const cat of (data.categories || [])) {
  if (!cat.items || cat.items.length === 0) continue;
  const emoji = categoryEmojis[cat.name] || '📌';
  const catTitle = categoryHeaders[cat.name] || (emoji + ' <b>' + cat.name.toUpperCase() + '</b>');
  let sectionText = '━━━━━━━━━━━━━━━━━━━━\\n' + catTitle + '\\n────────────────────\\n\\n';

  cat.items.forEach((item, idx) => {
    const nat = natureLabels[item.nature] || item.nature || 'information';
    const links = (item.sources || []).map(s => {
      allUrls.push(s.link);
      return '👉 <a href="' + s.link + '"><b>Lire l\\'article (' + s.source + ') ↗</b></a>';
    }).join('\\n');

    const num = String(idx + 1).padStart(2, '0');
    sectionText += '<b>' + num + ' ❯ ' + item.titre + '</b>\\n' +
      '<blockquote>' + item.resume + '\\n\\n' +
      '🏷️ <code>' + nat + '</code>  •  ✅ <code>' + item.confirmation + '</code></blockquote>\\n' +
      links + '\\n\\n';
  });

  const trimmed = sectionText.trim();
  categorySections.push(trimmed);

  const lowerName = cat.name.toLowerCase();
  if (cat.name === 'IA' || lowerName.includes('artificielle')) {
    categorySummaries['ia'] = trimmed;
  } else if (lowerName.includes('éco') || lowerName.includes('eco')) {
    categorySummaries['eco'] = trimmed;
  } else if (lowerName.includes('tech')) {
    categorySummaries['tech'] = trimmed;
  }
}

const header = '⚡ <b>BRIEFING QUOTIDIEN</b> <code>DU ' + today + '</code>\\n' +
  '<i>Économie mondiale · Technologies · Intelligence Artificielle</i>\\n\\n';

const messages = [];
let currentBody = header;

for (const section of categorySections) {
  if ((currentBody + section).length > 3800) {
    if (currentBody.trim() !== header.trim()) {
      messages.push(currentBody.trim());
      currentBody = section + '\\n\\n';
    } else {
      messages.push(currentBody + section);
      currentBody = '';
    }
  } else {
    currentBody += section + '\\n\\n';
  }
}

if (currentBody.trim().length > 0) {
  messages.push(currentBody.trim());
}

if (messages.length > 1 && !messages[0].includes('BRIEFING QUOTIDIEN')) {
  messages[0] = header + messages[0];
}

staticData.latestSummary = messages;
staticData.latestSummaryDate = today;
staticData.categorySummaries = categorySummaries;

const uniqueUrls = [...new Set(allUrls)];

const recipientChatIds = new Set();

if (config.test_mode) {
  if (config.admin_chat_id) recipientChatIds.add(String(config.admin_chat_id));
} else {
  const subs = Object.keys(staticData.subscribers || {});
  for (const s of subs) {
    recipientChatIds.add(String(s));
  }
  if (config.admin_chat_id) {
    recipientChatIds.add(String(config.admin_chat_id));
  }
}

if (recipientChatIds.size === 0 && config.telegram_chat_id) {
  recipientChatIds.add(String(config.telegram_chat_id));
}

const outputItems = [];
for (const cid of recipientChatIds) {
  messages.forEach((msgText, idx) => {
    outputItems.push({
      json: {
        chatId: cid,
        text: msgText,
        part: (idx + 1) + '/' + messages.length,
        is_alert: false,
        published_urls: uniqueUrls,
        today_date: today,
        recipient_id: cid
      }
    });
  });
}

return outputItems;`;

nodes.push({
  parameters: {
    language: "javaScript",
    jsCode: telegramFormatterJsCode
  },
  id: "formater_telegram",
  name: "Formater Messages Telegram",
  type: "n8n-nodes-base.code",
  typeVersion: 2,
  position: [1720, 600]
});
connections["Valider & Reconstruire"] = { main: [[{ node: "Formater Messages Telegram", type: "main", index: 0 }]] };

// 9. Node: Send Telegram Message
nodes.push({
  parameters: {
    chatId: "={{ $json.chatId }}",
    text: "={{ $json.text }}",
    replyMarkup: "none",
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
  id: "send_telegram",
  name: "Send Telegram Message",
  type: "n8n-nodes-base.telegram",
  typeVersion: 1.2,
  position: [1960, 600],
  onError: "continueRegularOutput"
});
connections["Formater Messages Telegram"] = { main: [[{ node: "Send Telegram Message", type: "main", index: 0 }]] };

// 10. Node: Enregistrer URLs Sent & Idempotence
const recordSentJsCode = `const items = $input.all();
const staticData = $getWorkflowStaticData('global');
if (!staticData.sentUrls) staticData.sentUrls = {};

const now = Date.now();
let recordedCount = 0;
let todayDate = new Date().toISOString().slice(0, 10);

for (const item of items) {
  const d = item.json;
  const err = d.error || (d.result && d.result.description) || '';
  if (typeof err === 'string' && (err.includes('blocked') || err.includes('deactivated') || err.includes('chat not found'))) {
    const blockedChatId = d.recipient_id || d.chatId;
    if (blockedChatId && staticData.subscribers && staticData.subscribers[blockedChatId]) {
      delete staticData.subscribers[blockedChatId];
    }
  }

  if (d.today_date) todayDate = d.today_date;
  const urls = d.published_urls || [];
  for (const u of urls) {
    if (!staticData.sentUrls[u]) {
      staticData.sentUrls[u] = now;
      recordedCount++;
    }
  }
}

staticData.lastSentDate = todayDate;

return [{
  json: {
    status: "success",
    message: "Envoi Telegram terminé avec succès",
    recorded_urls_count: recordedCount,
    total_stored_urls: Object.keys(staticData.sentUrls).length,
    lastSentDate: todayDate,
    completed_at: new Date().toISOString()
  }
}];`;

nodes.push({
  parameters: {
    language: "javaScript",
    jsCode: recordSentJsCode
  },
  id: "enregistrer_sent",
  name: "Enregistrer URLs Sent",
  type: "n8n-nodes-base.code",
  typeVersion: 2,
  position: [2200, 600]
});
connections["Send Telegram Message"] = { main: [[{ node: "Enregistrer URLs Sent", type: "main", index: 0 }]] };

const workflow = {
  name: "News – Collecte & Synthèse",
  nodes: nodes,
  connections: connections,
  settings: {
    timezone: "Africa/Algiers",
    executionOrder: "v1",
    errorWorkflow: "zKFaHdrHGON7zKVu",
    saveManualExecutions: true,
    saveDataSuccessExecution: "all",
    saveDataErrorExecution: "all"
  }
};

const outPath = path.join(__dirname, '../workflows/news-pipeline.json');
fs.writeFileSync(outPath, JSON.stringify(workflow, null, 2), 'utf8');
console.log(`Generated clean workflow with ${nodes.length} nodes at ${outPath}`);

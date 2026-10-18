const fs = require('fs');
const path = require('path');

// Read Phase 1 generator base
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
    responseMode: "lastNode",
    responseData: "firstEntryJson",
    options: {}
  },
  id: "webhook_test",
  name: "Webhook Test",
  type: "n8n-nodes-base.webhook",
  typeVersion: 2,
  position: [-200, 450],
  webhookId: "news-pipeline-test"
});

// 2. Config Node
nodes.push({
  parameters: {
    assignments: {
      assignments: [
        { id: "c1", name: "window_hours", value: 24, type: "number" },
        { id: "c2", name: "max_articles", value: 60, type: "number" },
        { id: "c3", name: "quota_ia", value: 25, type: "number" },
        { id: "c4", name: "quota_economie", value: 20, type: "number" },
        { id: "c5", name: "quota_tech", value: 15, type: "number" },
        { id: "c6", name: "gemini_model", value: "gemini-3.8-flash", type: "string" },
        { id: "c7", name: "telegram_chat_id", value: "YOUR_TELEGRAM_CHAT_ID", type: "string" },
        { id: "c8", name: "admin_chat_id", value: "YOUR_ADMIN_CHAT_ID", type: "string" },
        { id: "c9", name: "test_mode", value: true, type: "boolean" }
      ]
    },
    includeOtherFields: true,
    options: {}
  },
  id: "config",
  name: "Config",
  type: "n8n-nodes-base.set",
  typeVersion: 3.4,
  position: [40, 750]
});

connections["Schedule Trigger"] = { main: [[{ node: "Config", type: "main", index: 0 }]] };
connections["Manual Trigger"] = { main: [[{ node: "Config", type: "main", index: 0 }]] };
connections["Webhook Test"] = { main: [[{ node: "Config", type: "main", index: 0 }]] };
connections["Config"] = { main: [feeds.map(f => ({ node: `RSS ${f.name}`, type: "main", index: 0 }))] };

// 3. RSS & Tag Nodes
const tagNodeNames = [];
feeds.forEach((feed, idx) => {
  const yPos = 100 + idx * 90;
  const rssNodeName = `RSS ${feed.name}`;
  const tagNodeName = `Tag ${feed.name}`;
  tagNodeNames.push(tagNodeName);

  nodes.push({
    parameters: { url: feed.url },
    id: `rss_${feed.id}`,
    name: rssNodeName,
    type: "n8n-nodes-base.rssFeedRead",
    typeVersion: 1.2,
    position: [300, yPos],
    onError: "continueRegularOutput"
  });

  nodes.push({
    parameters: {
      language: "javaScript",
      jsCode: `const items = $input.all();
return items.map(item => ({
  json: {
    ...item.json,
    feedSource: '${feed.name.replace(/'/g, "\\'")}',
    feedTier: ${feed.tier},
    feedType: '${feed.type}',
    feedDefaultCategory: '${feed.defaultCat}'
  }
}));`
    },
    id: `tag_${feed.id}`,
    name: tagNodeName,
    type: "n8n-nodes-base.code",
    typeVersion: 2,
    position: [540, yPos],
    onError: "continueRegularOutput"
  });

  connections[rssNodeName] = { main: [[{ node: tagNodeName, type: "main", index: 0 }]] };
});

// 4. Binary Merge Tree
const l1Nodes = [];
for (let i = 0; i < 8; i++) {
  const mergeName = `Merge L1_${i + 1}`;
  l1Nodes.push(mergeName);
  nodes.push({
    parameters: { mode: "append" },
    id: `merge_l1_${i + 1}`,
    name: mergeName,
    type: "n8n-nodes-base.merge",
    typeVersion: 3.2,
    position: [800, 140 + i * 180]
  });
  connections[tagNodeNames[i * 2]] = { main: [[{ node: mergeName, type: "main", index: 0 }]] };
  connections[tagNodeNames[i * 2 + 1]] = { main: [[{ node: mergeName, type: "main", index: 1 }]] };
}

const l2Nodes = [];
for (let i = 0; i < 4; i++) {
  const mergeName = `Merge L2_${i + 1}`;
  l2Nodes.push(mergeName);
  nodes.push({
    parameters: { mode: "append" },
    id: `merge_l2_${i + 1}`,
    name: mergeName,
    type: "n8n-nodes-base.merge",
    typeVersion: 3.2,
    position: [1020, 230 + i * 360]
  });
  connections[l1Nodes[i * 2]] = { main: [[{ node: mergeName, type: "main", index: 0 }]] };
  connections[l1Nodes[i * 2 + 1]] = { main: [[{ node: mergeName, type: "main", index: 1 }]] };
}

const l3Nodes = [];
for (let i = 0; i < 2; i++) {
  const mergeName = `Merge L3_${i + 1}`;
  l3Nodes.push(mergeName);
  nodes.push({
    parameters: { mode: "append" },
    id: `merge_l3_${i + 1}`,
    name: mergeName,
    type: "n8n-nodes-base.merge",
    typeVersion: 3.2,
    position: [1240, 410 + i * 720]
  });
  connections[l2Nodes[i * 2]] = { main: [[{ node: mergeName, type: "main", index: 0 }]] };
  connections[l2Nodes[i * 2 + 1]] = { main: [[{ node: mergeName, type: "main", index: 1 }]] };
}

const mergeFinalName = "Merge Final";
nodes.push({
  parameters: { mode: "append" },
  id: "merge_final",
  name: mergeFinalName,
  type: "n8n-nodes-base.merge",
  typeVersion: 3.2,
  position: [1460, 750]
});
connections[l3Nodes[0]] = { main: [[{ node: mergeFinalName, type: "main", index: 0 }]] };
connections[l3Nodes[1]] = { main: [[{ node: mergeFinalName, type: "main", index: 1 }]] };

// 5. Code Node: Normaliser
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

function cleanUrl(rawUrl) {
  if (!rawUrl) return '';
  try {
    const u = new URL(rawUrl);
    const trackingParams = [
      'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
      'fbclid', 'gclid', '_hsenc', '_hsmi', 'mc_cid', 'mc_eid'
    ];
    trackingParams.forEach(p => u.searchParams.delete(p));
    if (u.hostname.includes('news.google.com')) return '';
    return u.toString();
  } catch (e) {
    return rawUrl.split('?')[0];
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
      seen.sources.add(d.feedSource);
      duplicatesCount++;
      break;
    }
  }
  if (isDupTitle) continue;

  seenUrls.add(link);
  seenTitles.push({ words: titleWords, sources: new Set([d.feedSource]), title });

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
  let category = d.feedDefaultCategory || 'tech';
  if (iaRegex.test(fullText)) {
    category = 'ia';
  } else if (ecoRegex.test(fullText)) {
    category = 'economie';
  } else if (techRegex.test(fullText)) {
    category = 'tech';
  }

  rawArticles.push({
    titre: title,
    source: d.feedSource || 'Source inconnue',
    tier: d.feedTier || 2,
    type: d.feedType || 'reportage',
    date_iso: pubDate ? pubDate.toISOString() : new Date().toISOString(),
    link: link,
    categorie: category,
    texte: cleanSnippet,
    titleWords
  });
}

for (const art of rawArticles) {
  const otherSources = new Set([art.source]);
  for (const other of rawArticles) {
    if (other === art) continue;
    if (titleSimilarity(art.titleWords, other.titleWords) >= 0.25) {
      otherSources.add(other.source);
    }
  }
  art.distinctSourcesCount = otherSources.size;
}

rawArticles.sort((a, b) => {
  if (b.distinctSourcesCount !== a.distinctSourcesCount) {
    return b.distinctSourcesCount - a.distinctSourcesCount;
  }
  const dateDiff = new Date(b.date_iso).getTime() - new Date(a.date_iso).getTime();
  if (dateDiff !== 0) return dateDiff;
  return a.tier - b.tier;
});

const normalizedArticles = [];
const catCounts = { ia: 0, economie: 0, tech: 0 };
const sourceCounts = {};
let idIdx = 1;

for (const art of rawArticles) {
  const cat = art.categorie;
  if ((catCounts[cat] || 0) < (quotas[cat] || 20) && normalizedArticles.length < maxArticles) {
    catCounts[cat] = (catCounts[cat] || 0) + 1;
    sourceCounts[art.source] = (sourceCounts[art.source] || 0) + 1;
    normalizedArticles.push({
      id: 'A' + String(idIdx++).padStart(3, '0'),
      titre: art.titre,
      source: art.source,
      tier: art.tier,
      type: art.type,
      date_iso: art.date_iso,
      link: art.link,
      categorie: art.categorie,
      texte: art.texte,
      distinct_sources_count: art.distinctSourcesCount
    });
  }
}

return [{
  json: {
    articles: normalizedArticles,
    total_retained: normalizedArticles.length,
    stats: {
      total_raw_collected: items.length,
      filtered_older_than_window: filteredOldCount,
      duplicates_removed: duplicatesCount,
      already_sent_excluded: alreadySentCount,
      counts_by_category: catCounts,
      counts_by_source: sourceCounts
    }
  }
}];`;

nodes.push({
  parameters: {
    language: "javaScript",
    jsCode: normalizerJsCode
  },
  id: "normaliser",
  name: "Normaliser",
  type: "n8n-nodes-base.code",
  typeVersion: 2,
  position: [1700, 750]
});
connections[mergeFinalName] = { main: [[{ node: "Normaliser", type: "main", index: 0 }]] };

// 6. Node: Prepare Gemini Payload
const prepareGeminiJsCode = `const input = $input.first().json;
const articles = input.articles || [];

// 1. Dictionnaire complet pour reconstruction ultérieure
const articlesMap = {};
articles.forEach(a => {
  articlesMap[a.id] = {
    id: a.id,
    titre: a.titre,
    source: a.source,
    tier: a.tier,
    type: a.type,
    date_iso: a.date_iso,
    link: a.link,
    categorie: a.categorie,
    texte: a.texte
  };
});

// 2. Format d'entrée Gemini : id, titre, source, type, date, texte uniquement (ZÉRO URL)
const promptArticles = articles.map(a => ({
  id: a.id,
  titre: a.titre,
  source: a.source,
  type: a.type,
  date: a.date_iso.slice(0, 10),
  texte: a.texte
}));

const systemPrompt = ${JSON.stringify(systemPrompt)};

const todayStr = new Date().toISOString().slice(0, 10);

const geminiPayload = {
  contents: [
    {
      role: "user",
      parts: [
        {
          text: "Date : " + todayStr + "\\n\\nVoici les articles collectés aujourd'hui :\\n" + JSON.stringify(promptArticles, null, 2) + "\\n\\nRédige la synthèse éditoriale quotidienne en respectant scrupuleusement les règles du prompt système."
        }
      ]
    }
  ],
  systemInstruction: {
    parts: [
      { text: systemPrompt }
    ]
  },
  generationConfig: {
    temperature: 0.1,
    maxOutputTokens: 8192,
    thinkingConfig: {
      thinkingBudget: 0
    },
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
              name: { type: "STRING", enum: ["IA", "Économie mondiale", "Technologie"] },
              items: {
                type: "ARRAY",
                items: {
                  type: "OBJECT",
                  properties: {
                    titre: { type: "STRING" },
                    resume: { type: "STRING" },
                    article_ids: { type: "ARRAY", items: { type: "STRING" } },
                    preuve: { type: "STRING" },
                    nature: { type: "STRING", enum: ["fait_rapporte", "annonce_entreprise", "analyse"] }
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
  position: [1940, 750]
});
connections["Normaliser"] = { main: [[{ node: "Prepare Gemini Payload", type: "main", index: 0 }]] };

// 7. Node: Call Gemini Flash (HTTP Request)
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
      timeout: 60000
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
  position: [2180, 750],
  retryOnFail: true,
  maxTries: 3,
  waitBetweenTries: 2000,
  onError: "continueRegularOutput"
});
connections["Prepare Gemini Payload"] = { main: [[{ node: "Call Gemini Flash", type: "main", index: 0 }]] };

// 8. Node: Valider & Reconstruire
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
  let clean = text.replace(/(\d)\s+(\d{3})\b/g, '$1$2');
  clean = clean.replace(/(\d),(\d{3})\b/g, '$1$2');
  clean = clean.replace(/(\d),(\d{1,2})\b/g, '$1.$2');
  const matches = clean.match(/[-+]?\b\d+(?:\.\d+)?%?\b/g) || [];
  return matches.map(m => m.replace('%', ''));
}

// 1. Parsing sécurisé de la réponse Gemini
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
  return [{
    json: {
      status: "error",
      publishable: false,
      error: "JSON Gemini invalide ou introuvable : " + (parseError || "Structure categories absente"),
      raw_response: geminiRes
    }
  }];
}

// 2. Validation des items et contrôle anti-hallucination
const validatedCategories = [];
const allValidItems = [];
const rejectedItems = [];

for (const cat of parsedSummary.categories) {
  const catName = cat.name;
  const validItemsInCat = [];

  for (const item of (cat.items || [])) {
    // Règle 1: article_id présent
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

    // Règle 2: Preuve verbatim (mot pour mot, >= 10 chars, <= 15 mots)
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

    // Règle 3: Contrôle des chiffres (titre et résumé)
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

    // Règle 4: Reconstruction exclusive des liens et sources
    const sources = citedArticles.map(art => ({
      source: art.source,
      link: art.link,
      tier: art.tier
    }));

    // Règle 5: Niveau de confirmation
    const distinctSourceNames = new Set(sources.map(s => s.source));
    const confirmation = distinctSourceNames.size >= 2
      ? "Confirmé par " + distinctSourceNames.size + " sources"
      : "Source unique";

    // Règle 6: Échappement HTML sécurisé
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

// Vérification du seuil minimal (au moins 2 items valides par catégorie)
let publishable = true;
const quotaDeficits = [];
for (const cat of validatedCategories) {
  if (cat.items.length < 2) {
    publishable = false;
    quotaDeficits.push(cat.name + " (" + cat.items.length + " item(s))");
  }
}

return [{
  json: {
    status: publishable ? "success" : "warning",
    publishable: publishable,
    alert_needed: !publishable,
    alert_reason: publishable ? null : "Moins de 2 items valides dans : " + quotaDeficits.join(", "),
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
  position: [2420, 750]
});
connections["Call Gemini Flash"] = { main: [[{ node: "Valider & Reconstruire", type: "main", index: 0 }]] };

const workflow = {
  name: "News – Collecte & Synthèse",
  nodes: nodes,
  connections: connections,
  settings: {
    timezone: "Africa/Algiers",
    executionOrder: "v1",
    saveManualExecutions: true
  }
};

const outPath = path.join(__dirname, '../workflows/news-pipeline.json');
fs.writeFileSync(outPath, JSON.stringify(workflow, null, 2), 'utf8');
console.log(`Generated pipeline workflow with ${nodes.length} nodes at ${outPath}`);

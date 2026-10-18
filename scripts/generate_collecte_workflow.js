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
        { id: "c6", name: "gemini_model", value: "gemini-2.5-flash", type: "string" },
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

connections["Schedule Trigger"] = {
  main: [[{ node: "Config", type: "main", index: 0 }]]
};

connections["Manual Trigger"] = {
  main: [[{ node: "Config", type: "main", index: 0 }]]
};

// Connect Config to all 16 RSS nodes
connections["Config"] = {
  main: [feeds.map(f => ({ node: `RSS ${f.name}`, type: "main", index: 0 }))]
};

// 3. RSS & Tag Nodes
const tagNodeNames = [];
feeds.forEach((feed, idx) => {
  const yPos = 100 + idx * 90;
  const rssNodeName = `RSS ${feed.name}`;
  const tagNodeName = `Tag ${feed.name}`;
  tagNodeNames.push(tagNodeName);

  nodes.push({
    parameters: {
      url: feed.url
    },
    id: `rss_${feed.id}`,
    name: rssNodeName,
    type: "n8n-nodes-base.rssFeedRead",
    typeVersion: 1.2,
    position: [300, yPos],
    continueOnFail: true
  });

  nodes.push({
    parameters: {
      language: "javaScript",
      jsCode: `// Tag metadata for ${feed.name}
const items = $input.all();
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
    continueOnFail: true
  });

  connections[rssNodeName] = {
    main: [[{ node: tagNodeName, type: "main", index: 0 }]]
  };
});

// 4. Binary Merge Tree
// Level 1: 8 merges
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

  const tag1 = tagNodeNames[i * 2];
  const tag2 = tagNodeNames[i * 2 + 1];
  connections[tag1] = { main: [[{ node: mergeName, type: "main", index: 0 }]] };
  connections[tag2] = { main: [[{ node: mergeName, type: "main", index: 1 }]] };
}

// Level 2: 4 merges
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

// Level 3: 2 merges
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

// Level 4: 1 final merge
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
const normalizerJsCode = `// Nœud Code "Normaliser"
const items = $input.all();
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
const retentionMs = 14 * 24 * 3600 * 1000; // 14 jours de rétention

// Récupération des URLs déjà envoyées via staticData
const staticData = $getWorkflowStaticData('global');
if (!staticData.sentUrls) staticData.sentUrls = {};

// Nettoyage de la rétention (> 14 jours)
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

  // Exclusion si déjà envoyé dans les 14 jours
  if (staticData.sentUrls[link]) {
    alreadySentCount++;
    continue;
  }

  // Dédoublonnage URL
  if (seenUrls.has(link)) {
    duplicatesCount++;
    continue;
  }

  // Dédoublonnage par similarité de titre (overlap >= 0.60)
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

  // Filtrage fenêtre temporelle (window_hours)
  let pubDate = null;
  if (d.isoDate) pubDate = new Date(d.isoDate);
  else if (d.pubDate) pubDate = new Date(d.pubDate);

  if (pubDate && !isNaN(pubDate.getTime())) {
    if (now - pubDate.getTime() > windowMs) {
      filteredOldCount++;
      continue;
    }
  }

  // Nettoyage texte (max 1200 caractères)
  const rawSnippet = d.contentSnippet || d.content || d.summary || title;
  const cleanSnippet = rawSnippet.replace(/<[^>]*>?/gm, ' ').replace(/\\s+/g, ' ').trim().slice(0, 1200);

  // Catégorisation
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

// Calcul de couverture multi-sources (overlap >= 0.25)
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

// Pré-classement : nombre de sources distinctes (desc), fraîcheur (desc), niveau (asc)
rawArticles.sort((a, b) => {
  if (b.distinctSourcesCount !== a.distinctSourcesCount) {
    return b.distinctSourcesCount - a.distinctSourcesCount;
  }
  const dateDiff = new Date(b.date_iso).getTime() - new Date(a.date_iso).getTime();
  if (dateDiff !== 0) return dateDiff;
  return a.tier - b.tier;
});

// Application des quotas par catégorie
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

// Détection des flux sans article retenu
const allFeedSources = [
  'Google Research', 'OpenAI', 'NVIDIA Blog', 'Hugging Face Blog',
  'BCE / ECB Press', 'Federal Reserve Press', 'BBC Business', 'France 24 Éco-Tech',
  'DW Business', 'Le Monde Économie', 'The Guardian Business', 'MarketWatch',
  'MIT Tech Review AI', 'TechCrunch AI', 'Ars Technica', 'The Verge'
];
const zeroArticleFeeds = allFeedSources.filter(s => !sourceCounts[s]);

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
      counts_by_source: sourceCounts,
      feeds_with_zero_retained_articles: zeroArticleFeeds
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

connections[mergeFinalName] = {
  main: [[{ node: "Normaliser", type: "main", index: 0 }]]
};

const workflow = {
  name: "News – Collecte",
  nodes: nodes,
  connections: connections,
  settings: {
    timezone: "Africa/Algiers",
    executionOrder: "v1",
    saveManualExecutions: true
  }
};

const outPath = path.join(__dirname, '../workflows/news-collecte.json');
fs.writeFileSync(outPath, JSON.stringify(workflow, null, 2), 'utf8');
console.log(`Generated workflow at ${outPath} with ${nodes.length} nodes.`);

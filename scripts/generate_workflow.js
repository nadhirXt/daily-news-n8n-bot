const fs = require('fs');
const path = require('path');

// 12 RSS Feeds grouped by category
const feeds = [
  // Monde & Politique (5)
  {
    id: 'rss_bbc_world',
    name: 'RSS BBC World',
    source: 'BBC World',
    category: 'Monde & Politique',
    url: 'https://feeds.bbci.co.uk/news/world/rss.xml',
    y: 100
  },
  {
    id: 'rss_al_jazeera',
    name: 'RSS Al Jazeera',
    source: 'Al Jazeera',
    category: 'Monde & Politique',
    url: 'https://www.aljazeera.com/xml/rss/all.xml',
    y: 200
  },
  {
    id: 'rss_france24',
    name: 'RSS France 24',
    source: 'France 24',
    category: 'Monde & Politique',
    url: 'https://www.france24.com/en/rss',
    y: 300
  },
  {
    id: 'rss_dw',
    name: 'RSS DW',
    source: 'Deutsche Welle',
    category: 'Monde & Politique',
    url: 'https://rss.dw.com/rdf/rss-en-world',
    y: 400
  },
  {
    id: 'rss_npr',
    name: 'RSS NPR',
    source: 'NPR',
    category: 'Monde & Politique',
    url: 'https://feeds.npr.org/1004/rss.xml',
    y: 500
  },
  // Économie (3)
  {
    id: 'rss_bbc_biz',
    name: 'RSS BBC Business',
    source: 'BBC Business',
    category: 'Économie',
    url: 'https://feeds.bbci.co.uk/news/business/rss.xml',
    y: 650
  },
  {
    id: 'rss_marketwatch',
    name: 'RSS MarketWatch',
    source: 'MarketWatch',
    category: 'Économie',
    url: 'https://feeds.content.dowjones.io/public/rss/mw_topstories',
    y: 750
  },
  {
    id: 'rss_lemonde_eco',
    name: 'RSS Le Monde Eco',
    source: 'Le Monde',
    category: 'Économie',
    url: 'https://www.lemonde.fr/economie/rss_full.xml',
    y: 850
  },
  // Tech & Science (4)
  {
    id: 'rss_techcrunch',
    name: 'RSS TechCrunch',
    source: 'TechCrunch',
    category: 'Tech & Science',
    url: 'https://techcrunch.com/feed/',
    y: 1000
  },
  {
    id: 'rss_theverge',
    name: 'RSS The Verge',
    source: 'The Verge',
    category: 'Tech & Science',
    url: 'https://www.theverge.com/rss/index.xml',
    y: 1100
  },
  {
    id: 'rss_arstechnica',
    name: 'RSS Ars Technica',
    source: 'Ars Technica',
    category: 'Tech & Science',
    url: 'https://feeds.arstechnica.com/arstechnica/index',
    y: 1200
  },
  {
    id: 'rss_mit_tech',
    name: 'RSS MIT Tech Review',
    source: 'MIT Technology Review',
    category: 'Tech & Science',
    url: 'https://www.technologyreview.com/feed/',
    y: 1300
  }
];

const nodes = [];
const connections = {};

// 1. Schedule Trigger
nodes.push({
  parameters: {
    rule: {
      interval: [
        {
          field: 'cronExpression',
          expression: '0 7 * * *'
        }
      ]
    }
  },
  id: 'schedule_trigger',
  name: 'Schedule Trigger',
  type: 'n8n-nodes-base.scheduleTrigger',
  typeVersion: 1.2,
  position: [0, 400]
});

// 2. Check Idempotency Code Node
const idempotencyCode = `// Vérification anti-doublon (idempotence quotidienne)
const staticData = $getWorkflowStaticData('global');
const today = new Date().toISOString().slice(0, 10);

if (staticData.lastSentDate === today) {
  // Déjà exécuté et envoyé aujourd'hui -> arrêt du flux
  return [];
}

return [{
  json: {
    executionDate: today,
    status: 'proceed'
  }
}];`;

nodes.push({
  parameters: {
    language: 'javaScript',
    jsCode: idempotencyCode
  },
  id: 'check_idempotency',
  name: 'Check Idempotency',
  type: 'n8n-nodes-base.code',
  typeVersion: 2,
  position: [240, 400]
});

connections['Schedule Trigger'] = {
  main: [
    [
      {
        node: 'Check Idempotency',
        type: 'main',
        index: 0
      }
    ]
  ]
};

connections['Check Idempotency'] = {
  main: [[]]
};

// Add RSS nodes and their tag nodes
const tagNodeNames = [];

feeds.forEach((feed, idx) => {
  // RSS Node
  nodes.push({
    parameters: {
      url: feed.url
    },
    id: feed.id,
    name: feed.name,
    type: 'n8n-nodes-base.rssFeedRead',
    typeVersion: 1.2,
    position: [480, feed.y],
    continueOnFail: true
  });

  // Connect Check Idempotency to each RSS node
  connections['Check Idempotency'].main[0].push({
    node: feed.name,
    type: 'main',
    index: 0
  });

  // Tag Source Node
  const tagName = `Tag ${feed.source}`;
  tagNodeNames.push(tagName);

  const tagCode = `// Marquer la source et la catégorie d'origine
const items = $input.all();
return items.map(item => ({
  json: {
    ...item.json,
    feedSource: '${feed.source.replace(/'/g, "\\'")}',
    feedCategory: '${feed.category.replace(/'/g, "\\'")}'
  }
}));`;

  nodes.push({
    parameters: {
      language: 'javaScript',
      jsCode: tagCode
    },
    id: `tag_${feed.id}`,
    name: tagName,
    type: 'n8n-nodes-base.code',
    typeVersion: 2,
    position: [720, feed.y],
    continueOnFail: true
  });

  connections[feed.name] = {
    main: [
      [
        {
          node: tagName,
          type: 'main',
          index: 0
        }
      ]
    ]
  };
});

// Binary merge tree for all 12 feeds
// Level 1: 12 tags -> 6 merges
let currentLevelNodes = [...tagNodeNames];
let mergeX = 960;
let mergeLevel = 1;

while (currentLevelNodes.length > 1) {
  const nextLevelNodes = [];
  for (let i = 0; i < currentLevelNodes.length; i += 2) {
    if (i + 1 < currentLevelNodes.length) {
      const nodeA = currentLevelNodes[i];
      const nodeB = currentLevelNodes[i + 1];
      const mergeNodeName = `Merge L${mergeLevel}_${Math.floor(i / 2) + 1}`;
      const mergeY = 200 + Math.floor(i / 2) * 200;

      nodes.push({
        parameters: {
          mode: 'append'
        },
        id: `merge_l${mergeLevel}_${Math.floor(i / 2) + 1}`,
        name: mergeNodeName,
        type: 'n8n-nodes-base.merge',
        typeVersion: 3.2,
        position: [mergeX, mergeY]
      });

      // Connect nodeA to input 0
      connections[nodeA] = connections[nodeA] || { main: [[]] };
      connections[nodeA].main[0].push({
        node: mergeNodeName,
        type: 'main',
        index: 0
      });

      // Connect nodeB to input 1
      connections[nodeB] = connections[nodeB] || { main: [[]] };
      connections[nodeB].main[0].push({
        node: mergeNodeName,
        type: 'main',
        index: 1
      });

      nextLevelNodes.push(mergeNodeName);
    } else {
      // Odd node passes through
      nextLevelNodes.push(currentLevelNodes[i]);
    }
  }
  currentLevelNodes = nextLevelNodes;
  mergeX += 220;
  mergeLevel++;
}

const finalMergeNode = currentLevelNodes[0];

// Normalize & Filter Code Node
const normalizeCode = `// Normalisation, nettoyage des URLs, filtrage < 36h, et attribution d'IDs uniques
const items = $input.all();
const now = Date.now();
const maxAgeMs = 36 * 3600 * 1000; // 36 heures

function cleanUrl(rawUrl) {
  if (!rawUrl) return '';
  try {
    const u = new URL(rawUrl);
    // Retirer les paramètres de tracking
    const trackingParams = [
      'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
      'fbclid', 'gclid', '_hsenc', '_hsmi', 'mc_cid', 'mc_eid'
    ];
    trackingParams.forEach(p => u.searchParams.delete(p));
    // Refuser les redirections Google News
    if (u.hostname.includes('news.google.com')) return '';
    return u.toString();
  } catch (e) {
    return rawUrl.split('?')[0];
  }
}

const seenUrls = new Set();
const normalized = [];
let idCounter = 1;

for (const item of items) {
  const data = item.json;
  const title = (data.title || '').trim();
  const rawLink = data.link || data.guid || '';
  const link = cleanUrl(rawLink);

  if (!title || !link) continue;
  if (seenUrls.has(link)) continue;
  seenUrls.add(link);

  // Filtrage date (< 36h)
  let pubDate = null;
  if (data.isoDate) pubDate = new Date(data.isoDate);
  else if (data.pubDate) pubDate = new Date(data.pubDate);

  if (pubDate && !isNaN(pubDate.getTime())) {
    if (now - pubDate.getTime() > maxAgeMs) {
      continue;
    }
  }

  // Nettoyage description HTML
  const rawSnippet = data.contentSnippet || data.content || data.summary || '';
  const cleanSnippet = rawSnippet.replace(/<[^>]*>?/gm, ' ').replace(/\\s+/g, ' ').trim();

  normalized.push({
    id: 'art_' + idCounter++,
    title: title,
    link: link,
    source: data.feedSource || 'Source inconnue',
    category: data.feedCategory || 'Monde & Politique',
    description: cleanSnippet.slice(0, 450),
    pubDate: pubDate ? pubDate.toISOString() : new Date().toISOString()
  });
}

return [{
  json: {
    articles: normalized,
    totalCount: normalized.length
  }
}];`;

nodes.push({
  parameters: {
    language: 'javaScript',
    jsCode: normalizeCode
  },
  id: 'normalize_filter',
  name: 'Normalize & Filter',
  type: 'n8n-nodes-base.code',
  typeVersion: 2,
  position: [mergeX + 150, 400]
});

connections[finalMergeNode] = connections[finalMergeNode] || { main: [[]] };
connections[finalMergeNode].main[0].push({
  node: 'Normalize & Filter',
  type: 'main',
  index: 0
});

// Group by Topic Code Node
const groupCode = `// Regroupement d'articles par sujet et détection multi-sources
const articles = $input.first().json.articles || [];

function normalizeWords(text) {
  return (text || '').toLowerCase()
    .normalize('NFD').replace(/[\\u0300-\\u036f]/g, '')
    .replace(/[^a-z0-9]/g, ' ')
    .split(/\\s+/)
    .filter(w => w.length > 3);
}

function wordOverlap(wordsA, wordsB) {
  if (!wordsA.length || !wordsB.length) return 0;
  const setA = new Set(wordsA);
  const setB = new Set(wordsB);
  let common = 0;
  for (const w of setA) {
    if (setB.has(w)) common++;
  }
  const total = new Set([...setA, ...setB]).size;
  return total === 0 ? 0 : common / total;
}

const categories = ['Monde & Politique', 'Économie', 'Tech & Science'];
const categorizedArticles = [];

for (const cat of categories) {
  const catList = articles.filter(a => a.category === cat);
  const clusters = [];

  for (const art of catList) {
    const artWords = normalizeWords(art.title + ' ' + art.description);
    let matched = null;

    for (const cl of clusters) {
      if (wordOverlap(artWords, cl.words) >= 0.22) {
        matched = cl;
        break;
      }
    }

    if (matched) {
      matched.articles.push(art);
      matched.sources.add(art.source);
    } else {
      clusters.push({
        words: artWords,
        articles: [art],
        sources: new Set([art.source])
      });
    }
  }

  // Trier les clusters : multi-sources d'abord
  clusters.sort((a, b) => b.sources.size - a.sources.size || b.articles.length - a.articles.length);

  for (const cl of clusters) {
    for (const art of cl.articles) {
      art.isMultiSource = cl.sources.size >= 2;
      art.sourcesCount = cl.sources.size;
      categorizedArticles.push(art);
    }
  }
}

return [{
  json: {
    articles: categorizedArticles,
    total: categorizedArticles.length
  }
}];`;

nodes.push({
  parameters: {
    language: 'javaScript',
    jsCode: groupCode
  },
  id: 'group_by_topic',
  name: 'Group by Topic',
  type: 'n8n-nodes-base.code',
  typeVersion: 2,
  position: [mergeX + 380, 400]
});

connections['Normalize & Filter'] = {
  main: [
    [
      {
        node: 'Group by Topic',
        type: 'main',
        index: 0
      }
    ]
  ]
};

// Prepare LLM Payload Code Node (Anti-hallucination: No URLs provided to LLM)
const prepareLlmCode = `// Préparation du payload LLM (seuls les IDs sont transmis, AUCUNE URL)
const articles = $input.first().json.articles || [];

// Stocker la table de correspondance complète pour vérification et reconstruction
const articlesMap = {};
articles.forEach(a => {
  articlesMap[a.id] = {
    id: a.id,
    title: a.title,
    link: a.link,
    source: a.source,
    category: a.category,
    description: a.description
  };
});

// Payload transmis au LLM sans URL
const promptArticles = articles.map(a => ({
  id: a.id,
  title: a.title,
  description: a.description,
  source: a.source,
  category: a.category,
  multi_source: a.isMultiSource
}));

const systemPrompt = \`Tu es un rédacteur de presse francophone spécialisé dans la synthèse factuelle d'actualités internationales.
Tu sélectionnes les 3 sujets les plus importants par catégorie (Monde/Politique, Économie, Tech) et produis un résumé structuré en JSON STRICT.

RÈGLES STRICTES :
1. Neutralité absolue : aucun adjectif émotionnel, partisan ou subjectif.
2. Faits uniquement : ne résume que ce qui figure explicitement dans les textes fournis.
3. Attribution : toute déclaration doit être attribuée (« selon X », « d'après Y »).
4. Chiffres : n'invente aucun chiffre, nom ou citation. Si une information manque, écris « non précisé ».
5. Utilise uniquement les IDs fournis dans le champ article_ids.
6. Ne génère JAMAIS d'URL ou de lien web.
7. Fournis pour chaque item un champ 'preuve' : extrait verbatim de 15 mots max tiré directement du titre ou de la description d'un article cité.
8. Privilégie les sujets avec multi_source: true.
9. Format de sortie : JSON pur UNIQUEMENT, sans balises markdown, sans texte additionnel.

SCHÉMA JSON STRICT :
{
  "date": "YYYY-MM-DD",
  "categories": [
    {
      "name": "🌍 Monde & Politique",
      "items": [
        {
          "titre": "Titre concis en français",
          "resume": "2 phrases maximum. Factuel, neutre, en français.",
          "pourquoi_important": "1 phrase expliquant l'impact.",
          "article_ids": ["art_1", "art_2"],
          "preuve": "extrait verbatim de 15 mots max",
          "confirmation": "multi-sources"
        }
      ]
    },
    {
      "name": "💰 Économie",
      "items": []
    },
    {
      "name": "🔬 Tech & Science",
      "items": []
    }
  ]
}\`;

const userContent = \`Voici les articles du jour :\\n\${JSON.stringify(promptArticles, null, 2)}\\n\\nProduis la synthèse quotidienne en JSON strict avec 3 items maximum par catégorie.\`;

const llm_payload = {
  model: 'claude-3-5-sonnet-20241022',
  max_tokens: 3000,
  temperature: 0.1,
  system: systemPrompt,
  messages: [
    {
      role: 'user',
      content: userContent
    }
  ]
};

return [{
  json: {
    llm_payload,
    articlesMap
  }
}];`;

nodes.push({
  parameters: {
    language: 'javaScript',
    jsCode: prepareLlmCode
  },
  id: 'prepare_llm_payload',
  name: 'Prepare LLM Payload',
  type: 'n8n-nodes-base.code',
  typeVersion: 2,
  position: [mergeX + 610, 400]
});

connections['Group by Topic'] = {
  main: [
    [
      {
        node: 'Prepare LLM Payload',
        type: 'main',
        index: 0
      }
    ]
  ]
};

// Anthropic Claude HTTP Request Node
nodes.push({
  parameters: {
    method: 'POST',
    url: 'https://api.anthropic.com/v1/messages',
    sendHeaders: true,
    headerParameters: {
      parameters: [
        {
          name: 'x-api-key',
          value: '={{ $env.ANTHROPIC_API_KEY }}'
        },
        {
          name: 'anthropic-version',
          value: '2023-06-01'
        },
        {
          name: 'content-type',
          value: 'application/json'
        }
      ]
    },
    sendBody: true,
    specifyBody: 'json',
    jsonBody: '={{ JSON.stringify($json.llm_payload) }}',
    options: {
      response: {
        response: {
          responseFormat: 'json'
        }
      }
    }
  },
  id: 'call_anthropic',
  name: 'Call Anthropic Claude',
  type: 'n8n-nodes-base.httpRequest',
  typeVersion: 4.2,
  position: [mergeX + 850, 400],
  retryOnFail: true,
  maxTries: 2
});

connections['Prepare LLM Payload'] = {
  main: [
    [
      {
        node: 'Call Anthropic Claude',
        type: 'main',
        index: 0
      }
    ]
  ]
};

// Validate JSON & Anti-hallucination Code Node
const validateCode = `// Validation stricte du JSON, contrôle anti-hallucination (IDs + preuve verbatim) et reconstruction des URLs
const httpResponse = $input.first().json;
const articlesMap = $('Prepare LLM Payload').first().json.articlesMap || {};

// Extraire le texte de réponse Anthropic
let rawText = '';
if (httpResponse.content && Array.isArray(httpResponse.content) && httpResponse.content[0]) {
  rawText = httpResponse.content[0].text || '';
} else if (typeof httpResponse === 'string') {
  rawText = httpResponse;
}

// Nettoyer d'éventuelles balises markdown
rawText = rawText.replace(/^\\s*\`\`\`json\\s*/i, '').replace(/\\s*\`\`\`\\s*$/i, '').trim();

let parsed;
try {
  parsed = JSON.parse(rawText);
} catch (e) {
  return [{
    json: {
      isValid: false,
      error: 'Erreur parsing JSON LLM : ' + e.message,
      rawOutput: rawText,
      alertAdmin: true
    }
  }];
}

function normalizeForSearch(str) {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\\u0300-\\u036f]/g, '')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\\s+/g, ' ')
    .trim();
}

const validatedCategories = [];
const rejectedItems = [];
let totalValidItems = 0;

for (const cat of (parsed.categories || [])) {
  const validItems = [];

  for (const item of (cat.items || [])) {
    const itemIds = item.article_ids || [];

    // Règle 1 : Vérifier présence des IDs
    if (!Array.isArray(itemIds) || itemIds.length === 0) {
      rejectedItems.push({ item, reason: 'Aucun article_id fourni' });
      continue;
    }

    const missingIds = itemIds.filter(id => !articlesMap[id]);
    if (missingIds.length > 0) {
      rejectedItems.push({ item, reason: 'IDs inconnus : ' + missingIds.join(', ') });
      continue;
    }

    // Règle 2 : Vérification de la preuve verbatim
    const preuveNorm = normalizeForSearch(item.preuve);
    let preuveFound = false;

    for (const id of itemIds) {
      const art = articlesMap[id];
      const sourceNorm = normalizeForSearch(art.title + ' ' + art.description);
      if (sourceNorm.includes(preuveNorm)) {
        preuveFound = true;
        break;
      }
    }

    if (!preuveFound && preuveNorm.length > 5) {
      // Tolérance partielle : vérifier au moins 70% des mots de la preuve
      const words = preuveNorm.split(' ').filter(w => w.length > 3);
      if (words.length > 0) {
        for (const id of itemIds) {
          const art = articlesMap[id];
          const srcNorm = normalizeForSearch(art.title + ' ' + art.description);
          const matchedWords = words.filter(w => srcNorm.includes(w));
          if (matchedWords.length / words.length >= 0.7) {
            preuveFound = true;
            break;
          }
        }
      }
    }

    if (!preuveFound && preuveNorm.length > 5) {
      rejectedItems.push({ item, reason: 'Preuve verbatim introuvable dans les articles cités' });
      continue;
    }

    // Règle 3 : Reconstruction des liens et sources depuis articlesMap (garantie 0 hallucination)
    const sources = [];
    const liens = [];
    itemIds.forEach(id => {
      const art = articlesMap[id];
      if (art && art.link) {
        sources.push(art.source);
        liens.push({
          source: art.source,
          url: art.link
        });
      }
    });

    validItems.push({
      titre: item.titre,
      resume: item.resume,
      pourquoi_important: item.pourquoi_important,
      sources: [...new Set(sources)],
      liens: liens,
      confirmation: item.confirmation || (itemIds.length >= 2 ? 'multi-sources' : 'source unique')
    });

    totalValidItems++;
  }

  validatedCategories.push({
    name: cat.name,
    items: validItems
  });
}

// Vérifier seuil minimum : au moins 2 actualités par catégorie
const weakCategories = validatedCategories.filter(c => c.items.length < 2);
const alertAdmin = weakCategories.length > 0 || totalValidItems < 4;

return [{
  json: {
    isValid: true,
    date: parsed.date || new Date().toISOString().slice(0, 10),
    categories: validatedCategories,
    rejected: rejectedItems,
    totalValidItems,
    alertAdmin,
    weakCategories: weakCategories.map(c => c.name)
  }
}];`;

nodes.push({
  parameters: {
    language: 'javaScript',
    jsCode: validateCode
  },
  id: 'validate_anti_hallucination',
  name: 'Validate & Anti-Hallucination',
  type: 'n8n-nodes-base.code',
  typeVersion: 2,
  position: [mergeX + 1090, 400]
});

connections['Call Anthropic Claude'] = {
  main: [
    [
      {
        node: 'Validate & Anti-Hallucination',
        type: 'main',
        index: 0
      }
    ]
  ]
};

// Check Validation & Route Code Node
const routeCode = `// Décision de routage : publication normale ou alerte admin
const data = $input.first().json;

if (!data.isValid || data.alertAdmin) {
  return [
    [], // Sortie 0 : publication (vide)
    [{ json: data }] // Sortie 1 : alerte admin
  ];
}

return [
  [{ json: data }], // Sortie 0 : publication canal
  [] // Sortie 1 : alerte admin (vide)
];`;

nodes.push({
  parameters: {
    language: 'javaScript',
    jsCode: routeCode
  },
  id: 'route_decision',
  name: 'Route Decision',
  type: 'n8n-nodes-base.code',
  typeVersion: 2,
  position: [mergeX + 1330, 400]
});

connections['Validate & Anti-Hallucination'] = {
  main: [
    [
      {
        node: 'Route Decision',
        type: 'main',
        index: 0
      }
    ]
  ]
};

// Format Telegram Message Code Node
const formatMessageCode = `// Formatage HTML propre pour Telegram (gestion limite 4096 caractères)
const data = $input.first().json;
const dateFormatted = data.date || new Date().toISOString().slice(0, 10);

let header = '🗞️ <b>LE RÉSUMÉ DU JOUR</b> — ' + dateFormatted + '\\n\\n';
let messages = [];
let currentMsg = header;

for (const cat of data.categories) {
  let catBlock = '<b>' + cat.name + '</b>\\n\\n';

  for (const item of cat.items) {
    const linksHtml = item.liens.map(l => '<a href="' + l.url + '">' + l.source + '</a>').join(' | ');
    const itemBlock = '• <b>' + item.titre + '</b>\\n' +
      item.resume + '\\n' +
      '<i>Impact : ' + item.pourquoi_important + '</i>\\n' +
      '🔗 Sources : ' + linksHtml + '\\n\\n';

    // Vérifier si l'ajout dépasse la limite Telegram (marge à 3800 caractères)
    if ((currentMsg + catBlock + itemBlock).length > 3800) {
      messages.push(currentMsg.trim());
      currentMsg = header + catBlock + itemBlock;
      catBlock = ''; // Déjà affiché dans le nouveau message
    } else {
      catBlock += itemBlock;
    }
  }

  currentMsg += catBlock;
}

if (currentMsg.trim().length > 0) {
  messages.push(currentMsg.trim());
}

return messages.map((text, idx) => ({
  json: {
    messageText: text,
    partIndex: idx + 1,
    totalParts: messages.length,
    executionDate: dateFormatted
  }
}));`;

nodes.push({
  parameters: {
    language: 'javaScript',
    jsCode: formatMessageCode
  },
  id: 'format_telegram_msg',
  name: 'Format Telegram Message',
  type: 'n8n-nodes-base.code',
  typeVersion: 2,
  position: [mergeX + 1570, 300]
});

// Send Telegram Message to Channel
nodes.push({
  parameters: {
    resource: 'message',
    operation: 'sendMessage',
    chatId: '={{ $env.TELEGRAM_CHANNEL_CHAT_ID }}',
    text: '={{ $json.messageText }}',
    additionalFields: {
      parse_mode: 'HTML'
    }
  },
  id: 'send_telegram_channel',
  name: 'Send to Telegram Channel',
  type: 'n8n-nodes-base.telegram',
  typeVersion: 1.2,
  position: [mergeX + 1810, 300],
  credentials: {
    telegramApi: {
      id: 'telegram_account',
      name: 'Telegram account'
    }
  }
});

connections['Format Telegram Message'] = {
  main: [
    [
      {
        node: 'Send to Telegram Channel',
        type: 'main',
        index: 0
      }
    ]
  ]
};

// Mark Date Sent (Idempotence) Code Node
const markDateCode = `// Sauvegarde de la date dans les static data pour garantir l'idempotence
const staticData = $getWorkflowStaticData('global');
const dateSent = $input.first().json.executionDate || new Date().toISOString().slice(0, 10);
staticData.lastSentDate = dateSent;

return [{
  json: {
    status: 'success',
    lastSentDate: dateSent,
    timestamp: new Date().toISOString()
  }
}];`;

nodes.push({
  parameters: {
    language: 'javaScript',
    jsCode: markDateCode
  },
  id: 'mark_date_sent',
  name: 'Mark Date Sent',
  type: 'n8n-nodes-base.code',
  typeVersion: 2,
  position: [mergeX + 2050, 300]
});

connections['Send to Telegram Channel'] = {
  main: [
    [
      {
        node: 'Mark Date Sent',
        type: 'main',
        index: 0
      }
    ]
  ]
};

// Admin Alert Code Node
const formatAlertCode = `// Formatage de l'alerte pour l'administrateur
const data = $input.first().json;
let alertMsg = '⚠️ <b>ALERTE DAILY NEWS BOT</b>\\n\\n';

if (!data.isValid) {
  alertMsg += '❌ <b>Échec de validation :</b>\\n' + (data.error || 'Erreur inconnue') + '\\n';
} else if (data.alertAdmin) {
  alertMsg += '📉 <b>Contenu insuffisant pour publication :</b>\\n';
  alertMsg += '• Total articles validés : ' + data.totalValidItems + '\\n';
  if (data.weakCategories && data.weakCategories.length > 0) {
    alertMsg += '• Catégories sous le seuil (<2) : ' + data.weakCategories.join(', ') + '\\n';
  }
  if (data.rejected && data.rejected.length > 0) {
    alertMsg += '• Items rejetés : ' + data.rejected.length + '\\n';
  }
}

alertMsg += '\\n📅 Date : ' + (data.date || new Date().toISOString());

return [{
  json: {
    alertText: alertMsg
  }
}];`;

nodes.push({
  parameters: {
    language: 'javaScript',
    jsCode: formatAlertCode
  },
  id: 'format_admin_alert',
  name: 'Format Admin Alert',
  type: 'n8n-nodes-base.code',
  typeVersion: 2,
  position: [mergeX + 1570, 520]
});

// Send Admin Alert Telegram Node
nodes.push({
  parameters: {
    resource: 'message',
    operation: 'sendMessage',
    chatId: '={{ $env.TELEGRAM_ADMIN_CHAT_ID }}',
    text: '={{ $json.alertText }}',
    additionalFields: {
      parse_mode: 'HTML'
    }
  },
  id: 'send_admin_alert',
  name: 'Send Admin Alert',
  type: 'n8n-nodes-base.telegram',
  typeVersion: 1.2,
  position: [mergeX + 1810, 520],
  credentials: {
    telegramApi: {
      id: 'telegram_account',
      name: 'Telegram account'
    }
  }
});

connections['Format Admin Alert'] = {
  main: [
    [
      {
        node: 'Send Admin Alert',
        type: 'main',
        index: 0
      }
    ]
  ]
};

// Route Decision connections:
// Output 0 -> Format Telegram Message
// Output 1 -> Format Admin Alert
connections['Route Decision'] = {
  main: [
    [
      {
        node: 'Format Telegram Message',
        type: 'main',
        index: 0
      }
    ],
    [
      {
        node: 'Format Admin Alert',
        type: 'main',
        index: 0
      }
    ]
  ]
};

// Error Trigger & Handler
nodes.push({
  parameters: {},
  id: 'error_trigger',
  name: 'Error Trigger',
  type: 'n8n-nodes-base.errorTrigger',
  typeVersion: 1,
  position: [mergeX + 1330, 720]
});

const formatWorkflowErrorCode = `// Formatage d'erreur critique de workflow
const error = $input.first().json.execution?.error || {};
const nodeName = error.node?.name || 'Inconnu';
const message = error.message || 'Erreur inattendue dans le workflow';

const text = '🚨 <b>ERREUR CRITIQUE WORKFLOW</b>\\n\\n' +
  '• <b>Nœud en échec :</b> ' + nodeName + '\\n' +
  '• <b>Message :</b> ' + message + '\\n' +
  '• <b>Date :</b> ' + new Date().toISOString();

return [{
  json: {
    errorText: text
  }
}];`;

nodes.push({
  parameters: {
    language: 'javaScript',
    jsCode: formatWorkflowErrorCode
  },
  id: 'format_workflow_error',
  name: 'Format Workflow Error',
  type: 'n8n-nodes-base.code',
  typeVersion: 2,
  position: [mergeX + 1570, 720]
});

connections['Error Trigger'] = {
  main: [
    [
      {
        node: 'Format Workflow Error',
        type: 'main',
        index: 0
      }
    ]
  ]
};

nodes.push({
  parameters: {
    resource: 'message',
    operation: 'sendMessage',
    chatId: '={{ $env.TELEGRAM_ADMIN_CHAT_ID }}',
    text: '={{ $json.errorText }}',
    additionalFields: {
      parse_mode: 'HTML'
    }
  },
  id: 'send_workflow_error',
  name: 'Send Workflow Error',
  type: 'n8n-nodes-base.telegram',
  typeVersion: 1.2,
  position: [mergeX + 1810, 720],
  credentials: {
    telegramApi: {
      id: 'telegram_account',
      name: 'Telegram account'
    }
  }
});

connections['Format Workflow Error'] = {
  main: [
    [
      {
        node: 'Send Workflow Error',
        type: 'main',
        index: 0
      }
    ]
  ]
};

const workflow = {
  name: 'Daily News Telegram Bot',
  nodes: nodes,
  connections: connections,
  active: false,
  settings: {
    executionOrder: 'v1',
    timezone: 'Europe/Paris',
    saveManualExecutions: true,
    callerPolicy: 'workflowsFromSameOwner'
  },
  versionId: '1',
  meta: {
    templateCredsSetupCompleted: true,
    instanceId: 'daily-news-bot'
  }
};

const outputPath = path.join(__dirname, '..', 'workflows', 'daily-news.json');
fs.writeFileSync(outputPath, JSON.stringify(workflow, null, 2), 'utf-8');
console.log('Workflow written successfully to ' + outputPath);
console.log('Total nodes: ' + nodes.length);

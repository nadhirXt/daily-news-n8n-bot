const testItems = [
  {
    json: {
      title: "OpenAI launches new GPT-5 model with reasoning capabilities",
      link: "https://openai.com/news/gpt-5/?utm_source=twitter&utm_medium=social",
      isoDate: new Date().toISOString(),
      contentSnippet: "OpenAI announced today its flagship GPT-5 reasoning model designed for complex agentic workflows.",
      feedSource: "OpenAI",
      feedTier: 1,
      feedType: "annonce_entreprise",
      feedDefaultCategory: "ia"
    }
  },
  {
    // Duplicate URL test
    json: {
      title: "OpenAI launches new GPT-5 model with reasoning capabilities",
      link: "https://openai.com/news/gpt-5/?fbclid=12345",
      isoDate: new Date().toISOString(),
      contentSnippet: "OpenAI announced today its flagship GPT-5 reasoning model designed for complex agentic workflows.",
      feedSource: "BBC Business",
      feedTier: 2,
      feedType: "reportage",
      feedDefaultCategory: "economie"
    }
  },
  {
    // Title similarity duplicate test
    json: {
      title: "OpenAI unveils brand new GPT-5 model with reasoning capabilities",
      link: "https://techcrunch.com/openai-gpt-5",
      isoDate: new Date().toISOString(),
      contentSnippet: "Today OpenAI unveiled the GPT-5 model.",
      feedSource: "TechCrunch AI",
      feedTier: 3,
      feedType: "reportage",
      feedDefaultCategory: "ia"
    }
  },
  {
    // Economy test
    json: {
      title: "ECB cuts interest rates by 25 basis points as inflation cools",
      link: "https://www.ecb.europa.eu/press/pr/date/2026/html/ecb.pr261017.en.html",
      isoDate: new Date().toISOString(),
      contentSnippet: "The Governing Council today decided to lower the three key ECB interest rates by 25 basis points.",
      feedSource: "BCE / ECB Press",
      feedTier: 1,
      feedType: "donnees_officielles",
      feedDefaultCategory: "economie"
    }
  },
  {
    // Tech test
    json: {
      title: "New quantum computing processor reaches 1000 qubits milestone",
      link: "https://spectrum.ieee.org/computing/quantum-1000",
      isoDate: new Date().toISOString(),
      contentSnippet: "Researchers achieved a breakthrough in superconducting qubit coherence.",
      feedSource: "Ars Technica",
      feedTier: 3,
      feedType: "reportage",
      feedDefaultCategory: "tech"
    }
  }
];

// Normalizer logic
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
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, ' ')
    .split(/\s+/)
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

const windowHours = 24;
const maxArticles = 60;
const quotas = { ia: 25, economie: 20, tech: 15 };

const now = Date.now();
const windowMs = windowHours * 3600 * 1000;

const seenUrls = new Set();
const seenTitles = [];
let duplicatesRemoved = 0;
const rawArticles = [];

for (const item of testItems) {
  const d = item.json;
  const title = (d.title || '').trim();
  const rawLink = d.link || d.guid || '';
  const link = cleanUrl(rawLink);

  if (!title || !link) continue;

  // URL deduplication
  if (seenUrls.has(link)) {
    duplicatesRemoved++;
    continue;
  }

  // Title similarity deduplication
  const titleWords = normalizeTitle(title);
  let isDupTitle = false;
  for (const seen of seenTitles) {
    if (titleSimilarity(titleWords, seen.words) >= 0.60) {
      isDupTitle = true;
      seen.sources.add(d.feedSource);
      duplicatesRemoved++;
      break;
    }
  }
  if (isDupTitle) continue;

  seenUrls.add(link);
  seenTitles.push({ words: titleWords, sources: new Set([d.feedSource]), title });

  // Date check
  let pubDate = null;
  if (d.isoDate) pubDate = new Date(d.isoDate);
  else if (d.pubDate) pubDate = new Date(d.pubDate);

  if (pubDate && !isNaN(pubDate.getTime())) {
    if (now - pubDate.getTime() > windowMs) continue;
  }

  // Category detection
  const fullText = (title + ' ' + (d.contentSnippet || d.content || d.summary || '')).toLowerCase();
  let category = d.feedDefaultCategory || 'tech';

  const iaRegex = /\b(ai|artificial intelligence|intelligence artificielle|llm|llms|gpt|gemini|openai|anthropic|claude|deepmind|copilot|deep learning|machine learning|neural|gpu|gpus|nvidia|hugging face|mistral|generative ai|genai|agent|agents)\b/i;
  const ecoRegex = /\b(inflation|taux|banque centrale|bce|fed|federal reserve|fmi|imf|pib|gdp|croissance|recession|marche|marches|bourse|actions|obligations|economie|economy|dette|deficit|chomage|employment|tarifs|commerce|trade|oil|petrole)\b/i;
  const techRegex = /\b(tech|technologie|technology|cyber|cybersecurite|software|logiciel|apple|microsoft|google|amazon|meta|hardware|semiconducteur|chips|cloud|quantum|robotique|robotics)\b/i;

  if (iaRegex.test(fullText)) {
    category = 'ia';
  } else if (ecoRegex.test(fullText)) {
    category = 'economie';
  } else if (techRegex.test(fullText)) {
    category = 'tech';
  }

  const rawSnippet = (d.contentSnippet || d.content || d.summary || title);
  const cleanSnippet = rawSnippet.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim().slice(0, 1200);

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

// Compute cross-source coverage
for (const art of rawArticles) {
  let crossCount = 1;
  const otherSources = new Set([art.source]);
  for (const other of rawArticles) {
    if (other === art) continue;
    if (titleSimilarity(art.titleWords, other.titleWords) >= 0.25) {
      otherSources.add(other.source);
    }
  }
  art.distinctSourcesCount = otherSources.size;
}

// Pre-sort: distinct sources desc, freshness desc, tier asc
rawArticles.sort((a, b) => {
  if (b.distinctSourcesCount !== a.distinctSourcesCount) {
    return b.distinctSourcesCount - a.distinctSourcesCount;
  }
  const dateDiff = new Date(b.date_iso).getTime() - new Date(a.date_iso).getTime();
  if (dateDiff !== 0) return dateDiff;
  return a.tier - b.tier;
});

// Apply quotas
const finalArticles = [];
const catCounts = { ia: 0, economie: 0, tech: 0 };
let idIdx = 1;

for (const art of rawArticles) {
  const cat = art.categorie;
  if ((catCounts[cat] || 0) < (quotas[cat] || 20) && finalArticles.length < maxArticles) {
    catCounts[cat] = (catCounts[cat] || 0) + 1;
    finalArticles.push({
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

console.log('Result articles count:', finalArticles.length);
console.log('Duplicates removed:', duplicatesRemoved);
console.log('Cat counts:', catCounts);
console.log('Sample item:', finalArticles[0]);

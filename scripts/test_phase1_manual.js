const https = require('https');
const http = require('http');

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

function fetchFeed(feed) {
  return new Promise((resolve) => {
    const client = feed.url.startsWith('https') ? https : http;
    const req = client.get(feed.url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*'
      },
      timeout: 10000
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        let redirectUrl = res.headers.location;
        if (!redirectUrl.startsWith('http')) {
          const u = new URL(feed.url);
          redirectUrl = `${u.protocol}//${u.host}${redirectUrl}`;
        }
        return fetchFeed({ ...feed, url: redirectUrl }).then(resolve);
      }
      if (res.statusCode !== 200) {
        return resolve({ feed, error: `HTTP ${res.statusCode}`, items: [] });
      }
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        // Simple XML extraction of items
        const rawItems = [];
        const itemRegex = /<(?:item|entry)[\s>]([\s\S]*?)<\/(?:item|entry)>/gi;
        let match;
        while ((match = itemRegex.exec(body)) !== null) {
          const content = match[1];
          const getTag = (tag) => {
            const m = new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>|([\\s\\S]*?))<\\/${tag}>`, 'i').exec(content);
            return m ? (m[1] || m[2] || '').trim() : '';
          };
          const getAttr = (tag, attr) => {
            const m = new RegExp(`<${tag}[^>]*${attr}=["']([^"']+)["']`, 'i').exec(content);
            return m ? m[1].trim() : '';
          };

          const title = getTag('title');
          let link = getTag('link') || getAttr('link', 'href') || getTag('guid') || getTag('id');
          const pubDate = getTag('pubDate') || getTag('published') || getTag('updated') || getTag('dc:date');
          const snippet = getTag('description') || getTag('content:encoded') || getTag('summary') || getTag('content');

          if (title && link) {
            rawItems.push({
              title,
              link,
              pubDate,
              isoDate: pubDate,
              contentSnippet: snippet,
              feedSource: feed.name,
              feedTier: feed.tier,
              feedType: feed.type,
              feedDefaultCategory: feed.defaultCat
            });
          }
        }
        resolve({ feed, items: rawItems, error: null });
      });
    });
    req.on('error', err => resolve({ feed, error: err.message, items: [] }));
    req.on('timeout', () => { req.destroy(); resolve({ feed, error: 'TIMEOUT', items: [] }); });
  });
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

async function run() {
  console.log('Fetching all 16 feeds...');
  const results = await Promise.all(feeds.map(fetchFeed));

  const failedFeeds = [];
  const allRawItems = [];

  for (const r of results) {
    if (r.error || r.items.length === 0) {
      failedFeeds.push({ name: r.feed.name, url: r.feed.url, error: r.error || 'Empty feed' });
    }
    allRawItems.push(...r.items);
  }

  console.log(`Fetched ${allRawItems.length} total items from ${feeds.length - failedFeeds.length} working feeds.`);

  // Normalisation identical to the n8n Code node
  const windowHours = 24;
  const maxArticles = 60;
  const quotas = { ia: 25, economie: 20, tech: 15 };
  const now = Date.now();
  const windowMs = windowHours * 3600 * 1000;

  const seenUrls = new Set();
  const seenTitles = [];
  let duplicatesCount = 0;
  let filteredOldCount = 0;
  const rawArticles = [];

  const iaRegex = /\b(ai|artificial intelligence|intelligence artificielle|llm|llms|gpt|gemini|openai|anthropic|claude|deepmind|copilot|deep learning|machine learning|neural|gpu|gpus|nvidia|hugging face|mistral|generative ai|genai|agent|agents)\b/i;
  const ecoRegex = /\b(inflation|taux|banque centrale|bce|fed|federal reserve|fmi|imf|pib|gdp|croissance|recession|marche|marches|bourse|actions|obligations|economie|economy|dette|deficit|chomage|employment|tarifs|commerce|trade|oil|petrole)\b/i;
  const techRegex = /\b(tech|technologie|technology|cyber|cybersecurite|software|logiciel|apple|microsoft|google|amazon|meta|hardware|semiconducteur|chips|cloud|quantum|robotique|robotics)\b/i;

  for (const d of allRawItems) {
    const title = (d.title || '').trim();
    const rawLink = d.link || '';
    const link = cleanUrl(rawLink);

    if (!title || !link) continue;

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

    // Date check (24h)
    let pubDate = null;
    if (d.isoDate) pubDate = new Date(d.isoDate);
    else if (d.pubDate) pubDate = new Date(d.pubDate);

    if (pubDate && !isNaN(pubDate.getTime())) {
      if (now - pubDate.getTime() > windowMs) {
        filteredOldCount++;
        continue;
      }
    }

    const rawSnippet = d.contentSnippet || title;
    const cleanSnippet = rawSnippet.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim().slice(0, 1200);

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
      source: d.feedSource,
      tier: d.feedTier,
      type: d.feedType,
      date_iso: pubDate ? pubDate.toISOString() : new Date().toISOString(),
      link: link,
      categorie: category,
      texte: cleanSnippet,
      titleWords
    });
  }

  // Multi-source coverage
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

  // Pre-sort
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
  const sourceCounts = {};
  let idIdx = 1;

  for (const art of rawArticles) {
    const cat = art.categorie;
    if ((catCounts[cat] || 0) < (quotas[cat] || 20) && finalArticles.length < maxArticles) {
      catCounts[cat] = (catCounts[cat] || 0) + 1;
      sourceCounts[art.source] = (sourceCounts[art.source] || 0) + 1;
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

  console.log('\n================== RAPPORT PHASE 1 ==================');
  console.log('Total articles bruts collectés :', allRawItems.length);
  console.log('Articles filtrés (> 24h) :', filteredOldCount);
  console.log('Doublons supprimés (URL + Titre) :', duplicatesCount);
  console.log('Total articles retenus (après quotas) :', finalArticles.length);
  console.log('\nPar Catégorie :');
  console.log(`- IA : ${catCounts.ia} / quota ${quotas.ia}`);
  console.log(`- Économie : ${catCounts.economie} / quota ${quotas.economie}`);
  console.log(`- Tech : ${catCounts.tech} / quota ${quotas.tech}`);
  console.log('\nPar Source :');
  for (const [src, cnt] of Object.entries(sourceCounts)) {
    console.log(`- ${src} : ${cnt}`);
  }
  console.log('\nFlux en échec / sans article :');
  if (failedFeeds.length === 0) {
    console.log('Aucun flux en panne HTTP !');
  } else {
    failedFeeds.forEach(f => console.log(`- ${f.name} (${f.url}) : ${f.error}`));
  }
  console.log('\nÉchantillon premier article retenu :');
  console.log(JSON.stringify(finalArticles[0], null, 2));
}

run();

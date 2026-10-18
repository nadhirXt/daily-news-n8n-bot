const https = require('https');
const http = require('http');

const feeds = [
  // Tier 1 (Primaires)
  { name: 'Google DeepMind', tier: 1, type: 'annonce_entreprise', defaultCat: 'ia', url: 'https://deepmind.google/blog/rss.xml' },
  { name: 'OpenAI', tier: 1, type: 'annonce_entreprise', defaultCat: 'ia', url: 'https://openai.com/news/rss.xml' },
  { name: 'NVIDIA Blog', tier: 1, type: 'annonce_entreprise', defaultCat: 'ia', url: 'https://blogs.nvidia.com/feed/' },
  { name: 'Hugging Face Blog', tier: 1, type: 'annonce_entreprise', defaultCat: 'ia', url: 'https://huggingface.co/blog/feed.xml' },
  { name: 'BCE / ECB Press', tier: 1, type: 'donnees_officielles', defaultCat: 'economie', url: 'https://www.ecb.europa.eu/rss/press.html' },
  { name: 'FMI / IMF News', tier: 1, type: 'donnees_officielles', defaultCat: 'economie', url: 'https://www.imf.org/en/News/RSS' },
  { name: 'World Bank News', tier: 1, type: 'donnees_officielles', defaultCat: 'economie', url: 'https://www.worldbank.org/en/news/all.rss' },

  // Tier 2 (Généralistes / Éco)
  { name: 'BBC Business', tier: 2, type: 'reportage', defaultCat: 'economie', url: 'https://feeds.bbci.co.uk/news/business/rss.xml' },
  { name: 'NPR Economy', tier: 2, type: 'reportage', defaultCat: 'economie', url: 'https://feeds.npr.org/1017/rss.xml' },
  { name: 'DW Business', tier: 2, type: 'reportage', defaultCat: 'economie', url: 'https://rss.dw.com/rdf/rss-en-bus' },
  { name: 'France 24 Éco-Tech', tier: 2, type: 'reportage', defaultCat: 'economie', url: 'https://www.france24.com/fr/%C3%A9co-tech/rss' },
  { name: 'Le Monde Économie', tier: 2, type: 'reportage', defaultCat: 'economie', url: 'https://www.lemonde.fr/economie/rss_full.xml' },
  { name: 'The Guardian Business', tier: 2, type: 'reportage', defaultCat: 'economie', url: 'https://www.theguardian.com/business/rss' },
  { name: 'MarketWatch', tier: 2, type: 'reportage', defaultCat: 'economie', url: 'https://feeds.content.dowjones.io/public/rss/mw_topstories' },

  // Tier 3 (Tech & IA)
  { name: 'MIT Technology Review AI', tier: 3, type: 'reportage', defaultCat: 'ia', url: 'https://www.technologyreview.com/topic/artificial-intelligence/feed/' },
  { name: 'Ars Technica', tier: 3, type: 'reportage', defaultCat: 'tech', url: 'https://feeds.arstechnica.com/arstechnica/index' },
  { name: 'The Verge', tier: 3, type: 'reportage', defaultCat: 'tech', url: 'https://www.theverge.com/rss/index.xml' },
  { name: 'TechCrunch', tier: 3, type: 'reportage', defaultCat: 'tech', url: 'https://techcrunch.com/feed/' },
  { name: 'VentureBeat AI', tier: 3, type: 'reportage', defaultCat: 'ia', url: 'https://venturebeat.com/category/ai/feed/' },
  { name: 'Wired AI', tier: 3, type: 'reportage', defaultCat: 'ia', url: 'https://www.wired.com/feed/tag/ai/latest/rss' },
  { name: 'IEEE Spectrum Computing', tier: 3, type: 'reportage', defaultCat: 'tech', url: 'https://spectrum.ieee.org/rss/computing/fulltext' }
];

function fetchFeed(feed, redirectCount = 0) {
  return new Promise((resolve) => {
    if (redirectCount > 5) {
      return resolve({ ...feed, status: 'ERROR', error: 'Too many redirects' });
    }
    const client = feed.url.startsWith('https') ? https : http;
    const req = client.get(feed.url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*'
      },
      timeout: 8000
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        let redirectUrl = res.headers.location;
        if (!redirectUrl.startsWith('http')) {
          const u = new URL(feed.url);
          redirectUrl = `${u.protocol}//${u.host}${redirectUrl}`;
        }
        return fetchFeed({ ...feed, url: redirectUrl }, redirectCount + 1).then(resolve);
      }

      if (res.statusCode !== 200) {
        return resolve({ ...feed, status: 'HTTP_' + res.statusCode, error: `Status ${res.statusCode}` });
      }

      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        const hasItem = data.includes('<item') || data.includes('<entry');
        const itemCount = (data.match(/<item/g) || data.match(/<entry/g) || []).length;
        resolve({
          ...feed,
          status: hasItem ? 'OK' : 'INVALID_XML',
          itemCount,
          sampleLength: data.length
        });
      });
    });

    req.on('error', (err) => {
      resolve({ ...feed, status: 'ERROR', error: err.message });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ ...feed, status: 'TIMEOUT', error: 'Request timed out' });
    });
  });
}

async function run() {
  console.log(`Testing ${feeds.length} candidate feeds...`);
  const results = await Promise.all(feeds.map(f => fetchFeed(f)));
  for (const r of results) {
    console.log(`[${r.status}] ${r.name} (${r.itemCount || 0} items) -> ${r.url}`);
    if (r.error) console.log(`   Error: ${r.error}`);
  }
}

run();

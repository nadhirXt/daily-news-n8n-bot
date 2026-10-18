const fs = require('fs');
const path = require('path');

const testSuite = JSON.parse(fs.readFileSync(path.join(__dirname, '../tests/sample-articles.json'), 'utf8'));

function normalizeTextForComparison(text) {
  if (!text) return '';
  return text.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
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
  // Match numbers, decimals, percentages, monetary amounts (e.g. 45, 3.25, 500, 25%)
  const matches = text.match(/\b\d+(?:[.,]\d+)?%?\b/g) || [];
  // Normalize e.g. "45%" -> "45" and "3,25" -> "3.25"
  return matches.map(m => m.replace('%', '').replace(',', '.'));
}

function validateItem(item, articlesMap) {
  const rejectedReasons = [];

  // 1. Rejette tout article_id absent de l'entrée
  if (!item.article_ids || !Array.isArray(item.article_ids) || item.article_ids.length === 0) {
    return { valid: false, reason: "Aucun article_id fourni" };
  }

  const citedArticles = [];
  for (const id of item.article_ids) {
    if (!articlesMap[id]) {
      return { valid: false, reason: `Article ID '${id}' absent de l'entrée RSS` };
    }
    citedArticles.push(articlesMap[id]);
  }

  // 2. Vérification de la preuve verbatim
  const rawProof = (item.preuve || '').trim();
  const normProof = normalizeTextForComparison(rawProof);

  if (normProof.length < 10) {
    return { valid: false, reason: `Preuve trop courte (< 10 caractères normalisés) : '${rawProof}'` };
  }

  const proofWords = rawProof.split(/\s+/).filter(w => w.length > 0);
  if (proofWords.length > 15) {
    return { valid: false, reason: `Preuve dépasse 15 mots (${proofWords.length} mots) : '${rawProof}'` };
  }

  let proofFound = false;
  for (const art of citedArticles) {
    const normSourceText = normalizeTextForComparison(art.titre + ' ' + (art.texte || ''));
    if (normSourceText.includes(normProof)) {
      proofFound = true;
      break;
    }
  }

  if (!proofFound) {
    return { valid: false, reason: `Preuve non trouvée textuellement dans les sources citées : '${rawProof}'` };
  }

  // 3. Contrôle des chiffres (titre et résumé)
  const numbersInOutput = extractNumbers((item.titre || '') + ' ' + (item.resume || ''));
  const sourceNumbers = new Set();
  for (const art of citedArticles) {
    const nums = extractNumbers((art.titre || '') + ' ' + (art.texte || ''));
    nums.forEach(n => sourceNumbers.add(n));
  }

  for (const num of numbersInOutput) {
    if (!sourceNumbers.has(num)) {
      return { valid: false, reason: `Chiffre non présent dans les sources citées : '${num}'` };
    }
  }

  // 4. Reconstruction sécurisée des liens et sources
  const reconstructedSources = citedArticles.map(art => ({
    source: art.source,
    link: art.link,
    title: art.titre,
    tier: art.tier
  }));

  // 5. Calcul du niveau de confirmation
  const uniqueSources = new Set(reconstructedSources.map(s => s.source));
  const confirmation = uniqueSources.size >= 2
    ? `Confirmé par ${uniqueSources.size} sources`
    : `Source unique (${citedArticles[0].source})`;

  // 6. Échappement HTML sécurisé
  const sanitizedTitle = escapeHtml(item.titre);
  const sanitizedResume = escapeHtml(item.resume);

  return {
    valid: true,
    item: {
      titre: sanitizedTitle,
      resume: sanitizedResume,
      nature: item.nature || 'fait_rapporte',
      confirmation: confirmation,
      sources: reconstructedSources,
      article_ids: item.article_ids,
      preuve_verbatim: item.preuve
    }
  };
}

// RUN TESTS
console.log('=== TEST 1 : SORTIE VALIDE STANDARD ===');
const articlesMap = {};
testSuite.source_articles.forEach(a => { articlesMap[a.id] = a; });

const validCategories = testSuite.gemini_test_outputs.valid_output.categories;
for (const cat of validCategories) {
  for (const item of cat.items) {
    const res = validateItem(item, articlesMap);
    console.log(`Catégorie [${cat.name}] - "${item.titre}" -> Valide: ${res.valid}`);
    if (!res.valid) console.error(`   Erreur inattendue : ${res.reason}`);
    else console.log(`   Confirmation: ${res.item.confirmation}, Sources: ${res.item.sources.length}`);
  }
}

console.log('\n=== TEST 2 : PIÈGES ADVERSARIAUX ===');
let trapsPassed = 0;
for (const trap of testSuite.gemini_test_outputs.trapped_outputs) {
  const res = validateItem(trap.item, articlesMap);
  if (trap.expected_result === 'rejected') {
    if (!res.valid) {
      console.log(`✅ [SUCCÈS] ${trap.test_name} -> REJETÉ correctement : "${res.reason}"`);
      trapsPassed++;
    } else {
      console.error(`❌ [ÉCHEC] ${trap.test_name} -> n'a pas été rejeté !`);
    }
  } else if (trap.expected_result === 'sanitized') {
    if (res.valid && res.item.titre.includes('&lt;script&gt;') && res.item.titre.includes('&amp;')) {
      console.log(`✅ [SUCCÈS] ${trap.test_name} -> NETTOYÉ/ÉCHAPPÉ correctement : "${res.item.titre}"`);
      trapsPassed++;
    } else {
      console.error(`❌ [ÉCHEC] ${trap.test_name} -> Échappement HTML incorrect : ${res.item ? res.item.titre : res.reason}`);
    }
  }
}

console.log(`\nBilan des tests adversariaux : ${trapsPassed} / ${testSuite.gemini_test_outputs.trapped_outputs.length} réussis à 100%`);

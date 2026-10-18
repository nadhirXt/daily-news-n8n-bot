# Guide d'Initiation & Développement — `daily-news-n8n-bot`

Ce guide s'adresse aux développeurs et créateurs souhaitant comprendre, modifier ou déployer le bot d'actualités autonome.

---

## 1. 🏗️ Architecture Détaillée du Système

Le projet repose sur une chaîne en 6 étapes séquentielles garantissant une fiabilité absolue :

```
[1. Déclenchement] ⏰ Schedule Trigger (07:00 Africa/Algiers) ou Webhook manuel
       ↓
[2. Collecte RSS]  📡 16 flux RSS certifiés interrogés en parallèle
       ↓
[3. Normalisation] 🧹 Filtrage temporel (<24h), anti-redite 14j & dédoublonnage titre (Jaccard >= 0.60)
       ↓
[4. Synthèse IA]   🤖 Google Gemini 3.8 Flash (JSON Schema strict, quotas par catégorie)
       ↓
[5. Validation]    🛡️ Contrôle Verbatim (≤15 mots dans la source) & vérification stricte des chiffres
       ↓
[6. Distribution]  💬 Bot Telegram direct en privé aux abonnés (ou canal de diffusion)
```

---

## 2. 🚀 Lancement Local Rapide (Docker)

Le fichier [`docker-compose.yml`](../docker-compose.yml) permet de démarrer une instance n8n prête à l'emploi :

```bash
# 1. Cloner et configurer l'environnement
cp .env.example .env

# 2. Lancer n8n
docker compose up -d

# 3. Ouvrir l'interface
# Accédez à http://localhost:5678 dans votre navigateur
```

### Import du Workflow dans n8n :
1. Dans n8n, créez un nouveau workflow.
2. Cliquez sur les **3 petits points** en haut à droite `...` -> **Import from File**.
3. Sélectionnez le fichier [`workflows/news-pipeline.json`](../workflows/news-pipeline.json).
4. Configurez vos 2 credentials :
   - `Gemini API Key` : Type `Header Auth` (`Name: x-goog-api-key`, `Value: VOTRE_CLE_GEMINI`).
   - `Telegram account` : Token obtenu auprès de `@BotFather`.

---

## 3. 📡 Ajouter ou Modifier une Source RSS

Les sources sont définies dans le nœud n8n **"Liste Flux RSS"** (type JavaScript).

Chaque flux est un objet respectant ce schéma :
```javascript
{
  "id": "reuters_tech",                     // Identifiant unique
  "name": "Reuters Technology",            // Nom public affiché
  "tier": 2,                               // 1: Officiel/Gros lab, 2: Agence majeure, 3: Presse spécialisée
  "type": "reportage",                     // "annonce_entreprise" | "donnees_officielles" | "reportage" | "analyse"
  "defaultCat": "tech",                    // "ia" | "economie" | "tech"
  "url": "https://feeds.reuters.com/tech"  // URL directe du flux RSS
}
```

### Tester vos flux en ligne de commande :
Avant d'ajouter un flux dans le workflow, vérifiez sa validité avec le script fourni :
```bash
node scripts/test_feeds.js
```

---

## 4. 🛡️ Algorithme Anti-Hallucination : Comment ça marche ?

Le cœur de ce bot est le nœud **"Valider & Reconstruire"**. Il empêche toute invention de fait ou de chiffre par le LLM via 3 verrous :

1. **Mapping d'IDs RSS strict** : Gemini reçoit les articles taggés (`A001`, `A002`, ...). Il doit obligatoirement citer les `article_ids` réels. Si un ID inventé apparaît, l'item est rejeté.
2. **Preuve Verbatim (≤ 15 mots)** : Pour chaque actualité, Gemini doit extraire une phrase mot pour mot du texte source. Le nœud normalise la casse et les accents, puis vérifie que cette sous-chaîne existe textuellement dans l'article source.
3. **Contrôle d'intégrité des chiffres** : Une expression régulière extrait tous les nombres, pourcentages et montants générés par le LLM. Si un chiffre présent dans le résumé ne figure pas dans le texte brut de la source, l'article est bloqué.
4. **Reconstruction sécurisée des liens** : Le LLM ne génère **jamais d'URL** (pour éviter les liens morts ou inventés). C'est le nœud de validation qui reconstruit les liens directement depuis le mapping RSS authentique.

---

## 5. 🤖 Changer de Modèle d'IA (Claude, GPT-4o, Mistral)

Par défaut, le workflow utilise l'API standard Google Gemini 3.8 Flash via le nœud HTTP Request.

Pour basculer sur un autre modèle :
- **Claude 3.5 Sonnet / Haiku** : Modifiez l'URL du nœud vers `https://api.anthropic.com/v1/messages` avec l'en-tête `x-api-key`.
- **OpenAI GPT-4o / GPT-4o-mini** : Pointez vers `https://api.openai.com/v1/chat/completions` avec `response_format: { type: "json_object" }`.
- **Ollama (Modèle Local)** : Pointez vers `http://localhost:11434/api/chat` (zéro coût API).

---

## 6. 🧪 Exécuter un Test Manuel en 5 Secondes

Pour tester le bot sans attendre l'heure programmée (07:00) :

```bash
# Déclencher le webhook de test (workflow actif)
curl -X GET https://VOTRE_INSTANCE_N8N/webhook/news-pipeline-test
```

Le script complet de test avec suivi en direct est disponible dans :
```bash
node scripts/run_phase3_live.js
```


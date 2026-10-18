# Guide de Contribution — Daily News Bot (`daily-news-n8n-bot`)

Merci de vous intéresser à l'amélioration de **daily-news-n8n-bot** ! 🚀

Ce projet vise à fournir une solution d'automatisation d'actualités 100% fiable, sans hallucination LLM et facile à héberger sur n8n.

---

## 🛠️ Règles de Contribution

### 1. Proposer un Nouveau Flux RSS
Pour être accepté, un nouveau flux RSS doit respecter les critères suivants :
- **Validité HTTP** : Répondre en code HTTP `200` avec un temps de réponse < 2 secondes.
- **Format standard** : Fournir un flux RSS/Atom valide avec balises standard (`title`, `link`, `pubDate` ou `isoDate`, `contentSnippet`).
- **Pas de paywall bloquant** : L'article et son résumé doivent être lisibles pour les abonnés.
- **Classification** : Attribuer un niveau de fiabilité (`tier 1` = source officielle/entreprise, `tier 2` = agence/média de référence, `tier 3` = média spécialisé).

### 2. Procédure pour Soumettre une Modification
1. **Forker** le dépôt sur votre compte GitHub.
2. **Créer une branche descriptive** :
   ```bash
   git checkout -b feature/nouveau-flux-reuters
   ```
3. **Tester localement vos modifications** :
   ```bash
   node scripts/test_feeds.js
   node scripts/test_validator.js
   ```
4. **Commiter avec des messages clairs (Conventional Commits)** :
   ```bash
   git commit -m "feat(feeds): ajout du flux Reuters Technology"
   ```
5. **Ouvrir une Pull Request** avec une capture ou les logs d'exécution prouvant la validation.

---

## 🧪 Tests et Validation

Avant toute soumission de PR, assurez-vous que les tests automatisés passent :

| Commande | Objectif |
|---|---|
| `node scripts/test_feeds.js` | Vérifie la joignabilité et la fraîcheur des 16 flux RSS |
| `node scripts/test_normalizer.js` | Valide le dédoublonnage (overlap de titres >= 60%) |
| `node scripts/test_validator.js` | Teste le filtre anti-hallucination verbatim (règle des 15 mots) |

---

## 💡 Idées de Contributions Bienvenues
- Ajout de nouvelles catégories (ex: Cybersécurité, Biotech, Climat).
- Support d'autres canaux de sortie (Discord, Slack, Newsletter email HTML).
- Intégration de modèles open-source locaux via Ollama (ex: Mistral NeMo, Llama 3.1).


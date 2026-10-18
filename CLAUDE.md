# Directives Permanentes — News Automation n8n & Gemini

## 1. Sécurité et Secrets
- **Zéro secret en clair** dans les dépôts, fichiers, logs ou paramètres de nœuds.
- Utiliser exclusivement les credentials configurés dans n8n (`Gemini API Key`, `Telegram account 2` / `Telegram account`).
- Configurer les paramètres dynamiques via le nœud `Config` (Set/Edit Fields) sans faire appel à `$env`.

## 2. MCP n8n & Cycle de Vie
- Construire les workflows directement dans n8n via les outils MCP n8n (`n8n_create_workflow`, `n8n_update_full_workflow`, `validate_workflow`).
- Toujours inspecter un nœud avec `get_node` (detail: "standard") ou la doc officielle avant configuration.
- Valider systématiquement l'intégrité structurelle avant déploiement.
- Exécuter les tests en mode manuel (`n8n_test_workflow` ou via webhook de test).

## 3. Anti-Hallucination & Pipeline Éditorial (Gemini Flash)
- **Modèle stable** : `gemini-2.5-flash` via HTTP Request ou nœud natif, température 0 à 0.2.
- **Zéro grounding externe** : aucun outil de recherche (Google Search) dans le workflow, strict traitement des textes fournis.
- **Schéma JSON strict** : imposition de `responseMimeType: "application/json"` et `responseSchema`.
- **Aucune URL manipulée par le LLM** : le modèle manipule uniquement des `article_ids` (`A001`, `A002`, ...). Reconstruction exclusive des URLs depuis les flux RSS originaux.
- **Vérification Verbatim** : champ `preuve` extrait mot pour mot (≤ 15 mots), vérifié par comparaison normalisée (minuscules, sans accents ni ponctuation, ≥ 10 caractères).
- **Contrôle des Chiffres** : tout nombre, pourcentage ou montant dans le titre ou résumé généré doit être présent dans les articles sources cités, sinon rejet immédiat.
- **Nature éditoriale** : attribution obligatoire des faits (`fait_rapporte`, `annonce_entreprise`, `analyse`).

## 4. Format & Publication Telegram
- Messages HTML bien formés, échappement obligatoire des caractères réservés (`&`, `<`, `>`).
- Découpage strict < 4096 caractères aux frontières logiques (catégories/items).
- Désactivation des aperçus de liens (`disable_web_page_preview: true`).
- Lien direct « Lire l'article » pour chaque actualité.
- Idempotence garantie : enregistrement dans la table `news_sent` pour éviter tout doublon sur 14 jours.

# Rapport Final : Pipeline n8n de Synthèse Éditoriale Quotidienne

---

## 1. Sources Remplacées & Justifications

Par rapport aux sources explorées lors de la conception initiale :

1. **CNBC World / Top News** : Remplacé par **MarketWatch Top Stories** (`https://feeds.content.dowjones.io/public/rss/mw_topstories`).
   - *Raison :* Le serveur de CNBC bloque les requêtes automatisées serveur avec une erreur HTTP `403 Forbidden` (protection Cloudflare). MarketWatch fournit un flux direct, temps réel, 100% fiable et sans blocage.
2. **NPR News** : Remplacé par **France 24 Éco-Tech** (`https://www.france24.com/fr/%C3%A9co-tech/rss`) pour renforcer la couverture francophone de qualité en Économie et Tech.
3. **Al Jazeera** : Remplacé par **DW Business** (`https://rss.dw.com/rdf/rss-en-bus`) pour se concentrer sur l'économie internationale et respecter le périmètre thématique strict (IA, Économie, Tech).
4. **Flux Primaires IA Ajoutés (Tier 1)** : Intégration directe des flux officiels de **Google Research**, **OpenAI Blog**, **NVIDIA Blog** et **Hugging Face Blog** pour garantir une détection immédiate des annonces majeures à la source.

---

## 2. Hypothèses Retenues (Formats de Sortie & Quotas)

1. **Quotas & Équilibre thématique :**
   - Quota cible : ~10 actualités par jour (maximum 12 pour rester agréable à lire sur mobile).
   - Répartition : ~40% Intelligence Artificielle (priorité absolue du prompt), ~35% Économie mondiale, ~25% Technologies générales.
   - Seuil de viabilité : minimum 2 actualités par catégorie. En deçà, une alerte admin est déclenchée pour éviter de publier un bulletin indigent.
2. **Format des synthèses éditoriales :**
   - Titre factuel en français.
   - Résumé en 2 phrases neutres sans adjectif sensationnaliste, avec mention de la nature du fait (`annonce d'entreprise`, `données officielles`, `fait rapporté`, `analyse`).
   - Indication claire du niveau de confirmation (`Confirmé par l'entreprise`, `Chiffres officiels`, etc.).
   - Preuve verbatim obligatoire extraite textuellement du flux RSS (contrôlée par code avant publication).
   - Liens cliquables « Lire l'article (Source) » reconstruits à 100% depuis les flux RSS (le LLM ne manipule que des IDs `art_X`).
3. **Découpage Telegram :**
   - Limite de sécurité fixée à **3 800 caractères** (pour la limite stricte de 4 096 de Telegram).
   - Découpage réalisé uniquement aux frontières logiques de catégories pour ne jamais couper un texte en plein paragraphe.
   - Désactivation de l'aperçu de liens (`disable_web_page_preview: true`) pour garder le canal épuré.

---

## 3. Limites Connues de la Solution

1. **Dépendance au contenu des flux RSS :** Le pipeline exploite les titres et descriptions fournis dans les flux RSS. Si une source ne fournit qu'une description très brève (ex. moins de 20 mots), le LLM s'appuie strictement sur ce texte pour extraire sa preuve verbatim sans extrapoler.
2. **Fenêtre temporelle stricte (< 24h) :** Le filtre exclut tout article datant de plus de 24h. Le week-end ou lors des jours fériés où les publications officielles sont rares, le quota minimal peut déclencher une alerte de sécurité.
3. **Limites de débit Google Gemini Free Tier :** L'API Gemini Flash possède une limite de requêtes par minute (RPM). Le workflow effectue un appel unique groupé par exécution quotidienne, évitant tout risque de dépassement en fonctionnement normal.

---

## 4. Les 3 Vérifications Manuelles Avant Activation Permanente

Avant de basculer le workflow sur **Active** en production :

1. **Vérification du Chat ID Telegram dans le nœud `Config` :**
   - Ouvrir le nœud `Config` (ID: `config`) dans n8n.
   - Vérifier que `telegram_chat_id` correspond bien à votre canal ou groupe de diffusion cible (actuellement initialisé sur votre ID `-1003260511417`).
2. **Vérification de l'administrateur du bot :**
   - Dans Telegram, vérifier que votre Bot est bien membre administrateur du canal avec l'autorisation de **Publier des messages** (*Post Messages*).
3. **Test d'envoi unitaire :**
   - Dans l'éditeur n8n, cliquer sur le nœud `Manual Trigger` puis sur le bouton **Test workflow** pour valider visuellement la réception du message test sur Telegram.

# Kit de Lancement LinkedIn — `daily-news-n8n-bot`

Ce document contient le texte prêt à copier-coller pour votre publication LinkedIn, optimisé pour l'engagement de la communauté tech, IA et automatisation.

---

## 📌 Post LinkedIn (Prêt à publier)

### ✍️ Texte à copier :

90% des bots de veille IA commettent la même erreur critique : **ils hallucinent.** 🤖❌

Quand on demande à un LLM de résumer 50 articles d'actualités par jour :
- Il invente des liens 404
- Il déforme les chiffres de levées de fonds ou de taux directeurs
- Il mélange les dates et les déclarations d'entreprises

Pour régler définitivement ce problème, j'ai conçu un pipeline 100% autonome et vérifiable avec **n8n** et **Google Gemini 3.8 Flash**.

Et aujourd'hui, j'ai décidé de rendre l'intégralité du code **Open Source** sur GitHub ! 🚀

---

### ⚙️ Comment fonctionne l'architecture ?

1️⃣ **Collecte en parallèle** : 16 flux RSS certifiés (OpenAI, Google Research, NVIDIA, BCE, Fed, Le Monde, TechCrunch...).
2️⃣ **Nettoyage & Dédoublonnage** : Filtrage strict (< 24h), anti-redite sur 14 jours et suppression des doublons par similarité de titres (Jaccard ≥ 60%).
3️⃣ **Génération Structurée** : Gemini 3.8 Flash analyse les sources et produit un JSON contraint par schéma avec des quotas précis par catégorie (IA, Éco, Tech).
4️⃣ **Contrôle Anti-Hallucination "Verbatim"** :
   - Le LLM a interdiction de générer des URLs (elles sont réinjectées en dur par n8n).
   - Pour chaque fait, le LLM doit fournir une "preuve mot pour mot" (≤ 15 mots). Si la phrase n'existe pas textuellement dans l'article source, l'article est rejeté.
   - Tous les chiffres générés sont audités et comparés au texte source.
5️⃣ **Distribution Directe sur Telegram** :
   Chaque abonné reçoit son briefing quotidien en message privé à 07:00, avec commandes interactives (/actualites, /stats, /filter_ia).

---

### 💡 Pourquoi c'est utile ?
- Zéro abonnement payant pour des outils de veille coûteux.
- 100% auto-hébergeable sur n8n (Docker en 1 commande).
- Une information vérifiée et sourcée avant votre premier café ☕.

🔗 **Le projet complet est disponible gratuitement sur GitHub :**
👉 https://github.com/nadhirXt/daily-news-n8n-bot

*(Le lien est aussi en premier commentaire)*

Si vous testez le bot ou appréciez le projet, une petite étoile ⭐ sur le repo fait toujours plaisir !

Quelle est votre méthode actuelle pour filtrer l'infobésité sans y passer 2 heures chaque matin ? Discutons-en en commentaires ! 👇

---

### 🏷️ Hashtags à ajouter :
#IntelligenceArtificielle #n8n #OpenSource #Automation #TelegramBot #Tech #Innovation #GeminiAI

---

## 📸 Média conseillé à joindre au post :
- **Option 1 (Idéal)** : Une courte vidéo (15-20s) montrant l'écran scindé : à gauche le workflow n8n qui tourne, à droite le téléphone qui reçoit le message Telegram.
- **Option 2** : Une image haute résolution du schéma d'architecture Mermaid inclus dans le README.


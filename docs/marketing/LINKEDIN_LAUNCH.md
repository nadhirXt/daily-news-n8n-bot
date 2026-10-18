# Kit LinkedIn — Carrousel PDF & Post d'Accompagnement

Ce dossier contient :
1. Le texte brut du post LinkedIn à copier-coller.
2. Le contenu diapositive par diapositive pour votre Carrousel PDF.
3. Le fichier prêt à imprimer en PDF disponible dans [`docs/marketing/linkedin-carousel.html`](linkedin-carousel.html).

---

## 📌 Le Post LinkedIn (Texte d'accompagnement)

### ✍️ Texte à copier :

À 7h du matin, quand le réveil sonne, le premier réflexe de beaucoup d'étudiants, c'est d'attraper leur téléphone et de perdre 20 minutes à scroller sans but.

En tant qu'étudiant à l'École Supérieure de Banque (ESB) et délégué de ma promotion, j'ai cherché une alternative utile pour mes camarades : remplacer ce scroll passif par un vrai briefing économique et technologique, directement digéré et prêt à être lu en une minute.

Pour éviter de faire le tour de 20 sites chaque matin, j'ai monté un bot autonome avec n8n et Google Gemini 3.8 Flash.

Le fonctionnement en 4 points :
1. **16 sources officielles interrogées à l'aube** : BCE, Réserve Fédérale, Le Monde Éco, TechCrunch, etc.
2. **Zéro hallucination** : Le modèle n'a pas le droit d'inventer des liens (ils sont réinjectés depuis le flux RSS) et doit fournir une preuve mot pour mot (≤ 15 mots) pour chaque chiffre ou fait cité.
3. **Livraison à 7h pile** : Chaque étudiant inscrit reçoit son résumé en message privé sur Telegram, avec des filtres par catégorie (/filter_ia, /filter_eco, /filter_tech).
4. **Pensé pour la communauté** : Conçu au départ pour ma promo, le bot est désormais accessible à toute l'ESB et aux étudiants d'autres universités.

Prochaine étape : adapter ce pipeline pour diffuser ces synthèses visuelles directement sur Instagram, le réseau où les étudiants passent le plus de temps.

Le projet est 100% open-source, documenté et prêt à tourner avec Docker :
👉 https://github.com/nadhirXt/daily-news-n8n-bot

*(Le détail du projet et les captures d'écran de n8n et Telegram sont résumés dans le document ci-dessous 📄)*

---

## 📄 Structure du Carrousel PDF (5 Pages)

Vous pouvez générer ce document directement en ouvrant [`docs/marketing/linkedin-carousel.html`](linkedin-carousel.html) dans votre navigateur puis en faisant `Ctrl + P` (Imprimer en PDF).

### Page 1 : Couverture
- **Gros Titre** : 7h00 : Remplacer le scroll du matin par l'essentiel de l'actu.
- **Sous-titre** : Comment j'ai automatisé une veille macro-économique & IA pour ma promotion à l'ESB.
- **Visuel** : Icône réveil + capture de notification Telegram épurée.
- **Signature** : Mohamed Nadhir Benelhadj · Étudiant ESB & Développeur.

### Page 2 : Le Constat de Promo
- **Titre** : Le point de départ : la vie d'étudiant en banque.
- **Constat 1** : En finance et en économie, suivre l'actualité des banques centrales et des marchés est obligatoire pour nos cours.
- **Constat 2** : Personne n'a 45 minutes chaque matin pour éplucher 15 newsletters et 20 sites différents.
- **Objectif** : Un résumé fiable, vérifié et sans pub, délivré à l'heure exacte du réveil.

### Page 3 : L'Usine n8n & Le Contrôle Anti-Hallucination
- **Titre** : Sous le capot : n8n + Gemini 3.8 Flash.
- **Capture d'écran** : Le workflow n8n en action avec ses 16 flux RSS.
- **La règle clé** : Pourquoi ce bot n'invente rien ?
  - Règle de la preuve verbatim : Gemini doit extraire une phrase exacte de la source.
  - Audit des chiffres : tout nombre absent du texte d'origine entraîne le rejet de l'article.
  - Reconstruction des liens par n8n (aucune URL générée par l'IA).

### Page 4 : L'Expérience sur Telegram
- **Titre** : Réception directe en message privé.
- **Capture d'écran** : Capture de l'application Telegram montrant le briefing reçu à 07:00.
- **Fonctionnalités** :
  - Découpage propre par catégorie (IA, Économie, Tech).
  - Boutons interactifs pour filtrer selon ses centres d'intérêt.
  - Zéro canal encombrant : interaction individuelle en privé.

### Page 5 : Open Source & Suite du Projet
- **Titre** : 100% Open Source & Prochaine étape : Instagram.
- **Points clés** :
  - Code disponible sur GitHub avec configuration Docker en 1 ligne.
  - Ouvert à tous les étudiants de l'ESB et des autres écoles/universités.
  - En cours : extension du pipeline vers **Instagram** pour rendre l'information encore plus accessible aux étudiants.
- **Lien** : github.com/nadhirXt/daily-news-n8n-bot

# Post LinkedIn — `daily-news-n8n-bot`

Texte brut et naturel, prêt à être publié sans retouche.

---

### Texte du post :

Je voulais recevoir chaque matin à 7h un résumé fiable de l'actualité économique, bancaire et IA sur Telegram, sans devoir éplucher 20 sites différents avant de commencer ma journée.

Le problème récurrent quand on automatise de la veille avec un LLM, c'est l'exactitude : le modèle a vite tendance à arrondir ou déformer un chiffre (taux directeurs, levées de fonds) ou à inventer des liens qui renvoient vers des erreurs 404.

Pour régler ça, j'ai monté un workflow sur n8n avec Google Gemini 3.8 Flash, en ajoutant une couche de validation stricte en JavaScript :

- **Sources vérifiées** : 16 flux RSS officiels interrogés en parallèle (BCE, Réserve Fédérale, Le Monde Éco, TechCrunch, etc.).
- **Zéro lien inventé** : Le LLM n'a pas le droit de générer d'URL. Tous les liens sont réinjectés directement depuis le flux RSS d'origine.
- **Preuve mot pour mot** : Pour chaque actu, le modèle doit extraire une phrase de moins de 15 mots présente telle quelle dans l'article source. Si la phrase ou les chiffres cités ne figurent pas textuellement dans la source, l'actualité est bloquée.
- **Réception privée** : Le bot m'envoie le résumé chaque matin en message privé sur Telegram, avec des filtres par catégorie (/filter_ia, /filter_eco, /filter_tech).

J'ai mis l'ensemble du workflow et la configuration Docker en open source sur GitHub si vous voulez le tester ou l'adapter à vos propres flux :

👉 https://github.com/nadhirXt/daily-news-n8n-bot

Vos retours ou idées de flux à ajouter sont les bienvenus.

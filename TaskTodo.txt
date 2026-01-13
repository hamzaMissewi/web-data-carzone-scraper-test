Vous devez développer un crawler capable de parcourir le site suivant :
www.carzone.ie

Vous devez : 
Crawler 200 pages issues des pages liste du site sélectionné "https://www.carzone.ie".
Enregistrer chaque page en HTML brut dans un dossier local.
Être entièrement exécutable via un Dockerfile.
Contraintes techniques
Le Dockerfile doit permettre de définir dynamiquement une URL de proxy (via une variable d’environnement ou un argument).
Une fois l’image construite et le conteneur lancé, l’exécution doit automatiquement :
Utiliser le proxy spécifié ;
Crawler les 200 pages ;
Stocker les fichiers HTML dans un dossier local monté depuis l’hôte.

Livrable attendu
Un Dockerfile fonctionnel capable de lancer le crawler et d’exporter les 200 pages HTML dans un répertoire local.

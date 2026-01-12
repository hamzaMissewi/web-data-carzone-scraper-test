from curl_cffi import requests
from bs4 import BeautifulSoup
import time
import os
import sys
from urllib.parse import urljoin, urlparse
import logging

# Configuration du logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class CarZoneCrawler:
    def __init__(self, base_url, output_dir, proxy_url=None, max_pages=200):
        self.base_url = base_url
        self.output_dir = output_dir
        self.max_pages = max_pages
        self.visited_urls = set()
        self.pages_saved = 0
        
        # Initialisation de la session curl_cffi
        # curl_cffi simule l'empreinte TLS d'un vrai navigateur (Chrome)
        self.session = requests.Session()
        
        # Configuration du proxy
        self.proxies = None
        if proxy_url:
            self.proxies = {
                'http': proxy_url,
                'https': proxy_url
            }
            logger.info(f"Proxy configuré: {proxy_url}")
        
        # Création du dossier de sortie
        os.makedirs(output_dir, exist_ok=True)
    
    def get_page(self, url):
        """Récupère le contenu d'une page"""
        try:
            # Utilisation de curl_cffi avec l'impersonation Chrome
            response = self.session.get(
                url, 
                impersonate="chrome",
                proxies=self.proxies,
                timeout=30
            )
            
            # Vérification du statut
            # Note: curl_cffi ne lève pas toujours d'exception sur 403 comme requests.raise_for_status() par défaut,
            # mais on peut vérifier le status_code
            if response.status_code != 200:
                logger.error(f"Erreur HTTP {response.status_code} pour {url}")
                # Petit délai après une erreur pour être respectueux du serveur
                time.sleep(3)
                return None
                
            return response.text
        except Exception as e:
            logger.error(f"Erreur lors de la récupération de {url}: {e}")
            return None
    
    def save_page(self, url, html_content):
        """Sauvegarde le contenu HTML d'une page"""
        # Génère un nom de fichier unique basé sur l'URL
        filename = f"page_{self.pages_saved + 1:04d}.html"
        filepath = os.path.join(self.output_dir, filename)
        
        try:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(html_content)
            
            # Sauvegarde aussi l'URL correspondante
            meta_file = os.path.join(self.output_dir, f"page_{self.pages_saved + 1:04d}_url.txt")
            with open(meta_file, 'w', encoding='utf-8') as f:
                f.write(url)
            
            self.pages_saved += 1
            logger.info(f"Page {self.pages_saved}/{self.max_pages} sauvegardée: {filename}")
            return True
        except Exception as e:
            logger.error(f"Erreur lors de la sauvegarde de {url}: {e}")
            return False
    
    def is_valid_carzone_url(self, url):
        """Valide qu'une URL appartient bien au domaine carzone.ie"""
        try:
            parsed = urlparse(url)
            # Vérifie que c'est bien carzone.ie et que c'est HTTPS
            return (parsed.netloc == 'www.carzone.ie' or parsed.netloc == 'carzone.ie') and \
                   parsed.scheme in ['http', 'https']
        except Exception as e:
            logger.warning(f"URL invalide: {url} - {e}")
            return False
    
    def extract_car_listing_urls(self, html_content, base_url):
        """Extrait les URLs des annonces de voitures"""
        soup = BeautifulSoup(html_content, 'lxml')
        urls = set()
        
        # Recherche des liens vers les annonces individuelles
        for link in soup.find_all('a', href=True):
            href = link['href']
            full_url = urljoin(base_url, href)
            
            # Validation de l'URL avec urlparse
            if not self.is_valid_carzone_url(full_url):
                continue
            
            # Filtre pour ne garder que les URLs d'annonces de voitures
            if '/car/' in full_url or '/advert/' in full_url:
                urls.add(full_url)
        
        return list(urls)
    
    def get_listing_pages(self):
        """Récupère les URLs des pages de liste"""
        listing_urls = []
        
        # Page principale de recherche
        search_url = "https://www.carzone.ie/used-cars"
        
        # Parcourt plusieurs pages de résultats
        for page_num in range(1, 40):  # Augmenté la plage pour être sûr d'avoir assez d'annonces
            if page_num == 1:
                url = search_url
            else:
                url = f"{search_url}?page={page_num}"
            
            listing_urls.append(url)
            
            if len(listing_urls) >= 35:  # Limite de sécurité
                break
        
        return listing_urls
    
    def crawl(self):
        """Lance le crawling"""
        logger.info(f"Début du crawling de {self.base_url}")
        logger.info(f"Objectif: {self.max_pages} pages")
        
        # Récupère les pages de liste
        listing_pages = self.get_listing_pages()
        logger.info(f"Pages de liste à parcourir: {len(listing_pages)}")
        
        car_urls = []
        
        # Parcourt les pages de liste pour extraire les URLs des annonces
        for list_url in listing_pages:
            if self.pages_saved >= self.max_pages:
                break
            
            logger.info(f"Parcours de la page liste: {list_url}")
            html = self.get_page(list_url)
            
            if html:
                urls = self.extract_car_listing_urls(html, list_url)
                car_urls.extend(urls)
                logger.info(f"URLs d'annonces trouvées: {len(urls)}")
            else:
                logger.warning(f"Impossible de lire la page liste {list_url}, passage à la suivante...")
            
            # Délai aléatoire pour simuler un humain
            time.sleep(2) 
        
        # Déduplique les URLs
        car_urls = list(set(car_urls))
        logger.info(f"Total d'annonces uniques trouvées: {len(car_urls)}")
        
        # Vérification qu'on a bien trouvé des annonces
        if not car_urls:
            logger.error("Aucune annonce trouvée! Vérifiez la structure du site ou la connectivité.")
            return
        
        # Crawl les pages d'annonces individuelles
        for url in car_urls:
            if self.pages_saved >= self.max_pages:
                break
            
            if url in self.visited_urls:
                continue
            
            html = self.get_page(url)
            if html:
                self.save_page(url, html)
                self.visited_urls.add(url)
            else:
                logger.warning(f"Échec répété pour {url}")
            
            # Délai entre les requêtes pour être respectueux
            time.sleep(1.5)
        
        logger.info(f"Crawling terminé. {self.pages_saved} pages sauvegardées.")
        
        # Crée un fichier de résumé
        summary_file = os.path.join(self.output_dir, "crawl_summary.txt")
        with open(summary_file, 'w', encoding='utf-8') as f:
            f.write(f"Crawl Summary\n")
            f.write(f"=============\n")
            f.write(f"Base URL: {self.base_url}\n")
            f.write(f"Pages saved: {self.pages_saved}\n")
            f.write(f"Target: {self.max_pages}\n")
            f.write(f"Proxy used: {self.proxies is not None}\n")

def main():
    # REQUIREMENT: Le Dockerfile doit permettre de définir dynamiquement une URL de proxy
    # (via une variable d’environnement)
    proxy_url = os.environ.get('PROXY_URL')

    # output_dir = os.environ.get('OUTPUT_DIR', '/output')
    
    # REQUIREMENT: Stocker les fichiers HTML dans un dossier local monté depuis l’hôte
    # (Default matches Dockerfile VOLUME)
    output_dir = os.environ.get('OUTPUT_DIR', '/app/output')
    
    # REQUIREMENT: Crawler 200 pages (Configurable via env)
    max_pages = int(os.environ.get('MAX_PAGES', '200'))
    
    base_url = os.environ.get('BASE_URL', 'https://www.carzone.ie')
    
    logger.info("=== CarZone.ie Crawler ===")
    logger.info(f"Output directory: {output_dir}")
    logger.info(f"Max pages: {max_pages}")
    logger.info(f"Proxy: {proxy_url if proxy_url else 'None'}")
    
    # Initialise et lance le crawler
    crawler = CarZoneCrawler(
        base_url=base_url,
        output_dir=output_dir,
        proxy_url=proxy_url,
        max_pages=max_pages
    )
    
    try:
        # REQUIREMENT: Une fois ... lancé, l’exécution doit automatiquement Crawler les 200 pages
        crawler.crawl()
        logger.info("Crawler terminé avec succès!")
        sys.exit(0)
    except Exception as e:
        logger.error(f"Erreur fatale: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
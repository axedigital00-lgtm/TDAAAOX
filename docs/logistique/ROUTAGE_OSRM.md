# Routage open source avec OSRM

AXSO calcule les itinéraires avec [OSRM](https://project-osrm.org/) et les données OpenStreetMap. Le serveur doit être auto-hébergé : les positions des livreurs et les adresses des clients ne passent pas par un service public.

## Installer un serveur

Sur un serveur Linux avec Docker (prévoir au moins 8 Go de RAM pour le Cameroun) :

```bash
mkdir osrm && cd osrm
wget https://download.geofabrik.de/africa/cameroon-latest.osm.pbf
docker run -t -v "$PWD:/data" ghcr.io/project-osrm/osrm-backend osrm-extract -p /opt/car.lua /data/cameroon-latest.osm.pbf
docker run -t -v "$PWD:/data" ghcr.io/project-osrm/osrm-backend osrm-partition /data/cameroon-latest.osrm
docker run -t -v "$PWD:/data" ghcr.io/project-osrm/osrm-backend osrm-customize /data/cameroon-latest.osrm
docker run -d --restart unless-stopped -p 127.0.0.1:5000:5000 -v "$PWD:/data" ghcr.io/project-osrm/osrm-backend osrm-routed --algorithm mld /data/cameroon-latest.osrm
```

Exposer le port 5000 derrière un proxy HTTPS avec accès restreint, puis mettre à jour les données chaque semaine.

## Brancher AXSO

Ajouter la variable `ROUTAGE_URL` (par exemple `https://routage.exemple.com`).

Sans cette variable, ou si le serveur ne répond pas en 2,5 secondes, AXSO revient à la distance à vol d'oiseau et n'affiche pas d'heure d'arrivée inventée.

## Limites

OSRM calcule sur le réseau routier, sans trafic en temps réel. La qualité dépend de la couverture OpenStreetMap de chaque ville.

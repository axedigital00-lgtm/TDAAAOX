# AXSO Live Tracking : architecture

## 1. Existant

| Élément | État actuel | Limite |
|---|---|---|
| Envoi GPS | `GeoTracker` dans le navigateur, 5 s en course, 30 s au repos | Pas de file hors ligne ; envoi hors course |
| Réception | `PATCH /api/livreurs/[id]/position`, `POST /api/tracking/[token]` | Pas de validation complète ni d'historique |
| Stockage | Dernière position sur `Livreur` et `Commande.livreurPosition` | Écriture Postgres à chaque point |
| Diffusion | Polling (`useSuivi`), SSE pour notifications et caisse | SSE interroge la base |
| Carte | Leaflet avec tuiles publiques OpenStreetMap | Ces tuiles ne conviennent pas à un trafic de production |
| Routage, ETA, géorepérage | Absents | À construire |

## 2. Transport temps réel

**Choix : Cloudflare Durable Objects avec WebSockets en hibernation, polling en repli.**

- AXSO vise déjà Workers et le plan payant est actif.
- Un objet par course sérialise les positions : ordre, doublons et diffusion sont gérés au même endroit.
- Postgres ne reçoit plus chaque point GPS.

Tant que la production reste sur Vercel, le polling existant continue. Le client passe par une interface unique, donc le changement de transport ne touche pas les écrans.

```text
Téléphone livreur
  │ HTTPS authentifié, lots horodatés
  ▼
Worker /api/geo/positions
  │ valide : session, course active, coordonnées, date, débit
  ▼
Durable Object Course:{id}
  ├─ dernière position + tampon récent
  ├─ géorepérage, anomalies, ETA
  ├─ diffusion WebSocket : marchand, client, société, admin
  └─ écriture groupée vers Postgres (30 à 60 s)
```

Objets : `Course:{id}`, `Flotte:{societeId}`, `Marchand:{tenantId}`, `Tour:{pays}`. Un client ne rejoint un canal qu'avec un jeton court signé par le serveur.

## 3. Carte

Interface `FournisseurCarte` : `afficher`, `marqueurs`, `trace`, `zones`, `grappes`, `couches`.

Interface `FournisseurRoutage` : `itineraire(profil, points)`, `matrice`, `geocoder`.

- Rendu recommandé : **MapLibre GL**, libre, 2D et 3D, chargé uniquement sur les écrans de carte.
- Tuiles et routage : à choisir après un **test sur 30 trajets réels** à Douala et Yaoundé (couverture, qualité d'adresse, coût).
- Profil moto obligatoire dans l'évaluation : un trajet voiture ne représente pas l'accès d'une moto.

## 4. Fréquence GPS

| État | Intervalle cible |
|---|---|
| Course, en mouvement | 5 à 10 s |
| Course, à l'arrêt | 20 à 60 s |
| Réseau faible ou arrière-plan | Adaptatif, envoi différé |
| Hors course | **Aucun envoi** |

Un onglet suspendu ne transmet pas. L'interface doit le dire. Le suivi continu écran éteint exige une application native.

## 5. ETA

Sortie : plage horaire, durée restante, distance restante, confiance, date du calcul.

Cascade : routage avec trafic, puis routage sans trafic, puis historique par zone et véhicule. Sans données suffisantes, l'ETA est **indisponible**. Une précision à la minute n'est jamais affichée quand l'incertitude est forte.

## 6. Géorepérage et anomalies

Contrôles serveur : rayon, seuil de précision GPS, temps de présence, hystérésis, un seul événement par passage.

Un géorepérage **ne prouve jamais** une livraison : la preuve configurée reste obligatoire.

Sévérités : `INFO`, `WARNING`, `HIGH_PRIORITY`, `CRITICAL`. Une déviation ne pénalise jamais automatiquement un livreur ; il peut l'expliquer et toute décision est journalisée.

## 7. Hors ligne

File locale d'événements non sensibles, horodatage d'origine conservé, identifiant unique par point, renvoi avec délai exponentiel, déduplication serveur.

L'interface affiche par exemple : **« Connexion interrompue, dernière position reçue à 14:32 »**. Une position périmée n'est jamais présentée comme en direct.

## 8. Confidentialité

- Consentement explicite et indicateur visible pendant le partage.
- Suivi limité à la course active, arrêt automatique à la fin.
- Client : position visible seulement en phase de livraison, jamais l'historique complet.
- Lien client : jeton non devinable, expiration, révocation.
- Marchand : uniquement ses courses. Société : uniquement sa flotte.
- Historique précis conservé pour une durée configurable, **30 jours proposés**, puis agrégé ou supprimé après validation juridique.
- Tout accès admin à une position est journalisé.

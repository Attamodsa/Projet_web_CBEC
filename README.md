# CampusBook

Application web de réservation de salles — projet de Développement Web (EPITA).

**Dépôt Git :** https://github.com/Attamodsa/Projet_web_CBEC

## Équipe (groupe CBEC)
- **Eduardo COSTA PAULO** : catalogue des salles, recherche et filtrage, compteurs dynamiques
- **Calvin BERNARDO** : formulaire de réservation, détection des conflits, liste et annulation des réservations, localStorage

## Technologies
HTML, CSS, JavaScript natif (aucune bibliothèque ni framework)

## Lancer le prototype
Les scripts sont chargés comme modules (`<script type="module">`) : la page doit être ouverte depuis un serveur local. Un simple double-clic sur `index.html` ne suffit pas.

1. Ouvrir le dossier du projet dans **Visual Studio Code**.
2. Installer l'extension **Live Server** (Ritwick Dey) si besoin.
3. Clic droit sur `index.html` → **Open with Live Server** (ou bouton **Go Live** en bas à droite).
4. Le navigateur s'ouvre sur `http://127.0.0.1:5500/index.html`.

## Arborescence
```
CampusBook/
├── index.html              → catalogue des salles
├── reservation.html        → formulaire de réservation
├── mes-reservations.html   → réservations de l'utilisateur
├── assets/img/             → photos des salles (S01.jpg … S08.jpg)
├── css/
│   ├── base.css            → variables, reset, typographie
│   ├── layout.css          → en-tête, grilles, responsive
│   └── composants.css      → cartes, boutons, formulaires, badges
├── js/
│   ├── data/salles.js      → tableau des 8 salles
│   ├── pages/catalogue.js  → affichage, filtres, tri
│   ├── pages/reservation.js
│   ├── pages/mes-reservations.js
│   └── ui/compteurs.js     → compteur de salles affichées
└── tests/tests.html        → page de tests (étape suivante)
```

## Fonctionnalités
- [x] Catalogue des 8 salles généré en JavaScript (DOM)
- [x] Recherche par nom ou bâtiment
- [x] Filtres : capacité minimale, équipements, bâtiment
- [x] Tri par capacité, nom ou bâtiment
- [x] Compteur du nombre de salles affichées
- [x] Réinitialisation des filtres
- [x] Interface responsive (ordinateur et smartphone)
- [ ] Disponibilité des salles selon la date et le créneau
- [ ] Réservation avec validation et détection des conflits horaires
- [ ] Consultation et annulation des réservations
- [ ] Compteurs de la page « Mes réservations »
- [ ] Conservation des données (localStorage)

---

## Compte rendu — D02

### Fonctionnalités opérationnelles
- **Catalogue dynamique** : les 8 salles proviennent du tableau d'objets `SALLES` (`js/data/salles.js`). Chaque carte est créée avec le DOM à partir d'un `<template>` : aucune carte n'est écrite à la main dans le HTML.
- **Filtres combinables** : recherche texte, capacité minimale, équipements (la salle doit posséder tous les équipements cochés) et bâtiment. Les filtres se cumulent.
- **Compteur** : la phrase « X salles sur 8 » est mise à jour après chaque changement, avec un message lorsqu'aucune salle ne correspond.
- **Tri** des résultats par capacité, nom ou bâtiment.
- **Réinitialisation** : le bouton « Réinitialiser » vide tous les critères et réaffiche les 8 salles.
- **Événements utilisés** : `input` (recherche, capacité), `change` (cases, listes, date, heures, tri), `submit` (bouton « Appliquer », avec `preventDefault()`) et `click` (réinitialisation, onglets). Les résultats s'affichent sans rechargement de la page.
- **Code structuré en fonctions** : `lireCriteres()`, `filtrerSalles()`, `trierSalles()`, `creerCarteSalle()`, `afficherSalles()`, `mettreAJour()`, `reinitialiserFiltres()`.
- **Navigation** fonctionnelle entre les trois pages. Le bouton « Réserver » d'une carte ouvre le formulaire avec la salle (et la date / le créneau, s'ils sont remplis) déjà sélectionnés.
- **Responsive** : mise en page adaptée aux écrans d'ordinateur, de tablette et de smartphone.

### Restant à développer
- Prise en compte de la date et du créneau pour afficher la disponibilité des salles (les champs sont déjà présents dans l'interface ; la case « Uniquement les salles disponibles » est désactivée en attendant).
- Validation complète du formulaire de réservation (règles R1 à R6 du D01) et détection des conflits horaires.
- Enregistrement des réservations dans le `localStorage`.
- Page « Mes réservations » : affichage, onglets, compteurs et annulation.
- Tests automatiques des scénarios T1 à T13 (`tests/tests.html`).

### Tests réalisés
| # | Test | Manipulation | Résultat attendu | Résultat obtenu |
|---|------|--------------|------------------|-----------------|
| 1 | Affichage des 8 salles | Ouvrir `index.html` | 8 cartes, « 8 salles sur 8 » | ✅ Conforme |
| 2 | Filtre par capacité | Capacité minimale : 20 | Lab Von Neumann, Salle Turing, Salle Knuth, Amphi Lovelace | ✅ 4 salles |
| 3 | Filtre par équipement | Cocher « Visioconférence » | Studio Liskov, Salle Hopper, Amphi Lovelace | ✅ 3 salles |
| 4 | Combinaison de filtres | Visioconférence + capacité 10 + bâtiment A | Salle Hopper, Amphi Lovelace | ✅ 2 salles |
| 5 | Réinitialisation | Cliquer sur « Réinitialiser » | Champs vidés, retour aux 8 salles | ✅ Conforme |
| 6 | Aucun résultat | Capacité minimale : 200 | Message « Aucune salle ne correspond… » | ✅ Conforme |
| 7 | Affichage mobile | Écran de 390 px de large | Une carte par ligne, sans défilement horizontal | ✅ Conforme |

### Évolutions par rapport au D01
- **8 salles au lieu de 10** (S09 et S10 retirées), conformément à l'énoncé du D02.
- Le champ « Nombre de participants » du catalogue devient un **filtre de capacité minimale** : les salles trop petites sont masquées au lieu d'être seulement signalées.

## Crédits
Photos des salles : [Unsplash](https://unsplash.com) (licence Unsplash, utilisation libre).

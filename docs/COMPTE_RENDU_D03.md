# CampusBook — Compte rendu D03

Groupe CBEC — Eduardo COSTA PAULO & Calvin BERNARDO
Dépôt Git : https://github.com/Attamodsa/Projet_web_CBEC

## 1. Ce qui a été réalisé

Le D03 met en œuvre la partie « réservation » prévue dans le dossier de conception (D01) : mêmes règles R1 à R7, même organisation des fichiers et mêmes noms de fonctions.

- **Formulaire de réservation fonctionnel** (`reservation.html`) : nom du responsable, e-mail, salle, date, heure de début, heure de fin, nombre de participants, motif et commentaire. Le bouton « Réserver » du catalogue transmet la salle (et la date / le créneau s'ils sont remplis) par l'URL ; la fiche de la salle s'affiche à droite.
- **Contrôles de validation** (`validerReservation()`) : champs obligatoires, R1 horaires 08:00 – 20:00, R2 fin après début et pas de 30 min, R3 durée de 30 min à 3 h, R4 pas de créneau passé, R5 participants entre 1 et la capacité.
- **Messages d'erreur clairs**, comme sur la maquette 2 : toutes les erreurs sont collectées et affichées ensemble dans un récapitulatif en haut (chaque ligne est un lien vers le champ), et le message apparaît sous le champ concerné, qui passe en rouge. Il disparaît dès qu'on corrige le champ.
- **Détection des conflits** (R6, `verifierDisponibilite()`) : même salle, même date, réservation confirmée, horaires qui se chevauchent. Le message indique la réservation qui bloque.
- **Enregistrement** (`creerReservation()`) : relit le stockage, revalide la demande, génère un identifiant unique `R-<timestamp>-<n>`, enregistre, affiche une confirmation, met à jour le planning du jour.
- **Disponibilité** : planning du jour (Libre / Occupé / Demandé / Conflit) et badges « Disponible » / « Occupée 10:00–12:00 » dans le catalogue (`statutSalle()`), case « Uniquement les salles disponibles » active.
- **Mes réservations** : onglets À venir / Passées / Annulées, filtre par salle, compteurs, détails, annulation (R7).
- **Tests** : T1 à T13 du D01 + 16 cas limites, tous réussis (`docs/TESTS_D03.md`).

### Organisation du code (conforme au D01, partie 5)

```
js/utils/temps.js            enMinutes(), enHeure(), seChevauchent(), estPasse()      (CB)
js/services/stockage.js      chargerReservations(), sauvegarderReservations()         (CB)
js/services/reservations.js  verifierCapacite(), verifierDisponibilite(),
                             validerReservation(), creerReservation(),
                             annulerReservation(), reservationsDuJour()               (CB)
js/pages/reservation.js      preRemplirFormulaire(), lireFormulaire(),
                             afficherErreurs(), afficherPlanning()                    (CB)
js/pages/mes-reservations.js afficherReservations(), confirmerAnnulation()            (CB)
js/pages/catalogue.js        statutSalle() → appelle verifierDisponibilite()          (EC ↔ CB)
```

`utils/` et `services/` ne touchent jamais au DOM : ils sont testés directement par `tests/tests.html`. Seul `stockage.js` accède au localStorage.

## 2. Comment le programme détecte un conflit (à savoir expliquer)

1. Les heures sont converties en **minutes depuis minuit** : `10:00` → 600, `12:00` → 720 (`enMinutes()`).
2. On ne compare la demande qu'avec les réservations **de la même salle, à la même date, au statut « confirmee »**. Une réservation annulée ne bloque donc plus rien (R7).
3. Deux créneaux se chevauchent si et seulement si (`seChevauchent()`) :

   ```js
   debutA < finB && debutB < finA
   ```

   Deux créneaux n'ont **aucune** partie commune seulement si l'un finit avant (ou pile quand) l'autre commence : `finA <= debutB` ou `finB <= debutA`. La condition ci-dessus est exactement le contraire.

4. Exemple avec R0 = 10:00 – 12:00 (600 – 720), comme dans le D01 :

| Demande | Situation | `debut < 720` ? | `600 < fin` ? | Résultat |
|---|---|---|---|---|
| 10:30 – 11:30 | incluse dans R0 | 630 < 720 ✔ | 600 < 690 ✔ | conflit |
| 09:00 – 11:00 | commence avant, finit pendant | 540 < 720 ✔ | 600 < 660 ✔ | conflit |
| 11:00 – 13:00 | commence pendant, finit après | 660 < 720 ✔ | 600 < 780 ✔ | conflit |
| 09:30 – 12:30 | englobe R0 | 570 < 720 ✔ | 600 < 750 ✔ | conflit |
| 12:00 – 13:00 | consécutive (après) | 720 < 720 ✘ | — | **pas de conflit** |
| 08:00 – 10:00 | consécutive (avant) | 480 < 720 ✔ | 600 < 600 ✘ | **pas de conflit** |

Une seule condition couvre les quatre situations de l'énoncé. Ce sont les comparaisons **strictes** (`<` et pas `<=`) qui autorisent les réservations consécutives.

5. La recherche de conflit n'est faite que si les horaires sont corrects (R1 à R4) : chercher un conflit sur un créneau qui n'a pas de sens ne sert à rien. En revanche, une erreur de capacité n'empêche pas de signaler aussi le conflit (cas de la maquette 2, test T27).

## 3. Évolutions par rapport au D01

| D01 | D03 | Raison |
|---|---|---|
| R3 : durée maximale 4 h | **3 h** | Imposé par l'énoncé du D03 (`HORAIRES.dureeMax`). |
| T7 : créneau englobant 09:00 – 13:00 | **09:30 – 12:30** | 09:00 – 13:00 dure 4 h : il est maintenant refusé par R3 avant la recherche de conflit, on ne testerait plus R6. |
| T4 : 12:00 – 13:00 puis 09:00 – 10:00 | 12:00 – 13:00 puis **08:00 – 10:00** | Teste en plus la limite d'ouverture ; le principe (fin = début de R0) est le même. |
| T12 : message « Durée entre 30 min et 4 h » | « Durée entre 30 min et 3 h » | Suite de R3. |
| `ui/composants.js` | pas encore créé | Pas nécessaire à cette étape ; les éléments sont créés avec des `<template>`. |
| Catalogue : badge « Capacité insuffisante » | non affiché | Depuis le D02, les salles trop petites sont masquées par le filtre de capacité. |

## 4. Difficultés rencontrées et corrections

| Difficulté | Correction |
|---|---|
| Comparer des heures sous forme de texte est risqué (`"9:00" > "10:00"` est vrai en comparaison de textes). | Toutes les heures passent par `enMinutes()` avant d'être comparées. |
| Avec `<=` au lieu de `<`, deux réservations consécutives (10:00 – 12:00 puis 12:00 – 13:00) seraient refusées. | Comparaisons strictes dans `seChevauchent()`. |
| Les données gardées seulement dans une variable JavaScript étaient perdues en passant de « Réserver » à « Mes réservations » (chaque page recharge les scripts). | Les réservations sont enregistrées dans le localStorage dès le D03 (prévu au D01) ; chaque page relit le stockage avant d'afficher. |
| `new Date().toISOString()` donne la date en heure UTC : entre minuit et 1 h du matin, la « date du jour » était celle de la veille. | Fonction `dateISO()` qui construit la date avec l'heure locale. |
| Avec `novalidate`, le navigateur ne vérifie plus `min`, `max` et `step` des champs heure : on pouvait saisir 07:15. | Toutes les règles sont vérifiées en JavaScript ; les attributs HTML ne servent qu'à guider la saisie. |
| La durée maximale passait de 4 h (D01) à 3 h (D03) ; le test T7 du D01 (09:00 – 13:00) était refusé pour la durée et ne testait plus le conflit. | Durée modifiée à un seul endroit (`HORAIRES.dureeMax`) ; T7 refait avec 09:30 – 12:30. |
| Les tests donnaient des résultats différents selon le jour (les dates du D01, 20/11/2026, sont maintenant passées). | « maintenant » est un paramètre des fonctions ; les tests fixent la date au 15/11/2026 à 09:00. |
| Les tests modifiaient le vrai localStorage et dépendaient les uns des autres. | `chargerReservations()` et `sauvegarderReservations()` acceptent un stockage en paramètre ; chaque test reçoit un faux stockage qui ne contient que R0. |
| Une erreur d'horaire pouvait produire plusieurs messages sous le même champ. | Sous le champ, seul le premier message est affiché ; la liste complète reste dans le récapitulatif. |

## 5. Reste à faire pour la version finale

- Tester la persistance sur plusieurs onglets ouverts en même temps.
- Créer `ui/composants.js` si des éléments se répètent entre les pages.
- Ajouter des réservations de démonstration.
- Fusionner la branche `feature/reservation` dans `main` sur le dépôt Git.

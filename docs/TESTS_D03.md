# CampusBook — Document de tests (D03)

Groupe CBEC — Eduardo COSTA PAULO & Calvin BERNARDO
Dépôt Git : https://github.com/Attamodsa/Projet_web_CBEC

Les tests reprennent les scénarios **T1 à T13 du dossier de conception (D01)** et les règles **R1 à R7**. Deux séries ont été réalisées :

1. **Tests manuels dans l'interface** (`reservation.html`), en remplissant le formulaire comme un utilisateur (M1 à M8).
2. **Tests automatiques** (`tests/tests.html`) : T1 à T13 du D01 + cas limites T14 à T29, qui appellent directement les fonctions de `js/services/reservations.js`.

## Correspondance avec les 6 tests demandés par l'énoncé du D03

| Test demandé (D03) | Test manuel | Test automatique |
|---|---|---|
| 1. Réservation valide | M1 | T1 |
| 2. Dépassement de capacité | M2 | T2 |
| 3. Créneau en dehors des horaires autorisés | M3 | T6 (et T18) |
| 4. Chevauchement partiel | M4 | T3 (et T14) |
| 5. Chevauchement complet | M5 | T7 (et T15) |
| 6. Réservations consécutives autorisées | M6 | T4 |

---

## 1. Tests manuels dans l'interface

**Préparation :** vider le localStorage (outils de développement → Application → Local Storage → supprimer `campusbook_reservations`), puis ouvrir `reservation.html` avec Live Server.
Tous les tests utilisent la **Salle Hopper (S03, 12 places)** à la date de **demain** (J+1), nom « Calvin BERNARDO », e-mail « calvin.b@epita.fr ».
Les tests sont faits **dans l'ordre** : M1 crée la réservation de référence **10:00 – 12:00** utilisée par M4, M5 et M6.

| # | Test | Saisie | Résultat attendu | Résultat obtenu | Statut |
|---|------|--------|------------------|-----------------|--------|
| M1 | Réservation valide | Hopper, J+1, 10:00 – 12:00, 8 pers. | Réservation enregistrée, confirmation avec un numéro, planning mis à jour, réservation visible dans « Mes réservations » | « Réservation confirmée ✔ — Salle Hopper · 10:00 – 12:00 (2 h) · 8 pers. · n° R-… » ; les cases 10:00 → 11:30 passent en « Occupé » ; la ligne apparaît dans l'onglet « À venir » | ✅ |
| M2 | Dépassement de capacité (R5) | Hopper, J+1, 14:00 – 15:00, **15 pers.** | Refus, message indiquant la capacité, champ « participants » en rouge | « Capacité dépassée : 15 / 12 — la Salle Hopper accepte 12 personnes au maximum. » | ✅ |
| M3 | En dehors des horaires (R1) | Hopper, J+1, **19:00 – 21:00**, 4 pers. | Refus, rappel des horaires 08:00 – 20:00 | « Hors horaires d'ouverture : les salles sont ouvertes de 08:00 à 20:00. » | ✅ |
| M4 | Chevauchement partiel (R6) | Hopper, J+1, **09:00 – 11:00** (commence avant 10:00 – 12:00, finit pendant) | Refus pour conflit, message qui indique la réservation existante | Titre « Ce créneau n'est pas disponible » : « Chevauche 10:00–12:00 : la Salle Hopper est déjà réservée le … de 10:00 à 12:00 (« … »). Choisissez un autre créneau ou une autre salle. » ; cases 10:00 et 10:30 hachurées « Conflit » | ✅ |
| M5 | Chevauchement complet (R6) | Hopper, J+1, **09:30 – 12:30** (englobe 10:00 – 12:00) | Refus pour conflit | Même message « Chevauche 10:00–12:00 … » | ✅ |
| M6 | Réservations consécutives (R6) | Hopper, J+1, **12:00 – 13:00** (commence pile à la fin de 10:00 – 12:00) | Réservation **acceptée** | « Réservation confirmée ✔ — Salle Hopper · 12:00 – 13:00 (1 h) · 4 pers. » | ✅ |
| M7 | Même créneau, autre salle | **Salle Turing**, J+1, 10:00 – 12:00 | Acceptée | « Réservation confirmée ✔ — Salle Turing · 10:00 – 12:00 (2 h) » | ✅ |
| M8 | Disponibilité dans le catalogue | `index.html`, date J+1, créneau 10:00 – 11:00 | Hopper et Turing « Occupée 10:00–12:00 », les 6 autres « Disponible » | Conforme ; avec « Uniquement les salles disponibles », 6 salles affichées | ✅ |

> Remarque sur M5 / T7 : le D01 prévoyait 09:00 – 13:00 pour le créneau englobant. Avec la durée maximale de 3 h imposée par le D03, cette demande (4 h) est refusée par R3 avant même la recherche de conflit. On utilise donc 09:30 – 12:30 (3 h), qui englobe aussi 10:00 – 12:00.

---

## 2. Tests automatiques (`tests/tests.html`)

Ouvrir `tests/tests.html` avec Live Server : la page affiche **29 / 29 tests réussis** et une ligne par scénario.

- Données de départ (D01) : **R0** — Salle Hopper (S03, 12 places), **20/11/2026, 10:00 – 12:00**, confirmée.
- Date du jour fixée au **15/11/2026 à 09:00** (« les tests sont exécutés avant cette date », D01) : le résultat ne dépend pas du jour où l'on ouvre la page.
- Chaque test repart d'un **stockage qui ne contient que R0** (faux localStorage en mémoire) : le vrai localStorage n'est jamais modifié.

### Scénarios du D01

| # | Scénario | Entrée | Règle | Attendu | Obtenu |
|---|----------|--------|-------|---------|--------|
| T1 | Réservation valide | S03, 20/11, 14:00–15:30, 8 pers. | toutes | Acceptée ; ajoutée au stockage avec statut « confirmee » | ✅ Acceptée, présente dans le stockage |
| T2 | Salle trop petite | S05 (4 places), 21/11, 10:00–11:00, 6 pers. | R5 | Refusée : « Capacité dépassée : 6 / 4 » | ✅ « Capacité dépassée : 6 / 4 — la Box Ritchie accepte 4 personnes au maximum. » |
| T3 | Chevauchement | S03, 20/11, 11:00–13:00 | R6 | Refusée : chevauche R0 | ✅ « Chevauche 10:00–12:00 : la Salle Hopper est déjà réservée… » |
| T4 | Consécutives | S03, 20/11, 12:00–13:00 puis 08:00–10:00 | R6 | Les deux acceptées | ✅ Les deux acceptées |
| T5 | Horaires incorrects | S02, 21/11, 15:00–14:00 puis 15:00–15:00 | R2 | Refusées : « La fin doit être après le début » | ✅ Les deux refusées avec ce message |
| T6 | Hors horaires | S02, 21/11, 19:00–21:00 | R1 | Refusée : « Hors horaires d'ouverture » | ✅ « Hors horaires d'ouverture : les salles sont ouvertes de 08:00 à 20:00. » |
| T7 | Inclus / englobant | S03, 20/11, 10:30–11:30 puis 09:30–12:30 | R6 | Refusées (conflit avec R0) | ✅ Les deux refusées (R6) |
| T8 | Même horaire, autre salle | S02, 20/11, 10:00–12:00 | R6 | Acceptée | ✅ Acceptée |
| T9 | Capacité exacte | S03, 22/11, 10:00–11:00, 12 pers. | R5 | Acceptée (12 ≤ 12) | ✅ Acceptée |
| T10 | Date passée | S02, 10/11/2026, 10:00–11:00 | R4 | Refusée : « Créneau passé » | ✅ « Créneau passé : cette date est déjà passée. » |
| T11 | Annulation puis nouvelle réservation | Annuler R0, puis S03, 20/11, 11:00–13:00 | R7 | R0 « annulee » ; la demande de T3 est acceptée | ✅ R0 « annulee », nouvelle demande acceptée |
| T12 | Durée trop longue | S07, 21/11, 08:00–13:00 (5 h) | R3 | Refusée : « Durée entre 30 min et 3 h » | ✅ « Durée entre 30 min et 3 h : vous demandez 5 h. » |
| T13 | Stockage vide ou invalide | sans clé, puis `"abc"` | D00 | Aucun plantage, liste vide, salles libres | ✅ 0 réservation dans les deux cas, S03 libre, réservation possible ensuite |

### Cas limites ajoutés au D03

| # | Scénario | Règle | Attendu | Obtenu |
|---|----------|-------|---------|--------|
| T14 | 09:00–11:00 (commence avant R0, finit pendant) | R6 | Refusée | ✅ Refusée (chevauche 10:00–12:00) |
| T15 | 10:00–12:00 (horaires identiques à R0) | R6 | Refusée | ✅ Refusée |
| T16 | Même salle, autre jour (21/11) | R6 | Acceptée | ✅ Acceptée |
| T17 | 18:00–20:00 (fin pile à la fermeture) | R1 | Acceptée | ✅ Acceptée |
| T18 | 07:30–09:00 | R1 | Refusée | ✅ « Hors horaires d'ouverture… » |
| T19 | 10:15–11:15 | R2 | Refusée | ✅ « Pas de 30 min… » |
| T20 | 10:00–10:30 (30 min pile) | R3 | Acceptée | ✅ Acceptée |
| T21 | 14:00–17:00 (3 h pile) | R3 | Acceptée | ✅ Acceptée |
| T22 | 14:00–17:30 (3 h 30) | R3 | Refusée | ✅ « Durée entre 30 min et 3 h : vous demandez 3 h 30. » |
| T23 | Aujourd'hui 09:00–10:00, il est 09:00 | R4 | Refusée (date + début ≤ maintenant) | ✅ « Créneau passé : il est 09:00… » |
| T24 | Aujourd'hui 09:30–10:30 | R4 | Acceptée | ✅ Acceptée |
| T25 | 0, -3 et 2,5 participants | R5 | Refusées | ✅ Refusées toutes les trois |
| T26 | Formulaire vide | — | 7 messages « Champ obligatoire » | ✅ 7 messages |
| T27 | 15 pers. et 11:00–12:00 (cas de la maquette 2) | R5 + R6 | Les deux erreurs affichées ensemble | ✅ Capacité dépassée + Chevauche |
| T28 | Annuler une réservation passée | R7 | Refusée | ✅ « Réservation passée : annulation impossible. » |
| T29 | 3 réservations créées à la suite | — | 3 identifiants différents | ✅ 3 identifiants différents |

**Bilan : 29 / 29 tests réussis.**

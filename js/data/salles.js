/**
 * CampusBook — Données initiales des salles
 * Fichier : js/data/salles.js — 8 salles (énoncé du D02)
 *
 * Chaque salle possède :
 *  - id           {string}   identifiant unique et stable (clé utilisée par les réservations)
 *  - nom          {string}   nom affiché
 *  - capacite     {number}   nombre maximal de personnes (entier > 0)
 *  - equipements  {string[]} codes d'équipements (voir EQUIPEMENTS ci-dessous)
 *  - description  {string}   texte de présentation
 *  - batiment     {string}   bâtiment (utilisé pour l'affichage et le filtre)
 *  - etage        {number}   étage (0 = rez-de-chaussée)
 *  - accessiblePMR {boolean} accessible aux personnes à mobilité réduite
 */

// Dictionnaire des équipements : code -> libellé affiché.
// Utiliser des codes évite les fautes de frappe et facilite les filtres.
export const EQUIPEMENTS = {
  projecteur: "Vidéoprojecteur",
  ecran: "Écran TV",
  tableau: "Tableau blanc",
  visio: "Visioconférence",
  micro: "Micro / sonorisation",
  ordinateurs: "Postes informatiques",
  prises: "Prises à chaque place",
};

// Règles d'ouverture communes à toutes les salles (en minutes depuis minuit).
export const HORAIRES = {
  ouverture: 8 * 60,   // 08:00
  fermeture: 20 * 60,  // 20:00
  pas: 30,             // créneaux par pas de 30 minutes
  dureeMin: 30,        // 30 minutes minimum
  dureeMax: 4 * 60,    // 4 heures maximum
};

export const SALLES = [
  {
    id: "S01",
    nom: "Amphi Lovelace",
    capacite: 120,
    equipements: ["projecteur", "micro", "visio", "prises"],
    description:
      "Grand amphithéâtre pour conférences, soutenances publiques et présentations de projets.",
    batiment: "A",
    etage: 0,
    accessiblePMR: true,
  },
  {
    id: "S02",
    nom: "Salle Turing",
    capacite: 30,
    equipements: ["projecteur", "tableau"],
    description:
      "Salle de cours classique, disposition en rangées, adaptée aux TD et aux réunions de promo.",
    batiment: "A",
    etage: 1,
    accessiblePMR: true,
  },
  {
    id: "S03",
    nom: "Salle Hopper",
    capacite: 12,
    equipements: ["ecran", "tableau", "visio"],
    description:
      "Salle de réunion avec table centrale, idéale pour les points d'équipe et les entretiens.",
    batiment: "A",
    etage: 2,
    accessiblePMR: true,
  },
  {
    id: "S04",
    nom: "Lab Von Neumann",
    capacite: 24,
    equipements: ["ordinateurs", "projecteur", "prises"],
    description:
      "Laboratoire informatique équipé de 24 postes, pour les TP et les sessions de code en groupe.",
    batiment: "B",
    etage: 1,
    accessiblePMR: false,
  },
  {
    id: "S05",
    nom: "Box Ritchie",
    capacite: 4,
    equipements: ["ecran", "tableau"],
    description:
      "Petit box de travail fermé pour 2 à 4 personnes, calme, parfait pour réviser ou travailler un projet.",
    batiment: "B",
    etage: 0,
    accessiblePMR: true,
  },
  {
    id: "S06",
    nom: "Box Lamport",
    capacite: 6,
    equipements: ["ecran", "tableau", "prises"],
    description:
      "Box de travail en groupe avec grand écran de partage, pour les projets à 5 ou 6.",
    batiment: "B",
    etage: 0,
    accessiblePMR: true,
  },
  {
    id: "S07",
    nom: "Salle Knuth",
    capacite: 40,
    equipements: ["projecteur", "tableau", "micro"],
    description:
      "Salle modulable (tables mobiles) pour ateliers, hackathons et travaux en îlots.",
    batiment: "C",
    etage: 1,
    accessiblePMR: true,
  },
  {
    id: "S08",
    nom: "Studio Liskov",
    capacite: 8,
    equipements: ["visio", "micro", "ecran"],
    description:
      "Studio insonorisé avec caméra et micro, prévu pour les visioconférences et les oraux à distance.",
    batiment: "C",
    etage: 2,
    accessiblePMR: false,
  },
];

/*
 * Structure d'une réservation (stockée dans localStorage, clé "campusbook_reservations") :
 *
 * {
 *   id: "R-1731400000000",       // identifiant unique (préfixe + timestamp)
 *   salleId: "S03",               // référence vers SALLES[].id
 *   date: "2026-11-20",           // format ISO AAAA-MM-JJ
 *   heureDebut: "10:00",          // format HH:MM
 *   heureFin: "12:00",            // format HH:MM, strictement après heureDebut
 *   nbParticipants: 8,            // entier, 1 <= nb <= capacité de la salle
 *   motif: "Réunion projet",      // texte libre court
 *   demandeur: { nom: "Calvin B.", email: "calvin.b@epita.fr" },
 *   statut: "confirmee",          // "confirmee" | "annulee"
 *   creeLe: "2026-11-11T14:30:00.000Z",
 *   annuleLe: null                // date ISO renseignée lors d'une annulation
 * }
 */

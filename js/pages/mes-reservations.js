/**
 * CampusBook — Script de la page Mes réservations (mes-reservations.html)
 * Fichier : js/pages/mes-reservations.js
 *
 * D02 : version de départ. La sauvegarde (localStorage) n'existe pas encore,
 * donc la liste est vide. Les onglets fonctionnent déjà visuellement.
 * L'affichage des réservations et l'annulation viendront à l'étape suivante.
 */

import { SALLES } from "../data/salles.js";

const onglets = document.querySelectorAll('[role="tab"]');
const panneau = document.querySelector("#panneau-reservations");
const filtreSalle = document.querySelector("#filtre-salle");
const messageVide = document.querySelector("#aucune-reservation");

/** Remplit la liste « Filtrer par salle ». */
function remplirFiltreSalles() {
  SALLES.forEach((salle) => {
    const option = document.createElement("option");
    option.value = salle.id;
    option.textContent = salle.nom;
    filtreSalle.append(option);
  });
}

/** Sélectionne un onglet (À venir / Passées / Annulées). */
function selectionnerOnglet(ongletChoisi) {
  onglets.forEach((onglet) => {
    const actif = onglet === ongletChoisi;
    onglet.setAttribute("aria-selected", String(actif));
    onglet.tabIndex = actif ? 0 : -1;
  });
  panneau.setAttribute("aria-labelledby", ongletChoisi.id);
  // Pour l'instant aucune réservation n'est enregistrée
  messageVide.hidden = false;
}

onglets.forEach((onglet) => {
  onglet.addEventListener("click", () => selectionnerOnglet(onglet));
});

remplirFiltreSalles();
messageVide.hidden = false;

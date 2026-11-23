/**
 * CampusBook — Script de la page Réservation (reservation.html)
 * Fichier : js/pages/reservation.js
 *
 * D02 : version de départ. La page affiche la liste des salles et la fiche
 * de la salle choisie (pré-remplie depuis le catalogue).
 * La validation (R1 à R6) et l'enregistrement viendront à l'étape suivante.
 */

import { SALLES, EQUIPEMENTS } from "../data/salles.js";

const listeSalles = document.querySelector("#salle");
const champDate = document.querySelector("#date");
const champDebut = document.querySelector("#heure-debut");
const champFin = document.querySelector("#heure-fin");
const form = document.querySelector("#form-reservation");
const messageSucces = document.querySelector("#message-succes");

/** Remplit la liste déroulante avec les salles. */
function remplirListeSalles() {
  SALLES.forEach((salle) => {
    const option = document.createElement("option");
    option.value = salle.id;
    option.textContent = `${salle.nom} (${salle.capacite} places)`;
    listeSalles.append(option);
  });
}

/** Affiche la fiche de la salle choisie dans la colonne de droite. */
function afficherFiche(salleId) {
  const salle = SALLES.find((s) => s.id === salleId);
  const titre = document.querySelector("#titre-reservation");
  const ariane = document.querySelector("#ariane-salle");
  const equipements = document.querySelector("#fiche-equipements");
  equipements.innerHTML = "";

  if (!salle) {
    titre.textContent = "Réserver une salle";
    ariane.textContent = "Salle";
    document.querySelector("#fiche-nom").textContent = "Aucune salle sélectionnée";
    document.querySelector("#fiche-description").textContent = "Choisissez une salle pour voir sa fiche.";
    document.querySelector("#fiche-capacite").textContent = "—";
    document.querySelector("#fiche-localisation").textContent = "—";
    document.querySelector("#fiche-pmr").textContent = "—";
    return;
  }

  titre.textContent = `Réserver la ${salle.nom}`;
  ariane.textContent = salle.nom;
  document.querySelector("#fiche-nom").textContent = salle.nom;
  document.querySelector("#fiche-description").textContent = salle.description;
  document.querySelector("#fiche-capacite").textContent = `${salle.capacite} personnes`;
  document.querySelector("#fiche-localisation").textContent =
    `Bâtiment ${salle.batiment} · ${salle.etage === 0 ? "RDC" : `étage ${salle.etage}`}`;
  document.querySelector("#fiche-pmr").textContent = salle.accessiblePMR ? "Oui" : "Non";
  document.querySelector("#participants").max = salle.capacite;

  salle.equipements.forEach((code) => {
    const li = document.createElement("li");
    li.textContent = EQUIPEMENTS[code];
    equipements.append(li);
  });
}

/** Pré-remplit le formulaire avec les paramètres de l'URL (?salle=S03&date=…). */
function preRemplirFormulaire() {
  const parametres = new URLSearchParams(window.location.search);
  listeSalles.value = parametres.get("salle") || "";
  champDate.value = parametres.get("date") || "";
  champDebut.value = parametres.get("debut") || "";
  champFin.value = parametres.get("fin") || "";
  afficherFiche(listeSalles.value);
}

listeSalles.addEventListener("change", () => afficherFiche(listeSalles.value));

form.addEventListener("submit", (event) => {
  event.preventDefault();
  messageSucces.textContent =
    "La validation et l'enregistrement des réservations seront disponibles à la prochaine étape.";
  messageSucces.hidden = false;
});

/** Pas encore de photos : on remplace l'image vide par un fond rayé. */
function remplacerPhoto() {
  const photo = document.querySelector("#fiche-photo");
  const remplacement = document.createElement("div");
  remplacement.className = "fiche-photo";
  photo.replaceWith(remplacement);
}

remplacerPhoto();
remplirListeSalles();
preRemplirFormulaire();
document.querySelector("#prochain-creneau").textContent =
  "Le planning du jour sera affiché à la prochaine étape.";

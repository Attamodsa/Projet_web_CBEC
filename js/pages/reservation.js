/**
 * CampusBook — Script de la page Réservation (reservation.html)
 * Fichier : js/pages/reservation.js
 *
 * D03 :
 *  - liste des salles et fiche de la salle choisie (pré-remplie depuis le catalogue) ;
 *  - lecture du formulaire, contrôles R1 à R6 et détection des conflits
 *    (js/services/reservations.js → creerReservation / validerReservation) ;
 *  - enregistrement de la réservation, message de confirmation ;
 *  - planning du jour de la salle, mis à jour après chaque réservation.
 *
 * Ce fichier ne contient que l'affichage : toutes les règles sont dans js/services/.
 */

import { SALLES, EQUIPEMENTS, HORAIRES } from "../data/salles.js";
import { creerReservation, reservationsDuJour, trouverSalle } from "../services/reservations.js";
import { enMinutes, enHeure, seChevauchent, formaterDate, formaterDuree, dateISO } from "../utils/temps.js";

// ---------- Éléments de la page ----------
const form = document.querySelector("#form-reservation");
const listeSalles = document.querySelector("#salle");
const champDate = document.querySelector("#date");
const champDebut = document.querySelector("#heure-debut");
const champFin = document.querySelector("#heure-fin");
const champParticipants = document.querySelector("#participants");

const recapErreurs = document.querySelector("#recap-erreurs");
const recapListe = document.querySelector("#recap-liste");
const recapTitre = document.querySelector("#recap-titre");
const messageSucces = document.querySelector("#message-succes");
const grillePlanning = document.querySelector("#planning-grille");
const texteProchainCreneau = document.querySelector("#prochain-creneau");
const titrePlanning = document.querySelector("#planning-titre");

/** Nom du champ dans les données → élément HTML et zone d'erreur associés. */
const CHAMPS = {
  nom: "#nom",
  email: "#email",
  salleId: "#salle",
  date: "#date",
  heureDebut: "#heure-debut",
  heureFin: "#heure-fin",
  nbParticipants: "#participants",
};

// ========== 1. Liste des salles et fiche ==========

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
  const salle = trouverSalle(salleId);
  const photo = document.querySelector("#fiche-photo");
  const equipements = document.querySelector("#fiche-equipements");
  equipements.innerHTML = "";

  if (!salle) {
    document.querySelector("#titre-reservation").textContent = "Réserver une salle";
    document.querySelector("#ariane-salle").textContent = "Salle";
    document.querySelector("#fiche-nom").textContent = "Aucune salle sélectionnée";
    document.querySelector("#fiche-description").textContent = "Choisissez une salle pour voir sa fiche.";
    document.querySelector("#fiche-capacite").textContent = "—";
    document.querySelector("#fiche-localisation").textContent = "—";
    document.querySelector("#fiche-pmr").textContent = "—";
    photo.removeAttribute("src");
    photo.alt = "";
    champParticipants.removeAttribute("max");
    return;
  }

  document.querySelector("#titre-reservation").textContent = `Réserver la ${salle.nom}`;
  document.querySelector("#ariane-salle").textContent = salle.nom;
  document.querySelector("#fiche-nom").textContent = salle.nom;
  document.querySelector("#fiche-description").textContent = salle.description;
  document.querySelector("#fiche-capacite").textContent = `${salle.capacite} personnes`;
  document.querySelector("#fiche-localisation").textContent =
    `Bâtiment ${salle.batiment} · ${salle.etage === 0 ? "RDC" : `étage ${salle.etage}`}`;
  document.querySelector("#fiche-pmr").textContent = salle.accessiblePMR ? "Oui" : "Non";
  photo.src = `assets/img/${salle.id}.jpg`;
  photo.alt = `Photo de la ${salle.nom}`;

  // La capacité de la salle sert de maximum au champ « participants »
  champParticipants.max = salle.capacite;

  salle.equipements.forEach((code) => {
    const li = document.createElement("li");
    li.textContent = EQUIPEMENTS[code];
    equipements.append(li);
  });
}

/** Pré-remplit le formulaire avec les paramètres de l'URL (?salle=S03&date=…&debut=…&fin=…). */
function preRemplirFormulaire() {
  const parametres = new URLSearchParams(window.location.search);
  const salleId = parametres.get("salle") || "";
  listeSalles.value = trouverSalle(salleId) ? salleId : "";
  champDate.value = parametres.get("date") || "";
  champDebut.value = parametres.get("debut") || "";
  champFin.value = parametres.get("fin") || "";
  champParticipants.value = parametres.get("participants") || "";
  afficherFiche(listeSalles.value);
}

// ========== 2. Lire le formulaire ==========

/** Rassemble les valeurs saisies dans un objet (toutes sous forme de texte). */
function lireFormulaire() {
  const valeurs = new FormData(form);
  return {
    nom: valeurs.get("nom"),
    email: valeurs.get("email"),
    salleId: valeurs.get("salleId"),
    date: valeurs.get("date"),
    heureDebut: valeurs.get("heureDebut"),
    heureFin: valeurs.get("heureFin"),
    nbParticipants: valeurs.get("nbParticipants"),
    motif: valeurs.get("motif"),
    commentaire: valeurs.get("commentaire"),
  };
}

// ========== 3. Afficher / effacer les erreurs ==========

/** Retire toutes les marques d'erreur du formulaire. */
function effacerErreurs() {
  recapErreurs.hidden = true;
  recapListe.innerHTML = "";
  Object.values(CHAMPS).forEach((selecteur) => effacerErreurChamp(document.querySelector(selecteur)));
}

/** Retire l'erreur d'un seul champ (appelé aussi quand l'utilisateur corrige). */
function effacerErreurChamp(champ) {
  champ.classList.remove("champ-erreur");
  champ.removeAttribute("aria-invalid");
  const zone = document.querySelector(`#erreur-${champ.id}`);
  if (zone) zone.textContent = "";
}

/**
 * Affiche les erreurs :
 *  - un récapitulatif en haut du formulaire (toutes les erreurs, cliquables) ;
 *  - sous chaque champ concerné, le premier message qui le concerne.
 */
function afficherErreurs(erreurs) {
  const seulementConflit = erreurs.every((e) => e.regle === "R6");
  recapTitre.textContent = seulementConflit
    ? "Ce créneau n'est pas disponible"
    : erreurs.length > 1
      ? `La réservation n'a pas pu être enregistrée (${erreurs.length} problèmes)`
      : "La réservation n'a pas pu être enregistrée";

  erreurs.forEach(({ champ, message }) => {
    const element = document.querySelector(CHAMPS[champ]);

    // Ligne du récapitulatif : un lien qui amène sur le champ
    const li = document.createElement("li");
    const lien = document.createElement("a");
    lien.href = `#${element.id}`;
    lien.textContent = message;
    lien.addEventListener("click", (event) => {
      event.preventDefault();
      element.focus();
    });
    li.append(lien);
    recapListe.append(li);

    // Message sous le champ (seulement le premier pour ce champ)
    const zone = document.querySelector(`#erreur-${element.id}`);
    if (zone && zone.textContent === "") zone.textContent = message;
    element.classList.add("champ-erreur");
    element.setAttribute("aria-invalid", "true");
  });

  recapErreurs.hidden = false;
  recapErreurs.focus();
}

// ========== 4. Confirmation ==========

/** Affiche le message de succès avec le résumé de la réservation. */
function afficherConfirmation(reservation, sauvegardee) {
  const salle = trouverSalle(reservation.salleId);
  const duree = enMinutes(reservation.heureFin) - enMinutes(reservation.heureDebut);

  messageSucces.innerHTML = "";
  const titre = document.createElement("p");
  titre.className = "alerte-titre";
  titre.textContent = "Réservation confirmée ✔";

  const details = document.createElement("p");
  details.textContent =
    `${salle.nom} · ${formaterDate(reservation.date)} · ${reservation.heureDebut} – ${reservation.heureFin} ` +
    `(${formaterDuree(duree)}) · ${reservation.nbParticipants} pers. · n° ${reservation.id}`;

  const lien = document.createElement("a");
  lien.href = "mes-reservations.html";
  lien.textContent = "Voir mes réservations →";

  messageSucces.append(titre, details);
  if (!sauvegardee) {
    const avertissement = document.createElement("p");
    avertissement.textContent =
      "Attention : le navigateur a refusé la sauvegarde. La réservation sera perdue si vous quittez la page.";
    messageSucces.append(avertissement);
  }
  messageSucces.append(lien);
  messageSucces.hidden = false;
  messageSucces.scrollIntoView({ behavior: "smooth", block: "center" });
}

// ========== 5. Planning du jour (disponibilité) ==========

/**
 * Dessine les 24 demi-heures de 08:00 à 20:00 pour la salle et la date choisies :
 * occupée (rouge), libre (blanc), créneau demandé (bleu), conflit (hachuré).
 */
function afficherPlanning() {
  const salle = trouverSalle(listeSalles.value);
  const date = champDate.value;
  grillePlanning.innerHTML = "";

  if (!salle || !date) {
    titrePlanning.textContent = "Occupation du jour";
    texteProchainCreneau.textContent = "Choisissez une salle et une date pour voir les créneaux libres.";
    return;
  }

  titrePlanning.textContent = `Occupation · ${formaterDate(date)}`;
  const occupees = reservationsDuJour(salle.id, date);
  const debutDemande = enMinutes(champDebut.value);
  const finDemandee = enMinutes(champFin.value);

  for (let m = HORAIRES.ouverture; m < HORAIRES.fermeture; m += HORAIRES.pas) {
    const caseCreneau = document.createElement("div");
    caseCreneau.className = "creneau";

    const prise = occupees.find((r) =>
      seChevauchent(m, m + HORAIRES.pas, enMinutes(r.heureDebut), enMinutes(r.heureFin))
    );
    const demandee = debutDemande < finDemandee &&
      seChevauchent(m, m + HORAIRES.pas, debutDemande, finDemandee);

    if (prise) caseCreneau.classList.add("creneau-occupe");
    if (demandee) caseCreneau.classList.add("creneau-demande");
    if (prise && demandee) caseCreneau.classList.add("creneau-conflit");

    const heure = document.createElement("span");
    heure.textContent = enHeure(m);
    const etat = document.createElement("span");
    etat.className = "creneau-etat";
    etat.textContent = prise && demandee ? "Conflit" : prise ? "Occupé" : demandee ? "Demandé" : "";
    caseCreneau.title = prise ? `Réservé ${prise.heureDebut} – ${prise.heureFin}` : "Libre";
    caseCreneau.append(heure, etat);
    grillePlanning.append(caseCreneau);
  }

  texteProchainCreneau.textContent = occupees.length === 0
    ? "Aucune réservation ce jour-là : la salle est libre de 08:00 à 20:00."
    : `${occupees.length} réservation(s) ce jour-là : ` +
      occupees.map((r) => `${r.heureDebut} – ${r.heureFin}`).join(", ") + ".";
}

// ========== 6. Envoi du formulaire ==========

/** Lit, vérifie, enregistre, puis affiche le résultat. */
function traiterEnvoi(event) {
  event.preventDefault();
  effacerErreurs();
  messageSucces.hidden = true;

  const demande = lireFormulaire();
  const resultat = creerReservation(demande);

  if (!resultat.ok) {
    afficherErreurs(resultat.erreurs);
    afficherPlanning(); // montre le conflit en hachuré s'il y en a un
    return;
  }

  afficherConfirmation(resultat.reservation, resultat.sauvegardee);
  // On garde la salle, la date et le nom ; on vide le créneau pour la suite.
  champDebut.value = "";
  champFin.value = "";
  afficherPlanning();
}

// ========== 7. Événements ==========

form.addEventListener("submit", traiterEnvoi);

listeSalles.addEventListener("change", () => {
  afficherFiche(listeSalles.value);
  afficherPlanning();
});
[champDate, champDebut, champFin].forEach((champ) => champ.addEventListener("change", afficherPlanning));

// Dès que l'utilisateur modifie un champ en erreur, on retire le message de ce champ.
Object.values(CHAMPS).forEach((selecteur) => {
  const champ = document.querySelector(selecteur);
  champ.addEventListener("input", () => effacerErreurChamp(champ));
});

// ---------- Premier affichage ----------
champDate.min = dateISO(new Date()); // le calendrier grise les jours passés
remplirListeSalles();
preRemplirFormulaire();
afficherPlanning();

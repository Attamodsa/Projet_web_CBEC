/**
 * CampusBook — Script de la page Mes réservations (mes-reservations.html)
 * Fichier : js/pages/mes-reservations.js
 *
 * D03 :
 *  - affiche les réservations enregistrées (relues dans le localStorage à chaque affichage) ;
 *  - onglets À venir / Passées / Annulées et filtre par salle ;
 *  - compteurs en haut de page ;
 *  - fenêtre « Détails » et annulation avec confirmation.
 */

import { SALLES } from "../data/salles.js";
import { chargerReservations } from "../services/stockage.js";
import { annulerReservation, trouverSalle } from "../services/reservations.js";
import { enMinutes, estPasse, formaterDate, formaterDuree, dateISO } from "../utils/temps.js";

const onglets = document.querySelectorAll('[role="tab"]');
const panneau = document.querySelector("#panneau-reservations");
const filtreSalle = document.querySelector("#filtre-salle");
const corpsTableau = document.querySelector("#corps-reservations");
const messageVide = document.querySelector("#aucune-reservation");
const modeleLigne = document.querySelector("#modele-ligne-reservation");
const modaleAnnulation = document.querySelector("#modale-annulation");
const modaleDetails = document.querySelector("#modale-details");
const messageAnnulation = document.querySelector("#message-annulation");

let ongletActif = "a-venir";
let idAAnnuler = null;

// ---------- Classement des réservations ----------

/**
 * "a-venir" | "passees" | "annulees".
 * Une réservation déjà commencée est classée dans « Passées » : d'après R7,
 * elle ne peut plus être annulée.
 */
function categorie(reservation) {
  if (reservation.statut === "annulee") return "annulees";
  return estPasse(reservation.date, reservation.heureDebut) ? "passees" : "a-venir";
}

/** Trie par date puis par heure de début (croissant). */
function trierParDate(liste) {
  return [...liste].sort(
    (a, b) => a.date.localeCompare(b.date) || enMinutes(a.heureDebut) - enMinutes(b.heureDebut)
  );
}

// ---------- Compteurs ----------

/** Lundi (00:00) de la semaine en cours. */
function debutSemaine(date) {
  const lundi = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const ecart = (lundi.getDay() + 6) % 7; // dimanche = 6, lundi = 0
  lundi.setDate(lundi.getDate() - ecart);
  return lundi;
}

function mettreAJourCompteurs(reservations) {
  const aVenir = trierParDate(reservations.filter((r) => categorie(r) === "a-venir"));
  const passees = reservations.filter((r) => categorie(r) === "passees");
  const annulees = reservations.filter((r) => categorie(r) === "annulees");

  document.querySelector("#nb-a-venir").textContent = aVenir.length;
  document.querySelector("#nb-passees").textContent = passees.length;
  document.querySelector("#nb-annulees").textContent = annulees.length;
  document.querySelector("#compteur-a-venir").textContent = aVenir.length;

  // Heures réservées cette semaine (lundi → dimanche), réservations non annulées
  const lundi = debutSemaine(new Date());
  const dimanche = new Date(lundi);
  dimanche.setDate(lundi.getDate() + 6);
  const minutes = reservations
    .filter((r) => r.statut !== "annulee" && r.date >= dateISO(lundi) && r.date <= dateISO(dimanche))
    .reduce((total, r) => total + enMinutes(r.heureFin) - enMinutes(r.heureDebut), 0);
  document.querySelector("#compteur-heures").textContent = minutes === 0 ? "0 h" : formaterDuree(minutes);

  const prochaine = aVenir[0];
  document.querySelector("#compteur-prochaine").textContent = prochaine
    ? `${trouverSalle(prochaine.salleId)?.nom ?? prochaine.salleId} · ${formaterDate(prochaine.date)} ${prochaine.heureDebut}`
    : "Aucune";
}

// ---------- Tableau ----------

/** Crée une ligne du tableau à partir du <template>. */
function creerLigne(reservation) {
  const ligne = modeleLigne.content.firstElementChild.cloneNode(true);
  const salle = trouverSalle(reservation.salleId);
  const duree = enMinutes(reservation.heureFin) - enMinutes(reservation.heureDebut);
  const cat = categorie(reservation);

  ligne.querySelector(".ligne-salle").textContent = salle ? salle.nom : reservation.salleId;
  ligne.querySelector(".ligne-sous-titre").textContent = reservation.motif || `n° ${reservation.id}`;
  ligne.querySelector(".ligne-date").textContent = formaterDate(reservation.date);
  ligne.querySelector(".ligne-horaire").textContent = `${reservation.heureDebut} – ${reservation.heureFin}`;
  ligne.querySelector(".ligne-duree").textContent = formaterDuree(duree);
  ligne.querySelector(".ligne-participants").textContent = `${reservation.nbParticipants} pers.`;

  const statut = ligne.querySelector(".ligne-statut");
  if (cat === "annulees") {
    statut.textContent = "Annulée";
    statut.classList.add("badge-annulee");
  } else if (cat === "passees") {
    statut.textContent = "Terminée";
    statut.classList.add("badge-annulee");
  } else {
    statut.textContent = "Confirmée";
    statut.classList.add("badge-confirmee");
  }

  ligne.querySelector(".btn-details").addEventListener("click", () => ouvrirDetails(reservation));

  const boutonAnnuler = ligne.querySelector(".btn-annuler");
  const lienNouveau = ligne.querySelector(".btn-reserver-nouveau");
  if (cat === "a-venir") {
    boutonAnnuler.addEventListener("click", () => demanderAnnulation(reservation));
  } else {
    boutonAnnuler.remove();
    lienNouveau.hidden = false;
    lienNouveau.href = `reservation.html?${new URLSearchParams({
      salle: reservation.salleId,
      participants: reservation.nbParticipants,
    })}`;
  }
  return ligne;
}

/** Affiche les réservations de l'onglet actif (et de la salle filtrée). */
function afficherReservations() {
  const reservations = chargerReservations(); // une seule source : le stockage
  const liste = trierParDate(
    reservations.filter(
      (r) => categorie(r) === ongletActif && (filtreSalle.value === "" || r.salleId === filtreSalle.value)
    )
  );
  corpsTableau.innerHTML = "";
  liste.forEach((r) => corpsTableau.append(creerLigne(r)));
  messageVide.hidden = liste.length > 0;
  mettreAJourCompteurs(reservations);
}

// ---------- Fenêtres (détails, annulation) ----------

function ouvrirDetails(r) {
  const salle = trouverSalle(r.salleId);
  document.querySelector("#details-salle").textContent = salle ? salle.nom : r.salleId;
  document.querySelector("#details-date").textContent = formaterDate(r.date);
  document.querySelector("#details-horaire").textContent = `${r.heureDebut} – ${r.heureFin}`;
  document.querySelector("#details-participants").textContent = `${r.nbParticipants} / ${salle?.capacite ?? "?"}`;
  document.querySelector("#details-motif").textContent = r.motif || "—";
  document.querySelector("#details-demandeur").textContent = `${r.demandeur.nom} (${r.demandeur.email})`;
  document.querySelector("#details-statut").textContent =
    r.statut === "annulee" ? "Annulée" : `Confirmée · n° ${r.id}`;
  modaleDetails.showModal();
}

function demanderAnnulation(r) {
  idAAnnuler = r.id;
  const salle = trouverSalle(r.salleId);
  document.querySelector("#modale-annulation-texte").textContent =
    `${salle ? salle.nom : r.salleId} · ${formaterDate(r.date)} · ${r.heureDebut} – ${r.heureFin}`;
  modaleAnnulation.showModal();
}

/** Appelée quand l'utilisateur confirme dans la modale (D01 : confirmerAnnulation). */
function confirmerAnnulation(id) {
  const resultat = annulerReservation(id);
  const r = resultat.reservation;
  messageAnnulation.classList.toggle("alerte-succes", resultat.ok);
  messageAnnulation.classList.toggle("alerte-erreur", !resultat.ok);
  messageAnnulation.textContent = resultat.ok
    ? `Réservation du ${formaterDate(r.date)} (${r.heureDebut} – ${r.heureFin}) annulée. Le créneau est de nouveau libre.`
    : resultat.erreur;
  messageAnnulation.hidden = false;
  afficherReservations();
}

modaleAnnulation.addEventListener("close", () => {
  if (modaleAnnulation.returnValue === "confirmer" && idAAnnuler) {
    confirmerAnnulation(idAAnnuler);
  }
  idAAnnuler = null;
});

// ---------- Onglets et filtre ----------

function remplirFiltreSalles() {
  SALLES.forEach((salle) => {
    const option = document.createElement("option");
    option.value = salle.id;
    option.textContent = salle.nom;
    filtreSalle.append(option);
  });
}

function selectionnerOnglet(ongletChoisi) {
  onglets.forEach((onglet) => {
    const actif = onglet === ongletChoisi;
    onglet.setAttribute("aria-selected", String(actif));
    onglet.tabIndex = actif ? 0 : -1;
  });
  panneau.setAttribute("aria-labelledby", ongletChoisi.id);
  ongletActif = ongletChoisi.dataset.onglet;
  afficherReservations();
}

onglets.forEach((onglet) => onglet.addEventListener("click", () => selectionnerOnglet(onglet)));
filtreSalle.addEventListener("change", afficherReservations);

// ---------- Premier affichage ----------
remplirFiltreSalles();
afficherReservations();

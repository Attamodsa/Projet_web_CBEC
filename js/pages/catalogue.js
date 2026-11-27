/**
 * CampusBook — Script de la page Catalogue (index.html)
 * Fichier : js/pages/catalogue.js
 *
 * D02 :
 *  - génère les cartes des salles à partir du tableau SALLES (DOM) ;
 *  - filtre par recherche texte, capacité minimale, équipements et bâtiment ;
 *  - trie les résultats ;
 *  - affiche le nombre de salles trouvées ;
 *  - réinitialise les filtres.
 * D03 : si une date et un créneau sont choisis, chaque carte indique si la
 * salle est disponible ou occupée (réservations enregistrées), et la case
 * « Uniquement les salles disponibles » masque les salles occupées.
 */

import { SALLES, EQUIPEMENTS } from "../data/salles.js";
import { afficherCompteurSalles } from "../ui/compteurs.js";
import { chargerReservations } from "../services/stockage.js";
import { verifierDisponibilite } from "../services/reservations.js";
import { enMinutes } from "../utils/temps.js";

// Mettre à true quand les photos S01.jpg … S08.jpg seront dans assets/img/
const AVEC_PHOTOS = true;

// ---------- Éléments de la page ----------
const formFiltres = document.querySelector("#form-filtres");
const champRecherche = document.querySelector("#recherche");
const champDate = document.querySelector("#filtre-date");
const champDebut = document.querySelector("#filtre-debut");
const champFin = document.querySelector("#filtre-fin");
const champCapacite = document.querySelector("#filtre-capacite");
const casesEquipements = document.querySelectorAll('input[name="equipements"]');
const listeBatiment = document.querySelector("#filtre-batiment");
const caseDisponibles = document.querySelector("#filtre-disponibles");
const boutonReinitialiser = formFiltres.querySelector('button[type="reset"]');
const listeTri = document.querySelector("#tri");

const zoneSalles = document.querySelector("#liste-salles");
const zoneResume = document.querySelector("#resume-resultats");
const messageVide = document.querySelector("#aucun-resultat");
const modeleCarte = document.querySelector("#modele-carte-salle");

// ---------- Petites fonctions utiles ----------

/** Met un texte en minuscules et sans accents, pour comparer facilement. */
function normaliser(texte) {
  return texte
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

/** 0 → "RDC", 1 → "1er", 2 → "2e" */
function formaterEtage(etage) {
  if (etage === 0) return "RDC";
  if (etage === 1) return "1er";
  return `${etage}e`;
}

/** "2026-11-20" → "ven. 20/11" */
function formaterDate(dateISO) {
  const [annee, mois, jour] = dateISO.split("-").map(Number);
  const date = new Date(annee, mois - 1, jour);
  return date.toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  });
}

// ---------- 1. Lire les critères saisis ----------

/** Rassemble toutes les valeurs des filtres dans un seul objet. */
function lireCriteres() {
  const equipementsCoches = [];
  casesEquipements.forEach((caseACocher) => {
    if (caseACocher.checked) {
      equipementsCoches.push(caseACocher.value);
    }
  });

  return {
    texte: normaliser(champRecherche.value.trim()),
    capaciteMin: Number(champCapacite.value) || 0, // champ vide → 0 (pas de minimum)
    equipements: equipementsCoches,
    batiment: listeBatiment.value, // "" = tous les bâtiments
    date: champDate.value,
    debut: champDebut.value,
    fin: champFin.value,
    tri: listeTri.value,
    disponiblesSeulement: caseDisponibles.checked,
    reservations: chargerReservations(), // relues à chaque mise à jour
  };
}

/** Vrai si une date et un créneau cohérent (début < fin) sont choisis. */
function creneauChoisi(criteres) {
  return Boolean(criteres.date) && enMinutes(criteres.debut) < enMinutes(criteres.fin);
}

/**
 * Statut de la salle pour le créneau filtré (D01, point de contact EC ↔ CB) :
 *  - null                          si aucun créneau n'est choisi ;
 *  - { libre: true }               si la salle est disponible ;
 *  - { libre: false, conflit: r }  si une réservation r occupe le créneau.
 */
function statutSalle(salle, criteres) {
  if (!creneauChoisi(criteres)) return null;
  const conflit = verifierDisponibilite(
    salle.id, criteres.date, enMinutes(criteres.debut), enMinutes(criteres.fin), criteres.reservations
  );
  return conflit ? { libre: false, conflit } : { libre: true };
}

// ---------- 2. Filtrer et trier ----------

/** Vrai si la salle correspond à la recherche texte (nom ou bâtiment). */
function correspondRecherche(salle, texte) {
  if (texte === "") return true;
  const contenu = normaliser(`${salle.nom} batiment ${salle.batiment} bat. ${salle.batiment}`);
  return contenu.includes(texte);
}

/** Vrai si la salle possède TOUS les équipements cochés. */
function possedeEquipements(salle, equipements) {
  return equipements.every((code) => salle.equipements.includes(code));
}

/** Renvoie uniquement les salles qui respectent tous les critères. */
function filtrerSalles(salles, criteres) {
  return salles.filter((salle) => {
    return (
      correspondRecherche(salle, criteres.texte) &&
      salle.capacite >= criteres.capaciteMin &&
      possedeEquipements(salle, criteres.equipements) &&
      (criteres.batiment === "" || salle.batiment === criteres.batiment) &&
      (!criteres.disponiblesSeulement || statutSalle(salle, criteres)?.libre !== false)
    );
  });
}

/** Renvoie une copie triée de la liste (le tableau SALLES n'est pas modifié). */
function trierSalles(salles, tri) {
  const copie = [...salles];
  if (tri === "nom") {
    copie.sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
  } else if (tri === "batiment") {
    copie.sort((a, b) => a.batiment.localeCompare(b.batiment) || a.etage - b.etage);
  } else {
    copie.sort((a, b) => a.capacite - b.capacite);
  }
  return copie;
}

// ---------- 3. Créer et afficher les cartes ----------

/** Fabrique la carte HTML d'une salle à partir du <template>. */
function creerCarteSalle(salle, criteres) {
  const carte = modeleCarte.content.firstElementChild.cloneNode(true);
  carte.dataset.id = salle.id;

  // Photo (ou fond rayé si pas de photo)
  const photo = carte.querySelector(".carte-photo");
  if (AVEC_PHOTOS) {
    photo.src = `assets/img/${salle.id}.jpg`;
    photo.alt = `Photo de la ${salle.nom}`;
  } else {
    photo.remove();
  }

  // Badge : Disponible / Occupée si un créneau est choisi, sinon accessibilité PMR
  const badge = carte.querySelector(".carte-statut");
  const statut = statutSalle(salle, criteres);
  if (statut?.libre === true) {
    badge.textContent = "Disponible";
    badge.classList.add("badge-dispo");
  } else if (statut?.libre === false) {
    badge.textContent = `Occupée ${statut.conflit.heureDebut}–${statut.conflit.heureFin}`;
    badge.classList.add("badge-occupee");
  } else if (salle.accessiblePMR) {
    badge.textContent = "Accès PMR";
    badge.classList.add("badge-info");
  }

  carte.querySelector(".carte-nom").textContent = salle.nom;
  carte.querySelector(".carte-capacite").textContent = `👥 ${salle.capacite} places`;
  carte.querySelector(".carte-localisation").textContent =
    `📍 Bât. ${salle.batiment} · ${formaterEtage(salle.etage)}`;
  carte.querySelector(".carte-description").textContent = salle.description;

  // Une étiquette par équipement, avec le libellé lisible
  const listeEquipements = carte.querySelector(".carte-equipements");
  salle.equipements.forEach((code) => {
    const etiquette = document.createElement("li");
    etiquette.textContent = EQUIPEMENTS[code];
    listeEquipements.append(etiquette);
  });

  carte.querySelector(".carte-libre").textContent = `Jusqu'à ${salle.capacite} pers.`;

  // Le bouton « Réserver » transmet la salle (et la date / le créneau s'ils sont remplis)
  const parametres = new URLSearchParams({ salle: salle.id });
  if (criteres.date) parametres.set("date", criteres.date);
  if (criteres.debut) parametres.set("debut", criteres.debut);
  if (criteres.fin) parametres.set("fin", criteres.fin);
  const bouton = carte.querySelector(".carte-bouton");
  bouton.href = `reservation.html?${parametres}`;
  bouton.setAttribute("aria-label", `Réserver la ${salle.nom}`);

  return carte;
}

/** Vide la grille et affiche une carte par salle de la liste. */
function afficherSalles(salles, criteres) {
  zoneSalles.innerHTML = "";
  salles.forEach((salle) => {
    zoneSalles.append(creerCarteSalle(salle, criteres));
  });
  messageVide.hidden = salles.length > 0;
}

/** Texte ajouté au compteur : date et créneau choisis, s'il y en a. */
function decrireCreneau(criteres) {
  const morceaux = [];
  if (criteres.date) morceaux.push(formaterDate(criteres.date));
  if (criteres.debut && criteres.fin) morceaux.push(`${criteres.debut} – ${criteres.fin}`);
  if (criteres.capaciteMin > 0) morceaux.push(`${criteres.capaciteMin} pers. min.`);
  return morceaux.join(", ");
}

// ---------- 4. Tout mettre à jour ----------

/** Lit les filtres, filtre, trie, affiche les cartes et le compteur. */
function mettreAJour() {
  const criteres = lireCriteres();
  const resultat = trierSalles(filtrerSalles(SALLES, criteres), criteres.tri);
  afficherSalles(resultat, criteres);
  afficherCompteurSalles(zoneResume, resultat.length, SALLES.length, decrireCreneau(criteres));
}

/** Remet tous les filtres à zéro et réaffiche les 8 salles. */
function reinitialiserFiltres() {
  formFiltres.reset();
  champRecherche.value = "";
  listeTri.value = "capacite";
  mettreAJour();
}

// ---------- 5. Événements ----------

// Recherche : mise à jour à chaque lettre tapée
champRecherche.addEventListener("input", mettreAJour);

// Capacité : mise à jour pendant la saisie du nombre
champCapacite.addEventListener("input", mettreAJour);

// Cases, listes, date et heures : mise à jour quand la valeur change
formFiltres.addEventListener("change", mettreAJour);
listeTri.addEventListener("change", mettreAJour);

// Bouton « Appliquer » : on empêche le rechargement de la page
formFiltres.addEventListener("submit", (event) => {
  event.preventDefault();
  mettreAJour();
});

// Bouton « Réinitialiser »
boutonReinitialiser.addEventListener("click", (event) => {
  event.preventDefault();
  reinitialiserFiltres();
});

// La case « Uniquement les salles disponibles » n'a d'effet que si un créneau est choisi.
caseDisponibles.parentElement.title = "Choisissez une date et un créneau pour utiliser ce filtre";

// ---------- Premier affichage ----------
mettreAJour();

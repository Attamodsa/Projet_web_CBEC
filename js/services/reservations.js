/**
 * CampusBook — Règles métier des réservations (aucun accès au DOM)
 * Fichier : js/services/reservations.js — responsable : CB (voir D01, parties 4 et 5)
 *
 * Règles du D01 (mises à jour pour le D03) :
 *   R1  Horaires d'ouverture : 08:00 – 20:00 (la fin peut valoir exactement 20:00)
 *   R2  Cohérence : fin strictement après le début ; créneaux par pas de 30 min
 *   R3  Durée : 30 min minimum, 3 h maximum   (4 h dans le D01 → 3 h imposé par le D03)
 *   R4  Pas de passé : on ne réserve pas un créneau déjà commencé ou passé
 *   R5  Capacité : 1 ≤ participants ≤ capacité de la salle (capacité exacte acceptée)
 *   R6  Pas de chevauchement dans une même salle le même jour ; consécutif autorisé
 *   R7  Annulation : seule une réservation confirmée et future peut être annulée
 *
 * ┌────────────────────────────────────────────────────────────────────────┐
 * │ DÉTECTION DES CONFLITS (R6) — à savoir expliquer                        │
 * │                                                                        │
 * │ On ne compare qu'avec les réservations de la MÊME salle, à la MÊME     │
 * │ date, au statut "confirmee". Puis, heures converties en minutes :      │
 * │                                                                        │
 * │      conflit  ⇔  nouvelle.debut < existante.fin                        │
 * │                ET existante.debut < nouvelle.fin                       │
 * │                                                                        │
 * │ Deux créneaux n'ont AUCUNE partie commune seulement si l'un finit      │
 * │ avant (ou pile quand) l'autre commence. La condition ci-dessus est     │
 * │ exactement le contraire. Avec R0 = 10:00–12:00 (600–720) :             │
 * │                                                                        │
 * │            08   09   10   11   12   13                                 │
 * │   R0                 [=========]                                       │
 * │   inclus                 [==]            10:30–11:30 → conflit         │
 * │   avant + pendant   [=======]            09:00–11:00 → conflit         │
 * │   pendant + après        [=======]       11:00–13:00 → conflit         │
 * │   englobe          [==============]      09:30–12:30 → conflit         │
 * │   consécutif                   [====]    12:00–13:00 → OK (720<720 faux)│
 * │   consécutif  [=====]                    08:00–10:00 → OK (600<600 faux)│
 * └────────────────────────────────────────────────────────────────────────┘
 */

import { SALLES, HORAIRES } from "../data/salles.js";
import { enMinutes, enHeure, seChevauchent, estPasse, estDateValide, dateISO, formaterDate, formaterDuree } from "../utils/temps.js";
import { chargerReservations, sauvegarderReservations } from "./stockage.js";

const MOTIF_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** "S03" → objet salle (ou undefined). */
export function trouverSalle(salleId) {
  return SALLES.find((s) => s.id === salleId);
}

// =====================================================================
// Capacité et disponibilité
// =====================================================================

/** R5 : nb est un entier ET 1 ≤ nb ≤ capacité. */
export function verifierCapacite(salle, nb) {
  return Number.isInteger(nb) && nb >= 1 && nb <= salle.capacite;
}

/**
 * R6 : renvoie la réservation en conflit, ou null si la salle est libre.
 * debut et fin sont en minutes (ex. 600 et 720 pour 10:00 – 12:00).
 */
export function verifierDisponibilite(salleId, date, debut, fin, reservations) {
  for (const r of reservations) {
    if (
      r.salleId === salleId &&
      r.date === date &&
      r.statut === "confirmee" &&
      seChevauchent(debut, fin, enMinutes(r.heureDebut), enMinutes(r.heureFin))
    ) {
      return r; // conflit : on renvoie la réservation gênante
    }
  }
  return null; // salle libre sur ce créneau
}

/** Réservations confirmées d'une salle pour une date, triées par heure (planning, badges). */
export function reservationsDuJour(salleId, date, reservations = chargerReservations()) {
  return reservations
    .filter((r) => r.salleId === salleId && r.date === date && r.statut === "confirmee")
    .sort((a, b) => enMinutes(a.heureDebut) - enMinutes(b.heureDebut));
}

// =====================================================================
// Validation d'une demande (R1 à R6)
// =====================================================================

/**
 * Applique R1 à R6 et renvoie la liste des erreurs (vide = réservation possible).
 * Toutes les erreurs sont collectées pour être affichées en une fois (maquette 2).
 * Chaque erreur : { champ, regle, message }  — champ = nom du champ du formulaire.
 *
 * @param {object} demande  valeurs du formulaire (textes) :
 *        { nom, email, salleId, date, heureDebut, heureFin, nbParticipants }
 * @param {object|undefined} salle
 * @param {object[]} reservations  réservations déjà enregistrées
 * @param {Date} maintenant
 */
export function validerReservation(demande, salle, reservations, maintenant = new Date()) {
  const erreurs = [];
  const ajouter = (champ, regle, message) => erreurs.push({ champ, regle, message });

  // ---------- Champs obligatoires ----------
  const nom = (demande.nom || "").trim();
  const email = (demande.email || "").trim();
  const texteNb = String(demande.nbParticipants ?? "").trim();

  if (nom === "") ajouter("nom", "—", "Champ obligatoire : indiquez le nom du responsable.");
  if (email === "") ajouter("email", "—", "Champ obligatoire : indiquez votre adresse e-mail.");
  else if (!MOTIF_EMAIL.test(email)) ajouter("email", "—", "Adresse e-mail invalide (ex. prenom.nom@epita.fr).");
  if (!demande.salleId) ajouter("salleId", "—", "Champ obligatoire : choisissez une salle.");
  else if (!salle) ajouter("salleId", "—", "Salle inconnue : choisissez une salle dans la liste.");
  if (!demande.date) ajouter("date", "—", "Champ obligatoire : choisissez une date.");
  else if (!estDateValide(demande.date)) ajouter("date", "—", "Date invalide.");
  if (!demande.heureDebut) ajouter("heureDebut", "—", "Champ obligatoire : indiquez l'heure de début.");
  if (!demande.heureFin) ajouter("heureFin", "—", "Champ obligatoire : indiquez l'heure de fin.");
  if (texteNb === "") ajouter("nbParticipants", "—", "Champ obligatoire : indiquez le nombre de participants.");

  // ---------- Horaires : R2, R1, R2 (pas), R3, R4 ----------
  const debut = enMinutes(demande.heureDebut);
  const fin = enMinutes(demande.heureFin);
  const nbErreursAvantHoraires = erreurs.length;
  let horairesVerifies = false;

  if (demande.heureDebut && Number.isNaN(debut)) ajouter("heureDebut", "R2", "Heure de début invalide (format HH:MM).");
  if (demande.heureFin && Number.isNaN(fin)) ajouter("heureFin", "R2", "Heure de fin invalide (format HH:MM).");

  if (!Number.isNaN(debut) && !Number.isNaN(fin)) {
    horairesVerifies = true;
    const ouverture = enHeure(HORAIRES.ouverture);
    const fermeture = enHeure(HORAIRES.fermeture);

    // R2 — la fin doit être strictement après le début
    if (fin <= debut) {
      ajouter("heureFin", "R2", `La fin doit être après le début (début ${demande.heureDebut}, fin ${demande.heureFin}).`);
    }
    // R1 — horaires d'ouverture
    if (debut < HORAIRES.ouverture || fin > HORAIRES.fermeture) {
      ajouter(
        debut < HORAIRES.ouverture ? "heureDebut" : "heureFin",
        "R1",
        `Hors horaires d'ouverture : les salles sont ouvertes de ${ouverture} à ${fermeture}.`
      );
    }
    // R2 — pas de 30 min
    if (debut % HORAIRES.pas !== 0 || fin % HORAIRES.pas !== 0) {
      ajouter(
        debut % HORAIRES.pas !== 0 ? "heureDebut" : "heureFin",
        "R2",
        "Pas de 30 min : les horaires doivent tomber sur une heure pile ou une demi-heure (ex. 10:00, 10:30)."
      );
    }
    // R3 — durée (seulement si la fin est après le début, sinon la durée n'a pas de sens)
    const duree = fin - debut;
    if (fin > debut && (duree < HORAIRES.dureeMin || duree > HORAIRES.dureeMax)) {
      ajouter(
        "heureFin",
        "R3",
        `Durée entre ${formaterDuree(HORAIRES.dureeMin)} et ${formaterDuree(HORAIRES.dureeMax)} : vous demandez ${formaterDuree(duree)}.`
      );
    }
    // R4 — pas de passé (date + heure de début ≤ maintenant)
    if (estDateValide(demande.date) && estPasse(demande.date, demande.heureDebut, maintenant)) {
      const memeJour = demande.date === dateISO(maintenant);
      ajouter(
        memeJour ? "heureDebut" : "date",
        "R4",
        memeJour
          ? `Créneau passé : il est ${enHeure(maintenant.getHours() * 60 + maintenant.getMinutes())}, choisissez un horaire plus tard.`
          : "Créneau passé : cette date est déjà passée."
      );
    }
  }

  // ---------- R5 — participants et capacité ----------
  if (texteNb !== "") {
    const nb = Number(texteNb);
    if (!Number.isInteger(nb) || nb < 1) {
      ajouter("nbParticipants", "R5", "Nombre de participants invalide : indiquez un nombre entier, au moins 1.");
    } else if (salle && !verifierCapacite(salle, nb)) {
      ajouter(
        "nbParticipants",
        "R5",
        `Capacité dépassée : ${nb} / ${salle.capacite} — la ${salle.nom} accepte ${salle.capacite} personnes au maximum.`
      );
    }
  }

  // ---------- R6 — conflit, seulement si les horaires sont corrects ----------
  // (une erreur de capacité n'empêche pas de signaler aussi un conflit, comme sur la maquette 2)
  const erreurHoraire = erreurs.length > nbErreursAvantHoraires &&
    erreurs.slice(nbErreursAvantHoraires).some((e) => e.regle !== "R5");
  if (salle && estDateValide(demande.date) && horairesVerifies && !erreurHoraire) {
    const conflit = verifierDisponibilite(salle.id, demande.date, debut, fin, reservations);
    if (conflit) {
      erreurs.push({
        champ: "heureDebut",
        regle: "R6",
        conflit,
        message:
          `Chevauche ${conflit.heureDebut}–${conflit.heureFin} : la ${salle.nom} est déjà réservée ` +
          `le ${formaterDate(conflit.date)} de ${conflit.heureDebut} à ${conflit.heureFin}` +
          (conflit.motif ? ` (« ${conflit.motif} »)` : "") +
          ". Choisissez un autre créneau ou une autre salle.",
      });
    }
  }

  return erreurs;
}

// =====================================================================
// Création et annulation
// =====================================================================

/**
 * Identifiant unique, ex. "R-1764190000000-1" : Date.now() change chaque
 * milliseconde, le petit numéro évite les doublons dans la même milliseconde,
 * et on vérifie qu'il n'est pas déjà utilisé.
 */
let compteurId = 0;
export function genererId(reservations) {
  let id;
  do {
    compteurId += 1;
    id = `R-${Date.now()}-${compteurId}`;
  } while (reservations.some((r) => r.id === id));
  return id;
}

/**
 * Relit le stockage juste avant d'enregistrer, REVALIDE la demande (une autre
 * page a pu réserver entre-temps), génère id / creeLe, puis enregistre.
 * @returns {{ ok: boolean, erreurs: object[], reservation: object|null, sauvegardee: boolean }}
 */
export function creerReservation(demande, maintenant = new Date(), stockage) {
  const reservations = chargerReservations(stockage);
  const salle = trouverSalle(demande.salleId);
  const erreurs = validerReservation(demande, salle, reservations, maintenant);
  if (erreurs.length > 0) {
    return { ok: false, erreurs, reservation: null, sauvegardee: false };
  }

  const reservation = {
    id: genererId(reservations),
    salleId: demande.salleId,
    date: demande.date,
    heureDebut: demande.heureDebut,
    heureFin: demande.heureFin,
    nbParticipants: Number(demande.nbParticipants),
    motif: (demande.motif || "").trim(),
    commentaire: (demande.commentaire || "").trim(),
    demandeur: { nom: demande.nom.trim(), email: demande.email.trim() },
    statut: "confirmee",
    creeLe: maintenant.toISOString(),
    annuleLe: null,
  };

  reservations.push(reservation);
  const sauvegardee = sauvegarderReservations(reservations, stockage);
  return { ok: true, erreurs: [], reservation, sauvegardee };
}

/**
 * R7 : passe le statut à "annulee" si la réservation est confirmée et future.
 * Rien d'autre à faire pour libérer le créneau : verifierDisponibilite()
 * ne tient compte que des réservations confirmées.
 * @returns {{ ok: boolean, erreur: string|null, reservation: object|null }}
 */
export function annulerReservation(id, maintenant = new Date(), stockage) {
  const reservations = chargerReservations(stockage);
  const r = reservations.find((x) => x.id === id);

  if (!r || r.statut === "annulee") {
    return { ok: false, erreur: "Réservation introuvable ou déjà annulée.", reservation: null };
  }
  if (estPasse(r.date, r.heureDebut, maintenant)) {
    return { ok: false, erreur: "Réservation passée : annulation impossible.", reservation: r };
  }

  r.statut = "annulee";
  r.annuleLe = maintenant.toISOString();
  sauvegarderReservations(reservations, stockage);
  return { ok: true, erreur: null, reservation: r };
}

/**
 * CampusBook — Tests des règles métier
 * Fichier : tests/reservations.test.js  (affiché par tests/tests.html)
 *
 * Reprend les scénarios T1 à T13 du dossier de conception (D01, partie 6),
 * puis ajoute des cas limites (T14 et suivants).
 *
 * Données de départ communes (D01) : une réservation existante R0 —
 * Salle Hopper (S03, 12 places), le 20/11/2026 de 10:00 à 12:00, confirmée.
 *
 * - Les tests sont « exécutés avant cette date » : la date du jour est FIXÉE au
 *   dimanche 15/11/2026 à 09:00 (paramètre maintenant), pour que les résultats
 *   ne changent pas selon le jour où l'on ouvre la page.
 * - Chaque test repart de l'état initial : il reçoit un NOUVEAU faux stockage
 *   qui ne contient que R0. Le vrai localStorage n'est jamais modifié.
 * - Chaque scénario est un objet { nom, entree, attendu } (D01).
 */

import { CLE_STOCKAGE, chargerReservations } from "../js/services/stockage.js";
import {
  creerReservation, annulerReservation, validerReservation, verifierDisponibilite, trouverSalle,
} from "../js/services/reservations.js";

const MAINTENANT = new Date(2026, 10, 15, 9, 0); // 15/11/2026 09:00 (mois 10 = novembre)

const R0 = {
  id: "R0", salleId: "S03", date: "2026-11-20", heureDebut: "10:00", heureFin: "12:00",
  nbParticipants: 8, motif: "Réunion projet", statut: "confirmee",
  demandeur: { nom: "Eduardo COSTA PAULO", email: "eduardo@epita.fr" },
  creeLe: "2026-11-11T10:00:00.000Z", annuleLe: null,
};

/** Faux localStorage en mémoire (mêmes méthodes que le vrai). */
function fauxStockage(contenu) {
  const donnees = new Map();
  if (contenu !== undefined) donnees.set(CLE_STOCKAGE, contenu);
  return {
    getItem: (cle) => (donnees.has(cle) ? donnees.get(cle) : null),
    setItem: (cle, valeur) => donnees.set(cle, String(valeur)),
    removeItem: (cle) => donnees.delete(cle),
  };
}

/** État initial du D01 : un stockage qui contient seulement R0. */
function etatInitial() {
  return fauxStockage(JSON.stringify([R0]));
}

/** Demande complète ; on ne précise dans chaque test que ce qui change. */
function demande(salleId, date, heureDebut, heureFin, nbParticipants) {
  return {
    nom: "Calvin BERNARDO", email: "calvin.b@epita.fr", motif: "Test",
    salleId, date, heureDebut, heureFin, nbParticipants: String(nbParticipants),
  };
}

/** Tente une réservation dans le stockage donné et résume le résultat. */
function reserver(stockage, d) {
  const r = creerReservation(d, MAINTENANT, stockage);
  return {
    ok: r.ok,
    texte: r.ok ? `Acceptée (statut « ${r.reservation.statut} »)` : `Refusée : ${r.erreurs.map((e) => e.message).join(" / ")}`,
    regles: r.erreurs.map((e) => e.regle),
    messages: r.erreurs.map((e) => e.message),
    reservation: r.reservation,
  };
}

/** Raccourci : la demande doit être acceptée. */
function doitEtreAcceptee(d) {
  return () => {
    const r = reserver(etatInitial(), d);
    return { ok: r.ok, obtenu: r.texte };
  };
}

/** Raccourci : la demande doit être refusée avec un message qui contient motCle. */
function doitEtreRefusee(d, motCle) {
  return () => {
    const r = reserver(etatInitial(), d);
    return { ok: !r.ok && r.messages.some((m) => m.includes(motCle)), obtenu: r.texte };
  };
}

// ======================================================================
// Scénarios
// ======================================================================

export const SCENARIOS = [
  // ---------------- T1 à T13 : dossier de conception D01 ----------------
  {
    id: "T1", nom: "Réservation valide", regle: "toutes",
    entree: "S03, 20/11, 14:00–15:30, 8 participants",
    attendu: "Acceptée ; ajoutée au stockage avec statut « confirmee »",
    executer: () => {
      const stockage = etatInitial();
      const r = reserver(stockage, demande("S03", "2026-11-20", "14:00", "15:30", 8));
      const enregistree = chargerReservations(stockage).find((x) => r.reservation && x.id === r.reservation.id);
      return {
        ok: r.ok && enregistree?.statut === "confirmee",
        obtenu: `${r.texte}${enregistree ? ` ; présente dans le stockage (id ${enregistree.id})` : ""}`,
      };
    },
  },
  {
    id: "T2", nom: "Salle trop petite", regle: "R5",
    entree: "S05 Box Ritchie (4 places), 21/11, 10:00–11:00, 6 participants",
    attendu: "Refusée : « Capacité dépassée : 6 / 4 »",
    executer: doitEtreRefusee(demande("S05", "2026-11-21", "10:00", "11:00", 6), "Capacité dépassée : 6 / 4"),
  },
  {
    id: "T3", nom: "Deux réservations qui se chevauchent", regle: "R6",
    entree: "S03, 20/11, 11:00–13:00, 5 participants",
    attendu: "Refusée : chevauche R0 (10:00–12:00)",
    executer: doitEtreRefusee(demande("S03", "2026-11-20", "11:00", "13:00", 5), "Chevauche 10:00–12:00"),
  },
  {
    id: "T4", nom: "Deux réservations consécutives", regle: "R6",
    entree: "S03, 20/11, 12:00–13:00 puis 08:00–10:00",
    attendu: "Les deux acceptées (12:00 < 12:00 est faux)",
    executer: () => {
      // Le D01 prévoyait 09:00–10:00 ; 08:00–10:00 teste en plus la limite d'ouverture.
      const stockage = etatInitial();
      const a = reserver(stockage, demande("S03", "2026-11-20", "12:00", "13:00", 4));
      const b = reserver(stockage, demande("S03", "2026-11-20", "08:00", "10:00", 4));
      return { ok: a.ok && b.ok, obtenu: `12:00–13:00 : ${a.texte} · 08:00–10:00 : ${b.texte}` };
    },
  },
  {
    id: "T5", nom: "Horaires incorrects", regle: "R2",
    entree: "S02, 21/11, début 15:00, fin 14:00 ; puis début = fin = 15:00",
    attendu: "Refusées : « La fin doit être après le début »",
    executer: () => {
      const a = reserver(etatInitial(), demande("S02", "2026-11-21", "15:00", "14:00", 4));
      const b = reserver(etatInitial(), demande("S02", "2026-11-21", "15:00", "15:00", 4));
      const ok = [a, b].every((r) => !r.ok && r.messages.some((m) => m.includes("La fin doit être après le début")));
      return { ok, obtenu: `15:00–14:00 : ${a.texte} · 15:00–15:00 : ${b.texte}` };
    },
  },
  {
    id: "T6", nom: "Hors horaires d'ouverture", regle: "R1",
    entree: "S02, 21/11, 19:00–21:00",
    attendu: "Refusée : « Hors horaires d'ouverture »",
    executer: doitEtreRefusee(demande("S02", "2026-11-21", "19:00", "21:00", 4), "Hors horaires d'ouverture"),
  },
  {
    id: "T7", nom: "Créneau inclus / englobant", regle: "R6",
    entree: "S03, 20/11, 10:30–11:30 ; puis 09:30–12:30",
    attendu: "Refusées toutes les deux (conflit avec R0)",
    executer: () => {
      // Le D01 prévoyait 09:00–13:00 (4 h). Avec la durée max de 3 h (D03), cette demande
      // serait refusée par R3 avant même de chercher un conflit : on englobe R0 avec 09:30–12:30.
      const a = reserver(etatInitial(), demande("S03", "2026-11-20", "10:30", "11:30", 4));
      const b = reserver(etatInitial(), demande("S03", "2026-11-20", "09:30", "12:30", 4));
      const ok = [a, b].every((r) => !r.ok && r.regles.includes("R6"));
      return { ok, obtenu: `10:30–11:30 : ${a.texte} · 09:30–12:30 : ${b.texte}` };
    },
  },
  {
    id: "T8", nom: "Même horaire, autre salle", regle: "R6",
    entree: "S02, 20/11, 10:00–12:00",
    attendu: "Acceptée (le conflit ne concerne que la même salle)",
    executer: doitEtreAcceptee(demande("S02", "2026-11-20", "10:00", "12:00", 4)),
  },
  {
    id: "T9", nom: "Capacité exacte (limite)", regle: "R5",
    entree: "S03, 22/11, 10:00–11:00, 12 participants",
    attendu: "Acceptée (12 ≤ 12)",
    executer: doitEtreAcceptee(demande("S03", "2026-11-22", "10:00", "11:00", 12)),
  },
  {
    id: "T10", nom: "Date passée", regle: "R4",
    entree: "S02, 10/11/2026, 10:00–11:00",
    attendu: "Refusée : « Créneau passé »",
    executer: doitEtreRefusee(demande("S02", "2026-11-10", "10:00", "11:00", 4), "Créneau passé"),
  },
  {
    id: "T11", nom: "Annulation puis nouvelle réservation", regle: "R7",
    entree: "Annuler R0, puis réserver S03, 20/11, 11:00–13:00",
    attendu: "R0 passe à « annulee » ; la demande refusée en T3 est acceptée",
    executer: () => {
      const stockage = etatInitial();
      const annulation = annulerReservation("R0", MAINTENANT, stockage);
      const statutR0 = chargerReservations(stockage).find((r) => r.id === "R0").statut;
      const r = reserver(stockage, demande("S03", "2026-11-20", "11:00", "13:00", 5));
      return {
        ok: annulation.ok && statutR0 === "annulee" && r.ok,
        obtenu: `R0 : « ${statutR0} » · nouvelle demande : ${r.texte}`,
      };
    },
  },
  {
    id: "T12", nom: "Durée trop longue", regle: "R3",
    entree: "S07, 21/11, 08:00–13:00 (5 h)",
    attendu: "Refusée : « Durée entre 30 min et 3 h » (4 h au D01)",
    executer: doitEtreRefusee(demande("S07", "2026-11-21", "08:00", "13:00", 10), "Durée entre 30 min et 3 h"),
  },
  {
    id: "T13", nom: "Stockage vide ou invalide", regle: "D00",
    entree: "localStorage sans clé, puis contenant \"abc\"",
    attendu: "Aucun plantage : liste vide, toutes les salles libres",
    executer: () => {
      const vide = chargerReservations(fauxStockage());
      const invalide = chargerReservations(fauxStockage("abc"));
      const libre = verifierDisponibilite("S03", "2026-11-20", 600, 720, invalide) === null;
      const r = reserver(fauxStockage("abc"), demande("S03", "2026-11-20", "10:00", "12:00", 4));
      return {
        ok: vide.length === 0 && invalide.length === 0 && libre && r.ok,
        obtenu: `sans clé : ${vide.length} réservation · "abc" : ${invalide.length} réservation, ` +
          `S03 libre : ${libre ? "oui" : "non"} · réservation ensuite : ${r.texte}`,
      };
    },
  },

  // ---------------- Cas limites supplémentaires (D03) ----------------
  {
    id: "T14", nom: "Chevauchement partiel (commence avant)", regle: "R6",
    entree: "S03, 20/11, 09:00–11:00", attendu: "Refusée : chevauche R0",
    executer: doitEtreRefusee(demande("S03", "2026-11-20", "09:00", "11:00", 4), "Chevauche 10:00–12:00"),
  },
  {
    id: "T15", nom: "Mêmes horaires exacts que R0", regle: "R6",
    entree: "S03, 20/11, 10:00–12:00", attendu: "Refusée : chevauche R0",
    executer: doitEtreRefusee(demande("S03", "2026-11-20", "10:00", "12:00", 4), "Chevauche 10:00–12:00"),
  },
  {
    id: "T16", nom: "Même salle, autre jour", regle: "R6",
    entree: "S03, 21/11, 10:00–12:00", attendu: "Acceptée",
    executer: doitEtreAcceptee(demande("S03", "2026-11-21", "10:00", "12:00", 4)),
  },
  {
    id: "T17", nom: "Fin exactement à 20:00", regle: "R1",
    entree: "S02, 21/11, 18:00–20:00", attendu: "Acceptée",
    executer: doitEtreAcceptee(demande("S02", "2026-11-21", "18:00", "20:00", 4)),
  },
  {
    id: "T18", nom: "Début avant l'ouverture", regle: "R1",
    entree: "S02, 21/11, 07:30–09:00", attendu: "Refusée : « Hors horaires d'ouverture »",
    executer: doitEtreRefusee(demande("S02", "2026-11-21", "07:30", "09:00", 4), "Hors horaires d'ouverture"),
  },
  {
    id: "T19", nom: "Hors pas de 30 min", regle: "R2",
    entree: "S02, 21/11, 10:15–11:15", attendu: "Refusée : « Pas de 30 min »",
    executer: doitEtreRefusee(demande("S02", "2026-11-21", "10:15", "11:15", 4), "Pas de 30 min"),
  },
  {
    id: "T20", nom: "Durée minimale (30 min)", regle: "R3",
    entree: "S02, 21/11, 10:00–10:30", attendu: "Acceptée",
    executer: doitEtreAcceptee(demande("S02", "2026-11-21", "10:00", "10:30", 4)),
  },
  {
    id: "T21", nom: "Durée maximale (3 h pile)", regle: "R3",
    entree: "S02, 21/11, 14:00–17:00", attendu: "Acceptée",
    executer: doitEtreAcceptee(demande("S02", "2026-11-21", "14:00", "17:00", 4)),
  },
  {
    id: "T22", nom: "Durée de 3 h 30", regle: "R3",
    entree: "S02, 21/11, 14:00–17:30", attendu: "Refusée : « Durée entre 30 min et 3 h »",
    executer: doitEtreRefusee(demande("S02", "2026-11-21", "14:00", "17:30", 4), "Durée entre 30 min et 3 h"),
  },
  {
    id: "T23", nom: "Créneau du jour qui commence maintenant", regle: "R4",
    entree: "S02, 15/11 (aujourd'hui), 09:00–10:00 ; il est 09:00", attendu: "Refusée : « Créneau passé »",
    executer: doitEtreRefusee(demande("S02", "2026-11-15", "09:00", "10:00", 4), "Créneau passé"),
  },
  {
    id: "T24", nom: "Créneau du jour plus tard", regle: "R4",
    entree: "S02, 15/11 (aujourd'hui), 09:30–10:30", attendu: "Acceptée",
    executer: doitEtreAcceptee(demande("S02", "2026-11-15", "09:30", "10:30", 4)),
  },
  {
    id: "T25", nom: "Participants : 0, -3 et 2,5", regle: "R5",
    entree: "S02, 21/11, 10:00–11:00", attendu: "Refusées toutes les trois : « Nombre de participants invalide »",
    executer: () => {
      const res = ["0", "-3", "2.5"].map((nb) => reserver(etatInitial(), demande("S02", "2026-11-21", "10:00", "11:00", nb)));
      const ok = res.every((r) => !r.ok && r.messages.some((m) => m.includes("Nombre de participants invalide")));
      return { ok, obtenu: res.map((r, i) => `${["0", "-3", "2,5"][i]} : ${r.ok ? "acceptée" : "refusée"}`).join(" · ") };
    },
  },
  {
    id: "T26", nom: "Formulaire vide", regle: "—",
    entree: "aucun champ rempli", attendu: "Refusée : 7 messages « Champ obligatoire »",
    executer: () => {
      const r = reserver(etatInitial(), {});
      const nb = r.messages.filter((m) => m.startsWith("Champ obligatoire")).length;
      return { ok: !r.ok && nb === 7, obtenu: `Refusée : ${nb} messages « Champ obligatoire »` };
    },
  },
  {
    id: "T27", nom: "Capacité ET chevauchement (maquette 2)", regle: "R5 + R6",
    entree: "S03, 20/11, 11:00–12:00, 15 participants", attendu: "Refusée avec les deux erreurs",
    executer: () => {
      const r = reserver(etatInitial(), demande("S03", "2026-11-20", "11:00", "12:00", 15));
      return { ok: !r.ok && r.regles.includes("R5") && r.regles.includes("R6"), obtenu: r.texte };
    },
  },
  {
    id: "T28", nom: "Annulation d'une réservation passée", regle: "R7",
    entree: "Réservation du 10/11/2026, annulée le 15/11", attendu: "Refusée : « annulation impossible »",
    executer: () => {
      const ancienne = { ...R0, id: "R-ancienne", date: "2026-11-10" };
      const stockage = fauxStockage(JSON.stringify([R0, ancienne]));
      const r = annulerReservation("R-ancienne", MAINTENANT, stockage);
      return { ok: !r.ok && r.erreur.includes("annulation impossible"), obtenu: r.ok ? "Annulée" : `Refusée : ${r.erreur}` };
    },
  },
  {
    id: "T29", nom: "Identifiants uniques", regle: "—",
    entree: "3 réservations créées à la suite", attendu: "3 identifiants différents",
    executer: () => {
      const stockage = etatInitial();
      const ids = ["14:00", "15:00", "16:00"].map((h, i) =>
        reserver(stockage, demande("S03", "2026-11-20", h, `${14 + i}:30`, 4)).reservation?.id);
      return { ok: ids.every(Boolean) && new Set(ids).size === 3, obtenu: ids.join(" · ") };
    },
  },
];

/** Lance tous les scénarios ; un test qui plante compte comme un échec. */
export function executerTests() {
  return SCENARIOS.map((s) => {
    try {
      return { ...s, ...s.executer() };
    } catch (erreur) {
      return { ...s, ok: false, obtenu: `Erreur JavaScript : ${erreur.message}` };
    }
  });
}

// Petite vérification que l'on teste bien la bonne salle de référence.
console.assert(trouverSalle("S03").capacite === 12, "S03 doit avoir 12 places");
console.assert(validerReservation instanceof Function);

// ---------- Affichage dans tests/tests.html ----------
if (typeof document !== "undefined") {
  const resultats = executerTests();
  const corps = document.querySelector("#resultats-tests");

  resultats.forEach((r) => {
    const ligne = document.createElement("tr");
    const cellules = [r.id, `${r.nom} — ${r.entree}`, r.regle, r.attendu, r.obtenu, r.ok ? "✅" : "❌"];
    cellules.forEach((texte, i) => {
      const td = document.createElement(i === 0 ? "th" : "td");
      td.textContent = texte;
      ligne.append(td);
    });
    corps.append(ligne);
  });

  const reussis = resultats.filter((r) => r.ok).length;
  const resume = document.querySelector("#resume-tests");
  resume.textContent = `${reussis} / ${resultats.length} tests réussis`;
  resume.classList.add(reussis === resultats.length ? "alerte-succes" : "alerte-erreur");
}

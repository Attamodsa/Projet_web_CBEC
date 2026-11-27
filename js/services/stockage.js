/**
 * CampusBook — Lecture / écriture des réservations dans le localStorage
 * Fichier : js/services/stockage.js — responsable : CB (voir D01, partie 5)
 *
 * C'est le SEUL fichier qui touche au localStorage. Si on remplace un jour le
 * localStorage par une API, seul ce fichier change.
 *
 * Le paramètre « stockage » vaut localStorage par défaut. Les tests lui passent
 * un faux stockage en mémoire : le vrai localStorage n'est jamais modifié par
 * les tests, et chaque test peut repartir d'un état propre (D01, partie 6).
 */

export const CLE_STOCKAGE = "campusbook_reservations";

/** localStorage s'il est disponible, sinon null (navigation privée stricte, Node…). */
function stockageNavigateur() {
  try {
    return typeof localStorage !== "undefined" ? localStorage : null;
  } catch {
    return null;
  }
}

/**
 * Lit et parse le JSON. Renvoie toujours un tableau :
 * tableau vide si la clé est absente, si le JSON est invalide ("abc")
 * ou si le contenu n'est pas un tableau (difficulté prévue au D00, test T13).
 */
export function chargerReservations(stockage = stockageNavigateur()) {
  if (!stockage) return [];
  try {
    const texte = stockage.getItem(CLE_STOCKAGE);
    if (!texte) return [];
    const donnees = JSON.parse(texte);
    return Array.isArray(donnees) ? donnees : [];
  } catch {
    return [];
  }
}

/** Sérialise (JSON.stringify) et enregistre le tableau. Renvoie false en cas d'échec. */
export function sauvegarderReservations(liste, stockage = stockageNavigateur()) {
  if (!stockage) return false;
  try {
    stockage.setItem(CLE_STOCKAGE, JSON.stringify(liste));
    return true;
  } catch {
    return false; // stockage plein ou refusé : l'appelant affichera un message
  }
}

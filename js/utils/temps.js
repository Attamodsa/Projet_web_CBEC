/**
 * CampusBook — Calculs d'horaires (fonctions pures, aucun accès au DOM)
 * Fichier : js/utils/temps.js — responsable : CB (voir D01, partie 5)
 *
 * Idée clé : toutes les heures sont converties en MINUTES depuis minuit.
 *   "08:00" → 480    "10:30" → 630    "20:00" → 1200
 * Comparer deux nombres est simple et sûr ; comparer deux textes "HH:MM"
 * ne l'est pas ("9:00" > "10:00" est vrai en comparaison de textes).
 */

/** "10:30" → 630. Renvoie NaN si le texte n'est pas une heure valide. */
export function enMinutes(heure) {
  if (typeof heure !== "string" || !/^\d{2}:\d{2}$/.test(heure)) return NaN;
  const [h, m] = heure.split(":").map(Number);
  if (h > 23 || m > 59) return NaN;
  return h * 60 + m;
}

/** 630 → "10:30" */
export function enHeure(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Vrai si les intervalles [dA, fA[ et [dB, fB[ se chevauchent (valeurs en minutes).
 *
 *   Deux créneaux se chevauchent  ⇔  dA < fB  ET  dB < fA
 *
 * Comparaisons STRICTES : 10:00–12:00 et 12:00–13:00 ne se chevauchent pas
 * (720 < 720 est faux), donc deux réservations consécutives sont autorisées (R6).
 * Voir js/services/reservations.js pour l'explication détaillée des 4 cas.
 */
export function seChevauchent(dA, fA, dB, fB) {
  return dA < fB && dB < fA;
}

/** Date au format "AAAA-MM-JJ" en heure LOCALE (toISOString() donnerait l'heure UTC). */
export function dateISO(date) {
  const annee = date.getFullYear();
  const mois = String(date.getMonth() + 1).padStart(2, "0");
  const jour = String(date.getDate()).padStart(2, "0");
  return `${annee}-${mois}-${jour}`;
}

/**
 * Vrai si le moment date + heure est déjà commencé ou passé (R4 : date + heure ≤ maintenant).
 * « maintenant » est un paramètre pour que les tests puissent fixer la date du jour.
 */
export function estPasse(date, heure, maintenant = new Date()) {
  const aujourdhui = dateISO(maintenant);
  if (date !== aujourdhui) return date < aujourdhui; // "AAAA-MM-JJ" se compare bien comme texte
  return enMinutes(heure) <= maintenant.getHours() * 60 + maintenant.getMinutes();
}

/** Vrai si le texte est une date "AAAA-MM-JJ" qui existe vraiment (pas de 31/02). */
export function estDateValide(dateTexte) {
  if (typeof dateTexte !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(dateTexte)) return false;
  const [annee, mois, jour] = dateTexte.split("-").map(Number);
  const d = new Date(annee, mois - 1, jour);
  return d.getFullYear() === annee && d.getMonth() === mois - 1 && d.getDate() === jour;
}

/** 90 → "1 h 30", 120 → "2 h", 30 → "30 min" */
export function formaterDuree(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${String(m).padStart(2, "0")}`;
}

/** "2026-11-20" → "ven. 20/11/2026" */
export function formaterDate(dateTexte) {
  const [annee, mois, jour] = dateTexte.split("-").map(Number);
  return new Date(annee, mois - 1, jour).toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

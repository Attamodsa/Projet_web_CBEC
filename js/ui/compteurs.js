/**
 * CampusBook — Compteurs dynamiques
 * Fichier : js/ui/compteurs.js
 *
 * D02 : compteur du nombre de salles affichées dans le catalogue.
 * Il est rappelé après chaque changement de filtre.
 */

/**
 * Met à jour la phrase « X salles sur 8 » au-dessus des cartes.
 * @param {HTMLElement} element   zone de texte où écrire (#resume-resultats)
 * @param {number} nbAffichees    nombre de salles qui correspondent aux critères
 * @param {number} nbTotal        nombre total de salles
 * @param {string} complement     texte ajouté à la fin (date / créneau choisis), peut être vide
 */
export function afficherCompteurSalles(element, nbAffichees, nbTotal, complement) {
  const mot = nbAffichees > 1 ? "salles" : "salle";

  element.innerHTML = "";

  const nombre = document.createElement("strong");
  nombre.textContent = `${nbAffichees} ${mot}`;
  element.append(nombre, ` sur ${nbTotal}`);

  if (complement) {
    element.append(` · ${complement}`);
  }
}

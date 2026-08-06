// Affichage cohérent des points partout (BuzzList, onglets Scores, total d'équipe) — "0,5 pt" /
// "1 pt" (singulier tant que <= 1) / "6 pts" (pluriel au-delà).
export function formatPoints(points) {
  if (!points) return null
  const value = Number.isInteger(points) ? String(points) : String(points).replace('.', ',')
  return `${value} pt${points > 1 ? 's' : ''}`
}

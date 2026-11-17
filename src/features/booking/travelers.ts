/** "2 adults · 1 child · 1 infant" — used on Review, the confirmation and Trip details. */
export function travelersLabel(adults: number, children = 0, infants = 0) {
  const parts = [`${adults} ${adults === 1 ? 'adult' : 'adults'}`];
  if (children > 0) parts.push(`${children} ${children === 1 ? 'child' : 'children'}`);
  if (infants > 0) parts.push(`${infants} ${infants === 1 ? 'infant' : 'infants'}`);
  return parts.join(' · ');
}

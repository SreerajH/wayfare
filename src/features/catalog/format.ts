/** Whole amounts without cents ($999), otherwise exact ($2,097.90) — never rounds money. */
export function formatPrice(amount: number, currency = 'USD') {
  const whole = Number.isInteger(amount);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  }).format(amount);
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** "4 days · 3 nights", or just "1 day" for day trips. */
export function formatDuration(days: number, nights: number) {
  return nights > 0 ? `${plural(days, 'day')} · ${plural(nights, 'night')}` : plural(days, 'day');
}

export function formatReviews(count: number) {
  return `${count.toLocaleString('en-US')} ${count === 1 ? 'review' : 'reviews'}`;
}

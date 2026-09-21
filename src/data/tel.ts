/**
 * The `tel:` URI for a stored phone value.
 *
 * Ten-digit numbers get the country code so they dial from anywhere. Civic
 * short codes must not: `tel:+1311` does not connect, and 311 and 988 only
 * mean anything dialled as they are.
 *
 * This exists because the short codes shipped as `tel:+1311` — a Call button
 * on the 311 record, which is the number the abuse guide sends people to,
 * that could not place the call.
 */
export function telHref(value: string): string {
  return /^\d{10}$/.test(value) ? `tel:+1${value}` : `tel:${value}`;
}

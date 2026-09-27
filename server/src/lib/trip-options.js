/**
 * Add-on catalogue and cancellation policy.
 *
 * This company does not publish rates: group size, season and vehicle all
 * move the number, so the Mathura office quotes every trip by hand. Nothing
 * here carries a price — the catalogue exists so an enquiry can say what was
 * asked for, and the office prices it when it replies.
 */
export const ADDON_CATALOG = {
  // The station run is the single most asked-for extra in Mathura: almost
  // everyone arrives by train at the Junction.
  station_pickup: {
    label: 'Pick us up from Mathura Junction railway station',
    unit: 'one transfer',
  },
  station_drop: {
    label: 'Drop us at Mathura Junction railway station',
    unit: 'one transfer',
  },
  hotel_standard: { label: 'Standard rooms, Mathura base', unit: 'per night' },
  hotel_deluxe: { label: 'Deluxe rooms, Mathura base', unit: 'per night' },
  meal_veg: { label: 'Satvik meal plan', unit: 'per person per day' },
  temple_assist: { label: 'Priority darshan assistance', unit: 'per booking' },
};

/** Normalise requested add-ons into the lines an enquiry records. */
export function describeAddons(addons = []) {
  return addons.map((a) => ({
    ...a,
    quantity: Math.max(1, Number(a.quantity) || 1),
    label: a.label || ADDON_CATALOG[a.code]?.label || a.code,
  }));
}

/**
 * Cancellation terms, stated as notice windows. The office settles any refund
 * directly, so no figure is computed here.
 */
export const CANCELLATION_POLICY = [
  { window: 'More than 24 hours before departure', terms: 'Cancel free of charge' },
  { window: '6 to 24 hours before departure', terms: 'Part of the trip cost is retained' },
  { window: 'Under 6 hours before departure', terms: 'Full trip cost is retained' },
];

/** Loyalty is earned per trip taken, now that spend is not tracked here. */
export const POINTS_PER_TRIP = 50;

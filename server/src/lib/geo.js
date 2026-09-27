/** City coordinates used for route drawing, pickup points and live tracking. */
export const CITIES = {
  Mathura:   { lat: 27.4924, lng: 77.6737, state: 'Uttar Pradesh', region: 'Braj' },
  Vrindavan: { lat: 27.5806, lng: 77.7000, state: 'Uttar Pradesh', region: 'Braj' },
  Barsana:   { lat: 27.6470, lng: 77.3800, state: 'Uttar Pradesh', region: 'Braj' },
  Govardhan: { lat: 27.4971, lng: 77.4622, state: 'Uttar Pradesh', region: 'Braj' },
  Gokul:     { lat: 27.4384, lng: 77.7211, state: 'Uttar Pradesh', region: 'Braj' },
  Nandgaon:  { lat: 27.7139, lng: 77.3861, state: 'Uttar Pradesh', region: 'Braj' },
  Agra:      { lat: 27.1767, lng: 78.0081, state: 'Uttar Pradesh', region: 'Heritage' },
  Varanasi:  { lat: 25.3176, lng: 82.9739, state: 'Uttar Pradesh', region: 'Heritage' },
  Ayodhya:   { lat: 26.7922, lng: 82.1998, state: 'Uttar Pradesh', region: 'Heritage' },
  Lucknow:   { lat: 26.8467, lng: 80.9462, state: 'Uttar Pradesh', region: 'Other' },
  Sarnath:   { lat: 25.3811, lng: 83.0244, state: 'Uttar Pradesh', region: 'Heritage' },
  // Highway towns on the Agra-Varanasi run. They shape the drawn route and
  // give the overnight leg realistic waypoints; nothing departs from them.
  Kanpur:    { lat: 26.4499, lng: 80.3319, state: 'Uttar Pradesh', region: 'Other' },
  Prayagraj: { lat: 25.4358, lng: 81.8463, state: 'Uttar Pradesh', region: 'Other' },
  Bharatpur: { lat: 27.2152, lng: 77.5030, state: 'Rajasthan',     region: 'Heritage' },
  FatehpurSikri: { lat: 27.0945, lng: 77.6679, state: 'Uttar Pradesh', region: 'Heritage' },
  Deeg:      { lat: 27.4716, lng: 77.3251, state: 'Rajasthan',     region: 'Heritage' },
  Delhi:     { lat: 28.6139, lng: 77.2090, state: 'Delhi',         region: 'Feeder' },
  Noida:     { lat: 28.5355, lng: 77.3910, state: 'Uttar Pradesh', region: 'Feeder' },
  Shimla:    { lat: 31.1048, lng: 77.1734, state: 'Himachal Pradesh', region: 'Hills' },
  Manali:    { lat: 32.2432, lng: 77.1892, state: 'Himachal Pradesh', region: 'Hills' },
  Nainital:  { lat: 29.3803, lng: 79.4636, state: 'Uttarakhand',   region: 'Hills' },
  Mussoorie: { lat: 30.4598, lng: 78.0664, state: 'Uttarakhand',   region: 'Hills' },
};

/** Great-circle distance in km. */
export function haversine(a, b) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Interpolate a point `t` (0..1) of the way along a polyline of coordinates. */
export function pointAlong(path, t) {
  if (path.length === 0) return null;
  if (path.length === 1) return { ...path[0] };
  const legs = [];
  let total = 0;
  for (let i = 1; i < path.length; i += 1) {
    const d = haversine(path[i - 1], path[i]) || 0.001;
    legs.push(d);
    total += d;
  }
  let target = Math.max(0, Math.min(1, t)) * total;
  for (let i = 0; i < legs.length; i += 1) {
    if (target <= legs[i]) {
      const f = legs[i] === 0 ? 0 : target / legs[i];
      return {
        lat: path[i].lat + (path[i + 1].lat - path[i].lat) * f,
        lng: path[i].lng + (path[i + 1].lng - path[i].lng) * f,
      };
    }
    target -= legs[i];
  }
  return { ...path[path.length - 1] };
}

/**
 * Coordinates for every place an itinerary can name, so day-by-day stops can
 * be drawn on a map. Mirrors CITIES in server/src/lib/geo.js, plus the
 * itinerary-only stops that are never a departure point of their own.
 */
export const PLACES = {
  Delhi: { lat: 28.6139, lng: 77.209 },
  Noida: { lat: 28.5355, lng: 77.391 },
  Mathura: { lat: 27.4924, lng: 77.6737 },
  Vrindavan: { lat: 27.5806, lng: 77.7 },
  Gokul: { lat: 27.4384, lng: 77.7211 },
  Barsana: { lat: 27.647, lng: 77.38 },
  Nandgaon: { lat: 27.7139, lng: 77.3861 },
  Govardhan: { lat: 27.4971, lng: 77.4622 },
  Agra: { lat: 27.1767, lng: 78.0081 },
  Bharatpur: { lat: 27.2152, lng: 77.503 },
  'Fatehpur Sikri': { lat: 27.0945, lng: 77.6679 },
  Deeg: { lat: 27.4716, lng: 77.3251 },
  Kanpur: { lat: 26.4499, lng: 80.3319 },
  Prayagraj: { lat: 25.4358, lng: 81.8463 },
  Varanasi: { lat: 25.3176, lng: 82.9739 },
  Ayodhya: { lat: 26.7922, lng: 82.1998 },
  Lucknow: { lat: 26.8467, lng: 80.9462 },
  Sarnath: { lat: 25.3811, lng: 83.0244 },
  Shimla: { lat: 31.1048, lng: 77.1734 },
  Manali: { lat: 32.2432, lng: 77.1892 },
  Nainital: { lat: 29.3803, lng: 79.4636 },
  Mussoorie: { lat: 30.4598, lng: 78.0664 },
};

/** Turn a list of place names into map points, dropping any we cannot place. */
export const toPoints = (names = []) =>
  names.map((name) => (PLACES[name] ? { name, ...PLACES[name] } : null)).filter(Boolean);

/** Great-circle distance in km, for headline "how far is this" figures. */
export function distanceKm(a, b) {
  const R = 6371;
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Road distance along a named sequence, using the same 1.28 factor as the API. */
export function routeKm(names = []) {
  const pts = toPoints(names);
  let km = 0;
  for (let i = 1; i < pts.length; i += 1) km += distanceKm(pts[i - 1], pts[i]) * 1.28;
  return Math.round(km);
}

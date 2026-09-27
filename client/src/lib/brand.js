/**
 * One place for who we are and how to reach us, so a rename or a new office
 * line is a single edit rather than a hunt through every screen.
 */
export const BRAND = {
  name: 'Jai Maa Durge Tourism',
  short: 'JMD',
  glyph: 'JMD',
  since: 'Mathura since 1995',
  address:
    'Near Hare Krishna Orchid, Behind Prem Mandir, Sunrakh Road, Chaitanya Vihar / Sunrakh Bangar, Vrindavan, Uttar Pradesh 281121',
  city: 'Vrindavan',
};

/** Both lines are on WhatsApp, and both are answered from the Mathura office. */
export const PHONES = [
  { role: 'Bookings', display: '+91 79064 27172', dial: '+917906427172', whatsapp: true },
  { role: 'Control room, 24×7', display: '+91 89232 35591', dial: '+918923235591', whatsapp: true },
];

export const PRIMARY_PHONE = PHONES[0];
export const CONTROL_ROOM = PHONES[1];

export const telLink = (phone) => `tel:${String(phone).replace(/[^\d+]/g, '')}`;

export const waLink = (phone, text = '') =>
  `https://wa.me/${String(phone).replace(/\D/g, '')}` +
  (text ? `?text=${encodeURIComponent(text)}` : '');

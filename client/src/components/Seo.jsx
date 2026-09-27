import { useLocation } from 'react-router-dom';
import { BRAND, PHONES } from '../lib/brand.js';

/**
 * Per-page metadata.
 *
 * React 19 hoists <title>, <meta> and <link> rendered anywhere in the tree
 * into <head>, so each screen can declare its own without a helmet library.
 *
 * A caveat worth stating plainly: tags are necessary for search but they do
 * not rank a site on their own. What ranks is a crawlable page with real
 * content answering the query, plus links and reviews earned over time.
 */

export const SITE_URL = import.meta.env.VITE_SITE_URL || 'https://jmdtourism.in';

/**
 * JSON.stringify leaves "<" alone, so a value containing "</script>" would
 * close the tag early. Escaping the three characters that can start a tag
 * keeps the JSON valid and the document intact.
 */
export const safeJsonLd = (data) =>
  JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');

const TITLE_SUFFIX = `${BRAND.name} (${BRAND.short})`;

export default function Seo({
  title,
  description,
  path,
  image,
  keywords,
  jsonLd,
  noindex = false,
}) {
  const location = useLocation();
  const url = `${SITE_URL}${path ?? location.pathname}`;
  const fullTitle = title ? `${title} | ${TITLE_SUFFIX}` : TITLE_SUFFIX;

  return (
    <>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {keywords && <meta name="keywords" content={keywords} />}
      <link rel="canonical" href={url} />
      {noindex && <meta name="robots" content="noindex, follow" />}

      {/* Open Graph drives the WhatsApp and Facebook link preview, which for
          this business matters more than most: quotes go out over WhatsApp. */}
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={BRAND.name} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:locale" content="en_IN" />
      {image && <meta property="og:image" content={image} />}

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />

      {jsonLd && (
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger -- JSON-LD has no other route
          dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
        />
      )}
    </>
  );
}

/**
 * The business itself, emitted once on every page. This is what a search
 * engine reads for the local pack: name, address, phones, area served.
 */
export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'TravelAgency',
    '@id': `${SITE_URL}/#organization`,
    name: BRAND.name,
    alternateName: BRAND.short,
    url: SITE_URL,
    telephone: PHONES.map((p) => p.dial),
    foundingDate: '1995',
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Near Hare Krishna Orchid, Behind Prem Mandir, Sunrakh Road, Chaitanya Vihar / Sunrakh Bangar',
      addressLocality: 'Vrindavan',
      addressRegion: 'Uttar Pradesh',
      postalCode: '281121',
      addressCountry: 'IN',
    },
    geo: { '@type': 'GeoCoordinates', latitude: 27.5806, longitude: 77.7 },
    openingHoursSpecification: [{
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      opens: '07:00', closes: '21:00',
    }],
    areaServed: [
      'Mathura', 'Vrindavan', 'Gokul', 'Barsana', 'Nandgaon', 'Govardhan',
      'Agra', 'Fatehpur Sikri', 'Bharatpur', 'Deeg', 'Ayodhya', 'Varanasi',
      'Delhi', 'Noida', 'Shimla', 'Manali', 'Nainital', 'Mussoorie',
    ].map((name) => ({ '@type': 'City', name })),
    makesOffer: [
      'Whole-bus charter hire', 'Car hire with driver', 'Bike and scooter hire',
      'Rooms and stays', 'Guided Braj and Agra tours', 'Railway station transfers',
    ].map((n) => ({ '@type': 'Offer', itemOffered: { '@type': 'Service', name: n } })),
    sameAs: [],
  };
}

/** Breadcrumbs help a search engine show the path under the result. */
export function breadcrumbJsonLd(trail) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: `${SITE_URL}${c.path}`,
    })),
  };
}

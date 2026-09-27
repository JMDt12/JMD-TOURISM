import { Link, useParams, Navigate } from 'react-router-dom';
import { DESTINATIONS, findDestination } from '../lib/destinations.js';
import { PLACES, toPoints } from '../lib/places.js';
import Seo, { SITE_URL, breadcrumbJsonLd } from '../components/Seo.jsx';
import Artwork from '../components/Artwork.jsx';
import MiniMap from '../components/MiniMap.jsx';
import { Card, SectionHead, SourceBadge } from '../components/ui.jsx';
import { BRAND, PHONES, telLink, waLink } from '../lib/brand.js';
import { dayInput } from '../lib/format.js';
import { qs } from '../lib/api.js';

/** One page per place, so a search for that place has something to land on. */
export default function Destination() {
  const { slug } = useParams();
  const d = findDestination(slug);
  if (!d) return <Navigate to="/destinations" replace />;

  const nearby = DESTINATIONS.filter((x) => x.slug !== d.slug).slice(0, 4);
  const mapPoints = toPoints([d.city, ...d.gettingThere.map(([c]) => c)]);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      breadcrumbJsonLd([
        { name: 'Home', path: '/' },
        { name: 'Destinations', path: '/destinations' },
        { name: d.name, path: `/destinations/${d.slug}` },
      ]),
      {
        '@type': 'TouristDestination',
        name: d.name,
        description: d.metaDescription,
        url: `${SITE_URL}/destinations/${d.slug}`,
        touristType: 'Pilgrimage and heritage travellers',
        includesAttraction: d.sites.map((s) => ({ '@type': 'TouristAttraction', name: s })),
        ...(PLACES[d.city]
          ? { geo: { '@type': 'GeoCoordinates', latitude: PLACES[d.city].lat, longitude: PLACES[d.city].lng } }
          : {}),
      },
    ],
  };

  const enquiry = `Namaste ${BRAND.short}, I would like to ask about a trip to ${d.name}.`;

  return (
    <>
      <Seo
        title={d.metaTitle}
        description={d.metaDescription}
        path={`/destinations/${d.slug}`}
        keywords={`${d.city} tourism, ${d.city} bus booking, ${d.city} car hire, ${d.city} tour package, ${d.city} guide`}
        jsonLd={jsonLd}
      />

      <div className="mx-auto max-w-5xl px-4 py-8">
        <nav aria-label="Breadcrumb" className="text-sm text-ink-soft">
          <Link className="hover:underline" to="/destinations">Destinations</Link>
          <span aria-hidden="true"> › </span>
          <span>{d.name}</span>
        </nav>

        <header className="mt-3">
          <h1 className="font-display text-3xl sm:text-4xl">
            Tourism services in {d.name}
          </h1>
          <p className="mt-2 text-lg text-ink-soft">{d.tagline}</p>
          <div className="mt-3"><SourceBadge /></div>
        </header>

        <div className="mt-6 overflow-hidden rounded-2xl border border-line">
          <div className="aspect-[16/6]"><Artwork variant={d.scene} title={d.name} /></div>
        </div>

        <p className="mt-6 text-ink-soft">{d.intro}</p>

        <section className="mt-8">
          <SectionHead eyebrow="Run by us, not resold" title={`What we run in ${d.name}`} />
          <ul className="grid gap-2 sm:grid-cols-2">
            {d.weRun.map((x) => (
              <li key={x} className="flex gap-2 rounded-xl border border-line bg-white p-3 text-sm">
                <span className="text-peacock">✓</span>{x}
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link className="btn btn-primary"
                  to={`/search${qs({ to: d.city, date: dayInput(), passengers: 10 })}`}>
              Find a bus to {d.name}
            </Link>
            <Link className="btn btn-ghost" to="/cars">Cars with a driver</Link>
            <Link className="btn btn-ghost" to="/stays">Rooms</Link>
          </div>
        </section>

        <section className="mt-10">
          <SectionHead eyebrow="Named, not 'and others'" title="What is worth seeing" />
          <ul className="flex flex-wrap gap-1.5">
            {d.sites.map((s) => (
              <li key={s} className="rounded-full border border-line bg-paper-2 px-3 py-1 text-sm text-ink-soft">
                {s}
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-10 grid gap-6 lg:grid-cols-[1fr_1fr]">
          <div>
            <h2 className="font-display text-xl">Getting there</h2>
            <ul className="mt-3 divide-y divide-line">
              {d.gettingThere.map(([from, how]) => (
                <li key={from} className="flex flex-wrap justify-between gap-2 py-2.5 text-sm">
                  <Link className="font-medium hover:underline"
                        to={`/search${qs({ from, to: d.city, date: dayInput(), passengers: 10 })}`}>
                    From {from}
                  </Link>
                  <span className="text-ink-soft">{how}</span>
                </li>
              ))}
            </ul>
          </div>
          {mapPoints.length > 1 && (
            <div>
              <h2 className="font-display text-xl">On the map</h2>
              <div className="mt-3">
                <MiniMap
                  path={mapPoints}
                  hub={PLACES[d.city] ? { name: d.city, ...PLACES[d.city] } : null}
                  height={220}
                />
              </div>
            </div>
          )}
        </section>

        <Card className="mt-10 border-marigold/40 bg-marigold-100/50 p-5 sm:p-7">
          <h2 className="font-display text-2xl">Planning a trip to {d.name}?</h2>
          <p className="mt-2 max-w-2xl text-ink-soft">
            We quote every trip by hand from our Vrindavan office. Tell us your dates and how many
            of you there are and you will get a straight answer, usually within a couple of hours.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <a className="btn btn-primary" target="_blank" rel="noreferrer"
               href={waLink(PHONES[0].dial, enquiry)}>
              WhatsApp us
            </a>
            <a className="btn btn-ink" href={telLink(PHONES[0].dial)}>{PHONES[0].display}</a>
            <Link className="btn btn-ghost" to="/contact">All contact details</Link>
          </div>
        </Card>

        <section className="mt-10">
          <SectionHead eyebrow="Nearby" title="Other places we run to" />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {nearby.map((n) => (
              <Link key={n.slug} to={`/destinations/${n.slug}`}
                    className="card overflow-hidden transition hover:shadow-md">
                <div className="aspect-[16/9]"><Artwork variant={n.scene} title={n.name} /></div>
                <div className="p-3">
                  <p className="font-display text-lg leading-tight">{n.name}</p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-ink-soft">{n.tagline}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}

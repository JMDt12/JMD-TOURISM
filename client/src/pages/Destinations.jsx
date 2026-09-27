import { Link } from 'react-router-dom';
import { DESTINATIONS } from '../lib/destinations.js';
import Seo, { SITE_URL } from '../components/Seo.jsx';
import Artwork from '../components/Artwork.jsx';
import { SectionHead } from '../components/ui.jsx';

export default function Destinations() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: DESTINATIONS.map((d, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: d.name,
      url: `${SITE_URL}/destinations/${d.slug}`,
    })),
  };

  return (
    <>
      <Seo
        title="Where we run — Mathura, Vrindavan, Agra, Ayodhya and the Braj circuit"
        description="Bus, car, bike and room booking across Mathura, Vrindavan, Gokul, Barsana, Govardhan, Agra, Ayodhya, Varanasi and Bharatpur. A licensed Vrindavan operator with All India Permit vehicles."
        path="/destinations"
        keywords="Mathura tourism, Vrindavan tour operator, Agra day trip, Ayodhya bus booking, Barsana Govardhan Gokul tours, Braj circuit travel"
        jsonLd={jsonLd}
      />

      <div className="mx-auto max-w-6xl px-4 py-8">
        <header className="max-w-2xl">
          <h1 className="font-display text-3xl">Where we run</h1>
          <p className="mt-2 text-ink-soft">
            Every town below is somewhere we take groups ourselves, on our own vehicles with our
            own drivers. Each page says what we run there, what is worth seeing, and how long the
            drive takes.
          </p>
        </header>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {DESTINATIONS.map((d) => (
            <Link key={d.slug} to={`/destinations/${d.slug}`}
                  className="card flex flex-col overflow-hidden transition hover:shadow-md">
              <div className="aspect-[16/9]"><Artwork variant={d.scene} title={d.name} /></div>
              <div className="flex flex-1 flex-col p-4">
                <h2 className="font-display text-xl leading-tight">{d.name}</h2>
                <p className="mt-1 text-sm text-ink-soft">{d.tagline}</p>
                <p className="mt-3 line-clamp-2 text-xs text-ink-soft">
                  {d.sites.slice(0, 4).join(' · ')}
                </p>
                <p className="mt-auto pt-3 text-sm font-semibold text-indigo-brand">
                  Services in {d.name} →
                </p>
              </div>
            </Link>
          ))}
        </div>

        <section className="mt-12">
          <SectionHead eyebrow="Everything in one place" title="What we hire out" />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ['Whole buses', '/search', 'Charter the vehicle, never a single seat'],
              ['Cars with drivers', '/cars', 'For temple rounds and airport runs'],
              ['Bikes and scooters', '/bikes', 'Self-ride, helmets included'],
              ['Rooms and stays', '/stays', 'Mathura, Vrindavan, Govardhan, Agra'],
            ].map(([t, to, d]) => (
              <Link key={to} to={to} className="card p-4 transition hover:border-indigo-brand">
                <p className="font-display text-lg">{t}</p>
                <p className="mt-1 text-sm text-ink-soft">{d}</p>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}

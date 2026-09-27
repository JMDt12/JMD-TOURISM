import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApi } from '../lib/useApi.js';
import { qs } from '../lib/api.js';
import { Card, Badge, Stars, Spinner, ErrorNote, Empty, PhotoSlot, SectionHead } from '../components/ui.jsx';
import Seo from '../components/Seo.jsx';
import { sceneForCity } from '../components/Artwork.jsx';

export default function Guides() {
  const [city, setCity] = useState('');
  const [language, setLanguage] = useState('');
  const [sort, setSort] = useState('rating');

  const path = useMemo(() => `/guides${qs({ city, language, sort })}`, [city, language, sort]);
  const { data, loading, error, reload } = useApi(path);
  const guides = data?.guides ?? [];
  const meta = data?.meta;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <Seo
        title="Verified local guides in Mathura, Vrindavan, Barsana and Agra"
        description="Guides we have met in person, with ID checked and references taken. Temple history, Braj parikrama, Mughal heritage in Agra, in Hindi, English, Braj Bhasha, Urdu and more."
        path="/guides"
        keywords="Mathura tour guide, Vrindavan guide, Agra licensed guide, Braj parikrama guide"
      />
      <header className="max-w-2xl">
        <p className="text-[11px] font-bold tracking-[0.14em] text-marigold-dark uppercase">
          Verified in person, not listed by an algorithm
        </p>
        <h1 className="mt-2 font-display text-3xl">Local guides</h1>
        <p className="mt-2 text-ink-soft">
          Every guide here has walked into our Mathura office with their ID. We check documents,
          take references, and remove anyone travellers repeatedly flag. Ratings come only from
          people who actually booked.
        </p>
      </header>

      <div className="mt-6 flex flex-wrap gap-3">
        <select className="field w-auto" value={city} onChange={(e) => setCity(e.target.value)}>
          <option value="">All base cities</option>
          {(meta?.cities ?? []).map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className="field w-auto" value={language} onChange={(e) => setLanguage(e.target.value)}>
          <option value="">Any language</option>
          {(meta?.languages ?? []).map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
        <select className="field w-auto" value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="rating">Highest rated</option>
          <option value="experience">Most experienced</option>
        </select>
      </div>

      {loading && <Spinner label="Loading guides" />}
      {error && <div className="mt-4"><ErrorNote error={error} onRetry={reload} /></div>}

      {!loading && !guides.length && (
        <div className="mt-6">
          <Empty title="No guides match those filters" hint="Try a different city or language." />
        </div>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {guides.map((g) => (
          <Card key={g.id} className="flex flex-col overflow-hidden transition hover:shadow-md">
            <div className="flex gap-3 p-4">
              <PhotoSlot scene={sceneForCity(g.baseCity)} label="Guide photo" name={g.name}
                         alt={`${g.name}, guide in ${g.baseCity}`}
                         ratio="aspect-square" className="w-20 shrink-0" />
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 font-display text-lg leading-tight">
                  {g.name}
                  {g.verified && <span className="text-peacock" title="Verified by JMD">✓</span>}
                </p>
                <p className="text-xs text-ink-soft">{g.specialty}</p>
                <p className="mt-1"><Stars value={g.rating} count={g.ratingCount} /></p>
                <p className="mt-1 text-xs text-ink-soft">
                  {g.yearsExperience} yrs · based in {g.baseCity}
                </p>
              </div>
            </div>

            <p className="line-clamp-2 px-4 text-sm text-ink-soft">{g.bio}</p>

            <div className="mt-3 flex flex-wrap gap-1.5 px-4">
              {g.languages.map((l) => <Badge key={l}>{l}</Badge>)}
            </div>

            {!!g.itineraries.length && (
              <ul className="mt-3 space-y-1 px-4 text-xs text-ink-soft">
                {g.itineraries.map((it) => (
                  <li key={it.title} className="truncate">{it.title} ({it.hours}h)</li>
                ))}
              </ul>
            )}

            <div className="mt-auto flex items-center justify-end border-t border-line px-4 py-3">
              <Link to={`/guides/${g.id}`} className="btn btn-primary py-1.5 text-sm">View profile</Link>
            </div>
          </Card>
        ))}
      </div>

      <section className="mt-12">
        <SectionHead eyebrow="How to book one" title="Add a guide to any trip" />
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            ['Pick your bus first', 'Guides attach to a booking, so start with the trip or package you want.'],
            ['Choose an itinerary', 'Half-day Vrindavan, full Braj circuit, Govardhan parikrama — each is a set outing, not an hourly guess.'],
            ['The guide confirms', 'They accept in their own portal and you get their number on WhatsApp. If they cannot make it, we reassign and tell you.'],
          ].map(([t, d], i) => (
            <Card key={t} className="p-4">
              <span className="grid size-8 place-items-center rounded-lg bg-indigo-brand font-bold text-marigold">{i + 1}</span>
              <p className="mt-2 font-semibold">{t}</p>
              <p className="mt-1 text-sm text-ink-soft">{d}</p>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}

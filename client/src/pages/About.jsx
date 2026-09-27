import { Link } from 'react-router-dom';
import { useT } from '../context/LanguageContext.jsx';
import { Card, SourceBadge } from '../components/ui.jsx';
import Artwork from '../components/Artwork.jsx';
import { BRAND, PHONES, telLink, waLink } from '../lib/brand.js';

export default function About() {
  const t = useT();

  const facts = [
    ['about.fact.permit', 'about.fact.permitD'],
    ['about.fact.base', 'about.fact.baseD'],
    ['about.fact.since', 'about.fact.sinceD'],
    ['about.fact.control', 'about.fact.controlD'],
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <header className="max-w-2xl">
        <h1 className="font-display text-3xl">{t('about.title')}</h1>
        <p className="mt-2 text-lg text-ink-soft">{t('about.lead')}</p>
        <div className="mt-3"><SourceBadge /></div>
      </header>

      <div className="mt-6 overflow-hidden rounded-2xl border border-line">
        <div className="aspect-[16/6]"><Artwork variant="ghat" title={t('about.title')} /></div>
      </div>

      <div className="mt-6 space-y-4 text-ink-soft">
        <p>{t('about.p1')}</p>
        <p>{t('about.p2')}</p>
        <p>{t('about.p3')}</p>
      </div>

      <section className="mt-10">
        <h2 className="font-display text-xl">{t('about.factsTitle')}</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {facts.map(([k, d]) => (
            <Card key={k} className="p-4">
              <p className="flex items-center gap-2 font-semibold">
                <span className="text-marigold" aria-hidden="true">◆</span>{t(k)}
              </p>
              <p className="mt-1 text-sm text-ink-soft">{t(d)}</p>
            </Card>
          ))}
        </div>
      </section>

      <Card className="mt-8 border-marigold/40 bg-marigold-100/50 p-5">
        <p className="font-display text-xl">{BRAND.name}</p>
        <address className="mt-1 text-sm not-italic text-ink-soft">{BRAND.address}</address>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link to="/contact" className="btn btn-ink">{t('menu.contact')}</Link>
          <a className="btn btn-primary" target="_blank" rel="noreferrer"
             href={waLink(PHONES[0].dial, `Namaste ${BRAND.short}`)}>
            {t('nav.whatsappUs')}
          </a>
          <a className="btn btn-ghost" href={telLink(PHONES[0].dial)}>{PHONES[0].display}</a>
        </div>
      </Card>
    </div>
  );
}

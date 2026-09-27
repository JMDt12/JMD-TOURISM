import { Link } from 'react-router-dom';
import SearchBar from '../components/SearchBar.jsx';
import TripPlan from '../components/TripPlan.jsx';
import { useApi } from '../lib/useApi.js';
import { Card, SectionHead, Stars, PhotoSlot } from '../components/ui.jsx';
import { sceneForCity } from '../components/Artwork.jsx';
import { BRAND, PHONES, telLink, waLink } from '../lib/brand.js';
import Seo from '../components/Seo.jsx';
import { useT } from '../context/LanguageContext.jsx';

export default function Home() {
  const t = useT();
  const reviews = useApi('/reviews/latest');
  const guides = useApi('/guides?sort=rating');

  return (
    <>
      <Seo
        title="Bus, car, bike and room booking in Mathura, Vrindavan and Agra"
        description="A licensed Vrindavan operator since 1995. Whole-bus charters, cars with drivers, scooter hire, rooms and verified guides across Mathura, Vrindavan, Barsana, Govardhan, Agra and Ayodhya. Quoted by hand, usually within hours."
        path="/"
        keywords="tourism services Mathura, Vrindavan tour operator, bus booking Mathura, car hire Vrindavan, bike rental Vrindavan, Agra day trip, Ayodhya bus booking, Braj darshan package"
      />
      <Hero />

      <div className="mx-auto max-w-6xl space-y-14 px-4 py-12">
        <TrustBar />

        <TripPlan
          slug="complete-braj-darshan-5d"
          eyebrow="Tour one · the Braj mandal"
          title="Complete Braj Darshan"
          towns={['Mathura', 'Vrindavan', 'Gokul', 'Barsana', 'Nandgaon', 'Govardhan']}
          hub="Mathura"
        />

        <TripPlan
          slug="mathura-agra-circuit-4d"
          eyebrow="Tour two · Krishna and the Mughals"
          title="Mathura, Agra and the circuit around them"
          towns={['Vrindavan', 'Mathura', 'Agra', 'Fatehpur Sikri', 'Bharatpur', 'Deeg', 'Govardhan']}
        />

        <section className="rounded-2xl border border-line bg-white p-5 sm:p-8">
          <SectionHead
            eyebrow={t('home.guidesEyebrow')}
            title={t('home.guidesTitle')}
            action={<Link to="/guides" className="text-sm font-semibold text-indigo-brand underline">{t('home.browseGuides')}</Link>}
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {(guides.data?.guides ?? []).slice(0, 4).map((g) => (
              <Link key={g.id} to={`/guides/${g.id}`} className="group">
                <PhotoSlot scene={sceneForCity(g.baseCity)} label="Guide photo" name={g.name}
                           alt={`${g.name}, guide in ${g.baseCity}`} ratio="aspect-square" />
                <p className="mt-2 flex items-center gap-1.5 font-semibold">
                  {g.name}
                  {g.verified && <span className="text-peacock" title="Verified by JMD">✓</span>}
                </p>
                <p className="text-xs text-ink-soft">{g.specialty}</p>
                <p className="mt-1 flex items-center gap-2 text-xs">
                  <Stars value={g.rating} count={g.ratingCount} />
                </p>
                <p className="mt-1 text-xs text-ink-soft">{g.yearsExperience} yrs · {g.baseCity}</p>
              </Link>
            ))}
          </div>
        </section>

        {!!reviews.data?.reviews?.length && (
          <section>
            <SectionHead eyebrow={t('home.reviewsEyebrow')} title={t('home.reviewsTitle')} />
            <div className="grid gap-4 md:grid-cols-3">
              {reviews.data.reviews.slice(0, 3).map((r, i) => (
                <Card key={i} className="p-5">
                  <Stars value={r.rating} />
                  <p className="mt-2 text-sm leading-relaxed">{r.comment}</p>
                  <p className="mt-3 text-xs text-ink-soft">
                    {r.name}{r.route ? ` · ${r.route}` : ''}
                  </p>
                </Card>
              ))}
            </div>
          </section>
        )}

        <TalkToUs />
      </div>
    </>
  );
}

function Hero() {
  const t = useT();
  return (
    <section className="relative overflow-hidden bg-indigo-brand text-white">
      {/* Arch motif drawn in CSS so the hero needs no stock imagery. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.13]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 50% 100%, #e8930c 0 18px, transparent 19px), radial-gradient(circle at 0% 100%, #e8930c 0 18px, transparent 19px), radial-gradient(circle at 100% 100%, #e8930c 0 18px, transparent 19px)',
          backgroundSize: '90px 90px',
        }}
      />
      <div className="relative mx-auto max-w-6xl px-4 pt-12 pb-8 sm:pt-16">
        <p className="text-[11px] font-bold tracking-[0.2em] text-marigold uppercase">
          {t('home.heroKicker')}
        </p>
        <h1 className="mt-3 max-w-2xl font-display text-3xl leading-tight sm:text-5xl">
          {t('home.heroTitle')}
        </h1>
        <p className="mt-3 max-w-xl text-white/80">
          {BRAND.name} {t('home.heroBody')}
        </p>

        <div className="mt-5 flex flex-wrap gap-2 text-xs">
          {['home.chip.whole', 'home.chip.permit', 'home.chip.guides', 'home.chip.tracking']
            .map((k) => (
              <span key={k} className="rounded-full border border-white/25 bg-white/10 px-3 py-1.5 font-medium">
                {t(k)}
              </span>
            ))}
        </div>

        <div className="mt-7 text-ink">
          <SearchBar />
        </div>
      </div>
    </section>
  );
}

const TRUST = ['home.trust1', 'home.trust2', 'home.trust3', 'home.trust4'];

const TrustBar = () => {
  const t = useT();
  return (
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {TRUST.map((k) => (
        <div key={k}
             className="rounded-xl border border-line bg-white p-4 transition hover:border-marigold/50 hover:shadow-sm">
          <p className="flex items-center gap-2 font-semibold">
            <span className="text-marigold" aria-hidden="true">◆</span>{t(`${k}.t`)}
          </p>
          <p className="mt-1 text-sm text-ink-soft">{t(`${k}.d`)}</p>
        </div>
      ))}
    </section>
  );
};

/** With no prices on the site, the call to action is a conversation. */
const TalkToUs = () => {
  const t = useT();
  return (
  <section className="overflow-hidden rounded-2xl border border-line bg-linear-to-br from-marigold-100 to-paper-2">
    <div className="grid gap-6 p-6 sm:p-10 lg:grid-cols-[1.2fr_1fr] lg:items-center">
      <div>
        <p className="text-[11px] font-bold tracking-[0.14em] text-marigold-dark uppercase">
          {t('home.talkEyebrow')}
        </p>
        <h2 className="mt-2 font-display text-2xl sm:text-3xl">{t('home.talkTitle')}</h2>
        <p className="mt-3 max-w-xl text-ink-soft">{t('home.talkBody')}</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link to="/search" className="btn btn-ink">{t('search.findBus')}</Link>
          <a className="btn btn-primary" target="_blank" rel="noreferrer"
             href={waLink(PHONES[0].dial, `Namaste ${BRAND.short}, I would like to ask about a trip.`)}>
            {t('nav.whatsappUs')}
          </a>
        </div>
      </div>
      <ul className="space-y-3">
        {PHONES.map((p) => (
          <li key={p.dial} className="rounded-xl border border-line bg-white/85 p-4">
            <p className="text-[10px] font-bold tracking-[0.1em] text-ink-soft uppercase">{p.role}</p>
            <a className="font-display text-xl text-indigo-brand" href={telLink(p.dial)}>{p.display}</a>
            <p className="mt-1 text-xs text-ink-soft">
              Also on{' '}
              <a className="font-semibold text-peacock underline" target="_blank" rel="noreferrer"
                 href={waLink(p.dial, `Namaste ${BRAND.short}, I would like to ask about a trip.`)}>
                WhatsApp
              </a>
            </p>
          </li>
        ))}
      </ul>
    </div>
  </section>
  );
};

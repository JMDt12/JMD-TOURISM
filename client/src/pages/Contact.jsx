import { useT } from '../context/LanguageContext.jsx';
import { Card } from '../components/ui.jsx';
import MiniMap from '../components/MiniMap.jsx';
import { PLACES } from '../lib/places.js';
import { BRAND, PHONES, telLink, waLink } from '../lib/brand.js';

export default function Contact() {
  const t = useT();
  const hello = `Namaste ${BRAND.short}, I would like to ask about a trip.`;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <header className="max-w-2xl">
        <h1 className="font-display text-3xl">{t('contact.title')}</h1>
        <p className="mt-2 text-ink-soft">{t('contact.body')}</p>
      </header>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {PHONES.map((p) => (
          <Card key={p.dial} className="p-5">
            <p className="text-[10px] font-bold tracking-[0.1em] text-ink-soft uppercase">{p.role}</p>
            <a className="font-display text-2xl text-indigo-brand" href={telLink(p.dial)}>
              {p.display}
            </a>
            <div className="mt-3 flex flex-wrap gap-2">
              <a className="btn btn-ink py-1.5 text-sm" href={telLink(p.dial)}>
                {t('common.callUs')}
              </a>
              <a className="btn btn-primary py-1.5 text-sm" target="_blank" rel="noreferrer"
                 href={waLink(p.dial, hello)}>
                {t('common.whatsapp')}
              </a>
            </div>
          </Card>
        ))}
      </div>

      <Card className="mt-4 overflow-hidden">
        <MiniMap
          path={[{ name: 'Vrindavan', ...PLACES.Vrindavan }]}
          markers={[{ ...PLACES.Vrindavan, label: BRAND.short }]}
          height={200}
          className="rounded-none border-0"
        />
        <div className="p-5">
          <p className="text-[10px] font-bold tracking-[0.1em] text-ink-soft uppercase">
            {t('contact.office')}
          </p>
          <address className="mt-1 font-display text-lg not-italic">{BRAND.address}</address>
          <p className="mt-1 text-sm text-ink-soft">{t('contact.officeBody')}</p>

          <p className="mt-4 text-[10px] font-bold tracking-[0.1em] text-ink-soft uppercase">
            {t('contact.hours')}
          </p>
          <p className="mt-1 text-sm text-ink-soft">{t('contact.hoursBody')}</p>
        </div>
      </Card>
    </div>
  );
}

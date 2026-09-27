import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../lib/useApi.js';
import { dayInput } from '../lib/format.js';
import { qs } from '../lib/api.js';
import { DatePicker } from './Calendar.jsx';
import { useT } from '../context/LanguageContext.jsx';

/** The hero search: From, To, Date, Group size. Stacks on phones, one row on desktop. */
export default function SearchBar({ initial = {}, compact = false }) {
  const t = useT();
  const navigate = useNavigate();
  const { data } = useApi('/catalog/cities');
  const cities = data?.cities ?? [];

  const [from, setFrom] = useState(initial.from || 'Delhi');
  const [to, setTo] = useState(initial.to || 'Mathura');
  const [date, setDate] = useState(initial.date || dayInput());
  // Group size does not pick seats any more: it filters out vehicles that
  // are too small, because every booking takes the whole bus.
  const [passengers, setPassengers] = useState(Number(initial.passengers) || 10);

  // Which days actually have a whole vehicle free for this group, so the
  // calendar can grey out the rest instead of leading to an empty page.
  const avail = useApi(
    from && to ? `/trips/availability${qs({ from, to, passengers, days: 60 })}` : null,
    { skip: !from || !to }
  );

  const availability = useMemo(() => {
    if (!avail.data?.days) return null;
    return Object.fromEntries(avail.data.days.map((d) => [d.date, d]));
  }, [avail.data]);

  const lastScheduled = avail.data?.lastScheduled ?? null;

  const swap = () => { setFrom(to); setTo(from); };

  const submit = (e) => {
    e.preventDefault();
    navigate(`/search${qs({ from, to, date, passengers })}`);
  };

  const group = (list) => {
    const order = ['Feeder', 'Braj', 'Heritage', 'Hills', 'Other'];
    const by = {};
    list.forEach((c) => { (by[c.region] ||= []).push(c); });
    return order.filter((r) => by[r]).map((r) => [r, by[r]]);
  };

  const regionLabel = {
    Feeder: 'Pickup cities', Braj: 'Braj region', Heritage: 'Heritage circuit',
    Hills: 'Hill stations', Other: 'Other',
  };

  return (
    <form
      onSubmit={submit}
      className={`card grid gap-3 p-3 sm:p-4 ${compact ? '' : 'shadow-lg'} md:grid-cols-[1fr_auto_1fr_1fr_auto_auto] md:items-end`}
    >
      <div>
        <label className="label" htmlFor="sb-from">{t('common.from')}</label>
        <select id="sb-from" className="field" value={from} onChange={(e) => setFrom(e.target.value)}>
          {group(cities).map(([region, list]) => (
            <optgroup key={region} label={regionLabel[region]}>
              {list.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
            </optgroup>
          ))}
        </select>
      </div>

      <button
        type="button"
        onClick={swap}
        className="btn btn-ghost h-[42px] justify-self-start px-3 md:justify-self-auto"
        aria-label={t('search.swap')}
        title="Swap"
      >
        ⇅
      </button>

      <div>
        <label className="label" htmlFor="sb-to">{t('common.to')}</label>
        <select id="sb-to" className="field" value={to} onChange={(e) => setTo(e.target.value)}>
          {group(cities).map(([region, list]) => (
            <optgroup key={region} label={regionLabel[region]}>
              {list.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
            </optgroup>
          ))}
        </select>
      </div>

      <DatePicker
        id="sb-date"
        label={t('common.date')}
        value={date}
        onChange={setDate}
        min={dayInput()}
        max={lastScheduled ?? undefined}
        availability={availability}
      />

      <div className="w-full md:w-32">
        <label className="label" htmlFor="sb-group">{t('search.groupSize')}</label>
        <select id="sb-group" className="field" value={passengers}
                onChange={(e) => setPassengers(Number(e.target.value))}>
          {[4, 8, 10, 12, 16, 20, 25, 30, 35, 40, 45, 48].map((n) => (
            <option key={n} value={n}>{n} {t('common.people')}</option>
          ))}
        </select>
      </div>

      <button type="submit" className="btn btn-primary h-[42px] w-full md:w-auto">
        {t('search.findBus')}
      </button>
    </form>
  );
}

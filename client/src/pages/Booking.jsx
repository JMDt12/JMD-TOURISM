import { useState } from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useApi } from '../lib/useApi.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Card, Badge, Spinner, ErrorNote, PhotoSlot, Stars, Field } from '../components/ui.jsx';
import { sceneForCity } from '../components/Artwork.jsx';
import { time, dateLong, dayInput } from '../lib/format.js';
import { DatePicker } from '../components/Calendar.jsx';

const ROOM_ADDONS = [
  { code: 'hotel_standard', label: 'Standard rooms, Mathura base', unit: 'per night' },
  { code: 'hotel_deluxe', label: 'Deluxe rooms, Mathura base', unit: 'per night' },
];
const EXTRA_ADDONS = [
  { code: 'meal_veg', label: 'Satvik meal plan', unit: 'per person per day' },
  { code: 'temple_assist', label: 'Priority darshan assistance', unit: 'per booking' },
];

// Most people reach Braj by train, so the station run gets its own block
// rather than being buried among the meal plans.
const STATION_ADDONS = [
  {
    code: 'station_pickup',
    label: 'Pick us up from Mathura Junction',
    unit: 'We meet you on the platform-1 side, at the taxi stand',
  },
  {
    code: 'station_drop',
    label: 'Drop us at Mathura Junction',
    unit: 'Back at the station in time for your train',
  },
];

/**
 * Sending a trip request.
 *
 * We do not publish rates — season, group size and vehicle all move the
 * number — so this collects what the office needs in order to quote, and
 * nothing is committed until the traveller accepts that quote.
 */
export default function Booking() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [step, setStep] = useState(1);
  const [lead, setLead] = useState({ name: user?.name ?? '', age: '', gender: 'M' });
  const [extraNames, setExtraNames] = useState([]);
  const [contact, setContact] = useState({ phone: user?.phone ?? '', email: user?.email ?? '' });
  const [pickupPointId, setPickupPointId] = useState(state?.pickupPointId ?? '');
  const [travelDate, setTravelDate] = useState(state?.travelDate ?? dayInput());
  const [partySize, setPartySize] = useState(Number(state?.partySize) || Number(state?.travellers) || 1);
  const [addonCodes, setAddonCodes] = useState([]);
  const [guideChoice, setGuideChoice] = useState(null);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const trip = useApi(state?.tripId ? `/trips/${state.tripId}` : null, { skip: !state?.tripId });
  const guides = useApi('/guides?sort=rating');

  if (!state?.tripId && !state?.packageId && !state?.rentalId) return <Navigate to="/search" replace />;

  const t = trip.data?.trip;
  const pkg = state?.package;
  const rental = state?.rental;
  const capacity = t?.capacity;

  const detailsValid =
    lead.name.trim().length >= 2 &&
    Number(lead.age) >= 1 && Number(lead.age) < 120 &&
    partySize >= 1 && (!capacity || partySize <= capacity) &&
    /^[6-9]\d{9}$/.test(contact.phone) &&
    (!state?.tripId || pickupPointId);

  const send = async () => {
    setBusy(true);
    setError(null);
    try {
      const addons = addonCodes.map((code) => ({ code, quantity: 1 }));
      if (guideChoice) {
        addons.push({ code: 'guide', guideId: guideChoice.guideId, itineraryIndex: guideChoice.index });
      }
      const passengers = [
        { ...lead, age: Number(lead.age), lead: true },
        ...extraNames.filter((n) => n.trim()).map((name) => ({ name: name.trim() })),
      ];
      const created = await api.post('/bookings', {
        tripId: state?.tripId, packageId: state?.packageId, rentalId: state?.rentalId,
        travelDate: state?.tripId ? undefined : travelDate,
        endDate: state?.endDate, units: state?.units,
        passengers, partySize,
        pickupPointId: pickupPointId || null,
        addons, notes,
        // The form lets someone give a different number from their login,
        // which is common when one person books for a group.
        contactPhone: contact.phone || null,
        contactEmail: contact.email || null,
      });
      navigate(`/confirmation/${created.booking.reference}`, { replace: true });
    } catch (e) {
      setError(e);
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <Steps step={step} />

      {error && <div className="mb-4"><ErrorNote error={error} /></div>}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          {step === 1 && (
            <>
              <Card className="p-5">
                <h2 className="font-display text-xl">Who is in charge of the group?</h2>
                <p className="mt-1 text-sm text-ink-soft">
                  The bus is yours, so we need one lead passenger the office and the driver can
                  call — not a name for every seat.
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_90px_110px]">
                  <input
                    className="field" placeholder="Lead passenger name" value={lead.name}
                    autoComplete="name"
                    onChange={(e) => setLead({ ...lead, name: e.target.value })}
                  />
                  <input
                    className="field" placeholder="Age" inputMode="numeric" value={lead.age}
                    onChange={(e) => setLead({ ...lead, age: e.target.value.replace(/\D/g, '').slice(0, 3) })}
                  />
                  <select className="field" value={lead.gender}
                          onChange={(e) => setLead({ ...lead, gender: e.target.value })}>
                    <option value="M">Male</option>
                    <option value="F">Female</option>
                    <option value="O">Other</option>
                  </select>
                </div>

                <div className="mt-4">
                  <Field
                    label="How many people are travelling?"
                    id="party"
                    hint={capacity
                      ? `This bus seats ${capacity}. Group size shapes the quote, so give us your best count.`
                      : 'Group size shapes the quote, so give us your best count.'}
                  >
                    <input
                      id="party" type="number" className="field" min="1" max={capacity ?? 60}
                      value={partySize}
                      onChange={(e) => setPartySize(Number(e.target.value))}
                    />
                  </Field>
                  {capacity && partySize > capacity && (
                    <p className="mt-1 text-xs text-sindoor">
                      That is more than the {capacity} seats on this bus.
                    </p>
                  )}
                </div>

                <details className="mt-4 rounded-xl border border-line p-3">
                  <summary className="cursor-pointer text-sm font-medium">
                    Add other traveller names (optional)
                  </summary>
                  <p className="mt-1 text-xs text-ink-soft">
                    Only if you want them printed on the manifest. You can send the list later on WhatsApp.
                  </p>
                  <div className="mt-2 space-y-2">
                    {extraNames.map((n, i) => (
                      <input
                        key={i} className="field" placeholder={`Traveller ${i + 2}`} value={n}
                        onChange={(e) => setExtraNames((cur) =>
                          cur.map((v, idx) => (idx === i ? e.target.value : v)))}
                      />
                    ))}
                    <button
                      type="button" className="btn btn-ghost py-1.5 text-sm"
                      onClick={() => setExtraNames((cur) => [...cur, ''])}
                    >
                      + Add a name
                    </button>
                  </div>
                </details>
              </Card>

              <Card className="p-5">
                <h2 className="font-display text-xl">Where do we reach you?</h2>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <Field label="Mobile (WhatsApp)" id="ph"
                         hint="Your quote, then the driver number and live link, all arrive here.">
                    <input id="ph" className="field" inputMode="numeric" value={contact.phone}
                           onChange={(e) => setContact({ ...contact, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })} />
                  </Field>
                  <Field label="Email (optional)" id="em" hint="If you would rather have it in writing.">
                    <input id="em" type="email" className="field" value={contact.email}
                           onChange={(e) => setContact({ ...contact, email: e.target.value })} />
                  </Field>
                </div>

                {t && (
                  <div className="mt-4">
                    <label className="label" htmlFor="pick">Boarding point in {t.route.origin}</label>
                    <select id="pick" className="field" value={pickupPointId}
                            onChange={(e) => setPickupPointId(e.target.value)}>
                      <option value="">Choose a pickup point</option>
                      {t.pickupPoints.map((p) => (
                        <option key={p.id} value={p.id}>{p.area_name} — {p.landmark}</option>
                      ))}
                    </select>
                  </div>
                )}
                {!t && !rental && (
                  <div className="mt-4">
                    <DatePicker id="td" label="Start date" value={travelDate}
                                onChange={setTravelDate} min={dayInput()} />
                  </div>
                )}
              </Card>

              <button className="btn btn-primary w-full sm:w-auto"
                      disabled={!detailsValid} onClick={() => setStep(2)}>
                Continue to add-ons
              </button>
              {!detailsValid && (
                <p className="text-xs text-ink-soft">
                  Add the lead passenger&rsquo;s name and age, a head count, a 10-digit mobile
                  {t ? ', and a boarding point' : ''}.
                </p>
              )}
            </>
          )}

          {step === 2 && (
            <>
              <Card className="p-5">
                <h2 className="font-display text-xl">Add a local guide</h2>
                <p className="mt-1 text-sm text-ink-soft">
                  Optional. We will include them in the quote, and they confirm personally once you
                  accept it — you are not booking a stranger from a pool.
                </p>
                <div className="mt-4 space-y-3">
                  {(guides.data?.guides ?? []).slice(0, 4).map((g) => (
                    <div key={g.id} className="rounded-xl border border-line p-3">
                      <div className="flex items-start gap-3">
                        <PhotoSlot scene={sceneForCity(g.baseCity)} label="Guide photo" name={g.name}
                                   alt={`${g.name}, guide in ${g.baseCity}`}
                                   ratio="aspect-square" className="w-14 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="flex items-center gap-1.5 font-semibold">
                            {g.name} {g.verified && <span className="text-peacock" title="Verified">✓</span>}
                          </p>
                          <p className="text-xs text-ink-soft">{g.specialty} · {g.baseCity}</p>
                          <p className="mt-0.5"><Stars value={g.rating} count={g.ratingCount} /></p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {g.itineraries.map((it, idx) => {
                              const active = guideChoice?.guideId === g.id && guideChoice?.index === idx;
                              return (
                                <button
                                  key={it.title}
                                  type="button"
                                  aria-pressed={active}
                                  onClick={() => setGuideChoice(active ? null : { guideId: g.id, index: idx })}
                                  className={`rounded-lg border px-2.5 py-1.5 text-left text-xs transition ${
                                    active ? 'border-marigold-dark bg-marigold text-[#2a1500]'
                                           : 'border-line bg-white hover:bg-paper-2'
                                  }`}
                                >
                                  <span className="block font-semibold">{it.title}</span>
                                  <span className="opacity-75">{it.hours} hours</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-5">
                <h2 className="font-display text-xl">Railway station transfer</h2>
                <p className="mt-1 text-sm text-ink-soft">
                  Arriving by train? We will meet you at Mathura Junction and take you on from
                  there, and get you back for your return train.
                </p>
                <div className="mt-3 space-y-2">
                  {STATION_ADDONS.map((a) => (
                    <label key={a.code}
                           className="flex cursor-pointer items-center gap-3 rounded-xl border border-line p-3 hover:bg-paper-2">
                      <input
                        type="checkbox" className="size-4 accent-[#e8930c]"
                        checked={addonCodes.includes(a.code)}
                        onChange={() => setAddonCodes((cur) =>
                          cur.includes(a.code) ? cur.filter((c) => c !== a.code) : [...cur, a.code])}
                      />
                      <span className="flex-1 text-sm">
                        <span className="font-medium">{a.label}</span>
                        <span className="block text-xs text-ink-soft">{a.unit}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </Card>

              <Card className="p-5">
                <h2 className="font-display text-xl">Stay and meals</h2>
                <p className="mt-1 text-sm text-ink-soft">
                  Tick what you want included and the office will price it into your quote.
                </p>
                <div className="mt-3 space-y-2">
                  {[...ROOM_ADDONS, ...EXTRA_ADDONS].map((a) => (
                    <label key={a.code}
                           className="flex cursor-pointer items-center gap-3 rounded-xl border border-line p-3 hover:bg-paper-2">
                      <input
                        type="checkbox" className="size-4 accent-[#e8930c]"
                        checked={addonCodes.includes(a.code)}
                        onChange={() => setAddonCodes((cur) =>
                          cur.includes(a.code) ? cur.filter((c) => c !== a.code) : [...cur, a.code])}
                      />
                      <span className="flex-1 text-sm">
                        <span className="font-medium">{a.label}</span>
                        <span className="block text-xs text-ink-soft">{a.unit}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </Card>

              <Card className="p-5">
                <h2 className="font-display text-xl">Anything else we should know?</h2>
                <p className="mt-1 text-sm text-ink-soft">
                  Elderly travellers, wheelchair access, a fixed budget, a temple you must not miss —
                  it all changes what we quote.
                </p>
                <textarea
                  className="field mt-3" rows={3} value={notes}
                  placeholder="Optional notes for the Mathura office"
                  onChange={(e) => setNotes(e.target.value)}
                />
              </Card>

              <div className="flex gap-3">
                <button className="btn btn-ghost" onClick={() => setStep(1)} disabled={busy}>Back</button>
                <button className="btn btn-primary flex-1" onClick={send} disabled={busy}>
                  {busy ? 'Sending…' : 'Send this request'}
                </button>
              </div>
              <p className="text-center text-xs text-ink-soft">
                No payment now, and nothing is held until you accept our quote.
              </p>
            </>
          )}
        </div>

        <aside>
          <Card className="lg:sticky lg:top-24 p-5">
            <h2 className="font-display text-lg">Your request</h2>
            {trip.loading && <Spinner label="Loading" />}
            {t && (
              <div className="mt-3 text-sm">
                <p className="font-semibold">{t.route.origin} → {t.route.destination}</p>
                <p className="text-ink-soft">{dateLong(t.departure)}</p>
                <p className="text-ink-soft">{time(t.departure)} – {time(t.arrival)}</p>
                <p className="mt-2 text-ink-soft">{t.bus.name} · {t.bus.registrationNo}</p>
                <p className="mt-2 flex flex-wrap gap-1.5">
                  <Badge tone="verified">Whole bus, {t.capacity} seats</Badge>
                  <Badge tone="warn">{partySize} travelling</Badge>
                </p>
              </div>
            )}
            {pkg && (
              <div className="mt-3 text-sm">
                <p className="font-semibold">{pkg.title}</p>
                <p className="text-ink-soft">{pkg.durationDays} days · from {travelDate}</p>
                <p className="text-ink-soft">{partySize} traveller{partySize > 1 ? 's' : ''}</p>
              </div>
            )}
            {rental && (
              <div className="mt-3 text-sm">
                <p className="font-semibold">{rental.name}</p>
                {rental.subtitle && <p className="text-ink-soft">{rental.subtitle}</p>}
                <p className="text-ink-soft">{rental.city}{rental.area ? ` · ${rental.area}` : ''}</p>
                <p className="mt-2 flex flex-wrap gap-1.5">
                  <Badge tone="ink">
                    {state.units} {rental.kind === 'room' ? 'room' : rental.kind}
                    {state.units > 1 ? 's' : ''}
                  </Badge>
                  <Badge tone="warn">
                    {travelDate} → {state.endDate}
                  </Badge>
                  {rental.withDriver && <Badge tone="verified">Driver included</Badge>}
                </p>
              </div>
            )}

            <div className="mt-4 border-t border-line pt-3 text-sm text-ink-soft">
              <p className="font-medium text-ink">What happens next</p>
              <ol className="mt-2 space-y-1.5">
                <li>1. You send this request — nothing is charged.</li>
                <li>2. Our Mathura office quotes you on WhatsApp.</li>
                <li>3. Accept, and we hold the bus and issue your ticket.</li>
              </ol>
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}

const Steps = ({ step }) => (
  <ol className="mb-6 flex items-center gap-2 text-xs font-semibold">
    {['Group details', 'Add-ons', 'Request sent'].map((label, i) => {
      const n = i + 1;
      const state = n < step ? 'done' : n === step ? 'now' : 'todo';
      return (
        <li key={label} className="flex flex-1 items-center gap-2">
          <span className={`grid size-6 shrink-0 place-items-center rounded-full ${
            state === 'todo' ? 'bg-paper-2 text-ink-soft' : 'bg-indigo-brand text-white'
          }`}>
            {state === 'done' ? '✓' : n}
          </span>
          <span className={`truncate ${state === 'now' ? '' : 'text-ink-soft'}`}>{label}</span>
          {n < 3 && <span className="hidden h-px flex-1 bg-line sm:block" />}
        </li>
      );
    })}
  </ol>
);

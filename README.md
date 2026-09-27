# Jai Maa Durge Tourism (JMD)

A booking platform for a Mathura-headquartered bus and tourism operator, covering the Braj circuit
(Mathura, Vrindavan, Barsana, Govardhan, Gokul, Nandgaon), the heritage circuit (Agra, Fatehpur
Sikri, Bharatpur, Deeg), Varanasi, and the hill stations (Shimla, Manali, Nainital, Mussoorie),
with Delhi and Noida as feeder pickup cities.

Office lines, both on WhatsApp: **+91 79064 27172** (bookings) and **+91 89232 35591** (control
room, 24×7).

> The repository folder is still `braj-travels` from before the rename. Renaming it is safe but
> would need the dev servers restarted, so it was left alone.

**Buses are chartered whole.** There is no per-seat inventory anywhere in the system: a group takes
the vehicle or nobody does. Group size filters out vehicles that are too small and goes on the
driver's manifest.

**No prices, anywhere.** Rates move with season, group and vehicle, so the Mathura office quotes
every trip by hand. The product carries no money at all — no fares, no totals, no payments table, no
revenue reporting. A customer sends a request; the office quotes on WhatsApp; confirming is what
issues the QR ticket and commits the bus.

The product position — *book from the source, not a reseller* — is built into the app, not bolted on:
the driver is named before you pay, guides carry a verification state that HQ actually controls, the
tracking link works without an account, and where a real photograph has not been supplied the UI says
so rather than filling the space with stock imagery.

## Running it

```bash
npm install
npm run seed        # demo data: 8 buses, 32 route legs, ~1600 trips, 6 packages, 6 guides
npm run dev         # API on :4000, app on :5173
```

Open http://localhost:5173.

No database server is required to start. With `DATABASE_URL` unset the app runs on SQLite via
`node:sqlite` (built into Node 22+); set `DATABASE_URL` and it uses PostgreSQL instead. There is one
schema — [`server/src/db/schema.pg.sql`](server/src/db/schema.pg.sql), written in Postgres — and the
SQLite dialect is generated from it at load time, so the two cannot drift.

Requires Node 20.6+ (developed on 24).

### Demo accounts

| Role | Phone | Password |
| --- | --- | --- |
| Traveller | 9812345678 | OTP (the code appears on screen in dev) |
| Guide | 9000000021 | demo1234 |
| Driver | 9000000012 | demo1234 |
| HQ admin | 9000000001 | demo1234 |

### Tests

```bash
npm run dev:server   # in one terminal
npm test             # in another
```

`npm test` runs three suites.

1. **Routes** — builds a jsdom-compatible bundle and mounts all 26 routes against the live API
   (including the four role-gated ones), failing any page that shows a rupee figure. It also checks
   the language switch, all 23 languages, `robots.txt` and `sitemap.xml`, per-page metadata
   uniqueness, the PWA manifest, the 360px phone layout, and the Powered by BA credit.
2. **Request journey** — drives the whole flow through the real UI: search → bus detail → group
   size → lead passenger → guide add-on → request sent. It checks no ticket is issued yet and the
   bus is still available to others, has HQ quote and confirm, then checks the ticket appears and
   the bus leaves search.
3. **Guard rails** ([`smoke-guards.mjs`](smoke-guards.mjs)) — one check per bug that was once live
   here, so the same hole cannot quietly reopen. See below.

The suites pick their own dates from the availability API rather than assuming tomorrow, so they
can be run repeatedly without the demo fleet being chartered out from under them.

### What the guard rails hold down

An audit of the running app found six behaviours that were wrong. All six are fixed and each now
has a test:

| What was wrong | What it meant | What holds it now |
| --- | --- | --- |
| The tracker asked for a reference but the lookup needed a login | The page's own promise — "no account needed" — was false; the input just failed | A public `GET /api/tracking/reference/:ref` returning the trip id and its status and nothing else. The full booking still needs a login, so a forwarded reference never opens the passenger list |
| The note typed on the booking form was discarded | "Two wheelchair users, please send a low-floor coach" never reached the office | `notes` is stored and shown in the HQ queue |
| The contact number typed on the form was discarded | HQ called the account holder, not the person organising the trip | `contact_phone` and `contact_email` are stored; HQ calls and WhatsApps the contact, and shows the account number beside it when they differ |
| HQ could confirm two groups onto the same rooms | Both parties arrive, one has nowhere to sleep | Confirming a rental checks free stock on those dates first and refuses with 409 |
| A stay confirmed with no end date blocked nothing | Rooms already committed still showed as free | The end date is closed at insert, and the overlap query handles a null one |
| A one-time code could be guessed without limit, and resent without limit | Six digits is not a lock if you get infinite tries; unlimited sends bill someone else's phone | Five wrong guesses then 429; four *outstanding* codes per number then 429. Consuming a code frees a slot, so signing in repeatedly is never locked out |

Two smaller hardening fixes went in at the same time: JSON-LD is escaped so a `</script>` inside a
value cannot end the tag early, and the downloadable trip summary escapes booking values before
they become HTML.

## What is built

**Phase 1 — booking core**
- Homepage: hero search, popular routes, featured packages, trust bar, verified reviews
- Search with a calendar that greys out any day with no whole vehicle free for your group,
  plus filters (vehicle type, departure window), sorting including "smallest that fits", and a
  7-day quick strip
- Trip detail: seat plan of the vehicle you are hiring (2+2, 2+1 double-decker sleeper, tempo),
  route map, stops, amenities, named driver, cancellation policy, reviews
- Requesting in three steps: group details → add-ons → request sent
- My Trips: upcoming/past, request status, QR ticket once confirmed, downloadable trip summary,
  cancel or withdraw, change date, loyalty points and referral code
- Phone OTP sign-in for travellers, password sign-in for staff

**Cars, bikes and rooms**
- Cars with our own drivers, self-ride bikes and scooters, and rooms in Mathura, Vrindavan,
  Govardhan and Agra — browsable by city and date range
- Stock is quantity-aware and date-aware: a hotel has several of a room type and a hire shop
  several of the same scooter, so availability is "how many are left on these dates"
- Same request-and-quote flow as the buses, and only a confirmed booking consumes stock

**Phase 2 — differentiators**
- Guide marketplace: profiles, languages, set itineraries, verification badges, add-to-request
- Two tours, each with a day-by-day plan, named temples and sites, and its own map:
  **Complete Braj Darshan** (5 days, hub-and-spoke from Mathura, 50 named sites) and
  **Krishna and the Mughals** (4 days, a 221 km circuit through Agra, Fatehpur Sikri, Bharatpur
  and Deeg)
- Live tracking: WebSocket feed, ETA, progress, driver contact, shareable public link (no login)
- Mathura Base Camp treatment: hub-and-spoke layout for multi-day trips that return to one base

**Phase 3 — operations**
- Guide portal: accept/decline requests, calendar, earnings
- Driver portal: schedule, location-sharing toggle, passenger manifest, camera QR check-in
- HQ Control Center: the enquiry queue (quote → confirm → cancel, with one-tap WhatsApp to the
  customer), live fleet map, fleet, guide verification queue, demand and charter-rate analytics,
  WhatsApp broadcast and message outbox

**Phase 4 — partial**
- Reviews tied to verified bookings only, prompted after travel
- Referral and loyalty points
- WhatsApp notification pipeline with a full outbox (simulated until credentials are set)
- SOS button, shown only while a trip is actually in motion

## What needs real credentials

Nothing is hardcoded with placeholder keys. Each integration degrades to a clearly-labelled
substitute and says so in the UI, so the flow stays testable:

| Integration | Without credentials | To enable |
| --- | --- | --- |
| WhatsApp | Messages recorded in the outbox and logged, marked *simulated* | `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_ID` |
| OTP delivery | Code returned in the API response and shown on the login screen | `SMS_PROVIDER` (plus WhatsApp above) |
| Maps | Self-contained SVG map with real projection, route polyline and live marker | `GOOGLE_MAPS_API_KEY` — swap `MiniMap` for the Maps JS API; its props already match |
| Photo upload | Our own SVG illustrations — temples, ghats, hills, the Taj, coaches, rooms — never stock photography | An S3-compatible bucket; a real photo replaces the artwork outright |
| JWT | Insecure development secret, warned about at boot | `JWT_SECRET` (required in production) |
| Search engines | `robots.txt` and `sitemap.xml` point at localhost | `SITE_URL` on the server, `VITE_SITE_URL` at build time |

See [`server/.env.example`](server/.env.example).

## Not built

- Hindi translation of **database content** — tour itineraries, guide bios, room features and
  temple names are served as written in English. Doing it properly means storing both languages
  per row, which is a content job rather than a code one
- Any language beyond the 35-key core, except English and Hindi
- The staff portals (HQ, guide, driver) — the interface there is English only
- Full RTL polish: Urdu and Kashmiri flip direction and the main physical utilities are mirrored,
  but a dedicated pass would catch the remaining edges
- Real hotel inventory: room add-ons are recorded on the request but not tied to availability
- Reschedule as a first-class action (currently cancel and ask again)
- Quote amounts inside the app: the office sends them on WhatsApp, and nothing records what was quoted

## Layout

```
server/
  src/db/schema.pg.sql   single source of truth for the schema
  src/db/index.js        pg / sqlite drivers + dialect translation
  src/db/seed.js         demo dataset
  src/lib/               geo, seat layouts, trip options and policy, tracker, notifications
  src/routes/            auth, catalog, trips, bookings, guides, reviews,
                         tracking, driver, admin
client/
  src/pages/             one file per screen
  src/components/        SeatMap, MiniMap, SearchBar, Layout, ui primitives
smoke.mjs                route render tests
smoke-booking.mjs        end-to-end request journey
smoke-guards.mjs         regression checks for bugs found in the audit
```

## Notes on a few decisions

**What SEO can and cannot be switched on.** Nothing in an application makes a site appear in search
results — that is earned, not configured. What is built here is the groundwork that makes ranking
possible: a page per destination with real content, a distinct title, description and canonical on
every route, Schema.org `TravelAgency` and `TouristDestination` structured data, Open Graph tags
for WhatsApp previews, `robots.txt`, and a `sitemap.xml` generated from the database so new tours
and vehicles are discoverable the day they are added. The rest — submitting the sitemap, a Google
Business Profile, reviews, and links from other sites — happens outside the codebase.

**Set `SITE_URL` before launch.** `robots.txt` and `sitemap.xml` build absolute URLs from it and
default to localhost, which is right in development and useless in production.


**Twenty-three languages.** English, Hindi and the other 21 of the Eighth Schedule are selectable.
English and Hindi carry the full interface — navigation, home, search, the request flow, statuses,
and the profile, contact, about and tracker pages — from
[`i18n.js`](client/src/lib/i18n.js). The other 21 carry a 35-key core (navigation, the menu, the
language dialog, search controls) from [`i18n-india.js`](client/src/lib/i18n-india.js) and fall
back to English beyond it. Urdu and Kashmiri render right-to-left.

**Low-resource languages need a native reader.** Bodo, Dogri, Santali, Manipuri and Kashmiri were
written with far less corpus behind them than Bengali or Tamil. They are wired up and render
correctly, but have a native speaker check the wording before relying on them commercially. A first-time visitor is asked to choose once, the choice is remembered in
`localStorage`, and the same dialog is reused from the three-dots menu so there is only ever one
control. A missing key falls back to English and then to the key itself, so a gap degrades to
readable text rather than blank space.


**Illustrations, not stock photos.** Where a real photograph has not been supplied we draw the
scene ourselves in the brand palette, chosen to match the place — a shikhara for Vrindavan, the
ghats for Mathura, a hill for Barsana and Govardhan, the Taj for Agra. They read as drawings, so
nobody mistakes one for a photo of the actual vehicle, and a real photo replaces them outright.

**One table for cars, bikes and rooms.** All three are the same shape — a unit taken for a date
range from a city — so they share `rentals` and one set of endpoints. Only the attributes in
`specs` and the words around them differ. Overlap is the standard "each starts before the other
ends" test, with a same-day handover treated as no clash.

**The calendar knows the inventory.** `GET /api/trips/availability` returns free/total vehicles
per day for a route and group size, so the picker disables days we cannot serve rather than letting
someone choose one and land on an empty results page. It degrades to a plain month grid when no
route context exists, which is what the tour pages want.

**Two map modes.** A base-camp tour returns to the same town every night, so `MiniMap` draws spokes
from the hub rather than a line through the stops — a polyline there would imply a drive that never
happens. A circuit like Mathura–Agra–Fatehpur Sikri–Bharatpur–Deeg gets the polyline, because that
is genuinely the order you drive it.

**Motion is opt-out, not opt-in.** Every page load runs a short bus-arrival curtain, and every tap
leaves a marigold ripple. Both are skipped entirely under `prefers-reduced-motion`, the curtain is
dismissed by any click or keypress, and the ripple lives in a `pointer-events: none` layer so it can
never swallow a click.


**Enquiries do not lock vehicles.** A departure is committed only once HQ confirms a group —
otherwise anyone could take the fleet off the board simply by asking. Two enquiries can sit against
the same bus; the first confirm wins and the second gets a clear 409. Cancelling releases it again.

**No money in the schema.** Removing prices meant removing them at the root: no fare column, no
totals on a booking, no payments table. Nothing downstream can display a stale figure because there
is no figure to read.

**Simulated tracking.** Trips flagged as simulated advance on a compressed clock (a 9-hour run
finishes in about 12 minutes) but report the road speed the schedule implies, so nothing on screen
reads as nonsense. The tracking page labels simulated positions explicitly. Real driver pushes use
the same pipeline — `POST /api/tracking/:id/location` or the `driver:location` socket event — so
wiring a driver app changes nothing downstream.

**Mobile first.** Every screen is built at 360px and up: sticky booking bars, horizontally
scrollable seat decks and date strips, and filters that collapse behind a button on phones.

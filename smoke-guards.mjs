/**
 * Guard rails.
 *
 * Every check here stands for a bug that was live in this app and was fixed.
 * They exist so the same hole cannot quietly reopen. They talk to the API
 * directly rather than through the UI, because what is asserted is a rule the
 * server has to keep no matter what the screen does.
 *
 * Requires the API on :4000.
 */
const API = 'http://localhost:4000';
/** Staff password from the seed: demo1234 on local SQLite, the printed one on Postgres. */
const STAFF_PASSWORD = process.env.STAFF_PASSWORD || 'demo1234';

const steps = [];
const step = (m) => { steps.push(m); console.log(`  ok  ${m}`); };
const must = (cond, m) => { if (!cond) throw new Error(m); };

const call = async (path, { method = 'GET', body, token } = {}) => {
  const r = await fetch(`${API}${path}`, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  let json = null;
  try { json = await r.json(); } catch { /* an empty body is fine */ }
  return { status: r.status, json };
};

/** A number nobody else in the suite is using, so rate limits stay per-test. */
const freshPhone = () => `9${String(Math.floor(Math.random() * 1e9)).padStart(9, '0')}`;

const iso = (daysAhead) => {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
};

try {
  const otp = await call('/api/auth/otp/request', { method: 'POST', body: { phone: '9812345678' } });
  const { token } = (await call('/api/auth/otp/verify', {
    method: 'POST', body: { phone: '9812345678', code: otp.json.devCode },
  })).json;
  const { token: adminToken } = (await call('/api/auth/login', {
    method: 'POST', body: { phone: '9000000001', password: STAFF_PASSWORD },
  })).json;
  must(token && adminToken, 'could not sign in for the guard tests');

  // -- the public tracker -------------------------------------------------
  // The tracker page tells visitors no account is needed. That promise has to
  // be true, and it has to stop at the trip: a reference gets forwarded round
  // a family WhatsApp group, so it must never open the passenger list.
  const avail = (await call('/api/trips/availability?from=Delhi&to=Mathura&passengers=12&days=21')).json;
  const freeDay = avail.days.find((d) => d.free > 0);
  must(freeDay, 'no Delhi-Mathura departure is free; reseed the demo data');

  const trips = (await call(`/api/trips/search?from=Delhi&to=Mathura&date=${freeDay.date}&passengers=12`)).json;
  const trip = trips.trips[0];
  must(trip, 'search returned nothing on a day availability called free');

  const made = await call('/api/bookings', {
    method: 'POST', token,
    body: {
      tripId: trip.id, partySize: 12, pickupPointId: 1,
      passengers: [{ name: 'Guard Lead', age: 41, gender: 'F' }],
      notes: 'Two wheelchair users, please send a low-floor coach',
      contactPhone: '9990001111',
      contactEmail: 'group@example.com',
    },
  });
  const ref = made.json.booking?.reference;
  must(ref, `could not raise an enquiry: ${JSON.stringify(made.json)}`);

  // -- what the customer typed --------------------------------------------
  // The note and the contact number are the whole point of the form. They
  // were once dropped on the floor between the browser and the office.
  const queue = (await call('/api/admin/enquiries', { token: adminToken })).json;
  const mine = queue.enquiries.find((e) => e.reference === ref);
  must(mine, 'the enquiry never reached the HQ queue');
  must(/wheelchair/i.test(mine.notes ?? ''), 'the customer note never reached HQ');
  must(mine.contactPhone === '9990001111', 'the contact number typed on the form never reached HQ');
  must(mine.contactEmail === 'group@example.com', 'the contact email typed on the form never reached HQ');
  step('a note and a separate contact typed on the form arrive in the HQ queue');

  await call(`/api/admin/enquiries/${ref}/confirm`, { method: 'POST', token: adminToken });

  const anonTrack = await call(`/api/tracking/reference/${ref}`);
  must(anonTrack.status === 200, `public tracker lookup returned ${anonTrack.status}, expected 200`);
  must(anonTrack.json.tripId === trip.id, 'the public tracker resolved the wrong trip');
  must(!('passengers' in anonTrack.json) && !('user' in anonTrack.json) && !('notes' in anonTrack.json),
    'the public tracker returned more than the trip');
  step('a reference tracks a confirmed bus with no account, and exposes nothing else');

  const anonBooking = await call(`/api/bookings/${ref}`);
  must(anonBooking.status === 401, `the full booking was readable anonymously (${anonBooking.status})`);
  step('the full booking still needs a login');

  const bogus = await call('/api/tracking/reference/JMD-NOPE99');
  must(bogus.status === 404, 'an unknown reference did not 404');
  step('an unknown reference is refused');

  // -- rental stock --------------------------------------------------------
  // A rental is stock, not one object. HQ was once able to confirm two groups
  // onto the same rooms, and a stay left open-ended blocked nothing at all.
  const rooms = (await call('/api/rentals?kind=room')).json.items;
  let room = null;
  let day = null;
  for (const r of rooms) {
    const days = (await call(`/api/rentals/${r.id}/availability?start=${iso(20)}&days=40`)).json.days;
    const clear = days.find((d) => d.free === d.total);
    if (clear) { room = r; day = clear.date; break; }
  }
  must(room, 'every demo room is booked out; reseed the demo data');

  // Deliberately open-ended: the server has to close the range itself.
  const bookRoom = () => call('/api/bookings', {
    method: 'POST', token,
    body: {
      rentalId: room.id, travelDate: day, units: room.quantity, partySize: 2,
      passengers: [{ name: 'Guard Stay', age: 35, gender: 'M' }],
    },
  });

  const stayA = (await bookRoom()).json.booking?.reference;
  const stayB = (await bookRoom()).json.booking?.reference;
  must(stayA && stayB, 'could not raise the two stay enquiries');

  const before = (await call(`/api/rentals/${room.id}/availability?start=${day}&days=1`)).json;
  must(before.days[0].free === room.quantity, 'an unconfirmed enquiry took stock off the board');
  step('an open enquiry does not consume rental stock');

  const okA = await call(`/api/admin/enquiries/${stayA}/confirm`, { method: 'POST', token: adminToken });
  must(okA.status === 200, `confirming the first stay failed: ${JSON.stringify(okA.json)}`);

  const after = (await call(`/api/rentals/${room.id}/availability?start=${day}&days=2`)).json;
  must(after.days[0].free === 0,
    `a confirmed stay with no end date blocked nothing (${after.days[0].free} of ${room.quantity} still free)`);
  must(after.days[1].free === room.quantity, 'a one-night stay blocked the following night too');
  step('a confirmed stay with no end date blocks its own night, and only that night');

  const okB = await call(`/api/admin/enquiries/${stayB}/confirm`, { method: 'POST', token: adminToken });
  must(okB.status === 409,
    `HQ confirmed ${room.quantity} more of a ${room.quantity}-unit room (${okB.status})`);
  step('HQ cannot confirm two groups onto the same rooms');

  const listed = (await call(`/api/rentals?kind=room&from=${day}&units=1`)).json.items;
  must(!listed.some((r) => r.id === room.id), 'a fully booked room is still offered on those dates');
  step('a fully booked room drops out of the listing for those dates');

  // -- the one-time code ---------------------------------------------------
  // Six digits with unlimited guesses is not a lock.
  const guessPhone = freshPhone();
  await call('/api/auth/otp/request', { method: 'POST', body: { phone: guessPhone } });
  const guesses = [];
  for (let i = 0; i < 8; i += 1) {
    guesses.push((await call('/api/auth/otp/verify', {
      method: 'POST', body: { phone: guessPhone, code: '000000' },
    })).status);
  }
  must(!guesses.includes(200), 'a wrong OTP code was accepted');
  must(guesses.includes(429), `wrong OTP codes were never rate-limited: ${guesses.join(',')}`);
  must(guesses.indexOf(429) <= 6, `too many guesses allowed before the lock (${guesses.indexOf(429)})`);
  step(`wrong codes are refused, then locked out after ${guesses.indexOf(429)} attempts`);

  // A real code still has to work, so the lock has not simply broken login.
  // A number we have never seen is asked for a name first, then signed in.
  const goodPhone = freshPhone();
  const fresh = await call('/api/auth/otp/request', { method: 'POST', body: { phone: goodPhone } });
  const unnamed = await call('/api/auth/otp/verify', {
    method: 'POST', body: { phone: goodPhone, code: fresh.json.devCode },
  });
  must(unnamed.status === 409 && unnamed.json.error === 'name_required',
    `a new number was signed up without a name (${unnamed.status})`);

  // The same code, now with a name: that is exactly what the screen does.
  // This check once asked for a second code first, which hid the bug where
  // the first code was spent by the name prompt and every sign-up failed.
  const good = await call('/api/auth/otp/verify', {
    method: 'POST', body: { phone: goodPhone, code: fresh.json.devCode, name: 'Guard Signup' },
  });
  must(good.status === 200 && good.json.token, `the same code failed once a name was given (${good.status})`);
  const reuse = await call('/api/auth/otp/verify', {
    method: 'POST', body: { phone: goodPhone, code: fresh.json.devCode },
  });
  must(reuse.status !== 200, 'a code worked twice');
  step('a new number is asked for a name, then the same code signs them in, once');

  // Unlimited sends is a way to bill someone else's phone.
  const floodPhone = freshPhone();
  const sends = [];
  for (let i = 0; i < 6; i += 1) {
    sends.push((await call('/api/auth/otp/request', { method: 'POST', body: { phone: floodPhone } })).status);
  }
  must(sends.includes(429), `OTP sends were never capped: ${sends.join(',')}`);
  step(`repeat sends to one number are capped after ${sends.indexOf(429)}`);

  // -- the staff password --------------------------------------------------
  // Staff log in with a password, and HQ's opens the whole control room.
  // Guessing it has to stop quickly. An unused number keeps the lock off the
  // real staff accounts the other suites sign in with.
  const pwPhone = freshPhone();
  const tries = [];
  for (let i = 0; i < 7; i += 1) {
    tries.push((await call('/api/auth/login', {
      method: 'POST', body: { phone: pwPhone, password: `wrong-${i}` },
    })).status);
  }
  must(!tries.includes(200), 'a wrong password was accepted');
  must(tries.includes(429), `wrong passwords were never rate-limited: ${tries.join(',')}`);
  must(tries.indexOf(429) <= 5, `too many password guesses allowed (${tries.indexOf(429)})`);
  step(`wrong passwords are refused, then locked out after ${tries.indexOf(429)} attempts`);

  // Changing a password must prove the old one, and refuse a weak new one.
  const wrongCurrent = await call('/api/auth/password', {
    method: 'POST', token: adminToken,
    body: { currentPassword: 'not-the-password', newPassword: 'a-much-longer-password' },
  });
  must(wrongCurrent.status === 400, `password changed without the current one (${wrongCurrent.status})`);
  const tooShort = await call('/api/auth/password', {
    method: 'POST', token: adminToken,
    body: { currentPassword: STAFF_PASSWORD, newPassword: 'short' },
  });
  must(tooShort.status === 400, `a 5-character password was accepted (${tooShort.status})`);
  const anonymous = await call('/api/auth/password', {
    method: 'POST', body: { currentPassword: STAFF_PASSWORD, newPassword: 'a-much-longer-password' },
  });
  must(anonymous.status === 401, `password change worked without signing in (${anonymous.status})`);
  step('changing a password needs a session, the current password, and 10+ characters');

  // -- HQ actions happen once ----------------------------------------------
  // Confirming twice once awarded loyalty points twice.
  const pointsBefore = (await call('/api/auth/me', { token })).json.user.loyaltyPoints;
  const reconfirm = await call(`/api/admin/enquiries/${ref}/confirm`, { method: 'POST', token: adminToken });
  const pointsAfter = (await call('/api/auth/me', { token })).json.user.loyaltyPoints;
  must(reconfirm.status === 409, `a confirmed enquiry was confirmed again (${reconfirm.status})`);
  must(pointsAfter === pointsBefore, `a second confirm awarded points again (${pointsBefore} -> ${pointsAfter})`);
  step('a confirmed enquiry cannot be confirmed again, so points are awarded once');

  // -- a bus's crew only -----------------------------------------------------
  // Any driver account could read any bus's passenger names and numbers,
  // check in its tickets, or move it on the map.
  const driverA = (await call('/api/auth/login', { method: 'POST', body: { phone: '9000000011', password: STAFF_PASSWORD } })).json.token;
  const driverB = (await call('/api/auth/login', { method: 'POST', body: { phone: '9000000012', password: STAFF_PASSWORD } })).json.token;
  must(driverA && driverB, 'could not sign in two drivers');
  const tripA = (await call('/api/driver/schedule', { token: driverA })).json.trips[0];
  must(tripA, 'driver A has no trips; reseed the demo data');
  const peek = await call(`/api/driver/trips/${tripA.id}/manifest`, { token: driverB });
  must(peek.status === 403, `another bus's manifest was readable by a different driver (${peek.status})`);
  const own = await call(`/api/driver/trips/${tripA.id}/manifest`, { token: driverA });
  must(own.status === 200, `a driver could not read their own manifest (${own.status})`);
  const spoof = await call(`/api/tracking/${tripA.id}/location`, {
    method: 'POST', token: driverB, body: { lat: 27.5, lng: 77.7 },
  });
  must(spoof.status === 403, `a driver moved another bus on the map (${spoof.status})`);
  const share = await call(`/api/driver/trips/${tripA.id}/sharing`, { method: 'POST', token: driverB, body: { on: true } });
  must(share.status === 403, `a driver switched on sharing for another bus (${share.status})`);
  step("a driver sees and moves only their own bus: manifest, location and sharing");

  // -- malformed input is a 400, not a crash ---------------------------------
  const junk = await call('/api/bookings', { method: 'POST', token, body: { tripId: trip.id, passengers: 'everyone' } });
  must(junk.status === 400, `a malformed enquiry returned ${junk.status}, expected 400`);
  step('a malformed enquiry is refused with a message, not a server error');

  // -- reviews ---------------------------------------------------------------
  // A review could name any guide and move their average, and could be left
  // before the trip had happened.
  const early = await call('/api/reviews', { method: 'POST', token, body: { reference: ref, rating: 1, guideId: 1 } });
  must(early.status === 400, `a trip was reviewed before it happened (${early.status})`);
  step('a trip cannot be reviewed before it has happened');

  console.log(`\nGuard rails passed (${steps.length} checks).`);
  process.exit(0);
} catch (e) {
  console.log(`\nFAILED after ${steps.length} checks: ${e.message}`);
  process.exit(1);
}

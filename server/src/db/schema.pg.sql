-- Jai Maa Durge Tourism (JMD) :: canonical PostgreSQL schema

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT UNIQUE,
  phone         TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  role          TEXT NOT NULL DEFAULT 'customer'
                CHECK (role IN ('customer','guide','driver','admin')),
  loyalty_points INTEGER NOT NULL DEFAULT 0,
  referral_code TEXT UNIQUE,
  referred_by   INTEGER REFERENCES users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS otp_codes (
  id         SERIAL PRIMARY KEY,
  phone      TEXT NOT NULL,
  code       TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed   BOOLEAN NOT NULL DEFAULT false,
  attempts   INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_otp_phone ON otp_codes(phone);

CREATE TABLE IF NOT EXISTS buses (
  id              SERIAL PRIMARY KEY,
  operator_id     INTEGER REFERENCES users(id),
  name            TEXT NOT NULL,
  type            TEXT NOT NULL
                  CHECK (type IN ('seater','sleeper','ac_seater','ac_sleeper','non_ac_seater','tempo')),
  seat_capacity   INTEGER NOT NULL,
  seat_layout     JSONB NOT NULL DEFAULT '{}'::jsonb,
  registration_no TEXT UNIQUE NOT NULL,
  photos          JSONB NOT NULL DEFAULT '[]'::jsonb,
  amenities       JSONB NOT NULL DEFAULT '[]'::jsonb,
  driver_name     TEXT,
  driver_phone    TEXT,
  driver_photo    TEXT
);

CREATE TABLE IF NOT EXISTS routes (
  id                SERIAL PRIMARY KEY,
  origin_city       TEXT NOT NULL,
  destination_city  TEXT NOT NULL,
  distance_km       INTEGER NOT NULL,
  base_duration_hrs NUMERIC(4,1) NOT NULL,
  stops             JSONB NOT NULL DEFAULT '[]'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_routes_od ON routes(origin_city, destination_city);

CREATE TABLE IF NOT EXISTS trips (
  id                SERIAL PRIMARY KEY,
  bus_id            INTEGER NOT NULL REFERENCES buses(id),
  route_id          INTEGER NOT NULL REFERENCES routes(id),
  departure_datetime TIMESTAMPTZ NOT NULL,
  arrival_datetime   TIMESTAMPTZ NOT NULL,
  seats_available   INTEGER NOT NULL,
  status            TEXT NOT NULL DEFAULT 'scheduled'
                    CHECK (status IN ('scheduled','ongoing','completed','cancelled'))
);
CREATE INDEX IF NOT EXISTS idx_trips_departure ON trips(departure_datetime);

CREATE TABLE IF NOT EXISTS pickup_points (
  id        SERIAL PRIMARY KEY,
  city      TEXT NOT NULL,
  area_name TEXT NOT NULL,
  landmark  TEXT,
  lat       DOUBLE PRECISION NOT NULL,
  lng       DOUBLE PRECISION NOT NULL
);

CREATE TABLE IF NOT EXISTS packages (
  id            SERIAL PRIMARY KEY,
  slug          TEXT UNIQUE NOT NULL,
  title         TEXT NOT NULL,
  type          TEXT NOT NULL CHECK (type IN ('religious','hill_station','heritage','custom')),
  summary       TEXT,
  hero_image    TEXT,
  itinerary     JSONB NOT NULL DEFAULT '[]'::jsonb,
  duration_days INTEGER NOT NULL,
  inclusions    JSONB NOT NULL DEFAULT '[]'::jsonb,
  exclusions    JSONB NOT NULL DEFAULT '[]'::jsonb,
  base_camp     TEXT
);

CREATE TABLE IF NOT EXISTS guides (
  id                  SERIAL PRIMARY KEY,
  user_id             INTEGER NOT NULL REFERENCES users(id),
  photo               TEXT,
  bio                 TEXT,
  languages           JSONB NOT NULL DEFAULT '[]'::jsonb,
  specialty           TEXT,
  base_city           TEXT NOT NULL DEFAULT 'Mathura',
  years_experience    INTEGER NOT NULL DEFAULT 0,
  rating_avg          NUMERIC(2,1) NOT NULL DEFAULT 0,
  rating_count        INTEGER NOT NULL DEFAULT 0,
  verification_status TEXT NOT NULL DEFAULT 'pending'
                      CHECK (verification_status IN ('pending','verified','rejected')),
  id_proof_url        TEXT,
  itineraries         JSONB NOT NULL DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS rentals (
  id          SERIAL PRIMARY KEY,
  kind        TEXT NOT NULL CHECK (kind IN ('car','bike','room')),
  name        TEXT NOT NULL,
  subtitle    TEXT,
  city        TEXT NOT NULL,
  area        TEXT,
  quantity    INTEGER NOT NULL DEFAULT 1,
  min_days    INTEGER NOT NULL DEFAULT 1,
  with_driver BOOLEAN NOT NULL DEFAULT false,
  specs       JSONB NOT NULL DEFAULT '{}'::jsonb,
  features    JSONB NOT NULL DEFAULT '[]'::jsonb,
  photos      JSONB NOT NULL DEFAULT '[]'::jsonb,
  active      BOOLEAN NOT NULL DEFAULT true
);
CREATE INDEX IF NOT EXISTS idx_rentals_kind_city ON rentals(kind, city);

CREATE TABLE IF NOT EXISTS bookings (
  id             SERIAL PRIMARY KEY,
  reference      TEXT UNIQUE NOT NULL,
  user_id        INTEGER NOT NULL REFERENCES users(id),
  trip_id        INTEGER REFERENCES trips(id),
  rental_id      INTEGER REFERENCES rentals(id),
  end_date       DATE,
  units          INTEGER NOT NULL DEFAULT 1,
  package_id     INTEGER REFERENCES packages(id),
  travel_date    DATE,
  seats_booked   JSONB NOT NULL DEFAULT '[]'::jsonb,
  party_size     INTEGER NOT NULL DEFAULT 1,
  passengers     JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes          TEXT,
  contact_phone  TEXT,
  contact_email  TEXT,
  pickup_point_id INTEGER REFERENCES pickup_points(id),
  addons         JSONB NOT NULL DEFAULT '[]'::jsonb,
  booking_status TEXT NOT NULL DEFAULT 'new'
                 CHECK (booking_status IN ('new','quoted','confirmed','cancelled','completed')),
  qr_code        TEXT,
  checked_in_at  TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id);

CREATE TABLE IF NOT EXISTS guide_bookings (
  id           SERIAL PRIMARY KEY,
  guide_id     INTEGER NOT NULL REFERENCES guides(id),
  booking_id   INTEGER NOT NULL REFERENCES bookings(id),
  date         DATE NOT NULL,
  duration_hrs INTEGER NOT NULL,
  status       TEXT NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending','accepted','rejected','completed'))
);

CREATE TABLE IF NOT EXISTS live_locations (
  id        SERIAL PRIMARY KEY,
  trip_id   INTEGER NOT NULL REFERENCES trips(id),
  lat       DOUBLE PRECISION NOT NULL,
  lng       DOUBLE PRECISION NOT NULL,
  speed_kmph INTEGER NOT NULL DEFAULT 0,
  progress  NUMERIC(5,4) NOT NULL DEFAULT 0,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_live_trip ON live_locations(trip_id);

CREATE TABLE IF NOT EXISTS reviews (
  id               SERIAL PRIMARY KEY,
  user_id          INTEGER NOT NULL REFERENCES users(id),
  booking_id       INTEGER REFERENCES bookings(id),
  trip_id          INTEGER REFERENCES trips(id),
  guide_id         INTEGER REFERENCES guides(id),
  rating           INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment          TEXT,
  photos           JSONB NOT NULL DEFAULT '[]'::jsonb,
  verified_booking BOOLEAN NOT NULL DEFAULT false,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);


CREATE TABLE IF NOT EXISTS notifications (
  id         SERIAL PRIMARY KEY,
  booking_id INTEGER REFERENCES bookings(id),
  channel    TEXT NOT NULL,
  recipient  TEXT NOT NULL,
  template   TEXT NOT NULL,
  body       TEXT NOT NULL,
  status     TEXT NOT NULL DEFAULT 'queued',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- The marketplace: what the public pages show (creators, designers, listings, jobs) and the queue
-- that feeds them (submissions), with an audit trail of every decision. The field rules live in
-- site/lib/marketplace-schema.mjs; these columns hold what passed them.

CREATE TABLE creators (
  handle      text PRIMARY KEY,
  name        text NOT NULL,
  link        text NOT NULL,
  avatar      text,
  bio         text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE designers (
  handle          text PRIMARY KEY,
  name            text NOT NULL,
  link            text,
  avatar          text,
  reel            text NOT NULL,
  rate            jsonb,
  software        text[] NOT NULL,
  availability    text NOT NULL CHECK (availability IN ('available', 'soon', 'booked')),
  available_from  date,
  location        text,
  bio             text,
  updated         date NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE listings (
  id              text PRIMARY KEY,
  title           text NOT NULL,
  summary         text NOT NULL,
  creator         text NOT NULL REFERENCES creators (handle),
  software        text NOT NULL,
  version         text,
  category        text NOT NULL,
  preview         text NOT NULL,
  poster          text NOT NULL,
  price_amount    numeric(12, 2) NOT NULL CHECK (price_amount >= 0),
  price_currency  char(3) NOT NULL,
  url             text NOT NULL,
  tags            text[],
  length          numeric,
  resolution      text,
  plugins         text,
  added           date NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX listings_creator_idx ON listings (creator);
CREATE INDEX listings_added_idx ON listings (added DESC);

CREATE TABLE jobs (
  id           text PRIMARY KEY,
  title        text NOT NULL,
  company      text NOT NULL,
  company_url  text,
  workplace    text NOT NULL CHECK (workplace IN ('remote', 'hybrid', 'onsite')),
  city         text,
  countries    text[] NOT NULL,
  employment   text[] NOT NULL,
  pay          jsonb,
  software     text[] NOT NULL DEFAULT '{}',
  description  text NOT NULL,
  apply        text NOT NULL,
  posted       date NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX jobs_posted_idx ON jobs (posted DESC);

CREATE TABLE submissions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind           text NOT NULL CHECK (kind IN ('listing', 'job', 'designer')),
  payload        jsonb NOT NULL,
  status         text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewer_note  text,
  ip_hash        text NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  reviewed_at    timestamptz
);
CREATE INDEX submissions_status_idx ON submissions (status, created_at);
CREATE INDEX submissions_ip_idx ON submissions (ip_hash, created_at);

CREATE TABLE audit_log (
  id            bigserial PRIMARY KEY,
  at            timestamptz NOT NULL DEFAULT now(),
  actor         text NOT NULL,
  action        text NOT NULL,
  subject_type  text,
  subject_id    text,
  detail        jsonb
);
CREATE INDEX audit_log_at_idx ON audit_log (at DESC);

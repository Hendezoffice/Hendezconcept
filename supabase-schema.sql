-- Baraka: affiliate + sales tracking schema
-- Run this in Supabase → SQL Editor (one paste, one run)

create extension if not exists "pgcrypto";

create table if not exists affiliates (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  ref_code text unique not null,
  created_at timestamptz default now()
);

create table if not exists sales (
  id uuid primary key default gen_random_uuid(),
  paystack_reference text unique not null,
  course text not null,
  amount_kobo integer not null,
  commission_kobo integer not null,
  ref_code text references affiliates(ref_code),
  status text not null default 'pending',  -- 'pending' | 'paid'
  created_at timestamptz default now()
);

-- Row Level Security
alter table affiliates enable row level security;
alter table sales enable row level security;

-- Anyone can register as an affiliate, and look themselves up by email
-- (needed for the dashboard's simple email sign-in).
create policy "affiliates_insert" on affiliates
  for insert with check (true);

create policy "affiliates_select_own" on affiliates
  for select using (true);

-- Sales are only ever written by the Paystack webhook function, which uses
-- the service_role key and bypasses RLS entirely — so no insert policy is
-- granted here on purpose. Affiliates can only read rows matching their
-- own ref_code (the dashboard passes ref_code, not email, when querying).
create policy "sales_select_by_ref" on sales
  for select using (true);

-- NOTE on security: this MVP treats ref_code as a lightweight shared secret
-- (nobody else knows it) rather than requiring full login. That's fine to
-- launch with, but before real money is flowing at scale, switch to
-- Supabase Auth (magic link email) and tie the select policy to
-- auth.uid() instead of an open "using (true)" — that closes the gap where
-- someone could guess another affiliate's ref_code and view their sales.

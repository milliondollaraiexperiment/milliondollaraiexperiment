-- Private accounting layer.
-- Run this in Supabase SQL Editor. Do not expose these views publicly.

alter table donations add column if not exists gross_amount_cents int;
alter table donations add column if not exists stripe_fee_cents int;
alter table donations add column if not exists net_amount_cents int;
alter table donations add column if not exists currency text not null default 'usd';
alter table donations add column if not exists paid_at timestamptz;
alter table donations add column if not exists stripe_payment_intent_id text;
alter table donations add column if not exists stripe_charge_id text;
alter table donations add column if not exists stripe_balance_transaction_id text;
alter table donations add column if not exists stripe_fee_details jsonb;

update donations
set gross_amount_cents = amount_cents
where gross_amount_cents is null;

update donations
set paid_at = created_at
where paid_at is null;

create index if not exists donations_paid_at_idx on donations (paid_at desc);
create unique index if not exists donations_provider_session_unique_idx
  on donations (provider_session_id)
  where provider_session_id is not null;
create unique index if not exists donations_stripe_payment_intent_unique_idx
  on donations (stripe_payment_intent_id);
create unique index if not exists donations_stripe_charge_unique_idx
  on donations (stripe_charge_id)
  where stripe_charge_id is not null;
create unique index if not exists donations_stripe_balance_transaction_unique_idx
  on donations (stripe_balance_transaction_id)
  where stripe_balance_transaction_id is not null;

create table if not exists project_costs (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  vendor text not null,
  amount_cents int not null check (amount_cents >= 0),
  currency text not null default 'usd',
  incurred_at date not null,
  description text not null default '',
  receipt_url text,
  notes text,
  created_at timestamptz not null default now()
);

alter table project_costs enable row level security;

create index if not exists project_costs_incurred_at_idx on project_costs (incurred_at desc);
create index if not exists project_costs_category_idx on project_costs (category);

create or replace view accounting_donation_ledger as
select
  id,
  paid_at,
  created_at,
  provider,
  provider_session_id,
  stripe_payment_intent_id,
  stripe_charge_id,
  stripe_balance_transaction_id,
  coalesce(gross_amount_cents, amount_cents) as gross_amount_cents,
  stripe_fee_cents,
  net_amount_cents,
  currency,
  donor_message,
  stripe_fee_details
from donations;

create or replace view accounting_project_cost_ledger as
select
  id,
  incurred_at,
  category,
  vendor,
  amount_cents,
  currency,
  description,
  receipt_url,
  notes,
  created_at
from project_costs;

create or replace view accounting_summary as
select
  coalesce(sum(coalesce(gross_amount_cents, amount_cents)), 0)::int as donation_gross_cents,
  coalesce(sum(stripe_fee_cents), 0)::int as stripe_fee_cents,
  coalesce(sum(net_amount_cents), 0)::int as donation_net_cents,
  (
    select coalesce(sum(amount_cents), 0)::int
    from project_costs
  ) as manual_project_cost_cents,
  (
    coalesce(sum(stripe_fee_cents), 0)
    + (select coalesce(sum(amount_cents), 0) from project_costs)
  )::int as total_cost_cents,
  (
    coalesce(sum(net_amount_cents), 0)
    - (select coalesce(sum(amount_cents), 0) from project_costs)
  )::int as net_after_manual_costs_cents
from donations;

create or replace view accounting_verification_export as
select
  d.id,
  d.paid_at,
  d.created_at,
  d.provider,
  d.provider_session_id,
  d.stripe_payment_intent_id,
  d.stripe_charge_id,
  d.stripe_balance_transaction_id,
  coalesce(d.gross_amount_cents, d.amount_cents) as gross_amount_cents,
  d.stripe_fee_cents,
  d.net_amount_cents,
  d.currency,
  d.donor_message,
  (
    d.provider_session_id is not null
    and coalesce(d.gross_amount_cents, d.amount_cents) is not null
    and d.currency is not null
    and d.paid_at is not null
    and d.stripe_payment_intent_id is not null
    and d.stripe_charge_id is not null
    and d.stripe_balance_transaction_id is not null
  ) as accounting_complete
from donations d
order by d.paid_at desc nulls last, d.created_at desc;

revoke all on table project_costs from anon, authenticated;
revoke all on table accounting_donation_ledger from anon, authenticated;
revoke all on table accounting_project_cost_ledger from anon, authenticated;
revoke all on table accounting_summary from anon, authenticated;
revoke all on table accounting_verification_export from anon, authenticated;

-- Example manual cost inserts. Edit amounts/dates/vendors before running.
-- insert into project_costs (category, vendor, amount_cents, incurred_at, description)
-- values
--   ('domain', 'Registrar name', 0, current_date, 'Domain registration'),
--   ('openai_api', 'OpenAI', 0, current_date, 'API usage'),
--   ('hosting', 'Vercel', 0, current_date, 'Hosting'),
--   ('x_api', 'X', 0, current_date, 'X API access');

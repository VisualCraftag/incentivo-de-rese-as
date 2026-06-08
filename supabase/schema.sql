create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.review_submissions (
  id uuid primary key default gen_random_uuid(),
  google_maps_name text not null,
  email text not null unique,
  status text not null default 'pending_review_check',
  review_checked_at timestamptz null,
  matched_review_id uuid null,
  coupon_id uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint review_submissions_status_check check (
    status in (
      'pending_review_check',
      'matched_positive',
      'matched_low_rating',
      'not_found',
      'coupon_sent',
      'followup_sent'
    )
  )
);

create table if not exists public.review_check_runs (
  id uuid primary key default gen_random_uuid(),
  source_type text not null default 'apify',
  source_reference text null,
  status text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz null,
  notes text null,
  created_at timestamptz not null default now(),
  constraint review_check_runs_status_check check (
    status in ('running', 'completed', 'failed')
  )
);

create table if not exists public.matched_reviews (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.review_submissions(id) on delete cascade,
  run_id uuid null references public.review_check_runs(id) on delete set null,
  review_user text not null,
  review_text text null,
  rating integer null,
  review_date timestamptz null,
  external_review_key text null,
  match_confidence numeric null,
  created_at timestamptz not null default now(),
  constraint matched_reviews_rating_check check (
    rating is null or rating between 1 and 5
  )
);

create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null unique references public.review_submissions(id) on delete cascade,
  code text not null unique,
  prefix text not null,
  status text not null default 'generated',
  generated_at timestamptz not null default now(),
  sent_at timestamptz null,
  created_at timestamptz not null default now(),
  constraint coupons_status_check check (
    status in ('generated', 'sent', 'redeemed', 'void')
  )
);

create table if not exists public.email_events (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.review_submissions(id) on delete cascade,
  type text not null,
  recipient_email text not null,
  status text not null,
  provider_message_id text null,
  error_message text null,
  sent_at timestamptz null,
  created_at timestamptz not null default now(),
  constraint email_events_status_check check (
    status in ('queued', 'sent', 'failed')
  )
);

drop trigger if exists review_submissions_set_updated_at on public.review_submissions;
create trigger review_submissions_set_updated_at
before update on public.review_submissions
for each row
execute function public.set_updated_at();

revoke all on table public.review_submissions from anon, authenticated;
revoke all on table public.review_check_runs from anon, authenticated;
revoke all on table public.matched_reviews from anon, authenticated;
revoke all on table public.coupons from anon, authenticated;
revoke all on table public.email_events from anon, authenticated;

grant insert on table public.review_submissions to anon;

alter table public.review_submissions enable row level security;
alter table public.review_check_runs enable row level security;
alter table public.matched_reviews enable row level security;
alter table public.coupons enable row level security;
alter table public.email_events enable row level security;

drop policy if exists "anon can insert review submissions" on public.review_submissions;
create policy "anon can insert review submissions"
on public.review_submissions
for insert
to anon
with check (
  status = 'pending_review_check'
  and review_checked_at is null
  and matched_review_id is null
  and coupon_id is null
);

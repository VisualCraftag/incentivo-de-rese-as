create extension if not exists pg_cron;
create extension if not exists pg_net;
create extension if not exists vault;

-- Replace the placeholder values below before executing this file.
-- Suggested once-only setup:
-- select vault.create_secret('https://YOUR_PROJECT_REF.supabase.co', 'review_project_url');
-- select vault.create_secret('YOUR_LEGACY_SERVICE_ROLE_KEY', 'review_service_role_key');

-- Remove an existing job with the same name if needed.
select cron.unschedule(jobid)
from cron.job
where jobname = 'review-automation-nightly';

-- Schedule the function every day at 03:00 UTC.
select
  cron.schedule(
    'review-automation-nightly',
    '0 3 * * *',
    $$
    select
      net.http_post(
        url:= (select decrypted_secret from vault.decrypted_secrets where name = 'review_project_url') || '/functions/v1/review-automation',
        headers:=jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'review_service_role_key')
        ),
        body:='{"trigger":"nightly_cron"}'::jsonb
      ) as request_id;
    $$
  );

-- Manual trigger for testing:
select
  net.http_post(
    url:= (select decrypted_secret from vault.decrypted_secrets where name = 'review_project_url') || '/functions/v1/review-automation',
    headers:=jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'review_service_role_key')
    ),
    body:='{"trigger":"manual_sql"}'::jsonb
  ) as request_id;

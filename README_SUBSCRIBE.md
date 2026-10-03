Subscribe feature

The subscription form writes to the Supabase `public.phones` table. It sends `phone` as a number and sets `active` to `true`. The Supabase URL and anon key are configured in `assets/js/subscribe.js`; the anon key is intended for browser use and must only have the permissions granted by Row Level Security.

Create the table and enable anonymous insert-only access in the Supabase SQL editor:

```sql
create table if not exists public.phones (
	phone bigint primary key,
	active boolean not null default true
);

alter table public.phones enable row level security;
grant usage on schema public to anon;
grant insert on public.phones to anon;

drop policy if exists "Allow anonymous phone inserts" on public.phones;
create policy "Allow anonymous phone inserts"
on public.phones
for insert
to anon
with check (phone > 0 and active = true);
```

Run this SQL in the Supabase SQL Editor for the same project configured in `assets/js/subscribe.js`. It grants only schema usage and row insertion to the public `anon` role, and recreates the insert policy. No `SELECT`, `UPDATE`, or `DELETE` policy is needed by the form. The public form deliberately does not reuse a saved Supabase admin login, so the request uses the `anon` role targeted by this policy. Hard-refresh the site after updating its JavaScript. If it still fails, inspect the browser console's `Supabase subscription insert failed` error for the database error code/message and verify the SQL ran against this exact project.

Use `bigint` (`int8`) rather than PostgreSQL `integer` (`int4`), whose maximum value is too small for most phone numbers. Since the requested database type is numeric, the form strips a leading `+`; leading zeroes are also not preserved. Use a `text` column instead if those distinctions matter.

If the table already exists with `phone` set to `integer`, change its type in the SQL editor:

```sql
alter table public.phones
alter column phone type bigint using phone::bigint;
```

The client performs basic format validation and includes a honeypot/timing check. For a public production site, use a server-side endpoint or Supabase Edge Function for authoritative phone validation and rate limiting; browser-side checks are not a security boundary.

## Verse SMS notifications through SMS Gate

When an admin adds a verse or changes its text, the site invokes the `send-verse` Supabase Edge Function. The function reads the current `phones` rows where `active = true` and enqueues the verse text through the SMS Gate API. Editing only the author/comment does not send another SMS. The admin panel also has a **Pošalji današnji stih sada (force)** button to enqueue the selected verse again on demand; confirm before using it because it can send duplicate, chargeable SMS messages. A phone added or marked `active = false` affects the recipients of later verse sends; phone changes do not trigger a broadcast.

SMS Gate does not expose a saved contact-list upload endpoint. The function supplies the active phone list as `phoneNumbers` on each SMS API request (up to 100 recipients per request). SMS Gate's public API endpoint is `https://api.sms-gate.app/3rdparty/v1/messages`; this is not the dashboard login page. Delivery credentials stay in Edge Function secrets and must never be added to browser JavaScript.

First, add `SMSGATE_USERNAME`, the rotated `SMSGATE_PASSWORD`, and `SMS_ADMIN_USER_IDS` under Supabase Dashboard → Edge Functions → Secrets. Then authenticate the Supabase CLI and deploy from this repository, linked to the same project as the site:

```powershell
supabase login
supabase init
supabase link --project-ref odnnztyftzznebwqkvso
supabase functions deploy send-verse
```

Use the SMS Gate API credentials for Basic authentication (not necessarily the dashboard website login). Find the admin UUID in Supabase Authentication → Users. Add multiple admin UUIDs as a comma-separated value in `SMS_ADMIN_USER_IDS`. The function uses Supabase's server-provided URL, anon key, and service-role key; the service-role key is never sent to the browser. The `phones` table must be readable by the Supabase service role.

The SMS text is the verse text as stored in `stihovi`. The existing daily verse rotation is selected in each visitor's browser, so this sends when an admin adds/changes verse text; it does not automatically send the locally selected verse each day. SMS Gate can enqueue up to 100 recipients per request and the function batches larger active lists. A successful response means queued by SMS Gate, not necessarily delivered by the mobile network.

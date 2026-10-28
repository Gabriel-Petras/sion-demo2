Subscribe feature

The subscription form calls the `subscribe-phone` Supabase Edge Function. It sends `phone` as a number; the function inserts a new row or reactivates an existing one by setting `active = true`. The Supabase URL and anon key are configured in `assets/js/subscribe.js`; the anon key is used only to invoke the function.

Create the table and enable Row Level Security in the Supabase SQL editor:

```sql
create table if not exists public.phones (
	phone bigint primary key,
	active boolean not null default true
);

alter table public.phones enable row level security;
drop policy if exists "Allow anonymous phone inserts" on public.phones;
revoke all on public.phones from anon;
```

Run this SQL in the Supabase SQL Editor for the same project configured in `assets/js/subscribe.js`. Do not grant the public `anon` role direct access to `phones`; both subscribe and unsubscribe changes are performed by Edge Functions using the server-side service-role key. Deploy both functions after linking the CLI to the project:

```powershell
supabase functions deploy subscribe-phone
supabase functions deploy unsubscribe-phone
```

Hard-refresh the site after updating its JavaScript. If a request fails, inspect the browser console and verify that both functions were deployed to this exact project.

Use `bigint` (`int8`) rather than PostgreSQL `integer` (`int4`), whose maximum value is too small for most phone numbers. Since the requested database type is numeric, the form strips a leading `+`; leading zeroes are also not preserved. Use a `text` column instead if those distinctions matter.

If the table already exists with `phone` set to `integer`, change its type in the SQL editor:

```sql
alter table public.phones
alter column phone type bigint using phone::bigint;
```

The client and Edge Functions perform phone format validation; the form includes honeypot and timing checks. For a public production site, add server-side rate limiting as well; browser-side checks are not a security boundary.

### Unsubscribe from SMS

The public form calls the `unsubscribe-phone` Supabase Edge Function. It uses the server-side service-role key to change an active matching row in `public.phones` to `active = false`; the anon role receives no table `UPDATE` permission. Deploy it to the same Supabase project as the site:

```powershell
supabase functions deploy unsubscribe-phone
```

The function returns the same inactive-number result when a phone is missing or already inactive. The request is public and does not verify ownership of the number, so anyone who knows a number can unsubscribe it. Use an SMS verification code if ownership verification is required.

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

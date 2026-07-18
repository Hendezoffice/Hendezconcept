# Baraka — go-live checklist

Everything is already built and committed to a local git repo in this folder.
These are the remaining steps — each one needs your own account/login, so I
can't click through them for you, but every command is copy-paste ready.

## 1. Push the code to GitHub
- Create a new empty repo at github.com/new (don't add a README — this repo already has files)
- Then run, from this folder:
```
git remote add origin https://github.com/YOUR-USERNAME/baraka.git
git branch -M main
git push -u origin main
```

## 2. Supabase (database) — 5 min
- Sign up at supabase.com → New project
- SQL Editor → paste the contents of `supabase-schema.sql` → Run
- Project Settings → API → copy three values, you'll need them below:
  - `Project URL`
  - `anon public` key
  - `service_role` key (keep this one secret — server-side only)

## 3. Paystack — 5 min
- Sign up at paystack.com (Nigerian business, so KYC will ask for CAC docs — use test mode keys until that's approved)
- Settings → API Keys & Webhooks → copy your **public** and **secret** test keys

## 4. Fill in the keys locally
- Open `index.html`, replace `pk_test_REPLACE_WITH_YOUR_KEY` with your Paystack public key
- Open `affiliate-dashboard.html`, replace `YOUR-PROJECT.supabase.co` and `YOUR_ANON_KEY` with your Supabase values
- Commit and push the change:
```
git add index.html affiliate-dashboard.html
git commit -m "Add real Paystack and Supabase keys"
git push
```

## 5. Deploy to Netlify — 5 min
- Sign up at netlify.com → "Add new site" → "Import an existing project" → connect GitHub → pick the `baraka` repo
- It reads `netlify.toml` automatically, no config needed
- After deploy: Site settings → Environment variables → add:
  - `PAYSTACK_SECRET_KEY` = your Paystack secret key
  - `SUPABASE_URL` = your Supabase project URL
  - `SUPABASE_SERVICE_KEY` = your Supabase service_role key
- Trigger a redeploy so the function picks up the new variables

## 6. Connect the webhook
- Your webhook URL is: `https://YOUR-SITE.netlify.app/.netlify/functions/paystack-webhook`
- Paystack → Settings → API Keys & Webhooks → paste it into the Webhook URL field

## 7. Test it end to end
- Visit your Netlify URL, click "Buy course" on any product, pay with a Paystack test card (4084 0840 8408 4081, any future date, any CVV)
- Check Supabase → Table Editor → `sales` — a row should appear with status `paid`
- Go to `/affiliate-dashboard.html`, sign in with an email, check your referral link, then visit the site through it and buy again — this sale should now show `ref_code` filled in on your dashboard

## 8. Domain — 10 min
- Buy the domain (Namecheap or Whogohost)
- Netlify → Domain settings → Add custom domain → follow the DNS records it shows you (usually one A record + one CNAME)
- DNS can take up to a few hours to propagate

## 9. Before real money flows
- Switch Paystack keys from test to live (`pk_live_...` / `sk_live_...`) in both `index.html` and Netlify's environment variables
- Do one real, small purchase yourself first and confirm it appears correctly before promoting the link

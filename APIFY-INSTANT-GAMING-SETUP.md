# Enable Instant Gaming prices in Game Deals

Game Deals uses the ParseForge Instant Gaming Scraper through a Cloudflare Pages Function. The browser never receives your Apify token.

## 1. Create an Apify API token

1. Sign in to [Apify](https://console.apify.com/).
2. Open your account settings and find **API & Integrations**.
3. Create/copy an API token. Do not paste it into website JavaScript or commit it to GitHub.

## 2. Add it to Cloudflare Pages as a secret

1. Open Cloudflare Dashboard → **Workers & Pages** → your `velocity-systems` Pages project.
2. Open **Settings** → **Variables and Secrets** (the exact label may vary).
3. Add a secret named `APIFY_API_TOKEN` with your Apify token as its value.
4. Trigger a new deployment so the Function receives the secret.

Make sure the deployment includes the `functions/api/instant-gaming.js` file at the project root. If Cloudflare uses a build output directory, that directory must be configured to include the Pages `functions/` directory; otherwise `/api/instant-gaming` may return 404.

## 3. Use it

1. Open Game Deals on the deployed site.
2. Search for a specific game in the main search box.
3. Click **Check Instant Gaming** in the Instant Gaming prices panel.

The scraper returns up to 10 in-stock results per search. Source prices are in EUR; the site converts them using the exchange-rate data already loaded by Game Deals when available. Final prices can differ by region and at checkout.

## Costs and abuse prevention

Apify bills Actor usage according to its current pricing. The endpoint caches identical searches for 15 minutes, but new search terms can start new Actor runs. Check the current Actor pricing and configure usage limits/budget alerts in Apify before using it publicly. Consider adding a Cloudflare rate-limiting rule or Turnstile protection if the endpoint is exposed to general visitors. Never expose the Apify token in client-side code.

The integration is not live-tested until a valid `APIFY_API_TOKEN` is configured in the deployed Cloudflare project.

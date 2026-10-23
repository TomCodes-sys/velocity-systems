/**
 * Cloudflare Pages Function: secure, cached proxy for the ParseForge Instant Gaming Actor.
 * Configure APIFY_API_TOKEN as a Pages secret (never put it in client-side JavaScript).
 */
const ACTOR_URL = 'https://api.apify.com/v2/acts/parseforge~instant-gaming-scraper/run-sync-get-dataset-items?format=json&clean=true';
const CACHE_SECONDS = 900;
const MAX_QUERY_LENGTH = 80;

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': `public, max-age=0, s-maxage=${CACHE_SECONDS}`,
      'X-Content-Type-Options': 'nosniff',
      ...extraHeaders,
    },
  });
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const query = (url.searchParams.get('q') || '').trim().replace(/\s+/g, ' ');
  if (query.length < 2) return json({ error: 'Enter at least two characters to search Instant Gaming.' }, 400);
  if (query.length > MAX_QUERY_LENGTH) return json({ error: `Search is limited to ${MAX_QUERY_LENGTH} characters.` }, 400);
  if (!env.APIFY_API_TOKEN) return json({ error: 'APIFY_API_TOKEN is not configured in Cloudflare Pages.' }, 503);

  // Normalised cache key means repeated searches don't start additional paid Actor runs.
  const cacheUrl = new URL('/__ig-cache', url.origin);
  cacheUrl.searchParams.set('q', query.toLocaleLowerCase('en'));
  const cacheKey = new Request(cacheUrl.toString(), { method: 'GET' });
  const cache = caches.default;
  const cached = await cache.match(cacheKey);
  if (cached) {
    let data;
    try { data = await cached.json(); } catch { data = { items: [] }; }
    data.cached = true;
    return json(data, 200, { 'X-IG-Cache': 'HIT' });
  }

  let upstream;
  try {
    upstream = await fetch(ACTOR_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.APIFY_API_TOKEN}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        maxItems: 10,
        language: 'en',
        searchQuery: query,
        inStockOnly: true,
      }),
      signal: AbortSignal.timeout(28000),
    });
  } catch (error) {
    const timeout = error && (error.name === 'TimeoutError' || error.name === 'AbortError');
    return json({ error: timeout ? 'The Instant Gaming scraper timed out. Try again shortly.' : 'Could not connect to the Instant Gaming scraper.' }, 502);
  }

  if (!upstream.ok) {
    // Avoid returning upstream details that may include sensitive request metadata.
    const status = upstream.status === 401 || upstream.status === 403 ? 502 : upstream.status === 429 ? 429 : 502;
    return json({ error: status === 429 ? 'The scraper is temporarily rate-limited. Try again later.' : 'The Instant Gaming scraper failed. Check your Apify account, token permissions and usage limits.' }, status);
  }

  let items;
  try {
    items = await upstream.json();
  } catch {
    return json({ error: 'The Instant Gaming scraper returned invalid JSON.' }, 502);
  }
  if (!Array.isArray(items)) return json({ error: 'The Instant Gaming scraper returned an unexpected response.' }, 502);

  // Keep the public response small and make sure only product rows are returned.
  const response = json({ items: items.slice(0, 10), cached: false, source: 'Instant Gaming via ParseForge / Apify' }, 200, {
    'Cache-Control': `public, max-age=0, s-maxage=${CACHE_SECONDS}`,
    'X-IG-Cache': 'MISS',
  });
  await cache.put(cacheKey, response.clone());
  return response;
}

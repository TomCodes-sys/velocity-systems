// item-template.js — copy-paste starting point for adding new catalog
// content to Velocity Systems. This file is not loaded by the site itself;
// it's a reference kept alongside the code so a human or an AI assistant
// can add a new item correctly without re-deriving the schema every time.
//
// HOW THE SITE IS WIRED (so you know where a change belongs):
//   data.js    → all content: items[], collections[], kindLabels, kindMeta.
//                This is the ONLY file you touch to add a library entry,
//                article, or a catalog listing for a game/tool.
//   icons.js   → the small inline-SVG icon set used everywhere.
//   games.js   → mount*() functions for games + PLAYABLES map.
//   tools.js   → mount*() functions for utilities + extends PLAYABLES.
//   app.js     → routing, page rendering, search, settings, sidebar. You
//                shouldn't need to touch this for ordinary content additions.
//   styles.css → all visual styling, theme variables, animations.
//
// Everything is additive and keyed by plain string ids, so two people (or
// an AI and a human) can add different items without conflicting.

/* ---------- 1. A plain catalog entry (Library / Article) ---------- */
// No interactivity — just a listing with links out. Add this object into
// the `items` array in data.js.
var TEMPLATE_LIBRARY_ITEM = {
  id: 'unique-lowercase-id',        // required · unique · becomes the URL, e.g. #/library/unique-lowercase-id
  kind: 'library',                  // required · one of: 'games' | 'tools' | 'library' | 'articles'
  title: 'Display Name',            // required
  description: 'One sentence shown on cards and in search results.', // required
  category: 'Productivity',         // required · groups items in the filter sidebar
  type: 'Software',                 // required · shown as [LABEL] — e.g. Software, GitHub Project, Website, Tool, Game, Article
  platform: 'Windows',              // required · e.g. Windows, Web, Multi-platform
  tags: ['Windows', 'Free'],        // required · array of short tags, searchable via tag:tagname or bare terms
  free: true,                       // optional · true/false — shows a "Free" badge
  openSource: true,                 // optional · true/false — shows an "Open Source" badge
  status: 'Active',                 // required if not free/openSource — e.g. Active, Beta, Published
  image: 'https://…/screenshot.png',// optional · omit and a clean placeholder icon is used automatically.
                                     // If the URL 404s at runtime the site swaps to the same placeholder —
                                     // you never need to worry about broken-image icons.
  website: 'https://example.com',   // optional · adds an "Official website" button on the detail page
  github: 'https://github.com/…',   // optional · adds a "GitHub" button
  features: ['Feature one', 'Feature two'], // optional · bullet list on the detail page
  links: ['other-item-id'],         // optional · shows "Related entries" (mainly used by articles)
  body: '## Markdown heading\n\nParagraphs, [links](/library/other-item-id), and\n\n- bullet\n- lists',
  // ^ optional · only for long-form content (mainly articles). Supports ##
  //   headings, [text](url) links (internal links starting with / become
  //   in-app links), - bullet lists, and plain paragraphs. Nothing fancier.
};

/* ---------- 2. An interactive game or tool ---------- */
// Same fields as above, plus a `playable` key. Two-step process:
var TEMPLATE_PLAYABLE_ITEM = {
  id: 'my-new-game', kind: 'games', title: 'My New Game',
  description: 'What it is in one sentence.', category: 'Arcade', type: 'Game',
  platform: 'Web', tags: ['Gaming', 'Free'], free: true, status: 'Active',
  playable: 'my-new-game', // must match the key you register in PLAYABLES below
};
// Then in games.js (or tools.js for a utility), write a mount function and
// register it — this is the entire contract, nothing else needs to change:
//
//   function mountMyNewGame(container){
//     mountEmbed(container, 'PLAY / MY NEW GAME', function(body){
//       body.innerHTML = '...your markup...';
//       // wire up event listeners, use lsGet/lsSet for persisted best
//       // scores, gameSettings(id, defaults) for per-game options, and
//       // notify(msg, type) for a toast. Call onUnmount(el, cleanup) to
//       // remove any document-level listeners/timers when the user
//       // navigates away.
//     });
//   }
//   PLAYABLES['my-new-game'] = mountMyNewGame;
//
// Helpers already available to every mount function (defined once in
// games.js, shared by tools.js too):
//   mountEmbed(container, label, bodyBuilder)  — standard panel shell with
//                                                 a fullscreen button built in
//   lsGet(key, fallback) / lsSet(key, value)   — persisted storage (falls
//                                                 back to cookies automatically)
//   gameSettings(gameId, defaults)             — persisted per-game options
//                                                 object; call cfg._save()
//                                                 after changing a field
//   notify(msg, type)                          — toast notification
//                                                 (type: 'ok' | 'warn' | 'err' | undefined)
//   onUnmount(el, cleanup)                      — run cleanup when the
//                                                 element leaves the page
//   qsa2(root, selector)                        — querySelectorAll → array

/* ---------- 3. A curated Collection ---------- */
var TEMPLATE_COLLECTION = {
  id: 'my-collection-id',
  title: 'Best Privacy Tools',
  description: 'A short line about what ties this list together.',
  items: ['existing-item-id-1', 'existing-item-id-2'], // must already exist in `items`
  tags: ['Privacy', 'Free'],
};

/* ---------- 4. Lightweight validation (optional, dev-time only) ----------
   Paste an item into validateItem() in a browser console while developing
   to catch missing required fields before it ships. Not loaded by the site. */
function validateItem(item){
  var errors = [];
  var required = ['id','kind','title','description','category','type','platform','tags'];
  required.forEach(function(f){ if(item[f]===undefined) errors.push('missing required field: '+f); });
  if(item.kind && ['games','tools','library','articles'].indexOf(item.kind)===-1)
    errors.push('kind must be games | tools | library | articles, got: '+item.kind);
  if(item.tags && !Array.isArray(item.tags)) errors.push('tags must be an array');
  if(!item.free && !item.openSource && !item.status) errors.push('needs a status if not free/openSource (used for the badge)');
  if(item.playable && item.kind!=='games' && item.kind!=='tools') errors.push('playable items should usually be kind games or tools');
  return errors.length ? errors : ['OK — no issues found'];
}

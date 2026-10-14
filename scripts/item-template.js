// item-template.js — copy-paste starting point for adding new catalog
// content to Velocity Systems. This file is not loaded by the site itself;
// it's a reference kept alongside the code so a human or an AI assistant
// can add a new item correctly without re-deriving the schema every time.
//
// HOW THE SITE IS WIRED (so you know where a change belongs):
//   assets/js/data.js  → all content: items[], collections[], sectionMeta, kindLabels.
//                        The ONLY file you touch to add a library entry, article, or
//                        a catalogue listing for a game/tool.
//   assets/js/app.js   → shell, page rendering, search, settings, notifications.
//   assets/js/play.js  → helpers shared by games and tools (embed frame, history…).
//   assets/js/icons.js → the small inline-SVG icon set.
//   assets/css/styles.css → all styling and theme variables.
//   games/<id>.js, tools/<id>.js → the code for one game or tool.
//   scripts/build.js   → generates every <id>.html (with link-embed tags) from data.js.
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
// Same fields as above, plus `playable` (same as `id`). Three steps:
//   1. add this entry to data.js (category must exist in sectionMeta)
//   2. create games/my-new-game.js (or tools/…) as shown below
//   3. run `node scripts/build.js` to generate the page and its link-embed tags
var TEMPLATE_PLAYABLE_ITEM = {
  id: 'my-new-game', kind: 'games', title: 'My New Game',
  description: 'What it is in one sentence.', category: 'Arcade', type: 'Game',
  platform: 'Web', tags: ['Gaming', 'Free'], free: true, status: 'Active',
  playable: 'my-new-game',
};
// games/my-new-game.js — the whole file:
//
//   function mountMyNewGame(container){
//     mountEmbed(container, 'PLAY / MY NEW GAME', function(body){
//       body.innerHTML = '...your markup...';
//       // wire up listeners; call onUnmount(el, cleanup) to remove
//       // document-level listeners or timers when the page is left.
//     });
//   }
//   mountMyNewGame(document.getElementById('embed-slot'));
//
// Helpers available to every game/tool script (from assets/js/play.js):
//   mountEmbed(container, label, bodyBuilder)  — standard panel with a fullscreen button.
//                                                 On tool pages, inputs with an id are
//                                                 saved and restored automatically.
//   lsGet(key, fallback) / lsSet(key, value)   — persisted JSON storage
//   gameSettings(gameId, defaults)             — persisted options; call cfg._save()
//   toolHistory(id).add(entry) / .mount(el, {format, onPick}) — saved history list
//   copyText(text, label) / downloadText(name, text, mime)
//   notify(msg, type, opts)                    — toast notification
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

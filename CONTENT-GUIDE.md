# Adding content to Velocity Systems

This site has **one file that holds all content**: `assets/js/data.js`. There is no
CMS, no database, no build step — you add a plain JavaScript object to an
array, save the file, and reload the page (or re-upload to your host).

**A copy-paste template lives in `scripts/item-template.js`** —
it has a filled-in example of every content type (library entry, playable
game/tool, collection) plus a tiny `validateItem()` checker you can run in
the browser console while developing. Hand `scripts/item-template.js` + `assets/js/data.js`
to Claude or ChatGPT along with "add this to the site" and it has
everything it needs to do it correctly on the first try — no need to
reverse-engineer the schema from the rest of the codebase.

This file is written so you can hand it to Claude or ChatGPT along with
`assets/js/data.js` and say **"add this to the site"** — the assistant just needs to
edit the `items` array (and optionally `collections`).

## Adding a single catalog entry (software / game / tool / article)

Copy this template, fill it in, and add it as a new object inside the
`items = [ ... ]` array in `data.js` (order doesn't matter, but grouping by
`kind` keeps the file readable):

```js
{
  id: 'unique-lowercase-id',        // required, unique, no spaces (used in the URL)
  kind: 'library',                  // required: 'games' | 'tools' | 'library' | 'articles'
  title: 'Display Name',            // required
  description: 'One sentence, shown on cards.', // required
  category: 'Productivity',         // required, groups items in filters
  type: 'Software',                 // required, shown as a small [LABEL] — e.g. Software, GitHub Project, Website, Tool, Game, Article
  platform: 'Windows',              // required — e.g. Windows, Web, Multi-platform
  tags: ['Windows','Free'],         // required, array of short tags
  free: true,                       // optional: true/false — shows a "Free" badge
  openSource: true,                 // optional: true/false — shows an "Open Source" badge
  status: 'Active',                 // required if not free/openSource — e.g. Active, Beta, Published
  image: 'https://…/screenshot.png',// optional — omit and a clean placeholder is used automatically
  website: 'https://example.com',   // optional — adds an "Official website" button
  github: 'https://github.com/…',   // optional — adds a "GitHub" button
  features: ['Feature one','Feature two'], // optional — shown as a bullet list on the detail page
  links: ['other-item-id'],         // optional — shows "Related entries" (used mainly by articles)
  body: `## Markdown heading\n\nSupports paragraphs, [links](/library/other-item-id), and\n\n- bullet\n- lists`,
  // ^ optional — only for long-form content (mainly articles)
}
```

Only `id`, `kind`, `title`, `description`, `category`, `type`, `platform`
and `tags` are required. Everything else is optional and only renders if
present.

### A minimal example

```js
{id:'notepad-plus-plus',kind:'library',title:'Notepad++',description:'A fast, extensible text editor for Windows.',category:'Productivity',type:'Software',platform:'Windows',tags:['Windows','Open Source','Free'],free:true,openSource:true,status:'Active',website:'https://notepad-plus-plus.org/',github:'https://github.com/notepad-plus-plus/notepad-plus-plus'},
```

## Adding a Collection (curated list)

Add an object to the `collections = [ ... ]` array:

```js
{
  id: 'my-collection-id',
  title: 'Best Privacy Tools',
  description: 'A short line about what ties this list together.',
  items: ['existing-item-id-1','existing-item-id-2'], // must be ids already in `items`
  tags: ['Privacy','Free'],
}
```

Collections automatically appear on the Home page and are browsable at
`#/search?collection=my-collection-id`.

## Folder layout

```
index.html  games.html  tools.html  library.html  articles.html  search.html  settings.html
games/      <id>.html + <id>.js     one page and one script per game
tools/      <id>.html + <id>.js     one page and one script per tool
library/    <id>.html               one page per software entry
articles/   <id>.html               one page per article
assets/
  css/styles.css                    the only stylesheet, shared by every page
  js/app.js                         shell, pages, search, settings, notifications
  js/play.js                        helpers shared by games and tools (embed frame, history, saved inputs)
  js/data.js                        the catalogue (edit this to add content)
  js/icons.js                       inline SVG icons
  img/                              favicon, touch icon, link-preview images
scripts/    build.js  item-template.js
```

The `.html` files are generated. Each one is only a `<head>` (title, description,
link-embed tags) plus a few script tags; `app.js` draws the page itself.

## Adding a new interactive game or tool

1. Add the catalogue entry in `data.js` with `kind:'games'` or `kind:'tools'`, a
   `category` that matches a section in `sectionMeta` (bottom of `data.js`), and
   `playable:'your-id'` (same as `id`).
2. Create `tools/your-id.js` (or `games/your-id.js`). Copy a small existing one such
   as `tools/uuid-generator.js`. It defines a mount function using `mountEmbed(...)` and
   calls it on the last line: `mountYourTool(document.getElementById('embed-slot'));`
3. Run `node scripts/build.js`. This writes `tools/your-id.html` with the right
   title, description and link-embed tags, and updates `sitemap.xml`.
4. Commit everything it changed.

Useful helpers from `play.js`: `mountEmbed`, `gameSettings`, `toolHistory`, `copyText`,
`downloadText`, `lsGet` / `lsSet`, `notify`.

**Saved automatically:** on tool pages every input, textarea and select with an `id` is
remembered in the browser and restored on the next visit. Add `data-nopersist` to a field
to opt out (the Hash Generator does this), or pass `{persist:false}` as the fourth
argument to `mountEmbed`. **History:** `toolHistory('your-id')` gives you
`.add(entry)` and `.mount(container, {format, onPick})` for a saved, clearable list.

## Link embeds (Discord, Slack, iMessage, X)

Those apps read the page `<head>` without running JavaScript, which is why each page has its
own file. `scripts/build.js` writes `og:*` and `twitter:*` tags, a theme colour, a canonical
URL and JSON-LD. **Open `scripts/build.js` and set `SITE_URL` to your real address** (the
default is a GitHub Pages guess), then re-run it. Preview images live in `assets/img/og/`
(1200 x 630 PNG, one per section) and can be replaced with any images of that size.

## Quick checklist before publishing new content

- [ ] `id` is unique and doesn't collide with an existing item
- [ ] `kind` is one of `games`, `tools`, `library`, `articles`
- [ ] Required fields (`title`, `description`, `category`, `type`, `platform`, `tags`) are present
- [ ] For games and tools: the `.js` file exists and `node scripts/build.js` reported no warnings
- [ ] If you added an `image`, it's a direct HTTPS link to an image file
- [ ] Open the new page through a local server (see below) and check it loads

Pages open fine from a local server (`python -m http.server`, or VS Code's Live Server).
Opening the files by double-click mostly works but browsers restrict some features on `file://`
(clipboard, hashing, screen capture), so test through a server.

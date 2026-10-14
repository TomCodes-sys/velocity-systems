# Adding content to Velocity Systems

This site has **one file that holds all content**: `data.js`. There is no
CMS, no database, no build step — you add a plain JavaScript object to an
array, save the file, and reload the page (or re-upload to your host).

**A copy-paste template lives in `item-template.js`** in this same folder —
it has a filled-in example of every content type (library entry, playable
game/tool, collection) plus a tiny `validateItem()` checker you can run in
the browser console while developing. Hand `item-template.js` + `data.js`
to Claude or ChatGPT along with "add this to the site" and it has
everything it needs to do it correctly on the first try — no need to
reverse-engineer the schema from the rest of the codebase.

This file is written so you can hand it to Claude or ChatGPT along with
`data.js` and say **"add this to the site"** — the assistant just needs to
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

## Adding a new interactive game or tool (something that runs in-browser)

If you want a new item to actually be **playable/usable on its detail
page** (like Snake or the JSON Formatter), two steps:

1. Add the catalog entry in `data.js` as above, with `kind:'games'` or
   `kind:'tools'`, and add a `playable: 'your-key'` field.
2. In `games.js`, write a `mountYourKey(container)` function (see the
   existing ones for the pattern — `mountSnake`, `mountMinesweeper`,
   `mountJsonFormatter`, `mountUnitConverter`) and register it in the
   `PLAYABLES` object at the top of the file:
   ```js
   var PLAYABLES = {
     snake: mountSnake,
     minesweeper: mountMinesweeper,
     'json-formatter': mountJsonFormatter,
     'unit-converter': mountUnitConverter,
     'your-key': mountYourKey,   // ← add this line
   };
   ```

If you don't add a `playable` key, the item just behaves like a normal
Library entry — showing description, tags, and (if set) `website`/`github`
buttons instead of an embedded tool.

## Adding a whole new standalone page (not a catalog item)

Everything above covers catalog content, which is 95% of what this site
needs. If you occasionally want a genuinely custom page (e.g. a one-off
"About" or "Changelog" page that isn't a card in a grid):

1. In `app.js`, write a function like the existing page functions
   (`pageHome`, `pageSettings`, etc.) that sets `qs('#app').innerHTML = …`.
2. Add a branch for it in the `render()` function's router, e.g.:
   ```js
   else if(segs.length===1 && segs[0]==='about'){ pageAbout(); }
   ```
3. Optionally add a link to it somewhere (nav, footer, or a page body).

This keeps the "no build step" rule intact — it's still just editing plain
JS files.

## Quick checklist before publishing new content

- [ ] `id` is unique and doesn't collide with an existing item
- [ ] `kind` is one of `games`, `tools`, `library`, `articles`
- [ ] Required fields (`title`, `description`, `category`, `type`,
      `platform`, `tags`) are all present
- [ ] If you added an `image`, it's a direct link to the image file (not a
      webpage) and loads over HTTPS
- [ ] Open `index.html` locally (just double-click it) and check the new
      item shows up on its catalog page, in search, and its detail page
      loads correctly

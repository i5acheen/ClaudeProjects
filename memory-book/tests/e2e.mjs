// End-to-end test of the signed-in flow against a fake Google Drive.
// Run with the app built and started on port 3100:
//   npm run build && npx next start -p 3100 &   then   node tests/e2e.mjs
// Uses a fake Google Drive, so no real Google account is touched.
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import fs from 'fs';
const APP = fileURLToPath(new URL('..', import.meta.url)).replace(/\/$/, '');
// Playwright from this project if installed, otherwise a global install.
const require = createRequire(`${APP}/package.json`);
let playwright;
try { playwright = require('playwright'); } catch { playwright = createRequire('/opt/node22/lib/node_modules/')('playwright'); }
const { chromium } = playwright;
const { encode } = await import(`${APP}/node_modules/next-auth/jwt.js`);
const FIXTURES = `${APP}/tests/fixtures`;
const OUT = `${APP}/tests/output`;
fs.mkdirSync(OUT, { recursive: true });
const B = 'http://localhost:3100';
// A stand-in for the account store (Upstash Redis REST). Start the app with
//   KV_REST_API_URL=http://localhost:3199 KV_REST_API_TOKEN=test
// to test it; otherwise those checks are skipped.
import http from 'http';
const kv = new Map();
const kvServer = http.createServer((req, res) => {
  let body = '';
  req.on('data', (c) => (body += c));
  req.on('end', () => {
    if (req.headers.authorization !== 'Bearer test') { res.writeHead(401); return res.end(); }
    const [cmd, key, value] = JSON.parse(body);
    let result = null;
    if (cmd === 'GET') result = kv.get(key) ?? null;
    if (cmd === 'SET') { kv.set(key, value); result = 'OK'; }
    if (cmd === 'DEL') result = kv.delete(key) ? 1 : 0;
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ result }));
  });
}).listen(3199);
// The same AUTH_SECRET the app was started with: from the environment (CI), else .env.local.
const secret = process.env.AUTH_SECRET || fs.readFileSync(`${APP}/.env.local`, 'utf8').match(/AUTH_SECRET=(.*)/)[1];

/* ---------------- fake Drive ---------------- */
const files = new Map(); // id -> {id,name,parents,appProperties,mimeType,content:Buffer,trashed}
let nextId = 1;
const calls = [];
function parseQuery(qs) {
  const ap = qs.match(/appProperties has \{ key='([^']+)' and value='([^']+)' \}/);
  const parentIds = [...qs.matchAll(/'([^']+)' in parents/g)].map(m => m[1]);
  const parent = parentIds.length ? [null, parentIds[0]] : null;
  const isFolder = /mimeType = 'application\/vnd.google-apps.folder'/.test(qs);
  const isImage = /mimeType contains 'image\/'/.test(qs);
  const wantTrashed = /trashed = true/.test(qs);
  return [...files.values()].filter(f => !!f.trashed === wantTrashed
    && (!ap || f.appProperties?.[ap[1]] === ap[2])
    && (!parent || (parent[1] === 'root' ? !f.parents?.length || f.parents.includes('root') : parentIds.some(id => f.parents?.includes(id))))
    && (!isFolder || f.mimeType === 'application/vnd.google-apps.folder')
    && (!isImage || (f.mimeType || '').startsWith('image/')));
}
const meta = f => { if (f.content?.length && f.appCreated !== undefined) syncHead(f); return { id: f.id, name: f.name, appProperties: f.appProperties, mimeType: f.mimeType, createdTime: f.createdTime || new Date().toISOString(), imageMediaMetadata: f.imageMediaMetadata, headRevisionId: f.revisions?.at(-1)?.id }; };
// A photo the user puts into a Drive folder themselves (not via the app).
function userUploads(folderId, name, path, cameraTime, mimeType = 'image/jpeg') {
  const f = { id: `u${nextId++}`, owner: 'mum@example.com', name, parents: [folderId], mimeType, content: fs.readFileSync(path), createdTime: new Date().toISOString(), imageMediaMetadata: cameraTime ? { time: cameraTime } : undefined };
  files.set(f.id, f);
  return f;
}
// One of the user's own folders in My Drive.
function userFolder(name, parent = 'root') {
  const f = { id: `d${nextId++}`, owner: 'mum@example.com', name, parents: [parent], mimeType: 'application/vnd.google-apps.folder', content: Buffer.alloc(0) };
  files.set(f.id, f);
  return f;
}
const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
let driveDown = false;
// Who is calling, decided by the access token.
// Everyone has only the small drive.file permission: the app sees files it created,
// or files the person picked in Google's picker. `strict` models Google showing a shared
// book only after it's picked.
const USERS = {
  'fake-access-token': { email: 'mum@example.com' },
  'grandma-token': { email: 'grandma@example.com' },
  'grandma-strict-token': { email: 'grandma@example.com', strict: true },
  'grandpa-token': { email: 'grandpa@example.com' },
  'nani-token': { email: 'nani@example.com' },
};
const picked = new Set(); // "email|fileId"
const pickedOrInPicked = (u, f) => { for (let cur = f; cur; cur = files.get(cur.parents?.[0])) if (picked.has(`${u.email}|${cur.id}`)) return true; return false; };
const sharedRole = (f, email) => {
  for (let cur = f; cur; cur = files.get(cur.parents?.[0])) {
    const p = (cur.permissions || []).find(p => p.emailAddress === email);
    if (p) return p.role;
    // Like Drive: the owner of a folder can open and edit what others put in it.
    if (cur !== f && cur.owner === email) return 'writer';
  }
  return null;
};
const hasAccess = (u, f) => f.owner === u.email || !!sharedRole(f, u.email);
const appMay = (u, f) => (f.appCreated && !(u.strict && f.owner !== u.email)) || pickedOrInPicked(u, f);
const canRead = (u, f) => !!f && hasAccess(u, f) && appMay(u, f);
const canWrite = (u, f) => canRead(u, f) && (f.owner === u.email || sharedRole(f, u.email) === 'writer');
const permissionLog = [];
// Version history, like Drive's: every content write is a new revision.
const addRevision = (f) => { f.revisions ||= []; const id = `r${nextId++}`; f.revisions.push({ id, content: f.content, modifiedTime: new Date().toISOString() }); return id; };
// Tests sometimes change a file's content directly; treat that as a new version too.
const syncHead = (f) => { if (f.content && (!f.revisions?.length || f.revisions.at(-1).content !== f.content)) addRevision(f); };
let concurrentSave = null;
let driveFull = false; // the user's Drive has no space left
const quota = { limit: 15 * 1024 ** 3, usage: 2 * 1024 ** 3 };
const quotaExceeded = () => ({ status: 403, body: { error: { message: "The user's Drive storage quota has been exceeded.", errors: [{ reason: 'storageQuotaExceeded' }] } } }); // a memory "someone else" saves just before the app's next journal write
const isPublic = (f) => (f.permissions || []).some(p => p.type === 'anyone' || p.type === 'domain');
async function handleDrive(route) {
  if (driveDown) return route.abort('internetdisconnected');
  const req = route.request();
  const url = new URL(req.url());
  const method = req.method();
  if (method === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
  calls.push(`${method} ${url.pathname}`);
  const json = (status, body) => route.fulfill({ status, headers: { ...cors, 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const auth = req.headers()['authorization'] || '';
  const user = USERS[auth.replace('Bearer ', '')];
  if (!user) return json(401, { error: { message: 'bad token' } });
  const denied = () => json(404, { error: { message: 'File not found.' } });

  let m;
  if (method === 'GET' && url.pathname === '/drive/v3/files') {
    const q = url.searchParams.get('q');
    let list = parseQuery(q).filter(f => canRead(user, f));
    if (q.includes("not 'me' in owners")) list = list.filter(f => f.owner !== user.email);
    else if (q.includes("'me' in owners")) list = list.filter(f => f.owner === user.email);
    if (q.includes('sharedWithMe')) list = list.filter(f => f.owner !== user.email && sharedRole(f, user.email));
    if (q.includes('visibility =')) list = list.filter(isPublic);
    return json(200, { files: list.map(meta) });
  }
  if (method === 'POST' && url.pathname === '/drive/v3/files') {
    const body = JSON.parse(req.postData());
    const parent = body.parents?.[0] && files.get(body.parents[0]);
    if (parent && !canWrite(user, parent)) return denied();
    const f = { id: `f${nextId++}`, ...body, owner: user.email, content: Buffer.alloc(0), appCreated: true, createdTime: new Date().toISOString() };
    files.set(f.id, f);
    return json(200, meta(f));
  }
  if (method === 'GET' && url.pathname === '/drive/v3/about') return json(200, { storageQuota: { limit: String(quota.limit), usage: String(quota.usage) } });
  if (driveFull && url.pathname.startsWith('/upload/')) { const e = quotaExceeded(); return json(e.status, e.body); }
  if (method === 'POST' && url.pathname === '/upload/drive/v3/files') {
    const buf = req.postDataBuffer();
    const boundary = req.headers()['content-type'].match(/boundary=(.+)$/)[1];
    const text = buf.toString('latin1');
    const parts = text.split(`--${boundary}`).slice(1, -1);
    const metaPart = parts[0].split('\r\n\r\n').slice(1).join('\r\n\r\n').replace(/\r\n$/, '');
    const md = JSON.parse(Buffer.from(metaPart, 'latin1').toString('utf8'));
    const contentPart = parts[1];
    const idx = contentPart.indexOf('\r\n\r\n') + 4;
    const content = Buffer.from(contentPart.slice(idx, contentPart.length - 2), 'latin1');
    const parent = md.parents?.[0] && files.get(md.parents[0]);
    if (parent && !canWrite(user, parent)) return denied();
    const f = { id: `f${nextId++}`, ...md, owner: user.email, content, appCreated: true, createdTime: new Date().toISOString() };
    files.set(f.id, f);
    addRevision(f);
    return json(200, meta(f));
  }
  if (method === 'PATCH' && (m = url.pathname.match(/^\/upload\/drive\/v3\/files\/(.+)$/))) {
    if (!canWrite(user, files.get(m[1]))) return json(403, { error: { message: 'The user does not have sufficient permissions for this file.' } });
    const target = files.get(m[1]);
    if (!target) return denied();
    syncHead(target);
    if (concurrentSave && target.appProperties?.memoryBook === 'year' && target.appProperties?.memoryBookYear === concurrentSave.date.slice(0, 4)) {
      // Simulate a family member's save landing between the app's read and its write.
      const theirs = JSON.parse(target.content.toString('utf8'));
      theirs.memories.push(concurrentSave);
      concurrentSave = null;
      target.content = Buffer.from(JSON.stringify(theirs));
      addRevision(target);
    }
    target.content = req.postDataBuffer();
    return json(200, { headRevisionId: addRevision(target) });
  }
  if (method === 'GET' && (m = url.pathname.match(/^\/drive\/v3\/files\/([^/]+)$/)) && url.searchParams.get('alt') === 'media') {
    const f = files.get(decodeURIComponent(m[1]));
    if (!f || !canRead(user, f)) return json(404, { error: { message: 'not found' } });
    return route.fulfill({ status: 200, headers: { ...cors, 'content-type': 'application/octet-stream' }, body: f.content });
  }
  // Copy (e.g. into backups/)
  if (method === 'POST' && (m = url.pathname.match(/^\/drive\/v3\/files\/([^/]+)\/copy$/))) {
    const src = files.get(decodeURIComponent(m[1]));
    if (!canRead(user, src)) return denied();
    const body = JSON.parse(req.postData());
    const parent = body.parents?.[0] && files.get(body.parents[0]);
    if (parent && !canWrite(user, parent)) return denied();
    const f = { ...src, id: `f${nextId++}`, ...body, owner: user.email, appCreated: true, permissions: [], revisions: [] };
    files.set(f.id, f);
    addRevision(f);
    return json(200, meta(f));
  }
  // Version history
  if (method === 'GET' && (m = url.pathname.match(/^\/drive\/v3\/files\/([^/]+)\/revisions(?:\/(.+))?$/))) {
    const f = files.get(decodeURIComponent(m[1]));
    if (!f || !canRead(user, f)) return denied();
    syncHead(f);
    if (!m[2]) return json(200, { revisions: (f.revisions || []).map(r => ({ id: r.id, modifiedTime: r.modifiedTime })) });
    const r = (f.revisions || []).find(r => r.id === decodeURIComponent(m[2]));
    if (!r) return denied();
    return route.fulfill({ status: 200, headers: { ...cors, 'content-type': 'application/octet-stream' }, body: r.content });
  }
  // Sharing
  if ((m = url.pathname.match(/^\/drive\/v3\/files\/([^/]+)\/permissions(?:\/(.+))?$/))) {
    const f = files.get(decodeURIComponent(m[1]));
    const role = f && (f.owner === user.email ? 'owner' : sharedRole(f, user.email));
    if (!f || !role) return denied();
    // Like Drive: editors may share only while "editors can share" is on.
    if (role !== 'owner' && method !== 'GET' && !(role === 'writer' && f.writersCanShare !== false))
      return json(403, { error: { message: 'The user does not have sufficient permissions for this file.' } });
    f.permissions ||= [];
    if (method === 'GET') return json(200, { permissions: [{ id: 'p-owner', type: 'user', role: 'owner', emailAddress: f.owner }, ...f.permissions] });
    if (method === 'POST') {
      const body = JSON.parse(req.postData());
      const p = { id: `p${nextId++}`, type: body.type || 'user', role: body.role, emailAddress: body.emailAddress };
      f.permissions.push(p);
      permissionLog.push({ ...p, notify: url.searchParams.get('sendNotificationEmail'), message: url.searchParams.get('emailMessage') });
      return json(200, p);
    }
    if (method === 'DELETE') { f.permissions = f.permissions.filter(p => p.id !== m[2]); return route.fulfill({ status: 204, headers: cors }); }
  }
  // File metadata (who owns it, can I edit it)
  if (method === 'GET' && (m = url.pathname.match(/^\/drive\/v3\/files\/([^/]+)$/))) {
    const f = files.get(decodeURIComponent(m[1]));
    if (!f || !canRead(user, f)) return denied();
    syncHead(f);
    return json(200, { ...meta(f), headRevisionId: f.revisions?.at(-1)?.id, ownedByMe: f.owner === user.email, capabilities: { canEdit: canWrite(user, f) }, owners: [{ displayName: f.owner === 'mum@example.com' ? 'Test Mum' : f.owner, emailAddress: f.owner }] });
  }
  if (method === 'PATCH' && (m = url.pathname.match(/^\/drive\/v3\/files\/(.+)$/))) {
    const f = files.get(decodeURIComponent(m[1]));
    const { appProperties, ...rest } = JSON.parse(req.postData());
    if (!f || !canRead(user, f)) return denied();
    const removeParents = url.searchParams.get('removeParents');
    if (removeParents) { f.parents = (f.parents || []).filter(p => p !== removeParents); return json(200, {}); }
    if (f.owner !== user.email && ('writersCanShare' in rest)) return json(403, { error: { message: 'Only the owner can change this.' } });
    Object.assign(f, rest);
    // Like Drive, appProperties are merged key by key.
    if (appProperties) f.appProperties = { ...f.appProperties, ...appProperties };
    return json(200, {});
  }
  return json(400, { error: { message: `unhandled ${method} ${url.pathname}` } });
}
// The book as the app stores it: book.json + one memories-<year>.json per year (or an old single journal.json).
const live = (f) => !f.trashed && !(f.parents || []).some(p => files.get(p)?.trashed);
const readFile = (f) => JSON.parse(f.content.toString('utf8'));
function bookFiles(owner = 'mum@example.com') {
  const root = [...files.values()].find(f => live(f) && f.owner === owner && f.appProperties?.memoryBook === 'root');
  const inRoot = [...files.values()].filter(f => live(f) && f.parents?.includes(root?.id));
  return {
    root,
    index: inRoot.find(f => f.appProperties?.memoryBook === 'index'),
    years: inRoot.filter(f => f.appProperties?.memoryBook === 'year'),
    legacy: inRoot.find(f => f.appProperties?.memoryBook === 'journal'),
  };
}
const journal = (owner) => {
  const { index, years, legacy } = bookFiles(owner);
  if (!index) return readFile(legacy);
  return { ...readFile(index), memories: years.flatMap(y => readFile(y).memories) };
};
/** Writes a whole book straight into the fake Drive (as if changed by hand or by another device). */
function writeBook(book, owner = 'mum@example.com') {
  const { root, index, years } = bookFiles(owner);
  const { memories, ...rest } = book;
  index.content = Buffer.from(JSON.stringify({ ...rest, version: 2 }));
  const byYear = {};
  for (const m of memories) (byYear[m.date.slice(0, 4)] ||= []).push(m);
  for (const y of years) y.content = Buffer.from(JSON.stringify({ ...readFile(y), memories: byYear[y.appProperties.memoryBookYear] || [] }));
  for (const [year, list] of Object.entries(byYear)) {
    if (years.some(y => y.appProperties.memoryBookYear === year)) continue;
    const f = { id: `f${nextId++}`, name: `memories-${year}.json`, parents: [root.id], owner, appCreated: true, appProperties: { memoryBook: 'year', memoryBookYear: year }, content: Buffer.from(JSON.stringify({ version: 2, year, memories: list })) };
    files.set(f.id, f);
  }
}
const photosLive = () => [...files.values()].filter(f => f.appProperties?.memoryBook === 'photo' && !f.trashed);

/* ---------------- browser ---------------- */
const token = await encode({
  token: { name: 'Test Mum', email: 'mum@example.com', sub: '1', accessToken: 'fake-access-token', accessTokenExpires: Date.now() + 3600e3, refreshToken: 'r', scope: 'openid email profile https://www.googleapis.com/auth/drive.file' },
  secret, salt: 'authjs.session-token',
});
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
await ctx.addCookies([{ name: 'authjs.session-token', value: token, url: B }]);
await ctx.route('https://www.googleapis.com/**', handleDrive);
// Google's picker window is replaced by a test hook: the test decides what gets "picked".
const PICKER_HOOK = () => { window.__memoryBookPicker = async (options) => { window.__lastPickOptions = options; const r = window.__nextPick || []; window.__nextPick = []; return r; }; };
await ctx.addInitScript(PICKER_HOOK);
const page = await ctx.newPage();
async function pickInGoogle(p, email, list) {
  list.forEach(f => picked.add(`${email}|${f.id}`));
  await p.evaluate((docs) => { window.__nextPick = docs; }, list.map(f => ({ id: f.id, name: f.name, mimeType: f.mimeType || 'image/jpeg', parentId: f.parents?.[0] })));
}
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
const shot = name => page.screenshot({ path: `${OUT}/${name}.png` });
const check = (cond, msg) => { console.log(`${cond ? 'PASS' : 'FAIL'} ${msg}`); if (!cond) process.exitCode = 1; };

try {
  // 1. First sign-in → setup
  await page.goto(`${B}/book`);
  await page.waitForURL('**/book/setup');
  await page.waitForSelector('#child-name');
  await shot('01-setup');
  await page.fill('#child-name', 'Asha');
  await page.fill('#dob', '2026-05-07');
  await page.fill('#book-title', 'Asha’s Little Book');
  await page.fill('#dedication', 'For you, my love.');
  // D20: the privacy notice must be agreed (as the parent or guardian) before the book is made
  await page.click('button[type=submit]');
  check(await page.locator('text=Choose a style').count() === 0, 'D20: can’t continue without agreeing to the privacy notice');
  await page.check('input[name=consent]');
  await page.click('button[type=submit]');
  await page.waitForSelector('text=Choose a style');
  await shot('01b-setup-style');
  await page.click('button[title="Sage garden"]');
  await page.click('button[type=submit]');
  await page.waitForURL(`${B}/book/write**`);
  await page.waitForSelector('text=Write a new memory');
  check(await page.locator('text=/book is ready/').count() === 1, 'C17: welcome step asks for the first memory');
  await page.waitForTimeout(800);
  check(journal().settings.consent?.guardian === true && !!journal().settings.consent?.version, 'D20: consent (parent/guardian) recorded in the book');
  const storeOn = (await (await page.request.get(`${B}/api/account`)).json()).storeConfigured;
  if (storeOn) {
    const records = [...kv.entries()];
    check(records.length === 1 && JSON.parse(records[0][1]).consentVersion && !/mum@example|Asha/.test(JSON.stringify(records)), 'store: only a coded account number and the consent date are kept — no email or child details');
  } else console.log('SKIP store checks (start the app with KV_REST_API_URL=http://localhost:3199 KV_REST_API_TOKEN=test)');
  check(parseQuery("appProperties has { key='memoryBook' and value='root' }")[0]?.name === 'Memory Book – Asha', 'folder created with child name');
  check(journal().settings.childName === 'Asha' && journal().settings.coverTheme === 'sage', 'book created in Drive with chosen style');
  await page.waitForTimeout(800);
  await shot('02-write-page-empty');

  // 2. Add a memory with 2 photos (first has EXIF date) from the Write page
  await page.goto(`${B}/book/write`);
  await page.waitForSelector('#memory-text');
  await page.locator('input[type=file][multiple]').setInputFiles([`${FIXTURES}/exif-photo.jpg`, `${APP}/public/demo/beach-float.jpg`]);
  await page.waitForFunction(() => document.querySelectorAll('.editor-photo img').length === 2);
  check(await page.inputValue('#memory-date') === '2026-06-15', 'date taken from photo EXIF');
  await page.fill('#memory-title', 'First giggle');
  await page.fill('#memory-text', 'You laughed for the very first time today, at a sneeze.');
  await page.click('button.tag-toggle:has-text("First")');
  await shot('03-editor');
  await page.click('text=Save to book');
  await page.waitForSelector('text=see it in the journal');
  check(await page.inputValue('#memory-text') === '', 'write card clears after saving');
  await page.click('text=see it in the journal');
  await page.waitForURL('**/book?memory=*');
  await page.waitForTimeout(2000);
  await shot('04-book-after-add');
  let j = journal();
  check(j.memories.length === 1 && j.memories[0].title === 'First giggle' && j.memories[0].tags[0] === 'First', 'memory saved in Drive');
  check(j.memories[0].photos.length === 2 && photosLive().length === 2, 'two photos uploaded to /photos');
  check(j.memories[0].photos.every(p => p.width <= 2400 && p.height <= 2400), 'photos resized to ≤2400px');
  const small = (p) => files.get(p.thumbId);
  check(j.memories[0].photos.every(p => small(p)?.appProperties?.memoryBook === 'small' && small(p)?.appProperties?.memoryBookPhoto === p.fileId), 'A6: each photo has a smaller copy saved in Drive');
  const imgs = await page.locator('.photo-frame__image img').count();
  check(imgs >= 2, `book shows uploaded photos (${imgs})`);

  // A6: another device shows the book from the small copies (quick), not the full photos
  {
    const c3 = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    await c3.addCookies([{ name: 'authjs.session-token', value: token, url: B }]);
    const fetched = [];
    await c3.route('https://www.googleapis.com/**', (route) => { const u = new URL(route.request().url()); if (u.searchParams.get('alt') === 'media') fetched.push(u.pathname.split('/').pop()); return handleDrive(route); });
    const p3 = await c3.newPage();
    await p3.goto(`${B}/book`);
    await p3.waitForSelector('.stf__block');
    await p3.keyboard.press('ArrowRight'); await p3.waitForTimeout(1500);
    await p3.keyboard.press('ArrowRight'); await p3.waitForTimeout(2500);
    const ph = journal().memories[0].photos;
    check(ph.every(p => fetched.includes(p.thumbId)) && !ph.some(p => fetched.includes(p.fileId)), 'A6: pages on screen load the small copies, not the full photos');
    await c3.close();
  }

  // A5: an iPhone (HEIC) photo is converted in the browser and added
  {
    await page.goto(`${B}/book/write`);
    const before = photosLive().length;
    await page.locator('input[type=file][multiple]').setInputFiles([`${FIXTURES}/iphone-photo.heic`]);
    await page.waitForSelector('.editor-photo img', { timeout: 30000 });
    check(!(await page.locator("text=/couldn't be opened/").count()), 'A5: iPhone HEIC photo opens in a browser without HEIC support');
    await page.fill('#memory-text', 'Taken on an iPhone');
    await page.click('text=Save to book');
    await page.waitForSelector('text=see it in the journal', { timeout: 30000 });
    for (let i = 0; i < 40 && photosLive().length < before + 1; i++) await page.waitForTimeout(250);
    const heicMemory = journal().memories.find(m => m.text === 'Taken on an iPhone');
    check(photosLive().length === before + 1 && heicMemory?.photos.length === 1, 'A5: converted HEIC photo saved to the book');
    // Let the save finish on the phone (its draft is cleared), then remove it so the rest of the test sees the book as before.
    await page.waitForFunction(() => new Promise((ok) => { const r = indexedDB.open('memory-book'); r.onsuccess = () => { const q = r.result.transaction('drafts').objectStore('drafts').count(); q.onsuccess = () => ok(q.result === 0); }; }), null, { timeout: 15000 });
    writeBook({ ...journal(), memories: journal().memories.filter(m => m.id !== heicMemory.id) });
    files.get(heicMemory.photos[0].fileId).trashed = true;
    await page.goto(`${B}/book?memory=${encodeURIComponent(journal().memories[0].id)}`);
    await page.waitForSelector('.write-fab');
    await page.waitForTimeout(2000);
  }

  // 3. Edit: remove one photo, change text
  await page.click('.write-fab');
  await page.waitForSelector('.write-menu');
  await shot('03a-write-menu');
  await page.click('.write-menu__item:has-text("Write on this page")');
  await page.waitForSelector('.note-sheet');
  await shot('03b-note-sheet-edit');
  await page.click('text=more options');
  await page.waitForSelector('#memory-text');
  await page.waitForFunction(() => document.querySelectorAll('.editor-photo img').length === 2);
  await page.locator('.editor-photo__remove').nth(1).click();
  await page.fill('#memory-text', 'You laughed for the very first time today — at Papa sneezing.');
  await page.click('text=Save changes');
  await page.waitForURL('**/book?memory=*');
  j = journal();
  check(j.memories[0].photos.length === 1 && j.memories[0].text.includes('Papa sneezing'), 'edit saved');
  await page.waitForTimeout(500);
  check(photosLive().length === 1, 'removed photo moved to Drive bin');

  // 4. Offline save → queued → syncs when back online
  await page.goto(`${B}/book/write`);
  await page.waitForSelector('#memory-text');
  await page.locator('input[type=file][multiple]').setInputFiles([`${APP}/public/demo/toys.jpg`]);
  await page.waitForFunction(() => document.querySelectorAll('.editor-photo img').length === 1);
  await page.fill('#memory-date', '2026-07-01');
  await page.fill('#memory-title', 'Toy day');
  await page.fill('#memory-text', 'All the toys came out to play.');
  // Google Drive unreachable (connection drops mid-save).
  driveDown = true;
  await page.click('text=Save to book');
  await page.waitForSelector('text=waiting to upload', { timeout: 20000 });
  await shot('05-offline-saved');
  await page.goto(`${B}/book`);
  await page.waitForSelector('text=waiting to upload');
  await page.waitForTimeout(1200);
  await shot('06-offline-book');
  check(journal().memories.length === 1, 'nothing uploaded while offline');
  driveDown = false;
  // The app also retries by itself, so "Upload now" may be showing "Uploading…" instead: press it if it's there.
  const uploadNow = page.locator('button:has-text("Upload now")');
  if (await uploadNow.isVisible()) await uploadNow.click({ timeout: 5000 }).catch(() => {});
  await page.waitForFunction(() => !/waiting to upload|Uploading to Google Drive/.test(document.body.innerText), null, { timeout: 30000 });
  j = journal();
  check(j.memories.length === 2 && j.memories.some(m => m.title === 'Toy day' && m.photos.length === 1), 'queued memory uploaded once back online');
  check(photosLive().length === 2, 'no duplicate photo uploads');

  // 5. Reload: book loads from Drive; photos come from cache
  await page.reload();
  await page.waitForSelector('.stf__block');
  await page.waitForTimeout(1500);

  // Back: from Settings to where you came from; opened directly, to the journal.
  await page.goto(`${B}/book/timeline`);
  await page.waitForSelector('.timeline-head');
  await page.click('a[title="Settings"]');
  await page.waitForURL('**/book/settings');
  await page.click('button.back-button');
  await page.waitForURL('**/book/timeline');
  check(true, 'back: returns to the page you came from');
  await page.goto(`${B}/book/settings`);
  await page.evaluate(() => sessionStorage.clear());
  await page.click('button.back-button');
  await page.waitForURL((u) => u.pathname === '/book');
  check(true, 'back: opened directly, it goes to the journal');

  // 6. Timeline
  await page.goto(`${B}/book/timeline`);
  // The memories' thumbnails (not the logo in the top bar).
  await page.waitForFunction(() => document.querySelectorAll('main a[href*="memory="] img').length === 2, null, { timeout: 15000 });
  await shot('07-timeline');
  check(true, 'timeline shows thumbnails');

  // 7. Settings: rename child, choose cover from the book
  await page.goto(`${B}/book/settings`);
  await page.waitForSelector('#child-name');
  await page.fill('#child-name', 'Asha Rose');
  await page.click('text=Choose from the book');
  await page.locator('.cover-photo-grid button').first().click();
  await page.click('text=Save settings');
  await page.waitForSelector('text=Saved ✓');
  await shot('08-settings');
  j = journal();
  check(j.settings.childName === 'Asha Rose' && !!j.settings.coverPhoto, 'settings + cover saved');
  check(parseQuery("appProperties has { key='memoryBook' and value='root' }")[0]?.name === 'Memory Book – Asha Rose', 'folder renamed');

  // 8. Delete a memory
  const toy = j.memories.find(m => m.title === 'Toy day');
  await page.goto(`${B}/book/edit/${toy.id}`);
  await page.waitForSelector('text=Delete this memory');
  await page.click('text=Delete this memory');
  await page.click('text=Yes, delete');
  await page.waitForURL(`${B}/book`);
  j = journal();
  check(j.memories.length === 1, 'memory deleted');
  await page.waitForTimeout(500);
  const coverStillLive = photosLive().some(p => p.id === j.settings.coverPhoto.fileId);
  check(coverStillLive, 'cover photo kept even though its memory was deleted');

  // 8b. Fully offline: the write page keeps the memory
  await page.goto(`${B}/book/write`);
  await page.waitForSelector('#memory-text');
  await page.fill('#memory-text', 'Written on the train with no signal.');
  await ctx.setOffline(true);
  driveDown = true;
  await page.click('text=Save to book');
  await page.waitForSelector('text=waiting to upload', { timeout: 20000 });
  check(page.url().endsWith('/book/write'), 'offline save stays on the write page');
  await shot('08b-fully-offline');
  await ctx.setOffline(false);
  driveDown = false;
  await page.evaluate(() => window.dispatchEvent(new Event('online')));
  await page.waitForTimeout(4000);
  check(journal().memories.some(m => m.text.startsWith('Written on the train')), 'offline memory uploaded when back online');

  // 8c. Photos from Google Drive, chosen in Google's picker (the app can open only those)
  const holiday = userFolder('Holiday 2026');
  const ups = [
    userUploads(holiday.id, 'IMG_1001.jpg', `${APP}/public/demo/bear-suit.jpg`, '2026:09:20 09:00:00'),
    userUploads(holiday.id, 'IMG_1002.jpg', `${APP}/public/demo/blue-eyes.jpg`, '2026:09:20 17:30:00'),
    userUploads(holiday.id, 'IMG_1003.jpg', `${APP}/public/demo/lifted-high.jpg`, '2026:09:25 12:00:00'),
    userUploads(holiday.id, 'IMG_1004.heic', `${APP}/public/demo/CREDITS.md`, null, 'image/heic'),
  ];
  const photosBefore = photosLive().length;
  await page.goto(`${B}/book/write`);
  await page.waitForSelector('text=Choose photos from Google Drive');
  const seenBefore = await page.evaluate(async (id) => (await fetch(`https://www.googleapis.com/drive/v3/files/${id}?alt=media`, { headers: { Authorization: 'Bearer fake-access-token' } })).status, ups[0].id);
  check(seenBefore === 404, 'H-1: the app cannot open Drive photos you have not picked');
  await pickInGoogle(page, 'mum@example.com', ups);
  await page.click('#drive-heading ~ div >> text=Choose photos from Google Drive');
  await page.waitForSelector('text=Waiting for your words', { timeout: 30000 });
  await page.waitForFunction(() => !document.body.innerText.includes('Bringing in photos'), null, { timeout: 30000 });
  await page.waitForTimeout(800);
  await shot('12-waiting-for-words');
  j = journal();
  const fromDrive = j.memories.filter(m => m.source === 'drive-folder');
  check(fromDrive.length === 2 && fromDrive.some(m => m.date === '2026-09-20' && m.photos.length === 2), 'same-day photos grouped into one memory');
  check(photosLive().length === photosBefore + 3, 'three photos copied into the book');
  check(await page.locator("text=/couldn't be opened/").count() === 1, 'unreadable photo skipped with a message');
  check([...files.values()].filter(f => f.parents?.includes(holiday.id) && !f.trashed).length === 4, 'originals left untouched in the folder');
  check(await page.locator('.waiting-card').count() === 2, 'two cards waiting for words');

  // Write words for the 20 Sept memory
  const card = page.locator('.waiting-card').filter({ hasText: 'Sunday, 20 September 2026' });
  await card.locator('textarea').fill('Our first trip to the hills — you wore the bear suit all day.');
  await card.locator('input[aria-label=Title]').fill('Up in the hills');
  await card.locator('text=Save to book').click();
  await page.waitForFunction(() => document.querySelectorAll('.waiting-card').length === 1, null, { timeout: 15000 });
  for (let i = 0; i < 40 && !journal().memories.some(m => m.title === 'Up in the hills'); i++) await page.waitForTimeout(250);
  j = journal();
  check(j.memories.some(m => m.title === 'Up in the hills' && m.photos.length === 2 && m.text.includes('bear suit')), 'words saved onto the imported memory');

  // Leave the other one out of the book
  await page.locator('.waiting-card').first().locator('text=/Skip th(is photo|ese photos)/').click();
  await page.locator('.waiting-card').first().locator('button:has-text("Yes")').click();
  await page.waitForFunction(() => document.querySelectorAll('.waiting-card').length === 0, null, { timeout: 15000 });

  // Picking photos that are already in the book (or the book's own copies) adds nothing
  const before2 = photosLive().length;
  const memoriesBefore2 = journal().memories.length;
  await pickInGoogle(page, 'mum@example.com', [ups[0], ups[1], photosLive()[0]]);
  // The refresh button at the top of the Write page opens the folder used last time.
  await page.click('button:has-text("Check for new photos") >> nth=0');
  await page.waitForSelector('text=/already in the book/', { timeout: 20000 });
  check((await page.evaluate(() => window.__lastPickOptions?.folderId)) === holiday.id, 'refresh: "Check for new photos" opens the folder used last time');
  check(photosLive().length === before2 && journal().memories.length === memoriesBefore2, 'photos already in the book are not copied again');

  // 8c-2. Android "Share → Memory Book": photos shared from the gallery go through the
  // service worker (on the phone) straight into the book — never through our server.
  {
    await page.goto(`${B}/book/write`);
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload();
    await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 15000 });
    const before3 = photosLive().length;
    await page.evaluate(() => {
      const f = Object.assign(document.createElement('form'), { method: 'POST', action: '/share-target', enctype: 'multipart/form-data', id: 'share-form' });
      const i = Object.assign(document.createElement('input'), { type: 'file', name: 'photos', multiple: true, id: 'share-input' });
      f.appendChild(i); document.body.appendChild(f);
    });
    await page.setInputFiles('#share-input', [`${APP}/public/demo/nappies.jpg`, `${APP}/public/demo/family-sofa.jpg`]);
    await page.evaluate(() => document.getElementById('share-form').submit());
    await page.waitForURL('**/book/write**', { timeout: 15000 });
    for (let i = 0; i < 80 && photosLive().length < before3 + 2; i++) await page.waitForTimeout(250);
    check(photosLive().length === before3 + 2, 'share: photos shared from the gallery are added to the book');
    await page.waitForTimeout(500);
    const inboxLeft = await page.evaluate(async () => (await (await caches.open('share-inbox')).keys()).length);
    check(inboxLeft === 0, 'share: nothing left waiting on the phone after import');
    const res = await fetch(`${B}/share-target`, { method: 'POST', body: new FormData(), redirect: 'manual' });
    check(res.status === 303 && (res.headers.get('location') || '').includes('shared=failed'), 'share: without the service worker, the server keeps nothing and asks to try again');
  }

  // 8c-3. Repair a book that was already watching its photos folder (as an older version allowed)
  {
    const photosFolder = parseQuery("appProperties has { key='memoryBook' and value='photos' }")[0];
    const broken = journal();
    const copies = photosLive().slice(0, 2).map(p => p.id);
    broken.watchedFolder = { folderId: photosFolder.id, folderName: 'photos', importedFileIds: [], skippedFileIds: [] };
    broken.memories.push(
      { id: 'drive-dup1', date: '2026-09-01', text: '', tags: [], photos: [{ fileId: copies[0], width: 10, height: 10 }], source: 'drive-folder', createdAt: 'x', updatedAt: 'x' },
      { id: 'drive-dup2', date: '2026-09-02', text: 'I wrote on this one', tags: [], photos: [{ fileId: copies[1], width: 10, height: 10 }], source: 'drive-folder', createdAt: 'x', updatedAt: 'x' },
    );
    writeBook(broken);
    const before = photosLive().length;
    await page.goto(`${B}/book/write`);
    await page.waitForSelector('text=Removed 1 duplicate page', { timeout: 20000 });
    await shot('12b-repaired');
    const fixed = journal();
    check(!fixed.watchedFolder && !fixed.memories.some(m => m.id === 'drive-dup1') && fixed.memories.some(m => m.id === 'drive-dup2'), 'duplicates repaired: empty copies removed, written pages kept');
    check(photosLive().length <= before, 'no new copies made during repair');
  }

  // 8d. Write straight into the journal: a words-only note
  await page.goto(`${B}/book`);
  await page.waitForSelector('.write-fab');
  await page.click('.write-fab');
  await page.click('text=/Write a letter to/');
  await page.waitForSelector('.note-sheet');
  await page.fill('.note-sheet input[aria-label=Date]', '2026-10-01');
  await page.fill('.note-sheet input[aria-label=Title]', 'A quiet evening');
  await page.fill('.note-sheet textarea', 'You fell asleep on my chest while the rain tapped on the window. I did not move for an hour.');
  await shot('13-new-note');
  await page.click('text=Add letter to journal');
  await page.waitForSelector('.note-sheet', { state: 'detached' });
  for (let i = 0; i < 40 && !journal().memories.some(m => m.title === 'A quiet evening'); i++) await page.waitForTimeout(250);
  check(journal().memories.some(m => m.title === 'A quiet evening' && m.photos.length === 0 && m.kind === 'letter'), 'letter written straight into the journal');
  await page.waitForTimeout(1500);
  await shot('14-note-in-book');

  // H-4. Two saves at the same moment: a family member's memory lands between our read and our write
  concurrentSave = { id: 'grandma-same-moment', date: '2026-10-04', text: 'Saved by Grandma at the same moment', tags: [], photos: [], createdAt: '2026-10-04T10:00:00Z', updatedAt: '2026-10-04T10:00:00Z' };
  await page.goto(`${B}/book`);
  await page.waitForSelector('.write-fab');
  await page.click('.write-fab');
  await page.click('text=/Write a letter to/');
  await page.fill('.note-sheet textarea', 'Saved by Mum at the same moment');
  await page.click('text=Add letter to journal');
  await page.waitForSelector('.note-sheet', { state: 'detached' });
  for (let i = 0; i < 40 && !journal().memories.some(m => m.text === 'Saved by Mum at the same moment'); i++) await page.waitForTimeout(250);
  await page.waitForTimeout(500);
  j = journal();
  check(concurrentSave === null && j.memories.some(m => m.id === 'grandma-same-moment') && j.memories.some(m => m.text === 'Saved by Mum at the same moment'), 'H-4: two saves at the same moment both kept');

  // 8d-1. A new page made right in the journal: photos picked on the page, words on its lines
  await page.click('.write-fab');
  await page.click('.write-menu >> text=New page');
  await page.waitForSelector('[aria-label="New page"]');
  await page.locator('.page-photos input[type=file]').setInputFiles([`${APP}/public/demo/tiny-feet.jpg`, `${APP}/public/demo/yawn.jpg`]);
  await page.waitForSelector('.page-photo__img img >> nth=1');
  await page.fill('.note-sheet input[aria-label=Date]', '2026-10-03');
  await page.fill('.note-sheet input[aria-label=Title]', 'Tiny toes');
  await page.fill('.note-sheet textarea', 'Your feet fit in my palm today.');
  await page.click('.note-sheet button.tag-toggle:has-text("First")');
  await page.click('.note-sheet .paper-toggle');
  await page.click('.note-sheet .swatch--paper[title="Kraft"]');
  await shot('14a-new-page');
  await page.click('text=Add page to journal');
  await page.waitForSelector('.note-sheet', { state: 'detached' });
  for (let i = 0; i < 60 && !journal().memories.some(m => m.title === 'Tiny toes' && m.photos.length === 2); i++) await page.waitForTimeout(250);
  const toes = journal().memories.find(m => m.title === 'Tiny toes');
  check(toes?.photos.length === 2 && toes.tags.includes('First') && toes.kind !== 'letter', 'new page with photos made straight in the journal');
  check(toes?.paper?.color === 'kraft' && toes.paper.pattern === 'plain', 'page style: a page can have its own paper');
  await page.waitForTimeout(1500);
  check(await page.locator('.memory-page[style*="--paper: #e7d5b8"]').count() > 0, 'page style: the page shows its own paper in the book');
  // Restyle that page straight from the journal: sky-blue with stars.
  await page.goto(`${B}/book?memory=${encodeURIComponent(toes.id)}`);
  await page.waitForSelector('.write-fab');
  await page.waitForTimeout(1200);
  await page.click('.write-fab');
  await page.click('.write-menu >> text=Page style');
  await page.waitForSelector('[aria-label="Page style"]');
  await page.click('[aria-label="Page style"] .swatch--paper[title="Sky"]');
  await page.click('[aria-label="Page style"] .paper-option:has-text("Stars")');
  await shot('14a3-page-style');
  await page.click('text=Use on this page');
  await page.waitForSelector('[aria-label="Page style"]', { state: 'detached' });
  for (let i = 0; i < 40 && journal().memories.find(m => m.title === 'Tiny toes')?.paper?.pattern !== 'stars'; i++) await page.waitForTimeout(250);
  const restyled = journal().memories.find(m => m.title === 'Tiny toes');
  check(restyled?.paper?.color === 'sky' && restyled.paper.pattern === 'stars' && restyled.text === 'Your feet fit in my palm today.', 'page style: changed from the journal, words and photos untouched');
  check(await page.locator('.memory-page[style*="--paper: #e9f3fc"]').count() > 0, 'page style: the new colour shows in the book');

  // A frame for the same page, from the journal.
  await page.click('.write-fab');
  await page.click('.write-menu >> text=Page style');
  await page.click('[aria-label="Page style"] .swatch[title="Sunny"]');
  await page.click('text=Use on this page');
  await page.waitForSelector('[aria-label="Page style"]', { state: 'detached' });
  for (let i = 0; i < 40 && journal().memories.find(m => m.title === 'Tiny toes')?.paper?.frame !== 'sun'; i++) await page.waitForTimeout(250);
  const framed = journal().memories.find(m => m.title === 'Tiny toes')?.paper;
  check(framed?.frame === 'sun' && framed.color === 'sky' && framed.pattern === 'stars', 'page style: a frame can be added, keeping the colour and pattern');

  // A guided page ("All about me"), straight from the journal.
  await page.click('.write-fab');
  await page.click('.write-menu >> text=Guided page');
  await page.waitForSelector('[aria-label="Add a guided page"]');
  await shot('14a4-guided-choose');
  await page.click('.guided-choice:has-text("All about me")');
  await page.fill('#guided-toy', 'the crinkly giraffe');
  await page.fill('#guided-laugh', 'peekaboo');
  await page.fill('#guided-note', 'You chatter to the ceiling fan every morning.');
  await page.click('text=Add page to journal');
  await page.waitForSelector('[aria-label="All about me"]', { state: 'detached' });
  for (let i = 0; i < 40 && !journal().memories.some(m => m.kind === 'guided'); i++) await page.waitForTimeout(250);
  const about = journal().memories.find(m => m.kind === 'guided');
  check(about?.template === 'about' && about.fields?.toy === 'the crinkly giraffe' && about.fields?.laugh === 'peekaboo' && about.text.startsWith('You chatter'), 'guided page: "All about me" saved with its answers');
  await page.waitForTimeout(1500);
  check(await page.locator('.guided-page .guided-row__answer:has-text("the crinkly giraffe")').count() > 0, 'guided page: answers shown on the page in the book');
  await shot('14a5-guided-in-book');
  // Fill in more later: the pencil opens the same questions.
  await page.click('.write-fab');
  await page.click('.write-menu__item:has-text("Write on this page")');
  await page.waitForSelector('[aria-label="All about me"]');
  check(await page.inputValue('#guided-toy') === 'the crinkly giraffe', 'guided page: opens again with its answers to add more');
  await page.fill('#guided-food', 'mango');
  await page.click('text=Save page');
  await page.waitForSelector('[aria-label="All about me"]', { state: 'detached' });
  for (let i = 0; i < 40 && journal().memories.find(m => m.kind === 'guided')?.fields?.food !== 'mango'; i++) await page.waitForTimeout(250);
  check(journal().memories.find(m => m.kind === 'guided')?.fields?.food === 'mango' && journal().memories.filter(m => m.kind === 'guided').length === 1, 'guided page: edited in place, not duplicated');
  await shot('14a2-new-page-in-book');

  // 8d-2. A time-capsule letter, sealed until her 18th birthday
  await page.click('.write-fab');
  await page.click('text=/Write a letter to/');
  await page.waitForSelector('.note-sheet');
  await page.fill('.note-sheet input[aria-label=Date]', '2026-10-02');
  await page.fill('.note-sheet textarea', 'SECRET-LETTER: one day you will read this.');
  await page.click('text=Seal it as a time capsule');
  await page.click('text=18th birthday');
  await shot('14b-seal');
  await page.click('text=Add letter to journal');
  await page.waitForSelector('.note-sheet', { state: 'detached' });
  for (let i = 0; i < 40 && !journal().memories.some(m => m.text.startsWith('SECRET-LETTER')); i++) await page.waitForTimeout(250);
  const sealedMem = journal().memories.find(m => m.text.startsWith('SECRET-LETTER'));
  check(sealedMem?.sealedUntil?.endsWith('-05-07') && sealedMem.sealedUntil.startsWith('2044'), 'letter sealed until the 18th birthday');
  await page.goto(`${B}/book/export`);
  await page.waitForSelector('.print-page');
  await page.waitForTimeout(1000);
  const exportText = await page.locator('.print-pages').innerText();
  check(await page.locator('.sealed-page').count() === 1 && !exportText.includes('SECRET-LETTER'), 'sealed letter shows as an envelope, words hidden');
  check(await page.locator('.month-page').count() >= 2, 'month divider pages in the book');
  check(await page.locator('.print-pages').locator('text=/add a few lines/i').count() === 0, 'no writing hints in the PDF');
  await page.goto(`${B}/book/timeline`);
  await page.waitForSelector('text=/Sealed until/');
  check(!(await page.locator('main').innerText()).includes('SECRET-LETTER'), 'timeline hides the sealed letter');
  check(await page.locator('a.section-tab[aria-current=page]:has-text("Timeline")').count() === 1, 'timeline tab highlighted');

  // 8d-3. Growth for a month, shown on its divider page
  await page.goto(`${B}/book/write`);
  await page.waitForSelector('text=Growing up');
  await page.selectOption('#growth-heading ~ div select', '4');
  await page.fill('input[placeholder="62 cm"]', '64 cm');
  await page.fill('input[placeholder="6.2 kg"]', '6.8 kg');
  await page.click('section:has(#growth-heading) button:has-text("Save")');
  await page.waitForSelector('text=/Saved — it/');
  check(journal().growth?.['4']?.height === '64 cm' && journal().growth['4'].weight === '6.8 kg', 'growth saved in Drive');

  // 8d-4. Month page edited straight from the journal, then turned off
  await page.goto(`${B}/book`);
  await page.waitForSelector('.stf__block');
  await page.waitForTimeout(1200);
  for (let i = 0; i < 12 && !(await page.locator('button:has-text("month page")').count()); i++) {
    await page.keyboard.press('ArrowRight'); await page.waitForTimeout(1100);
  }
  await page.click('button:has-text("month page")');
  await page.waitForSelector('[aria-label="Edit the month page"]');
  await page.fill('#month-title', 'Sunshine month');
  await page.fill('#month-note', 'You smiled at everyone');
  await shot('21-month-sheet');
  await page.click('text=Save page');
  await page.waitForSelector('[aria-label="Edit the month page"]', { state: 'detached' });
  for (let i = 0; i < 40 && !Object.values(journal().growth || {}).some(g => g.title === 'Sunshine month'); i++) await page.waitForTimeout(250);
  const gm = Object.values(journal().growth || {}).find(g => g.title === 'Sunshine month');
  check(gm?.note === 'You smiled at everyone', 'month page renamed with a note from the journal');
  check(Object.values(journal().growth).some(g => g.height === '64 cm'), 'growth kept when renaming another month');
  await page.waitForTimeout(1200);
  check(await page.locator('.month-page__title:has-text("Sunshine month")').count() > 0, 'new heading shown in the book');
  await shot('22-month-renamed');
  await page.click('button:has-text("month page")');
  await page.click('text=Remove all month pages');
  await page.waitForSelector('[aria-label="Edit the month page"]', { state: 'detached' });
  for (let i = 0; i < 40 && journal().settings.monthPages !== false; i++) await page.waitForTimeout(250);
  await page.goto(`${B}/book/export`);
  await page.waitForSelector('.print-page');
  check(journal().settings.monthPages === false && await page.locator('.month-page').count() === 0, 'month pages turned off for the whole book');
  await page.goto(`${B}/book/settings`);
  await page.waitForSelector('text=Cover style');
  await page.locator('label:has-text("Month pages") input').check();
  await page.click('text=Save settings');
  await page.waitForSelector('text=Saved ✓');
  check(journal().settings.monthPages === true, 'month pages turned back on in Settings');

  // 8e. Cover style + handwriting
  await page.goto(`${B}/book/settings`);
  await page.waitForSelector('text=Cover style');
  await page.click('button[title="Midnight stars"]');
  await page.click('button.font-option:has-text("Kalam")');
  await page.click('.swatch[title="Forest"]');
  await page.click('.paper-picker .swatch--paper[title="Mint"]');
  await page.click('.paper-options .paper-option:has-text("Dot grid")');
  await shot('15-style-settings');
  await page.click('text=Save settings');
  await page.waitForSelector('text=Saved ✓');
  j = journal();
  check(j.settings.coverTheme === 'midnight' && j.settings.handwriting === 'kalam', 'cover style and handwriting saved');
  check(j.settings.coverColor === 'forest' && j.settings.paper?.color === 'mint' && j.settings.paper.pattern === 'dots', 'cover colour and paper (colour and pattern) saved');
  const paperNow = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--paper').trim());
  check(paperNow === '#e9f6ed', 'paper applied to the whole book');
  check(await page.locator('.cover-option .cover[style*="--cloth: #0c5042"]').count() > 0, 'cover previews shown in the chosen colour');
  // Back to the style's own colour, so the cover screenshots below show each style as designed.
  await page.click('.swatch--auto');
  await page.click('text=Save settings');
  for (let i = 0; i < 40 && journal().settings.coverColor; i++) await page.waitForTimeout(250);
  check(journal().settings.coverColor === undefined, 'cover colour can go back to the style’s own');
  const fontNow = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--font-hand'));
  check(fontNow.toLowerCase().includes('kalam'), 'handwriting applied across the app');

  // Visual check of every cover style
  await page.setViewportSize({ width: 1280, height: 900 });
  for (const t of ['Blush linen', 'Sage garden', 'Full photo', 'Cream & gold', 'Classic rose']) {
    await page.goto(`${B}/book/settings`);
    await page.waitForSelector('text=Cover style');
    await page.click(`button[title="${t}"]`);
    await page.click('text=Save settings');
    await page.waitForSelector('text=Saved ✓');
    await page.goto(`${B}/book`);
    await page.waitForTimeout(2500);
    await page.screenshot({ path: `${OUT}/cover-${t.split(' ')[0]}.png`, clip: { x: 300, y: 50, width: 680, height: 800 } });
  }

  // 8e-2. Edit the cover in place: title, wording, what stays in view, label position
  await page.goto(`${B}/book/settings`);
  await page.waitForSelector('text=Cover style');
  await page.click('button[title="Full photo"]');
  await page.click('text=Save settings');
  await page.waitForSelector('text=Saved ✓');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${B}/book`);
  await page.waitForSelector('text=edit the cover');
  await page.click('text=edit the cover');
  await page.waitForSelector('[aria-label="Edit the cover"]');
  await page.fill('#cover-title', "Asha's First Year");
  await page.fill('#cover-subtitle', 'our little sunshine');
  await page.click('button:has-text("At the top")');
  await page.locator('.focus-picker').scrollIntoViewIfNeeded();
  const fp = await page.locator('.focus-picker').boundingBox();
  await page.mouse.click(fp.x + fp.width * 0.3, fp.y + fp.height * 0.7);
  await shot('19-cover-editor');
  await page.click('text=Save cover');
  await page.waitForSelector('[aria-label="Edit the cover"]', { state: 'detached' });
  for (let i = 0; i < 40 && journal().settings.bookTitle !== "Asha's First Year"; i++) await page.waitForTimeout(250);
  j = journal();
  check(j.settings.bookTitle === "Asha's First Year" && j.settings.coverSubtitle === 'our little sunshine' && j.settings.coverLabel === 'top' && Math.abs(j.settings.coverFocus.x - 30) <= 3 && Math.abs(j.settings.coverFocus.y - 70) <= 3, 'cover title, wording, focus and label saved');
  await page.waitForTimeout(1500);
  check((await page.locator('.cover--photo .cover__title').first().innerText()).includes('First Year'), 'new title shown on the cover');
  await shot('20-cover-edited');

  // 8f. Family sharing
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${B}/book/settings`);
  await page.waitForSelector('text=Not shared with anyone yet');
  await page.fill('input[type=email]', 'grandma@example.com');
  await page.click('button:has-text("Invite")');
  await page.waitForSelector('text=Invitation sent to grandma@example.com');
  await page.waitForTimeout(3200); // invitations are spaced out (L-3)
  await page.fill('input[type=email]', 'grandpa@example.com');
  await page.selectOption('select[aria-label="What they can do"]', 'writer');
  await page.click('button:has-text("Invite")');
  await page.waitForSelector('text=Invitation sent to grandpa@example.com');
  await page.waitForSelector('text=can add memories');
  await page.locator('text=Family').first().scrollIntoViewIfNeeded();
  await shot('16-family');
  const bookFolder = parseQuery("appProperties has { key='memoryBook' and value='root' }")[0];
  check(permissionLog.length === 2 && permissionLog.every(p => p.notify === 'true') && permissionLog[0].message.includes('http://localhost:3100'), 'invites shared the book folder and asked Google to email them');
  check((bookFolder.permissions || []).map(p => `${p.emailAddress}:${p.role}`).join(',') === 'grandma@example.com:reader,grandpa@example.com:writer', 'roles stored as Drive sharing, not by the app');

  const familyContext = async (tokenValue, scope) => {
    const c = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const t = await encode({ token: { name: 'Family', email: 'family@example.com', sub: tokenValue, accessToken: tokenValue, accessTokenExpires: Date.now() + 3600e3, refreshToken: 'r', scope }, secret, salt: 'authjs.session-token' });
    await c.addCookies([{ name: 'authjs.session-token', value: t, url: B }]);
    await c.route('https://www.googleapis.com/**', handleDrive);
    await c.addInitScript(PICKER_HOOK);
    return [c, await c.newPage()];
  };
  // If Google shows the shared book only once it's picked: grandma picks it in Google's picker
  let [gc, gp] = await familyContext('grandma-strict-token', 'openid email profile https://www.googleapis.com/auth/drive.file');
  await gp.goto(`${B}/book`);
  await gp.waitForSelector('text=Has someone shared their Memory Book with you?', { timeout: 20000 });
  await gp.screenshot({ path: `${OUT}/17-family-join.png` });
  await pickInGoogle(gp, 'grandma@example.com', [bookFolder]);
  await gp.click('text=Open a book shared with me');
  await gp.waitForSelector('.stf__block', { timeout: 20000 });
  check(true, 'H-1: family open a shared book by picking it — no extra Google permission');
  await gc.close();
  // Grandma (view only), small permission only
  [gc, gp] = await familyContext('grandma-token', 'openid email profile https://www.googleapis.com/auth/drive.file');
  await gp.goto(`${B}/book`);
  await gp.waitForSelector('.stf__block', { timeout: 20000 });
  await gp.waitForTimeout(1500);
  check(await gp.locator('a.section-tab:has-text("Write")').count() === 0 && await gp.locator('.write-fab').count() === 0, 'view-only family see the book without writing tools');
  await gp.screenshot({ path: `${OUT}/18-grandma-book.png` });
  await gp.goto(`${B}/book/settings`);
  await gp.waitForSelector("text=Test Mum");
  check(await gp.locator('text=Invite by email').count() === 0, 'family cannot manage sharing');
  await gc.close();
  // Grandpa (can add memories)
  const [pc, pp] = await familyContext('grandpa-token', 'openid email profile https://www.googleapis.com/auth/drive.file');
  await pp.goto(`${B}/book`);
  await pp.waitForSelector('.write-fab', { timeout: 20000 });
  await pp.click('.write-fab');
  await pp.click('text=/Write a letter to/');
  await pp.fill('.note-sheet textarea', 'Grandpa here — you held my finger the whole afternoon.');
  await pp.click('text=Add letter to journal');
  await pp.waitForSelector('.note-sheet', { state: 'detached' });
  for (let i = 0; i < 40 && !journal().memories.some(m => m.text.startsWith('Grandpa here')); i++) await pp.waitForTimeout(250);
  check(journal().memories.some(m => m.text.startsWith('Grandpa here')), 'family with "can add" wrote into the shared book');
  // Grandpa adds a page with a photo: the photo is his (in his Drive) until Mum's app copies it.
  await pp.click('.write-fab');
  await pp.click('.write-menu >> text=New page');
  await pp.locator('.page-photos input[type=file]').setInputFiles([`${APP}/public/demo/blanket-peek.jpg`]);
  await pp.waitForSelector('.page-photo__img img');
  await pp.fill('.note-sheet textarea', 'Grandpa took this one');
  await pp.click('text=Add page to journal');
  await pp.waitForSelector('.note-sheet', { state: 'detached' });
  for (let i = 0; i < 60 && !journal().memories.some(m => m.text === 'Grandpa took this one' && m.photos.length); i++) await pp.waitForTimeout(250);
  const grandpaPhoto = journal().memories.find(m => m.text === 'Grandpa took this one')?.photos[0];
  check(files.get(grandpaPhoto?.fileId)?.owner === 'grandpa@example.com', 'family photo starts out in their own Drive');
  // H-2: a "can add" member can't share the book onwards
  const bookFolderId = parseQuery("appProperties has { key='memoryBook' and value='root' }")[0].id;
  const reshare = await pp.evaluate(async (id) => (await fetch(`https://www.googleapis.com/drive/v3/files/${id}/permissions`, {
    method: 'POST', headers: { Authorization: 'Bearer grandpa-token', 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'anyone', role: 'reader' }),
  })).status, bookFolderId);
  check(reshare === 403, 'H-2: family who can add memories cannot re-share the book');
  const lockedFiles = [...files.values()].filter(f => !f.trashed && f.owner === 'mum@example.com' && (f.appProperties?.memoryBook));
  check(lockedFiles.length > 3 && lockedFiles.every(f => f.writersCanShare === false), 'H-2: every book file has "editors can share" switched off');
  await pc.close();

  // H-3: security headers on pages, and the page runs without breaking its own policy
  {
    const res = await fetch(`${B}/book`, { headers: { cookie: `authjs.session-token=${token}` }, redirect: 'manual' });
    const h = (k) => res.headers.get(k) || '';
    const csp = h('content-security-policy');
    check(/script-src 'self' 'nonce-[^']+' 'strict-dynamic'/.test(csp) && csp.includes("frame-ancestors 'none'") && csp.includes("object-src 'none'") && !csp.includes("'unsafe-eval'"), 'H-3: strict Content-Security-Policy with a fresh nonce');
    check(h('x-frame-options') === 'DENY' && h('x-content-type-options') === 'nosniff' && h('referrer-policy') && h('permissions-policy').includes('geolocation=()') && h('strict-transport-security'), 'H-3: other security headers present');
    const again = (await fetch(`${B}/book`, { headers: { cookie: `authjs.session-token=${token}` }, redirect: 'manual' })).headers.get('content-security-policy');
    check(again !== csp, 'H-3: nonce changes on every request');
    check(!errors.some(e => /Content Security Policy|Refused to/.test(e)), 'H-3: no part of the app blocked by its own policy');
  }

  // H-1: the app never asks Google for more than drive.file
  {
    const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(`${d}/${e.name}`) : [`${d}/${e.name}`]);
    const src = walk(`${APP}/src`).map(f => fs.readFileSync(f, 'utf8')).join('\n');
    check(!/auth\/drive\.readonly|auth\/drive["'` ]|include_granted_scopes/.test(src), 'H-1: no wider Google Drive permission requested anywhere');
  }

  // A9 / M-7: when Mum opens the book, family photos are copied into her Drive and the book uses the copies
  {
    await page.goto(`${B}/book`);
    await page.waitForSelector('.stf__block');
    let adopted;
    for (let i = 0; i < 60; i++) {
      adopted = journal().memories.find(m => m.text === 'Grandpa took this one')?.photos[0];
      if (files.get(adopted?.fileId)?.owner === 'mum@example.com') break;
      await page.waitForTimeout(250);
    }
    check(files.get(adopted.fileId)?.owner === 'mum@example.com' && files.get(adopted.thumbId)?.owner === 'mum@example.com', 'A9: photos added by family are copied into the owner’s Drive');
    const original = [...files.values()].find(f => f.owner === 'grandpa@example.com' && f.appProperties?.memoryBook === 'photo');
    const photosFolderId = parseQuery("appProperties has { key='memoryBook' and value='photos' }")[0].id;
    check(original && !original.parents.includes(photosFolderId) && !original.trashed, 'A9: the original is taken out of the book folder, not deleted');
    await page.reload();
    await page.waitForTimeout(2500);
    check([...files.values()].filter(f => f.owner === 'mum@example.com' && f.appProperties?.memoryBook === 'photo' && f.name === files.get(adopted.fileId).name).length === 1, 'A9: copied only once');
  }

  // A8: Google Drive storage — a meter in Settings, and a full Drive never loses a memory
  {
    quota.usage = 0.95 * quota.limit;
    await page.goto(`${B}/book/settings`);
    await page.waitForSelector('text=/nearly full/');
    check(await page.locator('[role=meter]').count() === 1, 'A8: storage meter warns when Drive is over 90% full');
    driveFull = true;
    await page.goto(`${B}/book`);
    await page.waitForSelector('.write-fab');
    await page.click('.write-fab');
    await page.click('text=/Write a letter to/');
    await page.fill('.note-sheet textarea', 'Written while Drive was full');
    await page.click('text=Add letter to journal');
    await page.waitForSelector('text=/Google Drive is full/', { timeout: 20000 });
    check(!journal().memories.some(m => m.text === 'Written while Drive was full'), 'A8: Drive full — friendly message, nothing half-saved');
    driveFull = false;
    quota.usage = 2 * 1024 ** 3;
    await page.click('button:has-text("Upload now")');
    for (let i = 0; i < 60 && !journal().memories.some(m => m.text === 'Written while Drive was full'); i++) await page.waitForTimeout(250);
    check(journal().memories.some(m => m.text === 'Written while Drive was full'), 'A8: the memory kept on the device uploads once there is space');
  }

  // A1: an older single-file book is converted once, safely (backup first, nothing lost)
  {
    const owner = 'nani@example.com';
    const folder = (name, parent, key) => { const f = { id: `f${nextId++}`, name, parents: [parent], owner, appCreated: true, mimeType: 'application/vnd.google-apps.folder', appProperties: { memoryBook: key }, content: Buffer.alloc(0) }; files.set(f.id, f); return f; };
    const root = folder('Memory Book – Old', 'root', 'root');
    folder('photos', root.id, 'photos');
    const mem = (id, date, text) => ({ id, date, text, tags: [], photos: [], createdAt: `${date}T09:00:00Z`, updatedAt: `${date}T09:00:00Z` });
    const legacyBook = { version: 1, settings: { childName: 'Old', dateOfBirth: '2025-01-01', bookTitle: 'Old book' }, memories: [mem('a', '2025-03-01', 'one'), mem('b', '2026-02-01', 'two'), { broken: true, text: 'no id or date' }] };
    const lj = { id: `f${nextId++}`, name: 'journal.json', parents: [root.id], owner, appCreated: true, appProperties: { memoryBook: 'journal' }, content: Buffer.from(JSON.stringify(legacyBook)) };
    files.set(lj.id, lj);
    const original = lj.content.toString();
    const [nc, np] = await familyContext('nani-token', 'openid email profile https://www.googleapis.com/auth/drive.file');
    await np.goto(`${B}/book`);
    await np.waitForSelector('.stf__block', { timeout: 20000 });
    let bf = bookFiles(owner);
    const backups = [...files.values()].filter(f => live(f) && f.appProperties?.memoryBook === 'backup' && files.get(f.parents[0])?.parents?.includes(root.id));
    check(backups.length === 1 && backups[0].content.toString() === original, 'A1: old journal.json backed up into backups/ before converting');
    check(!!bf.index && bf.years.map(y => y.appProperties.memoryBookYear).sort().join() === '2025,2026,undated', 'A1: book split into book.json + one file per year');
    check(journal(owner).memories.map(m => m.id).sort().join() === 'a,b' && lj.content.toString() === original, 'A1: every memory kept; the old file left exactly as it was');
    check(readFile(bf.years.find(y => y.appProperties.memoryBookYear === 'undated')).unreadable?.length === 1, 'M-1: a damaged entry is kept untouched, not dropped');
    // An app tab left open from before the update still writes to journal.json: its new memory is merged in.
    lj.content = Buffer.from(JSON.stringify({ ...legacyBook, memories: [...legacyBook.memories, mem('c', '2026-03-01', 'written in an old tab')] }));
    await np.reload();
    await np.waitForSelector('.stf__block', { timeout: 20000 });
    for (let i = 0; i < 40 && !journal(owner).memories.some(m => m.id === 'c'); i++) await np.waitForTimeout(250);
    check(journal(owner).memories.some(m => m.id === 'c'), 'A1: memories written to the old file later are merged in');
    await np.reload();
    await np.waitForTimeout(2500);
    bf = bookFiles(owner);
    check([...files.values()].filter(f => live(f) && f.appProperties?.memoryBook === 'backup').length === 1 && bf.years.length === 3, 'A1: converted only once');
    await nc.close();
  }

  // A3/A4: weekly backups, and recovering from damaged or deleted files — nothing lost
  {
    const snapshots = () => [...files.values()].filter(f => live(f) && f.owner === 'mum@example.com' && f.appProperties?.memoryBook === 'snapshot');
    check(snapshots().length === 1, 'A3: a backup of the book is kept in backups/');
    await page.goto(`${B}/book`);
    await page.waitForSelector('.stf__block');
    await page.waitForTimeout(1500);
    check(snapshots().length === 1, 'A3: only one backup per week');
    const before = journal().memories.map(m => m.id).sort().join();

    // A year's file is damaged (e.g. edited by hand): the last good version is put back, the damaged copy kept.
    const year = bookFiles().years.find(y => y.appProperties.memoryBookYear === '2026');
    year.content = Buffer.from('{ "memories": [ broken');
    await page.goto(`${B}/book`);
    await page.waitForSelector('text=/was damaged/', { timeout: 20000 });
    check(journal().memories.map(m => m.id).sort().join() === before, 'A4: damaged file repaired from its last good version — no memory lost');
    check([...files.values()].some(f => live(f) && f.appProperties?.memoryBook === 'damaged' && f.content.toString().includes('broken')), 'A4: the damaged copy is kept in backups/');

    // book.json deleted by mistake (in the bin): put back.
    bookFiles().index.trashed = true;
    await page.goto(`${B}/book`);
    await page.waitForSelector('text=/moved to the Drive bin/', { timeout: 20000 });
    check(!!bookFiles().index && journal().memories.map(m => m.id).sort().join() === before, 'M-3: a deleted book.json is taken back out of the bin');

    // book.json gone for good: rebuilt from the backup, memories all still there; no second book made.
    const settingsBefore = journal().settings;
    files.delete(bookFiles().index.id);
    await page.goto(`${B}/book`);
    await page.waitForSelector('text=/rebuilt from the backup/', { timeout: 20000 });
    const roots = [...files.values()].filter(f => live(f) && f.owner === 'mum@example.com' && f.appProperties?.memoryBook === 'root');
    check(roots.length === 1 && journal().settings.childName === 'Asha Rose' && journal().memories.map(m => m.id).sort().join() === before, 'M-3: a lost book.json is rebuilt from the backup, nothing lost');
    check(!!journal().settings.coverPhoto && journal().settings.bookTitle === settingsBefore.bookTitle && journal().settings.coverTheme === settingsBefore.coverTheme, 'M-3: the rebuilt book keeps its latest details (cover, title, style)');

    // A memory deleted by someone: brought back from the backup in Settings.
    snapshots().forEach(f => { f.createdTime = new Date(Date.now() - 8 * 86400e3).toISOString(); });
    await page.goto(`${B}/book`);
    for (let i = 0; i < 40 && snapshots().length < 2; i++) await page.waitForTimeout(250);
    check(snapshots().length === 2, 'A3: a new backup is made after a week');
    const book = journal();
    const gone = book.memories.find(m => m.title === 'Up in the hills');
    writeBook({ ...book, memories: book.memories.filter(m => m !== gone) });
    await page.goto(`${B}/book/settings`);
    await page.click('button:has-text("Bring back missing memories") >> nth=0');
    await page.waitForSelector('text=/Brought back 1 memory/', { timeout: 20000 });
    check(journal().memories.some(m => m.id === gone.id), 'A4: a deleted memory is brought back from a backup');
  }

  // B13/B14: health check for uptime monitoring; error reports keep nothing personal
  {
    const health = await fetch(`${B}/api/health`);
    const body = await health.json();
    check(health.ok && body.ok === true && health.headers.get('cache-control')?.includes('no-store') && !JSON.stringify(body).includes('@'), 'B14: /api/health answers, with nothing private');
    const log = `${APP}/tests/output/server.log`;
    const marker = `probe-${Date.now()}`;
    const res = await fetch(`${B}/api/client-error`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-for': marker }, body: JSON.stringify({
      kind: 'TypeError', message: `Couldn't save "Asha's first giggle" for mum@example.com file 1AbCdEfGhIjKlMnOpQrStUvWx ${marker}`,
      path: `${B}/book/edit/drive-1AbCdEfGhIjKlMnOpQrStUvWx?memory=secret`, frames: 'at x (http://localhost:3100/_next/static/chunks/app.js:1:234)\nat y (chrome-extension://abc/evil.js:1:1)',
    }) });
    check(res.status === 204, 'B13: browser error report accepted');
    let burst = 0;
    for (let i = 0; i < 25; i++) burst += (await fetch(`${B}/api/client-error`, { method: 'POST', headers: { 'x-forwarded-for': 'flood' }, body: '{}' })).status === 429 ? 1 : 0;
    check(burst > 0, 'B13: error reports are rate limited');
    if (fs.existsSync(log)) {
      const line = fs.readFileSync(log, 'utf8').split('\n').find(l => l.includes('client-error') && l.includes('[email]'));
      check(!!line && !/Asha|mum@example|1AbCdEfGhIj|secret|evil/.test(line) && line.includes('/book/edit/[id]'), 'B13: error report scrubbed of names, emails, IDs and links');
    }
  }

  // H-2: a public link added outside the app is switched off when the owner opens the book
  const leaked = photosLive()[0];
  leaked.permissions = [...(leaked.permissions || []), { id: 'p-public', type: 'anyone', role: 'reader' }];
  await page.goto(`${B}/book`);
  await page.waitForSelector('text=/public link/', { timeout: 20000 });
  check(!(leaked.permissions || []).some(p => p.type === 'anyone'), 'H-2: public link removed and the owner told');

  // G36: opening the book again downloads only files that changed
  {
    await page.goto(`${B}/book`);
    await page.waitForSelector('.stf__block');
    await page.waitForTimeout(2000);
    const before = calls.length;
    await page.reload();
    await page.waitForSelector('.stf__block');
    await page.waitForTimeout(2500);
    const revisionDownloads = calls.slice(before).filter(c => c.startsWith('GET') && /\/revisions\/r\d+$/.test(c));
    check(revisionDownloads.length === 0, `G36: unchanged book files aren't downloaded again (${revisionDownloads.length})`);
  }

  // D25 / C15 / C16: legal pages, landing page and the explanation before Google sign-in
  {
    for (const path of ['/privacy', '/terms', '/refunds', '/contact']) {
      const html = await (await fetch(`${B}${path}`)).text();
      check(html.includes('sacheen501@gmail.com'), `D25: ${path} page is there, with the grievance contact`);
    }
    const anon = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const ap = await anon.newPage();
    await ap.goto(`${B}/`);
    await ap.waitForSelector('text=/Your memories stay yours/');
    check(await ap.locator('text=/in your own Google Drive/').count() > 0 && await ap.locator('text=/Free/').count() > 0 && await ap.locator('text=/Premium/').count() > 0, 'C15: landing page explains the product, privacy promise and pricing');
    await ap.click('text=/Start your book/');
    await ap.waitForSelector('text=Continue to Google');
    check(await ap.locator("text=/can.t see anything else in your Drive/").count() === 1, 'C16: before Google sign-in, the app explains the Drive permission');
    await ap.screenshot({ path: `${OUT}/23-signin-explainer.png` });
    await anon.close();
  }

  // Signed in, but the Google Drive box was left unticked: the app asks for that permission again.
  {
    const noDrive = await encode({
      token: { name: 'Test Dad', email: 'dad-nodrive@example.com', sub: '9', accessToken: 'fake-access-token', accessTokenExpires: Date.now() + 3600e3, refreshToken: 'r', scope: 'openid email profile' },
      secret, salt: 'authjs.session-token',
    });
    const c = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await c.addCookies([{ name: 'authjs.session-token', value: noDrive, url: B }]);
    await c.route('https://www.googleapis.com/**', handleDrive);
    const p = await c.newPage();
    await p.goto(`${B}/book`);
    await p.waitForSelector('text=One more permission, please', { timeout: 20000 });
    check(await p.locator('button:has-text("Give permission")').count() === 1 && await p.locator('text=/specific Google Drive files/').count() === 1,
      'no Drive permission: explains it and offers to ask Google again');
    await p.screenshot({ path: `${OUT}/23b-needs-permission.png` });
    await p.click('button:has-text("Give permission")');
    await p.waitForURL((u) => !u.pathname.startsWith('/book'), { timeout: 15000 }).catch(() => undefined);
    check(!new URL(p.url()).pathname.startsWith('/book'), 'no Drive permission: "Give permission" goes back to Google sign-in');
    await c.close();
  }

  // D22: download everything
  {
    await page.goto(`${B}/book/settings`);
    const [download] = await Promise.all([page.waitForEvent('download'), page.click('text=Download everything')]);
    const data = JSON.parse(fs.readFileSync(await download.path(), 'utf8'));
    check(data.settings?.childName === 'Asha Rose' && data.memories?.length === journal().memories.length, 'D22: “Download everything” gives all memories and details as a file');
  }

  // L-3: invitations are gently limited
  {
    await page.fill('input[type=email]', 'auntie@example.com');
    await page.click('button:has-text("Invite")');
    await page.waitForSelector('text=Invitation sent to auntie@example.com');
    await page.fill('input[type=email]', 'uncle@example.com');
    await page.click('button:has-text("Invite")');
    await page.waitForSelector('text=Just a moment before the next invitation');
    check(true, 'L-3: invitations can’t be sent in quick bursts');
  }

  // C19: a second child gets their own book, switched from the top bar
  {
    await page.goto(`${B}/book/setup?another=1`);
    await page.waitForSelector('text=A book for another child');
    await page.fill('#child-name', 'Kabir');
    await page.fill('#dob', '2026-08-01');
    await page.check('input[name=consent]');
    await page.click('button[type=submit]');
    await page.waitForSelector('text=Choose a style');
    await page.click('button[type=submit]');
    await page.waitForURL(`${B}/book/write**`);
    await page.waitForSelector('text=/Kabir.s book is ready/');
    const roots = [...files.values()].filter(f => live(f) && f.owner === 'mum@example.com' && f.appProperties?.memoryBook === 'root').map(f => f.name);
    check(roots.length === 2 && roots.includes('Memory Book – Kabir'), 'C19: a separate book for the second child');
    await page.click('.book-switcher');
    await shot('24-book-switcher');
    await page.click('.write-menu__item:has-text("Asha Rose")');
    await page.waitForSelector('text=Write a new memory');
    await page.goto(`${B}/book/settings`);
    check((await page.inputValue('#child-name')) === 'Asha Rose', 'C19: switching back opens the first child’s book');
  }

  // 9. Desktop book view with cover
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${B}/book`);
  await page.waitForTimeout(2500);
  await shot('09-desktop-cover');
  await page.keyboard.press('ArrowRight'); await page.waitForTimeout(1300);
  await page.keyboard.press('ArrowRight'); await page.waitForTimeout(1300);
  await shot('10-desktop-memory');
  await page.click('.write-fab');
  await page.waitForSelector('.write-menu');
  await shot('10b-desktop-write-menu');

  // F34: every screen fits phones 360–430px wide — nothing sticks out sideways
  {
    const wide = [];
    for (const width of [360, 390, 430]) {
      await page.setViewportSize({ width, height: 800 });
      for (const path of ['/', '/book', '/book/write', '/book/timeline', '/book/settings', '/book/export', '/privacy', '/demo']) {
        await page.goto(`${B}${path}`);
        await page.waitForTimeout(path === '/book' || path === '/demo' ? 1800 : 900);
        const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        if (over > 1) wide.push(`${path} at ${width}px (+${over}px)`);
      }
    }
    check(wide.length === 0, `F34: phone layouts fit 360–430px${wide.length ? ' — too wide: ' + wide.join(', ') : ''}`);
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto(`${B}/book/write`);
    await page.waitForTimeout(800);
    await shot('25-phone-360-write');
  }

  // D23: delete my account — our record removed, Google access cancelled, book moved to the Drive bin (chosen)
  {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${B}/book/settings`);
    await page.click('text=Delete my account');
    await page.check('text=Also move my book');
    await page.fill('input[aria-label="Type DELETE to confirm"]', 'DELETE');
    await page.click('button.danger-button:has-text("Delete my account")');
    await page.waitForURL(`${B}/?deleted=1`, { timeout: 20000 });
    await page.waitForSelector('text=Your account has been deleted');
    const asha = [...files.values()].find(f => f.owner === 'mum@example.com' && f.name === 'Memory Book – Asha Rose');
    check(asha?.trashed === true, 'D23: the book was moved to the Drive bin (recoverable for 30 days), as chosen');
    const leftovers = await page.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('memory-book:')).length);
    check(leftovers === 0, 'D23: this device forgot the book');
    if (storeOn) check(kv.size === 0, 'D23: our account record was deleted');
  }
} catch (e) {
  console.log('FAIL exception:', e.message);
  await shot('zz-failure');
  process.exitCode = 1;
} finally {
  console.log('Drive calls:', calls.length);
  console.log(errors.length ? 'Browser errors:\n' + errors.join('\n') : 'No browser errors');
  await browser.close();
  kvServer.close();
}

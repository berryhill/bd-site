/* eslint-disable no-console */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';

// Run against the production adapter, not Astro dev (which masks /404 failures).
const root = await fs.mkdtemp(path.join(os.tmpdir(), 'bd-indexing-'));
const store = path.join(root, 'posts');
await fs.mkdir(store);
const source = (title, date, draft = false) => `---\ntitle: ${title}\ndescription: Fixture description\npubDatetime: ${date}\ndraft: ${draft}\ntags: [audit]\n---\nStandalone article fixture body.\n`;
await fs.writeFile(path.join(store, 'valid.md'), source('Valid fixture', '2020-01-01'));
await fs.writeFile(path.join(store, 'future.md'), source('Future fixture', '2099-01-01'));
const socket = net.createServer();
await new Promise(resolve => socket.listen(0, '127.0.0.1', resolve));
const port = socket.address().port;
await new Promise(resolve => socket.close(resolve));
const origin = `http://127.0.0.1:${port}`;
const key = randomUUID();
const env = { ...process.env, HOST: '127.0.0.1', PORT: String(port), ENV: 'workstation', CONTENT_STORAGE_MODE: 'filesystem', CONTENT_STORAGE_FILESYSTEM_PATH: store, X_API_KEY: key };
for (const name of Object.keys(env)) if (name.startsWith('GOOGLE_')) delete env[name];
const child = spawn(process.execPath, ['dist/server/entry.mjs'], { env, stdio: ['ignore', 'pipe', 'pipe'] });
let output = '';
child.stdout.on('data', chunk => output += chunk);
child.stderr.on('data', chunk => output += chunk);
const failures = [];
let checks = 0;
const check = async (name, fn) => { checks++; try { await fn(); } catch (error) { failures.push(`${name}: ${error.message}`); } };
const get = pathname => fetch(origin + pathname, { redirect: 'manual' });
try {
  for (let i = 0; i < 200; i++) {
    if (child.exitCode !== null) throw new Error(`Standalone exited: ${output}`);
    try { await get('/livez'); break; } catch { await new Promise(resolve => setTimeout(resolve, 100)); }
  }
  for (const pathname of ['/404/', '/posts/missing/', '/posts/future/', '/tags/unknown/', ...['nonsense','999999','0','-1','1x','01','1/2','9007199254740993'].map(p => `/tags/audit/${p}/`)]) {
    for (const userAgent of ['Mozilla/5.0', 'Googlebot']) {
      await check(`${userAgent} ${pathname}`, async () => {
        const response = await fetch(origin + pathname, { redirect: 'manual', headers: { 'user-agent': userAgent } });
        assert.equal(response.status, 404);
        assert.equal(response.headers.get('location'), null);
        const html = await response.text();
        assert.match(html, /Page Not Found/);
        assert.match(html, /name="robots"[^>]*content="noindex/);
        assert.doesNotMatch(html, /Standalone article fixture body/);
      });
    }
  }
  await check('first page alias', async () => {
    const r = await get('/tags/audit/1/'); assert.equal(r.status, 301); assert.equal(r.headers.get('location'), '/tags/audit/');
  });
  for (const p of ['/posts/valid/', '/tags/audit/', '/sitemap-posts.xml']) await check(p, async () => assert.equal((await get(p)).status, 200));
  await check('future excluded from sitemap', async () => assert.doesNotMatch(await (await get('/sitemap-posts.xml')).text(), /\/posts\/future\//));
  const malformed = source('Bad draft', 'NOT_A_DATE', true);
  await fs.writeFile(path.join(store, 'malformed.md'), malformed);
  for (const p of ['/posts/valid/', '/sitemap-posts.xml', '/rss.xml', '/readyz']) await check(`malformed isolation ${p}`, async () => assert.equal((await get(p)).status, 200));
  await check('malformed route', async () => assert.equal((await get('/posts/malformed/')).status, 404));
  await check('malformed preserved', async () => assert.equal(await fs.readFile(path.join(store, 'malformed.md'), 'utf8'), malformed));
  const request = (method, body) => fetch(origin + '/api/posts', { method, headers: { 'content-type': 'application/json', 'x-api-key': key }, body: JSON.stringify(body) });
  for (const change of [{ pubDatetime: 'NOT_A_DATE' }, { draft: 'false' }, { tags: [7] }, { title: 7 }, { modDatetime: false }]) {
    await check(`invalid POST ${JSON.stringify(change)}`, async () => {
      const r = await request('POST', { title: 'Invalid input fixture', description: 'Fixture', content: 'Body', draft: true, operationId: randomUUID(), ...change });
      assert.equal(r.status, 400); assert.equal(await fs.access(path.join(store, 'invalid-input-fixture.md')).then(() => true, () => false), false);
    });
  }
  await check('invalid PATCH preserves bytes', async () => {
    const before = await fs.readFile(path.join(store, 'valid.md'), 'utf8');
    const r = await request('PATCH', { slug: 'valid', pubDatetime: 'NOT_A_DATE', expectedRevision: 'fixture', operationId: randomUUID() });
    assert.equal(r.status, 400); assert.equal(await fs.readFile(path.join(store, 'valid.md'), 'utf8'), before);
  });
  await fs.rename(store, path.join(root, 'offline'));
  for (const p of ['/posts/valid/', '/sitemap-posts.xml', '/readyz']) await check(`storage outage ${p}`, async () => assert.equal((await get(p)).status, 503));
  console.log(JSON.stringify({ checks, failures }, null, 2));
  assert.equal(failures.length, 0, failures.join('\n'));
} finally {
  child.kill('SIGTERM');
  await new Promise(resolve => child.once('close', resolve));
  await fs.rm(root, { recursive: true, force: true });
}

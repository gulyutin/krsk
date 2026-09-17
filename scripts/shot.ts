// Screenshots of a landmark or of the whole world, for comparing with references.
//   npm run shot -- chapel   → shots/chapel-{front,side,back,top,iso,sheet}.png
//   npm run shot -- world    → shots/world-{overview,top,<landmark ids>}.png
// Runs its own Vite server and a headless browser (Playwright's Chromium, or installed Chrome).

import { mkdir } from 'node:fs/promises';
import { chromium, type Browser } from 'playwright';
import { createServer } from 'vite';
import placements from '../src/world/landmarks.json' with { type: 'json' };

const target = process.argv[2];
if (!target) {
  console.error('Usage: npm run shot -- <landmark id | world>');
  process.exit(1);
}

const views =
  target === 'world'
    ? ['overview', 'top', ...placements.map((p) => p.id)]
    : ['front', 'side', 'back', 'top', 'iso', 'sheet'];

const server = await createServer({
  logLevel: 'error',
  server: { port: 5190, strictPort: false, host: '127.0.0.1' },
});
await server.listen();
const base = server.resolvedUrls?.local[0] ?? 'http://127.0.0.1:5190/';

async function launch(): Promise<Browser> {
  const args = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
  try {
    return await chromium.launch({ args });
  } catch {
    return await chromium.launch({ channel: 'chrome', args });
  }
}

const browser = await launch();
try {
  await mkdir('shots', { recursive: true });
  for (const view of views) {
    const size = view === 'sheet' ? 1400 : 900;
    const page = await browser.newPage({ viewport: { width: size, height: size } });
    page.on('console', (m) => {
      if (m.type() === 'error') console.error(`[${view}] console: ${m.text()}`);
    });
    // Fail fast on a page error instead of waiting for the timeout
    const crashed = new Promise<never>((_, reject) =>
      page.on('pageerror', (e) => reject(new Error(`[${view}] page error: ${e.message}`))),
    );
    await page.goto(`${base}viewer.html?id=${encodeURIComponent(target)}&view=${view}`);
    await Promise.race([
      crashed,
      page.waitForFunction(() => (window as unknown as { viewerReady?: boolean }).viewerReady === true, null, {
        timeout: 30_000,
      }),
    ]);
    const file = `shots/${target}-${view}.png`;
    await page.screenshot({ path: file });
    console.log(file);
    await page.close();
  }
} finally {
  await browser.close();
  await server.close();
}
process.exit(0);

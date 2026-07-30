import { createServer } from 'node:http';
import type { Server } from 'node:http';
import { existsSync } from 'node:fs';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chromium } from 'playwright';
import { capturePublicPage, captureWithNavigationResolver } from '../src/evaluation/capture-runner';
import { evaluateCandidateCapture } from '../src/evaluation/evaluate';
import { parseHttpUrl } from '../src/evaluation/public-url';
import { captureLocalTestPage } from '../src/evaluation/test-capture-harness';

const hasChromium = existsSync(chromium.executablePath());
const browserDescribe = hasChromium ? describe : describe.skip;
let server: Server;
let baseUrl = '';

beforeAll(async () => {
  server = createServer((request, response) => {
    if (request.url === '/redirect') {
      response.writeHead(302, { location: '/article' });
      response.end();
      return;
    }
    if (request.url === '/blocked') {
      response.writeHead(200, { 'content-type': 'text/html' });
      response.end('<main><h1>Blocked destination</h1></main>');
      return;
    }
    response.writeHead(200, { 'content-type': 'text/html' });
    response.end(`<!doctype html><html lang="en"><head><title>Capture fixture</title></head><body><nav>Navigation</nav><main><h1>Rendered fixture</h1><p>Rendered source content.</p><script>document.body.dataset.rendered = 'true'</script></main></body></html>`);
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${address.port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

describe('public candidate capture safety', () => {
  it('rejects a loopback URL before launching Chromium', async () => {
    await expect(capturePublicPage('http://127.0.0.1:3000/')).rejects.toThrow('must not target a loopback');
  });
});

browserDescribe('rendered capture runner', () => {
  it('captures a project-owned rendered page through the test-only harness', async () => {
    const capture = await captureLocalTestPage(`${baseUrl}/article`);
    const report = await evaluateCandidateCapture(capture);

    expect(capture.captured.completeHtml).toContain('Rendered source content.');
    expect(capture.sourceHtml).toContain('data-rendered="true"');
    expect(capture.screenshot.byteLength).toBeGreaterThan(0);
    expect(report.provenance.finalUrl).toBe(`${baseUrl}/article`);
    expect(report.results.complete.markdown).toContain('# Rendered fixture');
    expect(report.results.focused.markdown).toContain('Rendered source content.');
  });

  it('follows a safe redirect in the test harness', async () => {
    const capture = await captureLocalTestPage(`${baseUrl}/redirect`);
    expect(capture.provenance.finalUrl).toBe(`${baseUrl}/article`);
  });

  it('aborts a redirect rejected by the navigation resolver', async () => {
    await expect(captureWithNavigationResolver(
      `${baseUrl}/redirect`,
      async (value) => {
        const url = parseHttpUrl(value);
        if (url.pathname === '/article') throw new Error('Rejected redirect target.');
        return url;
      },
      { viewport: { width: 1280, height: 800 }, readyState: 'load', screenshotMode: 'viewport', stabilityMs: 0, navigationTimeoutMs: 5_000, maxRedirects: 3, maxResponseBytes: 1_000_000 },
    )).rejects.toThrow('Rejected redirect target.');
  });
});

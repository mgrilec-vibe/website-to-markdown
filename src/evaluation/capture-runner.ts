import { createHash } from 'node:crypto';
import { lookup } from 'node:dns/promises';
import { chromium } from 'playwright';
import type { Response } from 'playwright';
import { captureActiveDocument } from '../capture';
import { jsdomHtmlParser } from '../conversion/jsdom-parser';
import type { CapturedPage } from '../export-domain';
import type { CaptureProfile, CaptureProvenance } from './domain';
import { validatePublicUrl, validateResolvedAddresses } from './public-url';

export const DEFAULT_CAPTURE_PROFILE: CaptureProfile = {
  viewport: { width: 1440, height: 1000 },
  readyState: 'load',
  stabilityMs: 250,
  navigationTimeoutMs: 20_000,
  maxRedirects: 5,
  maxResponseBytes: 5_000_000,
};

export interface CandidateCapture {
  readonly captured: CapturedPage;
  readonly provenance: CaptureProvenance;
  readonly sourceHtml: string;
  readonly screenshot: Uint8Array;
}

export interface CandidateCaptureOptions {
  readonly profile?: CaptureProfile;
  readonly resolveHostname?: (hostname: string) => Promise<readonly string[]>;
}

export type NavigationResolver = (value: string) => Promise<URL>;

async function resolvePublicNavigation(value: string, options: CandidateCaptureOptions): Promise<URL> {
  const url = validatePublicUrl(value);
  const resolveHostname = options.resolveHostname ?? (async (hostname: string) => {
    const records = await lookup(hostname, { all: true, verbatim: true });
    return records.map((record) => record.address);
  });
  validateResolvedAddresses(url.hostname, await resolveHostname(url.hostname));
  return url;
}

function redirectCount(response: Response | null): number {
  let count = 0;
  for (let request = response?.request().redirectedFrom(); request; request = request.redirectedFrom()) count += 1;
  return count;
}

function contentLength(response: Response): number | undefined {
  const header = response.headers()['content-length'];
  if (!header) return undefined;
  const bytes = Number(header);
  return Number.isSafeInteger(bytes) && bytes >= 0 ? bytes : undefined;
}

function sha256(value: Uint8Array | string): string {
  return createHash('sha256').update(value).digest('hex');
}

/** Low-level runner used by the isolated non-production capture harness. */
export async function captureWithNavigationResolver(
  value: string,
  navigationResolver: NavigationResolver,
  profile: CaptureProfile = DEFAULT_CAPTURE_PROFILE,
): Promise<CandidateCapture> {
  const initialUrl = await navigationResolver(value);

  let browser;
  try {
    browser = await chromium.launch();
  } catch (error) {
    const detail = error instanceof Error ? ` ${error.message}` : '';
    throw new Error(`Chromium is unavailable. Run \`npm run browser:install\` before public-page capture.${detail}`);
  }

  try {
    const context = await browser.newContext({ viewport: profile.viewport });
    const page = await context.newPage();
    let blockedNavigation: string | undefined;

    await page.route('**/*', async (route) => {
      const request = route.request();
      if (!request.isNavigationRequest() || request.frame() !== page.mainFrame()) {
        await route.continue();
        return;
      }
      try {
        await navigationResolver(request.url());
        await route.continue();
      } catch (error) {
        blockedNavigation = error instanceof Error ? error.message : 'Navigation target was rejected.';
        await route.abort('blockedbyclient');
      }
    });

    const response = await page.goto(initialUrl.href, {
      waitUntil: profile.readyState,
      timeout: profile.navigationTimeoutMs,
    });
    if (blockedNavigation) throw new Error(blockedNavigation);
    if (!response) throw new Error('Candidate navigation did not return a document response.');
    if (redirectCount(response) > profile.maxRedirects) {
      throw new Error(`Candidate navigation exceeded the ${profile.maxRedirects} redirect limit.`);
    }
    const declaredLength = contentLength(response);
    if (declaredLength !== undefined && declaredLength > profile.maxResponseBytes) {
      throw new Error(`Candidate document exceeds the ${profile.maxResponseBytes}-byte response limit.`);
    }

    const finalUrl = await navigationResolver(page.url());
    if (profile.readySelector) await page.waitForSelector(profile.readySelector, { timeout: profile.navigationTimeoutMs });
    if (profile.stabilityMs > 0) await page.waitForTimeout(profile.stabilityMs);

    const sourceHtml = await page.content();
    const sourceBytes = new TextEncoder().encode(sourceHtml);
    if (sourceBytes.byteLength > profile.maxResponseBytes) {
      throw new Error(`Captured document exceeds the ${profile.maxResponseBytes}-byte response limit.`);
    }
    const screenshot = await page.screenshot({ fullPage: profile.screenshotMode !== 'viewport', type: 'png' });
    const renderedDocument = jsdomHtmlParser.parseHtml(sourceHtml, finalUrl.href);
    const captured = captureActiveDocument(renderedDocument);

    return {
      captured,
      sourceHtml,
      screenshot,
      provenance: {
        originUrl: initialUrl.href,
        finalUrl: finalUrl.href,
        capturedAt: captured.metadata.capturedAt,
        documentSha256: sha256(sourceBytes),
        screenshotSha256: sha256(screenshot),
        profile,
      },
    };
  } finally {
    await browser.close();
  }
}

export async function capturePublicPage(
  value: string,
  options: CandidateCaptureOptions = {},
): Promise<CandidateCapture> {
  return captureWithNavigationResolver(
    value,
    async (navigationUrl) => resolvePublicNavigation(navigationUrl, options),
    options.profile ?? DEFAULT_CAPTURE_PROFILE,
  );
}

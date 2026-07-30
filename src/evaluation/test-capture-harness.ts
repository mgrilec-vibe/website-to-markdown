import {
  captureWithNavigationResolver,
  DEFAULT_CAPTURE_PROFILE,
} from './capture-runner';
import type { CandidateCapture } from './capture-runner';
import type { CaptureProfile } from './domain';
import { parseHttpUrl } from './public-url';

/**
 * Captures project-owned local pages only for integration tests.
 * Production CLI code imports `capturePublicPage` and has no host-bypass option.
 */
export async function captureLocalTestPage(
  value: string,
  profile: CaptureProfile = {
    ...DEFAULT_CAPTURE_PROFILE,
    screenshotMode: 'viewport',
  },
): Promise<CandidateCapture> {
  return captureWithNavigationResolver(value, async (navigationUrl) => parseHttpUrl(navigationUrl), profile);
}

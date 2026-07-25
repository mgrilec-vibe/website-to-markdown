import { FIXTURES } from './fixtures';
import { POLICIES } from './policies';
import { createAssessmentReport, downloadAssessmentReport } from './report';
import { runAssessmentSuite, runPairedAssessment } from './runner';
import { checkCapability, createLocalSession } from './summarizer';
import { getProvisioningAction } from './provisioning';
import type {
  AssessmentReport,
  CapabilityDiagnostic,
  FixtureReport,
  PairedResult,
  ProvisionEvent,
  ReviewerInput,
} from './domain';

interface AppState {
  capability: CapabilityDiagnostic | null;
  fixtureId: string;
  profileId: string;
  runs: readonly FixtureReport[];
  activeRun: PairedResult | null;
  error: string | null;
  busy: boolean;
}


const escapeHtml = (value: string): string =>
  value.replace(/[&<>"']/gu, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  })[character] ?? character);

function renderOutput(title: string, output: string | null): string {
  if (output === null) {
    return `<details class="result"><summary>${escapeHtml(title)}</summary><p>Not run for this profile.</p></details>`;
  }
  return `<details class="result"><summary>${escapeHtml(title)}</summary><pre>${escapeHtml(output)}</pre></details>`;
}

function toFixtureReport(result: PairedResult, reviewer: ReviewerInput): FixtureReport {
  return {
    fixtureId: result.fixture.id,
    profileId: result.profile.id,
    deterministic: result.deterministic,
    localAi: result.localAi,
    reviewer,
  };
}

function latestReport(state: AppState): AssessmentReport {
  return createAssessmentReport({
    capability: state.capability ?? {
      apiPresent: false,
      availability: 'unknown',
      browserUserAgent: navigator.userAgent,
      checkedAt: new Date().toISOString(),
      sessionOutcome: 'not-attempted',
      events: [],
      error: null,
    },
    policies: POLICIES,
    results: state.runs,
  });
}

export function mountAssessmentApp(root: HTMLElement): void {
  const state: AppState = {
    capability: null,
    fixtureId: FIXTURES[0]!.id,
    profileId: POLICIES[0]!.id,
    runs: [],
    activeRun: null,
    error: null,
    busy: false,
  };

  const render = (): void => {
    const fixture = FIXTURES.find((candidate) => candidate.id === state.fixtureId) ?? FIXTURES[0]!;
    const policy = POLICIES.find((candidate) => candidate.id === state.profileId) ?? POLICIES[0]!;
    const availability = state.capability?.availability ?? 'not checked';
    const provisioningAction = getProvisioningAction(availability);
    const active = state.activeRun;
    const aiOutput = active?.localAi?.output ?? null;
    const eventLog = state.capability?.events.map((entry) => `${entry.kind}: ${entry.detail}`).join('\n') ?? 'No capability check run.';

    root.innerHTML = `
      <header>
        <h1>Chrome Local AI Assessment</h1>
        <p>Runs only bundled synthetic fixtures. Outputs stay local until you download this report.</p>
      </header>
      <section class="grid">
        <section class="card">
          <h2>1. Capability and provisioning</h2>
          <div class="controls">
            <button id="check-capability" ${state.busy ? 'disabled' : ''}>Check local AI</button>
            <button id="provision-model" class="secondary" ${state.busy || !provisioningAction.actionable ? 'disabled' : ''}>${provisioningAction.label}</button>
          </div>
          <p class="status">Availability: ${escapeHtml(availability)}\n${escapeHtml(eventLog)}</p>
        </section>
        <section class="card">
          <h2>2. Fixture and compression policy</h2>
          <div class="controls">
            <label class="field">Fixture
              <select id="fixture-select" ${state.busy ? 'disabled' : ''}>
                ${FIXTURES.map((candidate) => `<option value="${candidate.id}" ${candidate.id === fixture.id ? 'selected' : ''}>${escapeHtml(candidate.title)}</option>`).join('')}
              </select>
            </label>
            <label class="field">Profile
              <select id="profile-select" ${state.busy ? 'disabled' : ''}>
                ${POLICIES.map((candidate) => `<option value="${candidate.id}" ${candidate.id === policy.id ? 'selected' : ''}>${escapeHtml(candidate.label)}</option>`).join('')}
              </select>
            </label>
            <button id="run-assessment" ${state.busy ? 'disabled' : ''}>Run selected</button>
            <button id="run-suite" class="secondary" ${state.busy ? 'disabled' : ''}>Run full suite</button>
          </div>
          <p>${escapeHtml(policy.description)}</p>
          <p class="status">Protected blocks stay verbatim. Only classified prose is eligible for local summarization.</p>
        </section>
      </section>
      ${state.error ? `<p class="error">${escapeHtml(state.error)}</p>` : ''}
      <section class="card result">
        <h2>3. Results and review</h2>
        ${active ? `
          <p class="status">Deterministic: ${active.deterministic.metrics.words} words / ${active.deterministic.metrics.bytes} bytes\nLocal AI: ${active.localAi ? `${active.localAi.metrics.words} words / ${active.localAi.metrics.bytes} bytes` : 'not run'}</p>
          ${renderOutput('Deterministic-only output', active.deterministic.output)}
          ${renderOutput('Deterministic + local-AI output', aiOutput)}
          <form id="review-form" class="review">
            <label><input name="central" type="checkbox" /> Central claim preserved</label>
            <label><input name="omission" type="checkbox" /> Material omission found</label>
            <label><input name="structures" type="checkbox" /> Protected structures survived</label>
            <label class="field">AI-assisted result versus deterministic-only
              <select name="usefulness">
                <option value="not-reviewed">Not reviewed</option>
                <option value="better">Better</option>
                <option value="same">Same</option>
                <option value="worse">Worse</option>
              </select>
            </label>
            <label class="field">Notes<textarea name="notes" placeholder="Record omissions, relevance, or performance observations."></textarea></label>
            <button type="submit">Save review to report</button>
          </form>
        ` : '<p>Run a fixture to compare deterministic-only and local-AI results.</p>'}
      </section>
      <section class="card">
        <h2>4. Export evidence</h2>
        <div class="controls"><button id="download-report" ${state.runs.length === 0 ? 'disabled' : ''}>Download JSON report</button></div>
        <p class="status">Reports include generated outputs for these bundled, non-private fixtures. No real user pages are captured.</p>
      </section>
    `;

    root.querySelector<HTMLButtonElement>('#check-capability')?.addEventListener('click', async () => {
      state.busy = true;
      state.error = null;
      render();
      state.capability = await checkCapability();
      state.busy = false;
      render();
    });

    root.querySelector<HTMLButtonElement>('#provision-model')?.addEventListener('click', async () => {
      const startingCapability = state.capability;
      if (!startingCapability) return;

      const settings = POLICIES.find((candidate) => candidate.id === 'compact')!.summarize!;
      const events: ProvisionEvent[] = [...startingCapability.events];
      state.busy = true;
      state.error = null;
      render();
      try {
        const session = await createLocalSession(settings, (entry) => {
          events.push(entry);
          state.capability = {
            ...startingCapability,
            availability: entry.kind === 'session-created' ? 'available' : 'downloading',
            sessionOutcome: entry.kind === 'session-created' ? 'created' : startingCapability.sessionOutcome,
            events: [...events],
          };
          render();
        });
        session.destroy?.();
        const refreshed = await checkCapability();
        state.capability = { ...refreshed, sessionOutcome: 'created', events: [...events, ...refreshed.events] };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        state.capability = {
          ...startingCapability,
          sessionOutcome: 'failed',
          error: message,
          events: [...events, { at: new Date().toISOString(), kind: 'error', detail: message, progress: null }],
        };
        state.error = message;
      } finally {
        state.busy = false;
        render();
      }
    });

    const fixtureSelect = root.querySelector<HTMLSelectElement>('#fixture-select');
    fixtureSelect?.addEventListener('change', () => {
      state.fixtureId = fixtureSelect.value;
      state.activeRun = null;
      render();
    });

    const profileSelect = root.querySelector<HTMLSelectElement>('#profile-select');
    profileSelect?.addEventListener('change', () => {
      state.profileId = profileSelect.value;
      state.activeRun = null;
      render();
    });

    root.querySelector<HTMLButtonElement>('#run-assessment')?.addEventListener('click', async () => {
      state.busy = true;
      state.error = null;
      render();
      try {
        const currentFixture = FIXTURES.find((candidate) => candidate.id === state.fixtureId)!;
        const currentPolicy = POLICIES.find((candidate) => candidate.id === state.profileId)!;
        const capability = state.capability ?? await checkCapability();
        const sessionEvents: ProvisionEvent[] = [];
        state.capability = capability;
        state.activeRun = await runPairedAssessment(currentFixture, currentPolicy, {
          enableLocalAi: capability.availability === 'available',
          onProvisioningUpdate: (entry) => sessionEvents.push(entry),
        });
        if (sessionEvents.length) {
          state.capability = {
            ...capability,
            sessionOutcome: sessionEvents.some((entry) => entry.kind === 'session-created') ? 'created' : 'failed',
            events: [...capability.events, ...sessionEvents],
          };
        }
      } catch (error) {
        state.error = error instanceof Error ? error.message : String(error);
      } finally {
        state.busy = false;
        render();
      }
    });

    root.querySelector<HTMLButtonElement>('#run-suite')?.addEventListener('click', async () => {
      state.busy = true;
      state.error = null;
      render();
      try {
        const capability = state.capability ?? await checkCapability();
        const sessionEvents: ProvisionEvent[] = [];
        state.capability = capability;
        const pairedResults = await runAssessmentSuite(FIXTURES, POLICIES, {
          enableLocalAi: capability.availability === 'available',
          onProvisioningUpdate: (entry) => sessionEvents.push(entry),
        });
        state.activeRun = pairedResults.at(-1) ?? null;
        state.runs = pairedResults.map((result) => toFixtureReport(result, {
          centralClaimPreserved: null,
          materialOmissionFound: null,
          protectedStructuresSurvived: null,
          relativeUsefulness: 'not-reviewed',
          notes: '',
        }));
        if (sessionEvents.length) {
          state.capability = {
            ...capability,
            sessionOutcome: sessionEvents.some((entry) => entry.kind === 'session-created') ? 'created' : 'failed',
            events: [...capability.events, ...sessionEvents],
          };
        }
      } catch (error) {
        state.error = error instanceof Error ? error.message : String(error);
      } finally {
        state.busy = false;
        render();
      }
    });

    const reviewForm = root.querySelector<HTMLFormElement>('#review-form');
    reviewForm?.addEventListener('submit', (event) => {
      event.preventDefault();
      if (!state.activeRun) return;
      const form = new FormData(reviewForm);
      const reviewer: ReviewerInput = {
        centralClaimPreserved: form.has('central'),
        materialOmissionFound: form.has('omission'),
        protectedStructuresSurvived: form.has('structures'),
        relativeUsefulness: (form.get('usefulness') as ReviewerInput['relativeUsefulness']) ?? 'not-reviewed',
        notes: String(form.get('notes') ?? ''),
      };
      const report = toFixtureReport(state.activeRun, reviewer);
      state.runs = [...state.runs.filter((entry) => entry.fixtureId !== report.fixtureId || entry.profileId !== report.profileId), report];
      render();
    });

    root.querySelector<HTMLButtonElement>('#download-report')?.addEventListener('click', () => {
      downloadAssessmentReport(latestReport(state));
    });
  };

  render();
}

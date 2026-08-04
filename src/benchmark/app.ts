import { checkLocalAiCapability } from '../export-ai';
import type { CapabilityState } from '../export-domain';
import { BENCHMARK_CORPUS } from './corpus';
import { createBenchmarkArchive, downloadBenchmarkArchive } from './archive';
import { provisionBenchmarkLocalAi, type BenchmarkProvisioningEvent } from './provisioning';
import {
  createDefaultBenchmarkMatrix,
  createQuickBenchmarkMatrix,
  runBenchmarkSuite,
  type BenchmarkRunDefinition,
  type BenchmarkRunStage,
  type BenchmarkRunStatus,
  type BenchmarkSuite,
} from './runner';
import './styles.css';

interface BenchmarkProgress {
  readonly recorded: number;
  readonly total: number;
}

type BenchmarkDisplayStage = BenchmarkRunStage | 'preparing';

interface BenchmarkAppState {
  capability: CapabilityState | undefined;
  provisioning: readonly BenchmarkProvisioningEvent[];
  suite: BenchmarkSuite | undefined;
  running: BenchmarkRunDefinition | undefined;
  status: BenchmarkRunStatus | undefined;
  stage: BenchmarkDisplayStage | undefined;
  progress: BenchmarkProgress | undefined;
  error: string | undefined;
  busy: boolean;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Benchmark operation failed.';
}

function capabilityText(capability?: CapabilityState): string {
  if (!capability) return 'Not checked';
  return `Language Detector: ${capability.detector}; Summarizer: ${capability.summarizer}`;
}

function suiteText(suite?: BenchmarkSuite): string {
  if (!suite) return 'No focused benchmark run has completed.';
  const completed = suite.runs.filter((run) => run.status === 'completed').length;
  const failed = suite.runs.filter((run) => run.status === 'failed').length;
  const cancelled = suite.runs.filter((run) => run.status === 'cancelled').length;
  return `${completed}/${suite.definitions.length} focused runs completed; ${failed} failed; ${cancelled} cancelled.`;
}

function stageText(stage?: BenchmarkDisplayStage): string {
  switch (stage) {
    case 'converting':
      return 'Converting page structure';
    case 'checking-capability':
      return 'Checking Chrome local-AI capability';
    case 'creating-language-detector':
      return 'Creating language detector';
    case 'detecting-language':
      return 'Detecting page language';
    case 'creating-summarizer':
      return 'Creating summarizer';
    case 'summarizing':
      return 'Summarizing Markdown';
    case 'finalizing':
      return 'Finalizing result';
    case 'preparing':
      return 'Preparing benchmark';
    default:
      return 'Starting conversion';
  }
}

function extensionEnvironment(state: BenchmarkAppState): Record<string, unknown> {
  return {
    extensionVersion: typeof chrome === 'undefined' ? undefined : chrome.runtime.getManifest().version,
    capability: state.capability,
    provisioning: state.provisioning,
  };
}

export function mountBenchmarkApp(root: HTMLElement): void {
  let state: BenchmarkAppState = {
    capability: undefined,
    provisioning: [],
    suite: undefined,
    running: undefined,
    status: undefined,
    stage: undefined,
    progress: undefined,
    error: undefined,
    busy: false,
  };
  let controller: AbortController | undefined;

  const render = (): void => {
    root.innerHTML = `
      <main class="benchmark-app">
        <header>
          <p class="eyebrow">Website to Markdown</p>
          <h1>Corpus benchmark</h1>
          <p>Runs the bundled approved static corpus locally in this extension. It does not visit or recapture source URLs. All user-facing cells use focused page content.</p>
        </header>
        <section class="benchmark-panel" aria-labelledby="corpus-heading">
          <h2 id="corpus-heading">Suite</h2>
          <p>Quick: 1 fixture · focused mode · None@100, Custom@40, Browser@40 · 3 runs</p>
          <p>Full: 10 fixtures · focused mode · 13 provider/detail cells · 130 runs</p>
          <p id="suite-status" role="status"></p>
          <div class="benchmark-actions">
            <button id="run-diagnostic" type="button" ${state.busy ? 'disabled' : ''}>Run focused quick benchmark</button>
            <button id="run-full" type="button" ${state.busy ? 'disabled' : ''}>Run focused full benchmark</button>
            <button id="cancel" type="button" ${state.busy ? '' : 'disabled'}>Cancel after current run</button>
            <button id="download" type="button" ${state.suite?.runs.some((run) => run.status === 'completed') ? '' : 'disabled'}>Download benchmark ZIP</button>
          </div>
        </section>
        <section class="benchmark-panel" aria-labelledby="ai-heading">
          <h2 id="ai-heading">Chrome local AI</h2>
          <p id="capability-status" role="status"></p>
          <div class="benchmark-actions">
            <button id="check-capability" type="button" ${state.busy ? 'disabled' : ''}>Check readiness</button>
            <button id="provision" type="button" ${state.busy ? 'disabled' : ''}>Provision downloadable model</button>
          </div>
          <ol id="provisioning-events"></ol>
        </section>
        <section class="benchmark-panel" aria-labelledby="progress-heading">
          <h2 id="progress-heading">Progress</h2>
          <progress id="run-progress" aria-label="Focused benchmark progress" value="${state.progress?.recorded ?? 0}" max="${Math.max(state.progress?.total ?? 0, 1)}"></progress>
          <p id="progress-summary" role="status"></p>
          <p id="run-status" role="status"></p>
          <p id="error" class="benchmark-error"${state.error ? '' : ' hidden'}></p>
        </section>
      </main>
    `;
    root.querySelector<HTMLElement>('#suite-status')!.textContent = suiteText(state.suite);
    root.querySelector<HTMLElement>('#capability-status')!.textContent = capabilityText(state.capability);
    root.querySelector<HTMLElement>('#progress-summary')!.textContent = state.progress
      ? `${state.progress.recorded} of ${state.progress.total} focused run results recorded; ${state.progress.total - state.progress.recorded} remaining.`
      : 'No focused benchmark run in progress.';
    root.querySelector<HTMLElement>('#run-status')!.textContent = state.running
      ? `${stageText(state.stage)} — ${state.status ?? 'running'}: ${state.running.fixtureId} · ${state.running.mode} · ${state.running.provider} · Detail ${state.running.detail}`
      : state.busy ? stageText(state.stage) : 'Idle';
    root.querySelector<HTMLElement>('#error')!.textContent = state.error ?? '';
    const events = root.querySelector<HTMLOListElement>('#provisioning-events')!;
    for (const event of state.provisioning) {
      const item = document.createElement('li');
      item.textContent = `${event.component}: ${event.state}${event.progress === undefined ? '' : ` (${Math.round(event.progress * 100)}%)`}${event.error ? ` — ${event.error}` : ''}`;
      events.append(item);
    }

    root.querySelector<HTMLButtonElement>('#check-capability')!.addEventListener('click', () => {
      void (async () => {
        state = { ...state, busy: true, error: undefined };
        render();
        try {
          state = { ...state, capability: await checkLocalAiCapability(), busy: false };
        } catch (error) {
          state = { ...state, busy: false, error: errorMessage(error) };
        }
        render();
      })();
    });
    root.querySelector<HTMLButtonElement>('#provision')!.addEventListener('click', () => {
      void (async () => {
        state = { ...state, busy: true, error: undefined, provisioning: [] };
        render();
        controller = new AbortController();
        try {
          const result = await provisionBenchmarkLocalAi((event) => {
            state = { ...state, provisioning: [...state.provisioning, event] };
            render();
          }, controller.signal);
          state = { ...state, capability: result.after, provisioning: result.events, busy: false };
        } catch (error) {
          state = { ...state, busy: false, error: errorMessage(error) };
        } finally {
          controller = undefined;
        }
        render();
      })();
    });

    const run = (definitions: readonly BenchmarkRunDefinition[]): void => {
      void (async () => {
        state = {
          ...state,
          busy: true,
          error: undefined,
          suite: undefined,
          running: undefined,
          status: undefined,
          stage: 'preparing',
          progress: { recorded: 0, total: definitions.length },
        };
        controller = new AbortController();
        render();
        try {
          const suite = await runBenchmarkSuite(definitions, BENCHMARK_CORPUS, {
            signal: controller.signal,
            onRunState: (definition, status) => {
              const recorded = status === 'completed' || status === 'failed' || status === 'cancelled';
              state = {
                ...state,
                running: definition,
                status,
                ...(recorded && state.progress
                  ? { progress: { ...state.progress, recorded: Math.min(state.progress.total, state.progress.recorded + 1) } }
                  : {}),
              };
              render();
            },
            onStage: (_definition, stage) => {
              state = { ...state, stage };
              render();
            },
          });
          state = {
            ...state,
            suite,
            busy: false,
            running: undefined,
            status: undefined,
            stage: undefined,
            progress: { recorded: suite.runs.length, total: suite.definitions.length },
          };
        } catch (error) {
          state = {
            ...state,
            busy: false,
            error: errorMessage(error),
            running: undefined,
            status: undefined,
            stage: undefined,
          };
        } finally {
          controller = undefined;
        }
        render();
      })();
    };
    root.querySelector<HTMLButtonElement>('#run-full')!.addEventListener('click', () => run(createDefaultBenchmarkMatrix(BENCHMARK_CORPUS)));
    root.querySelector<HTMLButtonElement>('#run-diagnostic')!.addEventListener('click', () => run(createQuickBenchmarkMatrix(BENCHMARK_CORPUS)));
    root.querySelector<HTMLButtonElement>('#cancel')!.addEventListener('click', () => controller?.abort());
    root.querySelector<HTMLButtonElement>('#download')!.addEventListener('click', () => {
      void (async () => {
        const suite = state.suite;
        if (!suite) return;
        const environment = extensionEnvironment(state);
        state = { ...state, busy: true, error: undefined };
        render();
        try {
          const archive = await createBenchmarkArchive(suite, { environment });
          downloadBenchmarkArchive(archive, { filename: `website-to-markdown-benchmark-${suite.completedAt.replace(/[:.]/gu, '-')}.zip` });
          state = { ...state, busy: false };
        } catch (error) {
          state = { ...state, busy: false, error: errorMessage(error) };
        }
        render();
      })();
    });
  };

  render();
}

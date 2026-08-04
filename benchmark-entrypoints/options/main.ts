import { mountBenchmarkApp } from '../../src/benchmark/app';

const root = document.querySelector<HTMLElement>('#app');
if (!root) throw new Error('Benchmark root is missing.');

mountBenchmarkApp(root);

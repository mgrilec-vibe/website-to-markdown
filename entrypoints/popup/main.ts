import '../../src/export-styles.css';

const root = document.querySelector<HTMLElement>('#app');
if (!root) throw new Error('Export popup root is missing.');

root.innerHTML = `
  <section class="export-popup">
    <p class="eyebrow">Website to Markdown</p>
    <h1>Capture this page</h1>
    <p>Convert the active page locally, then review the Markdown before it leaves Chrome.</p>
    <button id="export" type="button">Export as Markdown</button>
    <output id="status" aria-live="polite"></output>
  </section>
`;

const button = root.querySelector<HTMLButtonElement>('#export')!;
const status = root.querySelector<HTMLOutputElement>('#status')!;

button.addEventListener('click', async () => {
  button.disabled = true;
  status.textContent = 'Capturing the active page locally…';
  try {
    const response = await chrome.runtime.sendMessage({ type: 'export-active-tab' }) as { id?: string; error?: string };
    if (response.error || !response.id) throw new Error(response.error || 'Capture did not return an export.');
    status.textContent = 'Opening preview…';
    window.close();
  } catch (error) {
    status.textContent = error instanceof Error ? error.message : 'Unable to capture this page.';
    button.disabled = false;
  }
});

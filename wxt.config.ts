import { defineConfig } from 'wxt';

export default defineConfig({
  manifest: {
    name: 'Website to Markdown',
    description: 'Export the active page as local, reviewable Markdown.',
    version: '0.3.0',
    permissions: ['activeTab', 'scripting', 'storage', 'downloads', 'contextMenus'],
    host_permissions: [],
  },
});

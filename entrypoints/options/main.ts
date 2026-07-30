import { mountSettingsApp } from '../../src/settings-app';
import '../../src/styles.css';

const root = document.querySelector<HTMLElement>('#app');
if (!root) throw new Error('Settings root is missing.');

mountSettingsApp(root);

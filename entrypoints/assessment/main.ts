import { mountAssessmentApp } from '../../src/app';
import '../../src/styles.css';

const root = document.querySelector<HTMLElement>('#app');
if (!root) {
  throw new Error('Assessment app root is missing.');
}

mountAssessmentApp(root);

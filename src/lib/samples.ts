import type { EvaluationCase } from '../types';

const SAMPLE_NOTE = 'Illustrative check only; no page was fetched.';

export const SAMPLE_CASES: EvaluationCase[] = [
  {
    id: 'sample-northstar',
    title: 'Northstar launch page',
    url: 'https://launch.example',
    criteria: [
      'A clear page heading is visible without scrolling',
      'A contact link is available in the page navigation',
      'The primary action is clearly labeled',
    ],
    checks: [
      { passed: true, note: SAMPLE_NOTE },
      { passed: true, note: SAMPLE_NOTE },
      { passed: true, note: SAMPLE_NOTE },
    ],
    status: 'sample',
    label: 'Illustrative sample',
    updated: 'Example',
    mark: 'N',
    tone: 'sample-warm',
  },
  {
    id: 'sample-morrow',
    title: 'Morrow help center',
    url: 'https://help.example',
    criteria: [
      'A search field is visible near the top of the page',
      'Support hours are stated on the contact page',
      'Navigation labels are readable on mobile',
    ],
    checks: [
      { passed: true, note: SAMPLE_NOTE },
      { passed: false, note: SAMPLE_NOTE },
      { passed: true, note: SAMPLE_NOTE },
    ],
    status: 'sample',
    label: 'Illustrative sample',
    updated: 'Example',
    mark: 'M',
  },
];

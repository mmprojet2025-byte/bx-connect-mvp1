import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../src/screens/PartnerSupportsScreen.js', import.meta.url), 'utf8');

test('support and statistics failures are rendered as errors instead of zero totals', () => {
  assert.doesNotMatch(source, /statistiques'\)\.catch\(\(\) => \(\{ data: null \}\)\)/);
  assert.match(source, /setStatsError\(getApiError/);
  assert.match(source, /statsError \? null : \(/);
  assert.match(source, /if \(error\)[\s\S]*?title=\{t\('common\.error'\)\}/);
});

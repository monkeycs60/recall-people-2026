import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const contactProfilePath = resolve(__dirname, '../app/contact/[id]/index.tsx');

test('essentials summary expands inline instead of opening a modal', async () => {
  const source = await readFile(contactProfilePath, 'utf8');

  assert.match(source, /isSummaryExpanded/);
  assert.match(source, /numberOfLines=\{isSummaryExpanded \? undefined : 2\}/);
  assert.doesNotMatch(source, /showSummaryModal/);
  assert.doesNotMatch(source, /summaryModal/);
});

test('upcoming preview fills remaining slots with active undated topics', async () => {
  const source = await readFile(contactProfilePath, 'utf8');

  assert.match(source, /getUpcomingPreviewHotTopics/);
  assert.match(source, /topic\.eventDate\s*\?\s*formatShortDate/);
  assert.match(source, /contactComingUp\.undated/);
});

test('upcoming total uses the same canonical birthday filtering as the preview', async () => {
  const source = await readFile(contactProfilePath, 'utf8');

  assert.match(source, /function getVisibleUpcomingHotTopics/);
  assert.match(source, /const canonicalTopics = filterToNextBirthdayTopic\(hotTopics, today\)/);
  assert.match(source, /getVisibleUpcomingHotTopics\(contact\.hotTopics, today\)\.length/);
});

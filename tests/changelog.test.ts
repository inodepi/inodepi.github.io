import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseChangelog } from '../src/lib/changelog.ts';

test('parseChangelog returns releases with html', () => {
  const entries = parseChangelog('tippy.md');
  assert.ok(entries.length > 0, 'expected at least one release');
  for (const entry of entries) {
    assert.match(entry.version, /^v\d/);
    assert.ok(entry.html.length > 0, 'html should not be empty');
  }
});

test('parseChangelog renders bold and bullets', () => {
  const entries = parseChangelog('tippy.md');
  const html = entries.map((e) => e.html).join('\n');
  assert.match(html, /<strong>/);
  assert.match(html, /<li>/);
});

test('parseChangelog escapes raw html', () => {
  // tippy.md contains a `<a>` inline code token; it must be escaped, not executed.
  const entries = parseChangelog('tippy.md');
  const html = entries.map((e) => e.html).join('\n');
  assert.doesNotMatch(html, /<a>(?!href)/);
});
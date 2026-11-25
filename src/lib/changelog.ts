import { marked } from 'marked';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/** Parse a `## vX.Y.Z — Title (YYYY-MM-DD)` changelog file into release entries. */
export const parseChangelog = (file: string) => {
  const markdown = readFileSync(join(process.cwd(), 'src/data/changelogs', file), 'utf8');
  return markdown
    .split(/\n## (?=v\d)/)
    .slice(1)
    .map((block) => {
      const newline = block.indexOf('\n');
      const heading = block.slice(0, newline).trim();
      const body = block.slice(newline + 1).trim();
      const withTitle = heading.match(/^(v[\d.]+)\s*—\s*(.*?)\s*\((\d{4}-\d{2}-\d{2})\)\s*$/);
      if (withTitle) {
        return { version: withTitle[1], title: withTitle[2], date: withTitle[3], html: marked.parse(body) as string };
      }
      const dateOnly = heading.match(/^(v[\d.]+)\s*—\s*(\d{4}-\d{2}-\d{2})\s*$/);
      return {
        version: dateOnly?.[1] ?? heading,
        title: '',
        date: dateOnly?.[2] ?? '',
        html: marked.parse(body) as string,
      };
    });
};

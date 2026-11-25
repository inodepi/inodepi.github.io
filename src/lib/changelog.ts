import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const inline = (s: string) => {
  let out = escapeHtml(s);
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, text, url) => {
    const safe = /^(https?:\/\/|#)/.test(url) ? url : '';
    return safe ? `<a href="${safe}" rel="noopener noreferrer">${text}</a>` : text;
  });
  out = out.replace(/`([^`]+)`/g, '<code>$1</code>');
  out = out.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  return out;
};

/** Small, dependency-free renderer for the changelog markdown subset. */
const renderMarkdown = (body: string) => {
  const lines = body.split('\n');
  const out: string[] = [];
  let inList = false;
  const closeList = () => {
    if (inList) {
      out.push('</ul>');
      inList = false;
    }
  };
  for (const raw of lines) {
    const line = raw.trim();
    if (line === '') {
      closeList();
      continue;
    }
    if (line.startsWith('### ')) {
      closeList();
      out.push(`<h4>${inline(line.slice(4))}</h4>`);
      continue;
    }
    if (line.startsWith('## ')) {
      closeList();
      out.push(`<h3>${inline(line.slice(3))}</h3>`);
      continue;
    }
    if (line.startsWith('- ') || line.startsWith('* ')) {
      if (!inList) {
        out.push('<ul>');
        inList = true;
      }
      out.push(`<li>${inline(line.slice(2))}</li>`);
      continue;
    }
    closeList();
    out.push(`<p>${inline(line)}</p>`);
  }
  closeList();
  return out.join('\n');
};

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
        return { version: withTitle[1], title: withTitle[2], date: withTitle[3], html: renderMarkdown(body) };
      }
      const dateOnly = heading.match(/^(v[\d.]+)\s*—\s*(\d{4}-\d{2}-\d{2})\s*$/);
      return {
        version: dateOnly?.[1] ?? heading,
        title: '',
        date: dateOnly?.[2] ?? '',
        html: renderMarkdown(body),
      };
    });
};
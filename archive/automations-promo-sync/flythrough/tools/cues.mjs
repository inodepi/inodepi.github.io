// Export the cue sheet (for the .srt and the record) from src/cues.js.
import fs from 'fs'; import path from 'path';
import { CUES7, CUES10 } from '../src/cues.js';
const here = path.dirname(new URL(import.meta.url).pathname), out = path.resolve(here, '../voices');
fs.writeFileSync(path.join(out, 'cues_day07.json'), JSON.stringify(CUES7, null, 1));
fs.writeFileSync(path.join(out, 'cues_day10.json'), JSON.stringify(CUES10, null, 1));
console.log('cues', CUES7.length, CUES10.length);

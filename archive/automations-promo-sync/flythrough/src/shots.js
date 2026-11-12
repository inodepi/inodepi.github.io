// One continuous take per day. [t, target (Vector3 | subject), dist, az, el, fov, target offset?, {ease}?]
// az 0 = camera on the +z side looking toward −z (card print reads upright); el in radians.
import { T, DAY, DUR } from './film.js';
import { V } from './anim.js';
const R = { ease: 1 };

export const KEYS = DAY === 10 ? [
  // opening: hold the whole desk, then settle down onto the courier as he pops
  [0.00, 'wide', 3.70, .06, 1.05, 36, V(-.02, 0, 0)],
  [0.55, 'wide', 3.62, .07, 1.05, 36, V(-.02, 0, 0)],
  [0.95, 'wide', 3.44, .08, 1.04, 36, V(-.02, 0, 0)],
  [1.50, 'courier', 1.10, .18, .58, 36],
  [1.88, 'courier', .70, .20, .52, 36],
  [2.20, 'courier', .68, .20, .52, 36],
  [2.30, 'courier', .64, .18, .50, 36, null, R],
  // hop one: sheet → inbox (ride along low behind him)
  [3.85, 'inboxPair', 1.58, .10, .95, 36],
  [4.60, 'inboxPair', 1.64, .06, .97, 36],
  // the wait: the clock in the back of frame races through the morning
  [5.25, 'inboxPair', 2.1, .04, .86, 36],
  [6.75, 'inboxPair', 1.98, .04, .88, 36, null, R],
  // hop two: inbox → CRM
  [7.75, 'crmPair', 1.80, .04, .95, 36],
  [8.10, 'crm', 1.12, .02, .52, 36],
  // the drop: the record slips, falls flat, he picks it back up
  [8.55, 'crm', 1.08, .01, .50, 36],
  [9.10, 'crmPair', 1.55, .05, .90, 36],
  // hop three: back to the sheet; the morning is gone
  [10.20, 'sheetPair', 1.86, .10, .90, 36],
  [10.48, 'sheet', 1.52, .12, .93, 36, null, R],
  // the whip: up over the desk and down onto the same sheet
  [11.20, 'wide', 2.55, .04, 1.16, 36],
  [11.55, 'sheet', 1.55, .07, .92, 36],
  [12.15, 'sheet', 1.50, .09, .94, 36],
  // the run: follow the head of the stream card to card
  [13.10, 'head', 1.72, .10, .78, 36],
  [14.10, 'head', 1.82, .06, .82, 36],
  [15.05, 'head', 1.88, .04, .85, 36],
  [15.18, 'crmPair', 1.72, .05, .95, 36],
  // pull back: the whole desk, the route lit, the curtain call
  [15.55, 'wide', 2.05, .08, .96, 36],
  [16.35, 'wide', 2.85, .12, 1.00, 36],
  [18.25, 'wide', 3.52, .05, 1.06, 36, V(-.04, 0, 0)],
  // the title drops into open desk; hold the closing wide
  [20.00, 'wide', 3.54, .04, 1.06, 36, V(-.04, 0, 0)],
  [22.50, 'wide', 3.56, .06, 1.07, 36, V(-.04, 0, -.01)],
  [24.80, 'wide', 3.54, .08, 1.07, 36, V(-.03, 0, -.02)],
  [DUR, 'wide', 3.56, .10, 1.07, 36, V(-.03, 0, -.03)],
] : [
  // day 7 teaser: the same relay, no solution; pull back as he hangs mid-hop
  [0.00, 'sheetPair', 1.95, .20, .86, 36],
  [0.55, 'sheetPair', 1.82, .22, .82, 36],
  [0.90, 'courier', .64, .24, .52, 36],
  [2.10, 'courier', .68, .20, .52, 36],
  [2.30, 'courier', .66, .18, .50, 36, null, R],
  [3.85, 'inboxPair', 1.62, .10, .94, 36],
  [4.60, 'inboxPair', 1.48, .06, .98, 36],
  [5.30, 'inboxPair', 1.60, .04, .99, 36, null, R],
  [6.95, 'crmPair', 1.84, .06, .94, 36],
  [7.90, 'crmPair', 1.72, .03, .98, 36],
  [8.40, 'crmPair', 1.52, .02, .98, 36, null, R],
  [9.95, 'sheetPair', 1.90, .12, .90, 36],
  [10.30, 'sheetPair', 1.80, .10, .94, 36],
  [11.35, 'inbox', 1.24, .08, .52, 36],
  [11.90, 'courier', 1.08, .08, .46, 36, null, R],
  [13.30, 'courier', 1.02, .06, .50, 36],
  [14.70, 'courier', 1.10, .10, .50, 36],
  [16.15, 'courier', 1.05, .12, .52, 36, null, R],
  [16.45, 'wide', 1.95, .12, .74, 36],
  [17.65, 'wide', 3.50, .05, 1.06, 36],
  [DUR, 'wide', 3.55, .06, 1.07, 36, V(-.05, 0, 0)],
];

export const SHAKES = DAY === 10
  ? [[15.0, .0022, 9], [19.875, .0038, 10]]
  : [[12.0, .006, 9], [12.5, .002, 12]];

"""audio.py — score + foley + voice mix for one keynote day.
Usage: .venv/bin/python <project>/audio.py <dayNN>
Reads: voices/timeline_dayNN.json, voices/dayNN/dur.json, <project>/events.json
Writes: <project>/out/mix_dayNN.wav
"""
import os, sys, json
import numpy as np
import soundfile as sf
from scipy.signal import butter, sosfilt

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.environ.get('LIB', os.path.expanduser('~/lemo-opuscar'))
sys.path.insert(0, REPO)
from core.audio.sfx import SR, t_, env_exp, bp, lp, hp, noise, norm, brown, add, compress, limit, click, whoosh, thump as sfx_thump, pop as sfx_pop

DAY = sys.argv[1] if len(sys.argv) > 1 else '01'
FAMILY = sys.argv[2] if len(sys.argv) > 2 else 'keynote'
FDIR = os.path.join(HERE, FAMILY)
TL = json.load(open(os.path.join(FDIR, 'voices', f'timeline_day{DAY}.json')))
DUR = float(TL['dur'])
evf = os.path.join(FDIR, f'events_day{DAY}.json')
EV = json.load(open(evf))['ev'] if os.path.exists(evf) else TL['ev']
VO_DUR = {}
vdir = os.path.join(FDIR, 'voices', f'day{DAY}')
if os.path.exists(os.path.join(vdir, 'dur.json')):
    VO_DUR = json.load(open(os.path.join(vdir, 'dur.json')))

N = int(round(DUR * SR))
rng = np.random.default_rng(20261109)

# ── sections per day ────────────────────────────────────────
SECT = {
    '01': [[0, 3.2, 'intro'], [3.2, 12, 'problem'], [12, 26, 'proof'], [26, 40, 'list'], [40, 51.6, 'offer'], [51.6, 60, 'cta']],
    '04': [[0, 4, 'proof'], [4, 8, 'proof'], [8, 12, 'proof']],
    '05': [[0, 17.8, 'list'], [17.8, 23.8, 'offer'], [23.8, 30, 'cta']],
    '06': [[0, 17.4, 'offer'], [17.4, 25, 'cta']],
    '14': [[0, 4.2, 'echo'], [4.2, 10.3, 'proof'], [10.3, 13, 'proof'], [13, 22, 'offer'], [22, 30, 'cta']],
}
SECT = TL.get('sect') or SECT.get(DAY) or [[0, DUR, 'proof']]

BPM = 120; S16 = 0.125; BEAT = 0.5
P = [57, 64, 71, 64, 73, 64, 57, 64, 71, 64, 74, 73]  # A major pentatonic figure
hz = lambda m: 440 * 2 ** ((m - 69) / 12)

def sine(f, d, tau, ph=0.0):
    return np.sin(2 * np.pi * f * t_(d) + ph) * env_exp(d, tau)

def mallet(m, d=1.6, v=1.0):
    f = hz(m)
    x = sine(f, d, d * .30) + sine(2 * f, d, d * .14) * .32 + sine(3.01 * f, d, d * .08) * .14 + sine(4.2 * f, d, d * .04) * .05
    x[:int(.004 * SR)] += rng.standard_normal(int(.004 * SR)) * .18
    return norm(x) * v

def pad(f, d, v=1.0):
    tt = t_(d)
    x = np.sin(2 * np.pi * f * tt) + .45 * np.sin(2 * np.pi * f * 1.5 * tt) + .3 * np.sin(2 * np.pi * f * 2.0 * tt + .4)
    a = np.minimum(1, tt / .9); r = np.minimum(1, (d - tt) / 1.2)
    return norm(x * a * r) * v

def shaker(d=.06, v=1.0):
    return norm(hp(noise(d), 6000) * env_exp(d, .012)) * v

def pulse_note(f=55, d=.5, v=1.0):
    return norm(sine(f, d, .16) + np.sign(np.sin(2 * np.pi * f * t_(d))) * env_exp(d, .05) * .12) * v

def glass(f, d=.9, v=1.0):
    x = sine(f, d, d * .3) + sine(2 * f, d, d * .14) * .3 + sine(2.76 * f, d, d * .08) * .18 + hp(noise(d), 5000) * env_exp(d, .002) * .2
    return norm(x) * v

def caret(v=1.0):
    d = .03; return norm(bp(noise(d), 1500, 3200) * env_exp(d, .0025) + sine(2100, d, .004) * .6) * v

def swish(d=.32, v=1.0):
    n = noise(d); out = np.zeros_like(n); L = len(n); step = 480
    for i in range(0, L, step):
        u = i / L; f = 500 * (8 ** u)
        w = min(step, L - i)
        seg = bp(n[max(0, i - 1400):i + w], f * .75, min(f * 1.35, SR / 2 - 100))[-w:]
        out[i:i + w] = seg
    return norm(out * np.sin(np.pi * t_(d) / d) ** 1.5) * v

def thump(f=62, d=.4, v=1.0):
    tt = t_(d)
    return norm(np.sin(2 * np.pi * f * tt * (1 - .25 * tt)) * env_exp(d, .09) + lp(noise(d), 260) * env_exp(d, .02) * .6) * v

def pop(f=900, v=1.0):
    d = .12; tt = t_(d); fr = f * (1 + .6 * np.exp(-tt / .01))
    return norm(np.sin(2 * np.pi * np.cumsum(fr) / SR) * env_exp(d, .03)) * v

def is_in(t, a, b): return a <= t < b

def section_at(t):
    for a, b, s in SECT:
        if a <= t < b: return s
    return 'cta'

# ── score ───────────────────────────────────────────────────
music = np.zeros((N, 2), np.float32)
padb = np.zeros((N, 2), np.float32)

# pad bed per section
for a, b, s in SECT:
    chord = [45, 52, 57] if s in ('intro', 'offer') else ([45, 52, 57, 61] if s in ('proof', 'list', 'cta', 'echo') else [45, 51, 56])
    lvl = {'intro': .055, 'problem': .05, 'proof': .07, 'list': .075, 'offer': .05, 'cta': .08, 'echo': .055}[s]
    for m in chord:
        add(padb, pad(hz(m), b - a, 1.0), a, lvl, (m % 3 - 1) * .25)

# motif density per section
DENS = {'intro': 4, 'problem': 2, 'proof': 1, 'list': 1, 'offer': 2, 'cta': 4, 'echo': 2}
for k in range(int(DUR / S16) + 1):
    t = k * S16
    s = section_at(t)
    if s == 'problem' and k % 2 == 1: continue
    if s in ('intro', 'cta') and k % 4 != 0: continue
    if s == 'offer' and k % 2 == 1: continue
    m = P[k % 12]
    v = {'intro': .20, 'problem': .16, 'proof': .24, 'list': .27, 'offer': .15, 'cta': .22, 'echo': .20}[s]
    det = 1.008 if s == 'problem' else 1.0
    pan = rng.uniform(-.5, .5) if s == 'problem' else (0.15 if k % 2 else -.15)
    note = mallet(int(m), 1.4, v)
    if det != 1.0:
        note = np.interp(np.arange(int(len(note) / det)), np.arange(len(note)), note)
    add(music, note, t, 1.0, pan)
    if s in ('list', 'proof') and k % 2 == 0:
        add(music, shaker(.05, .10), t, 1.0, 0.3 if k % 4 else -.3)
    if s == 'problem' and k % 4 == 0:
        add(music, pulse_note(55, .4, .10), t, 1.0, 0)

# section hits on the bass at boundaries
for a, b, s in SECT[1:]:
    add(music, thump(52, .5, .22), a, 1.0, 0)

# ── foley from EV ──────────────────────────────────────────
fol = np.zeros((N, 2), np.float32)
if FAMILY == 'flythrough':
    add(fol, brown(DUR) * .9, 0, .012, 0)   # low room tone under the paper desk
for e in EV:
    t = float(e['t']); typ = e.get('type')
    if t >= DUR: continue
    if typ == 'tick': add(fol, caret(.18 if e.get('soft') else .5), t, 1, rng.uniform(-.25, .25) if e.get('soft') else 0)
    elif typ == 'pop': add(fol, pop(880 + rng.uniform(-120, 200), .35), t, 1, rng.uniform(-.5, .5))
    elif typ == 'whoosh': add(fol, swish(.42, .32), t - .12, 1, 0)
    elif typ == 'thump': add(fol, thump(58, .5, .5), t, 1, 0)
    elif typ == 'lock': add(fol, glass(hz(81), .7, .22), t, 1, .2); add(fol, mallet(69, 1.2, .18), t, 1, -.15)
    elif typ == 'snap': add(fol, mallet(int(P[int(t / S16) % 12]), .7, .3), t, 1, 0)
    elif typ == 'ding': add(fol, glass(hz(84), .8, .24), t, 1, .25); add(fol, glass(hz(88), .8, .16), t + .07, 1, -.2)
    elif typ == 'chime': add(fol, glass(hz(76), 1.4, .26), t, 1, .1); add(fol, glass(hz(81), 1.4, .2), t, 1, -.15); add(fol, mallet(69, 2.0, .2), t, 1, 0)
    elif typ == 'switch': add(fol, click(1.2, .6), t, 1, 0); add(fol, mallet(76, .6, .18), t + .02, 1, 0)
    # ── flythrough foley ──
    elif typ == 'hop': add(fol, mallet(int(P[int(t / S16) % 12]) + 12, .45, .22), t, 1, rng.uniform(-.35, .35))
    elif typ == 'land': add(fol, thump(150, .16, .34), t, 1, 0); add(fol, lp(noise(.06), 340) * env_exp(.06, .012) * .22, t, 1, 0)
    elif typ == 'stamp': add(fol, thump(74, .28, .42), t, 1, 0); add(fol, click(1.7, .5), t, 1, 0); add(fol, mallet(int(P[int(t / S16) % 12]), .7, .14), t + .02, 1, 0)
    elif typ == 'slam': add(fol, thump(46, .7, .72), t, 1, 0); add(fol, thump(96, .3, .34), t + .008, 1, 0); add(fol, bp(noise(.5), 260, 1600) * env_exp(.5, .07) * .34, t, 1, 0)
    elif typ == 'paper': add(fol, bp(noise(.36), 1900, 6200) * env_exp(.36, .085) * .3, t, 1, rng.uniform(-.3, .3))
    elif typ == 'cube': add(fol, glass(hz(84 + (e.get('k', 0) % 5)), .2, .12), t, 1, rng.uniform(-.4, .4))
    elif typ == 'dot': add(fol, glass(hz(81), .5, .07), t, 1, rng.uniform(-.4, .4))
    elif typ == 'zero': pass

# ── voice ──────────────────────────────────────────────────
vox = np.zeros((N, 2), np.float32)
for l in TL['lines']:
    p = os.path.join(vdir, l['id'] + '.wav')
    if not os.path.exists(p): continue
    x, sr = sf.read(p)
    if x.ndim > 1: x = x.mean(axis=1)
    if sr != SR: x = np.interp(np.linspace(0, len(x), int(len(x) * SR / sr)), np.arange(len(x)), x)
    x = compress(x.astype(np.float32), .18, 3.2)
    add(vox, x, l['t0'], 1.0, 0)

# duck music under voice (envelope of voice)
env = np.abs(vox).max(axis=1)
win = int(.05 * SR)
env = np.convolve(env, np.ones(win) / win, mode='same')
env = np.clip(env / (.14 + env), 0, 1)
duck = (1 - .62 * env)[:, None]
music *= duck; padb *= duck

mix = music * .85 + padb + fol
mix = mix + vox * 1.0
mix = limit(mix, .94)
sf.write(os.path.join(HERE, 'out', f'mix_day{DAY}.wav'), mix, SR)
print('mix_day%s.wav  %.1fs' % (DAY, DUR))

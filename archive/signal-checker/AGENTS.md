# AGENTS.md

## Overview

Single-module Python project. `signal_engine.py` is both the library and the entrypoint: it fetches daily closes via yfinance, computes SMA-crossover signals (default 50/200), and POSTs a JSON payload to a Make.com webhook.

## Commands

```bash
pip install -r requirements.txt
python signal_engine.py            # safe without WEBHOOK_URL: evaluates and prints, skips dispatch
```

No tests, lint, or typecheck are configured. Verification means running the script.

## CI is a scheduled job

`.github/workflows/signal-check.yml` runs `signal_engine.py` on GitHub Actions **every weekday at 21:00 UTC** (plus manual dispatch), with `STOCK_SYMBOL=AAPL` and `WEBHOOK_URL` from a repo secret. Changes to `signal_engine.py` go live in this scheduled run immediately after merge — there is no deploy step between merge and execution.

## Engine configuration (env vars)

| Var | Default | Purpose |
|---|---|---|
| `STOCK_SYMBOL` | `AAPL` | Ticker or forex pair (e.g., "AAPL", "USD/PHP", "EURUSD") |
| `SHORT_WINDOW` | `50` | Short SMA days |
| `LONG_WINDOW` | `200` | Long SMA days |
| `WEBHOOK_URL` | unset | Make.com endpoint; unset = skip dispatch |

Engine requires ≥ `LONG_WINDOW` trading days of data or raises.

## Gotchas

- There is no `.gitignore`; any new file is tracked by default (`git add -A` would pick up `venv/`, secrets, etc.). Do not commit real webhook URLs or tokens.
- Setup/usage docs live in `readme.md`; trust the code/workflow over them where they conflict.
- Forex pairs can be specified in multiple formats:
  - "USD/PHP" (recommended)
  - "EURUSD" (will be auto-converted)
  - The script automatically converts to yfinance format internally

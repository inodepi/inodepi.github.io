# Signal Checker

An automated trading-signal pipeline that evaluates a **SMA crossover strategy** on daily stock prices and dispatches the result as JSON to a [Make.com](https://www.make.com) webhook for downstream automation (alerts, notifications, etc.).

- Fetches ~400 days of historical closes via **yfinance**
- Compares the short-window SMA against the long-window SMA (defaults: 50 / 200 days)
- Emits a signal of `BUY` (short > long), `SELL` (short < long), or `HOLD`
- Runs automatically on GitHub Actions every weekday at 21:00 UTC

## Setup

Requires Python 3.10+.

```bash
pip install -r requirements.txt
python signal_engine.py
```

Without `WEBHOOK_URL` set, the script evaluates the signal, prints the payload, and skips dispatch — safe for local testing.

## Configuration

All configuration is done via environment variables:

| Variable | Default | Description |
|---|---|---|
| `STOCK_SYMBOL` | `AAPL` | Ticker symbol to evaluate |
| `SHORT_WINDOW` | `50` | Short SMA window in trading days |
| `LONG_WINDOW` | `200` | Long SMA window in trading days |
| `WEBHOOK_URL` | *(unset)* | Make.com webhook URL; unset = skip dispatch |

Example:

```bash
STOCK_SYMBOL=MSFT SHORT_WINDOW=20 LONG_WINDOW=100 WEBHOOK_URL="https://hook.eu2.make.com/..." python signal_engine.py
```

## Using it with Make.com

1. Log in to Make.com and create a new scenario.
2. Add a **Webhooks** module as the trigger and choose **Custom webhook**.
3. Create the webhook (e.g. name it `signal-checker`) and copy its generated URL.
4. Provide that URL to this project:
   - **Locally:** export it as `WEBHOOK_URL`.
   - **GitHub Actions:** add it as the repository secret `WEBHOOK_URL` (Settings → Secrets and variables → Actions). The scheduled workflow picks it up automatically.
5. Run `signal_engine.py` (or trigger the workflow manually via *Run workflow*). Each evaluation POSTs one JSON object to your webhook, which you can then route to Telegram, email, Sheets, or anything else in Make.com.

### Example payload

```json
{
  "success": true,
  "timestamp": "2026-08-24T21:00:00Z",
  "symbol": "AAPL",
  "current_price": 229.5,
  "short_sma": 228.12,
  "long_sma": 215.4,
  "signal": "BUY",
  "message": "Bullish alignment: Short SMA (228.12) is above Long SMA (215.40)."
}
```

On failure, `success` is `false`, `signal` is `"ERROR"`, and an `error` field contains the reason.

## Scheduled runs

The included workflow (`.github/workflows/signal-check.yml`) runs the engine Monday–Friday at 21:00 UTC with `STOCK_SYMBOL=AAPL` and `WEBHOOK_URL` from repository secrets, and can also be triggered manually from the Actions tab.

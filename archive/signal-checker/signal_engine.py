"""
Stock Signal Automation Engine
A clean, modern approach to technical indicator evaluation (SMA Crossover).
"""

import os
import json
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta
import yfinance as yf
import requests


def normalize_symbol_for_yfinance(symbol: str) -> str:
    """
    Convert user-friendly symbol to yfinance-compatible format.
    
    For forex pairs:
    - "USD/PHP" → "USDPHP=X"
    - "EURUSD" (already combined) → "EURUSD=X" 
    - For stocks/indices: return as-is (AAPL, ^GSPC, etc.)
    
    Handles common variations:
    - Case insensitive
    - Optional whitespace
    - Different separator styles
    """
    if not symbol or not isinstance(symbol, str):
        return symbol
    
    # Clean and uppercase the symbol
    clean_symbol = symbol.strip().upper()
    
    # Check if it looks like a forex pair with separator
    if '/' in clean_symbol:
        # Split on common forex separators
        parts = clean_symbol.replace('-', '/').replace('.', '/').split('/')
        # Filter out empty parts and take first two meaningful parts
        parts = [p for p in parts if p]
        if len(parts) >= 2:
            base, quote = parts[0], parts[1]
            # yfinance forex format: BASEQUOTE=X (e.g., USDPHP=X)
            return f"{base}{quote}=X"
    
    # Check if it's already a 6-character forex code (like EURUSD)
    # This handles cases where user enters "EURUSD" instead of "EUR/USD"
    elif len(clean_symbol) == 6 and clean_symbol.isalpha():
        # Likely a forex pair like EURUSD, GBPUSD, etc.
        return f"{clean_symbol}=X"
    
    # For stocks, indices, crypto, etc. - return as-is
    # yfinance handles these formats natively:
    # - Stocks: AAPL, MSFT
    # - Indices: ^GSPC, ^FTSE
    # - Crypto: BTC-USD (already has hyphen)
    # - ETFs: SPY, VOO
    return clean_symbol

# Configuration via Environment Variables with sensible defaults
SYMBOL = os.getenv("STOCK_SYMBOL", "AAPL").upper()
SHORT_WINDOW = int(os.getenv("SHORT_WINDOW", 50))
LONG_WINDOW = int(os.getenv("LONG_WINDOW", 200))
WEBHOOK_URL = os.getenv("WEBHOOK_URL")

@dataclass
class SignalPayload:
    success: bool
    timestamp: str
    symbol: str
    current_price: float
    short_sma: float
    long_sma: float
    signal: str
    message: str
    error: str = None


def fetch_historical_closes(symbol: str, days: int = 400) -> list[float]:
    """Fetches historical daily closing prices using yfinance."""
    # Normalize symbol for yfinance compatibility (handles forex pairs)
    normalized_symbol = normalize_symbol_for_yfinance(symbol)
    
    end_date = datetime.now()
    start_date = end_date - timedelta(days=days)
    
    display_symbol = symbol if symbol == normalized_symbol else f"{symbol} (normalized to {normalized_symbol})"
    print(f"📈 Fetching market data for {display_symbol}...")
    df = yf.download(normalized_symbol, start=start_date.strftime('%Y-%m-%d'), end=end_date.strftime('%Y-%m-%d'), progress=False)
    
    if df.empty or len(df) < LONG_WINDOW:
        raise ValueError(f"Insufficient data returned for {display_symbol}. Required at least {LONG_WINDOW} days.")
    
    # Flatten and clean up closing prices
    closes = df['Close'].dropna().squeeze().tolist()
    return [float(price) for price in closes]


def calculate_sma(data: list[float], window: int) -> float:
    """Computes the Simple Moving Average for a given window slice."""
    if len(data) < window:
        raise ValueError(f"Data length {len(data)} is too short for {window}-period SMA.")
    return sum(data[-window:]) / window


def evaluate_signal() -> SignalPayload:
    """Evaluates the moving average crossover strategy and builds the payload."""
    timestamp = datetime.utcnow().isoformat() + "Z"
    
    try:
        closes = fetch_historical_closes(SYMBOL)
        current_price = closes[-1]
        
        short_sma = calculate_sma(closes, SHORT_WINDOW)
        long_sma = calculate_sma(closes, LONG_WINDOW)

        # Crossover Logic
        if short_sma > long_sma:
            signal = "BUY"
            message = f"Bullish alignment: Short SMA ({short_sma:.2f}) is above Long SMA ({long_sma:.2f})."
        elif short_sma < long_sma:
            signal = "SELL"
            message = f"Bearish alignment: Short SMA ({short_sma:.2f}) is below Long SMA ({long_sma:.2f})."
        else:
            signal = "HOLD"
            message = "Market neutral: Moving averages are aligned."

        return SignalPayload(
            success=True,
            timestamp=timestamp,
            symbol=SYMBOL,
            current_price=round(current_price, 2),
            short_sma=round(short_sma, 2),
            long_sma=round(long_sma, 2),
            signal=signal,
            message=message
        )

    except Exception as e:
        print(f"❌ Evaluation error: {e}")
        return SignalPayload(
            success=False,
            timestamp=timestamp,
            symbol=SYMBOL,
            current_price=0.0,
            short_sma=0.0,
            long_sma=0.0,
            signal="ERROR",
            message="Failed to evaluate indicators.",
            error=str(e)
        )


def dispatch_webhook(payload: SignalPayload) -> None:
    """Sends the JSON payload to your automation platform webhook."""
    if not WEBHOOK_URL:
        print("⚠️ No WEBHOOK_URL provided. Skipping dispatch.")
        return

    print(f"🚀 Dispatching webhook to automation endpoint...")
    response = requests.post(WEBHOOK_URL, json=asdict(payload))
    print(f"✅ Webhook response status: {response.status_code}")


if __name__ == "__main__":
    result = evaluate_signal()
    print(json.dumps(asdict(result), indent=2))
    dispatch_webhook(result)

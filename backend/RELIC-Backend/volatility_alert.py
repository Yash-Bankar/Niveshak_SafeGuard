import yfinance as yf

INTERVENTION = (
    "Market fluctuations are normal; do not panic sell based on short-term noise. "
    "Remember SEBI Rule #1: Invest based on fundamentals, not emotions. "
    "Read this quick NCFE guide on 'Rupee Cost Averaging' to understand how dips can be opportunities."
)


def check_volatility(ticker_symbol="RELIANCE.NS", drop_threshold=-2.0, demo_mode=False):
    if demo_mode:
        prev_close, current_price = 1400.00, 1358.00
    else:
        closes = yf.Ticker(ticker_symbol).history(period="5d")["Close"].dropna()
        if len(closes) < 2:
            raise ValueError("Not enough market data available.")
        prev_close = float(closes.iloc[-2])
        current_price = float(closes.iloc[-1])

    pct_change = ((current_price - prev_close) / prev_close) * 100
    triggered = pct_change <= drop_threshold

    return {
        "ticker": ticker_symbol,
        "prev_close": round(prev_close, 2),
        "current_price": round(current_price, 2),
        "pct_change": round(pct_change, 2),
        "triggered": triggered,
        "intervention": INTERVENTION if triggered else None,
    }


if __name__ == "__main__":
    print(check_volatility(ticker_symbol="RELIANCE.NS", drop_threshold=-2.0, demo_mode=False))
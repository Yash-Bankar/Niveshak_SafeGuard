import yfinance as yf
import re


def calculate_rsi(data, periods=14):
    delta = data.diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=periods).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=periods).mean()
    rs = gain / loss
    return 100 - (100 / (1 + rs))


def evaluate_fomo(user_prompt, ticker_symbol=None, demo_mode=False):
    score = 0
    reasons = []
    prompt_lower = user_prompt.lower()

    urgency_words = [r"rocket", r"multibagger", r"target in", r"instant", r"urgent", r"guaranteed", r"sure shot"]
    found_urgency = [word for word in urgency_words if re.search(word, prompt_lower)]
    if found_urgency:
        score += 30
        reasons.append(f"Linguistic Urgency (Detected hype words: {found_urgency[0]})")

    concentration_words = [r"all my savings", r"all in", r"entire capital", r"100% of my", r"put everything"]
    found_concentration = [word for word in concentration_words if re.search(word, prompt_lower)]
    if found_concentration:
        score += 20
        reasons.append("Concentration Risk (Attempting to allocate all capital into a single equity)")

    current_price, fifty_two_wk_high, current_rsi = 0, 0, 50
    if demo_mode:
        current_price, fifty_two_wk_high, current_rsi = 2800.00, 2810.00, 82.5
    elif ticker_symbol:
        try:
            ticker = yf.Ticker(ticker_symbol)
            hist = ticker.history(period="3mo")
            current_price = hist['Close'].iloc[-1]
            fifty_two_wk_high = ticker.info.get('fiftyTwoWeekHigh') or current_price
            hist['RSI'] = calculate_rsi(hist['Close'])
            current_rsi = hist['RSI'].iloc[-1]
            if current_rsi != current_rsi:
                current_rsi = 50
        except Exception:
            current_price, fifty_two_wk_high, current_rsi = 0, 0, 50

    if current_price and current_price >= (fifty_two_wk_high * 0.95) and current_rsi > 75:
        score += 30
        reasons.append(f"Technical Stretch (Price near 52-wk high & RSI is {current_rsi:.1f} - Overbought)")

    score = min(score, 100)

    if score <= 35:
        zone, label = "GREEN", "Planned / Systematic"
        advice = "Looks like a calculated move. Proceed with your standard research."
    elif score <= 70:
        zone, label = "YELLOW", "Momentum Chasing"
        advice = "You might be chasing a trend. Review your time horizon before executing."
    else:
        zone, label = "RED", "High FOMO Warning"
        advice = "SEBI warns against speculative 'hot tips'. This trade exhibits severe impulsive characteristics."

    return {
        "ticker": ticker_symbol,
        "score": score,
        "zone": zone,
        "label": label,
        "advice": advice,
        "reasons": reasons,
        "rsi": round(float(current_rsi), 1),
    }


if __name__ == "__main__":
    test_prompt = "Should I put all my savings into Reliance right now? I heard it's going to be a multibagger rocket!"
    print(evaluate_fomo(test_prompt, "RELIANCE.NS", demo_mode=True))
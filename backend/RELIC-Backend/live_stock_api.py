import re

import yfinance as yf

TICKER_MAP = {
    "reliance": "RELIANCE.NS",
    "ril": "RELIANCE.NS",
    "tcs": "TCS.NS",
    "tata consultancy": "TCS.NS",
    "infosys": "INFY.NS",
    "infy": "INFY.NS",
    "wipro": "WIPRO.NS",
    "hcl tech": "HCLTECH.NS",
    "hcl technologies": "HCLTECH.NS",
    "tech mahindra": "TECHM.NS",
    "ltimindtree": "LTIM.NS",
    "persistent": "PERSISTENT.NS",
    "coforge": "COFORGE.NS",
    "mphasis": "MPHASIS.NS",
    "tata elxsi": "TATAELXSI.NS",
    "hdfc bank": "HDFCBANK.NS",
    "hdfc": "HDFCBANK.NS",
    "icici bank": "ICICIBANK.NS",
    "icici": "ICICIBANK.NS",
    "sbi": "SBIN.NS",
    "state bank": "SBIN.NS",
    "kotak": "KOTAKBANK.NS",
    "kotak mahindra bank": "KOTAKBANK.NS",
    "axis bank": "AXISBANK.NS",
    "indusind": "INDUSINDBK.NS",
    "yes bank": "YESBANK.NS",
    "bank of baroda": "BANKBARODA.NS",
    "punjab national bank": "PNB.NS",
    "pnb": "PNB.NS",
    "canara bank": "CANBK.NS",
    "bajaj finance": "BAJFINANCE.NS",
    "bajaj finserv": "BAJAJFINSV.NS",
    "bajaj housing finance": "BAJAJHFL.NS",
    "shriram finance": "SHRIRAMFIN.NS",
    "jio financial": "JIOFIN.NS",
    "hdfc life": "HDFCLIFE.NS",
    "sbi life": "SBILIFE.NS",
    "lic": "LICI.NS",
    "life insurance corporation": "LICI.NS",
    "policybazaar": "POLICYBZR.NS",
    "paytm": "PAYTM.NS",
    "bharti airtel": "BHARTIARTL.NS",
    "airtel": "BHARTIARTL.NS",
    "itc": "ITC.NS",
    "itc hotels": "ITCHOTELS.NS",
    "hindustan unilever": "HINDUNILVR.NS",
    "hul": "HINDUNILVR.NS",
    "nestle": "NESTLEIND.NS",
    "britannia": "BRITANNIA.NS",
    "tata consumer": "TATACONSUM.NS",
    "dabur": "DABUR.NS",
    "godrej consumer": "GODREJCP.NS",
    "united spirits": "UNITDSPR.NS",
    "asian paints": "ASIANPAINT.NS",
    "pidilite": "PIDILITIND.NS",
    "titan": "TITAN.NS",
    "trent": "TRENT.NS",
    "dmart": "DMART.NS",
    "avenue supermarts": "DMART.NS",
    "nykaa": "NYKAA.NS",
    "zomato": "ETERNAL.NS",
    "eternal": "ETERNAL.NS",
    "swiggy": "SWIGGY.NS",
    "info edge": "NAUKRI.NS",
    "naukri": "NAUKRI.NS",
    "indian hotels": "INDHOTEL.NS",
    "irctc": "IRCTC.NS",
    "indigo": "INDIGO.NS",
    "interglobe": "INDIGO.NS",
    "maruti": "MARUTI.NS",
    "maruti suzuki": "MARUTI.NS",
    "tata motors": "TMPV.NS",
    "tata motors passenger": "TMPV.NS",
    "tata motors commercial": "TMCV.NS",
    "mahindra": "M&M.NS",
    "m&m": "M&M.NS",
    "bajaj auto": "BAJAJ-AUTO.NS",
    "hero motocorp": "HEROMOTOCO.NS",
    "eicher": "EICHERMOT.NS",
    "royal enfield": "EICHERMOT.NS",
    "tvs motor": "TVSMOTOR.NS",
    "ashok leyland": "ASHOKLEY.NS",
    "hyundai": "HYUNDAI.NS",
    "ola electric": "OLAELEC.NS",
    "mrf": "MRF.NS",
    "bosch": "BOSCHLTD.NS",
    "sun pharma": "SUNPHARMA.NS",
    "dr reddy": "DRREDDY.NS",
    "dr reddys": "DRREDDY.NS",
    "dr reddy's": "DRREDDY.NS",
    "cipla": "CIPLA.NS",
    "divis": "DIVISLAB.NS",
    "divi's": "DIVISLAB.NS",
    "lupin": "LUPIN.NS",
    "zydus": "ZYDUSLIFE.NS",
    "apollo hospitals": "APOLLOHOSP.NS",
    "max healthcare": "MAXHEALTH.NS",
    "larsen": "LT.NS",
    "l&t": "LT.NS",
    "larsen & toubro": "LT.NS",
    "ultratech": "ULTRACEMCO.NS",
    "ambuja": "AMBUJACEM.NS",
    "grasim": "GRASIM.NS",
    "dlf": "DLF.NS",
    "siemens": "SIEMENS.NS",
    "havells": "HAVELLS.NS",
    "polycab": "POLYCAB.NS",
    "dixon": "DIXON.NS",
    "bharat electronics": "BEL.NS",
    "bel": "BEL.NS",
    "hindustan aeronautics": "HAL.NS",
    "hal": "HAL.NS",
    "mazagon dock": "MAZDOCK.NS",
    "tata steel": "TATASTEEL.NS",
    "jsw steel": "JSWSTEEL.NS",
    "jindal steel": "JINDALSTEL.NS",
    "hindalco": "HINDALCO.NS",
    "vedanta": "VEDL.NS",
    "hindustan zinc": "HINDZINC.NS",
    "coal india": "COALINDIA.NS",
    "ongc": "ONGC.NS",
    "bpcl": "BPCL.NS",
    "indian oil": "IOC.NS",
    "ioc": "IOC.NS",
    "gail": "GAIL.NS",
    "ntpc": "NTPC.NS",
    "power grid": "POWERGRID.NS",
    "tata power": "TATAPOWER.NS",
    "adani enterprises": "ADANIENT.NS",
    "adani ports": "ADANIPORTS.NS",
    "adani green": "ADANIGREEN.NS",
    "adani power": "ADANIPOWER.NS",
    "irfc": "IRFC.NS",
    "suzlon": "SUZLON.NS",
}

_ALIAS_PATTERN = re.compile(
    r"(?<![\w&])(" + "|".join(re.escape(a) for a in sorted(TICKER_MAP, key=len, reverse=True)) + r")(?![\w&])"
)


def extract_ticker(text):
    match = _ALIAS_PATTERN.search(text.lower())
    return TICKER_MAP[match.group(1)] if match else None


def get_live_stock_data(ticker_symbol):
    try:
        if not ticker_symbol.endswith(".NS"):
            ticker_symbol += ".NS"

        stock = yf.Ticker(ticker_symbol)
        info = stock.info

        price = info.get("currentPrice", "Unknown")
        beta = info.get("beta", "Unknown")
        high_52 = info.get("fiftyTwoWeekHigh", "Unknown")
        low_52 = info.get("fiftyTwoWeekLow", "Unknown")

        if beta != "Unknown":
            risk_level = "High Risk (More volatile than the market)" if float(beta) > 1.2 else \
                         "Moderate Risk (Moves with the market)" if float(beta) > 0.8 else \
                         "Low Risk (Less volatile than the market)"
        else:
            risk_level = "Risk unknown"

        return (
            f"\n[LIVE SYSTEM DATA for {ticker_symbol}]: "
            f"Current Price: ₹{price}. 52-Week High: ₹{high_52}. 52-Week Low: ₹{low_52}. "
            f"Risk Profile (Beta {beta}): {risk_level}.\n"
        )

    except Exception:
        return ""
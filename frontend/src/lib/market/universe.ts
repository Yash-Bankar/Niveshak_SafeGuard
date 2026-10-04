/**
 * Curated NIFTY large-cap universe used for trending / gainers / losers /
 * most-active (Yahoo's predefined screeners are US-only, so we compute
 * movers ourselves from a batch quote over this static list).
 *
 * `symbol` is the NSE ticker without `.NS`; `name` is the display name.
 */

export interface UniverseEntry {
  symbol: string;
  name: string;
}

export const UNIVERSE: readonly UniverseEntry[] = [
  { symbol: "RELIANCE", name: "Reliance Industries" },
  { symbol: "TCS", name: "Tata Consultancy Services" },
  { symbol: "HDFCBANK", name: "HDFC Bank" },
  { symbol: "ICICIBANK", name: "ICICI Bank" },
  { symbol: "INFY", name: "Infosys" },
  { symbol: "SBIN", name: "State Bank of India" },
  { symbol: "BHARTIARTL", name: "Bharti Airtel" },
  { symbol: "ITC", name: "ITC" },
  { symbol: "LT", name: "Larsen & Toubro" },
  { symbol: "HINDUNILVR", name: "Hindustan Unilever" },
  { symbol: "BAJFINANCE", name: "Bajaj Finance" },
  { symbol: "KOTAKBANK", name: "Kotak Mahindra Bank" },
  { symbol: "AXISBANK", name: "Axis Bank" },
  { symbol: "MARUTI", name: "Maruti Suzuki India" },
  { symbol: "SUNPHARMA", name: "Sun Pharmaceutical" },
  { symbol: "TITAN", name: "Titan Company" },
  { symbol: "ASIANPAINT", name: "Asian Paints" },
  { symbol: "ULTRACEMCO", name: "UltraTech Cement" },
  { symbol: "WIPRO", name: "Wipro" },
  { symbol: "NTPC", name: "NTPC" },
  { symbol: "POWERGRID", name: "Power Grid Corporation" },
  { symbol: "TATAMOTORS", name: "Tata Motors" },
  { symbol: "TATASTEEL", name: "Tata Steel" },
  { symbol: "ADANIENT", name: "Adani Enterprises" },
  { symbol: "ADANIPORTS", name: "Adani Ports & SEZ" },
  { symbol: "COALINDIA", name: "Coal India" },
  { symbol: "ONGC", name: "Oil & Natural Gas Corp" },
  { symbol: "NESTLEIND", name: "Nestle India" },
  { symbol: "TECHM", name: "Tech Mahindra" },
  { symbol: "HCLTECH", name: "HCL Technologies" },
  { symbol: "INDUSINDBK", name: "IndusInd Bank" },
  { symbol: "CIPLA", name: "Cipla" },
  { symbol: "DRREDDY", name: "Dr. Reddy's Laboratories" },
  { symbol: "EICHERMOT", name: "Eicher Motors" },
  { symbol: "GRASIM", name: "Grasim Industries" },
  { symbol: "HINDALCO", name: "Hindalco Industries" },
  { symbol: "JSWSTEEL", name: "JSW Steel" },
  { symbol: "M&M", name: "Mahindra & Mahindra" },
  { symbol: "POLYCAB", name: "Polycab India" },
  { symbol: "SHRIRAMFIN", name: "Shriram Finance" },
  { symbol: "TATACONSUM", name: "Tata Consumer Products" },
  { symbol: "BPCL", name: "Bharat Petroleum" },
  { symbol: "DIVISLAB", name: "Divi's Laboratories" },
  { symbol: "BRITANNIA", name: "Britannia Industries" },
  { symbol: "HEROMOTOCO", name: "Hero MotoCorp" },
];

import yfinance as yf

class StockSuitabilityQuiz:
    def __init__(self, ticker_symbol: str):
        ticker_symbol = ticker_symbol.strip().upper()
        if not ticker_symbol.endswith(".NS"):
            ticker_symbol += ".NS"
        self.ticker = ticker_symbol
        self.stock_info = self._fetch_fundamentals()

    def _fetch_fundamentals(self):
        """Fetches live stock metrics needed to formulate dynamic risk questions."""
        try:
            stock = yf.Ticker(self.ticker)
            info = stock.info
            raw_beta = info.get("beta")
            beta_val = round(float(raw_beta), 2) if raw_beta not in (None, "N/A") else 1.0

            return {
                "name": info.get("shortName", self.ticker.replace(".NS", "")),
                "price": info.get("currentPrice", "N/A"),
                "beta": beta_val,
                "pe_ratio": info.get("trailingPE", "N/A"),
                "high_52": info.get("fiftyTwoWeekHigh", "N/A"),
                "low_52": info.get("fiftyTwoWeekLow", "N/A"),
            }
        except Exception:
            return {
                "name": self.ticker.replace(".NS", ""),
                "price": "N/A",
                "beta": 1.0,
                "pe_ratio": "N/A",
                "high_52": "N/A",
                "low_52": "N/A"
            }

    def generate_quiz(self):
        """
        Creates 3 dynamic suitability questions tailored to the stock's actual volatility.
        """
        data = self.stock_info
        beta = float(data["beta"]) if data["beta"] not in ("N/A", None) else 1.0
        expected_drop = round(beta * 10, 1)

        questions = [
            {
                "id": "risk_tolerance",
                "question": (
                    f"{data['name']} has a volatility factor (Beta) of {beta:.2f}. "
                    f"If the NIFTY drops 10%, this stock historically could drop around {expected_drop}%. "
                    "What would you do if your investment dropped by that much next week?"
                ),
                "options": {
                    "A": "Panic and sell immediately to stop further loss.",
                    "B": "Hold or add more if my long-term thesis is intact (Disciplined strategy).",
                    "C": "Borrow money to double down on high leverage."
                },
                "ideal_answer": "B",
                "weight": 35,
                "educational_tip": "SEBI principle: Volatility is standard in equities. Never invest money you cannot afford to see fluctuate over a 3-5 year horizon."
            },
            {
                "id": "time_horizon",
                "question": f"When do you realistically plan to withdraw the capital invested in {data['name']}?",
                "options": {
                    "A": "Within the next 3 to 6 months (Emergency cash or upcoming bills).",
                    "B": "In 1 to 2 years.",
                    "C": "3 years or more from today."
                },
                "ideal_answer": "C",
                "weight": 35,
                "educational_tip": "NCFE core rule: Short-term commitments belong in liquid debt or fixed deposits, not direct equity."
            },
            {
                "id": "allocation",
                "question": f"What portion of your overall savings do you plan to place into {data['name']}?",
                "options": {
                    "A": "Over 50% ('High conviction, all-in move').",
                    "B": "Between 20% and 50%.",
                    "C": "Under 10-15% as part of a well-diversified basket."
                },
                "ideal_answer": "C",
                "weight": 30,
                "educational_tip": "Diversification rule: Concentrating funds in a single stock magnifies idiosyncratic business risk."
            }
        ]
        return questions

    def evaluate_investor(self, user_answers: dict):
        """
        user_answers: dict like {'risk_tolerance': 'B', 'time_horizon': 'C', 'allocation': 'C'}
        Returns a readiness score (0-100) and regulatory guidance.
        """
        questions = self.generate_quiz()
        total_score = 0
        feedback = []

        for q in questions:
            qid = q["id"]
            user_choice = str(user_answers.get(qid, "")).upper().strip()
            if user_choice == q["ideal_answer"]:
                total_score += q["weight"]
            else:
                feedback.append({
                    "topic": qid,
                    "tip": q["educational_tip"]
                })

        if total_score >= 80:
            badge = "Informed & Ready Investor"
            status = "APPROVED_SUITABILITY"
            advice = "Your risk profile matches this stock. Proceed with disciplined position sizing."
        elif 40 <= total_score < 80:
            badge = "Developing Investor (Moderate Risk)"
            status = "CAUTION"
            advice = "You grasp core basics, but your horizon or exposure level introduces heightened capital risk."
        else:
            badge = "Speculative / High Risk of Capital Loss"
            status = "NOT_RECOMMENDED"
            advice = "SEBI Investor Alert: This profile resembles short-term speculation. Revisit NCFE fundamentals before trading."

        return {
            "stock": self.stock_info["name"],
            "score": total_score,
            "badge": badge,
            "status": status,
            "summary_advice": advice,
            "corrective_feedback": feedback
        }
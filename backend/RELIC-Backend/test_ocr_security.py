import re
import pytesseract
from PIL import Image
import sys

pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"


# --- 1. CORE LOGIC (Same as before) ---
def extract_sebi_number(text):
    pattern = r'\bIN[AHZ][0-9]{9}\b'
    return re.findall(pattern, text)


def detect_fraud_flags(text):
    red_flags = [
        "100%", "guaranteed", "sure shot", "jackpot",
        "zero risk", "daily profit", "no loss", "multibagger", "fixed return", "Money Return Successful",
        "Congratulations", "Payment Done Investment of", "Trust is Everything", "Deal Once with Us",
        "Return with profit"
    ]
    text_lower = text.lower()
    return [flag for flag in red_flags if flag.lower() in text_lower]


# --- 2. API ENTRY POINT (used by main1.py) ---
def analyze_image(img):
    clean_text = " ".join(pytesseract.image_to_string(img).split())
    if not clean_text:
        return {"text": "", "sebi_numbers": [], "fraud_flags": [], "severity": "UNREADABLE",
                "verdict": "Could not read any text from the image."}

    sebi_numbers = extract_sebi_number(clean_text)
    fraud_flags = detect_fraud_flags(clean_text)

    if fraud_flags and not sebi_numbers:
        severity, verdict = "RED", "EXTREME DANGER. Unregistered provider making illegal promises. SCAM."
    elif fraud_flags and sebi_numbers:
        severity, verdict = "RED", "DO NOT TRUST. Has a SEBI number, but violates SEBI advertising laws."
    elif not sebi_numbers:
        severity, verdict = "YELLOW", "CAUTION. No SEBI registration found. Cannot legally charge for advice."
    else:
        severity, verdict = "GREEN", "SAFE FORMAT. Provider is registered and compliant."

    return {"text": clean_text, "sebi_numbers": sebi_numbers, "fraud_flags": fraud_flags,
            "severity": severity, "verdict": verdict}


# --- 3. IMAGE PROCESSING PIPELINE ---
def scan_screenshot(image_path):
    print(f"\n{'=' * 60}")
    print(f"📸 SCANNING SCREENSHOT: {image_path}")
    print(f"{'=' * 60}")

    try:
        # Tell Tesseract to look at the image and extract English text
        img = Image.open(image_path)
        raw_text = pytesseract.image_to_string(img)

        # Clean up weird line breaks from OCR
        clean_text = " ".join(raw_text.split())

        if not clean_text.strip():
            print("❌ [OCR FAILED]: Could not read any text from the image.")
            return

        print(f"📄 RAW TEXT FOUND: \"{clean_text}\"")
        print(f"{'-' * 60}")

        # Run the extracted text through the rules
        sebi_numbers = extract_sebi_number(clean_text)
        fraud_flags = detect_fraud_flags(clean_text)

        # Registration Check
        if not sebi_numbers:
            print("❌ [SEBI CHECK]: FAILED - No valid SEBI Registration Number found.")
        else:
            print(f"✅ [SEBI CHECK]: PASSED - Found valid format: {', '.join(sebi_numbers)}")

        # Fraud Check
        if fraud_flags:
            print(f"🚨 [FRAUD ALERT]: HIGH RISK - Found illegal claims: {', '.join(fraud_flags).upper()}")
        else:
            print("✅ [FRAUD ALERT]: CLEAR - No illegal promises detected.")

        # Verdict
        print(f"{'-' * 60}")
        if fraud_flags and not sebi_numbers:
            print("🔴 [VERDICT]: EXTREME DANGER. Unregistered provider making illegal promises. SCAM.")
        elif fraud_flags and sebi_numbers:
            print("🔴 [VERDICT]: DO NOT TRUST. Has a SEBI number, but violates SEBI advertising laws.")
        elif not sebi_numbers:
            print("🟡 [VERDICT]: CAUTION. No SEBI registration found. Cannot legally charge for advice.")
        else:
            print("🟢 [VERDICT]: SAFE FORMAT. Provider is registered and compliant.")

    except Exception as e:
        print(f"\n❌ [SYSTEM ERROR]: Could not process image. \nDetails: {e}")


# --- 4. RUN THE TEST ---
# Ensure you saved an image named test_scam.png in the same folder!
if __name__ == "__main__":
    image_file = "scam_screenshots/image copy.png"
    scan_screenshot(image_file)
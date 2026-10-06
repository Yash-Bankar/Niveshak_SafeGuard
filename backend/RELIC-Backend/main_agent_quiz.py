from gradio_client import Client
from langchain_community.vectorstores import Chroma
from langchain_huggingface import HuggingFaceEmbeddings
from live_stock_api import get_live_stock_data
from asr_and_tts import run_multilingual_tts

TTS_LANGUAGE = "mr"

# --- 1. CONFIGURATION ---
COLAB_API_URL = "https://6049c98a29d60cb6f2.gradio.live"
client = Client(COLAB_API_URL)

embeddings = HuggingFaceEmbeddings(model_name="BAAI/bge-m3")
vector_db = Chroma(persist_directory="./chroma_db", embedding_function=embeddings)

# --- 2. INVESTOR RISK QUIZ ---
def run_investor_quiz():
    print("\n==================================================")
    print("📊 BHARAT FINANCE EDU - INVESTOR RISK PROFILER")
    print("==================================================")
    print("Before we begin, let's determine your risk appetite.")
    
    score = 0
    
    ans1 = input("\n1. How long do you plan to invest this money?\n   A) Less than 1 year (1 pt)\n   B) 1-3 years (2 pts)\n   C) 3+ years (3 pts)\nYour Answer (A/B/C): ").strip().upper()
    score += {"A": 1, "B": 2, "C": 3}.get(ans1, 1)

    ans2 = input("\n2. If your portfolio drops 20% in a month, what do you do?\n   A) Sell everything (1 pt)\n   B) Hold and wait (2 pts)\n   C) Buy more (3 pts)\nYour Answer (A/B/C): ").strip().upper()
    score += {"A": 1, "B": 2, "C": 3}.get(ans2, 1)

    if score <= 3:
        profile = "CONSERVATIVE (Low Risk Tolerance)"
    elif score <= 5:
        profile = "MODERATE (Medium Risk Tolerance)"
    else:
        profile = "AGGRESSIVE (High Risk Tolerance)"
        
    print(f"\n✅ Assessment Complete! Your Profile: {profile}\n")
    return profile

# --- 3. CORE AGENTIC PIPELINE ---
def generate_personalized_advice(user_question, risk_profile):
    print(f"\n[AGENT] Searching SEBI/RBI Guidelines in ChromaDB...")
    docs = vector_db.similarity_search(user_question, k=2)
    rag_context = "\n".join([doc.page_content for doc in docs])
    
    print("[AGENT] Checking for stock tickers to fetch live data...")
    # Simple heuristic to grab a ticker if the user mentions Reliance
    target_ticker = "RELIANCE.NS" if "reliance" in user_question.lower() else None
    live_context = ""
    if target_ticker:
        live_context = get_live_stock_data(target_ticker)
        print(f"  -> Fetched Live Market Data for {target_ticker}")

    print("[AGENT] Sending Context + Risk Profile to AI Server...")
    # Inject the user's risk profile directly into the context!
    combined_context = f"User Risk Profile: {risk_profile}\n\nOfficial SEBI/RBI Context:\n{rag_context}\n\n{live_context}"
    
    try:
        # Pass positionally as validated earlier
        response = client.predict(
            user_question,       # Arg 1: User Prompt
            combined_context,    # Arg 2: Context
            fn_index=0           # Safely targets the main function
        )
        print("\n================ AI EDUCATOR RESPONSE ================")
        print(response)
        print("======================================================")
        try:
            run_multilingual_tts(response, lang_code=TTS_LANGUAGE)
        except Exception as e:
            print(f"\n❌ [AUDIO OUTPUT ERROR] Could not speak the answer: {e}")
    except Exception as e:
        print(f"\n❌ [ERROR] Model prediction failed: {e}")

# --- 4. EXECUTION ---
user_risk_profile = run_investor_quiz()

while True:
    question = input("\nAsk your financial question (or type 'exit'): ").strip()
    if question.lower() == "exit":
        break
    if question:
        generate_personalized_advice(question, user_risk_profile)
import os
import json
import re
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import yfinance as yf
from gradio_client import Client

# Handle Protobuf/LangChain compatibility warnings
os.environ["TEMPORARILY_DISABLE_PROTOBUF_VERSION_CHECK"] = "true"

try:
    from langchain_chroma import Chroma
except ImportError:
    from langchain_community.vectorstores import Chroma

from langchain_huggingface import HuggingFaceEmbeddings

# =====================================================================
# 1. CONFIGURATION & STATE
# =====================================================================

# Update this link whenever your Colab instance restarts!
COLAB_API_URL = "https://53009bcd71fd65cbac.gradio.live"
client = Client(COLAB_API_URL)

# In-memory storage (Replace with Redis/PostgreSQL in production)
quiz_sessions: Dict[str, List[Dict[str, Any]]] = {}
chat_history: Dict[str, List[Dict[str, str]]] = {}

# Initialize Embeddings & Local ChromaDB (SEBI/RBI Data)
try:
    embeddings = HuggingFaceEmbeddings(model_name="BAAI/bge-m3")
    vector_db = Chroma(persist_directory="./chroma_db", embedding_function=embeddings)
    print("✅ Local ChromaDB loaded successfully.")
except Exception as e:
    print(f"⚠️ Warning: Could not load ChromaDB. Error: {e}")
    vector_db = None


# =====================================================================
# 2. PYDANTIC DATA MODELS
# =====================================================================

class QuizRequest(BaseModel):
    session_id: str
    target_stock: str

class QuizAnswer(BaseModel):
    question_index: int
    selected_option: str  # "A", "B", "C", or "D"

class QuizSubmit(BaseModel):
    session_id: str
    answers: List[QuizAnswer]

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    session_id: str
    message: str


# =====================================================================
# 3. CORE HELPER FUNCTIONS (RAG + YFINANCE + LLM BRIDGE)
# =====================================================================

def get_rag_context(query: str, k: int = 3) -> str:
    if not vector_db:
        return ""
    try:
        docs = vector_db.similarity_search(query, k=k)
        return "\n".join([doc.page_content for doc in docs])
    except Exception as e:
        print(f"RAG Error: {e}")
        return ""

def get_live_stock_data(query: str) -> str:
    # A simple entity extractor for the demo (expand with a real NER model later)
    query_lower = query.lower()
    ticker = None
    if "reliance" in query_lower: ticker = "RELIANCE.NS"
    elif "tata motors" in query_lower: ticker = "TATAMOTORS.NS"
    elif "zomato" in query_lower: ticker = "ZOMATO.NS"
    elif "suzlon" in query_lower: ticker = "SUZLON.NS"
    
    if not ticker:
        return ""
        
    try:
        stock = yf.Ticker(ticker)
        info = stock.info
        price = info.get("currentPrice", "Unknown")
        beta = info.get("beta", 1.0)
        return f"[LIVE MARKET DATA for {ticker}]: Current Price: ₹{price}. Risk Profile (Beta): {beta:.2f}."
    except Exception as e:
        print(f"yfinance Error: {e}")
        return ""

def call_colab_llm(user_prompt: str, context: str, system_prompt: str) -> str:
    """Bridges the local FastAPI server to the Colab GPU Inference Server."""
    try:
        # Calls the 3-argument function defined in your new Colab cell
        response = client.predict(
            user_prompt,
            context,
            system_prompt,
            fn_index=0
        )
        return response
    except Exception as e:
        print(f"LLM Bridge Error: {e}")
        raise HTTPException(status_code=503, detail="AI Server is currently unreachable.")

def extract_json_from_llm(text: str) -> List[Dict]:
    """Cleans up the LLM output in case it wraps the JSON in markdown blocks."""
    try:
        match = re.search(r'\[\s*\{.*\}\s*\]', text, re.DOTALL)
        if match:
            return json.loads(match.group(0))
        return json.loads(text)
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="LLM failed to output valid JSON.")


# =====================================================================
# 4. FASTAPI APP & ENDPOINTS
# =====================================================================

app = FastAPI(title="BharatFinanceEdu API", version="1.0")

@app.get("/")
def health_check():
    return {"status": "Active", "message": "RelicLLM API is running locally."}


# --- QUIZ ENDPOINTS ---

@app.get("/quiz")
def get_quiz_info():
    return {
        "message": "Welcome to the Adaptive Suitability Check. Request a stock to begin.",
        "supported_stocks": ["Reliance", "Tata Motors", "Zomato", "Suzlon"]
    }

@app.post("/quiz")
def generate_quiz(req: QuizRequest):
    # 1. Fetch live beta and context for the target stock
    live_data = get_live_stock_data(req.target_stock)
    rag_context = get_rag_context(f"risks of investing in {req.target_stock}")
    combined_context = f"{live_data}\n\nSEBI Guidelines:\n{rag_context}"
    
    # 2. Force the LLM to act as a strict JSON generator
    system_prompt = (
        "You are a strict JSON Quiz Generator for an Indian financial education app. "
        "Generate exactly 3 multiple-choice questions assessing the user's readiness to invest in the requested stock. "
        "Question 1 must be about Risk Tolerance (use the provided Beta metric). "
        "Question 2 must be about the Business Model. "
        "Question 3 must be about Capital Allocation/Time Horizon. "
        "Output ONLY a valid JSON array of objects with keys: 'question', 'options' (A, B, C, D dict), and 'correct_answer' (A, B, C, or D). "
        "Do not include markdown ticks."
    )
    
    raw_response = call_colab_llm(req.target_stock, combined_context, system_prompt)
    quiz_json = extract_json_from_llm(raw_response)
    
    # 3. Save the quiz to the session for scoring later
    quiz_sessions[req.session_id] = quiz_json
    
    # Strip correct answers before sending to the frontend
    frontend_quiz = []
    for q in quiz_json:
        frontend_quiz.append({"question": q["question"], "options": q["options"]})
        
    return {"session_id": req.session_id, "quiz": frontend_quiz}

@app.post("/quiz/submit")
def submit_quiz(req: QuizSubmit):
    if req.session_id not in quiz_sessions:
        raise HTTPException(status_code=404, detail="Quiz session not found.")
        
    stored_quiz = quiz_sessions[req.session_id]
    if len(req.answers) != len(stored_quiz):
        raise HTTPException(status_code=400, detail="Missing answers.")

    score = 0
    feedback = []
    for ans in req.answers:
        q = stored_quiz[ans.question_index]
        is_correct = ans.selected_option.upper() == q["correct_answer"].upper()
        if is_correct:
            score += 1
        feedback.append({
            "question": q["question"],
            "user_answer": ans.selected_option,
            "correct_answer": q["correct_answer"],
            "is_correct": is_correct
        })

    eligible = score == len(stored_quiz)
    readiness = "Informed Investor" if eligible else "Speculative Buyer"
    
    return {
        "score": score,
        "total": len(stored_quiz),
        "eligible": eligible,
        "readiness_rating": readiness,
        "feedback": feedback
    }


# --- ASSISTANT ENDPOINTS ---

@app.get("/assistant/history/{session_id}")
def get_chat_history(session_id: str):
    return {"session_id": session_id, "history": chat_history.get(session_id, [])}

@app.post("/assistant")
def chat_with_assistant(req: ChatRequest):
    # 1. RAG and Live Data Synthesis
    rag_context = get_rag_context(req.message)
    live_data = get_live_stock_data(req.message)
    combined_context = f"{rag_context}\n\n{live_data}" if live_data else rag_context

    # 2. Retrieve history and format for prompt context
    history = chat_history.get(req.session_id, [])
    history_text = "\n".join([f"{msg['role']}: {msg['content']}" for msg in history[-4:]]) # Keep last 4 messages

    full_user_prompt = f"Previous Conversation:\n{history_text}\n\nCurrent User Query: {req.message}" if history else req.message

    # 3. Setup standard assistant persona
    system_prompt = (
        "You are BharatFinanceEdu, an expert Indian financial educator. "
        "Explain concepts simply, using analogies and dispelling misconceptions. "
        "Base your answers on the provided context. If the user acts impulsively, warn them based on SEBI rules."
    )

    # 4. Generate Response
    ai_response = call_colab_llm(full_user_prompt, combined_context, system_prompt)

    # 5. Update session memory
    if req.session_id not in chat_history:
        chat_history[req.session_id] = []
    chat_history[req.session_id].append({"role": "User", "content": req.message})
    chat_history[req.session_id].append({"role": "AI", "content": ai_response})

    return {
        "reply": ai_response,
        "rag_sources_used": bool(rag_context),
        "live_data_used": bool(live_data)
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
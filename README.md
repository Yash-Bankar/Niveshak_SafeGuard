<div align="center">

# 🛡️ Niveshak SafeGuard

### *Protecting India'`s First-Time Investor from FOMO, Scams & Impulsive Decisions*

**Team: RELIC** &nbsp;|&nbsp; Hackathon: SANGYAN &nbsp;|&nbsp; Track: **Open Innovation**

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
[![Next.js](https://img.shields.io/badge/Frontend-Next.js%2016-000000?style=for-the-badge&logo=nextdotjs)](https://nextjs.org/)
[![ChromaDB](https://img.shields.io/badge/VectorDB-ChromaDB-FF6B35?style=for-the-badge)](https://www.trychroma.com/)
[![Neon](https://img.shields.io/badge/StreamingDB-Neon%20Postgres-00E5BF?style=for-the-badge)](https://neon.tech/)
[![Qwen](https://img.shields.io/badge/LLM-Qwen%202.5%207B-6C63FF?style=for-the-badge)](https://qwenlm.github.io/)
[![Multilingual](https://img.shields.io/badge/Languages-EN%20%7C%20%E0%A4%B9%E0%A4%BF%E0%A4%82%E0%A4%A6%E0%A5%80%20%7C%20%E0%A4%AE%E0%A4%B0%E0%A4%BE%E0%A4%A0%E0%A5%80-F4A261?style=for-the-badge)]()

---

> **Disclaimer:** Niveshak SafeGuard is an educational tool only. It is **not** a SEBI-registered investment adviser. Nothing it outputs constitutes investment advice, a buy/sell signal, or a price prediction.

</div>

---

## 📋 Table of Contents

1. [The Problem We Solve](#-the-problem-we-solve)
2. [What Track Does This Fit?](#-what-track-does-this-fit)
3. [System Architecture](#-system-architecture)
4. [RAG Pipeline — How We Ground the AI](#-rag-pipeline--how-we-ground-the-ai)
5. [Streaming Database — Neon Postgres](#-streaming-database--neon-postgres)
6. [LLM and Fine-Tuning](#-llm-and-fine-tuning)
7. [Feature Deep Dive](#-feature-deep-dive)
8. [Frontend Architecture](#-frontend-architecture)
9. [Backend Architecture](#-backend-architecture)
10. [Data Flow Diagrams](#-data-flow-diagrams)
11. [Project Structure](#-project-structure)
12. [Setup and Running](#-setup-and-running)
13. [API Reference Summary](#-api-reference-summary)
14. [Privacy and Guardrails](#-privacy-and-guardrails)
15. [Team](#-team)

---

## 🎯 The Problem We Solve

India added **~10 crore new retail investors** between 2020 and 2024. The vast majority are first-timers who:

| ❌ Pain Point | 📊 Reality |
|---|---|
| Buy stocks they do not understand | 73% of retail investors have never read a company`s quarterly results |
| Chase hype-driven tips from WhatsApp/Telegram | Scam investment groups exceed 5 lakh+ members on Telegram |
| Panic-sell during routine market corrections | ₹1.5 lakh crore in retail losses recorded in a single FY correction |
| Face language barriers in financial education | Only ~12% of India speaks English confidently |
| Fall for unregistered advisors making illegal promises | SEBI receives 10,000+ complaints annually about investment fraud |

**Niveshak SafeGuard** is an AI-powered, multilingual investor safety companion that addresses every one of these problems — in **English, हिंदी and मराठी**.

---

## 🏆 What Track Does This Fit?

While Niveshak SafeGuard spans multiple problem domains from SANGYAN`s problem statement, we submit under the **Open Innovation** track because our project synthesises solutions across:

| SANGYAN Track | Our Contribution |
|---|---|
| **FinTech / Financial Inclusion** | Multilingual financial literacy + SEBI-grounded RAG for 100M+ new retail investors |
| **AI and ML** | Fine-tuned 7B LLM (QLoRA), multilingual RAG with `bge-m3`, real-time FOMO scoring |
| **Cybersecurity / Fraud Detection** | OCR-powered scam scanner detecting illegal SEBI registration claims |
| **Social Impact** | Behavioural guardrails that slow impulsive decisions; built for Bharat, not just metros |
| **Data Engineering** | Streaming database (Neon Postgres), real-time NSE/BSE market data pipeline |

Our project is a full-stack, production-grade system — not a prototype — that touches AI, data engineering, security, and social impact simultaneously.

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                       USER'S BROWSER                            │
│              (React 19 · Next.js 16 App Router)                 │
└────────────────────────┬────────────────────────────────────────┘
                         │ HTTPS fetch (locale-prefixed URLs)
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    NEXT.JS SERVER LAYER                         │
│  ┌──────────────────┐   ┌──────────────────────────────────┐   │
│  │  App Router Pages │   │   /api/* Route Handlers          │   │
│  │  (Server + Client │   │   (server-only; secrets never    │   │
│  │   Components)    │   │    reach the browser)            │   │
│  └──────────────────┘   └──────┬────────────────┬──────────┘   │
└─────────────────────────────────┼────────────────┼──────────────┘
                                  │                │
               ┌──────────────────┘                └──────────────────┐
               ▼                                                       ▼
┌──────────────────────────┐                         ┌────────────────────────────┐
│   NEON POSTGRES          │                         │   FASTAPI ORCHESTRATOR     │
│   (Streaming Database)   │                         │   (Local Python backend)   │
│                          │                         │                            │
│  · fomo_profiles         │                         │  · Session management      │
│  · safety_attempts       │                         │  · RAG retrieval           │
│  · chat_messages         │                         │  · Live market data        │
│  · watchlist             │                         │  · FOMO scoring            │
│  · holdings              │                         │  · Quiz engine             │
│  (serverless autoscale,  │                         │  · OCR scam scanner        │
│   edge-replicated)       │                         │  · Voice (ASR + TTS)       │
└──────────────────────────┘                         └──────────┬─────────────────┘
                                                                │
               ┌────────────────────────────────────────────────┤
               │                          │                      │
               ▼                          ▼                      ▼
┌──────────────────────┐   ┌──────────────────────┐  ┌────────────────────────┐
│   CHROMADB           │   │   COLAB T4 GPU        │  │   YFINANCE             │
│   (Vector Store)     │   │   (LLM Inference)     │  │   (Live NSE/BSE Data)  │
│                      │   │                        │  │                        │
│  BAAI/bge-m3         │   │  Qwen 2.5 7B (QLoRA)  │  │  Live price, OHLC      │
│  embeddings          │   │  Gradio API endpoint   │  │  52-wk range, Beta     │
│  SEBI/RBI chunks     │   │  3 inputs → 1 output   │  │  Financials, news      │
└──────────────────────┘   └──────────────────────┘  └────────────────────────┘
```

---

## 🧠 RAG Pipeline — How We Ground the AI

One of the most critical components of Niveshak SafeGuard is the **Retrieval-Augmented Generation (RAG)** pipeline. Instead of relying solely on the LLM`s training data (which can be outdated or hallucinated), every user question is first grounded in actual SEBI and RBI regulatory documents.

### How RAG Works in Our System

```mermaid
flowchart LR
    subgraph Offline ["📦 Offline Indexing (One-Time Build)"]
        A["SEBI / RBI\nRegulatory PDFs"] --> B["Text Extraction\n& Noise Removal"]
        B --> C["Chunking\n(~512 tokens)"]
        C --> D["BAAI/bge-m3\nMultilingual Embeddings"]
        D --> E[("ChromaDB\nVector Store")]
    end

    subgraph Online ["⚡ Online Retrieval (Every Request)"]
        F["User Question"] --> G["Query Embedding\n(bge-m3)"]
        G --> H["Cosine Similarity\nSearch in ChromaDB"]
        H --> I["Top-3 Relevant\nSEBI/RBI Chunks"]
        I --> J["Prompt Assembly:\nContext + Live Data + Question"]
        J --> K["Qwen 2.5 7B\n(Colab GPU)"]
        K --> L["Grounded Answer\nto User"]
    end

    E --> H
```

### Why BAAI/bge-m3?

We chose the **BGE-M3** embedding model specifically because:
- It is **truly multilingual** — supports English, Hindi, and Marathi in the same vector space
- Queries in Hindi about a topic can retrieve the correct English SEBI document chunks
- It is compact enough to run locally on CPU alongside the FastAPI server

### RAG at Query Time

For every `/chat` request, the FastAPI orchestrator:
1. Embeds the user`s message with `bge-m3`
2. Retrieves the **3 most semantically similar** SEBI/RBI document chunks from ChromaDB
3. Detects any NSE stock name mentioned (from a map of ~100 prominent stocks)
4. Fetches **live market data** for that stock (price, 52-wk range, RSI, Beta) via `yfinance`
5. Assembles a rich **grounded context block** containing the RAG chunks + live data
6. Passes `(user_prompt, context, system_prompt)` to the Qwen model on Colab

The response field `"rag_sources_used": true` confirms when RAG context influenced the answer.

---

## 🗄️ Streaming Database — Neon Postgres

Niveshak SafeGuard uses **Neon Postgres** as its persistent, serverless streaming database for all structured data that must survive across browser sessions.

### Why Neon (Not a Simple SQLite or Redis)?

| Requirement | Why Neon? |
|---|---|
| **Serverless autoscaling** | The Next.js frontend is deployed on the edge; Neon scales to zero between requests, matching Next.js`s serverless model perfectly |
| **Branching for dev/prod** | Neon`s database branching allows isolated testing without touching production data |
| **Connection pooling** | Neon`s built-in pooler handles many simultaneous Next.js serverless function connections without exhausting connection limits |
| **Edge replication** | Low-latency reads from the edge, crucial for the always-visible FIN score in the TopBar |
| **Real-time schema migrations** | Drizzle ORM + Neon`s direct connection URL enables zero-downtime schema updates |

### Database Schema

```
┌─────────────────────────────────────────────────────────────────────┐
│                         NEON POSTGRES                               │
│                                                                     │
│  ┌─────────────────────┐      ┌──────────────────────────────────┐ │
│  │   fomo_profiles     │      │       safety_attempts            │ │
│  │─────────────────────│      │──────────────────────────────────│ │
│  │ visitor_id (PK)     │◄─────│ visitor_id (FK)                  │ │
│  │ base_score          │      │ id (PK)                          │ │
│  │ language_signal     │      │ ticker                           │ │
│  │ returns_signal      │      │ score / total / level / eligible │ │
│  │ portfolio_signal    │      │ verdict (text)                   │ │
│  │ fin_score (0-100)   │      │ strengths / gaps (jsonb)         │ │
│  │ updated_at          │      │ created_at                       │ │
│  └─────────────────────┘      └──────────────────────────────────┘ │
│                                                                     │
│  ┌─────────────────────┐      ┌──────────────────────────────────┐ │
│  │   chat_messages     │      │          watchlist               │ │
│  │─────────────────────│      │──────────────────────────────────│ │
│  │ id (PK)             │      │ visitor_id + symbol (composite)  │ │
│  │ visitor_id          │      │ added_at                         │ │
│  │ role (user/asst)    │      └──────────────────────────────────┘ │
│  │ content (text)      │                                           │
│  │ rag_used / live_used│      ┌──────────────────────────────────┐ │
│  │ created_at          │      │           holdings               │ │
│  └─────────────────────┘      │──────────────────────────────────│ │
│                                │ visitor_id + symbol + lot_id     │ │
│                                │ quantity / avg_cost              │ │
│                                │ created_at                       │ │
│                                └──────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

### Streaming / Real-Time Events

The FIN score is **event-driven** and recomputed live on every significant user action:

```
Chat turn completed
       │
Watchlist modified ──────► recomputeFomo(visitorId) ──► Neon UPDATE ──► TopBar re-renders
       │                         │
Quiz submitted                   ├── language_signal  (chat wording analysis)
       │                         ├── returns_signal   (portfolio 52-wk RSI)
Holdings changed                 └── portfolio_signal (value asymmetry + sector concentration)
```

The updated FIN score is immediately reflected in the TopBar meter — no page refresh required. This is achieved through Neon`s low-latency reads and Next.js Server Actions.

---

## 🤖 LLM and Fine-Tuning

### Model: Qwen 2.5 7B (QLoRA)

| Parameter | Value |
|---|---|
| Base Model | `Qwen2.5-7B-Instruct-bnb-4bit` |
| Fine-tuning Method | **QLoRA** (4-bit quantized base + LoRA adapters) |
| Framework | **Unsloth** (2-5x faster than vanilla PEFT) |
| Training Hardware | Free **Google Colab T4 GPU** |
| Training Steps | 150 |
| Context Length | 4096 tokens |
| Languages | English · Hindi · Marathi |

### Training Dataset

The model was fine-tuned on a custom multilingual dataset built from:

1. **SEBI/RBI PDFs** — Synthetic Q&A generated via GPT-4o-mini with Pydantic Structured Outputs, forcing every sample into a fixed teaching schema: *Explanation · Analogy · Example · Common Misconception*
2. **FiQA Dataset** (Hugging Face) — Filtered to remove irrelevant Wall Street jargon; retained Indian retail-investor relevant questions only
3. **Translated Data** — Hindi and Marathi finance Q&A pairs in identical JSONL schema

### Answer Modes

The model has two distinct modes, switched at the system-prompt level:

```
Plain Mode (first question):
  → Short, 2-4 sentence answer
  → No section headers
  → Warm, conversational tone in the session language

Detailed Mode (user asks "explain in detail" / "विस्तार से"):
  → Four labelled sections: Explanation · Analogy · Example · Common Misconception
  → Full educational breakdown
  → ~2048 tokens of structured output
```

### Hosting on Colab

```
Colab T4 GPU
   │
   ├─ load_in_4bit = True (Unsloth FastLanguageModel)
   ├─ max_seq_len = 4096
   ├─ FastLanguageModel.for_inference()  [Unsloth fast inference path]
   │
   └─ gradio.Interface(
        inputs: [user_prompt, context, system_prompt],
        outputs: [text],
        share=True   →  public gradio.live endpoint
      )
```

The local FastAPI server connects to the Colab endpoint via `COLAB_API_URL`. The link changes on each Colab restart — update accordingly.

---

## 🔬 Feature Deep Dive

### 1. 🤝 Multilingual AI Financial Assistant

```
User: "Mujhe Reliance mein invest karna chahiye?"
         │
         ├─► RAG: Top-3 SEBI/NISM chunks on equity investment principles
         ├─► yfinance: RELIANCE.NS → live price, 52-wk range, Beta
         ├─► Context block assembled (RAG chunks + live market data)
         └─► Qwen 7B → Hindi plain-mode answer, SEBI-grounded reasoning
```

- Supports **English, Hindi, Marathi** seamlessly in one session
- Multi-turn memory: last 6 messages sent to model; last 40 stored in Neon
- `rag_sources_used` and `live_data_used` flags returned with every response

---

### 2. 📊 FIN Score — FOMO · Impulsivity · Negligence

The FIN score is Niveshak SafeGuard`s flagship behavioural metric. It is a **0–100 composite score** computed from four signals:

```
FIN Score = 0.45 × base_score
           + 0.20 × language_signal
           + 0.05 × returns_signal
           + 0.30 × portfolio_signal
```

| Signal | Source | What It Measures |
|---|---|---|
| `base_score` | 6-question FIN quiz | Fundamental financial knowledge baseline |
| `language_signal` | Chat message analysis | Hype words, urgency, "all-in" phrases |
| `returns_signal` | Portfolio returns via yfinance | Chasing 52-wk highs, high RSI stocks |
| `portfolio_signal` | Holdings distribution in Neon | Sector concentration, value asymmetry |

**Score Bands:**

```
  0 ──────── 35 ──────── 70 ──────── 100
  │  GREEN   │  YELLOW  │    RED    │
  │ Planned  │ Momentum │ High FOMO │
  │ Investor │ Chasing  │  Warning  │
```

---

### 3. 📝 "License Before You Buy" Safety Quiz

Before investing in any stock, users take a **personalised, live-data-driven quiz** about that exact stock.

```mermaid
sequenceDiagram
    actor U as Investor
    participant NS as Niveshak SafeGuard
    participant YF as yfinance
    participant LLM as Qwen 7B (Colab)
    participant DB as Neon

    U->>NS: "I want to buy BRITANNIA"
    NS->>YF: fetch full stock snapshot (price, PE, beta, debt, news, results date)
    YF-->>NS: live financial data
    NS->>LLM: generate 6 MCQs from 12 data-driven templates
    LLM-->>NS: questions in session language (EN/HI/MR)
    NS-->>U: quiz (correct answers never sent to browser)
    U->>NS: submit answers
    NS->>DB: store attempt (score, verdict, strengths, gaps)
    DB-->>NS: attempt id
    NS-->>U: verdict + per-question explanations
```

**Verdict Levels:**

| Score | Level | Advice |
|---|---|---|
| >= 80% | ✅ Well Prepared | Proceed with disciplined position sizing |
| 50-79% | ⚠️ Partially Prepared | Revise weak areas; start with small position |
| < 50% | ❌ Not Yet Ready | Learn fundamentals before committing money |

---

### 4. 🔍 FOMO Scorer

A real-time impulsivity scanner for a specific trade message:

| Signal | Max Points | Detection Method |
|---|---|---|
| Linguistic Urgency | +30 | "rocket", "multibagger", "sure shot", "urgent" |
| Concentration Risk | +20 | "all my savings", "all in", "put everything" |
| Technical Stretch | +30 | Price within 5% of 52-wk high AND RSI > 75 |

---

### 5. 🚨 Scam Screenshot Scanner

```
WhatsApp Screenshot
        │
        ▼
  Tesseract OCR  ──► Raw text extraction
        │
        ▼
  Pattern Matching:
    ├─ SEBI registration numbers (INA/INH/INZ + 9 digits)?  → Registered
    ├─ "guaranteed", "sure shot", "100%", "zero risk"?       → Illegal claim
    └─ "daily profit", daily profit promises?                → Fraudulent promise
        │
        ▼
  Severity: RED | YELLOW | GREEN | UNREADABLE
```

The image is **never stored** — processed in memory and discarded immediately.

---

### 6. 📢 Volatility Monitor

A background task runs every 60 seconds, watching a configured watchlist:

- **Trigger:** Any stock falls >= 2% from previous close
- **Response:** Educational intervention ("rupee cost averaging", "do not panic sell")
- **Demo mode:** `SIMULATE_STREAM = True` forces a simulated drop for live demonstrations outside market hours

---

### 7. 🎤 Voice — Speak and Listen

- **Input:** Browser records audio → Whisper small transcription → full chat pipeline → text + base64 MP3 returned
- **Output:** Any on-screen text → gTTS → `audio/mpeg` in the session language
- Markdown symbols are stripped before TTS for natural speech

---

## 🖥️ Frontend Architecture

**Stack:** Next.js 16 (App Router) · React 19 · Tailwind CSS v4 · Framer Motion · Recharts · next-intl · Zustand · Drizzle ORM

### Server-Side Boundary

```
Browser (Client Components)
    │
    │  Never talks directly to FastAPI backend
    │  Never sees LLM_BACKEND_URL or API keys
    │
    ▼
Next.js /api/* Route Handlers  ← server-only boundary
    │
    ├── → Neon Postgres (drizzle-orm)
    ├── → Yahoo Finance JSON API (server-side)
    └── → FastAPI LLM backend (x-api-key, server-only)
```

### Anonymous Identity

No accounts, no login. A random `sg_vid` httpOnly cookie is minted on first visit (via `src/proxy.ts`). All data in Neon is keyed by this anonymous visitor ID — zero link to personal identity.

### Pages

| Route | Description |
|---|---|
| `/[locale]` | Marketing landing page |
| `/[locale]/dashboard` | Market pulse, watchlist, FIN score card, quick actions |
| `/[locale]/markets` | Search, indices, gainers/losers |
| `/[locale]/stock/[symbol]` | Rich stock page: Area/Line/Candle/Kagi charts, fundamentals, quiz CTA |
| `/[locale]/safety-quiz/[symbol]` | Source → screenshot scan → 6-question quiz |
| `/[locale]/safety-quiz/[symbol]/result` | Verdict report card with strengths, gaps, per-question explanations |
| `/[locale]/portfolio` | Educational holdings manager (lots, value, P&L) |
| `/[locale]/fomo-quiz` | 6-question FIN baseline quiz |
| `/[locale]/safety/scan` | Standalone scam screenshot scanner |

---

## ⚙️ Backend Architecture

**Stack:** FastAPI · ChromaDB · BAAI/bge-m3 · Whisper small · gTTS · Tesseract · yfinance · gradio_client

### Orchestrator Responsibilities

```
FastAPI Orchestrator
├── Session Manager          (in-memory: chat history, language, quiz sessions)
├── RAG Retriever            (ChromaDB + bge-m3 → top-3 chunks)
├── Market Data Agent        (yfinance → stock detection → live context)
├── Quiz Engine              (12 data-driven templates × 3 languages)
├── FOMO Scorer              (linguistic + technical signals)
├── Volatility Monitor       (background task, 60s poll)
├── Scam Scanner             (Tesseract OCR + pattern matching)
├── ASR                      (Whisper small)
└── TTS                      (gTTS → audio/mpeg)
```

### Split-Tier Design

```
Local Machine (CPU)                        Google Colab (free T4 GPU)
┌──────────────────────┐                  ┌────────────────────────────┐
│  FastAPI Orchestrator│  ─── HTTP ────►  │  Qwen 2.5 7B (fine-tuned)  │
│  (~500 MB RAM)       │                  │  Gradio API                │
│  ChromaDB on disk    │  ◄── text ─────  │  load_in_4bit=True         │
└──────────────────────┘                  │  Unsloth inference mode    │
                                          └────────────────────────────┘
```

---

## 📊 Data Flow Diagrams

### Complete Chat Request Flow

```
User sends: "Should I buy Infosys?"
                │
                ▼
    Browser → /api/assistant (Next.js route handler)
                │
                ├─ Reads visitor cookie → session_id
                ├─ Forwards to FastAPI /chat
                │
                ▼
    FastAPI Orchestrator:
       1. Detect "Infosys" → ticker: INFY.NS
       2. ChromaDB: embed the question → retrieve top-3 SEBI equity chunks
       3. yfinance("INFY.NS"): live price, 52w range, Beta
       4. Build context block: [SEBI Chunk 1] [SEBI Chunk 2] [SEBI Chunk 3] + live data
       5. Call Colab Gradio API: { user_prompt, context, system_prompt }
       6. Receive Qwen 7B response text
                │
                ▼
    /api/assistant (Next.js):
       - Persist user + assistant turns to Neon chat_messages
       - Trigger recomputeFomo(visitorId) → update fomo_profiles in Neon
       - Return response to browser
                │
                ▼
    Browser: renders answer, FIN score in TopBar updates live
```

### FIN Score Recompute Flow

```
               Any trigger event
                     │
       ┌─────────────┼──────────────┐
       │             │              │
  Chat turn    Watchlist update  Quiz submit
       │             │              │
       └─────────────┴──────────────┘
                     │
             recomputeFomo(visitorId)
                   │
         ┌─────────┼──────────┐
         │         │          │
   lang signal  mkt signal  portfolio signal
   (chat msgs   (yfinance    (Neon holdings
    from Neon)   RSI/52wk)   distribution)
         │         │          │
         └─────────┴──────────┘
                   │
    FIN = 0.45×base + 0.20×lang + 0.05×mkt + 0.30×port
                   │
           Neon UPDATE fomo_profiles
                   │
           TopBar meter re-renders
```

---

## 📁 Project Structure

```
Niveshak_SafeGuard/
│
├── README.md                          ← You are here
│
├── frontend/                          ← Next.js 16 web application
│   ├── src/
│   │   ├── app/
│   │   │   ├── [locale]/
│   │   │   │   ├── (public)/          landing, select-language
│   │   │   │   └── (app)/             dashboard, markets, stock, safety,
│   │   │   │                          portfolio, profile, fomo-quiz
│   │   │   └── api/                   server-only route handlers
│   │   ├── components/
│   │   │   ├── ui/                    Button, Card, Modal, Gauge, Chart, Toast
│   │   │   └── features/              shell, market, stock, safety, fomo,
│   │   │                              portfolio, chat, voice, guide
│   │   ├── db/                        drizzle schema + Neon client
│   │   ├── lib/
│   │   │   ├── backend/               server-only FastAPI client + schemas
│   │   │   ├── market/                server-only Yahoo Finance client
│   │   │   ├── fomo-signals.ts        pure FIN scoring mathematics
│   │   │   ├── fomo-recompute.ts      event-driven FIN orchestrator
│   │   │   └── safety.ts              quiz helpers, ticker map
│   │   ├── messages/
│   │   │   ├── en.json                English strings
│   │   │   ├── hi.json                Hindi strings
│   │   │   └── mr.json                Marathi strings
│   │   └── proxy.ts                   visitor cookie + language gate middleware
│   ├── drizzle/                       SQL migration files
│   └── docs/                          PRD, backend contract, i18n review
│
└── backend/
    └── RELIC-Backend/                 ← FastAPI orchestrator
        ├── main.py                    FastAPI app + all route handlers
        ├── chroma_db/                 ChromaDB vector store (SEBI/RBI chunks)
        ├── data_prep/                 PDF extraction + dataset generation scripts
        ├── training/                  QLoRA fine-tuning scripts (Unsloth)
        └── README.md                  Detailed backend documentation
```

---

## 🚀 Setup and Running

### Prerequisites

| Component | Requirement |
|---|---|
| Node.js | 20+ (for Next.js 16) |
| Python | 3.11 or 3.12 |
| Neon Postgres | Serverless database account |
| Google Colab | T4 GPU (for LLM inference) |
| Tesseract OCR | UB Mannheim build (Windows) or brew install tesseract |
| ffmpeg | winget install ffmpeg (Windows) or brew install ffmpeg |

### Backend Setup

```powershell
# 1. Create virtual environment
cd backend/RELIC-Backend
python -m venv .venv
.venv\Scripts\Activate.ps1

# 2. Install dependencies
pip install fastapi uvicorn python-multipart pydantic pillow pytesseract yfinance pandas `
    gradio_client langchain-chroma langchain-huggingface gtts torch librosa transformers

# 3. Start the FastAPI server
uvicorn main:app --host 0.0.0.0 --port 8000

# API Docs available at http://127.0.0.1:8000/docs
```

> **Colab setup:** Run the Colab notebook cell to start the Gradio inference server, then set `COLAB_API_URL` in `main.py` to the printed endpoint. Update this value after every Colab runtime restart.

### Frontend Setup

```bash
# 1. Install dependencies
cd frontend
npm install

# 2. Create .env.local and fill in:
#    DATABASE_URL        (Neon pooled connection string)
#    DIRECT_URL          (Neon direct connection string, for migrations)
#    LLM_BACKEND_URL     (FastAPI backend base URL)
#    LLM_BACKEND_API_KEY (shared secret for x-api-key header)
#    NEXT_PUBLIC_APP_URL (public URL of this app)

# 3. Apply database migrations
npm run db:migrate

# 4. Start development server
npm run dev
```

> **Demo without backend:** Set `USE_MOCK_BACKEND=true`. All features fall back to deterministic mocks — no Colab or FastAPI required to explore the UI.

---

## 📡 API Reference Summary

### Backend (FastAPI)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | Health check (`rag_loaded`, `colab_connected`) |
| `POST` | `/chat` | Multilingual AI chat with RAG + live data |
| `GET` | `/chat/history/{session_id}` | Conversation history |
| `POST` | `/language` | Set session language (`en`/`hi`/`mr`) |
| `POST` | `/quiz/generate` | Generate 6-question stock safety quiz |
| `POST` | `/quiz/submit` | Grade quiz, return verdict + feedback |
| `POST` | `/analyze-fomo` | Score message impulsivity (0-100) |
| `GET` | `/market-alerts` | Volatility monitor alerts |
| `POST` | `/scan-image` | OCR + pattern-match scam scanner |
| `POST` | `/voice/speak` | Text → MP3 audio (gTTS) |
| `POST` | `/voice/listen` | Audio → transcript → chat reply + audio |

### Frontend API Routes (Next.js — server-only)

| Method | Route | Upstream |
|---|---|---|
| `POST` | `/api/assistant` | FastAPI `/chat` |
| `GET/POST` | `/api/fomo` | Neon (FIN quiz) |
| `GET/POST/DELETE` | `/api/holdings` | Neon |
| `GET/POST/DELETE` | `/api/watchlist` | Neon |
| `GET` | `/api/market/trending` | Yahoo Finance |
| `GET` | `/api/market/[symbol]` | Yahoo Finance |
| `POST` | `/api/fraud-scan` | FastAPI `/scan-image` |
| `POST` | `/api/safety-quiz` | FastAPI `/quiz/generate` |
| `POST` | `/api/safety-quiz/submit` | FastAPI `/quiz/submit` → Neon |
| `POST` | `/api/voice/speak` | FastAPI `/voice/speak` |
| `POST` | `/api/voice/listen` | FastAPI `/voice/listen` |

---

## 🔒 Privacy and Guardrails

### Privacy by Design

- **No accounts, no login.** Users are identified only by an anonymous `sg_vid` httpOnly cookie with no link to personal identity.
- **Screenshots are never stored.** Uploaded images are processed entirely in memory by Tesseract OCR and discarded immediately. Only the scan result (flags, severity level) is retained.
- **Audio is never stored.** Voice recordings are transcribed in-memory by Whisper and discarded. Only the resulting text transcript is used.
- **Secrets never reach the browser.** The FastAPI backend URL, API key, and Neon connection strings are exclusively server-side environment variables.

### Product Guardrails

- No stock tips, no buy/sell/hold signals
- No price predictions or price targets
- No personalised investment recommendations
- No broker promotion or referral links
- Every AI output is educational and honest about uncertainty
- The app deliberately **slows the user down** before acting, not speeds them up

### Known Limitations

| Limitation | Detail |
|---|---|
| In-memory backend sessions | Chat history, quiz sessions and language choices in FastAPI are lost on server restart. Neon persists all frontend-visible data. |
| Colab link expiry | The Gradio `share=True` link changes on every Colab runtime restart. Update `COLAB_API_URL` after each restart. |
| Single-threaded inference | The Gradio interface queues requests; high concurrency will stack up wait times. |
| yfinance coverage | Indian stock data from Yahoo can lag by a few minutes; some fields are missing for smaller companies (affected quiz templates are auto-skipped). |
| Hindi/Marathi LLM quality | The 7B model`s multilingual output in chat can be uneven for complex financial queries. The quiz avoids this by using hand-written templates. |
| Educational thresholds | The 10% single-stock cap, 2% drop alert, and RSI-75 FOMO trigger are educational rules of thumb, not regulatory requirements. |

---

## 👥 Team

<div align="center">

### 🏆 Team RELIC

*Builders of Niveshak SafeGuard*

**SANGYAN Hackathon — Open Innovation Track**

---

*"The best time to learn about investing was before you invested. The second best time is now."*

---

**Niveshak SafeGuard** · Team RELIC · SANGYAN Hackathon

Built with ❤️ for India`s 10 crore new retail investors

</div>

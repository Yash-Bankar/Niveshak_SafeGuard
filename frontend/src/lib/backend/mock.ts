import type { Locale } from "@/i18n/routing";
import type { AssistantResponse, ChatTurn } from "./schemas";
import type {
  QuizQuestion,
  QuizStartResponse,
  QuizSubmitResult,
} from "./schemas";

/**
 * Deterministic mock assistant used when USE_MOCK_BACKEND === "true".
 *
 * Replies are guardrail-safe and educational by construction: no tips, no
 * buy/sell/hold, no predictions — the mock can never violate the SANGYAN
 * rules. Delay is deterministic (derived from the message length, 600–1500 ms)
 * so tests are repeatable.
 */

export interface MockAssistantInput {
  message: string;
  chatHistory: ChatTurn[];
  locale: Locale;
}

function trimQuestion(message: string): string {
  const flat = message.replace(/\s+/g, " ").trim();
  return flat.length > 110 ? `${flat.slice(0, 107)}…` : flat;
}

const REPLIES: Record<Locale, (question: string) => string> = {
  en: (q) =>
    `You asked: "${q}" — here is the educational version. Investing works best when you understand what you own, why you own it, and for how long: diversify, invest regularly, check fees, and verify any registration on sebi.gov.in. Remember, I can only explain concepts — I can never suggest buying, selling or holding anything.`,
  hi: (q) =>
    `आपने पूछा: "${q}" — यहाँ शैक्षिक जवाब है। निवेश तभी अच्छा चलता है जब आप जानें कि आप क्या खरीद रहे हैं, क्यों खरीद रहे हैं और कितने समय के लिए: विविधता रखें, नियमित निवेश करें, फ़ीस जाँचें, और कोई भी पंजीकरण sebi.gov.in पर जाँचें। याद रखें, मैं केवल अवधारणाएँ समझा सकता हूँ — खरीदने, बेचने या होल्ड करने का सुझाव कभी नहीं दे सकता।`,
  mr: (q) =>
    `तुम्ही विचारले: "${q}" — खाली शैक्षणिक उत्तर आहे. गुंतवणूक तेव्हाच चांगली चालते जेव्हा तुम्हाला काय खरेदी करत आहात, का करत आहात आणि किती काळासाठी हे कळत असें: विविधीकरण ठेवा, नियमित गुंतवा, फी तपासा, आणि कोणताही नोंदणी sebi.gov.in वर तपासा. लक्षात ठेवा, मी फक्त संकल्पना समजावू शकतो — खरेदी, विक्री किंवा होल्ड करण्याचा कोणताही सल्ला देऊ शकत नाही.`,
};

export async function mockAssistant(
  input: MockAssistantInput
): Promise<AssistantResponse> {
  const delayMs = 600 + (input.message.length % 901); // 600–1500 ms, deterministic
  await new Promise((resolve) => setTimeout(resolve, delayMs));

  return {
    reply: REPLIES[input.locale](trimQuestion(input.message)),
    rag_sources_used: false,
    live_data_used: false,
  };
}

/* ------------------------------------------------------------------ *
 * Mock safety quiz (USE_MOCK_BACKEND === "true").
 *
 * Five fixed, guardrail-safe knowledge questions (volatility, verify-before-
 * you-trust, 52-week range, diversification, SEBI registration). No tips, no
 * predictions, no buy/sell/hold. One of the options is always the
 * "verify from official sources" style correct answer.
 * ------------------------------------------------------------------ */

interface MockQuizBank {
  questions: QuizQuestion[];
  correct: string[];
}

const QUIZ_BANKS: Record<Locale, MockQuizBank> = {
  en: {
    questions: [
      {
        question:
          "What does \"volatility\" describe in a stock's price?",
        options: {
          A: "How often the company pays dividends",
          B: "How much and how quickly the price moves up and down",
          C: "How many shares are listed on the exchange",
          D: "The company's yearly profit",
        },
      },
      {
        question:
          "Before acting on a tip about a stock, what is the most useful first step?",
        options: {
          A: "Check how many people have forwarded it",
          B: "Buy quickly before the price moves",
          C: "Verify the claim from official sources and check registrations on sebi.gov.in",
          D: "Ask the group admin for a target price",
        },
      },
      {
        question: "What is a 52-week high?",
        options: {
          A: "The highest price the stock reached in the last 52 weeks",
          B: "The highest profit the company ever earned",
          C: "A price the stock is guaranteed not to cross again",
          D: "The maximum number of shares you may buy",
        },
      },
      {
        question:
          "Why is putting all your money into a single stock risky?",
        options: {
          A: "It makes dividends tax-free",
          B: "If that one company does badly, your whole investment can fall",
          C: "Brokers charge extra fees for single-stock investing",
          D: "You cannot sell a single stock later",
        },
      },
      {
        question:
          "What does a SEBI registration of an adviser tell you?",
        options: {
          A: "Their tips are guaranteed to profit",
          B: "They are registered with the market regulator — still no guarantee of returns",
          C: "They must predict prices correctly every time",
          D: "They work for your bank",
        },
      },
    ],
    correct: ["B", "C", "A", "B", "B"],
  },
  hi: {
    questions: [
      {
        question: "किसी शेयर की कीमत में \"volatility\" (अस्थिरता) का क्या मतलब है?",
        options: {
          A: "कंपनी कितनी बार लाभांश देती है",
          B: "कीमत कितनी और कितनी तेज़ी से ऊपर-नीचे होती है",
          C: "एक्सचेंज पर कितने शेयर सूचीबद्ध हैं",
          D: "कंपनी का वार्षिक लाभ",
        },
      },
      {
        question:
          "किसी शेयर के बारे में अफ़वाह या टिप पर अमल करने से पहले सबसे उपयोगी पहला कदम क्या है?",
        options: {
          A: "देखना कि इसे कितने लोगों ने आगे भेजा",
          B: "कीमत बढ़ने से पहले जल्दी खरीद लेना",
          C: "दावे की आधिकारिक स्रोतों से जाँच करना और sebi.gov.in पर पंजीकरण देखना",
          D: "ग्रुप एडमिन से टारगेट पूछना",
        },
      },
      {
        question: "52-सप्ताह उच्च (52-week high) का क्या अर्थ है?",
        options: {
          A: "पिछले 52 हफ़्तों में शेयर पहुँची सबसे ऊँची कीमत",
          B: "कंपनी ने कमाया सबसे बड़ा मुनाफ़ा",
          C: "कीमत इससे ऊपर कभी नहीं जाएगी — यह गारंटी",
          D: "आप अधिकतम कितने शेयर खरीद सकते हैं",
        },
      },
      {
        question:
          "पूरा पैसा एक ही शेयर में लगाना जोखिम भरा क्यों है?",
        options: {
          A: "इससे लाभांश पर टैक्स माफ़ हो जाता है",
          B: "उस एक कंपनी के ख़राब प्रदर्शन से पूरा निवेश गिर सकता है",
          C: "ब्रोकर एक-शेयर निवेश पर अतिरिक्त फ़ीस लेते हैं",
          D: "बाद में शेयर बेच नहीं सकते",
        },
      },
      {
        question:
          "किसी सलाहकार का SEBI पंजीकरण आपको क्या बताता है?",
        options: {
          A: "उसकी टिप्स पर मुनाफ़ा गारंटीड है",
          B: "वह बाज़ार नियामक के पास पंजीकृत है — फिर भी रिटर्न की कोई गारंटी नहीं",
          C: "उसे हर बार कीमत सही अनुमान लगानी होगी",
          D: "वह आपके बैंक में काम करता है",
        },
      },
    ],
    correct: ["B", "C", "A", "B", "B"],
  },
  mr: {
    questions: [
      {
        question:
          "स्टॉकच्या किमतीतील \"volatility\" (अस्थिरता) म्हणजे काय?",
        options: {
          A: "कंपनी किती वेळा लाभांश देते",
          B: "किमत किती आणि किती जलद वर-खाली जाते",
          C: "एक्सचेंजवर किती शेयरं नोंदणीकृत आहेत",
          D: "कंपनीचा वार्षिक नफा",
        },
      },
      {
        question:
          "कोणत्या स्टॉकबद्दल अफवा किंवा टिपवर अमल करण्यापूर्वी सर्वात उपयुक्त पहिले पाऊल कोणते?",
        options: {
          A: "ते किती लोकांनी पुढे पाठवले ते पाहणे",
          B: "किमत वाढण्यापूर्वी लवकर खरेदी करणे",
          C: "दाव्याची अधिकृत स्रोतांतून तपासणी करणे आणि sebi.gov.in वर नोंदणी तपासणे",
          D: "ग्रुप ऍडमिनकडून टार्गेट विचारणे",
        },
      },
      {
        question: "52-आठवडे उच्च (52-week high) म्हणजे काय?",
        options: {
          A: "गेल्या 52 आठवड्यांत स्टॉक पोहोचलेल्या सर्वाधिक किमत",
          B: "कंपनीने कमावलेला सर्वाधिक नफा",
          C: "किमत पुन्हा यापेक्षा जाणार नाही — ही हमी",
          D: "तुम्ही कमाल किती शेयर खरेदी करू शकता",
        },
      },
      {
        question:
          "संपूर्ण पैसा एकाच स्टॉकमध्ये टाकणे धोकादायक का आहे?",
        options: {
          A: "यामुळे लाभांशावरील कर माफ होतो",
          B: "त्या एका कंपनीच्या खराब कामगिरीमुळे संपूर्ण गुंतवणूक खाली येऊ शकते",
          C: "ब्रोकर एका-स्टॉक गुंतवणुकीवर अतिरिक्त फी घेतात",
          D: "नंतर शेयर विकू शकत नाही",
        },
      },
      {
        question:
          "सल्लागारची SEBI नोंदणी तुम्हाला काय सांगते?",
        options: {
          A: "त्यांच्या टिप्सना नफा गॅरंटीड आहे",
          B: "ते बाजार नियामकाकडे नोंदणीकृत आहेत — तरीही रिटर्नची कोणतीही हमी नाही",
          C: "त्यांनी दरवेळी किमत अचूक अंदाज घ्यावी लागेल",
          D: "ते तुमच्या बँकेत काम करतात",
        },
      },
    ],
    correct: ["B", "C", "A", "B", "B"],
  },
};

/* Localized AI verdict returned by the mock submit so the report card is
 * fully demoable offline. Guardrail-safe by construction: educational, no
 * tips, no buy/sell/hold, no predictions. */
const MOCK_HEADLINE: Record<Locale, string> = {
  en: "Slow, informed decisions protect your capital.",
  hi: "सोच-समझकर लिए फ़ैसले आपकी पूंजी बचाते हैं।",
  mr: "विचारपूर्वक घेतलेले निर्णय तुमचे भांडवल वाचवतात.",
};

const MOCK_SUMMARY: Record<Locale, (score: number, total: number) => string> = {
  en: (score, total) =>
    `You answered ${score} of ${total} correctly. The basics are within reach — keep verifying the source and the business before you act on any tip.`,
  hi: (score, total) =>
    `आपने ${total} में से ${score} सही उत्तर दिए। मूल बातों की समझ बन रही है — किसी भी टिप पर कार्रवाई से पहले स्रोत और कारोबार जाँचते रहें।`,
  mr: (score, total) =>
    `तुम्ही ${total} पैकी ${score} बरोबर उत्तरे दिली. मूलभूत गोष्टींची समज बनत आहे — कोणत्याही टिपवर कृती करण्यापूर्वी स्रोत आणि व्यवसाय तपासत राहा.`,
};

const MOCK_STRENGTHS: Record<Locale, string[]> = {
  en: [
    "You checked the source instead of acting instantly.",
    "You looked past the headline for real evidence.",
    "You treated this as education, not a sure thing.",
  ],
  hi: [
    "आपने तुरंत कार्रवाई के बजाय स्रोत जाँचा।",
    "आपने सुर्खियों से आगे जाकर सबूत देखा।",
    "आप इसे शिक्षा मान रहे हैं, पक्का मुनाफ़ा नहीं।",
  ],
  mr: [
    "तुम्ही लगेच कृतीऐवजी स्रोत तपासला.",
    "तुम्ही मथळ्यापलीकडे जाऊन पुरावा पाहिला.",
    "तुम्ही हे शिक्षण मानत आहात, नक्की नफा नाही.",
  ],
};

const MOCK_RISKS: Record<Locale, string[]> = {
  en: [
    "Tips promising quick gains are a classic warning sign.",
    "Rushing without knowing your time horizon raises risk.",
    "Concentration in one idea amplifies losses.",
  ],
  hi: [
    "तेज़ मुनाफ़े का वादा एक बड़ा खतरे का संकेत है।",
    "समय-सीमा जाने बिना जल्दबाज़ी जोखिम बढ़ाती है।",
    "एक ही आइडिया पर सारा पैसा नुकसान बढ़ाता है।",
  ],
  mr: [
    "झटपट नफ्याचे आश्वासन हा मोठा धोक्याचा संकेत आहे.",
    "कालावधी माहीत नसताना घाई धोका वाढवते.",
    "एकाच कल्पनेत सर्व पैसे नुकसान वाढवतात.",
  ],
};

const MOCK_NEXT_STEPS: Record<Locale, string[]> = {
  en: [
    "Verify any SEBI registration on sebi.gov.in.",
    "Define your time horizon before investing.",
    "Never invest money you may need soon.",
  ],
  hi: [
    "कोई भी SEBI पंजीकरण sebi.gov.in पर जाँचें।",
    "निवेश से पहले अपनी समय-सीमा तय करें।",
    "जो पैसा जल्दी चाहिए उसे निवेश न करें।",
  ],
  mr: [
    "कोणतीही SEBI नोंदणी sebi.gov.in वर तपासा.",
    "गुंतवणुकीपूर्वी तुमचा कालावधी ठरवा.",
    "लवकर लागणारा पैसा कधीही गुंतवू नका.",
  ],
};

const MOCK_LESSON: Record<Locale, { title: string; body: string }> = {
  en: {
    title: "Capital preservation basics",
    body: "Protecting your capital comes first. Diversify, invest regularly, and never invest borrowed or emergency money. Returns matter less than staying invested long enough to compound.",
  },
  hi: {
    title: "पूंजी सुरक्षा की मूल बातें",
    body: "पहले अपनी पूंजी बचाना ज़रूरी है। विविधता रखें, नियमित निवेश करें, और उधार या आपातकालीन पैसा कभी न लगाएँ। लंबे समय तक टिके रहना ज़रूरी है।",
  },
  mr: {
    title: "भांडवल संरक्षणाची मूलतत्त्वे",
    body: "आधी तुमचे भांडवल वाचवणे महत्त्वाचे. विविधीकरण ठेवा, नियमित गुंतवा, आणि कर्ज किंवा आपत्कालीन पैसा कधीही गुंतवू नका.",
  },
};

const MOCK_EXPLANATIONS: Record<Locale, string[]> = {
  en: [
    "Volatility is how much a price swings over time — not the quality of the business.",
    "Understand the business model before trusting a tip about it.",
    "Match each investment to your time horizon.",
    "Always verify registration and claims on official sources such as sebi.gov.in.",
    "Higher expected returns usually come with higher volatility.",
  ],
  hi: [
    "वोलैटिलिटी बताती है कि कीमत कितनी ऊपर-नीचे होती है — यह कारोबार की गुणवत्ता नहीं है।",
    "किसी टिप पर भरोसा करने से पहले कारोबार का मॉडल समझें।",
    "हर निवेश को अपनी समय-सीमा से मिलाएँ।",
    "पंजीकरण और दावे हमेशा sebi.gov.in जैसे आधिकारिक स्रोतों पर जाँचें।",
    "ज़्यादा संभावित रिटर्न के साथ आमतौर पर ज़्यादा जोखिम आता है।",
  ],
  mr: [
    "अस्थिरता म्हणजे किंमत किती वर-खाली होते — ती व्यवसायाची गुणवत्ता नाही.",
    "टिपवर विश्वास ठेवण्यापूर्वी व्यवसायाचे मॉडेल समजून घ्या.",
    "प्रत्येक गुंतवणूक तुमच्या कालावधीशी जुळवा.",
    "नोंदणी आणि दावे नेहमी sebi.gov.in सारख्या अधिकृत स्रोतांवर तपासा.",
    "जास्त अपेक्षित परताव्यासोबत सहसा जास्त धोका येतो.",
  ],
};

const MOCK_LEVEL: Record<Locale, string> = {
  en: "Partially Prepared",
  hi: "आंशिक रूप से तैयार",
  mr: "अंशतः तयार",
};

const MOCK_TOPICS: Record<Locale, string[]> = {
  en: [
    "Risk Tolerance",
    "Business Model",
    "Capital Allocation",
    "Time Horizon",
    "Diversification",
  ],
  hi: [
    "जोखिम सहनशीलता",
    "कारोबार मॉडल",
    "पूंजी आवंटन",
    "समय-सीमा",
    "विविधता",
  ],
  mr: [
    "धोका सहनशीलता",
    "व्यवसाय मॉडेल",
    "भांडवल वाटप",
    "कालावधी",
    "विविधीकरण",
  ],
};

interface MockQuizRecord {
  correct: string[];
  locale: Locale;
  questions: QuizQuestion[];
}

/** session_id → quiz answer key + locale, in process memory (mock only). */
const mockQuizzes = new Map<string, MockQuizRecord>();

export async function mockQuizStart(input: {
  sessionId: string;
  targetStock: string;
  locale: Locale;
}): Promise<QuizStartResponse> {
  await new Promise((resolve) => setTimeout(resolve, 500));

  const bank = QUIZ_BANKS[input.locale];
  mockQuizzes.set(input.sessionId, {
    correct: bank.correct,
    locale: input.locale,
    questions: bank.questions,
  });

  return { questions: bank.questions, stockName: input.targetStock };
}

export async function mockQuizSubmit(input: {
  sessionId: string;
  answers: string[];
}): Promise<QuizSubmitResult> {
  await new Promise((resolve) => setTimeout(resolve, 400));

  const record = mockQuizzes.get(input.sessionId);
  const correct = record?.correct ?? ["B", "C", "A", "B", "B"];
  const locale: Locale = record?.locale ?? "en";
  const questions = record?.questions ?? [];
  const topics = MOCK_TOPICS[locale] ?? MOCK_TOPICS.en;
  const score = input.answers.filter(
    (answer, index) => answer === correct[index]
  ).length;
  const total = Math.max(input.answers.length, correct.length);

  const per_question = correct.map((answerKey, index) => ({
    id: `q${index + 1}`,
    correct: input.answers[index] === answerKey,
    your_answer: input.answers[index] ?? "",
    correct_answer: answerKey,
    explanation:
      MOCK_EXPLANATIONS[locale][index] ??
      MOCK_EXPLANATIONS.en[index] ??
      "",
  }));

  const conclusion = {
    headline: MOCK_HEADLINE[locale],
    summary: MOCK_SUMMARY[locale](score, total),
    strengths: MOCK_STRENGTHS[locale],
    risks: MOCK_RISKS[locale],
    next_steps: MOCK_NEXT_STEPS[locale],
    mini_lesson: MOCK_LESSON[locale],
  };

  const feedback = per_question.map((row, index) => ({
    category: topics[index] ?? `Topic ${index + 1}`,
    question: questions[index]?.question ?? "",
    user_answer: row.your_answer,
    correct_answer: row.correct_answer,
    is_correct: row.correct,
    explanation: row.explanation,
  }));
  const strengths = feedback
    .filter((row) => row.is_correct)
    .map((row) => row.category);
  const gaps = feedback
    .filter((row) => !row.is_correct)
    .map((row) => ({
      category: row.category,
      correct: 0,
      total: 1,
      what_to_learn: [row.explanation],
    }));

  return {
    score,
    total,
    eligible: total > 0 && score / total >= 0.6,
    correct_answers: correct,
    percentage: total > 0 ? Math.round((score / total) * 100) : 0,
    level: MOCK_LEVEL[locale],
    verdict: MOCK_SUMMARY[locale](score, total),
    strengths,
    gaps,
    feedback,
    per_question,
    conclusion,
    verdict_title: MOCK_HEADLINE[locale],
  };
}

import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));

// Initialize Gemini SDK with lazy check or upfront
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY is not defined. Please set it in Settings > Secrets or .env file.");
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Robust helper to perform exponential backoff retries for Gemini API calls
// Also automatically falls back to 'gemini-3.1-flash-lite' if the primary model is overloaded
async function generateContentWithRetry(ai: GoogleGenAI, params: any, maxRetries = 4, initialDelayMs = 1200) {
  let attempt = 0;
  const originalModel = params.model;
  while (true) {
    try {
      return await ai.models.generateContent(params);
    } catch (error: any) {
      attempt++;
      const errMsg = error?.message || "";
      const errStatus = error?.status || "";
      const errCode = error?.code || 0;
      
      const isRetryable = 
        errMsg.includes("503") || 
        errMsg.includes("UNAVAILABLE") || 
        errMsg.includes("high demand") || 
        errMsg.includes("429") || 
        errMsg.includes("RESOURCE_EXHAUSTED") ||
        errStatus === "UNAVAILABLE" ||
        errCode === 503 ||
        errCode === 429;

      if (isRetryable && attempt <= maxRetries) {
        // Snappy Fallback: If 'gemini-3.5-flash' is congested, fall back to 'gemini-3.1-flash-lite' on retry
        if (params.model === "gemini-3.5-flash") {
          console.log(`[Gemini API] Primary model busy. Switching to backup model 'gemini-3.1-flash-lite' for retry #${attempt}.`);
          params.model = "gemini-3.1-flash-lite";
        }
        
        // Exponential backoff with jitter
        const backoffDelay = initialDelayMs * Math.pow(2.0, attempt - 1) * (0.85 + Math.random() * 0.3);
        console.log(`[Gemini API] Busy state detected. Retrying in ${Math.round(backoffDelay)}ms (Attempt #${attempt}).`);
        await new Promise((resolve) => setTimeout(resolve, backoffDelay));
        continue;
      }
      
      // If we failed with the fallback model, restore the original model name in params in case of further calls
      params.model = originalModel;
      throw error;
    }
  }
}

// Full text or partial database simulation of Quran / custom Arabic text if not provided
// We will prompt Gemini to do the high-fidelity heavy-lifting search and morphological analysis
// based on either the standard Holy Quran or user inputted custom text.
app.post("/api/analyze", async (req, res) => {
  try {
    const { word, indexingType, customText, documentName } = req.body;

    if (!word || typeof word !== "string" || word.trim() === "") {
       res.status(400).json({ error: "الرجاء إدخال الكلمة المستهدفة للبحث والتحليل." });
       return;
    }

    const type = indexingType || "quranic"; // "quranic" (قرآني) or "library" (مكتبي)
    const isQuranic = type === "quranic";

    const ai = getGeminiClient();

    let contextPrompt = "";
    if (isQuranic) {
      contextPrompt = `النص المستهدف هو: "القرآن الكريم بالرواية الرسمية حفص عن عاصم". الكلمة المستهدفة للبحث والإحصاء الدقيق هي: "${word}".
تطبيق نظام الفهرسة القرآني الصارم: [اسم السورة] -> [رقم الآية] -> [رقم الجزء].`;
    } else {
      const textToSearch = customText ? customText.substring(0, 100000) : ""; // safety limit
      const docName = documentName || "كتاب مخصص";
      contextPrompt = `النص المستهدف هو من كتاب بعنوان "${docName}". ومحتوى النص أو مقتطفات منه للبحث والتحليل هي: 
"${textToSearch || "نص لغوي عام"}"
الكلمة المستهدفة للبحث والإحصاء الدقيق هي: "${word}".
تطبيق نظام الفهرسة المكتبي الصارم: [اسم الفصل/الباب] -> [رقم الصفحة] -> [رقم السطر]. إذا لم تتوفر فصول استنتجها أو رتبها بناءً على المتاح في النص.`;
    }

    // System instruction and output structured schema setup
    const response = await generateContentWithRetry(ai, {
      model: "gemini-3.5-flash",
      contents: [
        {
          text: `أنت خبير لغوي مدقق في علوم العربية والقرآن الكريم، ومحرك بحث استرجاعي، وحاسبة إحصائية ولغوية (عددية، صرفية، وبيانية) فائقة الدقة. وظيفتك الأساسية هي تحليل الكلمة المطلوبة بدقة استرجاعية تصل إلى 100% دون أي تخمين أو هلاوس رقمية.

تخيل وتتبع مواضع ظهور الكلمة بدقة في النص المستهدف.
${contextPrompt}

متطلبات التحليل:
1. البيانات المعجمية (من معجم لسان العرب): استخرج الجذر اللغوي الثلاثي أو الرباعي للكلمة، وتعريف لغوي مقتضب ومفيد جداً مطابق لموقع المعاني.
2. حاسبة الإحصاء العددي والمواضع:
   - حصر العدد الإجمالي الدقيق لورود الكلمة "بصيغتها الحرفية الصريحة" في النص.
   - استخراج مواضع ورودها بالتفصيل (اسم السورة/الباب، رقم الآية/الصفحة، الجزء/السطر، وسياق مناسب ومضبوط مشكول للآية أو الجملة تبرز فيه كلمة البحث بوضوح).
3. حاسبة الإحصاء الصرفي والبياني:
   - إحصاء تصريفات واشتقاقات نفس الجذر الواردة في النص (كالأفعال والأسماء والضمائر المتصلة مثل: فسنيرهم، أنلزمكموها، فسيرى، إلخ).
   - توفير قائمة بالتصريفات مع تكرار كل تصريف ونسبته المئوية بدقة تامة من مجموع تكرار الجذر الكلي في النص.
   - احرص على أن تكون النسب المئوية منطقية ومجموعها يقارب 100%.

يجب أن تقوم بإرجاع النتيجة بتنسيق JSON مطابق تماماً للمواصفة التالية لكي نقوم بعرضها برمجياً وبناء المخططات البيانية:

{
  "root": "الجذر اللغوي الأصلي للكلمة",
  "definition": "تعريف مقتضب من معجم لسان العرب يوضح معاني الجذر والكلمة المعنية بدقة واختصار لغوي بليغ",
  "word_exact_count": 0, // عدد ورود الكلمة بصيغتها الحرفية الصريحة المدخلة
  "places": [
    {
      "location": "اسم السورة أو الفصل/الباب",
      "reference": "رقم الآية أو رقم الصفحة",
      "extra": "رقم الجزء أو رقم السطر",
      "context": "سياق ورود الكلمة مشكولاً كاملاً بدقة مع إيضاح الكلمة"
    }
  ],
  "root_derivations": [
    {
      "form": "التصريف الصرفي الوارد (مثال: فسنيرهم، فسنيركم، يسير، سيروا، سيرة)",
      "count": 0, // عدد مرات الورود
      "percentage": 0.0 // النسبة المئوية من إجمالي تكرار هذا الجذر في النص
    }
  ]
}`
        }
      ],
      config: {
        responseMimeType: "application/json",
        temperature: 0.1, // low temperature to avoid hallucination and ensure extreme accuracy
      }
    });

    const resultText = response.text || "{}";
    const data = JSON.parse(resultText);

    res.json(data);
  } catch (error: any) {
    console.error("Error in analyzer endpoint:", error);
    res.status(500).json({ error: error.message || "حدث خطأ أثناء معالجة طلبك اللغوي." });
  }
});

// Serve frontend apps
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);

    // Fallback search to index.html for page load requests in development
    app.use("*", async (req, res, next) => {
      if (req.originalUrl.startsWith("/api")) {
        return next();
      }
      try {
        const templatePath = path.resolve(process.cwd(), "index.html");
        let template = fs.readFileSync(templatePath, "utf-8");
        template = await vite.transformIndexHtml(req.originalUrl, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      } catch (e) {
        next(e);
      }
    });
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();

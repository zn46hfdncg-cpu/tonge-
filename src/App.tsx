/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  Search, 
  BookOpen, 
  Calculator, 
  Layers, 
  FileText, 
  Copy, 
  Check, 
  Info,
  BookMarked,
  ArrowRightLeft,
  Volume2,
  RefreshCw,
  Printer,
  Sparkles
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { AnalysisResult } from "./types";

// الأمثلة الشهيرة للبحث السريع وتسهيل تفاعل المستخدم
const SAMPLE_WORDS = [
  { word: "فسنيرهم", type: "quranic", description: "قرآني - الإعجاز الصرفي" },
  { word: "أنلزمكموها", type: "quranic", description: "قرآني - أطول كلمة في القرآن" },
  { word: "فسيرى", type: "quranic", description: "قرآني - رؤية العمل" },
  { word: "يستبشرون", type: "quranic", description: "قرآني - البشرى والسرور" },
  { word: "يسروا", type: "hadith", description: "حديثي - يسروا ولا تعسروا" },
];

// قائمة الكتب الـ ١٤ الصحاح في الحديث الشريف المعتمدة بالفهرسة
const HADITH_BOOKS_14 = [
  "كامل الكتب الـ ١٤ الصحاح بالتوازي",
  "صحيح البخاري",
  "صحيح مسلم",
  "سنن أبي داود",
  "سنن الترمذي",
  "سنن النسائي",
  "سنن ابن ماجه",
  "موطأ مالك",
  "مسند أحمد",
  "سنن الدارمي",
  "صحيح ابن خزيمة",
  "صحيح ابن حبان",
  "مستدرك الحاكم",
  "سنن الدارقطني",
  "مصنف عبد الرزاق"
];

export default function App() {
  const [word, setWord] = useState("فسنيرهم");
  const [indexingType, setIndexingType] = useState<"quranic" | "hadith">("quranic");
  const [customText, setCustomText] = useState("");
  const [documentName, setDocumentName] = useState("كامل الكتب الـ ١٤ الصحاح بالتوازي");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showCopyDetails, setShowCopyDetails] = useState(false);

  // لرفع ملف مخصص وتجربته
  const [uploadedFileName, setUploadedFileName] = useState("");

  // تشغيل التحليل تلقائياً عند أول تشغيل للمثال الافتراضي
  useEffect(() => {
    handleAnalyze(null, "فسنيرهم", "quranic");
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFileName(file.name);
      setDocumentName(file.name.replace(/\.[^/.]+$/, ""));
      setIndexingType("hadith");
      
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setCustomText(text);
      };
      reader.readAsText(file);
    }
  };

  const handleAnalyze = async (
    e?: React.FormEvent | null, 
    forcedWord?: string, 
    forcedType?: "quranic" | "hadith"
  ) => {
    if (e) e.preventDefault();
    
    const targetWord = forcedWord !== undefined ? forcedWord : word;
    const targetType = forcedType !== undefined ? forcedType : indexingType;

    if (!targetWord.trim()) {
      setError("الرجاء إدخال كلمة البحث المستهدفة.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          word: targetWord.trim(),
          indexingType: targetType,
          customText: targetType === "hadith" ? (customText || "الكتب الـ ١٤ الصحاح والسنن والمسانيد لخدمة السنة النبوية الشريفة.") : "",
          documentName: targetType === "hadith" ? documentName : "المصحف الشريف",
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "فشل الاتصال بالخادم اللغوي.");
      }

      const data: AnalysisResult = await response.json();
      setResult(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "حدث خطأ غير متوقع أثناء معالجة الكلمة.");
    } finally {
      setLoading(false);
    }
  };

  // توليد الهيكل النصي المنسق المتفق عليه والملزم وصالح للنسخ الكربوني الصارم
  const generateMandatoryOutputText = (): string => {
    if (!result) return "";
    
    // بناء مواضع الورود المنسقة
    const placesText = result.places && result.places.length > 0 
      ? result.places.map((p, index) => {
          if (indexingType === "quranic") {
            return `  ${index + 1}. [${p.location}] | [الآية: ${p.reference}] | [الجزء: ${p.extra}]\n     السياق: ${p.context}`;
          } else {
            return `  ${index + 1}. [${p.location}] | [الحديث/الصفحة: ${p.reference}] | [الباب/الجزء: ${p.extra}]\n     السياق: ${p.context}`;
          }
        }).join("\n")
      : "  لا توجد مواضع مسجلة بدقة.";

    // بناء جدول التصريفات
    const derivationsText = result.root_derivations && result.root_derivations.length > 0
      ? result.root_derivations.map((d) => 
          `| ${d.form.padEnd(16)} | ${d.count.toString().padEnd(15)} | ${d.percentage.toFixed(2)}% |`
        ).join("\n")
      : "| لا تصريفات متوفرة | 0 | 0% |";

    return `---
### [1] البيانات المعجمية (لسان العرب)
- **الجذر اللغوي:** [ ${result.root} ]
- **التعريف المقتضب:** ${result.definition}

### [2] حاسبة الإحصاء العددي والمواضع (للكلمة المُدخلة)
- **إجمالي التكرار الحرفي:** [ ${result.word_exact_count} ] مرة.
- **مواضع الورود بالتفصيل:**
${placesText}

### [3] حاسبة الإحصاء الصرفي والبياني (للاشتقاقات وجذر الكلمة)
*تُعرض النتائج في هذا الجدول الرقمي الصريح لتمثيلها بيانياً لاحقاً في التطبيق بالألوان الألاحادية المعتمدة:*
| التصريف الصرفي | عدد مرات الورود | النسبة المئوية من إجمالي تكرار الجذر |
| :--- | :--- | :--- |
${derivationsText}
---`;
  };

  const handleCopyText = () => {
    const textToCopy = generateMandatoryOutputText();
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const printReport = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-[#0A0C10] text-[#E2E8F0] selection:bg-sky-500 selection:text-slate-950 print:bg-white print:text-black font-sans">
      {/* رأس الصفحة الأنيق والأحادي الغامق */}
      <header className="border-b border-slate-800 bg-[#111827] shadow-xl sticky top-0 z-50 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-sky-500 rounded-lg flex items-center justify-center shadow-lg shadow-sky-500/20 text-slate-950 font-bold font-serif text-2xl">
              ع
            </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-100 font-sans flex items-center gap-2">
                  المحرك الإحصائي <span className="text-sky-400">للصرف والحديث</span>
                </h1>
                <p className="text-xs text-slate-400 mt-0.5 font-sans">
                  بوابة التوثيق والتدقيق الصرفي والمعجمي للقرآن الكريم والكتب الـ ١٤ الصحاح للحديث الشريف
                </p>
              </div>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono text-slate-400">
            <span>تاريخ الفهرسة: ٢٠٢٦م</span>
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            <span className="text-slate-300">نظام ذكي متصل وجاهز</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* قسم التحكم وتوجيه المدخلات */}
        <section id="search-section" className="grid grid-cols-1 lg:grid-cols-12 gap-8 print:hidden">
          
          {/* الجانب الأيمن: معايير ومربع البحث غامق */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5 space-y-5 shadow-lg">
              <div className="border-b border-slate-800 pb-3">
                <h2 className="text-base font-semibold text-slate-200 flex items-center gap-2 font-sans">
                  <Layers className="h-4 w-4 text-sky-400" />
                  مدخلات النظام ومعايير الفهرسة
                </h2>
                <p className="text-xs text-slate-400 mt-1">حدد نوع المستهدف وآلية الاسترجاع</p>
              </div>

              {/* اختيار نظام الفهرسة */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-400">منظومة الفهرسة المعتمدة</label>
                <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-md border border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setIndexingType("quranic");
                      setWord("فسنيرهم");
                    }}
                    className={`py-1.5 px-3 rounded-md text-xs font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      indexingType === "quranic"
                        ? "bg-[#1e293b] text-sky-400 border border-slate-700/50 shadow-xs"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                    }`}
                  >
                    <BookOpen className="h-3 w-3" />
                    منظومة قرآنية
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIndexingType("hadith");
                      setWord("يسروا");
                      setDocumentName("كامل الكتب الـ ١٤ الصحاح بالتوازي");
                    }}
                    className={`py-1.5 px-3 rounded-md text-xs font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      indexingType === "hadith"
                        ? "bg-[#1e293b] text-sky-400 border border-slate-700/50 shadow-xs"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                    }`}
                  >
                    <BookMarked className="h-3 w-3" />
                    منظومة حديثية
                  </button>
                </div>
              </div>

              {/* مدخلات الحديث الشريف في حال اختيار المنظومة الحديثية */}
              <AnimatePresence mode="wait">
                {indexingType === "hadith" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-3.5 overflow-hidden"
                  >
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-400">طريق أو كتاب الحديث المطلوب (من الصحاح الـ ١٤)</label>
                      <select
                        value={documentName}
                        onChange={(e) => setDocumentName(e.target.value)}
                        className="w-full text-xs bg-slate-950 border border-slate-800 rounded px-3 py-2.5 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 text-slate-200 font-sans cursor-pointer"
                      >
                        {HADITH_BOOKS_14.map((book, idx) => (
                          <option key={idx} value={book} className="bg-[#111827] text-slate-200">
                            {idx === 0 ? "🌟 " : `${idx}- `} {book}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-400 flex justify-between items-center">
                        <span>متن أو نص الحديث الشريف المصاحب</span>
                        <span className="text-[10px] text-slate-500 font-mono">اختياري</span>
                      </label>
                      <textarea
                        value={customText}
                        onChange={(e) => setCustomText(e.target.value)}
                        className="w-full text-xs font-sans bg-slate-950 border border-slate-800 rounded px-3 py-2 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 text-slate-200 h-24 resize-none"
                        placeholder="أدخل هنا نص حديث مخصص لمطابقة طرقه لغوياً والبحث الصرفي فيه..."
                      />
                    </div>

                    {/* رفع مرويات حديثية */}
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-slate-400 block">رفع متن حديثي خارجي (.txt)</label>
                      <div className="border border-dashed border-slate-800 hover:border-sky-500 rounded-xl p-4 text-center cursor-pointer relative bg-slate-950/40 transition-colors">
                        <input
                          type="file"
                          accept=".txt"
                          onChange={handleFileUpload}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <FileText className="h-6 w-6 text-slate-500 mx-auto mb-1.5" />
                        <span className="text-[10px] text-slate-500 block leading-tight">
                          {uploadedFileName ? `تم إدراج: ${uploadedFileName}` : "انقر أو أسحب الملف لمتن حديثي هنا لفرزه لغوياً"}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* مربع البحث غامق وأنيق */}
              <form onSubmit={(e) => handleAnalyze(e)} className="space-y-3 pt-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-400">الكلمة المستهدفة للبحث</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={word}
                      onChange={(e) => setWord(e.target.value)}
                      className="w-full text-sm font-semibold bg-slate-950 border border-slate-800 rounded px-3 py-2.5 pr-9 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 text-white font-serif"
                      placeholder="أدخل الكلمة المراد تفنيدها..."
                      id="search-word-input"
                    />
                    <Search className="absolute right-3 top-3.5 h-4 w-4 text-slate-500" />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 bg-sky-500 hover:bg-sky-450 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 rounded-lg font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-lg shadow-sky-500/10 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      جاري فحص وتفنيد البنية الصرفية...
                    </>
                  ) : (
                    <>
                      <Calculator className="h-4 w-4" />
                      تشغيل المنظومة والمطابقة الرقمية
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* بطاقة توضيحية للأمثلة السريعة موضوعة بنسق غامق في غاية الأناقة */}
            <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5 shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-sky-400" />
                أمثلة عريقة وسريعة للتجربة
              </h3>
              <div className="space-y-1.5">
                {SAMPLE_WORDS.map((sample, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setWord(sample.word);
                      setIndexingType(sample.type as "quranic" | "hadith");
                      handleAnalyze(null, sample.word, sample.type as "quranic" | "hadith");
                    }}
                    className={`w-full text-right p-2.5 rounded-xl text-xs transition-all flex items-center justify-between border cursor-pointer ${
                      word === sample.word && indexingType === sample.type
                        ? "bg-slate-950 border-sky-500 text-sky-400 font-bold"
                        : "border-transparent bg-slate-950/40 hover:bg-slate-850 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <span className="font-serif font-medium">{sample.word}</span>
                    <span className="text-[10px] text-slate-500 font-sans">{sample.description}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* الجانب الأيسر: عرض وشرح آلية المنظومة المعتمدة */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* دليل الفرز المالي والصرفي */}
            <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 flex flex-col justify-between h-full space-y-4 shadow-xl">
              <div className="flex gap-4 items-start">
                <div className="p-3 bg-slate-950 text-sky-400 rounded-lg shrink-0 border border-slate-800">
                  <Info className="h-5 w-5" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-sm font-semibold text-slate-200">
                    ضوابط المعالجة الرقمية والإحصائية للنص
                  </h3>
                  <div className="text-xs text-slate-400 space-y-2.5 leading-relaxed">
                    <p>
                      يعمل هذا المحرك المتكامل عبر تمرير الحروف والكلمات المجردة من علامات الضبط والتشكيل لمطابقتها إحصائياً بنسبة مطابقة <strong className="text-sky-400 font-semibold">%١٠٠</strong>، مع الحفاظ الكامل على إظهارها مضبوطة بالشكل القرآني أو اللغوي البليغ في النتائج النهائية.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3">
                      <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                        <span className="text-xs font-bold text-slate-200 block mb-1.5 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 bg-sky-400 rounded-full"></span>
                          البحث القرآني (المنظومة القرآنية)
                        </span>
                        <p className="text-[11px] text-slate-500">
                          يعتمد تجريد الرسم العثماني ومقارنة الكلمات للوصول بدقة لكافة المواضع بالأجزاء والسور في المصحف الشريف.
                        </p>
                      </div>
                      <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                        <span className="text-xs font-bold text-slate-200 block mb-1.5 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 bg-sky-400 rounded-full"></span>
                          البحث الحديثي (المنظومة الحديثية)
                        </span>
                        <p className="text-[11px] text-slate-500">
                          البحث والمطابقة في الكتب الـ ١٤ الصحاح والسنن والمسانيد للحديث الشريف مع فرز الأبواب، وأرقام الأحاديث وتخريجها.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-slate-950/50 p-3.5 rounded-xl border border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-3">
                <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                  <ArrowRightLeft className="h-3.5 w-3.5 text-sky-400" />
                  <span>قم بتجربة كتابة أي كلمة، أو اضغط على أحد الأمثلة السريعة لبدء التحليل فوراً.</span>
                </div>
                <div className="flex gap-2 shrink-0">
                  <span className="bg-slate-900 border border-slate-800 text-slate-300 text-[10px] px-2 py-0.5 rounded font-mono">
                    Node.js Server
                  </span>
                  <span className="bg-slate-900 border border-slate-800 text-slate-300 text-[10px] px-2 py-0.5 rounded font-mono">
                    Gemini 3.5 Flash
                  </span>
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* مؤشر التحميل البسيط والأنيق والمنسجم تفصيلياً مع الهادئ الغامق */}
        {loading && (
          <div className="py-20 text-center space-y-4 font-sans border border-slate-800 rounded-2xl bg-[#111827] mt-8 shadow-xl">
            <RefreshCw className="h-8 w-8 animate-spin text-sky-400 mx-auto" />
            <p className="text-sm font-semibold text-slate-100">جاري تشغيل محرك البحث والحاسبة الصرفية...</p>
            <p className="text-xs text-slate-550 max-w-md mx-auto">
              نقوم بمطابقة الكلمة والبحث في النصوص، وإرجاع الأصول إلى معجم لسان العرب وتوليد التفنيد الإحصائي الصارم بصيغة دقيقة.
            </p>
          </div>
        )}

        {/* عرض الخطأ إن وجد بنسق أحمر وداكن رائع */}
        {error && !loading && (
          <div className="p-4 bg-slate-950 border-r-4 border-red-500 border-y border-l border-slate-800 text-slate-200 rounded-lg mt-8 text-xs font-medium font-sans flex items-center justify-between shadow-md">
            <div className="flex items-center gap-2">
              <span className="font-bold text-red-400 underline">تنبيه لغوي:</span>
              <span>{error}</span>
            </div>
            <button 
              onClick={() => handleAnalyze()} 
              className="px-2.5 py-1 bg-slate-900 text-sky-400 hover:text-sky-300 rounded border border-slate-800 text-[10px] cursor-pointer"
            >
              إعادة الكرّة
            </button>
          </div>
        )}

        {/* عرض ومخرجات التحليل اللغوي النهائي الفخم بستايل ثري متطور داكن */}
        {result && !loading && (
          <motion.section 
            initial={{ opacity: 0, y: 15 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="mt-8 space-y-6"
          >
            
            {/* خيارات المخرج الأعلى ورأس التقرير الهادئ المتطور */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-800 pb-4 gap-4 print:hidden">
              <div className="flex items-center gap-2">
                <span className="bg-sky-500/15 text-sky-400 border border-sky-500/30 text-[10px] font-bold px-2.5 py-1 rounded-md uppercase font-mono">
                  التقرير اللغوي النهائي
                </span>
                <h3 className="text-sm font-bold text-slate-200 font-sans">
                  مخرجات تفنيد الكلمة [ <span className="font-serif italic text-base underline decoration-sky-500 decoration-2">{word}</span> ]
                </h3>
              </div>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleCopyText}
                  className="py-1.5 px-3 bg-slate-900/80 hover:bg-slate-850 text-slate-200 rounded border border-slate-800 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5 text-slate-400" />}
                  <span>{copied ? "تم النسخ" : "نسخ النص الإجباري"}</span>
                </button>
                
                <button
                  type="button"
                  onClick={printReport}
                  className="py-1.5 px-3 bg-sky-500 hover:bg-sky-450 text-slate-950 rounded text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-md"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>طباعة التقرير</span>
                </button>
              </div>
            </div>

            {/* الأشرطة الاستعراضية العلوية الجذابة المطابقة لقالب Sophisticated Dark */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* بطاقة الكلمة المستهدفة بتصميم متطور وخلفية خلفية متوهجة */}
              <div className="md:col-span-2 bg-[#111827] border border-slate-800 rounded-2xl p-6 flex flex-col justify-center items-center relative overflow-hidden shadow-xl">
                <div className="absolute -left-10 -top-10 w-40 h-40 bg-sky-500/5 rounded-full blur-3xl"></div>
                <span className="text-xs text-sky-400/80 mb-2.5 font-mono tracking-widest font-semibold">
                  الكلمة المستهدفة الحالية
                </span>
                <div className="text-4xl md:text-5xl font-serif text-slate-100 drop-shadow-xl tracking-wider bg-slate-950/40 px-8 py-3 rounded-xl border border-slate-800 flex items-center justify-center font-bold">
                  {word}
                </div>
                <div className="mt-4 flex gap-2">
                  <span className="px-2.5 py-1 bg-slate-950/80 text-[10px] text-slate-400 rounded-md border border-slate-800 font-mono">
                    منظومة الفهرسة: {indexingType === "quranic" ? "قرآنية صرامة" : "حديثية صرامة"}
                  </span>
                  <span className="px-2.5 py-1 bg-slate-950/80 text-[10px] text-slate-400 rounded-md border border-slate-800 font-serif">
                    جذر الكلمة: [ {result.root} ]
                  </span>
                </div>
              </div>

              {/* بطاقة إجمالي التكرار بلون سكايب سماوي نابض */}
              <div className="bg-sky-500 rounded-2xl p-6 flex flex-col justify-between shadow-xl shadow-sky-500/10 text-slate-950 relative overflow-hidden">
                <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-slate-950/5 rounded-full"></div>
                <div className="text-xs font-bold uppercase tracking-wider opacity-80 flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5" />
                  إجمالي التكرار الحرفي
                </div>
                <div className="text-6xl font-black font-mono my-2 tracking-tighter">
                  {result.word_exact_count}
                </div>
                <div className="text-xs font-semibold opacity-75">
                  ورود صريح مطابق في غاية الدقة
                </div>
              </div>

            </div>

            {/* الجزء الأساسي المعروض تفصيلياً */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* الجهة اليمنى: الهيكل الصارم الفعلي المنسق (الأحادي) - مفيد للباحثين والطباعة */}
              <div className="lg:col-span-12 xl:col-span-7 space-y-6 print:col-span-12">
                
                {/* [1] البيانات المعجمية */}
                <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
                  <div className="border-b border-slate-800 pb-3 flex justify-between items-center">
                    <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2 font-serif">
                      <span className="font-sans text-sky-400 font-medium text-xs">[1]</span>
                      البيانات المعجمية (لسان العرب)
                    </h3>
                    <span className="text-[10px] text-slate-400 font-mono">طبعة المعاني الموثقة</span>
                  </div>
                  
                  <div className="space-y-3 font-sans">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-400 min-w-[100px]">الجذر اللغوي:</span>
                      <span className="bg-slate-950 text-sky-400 font-mono text-xs font-bold border border-slate-800 px-3 py-1.5 rounded-lg inline-block">
                        {result.root}
                      </span>
                    </div>

                    <div className="flex items-start gap-2 pt-1">
                      <span className="text-xs font-bold text-slate-400 min-w-[100px] mt-2 shrink-0">التعريف المقتضب:</span>
                      <p className="text-xs leading-relaxed text-slate-300 font-serif bg-slate-950/50 p-3 h-auto rounded-lg border border-slate-800 w-full">
                        {result.definition}
                      </p>
                    </div>
                  </div>
                </div>

                {/* [2] حاسبة الإحصاء العددي والمواضع */}
                <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
                  <div className="border-b border-slate-800 pb-3 flex justify-between items-center">
                    <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2 font-serif">
                      <span className="font-sans text-sky-400 font-medium text-xs">[2]</span>
                      حاسبة الإحصاء العددي والمواضع للكلمة
                    </h3>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-slate-400 font-sans">إجمالي التكرار:</span>
                      <span className="bg-slate-950 text-sky-400 border border-slate-800 text-[11px] font-mono font-bold px-2 py-0.5 rounded">
                        {result.word_exact_count} مرات
                      </span>
                    </div>
                  </div>

                  {/* مواضع الورود */}
                  <div className="space-y-4 font-sans">
                    {result.places && result.places.length > 0 ? (
                      <div className="space-y-3 max-h-[450px] overflow-y-auto pr-1">
                        {result.places.map((place, index) => (
                          <div 
                            key={index} 
                            className="bg-slate-950/60 p-3.5 border border-slate-800 rounded-xl text-xs space-y-2 hover:border-sky-500/50 transition-colors"
                          >
                            <div className="flex justify-between items-center border-b border-slate-800/40 pb-1.5">
                              <span className="font-bold text-slate-200 flex items-center gap-2 font-serif">
                                <span className="text-[10px] text-sky-400 font-mono bg-sky-500/10 text-sky-400 px-1.5 py-0.5 rounded border border-sky-500/15">
                                  {index + 1}
                                </span>
                                {place.location}
                              </span>
                              
                              <div className="flex gap-2 text-[10px] text-slate-400 font-mono">
                                <span className="bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded text-[10px] text-slate-300 animate-pulse">
                                  {indexingType === "quranic" ? `آية:` : `رقم الحديث:`} {place.reference}
                                </span>
                                <span className="bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded text-[10px] text-slate-300">
                                  {indexingType === "quranic" ? `جزء:` : `اسم الباب:`} {place.extra}
                                </span>
                              </div>
                            </div>
                            
                            <p className="text-xs leading-relaxed text-slate-100 font-serif text-right font-medium py-1">
                              {place.context}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 text-center py-6">لا توجد مواضع مسجلة لهذه الكلمة بصيغتها الصريحة.</p>
                    )}
                  </div>
                </div>

              </div>

              {/* الجهة اليسرى: حاسبة التحليل الصرفي والبياني (تمثيل بياني تفاعلي نقي) */}
              <div className="lg:col-span-12 xl:col-span-5 space-y-6">
                
                {/* [3] حاسبة الإحصاء الصرفي والبياني */}
                <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
                  <div className="border-b border-slate-800 pb-3 flex justify-between items-center">
                    <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2 font-serif">
                      <span className="font-sans text-sky-400 font-medium text-xs">[3]</span>
                      حاسبة الإحصاء الصرفي والبياني
                    </h3>
                    <span className="text-[10px] font-mono text-slate-400 bg-slate-950 border border-slate-800 px-1.5 py-0.5 rounded">
                      جذر: {result.root}
                    </span>
                  </div>

                  {/* الرسم البياني البصري أحادي اللون المخصص بأشرطة تقدم (Minimalist Mono Chart) */}
                  <div className="space-y-4 pt-2">
                    <h4 className="text-[11px] font-bold text-sky-400/80 uppercase tracking-widest font-sans">
                      التوزيع البياني للانتشار والصرف
                    </h4>
                    
                    <div className="space-y-3.5">
                      {result.root_derivations && result.root_derivations.length > 0 ? (
                        result.root_derivations.map((item, index) => (
                          <div key={index} className="space-y-1">
                            <div className="flex justify-between items-center text-xs">
                              <span className="font-bold text-slate-200 font-serif">{item.form}</span>
                              <div className="flex items-center gap-1.5 font-mono text-slate-400">
                                <span>{item.count} مرات</span>
                                <span className="bg-sky-500/10 text-sky-400 border border-sky-500/20 px-1.5 py-0.2 rounded text-[10px] font-medium">
                                  {item.percentage.toFixed(1)}%
                                </span>
                              </div>
                            </div>
                            {/* شريط التقدم الأحادي الأنيق */}
                            <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-800">
                              <div 
                                className="bg-sky-500 h-full rounded-full transition-all duration-550 shadow-[0_0_8px_rgba(56,189,248,0.4)]" 
                                style={{ width: `${Math.min(100, item.percentage)}%` }}
                              />
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-slate-400 text-center py-4">لا تتوفر اشتقاقات بيانية.</p>
                      )}
                    </div>
                  </div>

                  {/* الجدول الرقمي الصريح المطابق للهيكل المطلوب */}
                  <div className="pt-4 space-y-2.5">
                    <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                      الجدول الإحصائي الرقمي الصريح
                    </h4>
                    
                    <div className="overflow-x-auto border border-slate-800 rounded-xl">
                      <table className="w-full text-xs text-right font-sans">
                        <thead className="bg-[#1a2238]/30 text-slate-300 border-b border-slate-800 text-[11px] font-bold">
                          <tr>
                            <th className="py-2.5 px-3">التصريف الصرفي</th>
                            <th className="py-2.5 px-3 text-center">مرات الورود</th>
                            <th className="py-2.5 px-3 text-left">النسبة المئوية</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-850 bg-slate-950/20">
                          {result.root_derivations && result.root_derivations.length > 0 ? (
                            result.root_derivations.map((item, index) => (
                              <tr key={index} className="hover:bg-slate-900/40 transition-colors">
                                <td className="py-2.5 px-3 font-serif font-bold text-slate-200">{item.form}</td>
                                <td className="py-2.5 px-3 text-center font-mono text-sky-300 font-semibold">{item.count}</td>
                                <td className="py-2.5 px-3 text-left font-mono text-slate-300 font-semibold">{item.percentage.toFixed(2)}%</td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={3} className="py-3 px-3 text-center text-slate-500">لا توجد تصريفات لبيانها رقمياً</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                </div>

                {/* لوحة نسخ التقرير الهيكلي الصارم كاملاً بنقرة واحدة */}
                <div className="bg-slate-950 text-slate-200 rounded-2xl p-5 space-y-3.5 border border-slate-800 w-full">
                  <div className="flex justify-between items-center border-b border-slate-800 pb-2.5">
                    <div className="flex items-center gap-1.5">
                      <Volume2 className="h-4 w-4 text-sky-400" />
                      <h4 className="text-xs font-bold font-sans">معاينة نص المخرجات الفوري (الهيكل الإلزامى)</h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowCopyDetails(!showCopyDetails)}
                      className="text-[10px] text-sky-400 hover:text-sky-300 underline cursor-pointer"
                    >
                      {showCopyDetails ? "إخفاء التفاصيل" : "عرض النص الإلزامي للنسخ"}
                    </button>
                  </div>

                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    من خلال مربع النسخ أدناه، يمكنك نسخ الرد مباشرة بالبناء الصرامي والهيكلي المطلوب والذي يتطابق تماماً مع معايير التدقيق اللغوي العليا.
                  </p>

                  {showCopyDetails && (
                    <pre className="p-3 bg-slate-900 text-[10px] font-mono text-slate-300 rounded overflow-x-auto max-h-56 leading-relaxed border border-slate-800 text-left" dir="ltr">
                      {generateMandatoryOutputText()}
                    </pre>
                  )}

                  <button
                    type="button"
                    onClick={handleCopyText}
                    className="w-full py-2.5 bg-sky-500 hover:bg-sky-450 text-slate-950 rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-sky-500/10"
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-slate-950" /> : <Copy className="h-3.5 w-3.5 text-slate-950" />}
                    <span>{copied ? "تم نسخ التقرير بنجاح" : "انسخ التقرير للهيكل الإلزامي الصارم"}</span>
                  </button>
                </div>

              </div>

            </div>

          </motion.section>
        )}

      </main>

      {/* تذييل الصفحة الفخم والهادئ */}
      <footer className="border-t border-slate-850 bg-[#0A0C10] py-8 mt-20 print:hidden text-center text-xs text-slate-500 space-y-2">
        <p className="font-sans font-medium text-slate-300">
          محرك البحث اللغوي والحاسبة الإحصائية للحديث الشريف والمصحف الشريف © ٢٠٢٦
        </p>
        <p className="max-w-md mx-auto text-[11px] px-4 font-sans text-slate-500">
          تم تطوير هذه المنظومة بالاعتماد الشامل على تقنيات استرجاع الـ AI المتقدم بمطابقة لسان العرب لتقديم تحليلات موثقة خالية من الهلاوس وبصيغ فهرسة مطابقة للمعايير العليا والأكاديمية.
        </p>
      </footer>
    </div>
  );
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Place {
  location: string;    // اسم السورة أو اسم الفصل/الباب
  reference: string;   // رقم الآية أو رقم الصفحة
  extra: string;       // رقم الجزء أو رقم السطر
  context: string;     // سياق ورود الكلمة مشكولاً
}

export interface Derivation {
  form: string;        // التصريف الصرفي الوارد
  count: number;       // عدد مرات الورود
  percentage: number;  // النسبة المئوية من إجمالي تكرار الجذر
}

export interface AnalysisResult {
  root: string;              // الجذر اللغوي
  definition: string;        // التعريف المقتضب في لسان العرب
  word_exact_count: number;   // إجمالي التكرار الحرفي
  places: Place[];           // مواضع الورود بالتفصيل
  root_derivations: Derivation[]; // حاسبة الإحصاء الصرفي والبياني للاشتقاقات
}

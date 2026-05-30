import { useState, useRef } from 'react'
import { Sparkles, Upload, FileText, Bot, Loader2, ArrowRight, CornerDownLeft } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { callClaudeAPI } from '../utils/api'

export default function SmartAssistant({ onNavigate }) {
  const { t, lang, setSharedFiles } = useApp()
  const [file, setFile] = useState(null)
  const [requestText, setRequestText] = useState('')
  const [loading, setLoading] = useState(false)
  const [aiResponse, setAiResponse] = useState(null)
  const [isDragOver, setIsDragOver] = useState(false)

  const fileInputRef = useRef(null)

  // [تم الإصلاح]: دالة للتحقق من دعم نوع الملف لتجنب انهيار التطبيق
  const isValidFile = (f) => {
    if (!f) return false;
    const validExtensions = ['.pdf', '.docx', '.xlsx', '.xls', '.png', '.jpg', '.jpeg', '.webp'];
    return validExtensions.some(ext => f.name.toLowerCase().endsWith(ext));
  };

  const handleFileChange = (e) => {
    const f = e.target.files[0]
    if (f) {
      if (!isValidFile(f)) {
        alert(lang === 'ar' ? 'نوع الملف غير مدعوم!' : 'Unsupported file type!');
        return;
      }
      setFile(f)
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = () => {
    setIsDragOver(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f) {
      // [تم الإصلاح]: منع تمرير الملفات غير المدعومة عبر السحب والإفلات
      if (!isValidFile(f)) {
        alert(lang === 'ar' ? 'نوع الملف غير مدعوم!' : 'Unsupported file type!');
        return;
      }
      setFile(f)
    }
  }

  const handleSuggestion = (suggestion) => {
    setRequestText(suggestion)
  }

  // Offline regex fallback classifier
  const classifyRequestOffline = (fileName, userRequest) => {
    const req = (userRequest + ' ' + fileName).toLowerCase()
    
    if (
      req.includes('غلاف') || 
      req.includes('تصميم') || 
      req.includes('cover') || 
      req.includes('designer') || 
      req.includes('خلفية') ||
      req.includes('أغلفة')
    ) {
      return {
        tab: 'designer',
        explanation: lang === 'ar' 
          ? 'سأقوم بنقلك لمصمم الأغلفة لمساعدتك في تصميم غلاف مميز لمذكرتك الدراسية.' 
          : 'I will redirect you to the Cover Designer to help you design a great cover page.'
      }
    }
    
    if (
      req.includes('دمج') || 
      req.includes('تقسيم') || 
      req.includes('تحويل') || 
      req.includes('word') || 
      req.includes('excel') || 
      req.includes('pdf') || 
      req.includes('تحرير') || 
      req.includes('ترقيم') || 
      req.includes('ختم') || 
      req.includes('docx') || 
      req.includes('xlsx') ||
      req.includes('split') ||
      req.includes('merge') ||
      req.includes('convert')
    ) {
      return {
        tab: 'converter',
        explanation: lang === 'ar'
          ? 'سأقوم بنقلك لأدوات الـ PDF حيث يمكنك دمج، تقسيم، تحرير أو تحويل الملفات.'
          : 'I will redirect you to PDF Tools so you can merge, split, edit, or convert files.'
      }
    }
    
    // Default to Document Cleaner
    return {
      tab: 'cleaner',
      explanation: lang === 'ar'
        ? 'سأقوم بنقلك لمعالج المستندات لتنظيف الأوراق، إزالة الظلال، وتبييض المستند لجعلها جاهزة للطباعة.'
        : 'I will redirect you to the Document Cleaner to clean shadows, adjust brightness, and ready your page for printing.'
    }
  }

  const handleProcess = async () => {
    if (!requestText && !file) return
    setLoading(true)
    setAiResponse(null)

    try {
      const fileName = file ? file.name : ''
      const prompt = lang === 'ar'
        ? `أنت مساعد ذكي لتطبيق PrintPro (أدوات المكتبة والطباعة الذكية).
المستند المرفوع اسمه: "${fileName}"
المستخدم يريد تنفيذ الآتي: "${requestText}"

بناءً على طلب المستخدم واسم الملف، حدد الصفحة الأنسب للتوجه إليها.
الخيارات المتاحة هي:
1. "cleaner" (لتنظيف المستندات، إزالة الظلال، تعديل الإضاءة والسطوع، تبييض الصفحات، قص حواف الأوراق، استخراج نصوص OCR، أو تحضير المستندات للطباعة).
2. "designer" (لتصميم وتوليد أغلفة المذكرات والكتب، كتابة عناوين الأغلفة، وتوليد صور خلفيات وملصقات ذكية للمواد الدراسية).
3. "converter" (لأدوات الـ PDF مثل دمج ملفات PDF متعددة، تقسيم واستخراج صفحات PDF، ترقيم وتختيم صفحات PDF المائية، أو تحويل الصيغ مثل Word/Excel/صورة إلى PDF أو PDF إلى Word/صور).

أجب بصيغة JSON فقط دون أي نصوص خارج الـ JSON بالصيغة التالية:
{
  "tab": "cleaner" | "designer" | "converter",
  "explanation": "شرح باللغة العربية للسبب وراء تحويل المستخدم لهذه الصفحة وما سيقوم التطبيق بفعله بالملف"
}`
        : `You are a smart routing assistant for PrintPro (intelligent print shop & office tools).
Uploaded document name: "${fileName}"
The user wants to do the following: "${requestText}"

Based on the request and file name, determine the best tab/page to route them to.
Available pages:
1. "cleaner" (for document cleaning, shadow removal, brightness/contrast adjustments, page whitening, manual/smart cropping, OCR text extraction, or general print preparation).
2. "designer" (for designing cover pages, writing title/subtitles, generating AI backgrounds, and adding decorative frames or stickers).
3. "converter" (for PDF tools like merging multiple PDFs, splitting pages, adding watermarks/page stamps/page numbering, or converting formats like Word/Excel/Images to PDF and vice versa).

Respond STRICTLY in JSON format with no other text:
{
  "tab": "cleaner" | "designer" | "converter",
  "explanation": "A short English explanation of why the user is redirected here and what the app will do with the file"
}`

      let classification = null
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY
      if (apiKey) {
        classification = await callClaudeAPI(prompt)
      }

      if (!classification || !classification.tab) {
        classification = classifyRequestOffline(fileName, requestText)
      }

      if (lang === 'en' && classification.explanation) {
        if (/[\u0600-\u06FF]/.test(classification.explanation)) {
          if (classification.tab === 'cleaner') {
            classification.explanation = 'I will redirect you to the Document Cleaner to clean shadows, adjust brightness, and ready your page for printing.'
          } else if (classification.tab === 'converter') {
            classification.explanation = 'I will redirect you to PDF Tools so you can merge, split, edit, or convert files.'
          } else {
            classification.explanation = 'I will redirect you to the Cover Designer to help you design a great cover page.'
          }
        }
      }

      setAiResponse(classification)

      setTimeout(() => {
        if (file) {
          setSharedFiles([file])
        }
        onNavigate(classification.tab)
        setFile(null)
        setRequestText('')
        setAiResponse(null)
        setLoading(false)
      }, 3000)

    } catch (err) {
      console.error(err)
      const fallback = classifyRequestOffline(file ? file.name : '', requestText)
      setAiResponse(fallback)
      setTimeout(() => {
        if (file) setSharedFiles([file])
        onNavigate(fallback.tab)
        setFile(null)
        setRequestText('')
        setAiResponse(null)
        setLoading(false)
      }, 3000)
    }
  }

  const suggestions = lang === 'ar' ? [
    'أريد تبييض هذه الورقة وإزالة الظل الأسود منها للطباعة',
    'قم بتحويل هذا الملف إلى صيغة PDF مباشرة',
    'أريد تصميم غلاف جذاب لمادة الرياضيات للصف الثالث',
    'استخرج لي النصوص المكتوبة في هذه الصورة'
  ] : [
    'I want to whiten this paper and remove dark shadows for printing',
    'Convert this file directly into PDF format',
    'I want to design a beautiful cover page for Grade 12 Math',
    'Extract written text from this image'
  ]

  return (
    <div className="flex flex-col h-full bg-[#0a0a0d] overflow-y-auto p-4 md:p-8">
      <div className="max-w-2xl mx-auto w-full flex-1 flex flex-col justify-center gap-6 my-auto">
        
        {/* Header Header */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-indigo-500/10 border border-indigo-500/25 rounded-2xl flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(99,102,241,.15)] animate-pulse">
            <Bot size={32} className="text-indigo-400" />
          </div>
          <h2 className="text-2xl font-black text-white flex items-center justify-center gap-2">
            {lang === 'ar' ? 'المساعد الذكي لبرينت برو' : 'PrintPro Smart Assistant'}
            <Sparkles size={18} className="text-amber-400" />
          </h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-normal">
            {lang === 'ar'
              ? 'ارفع ملفك واكتب ما تود إنجازه، وسيتكفل الذكاء الاصطناعي بتشغيل الأداة الأنسب وتحميل ملفك فيها تلقائياً!'
              : 'Upload your file and describe what you want. The AI will route you to the correct tool and load your file automatically!'}
          </p>
        </div>

        {/* AI Action Overlay */}
        {loading ? (
          <div className="bg-[#131317]/80 backdrop-blur-md border border-indigo-500/20 rounded-3xl p-8 flex flex-col items-center text-center gap-4 shadow-2xl transition-all animate-fade-in">
            {aiResponse ? (
              <>
                <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/25 rounded-full flex items-center justify-center text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,.15)]">
                  <Loader2 size={24} className="animate-spin" />
                </div>
                <h3 className="text-lg font-black text-white">
                  {lang === 'ar' ? 'جاري توجيهك الآن...' : 'Redirecting you now...'}
                </h3>
                <p className="text-xs text-emerald-300 font-bold bg-emerald-500/5 px-4 py-2.5 rounded-2xl border border-emerald-500/10 max-w-md leading-relaxed">
                  {aiResponse.explanation}
                </p>
                <div className="flex items-center gap-2 text-indigo-400 text-xs font-black mt-2 animate-bounce">
                  <span>{lang === 'ar' ? 'جاري فتح الصفحة' : 'Opening page'}</span>
                  <ArrowRight size={14} className={lang === 'ar' ? 'rotate-180' : ''} />
                </div>
              </>
            ) : (
              <>
                <div className="w-14 h-14 bg-indigo-500/10 border border-indigo-500/25 rounded-full flex items-center justify-center text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,.15)]">
                  <Loader2 size={24} className="animate-spin" />
                </div>
                <h3 className="text-lg font-black text-white">
                  {lang === 'ar' ? 'جاري تحليل طلبك ومعالجة الملف...' : 'Analyzing request and preparing file...'}
                </h3>
                <p className="text-xs text-slate-500 max-w-sm">
                  {lang === 'ar'
                    ? 'يتم فحص نوع المستند وتحليل الكلمات المفتاحية لاختيار الأداة الأفضل للتعديل.'
                    : 'Inspecting document type and matching request commands to pick the best tool.'}
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="bg-[#131317] border border-white/5 rounded-3xl p-5 md:p-6 shadow-2xl space-y-5">
            {/* File Upload Zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current.click()}
              className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                isDragOver
                  ? 'border-indigo-500 bg-indigo-500/5'
                  : file
                  ? 'border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-500/40'
                  : 'border-white/10 bg-white/[0.01] hover:border-white/15'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.docx,.xlsx,.xls,.png,.jpg,.jpeg,.webp"
                onChange={handleFileChange}
              />
              {file ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                    <FileText size={20} className="text-emerald-400" />
                  </div>
                  <div className="text-xs font-bold text-slate-200 max-w-xs truncate">{file.name}</div>
                  <div className="text-[10px] text-slate-500">
                    {(file.size / 1024 / 1024).toFixed(2)} MB • {lang === 'ar' ? 'اضغط لتغيير الملف' : 'Click to change file'}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 group">
                  <div className="w-12 h-12 rounded-full bg-white/5 border border-white/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Upload size={18} className="text-slate-400" />
                  </div>
                  <div className="text-sm font-bold text-slate-300">
                    {lang === 'ar' ? 'اسحب ملفك هنا أو اضغط للتصفح' : 'Drag file here or click to browse'}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    PDF, Word, Excel, JPG, PNG, WEBP
                  </div>
                </div>
              )}
            </div>

            {/* Natural Language Request Input */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400">
                {lang === 'ar' ? 'ماذا تريد أن تفعل بهذا الملف؟' : 'What do you want to do with this file?'}
              </label>
              <div className="relative flex items-center bg-black/40 border border-white/10 rounded-2xl focus-within:border-indigo-500 transition-colors">
                <textarea
                  value={requestText}
                  onChange={(e) => setRequestText(e.target.value)}
                  placeholder={
                    lang === 'ar'
                      ? 'اكتب طلبك هنا (مثال: نظف الورقة واجعلها جاهزة للطباعة)...'
                      : 'Type your request here (e.g. clean paper and make it ready for printing)...'
                  }
                  dir="auto"
                  rows={2}
                  className="w-full bg-transparent text-white font-bold p-4 text-xs leading-relaxed outline-none resize-none"
                />
                <button
                  onClick={handleProcess}
                  disabled={!requestText && !file}
                  className="absolute bottom-3 left-3 md:left-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-35 text-white p-2.5 rounded-xl transition-all shadow-md shadow-indigo-600/10"
                  title={lang === 'ar' ? 'أرسل الطلب' : 'Submit Request'}
                >
                  <CornerDownLeft size={14} className={lang === 'ar' ? '' : 'rotate-180'} />
                </button>
              </div>
            </div>

            {/* Quick Suggestions list */}
            <div className="space-y-2">
              <span className="text-[10px] text-slate-500 font-bold">
                {lang === 'ar' ? 'اقتراحات سريعة:' : 'Quick suggestions:'}
              </span>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSuggestion(s)}
                    className="text-[10px] font-bold text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl px-3 py-2 text-right transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
import { createContext, useContext, useCallback, useState, useEffect } from 'react'
import {
  auth,
  db,
  googleProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut
} from '../utils/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  writeBatch,
  getDocs
} from 'firebase/firestore'

// ─── Translations ─────────────────────────────────────────────────────────────
const T = {
  ar: {
    appTitle:'برينت برو', appSubtitle:'حلول المكتبات الذكية',
    assistantTab:'المساعد الذكي',
    cleanerTab:'معالج المستندات', designerTab:'مصمم الأغلفة',
    converterTab:'أدوات PDF',     historyTab:'المشاريع',
    upload:'رفع صورة',   camera:'كاميرا',     autoEnhance:'تبييض ذكي',
    invert:'عكس',        crop:'قص',            extractText:'OCR',
    watermark:'علامة مائية', adjust:'ضبط يدوي', rotate:'تدوير',
    brightness:'السطوع', contrast:'التباين',   grayscale:'أبيض وأسود',
    saveImg:'حفظ صورة',  savePdf:'حفظ PDF',   addPage:'إضافة صفحة',
    processing:'جاري المعالجة…', preview:'منطقة المعاينة',
    confirmCrop:'تأكيد', cancel:'إلغاء',
    print:'طباعة',       download:'تحميل',
    copy:'نسخ',          copied:'تم النسخ!',   noText:'لا يوجد نص.',
    mergePdf:'دمج PDF',  splitPdf:'تقسيم PDF', startTask:'بدء المهمة',
    success:'تم بنجاح!', newTask:'مهمة جديدة',
    forceA4:'نسبة A4',   stickers:'ملصقات',   aiCover:'ذكاء اصطناعي',
    generate:'توليد النصوص', generating:'جاري التوليد…',
    dropHere:'اسحب المستند (PDF أو صورة) هنا أو اضغط للرفع',
    supportedFormats:'PDF, JPG, PNG, WEBP, HEIC',
    elements:'عناصر',    styles:'التصميم',     colors:'ألوان',
    layerUp:'للأمام',    layerDown:'للخلف',    opacity:'الشفافية',
    textColor:'لون النصوص', bgColor:'لون الخلفية', borderColor:'لون الأشكال',
    fontType:'نوع الخط', frameStyle:'نمط الإطار',
    convertMode:'محوّل', mergeMode:'دمج',      splitMode:'تقسيم',
    editMode:'تحرير PDF', willMerge:'سيتم دمج {n} ملفات',
    subject:'المادة',    grade:'الصف',         teacher:'المعلم',
    filters:'فلاتر',     beforeAfter:'قبل / بعد',
    noHistory:'لا توجد مشاريع محفوظة بعد',
    savedToHistory:'تم الحفظ في المشاريع ✓',
    today:'اليوم',       yesterday:'أمس',
    pdfPageNumbers:'ترقيم الصفحات', pdfStamp:'ختم على الصفحات',
    deleteAll:'حذف الكل', all:'الكل',
    fileCountMsg:'{n} عملية محفوظة',
    
    // Auth translations
    loginTitle: 'تسجيل الدخول إلى برينت برو',
    loginSubtitle: 'إدارة مشاريعك ومزامنتها على جميع أجهزتك',
    email: 'البريد الإلكتروني',
    password: 'كلمة المرور',
    signIn: 'تسجيل الدخول',
    signUp: 'إنشاء حساب جديد',
    or: 'أو الاستمرار بواسطة',
    signInWithGoogle: 'تسجيل بواسطة جوجل',
    continueAsGuest: 'الدخول كزائر',
    logout: 'تسجيل الخروج',
    noAccount: 'ليس لديك حساب؟ إنشاء حساب',
    hasAccount: 'لديك حساب بالفعل؟ تسجيل الدخول',
    guestWarning: 'تنبيه: كزائر، سيتم حفظ مشاريعك محلياً على هذا الجهاز فقط وسوف تُفقد إذا قمت بمسح بيانات المتصفح.',
    invalidEmail: 'البريد الإلكتروني غير صالح.',
    userNotFound: 'المستخدم غير موجود أو كلمة المرور خاطئة.',
    emailInUse: 'البريد الإلكتروني مستخدم بالفعل.',
    weakPassword: 'كلمة المرور ضعيفة للغاية (يجب ألا تقل عن 6 أحرف).',
    authError: 'حدث خطأ أثناء تسجيل الدخول. يرجى المحاولة مرة أخرى.',
  },
  en: {
    appTitle:'PrintPro', appSubtitle:'Smart Print Shop Tools',
    assistantTab:'Smart Assistant',
    cleanerTab:'Doc Cleaner', designerTab:'Cover Designer',
    converterTab:'PDF Tools', historyTab:'Projects',
    upload:'Upload',   camera:'Camera',     autoEnhance:'Auto Enhance',
    invert:'Invert',   crop:'Crop',         extractText:'OCR',
    watermark:'Watermark', adjust:'Adjust', rotate:'Rotate',
    brightness:'Brightness', contrast:'Contrast', grayscale:'Grayscale',
    saveImg:'Save Image', savePdf:'Save PDF', addPage:'Add Page',
    processing:'Processing…', preview:'Preview',
    confirmCrop:'Confirm', cancel:'Cancel',
    print:'Print', download:'Download',
    copy:'Copy', copied:'Copied!', noText:'No text found.',
    mergePdf:'Merge PDFs', splitPdf:'Split PDF', startTask:'Start',
    success:'Done!', newTask:'New Task',
    forceA4:'A4 Ratio', stickers:'Stickers', aiCover:'AI Generate',
    generate:'Generate Text', generating:'Generating…',
    dropHere:'Drop document (PDF or image) here or click to upload',
    supportedFormats:'PDF, JPG, PNG, WEBP, HEIC',
    elements:'Elements', styles:'Styles', colors:'Colors',
    layerUp:'Forward', layerDown:'Back', opacity:'Opacity',
    textColor:'Text Color', bgColor:'Background', borderColor:'Shape Color',
    fontType:'Font', frameStyle:'Frame',
    convertMode:'Convert', mergeMode:'Merge', splitMode:'Split',
    editMode:'Edit PDF', willMerge:'Will merge {n} files',
    subject:'Subject', grade:'Grade', teacher:'Teacher',
    filters:'Filters', beforeAfter:'Before / After',
    noHistory:'No saved projects yet',
    savedToHistory:'Saved to projects ✓',
    today:'Today', yesterday:'Yesterday',
    pdfPageNumbers:'Page Numbers', pdfStamp:'Stamp Pages',
    deleteAll:'Delete All', all:'All',
    fileCountMsg:'{n} saved operations',
    
    // Auth translations
    loginTitle: 'Sign in to PrintPro',
    loginSubtitle: 'Manage and sync your projects across all devices',
    email: 'Email Address',
    password: 'Password',
    signIn: 'Sign In',
    signUp: 'Create New Account',
    or: 'Or continue with',
    signInWithGoogle: 'Sign In with Google',
    continueAsGuest: 'Continue as Guest',
    logout: 'Sign Out',
    noAccount: "Don't have an account? Sign Up",
    hasAccount: 'Already have an account? Sign In',
    guestWarning: 'Warning: As a guest, your projects will only be saved locally and will be lost if you clear your browser data.',
    invalidEmail: 'Invalid email address.',
    userNotFound: 'User not found or incorrect password.',
    emailInUse: 'Email already in use.',
    weakPassword: 'Password is too weak (must be at least 6 characters).',
    authError: 'Authentication error occurred. Please try again.',
  },
}

// ─── Local Storage Helper ─────────────────────────────────────────────────────
const HIST_KEY = 'pp_hist_v3'

// ─── Context ──────────────────────────────────────────────────────────────────
export const AppContext = createContext()

export const useApp = () => useContext(AppContext)

export default function AppProvider({ children, lang, setLang }) {
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [guestMode, setGuestMode] = useState(false)
  const [history, setHistory] = useState([])
  const [activeEditDesign, setActiveEditDesign] = useState(null)
  const [activeEditCleaner, setActiveEditCleaner] = useState(null)
  const [sharedFiles, setSharedFiles] = useState([])

  // Translate function
  const t = useCallback((key, vars = {}) => {
    let s = T[lang]?.[key] ?? key
    Object.entries(vars).forEach(([k, v]) => { s = s.replace(`{${k}}`, v) })
    return s
  }, [lang])

  // Monitor Authentication State change
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser)
      setAuthLoading(false)
      if (firebaseUser) {
        setGuestMode(false)
      }
    })
    return unsubscribe
  }, [])

  // Sync History (realtime from Firestore if logged in, otherwise localStorage)
  useEffect(() => {
    if (authLoading) return

    if (user) {
      // Real-time Firestore sync
      const q = query(
        collection(db, 'users', user.uid, 'history'),
        orderBy('date', 'desc')
      )
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const items = []
        snapshot.forEach((doc) => {
          items.push({ docId: doc.id, ...doc.data() })
        })
        setHistory(items)
      }, (err) => {
        console.error("Firestore history sync error:", err)
      })
      return unsubscribe
    } else {
      // Load from localStorage
      try {
        const localData = JSON.parse(localStorage.getItem(HIST_KEY) || '[]')
        setHistory(localData)
      } catch (e) {
        setHistory([])
      }
    }
  }, [user, authLoading])

  // Sign In Methods
  const loginWithGoogle = async () => {
    setAuthLoading(true)
    try {
      await signInWithPopup(auth, googleProvider)
    } catch (error) {
      console.error("Google sign in error:", error)
      setAuthLoading(false)
      throw error
    }
  }

  const loginWithEmail = async (email, password) => {
    setAuthLoading(true)
    try {
      await signInWithEmailAndPassword(auth, email, password)
    } catch (error) {
      setAuthLoading(false)
      throw error
    }
  }

  const signupWithEmail = async (email, password) => {
    setAuthLoading(true)
    try {
      await createUserWithEmailAndPassword(auth, email, password)
    } catch (error) {
      setAuthLoading(false)
      throw error
    }
  }

  const logout = async () => {
    setAuthLoading(true)
    try {
      await firebaseSignOut(auth)
      setGuestMode(false)
      setHistory([])
    } catch (error) {
      console.error("Sign out error:", error)
    } finally {
      setAuthLoading(false)
    }
  }

  // History manipulation methods
  const addHistoryItem = async (item) => {
    const newItem = {
      ...item,
      id: Date.now(),
      date: new Date().toISOString()
    }

    if (user) {
      // Save to Firestore
      try {
        const docRef = doc(db, 'users', user.uid, 'history', newItem.id.toString())
        await setDoc(docRef, newItem)
      } catch (e) {
        console.error("Error saving history item to Firestore:", e)
      }
    } else {
      // Save to localStorage
      const updated = [newItem, ...history].slice(0, 40)
      setHistory(updated)
      try {
        localStorage.setItem(HIST_KEY, JSON.stringify(updated))
      } catch (e) {
        console.error("Error saving history to localStorage:", e)
      }
    }
  }

  const deleteHistoryItem = async (id) => {
    if (user) {
      // Delete from Firestore
      try {
        const docRef = doc(db, 'users', user.uid, 'history', id.toString())
        await deleteDoc(docRef)
      } catch (e) {
        console.error("Error deleting history item from Firestore:", e)
      }
    } else {
      // Delete from localStorage
      const updated = history.filter(item => item.id !== id)
      setHistory(updated)
      try {
        localStorage.setItem(HIST_KEY, JSON.stringify(updated))
      } catch (e) {
        console.error("Error saving history to localStorage:", e)
      }
    }
  }

  const clearHistory = async () => {
    if (user) {
      try {
        // We delete docs in batch
        const q = query(collection(db, 'users', user.uid, 'history'))
        const snapshot = await getDocs(q)
        const batch = writeBatch(db)
        snapshot.forEach((d) => {
          batch.delete(d.ref)
        })
        await batch.commit()
      } catch (e) {
        console.error("Error clearing history in Firestore:", e)
      }
    } else {
      setHistory([])
      try {
        localStorage.removeItem(HIST_KEY)
      } catch (e) {
        console.error("Error clearing history from localStorage:", e)
      }
    }
  }

  return (
    <AppContext.Provider
      value={{
        t,
        lang,
        setLang,
        user,
        authLoading,
        guestMode,
        setGuestMode,
        history,
        addHistoryItem,
        deleteHistoryItem,
        clearHistory,
        loginWithGoogle,
        loginWithEmail,
        signupWithEmail,
        logout,
        activeEditDesign,
        setActiveEditDesign,
        activeEditCleaner,
        setActiveEditCleaner,
        sharedFiles,
        setSharedFiles
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

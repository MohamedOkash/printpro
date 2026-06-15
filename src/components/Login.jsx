import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { LogIn, UserPlus, Chrome, AlertCircle, Printer, Globe } from 'lucide-react'

export default function Login() {
  const {
    t,
    lang,
    setLang,
    loginWithGoogle,
    loginWithEmail,
    signupWithEmail,
    setGuestMode
  } = useApp()

  const [activeTab, setActiveTab] = useState('signin') // 'signin' or 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleAuth = async (e) => {
    e.preventDefault()
    if (!email || !password) return
    setError('')
    setLoading(true)
    try {
      if (activeTab === 'signin') {
        await loginWithEmail(email, password)
      } else {
        await signupWithEmail(email, password)
      }
    } catch (err) {
      console.error(err)
      const code = err.code
      if (code === 'auth/invalid-email') setError(t('invalidEmail'))
      else if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setError(t('userNotFound'))
      } else if (code === 'auth/email-already-in-use') setError(t('emailInUse'))
      else if (code === 'auth/weak-password') setError(t('weakPassword'))
      else setError(t('authError'))
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = async () => {
    setError('')
    setLoading(true)
    try {
      await loginWithGoogle()
    } catch (err) {
      console.error(err)
      setError(err.code ? `${t('authError')} (${err.code})` : err.message || t('authError'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen bg-[#08080a] flex items-center justify-center p-4 relative overflow-hidden"
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
      style={{ fontFamily: lang === 'ar' ? '"Cairo",sans-serif' : '"Inter",sans-serif' }}
    >
      {/* Background gradients */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-indigo-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-purple-600/10 blur-[120px] pointer-events-none" />

      {/* Language Switcher */}
      <div className="absolute top-4 right-4 z-50">
        <button
          onClick={() => setLang(l => l === 'ar' ? 'en' : 'ar')}
          className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-full border border-white/5 transition-colors text-slate-300 text-xs font-bold"
        >
          <Globe size={13} className="text-blue-400" />
          <span>{lang === 'ar' ? 'English' : 'عربي'}</span>
        </button>
      </div>

      <div className="w-full max-w-md bg-[#0d0d10]/60 backdrop-blur-xl border border-white/5 rounded-3xl p-6 md:p-8 shadow-2xl flex flex-col gap-6 relative z-10">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
            <Printer size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">{t('appTitle')}</h1>
            <p className="text-xs text-indigo-400 font-bold mt-0.5">{t('appSubtitle')}</p>
          </div>
          <h2 className="text-lg font-bold text-slate-300 mt-2">{t('loginTitle')}</h2>
          <p className="text-xs text-slate-500">{t('loginSubtitle')}</p>
        </div>

        {/* Tabs */}
        <div className="flex bg-[#131317] rounded-2xl p-1 border border-white/5 gap-1">
          <button
            onClick={() => { setActiveTab('signin'); setError(''); }}
            className={`flex-grow py-3 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2
              ${activeTab === 'signin' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
          >
            <LogIn size={13} />
            <span>{t('signIn')}</span>
          </button>
          <button
            onClick={() => { setActiveTab('signup'); setError(''); }}
            className={`flex-grow py-3 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2
              ${activeTab === 'signup' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
          >
            <UserPlus size={13} />
            <span>{t('signUp')}</span>
          </button>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-2xl text-xs font-bold flex items-center gap-2">
            <AlertCircle size={13} className="flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleAuth} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-400">{t('email')}</label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="w-full bg-[#131317] border border-white/5 focus:border-indigo-500 rounded-xl px-4 py-3 text-white text-sm font-bold outline-none transition-colors"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-400">{t('password')}</label>
            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-[#131317] border border-white/5 focus:border-indigo-500 rounded-xl px-4 py-3 text-white text-sm font-bold outline-none transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 text-white font-black py-4 rounded-2xl shadow-lg shadow-indigo-600/10 active:scale-95 transition-all text-sm mt-2 flex items-center justify-center gap-2"
          >
            {activeTab === 'signin' ? t('signIn') : t('signUp')}
          </button>
        </form>

        <div className="relative flex py-2 items-center">
          <div className="flex-grow border-t border-white/5"></div>
          <span className="flex-shrink mx-4 text-slate-500 text-xs font-bold">{t('or')}</span>
          <div className="flex-grow border-t border-white/5"></div>
        </div>

        {/* Social Logins */}
        <button
          onClick={handleGoogle}
          disabled={loading}
          className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2.5 active:scale-95 transition-all text-sm"
        >
          <Chrome size={16} className="text-red-400" />
          <span>{t('signInWithGoogle')}</span>
        </button>

        {/* Guest Mode */}
        <div className="flex flex-col items-center gap-3 mt-2">
          <button
            onClick={() => setGuestMode(true)}
            className="text-xs font-bold text-indigo-400 hover:text-indigo-300 underline transition-colors"
          >
            {t('continueAsGuest')}
          </button>
          <p className="text-[10px] text-slate-600 text-center leading-normal max-w-[280px]">
            {t('guestWarning')}
          </p>
        </div>
      </div>
    </div>
  )
}

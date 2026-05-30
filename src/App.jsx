import { useState } from 'react'
import { Printer, Sliders, LayoutTemplate, FileArchive, History, Globe, LogOut, Sparkles } from 'lucide-react'
import { useApp } from './context/AppContext'
import DocumentCleaner  from './components/DocumentCleaner'
import CoverDesigner    from './components/CoverDesigner'
import FileConverter    from './components/FileConverter'
import ProjectHistory   from './components/ProjectHistory'
import Login            from './components/Login'
import SmartAssistant   from './components/SmartAssistant'

const TABS = [
  { id:'assistant', icon:Sparkles,       labelKey:'assistantTab',c:'indigo'  },
  { id:'cleaner',   icon:Sliders,        labelKey:'cleanerTab',  c:'emerald' },
  { id:'designer',  icon:LayoutTemplate, labelKey:'designerTab', c:'purple'  },
  { id:'converter', icon:FileArchive,    labelKey:'converterTab',c:'amber'   },
  { id:'history',   icon:History,        labelKey:'historyTab',  c:'sky'     },
]

const TAB_ACTIVE_CLASSES = {
  indigo:  'text-indigo-400 bg-indigo-500/10 border-indigo-500/25',
  emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25',
  purple:  'text-purple-400 bg-purple-500/10 border-purple-500/25',
  amber:   'text-amber-400 bg-amber-500/10 border-amber-500/25',
  sky:     'text-sky-400 bg-sky-500/10 border-sky-500/25',
}

const TAB_MOBILE_ACTIVE_TEXT = {
  indigo:  'text-indigo-400',
  emerald: 'text-emerald-400',
  purple:  'text-purple-400',
  amber:   'text-amber-400',
  sky:     'text-sky-400',
}


export default function App() {
  const {
    t,
    lang,
    setLang,
    user,
    authLoading,
    guestMode,
    logout
  } = useApp()

  const [tab, setTab] = useState('assistant')

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#08080a] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-indigo-500"></div>
      </div>
    )
  }

  if (!user && !guestMode) {
    return <Login />
  }

  return (
    <div
      className="flex flex-col md:flex-row h-[100dvh] bg-[#08080a] text-slate-200 overflow-hidden"
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
      style={{ fontFamily: lang === 'ar' ? '"Cairo",sans-serif' : '"Inter",sans-serif' }}
    >
      {/* ── Desktop Sidebar ── */}
      <aside className="hidden md:flex flex-col w-60 bg-[#0d0d10] border-r border-white/5 flex-shrink-0">
        <div className="flex items-center gap-3 p-5 border-b border-white/5">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
            <Printer size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-black text-white leading-none">{t('appTitle')}</h1>
            <p className="text-[10px] text-indigo-400 font-bold mt-0.5">{t('appSubtitle')}</p>
          </div>
        </div>
        <nav className="flex flex-col gap-1 p-3 flex-1">
          {TABS.map(({ id, icon: Icon, labelKey, c }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all border text-sm font-bold
                ${tab === id ? TAB_ACTIVE_CLASSES[c] : 'text-slate-500 border-transparent hover:bg-white/5'}`}
            >
              <Icon size={17} /><span>{t(labelKey)}</span>
            </button>
          ))}
        </nav>

        {/* Language Switcher */}
        <div className="p-3 border-t border-white/5">
          <button
            onClick={() => setLang(l => l === 'ar' ? 'en' : 'ar')}
            className="w-full flex items-center gap-2 p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-colors"
          >
            <Globe size={16} className="text-blue-400" />
            <span className="text-sm font-bold text-slate-300">{lang === 'ar' ? 'English' : 'عربي'}</span>
          </button>
        </div>

        {/* User Info / Logout */}
        {(user || guestMode) && (
          <div className="p-3 border-t border-white/5 flex items-center justify-between gap-2 bg-[#0a0a0c]/50">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] text-slate-500 font-bold leading-none">
                {user ? (lang === 'ar' ? 'مسجل كـ' : 'Logged in as') : (lang === 'ar' ? 'وضع الزائر' : 'Guest Mode')}
              </p>
              <p className="text-xs text-slate-300 font-bold mt-1.5 truncate" title={user ? user.email : ''}>
                {user ? (user.displayName || user.email) : (lang === 'ar' ? 'حفظ محلي فقط' : 'Local Storage Only')}
              </p>
            </div>
            <button
              onClick={logout}
              className="p-2.5 hover:bg-red-500/10 hover:text-red-400 rounded-xl text-slate-500 transition-colors flex-shrink-0"
              title={user ? (lang === 'ar' ? 'تسجيل الخروج' : 'Sign Out') : (lang === 'ar' ? 'تسجيل الدخول' : 'Sign In')}
            >
              <LogOut size={16} />
            </button>
          </div>
        )}
      </aside>

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile header */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-[#0d0d10] border-b border-white/5 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Printer size={15} className="text-white" />
            </div>
            <span className="font-black text-white">{t('appTitle')}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLang(l => l === 'ar' ? 'en' : 'ar')}
              className="text-[10px] font-black text-slate-300 bg-white/5 px-2.5 py-1.5 rounded-full"
            >
              {lang === 'ar' ? 'EN' : 'AR'}
            </button>
            <button
              onClick={logout}
              className="p-2 bg-white/5 hover:bg-red-500/10 hover:text-red-400 rounded-full text-slate-400 transition-colors"
              title={user ? (lang === 'ar' ? 'تسجيل الخروج' : 'Sign Out') : (lang === 'ar' ? 'تسجيل الدخول' : 'Sign In')}
            >
              <LogOut size={14} />
            </button>
          </div>
        </header>

        {/* Active component */}
        <main className="flex-1 overflow-hidden">
          {tab === 'assistant' && <SmartAssistant onNavigate={setTab} />}
          {tab === 'cleaner'   && <DocumentCleaner />}
          {tab === 'designer'  && <CoverDesigner />}
          {tab === 'converter' && <FileConverter />}
          {tab === 'history'   && <ProjectHistory onNavigate={setTab} />}
        </main>

        {/* Mobile bottom nav */}
        <nav className="md:hidden flex border-t border-white/5 bg-[#0d0d10] flex-shrink-0">
          {TABS.map(({ id, icon: Icon, labelKey, c }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex-1 flex flex-col items-center justify-center gap-1 py-2.5 transition-all
                ${tab === id ? TAB_MOBILE_ACTIVE_TEXT[c] : 'text-slate-600'}`}
            >
              <Icon size={18} />
              <span className="text-[9px] font-bold">{t(labelKey)}</span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  )
}

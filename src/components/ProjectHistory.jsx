import { useState } from 'react'
import {
  History, FolderOpen, Trash2,
  Image as ImageIcon, FileText, LayoutTemplate,
  FilePlus2, SplitSquareHorizontal, FileEdit, FileArchive,
} from 'lucide-react'
import { useApp } from '../context/AppContext'

export default function ProjectHistory() {
  const {
    t,
    lang,
    history,
    deleteHistoryItem,
    clearHistory
  } = useApp()

  const [filter, setFilter] = useState('all')

  const TYPE_CFG = {
    image:  { label: lang === 'ar' ? 'صورة' : 'Image',       c: 'emerald', icon: ImageIcon },
    pdf:    { label: 'PDF',                                   c: 'rose',    icon: FileText },
    cover:  { label: lang === 'ar' ? 'غلاف' : 'Cover',        c: 'purple',  icon: LayoutTemplate },
    merge:  { label: lang === 'ar' ? 'دمج' : 'Merge',         c: 'indigo',  icon: FilePlus2 },
    split:  { label: lang === 'ar' ? 'تقسيم' : 'Split',       c: 'sky',     icon: SplitSquareHorizontal },
    edit:   { label: lang === 'ar' ? 'تحرير PDF' : 'Edit PDF', c: 'orange',  icon: FileEdit },
    convert:{ label: lang === 'ar' ? 'تحويل' : 'Convert',     c: 'amber',   icon: FileArchive },
  }

  const TYPE_COLORS = {
    emerald: { badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40', icon: 'text-emerald-400', thumb: 'bg-emerald-500/10', label: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' },
    rose:    { badge: 'bg-rose-500/20 text-rose-300 border-rose-500/40',           icon: 'text-rose-400',    thumb: 'bg-rose-500/10',    label: 'bg-rose-500/15 text-rose-400 border border-rose-500/20'       },
    purple:  { badge: 'bg-purple-500/20 text-purple-300 border-purple-500/40',     icon: 'text-purple-400',  thumb: 'bg-purple-500/10',  label: 'bg-purple-500/15 text-purple-400 border border-purple-500/20'   },
    indigo:  { badge: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',     icon: 'text-indigo-400',  thumb: 'bg-indigo-500/10',  label: 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/20'   },
    sky:     { badge: 'bg-sky-500/20 text-sky-300 border-sky-500/40',               icon: 'text-sky-400',     thumb: 'bg-sky-500/10',     label: 'bg-sky-500/15 text-sky-400 border border-sky-500/20'         },
    orange:  { badge: 'bg-orange-500/20 text-orange-300 border-orange-500/40',     icon: 'text-orange-400',  thumb: 'bg-orange-500/10',  label: 'bg-orange-500/15 text-orange-400 border border-orange-500/20'   },
    amber:   { badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',        icon: 'text-amber-400',   thumb: 'bg-amber-500/10',  label: 'bg-amber-500/15 text-amber-400 border border-amber-500/20'     },
  }


  const formatDate = (iso) => {
    if (!iso) return ''
    const d = new Date(iso)
    const now = new Date()
    const diff = Math.floor((now - d) / 86400000)
    if (diff === 0) {
      return (lang === 'ar' ? 'اليوم ' : 'Today ') + d.toLocaleTimeString(lang === 'ar' ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' })
    }
    if (diff === 1) {
      return lang === 'ar' ? 'أمس' : 'Yesterday'
    }
    return d.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US')
  }

  const types = ['all', ...Object.keys(TYPE_CFG)]
  const filtered = filter === 'all' ? history : history.filter(i => i.type === filter)

  return (
    <div className="flex flex-col h-full bg-[#0a0a0d] overflow-hidden">
      <div className="flex items-center justify-between px-4 md:px-6 py-4 border-b border-white/5 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-sky-500/10 border border-sky-500/20 rounded-xl flex items-center justify-center">
            <History size={17} className="text-sky-400" />
          </div>
          <div>
            <h2 className="font-black text-white text-base">{t('historyTab')}</h2>
            <p className="text-xs text-slate-500 font-bold">{t('fileCountMsg', { n: history.length })}</p>
          </div>
        </div>
        {history.length > 0 && (
          <button
            onClick={clearHistory}
            className="flex items-center gap-1.5 text-xs font-bold text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 px-3 py-2 rounded-xl border border-red-500/20 transition-colors"
          >
            <Trash2 size={11} />{t('deleteAll')}
          </button>
        )}
      </div>

      {history.length > 0 && (
        <div className="flex gap-2 px-4 py-3 border-b border-white/5 nx flex-shrink-0">
          {types.map(type => {
            const cfg = TYPE_CFG[type]
            const count = type === 'all' ? history.length : history.filter(i => i.type === type).length
            if (count === 0 && type !== 'all') return null
            const label = type === 'all' ? t('all') : cfg?.label || type
            const c = type === 'all' ? 'sky' : cfg?.c || 'sky'
            return (
              <button
                key={type}
                onClick={() => setFilter(type)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all
                  ${filter === type ? TYPE_COLORS[c].badge : 'bg-white/5 text-slate-400 border-white/5 hover:border-white/15'}`}
              >
                {label}<span className="opacity-60">{count}</span>
              </button>
            )
          })}
        </div>
      )}

      <div className="flex-1 sc p-4 md:p-6">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center gap-4 py-20">
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center">
              <FolderOpen size={32} className="text-slate-600" />
            </div>
            <p className="text-slate-500 font-bold">{t('noHistory')}</p>
            <p className="text-xs text-slate-600">
              {lang === 'ar' ? 'ستظهر هنا كل العمليات التي تقوم بها تلقائياً' : 'All your operations will automatically appear here'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(item => {
              const cfg = TYPE_CFG[item.type] || TYPE_CFG.image
              const Icon = cfg.icon
              return (
                <div key={item.id} className="fu flex items-center gap-3 bg-[#131317] border border-white/5 rounded-2xl p-3 hover:border-white/10 transition-colors group">
                  <div className={`flex-shrink-0 w-12 h-14 rounded-xl overflow-hidden border border-white/5 flex items-center justify-center ${TYPE_COLORS[cfg.c].thumb}`}>
                    {item.thumb ? (
                      <img src={item.thumb} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Icon size={18} className={TYPE_COLORS[cfg.c].icon} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${TYPE_COLORS[cfg.c].label}`}>
                        {cfg.label}
                      </span>
                      {item.filter && item.filter !== 'raw' && (
                        <span className="text-[10px] text-slate-500 font-bold">{item.filter}</span>
                      )}
                    </div>
                    <p className="text-sm font-bold text-slate-200 truncate">{item.name}</p>
                    <p className="text-xs text-slate-500 font-bold mt-0.5">{formatDate(item.date)}</p>
                  </div>
                  <button
                    onClick={() => deleteHistoryItem(item.id)}
                    className="opacity-0 group-hover:opacity-100 p-2 bg-red-500/10 hover:bg-red-500/20 rounded-xl text-red-400 transition-all flex-shrink-0"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

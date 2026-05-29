// ─── Filter Presets ───────────────────────────────────────────────────────────
export const FILTER_PRESETS = [
  { id:'raw',    label:'بدون فلتر',   br:100, ct:100, gs:0,   inv:false, adapt:false, sharp:false, shadow:false },
  { id:'doc',    label:'مستند نظيف',  br:230, ct:260, gs:100, inv:false, adapt:true,  sharp:true,  shadow:false },
  { id:'photo',  label:'صورة ملونة',  br:120, ct:155, gs:0,   inv:false, adapt:false, sharp:true,  shadow:false },
  { id:'shadow', label:'إزالة الظل',  br:180, ct:170, gs:0,   inv:false, adapt:false, sharp:false, shadow:true  },
  { id:'high',   label:'تباين عالٍ',  br:110, ct:380, gs:100, inv:false, adapt:false, sharp:true,  shadow:false },
  { id:'soft',   label:'ناعم',        br:115, ct:115, gs:0,   inv:false, adapt:false, sharp:false, shadow:false },
  { id:'old',    label:'كلاسيكي',     br:145, ct:180, gs:100, inv:false, adapt:false, sharp:false, shadow:false },
]

// ─── Cover Designer ───────────────────────────────────────────────────────────
export const FONTS = ['Cairo','Tajawal','Almarai','Amiri','Changa','Alexandria']

export const STICKERS = [
  '🌟','📚','🎓','🔬','💡','🏆','✏️','📖','🎯','🥇',
  '💯','🔥','✨','🚀','🧠','📝','🌙','⭐','🌈','🦁','📌','🖊️',
]

export const FRAMES = [
  { id:'modern-waves',    name:'أمواج عصري'       },
  { id:'islamic-pattern', name:'زخارف إسلامية'     },
  { id:'art-deco',        name:'آرت ديكو'           },
  { id:'modern-dots',     name:'نقاط عصرية'        },
  { id:'floral-corners',  name:'أوراق نباتية'      },
  { id:'triangles-edge',  name:'مثلثات'            },
  { id:'bubbles',         name:'فقاعات'            },
  { id:'diamonds',        name:'معينات'            },
  { id:'circuit-board',   name:'لوحة إلكترونية'    },
  { id:'arabic-arch',     name:'قوس إسلامي'        },
  { id:'stars-corners',   name:'نجوم الزوايا'      },
  { id:'memphis-geo',     name:'هندسي شبابي'       },
  { id:'wave-border',     name:'حد موجي'           },
  { id:'elegant-lines',   name:'خطوط راقية'        },
  { id:'corner-ribbons',  name:'شرائط'             },
  { id:'confetti',        name:'احتفال'            },
]

// ─── History type config ──────────────────────────────────────────────────────
export const TYPE_CFG = {
  image:  { label:'صورة',       c:'emerald' },
  pdf:    { label:'PDF',         c:'rose'    },
  cover:  { label:'غلاف',       c:'purple'  },
  merge:  { label:'دمج',         c:'indigo'  },
  split:  { label:'تقسيم',      c:'sky'     },
  edit:   { label:'تحرير PDF',  c:'orange'  },
  convert:{ label:'تحويل',      c:'amber'   },
}

import { useMemo } from 'react'

/**
 * Renders the decorative frame/border SVG for the cover designer.
 * Pure rendering — no state, accepts borderColor and frameStyle as props.
 */
export default function CoverFrame({ borderColor: bc, frameStyle }) {
  return useMemo(() => {
    const frames = {
      'modern-waves': (
        <>
          <svg viewBox="0 0 1440 320" className="absolute top-0 left-0 w-full" preserveAspectRatio="none" style={{ height: '18%' }}>
            <path fill={bc} d="M0,96L48,112C96,128,192,160,288,160C384,160,480,128,576,112C672,96,768,96,864,112C960,128,1056,160,1152,165.3C1248,171,1344,149,1392,138.7L1440,128L1440,0L0,0Z" />
          </svg>
          <svg viewBox="0 0 1440 320" className="absolute bottom-0 left-0 w-full rotate-180" preserveAspectRatio="none" style={{ height: '18%' }}>
            <path fill={bc} d="M0,96L48,112C96,128,192,160,288,160C384,160,480,128,576,112C672,96,768,96,864,112C960,128,1056,160,1152,165.3C1248,171,1344,149,1392,138.7L1440,128L1440,0L0,0Z" />
          </svg>
        </>
      ),
      'islamic-pattern': (
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <svg width="100%" height="100%">
            <defs>
              <pattern id="isl" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M20 0L30 10L40 20L30 30L20 40L10 30L0 20L10 10Z" fill="none" stroke={bc} strokeWidth="2" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#isl)" />
          </svg>
          <div className="absolute inset-3 border-[3px]" style={{ borderColor: bc }} />
        </div>
      ),
      'art-deco': (
        <>
          <div className="absolute inset-2 border" style={{ borderColor: bc }} />
          <div className="absolute inset-4 border-[4px]" style={{ borderColor: bc }} />
          <div className="absolute inset-6 border" style={{ borderColor: bc }} />
        </>
      ),
      'modern-dots': (
        <div className="absolute inset-0">
          <div className="absolute inset-0 opacity-25" style={{ backgroundImage: `radial-gradient(${bc} 2.5px, transparent 2.5px)`, backgroundSize: '18px 18px' }} />
          <div className="absolute inset-5 border-2" style={{ borderColor: bc }} />
        </div>
      ),
      'floral-corners': (
        <>
          <svg className="absolute top-0 left-0 w-24 h-24" viewBox="0 0 100 100">
            <path d="M10,10 C40,10 60,30 90,90 C70,60 40,40 10,10 Z" fill={bc} opacity="0.8" />
          </svg>
          <svg className="absolute bottom-0 right-0 w-24 h-24 rotate-180" viewBox="0 0 100 100">
            <path d="M10,10 C40,10 60,30 90,90 C70,60 40,40 10,10 Z" fill={bc} opacity="0.8" />
          </svg>
        </>
      ),
      'triangles-edge': (
        <>
          <svg className="absolute top-0 left-0 w-full h-10" preserveAspectRatio="none" viewBox="0 0 100 10">
            <polygon points="0,0 5,10 10,0 15,10 20,0 25,10 30,0 35,10 40,0 45,10 50,0 55,10 60,0 65,10 70,0 75,10 80,0 85,10 90,0 95,10 100,0" fill={bc} />
          </svg>
          <svg className="absolute bottom-0 left-0 w-full h-10" preserveAspectRatio="none" viewBox="0 0 100 10">
            <polygon points="0,10 5,0 10,10 15,0 20,10 25,0 30,10 35,0 40,10 45,0 50,10 55,0 60,10 65,0 70,10 75,0 80,10 85,0 90,10 95,0 100,10" fill={bc} />
          </svg>
        </>
      ),
      'bubbles': (
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-12 -left-12 w-48 h-48 rounded-full opacity-35" style={{ backgroundColor: bc }} />
          <div className="absolute -bottom-16 -right-16 w-72 h-72 rounded-full opacity-25" style={{ backgroundColor: bc }} />
        </div>
      ),
      'diamonds': (
        <div className="absolute inset-0 opacity-15" style={{
          backgroundImage: `linear-gradient(45deg,${bc} 25%,transparent 25%,transparent 75%,${bc} 75%,${bc}),linear-gradient(45deg,${bc} 25%,transparent 25%)`,
          backgroundSize: '40px 40px', backgroundPosition: '0 0, 20px 20px',
        }} />
      ),
      'circuit-board': (
        <svg className="absolute inset-0 w-full h-full opacity-30" preserveAspectRatio="none">
          <path d="M0,50 L80,50 L100,70 L200,70" fill="none" stroke={bc} strokeWidth="3" />
          <circle cx="80" cy="50" r="5" fill={bc} />
          <path d="M400,20 L450,20 L470,40 L550,40" fill="none" stroke={bc} strokeWidth="3" />
          <circle cx="450" cy="20" r="5" fill={bc} />
        </svg>
      ),
      'arabic-arch': (
        <div className="absolute inset-4 border-4" style={{ borderColor: bc }}>
          <svg className="w-full h-28 absolute top-0" preserveAspectRatio="none" viewBox="0 0 100 50">
            <path d="M0,0 L0,20 Q50,60 100,20 L100,0 Z" fill={bc} />
          </svg>
        </div>
      ),
      'stars-corners': (
        <>
          <div className="absolute inset-6 border border-dashed opacity-40" style={{ borderColor: bc }} />
          {[[2,2],[2,null],[null,2],[null,null]].map(([t,l], i) => (
            <svg key={i} className={`absolute w-10 h-10 ${t !== null ? 'top-2' : 'bottom-2'} ${l !== null ? 'left-2' : 'right-2'}`} viewBox="0 0 100 100">
              <polygon points="50,0 60,40 100,50 60,60 50,100 40,60 0,50 40,40" fill={bc} />
            </svg>
          ))}
        </>
      ),
      'memphis-geo': (
        <>
          <div className="absolute top-8 left-8 w-20 h-20 opacity-25" style={{ backgroundImage: `radial-gradient(${bc} 3px, transparent 3px)`, backgroundSize: '10px 10px' }} />
          <svg className="absolute top-16 right-10 w-16 h-16 opacity-60" viewBox="0 0 100 100">
            <polygon points="50,10 90,90 10,90" fill="none" stroke={bc} strokeWidth="6" />
          </svg>
        </>
      ),
      'wave-border':    <div className="absolute inset-2" style={{ border: `10px solid ${bc}` }} />,
      'elegant-lines': (
        <>
          <div className="absolute top-8 left-8 right-8 h-0.5" style={{ backgroundColor: bc }} />
          <div className="absolute top-10 left-8 right-8 h-0.5 opacity-50" style={{ backgroundColor: bc }} />
          <div className="absolute bottom-8 left-8 right-8 h-0.5" style={{ backgroundColor: bc }} />
          <div className="absolute bottom-10 left-8 right-8 h-0.5 opacity-50" style={{ backgroundColor: bc }} />
        </>
      ),
      'corner-ribbons': (
        <>
          <div className="absolute top-0 left-0 w-32 h-32 overflow-hidden">
            <div className="absolute top-8 -left-10 w-44 h-8 -rotate-45" style={{ backgroundColor: bc }} />
          </div>
          <div className="absolute bottom-0 right-0 w-32 h-32 overflow-hidden">
            <div className="absolute bottom-8 -right-10 w-44 h-8 -rotate-45" style={{ backgroundColor: bc }} />
          </div>
        </>
      ),
      'confetti': (
        <div className="absolute top-0 left-0 w-full h-24 overflow-hidden opacity-60">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="absolute w-2 h-6 rounded-sm" style={{
              backgroundColor: ['#f43f5e','#6366f1','#f59e0b','#10b981','#3b82f6'][i % 5],
              left: `${i * 9 + 2}%`, top: `${20 + i * 4}%`,
              transform: `rotate(${i * 30}deg)`,
            }} />
          ))}
        </div>
      ),
      'academic-lines': (
        <>
          <div className="absolute inset-4 border-[2px]" style={{ borderColor: bc }} />
          <div className="absolute inset-6 border-[1px]" style={{ borderColor: bc }} />
        </>
      ),
      'tech-corners': (
        <>
          <div className="absolute top-4 left-4 w-12 h-12 border-t-4 border-l-4" style={{ borderColor: bc }} />
          <div className="absolute top-4 right-4 w-12 h-12 border-t-4 border-r-4" style={{ borderColor: bc }} />
          <div className="absolute bottom-4 left-4 w-12 h-12 border-b-4 border-l-4" style={{ borderColor: bc }} />
          <div className="absolute bottom-4 right-4 w-12 h-12 border-b-4 border-r-4" style={{ borderColor: bc }} />
        </>
      ),
      'gradient-mesh': (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-20 -left-20 w-80 h-80 rounded-full blur-[80px] opacity-40" style={{ backgroundColor: bc }} />
          <div className="absolute -bottom-20 -right-20 w-80 h-80 rounded-full blur-[80px] opacity-40" style={{ backgroundColor: bc }} />
        </div>
      ),
      'vintage-ornament': (
        <div className="absolute inset-4 border-2 pointer-events-none" style={{ borderColor: bc }}>
          <div className="absolute inset-2 border border-dashed pointer-events-none" style={{ borderColor: bc }} />
          <div className="absolute top-1 left-1 w-6 h-6 border-b border-r" style={{ borderColor: bc }} />
          <div className="absolute top-1 right-1 w-6 h-6 border-b border-l" style={{ borderColor: bc }} />
          <div className="absolute bottom-1 left-1 w-6 h-6 border-t border-r" style={{ borderColor: bc }} />
          <div className="absolute bottom-1 right-1 w-6 h-6 border-t border-l" style={{ borderColor: bc }} />
        </div>
      ),
      'stars-border': (
        <div className="absolute inset-4 border border-white/10 pointer-events-none">
          <div className="absolute top-2 left-2 right-2 flex justify-between pointer-events-none">
            {[...Array(6)].map((_, i) => (
              <span key={i} className="text-xs" style={{ color: bc }}>★</span>
            ))}
          </div>
          <div className="absolute bottom-2 left-2 right-2 flex justify-between pointer-events-none">
            {[...Array(6)].map((_, i) => (
              <span key={i} className="text-xs" style={{ color: bc }}>★</span>
            ))}
          </div>
        </div>
      ),
    }
    return frames[frameStyle] ?? frames['modern-waves']
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frameStyle, bc])
}

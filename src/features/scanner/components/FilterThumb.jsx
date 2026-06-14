import { useRef, useEffect } from 'react'

const FilterThumb = ({ preset, currentSrc, activeFilter, onSelect, lang }) => {
  const ref = useRef(null);
  useEffect(() => {
    if (!currentSrc || !ref.current) return;
    const ctx = ref.current.getContext('2d', { willReadFrequently: true });
    const img = new Image();
    img.onload = () => {
      ref.current.width = 56;
      ref.current.height = 72;
      ctx.filter = `invert(${preset.inv ? 100 : 0}%) brightness(${preset.br}%) contrast(${preset.ct}%) grayscale(${preset.gs}%)`;
      ctx.drawImage(img, 0, 0, 56, 72);
      ctx.filter = 'none';
    };
    img.src = currentSrc;
  }, [currentSrc]);
  const active = activeFilter === preset.id;
  return (
    <button onClick={() => onSelect(preset)}
      className={`flex-shrink-0 flex flex-col items-center gap-1.5 p-2 rounded-2xl border transition-all
        ${active ? 'border-indigo-500 bg-indigo-500/15 shadow-[0_0_10px_rgba(99,102,241,.3)]' : 'border-white/5 bg-white/5 hover:border-white/15'}`}>
      <canvas ref={ref} style={{ width: 48, height: 60, borderRadius: 8, display: 'block' }} />
      <span className={`text-[9px] font-bold whitespace-nowrap ${active ? 'text-indigo-300' : 'text-slate-500'}`}>
        {lang === 'ar' ? preset.label : preset.labelEn}
      </span>
    </button>
  );
};

export default FilterThumb;

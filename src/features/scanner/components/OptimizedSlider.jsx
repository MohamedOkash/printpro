import { useState, useEffect } from 'react'

const OptimizedSlider = ({ icon: Icon, label, val, setVal, min, max, c, type, canvasRef, currentFilters }) => {
  const [localVal, setLocalVal] = useState(val);

  useEffect(() => {
    setLocalVal(val);
  }, [val]);

  const handleDrag = (e) => {
    const v = Number(e.target.value);
    setLocalVal(v);
    if (canvasRef.current && currentFilters) {
      const filters = currentFilters();
      filters[type] = v;
      canvasRef.current.style.filter = `invert(${filters.invert ? 100 : 0}%) brightness(${filters.brightness}%) contrast(${filters.contrast}%) grayscale(${filters.grayscale}%)`;
    }
  };

  const handleCommit = () => {
    setVal(localVal);
  };

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-[11px] font-bold">
        <span className={`flex items-center gap-1.5 ${c}`}><Icon size={12} />{label}</span>
        <span className="text-slate-500">{localVal}%</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={localVal}
        onChange={handleDrag}
        onPointerUp={handleCommit}
        onTouchEnd={handleCommit}
        className="w-full h-1.5 accent-indigo-500 cursor-pointer"
      />
    </div>
  );
};

export default OptimizedSlider;

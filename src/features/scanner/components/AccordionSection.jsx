import { ChevronDown } from 'lucide-react'

const AccordionSection = ({ id, label, icon: Icon, color, children, activeSection, onToggle, currentSrc }) => {
  const active = activeSection === id;
  const disabled = !currentSrc && id !== 'upload';

  const handleClick = () => {
    if (disabled) return;
    onToggle(id, active);
  };

  return (
    <div className={`border-b border-white/5 ${disabled ? 'opacity-35' : ''}`}>
      <button
        onClick={handleClick}
        disabled={disabled}
        className={`w-full flex items-center justify-between p-4 font-bold transition-colors text-sm
          ${active ? `text-${color}-400 bg-white/[0.01]` : 'text-slate-400 hover:text-white hover:bg-white/[0.01]'}`}
      >
        <span className="flex items-center gap-2.5">
          <Icon size={16} />
          <span>{label}</span>
        </span>
        <ChevronDown size={14} className={`transition-transform duration-200 ${active ? 'rotate-180' : ''}`} />
      </button>
      {active && !disabled && (
        <div className="p-4 bg-[#0a0a0d]/40 space-y-4 border-t border-white/5 fu">
          {children}
        </div>
      )}
    </div>
  );
};

export default AccordionSection;

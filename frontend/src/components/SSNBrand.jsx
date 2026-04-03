const SSNBrand = ({ compact = false, light = false }) => {
  const textTone = light ? 'text-white' : 'text-slate-900';
  const subTone = light ? 'text-blue-100/90' : 'text-slate-500';
  const emblemBg = light ? 'bg-white/10 border-white/20' : 'bg-white border-slate-200';

  return (
    <div className="flex items-center gap-3">
      <div className={`h-11 rounded-xl border shadow-sm ${emblemBg} flex items-center justify-center px-2`}>
        <svg viewBox="0 0 160 54" className="h-8 w-[92px]" aria-hidden="true">
          <text
            x="3"
            y="41"
            fill="#1d4ed8"
            fontSize="48"
            fontWeight="900"
            fontStyle="italic"
            fontFamily="Arial Black, Arial, sans-serif"
            letterSpacing="-6"
          >
            ssn
          </text>
        </svg>
      </div>

      <div className="min-w-0">
        <div className={`font-semibold tracking-[0.18em] text-xs uppercase ${subTone}`}>
          SSN College of Engineering
        </div>
        {!compact && (
          <div className={`font-serif text-lg leading-tight ${textTone}`}>
            Question Paper Management System
          </div>
        )}
      </div>
    </div>
  );
};

export default SSNBrand;

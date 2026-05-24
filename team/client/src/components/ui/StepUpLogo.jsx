const sizes = {
  sm: { icon: 28, fontSize: 'text-lg', taglineSize: 'text-[9px]', gap: 'gap-2' },
  md: { icon: 36, fontSize: 'text-xl', taglineSize: 'text-[10px]', gap: 'gap-2.5' },
  lg: { icon: 44, fontSize: 'text-2xl', taglineSize: 'text-[11px]', gap: 'gap-3' },
};

export default function StepUpLogo({ size = 'md', showTagline = false }) {
  const s = sizes[size] || sizes.md;

  return (
    <div className={`inline-flex items-center ${s.gap}`}>
      <svg
        width={s.icon}
        height={s.icon}
        viewBox="0 0 80 80"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
      >
        <circle cx="40" cy="40" r="40" fill="#228be6" />
        <path
          d="M 20 55 L 35 40 L 50 48 L 65 25"
          fill="none"
          stroke="#ffffff"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M 50 25 L 65 25 L 65 40"
          fill="none"
          stroke="#ffffff"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <div className="flex flex-col">
        <span className={`${s.fontSize} font-bold text-primary-900 leading-none`}>
          StepUp
        </span>
        {showTagline && (
          <span className={`${s.taglineSize} font-bold text-primary-400 tracking-[2px] uppercase mt-0.5`}>
            MICRO-LEARNING
          </span>
        )}
      </div>
    </div>
  );
}

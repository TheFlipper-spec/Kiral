import React from 'react';

// Crisp, high-definition SVG flag icons for all supported countries
// Renders pixel-perfect across Windows, Linux, Android, and iOS (bypassing missing OS emoji glyphs)
const COUNTRY_SVGS: Record<string, React.ReactNode> = {
  ru: (
    <svg viewBox="0 0 640 480" className="w-full h-full rounded-[2px] shadow-sm">
      <rect width="640" height="160" fill="#ffffff" />
      <rect y="160" width="640" height="160" fill="#0039a6" />
      <rect y="320" width="640" height="160" fill="#d52b1e" />
    </svg>
  ),
  us: (
    <svg viewBox="0 0 640 480" className="w-full h-full rounded-[2px] shadow-sm">
      <rect width="640" height="480" fill="#bd3d44" />
      <path stroke="#fff" strokeWidth="37" d="M0,55H640M0,129H640M0,203H640M0,277H640M0,351H640M0,425H640" />
      <rect width="260" height="260" fill="#192f5d" />
      <circle cx="130" cy="130" r="80" fill="#ffffff" opacity="0.85" />
      <polygon points="130,70 148,124 205,124 159,158 177,212 130,178 83,212 101,158 55,124 112,124" fill="#192f5d" />
    </svg>
  ),
  kz: (
    <svg viewBox="0 0 640 480" className="w-full h-full rounded-[2px] shadow-sm">
      <rect width="640" height="480" fill="#00afca" />
      <circle cx="320" cy="240" r="70" fill="#fec50c" />
      <path d="M240,290 Q320,260 400,290 Q320,310 240,290" fill="#fec50c" />
    </svg>
  ),
  by: (
    <svg viewBox="0 0 640 480" className="w-full h-full rounded-[2px] shadow-sm">
      <rect width="640" height="320" fill="#c8313e" />
      <rect y="320" width="640" height="160" fill="#4aa658" />
      <rect width="70" height="480" fill="#ffffff" />
      <path d="M0,0 L35,60 L70,0 L35,120 L70,240 L35,360 L70,480 L0,480 Z" fill="#c8313e" />
    </svg>
  ),
  ua: (
    <svg viewBox="0 0 640 480" className="w-full h-full rounded-[2px] shadow-sm">
      <rect width="640" height="240" fill="#0057b7" />
      <rect y="240" width="640" height="240" fill="#ffd700" />
    </svg>
  ),
  uz: (
    <svg viewBox="0 0 640 480" className="w-full h-full rounded-[2px] shadow-sm">
      <rect width="640" height="150" fill="#1eb53a" />
      <rect y="150" width="640" height="180" fill="#ffffff" />
      <rect y="330" width="640" height="150" fill="#0099b5" />
      <rect y="145" width="640" height="10" fill="#ce1126" />
      <rect y="325" width="640" height="10" fill="#ce1126" />
    </svg>
  ),
  am: (
    <svg viewBox="0 0 640 480" className="w-full h-full rounded-[2px] shadow-sm">
      <rect width="640" height="160" fill="#d90012" />
      <rect y="160" width="640" height="160" fill="#0033a0" />
      <rect y="320" width="640" height="160" fill="#f2a800" />
    </svg>
  ),
  ge: (
    <svg viewBox="0 0 640 480" className="w-full h-full rounded-[2px] shadow-sm">
      <rect width="640" height="480" fill="#ffffff" />
      <rect x="270" width="100" height="480" fill="#ff0000" />
      <rect y="190" width="640" height="100" fill="#ff0000" />
      <rect x="100" y="70" width="50" height="50" fill="#ff0000" />
      <rect x="490" y="70" width="50" height="50" fill="#ff0000" />
      <rect x="100" y="360" width="50" height="50" fill="#ff0000" />
      <rect x="490" y="360" width="50" height="50" fill="#ff0000" />
    </svg>
  ),
  az: (
    <svg viewBox="0 0 640 480" className="w-full h-full rounded-[2px] shadow-sm">
      <rect width="640" height="160" fill="#00b9e4" />
      <rect y="160" width="640" height="160" fill="#ed2939" />
      <rect y="320" width="640" height="160" fill="#3f9c35" />
      <circle cx="310" cy="240" r="45" fill="#ffffff" />
      <circle cx="325" cy="240" r="38" fill="#ed2939" />
    </svg>
  ),
  de: (
    <svg viewBox="0 0 640 480" className="w-full h-full rounded-[2px] shadow-sm">
      <rect width="640" height="160" fill="#000000" />
      <rect y="160" width="640" height="160" fill="#dd0000" />
      <rect y="320" width="640" height="160" fill="#ffce00" />
    </svg>
  ),
  fr: (
    <svg viewBox="0 0 640 480" className="w-full h-full rounded-[2px] shadow-sm">
      <rect width="213" height="480" fill="#002395" />
      <rect x="213" width="214" height="480" fill="#ffffff" />
      <rect x="427" width="213" height="480" fill="#ed2939" />
    </svg>
  ),
  gb: (
    <svg viewBox="0 0 640 480" className="w-full h-full rounded-[2px] shadow-sm">
      <rect width="640" height="480" fill="#012169" />
      <path d="M0,0 L640,480 M640,0 L0,480" stroke="#ffffff" strokeWidth="60" />
      <path d="M0,0 L640,480 M640,0 L0,480" stroke="#c8102e" strokeWidth="30" />
      <rect x="260" width="120" height="480" fill="#ffffff" />
      <rect y="180" width="640" height="120" fill="#ffffff" />
      <rect x="280" width="80" height="480" fill="#c8102e" />
      <rect y="200" width="640" height="80" fill="#c8102e" />
    </svg>
  ),
  es: (
    <svg viewBox="0 0 640 480" className="w-full h-full rounded-[2px] shadow-sm">
      <rect width="640" height="120" fill="#aa151b" />
      <rect y="120" width="640" height="240" fill="#f1bf00" />
      <rect y="360" width="640" height="120" fill="#aa151b" />
    </svg>
  ),
  it: (
    <svg viewBox="0 0 640 480" className="w-full h-full rounded-[2px] shadow-sm">
      <rect width="213" height="480" fill="#009246" />
      <rect x="213" width="214" height="480" fill="#ffffff" />
      <rect x="427" width="213" height="480" fill="#ce2b37" />
    </svg>
  ),
  cn: (
    <svg viewBox="0 0 640 480" className="w-full h-full rounded-[2px] shadow-sm">
      <rect width="640" height="480" fill="#de2910" />
      <polygon points="120,60 135,105 180,105 145,130 160,175 120,150 80,175 95,130 60,105 105,105" fill="#ffde00" />
    </svg>
  ),
  in: (
    <svg viewBox="0 0 640 480" className="w-full h-full rounded-[2px] shadow-sm">
      <rect width="640" height="160" fill="#ff9933" />
      <rect y="160" width="640" height="160" fill="#ffffff" />
      <rect y="320" width="640" height="160" fill="#138808" />
      <circle cx="320" cy="240" r="40" fill="none" stroke="#000080" strokeWidth="8" />
    </svg>
  ),
  br: (
    <svg viewBox="0 0 640 480" className="w-full h-full rounded-[2px] shadow-sm">
      <rect width="640" height="480" fill="#009b3a" />
      <polygon points="320,40 600,240 320,440 40,240" fill="#fedf00" />
      <circle cx="320" cy="240" r="90" fill="#002776" />
    </svg>
  ),
  ca: (
    <svg viewBox="0 0 640 480" className="w-full h-full rounded-[2px] shadow-sm">
      <rect width="160" height="480" fill="#ff0000" />
      <rect x="160" width="320" height="480" fill="#ffffff" />
      <rect x="480" width="160" height="480" fill="#ff0000" />
      <polygon points="320,160 340,210 390,210 350,240 370,290 320,260 270,290 290,240 250,210 300,210" fill="#ff0000" />
    </svg>
  ),
  tr: (
    <svg viewBox="0 0 640 480" className="w-full h-full rounded-[2px] shadow-sm">
      <rect width="640" height="480" fill="#e30a17" />
      <circle cx="270" cy="240" r="100" fill="#ffffff" />
      <circle cx="295" cy="240" r="80" fill="#e30a17" />
      <polygon points="390,240 430,225 415,265 415,215 430,255" fill="#ffffff" />
    </svg>
  ),
  pl: (
    <svg viewBox="0 0 640 480" className="w-full h-full rounded-[2px] shadow-sm">
      <rect width="640" height="240" fill="#ffffff" />
      <rect y="240" width="640" height="240" fill="#dc143c" />
    </svg>
  )
};

interface CountryFlagProps {
  code?: string | null;
  className?: string;
  title?: string;
}

export const CountryFlag: React.FC<CountryFlagProps> = ({
  code,
  className = 'w-4 h-3',
  title
}) => {
  if (!code) return null;
  const cleanCode = code.trim().toLowerCase();
  const svg = COUNTRY_SVGS[cleanCode];

  return (
    <span
      className={`inline-flex items-center justify-center shrink-0 overflow-hidden align-middle select-none ${className}`}
      title={title || code.toUpperCase()}
    >
      {svg || (
        <span className="text-[10px] font-mono uppercase bg-zinc-800 text-zinc-300 px-1 py-0.2 rounded leading-none border border-zinc-700">
          {cleanCode}
        </span>
      )}
    </span>
  );
};

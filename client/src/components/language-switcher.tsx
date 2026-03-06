import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";

const LANGUAGES = [
  { code: "en", label: "English", short: "EN" },
  { code: "es", label: "Espanol", short: "ES" },
  { code: "ar", label: "\u0627\u0644\u0639\u0631\u0628\u064a\u0629", short: "AR" },
];

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const current = LANGUAGES.find((l) => l.code === i18n.language) ?? LANGUAGES[0];

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleChange(code: string) {
    i18n.changeLanguage(code);
    localStorage.setItem("i18nextLng", code);
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-mono font-semibold tracking-wider text-military-400 hover:text-tactical-400 border border-military-700/50 rounded-lg hover:border-tactical-500/40 transition-colors duration-200 uppercase"
        aria-label="Change language"
      >
        <svg
          className="w-3.5 h-3.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="2" y1="12" x2="22" y2="12" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
        {current.short}
      </button>

      {open && (
        <div className="absolute top-full mt-1 end-0 min-w-[140px] glass-panel-dark rounded-lg border border-military-700/50 py-1 z-50 animate-fade-in">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleChange(lang.code)}
              className={`w-full text-start px-3 py-2 text-sm font-medium transition-colors duration-150 flex items-center justify-between ${
                lang.code === i18n.language
                  ? "text-tactical-400 bg-tactical-500/10"
                  : "text-military-300 hover:text-white hover:bg-military-700/50"
              }`}
            >
              <span>{lang.label}</span>
              <span className="text-xs font-mono text-military-500">{lang.short}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

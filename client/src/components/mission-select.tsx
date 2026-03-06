interface MissionSelectProps {
  selected: boolean;
  onToggle: () => void;
}

export default function MissionSelect({ selected, onToggle }: MissionSelectProps) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      className={`absolute top-3 right-3 z-10 w-5 h-5 rounded border-2 flex items-center justify-center transition-all duration-200
        ${selected
          ? "bg-command-500 border-command-500 shadow-glow-blue"
          : "bg-transparent border-military-500 hover:border-military-400"
        }`}
      aria-label={selected ? "Deselect mission" : "Select mission"}
    >
      {selected && (
        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
      )}
    </button>
  );
}

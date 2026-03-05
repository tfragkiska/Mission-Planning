interface Props {
  view: "grid" | "timeline";
  onChange: (view: "grid" | "timeline") => void;
}

export default function DashboardViewToggle({ view, onChange }: Props) {
  return (
    <div className="flex bg-military-800 rounded-lg p-0.5">
      <button
        onClick={() => onChange("grid")}
        className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
          view === "grid" ? "bg-blue-600 text-white" : "text-military-400 hover:text-white"
        }`}
      >
        Grid
      </button>
      <button
        onClick={() => onChange("timeline")}
        className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
          view === "timeline" ? "bg-blue-600 text-white" : "text-military-400 hover:text-white"
        }`}
      >
        Timeline
      </button>
    </div>
  );
}

import { useState, useEffect } from "react";
import { useMissionStore } from "../stores/mission-store";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";

interface Props {
  onClose: () => void;
}

const priorityIndicators: Record<string, string> = {
  LOW: "bg-tactical-500",
  MEDIUM: "bg-accent-500",
  HIGH: "bg-orange-500",
  CRITICAL: "bg-danger-500",
};

export default function CreateMissionModal({ onClose }: Props) {
  const [name, setName] = useState("");
  const [type, setType] = useState("TRAINING");
  const [priority, setPriority] = useState("MEDIUM");
  const [error, setError] = useState("");
  const [useTemplate, setUseTemplate] = useState(false);
  const [templates, setTemplates] = useState<Array<{ id: string; templateName: string; type: string; _count: { waypoints: number; aircraft: number } }>>([]);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const createMission = useMissionStore((s) => s.createMission);
  const navigate = useNavigate();

  useEffect(() => {
    if (useTemplate) {
      api.missions.listTemplates().then(setTemplates).catch(() => {});
    }
  }, [useTemplate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      let mission;
      if (useTemplate && selectedTemplate) {
        mission = await api.missions.createFromTemplate(selectedTemplate, name);
      } else {
        mission = await createMission({ name, type, priority });
      }
      navigate(`/missions/${mission.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create");
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <form
        onSubmit={handleSubmit}
        className="glass-panel bg-military-900/90 border border-military-700/50 p-6 sm:p-8 rounded-t-xl sm:rounded-xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto shadow-2xl animate-fade-in"
      >
        {/* Header */}
        <div className="mb-6">
          <div className="h-px w-12 bg-accent-400 mb-4" />
          <h2 className="text-lg font-bold uppercase tracking-wide text-military-300">
            New Mission
          </h2>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-danger-500/10 border border-danger-500/30 text-red-200 px-4 py-2.5 rounded-lg mb-4 text-sm flex items-center gap-2">
            <span className="text-danger-500 font-bold text-xs uppercase tracking-wider">Warning</span>
            <span className="text-military-300">|</span>
            {error}
          </div>
        )}

        {/* Blank / Template Toggle */}
        <div className="flex gap-2 mb-5">
          <button
            type="button"
            onClick={() => setUseTemplate(false)}
            className={`px-4 py-1.5 text-sm font-medium rounded-md border transition-all duration-200 min-h-[44px] ${
              !useTemplate
                ? "bg-command-500 border-command-400 text-white shadow-glow-blue"
                : "bg-military-800 border-military-600 text-military-400 hover:border-military-500 hover:text-military-300"
            }`}
          >
            Blank
          </button>
          <button
            type="button"
            onClick={() => setUseTemplate(true)}
            className={`px-4 py-1.5 text-sm font-medium rounded-md border transition-all duration-200 min-h-[44px] ${
              useTemplate
                ? "bg-command-500 border-command-400 text-white shadow-glow-blue"
                : "bg-military-800 border-military-600 text-military-400 hover:border-military-500 hover:text-military-300"
            }`}
          >
            From Template
          </button>
        </div>

        {/* Template Select */}
        {useTemplate && (
          <div className="mb-4">
            <label className="block text-xs font-semibold uppercase tracking-wider text-military-400 mb-1.5">
              Template
            </label>
            <select
              value={selectedTemplate}
              onChange={(e) => setSelectedTemplate(e.target.value)}
              className="w-full px-3 py-2.5 bg-military-800 border border-military-600 rounded-lg text-gray-100 focus:outline-none focus:border-l-2 focus:border-l-accent-400 focus:border-t-military-600 focus:border-r-military-600 focus:border-b-military-600 transition-colors min-h-[44px]"
              required
            >
              <option value="">Select a template...</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.templateName} ({t._count.waypoints} waypoints, {t._count.aircraft} aircraft)
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Mission Name */}
        <div className="mb-4">
          <label
            htmlFor="mission-name"
            className="block text-xs font-semibold uppercase tracking-wider text-military-400 mb-1.5"
          >
            Mission Name
          </label>
          <input
            id="mission-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. OPERATION NIGHTHAWK"
            className="w-full px-3 py-2.5 bg-military-800 border border-military-600 rounded-lg text-gray-100 placeholder:text-military-600 focus:outline-none focus:border-l-2 focus:border-l-accent-400 focus:border-t-military-600 focus:border-r-military-600 focus:border-b-military-600 transition-colors min-h-[44px]"
            required
          />
        </div>

        {/* Type */}
        <div className="mb-4">
          <label
            htmlFor="mission-type"
            className="block text-xs font-semibold uppercase tracking-wider text-military-400 mb-1.5"
          >
            Type
          </label>
          <select
            id="mission-type"
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full px-3 py-2.5 bg-military-800 border border-military-600 rounded-lg text-gray-100 focus:outline-none focus:border-l-2 focus:border-l-accent-400 focus:border-t-military-600 focus:border-r-military-600 focus:border-b-military-600 transition-colors min-h-[44px]"
          >
            <option value="TRAINING">Training</option>
            <option value="OPERATIONAL">Operational</option>
          </select>
        </div>

        {/* Priority */}
        <div className="mb-6">
          <label className="block text-xs font-semibold uppercase tracking-wider text-military-400 mb-1.5">
            Priority
          </label>
          <div className="relative">
            <span
              className={`absolute left-3 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full ${priorityIndicators[priority]}`}
            />
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full pl-8 pr-3 py-2.5 bg-military-800 border border-military-600 rounded-lg text-gray-100 focus:outline-none focus:border-l-2 focus:border-l-accent-400 focus:border-t-military-600 focus:border-r-military-600 focus:border-b-military-600 transition-colors min-h-[44px]"
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="CRITICAL">Critical</option>
            </select>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-military-700/50 mb-5" />

        {/* Actions */}
        <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-medium text-military-400 hover:text-military-300 border border-transparent hover:border-military-600 rounded-lg transition-all duration-200 min-h-[44px]"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-6 py-2.5 bg-command-500 hover:bg-command-600 hover:shadow-glow-blue text-white rounded-lg font-semibold text-sm uppercase tracking-wider transition-all duration-200 min-h-[44px]"
          >
            Create Mission
          </button>
        </div>
      </form>
    </div>
  );
}

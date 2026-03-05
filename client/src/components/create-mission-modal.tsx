import { useState, useEffect } from "react";
import { useMissionStore } from "../stores/mission-store";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";

interface Props {
  onClose: () => void;
}

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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <form
        onSubmit={handleSubmit}
        className="bg-military-800 p-6 rounded-lg w-full max-w-md"
      >
        <h2 className="text-xl font-bold mb-4">New Mission</h2>
        {error && (
          <div className="bg-red-900/50 text-red-200 px-3 py-2 rounded mb-3 text-sm">{error}</div>
        )}
        <div className="flex gap-2 mb-3">
          <button type="button" onClick={() => setUseTemplate(false)}
            className={`px-3 py-1 text-sm rounded ${!useTemplate ? "bg-blue-600" : "bg-military-700"}`}>
            Blank
          </button>
          <button type="button" onClick={() => setUseTemplate(true)}
            className={`px-3 py-1 text-sm rounded ${useTemplate ? "bg-blue-600" : "bg-military-700"}`}>
            From Template
          </button>
        </div>
        {useTemplate && (
          <div className="mb-3">
            <label className="block text-sm text-military-300 mb-1">Template</label>
            <select value={selectedTemplate} onChange={(e) => setSelectedTemplate(e.target.value)}
              className="w-full px-3 py-2 bg-military-700 border border-military-600 rounded text-gray-100" required>
              <option value="">Select a template...</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>{t.templateName} ({t._count.waypoints} waypoints, {t._count.aircraft} aircraft)</option>
              ))}
            </select>
          </div>
        )}
        <div className="mb-3">
          <label className="block text-sm text-military-300 mb-1">Mission Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 bg-military-700 border border-military-600 rounded text-gray-100 focus:outline-none focus:border-blue-500"
            required
          />
        </div>
        <div className="mb-3">
          <label className="block text-sm text-military-300 mb-1">Type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full px-3 py-2 bg-military-700 border border-military-600 rounded text-gray-100"
          >
            <option value="TRAINING">Training</option>
            <option value="OPERATIONAL">Operational</option>
          </select>
        </div>
        <div className="mb-4">
          <label className="block text-sm text-military-300 mb-1">Priority</label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="w-full px-3 py-2 bg-military-700 border border-military-600 rounded text-gray-100"
          >
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="CRITICAL">Critical</option>
          </select>
        </div>
        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-military-400 hover:text-gray-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded font-medium"
          >
            Create
          </button>
        </div>
      </form>
    </div>
  );
}

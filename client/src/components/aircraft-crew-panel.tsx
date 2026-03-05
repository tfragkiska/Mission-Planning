import { useState } from "react";
import type { Aircraft, CrewMember } from "../lib/types";

interface Props {
  missionId: string;
  aircraft: Aircraft[];
  crewMembers: CrewMember[];
  editable: boolean;
  onAddAircraft: (data: { type: string; tailNumber: string; callsign: string }) => void;
  onAddCrew: (data: { name: string; role: string; aircraftId?: string }) => void;
  onRemoveAircraft: (id: string) => void;
  onRemoveCrew: (id: string) => void;
}

const ROLE_COLORS: Record<string, string> = {
  Pilot: "bg-command-600/20 text-command-400 border-command-600/30",
  "Co-Pilot": "bg-command-600/15 text-command-400 border-command-600/25",
  WSO: "bg-accent-600/20 text-accent-400 border-accent-600/30",
  Navigator: "bg-tactical-600/20 text-tactical-500 border-tactical-600/30",
  "Crew Chief": "bg-military-600 text-military-300 border-military-500",
  Gunner: "bg-danger-600/20 text-danger-500 border-danger-600/30",
  Loadmaster: "bg-military-600 text-military-300 border-military-500",
};

export default function AircraftCrewPanel({
  aircraft, crewMembers, editable,
  onAddAircraft, onAddCrew, onRemoveAircraft, onRemoveCrew,
}: Props) {
  const [showAddAircraft, setShowAddAircraft] = useState(false);
  const [showAddCrew, setShowAddCrew] = useState(false);
  const [acType, setAcType] = useState("");
  const [tailNum, setTailNum] = useState("");
  const [callsign, setCallsign] = useState("");
  const [crewName, setCrewName] = useState("");
  const [crewRole, setCrewRole] = useState("Pilot");
  const [crewAircraftId, setCrewAircraftId] = useState("");

  function handleAddAircraft(e: React.FormEvent) {
    e.preventDefault();
    onAddAircraft({ type: acType, tailNumber: tailNum, callsign });
    setAcType(""); setTailNum(""); setCallsign("");
    setShowAddAircraft(false);
  }

  function handleAddCrew(e: React.FormEvent) {
    e.preventDefault();
    onAddCrew({ name: crewName, role: crewRole, aircraftId: crewAircraftId || undefined });
    setCrewName(""); setCrewRole("Pilot"); setCrewAircraftId("");
    setShowAddCrew(false);
  }

  return (
    <div className="glass-panel border border-military-700/50 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-military-700/50">
        <div className="flex items-center gap-2">
          <span className="text-command-400 text-sm font-bold">{"//"}</span>
          <h3 className="text-xs font-bold uppercase tracking-widest text-military-300">Aircraft & Crew</h3>
        </div>
      </div>

      {/* Aircraft List */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-military-400">Aircraft</h4>
            <span className="bg-command-600/20 text-command-400 text-xs font-bold px-1.5 py-0 rounded-full min-w-[1.25rem] text-center">
              {aircraft.length}
            </span>
          </div>
          {editable && (
            <button onClick={() => setShowAddAircraft(!showAddAircraft)} className="text-xs text-command-400 hover:text-command-300 font-semibold transition-colors">
              + Add
            </button>
          )}
        </div>

        {showAddAircraft && (
          <form onSubmit={handleAddAircraft} className="mb-3 space-y-2 bg-military-800/60 rounded-lg p-3 border border-military-700/50">
            <input value={acType} onChange={(e) => setAcType(e.target.value)} placeholder="Type (e.g., F-16C)" required
              className="w-full px-3 py-1.5 text-sm bg-military-700 border border-military-600 rounded-lg text-gray-100 focus:border-l-2 focus:border-l-command-500 focus:outline-none transition-all" />
            <input value={tailNum} onChange={(e) => setTailNum(e.target.value)} placeholder="Tail # (e.g., 88-0421)" required
              className="w-full px-3 py-1.5 text-sm bg-military-700 border border-military-600 rounded-lg text-gray-100 font-mono focus:border-l-2 focus:border-l-command-500 focus:outline-none transition-all" />
            <input value={callsign} onChange={(e) => setCallsign(e.target.value)} placeholder="Callsign (e.g., Viper 1)" required
              className="w-full px-3 py-1.5 text-sm bg-military-700 border border-military-600 rounded-lg text-gray-100 focus:border-l-2 focus:border-l-command-500 focus:outline-none transition-all" />
            <button type="submit" className="px-4 py-1.5 text-xs font-bold uppercase tracking-wide bg-command-500 hover:bg-command-400 rounded-lg text-white transition-colors">Add Aircraft</button>
          </form>
        )}

        {aircraft.length === 0 ? (
          <p className="text-xs text-military-500 italic">No aircraft assigned</p>
        ) : (
          <div className="space-y-1.5">
            {aircraft.map((ac) => (
              <div key={ac.id} className="flex items-center justify-between bg-military-800/60 hover:bg-military-700/60 rounded-lg px-3 py-2 text-sm transition-colors duration-150 group">
                <div className="flex items-center gap-2.5">
                  <div>
                    <span className="font-bold text-gray-100">{ac.callsign}</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="px-1.5 py-0 rounded text-xs font-semibold bg-tactical-700/30 text-tactical-500 border border-tactical-600/20">
                        {ac.type}
                      </span>
                      <span className="text-military-400 font-mono text-xs">{ac.tailNumber}</span>
                    </div>
                  </div>
                </div>
                {editable && (
                  <button onClick={() => onRemoveAircraft(ac.id)} className="text-danger-500 hover:text-red-300 hover:scale-110 text-xs ml-2 opacity-0 group-hover:opacity-100 transition-all duration-150 font-bold">x</button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Crew List */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-military-400">Crew</h4>
            <span className="bg-accent-600/20 text-accent-400 text-xs font-bold px-1.5 py-0 rounded-full min-w-[1.25rem] text-center">
              {crewMembers.length}
            </span>
          </div>
          {editable && (
            <button onClick={() => setShowAddCrew(!showAddCrew)} className="text-xs text-command-400 hover:text-command-300 font-semibold transition-colors">
              + Add
            </button>
          )}
        </div>

        {showAddCrew && (
          <form onSubmit={handleAddCrew} className="mb-3 space-y-2 bg-military-800/60 rounded-lg p-3 border border-military-700/50">
            <input value={crewName} onChange={(e) => setCrewName(e.target.value)} placeholder="Name" required
              className="w-full px-3 py-1.5 text-sm bg-military-700 border border-military-600 rounded-lg text-gray-100 focus:border-l-2 focus:border-l-command-500 focus:outline-none transition-all" />
            <select value={crewRole} onChange={(e) => setCrewRole(e.target.value)}
              className="w-full px-3 py-1.5 text-sm bg-military-700 border border-military-600 rounded-lg text-gray-100 focus:border-l-2 focus:border-l-command-500 focus:outline-none transition-all">
              <option>Pilot</option>
              <option>Co-Pilot</option>
              <option>WSO</option>
              <option>Navigator</option>
              <option>Crew Chief</option>
              <option>Gunner</option>
              <option>Loadmaster</option>
            </select>
            {aircraft.length > 0 && (
              <select value={crewAircraftId} onChange={(e) => setCrewAircraftId(e.target.value)}
                className="w-full px-3 py-1.5 text-sm bg-military-700 border border-military-600 rounded-lg text-gray-100 focus:border-l-2 focus:border-l-command-500 focus:outline-none transition-all">
                <option value="">Unassigned</option>
                {aircraft.map((ac) => (
                  <option key={ac.id} value={ac.id}>{ac.callsign}</option>
                ))}
              </select>
            )}
            <button type="submit" className="px-4 py-1.5 text-xs font-bold uppercase tracking-wide bg-command-500 hover:bg-command-400 rounded-lg text-white transition-colors">Add Crew</button>
          </form>
        )}

        {crewMembers.length === 0 ? (
          <p className="text-xs text-military-500 italic">No crew assigned</p>
        ) : (
          <div className="space-y-1.5">
            {crewMembers.map((cm) => (
              <div key={cm.id} className="flex items-center justify-between bg-military-800/60 hover:bg-military-700/60 rounded-lg px-3 py-2 text-sm transition-colors duration-150 group">
                <div className="flex items-center gap-2.5">
                  <span className="font-medium text-gray-200">{cm.name}</span>
                  <span className={`px-1.5 py-0 rounded text-xs font-semibold border ${ROLE_COLORS[cm.role] || "bg-military-600 text-military-300 border-military-500"}`}>
                    {cm.role}
                  </span>
                </div>
                {editable && (
                  <button onClick={() => onRemoveCrew(cm.id)} className="text-danger-500 hover:text-red-300 hover:scale-110 text-xs ml-2 opacity-0 group-hover:opacity-100 transition-all duration-150 font-bold">x</button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

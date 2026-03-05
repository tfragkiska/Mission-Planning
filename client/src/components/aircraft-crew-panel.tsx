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
    <div className="bg-military-800 border border-military-700 rounded-lg p-4">
      <h3 className="font-semibold mb-3">Aircraft & Crew</h3>

      {/* Aircraft List */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium text-military-300">Aircraft ({aircraft.length})</h4>
          {editable && (
            <button onClick={() => setShowAddAircraft(!showAddAircraft)} className="text-xs text-blue-400 hover:text-blue-300">
              + Add
            </button>
          )}
        </div>

        {showAddAircraft && (
          <form onSubmit={handleAddAircraft} className="mb-2 space-y-2">
            <input value={acType} onChange={(e) => setAcType(e.target.value)} placeholder="Type (e.g., F-16C)" required
              className="w-full px-2 py-1 text-sm bg-military-700 border border-military-600 rounded text-gray-100" />
            <input value={tailNum} onChange={(e) => setTailNum(e.target.value)} placeholder="Tail # (e.g., 88-0421)" required
              className="w-full px-2 py-1 text-sm bg-military-700 border border-military-600 rounded text-gray-100" />
            <input value={callsign} onChange={(e) => setCallsign(e.target.value)} placeholder="Callsign (e.g., Viper 1)" required
              className="w-full px-2 py-1 text-sm bg-military-700 border border-military-600 rounded text-gray-100" />
            <button type="submit" className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 rounded">Add Aircraft</button>
          </form>
        )}

        {aircraft.length === 0 ? (
          <p className="text-xs text-military-400">No aircraft assigned</p>
        ) : (
          <div className="space-y-1">
            {aircraft.map((ac) => (
              <div key={ac.id} className="flex items-center justify-between bg-military-700 rounded px-2 py-1 text-sm">
                <span>{ac.callsign} — {ac.type} ({ac.tailNumber})</span>
                {editable && (
                  <button onClick={() => onRemoveAircraft(ac.id)} className="text-red-400 hover:text-red-300 text-xs ml-2">x</button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Crew List */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium text-military-300">Crew ({crewMembers.length})</h4>
          {editable && (
            <button onClick={() => setShowAddCrew(!showAddCrew)} className="text-xs text-blue-400 hover:text-blue-300">
              + Add
            </button>
          )}
        </div>

        {showAddCrew && (
          <form onSubmit={handleAddCrew} className="mb-2 space-y-2">
            <input value={crewName} onChange={(e) => setCrewName(e.target.value)} placeholder="Name" required
              className="w-full px-2 py-1 text-sm bg-military-700 border border-military-600 rounded text-gray-100" />
            <select value={crewRole} onChange={(e) => setCrewRole(e.target.value)}
              className="w-full px-2 py-1 text-sm bg-military-700 border border-military-600 rounded text-gray-100">
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
                className="w-full px-2 py-1 text-sm bg-military-700 border border-military-600 rounded text-gray-100">
                <option value="">Unassigned</option>
                {aircraft.map((ac) => (
                  <option key={ac.id} value={ac.id}>{ac.callsign}</option>
                ))}
              </select>
            )}
            <button type="submit" className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 rounded">Add Crew</button>
          </form>
        )}

        {crewMembers.length === 0 ? (
          <p className="text-xs text-military-400">No crew assigned</p>
        ) : (
          <div className="space-y-1">
            {crewMembers.map((cm) => (
              <div key={cm.id} className="flex items-center justify-between bg-military-700 rounded px-2 py-1 text-sm">
                <span>{cm.name} — {cm.role}</span>
                {editable && (
                  <button onClick={() => onRemoveCrew(cm.id)} className="text-red-400 hover:text-red-300 text-xs ml-2">x</button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

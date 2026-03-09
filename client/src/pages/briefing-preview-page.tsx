import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import Layout from "../components/layout";
import { api } from "../lib/api";
import { useAuthStore } from "../stores/auth-store";

type TemplateId = "opord" | "quick" | "crew";

interface BriefingData {
  mission: {
    id: string;
    name: string;
    type: string;
    status: string;
    priority: string;
    scheduledStart: string | null;
    scheduledEnd: string | null;
    commanderComments: string | null;
    createdAt: string;
    updatedAt: string;
  };
  createdBy: { id: string; name: string; email: string; role: string };
  approvedBy: { id: string; name: string; email: string; role: string } | null;
  aircraft: Array<{ id: string; callsign: string; type: string; tailNumber: string }>;
  crewMembers: Array<{ id: string; name: string; role: string; aircraftId: string | null }>;
  waypoints: Array<{
    sequenceOrder: number;
    name: string | null;
    lat: number;
    lon: number;
    altitude: number | null;
    speed: number | null;
    timeOnTarget: string | null;
    type: string;
  }>;
  threats: Array<{
    name: string;
    category: string;
    lat: number;
    lon: number;
    rangeNm: number;
    lethality: string;
    minAltitude: number | null;
    maxAltitude: number | null;
    notes: string | null;
  }>;
  weather: Array<{
    stationId: string;
    type: string;
    rawReport: string;
    temperature: number | null;
    windSpeed: number | null;
    windDir: number | null;
    visibility: number | null;
    ceiling: number | null;
    observedAt: string;
  }>;
  deconfliction: {
    critical: Array<{ conflictType: string; description: string; resolution: string }>;
    warnings: Array<{ conflictType: string; description: string; resolution: string }>;
    resolved: number;
    allClear: boolean;
  };
  generatedAt: string;
  templateId: TemplateId;
}

const TEMPLATE_OPTIONS: Array<{ id: TemplateId; label: string; description: string }> = [
  { id: "opord", label: "Standard OPORD", description: "Full 5-paragraph operational order" },
  { id: "quick", label: "Quick Brief", description: "Condensed single-page summary" },
  { id: "crew", label: "Crew Brief", description: "Pilot-focused route/threats/weather" },
];

export default function BriefingPreviewPage() {
  const { id } = useParams<{ id: string }>();
  const [template, setTemplate] = useState<TemplateId>("opord");
  const [data, setData] = useState<BriefingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    api.missions
      .getBriefingData(id, template)
      .then((d: BriefingData) => setData(d))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id, template]);

  function handleDownloadPdf() {
    if (!id) return;
    const token = useAuthStore.getState().token;
    fetch(`/api/missions/${id}/briefing?template=${template}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.blob())
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `mission-briefing-${template}-${id}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      })
      .catch(() => {});
  }

  function handlePrint() {
    window.print();
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-command-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-[var(--color-text-secondary)] font-mono text-sm tracking-wide">LOADING BRIEFING DATA...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !data) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto py-8">
          <div className="glass-panel rounded-xl p-6 border border-danger-600/40 text-center">
            <p className="text-danger-500 font-bold mb-2">Failed to load briefing data</p>
            <p className="text-[var(--color-text-secondary)] text-sm">{error || "Unknown error"}</p>
            <Link to={`/missions/${id}`} className="inline-block mt-4 text-command-400 hover:text-command-300 text-sm underline">
              Back to Mission
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Controls bar (hidden in print) */}
      <div className="max-w-5xl mx-auto mb-4 print:hidden">
        <div className="glass-panel rounded-xl p-4 border border-[var(--color-border-primary)] flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <Link to={`/missions/${id}`} className="text-command-400 hover:text-command-300 text-sm font-medium">
            &larr; Back to Mission
          </Link>

          <span className="hidden sm:inline w-px h-5 bg-[var(--color-border-primary)]" />

          <label className="text-[var(--color-text-secondary)] text-sm font-medium">Template:</label>
          <select
            value={template}
            onChange={(e) => setTemplate(e.target.value as TemplateId)}
            className="bg-[var(--color-bg-tertiary)] border border-[var(--color-border-primary)] text-[var(--color-text-primary)] text-sm rounded px-3 py-1.5 focus:outline-none focus:border-command-500"
          >
            {TEMPLATE_OPTIONS.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>

          <span className="flex-1" />

          <button
            onClick={handleDownloadPdf}
            className="px-4 py-2 bg-command-500 hover:bg-command-400 rounded-lg text-sm font-bold uppercase tracking-wide text-[var(--color-text-primary)] transition-all duration-200 shadow-lg"
          >
            Download PDF
          </button>
          <button
            onClick={handlePrint}
            className="glass-panel px-4 py-2 rounded-lg text-sm font-medium text-[var(--color-text-primary)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-border-primary)] border border-[var(--color-border-primary)] transition-all duration-200"
          >
            Print
          </button>
        </div>
      </div>

      {/* Briefing Document Preview */}
      <div className="max-w-5xl mx-auto">
        <div className="bg-white text-black rounded-lg shadow-2xl print:shadow-none print:rounded-none" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
          <div className="p-8 sm:p-12 print:p-0">

            {/* === HEADER === */}
            <div className="text-center mb-6">
              <p className="text-xs font-bold tracking-widest text-gray-600 mb-3">
                UNCLASSIFIED // FOR TRAINING USE ONLY
              </p>
              <hr className="border-black border-t-2 mb-4" />
              <h1 className="text-2xl font-bold tracking-wide mb-1">
                {template === "opord" ? "OPERATION ORDER" : template === "crew" ? "CREW BRIEFING" : "MISSION BRIEFING"}
              </h1>
              <h2 className="text-xl font-bold mb-2">{data.mission.name.toUpperCase()}</h2>
              <p className="text-xs text-gray-600">
                DTG: {formatDTG(data.generatedAt)} | Template: {TEMPLATE_OPTIONS.find((t) => t.id === template)?.label}
              </p>
              <hr className="border-gray-400 mt-4" />
            </div>

            {/* === TABLE OF CONTENTS (OPORD only) === */}
            {template === "opord" && (
              <div className="mb-8">
                <h3 className="text-base font-bold mb-2">TABLE OF CONTENTS</h3>
                <ol className="list-decimal list-inside text-sm space-y-1 ml-4">
                  <li>Situation</li>
                  <li className="ml-4">a. Threat Assessment</li>
                  <li className="ml-4">b. Weather</li>
                  <li className="ml-4">c. Airspace / Deconfliction</li>
                  <li>Mission</li>
                  <li>Execution</li>
                  <li>Sustainment</li>
                  <li>Command &amp; Signal</li>
                </ol>
                <hr className="border-gray-300 mt-4" />
              </div>
            )}

            {/* === MISSION OVERVIEW === */}
            <section className="mb-6">
              <h3 className="text-base font-bold border-b border-gray-300 pb-1 mb-3">
                {template === "opord" ? "1. SITUATION" : "MISSION OVERVIEW"}
              </h3>
              <table className="text-sm w-full">
                <tbody>
                  <InfoRow label="Mission Name" value={data.mission.name} />
                  <InfoRow label="Type" value={data.mission.type} />
                  <InfoRow label="Status" value={data.mission.status} />
                  <InfoRow label="Priority" value={data.mission.priority} />
                  <InfoRow label="Created By" value={data.createdBy.name} />
                  {data.approvedBy && <InfoRow label="Approved By" value={data.approvedBy.name} />}
                  {data.mission.scheduledStart && <InfoRow label="Scheduled Start" value={formatDTG(data.mission.scheduledStart)} />}
                  {data.mission.scheduledEnd && <InfoRow label="Scheduled End" value={formatDTG(data.mission.scheduledEnd)} />}
                </tbody>
              </table>
            </section>

            {/* === THREAT ASSESSMENT === */}
            <section className="mb-6">
              <h3 className="text-base font-bold border-b border-gray-300 pb-1 mb-3">
                {template === "opord" ? "a. THREAT ASSESSMENT" : "THREAT MATRIX"}
              </h3>
              {data.threats.length === 0 ? (
                <p className="text-sm text-gray-600 ml-4">No threats identified.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="text-xs w-full border-collapse">
                    <thead>
                      <tr className="border-b-2 border-black">
                        <th className="text-left py-1 pr-2 font-bold">Threat</th>
                        <th className="text-left py-1 pr-2 font-bold">Category</th>
                        <th className="text-left py-1 pr-2 font-bold">Range (NM)</th>
                        <th className="text-left py-1 pr-2 font-bold">Lethality</th>
                        <th className="text-left py-1 pr-2 font-bold">Alt Range</th>
                        <th className="text-left py-1 font-bold">Position</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.threats.map((t, i) => (
                        <tr key={i} className="border-b border-gray-300">
                          <td className="py-1 pr-2">{t.name}</td>
                          <td className="py-1 pr-2">{t.category}</td>
                          <td className="py-1 pr-2">{t.rangeNm}</td>
                          <td className="py-1 pr-2">
                            <span className={t.lethality === "CRITICAL" || t.lethality === "HIGH" ? "font-bold text-red-700" : ""}>
                              {t.lethality}
                            </span>
                          </td>
                          <td className="py-1 pr-2">{t.minAltitude || 0}-{t.maxAltitude || "UNL"} ft</td>
                          <td className="py-1">{t.lat.toFixed(4)}, {t.lon.toFixed(4)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* === WEATHER === */}
            <section className="mb-6">
              <h3 className="text-base font-bold border-b border-gray-300 pb-1 mb-3">
                {template === "opord" ? "b. WEATHER" : "WEATHER SUMMARY"}
              </h3>
              {data.weather.length === 0 ? (
                <p className="text-sm text-gray-600 ml-4">No weather data available.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="text-xs w-full border-collapse">
                    <thead>
                      <tr className="border-b-2 border-black">
                        <th className="text-left py-1 pr-2 font-bold">Station</th>
                        <th className="text-left py-1 pr-2 font-bold">Type</th>
                        <th className="text-left py-1 pr-2 font-bold">Temp (C)</th>
                        <th className="text-left py-1 pr-2 font-bold">Wind</th>
                        <th className="text-left py-1 pr-2 font-bold">Vis (SM)</th>
                        <th className="text-left py-1 pr-2 font-bold">Ceiling</th>
                        <th className="text-left py-1 font-bold">Raw Report</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.weather.map((w, i) => (
                        <tr key={i} className="border-b border-gray-300">
                          <td className="py-1 pr-2">{w.stationId}</td>
                          <td className="py-1 pr-2">{w.type}</td>
                          <td className="py-1 pr-2">{w.temperature ?? "-"}</td>
                          <td className="py-1 pr-2">{w.windSpeed !== null ? `${w.windDir || 0}deg/${w.windSpeed}kt` : "-"}</td>
                          <td className="py-1 pr-2">{w.visibility ?? "-"}</td>
                          <td className="py-1 pr-2">{w.ceiling !== null ? `${w.ceiling} ft` : "-"}</td>
                          <td className="py-1 font-mono text-xs">{w.rawReport}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* === DECONFLICTION === */}
            <section className="mb-6">
              <h3 className="text-base font-bold border-b border-gray-300 pb-1 mb-3">
                {template === "opord" ? "c. AIRSPACE / DECONFLICTION" : "DECONFLICTION STATUS"}
              </h3>
              {data.deconfliction.allClear && data.deconfliction.resolved === 0 && data.deconfliction.critical.length === 0 && data.deconfliction.warnings.length === 0 ? (
                <p className="text-sm text-gray-600 ml-4">No deconfliction checks run.</p>
              ) : data.deconfliction.allClear ? (
                <p className="text-sm font-bold text-green-700 ml-4">ALL CLEAR -- No unresolved conflicts</p>
              ) : (
                <div className="ml-4 space-y-2 text-sm">
                  {data.deconfliction.critical.length > 0 && (
                    <div>
                      <p className="font-bold text-red-700">CRITICAL CONFLICTS: {data.deconfliction.critical.length} UNRESOLVED</p>
                      <ul className="list-disc ml-6 text-xs">
                        {data.deconfliction.critical.map((c, i) => (
                          <li key={i}>[{c.conflictType}] {c.description}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {data.deconfliction.warnings.length > 0 && (
                    <div>
                      <p className="font-bold text-yellow-700">WARNINGS: {data.deconfliction.warnings.length}</p>
                      <ul className="list-disc ml-6 text-xs">
                        {data.deconfliction.warnings.map((w, i) => (
                          <li key={i}>[{w.conflictType}] {w.description}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {data.deconfliction.resolved > 0 && (
                    <p className="text-xs text-gray-600">Resolved conflicts: {data.deconfliction.resolved}</p>
                  )}
                </div>
              )}
            </section>

            {/* === ROUTE / WAYPOINTS (titled differently per template) === */}
            <section className="mb-6">
              <h3 className="text-base font-bold border-b border-gray-300 pb-1 mb-3">
                {template === "opord" ? "3. EXECUTION -- ROUTE" : "ROUTE / WAYPOINTS"}
              </h3>
              {data.waypoints.length === 0 ? (
                <p className="text-sm text-gray-600 ml-4">No waypoints defined.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="text-xs w-full border-collapse">
                    <thead>
                      <tr className="border-b-2 border-black">
                        <th className="text-left py-1 pr-2 font-bold">#</th>
                        <th className="text-left py-1 pr-2 font-bold">Name</th>
                        <th className="text-left py-1 pr-2 font-bold">Lat</th>
                        <th className="text-left py-1 pr-2 font-bold">Lon</th>
                        <th className="text-left py-1 pr-2 font-bold">Alt (ft)</th>
                        <th className="text-left py-1 pr-2 font-bold">Spd (kt)</th>
                        <th className="text-left py-1 pr-2 font-bold">TOT</th>
                        <th className="text-left py-1 font-bold">Type</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.waypoints.map((wp, i) => (
                        <tr key={i} className="border-b border-gray-300">
                          <td className="py-1 pr-2">{wp.sequenceOrder}</td>
                          <td className="py-1 pr-2">{wp.name || "-"}</td>
                          <td className="py-1 pr-2">{wp.lat.toFixed(4)}</td>
                          <td className="py-1 pr-2">{wp.lon.toFixed(4)}</td>
                          <td className="py-1 pr-2">{wp.altitude ?? "-"}</td>
                          <td className="py-1 pr-2">{wp.speed ?? "-"}</td>
                          <td className="py-1 pr-2">{wp.timeOnTarget ? formatDTG(wp.timeOnTarget) : "-"}</td>
                          <td className="py-1">{wp.type}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* === AIRCRAFT & CREW === */}
            {(template !== "quick") && (
              <section className="mb-6">
                <h3 className="text-base font-bold border-b border-gray-300 pb-1 mb-3">
                  {template === "opord" ? "4. SUSTAINMENT -- AIRCRAFT & CREW" : "AIRCRAFT & CREW"}
                </h3>
                {data.aircraft.length === 0 ? (
                  <p className="text-sm text-gray-600 ml-4">No aircraft assigned.</p>
                ) : (
                  <div className="ml-4 space-y-3 text-sm">
                    {data.aircraft.map((ac) => (
                      <div key={ac.id}>
                        <p className="font-bold">{ac.callsign} -- {ac.type} ({ac.tailNumber})</p>
                        {data.crewMembers
                          .filter((c) => c.aircraftId === ac.id)
                          .map((c) => (
                            <p key={c.id} className="ml-4 text-xs">{c.role}: {c.name}</p>
                          ))}
                      </div>
                    ))}
                    {data.crewMembers.filter((c) => !c.aircraftId).length > 0 && (
                      <div>
                        <p className="font-bold">Unassigned Crew:</p>
                        {data.crewMembers
                          .filter((c) => !c.aircraftId)
                          .map((c) => (
                            <p key={c.id} className="ml-4 text-xs">{c.role}: {c.name}</p>
                          ))}
                      </div>
                    )}
                  </div>
                )}
              </section>
            )}

            {/* === COMMANDER NOTES === */}
            {data.mission.commanderComments && template !== "quick" && (
              <section className="mb-6">
                <h3 className="text-base font-bold border-b border-gray-300 pb-1 mb-3">
                  {template === "opord" ? "5. COMMAND & SIGNAL" : "COMMANDER NOTES"}
                </h3>
                <p className="text-sm ml-4">{data.mission.commanderComments}</p>
              </section>
            )}

            {/* === FOOTER === */}
            <div className="mt-8 pt-4 border-t-2 border-black text-center">
              <p className="text-xs font-bold tracking-widest text-gray-600">UNCLASSIFIED // FOR TRAINING USE ONLY</p>
              <p className="text-xs text-gray-500 mt-1">Mission ID: {data.mission.id}</p>
              <p className="text-xs text-gray-500">Generated: {formatDTG(data.generatedAt)}</p>
            </div>

          </div>
        </div>
      </div>
    </Layout>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <tr>
      <td className="py-0.5 pr-4 font-bold text-right w-40 align-top">{label}:</td>
      <td className="py-0.5">{value}</td>
    </tr>
  );
}

function formatDTG(isoOrDate: string): string {
  const d = new Date(isoOrDate);
  const day = String(d.getUTCDate()).padStart(2, "0");
  const hours = String(d.getUTCHours()).padStart(2, "0");
  const mins = String(d.getUTCMinutes()).padStart(2, "0");
  const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  const mon = months[d.getUTCMonth()];
  const year = d.getUTCFullYear();
  return `${day}${hours}${mins}Z ${mon} ${year}`;
}

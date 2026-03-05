import type maplibregl from "maplibre-gl";

export async function exportMapAsPng(map: maplibregl.Map, missionName: string): Promise<void> {
  const canvas = map.getCanvas();

  // Create a new canvas to composite the map with overlays
  const exportCanvas = document.createElement("canvas");
  exportCanvas.width = canvas.width;
  exportCanvas.height = canvas.height;
  const ctx = exportCanvas.getContext("2d")!;

  // Draw the map canvas
  ctx.drawImage(canvas, 0, 0);

  // Add title overlay
  ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
  ctx.fillRect(0, 0, exportCanvas.width, 40);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 16px sans-serif";
  ctx.fillText(`Mission: ${missionName}`, 10, 26);

  // Add timestamp
  const timestamp = new Date().toISOString().replace("T", " ").substring(0, 19) + " UTC";
  ctx.font = "12px sans-serif";
  ctx.fillText(timestamp, exportCanvas.width - ctx.measureText(timestamp).width - 10, 26);

  // Trigger download
  exportCanvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mission-map-${missionName.replace(/\s+/g, "-").toLowerCase()}-${Date.now()}.png`;
    a.click();
    URL.revokeObjectURL(url);
  }, "image/png");
}

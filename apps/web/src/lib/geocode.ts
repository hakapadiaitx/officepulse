export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=16&addressdetails=1`,
      { headers: { Accept: "application/json" } }
    );
    const data = await res.json();
    const addr = data.address ?? {};
    const part1 = addr.road ?? addr.suburb ?? addr.neighbourhood ?? addr.quarter ?? "";
    const part2 = addr.city ?? addr.town ?? addr.village ?? addr.municipality ?? addr.county ?? "";
    if (part1 && part2) return `${part1}, ${part2}`;
    if (part1 || part2) return part1 || part2;
    return data.display_name?.split(",").slice(0, 2).join(",").trim() ?? `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  } catch {
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }
}

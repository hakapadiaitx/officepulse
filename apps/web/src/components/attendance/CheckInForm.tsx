"use client";
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { X, LogIn, MapPin, CheckCircle, AlertTriangle } from "lucide-react";
import { PinInput } from "./PinInput";

interface Employee { id: string; firstName: string; lastName: string; }

interface Props {
  employee: Employee;
  isArrival?: boolean;
  onClose: () => void;
}

type GeoState = "idle" | "requesting" | "granted" | "denied" | "unavailable";

export function CheckInForm({ employee, isArrival = false, onClose }: Props) {
  const [pin, setPin] = useState("");
  const [dateTime, setDateTime] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [geoRequired, setGeoRequired] = useState(false);
  const [geoState, setGeoState] = useState<GeoState>("idle");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    fetch("/api/settings/geolocation")
      .then((r) => r.json())
      .then((d) => { if (d.enabled) { setGeoRequired(true); requestLocation(); } })
      .catch(() => {});
  }, []);

  function requestLocation() {
    if (!navigator.geolocation) { setGeoState("unavailable"); return; }
    setGeoState("requesting");
    navigator.geolocation.getCurrentPosition(
      (pos) => { setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setGeoState("granted"); },
      () => setGeoState("denied"),
      { timeout: 10000 }
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pin.length !== 4) { setError("Please enter your 4-digit PIN."); return; }

    let lat: number | undefined;
    let lng: number | undefined;

    if (geoRequired) {
      if (geoState === "denied" || geoState === "unavailable") {
        setError("Location access is required. Please allow location in your browser and try again.");
        return;
      }
      if (geoState !== "granted" || !coords) {
        // Re-request fresh coords
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 })
          );
          lat = pos.coords.latitude;
          lng = pos.coords.longitude;
          setCoords({ lat, lng });
          setGeoState("granted");
        } catch {
          setError("Location access is required. Please allow location in your browser and try again.");
          return;
        }
      } else {
        lat = coords.lat;
        lng = coords.lng;
      }
    }

    setLoading(true);
    setError("");

    const res = await fetch("/api/attendance/checkin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employeeId: employee.id,
        pin,
        checkInTime: new Date(dateTime).toISOString(),
        localDate: format(new Date(), "yyyy-MM-dd"),
        ...(lat != null && lng != null ? { lat, lng } : {}),
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (res.ok) {
      onClose();
    } else {
      setError(data.error || "Something went wrong.");
    }
  }

  const title = isArrival ? "Good Morning!" : "Welcome Back!";
  const subtitle = isArrival
    ? `Marking ${employee.firstName} ${employee.lastName} as arrived`
    : `${employee.firstName} ${employee.lastName} is returning to office`;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <LogIn className="w-5 h-5 text-green-500" />
            <h2 className="font-semibold text-gray-900">{isArrival ? "Arrive" : "Return to Office"}</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <p className="text-base font-semibold text-gray-900">{title}</p>
            <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>
          </div>

          {/* Location banner */}
          {geoRequired && (
            <div className={`flex items-start gap-3 rounded-lg px-3 py-2.5 text-sm border ${
              geoState === "granted"
                ? "bg-green-50 border-green-100 text-green-700"
                : geoState === "denied" || geoState === "unavailable"
                ? "bg-red-50 border-red-100 text-red-600"
                : "bg-amber-50 border-amber-100 text-amber-700"
            }`}>
              {geoState === "granted" ? (
                <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              ) : (
                <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
              )}
              <div className="flex-1">
                {geoState === "granted" && <span>Location captured ✓</span>}
                {geoState === "requesting" && <span>Getting your location…</span>}
                {geoState === "denied" && (
                  <>
                    <p className="font-medium">Location access denied</p>
                    <p className="text-xs mt-0.5">Enable location in your browser settings, then{" "}
                      <button type="button" onClick={requestLocation} className="underline font-medium">try again</button>.
                    </p>
                  </>
                )}
                {geoState === "unavailable" && <span>Location not available on this device.</span>}
                {geoState === "idle" && (
                  <>
                    <span>Location required. </span>
                    <button type="button" onClick={requestLocation} className="underline font-medium">Enable now</button>
                  </>
                )}
              </div>
              {(geoState === "denied" || geoState === "idle") && (
                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              )}
            </div>
          )}

          <div>
            <label className="label">{isArrival ? "Arrival" : "Return"} Date & Time</label>
            <input
              type="datetime-local"
              className="input"
              value={dateTime}
              onChange={(e) => setDateTime(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="label">Enter Your 4-Digit PIN</label>
            <PinInput value={pin} onChange={setPin} />
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

          <button type="submit" disabled={loading} className="btn-primary w-full py-3">
            {loading ? "Processing..." : isArrival ? "Start My Day" : "I'm Back"}
          </button>
        </form>
      </div>
    </div>
  );
}

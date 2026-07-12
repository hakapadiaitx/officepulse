"use client";
import { useState } from "react";
import { format } from "date-fns";
import { X, LogIn } from "lucide-react";
import { PinInput } from "./PinInput";

interface Employee { id: string; firstName: string; lastName: string; }

interface Props {
  employee: Employee;
  isArrival?: boolean; // true = first check-in of day, false = returning from being out
  onClose: () => void;
}

export function CheckInForm({ employee, isArrival = false, onClose }: Props) {
  const [pin, setPin] = useState("");
  const [dateTime, setDateTime] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pin.length !== 4) { setError("Please enter your 4-digit PIN."); return; }

    setLoading(true);
    setError("");

    const res = await fetch("/api/attendance/checkin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employeeId: employee.id,
        pin,
        checkInTime: new Date(dateTime).toISOString(),
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

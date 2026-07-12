"use client";
import { useState } from "react";
import { format } from "date-fns";
import { X, LogOut, Home } from "lucide-react";
import { PinInput } from "./PinInput";

interface Employee { id: string; firstName: string; lastName: string; }

interface Props {
  employee: Employee;
  isEndOfDay?: boolean;
  onClose: () => void;
}

export function CheckOutForm({ employee, isEndOfDay = false, onClose }: Props) {
  const [pin, setPin] = useState("");
  const [purpose, setPurpose] = useState("");
  const [notes, setNotes] = useState("");
  const [dateTime, setDateTime] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pin.length !== 4) { setError("Please enter your 4-digit PIN."); return; }
    if (!isEndOfDay && !purpose.trim()) { setError("Please enter a purpose."); return; }

    setLoading(true);
    setError("");

    const res = await fetch("/api/attendance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employeeId: employee.id,
        pin,
        checkOutTime: new Date(dateTime).toISOString(),
        isEndOfDay,
        purpose: isEndOfDay ? undefined : purpose,
        notes: notes || undefined,
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

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            {isEndOfDay
              ? <Home className="w-5 h-5 text-gray-500" />
              : <LogOut className="w-5 h-5 text-orange-500" />}
            <h2 className="font-semibold text-gray-900">
              {isEndOfDay ? "Leave for Today" : "Check Out"}
            </h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-sm text-gray-600">
            {isEndOfDay ? "Ending the day for " : "Checking out "}
            <span className="font-semibold text-gray-900">{employee.firstName} {employee.lastName}</span>
          </p>

          <div>
            <label className="label">Date & Time</label>
            <input
              type="datetime-local"
              className="input"
              value={dateTime}
              onChange={(e) => setDateTime(e.target.value)}
              required
            />
          </div>

          {!isEndOfDay && (
            <>
              <div>
                <label className="label">Purpose / Reason *</label>
                <input
                  className="input"
                  placeholder="e.g. Client meeting, Lunch, Doctor..."
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="label">Notes (optional)</label>
                <textarea
                  className="input resize-none"
                  rows={2}
                  placeholder="Additional details..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </>
          )}

          <div>
            <label className="label">Enter Your 4-Digit PIN</label>
            <PinInput value={pin} onChange={setPin} />
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

          <button type="submit" disabled={loading} className="btn-primary w-full py-3">
            {loading ? "Processing..." : isEndOfDay ? "See You Tomorrow!" : "Confirm Check Out"}
          </button>
        </form>
      </div>
    </div>
  );
}

"use client";
import { useState, useEffect } from "react";
import { Plus, Pencil, UserX, CheckCircle } from "lucide-react";

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  isActive: boolean;
  createdAt: string;
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editEmployee, setEditEmployee] = useState<Employee | null>(null);

  async function fetchEmployees() {
    const res = await fetch("/api/employees");
    if (res.ok) setEmployees(await res.json());
    setLoading(false);
  }

  useEffect(() => { fetchEmployees(); }, []);

  async function deactivate(id: string) {
    if (!confirm("Remove this employee?")) return;
    await fetch(`/api/employees/${id}`, { method: "DELETE" });
    fetchEmployees();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Employees</h1>
        <button onClick={() => setShowAdd(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Employee
        </button>
      </div>

      <div className="card">
        <div className="px-5 py-4 border-b border-gray-100">
          <p className="text-sm text-gray-500">{employees.length} employees</p>
        </div>
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="text-xs text-gray-400 uppercase tracking-wider border-b border-gray-50">
                <th className="text-left px-5 py-3">Name</th>
                <th className="text-left px-5 py-3">Email</th>
                <th className="text-left px-5 py-3">Status</th>
                <th className="text-right px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {employees.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-sm text-gray-400">
                    No employees yet. Add your first employee to get started.
                  </td>
                </tr>
              )}
              {employees.map((emp) => (
                <tr key={emp.id} className="hover:bg-gray-50/50">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-brand-50 rounded-full flex items-center justify-center text-sm font-semibold text-brand-700">
                        {emp.firstName[0]}{emp.lastName[0]}
                      </div>
                      <span className="font-medium text-gray-900">{emp.firstName} {emp.lastName}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-500">{emp.email || "—"}</td>
                  <td className="px-5 py-3">
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-green-100 text-green-700 px-2.5 py-1 rounded-full">
                      <CheckCircle className="w-3 h-3" /> Active
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setEditEmployee(emp)} className="text-gray-400 hover:text-gray-600 p-1">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => deactivate(emp.id)} className="text-gray-400 hover:text-red-500 p-1">
                        <UserX className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {(showAdd || editEmployee) && (
        <EmployeeModal
          employee={editEmployee}
          onClose={() => { setShowAdd(false); setEditEmployee(null); fetchEmployees(); }}
        />
      )}
    </div>
  );
}

function EmployeeModal({ employee, onClose }: { employee: Employee | null; onClose: () => void }) {
  const [form, setForm] = useState({
    firstName: employee?.firstName || "",
    lastName: employee?.lastName || "",
    email: employee?.email || "",
    pin: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function update(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!employee && form.pin.length !== 4) { setError("PIN must be exactly 4 digits."); return; }

    setLoading(true);
    const url = employee ? `/api/employees/${employee.id}` : "/api/employees";
    const method = employee ? "PATCH" : "POST";
    const body: any = { firstName: form.firstName, lastName: form.lastName, email: form.email };
    if (form.pin) body.pin = form.pin;

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setLoading(false);

    if (res.ok) {
      onClose();
    } else {
      setError(Array.isArray(data.error) ? data.error[0]?.message : data.error || "Failed");
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">{employee ? "Edit Employee" : "Add Employee"}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">First Name</label>
              <input className="input" value={form.firstName} onChange={(e) => update("firstName", e.target.value)} required />
            </div>
            <div>
              <label className="label">Last Name</label>
              <input className="input" value={form.lastName} onChange={(e) => update("lastName", e.target.value)} required />
            </div>
          </div>
          <div>
            <label className="label">Email (optional)</label>
            <input className="input" type="email" value={form.email} onChange={(e) => update("email", e.target.value)} />
          </div>
          <div>
            <label className="label">{employee ? "New PIN (leave blank to keep current)" : "4-Digit PIN"}</label>
            <input
              className="input tracking-widest text-center text-xl font-bold"
              type="password"
              inputMode="numeric"
              maxLength={4}
              pattern="\d{4}"
              placeholder="••••"
              value={form.pin}
              onChange={(e) => update("pin", e.target.value.replace(/\D/g, "").slice(0, 4))}
              required={!employee}
            />
          </div>
          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full py-3">
            {loading ? "Saving..." : employee ? "Save Changes" : "Add Employee"}
          </button>
        </form>
      </div>
    </div>
  );
}

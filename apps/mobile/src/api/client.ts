import axios from "axios";
import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";

const BASE_URL = (Constants.expoConfig?.extra?.apiUrl as string) || "http://localhost:3000";

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 10000,
});

// Attach auth token from secure store on every request
api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync("session_token");
  if (token) {
    config.headers["Authorization"] = `Bearer ${token}`;
    config.headers["x-session-token"] = token;
  }
  const tenantSlug = await SecureStore.getItemAsync("tenant_slug");
  if (tenantSlug) {
    config.headers["x-tenant-slug"] = tenantSlug;
  }
  return config;
});

export async function loginMobile(email: string, password: string, tenantSlug: string) {
  const res = await api.post<{ token: string; user: any }>("/api/mobile/auth", {
    email,
    password,
    tenantSlug,
  });
  await SecureStore.setItemAsync("session_token", res.data.token);
  await SecureStore.setItemAsync("tenant_slug", tenantSlug);
  return res.data;
}

export async function logoutMobile() {
  await SecureStore.deleteItemAsync("session_token");
  await SecureStore.deleteItemAsync("tenant_slug");
}

export async function getEmployees() {
  const res = await api.get<Employee[]>("/api/employees");
  return res.data;
}

export async function getEmployeeStatus() {
  const res = await api.get<EmployeeStatus[]>("/api/attendance/status");
  return res.data;
}

export async function checkOut(data: {
  employeeId: string;
  pin: string;
  checkOutTime: string;
  purpose: string;
  notes?: string;
}) {
  const res = await api.post("/api/attendance", data);
  return res.data;
}

export async function checkIn(data: {
  employeeId: string;
  pin: string;
  checkInTime: string;
}) {
  const res = await api.post("/api/attendance/checkin", data);
  return res.data;
}

export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
}

export interface EmployeeStatus {
  id: string;
  firstName: string;
  lastName: string;
  status: "not_arrived" | "in" | "out";
  lastAction: string | null;
  purpose: string | null;
}

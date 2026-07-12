import { useState, useEffect, useCallback } from "react";
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator
} from "react-native";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { formatDistanceToNow } from "date-fns";
import { getEmployeeStatus, logoutMobile, type EmployeeStatus } from "@/api/client";

type Status = "not_arrived" | "in" | "out";

const statusConfig: Record<Status, { label: string; dotColor: string; badgeBg: string; badgeText: string }> = {
  not_arrived: { label: "Not Arrived",   dotColor: "#9ca3af", badgeBg: "#f3f4f6", badgeText: "#6b7280" },
  in:          { label: "At Work",       dotColor: "#22c55e", badgeBg: "#dcfce7", badgeText: "#16a34a" },
  out:         { label: "Out of Office", dotColor: "#f97316", badgeBg: "#ffedd5", badgeText: "#ea580c" },
};

export default function HomeScreen() {
  const router = useRouter();
  const [employees, setEmployees] = useState<EmployeeStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    SecureStore.getItemAsync("session_token").then((token) => {
      if (!token) router.replace("/login");
      else { setAuthed(true); fetchStatus(); }
    });
  }, []);

  const fetchStatus = useCallback(async () => {
    try {
      const data = await getEmployeeStatus();
      // Sort: in → out → not_arrived
      const order: Status[] = ["in", "out", "not_arrived"];
      data.sort((a, b) => order.indexOf(a.status as Status) - order.indexOf(b.status as Status));
      setEmployees(data);
    } catch (err: any) {
      if (err?.response?.status === 401) router.replace("/login");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  async function handleLogout() {
    await logoutMobile();
    router.replace("/login");
  }

  function openAction(emp: EmployeeStatus) {
    const params = { id: emp.id, name: `${emp.firstName} ${emp.lastName}` };
    if (emp.status === "in") {
      router.push({ pathname: "/check-out", params });
    } else {
      // "not_arrived" or "out" both go to check-in
      router.push({ pathname: "/check-in", params: { ...params, isArrival: emp.status === "not_arrived" ? "1" : "0" } });
    }
  }

  if (authed === null || loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color="#2563eb" /></View>;
  }

  const counts = {
    in: employees.filter((e) => e.status === "in").length,
    out: employees.filter((e) => e.status === "out").length,
    not_arrived: employees.filter((e) => e.status === "not_arrived").length,
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>OfficePulse</Text>
          <Text style={styles.headerSub}>Employee Status</Text>
        </View>
        <TouchableOpacity onPress={handleLogout}>
          <Text style={styles.logout}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsRow}>
        <View style={[styles.statCard, { borderLeftColor: "#22c55e" }]}>
          <Text style={styles.statNumber}>{counts.in}</Text>
          <Text style={styles.statLabel}>At Work</Text>
        </View>
        <View style={[styles.statCard, { borderLeftColor: "#f97316" }]}>
          <Text style={styles.statNumber}>{counts.out}</Text>
          <Text style={styles.statLabel}>Out</Text>
        </View>
        <View style={[styles.statCard, { borderLeftColor: "#9ca3af" }]}>
          <Text style={styles.statNumber}>{counts.not_arrived}</Text>
          <Text style={styles.statLabel}>Not Arrived</Text>
        </View>
      </View>

      <FlatList
        data={employees}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchStatus(); }} colors={["#2563eb"]} />}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const cfg = statusConfig[item.status as Status] ?? statusConfig.not_arrived;
          const actionLabel =
            item.status === "in" ? "Check Out" :
            item.status === "not_arrived" ? "Arrive" : "Return";

          return (
            <View style={styles.empCard}>
              <View style={styles.empLeft}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{item.firstName[0]}{item.lastName[0]}</Text>
                </View>
                <View style={styles.empInfo}>
                  <Text style={styles.empName}>{item.firstName} {item.lastName}</Text>
                  {item.purpose && item.status === "out" && (
                    <Text style={styles.empPurpose} numberOfLines={1}>{item.purpose}</Text>
                  )}
                  {item.lastAction && item.status !== "not_arrived" && (
                    <Text style={styles.empTime}>
                      {item.status === "out" ? "Left " : "In since "}
                      {formatDistanceToNow(new Date(item.lastAction), { addSuffix: true })}
                    </Text>
                  )}
                </View>
              </View>
              <View style={styles.empRight}>
                <View style={[styles.badge, { backgroundColor: cfg.badgeBg }]}>
                  <View style={[styles.dot, { backgroundColor: cfg.dotColor }]} />
                  <Text style={[styles.badgeText, { color: cfg.badgeText }]}>{cfg.label}</Text>
                </View>
                <TouchableOpacity
                  style={[styles.actionBtn, item.status === "in" ? styles.actionBtnOut : styles.actionBtnIn]}
                  onPress={() => openAction(item)}
                >
                  <Text style={styles.actionBtnText}>{actionLabel}</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No employees found.</Text>
            <Text style={styles.emptySubText}>Add employees in the web dashboard.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#2563eb", paddingTop: 56, paddingBottom: 20, paddingHorizontal: 20 },
  headerTitle: { fontSize: 20, fontWeight: "700", color: "#fff" },
  headerSub: { fontSize: 13, color: "#bfdbfe", marginTop: 2 },
  logout: { color: "#bfdbfe", fontSize: 14 },
  statsRow: { flexDirection: "row", gap: 10, padding: 14 },
  statCard: { flex: 1, backgroundColor: "#fff", borderRadius: 12, padding: 12, borderLeftWidth: 4, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  statNumber: { fontSize: 22, fontWeight: "700", color: "#111827" },
  statLabel: { fontSize: 11, color: "#6b7280", marginTop: 2 },
  list: { padding: 14, gap: 10 },
  empCard: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#fff", borderRadius: 14, padding: 14, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  empLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: "#eff6ff", alignItems: "center", justifyContent: "center", marginRight: 12 },
  avatarText: { fontWeight: "700", color: "#2563eb", fontSize: 14 },
  empInfo: { flex: 1 },
  empName: { fontWeight: "600", color: "#111827", fontSize: 15 },
  empPurpose: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  empTime: { fontSize: 11, color: "#9ca3af", marginTop: 2 },
  empRight: { alignItems: "flex-end", gap: 8 },
  badge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  badgeText: { fontSize: 11, fontWeight: "600" },
  actionBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8 },
  actionBtnOut: { backgroundColor: "#fff7ed", borderWidth: 1, borderColor: "#fed7aa" },
  actionBtnIn: { backgroundColor: "#eff6ff", borderWidth: 1, borderColor: "#bfdbfe" },
  actionBtnText: { fontSize: 12, fontWeight: "600", color: "#374151" },
  emptyContainer: { alignItems: "center", paddingTop: 60 },
  emptyText: { fontSize: 16, fontWeight: "600", color: "#6b7280" },
  emptySubText: { fontSize: 13, color: "#9ca3af", marginTop: 6 },
});

import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, Alert, ActivityIndicator
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { format } from "date-fns";
import { checkIn } from "@/api/client";

export default function CheckInScreen() {
  const router = useRouter();
  const { id, name, isArrival } = useLocalSearchParams<{ id: string; name: string; isArrival: string }>();
  const arriving = isArrival === "1";

  const [pin, setPin] = useState(["", "", "", ""]);
  const [dateTime, setDateTime] = useState(format(new Date(), "yyyy-MM-dd HH:mm"));
  const [loading, setLoading] = useState(false);

  function handlePinChange(index: number, value: string) {
    if (!/^\d?$/.test(value)) return;
    const next = [...pin];
    next[index] = value;
    setPin(next);
  }

  async function handleSubmit() {
    const pinStr = pin.join("");
    if (pinStr.length !== 4) { Alert.alert("Error", "Please enter your 4-digit PIN."); return; }

    let checkInTime: string;
    try {
      const [datePart, timePart] = dateTime.split(" ");
      checkInTime = new Date(`${datePart}T${timePart}:00`).toISOString();
    } catch {
      Alert.alert("Error", "Invalid date/time.");
      return;
    }

    setLoading(true);
    try {
      await checkIn({ employeeId: id!, pin: pinStr, checkInTime });
      router.back();
    } catch (err: any) {
      Alert.alert("Error", err?.response?.data?.error || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={styles.content}>
        <View style={styles.hero}>
          <Text style={styles.heroEmoji}>{arriving ? "☀️" : "🏢"}</Text>
          <Text style={styles.heroTitle}>{arriving ? "Good Morning!" : "Welcome Back!"}</Text>
          <Text style={styles.heroName}>{name}</Text>
          <Text style={styles.heroSub}>
            {arriving ? "Starting your day at the office" : "Returning to the office"}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>{arriving ? "Arrival" : "Return"} Date & Time</Text>
          <TextInput
            style={styles.input}
            value={dateTime}
            onChangeText={setDateTime}
            placeholder="yyyy-MM-dd HH:mm"
          />

          <Text style={styles.label}>Your 4-Digit PIN</Text>
          <View style={styles.pinRow}>
            {pin.map((digit, i) => (
              <TextInput
                key={i}
                style={styles.pinBox}
                value={digit ? "•" : ""}
                onChangeText={(v) => handlePinChange(i, v)}
                keyboardType="number-pad"
                maxLength={1}
                secureTextEntry
                textAlign="center"
              />
            ))}
          </View>

          <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={loading}>
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.buttonText}>{arriving ? "Start My Day" : "I'm Back"}</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelBtn} onPress={() => router.back()} disabled={loading}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  content: { flex: 1, padding: 20, justifyContent: "center" },
  hero: { alignItems: "center", marginBottom: 28 },
  heroEmoji: { fontSize: 48, marginBottom: 8 },
  heroTitle: { fontSize: 22, fontWeight: "700", color: "#111827" },
  heroName: { fontSize: 16, color: "#2563eb", fontWeight: "600", marginTop: 4 },
  heroSub: { fontSize: 13, color: "#6b7280", marginTop: 4 },
  card: { backgroundColor: "#fff", borderRadius: 16, padding: 20, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  label: { fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 8 },
  input: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, marginBottom: 20, backgroundColor: "#fafafa" },
  pinRow: { flexDirection: "row", justifyContent: "center", gap: 12, marginBottom: 28 },
  pinBox: { width: 56, height: 56, borderWidth: 2, borderColor: "#e5e7eb", borderRadius: 12, fontSize: 24, fontWeight: "700", backgroundColor: "#fafafa" },
  button: { backgroundColor: "#2563eb", borderRadius: 12, paddingVertical: 16, alignItems: "center", marginBottom: 12 },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  cancelBtn: { alignItems: "center", paddingVertical: 12 },
  cancelText: { color: "#6b7280", fontSize: 15 },
});

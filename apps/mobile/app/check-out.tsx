import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, KeyboardAvoidingView, Platform, Alert, ActivityIndicator
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { format } from "date-fns";
import { checkOut } from "@/api/client";

export default function CheckOutScreen() {
  const router = useRouter();
  const { id, name } = useLocalSearchParams<{ id: string; name: string }>();
  const [pin, setPin] = useState(["", "", "", ""]);
  const [purpose, setPurpose] = useState("");
  const [notes, setNotes] = useState("");
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
    if (!purpose.trim()) { Alert.alert("Error", "Please enter a purpose."); return; }

    let checkOutTime: string;
    try {
      const [datePart, timePart] = dateTime.split(" ");
      checkOutTime = new Date(`${datePart}T${timePart}:00`).toISOString();
    } catch {
      Alert.alert("Error", "Invalid date/time.");
      return;
    }

    setLoading(true);
    try {
      await checkOut({ employeeId: id!, pin: pinStr, checkOutTime, purpose, notes });
      router.back();
    } catch (err: any) {
      Alert.alert("Error", err?.response?.data?.error || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <Text style={styles.heroEmoji}>👋</Text>
          <Text style={styles.heroTitle}>Checking Out</Text>
          <Text style={styles.heroName}>{name}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Date & Time</Text>
          <TextInput
            style={styles.input}
            value={dateTime}
            onChangeText={setDateTime}
            placeholder="yyyy-MM-dd HH:mm"
          />

          <Text style={styles.label}>Purpose / Reason *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Client meeting, Lunch..."
            value={purpose}
            onChangeText={setPurpose}
          />

          <Text style={styles.label}>Notes (optional)</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            placeholder="Additional details..."
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
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
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Confirm Check Out</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelBtn} onPress={() => router.back()} disabled={loading}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  content: { padding: 20 },
  hero: { alignItems: "center", marginBottom: 24 },
  heroEmoji: { fontSize: 48, marginBottom: 8 },
  heroTitle: { fontSize: 22, fontWeight: "700", color: "#111827" },
  heroName: { fontSize: 16, color: "#6b7280", marginTop: 4 },
  card: { backgroundColor: "#fff", borderRadius: 16, padding: 20, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  label: { fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 8 },
  input: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, marginBottom: 16, backgroundColor: "#fafafa" },
  multiline: { height: 80, textAlignVertical: "top" },
  pinRow: { flexDirection: "row", justifyContent: "center", gap: 12, marginBottom: 24 },
  pinBox: { width: 56, height: 56, borderWidth: 2, borderColor: "#e5e7eb", borderRadius: 12, fontSize: 24, fontWeight: "700", backgroundColor: "#fafafa" },
  button: { backgroundColor: "#f97316", borderRadius: 12, paddingVertical: 16, alignItems: "center", marginBottom: 12 },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  cancelBtn: { alignItems: "center", paddingVertical: 12 },
  cancelText: { color: "#6b7280", fontSize: 15 },
});

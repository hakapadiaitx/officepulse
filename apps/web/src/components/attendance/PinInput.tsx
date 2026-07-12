"use client";
import { useRef, KeyboardEvent } from "react";

interface Props {
  value: string;
  onChange: (val: string) => void;
}

export function PinInput({ value, onChange }: Props) {
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  function handleChange(index: number, char: string) {
    if (!/^\d$/.test(char) && char !== "") return;
    const chars = value.split("");
    chars[index] = char;
    const next = chars.join("").slice(0, 4);
    onChange(next);
    if (char && index < 3) {
      inputs.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !value[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 4);
    onChange(pasted);
    inputs.current[Math.min(pasted.length, 3)]?.focus();
  }

  return (
    <div className="flex gap-3 justify-center py-2">
      {[0, 1, 2, 3].map((i) => (
        <input
          key={i}
          ref={(el) => { inputs.current[i] = el; }}
          type="password"
          inputMode="numeric"
          maxLength={1}
          value={value[i] || ""}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          className="w-14 h-14 text-center text-2xl font-bold border-2 border-gray-200 rounded-xl focus:border-brand-500 focus:outline-none transition-colors"
        />
      ))}
    </div>
  );
}

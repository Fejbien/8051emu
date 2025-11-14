export const KEYPAD_LAYOUT: Array<{ label: string; value: string }> = [
  { label: "0", value: "0" },
  { label: "1", value: "1" },
  { label: "2", value: "2" },
  { label: "3", value: "3" },
  { label: "4", value: "4" },
  { label: "5", value: "5" },
  { label: "6", value: "6" },
  { label: "7", value: "7" },
  { label: "8", value: "8" },
  { label: "9", value: "9" },
  { label: "A", value: "A" },
  { label: "B", value: "B" },
  { label: "C", value: "C" },
  { label: "D", value: "D" },
  { label: "E", value: "E" },
  { label: "F", value: "F" },
  { label: "Enter", value: "ENTER" },
  { label: "Esc", value: "ESC" },
];

export const WAIT_REASON_MAP: Record<number, string> = {
  1: "Press Enter to continue",
  2: "Press Enter to continue",
  3: "Press Enter or ESC",
  4: "Provide a keypad value (0-9, A-F)",
  5: "Enter a 4-digit number",
};

export const DEFAULT_ASM_CODE = `; DSM51 Assembly Example
    MOV A, #25
    MOV R0, A
    MOV R1, #10`;

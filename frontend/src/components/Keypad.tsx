import { KEYPAD_LAYOUT } from "../constants";

interface KeypadProps {
  onKeyPress: (value: string) => void;
  disabled: boolean;
}

export function Keypad({ onKeyPress, disabled }: KeypadProps) {
  return (
    <div className="bg-white rounded-lg shadow p-4 w-full">
      <h3 className="text-base font-semibold text-gray-700 mb-2">Keypad</h3>
      <div className="grid grid-cols-4 gap-2">
        {KEYPAD_LAYOUT.map((key) => (
          <button
            key={key.value}
            onClick={() => onKeyPress(key.value)}
            disabled={disabled}
            className="py-2 bg-gray-100 text-gray-800 rounded hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-400 text-sm font-medium border"
          >
            {key.label}
          </button>
        ))}
      </div>
    </div>
  );
}

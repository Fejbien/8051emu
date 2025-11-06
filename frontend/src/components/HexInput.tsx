interface HexInputProps {
  emulatorHex: string;
  onEmulatorHexChange: (value: string) => void;
  onLoadProgram: () => void;
  emulatorReady: boolean;
}

export function HexInput({
  emulatorHex,
  onEmulatorHexChange,
  onLoadProgram,
  emulatorReady,
}: HexInputProps) {
  return (
    <div className="flex flex-col bg-white rounded-xl shadow-lg p-6 h-full">
      <textarea
        className="flex-grow w-full p-4 font-mono text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-gray-50 resize-none"
        value={emulatorHex}
        onChange={(e) => onEmulatorHexChange(e.target.value)}
        spellCheck="false"
        placeholder="Intel HEX data will appear here after assembly, or paste your own..."
      />
      <button
        onClick={onLoadProgram}
        disabled={!emulatorReady}
        className="mt-4 w-full py-3 bg-gradient-to-r from-green-600 to-green-700 text-white font-semibold rounded-lg hover:from-green-700 hover:to-green-800 transition-all disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed shadow-md"
      >
        {emulatorReady ? "Load into Emulator" : "Loading Emulator..."}
      </button>
    </div>
  );
}


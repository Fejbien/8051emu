import CodeMirror from "@uiw/react-codemirror";
import { atomone } from "@uiw/codemirror-theme-atomone";

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
      <div className="flex-grow border border-gray-200 rounded-lg overflow-auto min-h-0">
        <CodeMirror
          value={emulatorHex}
          height="386px"
          onChange={(value) => onEmulatorHexChange(value)}
          placeholder="Intel HEX data will appear here after assembly, or paste your own..."
          theme={atomone}
          basicSetup={{
            lineNumbers: true,
            highlightActiveLineGutter: true,
            highlightActiveLine: true,
            foldGutter: true,
            tabSize: 4,
          }}
          style={{
            fontSize: "14px",
          }}
        />
      </div>
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

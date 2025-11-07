import CodeMirror from '@uiw/react-codemirror';

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
      <div className="flex-grow border border-gray-200 rounded-lg overflow-hidden">
        <CodeMirror
          value={emulatorHex}
          height="100%"
          onChange={(value) => onEmulatorHexChange(value)}
          placeholder="Intel HEX data will appear here after assembly, or paste your own..."
          basicSetup={{
            lineNumbers: true,
            highlightActiveLineGutter: true,
            highlightActiveLine: true,
            foldGutter: true,
            tabSize: 4,
          }}
          style={{
            fontSize: '14px',
            height: '100%',
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


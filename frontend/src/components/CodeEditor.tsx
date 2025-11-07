import CodeMirror from "@uiw/react-codemirror";
import { atomone } from "@uiw/codemirror-theme-atomone";

interface CodeEditorProps {
  asmCode: string;
  setAsmCode: (code: string) => void;
  loadError: string;
  factoryLoaded: boolean;
  onAssemble: () => void;
}

export function CodeEditor({
  asmCode,
  setAsmCode,
  loadError,
  factoryLoaded,
  onAssemble,
}: CodeEditorProps) {
  return (
    <div className="flex flex-col bg-white rounded-xl shadow-lg p-6 h-full">
      {loadError && (
        <div className="mb-3 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {loadError}
        </div>
      )}
      <div className="flex-grow border border-gray-200 rounded-lg overflow-hidden">
        <CodeMirror
          value={asmCode}
          height="100%"
          onChange={(value) => setAsmCode(value)}
          placeholder="Enter your 8051 assembly code here..."
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
            height: "100%",
          }}
        />
      </div>
      <button
        onClick={onAssemble}
        disabled={!factoryLoaded}
        className="mt-4 w-full py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed shadow-md"
      >
        {factoryLoaded ? "Assemble Code" : "Loading Assembler..."}
      </button>
    </div>
  );
}

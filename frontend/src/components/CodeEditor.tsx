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
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const target = e.target as HTMLTextAreaElement;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const newValue = asmCode.substring(0, start) + '    ' + asmCode.substring(end);
      setAsmCode(newValue);
      
      // Set cursor position after the inserted spaces
      setTimeout(() => {
        target.selectionStart = target.selectionEnd = start + 4;
      }, 0);
    }
  };

  return (
    <div className="flex flex-col bg-white rounded-xl shadow-lg p-6 h-full">
      {loadError && (
        <div className="mb-3 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {loadError}
        </div>
      )}
      <textarea
        className="flex-grow w-full p-4 font-mono text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 resize-none"
        value={asmCode}
        onChange={(e) => setAsmCode(e.target.value)}
        onKeyDown={handleKeyDown}
        spellCheck="false"
        placeholder="Enter your 8051 assembly code here..."
      />
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


interface HexOutputModalProps {
  output: string;
  isOpen: boolean;
  onClose: () => void;
}

export function HexOutputModal({ output, isOpen, onClose }: HexOutputModalProps) {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }}
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b">
          <h2 className="text-lg font-semibold">Hex Output</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl w-6 h-6"
          >
            ×
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          <pre className="bg-gray-50 p-3 rounded border">
            <code className="font-mono text-xs">{output}</code>
          </pre>
        </div>
        <div className="px-5 py-3 border-t flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}


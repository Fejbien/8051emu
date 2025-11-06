interface HeaderProps {
  onShowHexOutput: () => void;
}

export function Header({ onShowHexOutput }: HeaderProps) {
  return (
    <header className="bg-gradient-to-r from-blue-600 to-blue-700 shadow-lg">
      <div className="max-w-[1800px] mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white">8051 Emulator with support for DSM-51 instructions</h1>
          </div>
        </div>
        <button
          onClick={onShowHexOutput}
          className="px-4 py-2 bg-white text-blue-700 font-semibold rounded-lg hover:bg-blue-50 transition-colors shadow-md"
        >
          View Hex Outputs (Debug)
        </button>
      </div>
    </header>
  );
}


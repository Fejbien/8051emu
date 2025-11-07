interface HeaderProps {
  onShowHexOutput: () => void;
  onShowSyscalls: () => void;
  onShowUsageInfo: () => void;
}

export function Header({
  onShowHexOutput,
  onShowSyscalls,
  onShowUsageInfo,
}: HeaderProps) {
  return (
    <header className="bg-gradient-to-r from-blue-600 to-blue-700 shadow-lg">
      <div className="max-w-[1800px] mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white">
              8051 Emulator with support for DSM-51 instructions
            </h1>
            <span className="text-sm text-white">
              Mostyly works, but there are still shit ton of bugs&nbsp;-&nbsp;
              <a
                href="https://github.com/Fejbien/8051emu"
                className="text-sm text-white hover:text-blue-300 underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                GitHub repo
              </a>
            </span>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onShowUsageInfo}
            className="px-4 py-2 bg-white text-blue-700 font-semibold rounded-lg hover:bg-blue-50 transition-colors shadow-md"
          >
            Usage & Differences
          </button>
          <button
            onClick={onShowSyscalls}
            className="px-4 py-2 bg-white text-blue-700 font-semibold rounded-lg hover:bg-blue-50 transition-colors shadow-md"
          >
            Syscalls Reference
          </button>
          <button
            onClick={onShowHexOutput}
            className="px-4 py-2 bg-white text-blue-700 font-semibold rounded-lg hover:bg-blue-50 transition-colors shadow-md"
          >
            View Hex Outputs (Debug)
          </button>
        </div>
      </div>
    </header>
  );
}

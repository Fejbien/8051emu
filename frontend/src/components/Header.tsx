interface HeaderProps {
  onShowHexOutput: () => void;
  onShowSyscalls: () => void;
}

export function Header({
  onShowHexOutput,
  onShowSyscalls,
}: HeaderProps) {
  return (
    <header className="bg-gradient-to-r from-blue-600 to-blue-700 shadow-lg">
      <div className="max-w-[1800px] mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white">
              DSM51 assembler and emulator
            </h1>
            <span className="text-sm text-white">
              Assembler works great, emulator was sloppy port of my 6502 emulator&nbsp;-&nbsp;
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

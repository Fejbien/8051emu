interface SyscallsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const IMPLEMENTED_SYSCALLS = [
  { name: "WRITE_DATA", addr: "0x8102", desc: "Write data byte to LCD" },
  { name: "WRITE_HEX", addr: "0x8104", desc: "Write hex value to LCD" },
  { name: "LCD_INIT", addr: "0x8108", desc: "Initialize LCD display" },
  { name: "LCD_CLR", addr: "0x810C", desc: "Clear LCD display" },
  { name: "WAIT_ENTER", addr: "0x8114", desc: "Wait for Enter key" },
  { name: "WAIT_ENT_ESC", addr: "0x811A", desc: "Wait for Enter or ESC" },
  { name: "WAIT_KEY", addr: "0x811C", desc: "Wait for keypad input" },
];

const NOT_IMPLEMENTED_SYSCALLS = [
  { name: "TEST_ENTER", addr: "0x8118", desc: "Test if Enter pressed" },
  { name: "DELAY_US", addr: "0x810E", desc: "Delay microseconds" },
  { name: "DELAY_MS", addr: "0x8110", desc: "Delay milliseconds" },
  { name: "DELAY_100MS", addr: "0x8112", desc: "Delay 100 milliseconds" },
  { name: "WRITE_INSTR", addr: "0x8106", desc: "Write instruction to LCD" },
  { name: "WRITE_TEXT", addr: "0x8100", desc: "Write text to LCD" },
  { name: "GET_NUM", addr: "0x811E", desc: "Get 4-digit number" },
  {
    name: "WAIT_ENTER_NW",
    addr: "0x8116",
    desc: "Wait for Enter (non-blocking)",
  },
  { name: "LCD_OFF", addr: "0x810A", desc: "Turn off LCD display" },
  { name: "BCD_HEX", addr: "0x8120", desc: "Convert BCD to hex" },
  { name: "HEX_BCD", addr: "0x8122", desc: "Convert hex to BCD" },
  { name: "MUL_2_2", addr: "0x8124", desc: "2-byte multiplication" },
  { name: "MUL_3_1", addr: "0x8126", desc: "3x1 byte multiplication" },
  { name: "DIV_2_1", addr: "0x8128", desc: "2÷1 byte division" },
  { name: "DIV_4_2", addr: "0x812A", desc: "4÷2 byte division" },
];

export function SyscallsModal({ isOpen, onClose }: SyscallsModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.3)" }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b">
          <h2 className="text-lg font-semibold">
            DSM-51 System Calls Reference
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl w-6 h-6"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Implemented Syscalls */}
            <div>
              <h3 className="text-base font-semibold text-green-700 mb-3 flex items-center gap-2">
                <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                Implemented fully ({IMPLEMENTED_SYSCALLS.length})
              </h3>
              <div className="space-y-2">
                {IMPLEMENTED_SYSCALLS.map((syscall) => (
                  <div
                    key={syscall.name}
                    className="bg-green-50 border border-green-200 rounded p-3"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-mono text-sm font-semibold text-green-800">
                          {syscall.name}
                        </div>
                        <div className="text-xs text-green-600 mt-1">
                          {syscall.desc}
                        </div>
                      </div>
                      <div className="font-mono text-xs text-green-600 ml-2">
                        {syscall.addr}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Not Implemented Syscalls */}
            <div>
              <h3 className="text-base font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <span className="w-3 h-3 bg-gray-400 rounded-full"></span>
                To be Implemented fully (callable but not implemented) (
                {NOT_IMPLEMENTED_SYSCALLS.length})
              </h3>
              <div className="space-y-2">
                {NOT_IMPLEMENTED_SYSCALLS.map((syscall) => (
                  <div
                    key={syscall.name}
                    className="bg-gray-50 border border-gray-200 rounded p-3"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-mono text-sm font-semibold text-gray-700">
                          {syscall.name}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {syscall.desc}
                        </div>
                      </div>
                      <div className="font-mono text-xs text-gray-500 ml-2">
                        {syscall.addr}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
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

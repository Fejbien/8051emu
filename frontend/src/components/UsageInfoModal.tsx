interface UsageInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UsageInfoModal({ isOpen, onClose }: UsageInfoModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[85vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">
            Usage Guide & Differences from DSM-51
          </h2>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 text-2xl font-bold w-8 h-8 flex items-center justify-center rounded hover:bg-white/10 transition-colors"
          >
            ×
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {/* Binary Numbers Section */}
          <section className="mb-6">
            <h3 className="text-lg font-bold text-gray-800 mb-3 border-b-2 border-blue-500 pb-2">
              Binary Numbers
            </h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-700 mb-3">
                This emulator supports binary notation using the{" "}
                <code className="bg-white px-2 py-1 rounded border">0b</code>{" "}
                prefix, which is useful when working with flags and bit
                patterns:
              </p>
              <div className="space-y-2 font-mono text-sm bg-white p-3 rounded border border-gray-300">
                <div className="text-gray-600">
                  ; Examples of binary notation:
                </div>
                <div>MOV A, #0b11010010</div>
                <div>MOV R0, #0b00001111</div>
                <div>MOV PSW, #0b00011000</div>
              </div>
            </div>
          </section>

          {/* PSW Register Section */}
          <section className="mb-6">
            <h3 className="text-lg font-bold text-gray-800 mb-3 border-b-2 border-blue-500 pb-2">
              PSW Register (Program Status Word)
            </h3>

            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-blue-100">
                      <th className="border border-gray-300 px-3 py-2 text-sm font-semibold">
                        Bit
                      </th>
                      <th className="border border-gray-300 px-3 py-2 text-sm font-semibold">
                        7
                      </th>
                      <th className="border border-gray-300 px-3 py-2 text-sm font-semibold">
                        6
                      </th>
                      <th className="border border-gray-300 px-3 py-2 text-sm font-semibold">
                        5
                      </th>
                      <th className="border border-gray-300 px-3 py-2 text-sm font-semibold">
                        4
                      </th>
                      <th className="border border-gray-300 px-3 py-2 text-sm font-semibold">
                        3
                      </th>
                      <th className="border border-gray-300 px-3 py-2 text-sm font-semibold">
                        2
                      </th>
                      <th className="border border-gray-300 px-3 py-2 text-sm font-semibold">
                        1
                      </th>
                      <th className="border border-gray-300 px-3 py-2 text-sm font-semibold">
                        0
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-gray-300 px-3 py-2 text-sm font-semibold bg-gray-100">
                        Name
                      </td>
                      <td className="border border-gray-300 px-3 py-2 text-center text-sm font-mono">
                        CY
                      </td>
                      <td className="border border-gray-300 px-3 py-2 text-center text-sm font-mono">
                        AC
                      </td>
                      <td className="border border-gray-300 px-3 py-2 text-center text-sm font-mono">
                        F0
                      </td>
                      <td className="border border-gray-300 px-3 py-2 text-center text-sm font-mono bg-yellow-50">
                        RS1
                      </td>
                      <td className="border border-gray-300 px-3 py-2 text-center text-sm font-mono bg-yellow-50">
                        RS0
                      </td>
                      <td className="border border-gray-300 px-3 py-2 text-center text-sm font-mono">
                        OV
                      </td>
                      <td className="border border-gray-300 px-3 py-2 text-center text-sm font-mono">
                        -
                      </td>
                      <td className="border border-gray-300 px-3 py-2 text-center text-sm font-mono">
                        P
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="space-y-3">
              <div className="bg-white border border-gray-300 rounded p-3">
                <h4 className="font-semibold text-gray-700 mb-2">
                  Bit Descriptions:
                </h4>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li>
                    <strong>Bit 7 (CY):</strong> Carry flag - Set by arithmetic
                    operations on the accumulator
                  </li>
                  <li>
                    <strong>Bit 6 (AC):</strong> Auxiliary Carry flag - Set for
                    BCD operations (carry from bit 3 to bit 4)
                  </li>
                  <li>
                    <strong>Bit 5 (F0):</strong> User-defined flag - General
                    purpose flag bit
                  </li>
                  <li className="bg-yellow-50 p-2 rounded border border-yellow-300">
                    <strong>Bits 4-3 (RS1, RS0):</strong> Register Bank Select
                    bits
                    <div className="ml-4 mt-1 space-y-1 font-mono text-xs">
                      <div>RS1=0, RS0=0 → Bank 0 (0x00-0x07)</div>
                      <div>RS1=0, RS0=1 → Bank 1 (0x08-0x0F)</div>
                      <div>RS1=1, RS0=0 → Bank 2 (0x10-0x17)</div>
                      <div>RS1=1, RS0=1 → Bank 3 (0x18-0x1F)</div>
                    </div>
                  </li>
                  <li>
                    <strong>Bit 2 (OV):</strong> Overflow flag - Set by signed
                    arithmetic overflow
                  </li>
                  <li>
                    <strong>Bit 1:</strong> Reserved (user-definable)
                  </li>
                  <li>
                    <strong>Bit 0 (P):</strong> Parity flag - Set if accumulator
                    has odd number of 1s
                  </li>
                </ul>
              </div>
            </div>
          </section>
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

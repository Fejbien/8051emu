import { useEffect, useState } from "react";
import { useCSharpAssembler } from "./hooks/useCSharpAssembler";
import { useEmulator } from "./hooks/useEmulator";
import { Header } from "./components/Header";
import { HexOutputModal } from "./components/HexOutputModal";
import { SyscallsModal } from "./components/SyscallsModal";
import { CodeEditor } from "./components/CodeEditor";
import { HexInput } from "./components/HexInput";
import { EmulatorControls } from "./components/EmulatorControls";
import { LCDOutput } from "./components/LCDOutput";
import { Keypad } from "./components/Keypad";
import { RAMViewer } from "./components/RAMViewer";
import { ExternalRAMViewer } from "./components/ExternalRAMViewer";

function App() {
  const [showHexOutput, setShowHexOutput] = useState(false);
  const [showSyscalls, setShowSyscalls] = useState(false);

  const {
    factoryLoaded,
    asmCode,
    setAsmCode,
    output,
    loadError,
    intelHex,
    handleAssemble,
  } = useCSharpAssembler();

  const {
    emulatorReady,
    emulatorLoaded,
    emulatorStatus,
    emulatorOutput,
    emulatorWaiting,
    emulatorState,
    registerBanks,
    runCycles,
    emulatorHex,
    handleEmulatorHexChange,
    loadEmulatorHex,
    handleLoadProgram,
    handleRunCycleChange,
    handleRun,
    handleStep,
    handleResetEmulator,
    handleKeypad,
    readRAM,
    readExternalRAM,
  } = useEmulator();

  useEffect(() => {
    if (intelHex) {
      loadEmulatorHex(intelHex);
    }
  }, [intelHex, loadEmulatorHex]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col">
      <Header
        onShowHexOutput={() => setShowHexOutput(true)}
        onShowSyscalls={() => setShowSyscalls(true)}
      />

      <main className="flex-1 max-w-[1800px] mx-auto w-full p-6 flex flex-col gap-6">
        {/* Code Editor and Hex Input Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[500px]">
          <CodeEditor
            asmCode={asmCode}
            setAsmCode={setAsmCode}
            loadError={loadError}
            factoryLoaded={factoryLoaded}
            onAssemble={handleAssemble}
          />
          <HexInput
            emulatorHex={emulatorHex}
            onEmulatorHexChange={handleEmulatorHexChange}
            onLoadProgram={handleLoadProgram}
            emulatorReady={emulatorReady}
          />
        </div>

        {/* Emulator Section */}
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="space-y-4 w-full lg:w-auto">
            <LCDOutput emulatorOutput={emulatorOutput} />
            <Keypad
              onKeyPress={handleKeypad}
              disabled={!emulatorReady || !emulatorLoaded}
            />
          </div>
          <div className="space-y-4 flex-1">
            <EmulatorControls
              emulatorStatus={emulatorStatus}
              emulatorWaiting={emulatorWaiting}
              runCycles={runCycles}
              emulatorReady={emulatorReady}
              emulatorLoaded={emulatorLoaded}
              onRunCycleChange={handleRunCycleChange}
              onRun={handleRun}
              onStep={handleStep}
              onResetEmulator={handleResetEmulator}
            />
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="text-base font-semibold text-gray-700 mb-2">
                CPU Registers
              </h3>
              {emulatorState ? (
                <>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 mb-4">
                    <div className="bg-gray-50 p-2 rounded border">
                      <div className="text-xs text-gray-500">PC</div>
                      <div className="font-mono text-sm font-semibold">
                        {`0x${emulatorState.pc
                          .toString(16)
                          .toUpperCase()
                          .padStart(4, "0")}`}
                      </div>
                    </div>
                    <div className="bg-gray-50 p-2 rounded border">
                      <div className="text-xs text-gray-500">SP</div>
                      <div className="font-mono text-sm font-semibold">
                        {`0x${emulatorState.sp
                          .toString(16)
                          .toUpperCase()
                          .padStart(2, "0")}`}
                      </div>
                    </div>
                    <div className="bg-gray-50 p-2 rounded border">
                      <div className="text-xs text-gray-500">A</div>
                      <div className="font-mono text-sm font-semibold">
                        {`0x${emulatorState.a
                          .toString(16)
                          .toUpperCase()
                          .padStart(2, "0")}`}
                      </div>
                    </div>
                    <div className="bg-gray-50 p-2 rounded border">
                      <div className="text-xs text-gray-500">B</div>
                      <div className="font-mono text-sm font-semibold">
                        {`0x${emulatorState.b
                          .toString(16)
                          .toUpperCase()
                          .padStart(2, "0")}`}
                      </div>
                    </div>
                    <div className="bg-gray-50 p-2 rounded border">
                      <div className="text-xs text-gray-500">DPTR</div>
                      <div className="font-mono text-sm font-semibold">
                        {`0x${emulatorState.dptr
                          .toString(16)
                          .toUpperCase()
                          .padStart(4, "0")}`}
                      </div>
                    </div>
                    <div className="bg-gray-50 p-2 rounded border">
                      <div className="text-xs text-gray-500">PSW</div>
                      <div className="font-mono text-sm font-semibold">
                        {`0x${emulatorState.psw
                          .toString(16)
                          .toUpperCase()
                          .padStart(2, "0")}`}
                      </div>
                    </div>
                    <div className="bg-gray-50 p-2 rounded border">
                      <div className="text-xs text-gray-500">P0</div>
                      <div className="font-mono text-sm font-semibold">
                        {`0x${emulatorState.p0
                          .toString(16)
                          .toUpperCase()
                          .padStart(2, "0")}`}
                      </div>
                    </div>
                    <div className="bg-gray-50 p-2 rounded border">
                      <div className="text-xs text-gray-500">P1</div>
                      <div className="font-mono text-sm font-semibold">
                        {`0x${emulatorState.p1
                          .toString(16)
                          .toUpperCase()
                          .padStart(2, "0")}`}
                      </div>
                    </div>
                    <div className="bg-gray-50 p-2 rounded border">
                      <div className="text-xs text-gray-500">P2</div>
                      <div className="font-mono text-sm font-semibold">
                        {`0x${emulatorState.p2
                          .toString(16)
                          .toUpperCase()
                          .padStart(2, "0")}`}
                      </div>
                    </div>
                    <div className="bg-gray-50 p-2 rounded border">
                      <div className="text-xs text-gray-500">P3</div>
                      <div className="font-mono text-sm font-semibold">
                        {`0x${emulatorState.p3
                          .toString(16)
                          .toUpperCase()
                          .padStart(2, "0")}`}
                      </div>
                    </div>
                    <div className="bg-blue-50 p-2 rounded border border-blue-200 col-span-2">
                      <div className="text-xs text-blue-600">Cycles</div>
                      <div className="font-mono text-sm font-semibold text-blue-800">
                        {emulatorState.cycles}
                      </div>
                    </div>
                  </div>

                  {/* Register Banks */}
                  {registerBanks && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">
                        Register Banks
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {[0, 1, 2, 3].map((bankNum) => {
                          const activeBank = (emulatorState.psw >> 3) & 0x03;
                          return (
                            <div
                              key={bankNum}
                              className={`p-2 rounded border-2 ${
                                bankNum === activeBank
                                  ? "bg-green-50 border-green-300"
                                  : "bg-gray-50 border-gray-200"
                              }`}
                            >
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-xs font-semibold text-gray-700">
                                  Bank {bankNum}
                                </span>
                                {bankNum === activeBank && (
                                  <span className="text-xs bg-green-600 text-white px-2 py-0.5 rounded">
                                    Active
                                  </span>
                                )}
                              </div>
                              <div className="grid grid-cols-4 gap-1">
                                {[0, 1, 2, 3, 4, 5, 6, 7].map((reg) => {
                                  const addr = bankNum * 8 + reg;
                                  const value = registerBanks[addr];
                                  return (
                                    <div key={reg} className="text-center">
                                      <div className="text-xs text-gray-500">
                                        R{reg}
                                      </div>
                                      <div className="font-mono text-xs font-semibold">
                                        {value
                                          .toString(16)
                                          .padStart(2, "0")
                                          .toUpperCase()}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-gray-500 bg-gray-50 p-3 rounded border">
                  Load and run a program to see register values
                </p>
              )}
            </div>
            <RAMViewer
              emulatorReady={emulatorReady}
              emulatorLoaded={emulatorLoaded}
              onReadRAM={readRAM}
            />
            <ExternalRAMViewer
              emulatorReady={emulatorReady}
              emulatorLoaded={emulatorLoaded}
              onReadExternalRAM={readExternalRAM}
            />
          </div>
        </div>
      </main>

      <HexOutputModal
        output={output}
        isOpen={showHexOutput}
        onClose={() => setShowHexOutput(false)}
      />

      <SyscallsModal
        isOpen={showSyscalls}
        onClose={() => setShowSyscalls(false)}
      />
    </div>
  );
}

export default App;

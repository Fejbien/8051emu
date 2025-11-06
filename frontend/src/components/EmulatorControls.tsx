interface EmulatorControlsProps {
  emulatorStatus: string;
  emulatorWaiting: string | null;
  runCycles: number;
  emulatorReady: boolean;
  emulatorLoaded: boolean;
  onRunCycleChange: (value: string) => void;
  onRun: () => void;
  onStep: () => void;
  onResetEmulator: () => void;
}

export function EmulatorControls({
  emulatorStatus,
  emulatorWaiting,
  runCycles,
  emulatorReady,
  emulatorLoaded,
  onRunCycleChange,
  onRun,
  onStep,
  onResetEmulator,
}: EmulatorControlsProps) {
  const emulatorControlsDisabled = !emulatorReady;
  const emulatorRunDisabled = !emulatorReady || !emulatorLoaded;

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-base font-semibold text-gray-700 mb-3">Controls</h3>
      
      <div className="flex gap-4">
        {/* Buttons Column */}
        <div className="flex flex-col gap-2 w-24">
          <button
            onClick={onRun}
            disabled={emulatorRunDisabled}
            className="py-2 px-3 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 disabled:bg-gray-300"
          >
            Run
          </button>
          <button
            onClick={onStep}
            disabled={emulatorRunDisabled}
            className="py-2 px-3 bg-purple-600 text-white text-sm font-medium rounded hover:bg-purple-700 disabled:bg-gray-300"
          >
            Step
          </button>
          <button
            onClick={onResetEmulator}
            disabled={emulatorControlsDisabled}
            className="py-2 px-3 bg-gray-600 text-white text-sm font-medium rounded hover:bg-gray-700 disabled:bg-gray-300"
          >
            Reset
          </button>
        </div>

        {/* Info Column */}
        <div className="flex-1 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-600 whitespace-nowrap" htmlFor="run-cycles">
              Run Cycles:
            </label>
            <input
              id="run-cycles"
              type="number"
              min={1}
              value={runCycles}
              onChange={(e) => onRunCycleChange(e.target.value)}
              className="w-32 px-2 py-1 border rounded text-sm"
            />
          </div>

          <div className="bg-gray-50 p-2 rounded border">
            <p className="text-xs text-gray-600">{emulatorStatus}</p>
          </div>

          {emulatorWaiting && (
            <div className="p-[6px] bg-orange-100 border-2 border-orange-300 rounded-lg">
              <div className="flex items-center gap-2">
                <div>
                  <p className="text-sm font-medium text-orange-700">Waiting for input: {emulatorWaiting}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


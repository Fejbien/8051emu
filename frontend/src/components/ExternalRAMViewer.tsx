interface ExternalRAMViewerProps {
  emulatorReady: boolean;
  emulatorLoaded: boolean;
  onReadExternalRAM: (offset: number, length: number) => Uint8Array | null;
}

export function ExternalRAMViewer({ emulatorReady, emulatorLoaded, onReadExternalRAM }: ExternalRAMViewerProps) {
  // Display first 1KB of external RAM (0x0000 - 0x03FF)
  const ramData = emulatorReady && emulatorLoaded ? onReadExternalRAM(0, 1024) : null;

  if (!ramData) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-base font-semibold text-gray-700 mb-2">External RAM (showing first 1KB of 64KB)</h3>
        <p className="text-sm text-gray-500 bg-gray-50 p-3 rounded border">
          Load and run a program to see external RAM contents
        </p>
      </div>
    );
  }

  const rows = [];
  for (let i = 0; i < 1024; i += 16) {
    const rowBytes = [];
    for (let j = 0; j < 16; j++) {
      const value = ramData[i + j];
      rowBytes.push(value);
    }
    rows.push({ offset: i, bytes: rowBytes });
  }

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-base font-semibold text-gray-700 mb-2">External RAM (showing first 1KB of 64KB)</h3>
      <div className="overflow-x-auto max-h-96 overflow-y-auto">
        <div className="font-mono text-xs">
          {/* Header */}
          <div className="flex gap-1 mb-1 text-gray-500 sticky top-0 bg-white">
            <span className="w-14">Addr</span>
            {Array.from({ length: 16 }, (_, i) => (
              <span key={i} className="w-6 text-center">
                {i.toString(16).toUpperCase()}
              </span>
            ))}
          </div>
          
          {/* RAM rows */}
          {rows.map((row) => (
            <div key={row.offset} className="flex gap-1 hover:bg-gray-50">
              <span className="w-14 text-gray-600">
                {row.offset.toString(16).padStart(4, '0').toUpperCase()}:
              </span>
              {row.bytes.map((byte, idx) => (
                <span
                  key={idx}
                  className={`w-6 text-center ${
                    byte === 0 ? 'text-gray-300' : 'text-gray-800 font-semibold'
                  }`}
                >
                  {byte.toString(16).padStart(2, '0').toUpperCase()}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


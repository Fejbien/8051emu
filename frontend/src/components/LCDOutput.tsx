interface LCDOutputProps {
  emulatorOutput: string;
}

export function LCDOutput({ emulatorOutput }: LCDOutputProps) {
  // Format LCD output to display max 2 lines of 16 chars each
  const formatLCDOutput = (text: string): string => {
    if (!text || typeof text !== 'string') return "";
    
    try {
      const lines = text.split('\n');
      const displayLines = lines.slice(0, 2).map(line => {
        // Truncate each line to 16 characters
        return line.length > 16 ? line.substring(0, 16) : line;
      });
      
      return displayLines.join('\n');
    } catch (error) {
      console.error('Error formatting LCD output:', error);
      return "";
    }
  };

  const displayText = emulatorOutput 
    ? formatLCDOutput(emulatorOutput)
    : "";

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-base font-semibold text-gray-700 mb-3">LCD Display</h3>
      <div className="bg-gradient-to-br from-green-900 to-green-950 p-4 rounded border-4 border-gray-800">
        <div 
          className="font-mono text-green-400 whitespace-pre leading-relaxed" 
          style={{ 
            fontSize: '1.75rem',
            height: '4.5rem',
            fontFamily: 'Courier New, monospace',
            letterSpacing: '0.35em',
            width: '24.6ch'
          }}
        >
          {displayText || "                \n                "}
        </div>
      </div>
    </div>
  );
}




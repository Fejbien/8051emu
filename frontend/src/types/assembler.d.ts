// Type definitions for C# Assembler WebAssembly

declare global {
  interface Window {
    // Blazor WASM API
    Blazor?: {
      start: (options?: {
        loadBootResource?: (
          type: string,
          name: string,
          defaultUri: string,
          integrity: string
        ) => string | Promise<Response> | null | undefined;
      }) => Promise<void>;
    };

    // .NET Interop
    DotNet?: {
      invokeMethodAsync: <T = string>(
        assemblyName: string,
        methodName: string,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...args: any[]
      ) => Promise<T>;
    };

    // Simplified API for direct use (optional)
    assembler8051?: {
      initialize: () => Promise<{
        success: boolean;
        message?: string;
        error?: string;
      }>;
      assemble: (code: string) => Promise<AssembleResult>;
    };
  }
}

// Result from C# assembler
export interface AssembleResult {
  success: boolean;
  hexBytes?: string;        // Raw hex string: "FF00A3..."
  intelHex?: string;        // Intel HEX format with newlines
  binaryData?: number[];    // Array of bytes: [255, 0, 163, ...]
  byteCount?: number;       // Total number of bytes
  error?: string;           // Error message if success is false
  stackTrace?: string;      // Stack trace for debugging
}

// For comparison with existing SDAS8051 assembler
export interface AssemblerHook {
  factoryLoaded: boolean;
  asmCode: string;
  setAsmCode: (code: string) => void;
  output: string;
  loadError: string;
  intelHex: string;
  handleAssemble: () => Promise<void>;
}

export {};

export interface EmscriptenModule {
  locateFile: (path: string, prefix: string) => string;
  print?: (text: string) => void;
  printErr?: (text: string) => void;
}

declare global {
  interface Window {
    Module: Partial<EmscriptenModule>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sdas8051: (() => Promise<any>) | undefined;
    createEmulatorModule?:
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      | ((config?: Record<string, unknown>) => Promise<any>)
      | undefined;
    EmulatorModule?:
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      | ((config?: Record<string, unknown>) => Promise<any>)
      | undefined;
    emulatorModule?:
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      | ((config?: Record<string, unknown>) => Promise<any>)
      | undefined;
  }
}

export interface EmulatorSnapshot {
  pc: number;
  sp: number;
  a: number;
  b: number;
  dptr: number;
  psw: number;
  cycles: string;
  p0: number;
  p1: number;
  p2: number;
  p3: number;
}

export type EmulatorStateOffsets = {
  cycles: number;
  pc: number;
  dptr: number;
  sp: number;
  a: number;
  b: number;
  psw: number;
  p0: number;
  p1: number;
  p2: number;
  p3: number;
};

export interface EmulatorApi {
  create: () => number;
  destroy: (ptr: number) => void;
  reset: (ptr: number) => void;
  loadHexString: (ptr: number, strPtr: number) => number;
  setOutputOptions: (ptr: number, capture: number, mirror: number) => void;
  readOutput: (ptr: number, bufferPtr: number, maxLen: number) => number;
  getOutputSize: (ptr: number) => number;
  clearOutput: (ptr: number) => void;
  pushInput: (ptr: number, bufferPtr: number, length: number) => void;
  runCycles: (ptr: number, cycles: number) => void;
  step: (ptr: number) => void;
  isWaiting: (ptr: number) => number;
  waitReason: (ptr: number) => number;
  getState: (ptr: number, statePtr: number) => void;
  stateSize: () => number;
  stateOffset: (field: number) => number;
  readByte: (ptr: number, offset: number) => number;
}


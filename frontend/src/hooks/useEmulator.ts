import { useState, useEffect, useRef, useCallback } from "react";
import type { EmulatorApi, EmulatorSnapshot, EmulatorStateOffsets } from "../types";
import { WAIT_REASON_MAP } from "../constants";

export function useEmulator() {
  const [emulatorReady, setEmulatorReady] = useState(false);
  const [emulatorLoaded, setEmulatorLoaded] = useState(false);
  const [emulatorStatus, setEmulatorStatus] = useState(
    "Loading emulator module..."
  );
  const [emulatorOutput, setEmulatorOutput] = useState("");
  const [emulatorWaiting, setEmulatorWaiting] = useState<string | null>(null);
  const [emulatorState, setEmulatorState] = useState<EmulatorSnapshot | null>(
    null
  );
  const [runCycles, setRunCycles] = useState(1000);
  const [emulatorHex, setEmulatorHex] = useState("");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const emulatorModuleRef = useRef<any>(null);
  const emulatorApiRef = useRef<EmulatorApi | null>(null);
  const emulatorInstanceRef = useRef<number | null>(null);
  const emulatorScriptLoaded = useRef(false);
  const emulatorStateOffsetsRef = useRef<EmulatorStateOffsets | null>(null);
  const emulatorHexTouched = useRef(false);

  useEffect(() => {
    if (emulatorScriptLoaded.current) {
      return;
    }
    emulatorScriptLoaded.current = true;

    const script = document.createElement("script");
    script.src = "/assets/emulator.js";
    script.async = true;

    script.onerror = (error) => {
      console.error("Failed to load emulator script:", error);
      setEmulatorStatus(
        "Failed to load emulator script. Check public/assets for emulator.js/.wasm."
      );
    };

    script.onload = async () => {
      try {
        const factoryNames = [
          "createEmulatorModule",
          "EmulatorModule",
          "emulatorModule",
        ];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let factory: ((config?: Record<string, unknown>) => Promise<any> | any) |
          null = null;

        for (const name of factoryNames) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const candidate = (window as any)[name];
          if (typeof candidate === "function") {
            factory = candidate;
            break;
          }
        }

        if (!factory) {
          console.error(
            "No emulator factory function found. Check build EXPORT_NAME."
          );
          setEmulatorStatus(
            "Emulator factory not found. Recompile with -s EXPORT_NAME=\"createEmulatorModule\" -s MODULARIZE=1."
          );
          return;
        }

        const module = await Promise.resolve(
          factory({
            locateFile: (path: string) =>
              path.endsWith(".wasm") ? "/assets/emulator.wasm" : path,
            print: (text: string) =>
              console.log("Emulator WASM stdout:", text),
            printErr: (text: string) =>
              console.error("Emulator WASM stderr:", text),
          })
        );

        if (!module || typeof module.cwrap !== "function") {
          setEmulatorStatus(
            "Loaded emulator module is missing cwrap. Check the compilation target."
          );
          return;
        }

        const wrap = module.cwrap.bind(module);

        const api: EmulatorApi = {
          create: wrap("emulator_create", "number", []),
          destroy: wrap("emulator_destroy", null, ["number"]),
          reset: wrap("emulator_reset", null, ["number"]),
          loadHexString: wrap("emulator_load_hex_string", "number", [
            "number",
            "number",
          ]),
          setOutputOptions: wrap("emulator_set_output_options", null, [
            "number",
            "number",
            "number",
          ]),
          readOutput: wrap("emulator_read_output", "number", [
            "number",
            "number",
            "number",
          ]),
          getOutputSize: wrap("emulator_get_output_size", "number", [
            "number",
          ]),
          clearOutput: wrap("emulator_clear_output", null, ["number"]),
          pushInput: wrap("emulator_push_input_len", null, [
            "number",
            "number",
            "number",
          ]),
          runCycles: wrap("emulator_run_cycles", null, ["number", "number"]),
          step: wrap("emulator_step", null, ["number"]),
          isWaiting: wrap("emulator_is_waiting", "number", ["number"]),
          waitReason: wrap("emulator_wait_reason", "number", ["number"]),
          getState: wrap("emulator_get_state", null, ["number", "number"]),
          stateSize: wrap("emulator_state_size", "number", []),
          stateOffset: wrap("emulator_state_offset", "number", ["number"]),
          readByte: wrap("emulator_read_byte", "number", ["number", "number"]),
        };

        const instancePtr = api.create();
        api.setOutputOptions(instancePtr, 1, 0);
        api.clearOutput(instancePtr);

        const offsets: EmulatorStateOffsets = {
          cycles: api.stateOffset(0),
          pc: api.stateOffset(1),
          dptr: api.stateOffset(2),
          sp: api.stateOffset(3),
          a: api.stateOffset(4),
          b: api.stateOffset(5),
          psw: api.stateOffset(6),
          p0: api.stateOffset(7),
          p1: api.stateOffset(8),
          p2: api.stateOffset(9),
          p3: api.stateOffset(10),
        };

        emulatorStateOffsetsRef.current = offsets;

        emulatorModuleRef.current = module;
        emulatorApiRef.current = api;
        emulatorInstanceRef.current = instancePtr;

        setEmulatorReady(true);
        setEmulatorStatus("Emulator ready. Load a HEX program to begin.");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (error: any) {
        console.error("Error initialising emulator module:", error);
        setEmulatorStatus(
          `Error initialising emulator module: ${error?.message ?? error}`
        );
      }
    };

    document.body.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
      const api = emulatorApiRef.current;
      const ptr = emulatorInstanceRef.current;
      if (api && ptr !== null) {
        api.destroy(ptr);
      }
      emulatorApiRef.current = null;
      emulatorInstanceRef.current = null;
      emulatorModuleRef.current = null;
      emulatorStateOffsetsRef.current = null;
    };
  }, []);

  function getEmulatorContext(requireLoaded = false) {
    const module = emulatorModuleRef.current;
    const api = emulatorApiRef.current;
    const instance = emulatorInstanceRef.current;

    if (!module || !api || instance === null) {
      setEmulatorStatus("Emulator module is not ready yet.");
      return null;
    }

    if (requireLoaded && !emulatorLoaded) {
      setEmulatorStatus("Load a HEX program before running the emulator.");
      return null;
    }

    return { module, api, instance } as const;
  }

  function pullEmulatorOutput() {
    const context = getEmulatorContext();
    if (!context) {
      return;
    }
    const { module, api, instance } = context;
    const available = api.getOutputSize(instance);
    if (!available) {
      return;
    }

    const bufferPtr = module._malloc(available + 1);
    try {
      const read = api.readOutput(instance, bufferPtr, available);
      if (read > 0) {
        const text = module.UTF8ToString(bufferPtr, read);
        if (text) {
          setEmulatorOutput((prev) => prev + text);
        }
      }
    } finally {
      module._free(bufferPtr);
    }
  }

  function pullEmulatorState() {
    const context = getEmulatorContext();
    if (!context) {
      return;
    }
    const offsets = emulatorStateOffsetsRef.current;
    if (!offsets) {
      return;
    }
    const { module, api, instance } = context;
    const size = api.stateSize();
    if (!size) {
      return;
    }

    const statePtr = module._malloc(size);
    try {
      api.getState(instance, statePtr);
      const bytes = new Uint8Array(size);
      for (let i = 0; i < size; ++i) {
        bytes[i] = api.readByte(statePtr, i);
      }
      const view = new DataView(bytes.buffer);

      let cycles = "0";
      if (typeof view.getBigUint64 === "function") {
        cycles = (view.getBigUint64(offsets.cycles, true) as bigint).toString();
      } else {
        const low = view.getUint32(offsets.cycles, true);
        const high = view.getUint32(offsets.cycles + 4, true);
        cycles = (high * 4294967296 + low).toString();
      }

      const snapshot: EmulatorSnapshot = {
        pc: view.getUint16(offsets.pc, true),
        sp: view.getUint8(offsets.sp),
        a: view.getUint8(offsets.a),
        b: view.getUint8(offsets.b),
        dptr: view.getUint16(offsets.dptr, true),
        psw: view.getUint8(offsets.psw),
        cycles,
        p0: view.getUint8(offsets.p0),
        p1: view.getUint8(offsets.p1),
        p2: view.getUint8(offsets.p2),
        p3: view.getUint8(offsets.p3),
      };

      setEmulatorState(snapshot);
    } finally {
      module._free(statePtr);
    }
  }

  function updateWaitStatus() {
    const context = getEmulatorContext();
    if (!context) {
      return;
    }
    const { api, instance } = context;
    if (api.isWaiting(instance)) {
      const reason = api.waitReason(instance);
      setEmulatorWaiting(WAIT_REASON_MAP[reason] || "Program is waiting for input.");
    } else {
      setEmulatorWaiting(null);
    }
  }

  function handleEmulatorHexChange(value: string) {
    emulatorHexTouched.current = true;
    setEmulatorHex(value);
  }

  const loadEmulatorHex = useCallback((hex: string) => {
    if (!emulatorHexTouched.current) {
      setEmulatorHex(hex);
    }
  }, []);

  function handleLoadProgram() {
    const context = getEmulatorContext();
    if (!context) {
      return;
    }
    const { module, api, instance } = context;
    const hex = emulatorHex.trim();
    if (!hex) {
      setEmulatorStatus("HEX input is empty.");
      return;
    }

    api.reset(instance);
    api.clearOutput(instance);

    const byteLength = module.lengthBytesUTF8(hex) + 1;
    const ptr = module._malloc(byteLength);
    try {
      module.stringToUTF8(hex, ptr, byteLength);
      const success = api.loadHexString(instance, ptr);
      if (!success) {
        setEmulatorStatus("Failed to load HEX data into the emulator.");
        return;
      }
    } finally {
      module._free(ptr);
    }

    setEmulatorLoaded(true);
    setEmulatorOutput("");
    setEmulatorStatus("HEX program loaded into emulator.");
    setEmulatorWaiting(null);
    pullEmulatorState();
  }

  function handleRunCycleChange(value: string) {
    const parsed = parseInt(value, 10);
    if (Number.isNaN(parsed) || parsed <= 0) {
      setRunCycles(1);
      return;
    }
    setRunCycles(parsed);
  }

  function handleRun(cycles?: number) {
    const context = getEmulatorContext(true);
    if (!context) {
      return;
    }
    const { api, instance } = context;
    const totalCycles = Math.max(1, Math.floor(cycles ?? runCycles));
    
    // Run in smaller chunks to prevent UI blocking
    const chunkSize = 100;
    let remaining = totalCycles;
    
    const runChunk = () => {
      const toRun = Math.min(remaining, chunkSize);
      api.runCycles(instance, toRun);
      remaining -= toRun;
      
      pullEmulatorOutput();
      pullEmulatorState();
      updateWaitStatus();
      
      if (remaining > 0 && !api.isWaiting(instance)) {
        // Continue running in next frame
        requestAnimationFrame(runChunk);
      } else {
        setEmulatorStatus(`Ran ${totalCycles.toLocaleString()} cycles.`);
      }
    };
    
    runChunk();
  }

  function handleStep() {
    const context = getEmulatorContext(true);
    if (!context) {
      return;
    }
    const { api, instance } = context;
    api.step(instance);
    pullEmulatorOutput();
    pullEmulatorState();
    updateWaitStatus();
    setEmulatorStatus("Stepped one instruction.");
  }

  function handleResetEmulator() {
    const api = emulatorApiRef.current;
    if (!api) {
      setEmulatorStatus("Emulator module is not ready yet.");
      return;
    }

    const currentPtr = emulatorInstanceRef.current;
    if (currentPtr !== null) {
      api.destroy(currentPtr);
    }

    const newPtr = api.create();
    emulatorInstanceRef.current = newPtr;
    api.setOutputOptions(newPtr, 1, 0);
    api.clearOutput(newPtr);

    setEmulatorLoaded(false);
    setEmulatorOutput("");
    setEmulatorWaiting(null);

    const hex = emulatorHex.trim();
    if (hex) {
      setEmulatorStatus("Emulator reset. Reloading program...");
      setTimeout(() => {
        handleLoadProgram();
      }, 0);
    } else {
      setEmulatorStatus("Emulator reset. Load a HEX program to begin.");
      setEmulatorState(null);
    }
  }

  function handleKeypad(value: string) {
    const context = getEmulatorContext(true);
    if (!context) {
      return;
    }
    const { module, api, instance } = context;

    let payload = "";
    if (value === "ENTER") {
      payload = "\n";
    } else if (value === "ESC") {
      payload = String.fromCharCode(27);
    } else {
      payload = `${value}\n`;
    }

    const byteLength = module.lengthBytesUTF8(payload) + 1;
    const ptr = module._malloc(byteLength);
    try {
      module.stringToUTF8(payload, ptr, byteLength);
      api.pushInput(instance, ptr, byteLength - 1);
    } finally {
      module._free(ptr);
    }

    const autoCycles = Math.max(20, Math.floor(runCycles / 10));
    api.runCycles(instance, autoCycles);
    pullEmulatorOutput();
    pullEmulatorState();
    updateWaitStatus();

    if (value === "ENTER") {
      setEmulatorStatus("Sent ENTER to emulator.");
    } else if (value === "ESC") {
      setEmulatorStatus("Sent ESC to emulator.");
    } else {
      setEmulatorStatus(`Sent '${value}' to emulator.`);
    }
  }

  return {
    emulatorReady,
    emulatorLoaded,
    emulatorStatus,
    emulatorOutput,
    emulatorWaiting,
    emulatorState,
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
  };
}


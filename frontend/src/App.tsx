import { useState, useEffect, useRef } from "react";

interface EmscriptenModule {
  locateFile: (path: string, prefix: string) => string;
  print?: (text: string) => void;
  printErr?: (text: string) => void;
}
declare global {
  interface Window {
    Module: Partial<EmscriptenModule>;
    sdas8051: (() => Promise<any>) | undefined;
  }
}

function App() {
  const [factoryLoaded, setFactoryLoaded] = useState(false);
  const [asmCode, setAsmCode] = useState(() => {
    const savedCode = getCookie("asmCode");
    return (
      savedCode ||
      "; 8051 Assembly Example\n.area CODE (ABS)\n.org 0x0000\n\nSTART:\n    MOV A, #0x25\n    MOV R0, A\n    MOV R1, #0x10\nLOOP:\n    ADD A, R0\n    DJNZ R1, LOOP\n    SJMP START"
    );
  });
  const [output, setOutput] = useState("Assembler not yet loaded...");
  const [loadError, setLoadError] = useState<string>("");
  const scriptLoaded = useRef(false);
  function setCookie(name: string, value: string, days: number = 365) {
    const expires = new Date();
    expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = `${name}=${encodeURIComponent(
      value
    )};expires=${expires.toUTCString()};path=/`;
  }

  function getCookie(name: string): string | null {
    const nameEQ = name + "=";
    const ca = document.cookie.split(";");
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === " ") c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0) {
        return decodeURIComponent(c.substring(nameEQ.length, c.length));
      }
    }
    return null;
  }

  useEffect(() => {
    setCookie("asmCode", asmCode);
  }, [asmCode]);

  useEffect(() => {
    if (scriptLoaded.current) {
      return;
    }
    scriptLoaded.current = true;

    window.Module = {
      locateFile: (path: string) => {
        if (path.endsWith(".wasm")) {
          return "/assets/sdas8051.wasm";
        }
        return path;
      },
      print: (text: string) => {
        console.log("WASM stdout:", text);
      },
      printErr: (text: string) => {
        console.error("WASM stderr:", text);
      },
    };

    const script = document.createElement("script");
    script.src = "/assets/sdas8051.js";
    script.async = true;

    script.onerror = (error) => {
      console.error("Failed to load assembler script:", error);
      setLoadError(
        "Failed to load assembler script. Check if files are in public/assets/"
      );
      setOutput("Error loading assembler. See console for details.");
    };

    script.onload = () => {
      console.log("Script loaded, checking for module...");

      setTimeout(() => {
        const possibleNames = [
          "sdas8051",
          "Module",
          "createModule",
          "_sdas8051",
        ];
        let factory = null;
        let foundName = "";

        for (const name of possibleNames) {
          if (typeof (window as any)[name] === "function") {
            factory = (window as any)[name];
            foundName = name;
            break;
          } else if (
            typeof (window as any)[name] === "object" &&
            (window as any)[name] !== null
          ) {
            console.log(
              `Found object at window.${name}:`,
              (window as any)[name]
            );
            setFactoryLoaded(true);
            setOutput(
              'Assembler is ready. Enter your code and click "Assemble".'
            );
            return;
          }
        }

        if (factory) {
          console.log(`Found factory function: ${foundName}`);
          factory()
            .then((module: any) => {
              console.log("WASM module loaded successfully!");
              setFactoryLoaded(true);
              setOutput(
                'Assembler is ready. Enter your code and click "Assemble".'
              );
            })
            .catch((error: any) => {
              console.error("Error initializing WASM module:", error);
              setLoadError(`WASM initialization error: ${error.message}`);
              setOutput(`Error: ${error.message}`);
            });
        } else {
          console.error("No factory function found");
          console.log("All keys on window:", Object.keys(window).slice(-20));
          console.log("Module object:", window.Module);
          setLoadError(
            "Module factory not found. Check emcc compilation flags."
          );
          setOutput(
            'Error: Could not find module factory. You may need to recompile with -s EXPORT_NAME="sdas8051" -s MODULARIZE=1'
          );
        }
      }, 100);
    };

    document.body.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  const handleAssemble = async () => {
    console.log("handleAssemble called");
    console.log("factoryLoaded:", factoryLoaded);
    console.log("window.sdas8051:", typeof window.sdas8051);
    console.log("window.Module:", typeof window.Module);

    let factory = null;
    const possibleNames = ["sdas8051", "Module", "createModule", "_sdas8051"];
    for (const name of possibleNames) {
      if (typeof (window as any)[name] === "function") {
        factory = (window as any)[name];
        console.log(`Using factory: ${name}`);
        break;
      }
    }

    if (!factory) {
      setOutput(
        "Error: Assembler module is not loaded yet. Factory function not found."
      );
      console.error("No factory function found on window");
      return;
    }

    try {
      console.log("Creating fresh module instance...");
      const freshModule = await factory();
      console.log("Fresh module created:", freshModule);

      const inputFilename = "input.asm";
      const listFilename = "input.lst";
      const relFilename = "input.rel";

      freshModule.FS.writeFile(inputFilename, asmCode);

      freshModule.callMain(["-l", inputFilename]);

      const lstContent = freshModule.FS.readFile(listFilename, {
        encoding: "utf8",
      });

      const hasErrors = lstContent.includes("?ASxxxx-Error");

      if (hasErrors) {
        const errorLines = lstContent
          .split("\n")
          .filter(
            (line) =>
              line.includes("?ASxxxx-Error") || line.includes("?ASxxxx-Warning")
          );
        setOutput(
          "=== Assembly Errors ===\n\n" +
            errorLines.join("\n") +
            "\n\n=== Full Listing ===\n\n" +
            lstContent
        );
        return;
      }

      const codeSegments: { address: number; bytes: string[] }[] = [];
      let currentSegment: { address: number; bytes: string[] } | null = null;
      const lines = lstContent.split("\n");

      for (const line of lines) {
        const match = line.match(
          /^\s*([0-9A-F]{4,6})\s+([0-9A-F]{2}(?:\s+[0-9A-F]{2})*)/i
        );
        if (match) {
          const addr = parseInt(match[1], 16);
          const bytes = match[2].split(/\s+/).filter((b) => b.length > 0);

          if (
            currentSegment &&
            addr === currentSegment.address + currentSegment.bytes.length
          ) {
            currentSegment.bytes.push(...bytes);
          } else {
            if (currentSegment) {
              codeSegments.push(currentSegment);
            }
            currentSegment = { address: addr, bytes: bytes };
          }
        }
      }

      if (currentSegment) {
        codeSegments.push(currentSegment);
      }

      const hexBytes: string[] = [];
      for (const segment of codeSegments) {
        hexBytes.push(...segment.bytes);
      }

      let result = "";

      if (hexBytes.length > 0) {
        result += "=== Machine Code (HEX) ===\n\n";

        for (let i = 0; i < hexBytes.length; i += 16) {
          const addr = i.toString(16).padStart(4, "0").toUpperCase();
          const chunk = hexBytes.slice(i, i + 16);
          result += `${addr}: ${chunk.join(" ")}\n`;
        }

        result += `\n--- Summary ---\n`;
        result += `Total: ${hexBytes.length} bytes\n\n`;
        result += `Raw hex: ${hexBytes.join("")}\n\n`;

        result += `Intel HEX format:\n`;
        const intelHex = generateIntelHexFromSegments(codeSegments);
        result += intelHex + "\n\n";

        result += `C array format:\n`;
        result += `unsigned char code[] = {\n  `;

        const cArray = hexBytes
          .map((byte, i) => {
            const prefix = i > 0 && i % 12 === 0 ? "\n  " : "";
            return prefix + "0x" + byte;
          })
          .join(", ");

        result += cArray + "\n};\n";
      } else {
        result = "No machine code generated. Check listing below:\n\n";
        result += "=== Listing File ===\n" + lstContent;
      }

      setOutput(result);
    } catch (e: any) {
      setOutput(`An error occurred:\n${e.message}\n\nStack: ${e.stack}`);
      console.error("Assembly error:", e);
    }
  };

  function generateIntelHexFromSegments(
    segments: { address: number; bytes: string[] }[]
  ): string {
    const lines: string[] = [];

    for (const segment of segments) {
      const bytes = segment.bytes;
      let address = segment.address;

      for (let i = 0; i < bytes.length; i += 16) {
        const chunk = bytes.slice(i, i + 16);
        const byteCount = chunk.length;
        const addr = address + i;
        const addrHigh = (addr >> 8) & 0xff;
        const addrLow = addr & 0xff;
        const recordType = 0x00;

        let record = "";
        record += byteCount.toString(16).padStart(2, "0").toUpperCase();
        record += addrHigh.toString(16).padStart(2, "0").toUpperCase();
        record += addrLow.toString(16).padStart(2, "0").toUpperCase();
        record += recordType.toString(16).padStart(2, "0").toUpperCase();
        record += chunk.join("").toUpperCase();

        let checksum = byteCount + addrHigh + addrLow + recordType;
        for (const byte of chunk) {
          checksum += parseInt(byte, 16);
        }
        checksum = (~checksum + 1) & 0xff;

        record += checksum.toString(16).padStart(2, "0").toUpperCase();
        lines.push(":" + record);
      }
    }

    lines.push(":00000001FF");

    return lines.join("\n");
  }

  return (
    <main className="bg-gray-100 h-screen flex flex-col md:flex-row p-4 gap-4 font-sans">
      <div className="flex-1 flex flex-col bg-white rounded-lg shadow-md p-4">
        <h2 className="text-xl font-semibold mb-2 text-gray-700">
          8051 Assembler
        </h2>
        {loadError && (
          <div className="mb-2 p-2 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
            {loadError}
          </div>
        )}
        <textarea
          className="flex-grow w-full p-3 font-mono text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={asmCode}
          onChange={(e) => setAsmCode(e.target.value)}
          spellCheck="false"
        />
        <button
          onClick={handleAssemble}
          disabled={!factoryLoaded}
          className="mt-4 py-2 px-4 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {factoryLoaded ? "Assemble" : "Loading Assembler..."}
        </button>
      </div>
      <div className="flex-1 flex flex-col bg-white rounded-lg shadow-md p-4">
        <h2 className="text-xl font-semibold mb-2 text-gray-700">Hex Output</h2>
        <pre className="flex-grow bg-gray-50 p-3 border border-gray-300 rounded-md overflow-y-auto whitespace-pre-wrap break-words">
          <code className="font-mono text-xs text-gray-800">{output}</code>
        </pre>
      </div>
    </main>
  );
}

export default App;

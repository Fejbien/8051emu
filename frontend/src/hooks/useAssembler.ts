/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useRef } from "react";
import { getCookie, setCookie, generateIntelHexFromSegments } from "../utils";
import { DEFAULT_ASM_CODE, SYSTEM_CALLS } from "../constants";

export function useAssembler() {
  const [factoryLoaded, setFactoryLoaded] = useState(false);
  const [asmCode, setAsmCode] = useState(() => {
    const savedCode = getCookie("asmCode");
    return savedCode || DEFAULT_ASM_CODE;
  });
  const [output, setOutput] = useState("Assembler not yet loaded...");
  const [loadError, setLoadError] = useState<string>("");
  const [intelHex, setIntelHex] = useState("");
  const scriptLoaded = useRef(false);

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
            .then(() => {
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

      // Find which system calls are used in the code
      const usedSystemCalls: string[] = [];
      for (const syscallName in SYSTEM_CALLS) {
        const regex = new RegExp(`\\b${syscallName}\\b`, 'i');
        if (regex.test(asmCode)) {
          usedSystemCalls.push(SYSTEM_CALLS[syscallName]);
        }
      }

      // Append only the used system call definitions
      let codeWithSystemCalls = asmCode;
      if (usedSystemCalls.length > 0) {
        codeWithSystemCalls += '\n' + usedSystemCalls.join('\n') + '\n';
      }
      
      freshModule.FS.writeFile(inputFilename, codeWithSystemCalls);

      freshModule.callMain(["-l", inputFilename]);

      const lstContent = freshModule.FS.readFile(listFilename, {
        encoding: "utf8",
      });

      const hasErrors = lstContent.includes("?ASxxxx-Error");

      if (hasErrors) {
        const errorLines = lstContent
          .split("\n")
          .filter((line: string) =>
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
          const bytes = match[2].split(/\s+/).filter((value: string) => value.length > 0);

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

        setIntelHex(intelHex);

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

  return {
    factoryLoaded,
    asmCode,
    setAsmCode,
    output,
    loadError,
    intelHex,
    handleAssemble,
  };
}


/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useRef } from "react";
import { getCookie, setCookie } from "../utils";
import { DEFAULT_ASM_CODE } from "../constants";

export function useCSharpAssembler() {
  const [factoryLoaded, setFactoryLoaded] = useState(false);
  const [asmCode, setAsmCode] = useState(() => {
    const savedCode = getCookie("asmCode");
    return savedCode || DEFAULT_ASM_CODE;
  });
  const [output, setOutput] = useState("C# Assembler not yet loaded...");
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

    const script = document.createElement("script");
    script.src = "/assets/assembler/_framework/blazor.webassembly.js";
    script.setAttribute("autostart", "false");
    script.async = true;

    script.onerror = (error) => {
      console.error("Failed to load C# assembler script:", error);
      setLoadError(
        "Failed to load C# assembler. Make sure Blazor WASM is built and copied to public/assets/assembler/"
      );
      setOutput("Error loading C# assembler. See console for details.");
    };

    script.onload = () => {
      console.log("Blazor script loaded, initializing...");

      if (typeof (window as any).Blazor === "undefined") {
        setLoadError("Blazor object not found after script load");
        setOutput("Error: Blazor WASM not properly initialized");
        return;
      }

      (window as any).Blazor.start({
        applicationEnvironment: "Production",
        loadBootResource: function (_type: string, _name: string, defaultUri: string) {
          console.log("Loading resource:", defaultUri);
          
          // Convert all relative paths to absolute paths under /assets/assembler/_framework/
          if (defaultUri.startsWith("./")) {
            const newUri = "/assets/assembler/_framework/" + defaultUri.substring(2);
            console.log("Redirected to:", newUri);
            return newUri;
          }
          if (defaultUri.startsWith("_framework/")) {
            const newUri = "/assets/assembler/" + defaultUri;
            console.log("Redirected to:", newUri);
            return newUri;
          }
          return defaultUri;
        }
      }).then(() => {
        console.log("Blazor WASM loaded successfully");
        
        // Log available assemblies for debugging
        console.log("DotNet available:", typeof (window as any).DotNet);
        
        // Wait a moment for assemblies to load
        setTimeout(() => {
          // Initialize the assembler
          (window as any).DotNet.invokeMethodAsync("AssemblerWasm", "Initialize")
            .then((result: string) => {
              console.log("Assembler initialized:", result);
              setFactoryLoaded(true);
              setOutput('C# Assembler is ready. Enter your code and click "Assemble".');
            })
            .catch((error: any) => {
              console.error("Error initializing assembler:", error);
              
              // Try alternative assembly names
              console.log("Trying alternative assembly names...");
              (window as any).DotNet.invokeMethodAsync("assembler", "Initialize")
                .then((result: string) => {
                  console.log("Assembler initialized with 'assembler' name:", result);
                  setFactoryLoaded(true);
                  setOutput('C# Assembler is ready. Enter your code and click "Assemble".');
                })
                .catch(() => {
                  setLoadError(`Initialization error: ${error.message}`);
                  setOutput(`Error: Could not find AssemblerWasm or assembler assembly.\n\n${error.message}`);
                });
            });
        }, 500);
      }).catch((error: any) => {
        console.error("Error starting Blazor:", error);
        setLoadError(`Blazor start error: ${error.message}`);
        setOutput(`Error: ${error.message}`);
      });
    };

    document.body.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  const handleAssemble = async () => {
    console.log("handleAssemble called (C# version)");
    console.log("factoryLoaded:", factoryLoaded);

    if (!factoryLoaded || typeof (window as any).DotNet === "undefined") {
      setOutput("Error: C# Assembler module is not loaded yet.");
      return;
    }

    try {
      console.log("Calling C# assembler...");
      const resultJson = await (window as any).DotNet.invokeMethodAsync(
        "AssemblerWasm",
        "AssembleCode",
        asmCode
      );
      
      console.log("Received result:", resultJson);
      const result = JSON.parse(resultJson);

      // Handle both PascalCase (from C#) and camelCase property names
      const success = result.success ?? result.Success;
      const error = result.error ?? result.Error;
      const hexBytes = result.hexBytes ?? result.HexBytes;
      const intelHexResult = result.intelHex ?? result.IntelHex;
      const binaryData = result.binaryData ?? result.BinaryData;
      const byteCount = result.byteCount ?? result.ByteCount;

      if (!success) {
        setOutput(`Assembly Error:\n\n${error || "Unknown error"}`);
        setIntelHex("");
        return;
      }

      // Format the output
      let outputText = "=== C# Assembler Output ===\n\n";
      outputText += `Success! Generated ${byteCount} bytes\n\n`;
      
      if (hexBytes) {
        outputText += "=== Machine Code (HEX) ===\n\n";
        const hexBytesArray = hexBytes.match(/.{1,2}/g) || [];
        
        for (let i = 0; i < hexBytesArray.length; i += 16) {
          const addr = i.toString(16).padStart(4, "0").toUpperCase();
          const chunk = hexBytesArray.slice(i, i + 16);
          outputText += `${addr}: ${chunk.join(" ")}\n`;
        }
        
        outputText += `\nRaw hex: ${hexBytes}\n\n`;
      }

      if (intelHexResult) {
        outputText += "=== Intel HEX Format ===\n\n";
        outputText += intelHexResult + "\n\n";
        setIntelHex(intelHexResult);
      }

      // C array format
      if (binaryData) {
        outputText += "=== C Array Format ===\n\n";
        outputText += "unsigned char code[] = {\n  ";
        
        // Convert base64 to byte array
        const binaryString = atob(binaryData);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        const cArray = Array.from(bytes)
          .map((byte: number, i: number) => {
            const prefix = i > 0 && i % 12 === 0 ? "\n  " : "";
            return prefix + "0x" + byte.toString(16).padStart(2, "0").toUpperCase();
          })
          .join(", ");
        outputText += cArray + "\n};\n";
      }

      setOutput(outputText);
    } catch (error: any) {
      setOutput(`An error occurred:\n${error.message}\n\nStack: ${error.stack}`);
      console.error("Assembly error:", error);
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

namespace assembler
{
    internal class Assembler
    {
        const bool DEBUG = true;

        public static List<string> HandleAssembly(string[] lines, List<byte> outputBytes)
        {
            int locationCounter = 0;
            var symbolTable = new Dictionary<string, int>();
            SymbolsTable.PrepopulateSymbols(symbolTable);
            var opcodeTable = new OpcodeTable().Table;

            // First Pass
            foreach (string rawLine in lines)
            {
                (bool? flowControl, List<string> value)=FirstPass(ref locationCounter, symbolTable, opcodeTable, rawLine);
                switch (flowControl)
                {
                    case false: continue;
                    case true: return value;
                }
            }

            Dictionary<int, byte> outputData = new Dictionary<int, byte>();
            locationCounter = 0;

            // 2nd pass
            foreach (string rawLine in lines)
            {
                (bool flowControl, locationCounter)=SecondPass(outputBytes, locationCounter, symbolTable, opcodeTable, outputData, rawLine);
                if (!flowControl)
                {
                    continue;
                }
            }

            Console.WriteLine("Assembly completed successfully.");
            return IntelHexConverter.ConvertToIntelHex(outputData);
        }

        private static (bool? flowControl, List<string> value) FirstPass(ref int locationCounter, Dictionary<string, int> symbolTable, Dictionary<string, InstructionInfo> opcodeTable, string rawLine)
        {
            // Cleaing
            string line = CleanLine(rawLine);
            if (string.IsNullOrEmpty(line))
            {
                return (flowControl: false, value: null);
            }

            string[] parts = line.Trim().Split([' ', '\t'], 2, StringSplitOptions.RemoveEmptyEntries);
            Console.WriteLine($"[Debug P1] Processing line: '{line}'");
            foreach (var part in parts)
            {
                Console.WriteLine($"           > Part: '{part}'");
            }
            string mnemonic = parts[0].ToUpper();

            // Handle Labels
            string? label = IsLabel(line);
            if (label != null)
            {
                if (symbolTable.ContainsKey(label))
                {
                    throw new Exception($"Error: Duplicate label '{label}'");
                }
                else
                {
                    symbolTable[label] = locationCounter;
                }
                line = line.Substring(label.Length + 1).Trim();
                if (string.IsNullOrEmpty(line))
                {
                    return (flowControl: false, value: null);
                }
            }

            // Handle ORG
            if (mnemonic == "ORG" || mnemonic == ".ORG")
            {
                int newAddress = ConvertNumberToInt(parts[1]);
                locationCounter = newAddress;
                return (flowControl: false, value: null);
            }

            // Handle EQU
            if (mnemonic == "EQU")
            {
                int value = ConvertNumberToInt(line.Split(' ')[2]);
                symbolTable[line.Split(' ')[0]] = value;
                return (flowControl: false, value: null);
            }

            // Later handle DB, DW and others
            // TODO

            // Handle Instructions
            InstructionMatch? match = FindInstructionInTable(line, opcodeTable);
            if (match != null)
            {
                locationCounter += match.Info.Bytes;
            }
            else
            {
                throw new Exception($"Error: Unknown instruction in line '{line}'");
            }

            return (flowControl: null, value: null);
        }

        private static (bool flowControl, int value) SecondPass(List<byte> outputBytes, int locationCounter, Dictionary<string, int> symbolTable, Dictionary<string, InstructionInfo> opcodeTable, Dictionary<int, byte> outputData, string rawLine)
        {
            string line = CleanLine(rawLine);
            if (string.IsNullOrEmpty(line))
            {
                return (flowControl: false, value: locationCounter);
            }

            if (line.Contains(':'))
            {
                line = line.Substring(line.IndexOf(':') + 1).Trim();
            }

            if (string.IsNullOrEmpty(line))
            {
                return (flowControl: false, value: locationCounter);
            }

            string[] parts = line.Trim().Split([' ', '\t'], StringSplitOptions.RemoveEmptyEntries);
            if (parts.Length == 0) return (flowControl: false, value: locationCounter);

            string mnemonic = parts[0].ToUpper();

            if (mnemonic == "ORG" || mnemonic == ".ORG")
            {
                int newAddress = ConvertNumberToInt(parts[1]);
                locationCounter = newAddress;
            }
            else if (mnemonic == "EQU")
            {
                // handle EQU
            }
            else if (mnemonic == "DB")
            {
                //h andle DB 

            }
            // TODO add else if for DW DS etc.
            else
            {
                InstructionMatch? match = Assembler.FindInstructionInTable(line, opcodeTable);

                if (match == null)
                {
                    throw new Exception($"Error: Unknown instruction in line '{line}'");
                }

                if (DEBUG)
                {
                    Console.WriteLine($"[Debug P2] Line: '{line}'");
                    Console.WriteLine($"           > Found key: '{match.MatchedKey}'");
                    Console.WriteLine($"           > Bytes from table: {match.Info.Bytes}");
                    Console.WriteLine($"           > LC before: 0x{locationCounter:X4}");
                }

                string[] operandStrings = match.OperandStrings;
                byte[] operandBytes;

                // Special handling for paged jumps (ACALL/AJMP)
                if (match.MatchedKey == "ACALL" || match.MatchedKey == "AJMP")
                {
                    operandBytes = CalculatePagedJump(match.Info, operandStrings[0], locationCounter, symbolTable);
                    outputData[locationCounter] = operandBytes[0];
                    outputData[locationCounter + 1] = operandBytes[1];
                }
                else // Normal instructions
                {
                    operandBytes = ResolveOperands(match.MatchedKey, operandStrings, locationCounter, symbolTable);

                    outputData[locationCounter] = match.Info.Opcode;
                    for (int i = 0; i < operandBytes.Length; i++)
                    {
                        outputData[locationCounter + 1 + i] = operandBytes[i];
                    }
                }

                outputBytes.Add(match.Info.Opcode);
                outputBytes.AddRange(operandBytes);

                locationCounter += match.Info.Bytes;

                if (DEBUG)
                    Console.WriteLine($"           > LC after: 0x{locationCounter:X4}");
            }

            return (flowControl: true, value: locationCounter);
        }

        static byte[] ResolveOperands(string matchedKey, string[] operandStrings, int locationCounter, Dictionary<string, int> symbolTable)
        {
            string operandPattern = "";
            int spaceIndex = matchedKey.IndexOf(' ');
            if (spaceIndex != -1)
            {
                operandPattern = matchedKey.Substring(spaceIndex + 1);
            }

            if (DEBUG)
                Console.WriteLine($"[Debug P2] Resolving operands for pattern: '{operandPattern}'");

            switch (operandPattern)
            {
                case "":
                case "A":
                case "C":
                case "AB":
                case "DPTR":
                case "@A+DPTR":
                case "@A+PC":
                case "R0":
                case "R1":
                case "R2":
                case "R3":
                case "R4":
                case "R5":
                case "R6":
                case "R7":
                case "@R0":
                case "@R1":
                case "A, @R0":
                case "A, @R1":
                case "A, R0":
                case "A, R1":
                case "A, R2":
                case "A, R3":
                case "A, R4":
                case "A, R5":
                case "A, R6":
                case "A, R7":
                case "R0, A":
                case "R1, A":
                case "R2, A":
                case "R3, A":
                case "R4, A":
                case "R5, A":
                case "R6, A":
                case "R7, A":
                case "@R0, A":
                case "@R1, A":
                    return [];

                case "#data":
                case "A, #data":
                case "#data, A":
                case "@R0, #data":
                case "@R1, #data":
                case "R0, #data":
                case "R1, #data":
                case "R2, #data":
                case "R3, #data":
                case "R4, #data":
                case "R5, #data":
                case "R6, #data":
                case "R7, #data":
                    string dataStr = operandStrings[operandStrings.Length - 1];
                    return [(byte)ConvertNumberToInt(dataStr.Substring(1))];

                case "direct":
                case "A, direct":
                case "direct, A":
                case "@R0, direct":
                case "@R1, direct":
                case "R0, direct":
                case "R1, direct":
                case "R2, direct":
                case "R3, direct":
                case "R4, direct":
                case "R5, direct":
                case "R6, direct":
                case "R7, direct":
                    string directStr = (operandPattern.StartsWith("direct")) ? operandStrings[0] : operandStrings[1];
                    return [(byte)ResolveSymbol(directStr, symbolTable)];

                case "rel":
                case "C, rel":
                case "A, rel":
                    return [CalculateRel(operandStrings[0], locationCounter, 2, symbolTable)];

                case "bit":
                case "C, bit":
                case "bit, C":
                    string bitStr = (operandPattern.StartsWith("bit")) ? operandStrings[0] : operandStrings[1];
                    return [(byte)ResolveSymbol(bitStr, symbolTable)];

                case "C, /bit":
                    string slashBitStr = operandStrings[1].StartsWith("/") ? operandStrings[1].Substring(1) : operandStrings[1];
                    return [(byte)ResolveSymbol(slashBitStr, symbolTable)];

                case "addr16":
                    int target = ResolveSymbol(operandStrings[0], symbolTable);
                    return [(byte)(target >> 8), (byte)(target & 0xFF)];

                case "DPTR, #data16":
                    int data16 = ConvertNumberToInt(operandStrings[1].Substring(1));
                    return [(byte)(data16 >> 8), (byte)(data16 & 0xFF)];

                case "direct, #data":
                    return [(byte)ResolveSymbol(operandStrings[0], symbolTable), (byte)ConvertNumberToInt(operandStrings[1].Substring(1))];

                case "direct, direct":
                    return [(byte)ResolveSymbol(operandStrings[1], symbolTable), (byte)ResolveSymbol(operandStrings[0], symbolTable)];

                case "A, #data, rel":
                case "R0, #data, rel":
                case "R1, #data, rel":
                case "R2, #data, rel":
                case "R3, #data, rel":
                case "R4, #data, rel":
                case "R5, #data, rel":
                case "R6, #data, rel":
                case "R7, #data, rel":
                case "@R0, #data, rel":
                case "@R1, #data, rel":
                    return [(byte)ConvertNumberToInt(operandStrings[1].Substring(1)), CalculateRel(operandStrings[2], locationCounter, 3, symbolTable)];

                case "A, direct, rel":
                    return [(byte)ResolveSymbol(operandStrings[1], symbolTable), CalculateRel(operandStrings[2], locationCounter, 3, symbolTable)];

                case "Rn, #data, rel":
                case "R0, rel":
                case "R1, rel":
                case "R2, rel":
                case "R3, rel":
                case "R4, rel":
                case "R5, rel":
                case "R6, rel":
                case "R7, rel":
                    return [CalculateRel(operandStrings[1], locationCounter, 2, symbolTable)];

                case "direct, rel":
                    return [(byte)ResolveSymbol(operandStrings[0], symbolTable), CalculateRel(operandStrings[1], locationCounter, 3, symbolTable)];

                case "bit, rel":
                    return [(byte)ResolveSymbol(operandStrings[0], symbolTable), CalculateRel(operandStrings[1], locationCounter, 3, symbolTable)];

                default:
                    throw new Exception($"Pass 2 Error: Unhandled operand pattern '{operandPattern}'");
            }
        }

        static string NormalizeOperand(string op, string mnemonic, bool isLastOperand)
        {
            string opUpper = op.ToUpper();

            switch (opUpper)
            {
                case "A":
                case "C":
                case "R0":
                case "R1":
                case "R2":
                case "R3":
                case "R4":
                case "R5":
                case "R6":
                case "R7":
                case "@R0":
                case "@R1":
                case "DPTR":
                case "@A+DPTR":
                case "@A+PC":
                    return opUpper;
            }

            if (op.StartsWith("#"))
            {
                return (mnemonic == "MOV" && opUpper.Contains("DPTR"))
                        ? "#data16"
                        : "#data";
            }

            if (op.StartsWith("/"))
            {
                return "/bit";
            }
            if (op.Contains("."))
            {
                return "bit";
            }
            bool isRelativeJump = mnemonic.StartsWith("J") ||
                                  mnemonic == "DJNZ" ||
                                  mnemonic == "CJNE" ||
                                  mnemonic == "SJMP";

            if (isRelativeJump && isLastOperand)
            {
                return "rel";
            }

            bool isAbsoluteJump = (mnemonic == "LCALL" || mnemonic == "LJMP");
            if (isAbsoluteJump)
            {
                return "addr16";
            }

            return "direct";
        }

        static InstructionMatch? FindInstructionInTable(string line, Dictionary<string, InstructionInfo> opcodeTable)
        {
            string trimmedLine = line.Trim();
            string[] parts = trimmedLine.Split([' ', '\t'], 2, StringSplitOptions.RemoveEmptyEntries);

            if (parts.Length == 0) return null;

            string mnemonic = parts[0].ToUpper();

            if (parts.Length == 1)
            {
                if (opcodeTable.TryGetValue(mnemonic, out var info))
                {
                    return new InstructionMatch { MatchedKey = mnemonic, Info = info, OperandStrings = new string[0] };
                }
                else
                {
                    return null;
                }
            }

            string[] operandStrings = parts[1].Trim().Split(',').Select(op => op.Trim()).Where(op => !string.IsNullOrEmpty(op)).ToArray();
            if (operandStrings.Length == 0) return null;

            List<string> normalizedOperands = new List<string>();
            for (int i = 0; i < operandStrings.Length; i++)
            {
                string op = operandStrings[i];
                bool isLastOperand = (i == operandStrings.Length - 1);
                normalizedOperands.Add(NormalizeOperand(op, mnemonic, isLastOperand));
            }

            string key = mnemonic + " " + string.Join(", ", normalizedOperands);
            if (DEBUG)
                Console.WriteLine($"[Debug] Line: '{line}', Key built: '{key}'");

            if (opcodeTable.TryGetValue(key, out var instructionInfo))
            {
                return new InstructionMatch
                {
                    MatchedKey = key,
                    Info = instructionInfo,
                    OperandStrings = operandStrings
                };
            }

            if (normalizedOperands.Contains("direct"))
            {
                List<string> fallbackOperands = new List<string>();
                foreach (string op in normalizedOperands)
                {
                    if (op == "direct")
                    {
                        fallbackOperands.Add("bit");
                    }
                    else
                    {
                        fallbackOperands.Add(op);
                    }
                }

                string fallbackKey = mnemonic + " " + string.Join(", ", fallbackOperands);

                if (DEBUG)
                    Console.WriteLine($"[Debug] Key '{key}' failed. Trying fallback: '{fallbackKey}'");

                if (opcodeTable.TryGetValue(fallbackKey, out var fallbackInfo))
                {
                    return new InstructionMatch
                    {
                        MatchedKey = fallbackKey,
                        Info = fallbackInfo,
                        OperandStrings = operandStrings
                    };
                }
            }

            throw new Exception($"ERROR: Key '{key}' (and fallbacks) not found in OpcodeTable.");
        }

        static int ResolveSymbol(string s, Dictionary<string, int> symbolTable)
        {
            string sUpper = s.ToUpper();

            if (symbolTable.TryGetValue(sUpper, out int address))
            {
                return address;
            }

            try
            {
                return ConvertNumberToInt(s);
            }
            catch (FormatException)
            {
                throw new Exception($"Error: Undefined symbol or invalid number '{s}'");
            }
        }

        static byte CalculateRel(string label, int locationCounter, int instructionBytes, Dictionary<string, int> symbolTable)
        {
            int targetAddress;
            if (label == "$")
            {
                targetAddress = locationCounter;
            }
            else
            {
                if (!symbolTable.TryGetValue(label.ToUpper(), out targetAddress))
                {
                    throw new Exception($"Error: Undefined label '{label}'");
                }
            }

            int nextAddress = locationCounter + instructionBytes;
            int offset = targetAddress - nextAddress;

            if (offset < -128 || offset > 127)
            {
                throw new Exception($"Error: Relative jump target '{label}' at 0x{targetAddress:X4} " +
                                    $"is out of range from 0x{locationCounter:X4}. " +
                                    $"Offset is {offset}.");
            }

            return (byte)offset;
        }

        static string CleanLine(string line)
        {
            line = line.Replace('\t', ' ');

            int commentIndex = line.IndexOf(';');
            if (commentIndex != -1)
            {
                line = line.Substring(0, commentIndex);
            }

            return line.Trim();
        }

        static string? IsLabel(string line)
        {
            var splitted = line.Split(':', '\t');
            if (splitted.Length > 1)
            {
                return splitted[0].Trim();
            }

            return null;
        }

        static int ConvertNumberToInt(string number)
        {
            string cleanNumber = number.Trim();

            if (string.IsNullOrEmpty(cleanNumber))
            {
                throw new FormatException("Syntax Error: Missing number or value.");
            }

            if (cleanNumber.StartsWith("'") && cleanNumber.EndsWith("'") && cleanNumber.Length == 3)
            {
                char c = cleanNumber[1];
                return (int)c;
            }

            if (cleanNumber.EndsWith('H') || cleanNumber.EndsWith('h'))
            {
                return Convert.ToInt32(cleanNumber.Substring(0, cleanNumber.Length - 1), 16);
            }
            else if (cleanNumber.EndsWith('B') || cleanNumber.EndsWith('b'))
            {
                return Convert.ToInt32(cleanNumber.Substring(0, cleanNumber.Length - 1), 2);
            }
            else
            {
                return Convert.ToInt32(cleanNumber, 10);
            }
        }

        static byte[] CalculatePagedJump(InstructionInfo info, string label, int locationCounter, Dictionary<string, int> symbolTable)
        {
            if (!symbolTable.TryGetValue(label.ToUpper(), out int targetAddress))
            {
                throw new Exception($"Error: Undefined label '{label}'");
            }

            int nextAddress = locationCounter + info.Bytes;
            if ((targetAddress & 0xF800) != (nextAddress & 0xF800))
            {
                string mnemonic = (info.Opcode == 0x11) ? "ACALL" : "AJMP";
                throw new Exception($"Error: {mnemonic} target '{label}' at 0x{targetAddress:X4} " +
                                    $"is out of 2K range from 0x{locationCounter:X4}.");
            }

            int pageBits = (targetAddress >> 8) & 0x07;
            byte finalOpcode = (byte)((pageBits << 5) | info.Opcode);
            byte finalOperand = (byte)(targetAddress & 0xFF);
            return [finalOpcode, finalOperand];
        }
    }
}

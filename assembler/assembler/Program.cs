namespace assembler
{
    // TODO: 

    // SETB RS0 i RS1

    //Symbol		Nazwa (opis)			Adres
    //=====================================================
    //WRITE_TEXT	wypisanie tekstu na LCD		8100H
    //WRITE_DATA	wypisanie znaku na LCD		8102H
    //WRITE_HEX	wypisanie liczby hex na LCD	8104H
    //WRITE_INSTR	wysłanie rozkazu do LCD		8106H
    //LCD_INIT	inicjalizacja LCD		8108H
    //LCD_OFF		wygaszenie LCD			810AH
    //LCD_CLR		ustawienie w stan początkowy	810CH
    //DELAY_US	opóźnienie (2*A+6)*12/11.059 us	810EH
    //DELAY_MS	opóźnienie A ms			8110H
    //DELAY_100MS	opóźnienie A * 100ms		8112H
    //WAIT_ENTER	"PRESS ENTER." i czeka na ENTER	8114H
    //WAIT_ENTER_NW	czekanie na klawisz ENTER	8116H
    //TEST_ENTER	sprawdzenie klawisza ENTER	8118H
    //WAIT_ENT_ESC	czekanie na ENTER lub ESC	811AH
    //WAIT_KEY	czekanie na dowolny klawisz	811CH
    //GET_NUM		wczytanie liczby BCD (4 cyfry)	811EH
    //BCD_HEX		zamiana BCD na HEX		8120H
    //HEX_BCD		zamiana HEX na BCD		8122H
    //MUL_2_2		mnożenie liczb 2 bajtowych	8124H
    //MUL_3_1		mnożenie 3bajty * 1bajt		8126H
    //DIV_2_1		dzielenie 2bajty / 1bajt	8128H
    //DIV_4_2		dzielenie 4bajty / 2bajty	812AH

    internal class Program
    {
        static void Main(string[] args)
        {
            string assemblyFilePath = @"../../../test.asm";
            string outputFilePath = @"../../../output.bin";

            int locationCounter = 0;
            var symbolTable = new Dictionary<string, int>();
            var opcodeTable = new OpcodeTable().Table;
            PrepopulateSymbols(symbolTable);

            var outputBytes = new List<byte>();

            string[] lines = File.ReadAllLines(assemblyFilePath);

            // First Pass
            foreach (string rawLine in lines)
            {
                // Cleaing
                string line = CleanLine(rawLine);
                if (string.IsNullOrEmpty(line))
                {
                    continue;
                }

                string[] parts = line.Trim().Split([' ', '\t'], StringSplitOptions.RemoveEmptyEntries);
                string mnemonic = parts[0].ToUpper();

                // Handle Labels
                string? label = IsLabel(line);
                if (label != null)
                {
                    if (symbolTable.ContainsKey(label))
                    {
                        Console.WriteLine($"Error: Duplicate label '{label}'");
                        return;
                    }
                    else
                    {
                        symbolTable[label] = locationCounter;
                    }
                    line = line.Substring(label.Length + 1).Trim();
                    if (string.IsNullOrEmpty(line))
                    {
                        continue;
                    }
                }

                // Handle ORG
                if (mnemonic == "ORG" || mnemonic == ".ORG")
                {
                    int newAddress = ConvertNumberToInt(parts[1]);
                    locationCounter = newAddress;
                    continue;
                }

                // Handle EQU
                if (mnemonic == "EQU")
                {
                    int value = ConvertNumberToInt(line.Split(' ')[2]);
                    symbolTable[line.Split(' ')[0]] = value;
                    continue;
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
                    Console.WriteLine($"Error: Unknown instruction in line '{line}'");
                    return;
                }
            }

            locationCounter = 0;

            // Second Pass
            foreach (string rawLine in lines)
            {
                // Cleaing
                string line = CleanLine(rawLine);
                if (string.IsNullOrEmpty(line))
                {
                    continue;
                }

                string[] parts = line.Trim().Split([' ', '\t'], StringSplitOptions.RemoveEmptyEntries);
                string mnemonic = parts[0].ToUpper();

                // Handle Labels
                string? label = IsLabel(line);
                if (label != null)
                {
                    line = line.Substring(label.Length + 1).Trim();
                    if (string.IsNullOrEmpty(line))
                    {
                        continue;
                    }
                }

                // Handle ORG
                if (mnemonic == "ORG" || mnemonic == ".ORG")
                {
                    int newAddress = ConvertNumberToInt(parts[1]);
                    locationCounter = newAddress;
                    continue;
                }

                // Handle EQU
                if (mnemonic == "EQU")
                {
                    continue;
                }

                // Handles the same later for DW Ds etc
                //TODO

                // Handle Instructions
                InstructionMatch? match = FindInstructionInTable(line, opcodeTable);

                if (match == null)
                {
                    continue;
                }

                Console.WriteLine($"[Debug P2] Line: '{line}'");
                Console.WriteLine($"           > Found key: '{match.MatchedKey}'");
                Console.WriteLine($"           > Bytes from table: {match.Info.Bytes}");
                Console.WriteLine($"           > LC before: 0x{locationCounter:X4}");

                string[] operandStrings = match.OperandStrings;

                byte[] operandBytes = ResolveOperands(match.MatchedKey, operandStrings, locationCounter, symbolTable);

                outputBytes.Add(match.Info.Opcode);
                outputBytes.AddRange(operandBytes);

                locationCounter += match.Info.Bytes;
                Console.WriteLine($"           > LC after: 0x{locationCounter:X4}");
            }

            Console.WriteLine("Assembly completed successfully.");

            WriteDebugTextFile(outputFilePath, outputBytes);
        }

        static string CleanLine(string line)
        {
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
                throw new FormatException("Syntax Error: Missing number after '#'.");
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

        static InstructionMatch? FindInstructionInTable(string line, Dictionary<string, InstructionInfo> opcodeTable)
        {
            string trimmedLine = line.Trim();
            string[] parts = trimmedLine.Split(new[] { ' ', '\t' }, 2, StringSplitOptions.RemoveEmptyEntries);

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

            string[] operandStrings = parts[1].Trim()
                                              .Split(',')
                                              .Select(op => op.Trim())
                                              .Where(op => !string.IsNullOrEmpty(op))
                                              .ToArray();
            if (operandStrings.Length == 0) return null;

            List<string> normalizedOperands = new List<string>();
            for (int i = 0; i < operandStrings.Length; i++)
            {
                string op = operandStrings[i];
                bool isLastOperand = (i == operandStrings.Length - 1);
                normalizedOperands.Add(NormalizeOperand(op, mnemonic, isLastOperand));
            }

            string key = mnemonic + " " + string.Join(", ", normalizedOperands);
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

            Console.WriteLine($"[Debug] ERROR: Key '{key}' not found in OpcodeTable.");
            return null;
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

        static void PrepopulateSymbols(Dictionary<string, int> table)
        {
            table.Add("P0", 0x80);
            table.Add("SP", 0x81);
            table.Add("DPL", 0x82);
            table.Add("DPH", 0x83);
            table.Add("PCON", 0x87);
            table.Add("TCON", 0x88);
            table.Add("TMOD", 0x89);
            table.Add("TL0", 0x8A);
            table.Add("TL1", 0x8B);
            table.Add("TH0", 0x8C);
            table.Add("TH1", 0x8D);
            table.Add("P1", 0x90);
            table.Add("SCON", 0x98);
            table.Add("SBUF", 0x99);
            table.Add("P2", 0xA0);
            table.Add("IE", 0xA8);
            table.Add("P3", 0xB0);
            table.Add("IP", 0xB8);
            table.Add("PSW", 0xD0);
            table.Add("ACC", 0xE0);
            table.Add("B", 0xF0);

            table.Add("TF1", 0x8F);
            table.Add("TR1", 0x8E);
            table.Add("TF0", 0x8D);
            table.Add("TR0", 0x8C);
            table.Add("IE1", 0x8B);
            table.Add("IT1", 0x8A);
            table.Add("IE0", 0x89);
            table.Add("IT0", 0x88);

            table.Add("SM0", 0x9F);
            table.Add("SM1", 0x9E);
            table.Add("SM2", 0x9D);
            table.Add("REN", 0x9C);
            table.Add("TB8", 0x9B);
            table.Add("RB8", 0x9A);
            table.Add("TI", 0x99);
            table.Add("RI", 0x98);

            table.Add("EA", 0xAF);
            table.Add("ET2", 0xAD);
            table.Add("ES", 0xAC);
            table.Add("ET1", 0xAB);
            table.Add("EX1", 0xAA);
            table.Add("ET0", 0xA9);
            table.Add("EX0", 0xA8);


            table.Add("PT2", 0xBD);
            table.Add("PS", 0xBC);
            table.Add("PT1", 0xBB);
            table.Add("PX1", 0xBA);
            table.Add("PT0", 0xB9);
            table.Add("PX0", 0xB8);

            table.Add("RD", 0xB7);
            table.Add("WR", 0xB6);
            table.Add("T1", 0xB5);
            table.Add("T0", 0xB4);
            table.Add("INT1", 0xB3);
            table.Add("INT0", 0xB2);
            table.Add("TXD", 0xB1);
            table.Add("RXD", 0xB0);

            table.Add("CY", 0xD7);
            table.Add("AC", 0xD6);
            table.Add("F0", 0xD5);
            table.Add("RS1", 0xD4);
            table.Add("RS0", 0xD3);
            table.Add("OV", 0xD2);
            table.Add("P", 0xD0);

            int[] bitSfrBaseAddrs = { 0x80, 0x88, 0x90, 0x98, 0xA0, 0xA8, 0xB0, 0xB8, 0xD0, 0xE0, 0xF0 };
            string[] sfrNames = { "P0", "TCON", "P1", "SCON", "P2", "IE", "P3", "IP", "PSW", "ACC", "B" };

            for (int i = 0; i < sfrNames.Length; i++)
            {
                for (int bit = 0; bit < 8; bit++)
                {
                    string bitName = $"{sfrNames[i]}.{bit}";
                    int bitAddress = bitSfrBaseAddrs[i] + bit;
                    table.TryAdd(bitName, bitAddress);
                }
            }
        }

        static byte[] ResolveOperands(string matchedKey, string[] operandStrings, int locationCounter, Dictionary<string, int> symbolTable)
        {
            string operandPattern = "";
            int spaceIndex = matchedKey.IndexOf(' ');
            if (spaceIndex != -1)
            {
                operandPattern = matchedKey.Substring(spaceIndex + 1);
            }

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

        static void WriteDebugTextFile(string filePath, List<byte> bytes)
        {
            var hexStrings = bytes.Select(b => b.ToString("X2"));

            string fileContent = string.Join(" ", hexStrings);

            try
            {
                File.WriteAllText(filePath, fileContent);
                Console.WriteLine($"Successfully wrote debug file to: {filePath}");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error writing debug file: {ex.Message}");
            }
        }
    }
}
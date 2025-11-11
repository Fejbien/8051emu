namespace assembler
{
    internal class OpcodeTable
    {
        public Dictionary<string, InstructionInfo> Table { get; private set; }
        public OpcodeTable()
        {
            Table = new Dictionary<string, InstructionInfo>
            {
                // 8051 Instruction Set
                // Based on https://aeb.win.tue.nl/comp/8051/set8051.html

                // ACALL * 0x11, 0x31, 0x51, 0x71, 0x91, 0xB1, 0xD1, 0xF1
                { "ACALL", new InstructionInfo(0x11, 2) },

                // ADD
                { "ADD A, #data", new InstructionInfo(0x24, 2) },
                { "ADD A, direct", new InstructionInfo(0x25, 2) },
                { "ADD A, @R0", new InstructionInfo(0x26, 1) },
                { "ADD A, @R1", new InstructionInfo(0x27, 1) },
                { "ADD A, R0", new InstructionInfo(0x28, 1) },
                { "ADD A, R1", new InstructionInfo(0x29, 1) },
                { "ADD A, R2", new InstructionInfo(0x2A, 1) },
                { "ADD A, R3", new InstructionInfo(0x2B, 1) },
                { "ADD A, R4", new InstructionInfo(0x2C, 1) },
                { "ADD A, R5", new InstructionInfo(0x2D, 1) },
                { "ADD A, R6", new InstructionInfo(0x2E, 1) },
                { "ADD A, R7", new InstructionInfo(0x2F, 1) },

                // ADDC
                { "ADDC A, #data", new InstructionInfo(0x34, 2) },
                { "ADDC A, direct", new InstructionInfo(0x35, 2) },
                { "ADDC A, @R0", new InstructionInfo(0x36, 1) },
                { "ADDC A, @R1", new InstructionInfo(0x37, 1) },
                { "ADDC A, R0", new InstructionInfo(0x38, 1) },
                { "ADDC A, R1", new InstructionInfo(0x39, 1) },
                { "ADDC A, R2", new InstructionInfo(0x3A, 1) },
                { "ADDC A, R3", new InstructionInfo(0x3B, 1) },
                { "ADDC A, R4", new InstructionInfo(0x3C, 1) },
                { "ADDC A, R5", new InstructionInfo(0x3D, 1) },
                { "ADDC A, R6", new InstructionInfo(0x3E, 1) },
                { "ADDC A, R7", new InstructionInfo(0x3F, 1) },

                // AJMP * 0x01, 0x21, 0x41, 0x61, 0x81, 0xA1, 0xC1, 0xE1
                { "AJMP", new InstructionInfo(0x01, 2) },

                // ANL
                { "ANL direct, A", new InstructionInfo(0x52, 2) },
                { "ANL direct, #data", new InstructionInfo(0x53, 3) },
                { "ANL A, #data", new InstructionInfo(0x54, 2) },
                { "ANL A, direct", new InstructionInfo(0x55, 2) },
                { "ANL A, @R0", new InstructionInfo(0x56, 1) },
                { "ANL A, @R1", new InstructionInfo(0x57, 1) },
                { "ANL A, R0", new InstructionInfo(0x58, 1) },
                { "ANL A, R1", new InstructionInfo(0x59, 1) },
                { "ANL A, R2", new InstructionInfo(0x5A, 1) },
                { "ANL A, R3", new InstructionInfo(0x5B, 1) },
                { "ANL A, R4", new InstructionInfo(0x5C, 1) },
                { "ANL A, R5", new InstructionInfo(0x5D, 1) },
                { "ANL A, R6", new InstructionInfo(0x5E, 1) },
                { "ANL A, R7", new InstructionInfo(0x5F, 1) },
                { "ANL C, bit", new InstructionInfo(0x82, 2) },
                { "ANL C, /bit", new InstructionInfo(0xB0, 2) },

                // CJNE
                { "CJNE A, #data, rel", new InstructionInfo(0xB4, 3) },
                { "CJNE A, direct, rel", new InstructionInfo(0xB5, 3) },
                { "CJNE @R0, #data, rel", new InstructionInfo(0xB6, 3) },
                { "CJNE @R1, #data, rel", new InstructionInfo(0xB7, 3) },
                { "CJNE R0, #data, rel", new InstructionInfo(0xB8, 3) },
                { "CJNE R1, #data, rel", new InstructionInfo(0xB9, 3) },
                { "CJNE R2, #data, rel", new InstructionInfo(0xBA, 3) },
                { "CJNE R3, #data, rel", new InstructionInfo(0xBB, 3) },
                { "CJNE R4, #data, rel", new InstructionInfo(0xBC, 3) },
                { "CJNE R5, #data, rel", new InstructionInfo(0xBD, 3) },
                { "CJNE R6, #data, rel", new InstructionInfo(0xBE, 3) },
                { "CJNE R7, #data, rel", new InstructionInfo(0xBF, 3) },

                // CLR
                { "CLR bit", new InstructionInfo(0xC2, 2) },
                { "CLR C", new InstructionInfo(0xC3, 1) },
                { "CLR A", new InstructionInfo(0xE4, 1) },

                // CPL
                { "CPL A", new InstructionInfo(0xF4, 1) },
                { "CPL C", new InstructionInfo(0xB3, 1) },
                { "CPL bit", new InstructionInfo(0xB2, 2) },

                // DA
                { "DA A", new InstructionInfo(0xD4, 1) },

                // DEC
                { "DEC A", new InstructionInfo(0x14, 1) },
                { "DEC direct", new InstructionInfo(0x15, 2) },
                { "DEC @R0", new InstructionInfo(0x16, 1) },
                { "DEC @R1", new InstructionInfo(0x17, 1) },
                { "DEC R0", new InstructionInfo(0x18, 1) },
                { "DEC R1", new InstructionInfo(0x19, 1) },
                { "DEC R2", new InstructionInfo(0x1A, 1) },
                { "DEC R3", new InstructionInfo(0x1B, 1) },
                { "DEC R4", new InstructionInfo(0x1C, 1) },
                { "DEC R5", new InstructionInfo(0x1D, 1) },
                { "DEC R6", new InstructionInfo(0x1E, 1) },
                { "DEC R7", new InstructionInfo(0x1F, 1) },

                // DIV
                { "DIV AB", new InstructionInfo(0x84, 1) },

                // DJNZ
                { "DJNZ direct, rel", new InstructionInfo(0xD5, 3) },
                { "DJNZ R0, rel", new InstructionInfo(0xD8, 2) },
                { "DJNZ R1, rel", new InstructionInfo(0xD9, 2) },
                { "DJNZ R2, rel", new InstructionInfo(0xDA, 2) },
                { "DJNZ R3, rel", new InstructionInfo(0xDB, 2) },
                { "DJNZ R4, rel", new InstructionInfo(0xDC, 2) },
                { "DJNZ R5, rel", new InstructionInfo(0xDD, 2) },
                { "DJNZ R6, rel", new InstructionInfo(0xDE, 2) },
                { "DJNZ R7, rel", new InstructionInfo(0xDF, 2) },

                // INC
                { "INC A", new InstructionInfo(0x04, 1) },
                { "INC direct", new InstructionInfo(0x05, 2) },
                { "INC @R0", new InstructionInfo(0x06, 1) },
                { "INC @R1", new InstructionInfo(0x07, 1) },
                { "INC R0", new InstructionInfo(0x08, 1) },
                { "INC R1", new InstructionInfo(0x09, 1) },
                { "INC R2", new InstructionInfo(0x0A, 1) },
                { "INC R3", new InstructionInfo(0x0B, 1) },
                { "INC R4", new InstructionInfo(0x0C, 1) },
                { "INC R5", new InstructionInfo(0x0D, 1) },
                { "INC R6", new InstructionInfo(0x0E, 1) },
                { "INC R7", new InstructionInfo(0x0F, 1) },
                { "INC DPTR", new InstructionInfo(0xA3, 1) },

                // JB
                { "JB bit, rel", new InstructionInfo(0x20, 3) },

                // JBC
                { "JBC bit, rel", new InstructionInfo(0x10, 3) },

                // JC
                { "JC rel", new InstructionInfo(0x40, 2) },

                // JMP
                { "JMP @A+DPTR", new InstructionInfo(0x73, 1) },

                // JNB
                { "JNB bit, rel", new InstructionInfo(0x30, 3) },

                // JNC
                { "JNC rel", new InstructionInfo(0x50, 2) },

                // JNZ
                { "JNZ rel", new InstructionInfo(0x70, 2) },

                // JZ
                { "JZ rel", new InstructionInfo(0x60, 2) },

                // LCALL
                { "LCALL addr16", new InstructionInfo(0x12, 3) },

                // LJMP
                { "LJMP addr16", new InstructionInfo(0x02, 3) },

                // MOV
                /*
                 * https://aeb.win.tue.nl/comp/8051/set8051.html#51mov
                 ** Note: In the case of "MOV iram addr,iram addr", the operand bytes of the instruction are stored in reverse order. That is, the instruction consisting of the bytes 0x85, 0x20, 0x50 means "Move the contents of Internal RAM location 0x20 to Internal RAM location 0x50" whereas the opposite would be generally presumed.
                 */
                { "MOV @R0, #data", new InstructionInfo(0x76, 2) },
                { "MOV @R1, #data", new InstructionInfo(0x77, 2) },
                { "MOV @R0, A", new InstructionInfo(0xF6, 1) },
                { "MOV @R1, A", new InstructionInfo(0xF7, 1) },
                { "MOV @R0, direct", new InstructionInfo(0xA6, 2) },
                { "MOV @R1, direct", new InstructionInfo(0xA7, 2) },
                { "MOV A, #data", new InstructionInfo(0x74, 2) },
                { "MOV A, @R0", new InstructionInfo(0xE6, 1) },
                { "MOV A, @R1", new InstructionInfo(0xE7, 1) },
                { "MOV A, R0", new InstructionInfo(0xE8, 1) },
                { "MOV A, R1", new InstructionInfo(0xE9, 1) },
                { "MOV A, R2", new InstructionInfo(0xEA, 1) },
                { "MOV A, R3", new InstructionInfo(0xEB, 1) },
                { "MOV A, R4", new InstructionInfo(0xEC, 1) },
                { "MOV A, R5", new InstructionInfo(0xED, 1) },
                { "MOV A, R6", new InstructionInfo(0xEE, 1) },
                { "MOV A, R7", new InstructionInfo(0xEF, 1) },
                { "MOV A, direct", new InstructionInfo(0xE5, 2) },
                { "MOV C, bit", new InstructionInfo(0xA2, 2) },
                { "MOV DPTR, #data16", new InstructionInfo(0x90, 3) },
                { "MOV R0, #data", new InstructionInfo(0x78, 2) },
                { "MOV R1, #data", new InstructionInfo(0x79, 2) },
                { "MOV R2, #data", new InstructionInfo(0x7A, 2) },
                { "MOV R3, #data", new InstructionInfo(0x7B, 2) },
                { "MOV R4, #data", new InstructionInfo(0x7C, 2) },
                { "MOV R5, #data", new InstructionInfo(0x7D, 2) },
                { "MOV R6, #data", new InstructionInfo(0x7E, 2) },
                { "MOV R7, #data", new InstructionInfo(0x7F, 2) },
                { "MOV R0, A", new InstructionInfo(0xF8, 1) },
                { "MOV R1, A", new InstructionInfo(0xF9, 1) },
                { "MOV R2, A", new InstructionInfo(0xFA, 1) },
                { "MOV R3, A", new InstructionInfo(0xFB, 1) },
                { "MOV R4, A", new InstructionInfo(0xFC, 1) },
                { "MOV R5, A", new InstructionInfo(0xFD, 1) },
                { "MOV R6, A", new InstructionInfo(0xFE, 1) },
                { "MOV R7, A", new InstructionInfo(0xFF, 1) },
                { "MOV R0, direct", new InstructionInfo(0xA8, 2) },
                { "MOV R1, direct", new InstructionInfo(0xA9, 2) },
                { "MOV R2, direct", new InstructionInfo(0xAA, 2) },
                { "MOV R3, direct", new InstructionInfo(0xAB, 2) },
                { "MOV R4, direct", new InstructionInfo(0xAC, 2) },
                { "MOV R5, direct", new InstructionInfo(0xAD, 2) },
                { "MOV R6, direct", new InstructionInfo(0xAE, 2) },
                { "MOV R7, direct", new InstructionInfo(0xAF, 2) },
                { "MOV bit, C", new InstructionInfo(0x92, 2) },
                { "MOV direct, #data", new InstructionInfo(0x75, 3) },
                { "MOV direct, @R0", new InstructionInfo(0x86, 2) },
                { "MOV direct, @R1", new InstructionInfo(0x87, 2) },
                { "MOV direct, R0", new InstructionInfo(0x88, 2) },
                { "MOV direct, R1", new InstructionInfo(0x89, 2) },
                { "MOV direct, R2", new InstructionInfo(0x8A, 2) },
                { "MOV direct, R3", new InstructionInfo(0x8B, 2) },
                { "MOV direct, R4", new InstructionInfo(0x8C, 2) },
                { "MOV direct, R5", new InstructionInfo(0x8D, 2) },
                { "MOV direct, R6", new InstructionInfo(0x8E, 2) },
                { "MOV direct, R7", new InstructionInfo(0x8F, 2) },
                { "MOV direct, A", new InstructionInfo(0xF5, 2) },
                { "MOV direct, direct", new InstructionInfo(0x85, 3) },

                // MOVC
                { "MOVC A, @A+DPTR", new InstructionInfo(0x93, 1) },
                { "MOVC A, @A+PC", new InstructionInfo(0x83, 1) },

                // MOVX
                { "MOVX @DPTR, A", new InstructionInfo(0xF0, 1) },
                { "MOVX @R0, A", new InstructionInfo(0xF2, 1) },
                { "MOVX @R1, A", new InstructionInfo(0xF3, 1) },
                { "MOVX A, @DPTR", new InstructionInfo(0xE0, 1) },
                { "MOVX A, @R0", new InstructionInfo(0xE2, 1) },
                { "MOVX A, @R1", new InstructionInfo(0xE3, 1) },

                // MUL
                { "MUL AB", new InstructionInfo(0xA4, 1) },

                // NOP
                { "NOP", new InstructionInfo(0x00, 1) },

                // ORL
                { "ORL direct, A", new InstructionInfo(0x42, 2) },
                { "ORL direct, #data", new InstructionInfo(0x43, 3) },
                { "ORL A, #data", new InstructionInfo(0x44, 2) },
                { "ORL A, direct", new InstructionInfo(0x45, 2) },
                { "ORL A, @R0", new InstructionInfo(0x46, 1) },
                { "ORL A, @R1", new InstructionInfo(0x47, 1) },
                { "ORL A, R0", new InstructionInfo(0x48, 1) },
                { "ORL A, R1", new InstructionInfo(0x49, 1) },
                { "ORL A, R2", new InstructionInfo(0x4A, 1) },
                { "ORL A, R3", new InstructionInfo(0x4B, 1) },
                { "ORL A, R4", new InstructionInfo(0x4C, 1) },
                { "ORL A, R5", new InstructionInfo(0x4D, 1) },
                { "ORL A, R6", new InstructionInfo(0x4E, 1) },
                { "ORL A, R7", new InstructionInfo(0x4F, 1) },
                { "ORL C, bit", new InstructionInfo(0x72, 2) },
                { "ORL C, /bit", new InstructionInfo(0xA0, 2) },

                // POP
                { "POP direct", new InstructionInfo(0xD0, 2) },

                // PUSH
                { "PUSH direct", new InstructionInfo(0xC0, 2) },

                // RET
                { "RET", new InstructionInfo(0x22, 1) },

                // RETI
                { "RETI", new InstructionInfo(0x32, 1) },

                // RL
                { "RL A", new InstructionInfo(0x23, 1) },

                // RLC
                { "RLC A", new InstructionInfo(0x33, 1) },

                // RR
                { "RR A", new InstructionInfo(0x03, 1) },

                // RRC
                { "RRC A", new InstructionInfo(0x13, 1) },

                // SETB
                { "SETB C", new InstructionInfo(0xD3, 1) },
                { "SETB bit", new InstructionInfo(0xD2, 2) },

                // SJMP
                { "SJMP rel", new InstructionInfo(0x80, 2) },

                // SUBB
                { "SUBB A, #data", new InstructionInfo(0x94, 2) },
                { "SUBB A, direct", new InstructionInfo(0x95, 2) },
                { "SUBB A, @R0", new InstructionInfo(0x96, 1) },
                { "SUBB A, @R1", new InstructionInfo(0x97, 1) },
                { "SUBB A, R0", new InstructionInfo(0x98, 1) },
                { "SUBB A, R1", new InstructionInfo(0x99, 1) },
                { "SUBB A, R2", new InstructionInfo(0x9A, 1) },
                { "SUBB A, R3", new InstructionInfo(0x9B, 1) },
                { "SUBB A, R4", new InstructionInfo(0x9C, 1) },
                { "SUBB A, R5", new InstructionInfo(0x9D, 1) },
                { "SUBB A, R6", new InstructionInfo(0x9E, 1) },
                { "SUBB A, R7", new InstructionInfo(0x9F, 1) },

                // SWAP
                { "SWAP A", new InstructionInfo(0xC4, 1) },

                // Undefined Instruction
                // "The 8051 supports 255 instructions and OpCode 0xA5 is the single OpCode that is not used by any documented function"
                // So for the sake of completeness id add it here
                { "???", new InstructionInfo(0xA5, 1) },

                // XCH
                { "XCH A, @R0", new InstructionInfo(0xC6, 1) },
                { "XCH A, @R1", new InstructionInfo(0xC7, 1) },
                { "XCH A, R0", new InstructionInfo(0xC8, 1) },
                { "XCH A, R1", new InstructionInfo(0xC9, 1) },
                { "XCH A, R2", new InstructionInfo(0xCA, 1) },
                { "XCH A, R3", new InstructionInfo(0xCB, 1) },
                { "XCH A, R4", new InstructionInfo(0xCC, 1) },
                { "XCH A, R5", new InstructionInfo(0xCD, 1) },
                { "XCH A, R6", new InstructionInfo(0xCE, 1) },
                { "XCH A, R7", new InstructionInfo(0xCF, 1) },
                { "XCH A, direct", new InstructionInfo(0xC5, 2) },

                // XCHD
                { "XCHD A, @R0", new InstructionInfo(0xD6, 1) },
                { "XCHD A, @R1", new InstructionInfo(0xD7, 1) },

                // XRL
                { "XRL direct, A", new InstructionInfo(0x62, 2) },
                { "XRL direct, #data", new InstructionInfo(0x63, 3) },
                { "XRL A, #data", new InstructionInfo(0x64, 2) },
                { "XRL A, direct", new InstructionInfo(0x65, 2) },
                { "XRL A, @R0", new InstructionInfo(0x66, 1) },
                { "XRL A, @R1", new InstructionInfo(0x67, 1) },
                { "XRL A, R0", new InstructionInfo(0x68, 1) },
                { "XRL A, R1", new InstructionInfo(0x69, 1) },
                { "XRL A, R2", new InstructionInfo(0x6A, 1) },
                { "XRL A, R3", new InstructionInfo(0x6B, 1) },
                { "XRL A, R4", new InstructionInfo(0x6C, 1) },
                { "XRL A, R5", new InstructionInfo(0x6D, 1) },
                { "XRL A, R6", new InstructionInfo(0x6E, 1) },
                { "XRL A, R7", new InstructionInfo(0x6F, 1) },
            };
        }
    }
}

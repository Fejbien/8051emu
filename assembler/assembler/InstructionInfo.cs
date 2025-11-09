namespace assembler
{
    internal class InstructionInfo(byte opcode, int bytes)
    {
        public byte Opcode { get; set; } = opcode;

        public int Bytes { get; set; } = bytes;
    }
}


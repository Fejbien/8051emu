namespace assembler
{
    internal class InstructionMatch
    {
        public string MatchedKey { get; set; }
        public InstructionInfo Info { get; set; }
        public string[] OperandStrings { get; set; }
    }
}

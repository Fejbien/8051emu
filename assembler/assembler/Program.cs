namespace assembler
{
    internal class Program
    {
        static void Main(string[] args)
        {
            string assemblyFilePath = @"../../../test.asm";
            string outputDebugFilePath = @"../../../output.bin";
            string outputIntelHexFilePath = @"../../../output.hex";

            var outputBytes = new List<byte>();
            string[] lines = File.ReadAllLines(assemblyFilePath);

            List<string> intelHexLines = Assembler.HandleAssembly(lines, outputBytes);

            // output for debug hex
            File.WriteAllBytes(outputDebugFilePath, outputBytes.ToArray());

            File.WriteAllLines(outputIntelHexFilePath, intelHexLines);
        }
    }
}
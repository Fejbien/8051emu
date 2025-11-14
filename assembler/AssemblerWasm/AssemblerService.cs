using System.Text.Json;
using assembler;

namespace AssemblerWasm
{
    public class AssemblerService
    {
        public AssembleResult Assemble(string asmCode)
        {
            try
            {
                var outputBytes = new List<byte>();
                string[] lines = asmCode.Split('\n');

                List<string> intelHexLines = Assembler.HandleAssembly(lines, outputBytes);

                return new AssembleResult
                {
                    Success = true,
                    HexBytes = string.Join("", outputBytes.Select(b => b.ToString("X2"))),
                    IntelHex = string.Join("\n", intelHexLines),
                    BinaryData = outputBytes.ToArray(),
                    ByteCount = outputBytes.Count
                };
            }
            catch (Exception ex)
            {
                return new AssembleResult
                {
                    Success = false,
                    Error = ex.Message
                };
            }
        }
    }

    public class AssembleResult
    {
        public bool Success { get; set; }
        public string? HexBytes { get; set; }
        public string? IntelHex { get; set; }
        public byte[]? BinaryData { get; set; }
        public int ByteCount { get; set; }
        public string? Error { get; set; }
    }
}

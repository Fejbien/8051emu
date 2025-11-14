using Microsoft.JSInterop;
using System.Text.Json;
using System.Diagnostics.CodeAnalysis;

namespace AssemblerWasm
{
    public class AssemblerInterop
    {
        private static AssemblerService? _assemblerService;
        private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };

        [JSInvokable("Initialize")]
        [UnconditionalSuppressMessage("Trimming", "IL2026", Justification = "Types are preserved")]
        [UnconditionalSuppressMessage("AOT", "IL3050", Justification = "JSON serialization is for simple types")]
        public static string Initialize()
        {
            _assemblerService = new AssemblerService();
            return "{\"success\":true,\"message\":\"Assembler initialized\"}";
        }

        [JSInvokable("AssembleCode")]
        [UnconditionalSuppressMessage("Trimming", "IL2026", Justification = "Types are preserved")]
        [UnconditionalSuppressMessage("AOT", "IL3050", Justification = "JSON serialization is for simple types")]
        public static string AssembleCode(string asmCode)
        {
            try
            {
                if (_assemblerService == null)
                {
                    _assemblerService = new AssemblerService();
                }

                var result = _assemblerService.Assemble(asmCode);
                return JsonSerializer.Serialize(result, JsonOptions);
            }
            catch (Exception ex)
            {
                return $"{{\"success\":false,\"error\":\"{ex.Message.Replace("\"", "\\\"")}\",\"stackTrace\":\"{ex.StackTrace?.Replace("\"", "\\\"")}\"}}";
            }
        }
    }
}

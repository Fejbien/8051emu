using Microsoft.JSInterop;

namespace AssemblerWasm
{
    public class Startup
    {
        public static void RegisterInterop()
        {
            Console.WriteLine("AssemblerWasm assembly loaded and interop registered");
        }
    }
}

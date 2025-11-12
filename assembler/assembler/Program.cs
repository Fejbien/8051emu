namespace assembler
{
    internal class Program
    {
        static void Main(string[] args)
        {
            if (args.Length == 0)
            {
                Console.WriteLine("Error: No input file.");
                Console.WriteLine("Please drag an .asm file onto the .exe to assemble it.");
                Console.ReadKey();
                return;
            }

            string assemblyFilePath = args[0];
            string? inputDirectory = Path.GetDirectoryName(assemblyFilePath);
            string inputFileName = Path.GetFileNameWithoutExtension(assemblyFilePath);

            if (inputDirectory == null)
            {
                Console.WriteLine("Error: Could not determine the input file directory.");
                Console.ReadKey();
                return;
            }

            string outputDebugFilePath = Path.Combine(inputDirectory, inputFileName + ".bin");
            string outputIntelHexFilePath = Path.Combine(inputDirectory, inputFileName + ".hex");

            try
            {
                Console.WriteLine($"Assembling: {assemblyFilePath}");
                var outputBytes = new List<byte>();
                string[] lines = File.ReadAllLines(assemblyFilePath);

                List<string> intelHexLines = Assembler.HandleAssembly(lines, outputBytes);

                File.WriteAllBytes(outputDebugFilePath, outputBytes.ToArray());
                Console.WriteLine($"Successfully created: {outputDebugFilePath}");

                File.WriteAllLines(outputIntelHexFilePath, intelHexLines);
                Console.WriteLine($"Successfully created: {outputIntelHexFilePath}");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"\nAn error occurred: {ex.Message}");
            }

            Console.WriteLine("\nAssembly complete. Press any key to exit.");
            Console.ReadKey();
        }
    }
}
using System.Text;

namespace assembler
{
    internal class IntelHexConverter
    {
        public static List<string> ConvertToIntelHex(Dictionary<int, byte> data, int bytesPerLine = 16)
        {
            var intelHexLines = new List<string>();

            var sortedAddresses = data.Keys.ToList();
            sortedAddresses.Sort();

            List<byte> lineBuffer = new List<byte>();
            int bufferStartAddress = -1;

            for (int i = 0; i < sortedAddresses.Count; i++)
            {
                int currentAddress = sortedAddresses[i];
                byte currentByte = data[currentAddress];

                if (bufferStartAddress == -1)
                {
                    bufferStartAddress = currentAddress;
                }

                bool isGap = (currentAddress != bufferStartAddress + lineBuffer.Count);
                bool isFull = (lineBuffer.Count >= bytesPerLine);

                if (isGap || isFull)
                {
                    intelHexLines.Add(FormatIntelHexLine(bufferStartAddress, lineBuffer));

                    lineBuffer.Clear();
                    bufferStartAddress = currentAddress;
                }
                lineBuffer.Add(currentByte);
            }

            if (lineBuffer.Count > 0)
            {
                intelHexLines.Add(FormatIntelHexLine(bufferStartAddress, lineBuffer));
            }

            intelHexLines.Add(":00000001FF");
            return intelHexLines;
        }

        static private string FormatIntelHexLine(int address, List<byte> data)
        {
            byte lineLength = (byte)data.Count;
            byte recordType = 0x00;

            byte checksum = 0;
            checksum += lineLength;
            checksum += (byte)(address >> 8);
            checksum += (byte)(address & 0xFF);
            checksum += recordType;

            StringBuilder lineBuilder = new StringBuilder();
            lineBuilder.Append(':');
            lineBuilder.Append(lineLength.ToString("X2"));
            lineBuilder.Append(address.ToString("X4"));
            lineBuilder.Append("00");

            foreach (byte b in data)
            {
                checksum += b;
                lineBuilder.Append(b.ToString("X2"));
            }

            checksum = (byte)(~checksum + 1);
            lineBuilder.Append(checksum.ToString("X2"));

            return lineBuilder.ToString().ToUpper();
        }
    }
}

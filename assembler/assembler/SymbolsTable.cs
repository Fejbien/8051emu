namespace assembler
{
    internal class SymbolsTable
    {
        public static void PrepopulateSymbols(Dictionary<string, int> table)
        {
            // Symbols for 8051 Special Function Registers
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
            //DIV_4_2		dzielenie 4bajty / 2bajty	812AHs
            table.Add("WRITE_TEXT", 0x8100);
            table.Add("WRITE_DATA", 0x8102);
            table.Add("WRITE_HEX", 0x8104);
            table.Add("WRITE_INSTR", 0x8106);
            table.Add("LCD_INIT", 0x8108);
            table.Add("LCD_OFF", 0x810A);
            table.Add("LCD_CLR", 0x810C);
            table.Add("DELAY_US", 0x810E);
            table.Add("DELAY_MS", 0x8110);
            table.Add("DELAY_100MS", 0x8112);
            table.Add("WAIT_ENTER", 0x8114);
            table.Add("WAIT_ENTER_NW", 0x8116);
            table.Add("TEST_ENTER", 0x8118);
            table.Add("WAIT_ENT_ESC", 0x811A);
            table.Add("WAIT_KEY", 0x811C);
            table.Add("GET_NUM", 0x811E);
            table.Add("BCD_HEX", 0x8120);
            table.Add("HEX_BCD", 0x8122);
            table.Add("MUL_2_2", 0x8124);
            table.Add("MUL_3_1", 0x8126);
            table.Add("DIV_2_1", 0x8128);
            table.Add("DIV_4_2", 0x812A);
        }
    }
}

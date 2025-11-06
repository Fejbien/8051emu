export const KEYPAD_LAYOUT: Array<{ label: string; value: string }> = [
  { label: "0", value: "0" },
  { label: "1", value: "1" },
  { label: "2", value: "2" },
  { label: "3", value: "3" },
  { label: "4", value: "4" },
  { label: "5", value: "5" },
  { label: "6", value: "6" },
  { label: "7", value: "7" },
  { label: "8", value: "8" },
  { label: "9", value: "9" },
  { label: "A", value: "A" },
  { label: "B", value: "B" },
  { label: "C", value: "C" },
  { label: "D", value: "D" },
  { label: "E", value: "E" },
  { label: "F", value: "F" },
  { label: "Enter", value: "ENTER" },
  { label: "Esc", value: "ESC" },
];

export const WAIT_REASON_MAP: Record<number, string> = {
  1: "Press Enter to continue",
  2: "Press Enter to continue",
  3: "Press Enter or ESC",
  4: "Provide a keypad value (0-9, A-F)",
  5: "Enter a 4-digit number",
};

export const DEFAULT_ASM_CODE = `; 8051 Assembly Example
.area CODE (ABS)
.org 0x0000

START:
    MOV A, #0x25
    MOV R0, A
    MOV R1, #0x10
LOOP:
    ADD A, R0
    DJNZ R1, LOOP
    SJMP START`;

export const SYSTEM_CALLS: Record<string, string> = {
  'WRITE_TEXT': 'WRITE_TEXT  = 0x8100',
  'WRITE_DATA': 'WRITE_DATA  = 0x8102',
  'WRITE_HEX': 'WRITE_HEX   = 0x8104',
  'WRITE_INSTR': 'WRITE_INSTR = 0x8106',
  'LCD_INIT': 'LCD_INIT    = 0x8108',
  'LCD_OFF': 'LCD_OFF     = 0x810A',
  'LCD_CLR': 'LCD_CLR     = 0x810C',
  'DELAY_US': 'DELAY_US    = 0x810E',
  'DELAY_MS': 'DELAY_MS    = 0x8110',
  'DELAY_100MS': 'DELAY_100MS = 0x8112',
  'WAIT_ENTER': 'WAIT_ENTER    = 0x8114',
  'WAIT_ENTER_NW': 'WAIT_ENTER_NW = 0x8116',
  'TEST_ENTER': 'TEST_ENTER    = 0x8118',
  'WAIT_ENT_ESC': 'WAIT_ENT_ESC  = 0x811A',
  'WAIT_KEY': 'WAIT_KEY    = 0x811C',
  'GET_NUM': 'GET_NUM     = 0x811E',
  'BCD_HEX': 'BCD_HEX     = 0x8120',
  'HEX_BCD': 'HEX_BCD     = 0x8122',
  'MUL_2_2': 'MUL_2_2     = 0x8124',
  'MUL_3_1': 'MUL_3_1     = 0x8126',
  'DIV_2_1': 'DIV_2_1     = 0x8128',
  'DIV_4_2': 'DIV_4_2     = 0x812A'
};


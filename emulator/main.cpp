#include <algorithm>
#include <cctype>
#include <cstddef>
#include <cstdint>
#include <cstring>
#include <deque>
#include <fstream>
#include <functional>
#include <iomanip>
#include <iostream>
#include <map>
#include <sstream>
#include <string>

struct EmulatorState {
  uint64_t cycles;
  uint16_t pc;
  uint16_t dptr;
  uint8_t sp;
  uint8_t a;
  uint8_t b;
  uint8_t psw;
  uint8_t p0;
  uint8_t p1;
  uint8_t p2;
  uint8_t p3;
};

class Intel8051 {
private:
  // Memory spaces
  uint8_t programMemory[65536]; // 64KB program memory (ROM)
  uint8_t dataMemory[256];      // 256 bytes internal RAM
  uint8_t externalRAM[65536];   // 64KB external RAM

  // CPU Registers
  uint8_t A;     // Accumulator
  uint8_t B;     // B register
  uint16_t DPTR; // Data Pointer (DPH:DPL)
  uint8_t SP;    // Stack Pointer
  uint16_t PC;   // Program Counter
  uint8_t PSW;   // Program Status Word

  // Special Function Registers (SFRs) - mapped to dataMemory[0x80-0xFF]
  uint8_t &P0;   // Port 0
  uint8_t &P1;   // Port 1
  uint8_t &P2;   // Port 2
  uint8_t &P3;   // Port 3
  uint8_t &IE;   // Interrupt Enable
  uint8_t &IP;   // Interrupt Priority
  uint8_t &TMOD; // Timer Mode
  uint8_t &TCON; // Timer Control
  uint8_t &TH0;  // Timer 0 High
  uint8_t &TL0;  // Timer 0 Low
  uint8_t &TH1;  // Timer 1 High
  uint8_t &TL1;  // Timer 1 Low
  uint8_t &SCON; // Serial Control
  uint8_t &SBUF; // Serial Buffer
  uint8_t &PCON; // Power Control

  bool running;
  uint64_t cycleCount;

  enum class WaitType {
    None = 0,
    WaitEnter = 1,
    WaitEnterNW = 2,
    WaitEnterEsc = 3,
    WaitKey = 4,
    GetNum = 5
  };

  enum class SystemCallResult { NotHandled, Handled, Pending };

  bool captureOutput;
  bool mirrorStdout;
  std::deque<char> outputBuffer;
  std::deque<char> inputBuffer;
  bool waitingForInput;
  WaitType waitType;

  // System call table for monitor routines
  std::map<uint16_t, std::function<void()>> systemCalls;

  // Flags in PSW
  bool getCarryFlag() const { return PSW & 0x80; }
  void setCarryFlag(bool val) {
    PSW = val ? (PSW | 0x80) : (PSW & 0x7F);
    dataMemory[0xD0] = PSW; // Sync to SFR
  }
  bool getAuxCarryFlag() const { return PSW & 0x40; }
  void setAuxCarryFlag(bool val) {
    PSW = val ? (PSW | 0x40) : (PSW & 0xBF);
    dataMemory[0xD0] = PSW; // Sync to SFR
  }
  bool getOverflowFlag() const { return PSW & 0x04; }
  void setOverflowFlag(bool val) {
    PSW = val ? (PSW | 0x04) : (PSW & 0xFB);
    dataMemory[0xD0] = PSW; // Sync to SFR
  }
  bool getParityFlag() const { return PSW & 0x01; }
  void setParityFlag(bool val) {
    PSW = val ? (PSW | 0x01) : (PSW & 0xFE);
    dataMemory[0xD0] = PSW; // Sync to SFR
  }

  uint8_t getRegisterBank() const { return (PSW >> 3) & 0x03; }

  // Helper methods
  uint8_t readDataMemory(uint8_t addr) {
    // Sync SFR registers with their memory locations
    if (addr == 0xE0) {
      return A; // Accumulator
    } else if (addr == 0xF0) {
      return B; // B register
    } else if (addr == 0xD0) {
      return PSW; // PSW
    } else if (addr == 0x81) {
      return SP; // Stack Pointer
    } else if (addr == 0x82) {
      return DPTR & 0xFF; // DPL
    } else if (addr == 0x83) {
      return DPTR >> 8; // DPH
    }
    return dataMemory[addr];
  }

  void writeDataMemory(uint8_t addr, uint8_t value) {
    dataMemory[addr] = value;

    // Sync SFR registers with their memory locations
    if (addr == 0xE0) {
      A = value; // Accumulator
      updateParity();
    } else if (addr == 0xF0) {
      B = value; // B register
    } else if (addr == 0xD0) {
      PSW = value; // PSW
    } else if (addr == 0x81) {
      SP = value; // Stack Pointer
    } else if (addr == 0x82) {
      DPTR = (DPTR & 0xFF00) | value; // DPL
    } else if (addr == 0x83) {
      DPTR = (DPTR & 0x00FF) | (value << 8); // DPH
    }
  }

  uint8_t readRegister(uint8_t reg) {
    uint8_t bank = getRegisterBank();
    return dataMemory[bank * 8 + reg];
  }

  void writeRegister(uint8_t reg, uint8_t value) {
    uint8_t bank = getRegisterBank();
    dataMemory[bank * 8 + reg] = value;
  }

  void updateParity() {
    uint8_t p = 0;
    uint8_t val = A;
    for (int i = 0; i < 8; i++) {
      p ^= (val & 1);
      val >>= 1;
    }
    setParityFlag(p);
    // Sync A back to memory after modification
    dataMemory[0xE0] = A;
  }

  uint8_t fetch() { return programMemory[PC++]; }

  void push(uint8_t value) {
    dataMemory[++SP] = value;
    dataMemory[0x81] = SP; // Sync SP to SFR
  }

  uint8_t pop() {
    uint8_t value = dataMemory[SP--];
    dataMemory[0x81] = SP; // Sync SP to SFR
    return value;
  }

  // External RAM access
  uint8_t readExternalRAM(uint16_t addr) { return externalRAM[addr]; }

  void writeExternalRAM(uint16_t addr, uint8_t value) {
    externalRAM[addr] = value;
  }

  // Bit-addressable memory helpers
  void writeBit(uint8_t bitAddr, bool value) {
    if (bitAddr < 0x80) {
      // Bit-addressable RAM (0x20-0x2F maps to bit addresses 0x00-0x7F)
      uint8_t byteAddr = 0x20 + (bitAddr / 8);
      uint8_t bitPos = bitAddr % 8;
      if (value) {
        dataMemory[byteAddr] |= (1 << bitPos);
      } else {
        dataMemory[byteAddr] &= ~(1 << bitPos);
      }
    } else {
      // SFR bit-addressable (0x80, 0x88, 0x90, 0x98, 0xA0, 0xA8, 0xB0, 0xB8,
      // etc.)
      uint8_t byteAddr = (bitAddr & 0xF8);
      uint8_t bitPos = bitAddr & 0x07;
      if (value) {
        dataMemory[byteAddr] |= (1 << bitPos);
      } else {
        dataMemory[byteAddr] &= ~(1 << bitPos);
      }
    }
  }

  bool readBit(uint8_t bitAddr) {
    if (bitAddr < 0x80) {
      // Bit-addressable RAM
      uint8_t byteAddr = 0x20 + (bitAddr / 8);
      uint8_t bitPos = bitAddr % 8;
      return (dataMemory[byteAddr] >> bitPos) & 1;
    } else {
      // SFR bit-addressable
      uint8_t byteAddr = (bitAddr & 0xF8);
      uint8_t bitPos = bitAddr & 0x07;
      return (dataMemory[byteAddr] >> bitPos) & 1;
    }
  }

  bool loadHexStream(std::istream &stream, bool verbose,
                     const std::string &sourceLabel) {
    std::string line;
    uint32_t extendedAddress = 0;

    while (std::getline(stream, line)) {
      if (line.empty() || line[0] != ':') {
        continue;
      }

      if (line.length() < 11) {
        std::cerr << "Warning: Invalid line in HEX data: " << line << std::endl;
        continue;
      }

      uint8_t byteCount = std::stoi(line.substr(1, 2), nullptr, 16);
      uint16_t address = std::stoi(line.substr(3, 4), nullptr, 16);
      uint8_t recordType = std::stoi(line.substr(7, 2), nullptr, 16);

      if (recordType == 0x00) {
        // Data record
        uint32_t fullAddress = extendedAddress + address;
        for (int i = 0; i < byteCount; i++) {
          uint8_t byte = std::stoi(line.substr(9 + i * 2, 2), nullptr, 16);
          if (fullAddress + i < sizeof(programMemory)) {
            programMemory[fullAddress + i] = byte;
          }
        }
      } else if (recordType == 0x01) {
        // End of file record
        break;
      } else if (recordType == 0x02) {
        // Extended segment address record
        uint16_t segment = std::stoi(line.substr(9, 4), nullptr, 16);
        extendedAddress = segment * 16;
      } else if (recordType == 0x04) {
        // Extended linear address record
        uint16_t upper = std::stoi(line.substr(9, 4), nullptr, 16);
        extendedAddress = upper << 16;
      }
    }

    if (verbose) {
      std::cout << "Successfully loaded HEX data from " << sourceLabel
                << std::endl;
    }

    return true;
  }

  void appendOutputChar(char ch) {
    if (mirrorStdout) {
      std::cout << ch;
      if (ch == '\n') {
        std::cout.flush();
      }
    }
    if (captureOutput) {
      outputBuffer.push_back(ch);
      if (ch == '\n') {
        outputBuffer.clear();
      }
    }
  }

  void appendOutputString(const std::string &text) {
    for (char ch : text) {
      appendOutputChar(ch);
    }
  }

  void setWaitState(WaitType type) {
    waitingForInput = true;
    waitType = type;
  }

  void clearWaitState() {
    waitingForInput = false;
    waitType = WaitType::None;
  }

  bool consumeLine(std::string &line) {
    auto newlineIt = std::find_if(inputBuffer.begin(), inputBuffer.end(),
                                  [](char c) { return c == '\n'; });
    if (newlineIt == inputBuffer.end()) {
      return false;
    }

    line.assign(inputBuffer.begin(), newlineIt);
    auto eraseEnd = newlineIt;
    ++eraseEnd;
    inputBuffer.erase(inputBuffer.begin(), eraseEnd);
    return true;
  }

  bool consumeChar(char &ch) {
    if (inputBuffer.empty()) {
      return false;
    }
    ch = inputBuffer.front();
    inputBuffer.pop_front();
    return true;
  }

  // Monitor/BIOS functions for dsm-51 compatibility
  // DSM-51 System Calls

  void syscall_WRITE_TEXT() {
    // 0x8100 - Write text to LCD (null-terminated string from DPTR)
    uint16_t addr = DPTR;
    while (true) {
      uint8_t ch = programMemory[addr++];
      if (ch == 0 || addr == 0)
        break;
      appendOutputChar(static_cast<char>(ch));
    }
  }

  void syscall_WRITE_DATA() {
    // 0x8102 - Write character to LCD (from A)
    appendOutputChar(static_cast<char>(A));
  }

  void syscall_WRITE_HEX() {
    // 0x8104 - Write hex number to LCD (from A)
    std::ostringstream oss;
    oss << std::hex << std::uppercase << std::setw(2) << std::setfill('0')
        << static_cast<int>(A);
    appendOutputString(oss.str());
  }

  void syscall_WRITE_INSTR() {
    // 0x8106 - Send instruction to LCD
  }

  void syscall_LCD_INIT() {
    // 0x8108 - Initialize LCD
    appendOutputString("[LCD INIT]\n");
  }

  void syscall_LCD_OFF() {
    // 0x810A - Turn off LCD
    appendOutputString("[LCD OFF]\n");
  }

  void syscall_LCD_CLR() {
    // 0x810C - Clear LCD
    appendOutputString("\n");
  }

  void syscall_DELAY_US() {
    // 0x810E - Delay (2*A+6)*12/11.059 microseconds
    uint32_t us = (2 * A + 6) * 12 / 11;
    cycleCount += us / 10; // Approximate cycle count
  }

  void syscall_DELAY_MS() {
    // 0x8110 - Delay A milliseconds
    cycleCount += A * 1000; // ~1000 cycles per ms at 12MHz
  }

  void syscall_DELAY_100MS() {
    // 0x8112 - Delay A * 100 milliseconds
    cycleCount += A * 100000; // ~100,000 cycles per 100ms
  }

  void syscall_WAIT_ENTER() {
    // 0x8114 - Display "PRESS ENTER" and wait for ENTER
    if (!waitingForInput || waitType != WaitType::WaitEnter) {
      appendOutputString("PRESS ENTER.\n");
    }

    std::string line;
    if (consumeLine(line)) {
      clearWaitState();
    } else {
      setWaitState(WaitType::WaitEnter);
    }
  }

  void syscall_WAIT_ENTER_NW() {
    // 0x8116 - Wait for ENTER key (no message)
    std::string line;
    if (consumeLine(line)) {
      clearWaitState();
    } else {
      setWaitState(WaitType::WaitEnterNW);
    }
  }

  void syscall_TEST_ENTER() {
    // 0x8118 - Test if ENTER key is pressed (non-blocking would be ideal)
    setCarryFlag(false);
  }

  void syscall_WAIT_ENT_ESC() {
    // 0x811A - Wait for ENTER or ESC
    char ch;
    if (!consumeChar(ch)) {
      setWaitState(WaitType::WaitEnterEsc);
      return;
    }

    clearWaitState();
    A = static_cast<uint8_t>(ch);

    if (ch == '\n') {
      setCarryFlag(false); // ENTER pressed
    } else if (static_cast<unsigned char>(ch) == 27) {
      setCarryFlag(true); // ESC pressed
    }
  }

  void syscall_WAIT_KEY() {
    // 0x811C - Wait for any key (accepts 0-9, a-f/A-F for values 0-15)
    std::string line;
    if (!consumeLine(line)) {
      setWaitState(WaitType::WaitKey);
      return;
    }

    clearWaitState();

    if (line.empty()) {
      A = 0;
      return;
    }

    char ch = line[0];
    if (ch >= '0' && ch <= '9') {
      A = ch - '0';
    } else if (ch >= 'a' && ch <= 'f') {
      A = 10 + (ch - 'a');
    } else if (ch >= 'A' && ch <= 'F') {
      A = 10 + (ch - 'A');
    } else {
      A = 0;
    }
  }

  void syscall_GET_NUM() {
    // 0x811E - Read BCD number (4 digits)
    std::string line;
    if (!consumeLine(line)) {
      setWaitState(WaitType::GetNum);
      return;
    }

    clearWaitState();

    std::istringstream iss(line);
    std::string token;
    iss >> token;

    auto isDigit = [](char ch) {
      return std::isdigit(static_cast<unsigned char>(ch));
    };

    if (token.length() >= 4 && isDigit(token[0]) && isDigit(token[1]) &&
        isDigit(token[2]) && isDigit(token[3])) {
      uint8_t bank = getRegisterBank();
      dataMemory[bank * 8 + 3] = ((token[0] - '0') << 4) | (token[1] - '0');
      dataMemory[bank * 8 + 2] = ((token[2] - '0') << 4) | (token[3] - '0');
    }
  }

  void syscall_BCD_HEX() {
    // 0x8120 - Convert BCD to HEX (R3:R2 -> R3:R2)
    uint8_t bank = getRegisterBank();
    uint8_t bcd_high = dataMemory[bank * 8 + 3];
    uint8_t bcd_low = dataMemory[bank * 8 + 2];
    uint16_t bcd = (bcd_high << 8) | bcd_low;

    uint16_t hex = ((bcd >> 12) & 0x0F) * 1000 + ((bcd >> 8) & 0x0F) * 100 +
                   ((bcd >> 4) & 0x0F) * 10 + (bcd & 0x0F);

    dataMemory[bank * 8 + 3] = hex >> 8;
    dataMemory[bank * 8 + 2] = hex & 0xFF;
  }

  void syscall_HEX_BCD() {
    // 0x8122 - Convert HEX to BCD (R3:R2 -> R3:R2)
    uint8_t bank = getRegisterBank();
    uint16_t hex = (dataMemory[bank * 8 + 3] << 8) | dataMemory[bank * 8 + 2];

    uint8_t thousands = (hex / 1000) % 10;
    uint8_t hundreds = (hex / 100) % 10;
    uint8_t tens = (hex / 10) % 10;
    uint8_t ones = hex % 10;

    dataMemory[bank * 8 + 3] = (thousands << 4) | hundreds;
    dataMemory[bank * 8 + 2] = (tens << 4) | ones;
  }

  void syscall_MUL_2_2() {
    // 0x8124 - Multiply 2-byte numbers (R3:R2 * R5:R4 -> R7:R6:R5:R4)
    uint8_t bank = getRegisterBank();
    uint16_t a = (dataMemory[bank * 8 + 3] << 8) | dataMemory[bank * 8 + 2];
    uint16_t b = (dataMemory[bank * 8 + 5] << 8) | dataMemory[bank * 8 + 4];
    uint32_t result = (uint32_t)a * (uint32_t)b;

    dataMemory[bank * 8 + 7] = (result >> 24) & 0xFF;
    dataMemory[bank * 8 + 6] = (result >> 16) & 0xFF;
    dataMemory[bank * 8 + 5] = (result >> 8) & 0xFF;
    dataMemory[bank * 8 + 4] = result & 0xFF;
  }

  void syscall_MUL_3_1() {
    // 0x8126 - Multiply 3 bytes * 1 byte (R4:R3:R2 * R5 -> R7:R6:R5:R4)
    uint8_t bank = getRegisterBank();
    uint32_t a = ((uint32_t)dataMemory[bank * 8 + 4] << 16) |
                 ((uint32_t)dataMemory[bank * 8 + 3] << 8) |
                 dataMemory[bank * 8 + 2];
    uint8_t b = dataMemory[bank * 8 + 5];
    uint32_t result = a * b;

    dataMemory[bank * 8 + 7] = (result >> 24) & 0xFF;
    dataMemory[bank * 8 + 6] = (result >> 16) & 0xFF;
    dataMemory[bank * 8 + 5] = (result >> 8) & 0xFF;
    dataMemory[bank * 8 + 4] = result & 0xFF;
  }

  void syscall_DIV_2_1() {
    // 0x8128 - Divide 2 bytes / 1 byte (R3:R2 / R4 -> R3:R2 quotient, R5
    // remainder)
    uint8_t bank = getRegisterBank();
    uint16_t dividend =
        (dataMemory[bank * 8 + 3] << 8) | dataMemory[bank * 8 + 2];
    uint8_t divisor = dataMemory[bank * 8 + 4];

    if (divisor != 0) {
      uint16_t quotient = dividend / divisor;
      uint8_t remainder = dividend % divisor;

      dataMemory[bank * 8 + 3] = quotient >> 8;
      dataMemory[bank * 8 + 2] = quotient & 0xFF;
      dataMemory[bank * 8 + 5] = remainder;
      setOverflowFlag(false);
    } else {
      setOverflowFlag(true); // Division by zero
    }
  }

  void syscall_DIV_4_2() {
    // 0x812A - Divide 4 bytes / 2 bytes (R7:R6:R5:R4 / R3:R2 -> R5:R4 quotient,
    // R7:R6 remainder)
    uint8_t bank = getRegisterBank();
    uint32_t dividend = ((uint32_t)dataMemory[bank * 8 + 7] << 24) |
                        ((uint32_t)dataMemory[bank * 8 + 6] << 16) |
                        ((uint32_t)dataMemory[bank * 8 + 5] << 8) |
                        dataMemory[bank * 8 + 4];
    uint16_t divisor =
        (dataMemory[bank * 8 + 3] << 8) | dataMemory[bank * 8 + 2];

    if (divisor != 0) {
      uint32_t quotient = dividend / divisor;
      uint32_t remainder = dividend % divisor;

      dataMemory[bank * 8 + 5] = (quotient >> 8) & 0xFF;
      dataMemory[bank * 8 + 4] = quotient & 0xFF;
      dataMemory[bank * 8 + 7] = (remainder >> 8) & 0xFF;
      dataMemory[bank * 8 + 6] = remainder & 0xFF;
      setOverflowFlag(false);
    } else {
      setOverflowFlag(true); // Division by zero
    }
  }

  void initSystemCalls() {
    // DSM-51 System Call Addresses (EPROM routines)
    systemCalls[0x8100] = [this]() { syscall_WRITE_TEXT(); };
    systemCalls[0x8102] = [this]() { syscall_WRITE_DATA(); };
    systemCalls[0x8104] = [this]() { syscall_WRITE_HEX(); };
    systemCalls[0x8106] = [this]() { syscall_WRITE_INSTR(); };
    systemCalls[0x8108] = [this]() { syscall_LCD_INIT(); };
    systemCalls[0x810A] = [this]() { syscall_LCD_OFF(); };
    systemCalls[0x810C] = [this]() { syscall_LCD_CLR(); };
    systemCalls[0x810E] = [this]() { syscall_DELAY_US(); };
    systemCalls[0x8110] = [this]() { syscall_DELAY_MS(); };
    systemCalls[0x8112] = [this]() { syscall_DELAY_100MS(); };
    systemCalls[0x8114] = [this]() { syscall_WAIT_ENTER(); };
    systemCalls[0x8116] = [this]() { syscall_WAIT_ENTER_NW(); };
    systemCalls[0x8118] = [this]() { syscall_TEST_ENTER(); };
    systemCalls[0x811A] = [this]() { syscall_WAIT_ENT_ESC(); };
    systemCalls[0x811C] = [this]() { syscall_WAIT_KEY(); };
    systemCalls[0x811E] = [this]() { syscall_GET_NUM(); };
    systemCalls[0x8120] = [this]() { syscall_BCD_HEX(); };
    systemCalls[0x8122] = [this]() { syscall_HEX_BCD(); };
    systemCalls[0x8124] = [this]() { syscall_MUL_2_2(); };
    systemCalls[0x8126] = [this]() { syscall_MUL_3_1(); };
    systemCalls[0x8128] = [this]() { syscall_DIV_2_1(); };
    systemCalls[0x812A] = [this]() { syscall_DIV_4_2(); };
  }

  SystemCallResult handleSystemCall(uint16_t address) {
    auto it = systemCalls.find(address);
    if (it != systemCalls.end()) {
      it->second(); // Execute the system call
      if (waitingForInput) {
        return SystemCallResult::Pending;
      }
      return SystemCallResult::Handled;
    }
    return SystemCallResult::NotHandled;
  }

public:
  Intel8051()
      : P0(dataMemory[0x80]), P1(dataMemory[0x90]), P2(dataMemory[0xA0]),
        P3(dataMemory[0xB0]), IE(dataMemory[0xA8]), IP(dataMemory[0xB8]),
        TMOD(dataMemory[0x89]), TCON(dataMemory[0x88]), TH0(dataMemory[0x8C]),
        TL0(dataMemory[0x8A]), TH1(dataMemory[0x8D]), TL1(dataMemory[0x8B]),
        SCON(dataMemory[0x98]), SBUF(dataMemory[0x99]), PCON(dataMemory[0x87]),
        running(false), cycleCount(0), captureOutput(false), mirrorStdout(true),
        waitingForInput(false), waitType(WaitType::None) {
    reset();
  }

  void reset() {
    memset(programMemory, 0, sizeof(programMemory));
    memset(dataMemory, 0, sizeof(dataMemory));
    memset(externalRAM, 0, sizeof(externalRAM));

    A = 0;
    B = 0;
    DPTR = 0;
    SP = 0x07; // Stack pointer starts at 0x07
    PC = 0;
    PSW = 0;

    // Sync registers to their SFR addresses
    dataMemory[0xE0] = A;           // ACC
    dataMemory[0xF0] = B;           // B
    dataMemory[0xD0] = PSW;         // PSW
    dataMemory[0x81] = SP;          // SP
    dataMemory[0x82] = DPTR & 0xFF; // DPL
    dataMemory[0x83] = DPTR >> 8;   // DPH

    P0 = P1 = P2 = P3 = 0xFF; // Ports default to high

    running = false;
    cycleCount = 0;

    inputBuffer.clear();
    outputBuffer.clear();
    clearWaitState();

    // Initialize system calls for dsm-51 compatibility
    initSystemCalls();
  }

  bool loadHexFromString(const std::string &hexData) {
    std::istringstream stream(hexData);
    return loadHexStream(stream, false, "string input");
  }

  bool loadHexFile(const std::string &filename) {
    std::ifstream file(filename);
    if (!file.is_open()) {
      std::cerr << "Error: Could not open file " << filename << std::endl;
      return false;
    }

    bool result = loadHexStream(file, true, filename);
    file.close();
    return result;
  }

  void setOutputOptions(bool capture, bool mirror) {
    captureOutput = capture;
    mirrorStdout = mirror;
    if (!captureOutput) {
      outputBuffer.clear();
    }
  }

  size_t readOutput(char *buffer, size_t maxLen) {
    if (!buffer || maxLen == 0) {
      return 0;
    }

    size_t count = 0;
    while (count < maxLen && !outputBuffer.empty()) {
      buffer[count++] = outputBuffer.front();
      outputBuffer.pop_front();
    }
    return count;
  }

  std::string readOutputString() {
    std::string result(outputBuffer.begin(), outputBuffer.end());
    outputBuffer.clear();
    return result;
  }

  size_t getOutputSize() const { return outputBuffer.size(); }

  void clearOutputBuffer() { outputBuffer.clear(); }

  void pushInput(const char *data, size_t length) {
    if (!data) {
      return;
    }
    for (size_t i = 0; i < length; ++i) {
      char ch = data[i];
      if (ch == '\r') {
        continue;
      }
      inputBuffer.push_back(ch);
    }
  }

  void pushInput(const std::string &text) {
    pushInput(text.data(), text.size());
  }

  bool isWaitingForInput() const { return waitingForInput; }

  int getWaitTypeCode() const { return static_cast<int>(waitType); }

  void getStateSnapshot(EmulatorState &state) const {
    state.cycles = cycleCount;
    state.pc = PC;
    state.dptr = DPTR;
    state.sp = SP;
    state.a = A;
    state.b = B;
    state.psw = PSW;
    state.p0 = P0;
    state.p1 = P1;
    state.p2 = P2;
    state.p3 = P3;
  }

  void executeInstruction() {
    uint8_t opcode = fetch();

    switch (opcode) {
    // 0x0X - NOP, AJMP, LJMP, RR, INC variants
    case 0x00: // NOP
      cycleCount += 1;
      break;

    case 0x01:
    case 0x21:
    case 0x41:
    case 0x61:
    case 0x81:
    case 0xA1:
    case 0xC1:
    case 0xE1: // AJMP addr11
    {
      uint8_t addr_low = fetch();
      uint16_t addr11 = ((opcode & 0xE0) << 3) | addr_low;
      PC = (PC & 0xF800) | addr11;
      cycleCount += 2;
      break;
    }

    case 0x02: // LJMP addr16
    {
      uint8_t high = fetch();
      uint8_t low = fetch();
      PC = (high << 8) | low;
      cycleCount += 2;
      break;
    }

    case 0x03: // RR A
      A = (A >> 1) | (A << 7);
      cycleCount += 1;
      break;

    case 0x04: // INC A
      A++;
      updateParity();
      cycleCount += 1;
      break;

    case 0x05: // INC direct
    {
      uint8_t addr = fetch();
      writeDataMemory(addr, readDataMemory(addr) + 1);
      cycleCount += 1;
      break;
    }

    case 0x06: // INC @R0
      writeDataMemory(readRegister(0), readDataMemory(readRegister(0)) + 1);
      cycleCount += 1;
      break;

    case 0x07: // INC @R1
      writeDataMemory(readRegister(1), readDataMemory(readRegister(1)) + 1);
      cycleCount += 1;
      break;

    case 0x08:
    case 0x09:
    case 0x0A:
    case 0x0B:
    case 0x0C:
    case 0x0D:
    case 0x0E:
    case 0x0F: // INC Rn
      writeRegister(opcode & 0x07, readRegister(opcode & 0x07) + 1);
      cycleCount += 1;
      break;

    // 0x1X - JBC, ACALL, LCALL, RRC, DEC variants
    case 0x10: // JBC bit, rel
    {
      uint8_t bitAddr = fetch();
      int8_t offset = fetch();
      if (readBit(bitAddr)) {
        writeBit(bitAddr, false);
        PC += offset;
      }
      cycleCount += 2;
      break;
    }

    case 0x11:
    case 0x31:
    case 0x51:
    case 0x71:
    case 0x91:
    case 0xB1:
    case 0xD1:
    case 0xF1: // ACALL addr11
    {
      uint8_t addr_low = fetch();
      uint16_t addr11 = ((opcode & 0xE0) << 3) | addr_low;
      uint16_t targetAddr = (PC & 0xF800) | addr11;
      SystemCallResult callResult = handleSystemCall(targetAddr);

      if (callResult == SystemCallResult::Handled) {
        cycleCount += 2;
      } else if (callResult == SystemCallResult::Pending) {
        PC -= 2; // Re-execute the call instruction once input is available
        running = false;
      } else {
        push(PC & 0xFF);
        push(PC >> 8);
        PC = targetAddr;
        cycleCount += 2;
      }
      break;
    }

    case 0x12: // LCALL addr16
    {
      uint8_t high = fetch();
      uint8_t low = fetch();
      uint16_t targetAddr = (high << 8) | low;
      SystemCallResult callResult = handleSystemCall(targetAddr);

      if (callResult == SystemCallResult::Handled) {
        cycleCount += 2;
      } else if (callResult == SystemCallResult::Pending) {
        PC -= 3; // Re-execute the call instruction once input is available
        running = false;
      } else {
        push(PC & 0xFF);
        push(PC >> 8);
        PC = targetAddr;
        cycleCount += 2;
      }
      break;
    }

    case 0x13: // RRC A
    {
      bool oldCarry = getCarryFlag();
      setCarryFlag(A & 0x01);
      A = (A >> 1) | (oldCarry ? 0x80 : 0x00);
      cycleCount += 1;
      break;
    }

    case 0x14: // DEC A
      A--;
      updateParity();
      cycleCount += 1;
      break;

    case 0x15: // DEC direct
    {
      uint8_t addr = fetch();
      writeDataMemory(addr, readDataMemory(addr) - 1);
      cycleCount += 1;
      break;
    }

    case 0x16: // DEC @R0
      writeDataMemory(readRegister(0), readDataMemory(readRegister(0)) - 1);
      cycleCount += 1;
      break;

    case 0x17: // DEC @R1
      writeDataMemory(readRegister(1), readDataMemory(readRegister(1)) - 1);
      cycleCount += 1;
      break;

    case 0x18:
    case 0x19:
    case 0x1A:
    case 0x1B:
    case 0x1C:
    case 0x1D:
    case 0x1E:
    case 0x1F: // DEC Rn
      writeRegister(opcode & 0x07, readRegister(opcode & 0x07) - 1);
      cycleCount += 1;
      break;

    // 0x2X - JB, RET, RL, ADD variants
    case 0x20: // JB bit, rel
    {
      uint8_t bitAddr = fetch();
      int8_t offset = fetch();
      if (readBit(bitAddr)) {
        PC += offset;
      }
      cycleCount += 2;
      break;
    }

    case 0x22: // RET
      PC = (pop() << 8) | pop();
      cycleCount += 2;
      break;

    case 0x23: // RL A
      A = (A << 1) | (A >> 7);
      cycleCount += 1;
      break;

    case 0x24: // ADD A, #data
    {
      uint8_t data = fetch();
      uint16_t result = A + data;
      setCarryFlag(result > 0xFF);
      setAuxCarryFlag(((A & 0x0F) + (data & 0x0F)) > 0x0F);
      setOverflowFlag(((A ^ result) & (data ^ result) & 0x80) != 0);
      A = result & 0xFF;
      updateParity();
      cycleCount += 1;
      break;
    }

    case 0x25: // ADD A, direct
    {
      uint8_t addr = fetch();
      uint8_t data = readDataMemory(addr);
      uint16_t result = A + data;
      setCarryFlag(result > 0xFF);
      setAuxCarryFlag(((A & 0x0F) + (data & 0x0F)) > 0x0F);
      setOverflowFlag(((A ^ result) & (data ^ result) & 0x80) != 0);
      A = result & 0xFF;
      updateParity();
      cycleCount += 1;
      break;
    }

    case 0x26: // ADD A, @R0
    {
      uint8_t data = readDataMemory(readRegister(0));
      uint16_t result = A + data;
      setCarryFlag(result > 0xFF);
      setAuxCarryFlag(((A & 0x0F) + (data & 0x0F)) > 0x0F);
      setOverflowFlag(((A ^ result) & (data ^ result) & 0x80) != 0);
      A = result & 0xFF;
      updateParity();
      cycleCount += 1;
      break;
    }

    case 0x27: // ADD A, @R1
    {
      uint8_t data = readDataMemory(readRegister(1));
      uint16_t result = A + data;
      setCarryFlag(result > 0xFF);
      setAuxCarryFlag(((A & 0x0F) + (data & 0x0F)) > 0x0F);
      setOverflowFlag(((A ^ result) & (data ^ result) & 0x80) != 0);
      A = result & 0xFF;
      updateParity();
      cycleCount += 1;
      break;
    }

    case 0x28:
    case 0x29:
    case 0x2A:
    case 0x2B:
    case 0x2C:
    case 0x2D:
    case 0x2E:
    case 0x2F: // ADD A, Rn
    {
      uint8_t data = readRegister(opcode & 0x07);
      uint16_t result = A + data;
      setCarryFlag(result > 0xFF);
      setAuxCarryFlag(((A & 0x0F) + (data & 0x0F)) > 0x0F);
      setOverflowFlag(((A ^ result) & (data ^ result) & 0x80) != 0);
      A = result & 0xFF;
      updateParity();
      cycleCount += 1;
      break;
    }

    // 0x3X - JNB, RETI, RLC, ADDC variants
    case 0x30: // JNB bit, rel
    {
      uint8_t bitAddr = fetch();
      int8_t offset = fetch();
      if (!readBit(bitAddr)) {
        PC += offset;
      }
      cycleCount += 2;
      break;
    }

    case 0x32: // RETI
      PC = (pop() << 8) | pop();
      // TODO: Clear interrupt-in-progress flag
      cycleCount += 2;
      break;

    case 0x33: // RLC A
    {
      bool oldCarry = getCarryFlag();
      setCarryFlag(A & 0x80);
      A = (A << 1) | (oldCarry ? 0x01 : 0x00);
      cycleCount += 1;
      break;
    }

    case 0x34: // ADDC A, #data
    {
      uint8_t data = fetch();
      uint16_t result = A + data + (getCarryFlag() ? 1 : 0);
      setAuxCarryFlag(((A & 0x0F) + (data & 0x0F) + (getCarryFlag() ? 1 : 0)) >
                      0x0F);
      setCarryFlag(result > 0xFF);
      setOverflowFlag(((A ^ result) & (data ^ result) & 0x80) != 0);
      A = result & 0xFF;
      updateParity();
      cycleCount += 1;
      break;
    }

    case 0x35: // ADDC A, direct
    {
      uint8_t addr = fetch();
      uint8_t data = readDataMemory(addr);
      uint16_t result = A + data + (getCarryFlag() ? 1 : 0);
      setAuxCarryFlag(((A & 0x0F) + (data & 0x0F) + (getCarryFlag() ? 1 : 0)) >
                      0x0F);
      setCarryFlag(result > 0xFF);
      setOverflowFlag(((A ^ result) & (data ^ result) & 0x80) != 0);
      A = result & 0xFF;
      updateParity();
      cycleCount += 1;
      break;
    }

    case 0x36: // ADDC A, @R0
    {
      uint8_t data = readDataMemory(readRegister(0));
      uint16_t result = A + data + (getCarryFlag() ? 1 : 0);
      setAuxCarryFlag(((A & 0x0F) + (data & 0x0F) + (getCarryFlag() ? 1 : 0)) >
                      0x0F);
      setCarryFlag(result > 0xFF);
      setOverflowFlag(((A ^ result) & (data ^ result) & 0x80) != 0);
      A = result & 0xFF;
      updateParity();
      cycleCount += 1;
      break;
    }

    case 0x37: // ADDC A, @R1
    {
      uint8_t data = readDataMemory(readRegister(1));
      uint16_t result = A + data + (getCarryFlag() ? 1 : 0);
      setAuxCarryFlag(((A & 0x0F) + (data & 0x0F) + (getCarryFlag() ? 1 : 0)) >
                      0x0F);
      setCarryFlag(result > 0xFF);
      setOverflowFlag(((A ^ result) & (data ^ result) & 0x80) != 0);
      A = result & 0xFF;
      updateParity();
      cycleCount += 1;
      break;
    }

    case 0x38:
    case 0x39:
    case 0x3A:
    case 0x3B:
    case 0x3C:
    case 0x3D:
    case 0x3E:
    case 0x3F: // ADDC A, Rn
    {
      uint8_t data = readRegister(opcode & 0x07);
      uint16_t result = A + data + (getCarryFlag() ? 1 : 0);
      setAuxCarryFlag(((A & 0x0F) + (data & 0x0F) + (getCarryFlag() ? 1 : 0)) >
                      0x0F);
      setCarryFlag(result > 0xFF);
      setOverflowFlag(((A ^ result) & (data ^ result) & 0x80) != 0);
      A = result & 0xFF;
      updateParity();
      cycleCount += 1;
      break;
    }

    // 0x4X - JC, ORL variants
    case 0x40: // JC rel
    {
      int8_t offset = fetch();
      if (getCarryFlag()) {
        PC += offset;
      }
      cycleCount += 2;
      break;
    }

    case 0x42: // ORL direct, A
    {
      uint8_t addr = fetch();
      writeDataMemory(addr, readDataMemory(addr) | A);
      cycleCount += 1;
      break;
    }

    case 0x43: // ORL direct, #data
    {
      uint8_t addr = fetch();
      uint8_t data = fetch();
      writeDataMemory(addr, readDataMemory(addr) | data);
      cycleCount += 2;
      break;
    }

    case 0x44: // ORL A, #data
      A |= fetch();
      updateParity();
      cycleCount += 1;
      break;

    case 0x45: // ORL A, direct
      A |= readDataMemory(fetch());
      updateParity();
      cycleCount += 1;
      break;

    case 0x46: // ORL A, @R0
      A |= readDataMemory(readRegister(0));
      updateParity();
      cycleCount += 1;
      break;

    case 0x47: // ORL A, @R1
      A |= readDataMemory(readRegister(1));
      updateParity();
      cycleCount += 1;
      break;

    case 0x48:
    case 0x49:
    case 0x4A:
    case 0x4B:
    case 0x4C:
    case 0x4D:
    case 0x4E:
    case 0x4F: // ORL A, Rn
      A |= readRegister(opcode & 0x07);
      updateParity();
      cycleCount += 1;
      break;

    // 0x5X - JNC, ANL variants
    case 0x50: // JNC rel
    {
      int8_t offset = fetch();
      if (!getCarryFlag()) {
        PC += offset;
      }
      cycleCount += 2;
      break;
    }

    case 0x52: // ANL direct, A
    {
      uint8_t addr = fetch();
      writeDataMemory(addr, readDataMemory(addr) & A);
      cycleCount += 1;
      break;
    }

    case 0x53: // ANL direct, #data
    {
      uint8_t addr = fetch();
      uint8_t data = fetch();
      writeDataMemory(addr, readDataMemory(addr) & data);
      cycleCount += 2;
      break;
    }

    case 0x54: // ANL A, #data
      A &= fetch();
      updateParity();
      cycleCount += 1;
      break;

    case 0x55: // ANL A, direct
      A &= readDataMemory(fetch());
      updateParity();
      cycleCount += 1;
      break;

    case 0x56: // ANL A, @R0
      A &= readDataMemory(readRegister(0));
      updateParity();
      cycleCount += 1;
      break;

    case 0x57: // ANL A, @R1
      A &= readDataMemory(readRegister(1));
      updateParity();
      cycleCount += 1;
      break;

    case 0x58:
    case 0x59:
    case 0x5A:
    case 0x5B:
    case 0x5C:
    case 0x5D:
    case 0x5E:
    case 0x5F: // ANL A, Rn
      A &= readRegister(opcode & 0x07);
      updateParity();
      cycleCount += 1;
      break;

    // 0x6X - JZ, XRL variants
    case 0x60: // JZ rel
    {
      int8_t offset = fetch();
      if (A == 0) {
        PC += offset;
      }
      cycleCount += 2;
      break;
    }

    case 0x62: // XRL direct, A
    {
      uint8_t addr = fetch();
      writeDataMemory(addr, readDataMemory(addr) ^ A);
      cycleCount += 1;
      break;
    }

    case 0x63: // XRL direct, #data
    {
      uint8_t addr = fetch();
      uint8_t data = fetch();
      writeDataMemory(addr, readDataMemory(addr) ^ data);
      cycleCount += 2;
      break;
    }

    case 0x64: // XRL A, #data
      A ^= fetch();
      updateParity();
      cycleCount += 1;
      break;

    case 0x65: // XRL A, direct
      A ^= readDataMemory(fetch());
      updateParity();
      cycleCount += 1;
      break;

    case 0x66: // XRL A, @R0
      A ^= readDataMemory(readRegister(0));
      updateParity();
      cycleCount += 1;
      break;

    case 0x67: // XRL A, @R1
      A ^= readDataMemory(readRegister(1));
      updateParity();
      cycleCount += 1;
      break;

    case 0x68:
    case 0x69:
    case 0x6A:
    case 0x6B:
    case 0x6C:
    case 0x6D:
    case 0x6E:
    case 0x6F: // XRL A, Rn
      A ^= readRegister(opcode & 0x07);
      updateParity();
      cycleCount += 1;
      break;

    // 0x7X - JNZ, ORL C, JMP, MOV variants
    case 0x70: // JNZ rel
    {
      int8_t offset = fetch();
      if (A != 0) {
        PC += offset;
      }
      cycleCount += 2;
      break;
    }

    case 0x72: // ORL C, bit
      setCarryFlag(getCarryFlag() | readBit(fetch()));
      cycleCount += 2;
      break;

    case 0x73: // JMP @A+DPTR
      PC = A + DPTR;
      cycleCount += 2;
      break;

    case 0x74: // MOV A, #data
      A = fetch();
      updateParity();
      cycleCount += 1;
      break;

    case 0x75: // MOV direct, #data
    {
      uint8_t addr = fetch();
      uint8_t data = fetch();
      writeDataMemory(addr, data);
      cycleCount += 2;
      break;
    }

    case 0x76: // MOV @R0, #data
      writeDataMemory(readRegister(0), fetch());
      cycleCount += 1;
      break;

    case 0x77: // MOV @R1, #data
      writeDataMemory(readRegister(1), fetch());
      cycleCount += 1;
      break;

    case 0x78:
    case 0x79:
    case 0x7A:
    case 0x7B:
    case 0x7C:
    case 0x7D:
    case 0x7E:
    case 0x7F: // MOV Rn, #data
      writeRegister(opcode & 0x07, fetch());
      cycleCount += 1;
      break;

    // 0x8X - SJMP, ANL C, MOVC, DIV, MOV variants
    case 0x80: // SJMP rel
    {
      int8_t offset = fetch();
      PC += offset;
      cycleCount += 2;
      break;
    }

    case 0x82: // ANL C, bit
      setCarryFlag(getCarryFlag() & readBit(fetch()));
      cycleCount += 2;
      break;

    case 0x83: // MOVC A, @A+PC
      A = programMemory[(A + PC) & 0xFFFF];
      updateParity();
      cycleCount += 2;
      break;

    case 0x84: // DIV AB
      if (B == 0) {
        setOverflowFlag(true);
        setCarryFlag(false);
      } else {
        uint8_t quotient = A / B;
        uint8_t remainder = A % B;
        A = quotient;
        B = remainder;
        // Sync back to memory
        dataMemory[0xE0] = A;
        dataMemory[0xF0] = B;
        setOverflowFlag(false);
        setCarryFlag(false);
      }
      updateParity();
      cycleCount += 4;
      break;

    case 0x85: // MOV direct, direct
    {
      uint8_t src = fetch();
      uint8_t dst = fetch();
      writeDataMemory(dst, readDataMemory(src));
      cycleCount += 2;
      break;
    }

    case 0x86: // MOV direct, @R0
    {
      uint8_t addr = fetch();
      writeDataMemory(addr, readDataMemory(readRegister(0)));
      cycleCount += 2;
      break;
    }

    case 0x87: // MOV direct, @R1
    {
      uint8_t addr = fetch();
      writeDataMemory(addr, readDataMemory(readRegister(1)));
      cycleCount += 2;
      break;
    }

    case 0x88:
    case 0x89:
    case 0x8A:
    case 0x8B:
    case 0x8C:
    case 0x8D:
    case 0x8E:
    case 0x8F: // MOV direct, Rn
    {
      uint8_t addr = fetch();
      writeDataMemory(addr, readRegister(opcode & 0x07));
      cycleCount += 2;
      break;
    }

    // 0x9X - MOV DPTR, MOVC, SUBB variants
    case 0x90: // MOV DPTR, #data16
    {
      uint8_t high = fetch();
      uint8_t low = fetch();
      DPTR = (high << 8) | low;
      // Sync DPTR to SFRs
      dataMemory[0x82] = DPTR & 0xFF; // DPL
      dataMemory[0x83] = DPTR >> 8;   // DPH
      cycleCount += 2;
      break;
    }

    case 0x92: // MOV bit, C
    {
      uint8_t bitAddr = fetch();
      writeBit(bitAddr, getCarryFlag());
      cycleCount += 2;
      break;
    }

    case 0x93: // MOVC A, @A+DPTR
      A = programMemory[(A + DPTR) & 0xFFFF];
      updateParity();
      cycleCount += 2;
      break;

    case 0x94: // SUBB A, #data
    {
      uint8_t data = fetch();
      int carry = getCarryFlag() ? 1 : 0;
      int result = A - data - carry;
      setCarryFlag(result < 0);
      setAuxCarryFlag((int)(A & 0x0F) - (int)(data & 0x0F) - carry < 0);
      setOverflowFlag(((A ^ data) & (A ^ result) & 0x80) != 0);
      A = result & 0xFF;
      updateParity();
      cycleCount += 1;
      break;
    }

    case 0x95: // SUBB A, direct
    {
      uint8_t data = readDataMemory(fetch());
      int carry = getCarryFlag() ? 1 : 0;
      int result = A - data - carry;
      setCarryFlag(result < 0);
      setAuxCarryFlag((int)(A & 0x0F) - (int)(data & 0x0F) - carry < 0);
      setOverflowFlag(((A ^ data) & (A ^ result) & 0x80) != 0);
      A = result & 0xFF;
      updateParity();
      cycleCount += 1;
      break;
    }

    case 0x96: // SUBB A, @R0
    {
      uint8_t data = readDataMemory(readRegister(0));
      int carry = getCarryFlag() ? 1 : 0;
      int result = A - data - carry;
      setCarryFlag(result < 0);
      setAuxCarryFlag((int)(A & 0x0F) - (int)(data & 0x0F) - carry < 0);
      setOverflowFlag(((A ^ data) & (A ^ result) & 0x80) != 0);
      A = result & 0xFF;
      updateParity();
      cycleCount += 1;
      break;
    }

    case 0x97: // SUBB A, @R1
    {
      uint8_t data = readDataMemory(readRegister(1));
      int carry = getCarryFlag() ? 1 : 0;
      int result = A - data - carry;
      setCarryFlag(result < 0);
      setAuxCarryFlag((int)(A & 0x0F) - (int)(data & 0x0F) - carry < 0);
      setOverflowFlag(((A ^ data) & (A ^ result) & 0x80) != 0);
      A = result & 0xFF;
      updateParity();
      cycleCount += 1;
      break;
    }

    case 0x98:
    case 0x99:
    case 0x9A:
    case 0x9B:
    case 0x9C:
    case 0x9D:
    case 0x9E:
    case 0x9F: // SUBB A, Rn
    {
      uint8_t data = readRegister(opcode & 0x07);
      int carry = getCarryFlag() ? 1 : 0;
      int result = A - data - carry;
      setCarryFlag(result < 0);
      setAuxCarryFlag((int)(A & 0x0F) - (int)(data & 0x0F) - carry < 0);
      setOverflowFlag(((A ^ data) & (A ^ result) & 0x80) != 0);
      A = result & 0xFF;
      updateParity();
      cycleCount += 1;
      break;
    }

    // 0xAX - ORL C, MOV variants, INC DPTR, MUL
    case 0xA0: // ORL C, /bit
      setCarryFlag(getCarryFlag() | !readBit(fetch()));
      cycleCount += 2;
      break;

    case 0xA2: // MOV C, bit
      setCarryFlag(readBit(fetch()));
      cycleCount += 1;
      break;

    case 0xA3: // INC DPTR
      DPTR++;
      // Sync DPTR to SFRs
      dataMemory[0x82] = DPTR & 0xFF; // DPL
      dataMemory[0x83] = DPTR >> 8;   // DPH
      cycleCount += 2;
      break;

    case 0xA4: // MUL AB
    {
      uint16_t result = (uint16_t)A * (uint16_t)B;
      A = result & 0xFF;
      B = (result >> 8) & 0xFF;
      // Sync back to memory
      dataMemory[0xE0] = A;
      dataMemory[0xF0] = B;
      setCarryFlag(false);
      setOverflowFlag(B != 0);
      updateParity();
      cycleCount += 4;
      break;
    }

    case 0xA5: // Undefined (reserved)
      std::cerr << "Warning: Undefined opcode 0xA5 at PC=0x" << std::hex
                << std::setw(4) << std::setfill('0') << (PC - 1) << std::dec
                << std::endl;
      cycleCount += 1;
      break;

    case 0xA6: // MOV @R0, direct
    {
      uint8_t addr = fetch();
      writeDataMemory(readRegister(0), readDataMemory(addr));
      cycleCount += 2;
      break;
    }

    case 0xA7: // MOV @R1, direct
    {
      uint8_t addr = fetch();
      writeDataMemory(readRegister(1), readDataMemory(addr));
      cycleCount += 2;
      break;
    }

    case 0xA8:
    case 0xA9:
    case 0xAA:
    case 0xAB:
    case 0xAC:
    case 0xAD:
    case 0xAE:
    case 0xAF: // MOV Rn, direct
    {
      uint8_t addr = fetch();
      writeRegister(opcode & 0x07, readDataMemory(addr));
      cycleCount += 2;
      break;
    }

    // 0xBX - ANL C, CPL variants, CJNE variants
    case 0xB0: // ANL C, /bit
      setCarryFlag(getCarryFlag() & !readBit(fetch()));
      cycleCount += 2;
      break;

    case 0xB2: // CPL bit
    {
      uint8_t bitAddr = fetch();
      writeBit(bitAddr, !readBit(bitAddr));
      cycleCount += 1;
      break;
    }

    case 0xB3: // CPL C
      setCarryFlag(!getCarryFlag());
      cycleCount += 1;
      break;

    case 0xB4: // CJNE A, #data, rel
    {
      uint8_t data = fetch();
      int8_t offset = fetch();
      setCarryFlag(A < data);
      if (A != data) {
        PC += offset;
      }
      cycleCount += 2;
      break;
    }

    case 0xB5: // CJNE A, direct, rel
    {
      uint8_t data = readDataMemory(fetch());
      int8_t offset = fetch();
      setCarryFlag(A < data);
      if (A != data) {
        PC += offset;
      }
      cycleCount += 2;
      break;
    }

    case 0xB6: // CJNE @R0, #data, rel
    {
      uint8_t val = readDataMemory(readRegister(0));
      uint8_t data = fetch();
      int8_t offset = fetch();
      setCarryFlag(val < data);
      if (val != data) {
        PC += offset;
      }
      cycleCount += 2;
      break;
    }

    case 0xB7: // CJNE @R1, #data, rel
    {
      uint8_t val = readDataMemory(readRegister(1));
      uint8_t data = fetch();
      int8_t offset = fetch();
      setCarryFlag(val < data);
      if (val != data) {
        PC += offset;
      }
      cycleCount += 2;
      break;
    }

    case 0xB8:
    case 0xB9:
    case 0xBA:
    case 0xBB:
    case 0xBC:
    case 0xBD:
    case 0xBE:
    case 0xBF: // CJNE Rn, #data, rel
    {
      uint8_t val = readRegister(opcode & 0x07);
      uint8_t data = fetch();
      int8_t offset = fetch();
      setCarryFlag(val < data);
      if (val != data) {
        PC += offset;
      }
      cycleCount += 2;
      break;
    }

    // 0xCX - PUSH, CLR, SWAP, XCH variants
    case 0xC0: // PUSH direct
    {
      uint8_t addr = fetch();
      push(readDataMemory(addr));
      cycleCount += 2;
      break;
    }

    case 0xC2: // CLR bit
    {
      uint8_t bitAddr = fetch();
      writeBit(bitAddr, false);
      cycleCount += 1;
      break;
    }

    case 0xC3: // CLR C (Clear Carry)
      setCarryFlag(false);
      cycleCount += 1;
      break;

    case 0xC4: // SWAP A
      A = ((A & 0x0F) << 4) | ((A & 0xF0) >> 4);
      updateParity();
      cycleCount += 1;
      break;

    case 0xC5: // XCH A, direct
    {
      uint8_t addr = fetch();
      uint8_t temp = A;
      A = readDataMemory(addr);
      writeDataMemory(addr, temp);
      updateParity();
      cycleCount += 1;
      break;
    }

    case 0xC6: // XCH A, @R0
    {
      uint8_t temp = A;
      A = readDataMemory(readRegister(0));
      writeDataMemory(readRegister(0), temp);
      updateParity();
      cycleCount += 1;
      break;
    }

    case 0xC7: // XCH A, @R1
    {
      uint8_t temp = A;
      A = readDataMemory(readRegister(1));
      writeDataMemory(readRegister(1), temp);
      updateParity();
      cycleCount += 1;
      break;
    }

    case 0xC8:
    case 0xC9:
    case 0xCA:
    case 0xCB:
    case 0xCC:
    case 0xCD:
    case 0xCE:
    case 0xCF: // XCH A, Rn
    {
      uint8_t reg = opcode & 0x07;
      uint8_t temp = A;
      A = readRegister(reg);
      writeRegister(reg, temp);
      updateParity();
      cycleCount += 1;
      break;
    }

    case 0xD0: // POP direct
    {
      uint8_t addr = fetch();
      writeDataMemory(addr, pop());
      cycleCount += 2;
      break;
    }

    case 0xD2: // SETB bit
    {
      uint8_t bitAddr = fetch();
      writeBit(bitAddr, true);
      cycleCount += 1;
      break;
    }

    case 0xD3: // SETB C (Set Carry)
      setCarryFlag(true);
      cycleCount += 1;
      break;

    case 0xD4: // DA A (Decimal Adjust Accumulator)
    {
      // Decimal adjust after addition for BCD arithmetic
      uint8_t correction = 0;

      // Check lower nibble
      if ((A & 0x0F) > 9 || getAuxCarryFlag()) {
        correction += 0x06;
      }

      // Check upper nibble
      if (((A & 0xF0) >> 4) > 9 || getCarryFlag() ||
          (((A & 0xF0) >> 4) >= 9 && (A & 0x0F) > 9)) {
        correction += 0x60;
        setCarryFlag(true);
      }

      // Apply correction
      uint16_t result = A + correction;
      A = result & 0xFF;

      // Update flags
      if (result > 0xFF) {
        setCarryFlag(true);
      }
      updateParity();

      cycleCount += 1;
      break;
    }

    case 0xD5: // DJNZ direct, rel
    {
      uint8_t addr = fetch();
      int8_t offset = fetch();
      uint8_t value = readDataMemory(addr) - 1;
      writeDataMemory(addr, value);
      if (value != 0) {
        PC += offset;
      }
      cycleCount += 2;
      break;
    }

    case 0xD6: // XCHD A, @R0
    {
      uint8_t addr = readRegister(0);
      uint8_t temp = A & 0x0F;
      A = (A & 0xF0) | (readDataMemory(addr) & 0x0F);
      writeDataMemory(addr, (readDataMemory(addr) & 0xF0) | temp);
      updateParity();
      cycleCount += 1;
      break;
    }

    case 0xD7: // XCHD A, @R1
    {
      uint8_t addr = readRegister(1);
      uint8_t temp = A & 0x0F;
      A = (A & 0xF0) | (readDataMemory(addr) & 0x0F);
      writeDataMemory(addr, (readDataMemory(addr) & 0xF0) | temp);
      updateParity();
      cycleCount += 1;
      break;
    }

    case 0xD8:
    case 0xD9:
    case 0xDA:
    case 0xDB:
    case 0xDC:
    case 0xDD:
    case 0xDE:
    case 0xDF: // DJNZ Rn, rel
    {
      uint8_t reg = opcode & 0x07;
      int8_t offset = fetch();
      uint8_t val = readRegister(reg) - 1;
      writeRegister(reg, val);
      if (val != 0) {
        PC += offset;
      }
      cycleCount += 2;
      break;
    }

    // 0xEX - MOVX, CLR A, CPL A, MOV variants
    case 0xE0: // MOVX A, @DPTR
      A = readExternalRAM(DPTR);
      updateParity();
      cycleCount += 2;
      break;

    case 0xE2: // MOVX A, @R0
      A = readExternalRAM(readRegister(0));
      updateParity();
      cycleCount += 2;
      break;

    case 0xE3: // MOVX A, @R1
      A = readExternalRAM(readRegister(1));
      updateParity();
      cycleCount += 2;
      break;

    case 0xE4: // CLR A
      A = 0;
      updateParity();
      cycleCount += 1;
      break;

    case 0xE5: // MOV A, direct
    {
      uint8_t addr = fetch();
      A = readDataMemory(addr);
      updateParity();
      cycleCount += 1;
      break;
    }

    case 0xE6: // MOV A, @R0
      A = readDataMemory(readRegister(0));
      updateParity();
      cycleCount += 1;
      break;

    case 0xE7: // MOV A, @R1
      A = readDataMemory(readRegister(1));
      updateParity();
      cycleCount += 1;
      break;

    case 0xE8:
    case 0xE9:
    case 0xEA:
    case 0xEB:
    case 0xEC:
    case 0xED:
    case 0xEE:
    case 0xEF: // MOV A, Rn
      A = readRegister(opcode & 0x07);
      updateParity();
      cycleCount += 1;
      break;

    // 0xFX - MOVX, CPL A, MOV variants
    case 0xF0: // MOVX @DPTR, A
      writeExternalRAM(DPTR, A);
      cycleCount += 2;
      break;

    case 0xF2: // MOVX @R0, A
      writeExternalRAM(readRegister(0), A);
      cycleCount += 2;
      break;

    case 0xF3: // MOVX @R1, A
      writeExternalRAM(readRegister(1), A);
      cycleCount += 2;
      break;

    case 0xF4: // CPL A
      A = ~A;
      updateParity();
      cycleCount += 1;
      break;

    case 0xF5: // MOV direct, A
    {
      uint8_t addr = fetch();
      writeDataMemory(addr, A);
      cycleCount += 1;
      break;
    }

    case 0xF6: // MOV @R0, A
      writeDataMemory(readRegister(0), A);
      cycleCount += 1;
      break;

    case 0xF7: // MOV @R1, A
      writeDataMemory(readRegister(1), A);
      cycleCount += 1;
      break;

    case 0xF8:
    case 0xF9:
    case 0xFA:
    case 0xFB:
    case 0xFC:
    case 0xFD:
    case 0xFE:
    case 0xFF: // MOV Rn, A
      writeRegister(opcode & 0x07, A);
      cycleCount += 1;
      break;

    default:
      std::cerr << "Warning: Unimplemented opcode 0x" << std::hex
                << std::setw(2) << std::setfill('0') << (int)opcode
                << " at PC=0x" << std::setw(4) << (PC - 1) << std::dec
                << std::endl;
      cycleCount += 1;
      break;
    }
  }

  void run(uint64_t maxCycles = 0) {
    running = true;
    uint64_t startCycle = cycleCount;

    while (running) {
      executeInstruction();

      if (maxCycles > 0 && (cycleCount - startCycle) >= maxCycles) {
        break;
      }
    }
  }

  void step() { executeInstruction(); }

  void stop() { running = false; }

  // Register custom system call addresses
  void registerSystemCall(uint16_t address, const std::string &name) {
    if (name == "WRITE_TEXT") {
      systemCalls[address] = [this]() { syscall_WRITE_TEXT(); };
    } else if (name == "WRITE_DATA") {
      systemCalls[address] = [this]() { syscall_WRITE_DATA(); };
    } else if (name == "WRITE_HEX") {
      systemCalls[address] = [this]() { syscall_WRITE_HEX(); };
    } else if (name == "WRITE_INSTR") {
      systemCalls[address] = [this]() { syscall_WRITE_INSTR(); };
    } else if (name == "LCD_INIT") {
      systemCalls[address] = [this]() { syscall_LCD_INIT(); };
    } else if (name == "LCD_OFF") {
      systemCalls[address] = [this]() { syscall_LCD_OFF(); };
    } else if (name == "LCD_CLR") {
      systemCalls[address] = [this]() { syscall_LCD_CLR(); };
    } else if (name == "DELAY_US") {
      systemCalls[address] = [this]() { syscall_DELAY_US(); };
    } else if (name == "DELAY_MS") {
      systemCalls[address] = [this]() { syscall_DELAY_MS(); };
    } else if (name == "DELAY_100MS") {
      systemCalls[address] = [this]() { syscall_DELAY_100MS(); };
    } else if (name == "WAIT_ENTER") {
      systemCalls[address] = [this]() { syscall_WAIT_ENTER(); };
    } else if (name == "WAIT_ENTER_NW") {
      systemCalls[address] = [this]() { syscall_WAIT_ENTER_NW(); };
    } else if (name == "TEST_ENTER") {
      systemCalls[address] = [this]() { syscall_TEST_ENTER(); };
    } else if (name == "WAIT_ENT_ESC") {
      systemCalls[address] = [this]() { syscall_WAIT_ENT_ESC(); };
    } else if (name == "WAIT_KEY") {
      systemCalls[address] = [this]() { syscall_WAIT_KEY(); };
    } else if (name == "GET_NUM") {
      systemCalls[address] = [this]() { syscall_GET_NUM(); };
    } else if (name == "BCD_HEX") {
      systemCalls[address] = [this]() { syscall_BCD_HEX(); };
    } else if (name == "HEX_BCD") {
      systemCalls[address] = [this]() { syscall_HEX_BCD(); };
    } else if (name == "MUL_2_2") {
      systemCalls[address] = [this]() { syscall_MUL_2_2(); };
    } else if (name == "MUL_3_1") {
      systemCalls[address] = [this]() { syscall_MUL_3_1(); };
    } else if (name == "DIV_2_1") {
      systemCalls[address] = [this]() { syscall_DIV_2_1(); };
    } else if (name == "DIV_4_2") {
      systemCalls[address] = [this]() { syscall_DIV_4_2(); };
    }
    std::cout << "Registered system call '" << name << "' at 0x" << std::hex
              << std::setw(4) << std::setfill('0') << address << std::dec
              << std::endl;
  }

  // Debug and status methods
  void printStatus() const {
    std::cout << "\n=== 8051 CPU Status ===" << std::endl;
    std::cout << "PC:   0x" << std::hex << std::setw(4) << std::setfill('0')
              << PC << std::endl;
    std::cout << "SP:   0x" << std::setw(2) << (int)SP << std::endl;
    std::cout << "A:    0x" << std::setw(2) << (int)A << std::endl;
    std::cout << "B:    0x" << std::setw(2) << (int)B << std::endl;
    std::cout << "DPTR: 0x" << std::setw(4) << DPTR << std::endl;
    std::cout << "PSW:  0x" << std::setw(2) << (int)PSW
              << " [CY=" << getCarryFlag() << " AC=" << getAuxCarryFlag()
              << " OV=" << getOverflowFlag() << " P=" << getParityFlag() << "]"
              << std::endl;
    std::cout << "Cycles: " << std::dec << cycleCount << std::endl;
    std::cout << std::dec;
  }

  void dumpMemory(uint16_t start, uint16_t length,
                  bool isProgramMem = true) const {
    const uint8_t *mem = isProgramMem ? programMemory : dataMemory;
    uint32_t maxLen = isProgramMem ? 65536 : 256;

    std::cout << "\n=== Memory Dump ===" << std::endl;
    for (uint16_t i = 0; i < length && (start + i) < maxLen; i += 16) {
      std::cout << std::hex << std::setw(4) << std::setfill('0') << (start + i)
                << ": ";
      for (int j = 0; j < 16 && (i + j) < length; j++) {
        std::cout << std::setw(2) << (int)mem[start + i + j] << " ";
      }
      std::cout << std::endl;
    }
    std::cout << std::dec;
  }
};

extern "C" {

Intel8051 *emulator_create() { return new Intel8051(); }

void emulator_destroy(Intel8051 *cpu) { delete cpu; }

void emulator_reset(Intel8051 *cpu) {
  if (cpu) {
    cpu->reset();
  }
}

int emulator_load_hex_string(Intel8051 *cpu, const char *hexData) {
  if (!cpu || !hexData) {
    return 0;
  }
  return cpu->loadHexFromString(hexData) ? 1 : 0;
}

int emulator_load_hex_file(Intel8051 *cpu, const char *filename) {
  if (!cpu || !filename) {
    return 0;
  }
  return cpu->loadHexFile(filename) ? 1 : 0;
}

void emulator_set_output_options(Intel8051 *cpu, int capture, int mirror) {
  if (!cpu) {
    return;
  }
  cpu->setOutputOptions(capture != 0, mirror != 0);
}

size_t emulator_read_output(Intel8051 *cpu, char *buffer, size_t maxLen) {
  if (!cpu) {
    return 0;
  }
  return cpu->readOutput(buffer, maxLen);
}

size_t emulator_get_output_size(Intel8051 *cpu) {
  if (!cpu) {
    return 0;
  }
  return cpu->getOutputSize();
}

void emulator_clear_output(Intel8051 *cpu) {
  if (!cpu) {
    return;
  }
  cpu->clearOutputBuffer();
}

void emulator_push_input(Intel8051 *cpu, const char *text) {
  if (!cpu || !text) {
    return;
  }
  cpu->pushInput(text, std::strlen(text));
}

void emulator_push_input_len(Intel8051 *cpu, const char *data, size_t length) {
  if (!cpu || !data) {
    return;
  }
  cpu->pushInput(data, length);
}

void emulator_run_cycles(Intel8051 *cpu, uint32_t cycles) {
  if (!cpu) {
    return;
  }
  cpu->run(static_cast<uint64_t>(cycles));
}

void emulator_step(Intel8051 *cpu) {
  if (!cpu) {
    return;
  }
  cpu->step();
}

void emulator_stop(Intel8051 *cpu) {
  if (!cpu) {
    return;
  }
  cpu->stop();
}

int emulator_is_waiting(Intel8051 *cpu) {
  if (!cpu) {
    return 0;
  }
  return cpu->isWaitingForInput() ? 1 : 0;
}

int emulator_wait_reason(Intel8051 *cpu) {
  if (!cpu) {
    return 0;
  }
  return cpu->getWaitTypeCode();
}

void emulator_get_state(Intel8051 *cpu, EmulatorState *outState) {
  if (!cpu || !outState) {
    return;
  }
  cpu->getStateSnapshot(*outState);
}

size_t emulator_state_size() { return sizeof(EmulatorState); }

size_t emulator_state_offset(int field) {
  switch (field) {
  case 0:
    return offsetof(EmulatorState, cycles);
  case 1:
    return offsetof(EmulatorState, pc);
  case 2:
    return offsetof(EmulatorState, dptr);
  case 3:
    return offsetof(EmulatorState, sp);
  case 4:
    return offsetof(EmulatorState, a);
  case 5:
    return offsetof(EmulatorState, b);
  case 6:
    return offsetof(EmulatorState, psw);
  case 7:
    return offsetof(EmulatorState, p0);
  case 8:
    return offsetof(EmulatorState, p1);
  case 9:
    return offsetof(EmulatorState, p2);
  case 10:
    return offsetof(EmulatorState, p3);
  default:
    return static_cast<size_t>(-1);
  }
}

uint8_t emulator_read_byte(void *ptr, size_t offset) {
  if (!ptr) {
    return 0;
  }
  return static_cast<uint8_t *>(ptr)[offset];
}
}

#ifndef BUILDING_FOR_WASM
int main(int argc, char *argv[]) {
  std::cout << "8051 Emulator v1.0" << std::endl;
  std::cout << "==================" << std::endl;

  if (argc < 2) {
    std::cerr << "Usage: " << argv[0] << " <hexfile> [options]" << std::endl;
    std::cerr << "Options:" << std::endl;
    std::cerr << "  -s <cycles>  : Step through n cycles" << std::endl;
    std::cerr << "  -r <cycles>  : Run for n cycles (0 = run forever)"
              << std::endl;
    std::cerr << "  -d <addr> <len> : Dump memory from address for length bytes"
              << std::endl;
    return 1;
  }

  Intel8051 cpu;

  // Load HEX file
  if (!cpu.loadHexFile(argv[1])) {
    return 1;
  }

  // Process command line options
  bool autoRun = false;
  uint64_t runCycles = 1000000; // Default: 1 million cycles

  for (int i = 2; i < argc; i++) {
    std::string arg = argv[i];

    if (arg == "-r" && i + 1 < argc) {
      autoRun = true;
      runCycles = std::stoull(argv[++i]);
    } else if (arg == "-s" && i + 1 < argc) {
      uint64_t steps = std::stoull(argv[++i]);
      std::cout << "\nStepping through " << steps << " instructions..."
                << std::endl;
      for (uint64_t j = 0; j < steps; j++) {
        cpu.step();
        cpu.printStatus();
      }
    } else if (arg == "-d" && i + 2 < argc) {
      uint16_t addr = std::stoul(argv[++i], nullptr, 16);
      uint16_t len = std::stoul(argv[++i], nullptr, 10);
      cpu.dumpMemory(addr, len, true);
    }
  }

  if (autoRun) {
    std::cout << "\nRunning emulator for " << runCycles << " cycles..."
              << std::endl;
    cpu.run(runCycles);
    cpu.printStatus();
  } else {
    // Interactive mode¬
    std::cout << "\nEntering interactive mode. Commands:" << std::endl;
    std::cout << "  s [n]     - Step n instructions (default: 1)" << std::endl;
    std::cout << "  r [n]     - Run n cycles (default: 1000)" << std::endl;
    std::cout << "  p         - Print CPU status" << std::endl;
    std::cout << "  d <addr> <len> - Dump memory" << std::endl;
    std::cout << "  q         - Quit" << std::endl;

    std::string cmd;
    while (true) {
      std::cout << "\n> ";
      if (!std::getline(std::cin, cmd)) {
        break;
      }

      std::istringstream iss(cmd);
      std::string op;
      iss >> op;

      if (op == "q" || op == "quit") {
        break;
      } else if (op == "s" || op == "step") {
        int n = 1;
        iss >> n;
        for (int i = 0; i < n; i++) {
          cpu.step();
        }
        cpu.printStatus();
      } else if (op == "r" || op == "run") {
        uint64_t n = 1000;
        iss >> n;
        cpu.run(n);
        cpu.printStatus();
      } else if (op == "p" || op == "print") {
        cpu.printStatus();
      } else if (op == "d" || op == "dump") {
        std::string addrStr;
        int len;
        iss >> addrStr >> len;
        uint16_t addr = std::stoul(addrStr, nullptr, 16);
        cpu.dumpMemory(addr, len, true);
      } else if (!op.empty()) {
        std::cout << "Unknown command: " << op << std::endl;
      }
    }
  }

  std::cout << "\nEmulation complete." << std::endl;
  return 0;
}
#endif
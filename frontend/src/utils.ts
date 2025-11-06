export function setCookie(name: string, value: string, days: number = 365) {
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${encodeURIComponent(
    value
  )};expires=${expires.toUTCString()};path=/`;
}

export function getCookie(name: string): string | null {
  const nameEQ = name + "=";
  const ca = document.cookie.split(";");
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === " ") c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) {
      return decodeURIComponent(c.substring(nameEQ.length, c.length));
    }
  }
  return null;
}

export function generateIntelHexFromSegments(
  segments: { address: number; bytes: string[] }[]
): string {
  const lines: string[] = [];

  for (const segment of segments) {
    const bytes = segment.bytes;
    const address = segment.address;

    for (let i = 0; i < bytes.length; i += 16) {
      const chunk = bytes.slice(i, i + 16);
      const byteCount = chunk.length;
      const addr = address + i;
      const addrHigh = (addr >> 8) & 0xff;
      const addrLow = addr & 0xff;
      const recordType = 0x00;

      let record = "";
      record += byteCount.toString(16).padStart(2, "0").toUpperCase();
      record += addrHigh.toString(16).padStart(2, "0").toUpperCase();
      record += addrLow.toString(16).padStart(2, "0").toUpperCase();
      record += recordType.toString(16).padStart(2, "0").toUpperCase();
      record += chunk.join("").toUpperCase();

      let checksum = byteCount + addrHigh + addrLow + recordType;
      for (const byte of chunk) {
        checksum += parseInt(byte, 16);
      }
      checksum = (~checksum + 1) & 0xff;

      record += checksum.toString(16).padStart(2, "0").toUpperCase();
      lines.push(":" + record);
    }
  }

  lines.push(":00000001FF");

  return lines.join("\n");
}


export interface ScanResult {
  variables: Record<string, string>;
  propertyAccess: string[];
  waitForChild: string[];
}

export function scanCode(code: string): ScanResult {
  const result: ScanResult = {
    variables: {},
    propertyAccess: [],
    waitForChild: [],
  };

  const lines = code.split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();

    // local x = something
    const localMatch = line.match(
      /^local\s+([A-Za-z_]\w*)\s*=\s*(.+)$/
    );

    if (localMatch) {
      result.variables[localMatch[1]] = localMatch[2];
    }

    // :WaitForChild(
    if (line.includes(":WaitForChild(")) {
      result.waitForChild.push(line);
    }

    // object.property
    const accesses =
      line.match(/[A-Za-z_]\w*(?:\.[A-Za-z_]\w*)+/g);

    if (accesses) {
      result.propertyAccess.push(...accesses);
    }
  }

  return result;
}
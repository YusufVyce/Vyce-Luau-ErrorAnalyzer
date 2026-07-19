export interface ScanWarning {
  title: string;
  severity: "low" | "medium" | "high";
  message: string;
}

export function runScanRules(scan: {
  variables: Record<string, string>;
  propertyAccess: string[];
  waitForChild: string[];
}): ScanWarning[] {

  const warnings: ScanWarning[] = [];

  for (const access of scan.propertyAccess) {

    if (
      access.includes("leaderstats") &&
      scan.waitForChild.length === 0
    ) {

      warnings.push({
        title: "Leaderstats access",

        severity: "high",

        message:
          "leaderstats is accessed without WaitForChild(). Replication timing may cause nil."
      });

    }

  }

  return warnings;

}
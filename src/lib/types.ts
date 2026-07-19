export type Cause = {
  percent: number;
  text: string;
};

export type Warning = {
  title: string;
  description: string;
};

export type CodeInsight = {
  title: string;
  description: string;
};

export type DeprecatedApi = {
  api: string;
  replacement: string;
  reason: string;
};

export type Analysis = {
  explanation: string;
  causes: Cause[];
  fixes: string[];
  example?: string;

  severity?: "Low" | "Medium" | "High" | "Critical";

  confidence?: number;

  warnings?: Warning[];

  relatedErrors?: string[];

  preventionTips?: string[];

  codeInsights?: CodeInsight[];

  scanWarnings?: {
  title: string;
  severity: "low" | "medium" | "high";
  message: string;
}[];

  deprecatedApis?: DeprecatedApi[];

  performanceIssues?: {
    title: string;
    impact: "Low" | "Medium" | "High";
    description: string;
  }[];

  securityIssues?: {
    title: string;
    severity: "Low" | "Medium" | "High";
    description: string;
  }[];
};

export type ErrorEntry = {
  id: string;
  title: string;

  // Regex used for exact matching
  pattern: RegExp;

  // Used by the smart matcher
  keywords?: string[];

  // Alternative error message variations
  aliases?: string[];

  // Future ranking system
  priority?: number;

  // Future categorization
  category?:
    | "runtime"
    | "network"
    | "datastore"
    | "ui"
    | "performance"
    | "security";

  analyze: (logText: string, codeText: string) => Analysis;
};

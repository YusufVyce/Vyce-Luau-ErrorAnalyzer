import type { ExtractedContext, HighlightRange, SymbolRef } from "./types";

const SERVICE_RE = /game\s*:\s*GetService\s*\(\s*["']([A-Za-z0-9_]+)["']\s*\)/g;
const REQUIRE_RE = /require\s*\(([^)]+)\)/g;
const FUNCTION_RE = /function\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/g;
const METHOD_RE = /:([A-Za-z_][A-Za-z0-9_]*)\s*\(/g;
const LOCAL_VAR_RE = /local\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+)$/;
const API_RE = /(FireServer|FireClient|FireAllClients|InvokeServer|InvokeClient|OnServerEvent|OnClientEvent|OnServerInvoke|OnClientInvoke|GetAsync|SetAsync|UpdateAsync|WaitForChild|FindFirstChild|TweenService|Create|CharacterAdded|PlayerAdded|task\.spawn|task\.defer|coroutine\.|CollectionService|DataStoreService|HttpService|MessagingService|MemoryStoreService|PathfindingService|Raycast|TeleportService|MarketplaceService|GetAttribute|SetAttribute)/g;

function pushSymbol(store: SymbolRef[], symbol: SymbolRef) {
  if (store.some((item) => item.name === symbol.name && item.kind === symbol.kind && item.line === symbol.line)) {
    return;
  }
  store.push(symbol);
}

function findLineBySnippet(lines: string[], snippet: string): number | undefined {
  const index = lines.findIndex((line) => line.includes(snippet));
  return index >= 0 ? index + 1 : undefined;
}

function addHighlight(store: HighlightRange[], line: number, text: string, variable?: string, functionName?: string, property?: string) {
  if (!text.trim()) return;
  if (store.some((item) => item.line === line && item.text === text)) return;
  store.push({ line, text: text.trim(), variable, functionName, property });
}

export function extractContext(codeText: string, logText: string): ExtractedContext {
  const lines = codeText.split("\n");
  const symbols: SymbolRef[] = [];
  const highlights: HighlightRange[] = [];
  const variables: Record<string, string> = {};
  const functions: string[] = [];
  const methods: string[] = [];
  const requires: string[] = [];
  const services = new Set<string>();
  const apis = new Set<string>();
  const tweenGoals: Array<{ target: string; property: string; line: number }> = [];

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i] ?? "";
    const line = rawLine.trim();

    const localMatch = line.match(LOCAL_VAR_RE);
    if (localMatch) {
      variables[localMatch[1]] = localMatch[2];
      pushSymbol(symbols, { name: localMatch[1], kind: "variable", line: i + 1 });
    }

    for (const fn of line.matchAll(FUNCTION_RE)) {
      const functionName = fn[1];
      functions.push(functionName);
      pushSymbol(symbols, { name: functionName, kind: "function", line: i + 1 });
      addHighlight(highlights, i + 1, rawLine, undefined, functionName);
    }

    for (const method of line.matchAll(METHOD_RE)) {
      methods.push(method[1]);
      pushSymbol(symbols, { name: method[1], kind: "method", line: i + 1 });
    }

    for (const api of line.matchAll(API_RE)) {
      apis.add(api[1]);
      pushSymbol(symbols, { name: api[1], kind: "api", line: i + 1 });
      addHighlight(highlights, i + 1, rawLine);
    }

    if (line.includes("TweenService:Create")) {
      const tweenMatch = line.match(/TweenService\s*:\s*Create\s*\(\s*([^,]+),\s*[^,]+,\s*\{([^}]*)\}/);
      if (tweenMatch) {
        const target = tweenMatch[1].trim();
        const goalsChunk = tweenMatch[2];
        const properties = goalsChunk.split(",").map((chunk) => chunk.split("=")[0]?.trim()).filter(Boolean) as string[];
        for (const property of properties) {
          tweenGoals.push({ target, property, line: i + 1 });
          pushSymbol(symbols, { name: property, kind: "property", line: i + 1 });
          addHighlight(highlights, i + 1, rawLine, target, undefined, property);
        }
      }
    }
  }

  for (const match of codeText.matchAll(SERVICE_RE)) {
    services.add(match[1]);
    pushSymbol(symbols, { name: match[1], kind: "service", line: findLineBySnippet(lines, match[0]) });
  }

  for (const match of codeText.matchAll(REQUIRE_RE)) {
    requires.push(match[1].trim());
    const line = findLineBySnippet(lines, match[0]);
    pushSymbol(symbols, { name: match[1].trim(), kind: "api", line });
    if (line) addHighlight(highlights, line, lines[line - 1] ?? "");
  }

  const isServerByLog = /(serverscriptservice|server script|script\.)/i.test(logText);
  const isClientByLog = /(localscript|starterplayer|startergui|playergui)/i.test(logText);
  const isServerByCode = /(OnServerEvent|OnServerInvoke|DataStoreService|MessagingService|MemoryStoreService)/.test(codeText);
  const isClientByCode = /(LocalPlayer|OnClientEvent|OnClientInvoke|UserInputService)/.test(codeText);

  const remoteClientApis = /(FireServer|InvokeServer)/.test(codeText);
  const remoteServerApis = /(FireClient|FireAllClients|InvokeClient)/.test(codeText);

  const side: ExtractedContext["side"] =
    isServerByLog || isServerByCode
      ? "server"
      : isClientByLog || isClientByCode
        ? "client"
        : "unknown";

  const logProperty = logText.match(/with\s+['"]([^'"]+)['"]/i)?.[1];
  if (logProperty) {
    const propertyLine = lines.findIndex((line) => line.includes(logProperty));
    if (propertyLine >= 0) {
      addHighlight(highlights, propertyLine + 1, lines[propertyLine] ?? "", undefined, undefined, logProperty);
    }
  }

  return {
    symbols,
    highlights,
    variables,
    functions,
    methods,
    requires,
    services: [...services],
    apis: [...apis],
    side,
    hasPcall: /pcall\s*\(/.test(codeText),
    hasXpcall: /xpcall\s*\(/.test(codeText),
    hasWaitForChild: /:WaitForChild\s*\(/.test(codeText),
    hasFindFirstChild: /:FindFirstChild/.test(codeText),
    hasCharacterAdded: /CharacterAdded/.test(codeText),
    hasPlayerAdded: /PlayerAdded/.test(codeText),
    hasTaskSpawn: /task\.spawn\s*\(/.test(codeText),
    hasTaskDefer: /task\.defer\s*\(/.test(codeText),
    hasCoroutine: /coroutine\./.test(codeText),
    hasLoops: /(for\s+.+\s+do|while\s+.+\s+do|repeat\s+)/.test(codeText),
    hasRecursiveFunction: functions.some((name) => {
      const bodyRe = new RegExp(`function\\s+${name}\\s*\\([^)]*\\)([\\s\\S]*?)end`, "m");
      const body = codeText.match(bodyRe)?.[1] ?? "";
      return new RegExp(`\\b${name}\\s*\\(`).test(body);
    }),
    hasRemoteUse: remoteClientApis || remoteServerApis,
    hasTweenUse: /TweenService\s*:\s*Create/.test(codeText),
    hasDataStoreUse: /(GetAsync|SetAsync|UpdateAsync)\s*\(/.test(codeText),
    tweenGoals,
  };
}

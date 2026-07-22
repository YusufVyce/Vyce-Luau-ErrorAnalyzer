import type {
  AssignmentStatement,
  CallExpression,
  Expression,
  ForGenericStatement,
  ForNumericStatement,
  FunctionDeclarationStatement,
  FunctionExpression,
  Identifier,
  IfStatement,
  LocalDeclarationStatement,
  MemberExpression,
  Program,
  RepeatUntilStatement,
  ReturnStatement,
  Statement,
  TableConstructorExpression,
  TypeAliasStatement,
  WhileStatement,
} from "./ast";
import type {
  ExtractedContext,
  FlowTrace,
  HighlightRange,
  RuntimeState,
  RuntimeStateSnapshot,
  SymbolRef,
} from "../types";

interface SemanticState {
  symbols: SymbolRef[];
  highlights: HighlightRange[];
  variables: Record<string, string>;
  runtimeStates: Map<string, RuntimeStateSnapshot>;
  flowTraces: FlowTrace[];
  functions: string[];
  methods: string[];
  requires: string[];
  services: Set<string>;
  apis: Set<string>;
  tweenGoals: Array<{ target: string; property: string; line: number }>;
  hasPcall: boolean;
  hasXpcall: boolean;
  hasWaitForChild: boolean;
  hasWaitForChildTimeout: boolean;
  hasFindFirstChild: boolean;
  hasCharacterAdded: boolean;
  hasPlayerAdded: boolean;
  hasTaskSpawn: boolean;
  hasTaskDefer: boolean;
  hasCoroutine: boolean;
  hasLoops: boolean;
  hasRecursiveFunction: boolean;
  hasRemoteUse: boolean;
  hasTweenUse: boolean;
  hasDataStoreUse: boolean;
  hasCharacterPropertyAccessWithoutSync: boolean;
  moduleExports: string[];
  requireChains: string[][];
  aliasToService: Map<string, string>;
  typeAliases: string[];
  functionReturnStates: Map<string, RuntimeState>;
}

function pushUnique(list: string[], value: string) {
  if (!list.includes(value)) list.push(value);
}

function inferRoleFromName(name: string): string {
  const lowered = name.toLowerCase();
  if (/(^|_|\b)(player|localplayer|plr)(_|\b|$)/.test(lowered)) return "Player";
  if (/(^|_|\b)(character|char)(_|\b|$)/.test(lowered)) return "Character";
  if (/(^|_|\b)(profile)(_|\b|$)/.test(lowered)) return "Profile";
  if (/(^|_|\b)(inventory|inv|bag)(_|\b|$)/.test(lowered)) return "Inventory";
  if (/(^|_|\b)(module|mod)(_|\b|$)/.test(lowered)) return "Module";
  if (/(^|_|\b)(instance|inst|obj|part|gui|frame|model|tool)(_|\b|$)/.test(lowered)) return "Instance";
  if (/(^|_|\b)(remote|event|rf|re)(_|\b|$)/.test(lowered)) return "Remote";
  if (/(^|_|\b)(humanoid|animator)(_|\b|$)/.test(lowered)) return "Humanoid";
  return "Unknown";
}

function inferRuntimeStateFromExpression(
  expression: Expression | undefined,
  state: SemanticState,
  currentFunction: string | null,
): { state: RuntimeState; evidence: string; confidence: number } {
  if (!expression) {
    return { state: "Uninitialized", evidence: "No initializer was provided", confidence: 40 };
  }

  switch (expression.kind) {
    case "NilLiteral":
      return { state: "Uninitialized", evidence: "Assigned nil", confidence: 95 };
    case "StringLiteral":
    case "NumberLiteral":
    case "BooleanLiteral":
      return { state: "Loaded", evidence: "Assigned concrete literal value", confidence: 60 };
    case "Identifier": {
      const source = state.runtimeStates.get(expression.name);
      if (source) {
        return {
          state: source.state,
          evidence: `Propagated from ${expression.name}`,
          confidence: Math.max(55, source.confidence - 5),
        };
      }
      return { state: "Unknown", evidence: `Copied from ${expression.name}`, confidence: 45 };
    }
    case "CallExpression": {
      const info = getCallInfo(expression);
      const calleePath = info.calleePath ?? "";
      const methodName = info.methodName ?? "";

      if (calleePath === "require") {
        return { state: "Loaded", evidence: "Module required successfully", confidence: 90 };
      }

      if (calleePath === "game.GetService" || calleePath.endsWith("GetService")) {
        return { state: "Loaded", evidence: "Service resolved through GetService", confidence: 88 };
      }

      if (methodName === "WaitForChild") {
        return { state: "Loaded", evidence: "WaitForChild resolves the dependency before use", confidence: 84 };
      }

      if (methodName === "FindFirstChild" || methodName === "FindFirstChildOfClass") {
        return { state: "Missing", evidence: "FindFirstChild-style lookup can miss the target", confidence: 86 };
      }

      if (methodName === "Destroy") {
        return { state: "Destroyed", evidence: "Instance was explicitly destroyed", confidence: 92 };
      }

      if (currentFunction && state.functionReturnStates.has(calleePath || currentFunction)) {
        const returned = state.functionReturnStates.get(calleePath || currentFunction);
        if (returned) {
          return {
            state: returned,
            evidence: `Inherited return state from ${calleePath || currentFunction}`,
            confidence: 70,
          };
        }
      }

      return { state: "Unknown", evidence: `Result of ${calleePath || "call"}`, confidence: 50 };
    }
    case "MemberExpression": {
      const rootPath = flattenMemberPath(expression);
      if (rootPath?.includes(".Character")) {
        return { state: "Missing", evidence: "Character path is accessed directly", confidence: 72 };
      }
      return { state: "Unknown", evidence: `Read from ${expression.property.name}`, confidence: 40 };
    }
    default:
      return { state: "Unknown", evidence: "Expression state could not be determined", confidence: 35 };
  }
}

function recordRuntimeState(
  state: SemanticState,
  name: string,
  line: number | undefined,
  runtimeState: RuntimeState,
  confidence: number,
  evidence: string,
  note?: string,
): void {
  const role = inferRoleFromName(name);
  const current = state.runtimeStates.get(name);
  const nextConfidence = current ? Math.max(current.confidence, confidence) : confidence;
  const nextState = current && current.confidence > confidence ? current.state : runtimeState;
  const nextEvidence = current ? [...new Set([...current.evidence, evidence])] : [evidence];

  state.runtimeStates.set(name, {
    name,
    role,
    state: nextState,
    confidence: nextConfidence,
    evidence: nextEvidence,
    line,
    note,
  });
}

function recordFlowTrace(
  state: SemanticState,
  target: string,
  source: string,
  line: number | undefined,
  reason: string,
  confidence: number,
): void {
  state.flowTraces.push({ target, source, line, reason, confidence });
}

const REMOTE_APIS = new Set([
  "FireServer",
  "FireClient",
  "FireAllClients",
  "InvokeServer",
  "InvokeClient",
  "OnServerEvent",
  "OnClientEvent",
  "OnServerInvoke",
  "OnClientInvoke",
]);

const KNOWN_APIS = new Set([
  ...REMOTE_APIS,
  "GetAsync",
  "SetAsync",
  "UpdateAsync",
  "WaitForChild",
  "FindFirstChild",
  "Create",
  "CharacterAdded",
  "PlayerAdded",
  "GetAttribute",
  "SetAttribute",
  "GetAttributes",
  "Bindables",
  "Connect",
  "Disconnect",
  "PublishAsync",
  "SubscribeAsync",
  "Raycast",
  "TeleportAsync",
  "PromptProductPurchase",
  "LoadAnimation",
]);

function addSymbol(state: SemanticState, symbol: SymbolRef) {
  if (state.symbols.some((item) => item.name === symbol.name && item.kind === symbol.kind && item.line === symbol.line)) {
    return;
  }
  state.symbols.push(symbol);
}

function addHighlight(state: SemanticState, lines: string[], line: number, variable?: string, functionName?: string, property?: string) {
  const text = lines[line - 1]?.trim() ?? "";
  if (!text) return;
  const existing = state.highlights.find((item) => item.line === line && item.text === text);
  if (existing) {
    if (!existing.variable && variable) existing.variable = variable;
    if (!existing.functionName && functionName) existing.functionName = functionName;
    if (!existing.property && property) existing.property = property;
    return;
  }
  state.highlights.push({ line, text, variable, functionName, property });
}

function expressionToText(expression: Expression): string {
  switch (expression.kind) {
    case "Identifier":
      return expression.name;
    case "StringLiteral":
      return `\"${expression.value}\"`;
    case "NumberLiteral":
      return expression.raw;
    case "BooleanLiteral":
      return expression.value ? "true" : "false";
    case "NilLiteral":
      return "nil";
    case "VarargLiteral":
      return "...";
    case "UnaryExpression":
      return `${expression.operator} ${expressionToText(expression.argument)}`;
    case "BinaryExpression":
      return `${expressionToText(expression.left)} ${expression.operator} ${expressionToText(expression.right)}`;
    case "MemberExpression":
      return `${expressionToText(expression.object)}.${expression.property.name}`;
    case "IndexExpression":
      return `${expressionToText(expression.object)}[${expressionToText(expression.index)}]`;
    case "CallExpression": {
      const callee = expressionToText(expression.callee);
      const args = expression.args.map(expressionToText).join(", ");
      if (expression.methodName) {
        return `${callee}:${expression.methodName.name}(${args})`;
      }
      return `${callee}(${args})`;
    }
    case "TableConstructorExpression":
      return "{...}";
    case "FunctionExpression":
      return "function(...) ... end";
    default:
      return "<expr>";
  }
}

function flattenMemberPath(expr: Expression): string | null {
  if (expr.kind === "Identifier") return expr.name;
  if (expr.kind === "MemberExpression") {
    const parent = flattenMemberPath(expr.object);
    if (!parent) return null;
    return `${parent}.${expr.property.name}`;
  }
  return null;
}

function getCallInfo(call: CallExpression): { calleePath: string | null; methodName?: string } {
  return {
    calleePath: flattenMemberPath(call.callee),
    methodName: call.methodName?.name,
  };
}

function inferServiceFromGetService(call: CallExpression): string | null {
  if (!call.methodName || call.methodName.name !== "GetService") return null;
  const first = call.args[0];
  if (!first || first.kind !== "StringLiteral") return null;
  const calleePath = flattenMemberPath(call.callee);
  if (calleePath !== "game") return null;
  return first.value;
}

function visitExpression(
  expression: Expression,
  state: SemanticState,
  lines: string[],
  currentFunction: string | null,
): void {
  switch (expression.kind) {
    case "Identifier": {
      addSymbol(state, {
        name: expression.name,
        kind: "variable",
        line: expression.range.start.line,
      });
      if (expression.name === "LocalPlayer") {
        state.apis.add("LocalPlayer");
      }
      return;
    }
    case "MemberExpression": {
      addSymbol(state, {
        name: expression.property.name,
        kind: "property",
        line: expression.range.start.line,
      });
      addHighlight(state, lines, expression.range.start.line, undefined, undefined, expression.property.name);

      if (expression.property.name === "CharacterAdded") state.hasCharacterAdded = true;
      if (expression.property.name === "PlayerAdded") state.hasPlayerAdded = true;
      if (KNOWN_APIS.has(expression.property.name)) {
        state.apis.add(expression.property.name);
      }

      const rootPath = flattenMemberPath(expression);
      if (rootPath?.includes(".Character.")) {
        state.hasCharacterPropertyAccessWithoutSync = true;
      }

      visitExpression(expression.object, state, lines, currentFunction);
      return;
    }
    case "IndexExpression": {
      visitExpression(expression.object, state, lines, currentFunction);
      visitExpression(expression.index, state, lines, currentFunction);
      return;
    }
    case "UnaryExpression": {
      visitExpression(expression.argument, state, lines, currentFunction);
      return;
    }
    case "BinaryExpression": {
      visitExpression(expression.left, state, lines, currentFunction);
      visitExpression(expression.right, state, lines, currentFunction);
      return;
    }
    case "FunctionExpression": {
      for (const stmt of expression.body) {
        visitStatement(stmt, state, lines, currentFunction);
      }
      return;
    }
    case "TableConstructorExpression": {
      for (const field of expression.fields) {
        if (field.key) visitExpression(field.key, state, lines, currentFunction);
        visitExpression(field.value, state, lines, currentFunction);
      }
      return;
    }
    case "CallExpression": {
      const info = getCallInfo(expression);
      if (info.calleePath) {
        const calleeTail = info.calleePath.split(".").pop();
        if (calleeTail && KNOWN_APIS.has(calleeTail)) {
          state.apis.add(calleeTail);
        }
      }

      if (info.methodName) {
        state.apis.add(info.methodName);
        pushUnique(state.methods, info.methodName);
      }

      const service = inferServiceFromGetService(expression);
      if (service) {
        state.services.add(service);
      }

      if (info.calleePath === "pcall") state.hasPcall = true;
      if (info.calleePath === "xpcall") state.hasXpcall = true;

      if (info.calleePath === "task.spawn") state.hasTaskSpawn = true;
      if (info.calleePath === "task.defer") state.hasTaskDefer = true;
      if ((info.calleePath ?? "").startsWith("coroutine.")) state.hasCoroutine = true;

      if (info.methodName === "WaitForChild") {
        state.hasWaitForChild = true;
        if (expression.args.length >= 2) state.hasWaitForChildTimeout = true;
      }
      if (info.methodName === "FindFirstChild") state.hasFindFirstChild = true;

      if ((info.methodName && REMOTE_APIS.has(info.methodName)) || (info.calleePath && REMOTE_APIS.has(info.calleePath))) {
        state.hasRemoteUse = true;
      }

      if (info.methodName === "Destroy") {
        const destroyTarget = expression.callee.kind === "MemberExpression" ? flattenMemberPath(expression.callee.object) : null;
        if (destroyTarget) {
          const simpleName = destroyTarget.split(".").pop() ?? destroyTarget;
          recordRuntimeState(state, simpleName, expression.range.start.line, "Destroyed", 92, "Destroy() was called on the instance", "Destroyed instance");
          recordFlowTrace(state, simpleName, `${destroyTarget}:Destroy()`, expression.range.start.line, "Explicit destruction invalidated the reference", 92);
        }
      }

      if (info.methodName === "Create" || info.calleePath?.endsWith("TweenService")) {
        const calleePath = flattenMemberPath(expression.callee) ?? "";
        const isTweenCreate =
          info.methodName === "Create" &&
          (calleePath.includes("TweenService") || state.aliasToService.get(calleePath) === "TweenService");

        if (isTweenCreate) {
          state.hasTweenUse = true;
          const targetExpr = expression.args[0];
          const goalsExpr = expression.args[2];
          if (goalsExpr && goalsExpr.kind === "TableConstructorExpression") {
            for (const field of goalsExpr.fields) {
              if (!field.key || field.key.kind !== "Identifier") continue;
              state.tweenGoals.push({
                target: targetExpr ? expressionToText(targetExpr) : "<unknown>",
                property: field.key.name,
                line: goalsExpr.range.start.line,
              });
            }
          }
        }
      }

      if (info.methodName && ["GetAsync", "SetAsync", "UpdateAsync"].includes(info.methodName)) {
        state.hasDataStoreUse = true;
      }

      if (currentFunction && info.calleePath === currentFunction) {
        state.hasRecursiveFunction = true;
      }

      if (info.methodName) {
        addSymbol(state, {
          name: info.methodName,
          kind: "method",
          line: expression.range.start.line,
        });
      }

      addHighlight(state, lines, expression.range.start.line);
      visitExpression(expression.callee, state, lines, currentFunction);
      for (const arg of expression.args) {
        visitExpression(arg, state, lines, currentFunction);
      }
      return;
    }
    default:
      return;
  }
}

function visitStatement(
  statement: Statement,
  state: SemanticState,
  lines: string[],
  currentFunction: string | null,
): void {
  switch (statement.kind) {
    case "LocalDeclarationStatement": {
      for (let i = 0; i < statement.names.length; i++) {
        const name = statement.names[i];
        const value = statement.values[i];
        const valueText = value ? expressionToText(value) : "";
        state.variables[name.name] = valueText;
        addSymbol(state, {
          name: name.name,
          kind: "variable",
          line: name.range.start.line,
        });
        addHighlight(state, lines, name.range.start.line, name.name);

        if (value?.kind === "CallExpression") {
          const service = inferServiceFromGetService(value);
          if (service) {
            state.services.add(service);
            state.aliasToService.set(name.name, service);
          }

          const callInfo = getCallInfo(value);
          if (callInfo.calleePath === "require" && value.args[0]) {
            const req = expressionToText(value.args[0]);
            state.requires.push(req);
            state.requireChains.push([name.name, req]);
          }
        }

        const inferred = inferRuntimeStateFromExpression(value, state, currentFunction);
        recordRuntimeState(state, name.name, name.range.start.line, inferred.state, inferred.confidence, inferred.evidence);

        if (value?.kind === "CallExpression") {
          const callInfo = getCallInfo(value);
          const source = callInfo.methodName ? `${callInfo.calleePath ?? "call"}:${callInfo.methodName}` : callInfo.calleePath ?? "call";
          recordFlowTrace(state, name.name, source, name.range.start.line, inferred.evidence, inferred.confidence);
        }

        if (name.typeAnnotation) {
          state.typeAliases.push(name.typeAnnotation.raw);
        }
      }

      for (const value of statement.values) {
        visitExpression(value, state, lines, currentFunction);
      }
      return;
    }
    case "AssignmentStatement": {
      const assignment = statement as AssignmentStatement;
      for (let i = 0; i < assignment.targets.length; i++) {
        const target = assignment.targets[i];
        const value = assignment.values[i];
        if (target.kind === "Identifier") {
          state.variables[target.name] = value ? expressionToText(value) : "";
          const inferred = inferRuntimeStateFromExpression(value, state, currentFunction);
          recordRuntimeState(state, target.name, target.range.start.line, inferred.state, inferred.confidence, inferred.evidence);

          if (value?.kind === "Identifier") {
            recordFlowTrace(state, target.name, value.name, target.range.start.line, `Value propagated from ${value.name}`, inferred.confidence);
          }

          if (value?.kind === "CallExpression") {
            const callInfo = getCallInfo(value);
            const source = callInfo.methodName ? `${callInfo.calleePath ?? "call"}:${callInfo.methodName}` : callInfo.calleePath ?? "call";
            recordFlowTrace(state, target.name, source, target.range.start.line, inferred.evidence, inferred.confidence);
          }
        } else if (target.kind === "MemberExpression" && target.property.name === "Parent" && value?.kind === "NilLiteral") {
          const owner = flattenMemberPath(target.object);
          if (owner) {
            const instanceName = owner.split(".").pop() ?? owner;
            recordRuntimeState(state, instanceName, target.range.start.line, "Destroyed", 90, "Parent was set to nil", "Instance was detached or destroyed");
            recordFlowTrace(state, instanceName, owner, target.range.start.line, "Parent nil assignment destroyed the reference", 90);
          }
        }
      }
      for (const target of assignment.targets) visitExpression(target, state, lines, currentFunction);
      for (const value of assignment.values) visitExpression(value, state, lines, currentFunction);
      return;
    }
    case "FunctionDeclarationStatement": {
      const fn = statement as FunctionDeclarationStatement;
      const functionNameText = expressionToText(fn.name);
      state.functions.push(functionNameText);
      if (fn.name.kind === "MemberExpression") {
        pushUnique(state.methods, fn.name.property.name);
      }
      addSymbol(state, {
        name: functionNameText,
        kind: "function",
        line: fn.range.start.line,
      });
      addHighlight(state, lines, fn.range.start.line, undefined, functionNameText);

      for (const param of fn.params) {
        if (param.typeAnnotation) {
          state.typeAliases.push(param.typeAnnotation.raw);
        }
      }
      if (fn.returnType) {
        state.typeAliases.push(fn.returnType.raw);
      }

      for (const stmt of fn.body) {
        visitStatement(stmt, state, lines, functionNameText);
      }
      return;
    }
    case "CallStatement": {
      visitExpression(statement.expression, state, lines, currentFunction);
      return;
    }
    case "ReturnStatement": {
      const ret = statement as ReturnStatement;
      if (ret.values.length > 0 && currentFunction === null) {
        state.moduleExports.push(expressionToText(ret.values[0]));
      }
      if (currentFunction && ret.values.length > 0) {
        const inferred = inferRuntimeStateFromExpression(ret.values[0], state, currentFunction);
        state.functionReturnStates.set(currentFunction, inferred.state);
      }
      for (const value of ret.values) visitExpression(value, state, lines, currentFunction);
      return;
    }
    case "IfStatement": {
      const ifStatement = statement as IfStatement;
      for (const clause of ifStatement.clauses) {
        if (clause.condition) visitExpression(clause.condition, state, lines, currentFunction);
        for (const stmt of clause.body) visitStatement(stmt, state, lines, currentFunction);
      }
      return;
    }
    case "WhileStatement": {
      state.hasLoops = true;
      const whileStmt = statement as WhileStatement;
      visitExpression(whileStmt.condition, state, lines, currentFunction);
      for (const stmt of whileStmt.body) visitStatement(stmt, state, lines, currentFunction);
      return;
    }
    case "RepeatUntilStatement": {
      state.hasLoops = true;
      const repeatStmt = statement as RepeatUntilStatement;
      for (const stmt of repeatStmt.body) visitStatement(stmt, state, lines, currentFunction);
      visitExpression(repeatStmt.condition, state, lines, currentFunction);
      return;
    }
    case "ForNumericStatement": {
      state.hasLoops = true;
      const forStmt = statement as ForNumericStatement;
      visitExpression(forStmt.start, state, lines, currentFunction);
      visitExpression(forStmt.endExpr, state, lines, currentFunction);
      if (forStmt.step) visitExpression(forStmt.step, state, lines, currentFunction);
      for (const stmt of forStmt.body) visitStatement(stmt, state, lines, currentFunction);
      return;
    }
    case "ForGenericStatement": {
      state.hasLoops = true;
      const forStmt = statement as ForGenericStatement;
      for (const iter of forStmt.iterators) visitExpression(iter, state, lines, currentFunction);
      for (const stmt of forStmt.body) visitStatement(stmt, state, lines, currentFunction);
      return;
    }
    case "TypeAliasStatement": {
      const typeStmt = statement as TypeAliasStatement;
      state.typeAliases.push(typeStmt.name.name);
      state.typeAliases.push(typeStmt.definition.raw);
      return;
    }
    case "BreakStatement":
    case "ContinueStatement":
      return;
    default:
      return;
  }
}

export function analyzeLuauSemantics(ast: Program, codeText: string, logText: string): ExtractedContext {
  const lines = codeText.split(/\r?\n/);
  const state: SemanticState = {
    symbols: [],
    highlights: [],
    variables: {},
    runtimeStates: new Map(),
    flowTraces: [],
    functions: [],
    methods: [],
    requires: [],
    services: new Set(),
    apis: new Set(),
    tweenGoals: [],
    hasPcall: false,
    hasXpcall: false,
    hasWaitForChild: false,
    hasWaitForChildTimeout: false,
    hasFindFirstChild: false,
    hasCharacterAdded: false,
    hasPlayerAdded: false,
    hasTaskSpawn: false,
    hasTaskDefer: false,
    hasCoroutine: false,
    hasLoops: false,
    hasRecursiveFunction: false,
    hasRemoteUse: false,
    hasTweenUse: false,
    hasDataStoreUse: false,
    hasCharacterPropertyAccessWithoutSync: false,
    moduleExports: [],
    requireChains: [],
    aliasToService: new Map(),
    typeAliases: [],
    functionReturnStates: new Map(),
  };

  for (const stmt of ast.body) {
    visitStatement(stmt, state, lines, null);
  }

  const isServerByLog = /(serverscriptservice|server script|script\.)/i.test(logText);
  const isClientByLog = /(localscript|starterplayer|startergui|playergui)/i.test(logText);

  const hasServerCodeSignals =
    state.services.has("DataStoreService") ||
    state.services.has("MessagingService") ||
    state.services.has("MemoryStoreService") ||
    [...state.apis].some((api) => api.startsWith("OnServer") || api === "FireClient" || api === "FireAllClients");

  const hasClientCodeSignals =
    [...state.apis].includes("LocalPlayer") ||
    [...state.apis].some((api) => api.startsWith("OnClient") || api === "FireServer" || api === "InvokeServer");

  const side: ExtractedContext["side"] =
    isServerByLog || hasServerCodeSignals
      ? "server"
      : isClientByLog || hasClientCodeSignals
        ? "client"
        : "unknown";

  return {
    symbols: state.symbols,
    highlights: state.highlights,
    variables: state.variables,
    functions: state.functions,
    methods: state.methods,
    requires: state.requires,
    services: [...state.services],
    apis: [...state.apis],
    side,
    hasPcall: state.hasPcall,
    hasXpcall: state.hasXpcall,
    hasWaitForChild: state.hasWaitForChild,
    hasWaitForChildTimeout: state.hasWaitForChildTimeout,
    hasFindFirstChild: state.hasFindFirstChild,
    hasCharacterAdded: state.hasCharacterAdded,
    hasPlayerAdded: state.hasPlayerAdded,
    hasTaskSpawn: state.hasTaskSpawn,
    hasTaskDefer: state.hasTaskDefer,
    hasCoroutine: state.hasCoroutine,
    hasLoops: state.hasLoops,
    hasRecursiveFunction: state.hasRecursiveFunction,
    hasRemoteUse: state.hasRemoteUse,
    hasTweenUse: state.hasTweenUse,
    hasDataStoreUse: state.hasDataStoreUse,
    hasCharacterPropertyAccessWithoutSync: state.hasCharacterPropertyAccessWithoutSync,
    tweenGoals: state.tweenGoals,
    runtimeStates: [...state.runtimeStates.values()].sort((a, b) => b.confidence - a.confidence),
    flowTraces: state.flowTraces,
    moduleExports: state.moduleExports,
    requireChains: state.requireChains,
    ast,
    parserDiagnostics: [],
  };
}

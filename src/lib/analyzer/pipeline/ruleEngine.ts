import { ROBLOX_DIAGNOSTIC_KNOWLEDGE_BASE } from "./knowledgeBase";
import type {
  ClassifiedError,
  CauseChain,
  CauseLevel,
  Evidence,
  ExtractedContext,
  FlowTrace,
  RuleSignal,
  Severity,
  TokenizedInput,
  RuntimeStateSnapshot,
} from "./types";

function mkEvidence(
  id: string,
  message: string,
  score: number,
  line?: number,
  source?: Evidence["source"],
  layer?: Evidence["layer"],
): Evidence {
  return { id, message, score, line, source, layer };
}

function severityFromScore(score: number): Severity {
  if (score >= 80) return "Critical";
  if (score >= 60) return "High";
  if (score >= 35) return "Medium";
  return "Low";
}

function level(title: string, description: string, evidence: Evidence[], confidence: number): CauseLevel {
  return { title, description, evidence, confidence };
}

function composeCauseChain(primary: CauseLevel, intermediates: CauseLevel[], surface: CauseLevel): CauseChain {
  return { primaryCause: primary, intermediateCauses: intermediates, surfaceError: surface };
}

function composeRootCauseText(chain: CauseChain): string {
  const intermediate = chain.intermediateCauses.map((item) => item.description).join(" -> ") || "No intermediate propagation was confirmed";
  return [
    `Primary Cause: ${chain.primaryCause.description}`,
    `Intermediate Cause(s): ${intermediate}`,
    `Surface Error: ${chain.surfaceError.description}`,
  ].join(" ");
}

function findState(context: ExtractedContext, names: string[], desiredStates?: RuntimeStateSnapshot["state"][]): RuntimeStateSnapshot | undefined {
  return context.runtimeStates.find((item) => {
    const lowered = `${item.name} ${item.role}`.toLowerCase();
    const nameMatch = names.some((name) => lowered.includes(name.toLowerCase()));
    return nameMatch && (!desiredStates || desiredStates.includes(item.state));
  });
}

function findTrace(context: ExtractedContext, predicate: (trace: FlowTrace) => boolean): FlowTrace | undefined {
  return context.flowTraces.find(predicate);
}

function buildChainEvidence(chain: CauseChain): Evidence[] {
  return [
    ...chain.primaryCause.evidence,
    ...chain.intermediateCauses.flatMap((item) => item.evidence),
    ...chain.surfaceError.evidence,
  ];
}

function buildSignal(
  id: string,
  title: string,
  domain: string,
  rootCauseChain: CauseChain,
  docs: string[],
  relatedApis: string[],
  relatedErrors: string[],
  fixes: RuleSignal["fixes"],
  estimatedFixTime: string,
  difficulty: RuleSignal["difficulty"],
  alternativeChains: CauseChain[] = [],
): RuleSignal {
  const evidence = buildChainEvidence(rootCauseChain);
  const score = evidence.reduce((sum, item) => sum + item.score, 0);
  return {
    id,
    title,
    domain,
    severity: severityFromScore(score),
    rootCause: composeRootCauseText(rootCauseChain),
    rootCauseChain,
    alternativeChains,
    evidence,
    fixes,
    docs,
    relatedApis,
    relatedErrors,
    estimatedFixTime,
    difficulty,
  };
}

function knowledgeForFamily(family: ClassifiedError["family"]): RuleSignal["docs"] {
  const unique = new Set<string>();
  for (const item of ROBLOX_DIAGNOSTIC_KNOWLEDGE_BASE) {
    if (item.family !== family) continue;
    for (const doc of item.docs) unique.add(doc);
    if (unique.size >= 6) break;
  }
  return [...unique];
}

function buildNilSignals(classified: ClassifiedError, context: ExtractedContext, errorLine?: number): RuleSignal[] {
  const primaryPhraseByFamily: Partial<Record<ClassifiedError["family"], string>> = {
    INDEX_NIL: "Value is nil at runtime",
    CALL_NIL: "nil at call site",
    CONCAT_NIL: "nil concatenation",
    ARITHMETIC_NIL: "nil arithmetic",
    COMPARE_NIL: "nil comparison",
    INVALID_ARGUMENT: "invalid argument",
    INVALID_MEMBER: "invalid member",
    INVALID_TYPE: "type mismatch",
    DATASTORE: "missing resiliency",
    REMOTE: "call direction mismatch",
    TWEEN: "invalid tween property/value",
    CHARACTER: "before spawn lifecycle",
    WAIT: "replication order",
    TIMEOUT: "service timeout",
    HTTP: "serialization/json failure",
    MEMORY: "memory/lifecycle failure",
    UNKNOWN: "Value is nil at runtime",
  };
  const primaryPhrase = primaryPhraseByFamily[classified.family] ?? "Value is nil at runtime";
  const surfaceMessageByFamily: Record<ClassifiedError["family"], string> = {
    INDEX_NIL: "attempt to index nil at the access site",
    CALL_NIL: "attempt to call nil at the invocation site",
    CONCAT_NIL: "attempt to concatenate nil at the string boundary",
    ARITHMETIC_NIL: "attempt to perform arithmetic on nil at the operator boundary",
    COMPARE_NIL: "attempt to compare nil at the comparison boundary",
    INVALID_ARGUMENT: "invalid argument surfaced at the call boundary",
    INVALID_MEMBER: "invalid member surfaced at the property boundary",
    INVALID_TYPE: "invalid type surfaced at the cast boundary",
    DATASTORE: "nil or partial data surfaced inside the DataStore path",
    REMOTE: "invalid remote payload surfaced at the boundary",
    TWEEN: "invalid tween property or value surfaced at interpolation",
    CHARACTER: "character lifecycle failure surfaced at the access site",
    WAIT: "replication timing failure surfaced at the lookup site",
    TIMEOUT: "timeout surfaced at the wait boundary",
    HTTP: "http failure surfaced at the request boundary",
    MEMORY: "memory or lifecycle failure surfaced at the runtime boundary",
    UNKNOWN: "nil or invalid value surfaced at the runtime boundary",
  };

  const surface = level(
    "Surface Error",
    surfaceMessageByFamily[classified.family] ?? "nil or invalid value surfaced at the runtime boundary",
    [mkEvidence("surface-log", "The stack/log reports the failing nil access", 24, errorLine, "log", "surface")],
    96,
  );

  const missingState = findState(context, ["player", "character", "profile", "inventory", "module", "instance", "humanoid"], ["Missing", "Uninitialized"]);
  const destroyedState = findState(context, ["player", "character", "profile", "inventory", "module", "instance", "humanoid"], ["Destroyed"]);
  const loadedState = findState(context, ["module", "player", "character"], ["Loaded"]);
  const flowHit = findTrace(context, (trace) => /nil|missing|destroy|return|require|waitforchild|findfirstchild/i.test(`${trace.reason} ${trace.source}`));

  const initChain = composeCauseChain(
    level(
      "Primary Cause",
      missingState
        ? `${primaryPhrase}: ${missingState.role} ${missingState.name} is ${missingState.state.toLowerCase()} before use`
        : `${primaryPhrase}: the dependency was not initialized before first use`,
      [
        mkEvidence("nil-family", "Nil-family runtime error was classified", 14, errorLine, "log", "surface"),
        ...(context.hasWaitForChild ? [mkEvidence("waitforchild", "WaitForChild indicates readiness should be explicit", 12, undefined, "context", "intermediate")] : []),
        ...(context.hasFindFirstChild ? [mkEvidence("findfirstchild", "FindFirstChild can legitimately return nil", 12, undefined, "context", "intermediate")] : []),
        ...(context.requires.length > 0 ? [mkEvidence("require-path", "A require() path exists in the snippet", 10, undefined, "call-chain", "primary")] : []),
        ...(loadedState ? [mkEvidence("loaded-state", `${loadedState.role} state was confirmed as loaded elsewhere`, 8, loadedState.line, "state", "primary")] : []),
      ],
      missingState ? 86 : 74,
    ),
    [
      level(
        "Intermediate Cause(s)",
        flowHit ? flowHit.reason : "A lookup, return, or sync boundary propagated nil into the failing access",
        [
          ...(flowHit ? [mkEvidence("flow-trace", flowHit.reason, 14, flowHit.line, "data-flow", "intermediate")] : [mkEvidence("propagation", "Nil propagated through a lookup or return path", 12, errorLine, "data-flow", "intermediate")]),
          ...(context.runtimeStates.some((item) => item.state === "Destroyed") ? [mkEvidence("destroyed-state", "A runtime state snapshot indicates a destroyed reference", 14, undefined, "state", "intermediate")] : []),
          ...(context.hasCharacterPropertyAccessWithoutSync ? [mkEvidence("character-race", "Character access happened without lifecycle synchronization", 16, undefined, "context", "intermediate")] : []),
          ...(context.hasTaskSpawn || context.hasTaskDefer || context.hasLoops ? [mkEvidence("async-boundary", "The snippet crosses an async boundary where stale values can surface", 10, undefined, "context", "intermediate")] : []),
        ],
        72,
      ),
    ],
    surface,
  );

  const staleChain = composeCauseChain(
    level(
      "Primary Cause",
      destroyedState
        ? `${primaryPhrase}: ${destroyedState.role} ${destroyedState.name} was destroyed or detached before the access`
        : `${primaryPhrase}: a stale reference survived across a timing boundary`,
      [
        mkEvidence("stale-reference", "A stale reference is a plausible primary cause", 12, errorLine, "state", "primary"),
        ...(destroyedState ? [mkEvidence("destroyed-state", `${destroyedState.name} was observed as destroyed`, 16, destroyedState.line, "state", "primary")] : []),
        ...(context.hasTaskSpawn || context.hasTaskDefer ? [mkEvidence("task-boundary", "task.spawn/task.defer can extend the lifetime gap", 12, undefined, "context", "primary")] : []),
      ],
      destroyedState ? 84 : 68,
    ),
    [
      level(
        "Intermediate Cause(s)",
        "A stale reference crossed an async or respawn boundary without a freshness check",
        [
          mkEvidence("stale-propagation", "The invalid reference propagated across a boundary", 12, errorLine, "data-flow", "intermediate"),
          ...(context.flowTraces.length > 0 ? [mkEvidence("trace", "A flow trace exists for the failing value", 10, context.flowTraces[0]?.line, "data-flow", "intermediate")] : []),
        ],
        70,
      ),
    ],
    surface,
  );

  const dependencyChain = composeCauseChain(
    level(
      "Primary Cause",
      context.requires.length > 0 || context.flowTraces.some((trace) => /require|return|module/i.test(trace.source))
        ? `${primaryPhrase}: a module or constructor returned nil or a partial export`
        : `${primaryPhrase}: incomplete data propagated from a dependency or constructor`,
      [
        ...(context.requires.length > 0 ? [mkEvidence("require-path", "A require() chain exists in the code path", 12, undefined, "call-chain", "primary")] : []),
        ...(context.moduleExports.length > 0 ? [mkEvidence("module-export", "Module export information is present in the snippet", 10, undefined, "context", "primary")] : []),
        ...(flowHit ? [mkEvidence("flow-return", flowHit.reason, 12, flowHit.line, "data-flow", "primary")] : []),
      ],
      78,
    ),
    [
      level(
        "Intermediate Cause(s)",
        "Incomplete data propagated through the call chain before the failing access",
        [mkEvidence("incomplete-propagation", "The value appears to have lost information in transit", 14, errorLine, "data-flow", "intermediate")],
        70,
      ),
    ],
    surface,
  );

  return [
    buildSignal(
      "nil-init",
      "Nil Lifetime Breakdown",
      "Nil Safety",
      initChain,
      knowledgeForFamily(classified.family),
      ["FindFirstChild", "WaitForChild", "CharacterAdded", "require"],
      ["attempt to index nil", "attempt to call nil", "attempt to concatenate nil", "attempt to compare nil"],
      {
        minimal: "Guard the exact access/call with a nil check before using the value.",
        better: "Restructure initialization so the dependency is created or replicated before this line runs.",
        production: "Add explicit readiness orchestration, contract checks, and telemetry for missing dependencies.",
      },
      "5-15 min",
      "Easy",
      [staleChain, dependencyChain],
    ),
    buildSignal(
      "nil-stale",
      "Stale Reference Lifecycle",
      "Nil Safety",
      staleChain,
      knowledgeForFamily(classified.family),
      ["Destroy", "Parent", "CharacterAdded", "respawn"],
      ["attempt to index nil", "attempt to call nil"],
      {
        minimal: "Refresh the reference after the lifecycle boundary and guard against nil.",
        better: "Rebind listeners after respawn or destruction and stop using stale cached objects.",
        production: "Model object ownership explicitly so destroyed instances cannot leak past their lifetime.",
      },
      "5-20 min",
      "Moderate",
      [initChain, dependencyChain],
    ),
    buildSignal(
      "nil-dependency",
      "Dependency Return Contract",
      "Nil Safety",
      dependencyChain,
      knowledgeForFamily(classified.family),
      ["require", "module", "constructor"],
      ["attempt to index nil", "attempt to call nil"],
      {
        minimal: "Assert the dependency returns a value before the caller dereferences it.",
        better: "Make the module or constructor contract explicit and return a stable object shape.",
        production: "Introduce contract tests and typed module boundaries so partial exports fail fast.",
      },
      "10-25 min",
      "Moderate",
      [initChain, staleChain],
    ),
  ];
}

function buildRemoteSignals(context: ExtractedContext, errorLine?: number): RuleSignal[] {
  const surface = level(
    "Surface Error",
    "A remote boundary failure surfaced at the invocation site",
    [mkEvidence("surface-log", "Remote log text reached the failing boundary", 22, errorLine, "log", "surface")],
    95,
  );

  const sideMismatch = context.side === "server" && context.apis.some((api) => api === "FireServer" || api === "InvokeServer")
    ? "Server code called a client-only remote method"
    : context.side === "client" && context.apis.some((api) => api === "FireClient" || api === "FireAllClients" || api === "InvokeClient")
      ? "Client code called a server-only remote method"
      : "The code path used the wrong remote direction for the current execution side";

  const mismatchChain = composeCauseChain(
    level(
      "Primary Cause",
      `call direction mismatch: ${sideMismatch}`,
      [
        mkEvidence("remote-usage", "Remote API usage detected", 16, errorLine, "context", "primary"),
        ...(context.side !== "unknown" ? [mkEvidence("execution-side", `Execution side was inferred as ${context.side}`, 12, undefined, "state", "primary")] : []),
      ],
      86,
    ),
    [
      level(
        "Intermediate Cause(s)",
        "The invalid remote direction propagated through the remote boundary unchecked",
        [mkEvidence("remote-propagation", "The payload crossed the remote boundary without side-safe validation", 14, errorLine, "call-chain", "intermediate")],
        74,
      ),
    ],
    surface,
  );

  const payloadChain = composeCauseChain(
    level(
      "Primary Cause",
      "remote callback contract: the payload shape does not match the receiver contract",
      [
        mkEvidence("payload-contract", "Remote payload validation is missing", 16, errorLine, "context", "primary"),
        ...(context.flowTraces.length > 0 ? [mkEvidence("flow-trace", context.flowTraces[0].reason, 12, context.flowTraces[0].line, "data-flow", "primary")] : []),
      ],
      80,
    ),
    [
      level(
        "Intermediate Cause(s)",
        "Incomplete data propagation reached the receiver after the remote call",
        [mkEvidence("data-propagation", "The remote payload appears incomplete or stale", 14, errorLine, "data-flow", "intermediate")],
        70,
      ),
    ],
    surface,
  );

  const callbackChain = composeCauseChain(
    level(
      "Primary Cause",
      "remote callback contract: the callback returned nil or a partial value",
      [
        mkEvidence("callback-contract", "Invoke* call has no strong contract signal", 14, errorLine, "context", "primary"),
        ...(context.hasPcall ? [mkEvidence("pcall-guard", "A pcall guard exists around the invocation path", 8, undefined, "context", "primary")] : []),
      ],
      76,
    ),
    [
      level(
        "Intermediate Cause(s)",
        "The return value propagated without a contract check",
        [mkEvidence("return-propagation", "A nil or partial return value propagated to the caller", 14, errorLine, "call-chain", "intermediate")],
        68,
      ),
    ],
    surface,
  );

  return [
    buildSignal(
      "remote-boundary",
      "Remote Boundary Validation",
      "Networking",
      mismatchChain,
      knowledgeForFamily("REMOTE"),
      ["RemoteEvent", "RemoteFunction", "OnServerEvent", "OnClientEvent"],
      ["attempt to call nil", "invalid argument", "cannot cast"],
      {
        minimal: "Use FireServer/InvokeServer only on clients and FireClient/FireAllClients/InvokeClient only on servers.",
        better: "Define typed remote payload contracts and validate every argument at the receiver.",
        production: "Introduce a centralized networking layer that enforces side-safe wrappers and schema validation.",
      },
      "15-40 min",
      "Moderate",
      [payloadChain, callbackChain],
    ),
    buildSignal(
      "remote-payload",
      "Remote Payload Contract",
      "Networking",
      payloadChain,
      knowledgeForFamily("REMOTE"),
      ["RemoteEvent", "RemoteFunction"],
      ["invalid argument", "cannot cast", "attempt to call nil"],
      {
        minimal: "Validate the payload before firing the remote.",
        better: "Serialize and validate the schema at both ends of the remote.",
        production: "Adopt typed request/response envelopes and contract tests for every remote.",
      },
      "10-30 min",
      "Moderate",
      [mismatchChain, callbackChain],
    ),
    buildSignal(
      "remote-callback",
      "Remote Callback Contract",
      "Networking",
      callbackChain,
      knowledgeForFamily("REMOTE"),
      ["InvokeServer", "InvokeClient"],
      ["attempt to call nil", "invalid argument"],
      {
        minimal: "Guard the invoke path and handle nil or partial responses.",
        better: "Require explicit callback results and fail fast when the contract is not satisfied.",
        production: "Wrap invoke flows in resilient request objects with validation and observability.",
      },
      "10-30 min",
      "Moderate",
      [mismatchChain, payloadChain],
    ),
  ];
}

function buildDataStoreSignals(context: ExtractedContext, errorLine?: number): RuleSignal[] {
  const surface = level(
    "Surface Error",
    "A DataStore failure surfaced at the request boundary",
    [mkEvidence("surface-log", "The DataStore operation failed in the runtime log", 22, errorLine, "log", "surface")],
    95,
  );

  const resiliencyChain = composeCauseChain(
    level(
      "Primary Cause",
      "missing resiliency: the request was executed without pcall, retry, or budget awareness",
      [
        mkEvidence("datastore-usage", "DataStore API usage detected", 16, errorLine, "context", "primary"),
        ...(context.hasPcall ? [mkEvidence("pcall-present", "A pcall guard was detected", 8, undefined, "context", "primary")] : [mkEvidence("datastore-no-pcall", "No pcall retry guard is present", 16, undefined, "context", "primary")]),
      ],
      context.hasPcall ? 70 : 86,
    ),
    [
      level(
        "Intermediate Cause(s)",
        "The failure propagated as a throttled or transient request error",
        [mkEvidence("request-propagation", "A transient failure propagated through the request path", 14, errorLine, "call-chain", "intermediate")],
        72,
      ),
    ],
    surface,
  );

  const budgetChain = composeCauseChain(
    level(
      "Primary Cause",
      context.hasLoops ? "quota exceeded: repeated calls likely exceeded the request budget" : "quota exceeded: the request budget was not treated as a hard constraint",
      [
        ...(context.hasLoops ? [mkEvidence("datastore-loop", "DataStore activity appears near loop constructs", 14, undefined, "context", "primary")] : [mkEvidence("budget-awareness", "Budget awareness is absent from the path", 12, undefined, "context", "primary")]),
      ],
      78,
    ),
    [
      level(
        "Intermediate Cause(s)",
        "Budget exhaustion propagated into the failing request",
        [mkEvidence("budget-propagation", "The request likely failed due to throttling or quota pressure", 14, errorLine, "state", "intermediate")],
        70,
      ),
    ],
    surface,
  );

  return [
    buildSignal(
      "datastore-reliability",
      "DataStore Reliability",
      "DataStore",
      resiliencyChain,
      knowledgeForFamily("DATASTORE"),
      ["GetAsync", "SetAsync", "UpdateAsync", "GetRequestBudgetForRequestType"],
      ["HTTP 429", "request was throttled", "attempt to call nil"],
      {
        minimal: "Wrap DataStore calls in pcall and handle failures.",
        better: "Add bounded retry with exponential backoff and UpdateAsync over SetAsync for contested keys.",
        production: "Implement a write queue with budget checks, deduplication, and telemetry-driven fallback storage.",
      },
      "20-60 min",
      "Hard",
      [budgetChain],
    ),
    buildSignal(
      "datastore-budget",
      "DataStore Budget Pressure",
      "DataStore",
      budgetChain,
      knowledgeForFamily("DATASTORE"),
      ["GetRequestBudgetForRequestType", "UpdateAsync"],
      ["HTTP 429", "request was throttled"],
      {
        minimal: "Throttle the request rate before the budget is exhausted.",
        better: "Use a bounded queue with explicit retry/backoff and budget checks.",
        production: "Add a budget-aware persistence layer with telemetry and adaptive backoff.",
      },
      "20-60 min",
      "Hard",
      [resiliencyChain],
    ),
  ];
}

function buildTweenSignals(context: ExtractedContext, errorLine?: number, logText = ""): RuleSignal[] {
  const surface = level(
    "Surface Error",
    "TweenService reported an invalid property or value at interpolation time",
    [mkEvidence("surface-log", "The tween error surfaced in the runtime log", 22, errorLine, "log", "surface")],
    95,
  );

  const invalidValueChain = composeCauseChain(
    level(
      "Primary Cause",
      "invalid tween property/value: the tween goal value is incompatible with the target property",
      [mkEvidence("tween-usage", "TweenService:Create usage detected", 16, errorLine, "context", "primary")],
      84,
    ),
    [
      level(
        "Intermediate Cause(s)",
        "The incompatible goal propagated into the tween constructor",
        [mkEvidence("tween-goal", "A tween goal property was extracted from the AST", 12, undefined, "data-flow", "intermediate")],
        72,
      ),
    ],
    surface,
  );

  const invalidPropertyChain = composeCauseChain(
    level(
      "Primary Cause",
      "invalid tween property/value: the tween target/property pair is not tweenable",
      context.tweenGoals.length > 0 ? [mkEvidence("tween-goals", "Tween goals were extracted from the snippet", 14, undefined, "context", "primary")] : [mkEvidence("tween-goals", "Tween usage appears without explicit goal validation", 10, undefined, "context", "primary")],
      78,
    ),
    [
      level(
        "Intermediate Cause(s)",
        "The property compatibility check was not enforced before Play()",
        [mkEvidence("compatibility", "The goal property was passed directly into TweenService:Create", 12, errorLine, "call-chain", "intermediate")],
        70,
      ),
    ],
    surface,
  );

  const logSpecificChain = /cannot be tweened/i.test(logText)
    ? composeCauseChain(
        level(
          "Primary Cause",
          "The runtime already reported that the property cannot be tweened",
          [mkEvidence("tween-invalid-property", "The runtime error explicitly says the property cannot be tweened", 18, errorLine, "log", "primary")],
          90,
        ),
        [
          level(
            "Intermediate Cause(s)",
            "The invalid goal reached the tween constructor unchanged",
            [mkEvidence("tween-passthrough", "The goal value was not normalized before tween creation", 12, errorLine, "data-flow", "intermediate")],
            74,
          ),
        ],
        surface,
      )
    : invalidPropertyChain;

  return [
    buildSignal(
      "tween-property-compat",
      "Tween Property Compatibility",
      "TweenService",
      logSpecificChain,
      knowledgeForFamily("TWEEN"),
      ["TweenService:Create", "TweenInfo", "GuiObject.Size", "BasePart.Size"],
      ["property cannot be tweened", "invalid argument #3", "unable to cast to UDim2"],
      {
        minimal: "Verify the tween goal property exists and accepts tweening on the target instance class.",
        better: "Validate goal value types (UDim2/Vector3/number) before constructing TweenService:Create.",
        production: "Create typed tween builders per instance class with whitelist validation for tweenable properties.",
      },
      "10-25 min",
      "Moderate",
      [invalidValueChain, invalidPropertyChain],
    ),
  ];
}

function buildCharacterSignals(context: ExtractedContext, errorLine?: number): RuleSignal[] {
  const surface = level(
    "Surface Error",
    "The character access failed because the runtime object was not ready",
    [mkEvidence("surface-log", "The character access error surfaced in the runtime log", 22, errorLine, "log", "surface")],
    95,
  );

  const lifecycleChain = composeCauseChain(
    level(
      "Primary Cause",
      context.hasCharacterAdded ? "before spawn lifecycle: the character was accessed before its lifecycle stabilized" : "before spawn lifecycle: the character was accessed before spawn or respawn completed",
      [
        mkEvidence("character-api", "Character/Humanoid API usage detected", 14, errorLine, "context", "primary"),
        ...(context.hasCharacterAdded ? [mkEvidence("characteradded", "CharacterAdded is referenced in the snippet", 10, undefined, "context", "primary")] : [mkEvidence("characteradded-missing", "CharacterAdded synchronization is missing", 14, undefined, "context", "primary")]),
      ],
      84,
    ),
    [
      level(
        "Intermediate Cause(s)",
        "The character reference propagated into the access before a readiness signal fired",
        [mkEvidence("character-propagation", "The character reference was used without a freshness guard", 14, errorLine, "data-flow", "intermediate")],
        72,
      ),
    ],
    surface,
  );

  const animatorChain = composeCauseChain(
    level(
      "Primary Cause",
      "humanoid/animator not ready: the Humanoid or Animator dependency was not loaded yet",
      [mkEvidence("humanoid-animator", "Humanoid/Animator readiness is uncertain", 16, errorLine, "state", "primary")],
      78,
    ),
    [
      level(
        "Intermediate Cause(s)",
        "The missing dependency propagated into the animation access path",
        [mkEvidence("animator-propagation", "The animation call path did not verify readiness", 12, errorLine, "call-chain", "intermediate")],
        70,
      ),
    ],
    surface,
  );

  const staleChain = composeCauseChain(
    level(
      "Primary Cause",
      "before spawn lifecycle: a stale character or humanoid reference survived a respawn boundary",
      [mkEvidence("stale-character", "The character reference may be stale or destroyed", 14, errorLine, "state", "primary")],
      80,
    ),
    [
      level(
        "Intermediate Cause(s)",
        "The stale reference propagated through the stack without refresh logic",
        [mkEvidence("stale-propagation", "A stale object path reached the failing line", 12, errorLine, "data-flow", "intermediate")],
        68,
      ),
    ],
    surface,
  );

  return [
    buildSignal(
      "character-lifecycle",
      "Character Lifecycle Guarding",
      "Character",
      lifecycleChain,
      knowledgeForFamily("CHARACTER"),
      ["Players.LocalPlayer", "CharacterAdded", "CharacterAppearanceLoaded", "HumanoidRootPart"],
      ["attempt to index nil with Humanoid", "attempt to index nil with Character"],
      {
        minimal: "Wait for CharacterAdded and then WaitForChild('Humanoid', timeout).",
        better: "Handle respawn by reconnecting lifecycle listeners and cleaning stale references.",
        production: "Implement a character state machine that emits readiness events for all dependent systems.",
      },
      "10-30 min",
      "Moderate",
      [animatorChain, staleChain],
    ),
    buildSignal(
      "character-animator",
      "Animator Readiness",
      "Character",
      animatorChain,
      knowledgeForFamily("CHARACTER"),
      ["Humanoid", "Animator", "LoadAnimation"],
      ["attempt to index nil with Humanoid", "attempt to index nil with LoadAnimation"],
      {
        minimal: "Guard the Humanoid and Animator before calling LoadAnimation.",
        better: "Wait for the animation dependencies to load before resolving the track.",
        production: "Model animation readiness as an explicit state instead of assuming the character exists.",
      },
      "10-30 min",
      "Moderate",
      [lifecycleChain, staleChain],
    ),
  ];
}

function buildWaitSignals(context: ExtractedContext, errorLine?: number): RuleSignal[] {
  const surface = level(
    "Surface Error",
    "The dependency lookup failed because the target was not ready in time",
    [mkEvidence("surface-log", "The wait/replication failure surfaced in the runtime log", 20, errorLine, "log", "surface")],
    95,
  );

  const replicationChain = composeCauseChain(
    level(
      "Primary Cause",
      context.hasWaitForChild ? "replication order: streaming delay made the target unavailable" : "replication order: the dependency was read before replication completed",
      [mkEvidence("wait-apis", "WaitForChild/FindFirstChild usage detected", 14, errorLine, "context", "primary")],
      82,
    ),
    [
      level(
        "Intermediate Cause(s)",
        "The missing child propagated through the lookup without a readiness gate",
        [mkEvidence("wait-propagation", "A missing child value reached the access path", 12, errorLine, "data-flow", "intermediate")],
        72,
      ),
    ],
    surface,
  );

  const timeoutChain = composeCauseChain(
    level(
      "Primary Cause",
      "service timeout: the lookup relied on an unbounded or insufficient wait strategy",
      [
        ...(context.hasWaitForChild ? [mkEvidence("waitforchild", "WaitForChild is present in the snippet", 12, undefined, "context", "primary")] : [mkEvidence("wait-apis", "Lookup APIs are used without a bounded wait strategy", 12, undefined, "context", "primary")]),
        ...(context.hasWaitForChild && !context.hasWaitForChildTimeout ? [mkEvidence("waitforchild-timeout", "WaitForChild appears without an explicit timeout", 16, undefined, "context", "primary")] : []),
      ],
      78,
    ),
    [
      level(
        "Intermediate Cause(s)",
        "The lookup kept waiting while the dependency never stabilized",
        [mkEvidence("timeout-propagation", "The lookup stalled or surfaced as an infinite yield condition", 14, errorLine, "state", "intermediate")],
        68,
      ),
    ],
    surface,
  );

  const staleChain = composeCauseChain(
    level(
      "Primary Cause",
      "destroyed instance in tag set: a retrieved instance was destroyed or replaced before the access",
      [mkEvidence("stale-instance", "A stale instance is a plausible primary cause", 12, errorLine, "state", "primary")],
      76,
    ),
    [
      level(
        "Intermediate Cause(s)",
        "The stale instance propagated through the lookup path without freshness validation",
        [mkEvidence("stale-propagation", "A stale object reached the access line", 12, errorLine, "data-flow", "intermediate")],
        68,
      ),
    ],
    surface,
  );

  return [
    buildSignal(
      "wait-race",
      "Replication Timing and Wait Strategy",
      "Replication",
      replicationChain,
      knowledgeForFamily("WAIT"),
      ["WaitForChild", "FindFirstChild", "StreamingEnabled", "ReplicatedStorage"],
      ["infinite yield possible", "attempt to index nil"],
      {
        minimal: "Add explicit nil checks around FindFirstChild results and return early on miss.",
        better: "Use WaitForChild with bounded timeout and fallback behavior.",
        production: "Adopt explicit dependency bootstrapping with deterministic readiness events.",
      },
      "5-20 min",
      "Easy",
      [timeoutChain, staleChain],
    ),
    buildSignal(
      "wait-timeout",
      "Bounded Wait Strategy",
      "Replication",
      timeoutChain,
      knowledgeForFamily("WAIT"),
      ["WaitForChild", "FindFirstChild"],
      ["infinite yield possible", "attempt to index nil"],
      {
        minimal: "Set a bounded timeout and handle the miss explicitly.",
        better: "Separate readiness checks from the access path so the failure is deterministic.",
        production: "Model replication as an explicit readiness state with telemetry and fallback paths.",
      },
      "5-20 min",
      "Easy",
      [replicationChain, staleChain],
    ),
  ];
}

function buildGenericSignals(classified: ClassifiedError, context: ExtractedContext, tokenized: TokenizedInput): RuleSignal[] {
  const surface = level(
    "Surface Error",
    "The runtime failure reached the generic fallback path",
    [mkEvidence("surface-log", "No specialized family matched, so the fallback path is analyzing the runtime failure", 18, classified.lineReference, "log", "surface")],
    92,
  );

  const initChain = composeCauseChain(
    level(
      "Primary Cause",
      "Value is nil at runtime: initialization or dependency resolution failed before the access",
      [
        mkEvidence("unknown-family", "No specialized family matched; using contextual fallback", 12, classified.lineReference, "context", "primary"),
        ...(context.symbols.length > 0 ? [mkEvidence("symbol-extract", "Symbols were extracted from the code snippet", 10, undefined, "context", "primary")] : []),
        ...(tokenized.tokens.length > 20 ? [mkEvidence("token-depth", "The snippet has enough token depth for contextual reasoning", 8, undefined, "context", "intermediate")] : []),
      ],
      78,
    ),
    [
      level(
        "Intermediate Cause(s)",
        "The dependency or object state propagated without a verified readiness signal",
        [mkEvidence("generic-propagation", "A possibly invalid value propagated through the call chain", 12, classified.lineReference, "data-flow", "intermediate")],
        70,
      ),
    ],
    surface,
  );

  const staleChain = composeCauseChain(
    level(
      "Primary Cause",
      "nil index: a stale or destroyed reference was reused",
      [mkEvidence("stale-reference", "The fallback path detected a stale-reference scenario", 12, classified.lineReference, "state", "primary")],
      72,
    ),
    [
      level(
        "Intermediate Cause(s)",
        "The invalid reference survived an async or ownership boundary",
        [mkEvidence("stale-propagation", "The value traveled through a boundary without freshness validation", 12, classified.lineReference, "data-flow", "intermediate")],
        68,
      ),
    ],
    surface,
  );

  const dependencyChain = composeCauseChain(
    level(
      "Primary Cause",
      "dependency failure: a constructor or module returned a partial value",
      [mkEvidence("dependency-failure", "A dependency failure is plausible from the available context", 12, classified.lineReference, "call-chain", "primary")],
      74,
    ),
    [
      level(
        "Intermediate Cause(s)",
        "Incomplete data propagated from the dependency into the failing access",
        [mkEvidence("incomplete-data", "The value appears incomplete or partially initialized", 12, classified.lineReference, "data-flow", "intermediate")],
        68,
      ),
    ],
    surface,
  );

  return [
    buildSignal(
      "generic-runtime",
      "Generic Runtime Context",
      "Runtime",
      initChain,
      knowledgeForFamily("UNKNOWN"),
      context.apis.slice(0, 8),
      ["attempt to index nil", "attempt to call nil", "invalid argument"],
      {
        minimal: "Trace the highlighted symbol and add runtime guards at the failing access line.",
        better: "Refactor startup flow to initialize dependencies before use.",
        production: "Introduce deterministic bootstrapping with health assertions and typed module boundaries.",
      },
      "15-45 min",
      "Moderate",
      [staleChain, dependencyChain],
    ),
    buildSignal(
      "generic-stale",
      "Stale Reference Fallback",
      "Runtime",
      staleChain,
      knowledgeForFamily("UNKNOWN"),
      context.apis.slice(0, 8),
      ["attempt to index nil", "attempt to call nil"],
      {
        minimal: "Refresh the reference before use and guard against nil.",
        better: "Track object lifetimes explicitly across async boundaries.",
        production: "Add ownership and freshness checks for high-value runtime objects.",
      },
      "15-45 min",
      "Moderate",
      [initChain, dependencyChain],
    ),
    buildSignal(
      "generic-dependency",
      "Dependency Contract Fallback",
      "Runtime",
      dependencyChain,
      knowledgeForFamily("UNKNOWN"),
      context.apis.slice(0, 8),
      ["attempt to index nil", "attempt to call nil", "invalid argument"],
      {
        minimal: "Assert the dependency returns a stable value before dereferencing it.",
        better: "Make the constructor or module contract explicit and fail fast on partial data.",
        production: "Introduce contract tests and typed boundaries for startup dependencies.",
      },
      "15-45 min",
      "Moderate",
      [initChain, staleChain],
    ),
  ];
}

export function runRuleEngine(
  classified: ClassifiedError,
  context: ExtractedContext,
  tokenized: TokenizedInput,
  logText: string,
): RuleSignal[] {
  const signals: RuleSignal[] = [];

  if (["INDEX_NIL", "CALL_NIL", "CONCAT_NIL", "ARITHMETIC_NIL", "COMPARE_NIL"].includes(classified.family)) {
    signals.push(...buildNilSignals(classified, context, classified.lineReference));
  }

  if (classified.family === "REMOTE" || context.hasRemoteUse) {
    signals.push(...buildRemoteSignals(context, classified.lineReference));
  }

  if (classified.family === "DATASTORE" || context.hasDataStoreUse) {
    signals.push(...buildDataStoreSignals(context, classified.lineReference));
  }

  if (classified.family === "TWEEN" || context.hasTweenUse || /cannot be tweened/i.test(logText)) {
    signals.push(...buildTweenSignals(context, classified.lineReference, logText));
  }

  if (classified.family === "CHARACTER" || context.apis.includes("CharacterAdded") || context.apis.includes("Humanoid")) {
    signals.push(...buildCharacterSignals(context, classified.lineReference));
  }

  if (classified.family === "WAIT" || context.hasFindFirstChild || context.hasWaitForChild) {
    signals.push(...buildWaitSignals(context, classified.lineReference));
  }

  if (signals.length === 0) {
    signals.push(...buildGenericSignals(classified, context, tokenized));
  }

  return signals;
}

import type { Analysis, Cause, CodeInsight, DeprecatedApi } from "../types";
import { findMatch } from "../error-parser";
import { extractVariableFlow } from "./codeFlow";

export interface ContextIssue {
  id: string;
  category: string;
  title: string;
  description: string;
  suggestedFix: string;
  correctedExample: string;
  severity: "Low" | "Medium" | "High" | "Critical";
  likelihood: number;
}

/**
 * Helper to check if the code represents a Server-side Script.
 */
export function isServerScript(logText: string, codeText: string): boolean {
  const logLower = logText.toLowerCase();
  if (logLower.includes("serverscriptservice") || logLower.includes("serverscript") || logLower.includes("server script")) {
    return true;
  }
  // Check code signatures
  if (codeText.includes("DataStoreService") || codeText.includes("HttpService") || codeText.includes("MessagingService")) {
    return true;
  }
  // Default to server if we see general script references but not localscript
  if (logLower.includes("script") && !logLower.includes("localscript")) {
    return true;
  }
  return false;
}

/**
 * Helper to check if the code represents a Client-side LocalScript.
 */
export function isLocalScript(logText: string, codeText: string): boolean {
  const logLower = logText.toLowerCase();
  if (logLower.includes("localscript") || logLower.includes("starterplayer") || logLower.includes("startergui") || logLower.includes("playergui")) {
    return true;
  }
  if (codeText.includes("LocalPlayer") || codeText.includes("MouseButton1Click") || codeText.includes("TouchTap")) {
    return true;
  }
  return false;
}

/**
 * Analyzes the Lua code and log text for common Roblox patterns and issues.
 */
export function analyzeCodeContext(codeText: string, logText: string): ContextIssue[] {
  const issues: ContextIssue[] = [];
  const code = codeText.trim();
  const log = logText.trim();

  if (!code) return issues;

  const serverCtx = isServerScript(log, code);
  const clientCtx = isLocalScript(log, code);

  // ==========================================
  // 1. EXECUTION CONTEXT
  // ==========================================

  // LocalPlayer inside ServerScript
  if (code.match(/(?:game\.)?Players?\.LocalPlayer\b/) && serverCtx) {
    issues.push({
      id: "LocalPlayerInsideServerScript",
      category: "Execution Context",
      title: "LocalPlayer accessed inside Server Script",
      description: "Players.LocalPlayer is only accessible in client scripts (LocalScripts). It returns nil on the server, causing a crash when indexed.",
      suggestedFix: "Move this client-oriented code to a LocalScript, or retrieve the Player object through events (e.g. PlayerAdded) or from remote triggers.",
      correctedExample: `-- Client-side (LocalScript)
local Players = game:GetService("Players")
local player = Players.LocalPlayer
print("Hello " .. player.Name)`,
      severity: "Critical",
      likelihood: 95,
    });
  }

  // FireServer inside ServerScript
  if (code.includes("FireServer") && serverCtx) {
    issues.push({
      id: "FireServerInsideServerScript",
      category: "Execution Context",
      title: "FireServer called from Server Script",
      description: "FireServer() is client-to-server. A server Script cannot fire an event to itself this way.",
      suggestedFix: "Use FireClient() or FireAllClients() to communicate with clients, or invoke functions directly within the server script.",
      correctedExample: `-- Server-side (Script)
local RemoteEvent = game.ReplicatedStorage:WaitForChild("MyRemote")
-- To send to a client, you need a player object:
RemoteEvent:FireClient(player, data)`,
      severity: "High",
      likelihood: 90,
    });
  }

  // FireClient inside LocalScript
  if (code.includes("FireClient") && clientCtx) {
    issues.push({
      id: "FireClientInsideLocalScript",
      category: "Execution Context",
      title: "FireClient called from LocalScript",
      description: "FireClient() is server-to-client and cannot be invoked from client-side LocalScripts.",
      suggestedFix: "Use FireServer() to send data to the server instead.",
      correctedExample: `-- Client-side (LocalScript)
local RemoteEvent = game.ReplicatedStorage:WaitForChild("MyRemote")
RemoteEvent:FireServer(data)`,
      severity: "High",
      likelihood: 90,
    });
  }

  // CharacterAdded missing
  if (code.match(/\.Character\b/) && !code.includes("CharacterAdded")) {
    issues.push({
      id: "CharacterAddedMissing",
      category: "Execution Context",
      title: "Character accessed directly without CharacterAdded",
      description: "Accessing player.Character directly can return nil if the player's character model has not spawned or fully loaded yet.",
      suggestedFix: "Use player.CharacterAdded:Wait() to ensure the character exists before reference.",
      correctedExample: `local character = player.Character or player.CharacterAdded:Wait()`,
      severity: "Medium",
      likelihood: 75,
    });
  }

  // PlayerAdded misuse in LocalScript
  if (code.includes("PlayerAdded") && clientCtx) {
    issues.push({
      id: "PlayerAddedMisuse",
      category: "Execution Context",
      title: "PlayerAdded event listener inside LocalScript",
      description: "Players.PlayerAdded might miss the local player or other players who joined before this client script executed.",
      suggestedFix: "Iterate through existing players using GetPlayers() before connecting PlayerAdded.",
      correctedExample: `local Players = game:GetService("Players")
local function setupPlayer(player)
    -- Initialize player setup
end
-- Handle already connected players
for _, player in ipairs(Players:GetPlayers()) do
    task.spawn(setupPlayer, player)
end
Players.PlayerAdded:Connect(setupPlayer)`,
      severity: "High",
      likelihood: 80,
    });
  }

  // ==========================================
  // 2. NIL RISKS
  // ==========================================

  // FindFirstChild used without nil check
  const ffcMatches = code.match(/:FindFirstChild(?:OfClass|WhichIsA)?\s*\(\s*["']([^"']+)["']\s*\)/g);
  if (ffcMatches) {
    let hasNilCheck = false;
    // Basic check to see if the script checks for the returned value (looking for "if" or "and")
    if (code.includes("if ") || code.includes(" and ")) {
      hasNilCheck = true;
    }
    // If it immediately indexes after calling FindFirstChild (e.g. FindFirstChild("X").Y)
    const directAccessMatch = code.match(/:FindFirstChild(?:OfClass|WhichIsA)?\s*\([^)]+\)\s*[\.:]/);
    if (directAccessMatch || !hasNilCheck) {
      issues.push({
        id: "FindFirstChildWithoutNilCheck",
        category: "Nil Risks",
        title: "FindFirstChild used without a nil validation",
        description: "FindFirstChild returns nil if the child does not exist. Accessing properties on it without checking can cause a crash.",
        suggestedFix: "Store the result in a variable and perform a conditional nil check before indexing properties.",
        correctedExample: `local child = parent:FindFirstChild("TargetName")
if child then
    print(child.Name)
end`,
        severity: "High",
        likelihood: 85,
      });
    }
  }

  // WaitForChild missing
  if ((code.includes(".leaderstats") || code.includes(".PlayerGui") || code.includes(".Backpack")) && !code.includes("WaitForChild")) {
    issues.push({
      id: "WaitForChildMissing",
      category: "Nil Risks",
      title: "WaitForChild missing on dynamically replicating instances",
      description: "Referencing folder collections like leaderstats, PlayerGui, or Backpack with dot notation can crash if replication latency causes them to be nil initially.",
      suggestedFix: "Use :WaitForChild() to pause script execution until the instance is replicated.",
      correctedExample: `local leaderstats = player:WaitForChild("leaderstats", 5)`,
      severity: "High",
      likelihood: 85,
    });
  }

  // WaitForChild without timeout
  if (code.match(/:WaitForChild\s*\(\s*["'][^"']+["']\s*\)/)) {
    issues.push({
      id: "WaitForChildWithoutTimeout",
      category: "Nil Risks",
      title: "WaitForChild called without timeout",
      description: "WaitForChild() with no timeout parameter yields the thread infinitely if the asset is missing, potentially locking the script.",
      suggestedFix: "Add a timeout argument (e.g. 5 seconds) as the second parameter.",
      correctedExample: `local target = parent:WaitForChild("Target", 5)
if not target then
    warn("Target failed to load within timeout")
end`,
      severity: "Medium",
      likelihood: 70,
    });
  }

  // indexing Value after FindFirstChild
  if (code.match(/:FindFirstChild(?:OfClass|WhichIsA)?\s*\([^)]+\)\.Value/)) {
    issues.push({
      id: "ValueAfterFindFirstChild",
      category: "Nil Risks",
      title: "Indexing Value immediately after FindFirstChild",
      description: "Accessing the .Value property directly after FindFirstChild() crashes the script instantly if the value instance is missing.",
      suggestedFix: "Save the value object in a local variable and verify it is not nil first.",
      correctedExample: `local valObject = parent:FindFirstChild("MyValue")
local val = valObject and valObject.Value`,
      severity: "High",
      likelihood: 90,
    });
  }

  // nested indexing after possible nil
  if (code.match(/\w+\.\w+\.\w+\.\w+/) && !code.includes("FindFirstChild") && !code.includes("WaitForChild")) {
    issues.push({
      id: "NestedIndexingAfterPossibleNil",
      category: "Nil Risks",
      title: "Nested indexing without intermediate nil validation",
      description: "Chaining property access (e.g. player.leaderstats.Coins.Value) will trigger a crash if any element in the hierarchy returns nil.",
      suggestedFix: "Break down the chain using WaitForChild or FindFirstChild with nil checks.",
      correctedExample: `local leaderstats = player:WaitForChild("leaderstats", 5)
local coins = leaderstats and leaderstats:WaitForChild("Coins", 5)
local coinsValue = coins and coins.Value`,
      severity: "Medium",
      likelihood: 75,
    });
  }

  // ==========================================
  // 3. MODULE ANALYSIS
  // ==========================================

  // recursive require()
  if (log.toLowerCase().includes("cyclic") || log.toLowerCase().includes("cycle") || code.match(/require\s*\(\s*script\s*\)/i)) {
    issues.push({
      id: "RecursiveRequire",
      category: "Module Analysis",
      title: "Recursive require cycle detected",
      description: "A cyclic require occurs when a module directly or indirectly requires itself, causing Lua to throw an execution error.",
      suggestedFix: "Structure your architecture so that common logic is isolated in a helper module or resolve dependencies via Event emitters.",
      correctedExample: `-- Instead of direct circular requiring, use BindableEvents or a shared service
local Event = game.ReplicatedStorage:WaitForChild("SharedEvent")`,
      severity: "Critical",
      likelihood: 95,
    });
  }

  // ModuleScript missing return
  if (code.includes("ModuleScript") || (code.match(/local\s+\w+\s*=\s*\{\}/) && !code.includes("return"))) {
    issues.push({
      id: "ModuleScriptMissingReturn",
      category: "Module Analysis",
      title: "ModuleScript lacks return statement",
      description: "ModuleScripts must return exactly one value (typically a table or function) so they can be loaded by other scripts.",
      suggestedFix: "Ensure the module finishes with a return statement of the module table/function.",
      correctedExample: `local Module = {}
function Module.doWork()
    -- code
end
return Module`,
      severity: "High",
      likelihood: 90,
    });
  }

  // require() assigned but never checked
  const reqMatch = code.match(/local\s+([A-Za-z_]\w*)\s*=\s*require\(/);
  if (reqMatch) {
    const varName = reqMatch[1];
    const isChecked = code.includes(`if ${varName}`) || code.includes(`if not ${varName}`) || code.includes(`${varName}.`) || code.includes(`${varName}(`);
    if (!isChecked) {
      issues.push({
        id: "RequireAssignedNeverChecked",
        category: "Module Analysis",
        title: "Required module assigned but never checked or used",
        description: "A ModuleScript was successfully required but is never utilized or validated in the script body.",
        suggestedFix: "Check if the module import is redundant or verify that initialization routines are called.",
        correctedExample: `local MyModule = require(path.to.module)
if MyModule then
    MyModule.init()
end`,
        severity: "Low",
        likelihood: 60,
      });
    }
  }

  // ==========================================
  // 4. CHARACTER ANALYSIS
  // ==========================================

  // Character accessed before CharacterAdded
  if (code.match(/\bCharacter\b/) && !code.includes("CharacterAdded")) {
    issues.push({
      id: "CharacterAccessedBeforeAdded",
      category: "Character Analysis",
      title: "Player Character referenced before CharacterAdded",
      description: "Accessing player.Character directly can yield nil because the character model loads asynchronously.",
      suggestedFix: "Retrieve the character with a fallback block using CharacterAdded:Wait().",
      correctedExample: `local character = player.Character or player.CharacterAdded:Wait()`,
      severity: "High",
      likelihood: 80,
    });
  }

  // Humanoid accessed before Character exists
  if (code.match(/\.Humanoid\b|FindFirstChild\s*\(\s*["']Humanoid["']\s*\)/) && !code.includes("CharacterAdded")) {
    issues.push({
      id: "HumanoidAccessedBeforeCharacter",
      category: "Character Analysis",
      title: "Humanoid indexed before checking Character",
      description: "Referencing the Humanoid of a player will throw a nil index error if the Character has not spawned yet.",
      suggestedFix: "Wait for the Character first, and then fetch the Humanoid component using WaitForChild.",
      correctedExample: `local character = player.Character or player.CharacterAdded:Wait()
local humanoid = character:WaitForChild("Humanoid", 5)`,
      severity: "High",
      likelihood: 85,
    });
  }

  // Backpack accessed too early
  if (code.match(/\.Backpack\b/) && !code.match(/:WaitForChild\s*\(\s*["']Backpack["']\s*/)) {
    issues.push({
      id: "BackpackAccessedTooEarly",
      category: "Character Analysis",
      title: "Player Backpack indexed directly",
      description: "Directly reading player.Backpack during player loading may return nil as inventory components take time to initialize.",
      suggestedFix: "Ensure the Backpack exists by calling WaitForChild with a timeout.",
      correctedExample: `local backpack = player:WaitForChild("Backpack", 5)`,
      severity: "Medium",
      likelihood: 75,
    });
  }

  // ==========================================
  // 5. LEADERSTATS ANALYSIS
  // ==========================================

  // leaderstats accessed without WaitForChild
  if (code.match(/\.leaderstats\b/) && !code.match(/:WaitForChild\s*\(\s*["']leaderstats["']\s*/)) {
    issues.push({
      id: "LeaderstatsAccessedWithoutWaitForChild",
      category: "Leaderstats Analysis",
      title: "leaderstats indexed directly",
      description: "Accessing player.leaderstats directly will error out if replication takes longer than script load.",
      suggestedFix: "Use :WaitForChild('leaderstats') to yield safely.",
      correctedExample: `local leaderstats = player:WaitForChild("leaderstats", 5)`,
      severity: "High",
      likelihood: 85,
    });
  }

  // Coins accessed without checking leaderstats
  if (code.match(/leaderstats\.(Coins|Points|Cash|Money|Level|Value)/) && !code.match(/if\s+leaderstats\b/)) {
    issues.push({
      id: "CoinsAccessedWithoutCheckingLeaderstats",
      category: "Leaderstats Analysis",
      title: "Stat accessed without validating leaderstats",
      description: "Reading or writing statistics without validating the leaderstats folder can cause a crash if leaderstats is nil.",
      suggestedFix: "Perform a check on the leaderstats folder first.",
      correctedExample: `local leaderstats = player:WaitForChild("leaderstats", 5)
local coins = leaderstats and leaderstats:WaitForChild("Coins", 5)`,
      severity: "High",
      likelihood: 80,
    });
  }

  // ==========================================
  // 6. REMOTE ANALYSIS
  // ==========================================

  // FireServer misuse
  if (code.match(/:FireServer\s*\(\s*(?:game\.)?Players?\.LocalPlayer\b/) || code.match(/:FireServer\s*\(\s*player\b/)) {
    issues.push({
      id: "FireServerMisuse",
      category: "Remote Analysis",
      title: "LocalPlayer passed manually in FireServer",
      description: "Calling FireServer(player) is incorrect. Roblox automatically passes the local player as the first argument, shifting all your other parameters.",
      suggestedFix: "Remove the player parameter from FireServer().",
      correctedExample: `RemoteEvent:FireServer(data)`,
      severity: "Critical",
      likelihood: 95,
    });
  }

  // FireClient misuse
  if (code.includes("FireClient") && serverCtx && !code.match(/:FireClient\s*\(\s*[a-zA-Z_]\w*\s*,/)) {
    issues.push({
      id: "FireClientMisuse",
      category: "Remote Analysis",
      title: "FireClient called without Player reference",
      description: "FireClient() must receive the targeted Player object as its first argument so the server knows where to send the event.",
      suggestedFix: "Pass the targeted player as the first argument.",
      correctedExample: `RemoteEvent:FireClient(targetPlayer, data)`,
      severity: "Critical",
      likelihood: 90,
    });
  }

  // InvokeServer misuse
  if (code.match(/:InvokeServer\s*\(\s*(?:game\.)?Players?\.LocalPlayer\b/) || code.match(/:InvokeServer\s*\(\s*player\b/)) {
    issues.push({
      id: "InvokeServerMisuse",
      category: "Remote Analysis",
      title: "LocalPlayer passed manually in InvokeServer",
      description: "Like FireServer, InvokeServer() automatically sends the sending player. Passing it manually causes parameter shifting.",
      suggestedFix: "Remove the player parameter from InvokeServer().",
      correctedExample: `local result = RemoteFunction:InvokeServer(data)`,
      severity: "Critical",
      likelihood: 95,
    });
  }

  // InvokeClient misuse
  if (code.includes("InvokeClient")) {
    issues.push({
      id: "InvokeClientMisuse",
      category: "Remote Analysis",
      title: "InvokeClient called on the server",
      description: "Calling InvokeClient() is heavily discouraged by Roblox because client errors, timeouts, or infinite yields will hang the server thread indefinitely.",
      suggestedFix: "Replace RemoteFunction:InvokeClient() with a RemoteEvent (FireClient) and handle response updates asynchronously.",
      correctedExample: `-- Use RemoteEvents instead:
RemoteEvent:FireClient(player, data)
-- Listen to client response on another RemoteEvent:
ResponseEvent.OnServerEvent:Connect(function(player, response)
    -- Handle response
end)`,
      severity: "Critical",
      likelihood: 90,
    });
  }

  // ==========================================
  // 7. DATASTORE ANALYSIS
  // ==========================================

  // GetAsync outside pcall
  if (code.includes("GetAsync") && !code.includes("pcall")) {
    issues.push({
      id: "GetAsyncOutsidePcall",
      category: "DataStore",
      title: "DataStore GetAsync called outside pcall",
      description: "DataStore requests are external HTTP calls that frequently fail due to API limits or connection errors. Unwrapped calls can crash the script.",
      suggestedFix: "Wrap the GetAsync operation in a pcall block to catch runtime errors.",
      correctedExample: `local success, data = pcall(function()
    return myDataStore:GetAsync(key)
end)
if not success then
    warn("Failed to retrieve DataStore data")
end`,
      severity: "High",
      likelihood: 85,
    });
  }

  // SetAsync outside pcall
  if (code.includes("SetAsync") && !code.includes("pcall")) {
    issues.push({
      id: "SetAsyncOutsidePcall",
      category: "DataStore",
      title: "DataStore SetAsync called outside pcall",
      description: "DataStore writes (SetAsync) will throw errors if throttled, which interrupts game loops if not wrapped in pcall.",
      suggestedFix: "Always wrap SetAsync writes in a pcall block and log any failure reasons.",
      correctedExample: `local success, err = pcall(function()
    myDataStore:SetAsync(key, value)
end)
if not success then
    warn("Data save failed: " .. tostring(err))
end`,
      severity: "High",
      likelihood: 85,
    });
  }

  // UpdateAsync misuse
  if (code.includes("UpdateAsync")) {
    const isPcall = code.includes("pcall");
    const hasCallback = code.match(/UpdateAsync\s*\(\s*[^,]+,\s*(?:function|local)/i);
    if (!isPcall || !hasCallback) {
      issues.push({
        id: "UpdateAsyncMisuse",
        category: "DataStore",
        title: "UpdateAsync misused or called outside pcall",
        description: "UpdateAsync requires a transformation callback function as the second parameter and must be run inside a pcall to handle server-side errors safely.",
        suggestedFix: "Define a callback parameter and invoke the call inside a pcall wrapper.",
        correctedExample: `local success, err = pcall(function()
    myDataStore:UpdateAsync(key, function(oldValue)
        local newValue = oldValue or {}
        newValue.Coins = (newValue.Coins or 0) + 10
        return newValue
    end)
end)`,
        severity: "High",
        likelihood: 90,
      });
    }
  }

  return issues;
}

/**
 * Calculates the calculated confidence score based on the scoring rules.
 */
export function calculateConfidenceScore(
  logText: string,
  codeText: string,
  hasIssues: boolean
): number {
  let score = 0;

  // 1. Regex Match (40 pts)
  const match = findMatch(logText);
  if (match) {
    score += 40;
  }

  // 2. Context Pattern Match (+20 pts)
  if (hasIssues) {
    score += 20;
  }

  // 3. Roblox API detection (+15 pts)
  const hasRobloxApi = codeText.includes("game:") || 
                        codeText.includes("GetService") || 
                        codeText.includes("WaitForChild") || 
                        codeText.includes("FindFirstChild") || 
                        codeText.includes("Instance.new") || 
                        codeText.includes("Players") ||
                        codeText.includes("workspace");
  if (hasRobloxApi) {
    score += 15;
  }

  // 4. Nil Chain detection (+15 pts)
  const hasNilChain = codeText.match(/\w+\.\w+\.\w+\.\w+/) || 
                      codeText.includes("FindFirstChild") || 
                      codeText.includes("WaitForChild") ||
                      codeText.match(/:FindFirstChild\([^)]+\)\.Value/);
  if (hasNilChain) {
    score += 15;
  }

  // 5. Variable Flow (+10 pts)
  const flows = extractVariableFlow(codeText);
  if (flows && flows.length > 0) {
    score += 10;
  }

  // Cap at 100
  return Math.min(score, 100);
}

/**
 * Enriches the initial analysis object using the Context Analyzer.
 */
export function enrichAnalysis(
  analysis: Analysis,
  logText: string,
  codeText: string
): Analysis {
  const issues = analyzeCodeContext(codeText, logText);
  const confidence = calculateConfidenceScore(logText, codeText, issues.length > 0);

  // If no issues were found, just return original with calculated confidence
  if (issues.length === 0) {
    return {
      ...analysis,
      confidence,
    };
  }

  // Map issues to Ranked Causes
  const rankedCauses: Cause[] = [];
  
  // Add detected issues as high-likelihood causes
  for (const issue of issues) {
    rankedCauses.push({
      percent: issue.likelihood,
      text: `${issue.title}: ${issue.description}`,
    });
  }

  // Include original causes but adjust/scale down their percentages to be below the detected issues
  if (analysis.causes && analysis.causes.length > 0) {
    // Sort original causes descending
    const sortedOriginals = [...analysis.causes].sort((a, b) => b.percent - a.percent);
    
    // Scale them down so they fit beneath the primary detected issue
    const maxLikelihood = issues.reduce((max, i) => Math.max(max, i.likelihood), 0);
    const scaleMax = Math.max(30, maxLikelihood - 15); // e.g. if maxLikelihood is 95, scale down original to start around 80 or 70
    
    sortedOriginals.forEach((cause, idx) => {
      const scaledPercent = Math.max(10, Math.round(scaleMax * (cause.percent / 100) * (1 - idx * 0.2)));
      // Avoid duplicate text
      if (!rankedCauses.some(rc => rc.text.toLowerCase().includes(cause.text.toLowerCase().slice(0, 20)))) {
        rankedCauses.push({
          percent: scaledPercent,
          text: cause.text,
        });
      }
    });
  }

  // Sort ranked causes by percentage descending
  rankedCauses.sort((a, b) => b.percent - a.percent);

  // Map fixes and examples
  const enrichedFixes = [...analysis.fixes];
  for (const issue of issues) {
    if (!enrichedFixes.includes(issue.suggestedFix)) {
      enrichedFixes.unshift(issue.suggestedFix); // put most relevant context fixes at the top
    }
  }

  // Pick the best example matching the context issue
  const bestExample = issues[0]?.correctedExample || analysis.example;

  // Add Code Insights
  const enrichedInsights = [...(analysis.codeInsights || [])];
  for (const issue of issues) {
    if (!enrichedInsights.some(ins => ins.title === issue.title)) {
      enrichedInsights.push({
        title: issue.title,
        description: issue.description,
      });
    }
  }

  return {
    ...analysis,
    causes: rankedCauses,
    fixes: enrichedFixes,
    example: bestExample,
    confidence,
    codeInsights: enrichedInsights,
  };
}

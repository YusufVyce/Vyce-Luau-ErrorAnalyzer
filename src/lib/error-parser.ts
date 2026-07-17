// Error parser rules & matching — plain data/logic, no DOM.

export type Cause = { percent: number; text: string };
export type Analysis = {
  explanation: string;
  causes: Cause[];
  fixes: string[];
  example?: string;
};
export type Platform = "roblox" | "unity" | "discord" | "minecraft";
export type PlatformFilter = "auto" | Platform;

export type ErrorEntry = {
  id: string;
  platform: Platform;
  title: string;
  pattern: RegExp;
  analyze: (logText: string, codeText: string) => Analysis;
};

export const capitalize = (s: string) =>
  s ? s[0].toUpperCase() + s.slice(1) : s;

const PLATFORM_HINTS: Record<Platform, string[]> = {
  roblox: [
    "leaderstats",
    "workspace",
    "game.players",
    "game:getservice",
    "serverscriptservice",
    "waitforchild",
    "findfirstchild",
    "instance.new",
    ":value",
  ],
  unity: [
    "getcomponent",
    "monobehaviour",
    "serializefield",
    "gameobject",
    "debug.log",
    "transform.",
    "void start",
    "void update",
    "using unityengine",
  ],
  discord: [
    "interaction.",
    "message.",
    "discord.js",
    "client.on",
    "guild.",
    "embedbuilder",
    ".reply(",
    "deferreply",
  ],
  minecraft: [
    "server thread",
    "bukkit",
    "spigot",
    "paper",
    "nbttagcompound",
    "plugin.yml",
    "net.minecraft",
    "entitytype",
    "chunk ",
  ],
};

export function detectPlatform(text: string): Platform | null {
  const lower = text.toLowerCase();
  let best: Platform | null = null;
  let bestScore = 0;
  for (const [platform, hints] of Object.entries(PLATFORM_HINTS) as [
    Platform,
    string[],
  ][]) {
    const score = hints.reduce(
      (sum, hint) => sum + (lower.includes(hint) ? 1 : 0),
      0,
    );
    if (score > bestScore) {
      bestScore = score;
      best = platform;
    }
  }
  return best;
}

export const ERROR_DICT: ErrorEntry[] = [
  {
    id: "roblox-index-nil",
    platform: "roblox",
    title: "Attempt to index nil",
    pattern: /attempt to index/i,
    analyze(logText, codeText) {
      const propMatch = logText.match(/with ['"]?([^'"]+)['"]?/i);
      const targetProperty = propMatch ? propMatch[1] : "unknown property";
      const causes: Cause[] = [];
      const fixes: string[] = [];
      let example = "";

      if (!codeText) {
        causes.push({
          percent: 90,
          text: `You are trying to access .${targetProperty} on an object that is currently nil. Add the related code above for a more precise analysis.`,
        });
        fixes.push(`Add a nil check before accessing .${targetProperty}.`);
        example = `if myObject then\n  print(myObject.${targetProperty})\nend`;
      } else if (
        codeText.includes(`.${targetProperty}`) &&
        (codeText.includes("leaderstats") || codeText.includes("player."))
      ) {
        causes.push({
          percent: 88,
          text: "Data dependency issue: leaderstats or the value inside it has not replicated to the client yet when the script runs.",
        });
        causes.push({
          percent: 12,
          text: "The player object is invalid, or the player left the game before initialization finished.",
        });
        fixes.push(
          "Use :WaitForChild() instead of direct dot notation for objects created at runtime.",
        );
        fixes.push(
          "Check that the player/character still exists before reading from it.",
        );
        example = `local leaderstats = player:WaitForChild("leaderstats", 5)\nif not leaderstats then return end\n\nlocal targetValue = leaderstats:WaitForChild("Coins", 5)\nif targetValue then\n  print(targetValue.${targetProperty})\nend`;
      } else if (codeText.includes("[") && codeText.includes("]")) {
        causes.push({
          percent: 94,
          text: `Table/dictionary lookup returned nil. The key you used does not exist in the table, so indexing .${targetProperty} on the result fails.`,
        });
        causes.push({
          percent: 6,
          text: "The table itself is nil, or failed to initialize before this line ran.",
        });
        fixes.push(
          "Verify the key exists in the table before accessing its properties.",
        );
        example = `local item = data.Items[selectedItem]\nif item then\n  print(item.${targetProperty})\nelse\n  warn("Item key not found in dictionary: ", tostring(selectedItem))\nend`;
      } else if (codeText.includes("require(")) {
        causes.push({
          percent: 95,
          text: `require() returned nil. You are trying to read .${targetProperty} from a module that errored silently, or one that is recursively requiring itself.`,
        });
        fixes.push(
          "Check the required ModuleScript for errors and confirm it ends with 'return module'.",
        );
      } else {
        causes.push({
          percent: 80,
          text: `The object you're reading .${targetProperty} from was destroyed, misspelled, or never instantiated.`,
        });
        causes.push({
          percent: 20,
          text: "Scope issue: the variable exists, but in a different block than the one erroring.",
        });
        fixes.push(
          "Trace where the variable is defined. Use :FindFirstChild() with a nil check instead of assuming it exists.",
        );
        example = `local obj = workspace:FindFirstChild("TargetName")\nif obj then\n  print(obj.${targetProperty})\nend`;
      }

      return {
        explanation: `The script tried to read or modify the '${targetProperty}' property of an object, but that object does not exist in memory (it is nil).`,
        causes,
        fixes,
        example,
      };
    },
  },
  {
    id: "roblox-infinite-yield",
    platform: "roblox",
    title: "Infinite yield possible",
    pattern: /Infinite yield possible on/i,
    analyze(logText, codeText) {
      const match = logText.match(/Infinite yield possible on ['"]?([^'"\n]+)['"]?/i);
      const targetStr = match ? match[1] : "object";
      const causes: Cause[] = [
        {
          percent: 85,
          text: `The script is stuck waiting for '${targetStr}', which has not been created yet or was named differently.`,
        },
      ];
      const fixes: string[] = [
        `Check that the spelling and casing of '${targetStr}' matches the Explorer hierarchy exactly.`,
      ];
      if (codeText && codeText.includes("WaitForChild")) {
        causes.push({
          percent: 15,
          text: `Race condition: the script responsible for creating '${targetStr}' errored or yielded forever before creating it.`,
        });
        fixes.push(
          "Add a timeout parameter to WaitForChild() so it fails fast instead of hanging silently.",
        );
      }
      return {
        explanation:
          "A :WaitForChild() call has waited longer than 5 seconds without finding its target and is logging a warning.",
        causes,
        fixes,
        example: `local target = parent:WaitForChild("${targetStr.split(":")[0]}", 5)\nif not target then\n  warn("Failed to load target")\n  return\nend`,
      };
    },
  },
  {
    id: "unity-nullref",
    platform: "unity",
    title: "NullReferenceException",
    pattern: /NullReferenceException/i,
    analyze(_logText, codeText) {
      const causes: Cause[] = [];
      if (codeText && codeText.includes("GetComponent")) {
        causes.push({
          percent: 90,
          text: "GetComponent() returned null because the required component is not attached to this GameObject.",
        });
        causes.push({
          percent: 10,
          text: "The code is trying to access a component on a GameObject that has already been destroyed.",
        });
      } else if (
        codeText &&
        (codeText.includes("public ") || codeText.includes("[SerializeField]"))
      ) {
        causes.push({
          percent: 95,
          text: "A public or [SerializeField] field was left unassigned in the Unity Inspector.",
        });
      } else {
        causes.push({
          percent: 80,
          text: "An object reference is being used before it was instantiated with 'new' or assigned a value.",
        });
      }
      return {
        explanation: "C# tried to use an object, but its value is currently 'null'.",
        causes,
        fixes: [
          "Assign the missing reference in the Inspector.",
          "Check that the object is instantiated before this line runs.",
        ],
        example: `if (myReference == null) {\n    Debug.LogError("Reference is missing!");\n    return;\n}\nmyReference.DoSomething();`,
      };
    },
  },
  {
    id: "unity-missingreference",
    platform: "unity",
    title: "MissingReferenceException",
    pattern: /MissingReferenceException/i,
    analyze() {
      return {
        explanation:
          "You're using a reference to a GameObject or Component that Unity already destroyed. Unlike a plain null, this object once existed.",
        causes: [
          {
            percent: 80,
            text: "Destroy() was called on this object earlier, but a cached reference to it is still being used somewhere else.",
          },
          {
            percent: 20,
            text: "The scene that owned this object was unloaded while something outside it still held a reference.",
          },
        ],
        fixes: [
          "Check for this specific reference with 'if (myObject != null)' — Unity overloads == to detect destroyed objects.",
          "Clear cached references in OnDestroy() so nothing downstream can use them after cleanup.",
        ],
        example: `if (myObject != null) {\n    myObject.DoSomething();\n} else {\n    myObject = null; // release the dangling reference\n}`,
      };
    },
  },
  {
    id: "discord-undefined-prop",
    platform: "discord",
    title: "Cannot read properties of undefined",
    pattern: /Cannot read propert(?:y|ies) of undefined/i,
    analyze(logText, codeText) {
      const match = logText.match(/reading ['"]([^'"]+)['"]/i);
      const prop = match ? match[1] : "property";
      const causes: Cause[] = [];
      const fixes: string[] = [];
      if (codeText && (codeText.includes("interaction.") || codeText.includes("message."))) {
        causes.push({
          percent: 80,
          text: `.${prop} is being read from a message/interaction object that wasn't cached, or was passed incorrectly into this function.`,
        });
        causes.push({
          percent: 20,
          text: "API shape change: this looks like discord.js v13 code running against v14.",
        });
        fixes.push(
          "Log the parent object right before this line to confirm it exists and has the shape you expect.",
        );
        fixes.push("If the data comes from a fetch, confirm you used 'await'.");
      } else {
        causes.push({
          percent: 90,
          text: `The parent object of .${prop} is undefined in this scope.`,
        });
        fixes.push(
          "Ensure the object is passed into the event handler or function correctly.",
        );
      }
      return {
        explanation: `Node.js crashed because it tried to access '${prop}' on an undefined variable.`,
        causes,
        fixes,
        example: `if (!myObject) {\n  console.error("Object is undefined before reading ${prop}");\n  return;\n}\nmyObject.${prop}();`,
      };
    },
  },
  {
    id: "discord-unknown-interaction",
    platform: "discord",
    title: "DiscordAPIError: Unknown interaction",
    pattern: /Unknown interaction/i,
    analyze(_logText, codeText) {
      const causes: Cause[] = [
        {
          percent: 75,
          text: "The interaction wasn't replied to within Discord's 3-second window, so its token expired before reply() ran.",
        },
      ];
      const fixes: string[] = [
        "Call interaction.deferReply() immediately if any async work happens before you can send a real reply.",
      ];
      if (
        codeText &&
        codeText.includes("reply") &&
        (codeText.match(/reply\(/g) || []).length > 1
      ) {
        causes.push({
          percent: 25,
          text: "The interaction was already replied to or deferred earlier, and a second reply() is being attempted.",
        });
        fixes.push(
          "Use editReply() or followUp() instead of reply() after the first response.",
        );
      } else {
        causes.push({
          percent: 25,
          text: "A slow database or API call is blocking the reply past the 3-second timeout.",
        });
        fixes.push(
          "Move slow work after an initial deferReply() call so Discord knows you're still working on it.",
        );
      }
      return {
        explanation:
          "Discord rejected the response because the interaction token is no longer valid — usually from replying too late or replying twice.",
        causes,
        fixes,
        example: `async function handle(interaction) {\n  await interaction.deferReply();\n  const result = await slowLookup();\n  await interaction.editReply(result);\n}`,
      };
    },
  },
  {
    id: "minecraft-nullpointer",
    platform: "minecraft",
    title: "NullPointerException",
    pattern: /NullPointerException/i,
    analyze(logText) {
      const helpful = logText.match(/because ["“]([^"”]+)["”] is null/i);
      const target = helpful ? helpful[1] : null;
      const causes: Cause[] = [];
      const fixes: string[] = [];
      if (target) {
        causes.push({
          percent: 85,
          text: `'${target}' is null at the point it is used — something upstream failed to initialize or return it.`,
        });
        causes.push({
          percent: 15,
          text: "A config value, NBT tag, or block/entity lookup returned null and was used without a check.",
        });
        fixes.push(`Add a null check for '${target}' immediately before this line.`);
        fixes.push(
          `Trace where '${target}' is assigned and confirm it happens before this code runs.`,
        );
      } else {
        causes.push({
          percent: 70,
          text: "A field, block state, or entity reference is null because it was never set, or the entity/chunk was unloaded.",
        });
        causes.push({
          percent: 30,
          text: "A plugin/mod event hook fired before the world or player object was fully initialized.",
        });
        fixes.push("Add defensive null checks around block, entity, and player lookups.");
        fixes.push(
          "Confirm the event you are listening to fires after the relevant object is guaranteed to be loaded.",
        );
      }
      return {
        explanation: `The JVM tried to use a reference that points to nothing (null)${target ? ` — specifically '${target}'` : ""}.`,
        causes,
        fixes,
        example: target
          ? `if (${target.split(".")[0]} != null) {\n    // safe to use ${target}\n} else {\n    getLogger().warning("${target} was null, skipping");\n}`
          : `Entity target = world.getEntity(uuid);\nif (target != null) {\n    target.doSomething();\n}`,
      };
    },
  },
  {
    id: "minecraft-classnotfound",
    platform: "minecraft",
    title: "ClassNotFoundException / NoClassDefFoundError",
    pattern: /ClassNotFoundException|NoClassDefFoundError/i,
    analyze(logText) {
      const match = logText.match(
        /(?:ClassNotFoundException|NoClassDefFoundError):\s*([\w.$]+)/i,
      );
      const cls = match ? match[1] : "the referenced class";
      return {
        explanation: `The JVM could not find or load ${cls} at runtime, even though your code (or plugin.yml) references it.`,
        causes: [
          {
            percent: 60,
            text: "The 'main' field in plugin.yml points to a class that doesn't match your actual package/class name.",
          },
          {
            percent: 25,
            text: "A shaded/relocated dependency is missing from the final jar (not bundled by your build tool).",
          },
          {
            percent: 15,
            text: "The class was renamed or moved, and the build wasn't refreshed before deploying.",
          },
        ],
        fixes: [
          "Double-check plugin.yml's 'main:' value matches your class's fully qualified name exactly.",
          "If using Maven/Gradle, confirm shading (shadowJar / maven-shade-plugin) actually includes the missing dependency.",
          "Rebuild and redeploy the jar — an old cached jar on the server is a common culprit.",
        ],
        example: `# plugin.yml\nname: MyPlugin\nmain: com.example.myplugin.MyPlugin  # must match the class exactly\nversion: 1.0`,
      };
    },
  },
];

export type MatchResult = {
  entry: ErrorEntry;
  match: string;
  detectedPlatform: Platform | null;
};

export function findMatch(
  logText: string,
  codeText: string,
  platformFilter: PlatformFilter,
): MatchResult | null {
  const combined = `${logText}\n${codeText}`;
  const detected = platformFilter === "auto" ? detectPlatform(combined) : null;
  const candidates =
    platformFilter === "auto"
      ? ERROR_DICT
      : ERROR_DICT.filter((e) => e.platform === platformFilter);

  const matches = candidates
    .map((entry) => {
      const m = logText.match(entry.pattern);
      return m ? { entry, match: m[0] } : null;
    })
    .filter((v): v is { entry: ErrorEntry; match: string } => Boolean(v));

  if (matches.length === 0) return null;
  if (matches.length === 1 || !detected)
    return { ...matches[0], detectedPlatform: detected };

  const preferred = matches.find((m) => m.entry.platform === detected);
  return { ...(preferred || matches[0]), detectedPlatform: detected };
}

export const EXAMPLES: {
  platform: Platform;
  error: string;
  code: string;
}[] = [
  {
    platform: "roblox",
    error: "ServerScriptService.Inventory:41: attempt to index nil with 'Value'",
    code:
      "local player = game.Players.LocalPlayer\nlocal leaderstats = player.leaderstats\nlocal coins = leaderstats.Coins\n\nprint(coins.Value)",
  },
  {
    platform: "unity",
    error:
      "NullReferenceException: Object reference not set to an instance of an object\n  at PlayerController.Update () [0x0001a] in Assets/Scripts/PlayerController.cs:24",
    code:
      "void Update() {\n    rb = GetComponent<Rigidbody>();\n    rb.velocity = Vector3.forward * speed;\n}",
  },
  {
    platform: "discord",
    error: "DiscordAPIError[10062]: Unknown interaction",
    code:
      "client.on('interactionCreate', async interaction => {\n  const data = await slowDatabaseCall();\n  await interaction.reply(data);\n});",
  },
  {
    platform: "minecraft",
    error:
      'java.lang.NullPointerException: Cannot invoke "org.bukkit.entity.Player.sendMessage(String)" because "target" is null\n  at com.example.plugin.Commands.onCommand(Commands.java:33)',
    code:
      'Player target = Bukkit.getPlayer(args[0]);\ntarget.sendMessage("Hello!");',
  },
];

export { PLATFORM_FIX_SNIPPETS } from "./platform-fixes";

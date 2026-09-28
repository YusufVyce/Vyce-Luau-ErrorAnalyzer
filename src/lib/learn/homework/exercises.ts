/**
 * Homework for every lesson. Each exercise runs the student's code in the
 * simulated Roblox world, then checks what actually happened (Output, parts,
 * leaderstats, remotes…). Where it matters, the code is re-run with different
 * starting values so a hand-typed answer can't pass.
 */
import { Color3, Vector3 } from "@/lib/luau/roblox/datatypes";
import type { Instance } from "@/lib/luau/roblox/instance";
import type { World } from "@/lib/luau/roblox/world";
import { fmtValue, type Exercise, type Harness } from "./harness";

const approx = (a: unknown, b: number, eps = 0.02) =>
  typeof a === "number" && Math.abs(a - b) <= eps;
const vecIs = (v: unknown, x: number, y: number, z: number, eps = 0.02) =>
  v instanceof Vector3 &&
  Math.abs(v.x - x) <= eps &&
  Math.abs(v.y - y) <= eps &&
  Math.abs(v.z - z) <= eps;

/** Replaces the first match; returns undefined if the pattern isn't in the code. */
function variant(code: string, pattern: RegExp, replacement: string): string | undefined {
  if (!pattern.test(code)) return undefined;
  return code.replace(pattern, replacement);
}

function leaderstat(player: Instance, name: string): Instance | undefined {
  return player.findFirstChild("leaderstats")?.findFirstChild(name);
}

function addLeaderstatsFixture(w: World, coins: number) {
  w.addScript({
    name: "Leaderstats",
    parent: w.service("ServerScriptService"),
    source: `game.Players.PlayerAdded:Connect(function(player)
  local ls = Instance.new("Folder")
  ls.Name = "leaderstats"
  ls.Parent = player
  local c = Instance.new("IntValue")
  c.Name = "Coins"
  c.Value = ${coins}
  c.Parent = ls
end)`,
  });
}

function character(p: Instance): Instance | undefined {
  return p.props.get("Character") as Instance | undefined;
}

export const EXERCISES: Exercise[] = [
  // ---------------------------------------------------------------- first-script
  {
    lessonId: "first-script",
    title: "Say hello",
    kind: "write",
    goal: "Write two lines of code that print to the Output.",
    steps: [
      "Print exactly: Hello Roblox!",
      "Print the answer to 7 * 6 — let Luau do the math, don't type 42 yourself.",
    ],
    scriptKind: "Script",
    location: "ServerScriptService › Script",
    starter: "-- Write your code below\n\n",
    hints: [
      'print("some text") writes text to the Output. Text needs quotes around it.',
      "Math doesn't need quotes: print(2 + 2) prints 4.",
    ],
    solution: 'print("Hello Roblox!")\nprint(7 * 6)\n',
    grade(h) {
      const w = h.newWorld();
      h.addStudentScript(w, w.service("ServerScriptService"));
      w.run(1);
      h.expectPrinted("Hello Roblox!", 'Output shows "Hello Roblox!"');
      h.expectPrinted("42", "Output shows 42");
      h.check(
        "42 comes from the math 7 * 6",
        h.codeHas(/7\s*\*\s*6/),
        "Write the multiplication in your code, e.g. print(7 * 6).",
      );
    },
  },

  // ---------------------------------------------------------------- script-types
  {
    lessonId: "script-types",
    title: "Welcome every player",
    kind: "fix",
    goal: "This server Script crashes. Fix it so it welcomes every player who joins.",
    steps: [
      "It must print: Welcome, <player name>!  (for example Welcome, Builderman!)",
      "It has to work for every player, not just one.",
      "Hint: this is a Script on the server — think about what LocalPlayer is there.",
    ],
    scriptKind: "Script",
    location: "ServerScriptService › Script",
    starter: 'local player = game.Players.LocalPlayer\nprint("Welcome, " .. player.Name .. "!")\n',
    hints: [
      "On the server Players.LocalPlayer is always nil — there are many players, not one.",
      "Use game.Players.PlayerAdded:Connect(function(player) ... end) — Roblox gives you each player who joins.",
    ],
    solution:
      'game.Players.PlayerAdded:Connect(function(player)\n\tprint("Welcome, " .. player.Name .. "!")\nend)\n',
    grade(h) {
      const w = h.newWorld();
      h.addStudentScript(w, w.service("ServerScriptService"));
      w.run(0.5);
      w.addPlayer("Builderman");
      w.run(0.5);
      w.addPlayer("Noob");
      w.run(1);
      h.expectPrinted("Welcome, Builderman!");
      h.expectPrinted("Welcome, Noob!", 'Also works for a second player ("Welcome, Noob!")');
      h.check(
        "Uses Players.PlayerAdded",
        h.codeHas(/PlayerAdded/),
        "Connect a function to game.Players.PlayerAdded.",
      );
      h.check(
        "No more LocalPlayer on the server",
        !h.codeHas(/LocalPlayer/),
        "Remove Players.LocalPlayer — it's nil in a server Script.",
      );
    },
  },

  // ---------------------------------------------------------------- variables
  {
    lessonId: "variables",
    title: "Level up!",
    kind: "write",
    goal: "Store a player's info in variables, level up, and print a message built from them.",
    steps: [
      'Create a variable playerName with the text "Builderman"',
      "Create a variable level with the number 5",
      "Create a variable isVip set to true",
      "Level up: add 1 to level (change the variable, don't write 6)",
      "Print: Builderman is level 6 — join your variables with ..",
    ],
    scriptKind: "Script",
    location: "ServerScriptService › Script",
    starter: "-- Create your variables here\n\n",
    hints: [
      'local playerName = "Builderman" creates a text variable.',
      "level = level + 1 (or level += 1) adds one.",
      'print(playerName .. " is level " .. level)',
    ],
    solution:
      'local playerName = "Builderman"\nlocal level = 5\nlocal isVip = true\n\nlevel += 1\nprint(playerName .. " is level " .. level)\n',
    testFooter: 'print("__TEST__", typeof(isVip), tostring(isVip))',
    grade(h) {
      const w = h.newWorld();
      h.addStudentScript(w, w.service("ServerScriptService"));
      w.run(1);
      h.expectPrinted("Builderman is level 6");
      const tv = h.testValues(w)[0];
      h.check(
        "isVip is true",
        tv?.[0] === "boolean" && tv?.[1] === "true",
        tv?.[0] === "string"
          ? 'isVip holds the text "true" — write true without quotes.'
          : "Create local isVip = true (no quotes).",
      );
      h.check(
        "level goes up with math",
        h.codeHas(/level\s*(\+=\s*1|=\s*level\s*\+\s*1)/),
        "Change the variable: level += 1",
      );
      const v = variant(
        variant(h.code, /(local\s+playerName\s*=\s*)"Builderman"/, '$1"Guest"') ?? "",
        /(local\s+level\s*=\s*)5\b/,
        "$19",
      );
      if (v) {
        const w2 = h.newWorld();
        h.addStudentScript(w2, w2.service("ServerScriptService"), { code: v });
        w2.run(1);
        h.expectPrinted(
          "Guest is level 10",
          "The message is built from the variables (not typed by hand)",
          w2,
        );
      } else {
        h.check(
          "Uses the variables playerName and level",
          false,
          'Keep the lines local playerName = "Builderman" and local level = 5 exactly, so the checker can try other values.',
        );
      }
    },
  },

  // ---------------------------------------------------------------- math-strings
  {
    lessonId: "math-strings",
    title: "Egg shop math",
    kind: "write",
    goal: "A player buys eggs. Work out how many coins they have left.",
    steps: [
      "amountText is text typed by the player — turn it into a number with tonumber",
      "Calculate coins left: coins minus (amount × eggPrice)",
      "Print: Coins left: 250",
    ],
    scriptKind: "Script",
    location: "ServerScriptService › Script",
    starter:
      'local coins = 1000\nlocal eggPrice = 250\nlocal amountText = "3" -- text typed by the player\n\n-- 1) Turn amountText into a number\n-- 2) Calculate the coins left after buying\n-- 3) Print: Coins left: 250\n',
    hints: [
      "local amount = tonumber(amountText)",
      "local left = coins - amount * eggPrice",
      'print("Coins left: " .. left)',
    ],
    solution:
      'local coins = 1000\nlocal eggPrice = 250\nlocal amountText = "3" -- text typed by the player\n\nlocal amount = tonumber(amountText)\nlocal left = coins - amount * eggPrice\nprint("Coins left: " .. left)\n',
    grade(h) {
      const w = h.newWorld();
      h.addStudentScript(w, w.service("ServerScriptService"));
      w.run(1);
      h.expectPrinted("Coins left: 250");
      h.check(
        "Uses tonumber",
        h.codeHas(/tonumber\s*\(/),
        "Convert the text first: local amount = tonumber(amountText)",
      );
      const v = variant(
        variant(h.code, /(local\s+coins\s*=\s*)1000\b/, "$12000") ?? "",
        /(local\s+amountText\s*=\s*)"3"/,
        '$1"4"',
      );
      if (v) {
        const w2 = h.newWorld();
        h.addStudentScript(w2, w2.service("ServerScriptService"), { code: v });
        w2.run(1);
        h.expectPrinted(
          "Coins left: 1000",
          "Works for other numbers too (2000 coins, 4 eggs → 1000)",
          w2,
        );
      } else {
        h.check(
          "Keeps the starting variables",
          false,
          "Keep the first three lines as they are so the checker can try other values.",
        );
      }
    },
  },

  // ---------------------------------------------------------------- if-statements
  {
    lessonId: "if-statements",
    title: "Tower of Hell finish line",
    kind: "write",
    goal: "Print a different message depending on the stage.",
    steps: [
      'If stage is 10: print "Winner!"',
      'Else if stage is 7 or more: print "Almost there"',
      'Otherwise: print "Keep climbing"',
      "Only ONE message may print for any stage.",
    ],
    scriptKind: "Script",
    location: "ServerScriptService › Script",
    starter:
      "local stage = 7 -- the checker will try other numbers too\n\n-- write your if / elseif / else here\n",
    hints: [
      "Start with the most specific case: if stage == 10 then",
      "Use elseif stage >= 7 then for the second case",
      "Finish with else and end.",
    ],
    solution:
      'local stage = 7 -- the checker will try other numbers too\n\nif stage == 10 then\n\tprint("Winner!")\nelseif stage >= 7 then\n\tprint("Almost there")\nelse\n\tprint("Keep climbing")\nend\n',
    grade(h) {
      const cases: Array<[number, string]> = [
        [10, "Winner!"],
        [8, "Almost there"],
        [7, "Almost there"],
        [3, "Keep climbing"],
      ];
      const all = ["Winner!", "Almost there", "Keep climbing"];
      for (const [stage, expected] of cases) {
        const code = variant(h.code, /local\s+stage\s*=\s*\d+/, `local stage = ${stage}`);
        if (!code) {
          h.check(
            "Keeps the line local stage = 7",
            false,
            "Don't remove local stage = 7 — the checker changes that number to test your code.",
          );
          return;
        }
        const w = h.newWorld();
        h.addStudentScript(w, w.service("ServerScriptService"), { code });
        w.run(1);
        const printed = h.prints(w).filter((l) => all.includes(l));
        const ok = printed.length === 1 && printed[0] === expected;
        h.check(
          `stage = ${stage} prints "${expected}"`,
          ok,
          printed.length === 0
            ? `Nothing matching was printed for stage ${stage}.`
            : printed.length > 1
              ? `For stage ${stage} your code printed ${printed.map((p) => `"${p}"`).join(" and ")}. Use elseif so only one branch runs, and check stage == 10 first.`
              : `For stage ${stage} it printed "${printed[0]}" instead.`,
        );
      }
      h.check(
        "Uses if … elseif … else",
        h.codeHas(/\bif\b[\s\S]*\belseif\b[\s\S]*\belse\b/),
        "Use one if with an elseif and an else.",
      );
    },
  },

  // ---------------------------------------------------------------- loops
  {
    lessonId: "loops",
    title: "Round countdown",
    kind: "write",
    goal: "Count down like a round-based game, then list the players.",
    steps: [
      "Print 5, 4, 3, 2, 1 — one number every second (use a for loop and task.wait(1))",
      'Then print "Go!"',
      "Then print every name in the players list with a for … in loop",
    ],
    scriptKind: "Script",
    location: "ServerScriptService › Script",
    starter:
      'local players = {"Ann", "Bob", "Cid"}\n\n-- 1) Count down 5, 4, 3, 2, 1 (one per second)\n-- 2) print "Go!"\n-- 3) print every name in players\n',
    hints: [
      "for i = 5, 1, -1 do ... end counts down.",
      "Put task.wait(1) inside the countdown loop.",
      "for _, name in players do print(name) end",
    ],
    solution:
      'local players = {"Ann", "Bob", "Cid"}\n\nfor i = 5, 1, -1 do\n\tprint(i)\n\ttask.wait(1)\nend\nprint("Go!")\n\nfor _, name in players do\n\tprint(name)\nend\n',
    grade(h) {
      const w = h.newWorld();
      h.addStudentScript(w, w.service("ServerScriptService"));
      w.run(8);
      const lines = h.prints(w);
      const expected = ["5", "4", "3", "2", "1", "Go!", "Ann", "Bob", "Cid"];
      const positions = expected.map((e) => lines.indexOf(e));
      h.check(
        "Prints 5, 4, 3, 2, 1",
        positions.slice(0, 5).every((p) => p >= 0),
        `The Output shows: ${lines.slice(0, 8).join(", ") || "nothing"}`,
      );
      const inOrder = positions.every((p, i) => p >= 0 && (i === 0 || p > positions[i - 1]));
      h.check(
        "Everything prints in the right order",
        inOrder,
        "Order should be 5, 4, 3, 2, 1, Go!, Ann, Bob, Cid.",
      );
      const entries = h.printEntries(w);
      const times = ["5", "4", "3", "2", "1"].map((n) => entries.find((e) => e.text === n)?.time);
      const spaced = times.every(
        (t, i) => t !== undefined && (i === 0 || t - (times[i - 1] as number) >= 0.9),
      );
      h.check(
        "Waits 1 second between numbers",
        spaced,
        "Add task.wait(1) inside the countdown loop.",
      );
      h.check(
        "Counts with a numeric for loop",
        h.codeHas(/for\s+\w+\s*=\s*5\s*,\s*1\s*,\s*-1/),
        "Use for i = 5, 1, -1 do",
      );
      const v = variant(
        h.code,
        /local\s+players\s*=\s*\{[^}]*\}/,
        'local players = {"Zed", "Max"}',
      );
      if (v) {
        const w2 = h.newWorld();
        h.addStudentScript(w2, w2.service("ServerScriptService"), { code: v });
        w2.run(8);
        const l2 = h.prints(w2);
        h.check(
          "Names come from the list (loop, not typed)",
          l2.includes("Zed") && l2.includes("Max") && !l2.includes("Ann"),
          "Loop over the players table instead of printing names by hand.",
        );
      }
    },
  },

  // ---------------------------------------------------------------- functions
  {
    lessonId: "functions",
    title: "Damage calculator",
    kind: "write",
    goal: "Write a reusable function that calculates damage.",
    steps: [
      "Create local function calculateDamage(baseDamage, level)",
      "It must RETURN baseDamage + level * 2",
      "Print calculateDamage(10, 50) — it should show 110",
    ],
    scriptKind: "Script",
    location: "ServerScriptService › Script",
    starter:
      "-- 1) write the function calculateDamage(baseDamage, level)\n\n-- 2) print the damage for baseDamage 10 and level 50\n",
    hints: [
      "local function calculateDamage(baseDamage, level)\n\treturn ...\nend",
      "return baseDamage + level * 2",
      "print(calculateDamage(10, 50))",
    ],
    solution:
      "local function calculateDamage(baseDamage, level)\n\treturn baseDamage + level * 2\nend\n\nprint(calculateDamage(10, 50))\n",
    testFooter:
      'if type(calculateDamage) == "function" then print("__TEST__", calculateDamage(5, 1), calculateDamage(100, 10), calculateDamage(0, 0)) else print("__TEST__", "missing") end',
    grade(h) {
      const w = h.newWorld();
      h.addStudentScript(w, w.service("ServerScriptService"));
      w.run(1);
      const tv = h.testValues(w)[0];
      const exists = tv !== undefined && tv[0] !== "missing";
      h.check(
        "A function called calculateDamage exists",
        exists,
        "Name it exactly calculateDamage (capital D) and define it at the top level of the script.",
      );
      if (exists) {
        const ok = tv[0] === "7" && tv[1] === "120" && tv[2] === "0";
        h.check(
          "It returns baseDamage + level * 2",
          ok,
          tv[0] === "nil"
            ? "Your function doesn't give anything back — use return."
            : `calculateDamage(5, 1) gave ${tv[0]} (expected 7), calculateDamage(100, 10) gave ${tv[1]} (expected 120).`,
        );
      }
      h.expectPrinted("110", "Prints 110 for calculateDamage(10, 50)");
    },
  },

  // ---------------------------------------------------------------- tables
  {
    lessonId: "tables",
    title: "Pet inventory",
    kind: "write",
    goal: "Build a pet inventory with a list and a dictionary.",
    steps: [
      'Create a list pets with "Dog" and "Cat"',
      'Add "Dragon" to it with table.insert',
      'Create a dictionary dragon with Name = "Shadow Dragon", Rarity = "Legendary", Power = 950',
      "Print every pet with a for loop",
      "Print dragon.Rarity",
    ],
    scriptKind: "Script",
    location: "ServerScriptService › Script",
    starter: "-- your inventory code here\n",
    hints: [
      'local pets = {"Dog", "Cat"}',
      'table.insert(pets, "Dragon")',
      "for _, pet in pets do print(pet) end",
    ],
    solution:
      'local pets = {"Dog", "Cat"}\ntable.insert(pets, "Dragon")\n\nlocal dragon = {\n\tName = "Shadow Dragon",\n\tRarity = "Legendary",\n\tPower = 950,\n}\n\nfor _, pet in pets do\n\tprint(pet)\nend\nprint(dragon.Rarity)\n',
    testFooter:
      'print("__TEST__", type(pets) == "table" and #pets or "none", type(pets) == "table" and tostring(pets[3]) or "none", type(dragon) == "table" and tostring(dragon.Power) or "none", type(dragon) == "table" and tostring(dragon.Rarity) or "none")',
    grade(h) {
      const w = h.newWorld();
      h.addStudentScript(w, w.service("ServerScriptService"));
      w.run(1);
      const [count, third, power, rarity] = h.testValues(w)[0] ?? [];
      h.check(
        "pets has 3 pets",
        count === "3",
        count === "none" ? "Create a table called pets." : `pets has ${count} items.`,
      );
      h.check('The 3rd pet is "Dragon"', third === "Dragon", `pets[3] is ${third}.`);
      h.check(
        "Uses table.insert",
        h.codeHas(/table\.insert\s*\(/),
        'Add the dragon with table.insert(pets, "Dragon").',
      );
      h.check(
        "dragon has Power 950 and Rarity Legendary",
        power === "950" && rarity === "Legendary",
        power === "none"
          ? "Create a table called dragon with named keys."
          : `dragon.Power = ${power}, dragon.Rarity = ${rarity}`,
      );
      const lines = h.prints(w);
      h.check(
        "Prints every pet",
        ["Dog", "Cat", "Dragon"].every((p) => lines.some((l) => l.split(" ").includes(p))),
        "Loop over pets and print each one.",
      );
      h.check(
        "Prints the dragon's rarity",
        lines.some((l) => l.includes("Legendary")),
        "print(dragon.Rarity)",
      );
      h.check("Uses a for loop", h.codeHas(/\bfor\b/), "Print the pets with a for loop.");
    },
  },

  // ---------------------------------------------------------------- parts
  {
    lessonId: "parts",
    title: "Build a platform with code",
    kind: "write",
    goal: "Create a glowing platform from a script.",
    steps: [
      "Create a Part named Platform",
      "Size 8, 1, 8 and Position 0, 10, 0",
      "Anchored so it doesn't fall",
      "Red (Color3.fromRGB(255, 0, 0)) and Neon material",
      "Put it in workspace",
    ],
    scriptKind: "Script",
    location: "ServerScriptService › Script",
    starter: '-- local part = Instance.new("Part")\n',
    hints: [
      'local part = Instance.new("Part")',
      "part.Size = Vector3.new(8, 1, 8)",
      "part.Material = Enum.Material.Neon",
      "part.Parent = workspace (do this last)",
    ],
    solution:
      'local part = Instance.new("Part")\npart.Name = "Platform"\npart.Size = Vector3.new(8, 1, 8)\npart.Position = Vector3.new(0, 10, 0)\npart.Anchored = true\npart.Color = Color3.fromRGB(255, 0, 0)\npart.Material = Enum.Material.Neon\npart.Parent = workspace\n',
    grade(h) {
      const w = h.newWorld();
      h.addStudentScript(w, w.service("ServerScriptService"));
      w.run(1);
      const part = w.workspace.findFirstChild("Platform");
      const other = w.workspace.children.find(
        (c) => c.isA("BasePart") && !["Baseplate", "SpawnLocation", "Terrain"].includes(c.name),
      );
      if (
        !h.check(
          "A part named Platform is in workspace",
          Boolean(part),
          other
            ? `Found a part called "${other.name}" — set part.Name = "Platform".`
            : "Create the part and set part.Parent = workspace.",
        )
      )
        return;
      const p = part!;
      h.check("It's a Part", p.className === "Part", `It's a ${p.className}.`);
      h.check(
        "Size is 8, 1, 8",
        vecIs(p.props.get("Size"), 8, 1, 8),
        `Size is ${fmtValue(p.props.get("Size"))}.`,
      );
      h.check(
        "Position is 0, 10, 0",
        vecIs(p.props.get("Position"), 0, 10, 0),
        `Position is ${fmtValue(p.props.get("Position"))}.`,
      );
      h.check(
        "Anchored is true",
        p.props.get("Anchored") === true,
        "Set part.Anchored = true or it will fall.",
      );
      const c = p.props.get("Color") as Color3;
      h.check(
        "It's red",
        c instanceof Color3 && c.r > 0.95 && c.g < 0.05 && c.b < 0.05,
        `Color is ${fmtValue(c)} — use Color3.fromRGB(255, 0, 0).`,
      );
      h.check(
        "Material is Neon",
        fmtValue(p.props.get("Material")) === "Enum.Material.Neon",
        `Material is ${fmtValue(p.props.get("Material"))}.`,
      );
    },
  },

  // ---------------------------------------------------------------- events
  {
    lessonId: "events",
    title: "Lava floor",
    kind: "write",
    goal: "Make the Lava part kill any player who touches it — without crashing.",
    steps: [
      "When something touches the lava, look for a Humanoid in hit.Parent",
      "If there is one, set its Health to 0",
      "Rocks, NPC parts and hats also touch the lava — your script must not crash",
    ],
    scriptKind: "Script",
    location: "Workspace › Lava › Script",
    starter: "local lava = script.Parent\n\n",
    hints: [
      "lava.Touched:Connect(function(hit) ... end)",
      'local humanoid = hit.Parent:FindFirstChildOfClass("Humanoid")',
      "if humanoid then humanoid.Health = 0 end",
    ],
    solution:
      'local lava = script.Parent\n\nlava.Touched:Connect(function(hit)\n\tlocal humanoid = hit.Parent:FindFirstChildOfClass("Humanoid")\n\tif humanoid then\n\t\thumanoid.Health = 0\n\tend\nend)\n',
    grade(h) {
      const w = h.newWorld();
      const lava = w.create(
        "Part",
        {
          Name: "Lava",
          Anchored: true,
          Color: Color3.fromRGB(255, 80, 0),
          Size: new Vector3(20, 1, 20),
          Position: new Vector3(40, 0, 0),
        },
        w.workspace,
      );
      h.addStudentScript(w, lava);
      const p = w.addPlayer("Builderman");
      w.run(1);
      const rock = w.create("Part", { Name: "Rock", Position: new Vector3(40, 3, 0) }, w.workspace);
      w.touch(lava, rock);
      w.run(0.3);
      const afterRock = h.studentErrors(w).length;
      h.check(
        "Doesn't crash when a rock touches the lava",
        afterRock === 0,
        h.studentErrors(w)[0]?.message,
      );
      const hat = character(p)?.findFirstChild("Hat")?.findFirstChild("Handle");
      if (hat) w.touch(lava, hat);
      w.run(0.3);
      h.check(
        "Doesn't crash when a player's hat touches the lava",
        h.studentErrors(w).length === afterRock,
        h.studentErrors(w)[afterRock]?.message,
      );
      const hum = character(p)?.findFirstChild("Humanoid");
      w.touchWithCharacter(lava, p, "LeftFoot");
      w.run(0.3);
      h.check(
        "A player who steps on the lava dies",
        approx(hum?.props.get("Health"), 0),
        `Their Health is still ${fmtValue(hum?.props.get("Health"))}.`,
      );
    },
  },

  // ---------------------------------------------------------------- leaderstats
  {
    lessonId: "leaderstats",
    title: "Simulator stats",
    kind: "write",
    goal: "Give every player Coins and Wins on the leaderboard, plus passive income.",
    steps: [
      "When a player joins, create a Folder named exactly leaderstats inside them",
      "Inside it: an IntValue Coins starting at 100 and an IntValue Wins starting at 0",
      "Every 5 seconds, give every player 10 coins",
    ],
    scriptKind: "Script",
    location: "ServerScriptService › Script",
    starter: 'local Players = game:GetService("Players")\n\n',
    hints: [
      "Players.PlayerAdded:Connect(function(player) ... end)",
      'local coins = Instance.new("IntValue") ... coins.Parent = leaderstats',
      "while true do task.wait(5) for _, p in Players:GetPlayers() do ... end end",
    ],
    solution:
      'local Players = game:GetService("Players")\n\nPlayers.PlayerAdded:Connect(function(player)\n\tlocal leaderstats = Instance.new("Folder")\n\tleaderstats.Name = "leaderstats"\n\tleaderstats.Parent = player\n\n\tlocal coins = Instance.new("IntValue")\n\tcoins.Name = "Coins"\n\tcoins.Value = 100\n\tcoins.Parent = leaderstats\n\n\tlocal wins = Instance.new("IntValue")\n\twins.Name = "Wins"\n\twins.Value = 0\n\twins.Parent = leaderstats\nend)\n\nwhile true do\n\ttask.wait(5)\n\tfor _, player in Players:GetPlayers() do\n\t\tlocal stats = player:FindFirstChild("leaderstats")\n\t\tif stats then\n\t\t\tstats.Coins.Value += 10\n\t\tend\n\tend\nend\n',
    grade(h) {
      const w = h.newWorld();
      h.addStudentScript(w, w.service("ServerScriptService"));
      w.run(0.2);
      const ann = w.addPlayer("Ann");
      w.run(1);
      const folder = ann.findFirstChild("leaderstats");
      const wrongName = ann.children.find(
        (c) => c.name.toLowerCase() === "leaderstats" && c.name !== "leaderstats",
      );
      if (
        !h.check(
          "Players get a leaderstats folder",
          Boolean(folder),
          wrongName
            ? `Found "${wrongName.name}" — it must be exactly leaderstats (all lowercase).`
            : "Create the Folder in PlayerAdded and set its Parent to the player.",
        )
      )
        return;
      const coins = leaderstat(ann, "Coins");
      const wins = leaderstat(ann, "Wins");
      h.check(
        "Coins is an IntValue starting at 100",
        coins?.className === "IntValue" && coins.props.get("Value") === 100,
        coins
          ? `Coins is a ${coins.className} with Value ${fmtValue(coins.props.get("Value"))}.`
          : "Create an IntValue named Coins inside leaderstats.",
      );
      h.check(
        "Wins is an IntValue starting at 0",
        wins?.className === "IntValue" && wins.props.get("Value") === 0,
        wins
          ? `Wins is a ${wins.className} with Value ${fmtValue(wins.props.get("Value"))}.`
          : "Create an IntValue named Wins inside leaderstats.",
      );
      const bob = w.addPlayer("Bob");
      w.run(1);
      h.check(
        "Works for every player who joins",
        Boolean(leaderstat(bob, "Coins")),
        "A second player didn't get leaderstats.",
      );
      w.run(11.2 - w.interp.time);
      const value = coins?.props.get("Value") as number;
      h.check(
        "Every 5 seconds players get 10 coins",
        typeof value === "number" && value >= 110 && value <= 130,
        `After ~11 seconds Ann has ${fmtValue(value)} coins (expected about 120).`,
      );
    },
  },

  // ---------------------------------------------------------------- gui
  {
    lessonId: "gui",
    title: "Shop button",
    kind: "write",
    goal: "Make the ShopButton open and close the ShopFrame.",
    steps: [
      "Clicking ShopButton shows ShopFrame if it's hidden, and hides it if it's shown",
      'While the shop is open the button says "Close", when closed it says "Shop"',
    ],
    scriptKind: "LocalScript",
    location: "StarterGui › ShopGui › ShopButton › LocalScript",
    starter:
      'local button = script.Parent\nlocal shopFrame = button.Parent:WaitForChild("ShopFrame")\n\n',
    hints: [
      "button.MouseButton1Click:Connect(function() ... end)",
      "shopFrame.Visible = not shopFrame.Visible",
      'button.Text = if shopFrame.Visible then "Close" else "Shop"',
    ],
    solution:
      'local button = script.Parent\nlocal shopFrame = button.Parent:WaitForChild("ShopFrame")\n\nbutton.MouseButton1Click:Connect(function()\n\tshopFrame.Visible = not shopFrame.Visible\n\tbutton.Text = if shopFrame.Visible then "Close" else "Shop"\nend)\n',
    grade(h) {
      const w = h.newWorld();
      const gui = w.create("ScreenGui", { Name: "ShopGui" }, w.service("StarterGui"));
      const btn = w.create("TextButton", { Name: "ShopButton", Text: "Shop" }, gui);
      w.create("Frame", { Name: "ShopFrame", Visible: false }, gui);
      h.addStudentScript(w, btn, { kind: "LocalScript" });
      const p = w.addPlayer("Builderman");
      w.run(1);
      const myGui = p.findFirstChild("PlayerGui")?.findFirstChild("ShopGui");
      const myBtn = myGui?.findFirstChild("ShopButton");
      const myFrame = myGui?.findFirstChild("ShopFrame");
      if (!myBtn || !myFrame) {
        h.check("The GUI loaded", false, "The ShopGui didn't appear in PlayerGui.");
        return;
      }
      w.click(myBtn, p);
      w.run(0.3);
      h.check(
        "First click opens the shop",
        myFrame.props.get("Visible") === true,
        "After one click ShopFrame.Visible should be true.",
      );
      h.check(
        'Button says "Close" while open',
        myBtn.props.get("Text") === "Close",
        `Button text is ${fmtValue(myBtn.props.get("Text"))}.`,
      );
      w.click(myBtn, p);
      w.run(0.3);
      h.check(
        "Second click closes it again",
        myFrame.props.get("Visible") === false,
        "After a second click ShopFrame.Visible should be false.",
      );
      h.check(
        'Button says "Shop" when closed',
        myBtn.props.get("Text") === "Shop",
        `Button text is ${fmtValue(myBtn.props.get("Text"))}.`,
      );
    },
  },

  // ---------------------------------------------------------------- tweens
  {
    lessonId: "tweens",
    title: "Sliding door",
    kind: "write",
    goal: "Slide the Door up smoothly, like a horror-game door.",
    steps: [
      "Use TweenService to move workspace.Door up by 8 studs (from Y 5 to Y 13)",
      "The tween takes 1 second",
      'After the tween finishes, print "Door open"',
    ],
    scriptKind: "Script",
    location: "ServerScriptService › Script",
    starter:
      'local TweenService = game:GetService("TweenService")\nlocal door = workspace:WaitForChild("Door")\n\n',
    hints: [
      "local info = TweenInfo.new(1)",
      "local tween = TweenService:Create(door, info, { Position = door.Position + Vector3.new(0, 8, 0) })",
      'tween:Play() then tween.Completed:Wait() then print("Door open")',
    ],
    solution:
      'local TweenService = game:GetService("TweenService")\nlocal door = workspace:WaitForChild("Door")\n\nlocal info = TweenInfo.new(1)\nlocal tween = TweenService:Create(door, info, { Position = door.Position + Vector3.new(0, 8, 0) })\ntween:Play()\ntween.Completed:Wait()\nprint("Door open")\n',
    grade(h) {
      const w = h.newWorld();
      const door = w.create(
        "Part",
        {
          Name: "Door",
          Anchored: true,
          Size: new Vector3(4, 8, 1),
          Position: new Vector3(0, 5, -10),
        },
        w.workspace,
      );
      h.addStudentScript(w, w.service("ServerScriptService"));
      w.run(0.5);
      const mid = (door.props.get("Position") as Vector3).y;
      h.check(
        "The door moves smoothly (a tween, not a teleport)",
        mid > 5.2 && mid < 12.8,
        `Half a second in, the door is at Y ${fmtValue(mid)}.`,
      );
      w.run(2);
      const end = door.props.get("Position") as Vector3;
      h.check(
        "The door ends 8 studs higher (Y = 13)",
        approx(end.y, 13),
        `The door ended at Y ${fmtValue(end.y)}.`,
      );
      h.check(
        "X and Z stay the same",
        approx(end.x, 0) && approx(end.z, -10),
        `The door ended at ${fmtValue(end)}.`,
      );
      const entry = h.printEntries(w).find((e) => e.text === "Door open");
      h.check(
        'Prints "Door open" after the tween finishes',
        Boolean(entry) && entry!.time >= 0.95,
        entry
          ? "It printed before the tween finished — wait with tween.Completed:Wait()."
          : 'Print "Door open".',
      );
      h.check(
        "Uses TweenService:Create",
        h.codeHas(/TweenService\s*:\s*Create\s*\(/),
        "Create the tween with TweenService:Create(door, info, goals).",
      );
    },
  },

  // ---------------------------------------------------------------- prompts
  {
    lessonId: "prompts",
    title: "Brookhaven door",
    kind: "write",
    goal: "Add a Press E prompt that opens and closes a house door.",
    steps: [
      'Create a ProximityPrompt inside workspace.HouseDoor with ActionText "Open"',
      'When triggered: Transparency 0.8, CanCollide false, ActionText "Close"',
      'Trigger again: Transparency 0, CanCollide true, ActionText "Open"',
    ],
    scriptKind: "Script",
    location: "ServerScriptService › Script",
    starter: 'local door = workspace:WaitForChild("HouseDoor")\n\n',
    hints: [
      'local prompt = Instance.new("ProximityPrompt")\nprompt.ActionText = "Open"\nprompt.Parent = door',
      "prompt.Triggered:Connect(function(player) ... end)",
      "Keep a variable isOpen = false and flip it with isOpen = not isOpen",
    ],
    solution:
      'local door = workspace:WaitForChild("HouseDoor")\n\nlocal prompt = Instance.new("ProximityPrompt")\nprompt.ActionText = "Open"\nprompt.Parent = door\n\nlocal isOpen = false\nprompt.Triggered:Connect(function(player)\n\tisOpen = not isOpen\n\tdoor.Transparency = if isOpen then 0.8 else 0\n\tdoor.CanCollide = not isOpen\n\tprompt.ActionText = if isOpen then "Close" else "Open"\nend)\n',
    grade(h) {
      const w = h.newWorld();
      const door = w.create(
        "Part",
        {
          Name: "HouseDoor",
          Anchored: true,
          Size: new Vector3(4, 7, 1),
          Position: new Vector3(0, 3.5, -12),
        },
        w.workspace,
      );
      h.addStudentScript(w, w.service("ServerScriptService"));
      const p = w.addPlayer("Builderman");
      w.run(1);
      const prompt = door.children.find((c) => c.className === "ProximityPrompt");
      if (
        !h.check(
          "HouseDoor has a ProximityPrompt",
          Boolean(prompt),
          'Create it with Instance.new("ProximityPrompt") and set its Parent to the door.',
        )
      )
        return;
      h.check(
        'It starts as "Open"',
        prompt!.props.get("ActionText") === "Open",
        `ActionText is ${fmtValue(prompt!.props.get("ActionText"))}.`,
      );
      w.trigger(prompt!, p);
      w.run(0.3);
      h.check(
        "Pressing E opens the door",
        approx(door.props.get("Transparency"), 0.8) && door.props.get("CanCollide") === false,
        `Transparency ${fmtValue(door.props.get("Transparency"))}, CanCollide ${fmtValue(door.props.get("CanCollide"))}.`,
      );
      h.check(
        'The prompt then says "Close"',
        prompt!.props.get("ActionText") === "Close",
        `ActionText is ${fmtValue(prompt!.props.get("ActionText"))}.`,
      );
      w.trigger(prompt!, p);
      w.run(0.3);
      h.check(
        "Pressing E again closes it",
        approx(door.props.get("Transparency"), 0) && door.props.get("CanCollide") === true,
        `Transparency ${fmtValue(door.props.get("Transparency"))}, CanCollide ${fmtValue(door.props.get("CanCollide"))}.`,
      );
      h.check(
        '…and the prompt says "Open" again',
        prompt!.props.get("ActionText") === "Open",
        `ActionText is ${fmtValue(prompt!.props.get("ActionText"))}.`,
      );
    },
  },

  // ---------------------------------------------------------------- remote-events
  {
    lessonId: "remote-events",
    title: "Safe sword shop",
    kind: "write",
    goal: "Handle the BuyItem RemoteEvent on the server — and don't let exploiters cheat.",
    steps: [
      "Listen to ReplicatedStorage.BuyItem.OnServerEvent (the first parameter is the player!)",
      "A Sword costs 100 coins (leaderstats.Coins). If the player can afford it: take the coins and put a clone of ServerStorage.Items.Sword in their Backpack",
      "Ignore unknown items and players without enough coins",
      "The price must come from the server — a hacker can send any extra arguments",
    ],
    scriptKind: "Script",
    location: "ServerScriptService › Shop",
    starter:
      'local ReplicatedStorage = game:GetService("ReplicatedStorage")\nlocal ServerStorage = game:GetService("ServerStorage")\nlocal buyItem = ReplicatedStorage:WaitForChild("BuyItem")\n\nlocal PRICES = { Sword = 100 }\n\n',
    hints: [
      "buyItem.OnServerEvent:Connect(function(player, itemName) ... end)",
      "local price = PRICES[itemName]  if not price then return end",
      "ServerStorage.Items[itemName]:Clone().Parent = player.Backpack",
    ],
    solution:
      'local ReplicatedStorage = game:GetService("ReplicatedStorage")\nlocal ServerStorage = game:GetService("ServerStorage")\nlocal buyItem = ReplicatedStorage:WaitForChild("BuyItem")\n\nlocal PRICES = { Sword = 100 }\n\nbuyItem.OnServerEvent:Connect(function(player, itemName)\n\tlocal price = PRICES[itemName]\n\tif not price then return end\n\n\tlocal coins = player.leaderstats.Coins\n\tif coins.Value < price then return end\n\n\tcoins.Value -= price\n\tlocal tool = ServerStorage.Items[itemName]:Clone()\n\ttool.Parent = player.Backpack\nend)\n',
    grade(h) {
      const w = h.newWorld();
      const remote = w.create("RemoteEvent", { Name: "BuyItem" }, w.service("ReplicatedStorage"));
      const items = w.create("Folder", { Name: "Items" }, w.service("ServerStorage"));
      w.create("Tool", { Name: "Sword" }, items);
      addLeaderstatsFixture(w, 150);
      h.addStudentScript(w, w.service("ServerScriptService"), { name: "Shop" });
      const p = w.addPlayer("Ann");
      w.run(1);
      const coins = leaderstat(p, "Coins")!;
      const swords = () =>
        p.findFirstChild("Backpack")!.children.filter((c) => c.name === "Sword").length;
      w.fireServer(remote, p, "Sword");
      w.run(0.3);
      const bought = h.check(
        "Buying a Sword with 150 coins works",
        coins.props.get("Value") === 50 && swords() === 1,
        `After buying, Coins = ${fmtValue(coins.props.get("Value"))} and the Backpack has ${swords()} sword(s). ${h.codeHas(/OnServerEvent\s*:\s*Connect\s*\(\s*function\s*\(\s*itemName/) ? "Remember: the first parameter of OnServerEvent is the player." : ""}`,
      );
      if (!bought) return;
      w.fireServer(remote, p, "Sword");
      w.run(0.3);
      h.check(
        "Can't buy without enough coins",
        coins.props.get("Value") === 50 && swords() === 1,
        `With 50 coins the player ended with ${fmtValue(coins.props.get("Value"))} coins and ${swords()} swords.`,
      );
      const errorsBefore = h.studentErrors(w).length;
      w.fireServer(remote, p, "Rocket");
      w.run(0.3);
      h.check(
        "Unknown items are ignored (no crash)",
        h.studentErrors(w).length === errorsBefore && coins.props.get("Value") === 50,
        h.studentErrors(w)[errorsBefore]?.message ?? "Coins changed for an unknown item.",
      );
      coins.setProp("Value", 150);
      w.fireServer(remote, p, "Sword", 0);
      w.run(0.3);
      h.check(
        "A hacker sending price 0 still pays 100",
        coins.props.get("Value") === 50,
        `A client that sent an extra 0 ended with ${fmtValue(coins.props.get("Value"))} coins. Use the server's PRICES table only.`,
      );
    },
  },

  // ---------------------------------------------------------------- datastores
  {
    lessonId: "datastores",
    title: "Save my coins",
    kind: "write",
    goal: "Load coins when a player joins and save them when they leave.",
    steps: [
      'Use the DataStore named "PlayerCoins" and the key "Player_" .. player.UserId',
      "On join: create leaderstats with an IntValue Coins and load the saved value (0 for new players)",
      "On leave: save the current Coins value",
      "Wrap GetAsync/SetAsync in pcall",
    ],
    scriptKind: "Script",
    location: "ServerScriptService › Data",
    starter:
      'local Players = game:GetService("Players")\nlocal DataStoreService = game:GetService("DataStoreService")\nlocal coinStore = DataStoreService:GetDataStore("PlayerCoins")\n\n',
    hints: [
      'local ok, saved = pcall(function() return coinStore:GetAsync("Player_" .. player.UserId) end)',
      "coins.Value = saved or 0",
      "Players.PlayerRemoving:Connect(function(player) pcall(function() coinStore:SetAsync(key, value) end) end)",
    ],
    solution:
      'local Players = game:GetService("Players")\nlocal DataStoreService = game:GetService("DataStoreService")\nlocal coinStore = DataStoreService:GetDataStore("PlayerCoins")\n\nPlayers.PlayerAdded:Connect(function(player)\n\tlocal leaderstats = Instance.new("Folder")\n\tleaderstats.Name = "leaderstats"\n\tleaderstats.Parent = player\n\n\tlocal coins = Instance.new("IntValue")\n\tcoins.Name = "Coins"\n\tcoins.Parent = leaderstats\n\n\tlocal ok, saved = pcall(function()\n\t\treturn coinStore:GetAsync("Player_" .. player.UserId)\n\tend)\n\tif ok then\n\t\tcoins.Value = saved or 0\n\tend\nend)\n\nPlayers.PlayerRemoving:Connect(function(player)\n\tlocal ok, err = pcall(function()\n\t\tcoinStore:SetAsync("Player_" .. player.UserId, player.leaderstats.Coins.Value)\n\tend)\n\tif not ok then\n\t\twarn(err)\n\tend\nend)\n',
    grade(h) {
      const w = h.newWorld();
      w.dataStore("PlayerCoins/global").set("Player_1001", "500");
      h.addStudentScript(w, w.service("ServerScriptService"), { name: "Data" });
      w.run(0.2);
      const ann = w.addPlayer("Ann");
      w.run(1);
      const coins = leaderstat(ann, "Coins");
      if (
        !h.check(
          "Players get leaderstats with Coins",
          Boolean(coins),
          "Create leaderstats and an IntValue named Coins in PlayerAdded.",
        )
      )
        return;
      h.check(
        "Saved coins are loaded when a player joins",
        coins!.props.get("Value") === 500,
        `Ann (UserId 1001) had 500 coins saved but got ${fmtValue(coins!.props.get("Value"))}. Use the key "Player_" .. player.UserId.`,
      );
      coins!.setProp("Value", 777);
      w.removePlayer(ann);
      w.run(1);
      const saved = w.dataStore("PlayerCoins/global").get("Player_1001");
      h.check(
        "Coins are saved when the player leaves",
        saved === "777",
        `After Ann left with 777 coins, the DataStore holds ${saved ?? "nothing"}.`,
      );
      const errorsBefore = h.studentErrors(w).length;
      const newbie = w.addPlayer("Newbie");
      w.run(1);
      h.check(
        "New players start with 0 coins",
        leaderstat(newbie, "Coins")?.props.get("Value") === 0 &&
          h.studentErrors(w).length === errorsBefore,
        h.studentErrors(w)[errorsBefore]?.message ??
          "GetAsync returns nil for new players — use saved or 0.",
      );
      h.check(
        "DataStore calls are wrapped in pcall",
        h.codeHas(/pcall\s*\(/),
        "Wrap GetAsync and SetAsync in pcall — requests can fail.",
      );
    },
  },

  // ---------------------------------------------------------------- modules
  {
    lessonId: "modules",
    title: "Pet config module",
    kind: "write",
    goal: "Write the PetConfig ModuleScript that other scripts require.",
    steps: [
      "Return a table from the module",
      'It has Pets: Dog = { Rarity = "Common", Multiplier = 1.5 }, Cat = { Rarity = "Rare", Multiplier = 2 }, Dragon = { Rarity = "Legendary", Multiplier = 10 }',
      "It has a function getMultiplier(petName) that returns the pet's Multiplier, or 1 for unknown pets",
    ],
    scriptKind: "ModuleScript",
    location: "ReplicatedStorage › PetConfig",
    starter: "local PetConfig = {}\n\n",
    hints: [
      'PetConfig.Pets = { Dog = { Rarity = "Common", Multiplier = 1.5 }, ... }',
      "function PetConfig.getMultiplier(petName) ... end",
      "The last line must be: return PetConfig",
    ],
    solution:
      'local PetConfig = {}\n\nPetConfig.Pets = {\n\tDog = { Rarity = "Common", Multiplier = 1.5 },\n\tCat = { Rarity = "Rare", Multiplier = 2 },\n\tDragon = { Rarity = "Legendary", Multiplier = 10 },\n}\n\nfunction PetConfig.getMultiplier(petName)\n\tlocal pet = PetConfig.Pets[petName]\n\treturn if pet then pet.Multiplier else 1\nend\n\nreturn PetConfig\n',
    grade(h) {
      const w = h.newWorld();
      h.addStudentScript(w, w.service("ReplicatedStorage"), { name: "PetConfig" });
      w.addScript({
        name: "Tester",
        parent: w.service("ServerScriptService"),
        source: `local ok, PetConfig = pcall(require, game.ReplicatedStorage.PetConfig)
if not ok then print("__TEST__", "require-failed") return end
local pets = type(PetConfig) == "table" and PetConfig.Pets
print("__TEST__", type(PetConfig), type(pets), type(pets) == "table" and type(pets.Dog) == "table" and tostring(pets.Dog.Rarity) or "none", type(PetConfig) == "table" and type(PetConfig.getMultiplier) or "none")
if type(PetConfig) == "table" and type(PetConfig.getMultiplier) == "function" then
  print("__TEST__", tostring(PetConfig.getMultiplier("Dragon")), tostring(PetConfig.getMultiplier("Cat")), tostring(PetConfig.getMultiplier("Unicorn")))
end`,
      });
      w.run(1);
      const [first, second] = h.testValues(w);
      if (
        !h.check(
          "The module loads with require()",
          first !== undefined && first[0] !== "require-failed",
          "require() failed — make sure the last line is return PetConfig and the module has no errors.",
        )
      )
        return;
      h.check("The module returns a table", first[0] === "table", `It returned a ${first[0]}.`);
      h.check(
        "It has a Pets table with Dog as Common",
        first[1] === "table" && first[2] === "Common",
        first[1] !== "table" ? "Add PetConfig.Pets = { ... }." : `Pets.Dog.Rarity is ${first[2]}.`,
      );
      if (
        !h.check(
          "It has a getMultiplier function",
          first[3] === "function",
          "Add function PetConfig.getMultiplier(petName) ... end",
        )
      )
        return;
      h.check(
        "getMultiplier gives 10 for Dragon and 2 for Cat",
        second?.[0] === "10" && second?.[1] === "2",
        `It gave ${second?.[0]} for Dragon and ${second?.[1]} for Cat.`,
      );
      h.check(
        "getMultiplier gives 1 for unknown pets",
        second?.[2] === "1",
        `For "Unicorn" it gave ${second?.[2]} — return 1 when the pet isn't in the table.`,
      );
    },
  },

  // ---------------------------------------------------------------- project-obby
  {
    lessonId: "project-obby",
    title: "Respawning coins",
    kind: "write",
    goal: "Make every coin in workspace.Coins collectable — once — and bring it back after 5 seconds.",
    steps: [
      "Loop over workspace.Coins:GetChildren() and connect Touched on each coin",
      "When a player touches a visible coin: +1 leaderstats.Coins and make the coin invisible (Transparency 1)",
      "An invisible coin can't be collected (no double coins from one touch)",
      "After 5 seconds the coin comes back (Transparency 0)",
      "Parts that aren't players must not break anything",
    ],
    scriptKind: "Script",
    location: "ServerScriptService › Coins",
    starter:
      'local Players = game:GetService("Players")\nlocal coinsFolder = workspace:WaitForChild("Coins")\n\n',
    hints: [
      "for _, coin in coinsFolder:GetChildren() do ... end",
      "Use a variable per coin: local available = true",
      "task.wait(5) then coin.Transparency = 0 and available = true",
    ],
    solution:
      'local Players = game:GetService("Players")\nlocal coinsFolder = workspace:WaitForChild("Coins")\n\nfor _, coin in coinsFolder:GetChildren() do\n\tlocal available = true\n\tcoin.Touched:Connect(function(hit)\n\t\tif not available then return end\n\t\tlocal player = Players:GetPlayerFromCharacter(hit.Parent)\n\t\tif not player then return end\n\n\t\tavailable = false\n\t\tplayer.leaderstats.Coins.Value += 1\n\t\tcoin.Transparency = 1\n\t\ttask.wait(5)\n\t\tcoin.Transparency = 0\n\t\tavailable = true\n\tend)\nend\n',
    grade(h) {
      const w = h.newWorld();
      const folder = w.create("Folder", { Name: "Coins" }, w.workspace);
      const coinParts = [1, 2, 3].map((i) =>
        w.create(
          "Part",
          {
            Name: `Coin${i}`,
            Anchored: true,
            Size: new Vector3(2, 2, 1),
            Position: new Vector3(i * 6, 3, 10),
            Color: Color3.fromRGB(255, 200, 0),
          },
          folder,
        ),
      );
      addLeaderstatsFixture(w, 0);
      h.addStudentScript(w, w.service("ServerScriptService"), { name: "Coins" });
      const p = w.addPlayer("Builderman");
      w.run(1);
      const coins = leaderstat(p, "Coins")!;
      w.touchWithCharacter(coinParts[0], p, "LeftFoot");
      w.touchWithCharacter(coinParts[0], p, "RightFoot");
      w.touchWithCharacter(coinParts[0], p, "LeftHand");
      w.run(0.3);
      h.check(
        "Touching a coin gives exactly 1 coin",
        coins.props.get("Value") === 1,
        `Three quick touches on one coin gave ${fmtValue(coins.props.get("Value"))} coins — add a debounce (available = false).`,
      );
      h.check(
        "The coin disappears",
        approx(coinParts[0].props.get("Transparency"), 1),
        `Transparency is ${fmtValue(coinParts[0].props.get("Transparency"))}.`,
      );
      const errorsBefore = h.studentErrors(w).length;
      const rock = w.create("Part", { Name: "Rock" }, w.workspace);
      w.touch(coinParts[2], rock);
      w.run(0.3);
      h.check(
        "Other parts touching a coin don't break it",
        h.studentErrors(w).length === errorsBefore && coins.props.get("Value") === 1,
        h.studentErrors(w)[errorsBefore]?.message ?? "A rock touching a coin changed the coins.",
      );
      w.touchWithCharacter(coinParts[1], p);
      w.run(0.3);
      h.check(
        "Every coin works",
        coins.props.get("Value") === 2,
        `After a second coin, Coins = ${fmtValue(coins.props.get("Value"))}.`,
      );
      w.run(5.5);
      h.check(
        "Coins come back after 5 seconds",
        approx(coinParts[0].props.get("Transparency"), 0),
        `After 6 seconds the first coin's Transparency is ${fmtValue(coinParts[0].props.get("Transparency"))}.`,
      );
      w.touchWithCharacter(coinParts[0], p);
      w.run(0.3);
      h.check(
        "A coin that came back can be collected again",
        coins.props.get("Value") === 3,
        `Coins = ${fmtValue(coins.props.get("Value"))}.`,
      );
    },
  },

  // ---------------------------------------------------------------- debugging
  {
    lessonId: "debugging",
    title: "Fix the reward script",
    kind: "fix",
    goal: "This script has 3 bugs. Use the Output errors (and the analyzer if you like) to fix them.",
    steps: [
      "When Builderman joins he should get 50 coins",
      "It should print: Builderman got 50 coins",
      "No errors in the Output",
    ],
    scriptKind: "Script",
    location: "ServerScriptService › Rewards",
    starter:
      'local Players = game:GetService("Players")\n\nlocal function giveReward(player, amount)\n\tlocal coins = player.leaderstats:FindFirstChild("coins")\n\tcoins.Value = coins.Value + amount\nend\n\nPlayers.PlayerAdded:Connect(function(player)\n\tlocal leaderstats = Instance.new("Folder")\n\tleaderstats.Name = "leaderstats"\n\tleaderstats.Parent = player\n\n\tlocal coins = Instance.new("IntValue")\n\tcoins.Name = "Coins"\n\tcoins.Parent = leaderstats\n\n\tgiveReward(player, 50)\n\tprint(player.Name .. " got " .. coins .. " coins")\nend)\n\nPlayers.PlayerAdded:Connect(function(player)\n\tprint("Welcome " .. player.Name)\n\tgiveRewrd(player, 0)\nend)\n',
    hints: [
      'Names are case-sensitive: is the IntValue called "coins" or "Coins"?',
      "You can't join an object into text — use coins.Value.",
      "Look closely at the name of the function called in the second PlayerAdded.",
    ],
    solution:
      'local Players = game:GetService("Players")\n\nlocal function giveReward(player, amount)\n\tlocal coins = player.leaderstats:FindFirstChild("Coins")\n\tcoins.Value = coins.Value + amount\nend\n\nPlayers.PlayerAdded:Connect(function(player)\n\tlocal leaderstats = Instance.new("Folder")\n\tleaderstats.Name = "leaderstats"\n\tleaderstats.Parent = player\n\n\tlocal coins = Instance.new("IntValue")\n\tcoins.Name = "Coins"\n\tcoins.Parent = leaderstats\n\n\tgiveReward(player, 50)\n\tprint(player.Name .. " got " .. coins.Value .. " coins")\nend)\n\nPlayers.PlayerAdded:Connect(function(player)\n\tprint("Welcome " .. player.Name)\n\tgiveReward(player, 0)\nend)\n',
    grade(h) {
      const w = h.newWorld();
      h.addStudentScript(w, w.service("ServerScriptService"), { name: "Rewards" });
      w.run(0.2);
      const p = w.addPlayer("Builderman");
      w.run(1);
      h.check(
        "Builderman has 50 coins",
        leaderstat(p, "Coins")?.props.get("Value") === 50,
        `Coins = ${fmtValue(leaderstat(p, "Coins")?.props.get("Value"))}.`,
      );
      h.expectPrinted("Builderman got 50 coins");
      h.check(
        "No errors in the Output",
        h.studentErrors(w).length === 0,
        h
          .studentErrors(w)
          .map((e) => e.message)
          .join("\n"),
      );
    },
  },
];

export function exerciseFor(lessonId: string): Exercise | undefined {
  return EXERCISES.find((e) => e.lessonId === lessonId);
}

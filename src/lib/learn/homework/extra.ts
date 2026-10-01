/**
 * Homework for the lessons in lessons.extra.ts. Same idea as exercises.ts:
 * run the student's code in the simulated world and check what happened,
 * re-running with other values where a typed-in answer could pass.
 */
import { Vector3, type CFrame } from "@/lib/luau/roblox/datatypes";
import type { Instance } from "@/lib/luau/roblox/instance";
import type { World } from "@/lib/luau/roblox/world";
import { fmtValue, type Exercise, type Harness } from "./harness";

/** Lua source: drops the first newline and turns 4-space indents into tabs. */
const lua = (strings: TemplateStringsArray, ...values: unknown[]) =>
  String.raw({ raw: strings }, ...values)
    .replace(/^\n/, "")
    .replace(/^( {4})+/gm, (m) => "\t".repeat(m.length / 4))
    .replace(/\s+$/, "") + "\n";

const approx = (a: unknown, b: number, eps = 0.02) =>
  typeof a === "number" && Math.abs(a - b) <= eps;

function variant(code: string, pattern: RegExp, replacement: string): string | undefined {
  if (!pattern.test(code)) return undefined;
  return code.replace(pattern, replacement);
}

function character(p: Instance): Instance | undefined {
  return p.props.get("Character") as Instance | undefined;
}

function humanoidOf(p: Instance): Instance | undefined {
  return character(p)?.findFirstChild("Humanoid");
}

function addCoinsFixture(w: World, coins: number) {
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

/** True when `printed` has both lines and `first` comes before `second`. */
function printedInOrder(h: Harness, lines: string[], first: string, second: string): boolean {
  const a = lines.findIndex((l) => h.said(l, first));
  const b = lines.findIndex((l) => h.said(l, second));
  return a >= 0 && b > a;
}

export const EXTRA_EXERCISES: Exercise[] = [
  // ---------------------------------------------------------------- dictionaries
  {
    lessonId: "dictionaries",
    title: "Shop price list",
    kind: "write",
    goal: "Keep the shop's prices in a dictionary and add them up with a pairs loop.",
    steps: [
      "Create a dictionary named prices with Sword = 100, Shield = 75 and Bow = 60",
      "Add Potion = 25 to it on its own line",
      "Loop over prices with pairs and add every price to a variable named total",
      "Print exactly: Total: 260",
    ],
    scriptKind: "Script",
    location: "ServerScriptService › Shop",
    starter: "-- Make the prices dictionary below\n\n",
    hints: [
      "local prices = { Sword = 100, Shield = 75, Bow = 60 } makes the dictionary.",
      "prices.Potion = 25 adds a new key.",
      'for item, price in pairs(prices) do total += price end, then print("Total: " .. total)',
    ],
    solution: lua`
local prices = { Sword = 100, Shield = 75, Bow = 60 }
prices.Potion = 25

local total = 0
for item, price in pairs(prices) do
    total += price
end
print("Total: " .. total)
`,
    grade(h) {
      const w = h.newWorld();
      h.addStudentScript(w, w.service("ServerScriptService"), { name: "Shop" });
      w.run(1);
      h.expectPrinted({ en: "Total: 260", tr: "Toplam: 260" });
      h.check(
        h.t("Adds the prices up with a pairs loop", "Fiyatları bir pairs döngüsüyle topluyor"),
        h.codeHas(/\bpairs\s*\(/),
        h.t(
          "Loop over the dictionary with pairs(prices).",
          "Sözlük üzerinde pairs(prices) ile dön.",
        ),
      );
      const changed = variant(h.code, /Sword\s*=\s*100/, "Sword = 200");
      const w2 = h.newWorld();
      if (changed) h.addStudentScript(w2, w2.service("ServerScriptService"), { code: changed });
      w2.run(1);
      h.check(
        h.t(
          "The total follows the prices (a Sword at 200 gives 360)",
          "Toplam fiyatlara göre değişiyor (200'lük Sword ile 360)",
        ),
        Boolean(changed) &&
          h.prints(w2).some((l) => h.said(l, { en: "Total: 360", tr: "Toplam: 360" })),
        h.t(
          "Compute the total from the dictionary instead of typing 260.",
          "260 yazmak yerine toplamı sözlükten hesapla.",
        ),
      );
    },
  },

  // ---------------------------------------------------------------- string-tools
  {
    lessonId: "string-tools",
    title: "Name tag maker",
    kind: "write",
    goal: "Write a function that turns a name and a level into a name tag.",
    steps: [
      'Finish makeTag(name, level) so it returns text like "[Lv 5] BUILDERMAN": the level, then the name in capitals',
      'Print makeTag("builderman", 5)',
      "Make the capitals with string.upper (or :upper()) — don't type them yourself",
    ],
    scriptKind: "Script",
    location: "ServerScriptService › NameTags",
    starter: "local function makeTag(name, level)\n\t\nend\n\n",
    hints: [
      'string.upper(name) turns "ann" into "ANN".',
      'return "[Lv " .. level .. "] " .. string.upper(name)',
      "Or with backticks: return `[Lv {level}] {name:upper()}`",
    ],
    solution: lua`
local function makeTag(name, level)
    return "[Lv " .. level .. "] " .. string.upper(name)
end

print(makeTag("builderman", 5))
`,
    testFooter: 'if makeTag then print("__TEST__", makeTag("ann", 12)) end',
    grade(h) {
      const w = h.newWorld();
      h.addStudentScript(w, w.service("ServerScriptService"), { name: "NameTags" });
      w.run(1);
      h.expectPrinted("[Lv 5] BUILDERMAN");
      const got = h.testValues(w)[0]?.join(" ");
      h.check(
        h.t('makeTag("ann", 12) gives "[Lv 12] ANN"', 'makeTag("ann", 12) sonucu "[Lv 12] ANN"'),
        got === "[Lv 12] ANN",
        h.t(`It gave: ${got ?? "nothing"}`, `Verdiği: ${got ?? "hiçbir şey"}`),
      );
      h.check(
        h.t("Capitals come from string.upper", "Büyük harfler string.upper'dan geliyor"),
        h.codeHas(/upper\s*\(/),
        h.t(
          "Use string.upper(name) or name:upper().",
          "string.upper(name) ya da name:upper() kullan.",
        ),
      );
    },
  },

  // ---------------------------------------------------------------- instances
  {
    lessonId: "instances",
    title: "Coin rain",
    kind: "write",
    goal: "Fill the map with copies of the coin template in ServerStorage.",
    steps: [
      "ServerStorage has a Part named Coin. Clone it 5 times",
      "Put the copies in workspace at (0, 10, 0), (5, 10, 0), (10, 10, 0), (15, 10, 0) and (20, 10, 0)",
      "Leave the original in ServerStorage",
    ],
    scriptKind: "Script",
    location: "ServerScriptService › CoinRain",
    starter:
      'local ServerStorage = game:GetService("ServerStorage")\nlocal template = ServerStorage.Coin\n\n',
    hints: [
      "for i = 0, 4 do … end runs 5 times with i = 0, 1, 2, 3, 4.",
      "local coin = template:Clone() makes a copy.",
      "coin.Position = Vector3.new(i * 5, 10, 0) and then coin.Parent = workspace",
    ],
    solution: lua`
local ServerStorage = game:GetService("ServerStorage")
local template = ServerStorage.Coin

for i = 0, 4 do
    local coin = template:Clone()
    coin.Position = Vector3.new(i * 5, 10, 0)
    coin.Parent = workspace
end
`,
    grade(h) {
      const w = h.newWorld();
      const template = w.create(
        "Part",
        { Name: "Coin", Anchored: true, Position: new Vector3(0, -50, 0) },
        w.service("ServerStorage"),
      );
      h.addStudentScript(w, w.service("ServerScriptService"), { name: "CoinRain" });
      w.run(1);
      const coins = w.workspace.children.filter((c) => c.name === "Coin");
      h.check(
        h.t("5 coins are in workspace", "workspace'te 5 coin var"),
        coins.length === 5,
        h.t(`Found ${coins.length} coin(s).`, `${coins.length} coin bulundu.`),
      );
      const xs = coins
        .map((c) => c.props.get("Position") as Vector3 | undefined)
        .filter((p): p is Vector3 => Boolean(p))
        .map((p) => `${Math.round(p.x)},${Math.round(p.y)}`)
        .sort();
      const want = ["0,10", "10,10", "15,10", "20,10", "5,10"];
      h.check(
        h.t("They are 5 studs apart at height 10", "10 yükseklikte 5'er stud aralıklı duruyorlar"),
        JSON.stringify(xs) === JSON.stringify(want),
        h.t(`Positions (x,y): ${xs.join(" | ")}`, `Konumlar (x,y): ${xs.join(" | ")}`),
      );
      h.check(
        h.t("The original stays in ServerStorage", "Asıl coin ServerStorage'da kalıyor"),
        template.parent === w.service("ServerStorage"),
        h.t(
          "Clone the template instead of moving it.",
          "Şablonu taşımak yerine Clone ile kopyala.",
        ),
      );
    },
  },

  // ---------------------------------------------------------------- task-library
  {
    lessonId: "task-library",
    title: "Time bomb",
    kind: "write",
    goal: "Schedule an explosion with task.delay without stopping the script.",
    steps: [
      "Print: Bomb planted",
      "Use task.delay so that 3 seconds later it prints BOOM and destroys workspace.Bomb",
      "Right after scheduling it, print: Run! — it must appear before BOOM",
    ],
    scriptKind: "Script",
    location: "ServerScriptService › Bomb",
    starter: "local bomb = workspace.Bomb\n\n",
    hints: [
      "task.delay(3, function() … end) runs the function in 3 seconds.",
      'Inside the function: print("BOOM") and bomb:Destroy()',
      'print("Run!") goes after the task.delay line, not inside it.',
    ],
    solution: lua`
local bomb = workspace.Bomb

print("Bomb planted")
task.delay(3, function()
    print("BOOM")
    bomb:Destroy()
end)
print("Run!")
`,
    grade(h) {
      const w = h.newWorld();
      const bomb = w.create("Part", { Name: "Bomb", Anchored: true }, w.workspace);
      h.addStudentScript(w, w.service("ServerScriptService"), { name: "Bomb" });
      w.run(1);
      const early = h.prints(w);
      h.check(
        h.t("Bomb planted and Run! show right away", "Bomba kuruldu ve Kaç! hemen yazılıyor"),
        early.some((l) => h.said(l, { en: "Bomb planted", tr: "Bomba kuruldu" })) &&
          early.some((l) => h.said(l, { en: "Run!", tr: "Kaç!" })),
        `${h.t("The Output shows:", "Output'ta yazanlar:")} ${early.join(" | ") || "—"}`,
      );
      h.check(
        h.t("Nothing explodes in the first second", "İlk saniyede hiçbir şey patlamıyor"),
        !early.includes("BOOM") && bomb.parent === w.workspace,
        h.t("Use task.delay, not an immediate call.", "Hemen çağırmak yerine task.delay kullan."),
      );
      w.run(3);
      const all = h.prints(w);
      h.check(
        h.t("After 3 seconds: BOOM and the bomb is gone", "3 saniye sonra: BOOM ve bomba yok"),
        all.includes("BOOM") && bomb.parent !== w.workspace,
        h.t(
          `BOOM printed: ${all.includes("BOOM") ? "yes" : "no"}, bomb still there: ${bomb.parent === w.workspace ? "yes" : "no"}`,
          `BOOM yazıldı: ${all.includes("BOOM") ? "evet" : "hayır"}, bomba hâlâ orada: ${bomb.parent === w.workspace ? "evet" : "hayır"}`,
        ),
      );
      h.check(
        h.t("Run! comes before BOOM", "Kaç!, BOOM'dan önce geliyor"),
        printedInOrder(h, all, "Run!", "BOOM") || printedInOrder(h, all, "Kaç!", "BOOM"),
        h.t(
          "Print Run! right after task.delay, outside the function.",
          "Kaç!'ı task.delay'den hemen sonra, fonksiyonun dışında yazdır.",
        ),
      );
      h.check(
        h.t("Uses task.delay", "task.delay kullanılıyor"),
        h.codeHas(/task\.delay\s*\(/),
        h.t(
          "Schedule the explosion with task.delay(3, function() … end).",
          "Patlamayı task.delay(3, function() … end) ile zamanla.",
        ),
      );
    },
  },

  // ---------------------------------------------------------------- attributes
  {
    lessonId: "attributes",
    title: "Locked door",
    kind: "write",
    goal: "Make a door that follows its Locked attribute.",
    steps: [
      "workspace.Door has an attribute Locked (true at the start)",
      "Whenever Locked changes: if it's false, set Transparency to 0.6 and CanCollide to false; if it's true, Transparency 0 and CanCollide true",
      "React with GetAttributeChangedSignal — don't check in a loop",
    ],
    scriptKind: "Script",
    location: "ServerScriptService › Door",
    starter: "local door = workspace.Door\n\n",
    hints: [
      'door:GetAttributeChangedSignal("Locked"):Connect(function() … end)',
      'local locked = door:GetAttribute("Locked")',
      "door.Transparency = if locked then 0 else 0.6 and door.CanCollide = locked",
    ],
    solution: lua`
local door = workspace.Door

local function update()
    local locked = door:GetAttribute("Locked")
    door.Transparency = if locked then 0 else 0.6
    door.CanCollide = locked
end

door:GetAttributeChangedSignal("Locked"):Connect(update)
update()
`,
    grade(h) {
      const w = h.newWorld();
      const door = w.create(
        "Part",
        {
          Name: "Door",
          Anchored: true,
          Size: new Vector3(4, 8, 1),
          Transparency: 0,
          CanCollide: true,
        },
        w.workspace,
      );
      door.setAttribute("Locked", true);
      h.addStudentScript(w, w.service("ServerScriptService"), { name: "Door" });
      w.run(0.5);
      const state = () =>
        `Transparency = ${fmtValue(door.props.get("Transparency"))}, CanCollide = ${fmtValue(door.props.get("CanCollide"))}`;
      door.setAttribute("Locked", false);
      w.run(0.3);
      h.check(
        h.t("Unlocking opens the door", "Kilidi açmak kapıyı açıyor"),
        approx(door.props.get("Transparency"), 0.6) && door.props.get("CanCollide") === false,
        state(),
      );
      door.setAttribute("Locked", true);
      w.run(0.3);
      h.check(
        h.t("Locking closes it again", "Kilitlemek tekrar kapatıyor"),
        approx(door.props.get("Transparency"), 0) && door.props.get("CanCollide") === true,
        state(),
      );
      h.check(
        h.t("Uses GetAttributeChangedSignal", "GetAttributeChangedSignal kullanılıyor"),
        h.codeHas(/GetAttributeChangedSignal\s*\(/),
        h.t(
          'Connect to door:GetAttributeChangedSignal("Locked").',
          'door:GetAttributeChangedSignal("Locked") sinyaline bağlan.',
        ),
      );
    },
  },

  // ---------------------------------------------------------------- characters
  {
    lessonId: "characters",
    title: "Jump boots for everyone",
    kind: "write",
    goal: "Give every character a higher jump and a bit more speed — even after they respawn.",
    steps: [
      "Every time a player's character spawns, set its Humanoid's JumpPower to 80 and WalkSpeed to 20",
      "It must still work after the player dies and respawns",
    ],
    scriptKind: "Script",
    location: "ServerScriptService › Boots",
    starter: 'local Players = game:GetService("Players")\n\n',
    hints: [
      "Players.PlayerAdded:Connect(function(player) … end)",
      "Inside it: player.CharacterAdded:Connect(function(character) … end)",
      'local humanoid = character:WaitForChild("Humanoid")',
    ],
    solution: lua`
local Players = game:GetService("Players")

Players.PlayerAdded:Connect(function(player)
    player.CharacterAdded:Connect(function(character)
        local humanoid = character:WaitForChild("Humanoid")
        humanoid.JumpPower = 80
        humanoid.WalkSpeed = 20
    end)
end)
`,
    grade(h) {
      const w = h.newWorld();
      h.addStudentScript(w, w.service("ServerScriptService"), { name: "Boots" });
      const p = w.addPlayer("Ann");
      w.run(1);
      const stats = () => {
        const hum = humanoidOf(p);
        return {
          jump: hum?.props.get("JumpPower"),
          speed: hum?.props.get("WalkSpeed"),
        };
      };
      const first = stats();
      h.check(
        h.t(
          "The first character gets JumpPower 80 and WalkSpeed 20",
          "İlk karakter JumpPower 80 ve WalkSpeed 20 alıyor",
        ),
        first.jump === 80 && first.speed === 20,
        `JumpPower = ${fmtValue(first.jump)}, WalkSpeed = ${fmtValue(first.speed)}`,
      );
      const before = character(p);
      humanoidOf(p)?.setProp("Health", 0);
      w.run(7);
      const again = stats();
      h.check(
        h.t("After respawning it still works", "Yeniden doğduktan sonra da çalışıyor"),
        character(p) !== before && again.jump === 80 && again.speed === 20,
        h.t(
          `After respawn: JumpPower = ${fmtValue(again.jump)}, WalkSpeed = ${fmtValue(again.speed)}. Use CharacterAdded so every new character is set up.`,
          `Yeniden doğunca: JumpPower = ${fmtValue(again.jump)}, WalkSpeed = ${fmtValue(again.speed)}. Her yeni karakter ayarlansın diye CharacterAdded kullan.`,
        ),
      );
    },
  },

  // ---------------------------------------------------------------- user-input
  {
    lessonId: "user-input",
    title: "Sprint key",
    kind: "write",
    goal: "Let the player sprint while holding LeftShift.",
    steps: [
      "This is a LocalScript in StarterPlayerScripts",
      "When LeftShift goes down, set the player's Humanoid WalkSpeed to 28",
      "When LeftShift comes back up, set it back to 16",
      "Ignore presses where gameProcessed is true",
    ],
    scriptKind: "LocalScript",
    location: "StarterPlayerScripts › Sprint",
    starter:
      'local UserInputService = game:GetService("UserInputService")\nlocal player = game.Players.LocalPlayer\n\n',
    hints: [
      "UserInputService.InputBegan:Connect(function(input, gameProcessed) … end)",
      "if input.KeyCode == Enum.KeyCode.LeftShift then …",
      "player.Character.Humanoid.WalkSpeed = 28 — and InputEnded to set 16 again",
    ],
    solution: lua`
local UserInputService = game:GetService("UserInputService")
local player = game.Players.LocalPlayer

UserInputService.InputBegan:Connect(function(input, gameProcessed)
    if gameProcessed then
        return
    end
    if input.KeyCode == Enum.KeyCode.LeftShift then
        player.Character.Humanoid.WalkSpeed = 28
    end
end)

UserInputService.InputEnded:Connect(function(input)
    if input.KeyCode == Enum.KeyCode.LeftShift then
        player.Character.Humanoid.WalkSpeed = 16
    end
end)
`,
    grade(h) {
      const w = h.newWorld();
      const sps = w.service("StarterPlayer").findFirstChild("StarterPlayerScripts")!;
      h.addStudentScript(w, sps, { name: "Sprint" });
      const p = w.addPlayer("Ann");
      w.run(1);
      const speed = () => humanoidOf(p)?.props.get("WalkSpeed");
      w.pressKey(p, "E");
      w.run(0.2);
      h.check(
        h.t("Other keys don't change the speed", "Diğer tuşlar hızı değiştirmiyor"),
        speed() === 16,
        `WalkSpeed = ${fmtValue(speed())}`,
      );
      w.pressKey(p, "LeftShift", "Begin");
      w.run(0.2);
      h.check(
        h.t(
          "Holding LeftShift sets WalkSpeed to 28",
          "LeftShift'e basılı tutmak WalkSpeed'i 28 yapıyor",
        ),
        speed() === 28,
        `WalkSpeed = ${fmtValue(speed())}`,
      );
      w.pressKey(p, "LeftShift", "End");
      w.run(0.2);
      h.check(
        h.t("Letting go sets it back to 16", "Bırakınca tekrar 16 oluyor"),
        speed() === 16,
        `WalkSpeed = ${fmtValue(speed())}`,
      );
      h.check(
        h.t("Presses while typing are ignored", "Yazarken basılan tuşlar yok sayılıyor"),
        h.codeHas(
          /InputBegan\s*:\s*Connect\s*\(\s*function\s*\(\s*\w+\s*,\s*(\w+)\s*\)[\s\S]*\b\1\b/,
        ),
        h.t(
          "Take the second parameter (gameProcessed) in InputBegan and return when it's true.",
          "InputBegan'de ikinci parametreyi (gameProcessed) al ve true ise çık.",
        ),
      );
    },
  },

  // ---------------------------------------------------------------- remote-functions
  {
    lessonId: "remote-functions",
    title: "Price checker",
    kind: "write",
    goal: "Answer the shop's price questions on the server with a RemoteFunction.",
    steps: [
      "ReplicatedStorage.GetPrice is a RemoteFunction",
      "Set its OnServerInvoke so it returns the price from PRICES for the item the client asks about",
      "Unknown items return nil (no error)",
    ],
    scriptKind: "Script",
    location: "ServerScriptService › Prices",
    starter:
      'local ReplicatedStorage = game:GetService("ReplicatedStorage")\nlocal getPrice = ReplicatedStorage:WaitForChild("GetPrice")\n\nlocal PRICES = { Sword = 100, Bow = 60 }\n\n',
    hints: [
      "getPrice.OnServerInvoke = function(player, itemName) … end",
      "The first parameter is always the player who asked.",
      "return PRICES[itemName]",
    ],
    solution: lua`
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local getPrice = ReplicatedStorage:WaitForChild("GetPrice")

local PRICES = { Sword = 100, Bow = 60 }

getPrice.OnServerInvoke = function(player, itemName)
    return PRICES[itemName]
end
`,
    grade(h) {
      const ask = (code?: string) => {
        const w = h.newWorld();
        w.create("RemoteFunction", { Name: "GetPrice" }, w.service("ReplicatedStorage"));
        h.addStudentScript(w, w.service("ServerScriptService"), { name: "Prices", code });
        w.addScript({
          name: "Asker",
          kind: "LocalScript",
          parent: w.service("StarterPlayer").findFirstChild("StarterPlayerScripts")!,
          source:
            'local rf = game.ReplicatedStorage:WaitForChild("GetPrice")\nprint("__TEST__", tostring(rf:InvokeServer("Sword")), tostring(rf:InvokeServer("Bow")), tostring(rf:InvokeServer("Rocket")))',
        });
        w.addPlayer("Ann");
        w.run(1.5);
        return h.testValues(w)[0];
      };
      const got = ask();
      h.check(
        h.t("Sword → 100 and Bow → 60", "Sword → 100 ve Bow → 60"),
        got?.[0] === "100" && got?.[1] === "60",
        got
          ? h.t(
              `The client got Sword → ${got[0]}, Bow → ${got[1]}. Remember: the first parameter is the player.`,
              `İstemci Sword → ${got[0]}, Bow → ${got[1]} aldı. Unutma: ilk parametre oyuncudur.`,
            )
          : h.t(
              "The client never got an answer. Set getPrice.OnServerInvoke = function(player, itemName) … end",
              "İstemci hiç cevap alamadı. getPrice.OnServerInvoke = function(player, itemName) … end ayarla",
            ),
      );
      h.check(
        h.t("Unknown items give nil", "Bilinmeyen eşyalar nil veriyor"),
        got?.[2] === "nil",
        got ? `Rocket → ${got[2]}` : undefined,
      );
      const changed = variant(h.code, /Sword\s*=\s*100/, "Sword = 250");
      const again = changed ? ask(changed) : undefined;
      h.check(
        h.t("The answer comes from PRICES", "Cevap PRICES tablosundan geliyor"),
        again?.[0] === "250",
        h.t(
          "Return PRICES[itemName] instead of a fixed number.",
          "Sabit bir sayı yerine PRICES[itemName] döndür.",
        ),
      );
    },
  },

  // ---------------------------------------------------------------- bindables
  {
    lessonId: "bindables",
    title: "Round results",
    kind: "write",
    goal: "Listen to a BindableEvent fired by the round script.",
    steps: [
      "ServerStorage.RoundEnded is a BindableEvent; another script fires it with the winner's name",
      "Listen to it and print: <winner> won the round!  (for example Ann won the round!)",
      "Also add 1 to workspace.RoundsPlayed (an IntValue) every time",
    ],
    scriptKind: "Script",
    location: "ServerScriptService › Results",
    starter:
      "local roundEnded = game.ServerStorage.RoundEnded\nlocal roundsPlayed = workspace.RoundsPlayed\n\n",
    hints: [
      "roundEnded.Event:Connect(function(winner) … end)",
      'print(winner .. " won the round!")',
      "roundsPlayed.Value += 1",
    ],
    solution: lua`
local roundEnded = game.ServerStorage.RoundEnded
local roundsPlayed = workspace.RoundsPlayed

roundEnded.Event:Connect(function(winner)
    print(winner .. " won the round!")
    roundsPlayed.Value += 1
end)
`,
    grade(h) {
      const w = h.newWorld();
      w.create("BindableEvent", { Name: "RoundEnded" }, w.service("ServerStorage"));
      const rounds = w.create("IntValue", { Name: "RoundsPlayed", Value: 0 }, w.workspace);
      h.addStudentScript(w, w.service("ServerScriptService"), { name: "Results" });
      w.addScript({
        name: "Round",
        parent: w.service("ServerScriptService"),
        source:
          'task.wait(1)\ngame.ServerStorage.RoundEnded:Fire("Ann")\ntask.wait(1)\ngame.ServerStorage.RoundEnded:Fire("Bob")',
      });
      w.run(3);
      h.expectPrinted({ en: "Ann won the round!", tr: "Ann turu kazandı!" });
      h.expectPrinted({ en: "Bob won the round!", tr: "Bob turu kazandı!" });
      h.check(
        h.t("RoundsPlayed counts both rounds", "RoundsPlayed iki turu da sayıyor"),
        rounds.props.get("Value") === 2,
        `RoundsPlayed = ${fmtValue(rounds.props.get("Value"))}`,
      );
    },
  },

  // ---------------------------------------------------------------- project-shop
  {
    lessonId: "project-shop",
    title: "Speed coil shop",
    kind: "write",
    goal: "Sell a SpeedCoil safely: the server checks price, coins and ownership.",
    steps: [
      "Players already get leaderstats.Coins = 200",
      'When BuyItem fires with "SpeedCoil" and the player has at least 150 coins: take 150 and put a clone of ServerStorage.Items.SpeedCoil in their Backpack',
      "A player who already owns a SpeedCoil can't buy another",
      "Unknown items do nothing",
    ],
    scriptKind: "Script",
    location: "ServerScriptService › Shop",
    starter:
      'local ReplicatedStorage = game:GetService("ReplicatedStorage")\nlocal ServerStorage = game:GetService("ServerStorage")\nlocal buyItem = ReplicatedStorage:WaitForChild("BuyItem")\n\nlocal PRICES = { SpeedCoil = 150 }\n\n',
    hints: [
      "buyItem.OnServerEvent:Connect(function(player, itemName) … end)",
      "if not price or coins.Value < price then return end",
      "if player.Backpack:FindFirstChild(itemName) then return end",
    ],
    solution: lua`
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local ServerStorage = game:GetService("ServerStorage")
local buyItem = ReplicatedStorage:WaitForChild("BuyItem")

local PRICES = { SpeedCoil = 150 }

buyItem.OnServerEvent:Connect(function(player, itemName)
    local price = PRICES[itemName]
    local coins = player.leaderstats.Coins
    if not price or coins.Value < price then
        return
    end
    if player.Backpack:FindFirstChild(itemName) then
        return
    end
    coins.Value -= price
    ServerStorage.Items[itemName]:Clone().Parent = player.Backpack
end)
`,
    grade(h) {
      const w = h.newWorld();
      const remote = w.create("RemoteEvent", { Name: "BuyItem" }, w.service("ReplicatedStorage"));
      const items = w.create("Folder", { Name: "Items" }, w.service("ServerStorage"));
      w.create("Tool", { Name: "SpeedCoil" }, items);
      addCoinsFixture(w, 200);
      h.addStudentScript(w, w.service("ServerScriptService"), { name: "Shop" });
      const p = w.addPlayer("Ann");
      w.run(1);
      const coins = p.findFirstChild("leaderstats")!.findFirstChild("Coins")!;
      const owned = () =>
        p.findFirstChild("Backpack")!.children.filter((c) => c.name === "SpeedCoil").length;
      w.fireServer(remote, p, "SpeedCoil");
      w.run(0.3);
      const bought = h.check(
        h.t("Buying with 200 coins works", "200 coinle satın alınabiliyor"),
        coins.props.get("Value") === 50 && owned() === 1,
        `Coins = ${fmtValue(coins.props.get("Value"))}, SpeedCoil × ${owned()}`,
      );
      if (!bought) return;
      coins.setProp("Value", 500);
      w.fireServer(remote, p, "SpeedCoil");
      w.run(0.3);
      h.check(
        h.t("Can't buy a second one", "İkincisi alınamıyor"),
        coins.props.get("Value") === 500 && owned() === 1,
        `Coins = ${fmtValue(coins.props.get("Value"))}, SpeedCoil × ${owned()}`,
      );
      const errors = h.studentErrors(w).length;
      w.fireServer(remote, p, "Rocket");
      w.run(0.3);
      h.check(
        h.t("Unknown items do nothing", "Bilinmeyen eşyalar bir şey yapmıyor"),
        h.studentErrors(w).length === errors && coins.props.get("Value") === 500,
        h.studentErrors(w)[errors]?.message ?? `Coins = ${fmtValue(coins.props.get("Value"))}`,
      );
      const q = w.addPlayer("Bob");
      w.run(1);
      const bobCoins = q.findFirstChild("leaderstats")!.findFirstChild("Coins")!;
      bobCoins.setProp("Value", 100);
      w.fireServer(remote, q, "SpeedCoil");
      w.run(0.3);
      h.check(
        h.t("100 coins isn't enough", "100 coin yetmiyor"),
        bobCoins.props.get("Value") === 100 &&
          !q.findFirstChild("Backpack")!.findFirstChild("SpeedCoil"),
        `Coins = ${fmtValue(bobCoins.props.get("Value"))}`,
      );
    },
  },

  // ---------------------------------------------------------------- project-tycoon
  {
    lessonId: "project-tycoon",
    title: "Ore collector",
    kind: "write",
    goal: "Turn ore into cash when it reaches the collector.",
    steps: [
      "workspace.Collector is a part and workspace.Cash is an IntValue",
      "When a part with a Value attribute touches the collector, add that Value to Cash and destroy the part",
      "Parts without a Value attribute (like a player's foot) are ignored",
    ],
    scriptKind: "Script",
    location: "ServerScriptService › Collector",
    starter: "local collector = workspace.Collector\nlocal cash = workspace.Cash\n\n",
    hints: [
      "collector.Touched:Connect(function(hit) … end)",
      'local value = hit:GetAttribute("Value")',
      "if value then cash.Value += value hit:Destroy() end",
    ],
    solution: lua`
local collector = workspace.Collector
local cash = workspace.Cash

collector.Touched:Connect(function(hit)
    local value = hit:GetAttribute("Value")
    if value then
        cash.Value += value
        hit:Destroy()
    end
end)
`,
    grade(h) {
      const w = h.newWorld();
      const collector = w.create(
        "Part",
        { Name: "Collector", Anchored: true, Position: new Vector3(0, 1, 30) },
        w.workspace,
      );
      const cash = w.create("IntValue", { Name: "Cash", Value: 0 }, w.workspace);
      h.addStudentScript(w, w.service("ServerScriptService"), { name: "Collector" });
      w.run(0.5);
      const ore = (value: number) => {
        const part = w.create("Part", { Name: "Ore" }, w.workspace);
        part.setAttribute("Value", value);
        return part;
      };
      const a = ore(5);
      w.touch(collector, a);
      w.run(0.2);
      h.check(
        h.t(
          "Ore worth 5 adds 5 cash and disappears",
          "5 değerindeki maden 5 para ekliyor ve kayboluyor",
        ),
        cash.props.get("Value") === 5 && a.parent !== w.workspace,
        `Cash = ${fmtValue(cash.props.get("Value"))}`,
      );
      const b = ore(12);
      w.touch(collector, b);
      w.run(0.2);
      h.check(
        h.t("Another ore worth 12 → 17", "12 değerinde bir maden daha → 17"),
        cash.props.get("Value") === 17,
        `Cash = ${fmtValue(cash.props.get("Value"))}`,
      );
      const foot = w.create("Part", { Name: "LeftFoot" }, w.workspace);
      const errors = h.studentErrors(w).length;
      w.touch(collector, foot);
      w.run(0.2);
      h.check(
        h.t("Parts without a Value are ignored", "Value'su olmayan parçalar yok sayılıyor"),
        cash.props.get("Value") === 17 &&
          foot.parent === w.workspace &&
          h.studentErrors(w).length === errors,
        h.studentErrors(w)[errors]?.message ??
          `Cash = ${fmtValue(cash.props.get("Value"))}, LeftFoot ${foot.parent === w.workspace ? "" : h.t("was destroyed", "silindi")}`,
      );
    },
  },

  // ---------------------------------------------------------------- pcall
  {
    lessonId: "pcall",
    title: "Safe loader",
    kind: "fix",
    goal: "loadCoins sometimes errors (the DataStore is busy). Make safeLoad survive it.",
    steps: [
      "Don't change loadCoins",
      "Inside safeLoad, call loadCoins with pcall",
      "If it worked return the coins; if it failed, warn the error message and return 0",
      "The script must print 120 and then 0 without crashing",
    ],
    scriptKind: "Script",
    location: "ServerScriptService › Data",
    starter: lua`
local function loadCoins(key)
    if key == "busy" then
        error("DataStore is busy")
    end
    return 120
end

local function safeLoad(key)
    -- use pcall here
    return loadCoins(key)
end

print(safeLoad("good"))
print(safeLoad("busy"))
`,
    hints: [
      "local ok, result = pcall(loadCoins, key)",
      "if ok then return result end",
      "warn(result) then return 0",
    ],
    solution: lua`
local function loadCoins(key)
    if key == "busy" then
        error("DataStore is busy")
    end
    return 120
end

local function safeLoad(key)
    local ok, result = pcall(loadCoins, key)
    if ok then
        return result
    end
    warn(result)
    return 0
end

print(safeLoad("good"))
print(safeLoad("busy"))
`,
    grade(h) {
      const w = h.newWorld();
      h.addStudentScript(w, w.service("ServerScriptService"), { name: "Data" });
      w.run(1);
      h.check(
        h.t("The script doesn't crash", "Script çökmüyor"),
        h.studentErrors(w).length === 0,
        h.studentErrors(w)[0]?.message,
      );
      const lines = h.prints(w);
      h.check(
        h.t("Prints 120 and then 0", "Önce 120, sonra 0 yazıyor"),
        lines.join("|") === "120|0",
        `${h.t("The Output shows:", "Output'ta yazanlar:")} ${lines.join(" | ") || "—"}`,
      );
      h.check(
        h.t("The error is warned, not hidden", "Hata gizlenmiyor, uyarı olarak yazılıyor"),
        w.output.some((o) => o.kind === "warn"),
        h.t("Call warn(result) when pcall fails.", "pcall başarısız olunca warn(result) çağır."),
      );
      h.check(
        h.t("Uses pcall", "pcall kullanılıyor"),
        h.codeHas(/\bpcall\s*\(/),
        h.t("Call loadCoins through pcall.", "loadCoins'i pcall üzerinden çağır."),
      );
    },
  },

  // ---------------------------------------------------------------- cframes
  {
    lessonId: "cframes",
    title: "Aim and lift",
    kind: "write",
    goal: "Point a turret at its target, then lift a platform — both with CFrame.",
    steps: [
      "Make workspace.Turret face workspace.Target with CFrame.lookAt — the turret must stay where it is",
      "Move workspace.Platform 10 studs up by adding Vector3.new(0, 10, 0) to its CFrame",
    ],
    scriptKind: "Script",
    location: "ServerScriptService › Aim",
    starter:
      "local turret = workspace.Turret\nlocal target = workspace.Target\nlocal platform = workspace.Platform\n\n",
    hints: [
      "turret.CFrame = CFrame.lookAt(turret.Position, target.Position)",
      "platform.CFrame = platform.CFrame + Vector3.new(0, 10, 0)",
    ],
    solution: lua`
local turret = workspace.Turret
local target = workspace.Target
local platform = workspace.Platform

turret.CFrame = CFrame.lookAt(turret.Position, target.Position)
platform.CFrame = platform.CFrame + Vector3.new(0, 10, 0)
`,
    grade(h) {
      const aim = (target: Vector3) => {
        const w = h.newWorld();
        const turret = w.create(
          "Part",
          { Name: "Turret", Anchored: true, Position: new Vector3(0, 5, 0) },
          w.workspace,
        );
        w.create("Part", { Name: "Target", Anchored: true, Position: target }, w.workspace);
        const platform = w.create(
          "Part",
          { Name: "Platform", Anchored: true, Position: new Vector3(0, 1, 20) },
          w.workspace,
        );
        h.addStudentScript(w, w.service("ServerScriptService"), { name: "Aim" });
        w.run(0.5);
        const cf = turret.props.get("CFrame") as CFrame | undefined;
        const look = cf ? new Vector3(-cf.r[2], -cf.r[5], -cf.r[8]) : undefined;
        return { cf, look, platform };
      };
      const a = aim(new Vector3(10, 5, 0));
      h.check(
        h.t("The turret faces the target", "Kule hedefe bakıyor"),
        Boolean(a.look && approx(a.look.x, 1, 0.05) && approx(a.look.z, 0, 0.05)),
        h.t(`LookVector = ${fmtValue(a.look)}`, `LookVector = ${fmtValue(a.look)}`),
      );
      h.check(
        h.t("The turret stays in place", "Kule yerinde duruyor"),
        Boolean(a.cf && approx(a.cf.p.x, 0) && approx(a.cf.p.y, 5) && approx(a.cf.p.z, 0)),
        `Position = ${fmtValue(a.cf?.p)}`,
      );
      const b = aim(new Vector3(0, 5, -10));
      h.check(
        h.t("It also works when the target moves", "Hedef yer değiştirince de çalışıyor"),
        Boolean(b.look && approx(b.look.z, -1, 0.05) && approx(b.look.x, 0, 0.05)),
        h.t(
          "Aim with CFrame.lookAt instead of a fixed rotation.",
          "Sabit bir dönüş yerine CFrame.lookAt ile nişan al.",
        ),
      );
      const pos = a.platform.props.get("Position") as Vector3 | undefined;
      h.check(
        h.t("The platform moved 10 studs up", "Platform 10 stud yukarı çıktı"),
        Boolean(pos && approx(pos.y, 11) && approx(pos.x, 0) && approx(pos.z, 20)),
        `Position = ${fmtValue(pos)}`,
      );
    },
  },
];

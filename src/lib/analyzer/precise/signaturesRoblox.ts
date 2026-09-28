/**
 * Signatures for errors raised by the Roblox engine and its services
 * (instances, replication, remotes, DataStores, HTTP, tweens, animation),
 * plus Luau compile errors and script-level failures.
 */
import { closest, escapeRegExp, sanitizeCode, splitLines } from "./codeTools";
import { docs } from "./docs";
import {
  cause,
  ev,
  exactLine,
  locateMember,
  locateRegex,
  locationEvidence,
  locationOf,
  q,
  rankCauses,
  result,
} from "./helpers";
import { findBlockEnd, findLoopsWithoutYield } from "./lint";
import {
  COMMON_MEMBERS,
  CREATABLE_CLASSES,
  MEMBER_OWNER,
  SERVICE_NAMES,
  TYPE_CONVERSIONS,
  WRONG_CLASS_HINTS,
} from "./robloxApi";
import type { DiagnosisCause, Signature, SignatureResult } from "./types";

// ---------------------------------------------------------------------------
// X is not a valid member of Y "Path"
// ---------------------------------------------------------------------------

const CHILD_LIKE =
  /^(leaderstats|PlayerGui|Backpack|Humanoid|HumanoidRootPart|Head|Torso|UpperTorso|Animator|PlayerScripts)$|^[A-Z]?[a-z]+[A-Za-z0-9]*$/;

const CHARACTER_PARTS = /^(Humanoid|HumanoidRootPart|Head|Torso|UpperTorso)$/;

/**
 * Rewrites `hit.Parent.Humanoid...` so it first checks the part belongs to a
 * character. Keeps the user's own line when possible.
 */
function touchGuardFix(member: string, line?: string): SignatureResult["fixCode"] {
  const getter =
    member === "Humanoid" ? `:FindFirstChildOfClass("Humanoid")` : `:FindFirstChild("${member}")`;
  const varName =
    member === "Humanoid"
      ? "humanoid"
      : member === "HumanoidRootPart"
        ? "rootPart"
        : member[0].toLowerCase() + member.slice(1);
  const generic = {
    after: `local ${varName} = hit.Parent${getter}\nif not ${varName} then return end -- not a character, ignore it`,
    caption: "Put this at the top of your Touched function.",
  };
  if (!line) return generic;
  const m = line.match(new RegExp(`([A-Za-z_][\\w.]*)\\s*\\.\\s*${escapeRegExp(member)}\\b`));
  if (!m) return generic;
  const parentExpr = m[1];
  const found = `${parentExpr}${getter}`;
  const caption = "Only characters have a " + member + " — check for it first.";
  // `if hit.Parent.Humanoid then` → `if hit.Parent:FindFirstChildOfClass("Humanoid") then`
  if (/^(if|elseif)\b/.test(line))
    return { before: line, after: line.replace(m[0], found), caption };
  // `local hum = hit.Parent.Humanoid`
  const decl = line.match(
    new RegExp(`^local\\s+([A-Za-z_]\\w*)\\s*=\\s*${escapeRegExp(m[0])}\\s*$`),
  );
  if (decl)
    return {
      before: line,
      after: `local ${decl[1]} = ${found}\nif not ${decl[1]} then return end`,
      caption,
    };
  // `hit.Parent.Humanoid.Health = 0`
  return {
    before: line,
    after: `local ${varName} = ${found}\nif not ${varName} then return end\n${line.replace(m[0], varName)}`,
    caption,
  };
}

const invalidMember: Signature = {
  id: "invalid-member",
  category: "invalid-member",
  pattern: /(\S+) is not a valid member of (\w+)(?: "([^"]*)")?/i,
  base: 58,
  analyze: (m, ctx) => {
    const member = m[1].replace(/^['"]|['"]$/g, "");
    const cls = m[2];
    const path = m[3];
    const located = locateMember(ctx, member);
    const evidence = [...locationEvidence(located, ctx)];
    const causes: DiagnosisCause[] = [];
    let fixCode: SignatureResult["fixCode"];

    const hint = WRONG_CLASS_HINTS[`${member}@${cls}`];
    if (hint) {
      causes.push(cause(hint.why, "likely", hint.fix, true));
      if (hint.code) fixCode = { after: hint.code };
      evidence.push(ev(20, `${member} is a known mistake on ${cls}`));
    }

    const owner = MEMBER_OWNER[member];
    if (!hint && owner && !owner.owner.includes(cls)) {
      causes.push(
        cause(
          `${q(member)} belongs to a ${owner.owner}, not to a ${cls}`,
          "likely",
          `Get the ${owner.owner.split(" ")[0]} first, then use ${q(member)} on it.`,
          Boolean(located),
        ),
      );
      fixCode = { after: owner.example };
      evidence.push(ev(18, `${member} is a member of ${owner.owner}`));
    }

    const typo = closest(member, COMMON_MEMBERS);
    if (typo && typo.toLowerCase() === member.toLowerCase()) {
      causes.push(
        cause(
          `Wrong capitalization: it's ${q(typo)}, not ${q(member)}`,
          "likely",
          "Roblox names are case-sensitive.",
          true,
        ),
      );
      if (located)
        fixCode = {
          before: located.text,
          after: located.text.replace(new RegExp(`\\b${escapeRegExp(member)}\\b`), typo),
        };
      evidence.push(ev(22, `\`${member}\` differs from \`${typo}\` only by capitalization`));
    } else if (typo && !hint) {
      causes.push(
        cause(
          `Typo? Did you mean ${q(typo)}?`,
          "likely",
          "The name is one or two letters away from a real property/child.",
          true,
        ),
      );
      if (located)
        fixCode = {
          before: located.text,
          after: located.text.replace(new RegExp(`\\b${escapeRegExp(member)}\\b`), typo),
        };
      evidence.push(ev(14, `\`${member}\` is close to \`${typo}\``));
    }

    if (cls === "Accessory" || cls === "Tool" || cls === "Accoutrement") {
      causes.push(
        cause(
          `hit.Parent was a ${cls} (like a hat), not the character`,
          "likely",
          'When an accessory\'s Handle touches a part, hit.Parent is the accessory. Use Players:GetPlayerFromCharacter(hit.Parent) or hit:FindFirstAncestorOfClass("Model") and check for a Humanoid.',
        ),
      );
      fixCode = {
        after:
          'local character = hit:FindFirstAncestorOfClass("Model")\nlocal humanoid = character and character:FindFirstChildOfClass("Humanoid")\nif not humanoid then return end',
      };
      evidence.push(ev(18, `${cls} parent means the touch came from an accessory/tool`));
    }

    // `hit.Parent.Humanoid` in a Touched handler, but the thing that touched
    // wasn't a character (a loose part, a rock in a Model, a Folder…).
    const touchCode = ctx.hasCode && /\.Touched\b|\bhit\.Parent\b/.test(ctx.code);
    const nonCharacterTouch =
      CHARACTER_PARTS.test(member) &&
      !["Accessory", "Tool", "Accoutrement", "Player"].includes(cls) &&
      (touchCode ||
        cls === "Workspace" ||
        cls === "Folder" ||
        (!ctx.hasCode && cls === "Model" && !!path && /^Workspace\./i.test(path)));
    if (nonCharacterTouch) {
      const what =
        cls === "Workspace"
          ? "a part that sits directly in Workspace"
          : `${path ? q(path.split(".").pop()!) : "something"}, which is a ${cls}, not a character`;
      causes.push(
        cause(
          `Something that isn't a character touched it — hit.Parent was ${what}`,
          "likely",
          `Touched fires for every part that bumps into it: other parts, falling rocks, hats, tools. Only player (and NPC) characters have a ${member}, so check that it exists before using it.`,
          touchCode,
        ),
      );
      fixCode = touchGuardFix(member, located?.text) ?? fixCode;
      evidence.push(
        ev(
          touchCode ? 20 : 10,
          touchCode ? "the script uses Touched / hit.Parent" : `${cls} can't be a character`,
        ),
      );
    }

    if (member === "leaderstats" && cls === "Player") {
      causes.push(
        cause(
          "leaderstats doesn't exist yet (or isn't named exactly \"leaderstats\")",
          "likely",
          'A server Script must create a Folder named exactly `leaderstats` (lowercase) inside the player in PlayerAdded. Scripts that read it should use player:WaitForChild("leaderstats").',
        ),
      );
      fixCode ??= {
        after:
          'game.Players.PlayerAdded:Connect(function(player)\n\tlocal leaderstats = Instance.new("Folder")\n\tleaderstats.Name = "leaderstats"\n\tleaderstats.Parent = player\n\n\tlocal coins = Instance.new("IntValue")\n\tcoins.Name = "Coins"\n\tcoins.Parent = leaderstats\nend)',
        caption: "Server Script (ServerScriptService) that creates leaderstats.",
      };
    }

    if (path && /^(ServerStorage|ServerScriptService)/i.test(path) && ctx.side === "client") {
      causes.push(
        cause(
          `${path.split(".")[0]} is invisible to LocalScripts`,
          "likely",
          "Anything the client needs (remotes, templates, modules) must be in ReplicatedStorage.",
          true,
        ),
      );
      evidence.push(ev(18, "client code reading a server-only container"));
    }

    if (cls === "DataModel" && SERVICE_NAMES.includes(member)) {
      causes.push(
        cause(
          `Use game:GetService("${member}") instead of game.${member}`,
          "likely",
          "Some services aren't children of game until something requests them; GetService always works.",
          true,
        ),
      );
      fixCode = { after: `local ${member} = game:GetService("${member}")` };
      evidence.push(ev(18, "service accessed with a dot"));
    }

    const isChildName =
      !hint &&
      !nonCharacterTouch &&
      !(owner && !owner.owner.includes(cls)) &&
      !(typo && typo.toLowerCase() === member.toLowerCase()) &&
      CHILD_LIKE.test(member);
    if (isChildName) {
      causes.push(
        cause(
          `${q(member)} hasn't loaded/replicated yet${ctx.side === "client" ? " (this is a LocalScript)" : ""}`,
          ctx.side === "client" || /PlayerGui|Character|Backpack/i.test(path ?? "")
            ? "likely"
            : "possible",
          "Objects created by other scripts, UI copied into PlayerGui, character parts and anything streamed in can arrive a moment after your script starts. Dot-indexing doesn't wait; WaitForChild does.",
        ),
        cause(
          `There is no child called exactly ${q(member)} inside ${path ? q(path) : `that ${cls}`}`,
          "possible",
          "Check the name in Explorer during Play — spaces and capital letters count.",
        ),
      );
      if (located && !fixCode) {
        const replaced = located.text.replace(
          new RegExp(`\\.\\s*${escapeRegExp(member)}\\b`),
          `:WaitForChild("${member}")`,
        );
        if (replaced !== located.text)
          fixCode = {
            before: located.text,
            after: replaced,
            caption: "WaitForChild waits until the object exists.",
          };
      }
    }

    if (nonCharacterTouch) {
      return result({
        title: `hit.Parent isn't a character — it has no ${member}`,
        severity: "High",
        summary: `The part that touched yours belongs to ${path ? q(path) : `a ${cls}`}, not to a player's character, so there is no ${q(member)} inside it.`,
        explanation: `Touched fires for every part that bumps into yours — not just players. \`hit\` is the part that touched, and \`hit.Parent\` is whatever holds it. For a player's leg that's the character (which has a ${member}); for a loose part it's Workspace or a Model. Writing \`hit.Parent.${member}\` assumes a character and errors for everything else.`,
        location: locationOf(located, member),
        causes: rankCauses(causes),
        steps: [
          `Get the ${member} with ${member === "Humanoid" ? ':FindFirstChildOfClass("Humanoid")' : `:FindFirstChild("${member}")`} — it returns nil instead of erroring.`,
          "If it's nil, `return` early: whatever touched you wasn't a character.",
          "Only players? Use game.Players:GetPlayerFromCharacter(hit.Parent) and check it isn't nil.",
        ],
        fixCode,
        docs: docs(
          ["BasePart", "Touched"],
          ["Instance", "FindFirstChildOfClass"],
          ["Players", "GetPlayerFromCharacter"],
        ),
        evidence,
      });
    }

    return result({
      title: `"${member}" doesn't exist on ${cls}`,
      severity: "High",
      summary: `Roblox looked for ${q(member)} inside ${path ? q(path) : `a ${cls}`} and found nothing with that name.`,
      explanation: `When you write ${q(`.${member}`)}, Roblox checks the object's properties, methods and children for that exact name. None matched — so it's misspelled, it's the wrong kind of object, or the child isn't there yet.`,
      location: locationOf(located, member),
      causes: rankCauses(
        causes.length
          ? causes
          : [cause(`${q(member)} isn't a property, method or child of ${cls}`, "likely")],
      ),
      steps: [
        `Press Play, open Explorer and look inside ${path ? q(path) : `the ${cls}`} for ${q(member)} — compare spelling and capitals.`,
        "If it's created by another script or it's UI/character stuff, use :WaitForChild(\"Name\").",
        "If it's a property, check the Properties window of that object for the exact name.",
      ],
      fixCode,
      docs: docs(
        ["Instance", "WaitForChild"],
        cls === "Player"
          ? "Player"
          : cls === "Model"
            ? "Model"
            : cls === "Humanoid"
              ? "Humanoid"
              : "Instance",
      ),
      evidence,
    });
  },
};

// ---------------------------------------------------------------------------
// Infinite yield possible on 'Parent:WaitForChild("Child")'
// ---------------------------------------------------------------------------

const infiniteYield: Signature = {
  id: "infinite-yield",
  category: "wait",
  pattern:
    /Infinite yield possible on '([^']*?):WaitForChild\((?:\\?["'])([^"'\\]+)(?:\\?["'])\)'/i,
  base: 60,
  analyze: (m, ctx) => {
    const parentPath = m[1];
    const child = m[2];
    const located = locateRegex(
      ctx,
      new RegExp(`WaitForChild\\s*\\(\\s*["']${escapeRegExp(child)}["']`),
      true,
    );
    const evidence = [...locationEvidence(located, ctx)];
    const causes: DiagnosisCause[] = [];
    let fixCode: SignatureResult["fixCode"] = {
      after: `local ${child.replace(/\W/g, "") || "child"} = ${located ? (located.text.match(/([\w.:]+)\s*:\s*WaitForChild/)?.[1] ?? "parent") : "parent"}:WaitForChild("${child}", 10)\nif not ${child.replace(/\W/g, "") || "child"} then\n\twarn("${child} never appeared in ${parentPath}")\n\treturn\nend`,
      caption: "A timeout turns an endless wait into a clear warning you can handle.",
    };

    // The snippet creates something with an almost-identical name.
    for (const created of ctx.code.matchAll(/\.Name\s*=\s*["']([^"']+)["']/g)) {
      if (
        created[1] !== child &&
        (created[1].toLowerCase() === child.toLowerCase() ||
          closest(child, [created[1]]) === created[1])
      ) {
        causes.push(
          cause(
            `Name mismatch: your code creates ${q(`"${created[1]}"`)} but waits for ${q(`"${child}"`)}`,
            "likely",
            "Names must match exactly, including capital letters and spaces.",
            true,
          ),
        );
        evidence.push(ev(24, `created name "${created[1]}" nearly matches "${child}"`));
      }
    }

    if (/^(ServerStorage|ServerScriptService)/i.test(parentPath)) {
      causes.push(
        cause(
          `The client can't see ${parentPath.split(".")[0]}`,
          "likely",
          "LocalScripts never receive anything stored in ServerStorage or ServerScriptService. Move it to ReplicatedStorage.",
          true,
        ),
      );
      evidence.push(ev(20, "waiting inside a server-only container"));
    }
    if (child === "leaderstats") {
      causes.push(
        cause(
          "No server script creates leaderstats for this player (or it's named differently)",
          "likely",
          'The folder must be created by a server Script in Players.PlayerAdded and be named exactly "leaderstats".',
        ),
      );
    }
    if (
      /^(Humanoid|HumanoidRootPart|Head|Animator)$/.test(child) &&
      /^Workspace\./i.test(parentPath)
    ) {
      causes.push(
        cause(
          "You're waiting on an old character that was removed when the player died/respawned",
          "possible",
          "Get the fresh character from player.CharacterAdded each time.",
        ),
      );
    }
    if (/^Workspace/i.test(parentPath) && ctx.side !== "server") {
      causes.push(
        cause(
          "StreamingEnabled: that part of the map isn't streamed to this client yet",
          "possible",
          "With streaming on, far-away parts don't exist on the client. Use a timeout, ModelStreamingMode = Persistent for important models, or handle it on the server.",
        ),
      );
    }
    if (/PlayerGui/i.test(parentPath)) {
      causes.push(
        cause(
          "The ScreenGui isn't named like that in StarterGui, or it's a different ScreenGui",
          "possible",
          "Everything in StarterGui is copied into PlayerGui with the same names.",
        ),
      );
    }
    causes.push(
      cause(
        `Nothing named exactly "${child}" is ever put inside ${q(parentPath)}`,
        "possible",
        "Check spelling and the parent in Explorer while the game is running.",
      ),
      cause("The object is created by a script that errored or never ran", "possible"),
    );
    if (causes[0]?.confirmedInCode && causes[0].text.startsWith("Name mismatch"))
      fixCode = undefined;

    return result({
      title: `Waiting forever for "${child}"`,
      severity: "Medium",
      summary: `WaitForChild("${child}") has waited 5+ seconds inside ${q(parentPath)} and it still hasn't appeared.`,
      explanation: `This is a warning, not a crash: WaitForChild pauses your script until a child with that exact name exists. After 5 seconds Roblox warns you that it might never come — and your script is still stuck on that line.`,
      location: locationOf(located, child),
      causes: rankCauses(causes),
      steps: [
        `Press Play and look in Explorer: does ${q(parentPath)} contain ${q(child)}? Check the spelling and which side (Server/Client view) you're looking at.`,
        "If it's supposed to be created by a script, check that script's output for errors.",
        "Add a timeout (second argument) so the script can react instead of hanging.",
      ],
      fixCode,
      docs: docs(["Instance", "WaitForChild"], "ReplicatedStorage"),
      evidence,
    });
  },
};

// ---------------------------------------------------------------------------
// Instance lifecycle
// ---------------------------------------------------------------------------

const parentLocked: Signature = {
  id: "parent-locked",
  category: "instance",
  pattern: /The Parent property of (.+?) is locked, current parent: (\S+), new parent (\S+)/i,
  base: 60,
  analyze: (m, ctx) => {
    const obj = m[1];
    const located = locateRegex(ctx, /:\s*Destroy\s*\(\s*\)/);
    const evidence = [...locationEvidence(located, ctx)];
    if (located) evidence.push(ev(10, "the snippet destroys an object"));
    return result({
      title: `Can't re-parent a destroyed object`,
      severity: "Medium",
      summary: `${q(obj)} was already destroyed, so it can't be moved to ${q(m[3])}.`,
      explanation:
        "Destroy() permanently locks an object's Parent (current parent NULL means it's destroyed). You can't bring it back. Keep an original as a template and Clone() it every time you need a fresh copy.",
      location: locationOf(located),
      causes: rankCauses([
        cause(
          "You destroy the object and then try to use/parent it again",
          "likely",
          "Common with tools, projectiles and UI: Destroy the clone, never the template.",
        ),
        cause("Another script (or Debris:AddItem) destroyed it first", "possible"),
      ]),
      steps: [
        "Keep the template in ReplicatedStorage/ServerStorage and only ever Destroy clones.",
        "Create a new clone each time instead of reusing an old object.",
      ],
      fixCode: {
        after:
          'local template = game.ServerStorage:WaitForChild("Coin")\n\nlocal coin = template:Clone()\ncoin.Parent = workspace\ntask.delay(10, function()\n\tcoin:Destroy() -- destroy the copy, never the template\nend)',
      },
      docs: docs(["Instance", "Destroy"], ["Instance", "Clone"], "Debris"),
      evidence,
    });
  },
};

const unexpectedParent: Signature = {
  id: "unexpected-parent",
  category: "instance",
  pattern:
    /Something unexpectedly tried to set the parent of (.+?) to (.+?) while trying to set the parent of/i,
  base: 56,
  analyze: (_m, ctx) => {
    const located = locateRegex(ctx, /ChildAdded|ChildRemoved|AncestryChanged|DescendantAdded/);
    return result({
      title: "Parent changed while it was already changing",
      severity: "Medium",
      summary:
        "A script moved an object to a new parent from inside an event that fired because its parent was changing.",
      explanation:
        "Changing Parent inside ChildAdded/ChildRemoved/AncestryChanged for the same object makes Roblox re-enter the change. Defer your move until the current change has finished.",
      location: locationOf(located),
      causes: [
        cause(
          "Parent is set inside a ChildAdded / AncestryChanged handler",
          "likely",
          undefined,
          Boolean(located),
        ),
      ],
      steps: ["Wrap the Parent change in task.defer(function() ... end)."],
      fixCode: {
        after:
          "folder.ChildAdded:Connect(function(child)\n\ttask.defer(function()\n\t\tchild.Parent = otherFolder\n\tend)\nend)",
      },
      docs: docs("task", "Instance"),
      evidence: locationEvidence(located, ctx),
    });
  },
};

const unableToAssign: Signature = {
  id: "unable-to-assign",
  category: "invalid-type",
  pattern: /Unable to assign property (\w+)\. (\w+) expected, got (\w+)/i,
  base: 60,
  analyze: (m, ctx) => {
    const [, prop, expected, got] = m;
    const located = locateRegex(ctx, new RegExp(`\\.\\s*${escapeRegExp(prop)}\\s*=[^=]`));
    const evidence = [...locationEvidence(located, ctx)];
    const conversion = TYPE_CONVERSIONS[`${expected}<-${got}`];
    let fixCode: SignatureResult["fixCode"];
    if (located) {
      const rhs = located.text
        .split(/=(?!=)/)
        .slice(1)
        .join("=")
        .trim();
      if (conversion && rhs) {
        const converted =
          expected === "string"
            ? `tostring(${rhs})`
            : expected === "number"
              ? `tonumber(${rhs}) or 0`
              : expected === "Vector3" && got === "CFrame"
                ? `(${rhs}).Position`
                : expected === "CFrame" && got === "Vector3"
                  ? `CFrame.new(${rhs})`
                  : expected === "Color3" && got === "BrickColor"
                    ? `(${rhs}).Color`
                    : expected === "BrickColor" && got === "Color3"
                      ? `BrickColor.new(${rhs})`
                      : expected === "Content"
                        ? `"rbxassetid://" .. ${rhs}`
                        : undefined;
        if (converted) {
          fixCode = { before: located.text, after: located.text.replace(rhs, converted) };
          evidence.push(ev(12, `line ${located.line} assigns ${rhs} to ${prop}`));
        }
      }
    }
    const causes: DiagnosisCause[] = [];
    if (fixCode && located) {
      const rhs = located.text
        .split(/=(?!=)/)
        .slice(1)
        .join("=")
        .trim();
      causes.push(
        cause(
          `Line ${located.line} gives ${prop} a ${got} (${q(rhs)})`,
          "likely",
          conversion ? `Convert it: ${conversion}.` : undefined,
          true,
        ),
      );
    }
    if (got === "nil")
      causes.push(
        cause(
          `The value you assigned to ${prop} is nil`,
          "likely",
          "A lookup or variable on the right side of `=` has no value.",
        ),
      );
    if (prop === "Position" && got === "CFrame")
      causes.push(
        cause("You assigned a CFrame to Position — use .CFrame = ... or cf.Position", "likely"),
      );
    if (prop === "Text" && got !== "nil")
      causes.push(cause(`Text needs a string; wrap the ${got} in tostring()`, "likely"));
    if (/Color/.test(prop))
      causes.push(
        cause(
          "Color3 and BrickColor are different types",
          "possible",
          'Color3.fromRGB(255, 0, 0) for Color3 properties, BrickColor.new("Bright red") for BrickColor.',
        ),
      );
    if (expected === "Content")
      causes.push(cause('Asset IDs must be text like "rbxassetid://123456"', "likely"));
    if (causes.length === 0)
      causes.push(
        cause(
          `${prop} only accepts a ${expected}, but the code gives it a ${got}`,
          "likely",
          conversion ? `Convert it: ${conversion}.` : undefined,
        ),
      );
    return result({
      title: `${prop} needs a ${expected}, got ${got}`,
      severity: "Medium",
      summary: `You set ${q(prop)} to a ${got}, but it only accepts a ${expected}.`,
      explanation: `Every Roblox property has a fixed type. ${q(prop)} is a ${expected} property, so assigning a ${got} is rejected.${conversion ? ` Convert it first: ${q(conversion)}.` : ""}`,
      location: locationOf(located, prop),
      causes: rankCauses(causes),
      steps: [
        `Check the Properties window: ${prop} is a ${expected}.`,
        conversion
          ? `Convert the value: ${conversion}.`
          : `Build a ${expected} value (e.g. ${expected}.new(...)).`,
      ],
      fixCode,
      docs: docs(
        expected === "Vector3"
          ? "Vector3"
          : expected === "CFrame"
            ? "CFrame"
            : expected === "UDim2"
              ? "UDim2"
              : expected === "Color3"
                ? "Color3"
                : "Instance",
      ),
      evidence,
    });
  },
};

const unableToCast: Signature = {
  id: "unable-to-cast",
  category: "invalid-type",
  pattern: /Unable to cast (\w+(?:::\w+)?) to (\w+(?:::\w+)?)/i,
  base: 50,
  analyze: (m, ctx) => {
    const from = m[1];
    const to = m[2];
    const causes: DiagnosisCause[] = [];
    let located = exactLine(ctx);
    const fire = locateRegex(ctx, /:\s*FireClient\s*\(/);
    if (to === "Object" && fire) {
      const arg = fire.text.match(/FireClient\s*\(\s*([^,)]+)/)?.[1]?.trim();
      if (arg && !/player|plr/i.test(arg)) {
        causes.push(
          cause(
            `FireClient's first argument must be the Player (you passed ${q(arg)})`,
            "likely",
            "Use remote:FireClient(player, data...).",
            true,
          ),
        );
        located = { ...fire, clean: "" };
      }
    }
    if (to === "Object")
      causes.push(
        cause(
          "A function that needs a Roblox object received something else (a string, number or nil)",
          "likely",
          'E.g. passing a name instead of the Player, or `Debris:AddItem("Part")` instead of the part.',
        ),
      );
    if (to === "Dictionary" || to === "Array") {
      const tw = locateRegex(ctx, /TweenService\s*:\s*Create|:\s*Create\s*\(/);
      if (tw) {
        causes.push(
          cause(
            "TweenService:Create's third argument must be a table of goals",
            "likely",
            "e.g. `{ Position = Vector3.new(0, 10, 0) }`.",
            true,
          ),
        );
        located = { ...tw, clean: "" };
      }
      causes.push(
        cause(
          `A ${to === "Dictionary" ? "table with named keys" : "list"} was expected, but a ${from} was passed`,
          "possible",
        ),
      );
    }
    if (/int64|int|double|float/i.test(to) && from === "string")
      causes.push(
        cause(
          "A number was passed as text — use tonumber()",
          "likely",
          "Common with UserIds and TextBox input.",
        ),
      );
    if (to === "Content")
      causes.push(cause('Asset IDs must be strings like "rbxassetid://123"', "likely"));
    if (/token|EnumItem/i.test(to))
      causes.push(cause("Use the Enum instead of a string, e.g. Enum.Material.Neon", "likely"));
    if (causes.length === 0)
      causes.push(cause(`A ${from} was passed where a ${to} is required`, "likely"));
    return result({
      title: `Wrong type: ${from} given, ${to} needed`,
      severity: "Medium",
      summary: `A Roblox function or property needed a ${to}, but got a ${from}.`,
      explanation:
        "Roblox converts your Luau values into engine types. It couldn't turn this value into the type the function expects, so check the order and type of the arguments you pass.",
      location: located ? locationOf(located) : undefined,
      causes: rankCauses(causes),
      steps: [
        "Look up the function's parameter types in the docs.",
        "Print typeof(value) for each argument.",
      ],
      docs: docs("Instance"),
      evidence: [
        ...locationEvidence(located, ctx),
        ...(causes[0]?.confirmedInCode
          ? [ev(16, "the mismatching call was found in your code")]
          : []),
      ],
    });
  },
};

const invalidService: Signature = {
  id: "invalid-service",
  category: "instance",
  pattern: /'([^']+)' is not a valid Service name/i,
  base: 62,
  analyze: (m, ctx) => {
    const name = m[1];
    const suggestion = closest(name, SERVICE_NAMES, 3);
    const located = locateRegex(
      ctx,
      new RegExp(`GetService\\s*\\(\\s*["']${escapeRegExp(name)}["']`),
      true,
    );
    return result({
      title: `"${name}" isn't a Roblox service`,
      severity: "High",
      summary: `game:GetService("${name}") failed because no service has that name${suggestion ? ` — you probably meant "${suggestion}"` : ""}.`,
      explanation:
        'Service names must be spelled exactly, with capital letters (e.g. "ReplicatedStorage", "TweenService").',
      location: locationOf(located, name),
      causes: [
        cause(
          suggestion ? `Typo: use "${suggestion}"` : "The service name is misspelled",
          "likely",
          undefined,
          Boolean(suggestion),
        ),
      ],
      steps: ["Copy the exact name from the Explorer or the docs."],
      fixCode: suggestion
        ? { before: located?.text, after: `local ${suggestion} = game:GetService("${suggestion}")` }
        : undefined,
      docs: docs("Instance"),
      evidence: [
        ...locationEvidence(located, ctx),
        ...(suggestion ? [ev(24, `"${name}" is close to "${suggestion}"`)] : []),
      ],
    });
  },
};

const cannotCreate: Signature = {
  id: "cannot-create",
  category: "instance",
  pattern: /Unable to create an Instance of type "([^"]+)"/i,
  base: 62,
  analyze: (m, ctx) => {
    const cls = m[1];
    const suggestion = closest(cls, CREATABLE_CLASSES, 3);
    const isService = SERVICE_NAMES.includes(cls);
    const located = locateRegex(
      ctx,
      new RegExp(`Instance\\.new\\s*\\(\\s*["']${escapeRegExp(cls)}["']`),
      true,
    );
    return result({
      title: `Instance.new("${cls}") failed`,
      severity: "High",
      summary: isService
        ? `${cls} is a service — get it with game:GetService("${cls}") instead of creating it.`
        : `There is no creatable class called "${cls}"${suggestion ? ` — did you mean "${suggestion}"?` : ""}.`,
      explanation:
        "Instance.new only accepts exact class names of objects that scripts are allowed to create.",
      location: locationOf(located, cls),
      causes: [
        cause(
          isService
            ? "Services can't be created"
            : suggestion
              ? `Typo: "${suggestion}"`
              : "Misspelled or non-creatable class",
          "likely",
          undefined,
          Boolean(suggestion) || isService,
        ),
      ],
      steps: ["Check the class name in the docs (it's case-sensitive)."],
      fixCode: isService
        ? { after: `local ${cls} = game:GetService("${cls}")` }
        : suggestion
          ? { before: located?.text, after: `Instance.new("${suggestion}")` }
          : undefined,
      docs: docs("Instance"),
      evidence: [
        ...locationEvidence(located, ctx),
        ...(suggestion || isService ? [ev(22, "known class name mix-up")] : []),
      ],
    });
  },
};

const colonCall: Signature = {
  id: "colon-call",
  category: "call-nil",
  pattern: /Expected ':' not '\.' calling member function (\w+)/i,
  base: 66,
  analyze: (m, ctx) => {
    const fn = m[1];
    const located = locateRegex(ctx, new RegExp(`\\.\\s*${escapeRegExp(fn)}\\s*\\(`));
    return result({
      title: `Use :${fn}() not .${fn}()`,
      severity: "Medium",
      summary: `Roblox methods are called with a colon. Write ${q(`:${fn}(`)} instead of ${q(`.${fn}(`)}.`,
      explanation:
        "A colon passes the object itself into the method. `part.Destroy()` calls Destroy without telling it which part; `part:Destroy()` does.",
      location: locationOf(located, fn),
      causes: [
        cause(
          `${q(`.${fn}(`)} used instead of ${q(`:${fn}(`)}`,
          "likely",
          undefined,
          Boolean(located),
        ),
      ],
      steps: ["Replace the dot before the method name with a colon."],
      fixCode: located
        ? {
            before: located.text,
            after: located.text.replace(new RegExp(`\\.\\s*${escapeRegExp(fn)}\\s*\\(`), `:${fn}(`),
          }
        : undefined,
      docs: docs("guideLuau"),
      evidence: [
        ...locationEvidence(located, ctx),
        ...(located ? [ev(20, "the dot-call was found in your code")] : []),
      ],
    });
  },
};

// ---------------------------------------------------------------------------
// Script-level failures
// ---------------------------------------------------------------------------

const scriptTimeout: Signature = {
  id: "script-timeout",
  category: "timeout",
  pattern: /Script timeout: exhausted allowed execution time|exhausted allowed execution time/i,
  base: 58,
  analyze: (_m, ctx) => {
    const loops = findLoopsWithoutYield(ctx.code);
    const loop = loops.find((l) => l.line === ctx.log.line) ?? loops[0];
    const located = loop
      ? { line: loop.line, text: loop.text, exact: loop.line === ctx.log.line }
      : undefined;
    const evidence = [...locationEvidence(located, ctx)];
    if (loop) evidence.push(ev(24, `the loop on line ${loop.line} never calls task.wait()`));
    return result({
      title: "Script ran too long without pausing",
      severity: "Critical",
      summary:
        "A loop ran for about 10 seconds without ever yielding, so Roblox stopped the script to keep the game from freezing.",
      explanation:
        "Roblox runs scripts one at a time. A `while true do` (or repeat) loop without task.wait() never gives anything else a turn, which freezes the game. Every endless loop needs a wait inside it.",
      location: locationOf(located),
      causes: rankCauses([
        ...(loop
          ? [cause(`The loop on line ${loop.line} has no task.wait()`, "likely", undefined, true)]
          : []),
        cause("A `while true do` / `repeat ... until` loop without task.wait()", "likely"),
        cause(
          "A for-loop over a huge number of items (or recursion) doing heavy work in one frame",
          "possible",
          "Split the work up and add task.wait() every few hundred iterations.",
        ),
      ]),
      steps: [
        "Add task.wait() inside every endless loop.",
        "For per-frame logic use RunService.Heartbeat:Connect instead of a loop.",
      ],
      fixCode: {
        before: loop?.text ?? "while true do",
        after: "while true do\n\t-- your code\n\ttask.wait(0.1) -- let the game breathe\nend",
      },
      docs: docs("task", "RunService"),
      evidence,
    });
  },
};

const stackOverflow: Signature = {
  id: "stack-overflow",
  category: "stack-overflow",
  pattern: /stack overflow|C stack overflow/i,
  base: 50,
  analyze: (_m, ctx) => {
    const raw = splitLines(ctx.code);
    const clean = splitLines(sanitizeCode(ctx.code));
    let located: { line: number; text: string; exact: boolean } | undefined;
    const causes: DiagnosisCause[] = [];
    const evidence = [];
    for (let i = 0; i < clean.length && !located; i++) {
      const fn = clean[i].match(/function\s+(?:[\w.]*[.:])?(\w+)\s*\(/);
      if (!fn) continue;
      const end = findBlockEnd(clean, i);
      const body = clean.slice(i + 1, end === -1 ? clean.length : end).join("\n");
      if (
        new RegExp(`(^|[^\\w])(?:self\\s*:\\s*|[\\w.]*[.:])?${escapeRegExp(fn[1])}\\s*\\(`).test(
          body,
        )
      ) {
        located = { line: i + 1, text: raw[i].trim(), exact: false };
        const hasBase = /\breturn\b/.test(body) && /\bif\b/.test(body);
        causes.push(
          cause(
            `${q(fn[1] + "()")} calls itself${hasBase ? " — check that its stop condition is actually reached" : " with no stop condition"}`,
            "likely",
            "Each call waits for the next one to finish. Without an `if ... then return end` that eventually triggers, it goes on until the call stack runs out.",
            true,
          ),
        );
        evidence.push(ev(hasBase ? 14 : 22, "recursive function found"));
      }
    }
    const idx = clean.findIndex((l) => /__index\s*=\s*function/.test(l));
    if (idx !== -1) {
      const body = clean.slice(idx, idx + 6).join("\n");
      if (/\b(\w+)\s*\[\s*\w+\s*\]/.test(body) && !/rawget/.test(body)) {
        causes.push(
          cause(
            "An __index metamethod reads from the same table, which calls __index again",
            "likely",
            "Use rawget(t, key) inside __index.",
            true,
          ),
        );
        located ??= { line: idx + 1, text: raw[idx].trim(), exact: false };
        evidence.push(ev(18, "__index reads its own table"));
      }
    }
    const changed = clean.findIndex((l) =>
      /\.Changed\s*:\s*Connect|GetPropertyChangedSignal/.test(l),
    );
    if (changed !== -1)
      causes.push(
        cause("A Changed handler changes the same property, which fires Changed again", "possible"),
      );
    causes.push(cause("Two functions (or two modules) keep calling each other", "possible"));
    return result({
      title: "Function called itself forever (stack overflow)",
      severity: "Critical",
      summary:
        "Functions kept calling other functions (usually themselves) until Luau ran out of room to remember them.",
      explanation:
        'Every function call is stored on the "call stack" until it returns. Endless recursion keeps adding calls and never returns, so the stack overflows.',
      location: locationOf(located),
      causes: rankCauses(causes),
      steps: [
        "Find the function that calls itself and add a stop condition that is definitely reached.",
        "If you need to repeat something forever, use a loop with task.wait() instead of recursion.",
      ],
      docs: docs("globals"),
      evidence: [...locationEvidence(located, ctx), ...evidence],
    });
  },
};

const reentrancy: Signature = {
  id: "reentrancy",
  category: "stack-overflow",
  pattern: /Maximum event re-entrancy depth exceeded/i,
  base: 60,
  analyze: (_m, ctx) => {
    const located = locateRegex(
      ctx,
      /Changed\s*:\s*Connect|GetPropertyChangedSignal|ChildAdded|:\s*Fire\s*\(/,
    );
    return result({
      title: "An event keeps triggering itself",
      severity: "High",
      summary: "An event handler does something that fires the same event again, over and over.",
      explanation:
        "Example: a Changed handler that sets the same Value, or a BindableEvent handler that Fires the same event. Roblox stops it after ~80 nested levels.",
      location: locationOf(located),
      causes: [
        cause(
          "A handler changes the property/value it is listening to",
          "likely",
          "Only update when the value is actually different, or use a guard flag.",
          Boolean(located),
        ),
      ],
      steps: ["Add `if newValue == oldValue then return end` or a `busy` flag in the handler."],
      fixCode: {
        after:
          "local updating = false\nvalue.Changed:Connect(function()\n\tif updating then return end\n\tupdating = true\n\tvalue.Value = math.clamp(value.Value, 0, 100)\n\tupdating = false\nend)",
      },
      docs: docs("RBXScriptSignal"),
      evidence: locationEvidence(located, ctx),
    });
  },
};

// ---------------------------------------------------------------------------
// Compile (syntax) errors
// ---------------------------------------------------------------------------

function syntaxSpecifics(ctx: Parameters<Signature["analyze"]>[1]): {
  causes: DiagnosisCause[];
  located?: { line: number; text: string; exact: boolean };
  fix?: SignatureResult["fixCode"];
  points: number;
} {
  const raw = splitLines(ctx.code);
  const clean = splitLines(sanitizeCode(ctx.code));
  const checks: Array<{ test: RegExp; cause: string; detail: string; fix: (s: string) => string }> =
    [
      {
        test: /^\s*(if|elseif|while)\b[^=~<>!]*[^=~<>!]=[^=]/,
        cause: "`=` used in a condition — comparisons use `==`",
        detail: "`if x = 5 then` must be `if x == 5 then`.",
        fix: (s) => s.replace(/([^=~<>!])=([^=])/, "$1==$2"),
      },
      {
        test: /!=/,
        cause: "`!=` isn't Luau — use `~=`",
        detail: "",
        fix: (s) => s.replace(/!=/g, "~="),
      },
      {
        test: /&&|\|\|/,
        cause: "`&&` / `||` aren't Luau — use `and` / `or`",
        detail: "",
        fix: (s) => s.replace(/&&/g, "and").replace(/\|\|/g, "or"),
      },
      {
        test: /^\s*\/\//,
        cause: "`//` isn't a comment in Luau — use `--`",
        detail: "",
        fix: (s) => s.replace("//", "--"),
      },
      {
        test: /^\s*(if|elseif)\b(?!.*\bthen\b)/,
        cause: "`if` without `then`",
        detail: "Every if/elseif condition ends with `then`.",
        fix: (s) => `${s.replace(/\s*$/, "")} then`,
      },
      {
        test: /^\s*(while|for)\b(?!.*\bdo\b)/,
        cause: "loop without `do`",
        detail: "`while cond do` / `for ... do`.",
        fix: (s) => `${s.replace(/\s*$/, "")} do`,
      },
      {
        test: /\)\s*\{\s*$/,
        cause: "`{` used to start a code block — Luau uses `then`/`do` ... `end`",
        detail: "",
        fix: (s) => s.replace(/\s*\{\s*$/, ""),
      },
      {
        test: /\w\+\+/,
        cause: "`++` doesn't exist — use `x += 1`",
        detail: "",
        fix: (s) => s.replace(/(\w+)\+\+/, "$1 += 1"),
      },
    ];
  const logLine = ctx.log.line;
  const order =
    logLine && logLine <= clean.length
      ? [logLine - 1, ...clean.map((_, i) => i).filter((i) => i !== logLine - 1)]
      : clean.map((_, i) => i);
  for (const i of order) {
    for (const check of checks) {
      const text = check.test.source.startsWith("^\\s*\\/\\/") ? raw[i] : clean[i];
      if (text && check.test.test(text)) {
        return {
          causes: [cause(check.cause, "likely", check.detail || undefined, true)],
          located: { line: i + 1, text: raw[i].trim(), exact: i + 1 === logLine },
          fix: { before: raw[i].trim(), after: check.fix(raw[i].trim()) },
          points: 22,
        };
      }
    }
  }
  return { causes: [], points: 0 };
}

function analyzeSyntax(
  ctx: Parameters<Signature["analyze"]>[1],
  expected: string,
  opener: string | undefined,
  openLine: number | undefined,
  got: string,
  forgot: string | undefined,
  forgotLine: number | undefined,
): SignatureResult {
  const specific = syntaxSpecifics(ctx);
  const evidence = [
    ...(specific.points ? [ev(specific.points, "found the exact syntax slip in your code")] : []),
  ];
  const causes: DiagnosisCause[] = [...specific.causes];
  let located = specific.located;

  if (expected === "end") {
    const target = forgotLine ?? openLine;
    if (target && ctx.hasCode) {
      const raw = splitLines(ctx.code);
      if (target <= raw.length)
        located ??= { line: target, text: raw[target - 1].trim(), exact: true };
    }
    causes.push(
      cause(
        forgot
          ? `The '${forgot}' on line ${forgotLine} is never closed with \`end\``
          : `The '${opener ?? "block"}'${openLine ? ` on line ${openLine}` : ""} is missing its \`end\``,
        "likely",
        "Each function, if, for and while needs its own end. `else if` (two words) opens a *new* if that needs an extra end — use `elseif`.",
        Boolean(forgot || openLine),
      ),
    );
    evidence.push(ev(forgot || openLine ? 16 : 6, "Luau reported where the unclosed block starts"));
  } else if (expected === ")") {
    causes.push(
      cause("A `(` is never closed — or a comma/`..` is missing between arguments", "likely"),
    );
  } else if (expected === "then" || expected === "do") {
    causes.push(
      cause(
        `Missing \`${expected}\` (or an operator mistake just before it)`,
        "likely",
        "Often `=` instead of `==`, or `!=` instead of `~=`.",
      ),
    );
  } else if (expected === "=") {
    causes.push(
      cause("A line isn't a complete statement (e.g. just `x` or `a == b` on its own)", "likely"),
    );
  } else {
    causes.push(cause(`Luau expected ${q(expected)} but found ${got}`, "likely"));
  }
  if (got === "<eof>")
    causes.push(cause("The script ends before every block is closed", "possible"));

  return result({
    title: expected === "end" ? "Missing `end`" : `Syntax error: expected ${expected}`,
    severity: "High",
    summary:
      expected === "end"
        ? `A block${opener ? ` ('${opener}')` : ""} is never closed with \`end\`${forgotLine ? ` — check line ${forgotLine}` : openLine ? ` — it starts on line ${openLine}` : ""}.`
        : `Luau couldn't read the script: it expected ${q(expected)} but found ${got}.`,
    explanation:
      "This is a syntax (spelling/grammar) error, so the whole script didn't run at all. Luau reads top to bottom and reports the first place where the code stops making sense — the real mistake is often on that line or just above it.",
    location: located ? locationOf(located) : undefined,
    causes: rankCauses(causes),
    steps: [
      "Open the script — Studio underlines the problem in red.",
      expected === "end"
        ? "Match every function/if/for/while with an end (Studio's code folding arrows help)."
        : "Look at the line and the one above it for a missing keyword, bracket or operator.",
    ],
    fixCode: specific.fix,
    docs: docs("guideLuau"),
    evidence,
  });
}

const syntaxExpected: Signature = {
  id: "syntax-expected",
  category: "syntax",
  pattern:
    /Expected '([^']+)'(?: \(to close '([^']+)' at (line|column) (\d+)\))?(?: when parsing [\w\s]+?)?, got ('[^']*'|<eof>|\S+)(?:; did you forget to close '([^']+)' at line (\d+)\?)?/i,
  base: 56,
  analyze: (m, ctx) =>
    analyzeSyntax(
      ctx,
      m[1],
      m[2],
      m[3] === "line" ? Number(m[4]) : undefined,
      m[5],
      m[6],
      m[7] ? Number(m[7]) : undefined,
    ),
};

const syntaxExpectedLegacy: Signature = {
  id: "syntax-expected-legacy",
  category: "syntax",
  pattern: /'([^']+)' expected(?: \(to close '([^']+)' at line (\d+)\))? near ('[^']*'|<eof>|\S+)/i,
  base: 52,
  analyze: (m, ctx) =>
    analyzeSyntax(ctx, m[1], m[2], m[3] ? Number(m[3]) : undefined, m[4], undefined, undefined),
};

const syntaxIncomplete: Signature = {
  id: "syntax-incomplete",
  category: "syntax",
  pattern:
    /Incomplete statement: expected assignment or a function call|unexpected symbol near|Malformed number near|Expected identifier when parsing/i,
  base: 50,
  analyze: (m, ctx) => {
    const specific = syntaxSpecifics(ctx);
    const exact = exactLine(ctx);
    const located =
      specific.located ?? (exact ? { line: exact.line, text: exact.text, exact: true } : undefined);
    const incomplete = /Incomplete statement/i.test(m[0]);
    return result({
      title: "Syntax error",
      severity: "High",
      summary: incomplete
        ? "A line doesn't do anything: it's not an assignment or a function call."
        : "Luau found a symbol it didn't expect.",
      explanation: incomplete
        ? "Luau statements must *do* something — `x = 5` or `print(x)`. A line like `x == 5`, `part.Anchored` or `true` on its own is an error."
        : "There's a typo in the code (an extra/missing symbol, a number like `1..2`, or a keyword in the wrong place).",
      location: located ? locationOf(located) : undefined,
      causes: rankCauses([
        ...specific.causes,
        cause(
          incomplete
            ? "`==` used where `=` was meant (e.g. `x == 5` as a statement)"
            : "A stray or missing symbol on that line",
          "likely",
        ),
      ]),
      steps: [
        "Look at the underlined line in Studio.",
        incomplete
          ? "Use `=` to assign, `==` only inside conditions."
          : "Check brackets, quotes and commas.",
      ],
      fixCode: specific.fix,
      docs: docs("guideLuau"),
      evidence: [
        ...locationEvidence(located, ctx),
        ...(specific.points ? [ev(specific.points, "found the syntax slip in your code")] : []),
      ],
    });
  },
};

// ---------------------------------------------------------------------------
// Modules
// ---------------------------------------------------------------------------

const moduleNoReturn: Signature = {
  id: "module-return",
  category: "module",
  pattern: /Module code did not return exactly one value/i,
  base: 64,
  analyze: (_m, ctx) => {
    const clean = sanitizeCode(ctx.code);
    const table = clean.match(/^local\s+(\w+)\s*=\s*\{/m)?.[1];
    const hasReturn = /^return\b/m.test(clean);
    return result({
      title: "ModuleScript doesn't return anything",
      severity: "High",
      summary: "A ModuleScript must end with exactly one `return` (usually the module table).",
      explanation:
        "require() hands back whatever the module returns. With no return (or two values), Roblox refuses to load it.",
      causes: [
        cause(
          ctx.hasCode && !hasReturn
            ? `The module never returns ${table ? q(table) : "its table"}`
            : "The last line `return Module` is missing, or it returns more than one value",
          "likely",
          undefined,
          ctx.hasCode && !hasReturn,
        ),
      ],
      steps: ["Add `return ModuleName` as the very last line of the ModuleScript."],
      fixCode: {
        after: `local ${table ?? "Module"} = {}\n\nfunction ${table ?? "Module"}.hello()\n\tprint("hi")\nend\n\nreturn ${table ?? "Module"}`,
      },
      docs: docs("ModuleScript"),
      evidence:
        ctx.hasCode && !hasReturn ? [ev(22, "no top-level return in the pasted module")] : [],
    });
  },
};

const moduleLoadError: Signature = {
  id: "module-error-loading",
  category: "module",
  pattern: /Requested module experienced an error while loading/i,
  base: 50,
  analyze: (_m, ctx) => {
    const real = ctx.log.otherMessages.find(
      (msg) =>
        !/Requested module experienced/i.test(msg) &&
        /attempt|expected|invalid|not a valid|error|unable/i.test(msg),
    );
    return result({
      title: "A required module crashed while loading",
      severity: "High",
      summary:
        "require() failed because the ModuleScript itself threw an error the first time it ran.",
      explanation: `This message is a side effect. The real error is printed just before it in the Output (from inside the ModuleScript).${real ? ` In your log that looks like: "${real}".` : ""} Fix that one and this goes away.`,
      causes: [
        cause(
          real ? `The module error: ${real}` : "An error inside the ModuleScript's top-level code",
          "likely",
          "Paste that earlier error (and the module's code) here to analyze it.",
          Boolean(real),
        ),
        cause("The module requires another module that errors", "possible"),
      ],
      steps: [
        "Scroll up in Output to the first red line mentioning the ModuleScript.",
        "Analyze that error on its own.",
      ],
      docs: docs("ModuleScript"),
      evidence: real ? [ev(14, "found the module's own error in the log")] : [],
    });
  },
};

const moduleRecursive: Signature = {
  id: "module-recursive",
  category: "module",
  pattern: /Requested module was required recursively|cyclic module dependency/i,
  base: 62,
  analyze: () =>
    result({
      title: "Two modules require each other",
      severity: "High",
      summary:
        "Module A requires Module B, and Module B (directly or indirectly) requires Module A.",
      explanation: "Neither module can finish loading because each waits for the other.",
      causes: [cause("Circular require() between modules", "likely")],
      steps: [
        "Move the shared code into a third module both can require.",
        "Or require the other module lazily inside a function instead of at the top.",
      ],
      docs: docs("ModuleScript"),
    }),
};

const requireInvalid: Signature = {
  id: "require-invalid",
  category: "module",
  pattern: /Attempted to call require with invalid argument/i,
  base: 60,
  analyze: (_m, ctx) => {
    const located = locateRegex(ctx, /\brequire\s*\(/);
    const arg = located?.text.match(/require\s*\(\s*([^)]*)\)/)?.[1];
    const isString = arg ? /^["']/.test(arg) : false;
    return result({
      title: "require() got something that isn't a ModuleScript",
      severity: "High",
      summary: `require() needs the ModuleScript object (or an asset ID)${arg ? `, but got ${q(arg)}` : ""}.`,
      explanation:
        "Pass the ModuleScript instance, e.g. `require(game.ReplicatedStorage.Modules.Config)`. If that path is nil (not loaded yet) or points at a Script/Folder, require fails.",
      location: locationOf(located, arg),
      causes: rankCauses([
        ...(isString
          ? [
              cause(
                "You passed a string path — pass the ModuleScript object instead",
                "likely",
                undefined,
                true,
              ),
            ]
          : []),
        cause(
          "The path points at a Folder/Script, or at nothing (nil) because it hasn't loaded yet",
          "likely",
          'On the client use :WaitForChild("ModuleName").',
        ),
      ]),
      steps: [
        "Print the value you pass to require — it should say the ModuleScript's name.",
        "Use WaitForChild on the client.",
      ],
      fixCode: {
        after:
          'local ReplicatedStorage = game:GetService("ReplicatedStorage")\nlocal Config = require(ReplicatedStorage:WaitForChild("Config"))',
      },
      docs: docs("ModuleScript", "globals"),
      evidence: [
        ...locationEvidence(located, ctx),
        ...(isString ? [ev(16, "require called with a string")] : []),
      ],
    });
  },
};

// ---------------------------------------------------------------------------
// Remotes
// ---------------------------------------------------------------------------

const remoteWrongSide: Signature = {
  id: "remote-wrong-side",
  category: "remote",
  pattern:
    /(FireServer|InvokeServer|FireClient|FireAllClients|InvokeClient|OnServerEvent|OnClientEvent) can only be (?:called|used|fired)(?: from| on)? the (client|server)/i,
  base: 66,
  analyze: (m, ctx) => {
    const member = m[1];
    const onlyOn = m[2].toLowerCase();
    const located = locateRegex(ctx, new RegExp(`[.:]\\s*${escapeRegExp(member)}\\b`));
    const serverVersion: Record<string, string> = {
      FireServer: "FireClient(player, ...)",
      InvokeServer: "InvokeClient(player, ...)",
      OnClientEvent: "OnServerEvent",
    };
    const clientVersion: Record<string, string> = {
      FireClient: "FireServer(...)",
      FireAllClients: "FireServer(...)",
      InvokeClient: "InvokeServer(...)",
      OnServerEvent: "OnClientEvent",
    };
    const other = onlyOn === "client" ? serverVersion[member] : clientVersion[member];
    return result({
      title: `${member} used on the wrong side`,
      severity: "High",
      summary: `${member} only works on the ${onlyOn}, but this code runs on the ${onlyOn === "client" ? "server" : "client"}.`,
      explanation:
        "Remotes are one-way doors: the client talks to the server with FireServer/OnServerEvent, the server talks to clients with FireClient/OnClientEvent. A server Script (in ServerScriptService/Workspace) is the server; a LocalScript (in StarterPlayerScripts/StarterGui) is the client.",
      location: locationOf(located, member),
      causes: [
        cause(
          `This is a ${onlyOn === "client" ? "server Script" : "LocalScript"}, so it must use ${other ?? "the other side's method"}`,
          "likely",
          undefined,
          Boolean(located),
        ),
        cause(
          "The script is the wrong type (Script vs LocalScript) or in the wrong place",
          "possible",
          "LocalScripts don't run in ServerScriptService or Workspace (unless inside a character).",
        ),
      ],
      steps: [
        "Decide which side should send the message.",
        other
          ? `On the ${onlyOn === "client" ? "server" : "client"} use ${q(other)}.`
          : "Use the matching method for this side.",
      ],
      fixCode: {
        after:
          '-- LocalScript (client)\nremote:FireServer("hello")\n\n-- Script (server)\nremote.OnServerEvent:Connect(function(player, message)\n\tprint(player.Name, "says", message)\n\tremote:FireClient(player, "hi back")\nend)',
      },
      docs: docs("guideRemote", "RemoteEvent"),
      evidence: [
        ...locationEvidence(located, ctx),
        ev(8, `message states ${member} is ${onlyOn}-only`),
      ],
    });
  },
};

const callbackMember: Signature = {
  id: "callback-member",
  category: "remote",
  pattern:
    /(\w+) is a callback member of (\w+); you can only set the callback value, get is not available/i,
  base: 66,
  analyze: (m, ctx) => {
    const member = m[1];
    const located = locateRegex(ctx, new RegExp(`${escapeRegExp(member)}\\s*:\\s*Connect`));
    return result({
      title: `${member} is assigned, not connected`,
      severity: "High",
      summary: `${member} isn't an event — you set it to a function with \`=\` instead of calling :Connect on it.`,
      explanation: `Callbacks like OnServerInvoke must return a value to the caller, so there can only be one. Write ${q(`remote.${member} = function(...) ... end`)}.`,
      location: locationOf(located, member),
      causes: [cause(`${q(`${member}:Connect`)} was used`, "likely", undefined, Boolean(located))],
      steps: ["Replace `:Connect(function` with ` = function` and remove the closing `)`."],
      fixCode: {
        before: located?.text,
        after: `remoteFunction.${member} = function(player, ...)\n\treturn "result"\nend`,
      },
      docs: docs("RemoteFunction", "guideRemote"),
      evidence: [
        ...locationEvidence(located, ctx),
        ...(located ? [ev(16, ":Connect on a callback found")] : []),
      ],
    });
  },
};

const remoteQueue: Signature = {
  id: "remote-queue",
  category: "remote",
  pattern:
    /Remote event invocation (?:queue exhausted|discarded event) for ([^;]+);? did you forget to implement (\w+)/i,
  base: 62,
  analyze: (m) =>
    result({
      title: "Nobody is listening to this remote",
      severity: "Medium",
      summary: `${m[1].trim()} was fired, but no script had connected ${m[2]} yet, so Roblox dropped the events.`,
      explanation:
        "Events sent before the other side connects are queued for a short while and then thrown away.",
      causes: [
        cause(`No ${m[2]} handler exists, or it's connected in a script that errored`, "likely"),
        cause("The handler connects too late (after a long WaitForChild or wait)", "possible"),
      ],
      steps: [
        `Make sure a ${m[2] === "OnClientEvent" ? "LocalScript" : "server Script"} connects ${m[2]} early.`,
        "Check that script's Output for errors.",
      ],
      docs: docs("guideRemote", "RemoteEvent"),
    }),
};

// ---------------------------------------------------------------------------
// DataStores
// ---------------------------------------------------------------------------

const datastoreStudio: Signature = {
  id: "datastore-studio",
  category: "datastore",
  pattern:
    /publish this place to the web to access DataStore|StudioAccessToApisNotAllowed|Studio access to APIs is not allowed|API Services rejected request with error\. HTTP 403/i,
  base: 70,
  analyze: () =>
    result({
      title: "DataStores are blocked in this Studio session",
      severity: "Medium",
      summary: "Studio isn't allowed to use DataStores for this place yet.",
      explanation:
        "DataStores only work in Studio when the place is published and API access is switched on. Live servers aren't affected.",
      causes: [
        cause("The place hasn't been published yet", "likely", "File → Publish to Roblox."),
        cause(
          '"Enable Studio Access to API Services" is off',
          "likely",
          "Home → Game Settings → Security → turn on Enable Studio Access to API Services.",
        ),
      ],
      steps: [
        "Publish the place (File → Publish to Roblox).",
        "Game Settings → Security → Enable Studio Access to API Services.",
        "Restart the playtest.",
      ],
      docs: docs("guideDataStores", "DataStoreService"),
    }),
};

const datastoreQueue: Signature = {
  id: "datastore-queue",
  category: "datastore",
  pattern:
    /DataStore request was added to queue|request was throttled|Request budget|exceeded.*(budget|limit).*DataStore/i,
  base: 64,
  analyze: (_m, ctx) => {
    const loops =
      /while\b[\s\S]*?(SetAsync|UpdateAsync|GetAsync)/.test(sanitizeCode(ctx.code)) ||
      /Changed[\s\S]{0,200}(SetAsync|UpdateAsync)/.test(sanitizeCode(ctx.code));
    const located = locateRegex(ctx, /:\s*(SetAsync|UpdateAsync|GetAsync|IncrementAsync)\s*\(/);
    return result({
      title: "Too many DataStore requests",
      severity: "Medium",
      summary:
        "The game is sending DataStore requests faster than Roblox allows, so they're being queued (and may be dropped).",
      explanation:
        "Each server has a request budget per minute. Saving every time a stat changes, or in a fast loop, burns through it.",
      location: locationOf(located),
      causes: rankCauses([
        ...(loops
          ? [
              cause(
                "DataStore calls happen inside a loop or a Changed handler",
                "likely",
                undefined,
                true,
              ),
            ]
          : []),
        cause("Saving on every change instead of on leave + a periodic autosave", "likely"),
        cause(
          "Writing the same key repeatedly within a few seconds (each key has a write cooldown)",
          "possible",
        ),
      ]),
      steps: [
        "Keep player data in a table in memory while they play.",
        "Save on PlayerRemoving, in BindToClose, and every few minutes as an autosave.",
        "Use UpdateAsync for important data.",
      ],
      fixCode: {
        after:
          "-- autosave every 2 minutes instead of on every change\ntask.spawn(function()\n\twhile true do\n\t\ttask.wait(120)\n\t\tfor _, player in game.Players:GetPlayers() do\n\t\t\tsavePlayer(player)\n\t\tend\n\tend\nend)",
      },
      docs: docs("guideDataStores", "DataStoreService"),
      evidence: [
        ...locationEvidence(located, ctx),
        ...(loops ? [ev(16, "DataStore call inside a loop/Changed handler")] : []),
      ],
    });
  },
};

const datastoreCannotStore: Signature = {
  id: "datastore-cannot-store",
  category: "datastore",
  pattern: /Cannot store (\w+) in data store/i,
  base: 64,
  analyze: (m, ctx) => {
    const type = m[1];
    const located = locateRegex(ctx, /:\s*(SetAsync|UpdateAsync)\s*\(/);
    return result({
      title: `Can't save a ${type} in a DataStore`,
      severity: "High",
      summary: `The data you tried to save contains a ${type}, which DataStores can't store.`,
      explanation:
        "DataStores only save numbers, strings, booleans and tables made of those (plain lists or string-keyed dictionaries). Roblox objects (Instances), Vector3s, Color3s, CFrames, functions and mixed/number-gapped tables must be converted first.",
      location: locationOf(located),
      causes: [
        cause(
          type === "Instance"
            ? "You're saving an object (e.g. a Part or the Player) instead of plain data"
            : type === "Dictionary" || type === "Array"
              ? "The table mixes number and string keys, has gaps, or contains Instances/Vector3s"
              : `A ${type} value is inside the data`,
          "likely",
        ),
      ],
      steps: [
        "Convert values to plain data: Vector3 → {x, y, z}, Color3 → hex string, Instance → its Name.",
        "Print the table before saving to spot the bad value.",
      ],
      fixCode: {
        after:
          "local function serializeVector3(v)\n\treturn { x = v.X, y = v.Y, z = v.Z }\nend\n\nlocal saveData = {\n\tCoins = coins.Value, -- number, not the IntValue object\n\tPosition = serializeVector3(root.Position),\n}",
      },
      docs: docs("guideDataStores", "GlobalDataStore"),
      evidence: locationEvidence(located, ctx),
    });
  },
};

// ---------------------------------------------------------------------------
// HttpService
// ---------------------------------------------------------------------------

const httpDisabled: Signature = {
  id: "http-disabled",
  category: "http",
  pattern: /Http requests are not enabled/i,
  base: 72,
  analyze: () =>
    result({
      title: "HTTP requests are turned off",
      severity: "Medium",
      summary: "HttpService can't send requests until you allow it in Game Settings.",
      explanation: "External HTTP is off by default for safety.",
      causes: [cause('"Allow HTTP Requests" is disabled', "likely")],
      steps: [
        "Home → Game Settings → Security → turn on Allow HTTP Requests.",
        "Publish/save and test again.",
      ],
      docs: docs("HttpService"),
    }),
};

const httpRoblox: Signature = {
  id: "http-roblox",
  category: "http",
  pattern: /HttpService is not allowed to access ROBLOX resources/i,
  base: 72,
  analyze: () =>
    result({
      title: "HttpService can't call roblox.com",
      severity: "Medium",
      summary: "Games aren't allowed to send HTTP requests to Roblox's own websites.",
      explanation:
        "Use the in-engine services instead (MarketplaceService, GroupService, Players, BadgeService…), or a proxy/Open Cloud from your own backend.",
      causes: [cause("The URL points at a roblox.com domain", "likely")],
      steps: [
        "Look for an in-engine service that gives the same data.",
        "If you really need a web API, route it through your own server.",
      ],
      docs: docs("HttpService", "MarketplaceService"),
    }),
};

const httpStatus: Signature = {
  id: "http-status",
  category: "http",
  pattern:
    /HTTP (4\d\d|5\d\d)(?: \(([^)]+)\))?|Number of requests exceeded limit|Can't parse JSON/i,
  base: 52,
  analyze: (m) => {
    const code = m[1] ? Number(m[1]) : undefined;
    const json = /parse JSON/i.test(m[0]);
    const limit = /exceeded limit/i.test(m[0]) || code === 429;
    const causes: DiagnosisCause[] = [];
    if (json)
      causes.push(
        cause(
          "JSONDecode was given text that isn't JSON (often an HTML error page or empty body)",
          "likely",
          "Print the raw response before decoding.",
        ),
      );
    if (limit)
      causes.push(
        cause(
          "Too many requests — HttpService allows about 500 per minute per server, and the remote site may limit you too",
          "likely",
        ),
      );
    if (code === 401 || code === 403)
      causes.push(
        cause(
          "The server refused the request (missing/invalid API key, or the site blocks Roblox servers)",
          "likely",
        ),
      );
    if (code === 404) causes.push(cause("The URL is wrong", "likely"));
    if (code === 400)
      causes.push(
        cause("The request body/headers are wrong (e.g. Content-Type or JSON shape)", "likely"),
      );
    if (code && code >= 500)
      causes.push(
        cause("The remote server is having problems", "likely", "Retry later with backoff."),
      );
    return result({
      title: json
        ? "Response isn't valid JSON"
        : limit
          ? "HTTP rate limit hit"
          : `HTTP ${code} error`,
      severity: "Medium",
      summary: json
        ? "HttpService:JSONDecode failed because the text isn't JSON."
        : `The web server answered with ${code ?? "an error"}${m[2] ? ` (${m[2]})` : ""}.`,
      explanation:
        "HTTP errors come from the website you called, not from your Luau. Always wrap requests in pcall and check the response.",
      causes: rankCauses(
        causes.length ? causes : [cause("The request failed on the remote server", "likely")],
      ),
      steps: [
        "Wrap the call in pcall.",
        "Print the full response (RequestAsync gives StatusCode and Body).",
      ],
      fixCode: {
        after:
          'local HttpService = game:GetService("HttpService")\nlocal ok, response = pcall(function()\n\treturn HttpService:RequestAsync({ Url = url, Method = "GET" })\nend)\nif ok and response.Success then\n\tlocal data = HttpService:JSONDecode(response.Body)\nelse\n\twarn("HTTP failed:", ok and response.StatusCode or response)\nend',
      },
      docs: docs("HttpService"),
    });
  },
};

// ---------------------------------------------------------------------------
// Tweens & animation & assets
// ---------------------------------------------------------------------------

const tweenTypeMismatch: Signature = {
  id: "tween-type",
  category: "tween",
  pattern:
    /TweenService:Create property named '(\w+)' cannot be tweened due to type mismatch \(property is a '(\w+)', but given type is '(\w+)'\)/i,
  base: 70,
  analyze: (m, ctx) => {
    const [, prop, want, got] = m;
    const located = locateRegex(ctx, new RegExp(`\\b${escapeRegExp(prop)}\\s*=`));
    const example: Record<string, string> = {
      UDim2: "UDim2.fromScale(0.5, 0.5)",
      Vector3: "Vector3.new(0, 10, 0)",
      Color3: "Color3.fromRGB(255, 0, 0)",
      number: "0.5",
      CFrame: "CFrame.new(0, 10, 0)",
    };
    return result({
      title: `Tween goal ${prop} has the wrong type`,
      severity: "Medium",
      summary: `${prop} is a ${want}, but the tween goal gives it a ${got}.`,
      explanation: `Tween goals must use the same type as the property. For ${prop} build a ${want}${example[want] ? `, e.g. ${q(example[want])}` : ""}.`,
      location: locationOf(located, prop),
      causes: [
        cause(
          want === "UDim2" && got === "Vector3"
            ? "GUI sizes/positions use UDim2, not Vector3"
            : want === "Color3"
              ? "Color properties need Color3 (not BrickColor or a string)"
              : `The goal value is a ${got} instead of a ${want}`,
          "likely",
          undefined,
          Boolean(located),
        ),
      ],
      steps: [`Change the goal to a ${want}.`],
      fixCode: example[want]
        ? { before: located?.text, after: `{ ${prop} = ${example[want]} }` }
        : undefined,
      docs: docs(
        "TweenService",
        want === "UDim2" ? "UDim2" : want === "Vector3" ? "Vector3" : "TweenInfo",
      ),
      evidence: [
        ...locationEvidence(located, ctx),
        ev(10, "tween property and types are named in the message"),
      ],
    });
  },
};

const tweenNoProperty: Signature = {
  id: "tween-no-property",
  category: "tween",
  pattern: /TweenService:Create no property named '(\w+)' for object '([^']*)'/i,
  base: 70,
  analyze: (m, ctx) => {
    const [, prop, obj] = m;
    const suggestion = closest(prop, COMMON_MEMBERS);
    const located = locateRegex(ctx, new RegExp(`\\b${escapeRegExp(prop)}\\s*=`));
    return result({
      title: `${obj} has no property "${prop}"`,
      severity: "Medium",
      summary: `The tween goal uses ${q(prop)}, which doesn't exist on ${q(obj)}${suggestion ? ` — did you mean ${q(suggestion)}?` : ""}.`,
      explanation:
        "Goal keys must be real property names of the object you tween (case-sensitive).",
      location: locationOf(located, prop),
      causes: [
        cause(
          suggestion
            ? `Typo: ${q(suggestion)}`
            : "Misspelled property, or you're tweening the wrong object (e.g. a Model instead of a Part)",
          "likely",
          "Models can't be tweened directly — tween a CFrameValue and PivotTo, or tween the PrimaryPart of a welded model.",
          Boolean(suggestion),
        ),
      ],
      steps: ["Check the object's Properties window for the exact name."],
      docs: docs("TweenService"),
      evidence: [
        ...locationEvidence(located, ctx),
        ...(suggestion ? [ev(16, `"${prop}" is close to "${suggestion}"`)] : []),
      ],
    });
  },
};

const loadAnimationNotInGame: Signature = {
  id: "loadanimation-not-in-game",
  category: "animation",
  pattern:
    /LoadAnimation requires the (?:Humanoid|Animator|AnimationController) object \(([^)]*)\) to be a descendant of the game object|Cannot load the AnimationClipProvider Service/i,
  base: 64,
  analyze: (_m, ctx) => {
    const located = locateRegex(ctx, /LoadAnimation\s*\(/);
    return result({
      title: "Loading an animation on a character that isn't in the game",
      severity: "Medium",
      summary:
        "LoadAnimation ran on a Humanoid/Animator that isn't in Workspace (the character was removed or hasn't been parented yet).",
      explanation:
        "Animations can only load on characters that are in the game. Right after CharacterAdded, or after the player dies, the character may not be parented to Workspace.",
      location: locationOf(located),
      causes: [
        cause("The script uses an old character after the player died/respawned", "likely"),
        cause(
          "It runs in CharacterAdded before the character is parented to Workspace",
          "possible",
          'Wait until `character.Parent` is set, or use `character:WaitForChild("Humanoid"):WaitForChild("Animator")`.',
        ),
      ],
      steps: [
        "Get the Animator fresh every time the character spawns.",
        "Load animations on the Animator (Humanoid:LoadAnimation is deprecated).",
      ],
      fixCode: {
        after:
          'player.CharacterAdded:Connect(function(character)\n\tlocal humanoid = character:WaitForChild("Humanoid")\n\tlocal animator = humanoid:WaitForChild("Animator")\n\tif not character.Parent then character.AncestryChanged:Wait() end\n\tlocal track = animator:LoadAnimation(animation)\n\ttrack:Play()\nend)',
      },
      docs: docs("Animator", "Humanoid"),
      evidence: locationEvidence(located, ctx),
    });
  },
};

const animationTrackLimit: Signature = {
  id: "animation-track-limit",
  category: "animation",
  pattern: /AnimationTrack limit of \d+ tracks for one Animator exceeded/i,
  base: 68,
  analyze: (_m, ctx) => {
    const located = locateRegex(ctx, /LoadAnimation\s*\(/);
    return result({
      title: "Too many animation tracks loaded",
      severity: "Medium",
      summary:
        "The same animation is loaded over and over (for example on every click) instead of once.",
      explanation:
        "Each LoadAnimation call creates a new track that stays on the Animator. Load each animation once, keep the track in a variable, and call :Play() on it.",
      location: locationOf(located),
      causes: [
        cause(
          "LoadAnimation is inside an event handler or loop",
          "likely",
          undefined,
          Boolean(located),
        ),
      ],
      steps: ["Move LoadAnimation outside the handler and reuse the track."],
      fixCode: {
        after:
          "local track = animator:LoadAnimation(animation) -- once\n\ntool.Activated:Connect(function()\n\ttrack:Play() -- reuse\nend)",
      },
      docs: docs("Animator"),
      evidence: locationEvidence(located, ctx),
    });
  },
};

const assetFailed: Signature = {
  id: "asset-failed",
  category: "asset",
  pattern:
    /Failed to load (animation|sound|mesh|image|texture|asset)[^\n]*?(rbxassetid:\/\/\d+|\d{5,})?/i,
  base: 58,
  analyze: (m) => {
    const kind = m[1].toLowerCase();
    return result({
      title: `${kind[0].toUpperCase()}${kind.slice(1)} failed to load`,
      severity: "Low",
      summary: `Roblox couldn't load the ${kind}${m[2] ? ` ${m[2]}` : ""}.`,
      explanation:
        kind === "animation"
          ? "Animations only play in experiences owned by the same user or group that owns the animation. It also fails if the ID is wrong or the animation is still being moderated."
          : "The asset ID may be wrong, private, deleted or still in moderation, or the experience doesn't have permission to use it.",
      causes:
        kind === "animation"
          ? [
              cause(
                "The animation is owned by a different account/group than the experience",
                "likely",
                "Re-upload it under the owner of the game (e.g. the group).",
              ),
              cause("Wrong ID (copied the catalog/website ID instead of the asset ID)", "possible"),
            ]
          : [
              cause("Wrong, private or moderated asset ID", "likely"),
              cause("The experience doesn't have permission to use the asset", "possible"),
            ],
      steps: [
        "Check the ID in the Creator Dashboard / Toolbox.",
        "Make sure the owner of the asset matches the owner of the experience (or the asset is public).",
      ],
      docs: docs(kind === "animation" ? "Animator" : kind === "sound" ? "Sound" : "Instance"),
    });
  },
};

// ---------------------------------------------------------------------------
// Coroutines / misc
// ---------------------------------------------------------------------------

const deadCoroutine: Signature = {
  id: "dead-coroutine",
  category: "coroutine",
  pattern: /cannot resume (dead|non-suspended) coroutine/i,
  base: 62,
  analyze: (m) =>
    result({
      title: `Resumed a ${m[1]} coroutine`,
      severity: "Medium",
      summary:
        m[1] === "dead"
          ? "A coroutine that already finished was resumed (or a coroutine.wrap function was called again)."
          : "A coroutine was resumed while it was already running.",
      explanation:
        "A coroutine can only run once to completion. To start code in parallel each time, use task.spawn(fn) instead of keeping an old coroutine around.",
      causes: [
        cause("A coroutine.wrap/create result is stored and called more than once", "likely"),
      ],
      steps: ["Replace coroutine.wrap(fn)() with task.spawn(fn)."],
      fixCode: {
        after: "task.spawn(function()\n\t-- runs in parallel, every time this line runs\nend)",
      },
      docs: docs("task", "coroutine"),
    }),
};

const yieldAcross: Signature = {
  id: "yield-across",
  category: "coroutine",
  pattern:
    /attempt to yield across (?:metamethod\/)?C-call boundary|attempt to yield across metamethod/i,
  base: 60,
  analyze: (_m, ctx) => {
    const located = locateRegex(
      ctx,
      /table\.sort|__index|__newindex|string\.gsub|:\s*Wait\s*\(|task\.wait|WaitForChild|Async\s*\(/,
    );
    return result({
      title: "Yielded where waiting isn't allowed",
      severity: "Medium",
      summary:
        "Code tried to wait (task.wait, WaitForChild, :Wait(), *Async calls) inside a place that can't pause.",
      explanation:
        "Metamethods (__index…), table.sort comparators and string.gsub callbacks must finish instantly. Waiting inside them isn't allowed.",
      location: locationOf(located),
      causes: [
        cause("A yielding call inside a metamethod, sort comparator or gsub callback", "likely"),
      ],
      steps: [
        "Fetch what you need before the sort/metamethod runs, then use the cached value inside it.",
      ],
      docs: docs("task", "table"),
      evidence: locationEvidence(located, ctx),
    });
  },
};

const readonlyTable: Signature = {
  id: "readonly-table",
  category: "table",
  pattern: /attempt to modify a readonly table/i,
  base: 62,
  analyze: (_m, ctx) => {
    const frozen = /table\.freeze/.test(ctx.code);
    return result({
      title: "Changed a frozen table",
      severity: "Medium",
      summary: "The table is read-only (frozen), so it can't be changed.",
      explanation:
        "table.freeze makes a table read-only — often used for config modules. Make a copy with table.clone(t) and change the copy.",
      causes: [
        cause(
          frozen
            ? "Your code calls table.freeze on it"
            : "The table (often a shared config module) was frozen with table.freeze",
          "likely",
          undefined,
          frozen,
        ),
      ],
      steps: ["Use `local copy = table.clone(frozenTable)` and change the copy."],
      docs: docs("table"),
      evidence: frozen ? [ev(14, "table.freeze found in the code")] : [],
    });
  },
};

const teleportFailed: Signature = {
  id: "teleport-failed",
  category: "unknown",
  pattern:
    /teleport(?:Async)? failed|raiseTeleportInitFailedEvent|Teleport(?:Service)?.*(?:not|isn't) (?:allowed|supported|available) in Studio/i,
  base: 52,
  analyze: () =>
    result({
      title: "Teleport failed",
      severity: "Low",
      summary: "TeleportService couldn't send the player to the other place.",
      explanation:
        "Teleports don't work in Studio playtests. In live games the target place must be part of the same experience (or public), and teleports can fail temporarily — retry with pcall.",
      causes: [
        cause("Testing in Studio", "likely", "Test teleports in a live server."),
        cause("The place ID isn't in this experience or isn't published", "possible"),
      ],
      steps: ["Test in a live game.", "Wrap TeleportAsync in pcall and retry on failure."],
      docs: docs("Players"),
    }),
};

export const ROBLOX_SIGNATURES: Signature[] = [
  invalidService,
  cannotCreate,
  colonCall,
  invalidMember,
  infiniteYield,
  parentLocked,
  unexpectedParent,
  unableToAssign,
  tweenTypeMismatch,
  tweenNoProperty,
  unableToCast,
  scriptTimeout,
  reentrancy,
  stackOverflow,
  moduleNoReturn,
  moduleLoadError,
  moduleRecursive,
  requireInvalid,
  remoteWrongSide,
  callbackMember,
  remoteQueue,
  datastoreStudio,
  datastoreQueue,
  datastoreCannotStore,
  httpDisabled,
  httpRoblox,
  httpStatus,
  loadAnimationNotInGame,
  animationTrackLimit,
  assetFailed,
  deadCoroutine,
  yieldAcross,
  readonlyTable,
  teleportFailed,
  syntaxExpected,
  syntaxExpectedLegacy,
  syntaxIncomplete,
];

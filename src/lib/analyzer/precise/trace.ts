/**
 * Traces where a value that turned out to be nil (or the wrong type) came
 * from, using the snippet the user pasted. Each finding is concrete: it quotes
 * the line that produced the value and explains Roblox's rule for it.
 */
import {
  abbreviationOf,
  closest,
  declaredNames,
  findAssignment,
  KNOWN_GLOBALS,
  lastSegment,
  rootIdentifier,
  type Side,
} from "./codeTools";
import type { DiagnosisCause, FixCode } from "./types";

export interface NilSource {
  cause: DiagnosisCause;
  fix?: FixCode;
  step?: string;
  points: number;
  reason: string;
}

function q(s: string): string {
  return `\`${s}\``;
}

/** Explains why an expression's *value source* (the right-hand side / last segment) can be nil. */
export function explainNilProducer(
  expr: string,
  displayName: string,
  side: Side,
  where?: string,
  key?: string,
): NilSource | undefined {
  const at = where ? ` (${where})` : "";

  const ffc = expr.match(
    /:\s*(FindFirstChild(?:OfClass|WhichIsA)?|FindFirstAncestor\w*)\s*\(\s*["']([^"']+)["']/,
  );
  if (ffc) {
    const method = ffc[1];
    const name = ffc[2];
    const v = safeVar(displayName);
    const canWait =
      method === "FindFirstChild" && /FindFirstChild\s*\(\s*["'][^"']+["']\s*\)\s*$/.test(expr);
    const fix: FixCode = canWait
      ? {
          after: `local ${v} = ${expr.replace(/:\s*FindFirstChild\s*\(\s*(["'][^"']+["'])\s*\)\s*$/, ":WaitForChild($1, 5)")}\nif not ${v} then\n\twarn("${name} not found")\n\treturn\nend`,
          caption: `Wait (max 5 s) for "${name}" and stop cleanly if it never appears.`,
        }
      : {
          after: `local ${v} = ${expr}\nif not ${v} then\n\twarn("${name} not found")\n\treturn\nend`,
          caption: "Check the result before using it.",
        };
    return {
      cause: {
        text: `${method}("${name}") found nothing, so ${q(displayName)} is nil`,
        detail: `${method} returns nil when there is no match at that moment${at}. Usually the name is spelled differently in Explorer (names are case-sensitive), the object is created later, or it hasn't replicated to this client yet.`,
        likelihood: "likely",
        confirmedInCode: true,
      },
      fix,
      step: `Open Explorer while playing and check that "${name}" exists with exactly that spelling and capitalization.`,
      points: 16,
      reason: `${method} result traced in the code`,
    };
  }

  const wfcTimeout = expr.match(/:\s*WaitForChild\s*\(\s*["']([^"']+)["']\s*,\s*[\d.]+\s*\)/);
  if (wfcTimeout) {
    return {
      cause: {
        text: `WaitForChild("${wfcTimeout[1]}") timed out and returned nil`,
        detail: `With a timeout argument, WaitForChild gives up and returns nil instead of waiting forever${at}.`,
        likelihood: "likely",
        confirmedInCode: true,
      },
      step: `Make sure "${wfcTimeout[1]}" is really created under that parent, or handle the nil case after the timeout.`,
      points: 14,
      reason: "WaitForChild with timeout traced in the code",
    };
  }

  if (/\bLocalPlayer\b/.test(expr) && side === "server") {
    return {
      cause: {
        text: "Players.LocalPlayer is nil because this is a server Script",
        detail:
          "LocalPlayer only exists in LocalScripts (the client). On the server there are many players, so Roblox can't know which one you mean.",
        likelihood: "likely",
        confirmedInCode: true,
      },
      fix: {
        after:
          'local Players = game:GetService("Players")\n\nPlayers.PlayerAdded:Connect(function(player)\n\t-- use `player` here\nend)',
        caption: "On the server, get the player from an event instead.",
      },
      points: 22,
      reason: "LocalPlayer used in server-side code",
    };
  }

  if (/\.\s*Character\s*$/.test(expr) || /^\s*[\w.]*\.Character\s*$/.test(expr)) {
    return {
      cause: {
        text: "player.Character is nil — the character hasn't spawned yet",
        detail: `A player's Character is nil for a moment when they join and each time they respawn${at}. Scripts that run immediately often get there first.`,
        likelihood: "likely",
        confirmedInCode: true,
      },
      fix: (() => {
        const owner = expr.replace(/\.\s*Character\s*$/, "").trim() || "player";
        const v = /^[A-Za-z_]\w*$/.test(displayName) ? displayName : "character";
        return {
          after: `local ${v} = ${owner}.Character or ${owner}.CharacterAdded:Wait()`,
          caption: "Use the character if it exists, otherwise wait for it to spawn.",
        };
      })(),
      points: 16,
      reason: "value comes from player.Character",
    };
  }

  if (/:\s*GetAsync\s*\(/.test(expr) && !/Http/i.test(expr)) {
    return {
      cause: {
        text: "GetAsync returned nil — this key has never been saved (new player)",
        detail:
          "DataStores return nil for keys that don't exist yet. Every first-time player hits this.",
        likelihood: "likely",
        confirmedInCode: true,
      },
      fix: (() => {
        const v = /^[A-Za-z_]\w*$/.test(displayName) ? displayName : "data";
        const defaults = key && /^[A-Za-z_]\w*$/.test(key) ? `{ ${key} = 0 }` : "{}";
        return {
          after: `local ok, ${v} = pcall(function()\n\treturn ${expr.trim()}\nend)\nif not ok then\n\twarn("Load failed:", ${v})\n\t${v} = nil\nend\n${v} = ${v} or ${defaults} -- default data for new players`,
          caption:
            "Wrap the request in pcall and fall back to default data when nothing was saved yet.",
        };
      })(),
      points: 18,
      reason: "value comes from DataStore GetAsync",
    };
  }

  if (/GetPlayerFromCharacter\s*\(/.test(expr)) {
    return {
      cause: {
        text: "GetPlayerFromCharacter returned nil — whatever touched it isn't a player",
        detail:
          "Touched fires for every part (other parts, NPCs, dropped hats). For those, GetPlayerFromCharacter returns nil.",
        likelihood: "likely",
        confirmedInCode: true,
      },
      fix: {
        after:
          "local player = game.Players:GetPlayerFromCharacter(hit.Parent)\nif not player then return end -- not a player, ignore it",
      },
      points: 18,
      reason: "value comes from GetPlayerFromCharacter",
    };
  }

  if (/:\s*Raycast\s*\(/.test(expr)) {
    return {
      cause: {
        text: "workspace:Raycast returned nil — the ray didn't hit anything",
        detail:
          "Raycast returns nil when nothing is within range, so reading .Instance or .Position off it fails.",
        likelihood: "likely",
        confirmedInCode: true,
      },
      fix: {
        after:
          "local result = workspace:Raycast(origin, direction, params)\nif result then\n\tprint(result.Instance, result.Position)\nend",
      },
      points: 18,
      reason: "value comes from workspace:Raycast",
    };
  }

  if (/\.\s*Target\s*$/.test(expr)) {
    return {
      cause: {
        text: "mouse.Target is nil — the mouse is pointing at the sky",
        detail: "Mouse.Target is nil whenever there is no part under the cursor.",
        likelihood: "likely",
        confirmedInCode: true,
      },
      fix: { after: "local target = mouse.Target\nif not target then return end" },
      points: 14,
      reason: "value comes from Mouse.Target",
    };
  }

  if (/:\s*GetAttribute\s*\(/.test(expr)) {
    return {
      cause: {
        text: "GetAttribute returned nil — the attribute isn't set on that object",
        detail:
          "Attributes that were never created return nil. Check the name in the Properties window → Attributes.",
        likelihood: "likely",
        confirmedInCode: true,
      },
      fix: { after: `local value = ${expr} or 0` },
      points: 14,
      reason: "value comes from GetAttribute",
    };
  }

  if (/\.\s*PrimaryPart\s*$/.test(expr)) {
    return {
      cause: {
        text: "The model's PrimaryPart isn't set",
        detail:
          "PrimaryPart is nil unless you set it in the Properties window (or it was a part that got destroyed).",
        likelihood: "likely",
        confirmedInCode: true,
      },
      step: "Select the Model → Properties → PrimaryPart and pick a part, or use model:GetPivot() instead.",
      points: 14,
      reason: "value comes from Model.PrimaryPart",
    };
  }

  if (/\.\s*Parent\s*$/.test(expr)) {
    return {
      cause: {
        text: "The object's Parent is nil — it was destroyed or removed",
        detail:
          "After :Destroy() (or when a character despawns) Parent becomes nil, so anything that walks up the tree breaks.",
        likelihood: "possible",
        confirmedInCode: true,
      },
      points: 10,
      reason: "value comes from .Parent",
    };
  }

  if (/^\s*require\s*\(/.test(expr)) {
    return {
      cause: {
        text: "The ModuleScript didn't return what this code expects",
        detail:
          "Whatever the module returns on its last line is what require() gives you. A missing field or a different table shape shows up as nil here.",
        likelihood: "possible",
        confirmedInCode: true,
      },
      points: 8,
      reason: "value comes from require()",
    };
  }

  if (/JSONDecode\s*\(/.test(expr)) {
    return {
      cause: {
        text: "The decoded JSON doesn't contain that field",
        detail:
          "JSONDecode gives you exactly what the server sent — print the table to see its real shape.",
        likelihood: "possible",
        confirmedInCode: true,
      },
      points: 8,
      reason: "value comes from JSONDecode",
    };
  }

  if (/^\s*nil\s*$/.test(expr)) {
    return {
      cause: {
        text: `${q(displayName)} never gets a value before this line`,
        detail: `It's declared${where ? ` (${where})` : ""} with no value (or set to nil), and nothing assigns it before it's used.`,
        likelihood: "likely",
        confirmedInCode: true,
      },
      points: 16,
      reason: "variable is assigned nil",
    };
  }

  if (/\[[^\]]+\]\s*$/.test(expr)) {
    return {
      cause: {
        text: "That table has no entry for this key",
        detail:
          'Reading a key that isn\'t in a table gives nil. Print the table and the key to compare them ("5" and 5 are different keys).',
        likelihood: "possible",
        confirmedInCode: true,
      },
      points: 8,
      reason: "value comes from a table lookup",
    };
  }

  return undefined;
}

function safeVar(name: string): string {
  if (/^[A-Za-z_]\w*$/.test(name)) return name;
  const last = name.split(/[.:]/).pop() ?? name;
  const cleaned = last.replace(/\W/g, "");
  return /^[A-Za-z_]/.test(cleaned) ? cleaned.charAt(0).toLowerCase() + cleaned.slice(1) : "value";
}

/**
 * Given the expression that was nil (e.g. `player.Character` or `coins`),
 * work out why using the code. Returns the most specific finding available.
 */
export function traceNilExpression(
  expr: string,
  code: string,
  beforeLine: number | undefined,
  side: Side,
  key?: string,
): NilSource | undefined {
  if (!expr) return undefined;
  const root = rootIdentifier(expr);
  const isPlainName = root === expr;

  if (!isPlainName) {
    const direct = explainNilProducer(expr, expr, side);
    if (direct) return direct;
    const seg = lastSegment(expr);
    if (seg === "LocalPlayer" && side === "unknown") {
      return {
        cause: {
          text: "Players.LocalPlayer is nil — is this a server Script?",
          detail:
            "LocalPlayer only exists in LocalScripts. If this code is in a Script (server), LocalPlayer is always nil.",
          likelihood: "likely",
          confirmedInCode: true,
        },
        points: 12,
        reason: "LocalPlayer used and script side unknown",
      };
    }
    // `data.stats.coins` — follow the root variable in case it's the real culprit.
    if (root) {
      const assignment = findAssignment(code, root, beforeLine);
      if (assignment?.kind === "assignment" && /^\s*\{/.test(assignment.rhs) && seg) {
        return {
          cause: {
            text: `${q(root)} is a table without a ${q(seg)} entry`,
            detail: `${q(root)} is created on line ${assignment.line} but nothing puts a ${q(seg)} key in it before it's used.`,
            likelihood: "likely",
            confirmedInCode: true,
          },
          points: 12,
          reason: "table created without the accessed key",
        };
      }
      if (assignment?.kind === "assignment") {
        const produced = explainNilProducer(assignment.rhs, root, side, `line ${assignment.line}`);
        if (produced && seg && produced.cause.likelihood === "likely") {
          return {
            ...produced,
            cause: {
              ...produced.cause,
              text: `${produced.cause.text}, or it has no ${q(seg)}`,
              likelihood: "possible",
            },
            points: Math.round(produced.points / 2),
          };
        }
      }
    }
    return undefined;
  }

  const assignment = findAssignment(code, expr, beforeLine);
  if (!assignment) {
    const declared = declaredNames(code);
    if (!declared.has(expr) && !KNOWN_GLOBALS.has(expr)) {
      const suggestion =
        closest(expr, declared) ?? abbreviationOf(expr, declared) ?? closest(expr, KNOWN_GLOBALS);
      if (suggestion) {
        return {
          cause: {
            text: `${q(expr)} is never defined — did you mean ${q(suggestion)}?`,
            detail:
              "Undefined names are nil in Luau. Variable names are case-sensitive, so one wrong letter creates a brand new (nil) variable.",
            likelihood: "likely",
            confirmedInCode: true,
          },
          fix: { after: `-- use the variable you actually created:\n${suggestion}` },
          points: 22,
          reason: `undefined name close to \`${suggestion}\``,
        };
      }
      if (declared.size > 0) {
        return {
          cause: {
            text: `${q(expr)} is never assigned in this snippet`,
            detail:
              "If it's defined in another script, remember locals don't cross scripts — share values with a ModuleScript or attributes.",
            likelihood: "possible",
            confirmedInCode: true,
          },
          points: 6,
          reason: "name not defined in snippet",
        };
      }
    }
    return undefined;
  }

  if (assignment.kind === "parameter") {
    return {
      cause: {
        text: `${q(expr)} is a function parameter and the caller passed nil`,
        detail: `Check every place that calls ${assignment.fnName ? q(assignment.fnName) : "this function"} — one of them passes nothing (or nil) for ${q(expr)}.`,
        likelihood: "possible",
        confirmedInCode: true,
      },
      points: 8,
      reason: "value is a function parameter",
    };
  }

  if (assignment.kind === "assignment") {
    const produced = explainNilProducer(assignment.rhs, expr, side, `line ${assignment.line}`, key);
    if (produced) {
      // The fix rewrites the line that created the value, so the whole script can be patched.
      if (produced.fix && !produced.fix.before) {
        const original = code.replace(/\r\n?/g, "\n").split("\n")[assignment.line - 1]?.trim();
        if (original && /^local\s/.test(original))
          produced.fix = { ...produced.fix, before: original };
      }
      return produced;
    }
    const call = assignment.rhs.match(/^([A-Za-z_][\w.:]*)\s*\(/);
    if (call) {
      return {
        cause: {
          text: `${q(call[1])}(...) returned nil`,
          detail: `${q(expr)} gets its value from ${q(call[1])} on line ${assignment.line}. Make sure every path through that function ends with a \`return\`.`,
          likelihood: "possible",
          confirmedInCode: true,
        },
        points: 8,
        reason: "value returned by a function call",
      };
    }
  }
  return undefined;
}

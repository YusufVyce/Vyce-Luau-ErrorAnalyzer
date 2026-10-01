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
import { tx } from "./lang";
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

/** "line 4" / "4. satır", for saying where a value was assigned. */
function lineRef(line: number): string {
  return tx(`line ${line}`, `${line}. satır`);
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
    const notFound = tx(`${name} not found`, `${name} bulunamadı`);
    const fix: FixCode = canWait
      ? {
          after: `local ${v} = ${expr.replace(/:\s*FindFirstChild\s*\(\s*(["'][^"']+["'])\s*\)\s*$/, ":WaitForChild($1, 5)")}\nif not ${v} then\n\twarn("${notFound}")\n\treturn\nend`,
          caption: tx(
            `Wait (max 5 s) for "${name}" and stop cleanly if it never appears.`,
            `"${name}" için en fazla 5 saniye bekle, hiç gelmezse düzgünce dur.`,
          ),
        }
      : {
          after: `local ${v} = ${expr}\nif not ${v} then\n\twarn("${notFound}")\n\treturn\nend`,
          caption: tx("Check the result before using it.", "Sonucu kullanmadan önce kontrol et."),
        };
    return {
      cause: {
        text: tx(
          `${method}("${name}") found nothing, so ${q(displayName)} is nil`,
          `${method}("${name}") hiçbir şey bulamadı, bu yüzden ${q(displayName)} nil`,
        ),
        detail: tx(
          `${method} returns nil when there is no match at that moment${at}. Usually the name is spelled differently in Explorer (names are case-sensitive), the object is created later, or it hasn't replicated to this client yet.`,
          `${method}, o anda eşleşen bir şey yoksa nil döndürür${at}. Genelde isim Explorer'da farklı yazılmıştır (isimler büyük/küçük harfe duyarlıdır), obje daha sonra oluşturuluyordur ya da bu istemciye henüz yüklenmemiştir.`,
        ),
        likelihood: "likely",
        confirmedInCode: true,
      },
      fix,
      step: tx(
        `Open Explorer while playing and check that "${name}" exists with exactly that spelling and capitalization.`,
        `Oyun çalışırken Explorer'ı aç ve "${name}" objesinin tam olarak bu yazım ve büyük/küçük harflerle var olduğunu kontrol et.`,
      ),
      points: 16,
      reason: tx(`${method} result traced in the code`, `${method} sonucu kodda takip edildi`),
    };
  }

  const wfcTimeout = expr.match(/:\s*WaitForChild\s*\(\s*["']([^"']+)["']\s*,\s*[\d.]+\s*\)/);
  if (wfcTimeout) {
    return {
      cause: {
        text: tx(
          `WaitForChild("${wfcTimeout[1]}") timed out and returned nil`,
          `WaitForChild("${wfcTimeout[1]}") zaman sınırını aştı ve nil döndürdü`,
        ),
        detail: tx(
          `With a timeout argument, WaitForChild gives up and returns nil instead of waiting forever${at}.`,
          `Zaman sınırı verildiğinde WaitForChild sonsuza dek beklemek yerine vazgeçer ve nil döndürür${at}.`,
        ),
        likelihood: "likely",
        confirmedInCode: true,
      },
      step: tx(
        `Make sure "${wfcTimeout[1]}" is really created under that parent, or handle the nil case after the timeout.`,
        `"${wfcTimeout[1]}" objesinin gerçekten o parent'ın altında oluşturulduğundan emin ol ya da zaman sınırından sonraki nil durumunu ele al.`,
      ),
      points: 14,
      reason: tx(
        "WaitForChild with timeout traced in the code",
        "zaman sınırlı WaitForChild kodda takip edildi",
      ),
    };
  }

  if (/\bLocalPlayer\b/.test(expr) && side === "server") {
    return {
      cause: {
        text: tx(
          "Players.LocalPlayer is nil because this is a server Script",
          "Bu bir sunucu Script'i olduğu için Players.LocalPlayer nil",
        ),
        detail: tx(
          "LocalPlayer only exists in LocalScripts (the client). On the server there are many players, so Roblox can't know which one you mean.",
          "LocalPlayer sadece LocalScript'lerde (istemcide) vardır. Sunucuda birçok oyuncu olduğu için Roblox hangisini kastettiğini bilemez.",
        ),
        likelihood: "likely",
        confirmedInCode: true,
      },
      fix: {
        after: `local Players = game:GetService("Players")\n\nPlayers.PlayerAdded:Connect(function(player)\n\t${tx("-- use `player` here", "-- `player` değişkenini burada kullan")}\nend)`,
        caption: tx(
          "On the server, get the player from an event instead.",
          "Sunucuda oyuncuyu bunun yerine bir event'ten al.",
        ),
      },
      points: 22,
      reason: tx("LocalPlayer used in server-side code", "LocalPlayer sunucu kodunda kullanılmış"),
    };
  }

  if (/\.\s*Character\s*$/.test(expr) || /^\s*[\w.]*\.Character\s*$/.test(expr)) {
    return {
      cause: {
        text: tx(
          "player.Character is nil — the character hasn't spawned yet",
          "player.Character nil — karakter henüz doğmadı",
        ),
        detail: tx(
          `A player's Character is nil for a moment when they join and each time they respawn${at}. Scripts that run immediately often get there first.`,
          `Oyuncunun Character'ı oyuna girdiğinde ve her yeniden doğuşunda kısa bir süre nil olur${at}. Hemen çalışan scriptler çoğu zaman karakterden önce oraya varır.`,
        ),
        likelihood: "likely",
        confirmedInCode: true,
      },
      fix: (() => {
        const owner = expr.replace(/\.\s*Character\s*$/, "").trim() || "player";
        const v = /^[A-Za-z_]\w*$/.test(displayName) ? displayName : "character";
        return {
          after: `local ${v} = ${owner}.Character or ${owner}.CharacterAdded:Wait()`,
          caption: tx(
            "Use the character if it exists, otherwise wait for it to spawn.",
            "Karakter varsa onu kullan, yoksa doğmasını bekle.",
          ),
        };
      })(),
      points: 16,
      reason: tx("value comes from player.Character", "değer player.Character'dan geliyor"),
    };
  }

  if (/:\s*GetAsync\s*\(/.test(expr) && !/Http/i.test(expr)) {
    return {
      cause: {
        text: tx(
          "GetAsync returned nil — this key has never been saved (new player)",
          "GetAsync nil döndürdü — bu anahtar hiç kaydedilmemiş (yeni oyuncu)",
        ),
        detail: tx(
          "DataStores return nil for keys that don't exist yet. Every first-time player hits this.",
          "DataStore'lar henüz olmayan anahtarlar için nil döndürür. İlk kez gelen her oyuncu buna takılır.",
        ),
        likelihood: "likely",
        confirmedInCode: true,
      },
      fix: (() => {
        const v = /^[A-Za-z_]\w*$/.test(displayName) ? displayName : "data";
        const defaults = key && /^[A-Za-z_]\w*$/.test(key) ? `{ ${key} = 0 }` : "{}";
        return {
          after: `local ok, ${v} = pcall(function()\n\treturn ${expr.trim()}\nend)\nif not ok then\n\twarn("${tx("Load failed:", "Yükleme başarısız:")}", ${v})\n\t${v} = nil\nend\n${v} = ${v} or ${defaults} ${tx("-- default data for new players", "-- yeni oyuncular için varsayılan veri")}`,
          caption: tx(
            "Wrap the request in pcall and fall back to default data when nothing was saved yet.",
            "İsteği pcall içine al ve henüz hiçbir şey kaydedilmemişse varsayılan veriyi kullan.",
          ),
        };
      })(),
      points: 18,
      reason: tx("value comes from DataStore GetAsync", "değer DataStore GetAsync'ten geliyor"),
    };
  }

  if (/GetPlayerFromCharacter\s*\(/.test(expr)) {
    return {
      cause: {
        text: tx(
          "GetPlayerFromCharacter returned nil — whatever touched it isn't a player",
          "GetPlayerFromCharacter nil döndürdü — dokunan şey bir oyuncu değil",
        ),
        detail: tx(
          "Touched fires for every part (other parts, NPCs, dropped hats). For those, GetPlayerFromCharacter returns nil.",
          "Touched her parça için çalışır (başka parçalar, NPC'ler, düşen şapkalar). Bunlar için GetPlayerFromCharacter nil döndürür.",
        ),
        likelihood: "likely",
        confirmedInCode: true,
      },
      fix: {
        after: `local player = game.Players:GetPlayerFromCharacter(hit.Parent)\nif not player then return end ${tx("-- not a player, ignore it", "-- oyuncu değil, görmezden gel")}`,
      },
      points: 18,
      reason: tx(
        "value comes from GetPlayerFromCharacter",
        "değer GetPlayerFromCharacter'dan geliyor",
      ),
    };
  }

  if (/:\s*Raycast\s*\(/.test(expr)) {
    return {
      cause: {
        text: tx(
          "workspace:Raycast returned nil — the ray didn't hit anything",
          "workspace:Raycast nil döndürdü — ışın hiçbir şeye çarpmadı",
        ),
        detail: tx(
          "Raycast returns nil when nothing is within range, so reading .Instance or .Position off it fails.",
          "Menzilde hiçbir şey yoksa Raycast nil döndürür, bu yüzden ondan .Instance ya da .Position okumak hata verir.",
        ),
        likelihood: "likely",
        confirmedInCode: true,
      },
      fix: {
        after:
          "local result = workspace:Raycast(origin, direction, params)\nif result then\n\tprint(result.Instance, result.Position)\nend",
      },
      points: 18,
      reason: tx("value comes from workspace:Raycast", "değer workspace:Raycast'ten geliyor"),
    };
  }

  if (/\.\s*Target\s*$/.test(expr)) {
    return {
      cause: {
        text: tx(
          "mouse.Target is nil — the mouse is pointing at the sky",
          "mouse.Target nil — fare gökyüzünü gösteriyor",
        ),
        detail: tx(
          "Mouse.Target is nil whenever there is no part under the cursor.",
          "İmlecin altında bir parça olmadığı her an Mouse.Target nil'dir.",
        ),
        likelihood: "likely",
        confirmedInCode: true,
      },
      fix: { after: "local target = mouse.Target\nif not target then return end" },
      points: 14,
      reason: tx("value comes from Mouse.Target", "değer Mouse.Target'tan geliyor"),
    };
  }

  if (/:\s*GetAttribute\s*\(/.test(expr)) {
    return {
      cause: {
        text: tx(
          "GetAttribute returned nil — the attribute isn't set on that object",
          "GetAttribute nil döndürdü — o objede bu attribute yok",
        ),
        detail: tx(
          "Attributes that were never created return nil. Check the name in the Properties window → Attributes.",
          "Hiç oluşturulmamış attribute'lar nil döndürür. Adını Properties penceresi → Attributes kısmından kontrol et.",
        ),
        likelihood: "likely",
        confirmedInCode: true,
      },
      fix: { after: `local value = ${expr} or 0` },
      points: 14,
      reason: tx("value comes from GetAttribute", "değer GetAttribute'tan geliyor"),
    };
  }

  if (/\.\s*PrimaryPart\s*$/.test(expr)) {
    return {
      cause: {
        text: tx("The model's PrimaryPart isn't set", "Modelin PrimaryPart'ı ayarlanmamış"),
        detail: tx(
          "PrimaryPart is nil unless you set it in the Properties window (or it was a part that got destroyed).",
          "PrimaryPart'ı Properties penceresinden ayarlamadıysan (ya da silinmiş bir parçaysa) nil'dir.",
        ),
        likelihood: "likely",
        confirmedInCode: true,
      },
      step: tx(
        "Select the Model → Properties → PrimaryPart and pick a part, or use model:GetPivot() instead.",
        "Model'i seç → Properties → PrimaryPart'tan bir parça seç ya da bunun yerine model:GetPivot() kullan.",
      ),
      points: 14,
      reason: tx("value comes from Model.PrimaryPart", "değer Model.PrimaryPart'tan geliyor"),
    };
  }

  if (/\.\s*Parent\s*$/.test(expr)) {
    return {
      cause: {
        text: tx(
          "The object's Parent is nil — it was destroyed or removed",
          "Objenin Parent'ı nil — obje silinmiş ya da kaldırılmış",
        ),
        detail: tx(
          "After :Destroy() (or when a character despawns) Parent becomes nil, so anything that walks up the tree breaks.",
          ":Destroy()'dan sonra (ya da bir karakter kaybolunca) Parent nil olur, bu yüzden ağaçta yukarı çıkan her şey bozulur.",
        ),
        likelihood: "possible",
        confirmedInCode: true,
      },
      points: 10,
      reason: tx("value comes from .Parent", "değer .Parent'tan geliyor"),
    };
  }

  if (/^\s*require\s*\(/.test(expr)) {
    return {
      cause: {
        text: tx(
          "The ModuleScript didn't return what this code expects",
          "ModuleScript bu kodun beklediği şeyi döndürmedi",
        ),
        detail: tx(
          "Whatever the module returns on its last line is what require() gives you. A missing field or a different table shape shows up as nil here.",
          "Modül son satırında ne döndürüyorsa require() sana onu verir. Eksik bir alan ya da farklı yapıda bir tablo burada nil olarak görünür.",
        ),
        likelihood: "possible",
        confirmedInCode: true,
      },
      points: 8,
      reason: tx("value comes from require()", "değer require()'dan geliyor"),
    };
  }

  if (/JSONDecode\s*\(/.test(expr)) {
    return {
      cause: {
        text: tx(
          "The decoded JSON doesn't contain that field",
          "Çözülen (decode) JSON'da bu alan yok",
        ),
        detail: tx(
          "JSONDecode gives you exactly what the server sent — print the table to see its real shape.",
          "JSONDecode sana tam olarak sunucunun gönderdiğini verir — gerçek yapısını görmek için tabloyu yazdır.",
        ),
        likelihood: "possible",
        confirmedInCode: true,
      },
      points: 8,
      reason: tx("value comes from JSONDecode", "değer JSONDecode'dan geliyor"),
    };
  }

  if (/^\s*nil\s*$/.test(expr)) {
    return {
      cause: {
        text: tx(
          `${q(displayName)} never gets a value before this line`,
          `${q(displayName)} bu satırdan önce hiç değer almıyor`,
        ),
        detail: tx(
          `It's declared${where ? ` (${where})` : ""} with no value (or set to nil), and nothing assigns it before it's used.`,
          `Değersiz (ya da nil olarak) tanımlanmış${where ? ` (${where})` : ""} ve kullanılmadan önce hiçbir şey ona değer atamıyor.`,
        ),
        likelihood: "likely",
        confirmedInCode: true,
      },
      points: 16,
      reason: tx("variable is assigned nil", "değişkene nil atanmış"),
    };
  }

  if (/\[[^\]]+\]\s*$/.test(expr)) {
    return {
      cause: {
        text: tx("That table has no entry for this key", "O tabloda bu anahtar için bir kayıt yok"),
        detail: tx(
          'Reading a key that isn\'t in a table gives nil. Print the table and the key to compare them ("5" and 5 are different keys).',
          'Tabloda olmayan bir anahtarı okumak nil verir. Karşılaştırmak için tabloyu ve anahtarı yazdır ("5" ile 5 farklı anahtarlardır).',
        ),
        likelihood: "possible",
        confirmedInCode: true,
      },
      points: 8,
      reason: tx("value comes from a table lookup", "değer bir tablo aramasından geliyor"),
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
          text: tx(
            "Players.LocalPlayer is nil — is this a server Script?",
            "Players.LocalPlayer nil — bu bir sunucu Script'i mi?",
          ),
          detail: tx(
            "LocalPlayer only exists in LocalScripts. If this code is in a Script (server), LocalPlayer is always nil.",
            "LocalPlayer sadece LocalScript'lerde vardır. Bu kod bir Script'te (sunucuda) ise LocalPlayer her zaman nil'dir.",
          ),
          likelihood: "likely",
          confirmedInCode: true,
        },
        points: 12,
        reason: tx(
          "LocalPlayer used and script side unknown",
          "LocalPlayer kullanılmış ve scriptin hangi tarafta çalıştığı bilinmiyor",
        ),
      };
    }
    // `data.stats.coins` — follow the root variable in case it's the real culprit.
    if (root) {
      const assignment = findAssignment(code, root, beforeLine);
      if (assignment?.kind === "assignment" && /^\s*\{/.test(assignment.rhs) && seg) {
        return {
          cause: {
            text: tx(
              `${q(root)} is a table without a ${q(seg)} entry`,
              `${q(root)} içinde ${q(seg)} kaydı olmayan bir tablo`,
            ),
            detail: tx(
              `${q(root)} is created on line ${assignment.line} but nothing puts a ${q(seg)} key in it before it's used.`,
              `${q(root)} ${assignment.line}. satırda oluşturuluyor ama kullanılmadan önce hiçbir şey içine ${q(seg)} anahtarını koymuyor.`,
            ),
            likelihood: "likely",
            confirmedInCode: true,
          },
          points: 12,
          reason: tx(
            "table created without the accessed key",
            "tablo, okunan anahtar olmadan oluşturulmuş",
          ),
        };
      }
      if (assignment?.kind === "assignment") {
        const produced = explainNilProducer(assignment.rhs, root, side, lineRef(assignment.line));
        if (produced && seg && produced.cause.likelihood === "likely") {
          return {
            ...produced,
            cause: {
              ...produced.cause,
              text: tx(
                `${produced.cause.text}, or it has no ${q(seg)}`,
                `${produced.cause.text} ya da içinde ${q(seg)} yok`,
              ),
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
            text: tx(
              `${q(expr)} is never defined — did you mean ${q(suggestion)}?`,
              `${q(expr)} hiç tanımlanmamış — ${q(suggestion)} mı demek istedin?`,
            ),
            detail: tx(
              "Undefined names are nil in Luau. Variable names are case-sensitive, so one wrong letter creates a brand new (nil) variable.",
              "Luau'da tanımlanmamış isimler nil'dir. Değişken isimleri büyük/küçük harfe duyarlıdır, bu yüzden tek bir yanlış harf yepyeni (nil) bir değişken oluşturur.",
            ),
            likelihood: "likely",
            confirmedInCode: true,
          },
          fix: {
            after: `${tx("-- use the variable you actually created:", "-- gerçekten oluşturduğun değişkeni kullan:")}\n${suggestion}`,
          },
          points: 22,
          reason: tx(
            `undefined name close to \`${suggestion}\``,
            `tanımsız isim \`${suggestion}\` ile çok benzer`,
          ),
        };
      }
      if (declared.size > 0) {
        return {
          cause: {
            text: tx(
              `${q(expr)} is never assigned in this snippet`,
              `${q(expr)} bu kodda hiç değer almıyor`,
            ),
            detail: tx(
              "If it's defined in another script, remember locals don't cross scripts — share values with a ModuleScript or attributes.",
              "Başka bir scriptte tanımlıysa, local değişkenlerin scriptler arasında paylaşılmadığını unutma — değerleri bir ModuleScript ya da attribute'larla paylaş.",
            ),
            likelihood: "possible",
            confirmedInCode: true,
          },
          points: 6,
          reason: tx("name not defined in snippet", "isim kodda tanımlı değil"),
        };
      }
    }
    return undefined;
  }

  if (assignment.kind === "parameter") {
    return {
      cause: {
        text: tx(
          `${q(expr)} is a function parameter and the caller passed nil`,
          `${q(expr)} bir fonksiyon parametresi ve çağıran yer nil vermiş`,
        ),
        detail: tx(
          `Check every place that calls ${assignment.fnName ? q(assignment.fnName) : "this function"} — one of them passes nothing (or nil) for ${q(expr)}.`,
          `${assignment.fnName ? q(assignment.fnName) : "Bu fonksiyonu"} çağıran her yeri kontrol et — biri ${q(expr)} için hiçbir şey (ya da nil) vermiyor.`,
        ),
        likelihood: "possible",
        confirmedInCode: true,
      },
      points: 8,
      reason: tx("value is a function parameter", "değer bir fonksiyon parametresi"),
    };
  }

  if (assignment.kind === "assignment") {
    const produced = explainNilProducer(assignment.rhs, expr, side, lineRef(assignment.line), key);
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
          text: tx(`${q(call[1])}(...) returned nil`, `${q(call[1])}(...) nil döndürdü`),
          detail: tx(
            `${q(expr)} gets its value from ${q(call[1])} on line ${assignment.line}. Make sure every path through that function ends with a \`return\`.`,
            `${q(expr)} değerini ${assignment.line}. satırdaki ${q(call[1])} çağrısından alıyor. O fonksiyonun her yolunun bir \`return\` ile bittiğinden emin ol.`,
          ),
          likelihood: "possible",
          confirmedInCode: true,
        },
        points: 8,
        reason: tx("value returned by a function call", "değer bir fonksiyon çağrısının sonucu"),
      };
    }
  }
  return undefined;
}

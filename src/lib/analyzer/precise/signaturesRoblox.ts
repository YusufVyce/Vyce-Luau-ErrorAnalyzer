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
import { trType, tx } from "./lang";
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
    after: `local ${varName} = hit.Parent${getter}\nif not ${varName} then return end ${tx("-- not a character, ignore it", "-- karakter değil, görmezden gel")}`,
    caption: tx(
      "Put this at the top of your Touched function.",
      "Bunu Touched fonksiyonunun en üstüne koy.",
    ),
  };
  if (!line) return generic;
  const m = line.match(new RegExp(`([A-Za-z_][\\w.]*)\\s*\\.\\s*${escapeRegExp(member)}\\b`));
  if (!m) return generic;
  const parentExpr = m[1];
  const found = `${parentExpr}${getter}`;
  const caption = tx(
    "Only characters have a " + member + " — check for it first.",
    "Sadece karakterlerde " + member + " vardır — önce onu kontrol et.",
  );
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
      causes.push(cause(tx(hint.why, hint.whyTr), "likely", tx(hint.fix, hint.fixTr), true));
      if (hint.code) fixCode = { after: tx(hint.code, hint.codeTr ?? hint.code) };
      evidence.push(
        ev(
          20,
          tx(
            `${member} is a known mistake on ${cls}`,
            `${cls} üzerinde ${member} bilinen bir hata`,
          ),
        ),
      );
    }

    const owner = MEMBER_OWNER[member];
    if (!hint && owner && !owner.owner.includes(cls)) {
      const ownerName = tx(owner.owner, owner.ownerTr ?? owner.owner);
      causes.push(
        cause(
          tx(
            `${q(member)} belongs to a ${owner.owner}, not to a ${cls}`,
            `${q(member)} bir ${cls} objesine değil, ${ownerName} objesine aittir`,
          ),
          "likely",
          tx(
            `Get the ${owner.owner.split(" ")[0]} first, then use ${q(member)} on it.`,
            `Önce ${owner.owner.split(" ")[0]} objesini al, sonra onun üzerinde ${q(member)} kullan.`,
          ),
          Boolean(located),
        ),
      );
      fixCode = { after: owner.example };
      evidence.push(
        ev(
          18,
          tx(`${member} is a member of ${owner.owner}`, `${member}, ${ownerName} objesine aittir`),
        ),
      );
    }

    const typo = closest(member, COMMON_MEMBERS);
    if (typo && typo.toLowerCase() === member.toLowerCase()) {
      causes.push(
        cause(
          tx(
            `Wrong capitalization: it's ${q(typo)}, not ${q(member)}`,
            `Büyük/küçük harf yanlış: ${q(member)} değil, ${q(typo)}`,
          ),
          "likely",
          tx("Roblox names are case-sensitive.", "Roblox isimleri büyük/küçük harfe duyarlıdır."),
          true,
        ),
      );
      if (located)
        fixCode = {
          before: located.text,
          after: located.text.replace(new RegExp(`\\b${escapeRegExp(member)}\\b`), typo),
        };
      evidence.push(
        ev(
          22,
          tx(
            `\`${member}\` differs from \`${typo}\` only by capitalization`,
            `\`${member}\` ile \`${typo}\` arasındaki tek fark büyük/küçük harf`,
          ),
        ),
      );
    } else if (typo && !hint) {
      causes.push(
        cause(
          tx(`Typo? Did you mean ${q(typo)}?`, `Yazım hatası mı? ${q(typo)} mı demek istedin?`),
          "likely",
          tx(
            "The name is one or two letters away from a real property/child.",
            "Bu isim, gerçek bir özellikten ya da alt objeden sadece bir iki harf farklı.",
          ),
          true,
        ),
      );
      if (located)
        fixCode = {
          before: located.text,
          after: located.text.replace(new RegExp(`\\b${escapeRegExp(member)}\\b`), typo),
        };
      evidence.push(
        ev(
          14,
          tx(`\`${member}\` is close to \`${typo}\``, `\`${member}\`, \`${typo}\` ile çok benzer`),
        ),
      );
    }

    if (cls === "Accessory" || cls === "Tool" || cls === "Accoutrement") {
      causes.push(
        cause(
          tx(
            `hit.Parent was a ${cls} (like a hat), not the character`,
            `hit.Parent karakter değil, bir ${cls} (şapka gibi) idi`,
          ),
          "likely",
          tx(
            'When an accessory\'s Handle touches a part, hit.Parent is the accessory. Use Players:GetPlayerFromCharacter(hit.Parent) or hit:FindFirstAncestorOfClass("Model") and check for a Humanoid.',
            'Bir aksesuarın Handle\'ı parçaya dokunduğunda hit.Parent aksesuarın kendisidir. Players:GetPlayerFromCharacter(hit.Parent) ya da hit:FindFirstAncestorOfClass("Model") kullan ve Humanoid olup olmadığını kontrol et.',
          ),
        ),
      );
      fixCode = {
        after:
          'local character = hit:FindFirstAncestorOfClass("Model")\nlocal humanoid = character and character:FindFirstChildOfClass("Humanoid")\nif not humanoid then return end',
      };
      evidence.push(
        ev(
          18,
          tx(
            `${cls} parent means the touch came from an accessory/tool`,
            `Parent'ın ${cls} olması, dokunmanın bir aksesuardan/araçtan geldiğini gösterir`,
          ),
        ),
      );
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
          ? tx("a part that sits directly in Workspace", "doğrudan Workspace'te duran bir parça")
          : tx(
              `${path ? q(path.split(".").pop()!) : "something"}, which is a ${cls}, not a character`,
              `${path ? q(path.split(".").pop()!) : "bir şey"} — bu bir karakter değil, bir ${cls}`,
            );
      causes.push(
        cause(
          tx(
            `Something that isn't a character touched it — hit.Parent was ${what}`,
            `Ona karakter olmayan bir şey dokundu — hit.Parent: ${what}`,
          ),
          "likely",
          tx(
            `Touched fires for every part that bumps into it: other parts, falling rocks, hats, tools. Only player (and NPC) characters have a ${member}, so check that it exists before using it.`,
            `Touched, ona çarpan her parça için çalışır: başka parçalar, düşen taşlar, şapkalar, araçlar. Sadece oyuncu (ve NPC) karakterlerinde ${member} vardır, bu yüzden kullanmadan önce var olduğunu kontrol et.`,
          ),
          touchCode,
        ),
      );
      fixCode = touchGuardFix(member, located?.text) ?? fixCode;
      evidence.push(
        ev(
          touchCode ? 20 : 10,
          touchCode
            ? tx("the script uses Touched / hit.Parent", "script Touched / hit.Parent kullanıyor")
            : tx(`${cls} can't be a character`, `${cls} bir karakter olamaz`),
        ),
      );
    }

    if (member === "leaderstats" && cls === "Player") {
      causes.push(
        cause(
          tx(
            "leaderstats doesn't exist yet (or isn't named exactly \"leaderstats\")",
            'leaderstats henüz yok (ya da adı tam olarak "leaderstats" değil)',
          ),
          "likely",
          tx(
            'A server Script must create a Folder named exactly `leaderstats` (lowercase) inside the player in PlayerAdded. Scripts that read it should use player:WaitForChild("leaderstats").',
            'Bir sunucu Script\'i, PlayerAdded içinde oyuncunun içine adı tam olarak `leaderstats` (küçük harfle) olan bir Folder oluşturmalı. Onu okuyan scriptler player:WaitForChild("leaderstats") kullanmalı.',
          ),
        ),
      );
      fixCode ??= {
        after:
          'game.Players.PlayerAdded:Connect(function(player)\n\tlocal leaderstats = Instance.new("Folder")\n\tleaderstats.Name = "leaderstats"\n\tleaderstats.Parent = player\n\n\tlocal coins = Instance.new("IntValue")\n\tcoins.Name = "Coins"\n\tcoins.Parent = leaderstats\nend)',
        caption: tx(
          "Server Script (ServerScriptService) that creates leaderstats.",
          "leaderstats'ı oluşturan sunucu Script'i (ServerScriptService içinde).",
        ),
      };
    }

    if (path && /^(ServerStorage|ServerScriptService)/i.test(path) && ctx.side === "client") {
      causes.push(
        cause(
          tx(
            `${path.split(".")[0]} is invisible to LocalScripts`,
            `${path.split(".")[0]}, LocalScript'ler tarafından görülemez`,
          ),
          "likely",
          tx(
            "Anything the client needs (remotes, templates, modules) must be in ReplicatedStorage.",
            "İstemcinin ihtiyaç duyduğu her şey (remote'lar, şablonlar, modüller) ReplicatedStorage'da olmalı.",
          ),
          true,
        ),
      );
      evidence.push(
        ev(
          18,
          tx(
            "client code reading a server-only container",
            "istemci kodu sadece sunucuya ait bir yeri okuyor",
          ),
        ),
      );
    }

    if (cls === "DataModel" && SERVICE_NAMES.includes(member)) {
      causes.push(
        cause(
          tx(
            `Use game:GetService("${member}") instead of game.${member}`,
            `game.${member} yerine game:GetService("${member}") kullan`,
          ),
          "likely",
          tx(
            "Some services aren't children of game until something requests them; GetService always works.",
            "Bazı servisler biri onları isteyene kadar game'in içinde görünmez; GetService her zaman çalışır.",
          ),
          true,
        ),
      );
      fixCode = { after: `local ${member} = game:GetService("${member}")` };
      evidence.push(ev(18, tx("service accessed with a dot", "servise nokta ile erişilmiş")));
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
          tx(
            `${q(member)} hasn't loaded/replicated yet${ctx.side === "client" ? " (this is a LocalScript)" : ""}`,
            `${q(member)} henüz yüklenmedi${ctx.side === "client" ? " (bu bir LocalScript)" : ""}`,
          ),
          ctx.side === "client" || /PlayerGui|Character|Backpack/i.test(path ?? "")
            ? "likely"
            : "possible",
          tx(
            "Objects created by other scripts, UI copied into PlayerGui, character parts and anything streamed in can arrive a moment after your script starts. Dot-indexing doesn't wait; WaitForChild does.",
            "Başka scriptlerin oluşturduğu objeler, PlayerGui'ye kopyalanan arayüz, karakter parçaları ve sonradan yüklenen her şey scriptin başladıktan biraz sonra gelebilir. Nokta ile erişim beklemez; WaitForChild bekler.",
          ),
        ),
        cause(
          tx(
            `There is no child called exactly ${q(member)} inside ${path ? q(path) : `that ${cls}`}`,
            `${path ? q(path) : `O ${cls}`} içinde adı tam olarak ${q(member)} olan bir alt obje yok`,
          ),
          "possible",
          tx(
            "Check the name in Explorer during Play — spaces and capital letters count.",
            "Oyun çalışırken (Play) Explorer'da ismi kontrol et — boşluklar ve büyük harfler önemlidir.",
          ),
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
            caption: tx(
              "WaitForChild waits until the object exists.",
              "WaitForChild, obje oluşana kadar bekler.",
            ),
          };
      }
    }

    if (nonCharacterTouch) {
      return result({
        title: tx(
          `hit.Parent isn't a character — it has no ${member}`,
          `hit.Parent bir karakter değil — içinde ${member} yok`,
        ),
        severity: "High",
        summary: tx(
          `The part that touched yours belongs to ${path ? q(path) : `a ${cls}`}, not to a player's character, so there is no ${q(member)} inside it.`,
          `Senin parçana dokunan parça bir oyuncunun karakterine değil, ${path ? q(path) : `bir ${cls}`} objesine ait, bu yüzden içinde ${q(member)} yok.`,
        ),
        explanation: tx(
          `Touched fires for every part that bumps into yours — not just players. \`hit\` is the part that touched, and \`hit.Parent\` is whatever holds it. For a player's leg that's the character (which has a ${member}); for a loose part it's Workspace or a Model. Writing \`hit.Parent.${member}\` assumes a character and errors for everything else.`,
          `Touched sadece oyuncular için değil, senin parçana çarpan her parça için çalışır. \`hit\` dokunan parçadır, \`hit.Parent\` da onu tutan şeydir. Bir oyuncunun bacağı için bu karakterdir (içinde ${member} vardır); serbest bir parça için Workspace ya da bir Model'dir. \`hit.Parent.${member}\` yazmak gelenin karakter olduğunu varsayar ve diğer her şeyde hata verir.`,
        ),
        location: locationOf(located, member),
        causes: rankCauses(causes),
        steps: [
          tx(
            `Get the ${member} with ${member === "Humanoid" ? ':FindFirstChildOfClass("Humanoid")' : `:FindFirstChild("${member}")`} — it returns nil instead of erroring.`,
            `${member} objesini ${member === "Humanoid" ? ':FindFirstChildOfClass("Humanoid")' : `:FindFirstChild("${member}")`} ile al — hata vermek yerine nil döndürür.`,
          ),
          tx(
            "If it's nil, `return` early: whatever touched you wasn't a character.",
            "nil ise erkenden `return` yap: dokunan şey bir karakter değildi.",
          ),
          tx(
            "Only players? Use game.Players:GetPlayerFromCharacter(hit.Parent) and check it isn't nil.",
            "Sadece oyuncular mı? game.Players:GetPlayerFromCharacter(hit.Parent) kullan ve nil olmadığını kontrol et.",
          ),
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
      title: tx(`"${member}" doesn't exist on ${cls}`, `${cls} içinde "${member}" yok`),
      severity: "High",
      summary: tx(
        `Roblox looked for ${q(member)} inside ${path ? q(path) : `a ${cls}`} and found nothing with that name.`,
        `Roblox ${path ? q(path) : `bir ${cls}`} içinde ${q(member)} aradı ve bu isimde hiçbir şey bulamadı.`,
      ),
      explanation: tx(
        `When you write ${q(`.${member}`)}, Roblox checks the object's properties, methods and children for that exact name. None matched — so it's misspelled, it's the wrong kind of object, or the child isn't there yet.`,
        `${q(`.${member}`)} yazdığında Roblox objenin özelliklerinde, metotlarında ve alt objelerinde birebir bu ismi arar. Hiçbiri uymadı — yani ya yanlış yazılmış, ya obje yanlış türde, ya da alt obje henüz orada değil.`,
      ),
      location: locationOf(located, member),
      causes: rankCauses(
        causes.length
          ? causes
          : [
              cause(
                tx(
                  `${q(member)} isn't a property, method or child of ${cls}`,
                  `${q(member)}, ${cls} için bir özellik, metot ya da alt obje değil`,
                ),
                "likely",
              ),
            ],
      ),
      steps: [
        tx(
          `Press Play, open Explorer and look inside ${path ? q(path) : `the ${cls}`} for ${q(member)} — compare spelling and capitals.`,
          `Play'e bas, Explorer'ı aç ve ${path ? q(path) : `${cls}`} içinde ${q(member)} ara — yazımı ve büyük harfleri karşılaştır.`,
        ),
        tx(
          "If it's created by another script or it's UI/character stuff, use :WaitForChild(\"Name\").",
          'Başka bir script oluşturuyorsa ya da arayüz/karakter parçasıysa :WaitForChild("Ad") kullan.',
        ),
        tx(
          "If it's a property, check the Properties window of that object for the exact name.",
          "Bir özellikse, tam adını o objenin Properties penceresinden kontrol et.",
        ),
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
    let nameMismatch = false;
    let fixCode: SignatureResult["fixCode"] = {
      after: `local ${child.replace(/\W/g, "") || "child"} = ${located ? (located.text.match(/([\w.:]+)\s*:\s*WaitForChild/)?.[1] ?? "parent") : "parent"}:WaitForChild("${child}", 10)\nif not ${child.replace(/\W/g, "") || "child"} then\n\twarn("${tx(`${child} never appeared in ${parentPath}`, `${child}, ${parentPath} içinde hiç oluşmadı`)}")\n\treturn\nend`,
      caption: tx(
        "A timeout turns an endless wait into a clear warning you can handle.",
        "Bir zaman sınırı, sonsuz beklemeyi kontrol edebileceğin açık bir uyarıya çevirir.",
      ),
    };

    // The snippet creates something with an almost-identical name.
    for (const created of ctx.code.matchAll(/\.Name\s*=\s*["']([^"']+)["']/g)) {
      if (
        created[1] !== child &&
        (created[1].toLowerCase() === child.toLowerCase() ||
          closest(child, [created[1]]) === created[1])
      ) {
        if (causes.length === 0) nameMismatch = true;
        causes.push(
          cause(
            tx(
              `Name mismatch: your code creates ${q(`"${created[1]}"`)} but waits for ${q(`"${child}"`)}`,
              `İsim uyuşmuyor: kodun ${q(`"${created[1]}"`)} oluşturuyor ama ${q(`"${child}"`)} bekliyor`,
            ),
            "likely",
            tx(
              "Names must match exactly, including capital letters and spaces.",
              "İsimler büyük harfler ve boşluklar dahil birebir aynı olmalı.",
            ),
            true,
          ),
        );
        evidence.push(
          ev(
            24,
            tx(
              `created name "${created[1]}" nearly matches "${child}"`,
              `oluşturulan "${created[1]}" adı, "${child}" ile neredeyse aynı`,
            ),
          ),
        );
      }
    }

    if (/^(ServerStorage|ServerScriptService)/i.test(parentPath)) {
      causes.push(
        cause(
          tx(
            `The client can't see ${parentPath.split(".")[0]}`,
            `İstemci ${parentPath.split(".")[0]} içini göremez`,
          ),
          "likely",
          tx(
            "LocalScripts never receive anything stored in ServerStorage or ServerScriptService. Move it to ReplicatedStorage.",
            "LocalScript'ler ServerStorage ya da ServerScriptService içindeki hiçbir şeyi alamaz. Onu ReplicatedStorage'a taşı.",
          ),
          true,
        ),
      );
      evidence.push(
        ev(
          20,
          tx(
            "waiting inside a server-only container",
            "sadece sunucuya ait bir yerin içinde bekleniyor",
          ),
        ),
      );
    }
    if (child === "leaderstats") {
      causes.push(
        cause(
          tx(
            "No server script creates leaderstats for this player (or it's named differently)",
            "Bu oyuncu için leaderstats'ı oluşturan bir sunucu scripti yok (ya da adı farklı)",
          ),
          "likely",
          tx(
            'The folder must be created by a server Script in Players.PlayerAdded and be named exactly "leaderstats".',
            'Folder, Players.PlayerAdded içinde bir sunucu Script\'i tarafından oluşturulmalı ve adı tam olarak "leaderstats" olmalı.',
          ),
        ),
      );
    }
    if (
      /^(Humanoid|HumanoidRootPart|Head|Animator)$/.test(child) &&
      /^Workspace\./i.test(parentPath)
    ) {
      causes.push(
        cause(
          tx(
            "You're waiting on an old character that was removed when the player died/respawned",
            "Oyuncu ölüp yeniden doğduğunda silinen eski bir karakteri bekliyorsun",
          ),
          "possible",
          tx(
            "Get the fresh character from player.CharacterAdded each time.",
            "Yeni karakteri her seferinde player.CharacterAdded'dan al.",
          ),
        ),
      );
    }
    if (/^Workspace/i.test(parentPath) && ctx.side !== "server") {
      causes.push(
        cause(
          tx(
            "StreamingEnabled: that part of the map isn't streamed to this client yet",
            "StreamingEnabled: haritanın o kısmı bu istemciye henüz yüklenmedi",
          ),
          "possible",
          tx(
            "With streaming on, far-away parts don't exist on the client. Use a timeout, ModelStreamingMode = Persistent for important models, or handle it on the server.",
            "Streaming açıkken uzaktaki parçalar istemcide yoktur. Bir zaman sınırı kullan, önemli modellerde ModelStreamingMode = Persistent yap ya da işi sunucuda hallet.",
          ),
        ),
      );
    }
    if (/PlayerGui/i.test(parentPath)) {
      causes.push(
        cause(
          tx(
            "The ScreenGui isn't named like that in StarterGui, or it's a different ScreenGui",
            "StarterGui'deki ScreenGui'nin adı bu değil ya da başka bir ScreenGui",
          ),
          "possible",
          tx(
            "Everything in StarterGui is copied into PlayerGui with the same names.",
            "StarterGui'deki her şey aynı isimlerle PlayerGui'ye kopyalanır.",
          ),
        ),
      );
    }
    causes.push(
      cause(
        tx(
          `Nothing named exactly "${child}" is ever put inside ${q(parentPath)}`,
          `${q(parentPath)} içine adı tam olarak "${child}" olan hiçbir şey konmuyor`,
        ),
        "possible",
        tx(
          "Check spelling and the parent in Explorer while the game is running.",
          "Oyun çalışırken Explorer'da yazımı ve üst objeyi (parent) kontrol et.",
        ),
      ),
      cause(
        tx(
          "The object is created by a script that errored or never ran",
          "Objeyi oluşturan script hata verdi ya da hiç çalışmadı",
        ),
        "possible",
      ),
    );
    if (causes[0]?.confirmedInCode && nameMismatch) fixCode = undefined;

    return result({
      title: tx(`Waiting forever for "${child}"`, `"${child}" sonsuza dek bekleniyor`),
      severity: "Medium",
      summary: tx(
        `WaitForChild("${child}") has waited 5+ seconds inside ${q(parentPath)} and it still hasn't appeared.`,
        `WaitForChild("${child}") ${q(parentPath)} içinde 5 saniyeden fazla bekledi ve obje hâlâ ortada yok.`,
      ),
      explanation: tx(
        `This is a warning, not a crash: WaitForChild pauses your script until a child with that exact name exists. After 5 seconds Roblox warns you that it might never come — and your script is still stuck on that line.`,
        `Bu bir çökme değil, bir uyarı: WaitForChild, tam o isimde bir alt obje oluşana kadar scriptini durdurur. 5 saniye sonra Roblox, onun hiç gelmeyebileceği konusunda seni uyarır — ve scriptin hâlâ o satırda takılı kalır.`,
      ),
      location: locationOf(located, child),
      causes: rankCauses(causes),
      steps: [
        tx(
          `Press Play and look in Explorer: does ${q(parentPath)} contain ${q(child)}? Check the spelling and which side (Server/Client view) you're looking at.`,
          `Play'e bas ve Explorer'a bak: ${q(parentPath)} içinde ${q(child)} var mı? Yazımı ve hangi tarafa (Sunucu/İstemci görünümü) baktığını kontrol et.`,
        ),
        tx(
          "If it's supposed to be created by a script, check that script's output for errors.",
          "Bir scriptin onu oluşturması gerekiyorsa, o scriptin Output'ta hata verip vermediğine bak.",
        ),
        tx(
          "Add a timeout (second argument) so the script can react instead of hanging.",
          "Script takılıp kalmak yerine tepki verebilsin diye bir zaman sınırı (ikinci değer) ekle.",
        ),
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
    if (located)
      evidence.push(
        ev(10, tx("the snippet destroys an object", "kod bir objeyi siliyor (Destroy)")),
      );
    return result({
      title: tx(`Can't re-parent a destroyed object`, `Silinmiş (Destroy) bir obje taşınamaz`),
      severity: "Medium",
      summary: tx(
        `${q(obj)} was already destroyed, so it can't be moved to ${q(m[3])}.`,
        `${q(obj)} zaten silinmiş (Destroy), bu yüzden ${q(m[3])} içine taşınamaz.`,
      ),
      explanation: tx(
        "Destroy() permanently locks an object's Parent (current parent NULL means it's destroyed). You can't bring it back. Keep an original as a template and Clone() it every time you need a fresh copy.",
        "Destroy() bir objenin Parent'ını kalıcı olarak kilitler (current parent NULL, objenin silindiği anlamına gelir). Onu geri getiremezsin. Aslını şablon olarak sakla ve her yeni kopyaya ihtiyacın olduğunda Clone() ile kopyala.",
      ),
      location: locationOf(located),
      causes: rankCauses([
        cause(
          tx(
            "You destroy the object and then try to use/parent it again",
            "Objeyi silip (Destroy) sonra tekrar kullanmaya/taşımaya çalışıyorsun",
          ),
          "likely",
          tx(
            "Common with tools, projectiles and UI: Destroy the clone, never the template.",
            "Araçlarda, mermilerde ve arayüzde sık olur: şablonu değil, her zaman kopyayı sil.",
          ),
        ),
        cause(
          tx(
            "Another script (or Debris:AddItem) destroyed it first",
            "Başka bir script (ya da Debris:AddItem) onu önce sildi",
          ),
          "possible",
        ),
      ]),
      steps: [
        tx(
          "Keep the template in ReplicatedStorage/ServerStorage and only ever Destroy clones.",
          "Şablonu ReplicatedStorage/ServerStorage'da tut ve sadece kopyaları sil.",
        ),
        tx(
          "Create a new clone each time instead of reusing an old object.",
          "Eski bir objeyi tekrar kullanmak yerine her seferinde yeni bir kopya oluştur.",
        ),
      ],
      fixCode: {
        after: `local template = game.ServerStorage:WaitForChild("Coin")\n\nlocal coin = template:Clone()\ncoin.Parent = workspace\ntask.delay(10, function()\n\tcoin:Destroy() ${tx("-- destroy the copy, never the template", "-- şablonu değil, kopyayı sil")}\nend)`,
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
      title: tx(
        "Parent changed while it was already changing",
        "Parent zaten değişirken tekrar değiştirildi",
      ),
      severity: "Medium",
      summary: tx(
        "A script moved an object to a new parent from inside an event that fired because its parent was changing.",
        "Bir script, objenin parent'ı değiştiği için çalışan bir event'in içinden objeyi yeni bir parent'a taşıdı.",
      ),
      explanation: tx(
        "Changing Parent inside ChildAdded/ChildRemoved/AncestryChanged for the same object makes Roblox re-enter the change. Defer your move until the current change has finished.",
        "Aynı obje için ChildAdded/ChildRemoved/AncestryChanged içinde Parent'ı değiştirmek, Roblox'un değişikliğin içine tekrar girmesine yol açar. Taşıma işini mevcut değişiklik bitene kadar ertele.",
      ),
      location: locationOf(located),
      causes: [
        cause(
          tx(
            "Parent is set inside a ChildAdded / AncestryChanged handler",
            "Parent, bir ChildAdded / AncestryChanged fonksiyonunun içinde değiştiriliyor",
          ),
          "likely",
          undefined,
          Boolean(located),
        ),
      ],
      steps: [
        tx(
          "Wrap the Parent change in task.defer(function() ... end).",
          "Parent değişikliğini task.defer(function() ... end) içine al.",
        ),
      ],
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
          evidence.push(
            ev(
              12,
              tx(
                `line ${located.line} assigns ${rhs} to ${prop}`,
                `${located.line}. satır ${prop} özelliğine ${rhs} atıyor`,
              ),
            ),
          );
        }
      }
    }
    const gotTr = trType(got);
    const expectedTr = trType(expected);
    const causes: DiagnosisCause[] = [];
    if (fixCode && located) {
      const rhs = located.text
        .split(/=(?!=)/)
        .slice(1)
        .join("=")
        .trim();
      causes.push(
        cause(
          tx(
            `Line ${located.line} gives ${prop} a ${got} (${q(rhs)})`,
            `${located.line}. satır ${prop} özelliğine bir ${gotTr} veriyor (${q(rhs)})`,
          ),
          "likely",
          conversion ? tx(`Convert it: ${conversion}.`, `Çevir: ${conversion}.`) : undefined,
          true,
        ),
      );
    }
    if (got === "nil")
      causes.push(
        cause(
          tx(`The value you assigned to ${prop} is nil`, `${prop} özelliğine atadığın değer nil`),
          "likely",
          tx(
            "A lookup or variable on the right side of `=` has no value.",
            "`=` işaretinin sağındaki bir arama ya da değişkenin değeri yok.",
          ),
        ),
      );
    if (prop === "Position" && got === "CFrame")
      causes.push(
        cause(
          tx(
            "You assigned a CFrame to Position — use .CFrame = ... or cf.Position",
            "Position'a bir CFrame atadın — .CFrame = ... ya da cf.Position kullan",
          ),
          "likely",
        ),
      );
    if (prop === "Text" && got !== "nil")
      causes.push(
        cause(
          tx(
            `Text needs a string; wrap the ${got} in tostring()`,
            `Text bir metin (string) ister; ${gotTr} değerini tostring() içine al`,
          ),
          "likely",
        ),
      );
    if (/Color/.test(prop))
      causes.push(
        cause(
          tx("Color3 and BrickColor are different types", "Color3 ve BrickColor farklı türlerdir"),
          "possible",
          tx(
            'Color3.fromRGB(255, 0, 0) for Color3 properties, BrickColor.new("Bright red") for BrickColor.',
            'Color3 özellikleri için Color3.fromRGB(255, 0, 0), BrickColor için BrickColor.new("Bright red") kullan.',
          ),
        ),
      );
    if (expected === "Content")
      causes.push(
        cause(
          tx(
            'Asset IDs must be text like "rbxassetid://123456"',
            'Asset ID\'leri "rbxassetid://123456" gibi bir metin olmalı',
          ),
          "likely",
        ),
      );
    if (causes.length === 0)
      causes.push(
        cause(
          tx(
            `${prop} only accepts a ${expected}, but the code gives it a ${got}`,
            `${prop} sadece ${expectedTr} kabul eder, ama kod ona ${gotTr} veriyor`,
          ),
          "likely",
          conversion ? tx(`Convert it: ${conversion}.`, `Çevir: ${conversion}.`) : undefined,
        ),
      );
    return result({
      title: tx(
        `${prop} needs a ${expected}, got ${got}`,
        `${prop} ${expectedTr} ister, ${gotTr} verildi`,
      ),
      severity: "Medium",
      summary: tx(
        `You set ${q(prop)} to a ${got}, but it only accepts a ${expected}.`,
        `${q(prop)} özelliğine bir ${gotTr} verdin, ama o sadece ${expectedTr} kabul eder.`,
      ),
      explanation: tx(
        `Every Roblox property has a fixed type. ${q(prop)} is a ${expected} property, so assigning a ${got} is rejected.${conversion ? ` Convert it first: ${q(conversion)}.` : ""}`,
        `Her Roblox özelliğinin sabit bir türü vardır. ${q(prop)} bir ${expectedTr} özelliğidir, bu yüzden ona ${gotTr} atanamaz.${conversion ? ` Önce çevir: ${q(conversion)}.` : ""}`,
      ),
      location: locationOf(located, prop),
      causes: rankCauses(causes),
      steps: [
        tx(
          `Check the Properties window: ${prop} is a ${expected}.`,
          `Properties penceresine bak: ${prop} bir ${expectedTr}.`,
        ),
        conversion
          ? tx(`Convert the value: ${conversion}.`, `Değeri çevir: ${conversion}.`)
          : tx(
              `Build a ${expected} value (e.g. ${expected}.new(...)).`,
              `Bir ${expected} değeri oluştur (örneğin ${expected}.new(...)).`,
            ),
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
            tx(
              `FireClient's first argument must be the Player (you passed ${q(arg)})`,
              `FireClient'ın ilk değeri Player olmalı (sen ${q(arg)} verdin)`,
            ),
            "likely",
            tx(
              "Use remote:FireClient(player, data...).",
              "remote:FireClient(player, veri...) kullan.",
            ),
            true,
          ),
        );
        located = { ...fire, clean: "" };
      }
    }
    if (to === "Object")
      causes.push(
        cause(
          tx(
            "A function that needs a Roblox object received something else (a string, number or nil)",
            "Roblox objesi bekleyen bir fonksiyona başka bir şey (metin, sayı ya da nil) verildi",
          ),
          "likely",
          tx(
            'E.g. passing a name instead of the Player, or `Debris:AddItem("Part")` instead of the part.',
            'Örneğin Player yerine bir isim vermek ya da parçanın kendisi yerine `Debris:AddItem("Part")` yazmak.',
          ),
        ),
      );
    if (to === "Dictionary" || to === "Array") {
      const tw = locateRegex(ctx, /TweenService\s*:\s*Create|:\s*Create\s*\(/);
      if (tw) {
        causes.push(
          cause(
            tx(
              "TweenService:Create's third argument must be a table of goals",
              "TweenService:Create'in üçüncü değeri hedeflerden oluşan bir tablo olmalı",
            ),
            "likely",
            tx(
              "e.g. `{ Position = Vector3.new(0, 10, 0) }`.",
              "örneğin `{ Position = Vector3.new(0, 10, 0) }`.",
            ),
            true,
          ),
        );
        located = { ...tw, clean: "" };
      }
      causes.push(
        cause(
          tx(
            `A ${to === "Dictionary" ? "table with named keys" : "list"} was expected, but a ${from} was passed`,
            `${to === "Dictionary" ? "İsimli anahtarları olan bir tablo" : "Bir liste"} bekleniyordu, ama ${trType(from)} verildi`,
          ),
          "possible",
        ),
      );
    }
    if (/int64|int|double|float/i.test(to) && from === "string")
      causes.push(
        cause(
          tx(
            "A number was passed as text — use tonumber()",
            "Bir sayı metin olarak verilmiş — tonumber() kullan",
          ),
          "likely",
          tx(
            "Common with UserIds and TextBox input.",
            "UserId'lerde ve TextBox'a yazılanlarda sık olur.",
          ),
        ),
      );
    if (to === "Content")
      causes.push(
        cause(
          tx(
            'Asset IDs must be strings like "rbxassetid://123"',
            'Asset ID\'leri "rbxassetid://123" gibi bir metin olmalı',
          ),
          "likely",
        ),
      );
    if (/token|EnumItem/i.test(to))
      causes.push(
        cause(
          tx(
            "Use the Enum instead of a string, e.g. Enum.Material.Neon",
            "Metin yerine Enum kullan, örneğin Enum.Material.Neon",
          ),
          "likely",
        ),
      );
    if (causes.length === 0)
      causes.push(
        cause(
          tx(
            `A ${from} was passed where a ${to} is required`,
            `${to} gereken yere ${trType(from)} verildi`,
          ),
          "likely",
        ),
      );
    return result({
      title: tx(
        `Wrong type: ${from} given, ${to} needed`,
        `Yanlış tür: ${trType(from)} verildi, ${to} gerekiyordu`,
      ),
      severity: "Medium",
      summary: tx(
        `A Roblox function or property needed a ${to}, but got a ${from}.`,
        `Bir Roblox fonksiyonu ya da özelliği ${to} bekliyordu, ama ${trType(from)} aldı.`,
      ),
      explanation: tx(
        "Roblox converts your Luau values into engine types. It couldn't turn this value into the type the function expects, so check the order and type of the arguments you pass.",
        "Roblox, Luau değerlerini kendi türlerine çevirir. Bu değeri fonksiyonun beklediği türe çeviremedi; verdiğin değerlerin sırasını ve türünü kontrol et.",
      ),
      location: located ? locationOf(located) : undefined,
      causes: rankCauses(causes),
      steps: [
        tx(
          "Look up the function's parameter types in the docs.",
          "Fonksiyonun parametre türlerine belgelerden bak.",
        ),
        tx(
          "Print typeof(value) for each argument.",
          "Verdiğin her değer için typeof(değer) yazdır.",
        ),
      ],
      docs: docs("Instance"),
      evidence: [
        ...locationEvidence(located, ctx),
        ...(causes[0]?.confirmedInCode
          ? [
              ev(
                16,
                tx(
                  "the mismatching call was found in your code",
                  "uyuşmayan çağrı kodunda bulundu",
                ),
              ),
            ]
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
      title: tx(`"${name}" isn't a Roblox service`, `"${name}" bir Roblox servisi değil`),
      severity: "High",
      summary: tx(
        `game:GetService("${name}") failed because no service has that name${suggestion ? ` — you probably meant "${suggestion}"` : ""}.`,
        `game:GetService("${name}") başarısız oldu çünkü bu isimde bir servis yok${suggestion ? ` — muhtemelen "${suggestion}" demek istedin` : ""}.`,
      ),
      explanation: tx(
        'Service names must be spelled exactly, with capital letters (e.g. "ReplicatedStorage", "TweenService").',
        'Servis isimleri büyük harfleriyle birlikte birebir doğru yazılmalı (örneğin "ReplicatedStorage", "TweenService").',
      ),
      location: locationOf(located, name),
      causes: [
        cause(
          suggestion
            ? tx(`Typo: use "${suggestion}"`, `Yazım hatası: "${suggestion}" kullan`)
            : tx("The service name is misspelled", "Servis adı yanlış yazılmış"),
          "likely",
          undefined,
          Boolean(suggestion),
        ),
      ],
      steps: [
        tx(
          "Copy the exact name from the Explorer or the docs.",
          "Tam adı Explorer'dan ya da belgelerden kopyala.",
        ),
      ],
      fixCode: suggestion
        ? { before: located?.text, after: `local ${suggestion} = game:GetService("${suggestion}")` }
        : undefined,
      docs: docs("Instance"),
      evidence: [
        ...locationEvidence(located, ctx),
        ...(suggestion
          ? [
              ev(
                24,
                tx(
                  `"${name}" is close to "${suggestion}"`,
                  `"${name}", "${suggestion}" ile çok benzer`,
                ),
              ),
            ]
          : []),
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
      title: tx(`Instance.new("${cls}") failed`, `Instance.new("${cls}") başarısız oldu`),
      severity: "High",
      summary: isService
        ? tx(
            `${cls} is a service — get it with game:GetService("${cls}") instead of creating it.`,
            `${cls} bir servis — onu oluşturmak yerine game:GetService("${cls}") ile al.`,
          )
        : tx(
            `There is no creatable class called "${cls}"${suggestion ? ` — did you mean "${suggestion}"?` : ""}.`,
            `"${cls}" adında oluşturulabilen bir sınıf yok${suggestion ? ` — "${suggestion}" mı demek istedin?` : ""}.`,
          ),
      explanation: tx(
        "Instance.new only accepts exact class names of objects that scripts are allowed to create.",
        "Instance.new sadece scriptlerin oluşturmasına izin verilen objelerin tam sınıf adlarını kabul eder.",
      ),
      location: locationOf(located, cls),
      causes: [
        cause(
          isService
            ? tx("Services can't be created", "Servisler oluşturulamaz")
            : suggestion
              ? tx(`Typo: "${suggestion}"`, `Yazım hatası: "${suggestion}"`)
              : tx(
                  "Misspelled or non-creatable class",
                  "Yanlış yazılmış ya da oluşturulamayan bir sınıf",
                ),
          "likely",
          undefined,
          Boolean(suggestion) || isService,
        ),
      ],
      steps: [
        tx(
          "Check the class name in the docs (it's case-sensitive).",
          "Sınıf adını belgelerden kontrol et (büyük/küçük harfe duyarlıdır).",
        ),
      ],
      fixCode: isService
        ? { after: `local ${cls} = game:GetService("${cls}")` }
        : suggestion
          ? { before: located?.text, after: `Instance.new("${suggestion}")` }
          : undefined,
      docs: docs("Instance"),
      evidence: [
        ...locationEvidence(located, ctx),
        ...(suggestion || isService
          ? [ev(22, tx("known class name mix-up", "bilinen bir sınıf adı karışıklığı"))]
          : []),
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
      title: tx(`Use :${fn}() not .${fn}()`, `.${fn}() değil :${fn}() kullan`),
      severity: "Medium",
      summary: tx(
        `Roblox methods are called with a colon. Write ${q(`:${fn}(`)} instead of ${q(`.${fn}(`)}.`,
        `Roblox metotları iki nokta (:) ile çağrılır. ${q(`.${fn}(`)} yerine ${q(`:${fn}(`)} yaz.`,
      ),
      explanation: tx(
        "A colon passes the object itself into the method. `part.Destroy()` calls Destroy without telling it which part; `part:Destroy()` does.",
        "İki nokta, objenin kendisini metoda verir. `part.Destroy()` Destroy'u hangi parça olduğunu söylemeden çağırır; `part:Destroy()` ise söyler.",
      ),
      location: locationOf(located, fn),
      causes: [
        cause(
          tx(
            `${q(`.${fn}(`)} used instead of ${q(`:${fn}(`)}`,
            `${q(`:${fn}(`)} yerine ${q(`.${fn}(`)} kullanılmış`,
          ),
          "likely",
          undefined,
          Boolean(located),
        ),
      ],
      steps: [
        tx(
          "Replace the dot before the method name with a colon.",
          "Metot adından önceki noktayı iki nokta (:) ile değiştir.",
        ),
      ],
      fixCode: located
        ? {
            before: located.text,
            after: located.text.replace(new RegExp(`\\.\\s*${escapeRegExp(fn)}\\s*\\(`), `:${fn}(`),
          }
        : undefined,
      docs: docs("guideLuau"),
      evidence: [
        ...locationEvidence(located, ctx),
        ...(located
          ? [ev(20, tx("the dot-call was found in your code", "nokta ile çağrı kodunda bulundu"))]
          : []),
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
    if (loop)
      evidence.push(
        ev(
          24,
          tx(
            `the loop on line ${loop.line} never calls task.wait()`,
            `${loop.line}. satırdaki döngü hiç task.wait() çağırmıyor`,
          ),
        ),
      );
    return result({
      title: tx("Script ran too long without pausing", "Script hiç durmadan çok uzun çalıştı"),
      severity: "Critical",
      summary: tx(
        "A loop ran for about 10 seconds without ever yielding, so Roblox stopped the script to keep the game from freezing.",
        "Bir döngü hiç beklemeden yaklaşık 10 saniye çalıştı, bu yüzden Roblox oyun donmasın diye scripti durdurdu.",
      ),
      explanation: tx(
        "Roblox runs scripts one at a time. A `while true do` (or repeat) loop without task.wait() never gives anything else a turn, which freezes the game. Every endless loop needs a wait inside it.",
        "Roblox scriptleri sırayla çalıştırır. İçinde task.wait() olmayan bir `while true do` (ya da repeat) döngüsü başka hiçbir şeye sıra vermez ve oyunu dondurur. Her sonsuz döngünün içinde bir bekleme olmalı.",
      ),
      location: locationOf(located),
      causes: rankCauses([
        ...(loop
          ? [
              cause(
                tx(
                  `The loop on line ${loop.line} has no task.wait()`,
                  `${loop.line}. satırdaki döngüde task.wait() yok`,
                ),
                "likely",
                undefined,
                true,
              ),
            ]
          : []),
        cause(
          tx(
            "A `while true do` / `repeat ... until` loop without task.wait()",
            "İçinde task.wait() olmayan bir `while true do` / `repeat ... until` döngüsü",
          ),
          "likely",
        ),
        cause(
          tx(
            "A for-loop over a huge number of items (or recursion) doing heavy work in one frame",
            "Tek karede çok fazla öğe üzerinde ağır iş yapan bir for döngüsü (ya da kendini çağıran fonksiyon)",
          ),
          "possible",
          tx(
            "Split the work up and add task.wait() every few hundred iterations.",
            "İşi parçalara böl ve birkaç yüz turda bir task.wait() ekle.",
          ),
        ),
      ]),
      steps: [
        tx(
          "Add task.wait() inside every endless loop.",
          "Her sonsuz döngünün içine task.wait() ekle.",
        ),
        tx(
          "For per-frame logic use RunService.Heartbeat:Connect instead of a loop.",
          "Her karede çalışması gereken kod için döngü yerine RunService.Heartbeat:Connect kullan.",
        ),
      ],
      fixCode: {
        before: loop?.text ?? "while true do",
        after: `while true do\n\t${tx("-- your code", "-- senin kodun")}\n\ttask.wait(0.1) ${tx("-- let the game breathe", "-- oyuna nefes aldır")}\nend`,
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
            tx(
              `${q(fn[1] + "()")} calls itself${hasBase ? " — check that its stop condition is actually reached" : " with no stop condition"}`,
              `${q(fn[1] + "()")} kendini çağırıyor${hasBase ? " — durma koşuluna gerçekten ulaşılıyor mu kontrol et" : " ve hiç durma koşulu yok"}`,
            ),
            "likely",
            tx(
              "Each call waits for the next one to finish. Without an `if ... then return end` that eventually triggers, it goes on until the call stack runs out.",
              "Her çağrı bir sonrakinin bitmesini bekler. Sonunda çalışan bir `if ... then return end` olmadan bu, çağrı yığını (call stack) dolana kadar sürer.",
            ),
            true,
          ),
        );
        evidence.push(
          ev(
            hasBase ? 14 : 22,
            tx("recursive function found", "kendini çağıran fonksiyon bulundu"),
          ),
        );
      }
    }
    const idx = clean.findIndex((l) => /__index\s*=\s*function/.test(l));
    if (idx !== -1) {
      const body = clean.slice(idx, idx + 6).join("\n");
      if (/\b(\w+)\s*\[\s*\w+\s*\]/.test(body) && !/rawget/.test(body)) {
        causes.push(
          cause(
            tx(
              "An __index metamethod reads from the same table, which calls __index again",
              "Bir __index metametodu aynı tablodan okuyor, bu da __index'i tekrar çağırıyor",
            ),
            "likely",
            tx("Use rawget(t, key) inside __index.", "__index içinde rawget(t, key) kullan."),
            true,
          ),
        );
        located ??= { line: idx + 1, text: raw[idx].trim(), exact: false };
        evidence.push(ev(18, tx("__index reads its own table", "__index kendi tablosunu okuyor")));
      }
    }
    const changed = clean.findIndex((l) =>
      /\.Changed\s*:\s*Connect|GetPropertyChangedSignal/.test(l),
    );
    if (changed !== -1)
      causes.push(
        cause(
          tx(
            "A Changed handler changes the same property, which fires Changed again",
            "Bir Changed fonksiyonu aynı özelliği değiştiriyor, bu da Changed'i tekrar çalıştırıyor",
          ),
          "possible",
        ),
      );
    causes.push(
      cause(
        tx(
          "Two functions (or two modules) keep calling each other",
          "İki fonksiyon (ya da iki modül) durmadan birbirini çağırıyor",
        ),
        "possible",
      ),
    );
    return result({
      title: tx(
        "Function called itself forever (stack overflow)",
        "Fonksiyon kendini sonsuza dek çağırdı (stack overflow)",
      ),
      severity: "Critical",
      summary: tx(
        "Functions kept calling other functions (usually themselves) until Luau ran out of room to remember them.",
        "Fonksiyonlar, Luau'nun onları hatırlayacak yeri kalmayana kadar başka fonksiyonları (genelde kendilerini) çağırdı.",
      ),
      explanation: tx(
        'Every function call is stored on the "call stack" until it returns. Endless recursion keeps adding calls and never returns, so the stack overflows.',
        'Her fonksiyon çağrısı bitene kadar "çağrı yığınında" (call stack) saklanır. Sonsuz kendini çağırma durmadan çağrı ekler ve hiç bitmez, bu yüzden yığın taşar.',
      ),
      location: locationOf(located),
      causes: rankCauses(causes),
      steps: [
        tx(
          "Find the function that calls itself and add a stop condition that is definitely reached.",
          "Kendini çağıran fonksiyonu bul ve kesinlikle ulaşılan bir durma koşulu ekle.",
        ),
        tx(
          "If you need to repeat something forever, use a loop with task.wait() instead of recursion.",
          "Bir şeyi sonsuza dek tekrarlaman gerekiyorsa, kendini çağırma yerine task.wait() olan bir döngü kullan.",
        ),
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
      title: tx("An event keeps triggering itself", "Bir event durmadan kendini tetikliyor"),
      severity: "High",
      summary: tx(
        "An event handler does something that fires the same event again, over and over.",
        "Bir event fonksiyonu, aynı event'i tekrar tekrar çalıştıran bir şey yapıyor.",
      ),
      explanation: tx(
        "Example: a Changed handler that sets the same Value, or a BindableEvent handler that Fires the same event. Roblox stops it after ~80 nested levels.",
        "Örnek: aynı Value'yu değiştiren bir Changed fonksiyonu ya da aynı event'i Fire eden bir BindableEvent fonksiyonu. Roblox bunu yaklaşık 80 iç içe seviyeden sonra durdurur.",
      ),
      location: locationOf(located),
      causes: [
        cause(
          tx(
            "A handler changes the property/value it is listening to",
            "Bir fonksiyon, dinlediği özelliği/değeri değiştiriyor",
          ),
          "likely",
          tx(
            "Only update when the value is actually different, or use a guard flag.",
            "Sadece değer gerçekten farklıysa güncelle ya da bir kontrol bayrağı (flag) kullan.",
          ),
          Boolean(located),
        ),
      ],
      steps: [
        tx(
          "Add `if newValue == oldValue then return end` or a `busy` flag in the handler.",
          "Fonksiyonun içine `if newValue == oldValue then return end` ya da bir `busy` bayrağı ekle.",
        ),
      ],
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
        cause: tx(
          "`=` used in a condition — comparisons use `==`",
          "Koşulda `=` kullanılmış — karşılaştırma `==` ile yapılır",
        ),
        detail: tx(
          "`if x = 5 then` must be `if x == 5 then`.",
          "`if x = 5 then` yerine `if x == 5 then` olmalı.",
        ),
        fix: (s) => s.replace(/([^=~<>!])=([^=])/, "$1==$2"),
      },
      {
        test: /!=/,
        cause: tx("`!=` isn't Luau — use `~=`", "`!=` Luau'da yok — `~=` kullan"),
        detail: "",
        fix: (s) => s.replace(/!=/g, "~="),
      },
      {
        test: /&&|\|\|/,
        cause: tx(
          "`&&` / `||` aren't Luau — use `and` / `or`",
          "`&&` / `||` Luau'da yok — `and` / `or` kullan",
        ),
        detail: "",
        fix: (s) => s.replace(/&&/g, "and").replace(/\|\|/g, "or"),
      },
      {
        test: /^\s*\/\//,
        cause: tx(
          "`//` isn't a comment in Luau — use `--`",
          "Luau'da `//` yorum satırı değildir — `--` kullan",
        ),
        detail: "",
        fix: (s) => s.replace("//", "--"),
      },
      {
        test: /^\s*(if|elseif)\b(?!.*\bthen\b)/,
        cause: tx("`if` without `then`", "`then` olmadan `if`"),
        detail: tx(
          "Every if/elseif condition ends with `then`.",
          "Her if/elseif koşulu `then` ile biter.",
        ),
        fix: (s) => `${s.replace(/\s*$/, "")} then`,
      },
      {
        test: /^\s*(while|for)\b(?!.*\bdo\b)/,
        cause: tx("loop without `do`", "`do` olmadan döngü"),
        detail: tx("`while cond do` / `for ... do`.", "`while koşul do` / `for ... do`."),
        fix: (s) => `${s.replace(/\s*$/, "")} do`,
      },
      {
        test: /\)\s*\{\s*$/,
        cause: tx(
          "`{` used to start a code block — Luau uses `then`/`do` ... `end`",
          "Kod bloğunu başlatmak için `{` kullanılmış — Luau `then`/`do` ... `end` kullanır",
        ),
        detail: "",
        fix: (s) => s.replace(/\s*\{\s*$/, ""),
      },
      {
        test: /\w\+\+/,
        cause: tx("`++` doesn't exist — use `x += 1`", "`++` diye bir şey yok — `x += 1` kullan"),
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
    ...(specific.points
      ? [
          ev(
            specific.points,
            tx(
              "found the exact syntax slip in your code",
              "kodundaki yazım (sözdizimi) hatası tam olarak bulundu",
            ),
          ),
        ]
      : []),
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
          ? tx(
              `The '${forgot}' on line ${forgotLine} is never closed with \`end\``,
              `${forgotLine}. satırdaki '${forgot}' hiç \`end\` ile kapatılmamış`,
            )
          : tx(
              `The '${opener ?? "block"}'${openLine ? ` on line ${openLine}` : ""} is missing its \`end\``,
              `${openLine ? `${openLine}. satırdaki ` : ""}'${opener ?? "blok"}' için \`end\` eksik`,
            ),
        "likely",
        tx(
          "Each function, if, for and while needs its own end. `else if` (two words) opens a *new* if that needs an extra end — use `elseif`.",
          "Her function, if, for ve while kendi end'ine ihtiyaç duyar. `else if` (iki kelime) fazladan end isteyen *yeni* bir if açar — `elseif` kullan.",
        ),
        Boolean(forgot || openLine),
      ),
    );
    evidence.push(
      ev(
        forgot || openLine ? 16 : 6,
        tx(
          "Luau reported where the unclosed block starts",
          "Luau kapatılmayan bloğun nerede başladığını söyledi",
        ),
      ),
    );
  } else if (expected === ")") {
    causes.push(
      cause(
        tx(
          "A `(` is never closed — or a comma/`..` is missing between arguments",
          "Bir `(` hiç kapatılmamış — ya da değerler arasında virgül/`..` eksik",
        ),
        "likely",
      ),
    );
  } else if (expected === "then" || expected === "do") {
    causes.push(
      cause(
        tx(
          `Missing \`${expected}\` (or an operator mistake just before it)`,
          `\`${expected}\` eksik (ya da hemen öncesinde bir işlem hatası var)`,
        ),
        "likely",
        tx(
          "Often `=` instead of `==`, or `!=` instead of `~=`.",
          "Çoğu zaman `==` yerine `=`, ya da `~=` yerine `!=` yazılmıştır.",
        ),
      ),
    );
  } else if (expected === "=") {
    causes.push(
      cause(
        tx(
          "A line isn't a complete statement (e.g. just `x` or `a == b` on its own)",
          "Bir satır tam bir komut değil (örneğin tek başına `x` ya da `a == b`)",
        ),
        "likely",
      ),
    );
  } else {
    causes.push(
      cause(
        tx(
          `Luau expected ${q(expected)} but found ${got}`,
          `Luau ${q(expected)} bekliyordu ama ${got} buldu`,
        ),
        "likely",
      ),
    );
  }
  if (got === "<eof>")
    causes.push(
      cause(
        tx(
          "The script ends before every block is closed",
          "Script, bütün bloklar kapatılmadan bitiyor",
        ),
        "possible",
      ),
    );

  return result({
    title:
      expected === "end"
        ? tx("Missing `end`", "`end` eksik")
        : tx(`Syntax error: expected ${expected}`, `Yazım hatası: ${expected} bekleniyordu`),
    severity: "High",
    summary:
      expected === "end"
        ? tx(
            `A block${opener ? ` ('${opener}')` : ""} is never closed with \`end\`${forgotLine ? ` — check line ${forgotLine}` : openLine ? ` — it starts on line ${openLine}` : ""}.`,
            `Bir blok${opener ? ` ('${opener}')` : ""} hiç \`end\` ile kapatılmamış${forgotLine ? ` — ${forgotLine}. satırı kontrol et` : openLine ? ` — ${openLine}. satırda başlıyor` : ""}.`,
          )
        : tx(
            `Luau couldn't read the script: it expected ${q(expected)} but found ${got}.`,
            `Luau scripti okuyamadı: ${q(expected)} bekliyordu ama ${got} buldu.`,
          ),
    explanation: tx(
      "This is a syntax (spelling/grammar) error, so the whole script didn't run at all. Luau reads top to bottom and reports the first place where the code stops making sense — the real mistake is often on that line or just above it.",
      "Bu bir yazım (sözdizimi) hatası, bu yüzden scriptin hiçbir kısmı çalışmadı. Luau kodu yukarıdan aşağı okur ve kodun anlamsızlaştığı ilk yeri bildirir — asıl hata genelde o satırda ya da hemen üstündedir.",
    ),
    location: located ? locationOf(located) : undefined,
    causes: rankCauses(causes),
    steps: [
      tx(
        "Open the script — Studio underlines the problem in red.",
        "Scripti aç — Studio sorunlu yerin altını kırmızıyla çizer.",
      ),
      expected === "end"
        ? tx(
            "Match every function/if/for/while with an end (Studio's code folding arrows help).",
            "Her function/if/for/while için bir end olduğunu eşleştir (Studio'daki kod katlama okları yardımcı olur).",
          )
        : tx(
            "Look at the line and the one above it for a missing keyword, bracket or operator.",
            "O satırda ve bir üstündeki satırda eksik bir anahtar kelime, parantez ya da işaret ara.",
          ),
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
      title: tx("Syntax error", "Yazım (sözdizimi) hatası"),
      severity: "High",
      summary: incomplete
        ? tx(
            "A line doesn't do anything: it's not an assignment or a function call.",
            "Bir satır hiçbir şey yapmıyor: ne bir atama ne de bir fonksiyon çağrısı.",
          )
        : tx("Luau found a symbol it didn't expect.", "Luau beklemediği bir işaret buldu."),
      explanation: incomplete
        ? tx(
            "Luau statements must *do* something — `x = 5` or `print(x)`. A line like `x == 5`, `part.Anchored` or `true` on its own is an error.",
            "Luau'da her komut bir şey *yapmalı* — `x = 5` ya da `print(x)` gibi. Tek başına `x == 5`, `part.Anchored` ya da `true` yazan bir satır hatadır.",
          )
        : tx(
            "There's a typo in the code (an extra/missing symbol, a number like `1..2`, or a keyword in the wrong place).",
            "Kodda bir yazım hatası var (fazla/eksik bir işaret, `1..2` gibi bir sayı ya da yanlış yerde bir anahtar kelime).",
          ),
      location: located ? locationOf(located) : undefined,
      causes: rankCauses([
        ...specific.causes,
        cause(
          incomplete
            ? tx(
                "`==` used where `=` was meant (e.g. `x == 5` as a statement)",
                "`=` yerine `==` kullanılmış (örneğin tek başına `x == 5`)",
              )
            : tx(
                "A stray or missing symbol on that line",
                "O satırda fazla ya da eksik bir işaret",
              ),
          "likely",
        ),
      ]),
      steps: [
        tx("Look at the underlined line in Studio.", "Studio'da altı çizili satıra bak."),
        incomplete
          ? tx(
              "Use `=` to assign, `==` only inside conditions.",
              "Atama için `=`, sadece koşulların içinde `==` kullan.",
            )
          : tx(
              "Check brackets, quotes and commas.",
              "Parantezleri, tırnakları ve virgülleri kontrol et.",
            ),
      ],
      fixCode: specific.fix,
      docs: docs("guideLuau"),
      evidence: [
        ...locationEvidence(located, ctx),
        ...(specific.points
          ? [
              ev(
                specific.points,
                tx("found the syntax slip in your code", "kodundaki yazım hatası bulundu"),
              ),
            ]
          : []),
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
      title: tx("ModuleScript doesn't return anything", "ModuleScript hiçbir şey döndürmüyor"),
      severity: "High",
      summary: tx(
        "A ModuleScript must end with exactly one `return` (usually the module table).",
        "Bir ModuleScript tam olarak bir `return` ile bitmeli (genelde modül tablosu).",
      ),
      explanation: tx(
        "require() hands back whatever the module returns. With no return (or two values), Roblox refuses to load it.",
        "require(), modül ne döndürüyorsa onu geri verir. return yoksa (ya da iki değer döndürülüyorsa) Roblox modülü yüklemez.",
      ),
      causes: [
        cause(
          ctx.hasCode && !hasReturn
            ? tx(
                `The module never returns ${table ? q(table) : "its table"}`,
                `Modül ${table ? q(table) : "tablosunu"} hiç döndürmüyor`,
              )
            : tx(
                "The last line `return Module` is missing, or it returns more than one value",
                "Son satırdaki `return Module` eksik ya da birden fazla değer döndürülüyor",
              ),
          "likely",
          undefined,
          ctx.hasCode && !hasReturn,
        ),
      ],
      steps: [
        tx(
          "Add `return ModuleName` as the very last line of the ModuleScript.",
          "ModuleScript'in en son satırına `return ModulAdı` ekle.",
        ),
      ],
      fixCode: {
        after: `local ${table ?? "Module"} = {}\n\nfunction ${table ?? "Module"}.hello()\n\tprint("hi")\nend\n\nreturn ${table ?? "Module"}`,
      },
      docs: docs("ModuleScript"),
      evidence:
        ctx.hasCode && !hasReturn
          ? [
              ev(
                22,
                tx(
                  "no top-level return in the pasted module",
                  "yapıştırılan modülün en dışında return yok",
                ),
              ),
            ]
          : [],
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
      title: tx(
        "A required module crashed while loading",
        "require ile alınan bir modül yüklenirken çöktü",
      ),
      severity: "High",
      summary: tx(
        "require() failed because the ModuleScript itself threw an error the first time it ran.",
        "require() başarısız oldu çünkü ModuleScript ilk çalıştığında kendisi hata verdi.",
      ),
      explanation: tx(
        `This message is a side effect. The real error is printed just before it in the Output (from inside the ModuleScript).${real ? ` In your log that looks like: "${real}".` : ""} Fix that one and this goes away.`,
        `Bu mesaj bir yan etki. Asıl hata, Output'ta bunun hemen öncesinde yazar (ModuleScript'in içinden).${real ? ` Senin kayıtlarında şu: "${real}".` : ""} Onu düzeltirsen bu da kaybolur.`,
      ),
      causes: [
        cause(
          real
            ? tx(`The module error: ${real}`, `Modüldeki hata: ${real}`)
            : tx(
                "An error inside the ModuleScript's top-level code",
                "ModuleScript'in en dıştaki kodunda bir hata",
              ),
          "likely",
          tx(
            "Paste that earlier error (and the module's code) here to analyze it.",
            "Analiz etmek için o önceki hatayı (ve modülün kodunu) buraya yapıştır.",
          ),
          Boolean(real),
        ),
        cause(
          tx(
            "The module requires another module that errors",
            "Modül, hata veren başka bir modülü require ediyor",
          ),
          "possible",
        ),
      ],
      steps: [
        tx(
          "Scroll up in Output to the first red line mentioning the ModuleScript.",
          "Output'ta yukarı kaydır ve ModuleScript'ten bahseden ilk kırmızı satırı bul.",
        ),
        tx("Analyze that error on its own.", "O hatayı ayrıca analiz et."),
      ],
      docs: docs("ModuleScript"),
      evidence: real
        ? [
            ev(
              14,
              tx(
                "found the module's own error in the log",
                "modülün kendi hatası kayıtlarda bulundu",
              ),
            ),
          ]
        : [],
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
      title: tx("Two modules require each other", "İki modül birbirini require ediyor"),
      severity: "High",
      summary: tx(
        "Module A requires Module B, and Module B (directly or indirectly) requires Module A.",
        "A modülü B modülünü require ediyor, B modülü de (doğrudan ya da dolaylı olarak) A modülünü require ediyor.",
      ),
      explanation: tx(
        "Neither module can finish loading because each waits for the other.",
        "Her biri diğerini beklediği için iki modül de yüklenmeyi bitiremiyor.",
      ),
      causes: [
        cause(
          tx("Circular require() between modules", "Modüller arasında döngüsel require()"),
          "likely",
        ),
      ],
      steps: [
        tx(
          "Move the shared code into a third module both can require.",
          "Ortak kodu ikisinin de require edebileceği üçüncü bir modüle taşı.",
        ),
        tx(
          "Or require the other module lazily inside a function instead of at the top.",
          "Ya da diğer modülü en üstte değil, ihtiyaç olduğunda bir fonksiyonun içinde require et.",
        ),
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
      title: tx(
        "require() got something that isn't a ModuleScript",
        "require() ModuleScript olmayan bir şey aldı",
      ),
      severity: "High",
      summary: tx(
        `require() needs the ModuleScript object (or an asset ID)${arg ? `, but got ${q(arg)}` : ""}.`,
        `require() bir ModuleScript objesi (ya da asset ID) ister${arg ? `, ama ${q(arg)} aldı` : ""}.`,
      ),
      explanation: tx(
        "Pass the ModuleScript instance, e.g. `require(game.ReplicatedStorage.Modules.Config)`. If that path is nil (not loaded yet) or points at a Script/Folder, require fails.",
        "ModuleScript objesinin kendisini ver, örneğin `require(game.ReplicatedStorage.Modules.Config)`. O yol nil ise (henüz yüklenmediyse) ya da bir Script/Folder'ı gösteriyorsa require başarısız olur.",
      ),
      location: locationOf(located, arg),
      causes: rankCauses([
        ...(isString
          ? [
              cause(
                tx(
                  "You passed a string path — pass the ModuleScript object instead",
                  "Metin olarak bir yol verdin — onun yerine ModuleScript objesini ver",
                ),
                "likely",
                undefined,
                true,
              ),
            ]
          : []),
        cause(
          tx(
            "The path points at a Folder/Script, or at nothing (nil) because it hasn't loaded yet",
            "Yol bir Folder/Script'i ya da henüz yüklenmediği için hiçbir şeyi (nil) gösteriyor",
          ),
          "likely",
          tx(
            'On the client use :WaitForChild("ModuleName").',
            'İstemcide :WaitForChild("ModulAdı") kullan.',
          ),
        ),
      ]),
      steps: [
        tx(
          "Print the value you pass to require — it should say the ModuleScript's name.",
          "require'a verdiğin değeri yazdır — ModuleScript'in adını yazmalı.",
        ),
        tx("Use WaitForChild on the client.", "İstemcide WaitForChild kullan."),
      ],
      fixCode: {
        after:
          'local ReplicatedStorage = game:GetService("ReplicatedStorage")\nlocal Config = require(ReplicatedStorage:WaitForChild("Config"))',
      },
      docs: docs("ModuleScript", "globals"),
      evidence: [
        ...locationEvidence(located, ctx),
        ...(isString
          ? [ev(16, tx("require called with a string", "require bir metinle çağrılmış"))]
          : []),
      ],
    });
  },
};

// ---------------------------------------------------------------------------
// Remotes
// ---------------------------------------------------------------------------

const SIDE_TR: Record<string, string> = {
  client: "istemcide (client)",
  server: "sunucuda (server)",
};

const remoteWrongSide: Signature = {
  id: "remote-wrong-side",
  category: "remote",
  pattern:
    /(FireServer|InvokeServer|FireClient|FireAllClients|InvokeClient|OnServerEvent|OnClientEvent) can only be (?:called|used|fired)(?: from| on)? the (client|server)/i,
  base: 66,
  analyze: (m, ctx) => {
    const member = m[1];
    const onlyOn = m[2].toLowerCase();
    const runsOn = onlyOn === "client" ? "server" : "client";
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
      title: tx(`${member} used on the wrong side`, `${member} yanlış tarafta kullanıldı`),
      severity: "High",
      summary: tx(
        `${member} only works on the ${onlyOn}, but this code runs on the ${onlyOn === "client" ? "server" : "client"}.`,
        `${member} sadece ${SIDE_TR[onlyOn]} çalışır, ama bu kod ${SIDE_TR[runsOn]} çalışıyor.`,
      ),
      explanation: tx(
        "Remotes are one-way doors: the client talks to the server with FireServer/OnServerEvent, the server talks to clients with FireClient/OnClientEvent. A server Script (in ServerScriptService/Workspace) is the server; a LocalScript (in StarterPlayerScripts/StarterGui) is the client.",
        "Remote'lar tek yönlü kapılardır: istemci sunucuyla FireServer/OnServerEvent ile, sunucu istemcilerle FireClient/OnClientEvent ile konuşur. Bir sunucu Script'i (ServerScriptService/Workspace içinde) sunucudur; bir LocalScript (StarterPlayerScripts/StarterGui içinde) istemcidir.",
      ),
      location: locationOf(located, member),
      causes: [
        cause(
          tx(
            `This is a ${onlyOn === "client" ? "server Script" : "LocalScript"}, so it must use ${other ?? "the other side's method"}`,
            `Bu bir ${onlyOn === "client" ? "sunucu Script'i" : "LocalScript"}, bu yüzden ${other ?? "bu tarafın metodunu"} kullanmalı`,
          ),
          "likely",
          undefined,
          Boolean(located),
        ),
        cause(
          tx(
            "The script is the wrong type (Script vs LocalScript) or in the wrong place",
            "Script yanlış türde (Script ile LocalScript karışmış) ya da yanlış yerde",
          ),
          "possible",
          tx(
            "LocalScripts don't run in ServerScriptService or Workspace (unless inside a character).",
            "LocalScript'ler ServerScriptService ya da Workspace içinde çalışmaz (bir karakterin içinde değillerse).",
          ),
        ),
      ],
      steps: [
        tx(
          "Decide which side should send the message.",
          "Mesajı hangi tarafın göndermesi gerektiğine karar ver.",
        ),
        other
          ? tx(
              `On the ${onlyOn === "client" ? "server" : "client"} use ${q(other)}.`,
              `${onlyOn === "client" ? "Sunucuda" : "İstemcide"} ${q(other)} kullan.`,
            )
          : tx("Use the matching method for this side.", "Bu taraf için uygun olan metodu kullan."),
      ],
      fixCode: {
        after: tx(
          '-- LocalScript (client)\nremote:FireServer("hello")\n\n-- Script (server)\nremote.OnServerEvent:Connect(function(player, message)\n\tprint(player.Name, "says", message)\n\tremote:FireClient(player, "hi back")\nend)',
          '-- LocalScript (istemci)\nremote:FireServer("merhaba")\n\n-- Script (sunucu)\nremote.OnServerEvent:Connect(function(player, message)\n\tprint(player.Name, "diyor ki:", message)\n\tremote:FireClient(player, "sana da merhaba")\nend)',
        ),
      },
      docs: docs("guideRemote", "RemoteEvent"),
      evidence: [
        ...locationEvidence(located, ctx),
        ev(
          8,
          tx(
            `message states ${member} is ${onlyOn}-only`,
            `mesaj, ${member} için sadece ${SIDE_TR[onlyOn]} çalıştığını söylüyor`,
          ),
        ),
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
      title: tx(
        `${member} is assigned, not connected`,
        `${member} Connect ile bağlanmaz, = ile atanır`,
      ),
      severity: "High",
      summary: tx(
        `${member} isn't an event — you set it to a function with \`=\` instead of calling :Connect on it.`,
        `${member} bir event değil — üzerinde :Connect çağırmak yerine \`=\` ile ona bir fonksiyon atarsın.`,
      ),
      explanation: tx(
        `Callbacks like OnServerInvoke must return a value to the caller, so there can only be one. Write ${q(`remote.${member} = function(...) ... end`)}.`,
        `OnServerInvoke gibi geri çağırma fonksiyonları çağırana bir değer döndürmek zorundadır, bu yüzden sadece bir tane olabilir. ${q(`remote.${member} = function(...) ... end`)} yaz.`,
      ),
      location: locationOf(located, member),
      causes: [
        cause(
          tx(`${q(`${member}:Connect`)} was used`, `${q(`${member}:Connect`)} kullanılmış`),
          "likely",
          undefined,
          Boolean(located),
        ),
      ],
      steps: [
        tx(
          "Replace `:Connect(function` with ` = function` and remove the closing `)`.",
          "`:Connect(function` yerine ` = function` yaz ve sondaki `)` işaretini sil.",
        ),
      ],
      fixCode: {
        before: located?.text,
        after: `remoteFunction.${member} = function(player, ...)\n\treturn "result"\nend`,
      },
      docs: docs("RemoteFunction", "guideRemote"),
      evidence: [
        ...locationEvidence(located, ctx),
        ...(located
          ? [
              ev(
                16,
                tx(
                  ":Connect on a callback found",
                  "bir geri çağırma fonksiyonunda :Connect bulundu",
                ),
              ),
            ]
          : []),
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
      title: tx("Nobody is listening to this remote", "Bu remote'u kimse dinlemiyor"),
      severity: "Medium",
      summary: tx(
        `${m[1].trim()} was fired, but no script had connected ${m[2]} yet, so Roblox dropped the events.`,
        `${m[1].trim()} gönderildi, ama henüz hiçbir script ${m[2]} bağlamamıştı, bu yüzden Roblox event'leri attı.`,
      ),
      explanation: tx(
        "Events sent before the other side connects are queued for a short while and then thrown away.",
        "Diğer taraf bağlanmadan gönderilen event'ler kısa bir süre sırada bekletilir, sonra atılır.",
      ),
      causes: [
        cause(
          tx(
            `No ${m[2]} handler exists, or it's connected in a script that errored`,
            `${m[2]} için bir fonksiyon yok ya da hata veren bir scriptte bağlanmış`,
          ),
          "likely",
        ),
        cause(
          tx(
            "The handler connects too late (after a long WaitForChild or wait)",
            "Fonksiyon çok geç bağlanıyor (uzun bir WaitForChild ya da wait'ten sonra)",
          ),
          "possible",
        ),
      ],
      steps: [
        tx(
          `Make sure a ${m[2] === "OnClientEvent" ? "LocalScript" : "server Script"} connects ${m[2]} early.`,
          `Bir ${m[2] === "OnClientEvent" ? "LocalScript'in" : "sunucu Script'inin"} ${m[2]} event'ini erkenden bağladığından emin ol.`,
        ),
        tx(
          "Check that script's Output for errors.",
          "O scriptin Output'ta hata verip vermediğine bak.",
        ),
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
      title: tx(
        "DataStores are blocked in this Studio session",
        "Bu Studio oturumunda DataStore'lar engelli",
      ),
      severity: "Medium",
      summary: tx(
        "Studio isn't allowed to use DataStores for this place yet.",
        "Studio'nun bu oyunda DataStore kullanmasına henüz izin verilmiyor.",
      ),
      explanation: tx(
        "DataStores only work in Studio when the place is published and API access is switched on. Live servers aren't affected.",
        "DataStore'lar Studio'da sadece oyun yayınlanmışsa ve API erişimi açıksa çalışır. Canlı sunucular bundan etkilenmez.",
      ),
      causes: [
        cause(
          tx("The place hasn't been published yet", "Oyun henüz yayınlanmamış (publish)"),
          "likely",
          tx("File → Publish to Roblox.", "File → Publish to Roblox."),
        ),
        cause(
          tx(
            '"Enable Studio Access to API Services" is off',
            '"Enable Studio Access to API Services" kapalı',
          ),
          "likely",
          tx(
            "Home → Game Settings → Security → turn on Enable Studio Access to API Services.",
            "Home → Game Settings → Security → Enable Studio Access to API Services'i aç.",
          ),
        ),
      ],
      steps: [
        tx(
          "Publish the place (File → Publish to Roblox).",
          "Oyunu yayınla (File → Publish to Roblox).",
        ),
        tx(
          "Game Settings → Security → Enable Studio Access to API Services.",
          "Game Settings → Security → Enable Studio Access to API Services'i aç.",
        ),
        tx("Restart the playtest.", "Testi yeniden başlat."),
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
      title: tx("Too many DataStore requests", "Çok fazla DataStore isteği"),
      severity: "Medium",
      summary: tx(
        "The game is sending DataStore requests faster than Roblox allows, so they're being queued (and may be dropped).",
        "Oyun, Roblox'un izin verdiğinden daha hızlı DataStore isteği gönderiyor, bu yüzden istekler sıraya alınıyor (ve atılabilir).",
      ),
      explanation: tx(
        "Each server has a request budget per minute. Saving every time a stat changes, or in a fast loop, burns through it.",
        "Her sunucunun dakika başına bir istek hakkı vardır. Bir değer her değiştiğinde ya da hızlı bir döngüde kaydetmek bu hakkı hızla bitirir.",
      ),
      location: locationOf(located),
      causes: rankCauses([
        ...(loops
          ? [
              cause(
                tx(
                  "DataStore calls happen inside a loop or a Changed handler",
                  "DataStore çağrıları bir döngünün ya da bir Changed fonksiyonunun içinde yapılıyor",
                ),
                "likely",
                undefined,
                true,
              ),
            ]
          : []),
        cause(
          tx(
            "Saving on every change instead of on leave + a periodic autosave",
            "Oyuncu çıkınca + belli aralıklarla kaydetmek yerine her değişiklikte kaydediliyor",
          ),
          "likely",
        ),
        cause(
          tx(
            "Writing the same key repeatedly within a few seconds (each key has a write cooldown)",
            "Aynı anahtara birkaç saniye içinde tekrar tekrar yazılıyor (her anahtarın bir yazma bekleme süresi vardır)",
          ),
          "possible",
        ),
      ]),
      steps: [
        tx(
          "Keep player data in a table in memory while they play.",
          "Oyuncu oynarken verisini bellekteki bir tabloda tut.",
        ),
        tx(
          "Save on PlayerRemoving, in BindToClose, and every few minutes as an autosave.",
          "PlayerRemoving'de, BindToClose içinde ve birkaç dakikada bir otomatik olarak kaydet.",
        ),
        tx("Use UpdateAsync for important data.", "Önemli veriler için UpdateAsync kullan."),
      ],
      fixCode: {
        after: `${tx("-- autosave every 2 minutes instead of on every change", "-- her değişiklikte değil, 2 dakikada bir otomatik kaydet")}\ntask.spawn(function()\n\twhile true do\n\t\ttask.wait(120)\n\t\tfor _, player in game.Players:GetPlayers() do\n\t\t\tsavePlayer(player)\n\t\tend\n\tend\nend)`,
      },
      docs: docs("guideDataStores", "DataStoreService"),
      evidence: [
        ...locationEvidence(located, ctx),
        ...(loops
          ? [
              ev(
                16,
                tx(
                  "DataStore call inside a loop/Changed handler",
                  "döngü/Changed fonksiyonu içinde DataStore çağrısı",
                ),
              ),
            ]
          : []),
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
      title: tx(
        `Can't save a ${type} in a DataStore`,
        `DataStore'a bir ${trType(type)} kaydedilemez`,
      ),
      severity: "High",
      summary: tx(
        `The data you tried to save contains a ${type}, which DataStores can't store.`,
        `Kaydetmeye çalıştığın verinin içinde DataStore'ların saklayamadığı bir ${trType(type)} var.`,
      ),
      explanation: tx(
        "DataStores only save numbers, strings, booleans and tables made of those (plain lists or string-keyed dictionaries). Roblox objects (Instances), Vector3s, Color3s, CFrames, functions and mixed/number-gapped tables must be converted first.",
        "DataStore'lar sadece sayıları, metinleri, true/false değerlerini ve bunlardan oluşan tabloları (düz listeler ya da anahtarları metin olan sözlükler) kaydeder. Roblox objeleri (Instance), Vector3, Color3, CFrame, fonksiyonlar ve karışık/boşluklu tablolar önce çevrilmeli.",
      ),
      location: locationOf(located),
      causes: [
        cause(
          type === "Instance"
            ? tx(
                "You're saving an object (e.g. a Part or the Player) instead of plain data",
                "Düz veri yerine bir obje (örneğin bir Part ya da Player) kaydediyorsun",
              )
            : type === "Dictionary" || type === "Array"
              ? tx(
                  "The table mixes number and string keys, has gaps, or contains Instances/Vector3s",
                  "Tabloda sayı ve metin anahtarlar karışık, boşluklar var ya da içinde Instance/Vector3 var",
                )
              : tx(
                  `A ${type} value is inside the data`,
                  `Verinin içinde bir ${trType(type)} değeri var`,
                ),
          "likely",
        ),
      ],
      steps: [
        tx(
          "Convert values to plain data: Vector3 → {x, y, z}, Color3 → hex string, Instance → its Name.",
          "Değerleri düz veriye çevir: Vector3 → {x, y, z}, Color3 → hex metni, Instance → adı (Name).",
        ),
        tx(
          "Print the table before saving to spot the bad value.",
          "Hatalı değeri bulmak için kaydetmeden önce tabloyu yazdır.",
        ),
      ],
      fixCode: {
        after: `local function serializeVector3(v)\n\treturn { x = v.X, y = v.Y, z = v.Z }\nend\n\nlocal saveData = {\n\tCoins = coins.Value, ${tx("-- number, not the IntValue object", "-- IntValue objesi değil, sayı")}\n\tPosition = serializeVector3(root.Position),\n}`,
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
      title: tx("HTTP requests are turned off", "HTTP istekleri kapalı"),
      severity: "Medium",
      summary: tx(
        "HttpService can't send requests until you allow it in Game Settings.",
        "Game Settings'ten izin verene kadar HttpService istek gönderemez.",
      ),
      explanation: tx(
        "External HTTP is off by default for safety.",
        "Dış HTTP istekleri güvenlik için varsayılan olarak kapalıdır.",
      ),
      causes: [
        cause(tx('"Allow HTTP Requests" is disabled', '"Allow HTTP Requests" kapalı'), "likely"),
      ],
      steps: [
        tx(
          "Home → Game Settings → Security → turn on Allow HTTP Requests.",
          "Home → Game Settings → Security → Allow HTTP Requests'i aç.",
        ),
        tx("Publish/save and test again.", "Yayınla/kaydet ve tekrar test et."),
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
      title: tx("HttpService can't call roblox.com", "HttpService roblox.com'a istek gönderemez"),
      severity: "Medium",
      summary: tx(
        "Games aren't allowed to send HTTP requests to Roblox's own websites.",
        "Oyunların Roblox'un kendi sitelerine HTTP isteği göndermesine izin verilmez.",
      ),
      explanation: tx(
        "Use the in-engine services instead (MarketplaceService, GroupService, Players, BadgeService…), or a proxy/Open Cloud from your own backend.",
        "Bunun yerine oyun içi servisleri (MarketplaceService, GroupService, Players, BadgeService…) ya da kendi sunucundan bir proxy/Open Cloud kullan.",
      ),
      causes: [
        cause(
          tx("The URL points at a roblox.com domain", "URL bir roblox.com adresini gösteriyor"),
          "likely",
        ),
      ],
      steps: [
        tx(
          "Look for an in-engine service that gives the same data.",
          "Aynı veriyi veren bir oyun içi servis ara.",
        ),
        tx(
          "If you really need a web API, route it through your own server.",
          "Gerçekten bir web API'sine ihtiyacın varsa, isteği kendi sunucun üzerinden geçir.",
        ),
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
          tx(
            "JSONDecode was given text that isn't JSON (often an HTML error page or empty body)",
            "JSONDecode'a JSON olmayan bir metin verildi (çoğu zaman bir HTML hata sayfası ya da boş bir cevap)",
          ),
          "likely",
          tx(
            "Print the raw response before decoding.",
            "Çözmeden (decode) önce gelen cevabı olduğu gibi yazdır.",
          ),
        ),
      );
    if (limit)
      causes.push(
        cause(
          tx(
            "Too many requests — HttpService allows about 500 per minute per server, and the remote site may limit you too",
            "Çok fazla istek — HttpService sunucu başına dakikada yaklaşık 500 isteğe izin verir, karşıdaki site de seni sınırlayabilir",
          ),
          "likely",
        ),
      );
    if (code === 401 || code === 403)
      causes.push(
        cause(
          tx(
            "The server refused the request (missing/invalid API key, or the site blocks Roblox servers)",
            "Sunucu isteği reddetti (API anahtarı eksik/geçersiz ya da site Roblox sunucularını engelliyor)",
          ),
          "likely",
        ),
      );
    if (code === 404) causes.push(cause(tx("The URL is wrong", "URL yanlış"), "likely"));
    if (code === 400)
      causes.push(
        cause(
          tx(
            "The request body/headers are wrong (e.g. Content-Type or JSON shape)",
            "İsteğin gövdesi/başlıkları yanlış (örneğin Content-Type ya da JSON'un yapısı)",
          ),
          "likely",
        ),
      );
    if (code && code >= 500)
      causes.push(
        cause(
          tx("The remote server is having problems", "Karşıdaki sunucuda sorun var"),
          "likely",
          tx("Retry later with backoff.", "Biraz bekleyip tekrar dene."),
        ),
      );
    return result({
      title: json
        ? tx("Response isn't valid JSON", "Gelen cevap geçerli bir JSON değil")
        : limit
          ? tx("HTTP rate limit hit", "HTTP istek sınırına ulaşıldı")
          : tx(`HTTP ${code} error`, `HTTP ${code} hatası`),
      severity: "Medium",
      summary: json
        ? tx(
            "HttpService:JSONDecode failed because the text isn't JSON.",
            "HttpService:JSONDecode başarısız oldu çünkü metin JSON değil.",
          )
        : tx(
            `The web server answered with ${code ?? "an error"}${m[2] ? ` (${m[2]})` : ""}.`,
            `Web sunucusu ${code ?? "bir hata"} ile cevap verdi${m[2] ? ` (${m[2]})` : ""}.`,
          ),
      explanation: tx(
        "HTTP errors come from the website you called, not from your Luau. Always wrap requests in pcall and check the response.",
        "HTTP hataları senin Luau kodundan değil, istek gönderdiğin siteden gelir. İstekleri her zaman pcall içine al ve cevabı kontrol et.",
      ),
      causes: rankCauses(
        causes.length
          ? causes
          : [
              cause(
                tx(
                  "The request failed on the remote server",
                  "İstek karşıdaki sunucuda başarısız oldu",
                ),
                "likely",
              ),
            ],
      ),
      steps: [
        tx("Wrap the call in pcall.", "Çağrıyı pcall içine al."),
        tx(
          "Print the full response (RequestAsync gives StatusCode and Body).",
          "Gelen cevabın tamamını yazdır (RequestAsync, StatusCode ve Body verir).",
        ),
      ],
      fixCode: {
        after: `local HttpService = game:GetService("HttpService")\nlocal ok, response = pcall(function()\n\treturn HttpService:RequestAsync({ Url = url, Method = "GET" })\nend)\nif ok and response.Success then\n\tlocal data = HttpService:JSONDecode(response.Body)\nelse\n\twarn("${tx("HTTP failed:", "HTTP başarısız:")}", ok and response.StatusCode or response)\nend`,
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
      title: tx(`Tween goal ${prop} has the wrong type`, `Tween hedefindeki ${prop} yanlış türde`),
      severity: "Medium",
      summary: tx(
        `${prop} is a ${want}, but the tween goal gives it a ${got}.`,
        `${prop} bir ${trType(want)}, ama tween hedefi ona bir ${trType(got)} veriyor.`,
      ),
      explanation: tx(
        `Tween goals must use the same type as the property. For ${prop} build a ${want}${example[want] ? `, e.g. ${q(example[want])}` : ""}.`,
        `Tween hedefleri özellikle aynı türde olmalı. ${prop} için bir ${trType(want)} oluştur${example[want] ? `, örneğin ${q(example[want])}` : ""}.`,
      ),
      location: locationOf(located, prop),
      causes: [
        cause(
          want === "UDim2" && got === "Vector3"
            ? tx(
                "GUI sizes/positions use UDim2, not Vector3",
                "Arayüz boyutları/konumları Vector3 değil UDim2 kullanır",
              )
            : want === "Color3"
              ? tx(
                  "Color properties need Color3 (not BrickColor or a string)",
                  "Renk özellikleri Color3 ister (BrickColor ya da metin değil)",
                )
              : tx(
                  `The goal value is a ${got} instead of a ${want}`,
                  `Hedef değer ${trType(want)} yerine ${trType(got)}`,
                ),
          "likely",
          undefined,
          Boolean(located),
        ),
      ],
      steps: [tx(`Change the goal to a ${want}.`, `Hedefi bir ${trType(want)} yap.`)],
      fixCode: example[want]
        ? { before: located?.text, after: `{ ${prop} = ${example[want]} }` }
        : undefined,
      docs: docs(
        "TweenService",
        want === "UDim2" ? "UDim2" : want === "Vector3" ? "Vector3" : "TweenInfo",
      ),
      evidence: [
        ...locationEvidence(located, ctx),
        ev(
          10,
          tx(
            "tween property and types are named in the message",
            "mesajda tween özelliği ve türler yazıyor",
          ),
        ),
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
      title: tx(`${obj} has no property "${prop}"`, `${obj} objesinde "${prop}" özelliği yok`),
      severity: "Medium",
      summary: tx(
        `The tween goal uses ${q(prop)}, which doesn't exist on ${q(obj)}${suggestion ? ` — did you mean ${q(suggestion)}?` : ""}.`,
        `Tween hedefi ${q(prop)} kullanıyor, ama ${q(obj)} içinde böyle bir özellik yok${suggestion ? ` — ${q(suggestion)} mı demek istedin?` : ""}.`,
      ),
      explanation: tx(
        "Goal keys must be real property names of the object you tween (case-sensitive).",
        "Hedefteki anahtarlar, tween uyguladığın objenin gerçek özellik adları olmalı (büyük/küçük harfe duyarlı).",
      ),
      location: locationOf(located, prop),
      causes: [
        cause(
          suggestion
            ? tx(`Typo: ${q(suggestion)}`, `Yazım hatası: ${q(suggestion)}`)
            : tx(
                "Misspelled property, or you're tweening the wrong object (e.g. a Model instead of a Part)",
                "Özellik yanlış yazılmış ya da yanlış objeye tween uyguluyorsun (örneğin Part yerine Model)",
              ),
          "likely",
          tx(
            "Models can't be tweened directly — tween a CFrameValue and PivotTo, or tween the PrimaryPart of a welded model.",
            "Modellere doğrudan tween uygulanamaz — bir CFrameValue'ya tween uygulayıp PivotTo kullan ya da kaynaklı (weld) bir modelin PrimaryPart'ına tween uygula.",
          ),
          Boolean(suggestion),
        ),
      ],
      steps: [
        tx(
          "Check the object's Properties window for the exact name.",
          "Tam adı objenin Properties penceresinden kontrol et.",
        ),
      ],
      docs: docs("TweenService"),
      evidence: [
        ...locationEvidence(located, ctx),
        ...(suggestion
          ? [
              ev(
                16,
                tx(
                  `"${prop}" is close to "${suggestion}"`,
                  `"${prop}", "${suggestion}" ile çok benzer`,
                ),
              ),
            ]
          : []),
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
      title: tx(
        "Loading an animation on a character that isn't in the game",
        "Oyunda olmayan bir karaktere animasyon yüklenmeye çalışıldı",
      ),
      severity: "Medium",
      summary: tx(
        "LoadAnimation ran on a Humanoid/Animator that isn't in Workspace (the character was removed or hasn't been parented yet).",
        "LoadAnimation, Workspace'te olmayan bir Humanoid/Animator üzerinde çalıştı (karakter silinmiş ya da henüz Workspace'e konmamış).",
      ),
      explanation: tx(
        "Animations can only load on characters that are in the game. Right after CharacterAdded, or after the player dies, the character may not be parented to Workspace.",
        "Animasyonlar sadece oyunda bulunan karakterlere yüklenebilir. CharacterAdded'ın hemen ardından ya da oyuncu öldükten sonra karakter Workspace'te olmayabilir.",
      ),
      location: locationOf(located),
      causes: [
        cause(
          tx(
            "The script uses an old character after the player died/respawned",
            "Script, oyuncu ölüp yeniden doğduktan sonra eski karakteri kullanıyor",
          ),
          "likely",
        ),
        cause(
          tx(
            "It runs in CharacterAdded before the character is parented to Workspace",
            "Kod, karakter Workspace'e konmadan önce CharacterAdded içinde çalışıyor",
          ),
          "possible",
          tx(
            'Wait until `character.Parent` is set, or use `character:WaitForChild("Humanoid"):WaitForChild("Animator")`.',
            '`character.Parent` atanana kadar bekle ya da `character:WaitForChild("Humanoid"):WaitForChild("Animator")` kullan.',
          ),
        ),
      ],
      steps: [
        tx(
          "Get the Animator fresh every time the character spawns.",
          "Karakter her doğduğunda Animator'ı yeniden al.",
        ),
        tx(
          "Load animations on the Animator (Humanoid:LoadAnimation is deprecated).",
          "Animasyonları Animator'a yükle (Humanoid:LoadAnimation artık kullanılmıyor).",
        ),
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
      title: tx("Too many animation tracks loaded", "Çok fazla animasyon yüklendi"),
      severity: "Medium",
      summary: tx(
        "The same animation is loaded over and over (for example on every click) instead of once.",
        "Aynı animasyon bir kez yerine tekrar tekrar yükleniyor (örneğin her tıklamada).",
      ),
      explanation: tx(
        "Each LoadAnimation call creates a new track that stays on the Animator. Load each animation once, keep the track in a variable, and call :Play() on it.",
        "Her LoadAnimation çağrısı Animator'da kalan yeni bir track oluşturur. Her animasyonu bir kez yükle, track'i bir değişkende tut ve onun üzerinde :Play() çağır.",
      ),
      location: locationOf(located),
      causes: [
        cause(
          tx(
            "LoadAnimation is inside an event handler or loop",
            "LoadAnimation bir event fonksiyonunun ya da döngünün içinde",
          ),
          "likely",
          undefined,
          Boolean(located),
        ),
      ],
      steps: [
        tx(
          "Move LoadAnimation outside the handler and reuse the track.",
          "LoadAnimation'ı fonksiyonun dışına taşı ve aynı track'i tekrar kullan.",
        ),
      ],
      fixCode: {
        after: `local track = animator:LoadAnimation(animation) ${tx("-- once", "-- bir kez")}\n\ntool.Activated:Connect(function()\n\ttrack:Play() ${tx("-- reuse", "-- tekrar kullan")}\nend)`,
      },
      docs: docs("Animator"),
      evidence: locationEvidence(located, ctx),
    });
  },
};

const ASSET_KIND_TR: Record<string, string> = {
  animation: "Animasyon",
  sound: "Ses",
  mesh: "Mesh",
  image: "Resim",
  texture: "Doku (texture)",
  asset: "İçerik (asset)",
};

const assetFailed: Signature = {
  id: "asset-failed",
  category: "asset",
  pattern:
    /Failed to load (animation|sound|mesh|image|texture|asset)[^\n]*?(rbxassetid:\/\/\d+|\d{5,})?/i,
  base: 58,
  analyze: (m) => {
    const kind = m[1].toLowerCase();
    const kindTr = ASSET_KIND_TR[kind] ?? kind;
    return result({
      title: tx(`${kind[0].toUpperCase()}${kind.slice(1)} failed to load`, `${kindTr} yüklenemedi`),
      severity: "Low",
      summary: tx(
        `Roblox couldn't load the ${kind}${m[2] ? ` ${m[2]}` : ""}.`,
        `Roblox bu içeriği yükleyemedi: ${kindTr.toLocaleLowerCase("tr")}${m[2] ? ` ${m[2]}` : ""}.`,
      ),
      explanation:
        kind === "animation"
          ? tx(
              "Animations only play in experiences owned by the same user or group that owns the animation. It also fails if the ID is wrong or the animation is still being moderated.",
              "Animasyonlar sadece, animasyonun sahibi olan kullanıcı ya da gruba ait oyunlarda oynar. ID yanlışsa ya da animasyon hâlâ inceleniyorsa (moderasyon) da başarısız olur.",
            )
          : tx(
              "The asset ID may be wrong, private, deleted or still in moderation, or the experience doesn't have permission to use it.",
              "Asset ID'si yanlış, gizli, silinmiş ya da hâlâ inceleniyor olabilir; ya da oyunun onu kullanma izni yoktur.",
            ),
      causes:
        kind === "animation"
          ? [
              cause(
                tx(
                  "The animation is owned by a different account/group than the experience",
                  "Animasyonun sahibi, oyunun sahibinden farklı bir hesap/grup",
                ),
                "likely",
                tx(
                  "Re-upload it under the owner of the game (e.g. the group).",
                  "Animasyonu oyunun sahibi (örneğin grup) adına tekrar yükle.",
                ),
              ),
              cause(
                tx(
                  "Wrong ID (copied the catalog/website ID instead of the asset ID)",
                  "Yanlış ID (asset ID'si yerine katalog/site ID'si kopyalanmış)",
                ),
                "possible",
              ),
            ]
          : [
              cause(
                tx(
                  "Wrong, private or moderated asset ID",
                  "Yanlış, gizli ya da moderasyona takılmış asset ID'si",
                ),
                "likely",
              ),
              cause(
                tx(
                  "The experience doesn't have permission to use the asset",
                  "Oyunun bu içeriği kullanma izni yok",
                ),
                "possible",
              ),
            ],
      steps: [
        tx(
          "Check the ID in the Creator Dashboard / Toolbox.",
          "ID'yi Creator Dashboard / Toolbox'tan kontrol et.",
        ),
        tx(
          "Make sure the owner of the asset matches the owner of the experience (or the asset is public).",
          "İçeriğin sahibinin oyunun sahibiyle aynı olduğundan (ya da içeriğin herkese açık olduğundan) emin ol.",
        ),
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
      title: tx(
        `Resumed a ${m[1]} coroutine`,
        m[1] === "dead"
          ? "Bitmiş bir coroutine devam ettirilmeye çalışıldı"
          : "Zaten çalışan bir coroutine devam ettirilmeye çalışıldı",
      ),
      severity: "Medium",
      summary:
        m[1] === "dead"
          ? tx(
              "A coroutine that already finished was resumed (or a coroutine.wrap function was called again).",
              "Zaten bitmiş bir coroutine devam ettirildi (ya da bir coroutine.wrap fonksiyonu tekrar çağrıldı).",
            )
          : tx(
              "A coroutine was resumed while it was already running.",
              "Bir coroutine zaten çalışırken tekrar devam ettirildi.",
            ),
      explanation: tx(
        "A coroutine can only run once to completion. To start code in parallel each time, use task.spawn(fn) instead of keeping an old coroutine around.",
        "Bir coroutine baştan sona sadece bir kez çalışabilir. Kodu her seferinde paralel başlatmak için eski bir coroutine'i saklamak yerine task.spawn(fn) kullan.",
      ),
      causes: [
        cause(
          tx(
            "A coroutine.wrap/create result is stored and called more than once",
            "Bir coroutine.wrap/create sonucu saklanıp birden fazla kez çağrılıyor",
          ),
          "likely",
        ),
      ],
      steps: [
        tx(
          "Replace coroutine.wrap(fn)() with task.spawn(fn).",
          "coroutine.wrap(fn)() yerine task.spawn(fn) kullan.",
        ),
      ],
      fixCode: {
        after: `task.spawn(function()\n\t${tx("-- runs in parallel, every time this line runs", "-- bu satır her çalıştığında paralel olarak çalışır")}\nend)`,
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
      title: tx(
        "Yielded where waiting isn't allowed",
        "Beklemeye izin verilmeyen bir yerde beklendi",
      ),
      severity: "Medium",
      summary: tx(
        "Code tried to wait (task.wait, WaitForChild, :Wait(), *Async calls) inside a place that can't pause.",
        "Kod, duraklayamayan bir yerin içinde beklemeye çalıştı (task.wait, WaitForChild, :Wait(), *Async çağrıları).",
      ),
      explanation: tx(
        "Metamethods (__index…), table.sort comparators and string.gsub callbacks must finish instantly. Waiting inside them isn't allowed.",
        "Metametotlar (__index…), table.sort karşılaştırma fonksiyonları ve string.gsub fonksiyonları anında bitmek zorundadır. İçlerinde beklemeye izin verilmez.",
      ),
      location: locationOf(located),
      causes: [
        cause(
          tx(
            "A yielding call inside a metamethod, sort comparator or gsub callback",
            "Bir metametodun, sort karşılaştırma fonksiyonunun ya da gsub fonksiyonunun içinde bekleyen bir çağrı",
          ),
          "likely",
        ),
      ],
      steps: [
        tx(
          "Fetch what you need before the sort/metamethod runs, then use the cached value inside it.",
          "İhtiyacın olan şeyi sort/metametot çalışmadan önce al, sonra içinde bu saklanan değeri kullan.",
        ),
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
      title: tx("Changed a frozen table", "Dondurulmuş (freeze) bir tablo değiştirildi"),
      severity: "Medium",
      summary: tx(
        "The table is read-only (frozen), so it can't be changed.",
        "Tablo salt okunur (dondurulmuş), bu yüzden değiştirilemez.",
      ),
      explanation: tx(
        "table.freeze makes a table read-only — often used for config modules. Make a copy with table.clone(t) and change the copy.",
        "table.freeze bir tabloyu salt okunur yapar — genelde ayar (config) modüllerinde kullanılır. table.clone(t) ile bir kopyasını al ve kopyayı değiştir.",
      ),
      causes: [
        cause(
          frozen
            ? tx("Your code calls table.freeze on it", "Kodun ona table.freeze uyguluyor")
            : tx(
                "The table (often a shared config module) was frozen with table.freeze",
                "Tablo (genelde ortak bir ayar modülü) table.freeze ile dondurulmuş",
              ),
          "likely",
          undefined,
          frozen,
        ),
      ],
      steps: [
        tx(
          "Use `local copy = table.clone(frozenTable)` and change the copy.",
          "`local copy = table.clone(frozenTable)` kullan ve kopyayı değiştir.",
        ),
      ],
      docs: docs("table"),
      evidence: frozen
        ? [ev(14, tx("table.freeze found in the code", "kodda table.freeze bulundu"))]
        : [],
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
      title: tx("Teleport failed", "Işınlanma (teleport) başarısız oldu"),
      severity: "Low",
      summary: tx(
        "TeleportService couldn't send the player to the other place.",
        "TeleportService oyuncuyu diğer yere gönderemedi.",
      ),
      explanation: tx(
        "Teleports don't work in Studio playtests. In live games the target place must be part of the same experience (or public), and teleports can fail temporarily — retry with pcall.",
        "Işınlanma Studio testlerinde çalışmaz. Canlı oyunlarda hedef yer aynı oyunun parçası (ya da herkese açık) olmalı; ışınlanma geçici olarak da başarısız olabilir — pcall ile tekrar dene.",
      ),
      causes: [
        cause(
          tx("Testing in Studio", "Studio'da test ediliyor"),
          "likely",
          tx("Test teleports in a live server.", "Işınlanmayı canlı bir sunucuda test et."),
        ),
        cause(
          tx(
            "The place ID isn't in this experience or isn't published",
            "Yer (place) ID'si bu oyunda değil ya da yayınlanmamış",
          ),
          "possible",
        ),
      ],
      steps: [
        tx("Test in a live game.", "Canlı bir oyunda test et."),
        tx(
          "Wrap TeleportAsync in pcall and retry on failure.",
          "TeleportAsync'i pcall içine al ve başarısız olursa tekrar dene.",
        ),
      ],
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

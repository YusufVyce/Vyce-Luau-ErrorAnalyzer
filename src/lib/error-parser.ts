import { ROBLOX_INSIGHTS } from "./roblox/insights";
import { ROBLOX_DEPRECATED } from "./roblox/deprecated";
import { ROBLOX_PERFORMANCE } from "./roblox/performance";
import { ROBLOX_SECURITY } from "./roblox/security";
import { INFINITE_YIELD } from "./roblox/errors/infiniteYield";
import { ATTEMPT_TO_INDEX_NIL } from "./roblox/errors/attemptToIndexNil";
import { ATTEMPT_TO_CALL_NIL } from "./roblox/errors/callNil";
import { INVALID_ARGUMENT } from "./analyzer/roblox/errors/invalidArgument";
import { ARITHMETIC_ON_NIL } from "./roblox/errors/arithmeticOnNil";
import { INVALID_MEMBER } from "./roblox/errors/invalidMember";
import { MODULE_RETURN } from "./roblox/errors/moduleReturn";
import { REMOTE_NETWORKING } from "./roblox/errors/remoteNetworking";
import { DATASTORE_ERROR } from "./roblox/errors/dataStore";
import { CANNOT_CAST } from "./roblox/errors/cannotCast";
import { SCRIPT_TIMEOUT } from "./roblox/errors/scriptTimeout";
import { PARENT_LOCKED } from "./roblox/errors/parentLocked";
import { HTTP_SERVICE } from "./roblox/errors/httpService";
import { MEMORY_LEAK } from "./roblox/errors/memoryLeak";
import { ATTEMPT_TO_CONCATENATE_NIL } from "./roblox/errors/attemptToConcatenateNil";
import { ATTEMPT_TO_COMPARE_NIL } from "./roblox/errors/attemptToCompareNil";
import { ARITHMETIC_ON_BOOLEAN } from "./roblox/errors/attemptToPerformArithmeticOnBoolean";
import { ARITHMETIC_ON_STRING } from "./roblox/errors/attemptToPerformArithmeticOnString";
import { TABLE_INDEX_IS_NIL } from "./roblox/errors/tableIndexIsNil";
import { INVALID_TYPE } from "./roblox/errors/invalidType";
import { INVALID_ENUM } from "./roblox/errors/invalidEnum";
import { INVALID_KEY } from "./roblox/errors/invalidKey";
import { STACK_OVERFLOW } from "./roblox/errors/stackOverflow";
import { C_STACK_OVERFLOW } from "./roblox/errors/cStackOverflow";
import { ATTEMPT_TO_INDEX_STRING } from "./analyzer/roblox/errors/attemptToIndexString";
import { ATTEMPT_TO_INDEX_NUMBER } from "./analyzer/roblox/errors/attemptToIndexNumber";
import { METAMETHOD_YIELD } from "./analyzer/roblox/errors/metamethodYield";
import { CYCLIC_REFERENCE } from "./analyzer/roblox/errors/cyclicReference";
import { NOT_A_FUNCTION } from "./analyzer/roblox/errors/notAFunction";
import { ARGUMENT_NIL } from "./analyzer/roblox/errors/argumentNil";
import { EXPECTED_IDENTIFIER } from "./analyzer/roblox/errors/expectedIdentifier";
import { INVALID_SERVICE } from "./analyzer/roblox/errors/invalidService";
import { DEAD_COROUTINE } from "./analyzer/roblox/errors/deadCoroutine";
import { INVALID_CLASS_NAME } from "./analyzer/roblox/errors/invalidClassName";
import { MALFORMED_PATTERN_ERROR } from "./analyzer/roblox/errors/malformedPattern";
import { CYCLIC_PARENTING } from "./analyzer/roblox/errors/cyclicParenting";
import { NAMING_TYPO } from "./analyzer/roblox/errors/namingTypo";
import type {
  Analysis,
  Cause,
  CodeInsight,
  DeprecatedApi,
  ErrorEntry,
} from "./types";
export const ERROR_DICT: ErrorEntry[] = [
  ATTEMPT_TO_INDEX_NIL,
  ATTEMPT_TO_INDEX_STRING,
  ATTEMPT_TO_INDEX_NUMBER,
  CYCLIC_PARENTING,
  NAMING_TYPO,
  METAMETHOD_YIELD,
  CYCLIC_REFERENCE,
  NOT_A_FUNCTION,
  ARGUMENT_NIL,
  EXPECTED_IDENTIFIER,
  INVALID_SERVICE,
  DEAD_COROUTINE,
  INVALID_CLASS_NAME,
  ATTEMPT_TO_CONCATENATE_NIL,
  ATTEMPT_TO_COMPARE_NIL,
  INFINITE_YIELD,
  ATTEMPT_TO_CALL_NIL,
  INVALID_ARGUMENT,
  MALFORMED_PATTERN_ERROR,
  ARITHMETIC_ON_NIL,
  ARITHMETIC_ON_BOOLEAN,
  ARITHMETIC_ON_STRING,
  TABLE_INDEX_IS_NIL,
  INVALID_TYPE,
  INVALID_ENUM,
  INVALID_KEY,
  C_STACK_OVERFLOW,
  STACK_OVERFLOW,
  INVALID_MEMBER,
  MODULE_RETURN,
  REMOTE_NETWORKING,
  DATASTORE_ERROR,
  CANNOT_CAST,
  SCRIPT_TIMEOUT,
  PARENT_LOCKED,
  HTTP_SERVICE,
  MEMORY_LEAK,
];

export type MatchResult = {
  entry: ErrorEntry;
  match: string;

  confidence: number;
  matchType: "pattern" | "alias";
};

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/['"`]/g, "")
    .replace(/[()[\]{}]/g, " ")
    .replace(/[:.,]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function similarity(a: string, b: string): number {
  const aWords = normalize(a).split(" ");
  const bWords = normalize(b).split(" ");

  let matches = 0;

  for (const word of bWords) {
    if (aWords.includes(word)) {
      matches++;
    }
  }

  return matches / bWords.length;
}

export function findMatch(
  logText: string,
): MatchResult | null {

  // 1. Önce normal regex kontrolü
  for (const entry of ERROR_DICT) {

    const match = logText.match(entry.pattern);

    if (match) {
      return {
  entry,
  match: match[0],

  confidence: 100,
  matchType: "pattern",
};
    }

  }

  // 2. Eğer regex bulamazsa alias'lara bak
  let bestMatch: MatchResult | null = null;
  let bestScore = 0;

  for (const entry of ERROR_DICT) {

    if (!entry.aliases) continue;

    for (const alias of entry.aliases) {

      const score = similarity(logText, alias);

      if (score > bestScore) {
        bestScore = score;

        bestMatch = {
  entry,
  match: alias,

  confidence: Math.round(score * 100),
  matchType: "alias",
};
      }

    }

  }

  // %60 ve üzeri benzerlik yeterli
  if (bestScore >= 0.6) {
    return bestMatch;
  }

  return null;
}

export const EXAMPLES: {
  error: string;
  code: string;
}[] = [
  {
    error: "ServerScriptService.Inventory:41: attempt to index nil with 'Value'",
    code:
      "local player = game.Players.LocalPlayer\nlocal leaderstats = player.leaderstats\nlocal coins = leaderstats.Coins\n\nprint(coins.Value)",
  },
];

export { PLATFORM_FIX_SNIPPETS } from "./platform-fixes";

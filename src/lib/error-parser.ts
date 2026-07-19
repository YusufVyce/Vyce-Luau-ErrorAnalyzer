import { ROBLOX_INSIGHTS } from "./roblox/insights";
import { ROBLOX_DEPRECATED } from "./roblox/deprecated";
import { ROBLOX_PERFORMANCE } from "./roblox/performance";
import { ROBLOX_SECURITY } from "./roblox/security";
import { INFINITE_YIELD } from "./roblox/errors/infiniteYield";
import { ATTEMPT_TO_INDEX_NIL } from "./roblox/errors/attemptToIndexNil";
import { ATTEMPT_TO_CALL_NIL } from "./roblox/errors/callNil";
import { INVALID_ARGUMENT } from "./roblox/errors/invalidArgument";
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
import type {
  Analysis,
  Cause,
  CodeInsight,
  DeprecatedApi,
  ErrorEntry,
} from "./types";
export const ERROR_DICT: ErrorEntry[] = [
  ATTEMPT_TO_INDEX_NIL,
  INFINITE_YIELD,
  ATTEMPT_TO_CALL_NIL,
  INVALID_ARGUMENT,
  ARITHMETIC_ON_NIL,
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
};

export function findMatch(
  logText: string,
): MatchResult | null {

  for (const entry of ERROR_DICT) {

    const match = logText.match(entry.pattern);

    if (match) {
      return {
        entry,
        match: match[0],
      };
    }

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

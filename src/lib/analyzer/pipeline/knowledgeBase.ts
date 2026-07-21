import type { DiagnosticKnowledge, ErrorFamily } from "./types";

const DOMAIN_APIS: Record<string, string[]> = {
  Networking: ["RemoteEvent", "RemoteFunction", "FireServer", "FireClient", "InvokeServer", "InvokeClient"],
  Replication: ["WaitForChild", "FindFirstChild", "StreamingEnabled", "ReplicatedStorage"],
  Physics: ["BasePart", "AssemblyLinearVelocity", "CollisionGroup", "Raycast"],
  Constraints: ["HingeConstraint", "SpringConstraint", "BallSocketConstraint"],
  Animation: ["AnimationTrack", "Humanoid:LoadAnimation", "Animator"],
  Pathfinding: ["PathfindingService", "ComputeAsync"],
  DataStore: ["GetAsync", "SetAsync", "UpdateAsync", "GetRequestBudgetForRequestType"],
  Memory: ["collectgarbage", "Connection:Disconnect", "Destroy"],
  Events: ["Changed", "GetPropertyChangedSignal", "Connect"],
  Signals: ["BindableEvent", "BindableFunction"],
  UI: ["GuiObject", "TextLabel", "TextButton", "Size"],
  TweenService: ["TweenService:Create", "TweenInfo", "Play"],
  Humanoid: ["Humanoid", "MoveToFinished", "Health"],
  Character: ["CharacterAdded", "CharacterAppearanceLoaded", "HumanoidRootPart"],
  Camera: ["CurrentCamera", "CFrame", "FieldOfView"],
  Input: ["UserInputService", "ContextActionService"],
  Marketplace: ["MarketplaceService", "PromptProductPurchase"],
  Teleport: ["TeleportService", "TeleportAsync"],
  MessagingService: ["MessagingService:PublishAsync", "SubscribeAsync"],
  MemoryStore: ["MemoryStoreService", "GetQueue", "GetSortedMap"],
  Attributes: ["SetAttribute", "GetAttribute", "GetAttributes"],
  CollectionService: ["CollectionService:AddTag", "GetTagged"],
  Instances: ["Instance.new", "Parent", "Destroy"],
  Plugin: ["plugin", "PluginToolbar", "CreateDockWidgetPluginGui"],
  Terrain: ["Terrain:ReadVoxels", "WriteVoxels"],
  CSG: ["UnionAsync", "SubtractAsync"],
  Raycast: ["workspace:Raycast", "RaycastParams"],
  CollisionGroups: ["PhysicsService", "CollisionGroupSetCollidable"],
  HttpService: ["HttpService:GetAsync", "PostAsync", "JSONEncode", "JSONDecode"],
  Serialization: ["HttpService:JSONEncode", "table.clone", "table.freeze"],
};

const FAMILIES: Array<{ family: ErrorFamily; triggers: string[]; title: string }> = [
  { family: "CALL_NIL", triggers: ["attempt to call a nil value"], title: "Call on Nil" },
  { family: "INDEX_NIL", triggers: ["attempt to index nil"], title: "Index on Nil" },
  { family: "CONCAT_NIL", triggers: ["attempt to concatenate nil"], title: "Concatenate Nil" },
  { family: "ARITHMETIC_NIL", triggers: ["attempt to perform arithmetic on nil"], title: "Arithmetic on Nil" },
  { family: "COMPARE_NIL", triggers: ["attempt to compare nil"], title: "Compare Nil" },
  { family: "INVALID_ARGUMENT", triggers: ["invalid argument"], title: "Invalid Argument" },
  { family: "INVALID_MEMBER", triggers: ["not a valid member"], title: "Invalid Member" },
  { family: "INVALID_TYPE", triggers: ["unable to cast"], title: "Invalid Type" },
  { family: "WAIT", triggers: ["waitforchild", "infinite yield"], title: "Wait/Race Condition" },
  { family: "REMOTE", triggers: ["fireserver", "fireclient"], title: "Remote Boundary" },
  { family: "DATASTORE", triggers: ["setasync", "updateasync"], title: "DataStore Reliability" },
  { family: "TWEEN", triggers: ["cannot be tweened"], title: "Tween Misconfiguration" },
];

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

const generated: DiagnosticKnowledge[] = [];

for (const domain of Object.keys(DOMAIN_APIS)) {
  const apis = DOMAIN_APIS[domain] ?? [];
  for (const familySpec of FAMILIES) {
    generated.push({
      id: `kb-${slug(domain)}-${slug(familySpec.family)}`,
      family: familySpec.family,
      domain,
      title: `${domain} • ${familySpec.title}`,
      triggers: familySpec.triggers,
      docs: apis.slice(0, 3).map((api) => `https://create.roblox.com/docs/reference/engine/${api}`),
      relatedApis: apis,
      relatedErrors: [
        "attempt to index nil",
        "attempt to call nil",
        "attempt to concatenate nil",
        "attempt to compare nil",
        "attempt to perform arithmetic on nil",
      ],
    });
  }
}

export const ROBLOX_DIAGNOSTIC_KNOWLEDGE_BASE: DiagnosticKnowledge[] = generated;

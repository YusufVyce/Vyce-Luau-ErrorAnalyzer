/**
 * Property/event schemas for the Roblox classes the simulator supports.
 * Behaviour that needs the world (players, tweens, remotes…) lives in world.ts.
 */
import { LuaTable } from "../values";
import { BrickColor, CFrame, Color3, enumItem, UDim, UDim2, Vector2, Vector3 } from "./datatypes";
import { defineClass, type PropDef, type PropType } from "./instance";

const p = (type: PropType, def: unknown, readOnly = false): PropDef => ({
  type,
  def: () => def,
  readOnly,
});
const pf = (type: PropType, def: () => unknown, readOnly = false): PropDef => ({
  type,
  def,
  readOnly,
});
const en = (type: string, item: string, readOnly = false): PropDef => ({
  type: `enum:${type}`,
  def: () => enumItem(type, item),
  readOnly,
});
const any = (def: unknown = undefined): PropDef => ({ type: "any", def: () => def });

let installed = false;

export function installClasses() {
  if (installed) return;
  installed = true;

  defineClass("PVInstance", { parent: "Instance" });

  // ---------------------------------------------------------------- parts
  defineClass("BasePart", {
    parent: "PVInstance",
    props: {
      Position: p("Vector3", new Vector3(0, 0, 0)),
      Size: p("Vector3", new Vector3(4, 1, 2)),
      CFrame: pf("CFrame", () => new CFrame()),
      Orientation: p("Vector3", new Vector3(0, 0, 0)),
      Rotation: p("Vector3", new Vector3(0, 0, 0)),
      Anchored: p("bool", false),
      CanCollide: p("bool", true),
      CanTouch: p("bool", true),
      CanQuery: p("bool", true),
      Transparency: p("number", 0),
      Reflectance: p("number", 0),
      Color: p("Color3", Color3.fromRGB(163, 162, 165)),
      BrickColor: pf("BrickColor", () => BrickColor.byName("Medium stone grey")),
      Material: en("Material", "Plastic"),
      Massless: p("bool", false),
      Locked: p("bool", false),
      CastShadow: p("bool", true),
      CollisionGroup: p("string", "Default"),
      AssemblyLinearVelocity: p("Vector3", new Vector3()),
      AssemblyAngularVelocity: p("Vector3", new Vector3()),
      Velocity: p("Vector3", new Vector3()),
      RotVelocity: p("Vector3", new Vector3()),
      TopSurface: en("SurfaceType", "Smooth"),
      BottomSurface: en("SurfaceType", "Smooth"),
    },
    events: ["Touched", "TouchEnded"],
    methods: {
      GetTouchingParts: () => new LuaTable(),
      GetMass: (self) => {
        const s = self.getProp("Size") as Vector3;
        return s.x * s.y * s.z * 0.7;
      },
      SetNetworkOwner: () => [],
      GetNetworkOwner: () => undefined,
      SetNetworkOwnershipAuto: () => [],
      ApplyImpulse: () => [],
      ApplyAngularImpulse: () => [],
      BreakJoints: () => [],
      GetConnectedParts: () => new LuaTable(),
      GetJoints: () => new LuaTable(),
      CanSetNetworkOwnership: () => [true],
    },
    creatable: false,
  });
  defineClass("Part", {
    parent: "BasePart",
    props: { Shape: en("PartType", "Block") },
    creatable: true,
  });
  defineClass("MeshPart", {
    parent: "BasePart",
    props: { MeshId: p("Content", ""), TextureID: p("Content", "") },
    creatable: true,
  });
  defineClass("WedgePart", { parent: "BasePart", creatable: true });
  defineClass("CornerWedgePart", { parent: "BasePart", creatable: true });
  defineClass("TrussPart", { parent: "BasePart", creatable: true });
  defineClass("UnionOperation", { parent: "BasePart", creatable: false });
  defineClass("SpawnLocation", {
    parent: "Part",
    props: {
      Neutral: p("bool", true),
      Enabled: p("bool", true),
      Duration: p("number", 10),
      AllowTeamChangeOnTouch: p("bool", false),
      TeamColor: pf("BrickColor", () => BrickColor.byName("Medium stone grey")),
    },
    creatable: true,
  });
  defineClass("Seat", {
    parent: "Part",
    props: { Disabled: p("bool", false), Occupant: p("Instance", undefined, true) },
    creatable: true,
  });
  defineClass("VehicleSeat", {
    parent: "BasePart",
    props: {
      MaxSpeed: p("number", 25),
      Throttle: p("int", 0),
      Steer: p("int", 0),
      Occupant: p("Instance", undefined, true),
    },
    creatable: true,
  });
  defineClass("Terrain", {
    parent: "BasePart",
    methods: { FillBlock: () => [], FillBall: () => [], Clear: () => [], FillRegion: () => [] },
  });

  // ---------------------------------------------------------------- models
  defineClass("Model", {
    parent: "PVInstance",
    props: {
      PrimaryPart: p("Instance", undefined),
      WorldPivot: pf("CFrame", () => new CFrame()),
      LevelOfDetail: any(),
    },
    creatable: true,
  });
  defineClass("WorldRoot", { parent: "Model" });
  defineClass("Workspace", {
    parent: "WorldRoot",
    props: {
      Gravity: p("number", 196.2),
      CurrentCamera: p("Instance", undefined),
      FallenPartsDestroyHeight: p("number", -500),
      StreamingEnabled: p("bool", false),
      DistributedGameTime: p("number", 0, true),
    },
    service: true,
  });
  defineClass("Camera", {
    parent: "PVInstance",
    props: {
      CFrame: pf("CFrame", () => new CFrame(new Vector3(0, 10, 20))),
      FieldOfView: p("number", 70),
      CameraType: en("CameraType", "Custom"),
      CameraSubject: p("Instance", undefined),
      Focus: pf("CFrame", () => new CFrame()),
      ViewportSize: p("Vector2", new Vector2(1920, 1080), true),
    },
    creatable: true,
  });
  defineClass("Folder", { creatable: true });
  defineClass("Configuration", { creatable: true });
  defineClass("Accoutrement", {
    props: { AttachmentPoint: pf("CFrame", () => new CFrame()) },
    creatable: true,
  });
  defineClass("Accessory", { parent: "Accoutrement", creatable: true });
  defineClass("Hat", { parent: "Accoutrement", creatable: true });

  // ---------------------------------------------------------------- values
  defineClass("ValueBase", {});
  const valueClass = (name: string, def: PropDef) =>
    defineClass(name, { parent: "ValueBase", props: { Value: def }, creatable: true });
  valueClass("IntValue", p("int", 0));
  valueClass("NumberValue", p("number", 0));
  valueClass("StringValue", p("string", ""));
  valueClass("BoolValue", p("bool", false));
  valueClass("ObjectValue", p("Instance", undefined));
  valueClass("Vector3Value", p("Vector3", new Vector3()));
  valueClass(
    "CFrameValue",
    pf("CFrame", () => new CFrame()),
  );
  valueClass("Color3Value", p("Color3", new Color3(0, 0, 0)));
  valueClass(
    "BrickColorValue",
    pf("BrickColor", () => BrickColor.byName("Medium stone grey")),
  );

  // ---------------------------------------------------------------- characters
  defineClass("Humanoid", {
    props: {
      Health: p("number", 100),
      MaxHealth: p("number", 100),
      WalkSpeed: p("number", 16),
      JumpPower: p("number", 50),
      JumpHeight: p("number", 7.2),
      UseJumpPower: p("bool", true),
      HipHeight: p("number", 2),
      AutoRotate: p("bool", true),
      DisplayName: p("string", ""),
      Sit: p("bool", false),
      Jump: p("bool", false),
      PlatformStand: p("bool", false),
      MoveDirection: p("Vector3", new Vector3(), true),
      RootPart: p("Instance", undefined, true),
      FloorMaterial: en("Material", "Plastic", true),
      WalkToPoint: p("Vector3", new Vector3()),
      RigType: en("HumanoidRigType", "R15"),
      BreakJointsOnDeath: p("bool", true),
      RequiresNeck: p("bool", true),
      NameDisplayDistance: p("number", 100),
      HealthDisplayDistance: p("number", 100),
      DisplayDistanceType: any(),
      HealthDisplayType: any(),
    },
    events: [
      "Died",
      "HealthChanged",
      "Running",
      "Jumping",
      "StateChanged",
      "MoveToFinished",
      "Touched",
      "Seated",
      "FreeFalling",
      "Climbing",
      "AnimationPlayed",
    ],
    creatable: true,
  });
  defineClass("Animator", { events: ["AnimationPlayed"], creatable: true });
  defineClass("AnimationController", { creatable: true });
  defineClass("Animation", { props: { AnimationId: p("Content", "") }, creatable: true });
  defineClass("AnimationTrack", {
    props: {
      Animation: p("Instance", undefined, true),
      IsPlaying: p("bool", false, true),
      Length: p("number", 1, true),
      Looped: p("bool", false),
      Speed: p("number", 1, true),
      Priority: en("AnimationPriority", "Action"),
      TimePosition: p("number", 0),
      WeightCurrent: p("number", 1, true),
    },
    events: ["Stopped", "Ended", "DidLoop", "KeyframeReached"],
  });

  // ---------------------------------------------------------------- players
  defineClass("Player", {
    props: {
      DisplayName: p("string", ""),
      UserId: p("int", 0, true),
      Character: p("Instance", undefined),
      Team: p("Instance", undefined),
      TeamColor: pf("BrickColor", () => BrickColor.byName("White")),
      Neutral: p("bool", true),
      RespawnLocation: p("Instance", undefined),
      AccountAge: p("int", 365, true),
      MembershipType: any(),
      CameraMaxZoomDistance: p("number", 128),
      CameraMinZoomDistance: p("number", 0.5),
      CanLoadCharacterAppearance: p("bool", true),
      AutoJumpEnabled: p("bool", true),
      HealthDisplayDistance: p("number", 100),
    },
    events: [
      "CharacterAdded",
      "CharacterRemoving",
      "CharacterAppearanceLoaded",
      "Chatted",
      "Idled",
    ],
  });
  defineClass("Backpack", {});
  defineClass("PlayerGui", { methods: { GetTopbarTransparency: () => 0 } });
  defineClass("PlayerScripts", {});
  defineClass("StarterGear", {});
  defineClass("PlayerMouse", {
    props: {
      Hit: pf("CFrame", () => new CFrame()),
      Target: p("Instance", undefined, true),
      TargetFilter: p("Instance", undefined),
      X: p("number", 0, true),
      Y: p("number", 0, true),
      Icon: p("Content", ""),
      Origin: pf("CFrame", () => new CFrame(new Vector3(0, 10, 20)), true),
    },
    events: [
      "Button1Down",
      "Button1Up",
      "Button2Down",
      "Button2Up",
      "Move",
      "WheelForward",
      "WheelBackward",
      "Idle",
    ],
  });
  defineClass("Tool", {
    props: {
      Enabled: p("bool", true),
      RequiresHandle: p("bool", true),
      CanBeDropped: p("bool", true),
      ManualActivationOnly: p("bool", false),
      ToolTip: p("string", ""),
      TextureId: p("Content", ""),
      Grip: pf("CFrame", () => new CFrame()),
    },
    events: ["Activated", "Deactivated", "Equipped", "Unequipped"],
    creatable: true,
  });

  // ---------------------------------------------------------------- scripts
  defineClass("LuaSourceContainer", {});
  defineClass("BaseScript", {
    parent: "LuaSourceContainer",
    props: { Enabled: p("bool", true), Disabled: p("bool", false), RunContext: any() },
  });
  defineClass("Script", { parent: "BaseScript", creatable: true });
  defineClass("LocalScript", { parent: "Script", creatable: true });
  defineClass("ModuleScript", { parent: "LuaSourceContainer", creatable: true });

  // ---------------------------------------------------------------- remotes / bindables
  defineClass("RemoteEvent", { events: ["OnServerEvent", "OnClientEvent"], creatable: true });
  defineClass("UnreliableRemoteEvent", { parent: "RemoteEvent", creatable: true });
  defineClass("RemoteFunction", {
    callbacks: ["OnServerInvoke", "OnClientInvoke"],
    creatable: true,
  });
  defineClass("BindableEvent", { events: ["Event"], creatable: true });
  defineClass("BindableFunction", { callbacks: ["OnInvoke"], creatable: true });

  // ---------------------------------------------------------------- GUI
  defineClass("GuiBase2d", {
    props: {
      AbsoluteSize: p("Vector2", new Vector2(100, 100), true),
      AbsolutePosition: p("Vector2", new Vector2(), true),
      AutoLocalize: p("bool", true),
    },
  });
  defineClass("LayerCollector", {
    parent: "GuiBase2d",
    props: {
      Enabled: p("bool", true),
      ResetOnSpawn: p("bool", true),
      ZIndexBehavior: en("ZIndexBehavior", "Sibling"),
    },
  });
  defineClass("ScreenGui", {
    parent: "LayerCollector",
    props: { DisplayOrder: p("int", 0), IgnoreGuiInset: p("bool", false) },
    creatable: true,
  });
  defineClass("BillboardGui", {
    parent: "LayerCollector",
    props: {
      Adornee: p("Instance", undefined),
      Size: pf("UDim2", () => new UDim2()),
      StudsOffset: p("Vector3", new Vector3()),
      AlwaysOnTop: p("bool", false),
      MaxDistance: p("number", Infinity),
      LightInfluence: p("number", 1),
    },
    creatable: true,
  });
  defineClass("SurfaceGui", {
    parent: "LayerCollector",
    props: {
      Adornee: p("Instance", undefined),
      Face: en("NormalId", "Front"),
      CanvasSize: p("Vector2", new Vector2(800, 600)),
      LightInfluence: p("number", 1),
    },
    creatable: true,
  });
  defineClass("GuiObject", {
    parent: "GuiBase2d",
    props: {
      Visible: p("bool", true),
      Size: pf("UDim2", () => new UDim2(new UDim(0, 100), new UDim(0, 100))),
      Position: pf("UDim2", () => new UDim2()),
      AnchorPoint: p("Vector2", new Vector2()),
      BackgroundColor3: p("Color3", new Color3(1, 1, 1)),
      BackgroundTransparency: p("number", 0),
      BorderSizePixel: p("int", 1),
      BorderColor3: p("Color3", Color3.fromRGB(27, 42, 53)),
      ZIndex: p("int", 1),
      LayoutOrder: p("int", 0),
      Rotation: p("number", 0),
      ClipsDescendants: p("bool", false),
      Active: p("bool", false),
      Interactable: p("bool", true),
      AutomaticSize: en("AutomaticSize", "None"),
      SizeConstraint: any(),
    },
    events: [
      "MouseEnter",
      "MouseLeave",
      "MouseMoved",
      "InputBegan",
      "InputEnded",
      "InputChanged",
      "TouchTap",
    ],
    methods: {
      TweenPosition: (self, a) => {
        if (a[0] instanceof UDim2) self.setProp("Position", a[0]);
        return [true];
      },
      TweenSize: (self, a) => {
        if (a[0] instanceof UDim2) self.setProp("Size", a[0]);
        return [true];
      },
      TweenSizeAndPosition: (self, a) => {
        if (a[0] instanceof UDim2) self.setProp("Size", a[0]);
        if (a[1] instanceof UDim2) self.setProp("Position", a[1]);
        return [true];
      },
    },
  });
  const textProps = (text: string): Record<string, PropDef> => ({
    Text: p("string", text),
    TextColor3: p("Color3", Color3.fromRGB(27, 42, 53)),
    TextSize: p("number", 14),
    TextScaled: p("bool", false),
    TextWrapped: p("bool", false),
    Font: en("Font", "SourceSans"),
    FontFace: any(),
    TextTransparency: p("number", 0),
    TextStrokeTransparency: p("number", 1),
    TextStrokeColor3: p("Color3", new Color3(0, 0, 0)),
    RichText: p("bool", false),
    TextXAlignment: en("TextXAlignment", "Center"),
    TextYAlignment: en("TextYAlignment", "Center"),
    LineHeight: p("number", 1),
    MaxVisibleGraphemes: p("int", -1),
    ContentText: p("string", text, true),
    TextBounds: p("Vector2", new Vector2(), true),
    TextFits: p("bool", true, true),
  });
  defineClass("Frame", { parent: "GuiObject", props: { Style: any() }, creatable: true });
  defineClass("ScrollingFrame", {
    parent: "GuiObject",
    props: {
      CanvasSize: pf("UDim2", () => new UDim2(new UDim(0, 0), new UDim(2, 0))),
      CanvasPosition: p("Vector2", new Vector2()),
      ScrollBarThickness: p("int", 12),
      ScrollingEnabled: p("bool", true),
      ScrollingDirection: any(),
      AutomaticCanvasSize: en("AutomaticSize", "None"),
    },
    creatable: true,
  });
  defineClass("TextLabel", { parent: "GuiObject", props: textProps("Label"), creatable: true });
  defineClass("GuiButton", {
    parent: "GuiObject",
    props: {
      AutoButtonColor: p("bool", true),
      Selected: p("bool", false),
      Modal: p("bool", false),
    },
    events: [
      "MouseButton1Click",
      "MouseButton1Down",
      "MouseButton1Up",
      "MouseButton2Click",
      "MouseButton2Down",
      "MouseButton2Up",
      "Activated",
    ],
  });
  defineClass("TextButton", { parent: "GuiButton", props: textProps("Button"), creatable: true });
  defineClass("TextBox", {
    parent: "GuiObject",
    props: {
      ...textProps(""),
      PlaceholderText: p("string", ""),
      PlaceholderColor3: p("Color3", Color3.fromRGB(178, 178, 178)),
      ClearTextOnFocus: p("bool", true),
      MultiLine: p("bool", false),
      TextEditable: p("bool", true),
    },
    events: ["FocusLost", "Focused", "ReturnPressedFromOnScreenKeyboard"],
    methods: { CaptureFocus: () => [], ReleaseFocus: () => [], IsFocused: () => false },
    creatable: true,
  });
  const imageProps: Record<string, PropDef> = {
    Image: p("Content", ""),
    ImageColor3: p("Color3", new Color3(1, 1, 1)),
    ImageTransparency: p("number", 0),
    ScaleType: en("ScaleType", "Stretch"),
    ImageRectOffset: p("Vector2", new Vector2()),
    ImageRectSize: p("Vector2", new Vector2()),
  };
  defineClass("ImageLabel", { parent: "GuiObject", props: imageProps, creatable: true });
  defineClass("ImageButton", {
    parent: "GuiButton",
    props: { ...imageProps, HoverImage: p("Content", ""), PressedImage: p("Content", "") },
    creatable: true,
  });
  defineClass("ViewportFrame", {
    parent: "GuiObject",
    props: { CurrentCamera: p("Instance", undefined) },
    creatable: true,
  });
  defineClass("UIComponent", {});
  const ui = (name: string, props: Record<string, PropDef>) =>
    defineClass(name, { parent: "UIComponent", props, creatable: true });
  ui("UICorner", { CornerRadius: pf("UDim", () => new UDim(0, 8)) });
  ui("UIStroke", {
    Thickness: p("number", 1),
    Color: p("Color3", new Color3(0, 0, 0)),
    Transparency: p("number", 0),
    Enabled: p("bool", true),
    ApplyStrokeMode: any(),
    LineJoinMode: any(),
  });
  ui("UIGradient", {
    Color: any(),
    Transparency: any(),
    Rotation: p("number", 0),
    Offset: p("Vector2", new Vector2()),
    Enabled: p("bool", true),
  });
  ui("UIListLayout", {
    Padding: pf("UDim", () => new UDim()),
    FillDirection: en("FillDirection", "Vertical"),
    SortOrder: en("SortOrder", "LayoutOrder"),
    HorizontalAlignment: en("HorizontalAlignment", "Left"),
    VerticalAlignment: en("VerticalAlignment", "Top"),
  });
  ui("UIGridLayout", {
    CellSize: pf("UDim2", () => new UDim2(new UDim(0, 100), new UDim(0, 100))),
    CellPadding: pf("UDim2", () => new UDim2(new UDim(0, 5), new UDim(0, 5))),
    SortOrder: en("SortOrder", "LayoutOrder"),
    FillDirection: en("FillDirection", "Horizontal"),
    HorizontalAlignment: en("HorizontalAlignment", "Left"),
    VerticalAlignment: en("VerticalAlignment", "Top"),
  });
  ui("UIPadding", {
    PaddingTop: pf("UDim", () => new UDim()),
    PaddingBottom: pf("UDim", () => new UDim()),
    PaddingLeft: pf("UDim", () => new UDim()),
    PaddingRight: pf("UDim", () => new UDim()),
  });
  ui("UIScale", { Scale: p("number", 1) });
  ui("UIAspectRatioConstraint", {
    AspectRatio: p("number", 1),
    AspectType: any(),
    DominantAxis: any(),
  });
  ui("UISizeConstraint", {
    MinSize: p("Vector2", new Vector2()),
    MaxSize: p("Vector2", new Vector2(Infinity, Infinity)),
  });
  ui("UITextSizeConstraint", { MaxTextSize: p("int", 100), MinTextSize: p("int", 1) });
  ui("UIPageLayout", {
    Animated: p("bool", true),
    Circular: p("bool", false),
    SortOrder: en("SortOrder", "LayoutOrder"),
  });

  // ---------------------------------------------------------------- interaction
  defineClass("ProximityPrompt", {
    props: {
      ActionText: p("string", "Interact"),
      ObjectText: p("string", ""),
      KeyboardKeyCode: en("KeyCode", "E"),
      GamepadKeyCode: en("KeyCode", "ButtonX"),
      HoldDuration: p("number", 0),
      MaxActivationDistance: p("number", 10),
      Enabled: p("bool", true),
      RequiresLineOfSight: p("bool", true),
      ClickablePrompt: p("bool", true),
      Style: en("ProximityPromptStyle", "Default"),
      Exclusivity: en("ProximityPromptExclusivity", "OnePerButton"),
      UIOffset: p("Vector2", new Vector2()),
    },
    events: [
      "Triggered",
      "TriggerEnded",
      "PromptShown",
      "PromptHidden",
      "PromptButtonHoldBegan",
      "PromptButtonHoldEnded",
    ],
    methods: { InputHoldBegin: () => [], InputHoldEnd: () => [] },
    creatable: true,
  });
  defineClass("ClickDetector", {
    props: { MaxActivationDistance: p("number", 32), CursorIcon: p("Content", "") },
    events: ["MouseClick", "RightMouseClick", "MouseHoverEnter", "MouseHoverLeave"],
    creatable: true,
  });

  // ---------------------------------------------------------------- sound
  defineClass("Sound", {
    props: {
      SoundId: p("Content", ""),
      Volume: p("number", 0.5),
      Looped: p("bool", false),
      Playing: p("bool", false),
      PlaybackSpeed: p("number", 1),
      TimePosition: p("number", 0),
      TimeLength: p("number", 1, true),
      IsPlaying: p("bool", false, true),
      IsLoaded: p("bool", true, true),
      RollOffMaxDistance: p("number", 10000),
      PlayOnRemove: p("bool", false),
      SoundGroup: p("Instance", undefined),
    },
    events: ["Ended", "Played", "Stopped", "Paused", "Resumed", "DidLoop", "Loaded"],
    creatable: true,
  });
  defineClass("SoundGroup", { props: { Volume: p("number", 0.5) }, creatable: true });

  // ---------------------------------------------------------------- constraints / physics / effects
  defineClass("Attachment", {
    props: {
      Position: p("Vector3", new Vector3()),
      CFrame: pf("CFrame", () => new CFrame()),
      Orientation: p("Vector3", new Vector3()),
      WorldPosition: p("Vector3", new Vector3(), true),
      WorldCFrame: pf("CFrame", () => new CFrame(), true),
      Visible: p("bool", false),
      Axis: p("Vector3", new Vector3(1, 0, 0)),
    },
    creatable: true,
  });
  defineClass("JointInstance", {
    props: {
      Part0: p("Instance", undefined),
      Part1: p("Instance", undefined),
      C0: pf("CFrame", () => new CFrame()),
      C1: pf("CFrame", () => new CFrame()),
      Enabled: p("bool", true),
    },
  });
  defineClass("Weld", { parent: "JointInstance", creatable: true });
  defineClass("Motor6D", {
    parent: "JointInstance",
    props: {
      CurrentAngle: p("number", 0),
      DesiredAngle: p("number", 0),
      MaxVelocity: p("number", 0),
    },
    creatable: true,
  });
  defineClass("WeldConstraint", {
    props: {
      Part0: p("Instance", undefined),
      Part1: p("Instance", undefined),
      Enabled: p("bool", true),
    },
    creatable: true,
  });
  defineClass("Constraint", {
    props: {
      Attachment0: p("Instance", undefined),
      Attachment1: p("Instance", undefined),
      Enabled: p("bool", true),
      Visible: p("bool", false),
      Color: pf("BrickColor", () => BrickColor.byName("Bright blue")),
    },
  });
  const constraint = (name: string, props: Record<string, PropDef> = {}) =>
    defineClass(name, { parent: "Constraint", props, creatable: true });
  constraint("HingeConstraint", {
    ActuatorType: any(),
    AngularVelocity: p("number", 0),
    MotorMaxTorque: p("number", 0),
    TargetAngle: p("number", 0),
    AngularSpeed: p("number", 0),
    ServoMaxTorque: p("number", 0),
    LimitsEnabled: p("bool", false),
  });
  constraint("RopeConstraint", { Length: p("number", 5), Thickness: p("number", 0.1) });
  constraint("RodConstraint", { Length: p("number", 5) });
  constraint("SpringConstraint", {
    Stiffness: p("number", 100),
    Damping: p("number", 1),
    FreeLength: p("number", 1),
  });
  constraint("BallSocketConstraint", { LimitsEnabled: p("bool", false) });
  constraint("PrismaticConstraint", {
    ActuatorType: any(),
    Velocity: p("number", 0),
    Speed: p("number", 0),
    TargetPosition: p("number", 0),
  });
  constraint("AlignPosition", {
    Position: p("Vector3", new Vector3()),
    MaxForce: p("number", 10000),
    Responsiveness: p("number", 10),
    RigidityEnabled: p("bool", false),
    Mode: any(),
  });
  constraint("AlignOrientation", {
    CFrame: pf("CFrame", () => new CFrame()),
    MaxTorque: p("number", 10000),
    Responsiveness: p("number", 10),
    RigidityEnabled: p("bool", false),
    Mode: any(),
  });
  constraint("LinearVelocity", {
    VectorVelocity: p("Vector3", new Vector3()),
    MaxForce: p("number", 1000),
    VelocityConstraintMode: any(),
    RelativeTo: any(),
  });
  constraint("AngularVelocity", {
    AngularVelocity: p("Vector3", new Vector3()),
    MaxTorque: p("number", 1000),
    RelativeTo: any(),
  });
  constraint("VectorForce", {
    Force: p("Vector3", new Vector3()),
    RelativeTo: any(),
    ApplyAtCenterOfMass: p("bool", false),
  });
  defineClass("BodyMover", {});
  const mover = (name: string, props: Record<string, PropDef>) =>
    defineClass(name, { parent: "BodyMover", props, creatable: true });
  mover("BodyVelocity", {
    Velocity: p("Vector3", new Vector3()),
    MaxForce: p("Vector3", new Vector3(4000, 4000, 4000)),
    P: p("number", 1250),
  });
  mover("BodyPosition", {
    Position: p("Vector3", new Vector3()),
    MaxForce: p("Vector3", new Vector3(4000, 4000, 4000)),
    P: p("number", 10000),
    D: p("number", 1250),
  });
  mover("BodyGyro", {
    CFrame: pf("CFrame", () => new CFrame()),
    MaxTorque: p("Vector3", new Vector3(400000, 0, 400000)),
    P: p("number", 3000),
    D: p("number", 500),
  });
  mover("BodyForce", { Force: p("Vector3", new Vector3()) });
  mover("BodyAngularVelocity", {
    AngularVelocity: p("Vector3", new Vector3()),
    MaxTorque: p("Vector3", new Vector3(4000, 4000, 4000)),
    P: p("number", 1250),
  });

  const effect = (
    name: string,
    props: Record<string, PropDef>,
    extra: { events?: string[]; methods?: Record<string, () => unknown> } = {},
  ) =>
    defineClass(name, { props: { Enabled: p("bool", true), ...props }, creatable: true, ...extra });
  effect(
    "ParticleEmitter",
    {
      Rate: p("number", 20),
      Lifetime: any(),
      Speed: any(),
      Color: any(),
      Size: any(),
      Transparency: any(),
      Texture: p("Content", ""),
      LightEmission: p("number", 0),
      SpreadAngle: p("Vector2", new Vector2()),
      Acceleration: p("Vector3", new Vector3()),
      Rotation: any(),
      RotSpeed: any(),
      EmissionDirection: en("NormalId", "Top"),
      LockedToPart: p("bool", false),
      Drag: p("number", 0),
      ZOffset: p("number", 0),
    },
    { methods: { Emit: () => [], Clear: () => [] } },
  );
  effect("Beam", {
    Attachment0: p("Instance", undefined),
    Attachment1: p("Instance", undefined),
    Color: any(),
    Width0: p("number", 1),
    Width1: p("number", 1),
    FaceCamera: p("bool", false),
    Texture: p("Content", ""),
    Transparency: any(),
    LightEmission: p("number", 0),
    Segments: p("int", 10),
    CurveSize0: p("number", 0),
    CurveSize1: p("number", 0),
  });
  effect("Trail", {
    Attachment0: p("Instance", undefined),
    Attachment1: p("Instance", undefined),
    Color: any(),
    Lifetime: p("number", 2),
    Transparency: any(),
    Texture: p("Content", ""),
    LightEmission: p("number", 0),
    MinLength: p("number", 0.1),
    WidthScale: any(),
    FaceCamera: p("bool", false),
  });
  effect("Fire", {
    Heat: p("number", 9),
    Size: p("number", 5),
    Color: p("Color3", Color3.fromRGB(236, 139, 70)),
    SecondaryColor: p("Color3", Color3.fromRGB(139, 80, 55)),
    TimeScale: p("number", 1),
  });
  effect("Smoke", {
    Color: p("Color3", new Color3(1, 1, 1)),
    Opacity: p("number", 0.5),
    RiseVelocity: p("number", 1),
    Size: p("number", 1),
    TimeScale: p("number", 1),
  });
  effect("Sparkles", {
    SparkleColor: p("Color3", Color3.fromRGB(144, 25, 255)),
    TimeScale: p("number", 1),
  });
  const light = {
    Brightness: p("number", 1),
    Range: p("number", 8),
    Color: p("Color3", new Color3(1, 1, 1)),
    Shadows: p("bool", false),
  };
  effect("PointLight", light);
  effect("SpotLight", { ...light, Angle: p("number", 90), Face: en("NormalId", "Front") });
  effect("SurfaceLight", { ...light, Angle: p("number", 90), Face: en("NormalId", "Front") });
  effect("Highlight", {
    FillColor: p("Color3", Color3.fromRGB(255, 0, 0)),
    OutlineColor: p("Color3", new Color3(1, 1, 1)),
    FillTransparency: p("number", 0.5),
    OutlineTransparency: p("number", 0),
    Adornee: p("Instance", undefined),
    DepthMode: any(),
  });
  defineClass("FaceInstance", { props: { Face: en("NormalId", "Front") } });
  defineClass("Decal", {
    parent: "FaceInstance",
    props: {
      Texture: p("Content", ""),
      Transparency: p("number", 0),
      Color3: p("Color3", new Color3(1, 1, 1)),
      ZIndex: p("int", 1),
    },
    creatable: true,
  });
  defineClass("Texture", {
    parent: "Decal",
    props: {
      StudsPerTileU: p("number", 2),
      StudsPerTileV: p("number", 2),
      OffsetStudsU: p("number", 0),
      OffsetStudsV: p("number", 0),
    },
    creatable: true,
  });
  defineClass("SelectionBox", {
    props: {
      Adornee: p("Instance", undefined),
      Color3: p("Color3", Color3.fromRGB(13, 105, 172)),
      LineThickness: p("number", 0.15),
      SurfaceTransparency: p("number", 1),
      Visible: p("bool", true),
    },
    creatable: true,
  });
  defineClass("Explosion", {
    props: {
      Position: p("Vector3", new Vector3()),
      BlastRadius: p("number", 4),
      BlastPressure: p("number", 500000),
      DestroyJointRadiusPercent: p("number", 1),
      ExplosionType: en("ExplosionType", "Craters"),
      Visible: p("bool", true),
    },
    events: ["Hit"],
    creatable: true,
  });
  defineClass("ForceField", { props: { Visible: p("bool", true) }, creatable: true });
  defineClass("SpecialMesh", {
    props: {
      MeshType: any(),
      MeshId: p("Content", ""),
      TextureId: p("Content", ""),
      Scale: p("Vector3", new Vector3(1, 1, 1)),
      Offset: p("Vector3", new Vector3()),
    },
    creatable: true,
  });
  defineClass("Sky", {
    props: {
      SkyboxBk: p("Content", ""),
      SkyboxDn: p("Content", ""),
      SkyboxFt: p("Content", ""),
      SkyboxLf: p("Content", ""),
      SkyboxRt: p("Content", ""),
      SkyboxUp: p("Content", ""),
      CelestialBodiesShown: p("bool", true),
      StarCount: p("int", 3000),
    },
    creatable: true,
  });
  defineClass("Atmosphere", {
    props: {
      Density: p("number", 0.3),
      Offset: p("number", 0),
      Color: p("Color3", Color3.fromRGB(199, 199, 199)),
      Decay: p("Color3", Color3.fromRGB(106, 112, 125)),
      Glare: p("number", 0),
      Haze: p("number", 0),
    },
    creatable: true,
  });
  defineClass("PostEffect", { props: { Enabled: p("bool", true) } });
  defineClass("BlurEffect", {
    parent: "PostEffect",
    props: { Size: p("number", 24) },
    creatable: true,
  });
  defineClass("BloomEffect", {
    parent: "PostEffect",
    props: { Intensity: p("number", 1), Size: p("number", 24), Threshold: p("number", 2) },
    creatable: true,
  });
  defineClass("ColorCorrectionEffect", {
    parent: "PostEffect",
    props: {
      Brightness: p("number", 0),
      Contrast: p("number", 0),
      Saturation: p("number", 0),
      TintColor: p("Color3", new Color3(1, 1, 1)),
    },
    creatable: true,
  });
  defineClass("SunRaysEffect", {
    parent: "PostEffect",
    props: { Intensity: p("number", 0.25), Spread: p("number", 1) },
    creatable: true,
  });
  defineClass("DepthOfFieldEffect", {
    parent: "PostEffect",
    props: {
      FarIntensity: p("number", 0.75),
      FocusDistance: p("number", 0.05),
      InFocusRadius: p("number", 10),
      NearIntensity: p("number", 0.75),
    },
    creatable: true,
  });

  // ---------------------------------------------------------------- teams / tween / misc
  defineClass("Team", {
    props: {
      TeamColor: pf("BrickColor", () => BrickColor.byName("White")),
      AutoAssignable: p("bool", true),
    },
    events: ["PlayerAdded", "PlayerRemoved"],
    creatable: true,
  });
  defineClass("Tween", {
    props: {
      PlaybackState: en("PlaybackState", "Begin", true),
      Instance: p("Instance", undefined, true),
      TweenInfo: any(),
    },
    events: ["Completed"],
  });
  defineClass("Path", {
    props: { Status: en("PathStatus", "Success", true) },
    events: ["Blocked", "Unblocked"],
  });
  defineClass("GlobalDataStore", {});
  defineClass("DataStore", { parent: "GlobalDataStore" });
  defineClass("OrderedDataStore", { parent: "GlobalDataStore" });
  defineClass("DataStorePages", { props: { IsFinished: p("bool", true, true) } });
  defineClass("Message", { props: { Text: p("string", "") }, creatable: true });
  defineClass("Hint", { parent: "Message", creatable: true });
  defineClass("Dialog", {
    props: { InitialPrompt: p("string", ""), Purpose: any(), Tone: any() },
    events: ["DialogChoiceSelected"],
    creatable: true,
  });
}

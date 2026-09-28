import { describe, expect, it } from "vitest";
import { Interpreter, Scope } from "../interpreter";
import { parse } from "../parser";
import { installStdlib } from "../stdlib";
import { LuaTable } from "../values";

function run(source: string, seconds = 10) {
  const interp = new Interpreter();
  installStdlib(interp);
  const parsed = parse(source);
  if (parsed.error)
    return { output: [], errors: [`${parsed.error.line}: ${parsed.error.message}`], interp };
  const scope = new Scope();
  scope.env = new LuaTable();
  const script = {
    path: "ServerScriptService.Script",
    name: "Script",
    kind: "Script" as const,
    side: "server" as const,
  };
  const fn = interp.makeClosure(
    {
      k: "Func",
      params: [],
      vararg: true,
      body: parsed.chunk!.body,
      name: "main chunk",
      line: 1,
      endLine: 1,
    },
    scope,
    script,
  );
  interp.enqueue(fn, [], script);
  interp.runFor(seconds);
  return {
    output: interp.output.filter((o) => o.kind !== "error").map((o) => o.text),
    errors: interp.errors.map((e) => e.message),
    interp,
  };
}

describe("luau core", () => {
  it("prints and does math", () => {
    const r = run(
      `print("Hello", 1 + 2, 10 / 4, 7 // 2, 2 ^ 10, 7 % 3)\nprint(("a" .. 1) == "a1")`,
    );
    expect(r.output[0]).toBe("Hello 3 2.5 3 1024 1");
    expect(r.output[1]).toBe("true");
  });
  it("supports luau syntax", () => {
    const r = run(`
local x: number = 5
x += 10
local name = "Bob"
print(\`{name} has {x} coins\`)
local t = {1, 2, 3, key = "v"}
for i, v in t do print(i, v) end
local function f(a, ...)
  return a, select("#", ...)
end
print(f(1, 2, 3))
local y = if x > 10 then "big" else "small"
print(y)
for i = 1, 3 do if i == 2 then continue end print("i", i) end
type Foo = { a: number }
print(#t, t.key, string.format("%.2f|%5d|%s", 3.14159, 42, "x"))
`);
    expect(r.errors).toEqual([]);
    expect(r.output).toEqual([
      "Bob has 15 coins",
      "1 1",
      "2 2",
      "3 3",
      "key v",
      "1 2",
      "big",
      "i 1",
      "i 3",
      "3 v 3.14|   42|x",
    ]);
  });
  it("gives Roblox-style runtime errors", () => {
    expect(run(`local p = nil\nprint(p.Name)`).errors[0]).toBe(
      "ServerScriptService.Script:2: attempt to index nil with 'Name'",
    );
    expect(run(`foo()`).errors[0]).toBe(
      "ServerScriptService.Script:1: attempt to call a nil value",
    );
    expect(run(`local a\nlocal b = a + 1`).errors[0]).toBe(
      "ServerScriptService.Script:2: attempt to perform arithmetic (add) on nil and number",
    );
    expect(run(`print("x" .. nil)`).errors[0]).toBe(
      "ServerScriptService.Script:1: attempt to concatenate string with nil",
    );
    expect(run(`for i, v in ipairs(nil) do end`).errors[0]).toBe(
      "ServerScriptService.Script:1: invalid argument #1 to 'ipairs' (table expected, got nil)",
    );
    expect(run(`while true do end`).errors[0]).toBe(
      "Script timeout: exhausted allowed execution time",
    );
    expect(run(`local function f() return f() + 1 end f()`).errors[0]).toMatch(/stack overflow/);
  });
  it("reports syntax errors like Studio", () => {
    expect(run(`local function f()\n  if x then\n    print(1)\nend`).errors[0]).toBe(
      "4: Expected 'end' (to close 'function' at line 1), got <eof>",
    );
    expect(run(`if x = 5 then end`).errors[0]).toBe(
      "1: Expected 'then' when parsing if statement, got '='",
    );
    expect(run(`x == 5`).errors[0]).toBe(
      "1: Incomplete statement: expected assignment or a function call",
    );
  });
  it("waits on a virtual clock", () => {
    const r = run(`for i = 3, 1, -1 do print(i) task.wait(1) end print("go", math.floor(time()))`);
    expect(r.output).toEqual(["3", "2", "1", "go 3"]);
  });
  it("supports pcall, metatables, coroutines and patterns", () => {
    const r = run(`
local ok, err = pcall(function() error("boom") end)
print(ok, err)
local Class = {}
Class.__index = Class
function Class.new(n) return setmetatable({n = n}, Class) end
function Class:double() return self.n * 2 end
print(Class.new(21):double())
local co = coroutine.create(function(a) local b = coroutine.yield(a + 1) print("got", b) return "done" end)
print(coroutine.resume(co, 1))
print(coroutine.resume(co, "x"))
print(coroutine.status(co))
print(string.match("Player_1234", "%d+"), ("hello world"):gsub("o", "0"))
for w in string.gmatch("a,b,c", "[^,]+") do print(w) end
local list = {5, 2, 9, 1}
table.sort(list)
print(table.concat(list, ","))
table.sort(list, function(a, b) return a > b end)
print(table.concat(list, ","))
`);
    expect(r.errors).toEqual([]);
    expect(r.output).toEqual([
      "false ServerScriptService.Script:2: boom",
      "42",
      "true 2",
      "got x",
      "true done",
      "dead",
      "1234 hell0 w0rld 2",
      "a",
      "b",
      "c",
      "1,2,5,9",
      "9,5,2,1",
    ]);
  });
});

<div align="center">

# Vyce LuaUtility

### Advanced Runtime Error Analysis Toolkit for Roblox Studio (Luau)

Analyze Roblox runtime errors, identify their root causes, and receive practical debugging guidance.

**Built exclusively for Roblox Studio (Luau).**

<img src="images/preview.png" width="900"/>

<p>
  <a href="https://vyce-lua-utility.vercel.app"><strong>🌐 Live Demo</strong></a> •
  <a href="#features"><strong>✨ Features</strong></a> •
  <a href="#example"><strong>📖 Example</strong></a> •
  <a href="#installation"><strong>💻 Installation</strong></a> •
  <a href="#roadmap"><strong>🛣 Roadmap</strong></a> •
  <a href="#contributing"><strong>🤝 Contributing</strong></a>
</p>

</div>

---

# About

Vyce LuaUtility is an open-source runtime error analysis toolkit built specifically for **Roblox Studio (Luau)**.

Instead of relying on simple error matching, Vyce LuaUtility combines runtime error information with execution context to determine the most likely root cause and provide practical debugging guidance.

Its goal is to help Roblox developers understand **why** an error occurred—not just **where** it occurred.

> **Scope**
>
> Vyce LuaUtility is designed exclusively for **Roblox Studio (Luau)**.
>
> It is not intended for FiveM, GTA V, Love2D, Defold, Garry's Mod, or any other Lua platform.

---

# Features

- 🔍 Context-aware runtime error analysis
- 🧠 Root cause detection
- 💡 Practical debugging suggestions
- 📚 Human-readable explanations
- ⚡ Fast local analysis
- 🛡️ Roblox-specific diagnostics
- 🧩 Support for common Luau runtime errors
- 🔒 No external AI services required

---

# Supported Errors

Examples include:

- attempt to index nil
- attempt to call nil
- arithmetic on nil
- invalid argument
- infinite yield
- stack overflow
- table index is nil

...and many more.

---

# Example

### Input

```text
attempt to index nil with 'Health'

Script: EnemyController.lua
Line: 42
```

### Output

```text
Root Cause

FindFirstChild() returned nil, so the "enemy" variable was never assigned.

Suggestion

Verify that the object exists before accessing enemy.Health.
```

---

# Why Vyce LuaUtility?

Traditional error messages often tell you **what** failed.

Vyce LuaUtility focuses on explaining **why** it failed by analyzing runtime context and providing Roblox-specific debugging guidance.

This helps reduce debugging time and makes common runtime errors easier to understand.

---

# Tech Stack

- TypeScript
- React
- TanStack Router
- Vite
- Bun

---

# Installation

```bash
git clone https://github.com/YusufVyce/Vyce-LuaUtility.git

cd Vyce-LuaUtility

bun install

bun run dev
```

---

# Roadmap

- [x] Runtime error analysis
- [x] Root cause detection
- [x] Roblox-specific diagnostics
- [x] Human-readable explanations
- [ ] Additional runtime error definitions
- [ ] Community-contributed error database
- [ ] Roblox Studio plugin

---

# Contributing

Contributions are always welcome.

You can help by:

- Reporting bugs
- Suggesting improvements
- Adding new runtime error definitions
- Improving documentation
- Opening pull requests

If you have ideas or questions, feel free to open a GitHub Discussion.

---

# License

Licensed under the GNU General Public License v3.0.

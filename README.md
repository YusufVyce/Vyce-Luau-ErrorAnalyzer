<div align="center">

# Vyce LuaUtility

### Advanced Error Analysis Toolkit for Roblox Studio (Luau)

Analyze Roblox runtime errors, identify root causes, and receive accurate debugging guidance.

**Built exclusively for Roblox Studio.**

<img src="images/preview.png" width="900"/>

<p>
  <a href="https://vyce-lua-utility.vercel.app"><strong>Live Demo</strong></a> •
  <a href="#features"><strong>Features</strong></a> •
  <a href="#installation"><strong>Installation</strong></a> •
  <a href="#contributing"><strong>Contributing</strong></a>
</p>

</div>

---

# About

Vyce LuaUtility is an open-source developer toolkit built specifically for **Roblox Studio (Luau)**.

Unlike traditional regex-based error parsers, Vyce LuaUtility analyzes runtime errors together with surrounding context to determine the most likely root cause and provide practical debugging guidance.

It helps Roblox developers understand **why** an error occurred instead of only showing **where** it happened.

> **Note**
>
> This project is designed exclusively for **Roblox Studio (Luau)**.
>
> It is **not** intended for FiveM, GTA V, Love2D, Defold, Garry's Mod, or any other Lua platform.

---

# Features

- 🔍 Context-aware runtime error analysis
- 🧠 Root cause detection
- 💡 Actionable debugging suggestions
- 📚 Human-readable explanations
- ⚡ Fast analysis engine
- 🛡️ Roblox-specific diagnostics
- 🧩 Supports common Luau runtime errors

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

...and more.

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

# Contributing

Contributions are welcome.

If you have ideas, bug reports, or improvements, feel free to open an Issue or start a Discussion.

---

# License

GNU General Public License v3.0

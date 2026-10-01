<div align="center">

# Vyce Parser

### Roblox Studio (Luau) Error Analysis & Learning Platform

Understand your errors, learn Roblox scripting, practice writing code, and improve as a developer.

**Built for Roblox Studio (Luau).**

<img src="images/görsel_2026-07-22_045124401.png" width="1920"/>

<p>
  <a href="https://parser.vyce.studio"><strong>🌐 Website</strong></a> •
  <a href="#features"><strong>✨ Features</strong></a> •
  <a href="#error-analysis"><strong>🔍 Error Analysis</strong></a> •
  <a href="#learning-system"><strong>📚 Learning</strong></a> •
  <a href="#tests--tasks"><strong>🧪 Tests & Tasks</strong></a> •
  <a href="#profile--progress"><strong>👤 Profile</strong></a>
</p>

</div>

---

# About

Vyce Parser is a platform built for Roblox Studio and Luau developers.

Its goal is not only to answer:

> **"Why did this error happen?"**

Vyce Parser is designed to help you learn Roblox scripting from the beginning, understand the code you write, solve errors yourself, practice through real code, and improve over time.

---

# Error Analysis

Vyce Parser analyzes Roblox and Luau errors and explains what went wrong in a way that is easier to understand.

## 🔍 Precise Diagnosis

- Supports analysis for **50+ real Roblox/Luau error messages**.
- Covers errors such as `attempt to index nil`, `attempt to call nil`, `is not a valid member`, infinite yield, script timeout, syntax errors, RemoteEvents, DataStores, HttpService, tweens, animations, and more.
- Finds the line where the error occurred and analyzes the problematic expression.
- Detects common causes such as failed `FindFirstChild` calls, using `LocalPlayer` on the server, accessing `player.Character` before it exists, typos, and similar issues.
- Explains the cause of the error step by step.
- Shows why a suggested fix solves the problem.
- Reports when an error cannot be properly recognized instead of presenting an uncertain explanation as a fact.
- Provides links to official Roblox documentation where relevant.
- Includes beginner-friendly explanations of technical terms.
- Can show the corrected version of the script when applicable.

## 🧠 Learn From Your Errors

Vyce Parser focuses on understanding the problem instead of simply replacing your code.

For example:

```text
hit ✓
  ↓
.Parent ✓
  ↓
.Humanoid ✗
```

This makes it easier to see exactly where an expression stops working.

---

# Learning System

## 📚 Lessons

Vyce Parser includes a structured learning system for learning Roblox Studio scripting.

- Lessons designed for beginners.
- English and Turkish language support.
- Step-by-step learning path.
- Short explanations and examples.
- Multiple-choice questions.
- Fill-in-the-blank exercises.
- Code ordering exercises.
- "What does Output show?" questions.
- Practical coding exercises.
- Review of incorrect answers.
- XP and progression system.
- Daily streak system.

Lesson examples can also be run in the browser simulator where supported.

---

# 🧪 Tests & Tasks

Vyce Parser lets you practice what you learn by actually writing and testing code.

## Test System

Write and test your code directly inside Vyce Parser.

- Write Luau code.
- Run it.
- See the result.
- Inspect errors.
- Change your code and test it again.

## 🎯 Tasks

The task system gives you coding exercises with different difficulty levels.

Your code is executed and checked against the requirements of the task.

For example:

```text
Output shows 42
Lava kills the player
leaderstats contains Coins = 0
```

This lets you practice writing code instead of only reading explanations.

---

# 📖 Error Dictionary

The **Error Dictionary** is a searchable collection of common Roblox/Luau errors.

For each error, you can find information such as:

- What the error means
- Common causes
- How it can be fixed
- A more detailed explanation

The goal is to give you a place to quickly understand an error when you encounter it.

---

# 🧩 Code Editor

Vyce Parser includes a Luau code editor with features that make writing code easier.

- Luau keyword autocomplete
- Local variable autocomplete
- Roblox services, classes and enums
- Library functions and methods
- Automatic brackets and quote closing
- Studio-style automatic `end`
- `Ctrl + /` for comments

---

# 🖥️ Playground

The Playground is an interactive environment for experimenting with Luau code in the browser.

- Write Scripts and LocalScripts
- Run your code
- Simulate players joining and leaving
- Simulate touching parts
- Press keys
- Click GUI buttons
- Inspect objects through Explorer
- View object properties
- Follow simulation output
- Automatically save code
- Share your work with a link

---

# 👤 Profile & Progress

Vyce Parser includes a profile system for tracking your progress.

## ⭐ XP & Levels

Earn XP through lessons, tasks, and other activities and progress through levels.

## 🔥 Daily Streak

Keep your daily learning streak going by continuing to learn and practice.

## 🏆 Achievements

Complete different goals throughout the platform and collect achievements.

## 📊 Progress

Track your learning progress, XP, achievements, and other activity from your profile.

## 🔑 Accounts

Lessons, challenges and the profile need an account: sign up with a username and password (no email needed) and your progress follows you to every device.

- XP is checked by the server: finished homework and challenges are run again in the same Luau simulator, quiz and practice answers are compared with the real answers. Editing browser storage can't add XP.
- Progress saved in a browser before accounts can be brought into a new account; only work the server can check counts.
- A one-time recovery code is shown at sign-up; it resets a forgotten password.

## 🏅 Leaderboards, Leagues & Friends

- Weekly leagues (Bronze, Silver, Gold, Platinum, Diamond): every Monday the top 20% move up and the bottom 20% move down.
- Follow friends by username and compare this week's XP.
- Daily, weekly and all-time XP rankings, plus the longest daily streaks. Days and weeks follow UTC.

## 🌐 Public Profiles

Every player has a public page at `/u/<username>` with their level, streak, league and achievements.

## 🎓 Vyce Parser License

Users who complete all lessons can receive a special **Vyce Parser License**.

---

# 🎨 Themes & Languages

## 🌙 Themes

- 🌙 Dark
- ☀️ Light
- System theme

## 🌍 Languages

- 🇹🇷 Turkish
- 🇬🇧 English

---

# ⚙️ How It Works

Vyce Parser analyzes Luau code and runtime errors to determine what went wrong and explain the problem.

The general analysis flow is:

```text
Roblox Studio Error
        │
        ▼
Error Normalization
        │
        ▼
Error Classification
        │
        ▼
Luau Lexer / Parser
        │
        ▼
AST
        │
        ▼
Semantic Analysis
        │
        ▼
Evidence Analysis
        │
        ▼
Root Cause Detection
        │
        ▼
Explanation
        │
        ▼
Fix
```

The analysis system combines the error message with the surrounding Luau code to explain the likely cause and provide a practical solution.

---

# 🔒 Privacy & Local Processing

Vyce Parser is designed to keep its core learning and analysis features local and browser-based where possible.

- No API key required.
- No external AI service required for error analysis.
- Learning progress and profile data are stored in the browser.
- With an account, the same progress (and your username on the leaderboard) is also stored on the server. Passwords are stored only as salted PBKDF2 hashes.

---

# ✨ Features

- 🔍 Roblox/Luau error analysis
- 🧠 Root cause explanations
- 💡 Error solutions
- 📚 Beginner-friendly explanations
- 📖 Error Dictionary
- 🎓 Roblox scripting lessons
- 🎯 Task system
- 🧪 Code testing system
- 🖥️ Luau Playground
- 🧩 Luau code editor
- 👤 Profile system
- 🔥 Daily Streak
- ⭐ XP & Level system
- 🏆 Achievement system
- 🎓 Vyce Parser License
- 🌙 Dark / ☀️ Light theme
- 🇹🇷 Turkish / 🇬🇧 English
- 📈 Learning progress tracking
- 🔑 Accounts with cross-device sync and server-checked XP
- 🏅 Weekly leagues, friends and daily / weekly / all-time leaderboards
- 🌐 Public player profiles

---

# 🛠️ Tech Stack

- TypeScript
- React
- Vite
- TanStack Router
- Bun

---

# 💻 Installation

```bash
git clone https://github.com/YusufVyce/Vyce-Luau-ErrorAnalyzer.git

cd Vyce-LuaUtility

bun install

bun run dev
```

### Accounts & leaderboard storage

Accounts and leaderboards are stored in [Upstash Redis](https://upstash.com) through its REST API (works on Vercel and Cloudflare, no extra packages). Set these environment variables — on Vercel, adding an Upstash Redis database from the Storage tab sets them for you:

```text
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
```

`KV_REST_API_URL` / `KV_REST_API_TOKEN` are accepted too. Without them, `bun run dev` keeps accounts in memory (lost on restart) and a production build shows "accounts aren't set up" while everything else keeps working. See `.env.example`.

---

# 🗺️ Roadmap

## Completed

- ✅ Luau parser
- ✅ AST generation
- ✅ Semantic analysis
- ✅ Error diagnosis
- ✅ Root cause detection
- ✅ Human-readable explanations
- ✅ Roblox-specific diagnostics
- ✅ Learning system
- ✅ Task / homework system
- ✅ Code challenges
- ✅ Error Dictionary
- ✅ Playground
- ✅ Profile system
- ✅ XP & Level system
- ✅ Daily Streak
- ✅ Achievement system
- ✅ Themes
- ✅ Turkish / English language support
- ✅ Code testing system
- ✅ Accounts & leaderboard

## Planned

- More Luau syntax coverage
- Additional Roblox API semantics
- Expanded diagnostics database
- Roblox Studio plugin
- Performance improvements
- Community-contributed diagnostics

---

# 🤝 Contributing

Contributions are welcome.

You can help by:

- Reporting bugs
- Improving parser coverage
- Adding new diagnostics
- Improving semantic analysis
- Expanding Roblox API support
- Improving lessons and exercises
- Opening pull requests

---

# 📄 License

Licensed under the GNU General Public License v3.0.

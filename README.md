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
- Every explanation, cause, step and code check is available in English and Turkish.

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

- Every lesson starts in plain words: an everyday comparison ("pcall is a safety net"), a few very short sentences on what it is and why you need it, and a small example explained one line at a time — in the lesson and at the top of its notes.
- 67 lessons in 15 units, from the Studio tour to CFrames, pcall, RemoteFunctions and two full game projects (a coin shop and a dropper tycoon).
- Six pro units take you the rest of the way: strict types, metatables, inheritance, closures and coroutines; session data, global leaderboards, serialization and cross-server messaging; server authority, rate limits, replication and anti-cheat; inventory, combat hitboxes, NPC pathfinding, quests and wave spawners; UI layout, sound, animation, camera and day-night cycles; project architecture, performance, monetization, teams and a final project.
- Every lesson has homework that runs in the browser simulator.
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

The task system gives you 118 coding challenges in three difficulty levels (easy, medium, hard). The algorithms tag collects 50 of them — searching, sorting, number theory, two pointers, dynamic programming (coin change, knapsack, edit distance), backtracking (permutations, N queens) and grids (flood fill, shortest path) — with bigger hidden tests, so a slow brute-force answer runs out of time. There are also game maths, text and table puzzles and Roblox world tasks like kill bricks, coin pickups, click doors and a safe RemoteEvent shop.

Every hint costs XP (a quarter of a challenge's reward, 20 XP on homework) and the panel shows how much is still on offer. Looking at the solution still marks the task as done, but it pays no XP — the page asks before showing it.

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

The **Error Dictionary** is a searchable collection of about 150 common Roblox/Luau errors, each explained by the analyzer in English and Turkish.

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

Every player has a public page at `/u/<username>` with their level, streak, league and achievements. Players can upload a profile photo and a banner there (PNG, JPEG, WebP or animated GIF). A crop window lets them drag and zoom the picture into the round photo frame or the 3:1 banner strip before saving; the browser shrinks it (GIFs stay animated) and the server checks the file type and size. The account button in the nav opens your own public profile.

## 💬 Forum

A community forum at `/forum` with categories (general, scripting help, showcase, site feedback). Anyone can read; posting needs an account and is rate-limited. Code between ``` lines is highlighted, and posts can carry up to 4 pictures or GIFs (pick, paste or drop them). Authors can delete their own posts, anyone signed in can report a post, and admins can pin, lock, edit and delete threads.

## 🛡️ Admin Panel

`/admin` is for the site owner and the admins they add. The owner is the account named `vyce` (pinned to that account the first time it's seen, so the role can't be taken over by renaming). The owner adds or removes admins by username; admins can't touch the owner or each other.

- **Overview:** accounts, sign-ups, active players, XP, forum activity, open reports and stored pictures, with 30-day charts (or tables), league sizes and homework completion per lesson.
- **Users:** search, sort and filter every account, then ban (with a reason and a length, optionally deleting their forum posts), lift a ban, add or set XP, mark lessons and challenges done or not done (with or without their XP), reset progress, rename, make a new recovery code, sign them out everywhere, remove their photo or banner, delete their forum posts or delete the account. Banned players see the reason and end date when they try to log in.
- **Forum:** reported posts with the reasons, and the newest posts, with delete and dismiss.
- **Name bans:** block a name exactly or anywhere in a username (e.g. `admin` blocks `xAdminx`).
- **Site settings:** an announcement shown on every page, closing sign-ups, and a read-only forum.
- **Log:** every admin action, newest first.

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
- 🌐 Public player profiles with photos and banners
- 💬 Community forum with pictures and reports
- 🛡️ Admin panel: stats, bans, name bans, XP and lesson editing, site announcement

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
- ✅ Forum and profile photos
- ✅ Admin panel

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

# RepQuest — No Mercy

A local-first everyday RPG built on RepQuest fitness. Turn a daily routine, personal project, or longer goal into a quest and earn XP in the same character system as workouts.

[Play RepQuest — No Mercy](https://steamaccforme1983-lang.github.io/repquest-no-mercy/)

## Start

Use Node.js 20 or later. No package installation is required.

    node serve.mjs

Open http://127.0.0.1:4173/. To run the engine tests:

    node --test engine.test.mjs life.test.mjs

The static frontend is in dist/. Serve it over HTTPS or localhost for installability and offline use. The online fitness coach is optional and requires the local Node server with an OpenAI API key in its environment. The browser version includes the offline fitness guide.

## Make a quest

Choose **Add Quest**, enter a name, choose a board section, and set your XP and recurrence. The default is a daily quest worth 10 XP. Main quests can have individually checkable milestones. Check the quest to earn its XP. Undo is available on the board and in quest history.

Daily, weekly, and monthly quests award XP once per scheduled period. One-time quests remain available from their start date until completed. Monthly quests fall on the last day of shorter months when necessary. To reschedule, edit the quest's start date or time. Archiving or deleting a template keeps past completions and their XP. Missing a quest costs no XP.

Custom rewards range from 0 to 100 XP per completion, with a 500 XP daily limit for custom quest completions. Fitness XP is separate from that limit. Each category earns a skill level per 100 category XP. Streak visibility is optional and never affects rewards. Create personal rewards and equip cosmetic icons from **Life Quests** once their player or category level is reached.

## Backups and integrations

Workout and custom quest data are stored in your browser. To bring your original RepQuest fitness progress into No Mercy, download your JSON backup in the original app, then import it from **Settings** in this app. Both versions keep their own browser storage. Merge restores compatible records without rewarding the same completion twice.

**Integrations** offers a recurring iCalendar export with optional reminder alarms, Google Calendar import, Sheets-ready CSV, JSON backup, and reviewable Gmail recap templates. Browser reminders appear while the app is open. Saving calendar events, uploading backups to Drive, and sending email are user-controlled actions. The public static app has no direct Google account connector.

The local Node server also supports the online fitness coach via OPENAI_API_KEY, with an optional REPQUEST_OPENAI_MODEL override. The browser gets an availability flag and sends a question only when you choose **Ask online coach**. Logs and preferences stay in your browser.

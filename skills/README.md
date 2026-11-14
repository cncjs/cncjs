# CNCjs contributor skills

These skills describe this checkout. Start with `skills/<name>/SKILL.md` and
read only the references selected by its routing table. Source paths are
repository-relative; `references/` links are relative to the skill directory.
`AGENTS.md` is the shared instruction entry point; `CLAUDE.md` imports it.

Codex and omp discover the relative links in `.agents/skills/`; Claude Code
discovers the links in `.claude/skills/`. Both point to the same directories.
Edit the physical skill directory, not the discovery links.

| Skill | Use it for |
| --- | --- |
| [cncjs-controller](cncjs-controller/SKILL.md) | Controller protocols, integration, simulator and safety verification |
| [cncjs-i18n](cncjs-i18n/SKILL.md) | String extraction, translation and localization validation |
| [cncjs-patterns](cncjs-patterns/SKILL.md) | Repository architecture and development patterns |
| [cncjs-pr](cncjs-pr/SKILL.md) | Preparing pull requests and changesets |
| [cncjs-version](cncjs-version/SKILL.md) | Version and release maintenance |
| [cncjs-workspace](cncjs-workspace/SKILL.md) | Workspace widgets, layout, state and browser behavior |

Keep safety and authorization requirements visible in each entry. Controller
skills own protocol and command/state contracts; workspace skills own widget
layout and persistence. Load both when a change crosses those boundaries.

# CNCjs contributor skills

These contributor skills live in `skills/<name>/SKILL.md`. Each has a name and
a trigger description for compatible agents. `AGENTS.md` is the shared entry
point; `CLAUDE.md` imports it.

Codex and omp discover the relative links in `.agents/skills/`; Claude Code
discovers the links in `.claude/skills/`. Both point to the same directories.
Edit the physical skill directory, not the discovery links.

| Skill | Use it for |
| --- | --- |
| [cncjs-controller](cncjs-controller/SKILL.md) | Controller protocols, app integration, simulator and safety verification |
| [cncjs-i18n](cncjs-i18n/SKILL.md) | String extraction, translation, and localization validation |
| [cncjs-patterns](cncjs-patterns/SKILL.md) | Repository architecture and development patterns |
| [cncjs-pr](cncjs-pr/SKILL.md) | Preparing pull requests and changesets |
| [cncjs-version](cncjs-version/SKILL.md) | Version and release maintenance |
| [cncjs-workspace](cncjs-workspace/SKILL.md) | Workspace widgets, server integration and browser verification |

## Reading and maintaining skills

Start with `SKILL.md`, then read only the references selected by its task-routing
table. Source paths are repository-relative; `references/...` links are relative
to the skill directory. Agents that support skill URIs can also read
`skill://<name>/references/<file>.md`.

Keep scope, safety bottom lines, conditional routes, and completion criteria in
the entry. Put detailed contracts, commands, and examples in a single
`references/` level; references must not require another reference to interpret
them. A short, coherent procedure can stay in `SKILL.md`.

Shared repository policies belong in `AGENTS.md` or `.omp/RULES.md`. Link to the
owner instead of copying it. Controller skills own protocol and command/state
contracts; workspace skills own browser fixtures, layout, and persistence.
Load both only when the changed behavior crosses those areas.

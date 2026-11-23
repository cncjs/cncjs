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
| [cncjs-i18n](cncjs-i18n/SKILL.md) | Extracting changed source strings, updating translations, or auditing completeness without extraction |
| [cncjs-patterns](cncjs-patterns/SKILL.md) | Repository architecture and development patterns |
| [cncjs-pr](cncjs-pr/SKILL.md) | Drafting PR and commit text, deciding whether a changeset is needed, and drafting its content |
| [cncjs-version](cncjs-version/SKILL.md) | Maintaining dependencies, runtime support, and packaging; inspecting or carrying out authorized release work |
| [cncjs-workspace](cncjs-workspace/SKILL.md) | Workspace widgets, layout, state and browser behavior |

Keep safety and authorization requirements visible in each entry. Controller
skills own protocol and command/state contracts; workspace skills own widget
layout and persistence. Load both when a change crosses those boundaries.

## Future marketplace

Contributor skills stay checkout-native. Before packaging a consumer skill,
identify a task that is useful without the CNCjs source checkout.

A future consumer plugin would live at `plugins/<name>/`, with its own
`.claude-plugin/plugin.json` and `skills/<name>/`. Bundle only the resources
the plugin needs. Do not use symlinks that escape the plugin or duplicate
native selectors. Version plugins independently of CNCjs.

The future catalogs `.claude-plugin/marketplace.json` (Claude Code and omp)
and `.agents/plugins/marketplace.json` (Codex) would point to the same plugin
roots. Validate the manifests and test native and installed discovery
separately with isolated client profiles and local bundles outside the
checkout. Publication requires separate authorization.

This layout is a proposal only. No plugin directories, manifests,
installations, registry changes, or publication are part of this work.

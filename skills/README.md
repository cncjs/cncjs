# CNCjs contributor skills

These skills describe this checkout. `AGENTS.md` is the shared instruction
entry point; `CLAUDE.md` imports it.

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

## Layout

```text
skills/<name>/
├── SKILL.md
└── references/          # optional, for task-specific detail
.agents/skills/<name>    # relative link to skills/<name>/
.claude/skills/<name>    # relative link to skills/<name>/
```

Keep the entry point and its references together. Put triggers, safety rules,
and task routing in `SKILL.md`. Keep procedures needed only for specific tasks
in `references/` and link them directly from the entry. Source paths are
repository-relative; reference links are skill-relative.

## Use a local checkout without installation

Start the client from the CNCjs checkout. Both discovery directories point to
the same six contributor skills; edit the canonical files, not the adapters.

- **Claude Code:** `.claude/skills/<name>` (for example, `/cncjs-pr`).
- **Codex:** `.agents/skills/<name>` (for example, `$cncjs-pr`).
- **omp:** native checkout discovery (for example, `skill://cncjs-pr`).

## Maintain and verify

Check that both adapters resolve to each canonical skill and that each
reference is linked directly from its entry. Then read the changed entry and
one routed reference in the target client. Link checks alone do not prove
client discovery.

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

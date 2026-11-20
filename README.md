# Research Talk Slides

A reusable Codex skill and small rendering toolkit for visual research presentations. White space, large typography, selective blue emphasis, native evidence charts, and concise progressive explanations.

**This repository contains no real paper or talk content.** Examples are fictional. Keep every real talk in an external private project with an independent Git history.

## Install the skill

Clone this repository where you maintain reusable tools, then link its folder into your personal Codex skills directory. The folder contains the required `SKILL.md`; restart skill discovery if your client requires it. Use `$research-talk-slides` when requesting a talk.

## Offline HTML

Requires Node.js 20 or newer, with no npm dependencies.

```sh
node scripts/build-html.mjs --project /absolute/path/to/private-talk --out /absolute/path/to/private-talk/dist
node --test tests/*.test.mjs
```

Prepare `deck.json` and `assets/` in the private talk directory. Copy `examples/fictional.deck.json` there as `deck.json` to try the renderer without research data. Open the generated `index.html` directly or serve that output directory on localhost. The output contains its referenced assets and needs no CDN.

Controls: arrows/Space advance, Shift+Right skips remaining reveals, Home/End jump, N toggles notes, O toggles overview, F toggles fullscreen. Clicking media toggles playback. Print displays all slides and reveals, using video posters.

The scene format includes `flow` for explicit polyline connections with open arrowheads. A slide can have a sequence of `builds` with speaking cues. Combine progressive focus, temporary guide intervals, presentation-only visual states, and chart/table group reveals to explain more within the same page. Print and editable slides use the complete static base, omitting transient guides. Field definitions are in [the project contract](references/project-contract.md).

## Editable slide integration

`src/editable.mjs` exports `appendSlides(presentation, deck, {loadAsset})` for `@oai/artifact-tool`. Use a compatible runtime provided by your host. Pass a live session's presentation or a local presentation object, then render and validate through that host. This optional runtime is not required for HTML and is not installed automatically. Native text, shapes, charts, and tables stay editable; videos use poster images and links.

## Review the visual argument

Start each insight with evidence the audience can see. Keep method dependencies, branches, merges, and feedback loops explicit. Alternate concise statements with visual explanations, and check that column alignment does not imply an unsupported relationship. Verify short headlines and real bold rendering in both outputs. Pick video posters from representative moments instead of using one fixed offset for every clip. The [design guide](references/design.md) explains these checks and how to use progressive focus.

The test suite covers scene boundaries, isolated asset handling, flow geometry, and generated browser-program syntax. Automated checks complement a visual review of every slide and its reveal sequence.

## Isolation and publication

The renderer refuses project/output paths in this repository and rejects asset traversal, including symlink escapes. It does not search for papers or upload files. The public audit is a defense in addition to manual review, not a guarantee of confidentiality. Inspect the entire Git history before pushing. Keep private denylist files, source manifests, build logs, and outputs in the private project.

Style reference and implementation guidance are in `references/`. No reference video, paper figures, or original slides are redistributed.

# External project contract

A real project has `deck.json`, `assets/`, optional private authoring scripts, and a private output directory. It lives outside the skill repository. Its Git history, remote, and publication are separate decisions.

The scene document contains `title`, `language`, `width`, `height`, `fontFamily`, `slides`. A slide has `id`, `title`, `notes`, `sources`, `elements`, and optionally `appendix`. Elements use `type`, `x`, `y`, `w`, `h`, and an optional nonnegative `step`. Supported types are `text`, `image`, `video`, `line`, `rect`, `flow`, `chart`, and `table`. See the fictional example for concrete fields.

Text uses literal Unicode; no user-supplied HTML is evaluated. Images and video `src`/`poster` are paths relative to the private project. Assets must resolve inside that project, including through symlinks. Web citations and media links use explicit HTTPS URLs. The HTML builder copies referenced files into the output without reading unrelated folders. Its output must be inside the project and outside the skill repository. It never uploads anything.

The editable renderer takes a `presentation` object, a scene document, and `loadAsset(relativePath)` supplied by the private caller. It creates native text, diagram shapes, charts, and tables. Videos become their poster image with an explicit source link and a note: automatic HTML playback is not represented as a PowerPoint video. The caller owns rendering, package validation, and final export.

Public examples must be invented and visibly labeled fictional. Private reports may not be used as snapshots or tests. Any project-specific adapters, source locations, citations, download manifests, and presentation IDs belong to the private project.

## Flow geometry

Use `flow` for a polyline with an optional open arrow at its final point. It uses the normal positive `x`, `y`, `w`, `h` bounding box and `points: [[x, y], ...]` in pixels relative to that box. At least two points are required; all coordinates must be finite and inside the box, and consecutive points must differ. `width` is the positive stroke width (default `3`), `color` defaults to the secondary gray, and `arrow` defaults to `true`. Set `arrow: false` for an unheaded branch or return line. Leave padding around the endpoint for a symmetric arrowhead; generated arrowhead points are clipped to the box. Both renderers share this geometry. HTML uses SVG polylines; editable slides use native custom paths with no fill.

```json
{"type":"flow","x":200,"y":250,"w":320,"h":140,"points":[[12,20],[290,20],[290,125]],"width":3,"color":"#0877D1","step":1}
```

## Progressive focus

Any element can have `ghost: true`: before its `step`, it remains in place at 14% opacity rather than disappearing or moving. This shows the whole mechanism before its parts are explained. An optional nonnegative `focusStep` keeps an already revealed element fully visible at that step and dims it to 25% at other steps. Pending reveal behavior takes precedence over focus. Focus steps count toward slide navigation even if no new element is revealed then. `ghost` and `focusStep` never move an element. Printing and editable-slide output show every non-ephemeral element in its base state at full opacity; these fields affect only HTML presentation timing.


## Semantic builds

A slide can declare `builds: [{"label":"Observe","note":"Describe the phenomenon."}, {"label":"Explain","note":"Connect it to the mechanism."}]`. Array positions are zero-based step numbers. Only `label` and `note` are allowed in each object; both are optional literal strings. An explicit `builds` array must be nonempty. The control bar shows both slide and build counts, and the notes panel shows the current label/note followed by the slide-level notes. Editable slides include the complete build-note sequence in speaker notes.

Navigation includes all declared builds, element reveal/focus steps, state steps, and internal chart/table steps. `until`, when present, also contributes its value. Previous navigation and direct hashes such as `#2.1` recompute the state from the base; they do not carry later overrides backward. A hash is clamped to valid slide/build bounds.

## Temporary elements and repeated focus

- `until: 2` means the element remains visible through step 2, then disappears if the slide advances further. It cannot precede the element's `step` and does not itself create an extra disappearance step; declare that later build when needed.
- `static: false` marks a presentation-only overlay. It can be visible during the HTML talk but is omitted from print and editable-slide output. Use it for temporary callouts, veils, or comparison guides, never for information needed in the final static deck.
- `focusSteps: [1, 3]` keeps an already revealed element at full emphasis on either step and dims it to 25% otherwise. It is combined with the legacy `focusStep`, if both are present. Before the reveal step, `ghost`/hidden behavior takes precedence; after `until`, the element is hidden.

## Cumulative presentation states

`states` is an optional array of visual overrides in strictly increasing, unique `step` order. Allowed fields are only `step`, `opacity`, `color`, `bold`, `fill`, `stroke`, `x`, `y`, `w`, and `h`. Fields omitted by a later state retain the previous state's override. Rewinding recomputes the cumulative state from scratch. A base field remains authoritative when no override is active.

```json
{"type":"text","text":"Fictional result","x":120,"y":200,"w":700,"h":80,"color":"#101214","states":[{"step":1,"color":"#0877D1","bold":true},{"step":2,"x":200,"opacity":0.5},{"step":3,"x":120,"color":"#101214","bold":false,"opacity":1}]}
```

State geometry must be finite and stay inside the slide at every cumulative step; widths and heights must remain positive. Opacity must be finite within 0–1, and `bold` must be boolean. Colors accept hex, named colors, or numeric rgb/hsl notation; scripts, URLs, and arbitrary CSS declarations are not accepted. Prefer hex for consistent rendering. `color` changes text, flow/line paint, and chart/table labels; `fill` changes the element background; `stroke` changes a rectangle border or a flow stroke. Use `stroke: "none"` to remove a temporary border. Fields only affect the element's relevant visual properties, never its text, data, asset, or flow geometry. A moved/resized flow scales its existing SVG viewport.

Presentation opacity is multiplied by focus dimming. Pending, expired, or zero-opacity media do not play. Manual pause through the play button survives unrelated build changes and slide navigation. Reduced motion disables automatic playback, transitions, and path drawing; explicit playback still works. Videos pause in overview, blackout, print, and hidden-document states.

All state overrides are written to a stylesheet with `media="screen"`. Print therefore uses the untouched base geometry and styling even if invoked mid-build. All non-ephemeral rows and chart groups print fully; native export reads base elements directly and ignores visual states. Use a final build that restores the base view when the end of the HTML talk should match the static deck visually.

## Reveal evidence without changing it

Charts can specify `categorySteps` (one step per category) and `seriesSteps` (one per series). Category labels reveal at `max(element.step, categoryStep)`; each complete bar and its value label reveal at `max(element.step, categoryStep, seriesStep)`. The axis domain, tick labels, bar positions, and underlying values stay fixed. A missing array is equivalent to all zeros. Bars fade in as complete groups; their widths are never animated.

Tables can specify `rowSteps` with one entry per row, including the header. A row reveals at `max(element.step, rowStep)` while retaining its layout space. Arrays must exactly match the corresponding dimensions and contain nonnegative integer steps. Print and native export include all rows, series, and categories regardless of these timing fields.

## Draw a method connection

A `flow` may additionally use `draw: true`. On reveal, its main SVG polyline traces from its first point to its last point over 600 ms; bends are traversed in the supplied point order. The arrowhead appears at completion. No additional click is required, and reversing to a pending/expired/zero-opacity state resets the trace. Other elements cannot use `draw`, and its value must be boolean. Reduced-motion presentation, print, and editable output show the complete path immediately. Drawing changes no coordinates or connectivity.

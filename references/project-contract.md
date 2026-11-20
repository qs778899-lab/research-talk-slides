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

Any element can have `ghost: true`: before its `step`, it remains in place at 14% opacity rather than disappearing or moving. This shows the whole mechanism before its parts are explained. An optional nonnegative `focusStep` keeps an already revealed element fully visible at that step and dims it to 25% at other steps. Pending reveal behavior takes precedence over focus. Focus steps count toward slide navigation even if no new element is revealed then. `ghost` and `focusStep` never move an element. Printing and editable-slide output show all elements at full opacity; these fields affect only HTML presentation timing.

# External project contract

A real project has `deck.json`, `assets/`, optional private authoring scripts, and a private output directory. It lives outside the skill repository. Its Git history, remote, and publication are separate decisions.

The scene document contains `title`, `language`, `width`, `height`, `fontFamily`, `slides`. A slide has `id`, `title`, `notes`, `sources`, `elements`, and optionally `appendix`. Elements use `type`, `x`, `y`, `w`, `h`, and an optional nonnegative `step`. Supported types are `text`, `image`, `video`, `line`, `rect`, `chart`, and `table`. See the fictional example for concrete fields.

Text uses literal Unicode; no user-supplied HTML is evaluated. Images and video `src`/`poster` are paths relative to the private project. Assets must resolve inside that project, including through symlinks. Web citations and media links use explicit HTTPS URLs. The HTML builder copies referenced files into the output without reading unrelated folders. Its output must be inside the project and outside the skill repository. It never uploads anything.

The editable renderer takes a `presentation` object, a scene document, and `loadAsset(relativePath)` supplied by the private caller. It creates native text, diagram shapes, charts, and tables. Videos become their poster image with an explicit source link and a note: automatic HTML playback is not represented as a PowerPoint video. The caller owns rendering, package validation, and final export.

Public examples must be invented and visibly labeled fictional. Private reports may not be used as snapshots or tests. Any project-specific adapters, source locations, citations, download manifests, and presentation IDs belong to the private project.

# Visual and motion language

## Reference observations

Reference: https://www.youtube.com/live/uPXoJm-L3YY?t=13327s

The source talk uses a white canvas, large black sans-serif headlines, gray secondary phrases, and selective blue emphasis. Demonstrations occupy substantial space. Related method components stay in place as attention moves between them. Quantitative pages promote a small number of grounded results to large type. Video collages are used for breadth; a single demonstration is used for focus.

These are observations of the slides, not the later subtitle styling or conference broadcast frame. No source screenshots, scientific content, or media are distributed here.

In the supplied SuperMimic excerpt, approximately 195, 205, and 215 seconds from the **start of that excerpt** illustrate a useful progression: the same diagram stays in place as its stages gain emphasis and its loop becomes explicit. These are excerpt-relative review cues, not timestamps in the full linked recording. Learn the way attention moves through the argument as well as the colors and typography.

## Default theme

- Canvas: 1600 × 900 (16:9). Safe area: 90 px horizontally, 64 px vertically.
- Background: white. Ink: `#101214`. Secondary: `#747A80`. Accent: `#0877D1`.
- Fonts: one available sans-serif family with the required character coverage. For Chinese projects, use an available CJK sans-serif face; preserve the choice in the project. Verify that a usable bold face actually renders in each output. Setting `bold: true` does not prove the exported text has the intended weight. Do not distribute proprietary system fonts.
- Typical title: 62–76 px. Main text: 30–38 px. Secondary: 24–28 px. Sources: 17–20 px. Short impact words can be much larger.
- Keep titles to a short question or claim. Put necessary conditions in a readable subtitle or caption instead of stretching the headline across the whole canvas.
- Prefer one or two visual regions over a dashboard of boxes. Keep charts on white with a zero baseline for bars and direct labels. Use gray for context and blue for the comparison under discussion.
- Keep real images proportional. Use contain for evidence. Cover crops require a deliberate inspection.

## Six composition families

1. Cover: a large name, one descriptive line, and an authentic hero image.
2. Question or thesis: a short statement plus the phenomenon that motivates it.
3. Image and explanation: one dominant image, two or three concise observations.
4. Mechanism: a small flow with stable component positions and readable arrows.
5. Comparison: matched visual conditions or an editable quantitative chart.
6. Demonstration: nearly full-width media with a clear, minimal caption.

## Visual reasoning

Choose the visual evidence for an insight before polishing its headline. A meaningful frame, a measured comparison, or a clearly labeled conceptual diagram should carry the explanation. A large abstract sentence alone rarely explains a mechanism. Alternate statement pages with demonstrations, diagrams, and evidence; review consecutive pages so a run of abstract text does not interrupt the visual argument.

Treat a method diagram as a claim about dependencies. Check where every input originates, where branches split, which outputs merge, what each arrow carries, and how feedback closes the loop. A reconstruction or auxiliary branch needs an explicit destination or a clear scope label. Simplification can omit implementation detail while preserving the dependencies needed to understand the claim. Keep speculative or conceptual relationships visibly distinct from measured evidence.

Read spatial alignment as an implied statement. Matching columns, proximity, shared colors, and arrows can suggest one-to-one correspondence or causation even when the words do not. Use a common caption, separate row, or explicit matrix for relationships shared across multiple groups. Do not align unrelated categories solely to make a balanced grid.

## Motion

Use numbered build steps only where they improve reasoning. One click should change one part of the argument: add evidence, compare alternatives, explain a relationship, or state its implication. Keep useful context visible. Stable anchors help the audience track an object, but do not forbid purposeful reflow: an established example can shrink to make room for its explanation. Avoid gratuitous transforms and long transitions. HTML videos are muted, looped, and paused off-screen. Playback failure leaves a poster and a visible play control. Respect reduced motion by disabling transitions and autoplay. Slides remain understandable in their complete static view with videos replaced by posters.

For a mechanism, use `ghost: true` to show its pending structure faintly in place, then use `focusStep` to emphasize the part currently being explained. Keep nodes and connectors at stable positions. Reveal a missing dependency only when the explanation introduces it; avoid leaving an arrow detached from its source or destination at an intermediate step. Inspect the full sequence, the print view, and the editable slide's final static state.

Choose video posters by inspecting the actual clip. Select a representative moment that makes the nearby claim understandable, and retain enough context to interpret the action. A fixed offset used for every clip may capture setup, a transition, or an unrepresentative pose. Check posters separately because they are the evidence seen in static exports and when autoplay is unavailable.

### Build the explanation inside the page

Review the reference as a time sequence, not just a collection of screenshots. Separate authored changes to labels, graphics, and layout from motion inside a demonstration video. A looping robot clip does not by itself provide a sequence of explanatory builds. Observed excerpt-relative examples include moving column focus around 124–140 seconds, the component and loop construction around 192–210 seconds, and a metric replacement followed by layout reflow around 294–305 seconds. The recording establishes the visual result, not which authoring application or animation mechanism produced it.

Write a short beat sheet for each core page. Usually two to five meaningful states suffice; a complete feedback mechanism may need more, while a demonstration may need only one. Do not add an identical number of clicks to every page. Use a small vocabulary deliberately:

- Establish a whole picture, then move a temporary frame or emphasis through its parts.
- Build a mechanism inside a component: input, intermediate representation, relation direction, feedback loop, implication.
- Retire a temporary label or guide when its job is done. Replacement can be clearer than permanent accumulation.
- Keep comparison axes and underlying values fixed while revealing matched data groups. Never invent intermediate values or imply new measurements by tweening bar lengths.
- Move or resize an existing visual only to create room for the next explanatory unit, keeping its identity and aspect ratio recognizable.
- End with a coherent view that can be read without the animation. Define a separate static base for printing and editable exports so temporary overlays do not accumulate.

Inspect every state in both directions. Check that arrows terminate at visible nodes, emphasis does not imply an unsupported causal claim, overlays do not hide legends or conditions, and a return click restores the earlier state. Keep per-build speaking cues in notes rather than adding control instructions to the slide canvas. Check the no-motion alternative as well as the timed transition.

## Narrative

The useful sequence is question → design judgment → mechanism → evidence → implication. Vary density and pace. The reference is inspiration, not a requirement to imitate its claims, humor, or exact number of pages. Do not force every slide title into a slogan. Clearly qualify an example-specific result.

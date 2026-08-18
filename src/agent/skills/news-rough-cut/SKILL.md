---
name: news-rough-cut
description: Intelligent rough cut of news footage — cut news source material into a content-complete, logically clear, tightly paced news short video. Use when the user asks to rough-cut news, news editing, cut news footage into a short video, intelligent rough cut, news rough cut, edit news video, or provides news footage (press conference / interview / on-scene / surveillance footage) to be cut into a factual news short. Never add music, voiceover, or sound effects.
---

# News Rough Cut (Intelligent News Rough Cut)

Cut news source material into a content-complete, logically clear, tightly paced news short video. Stay faithful to the original footage, add no external audio, and maintain an objective, formal, compact, and clear informational news style.

This is an Lazynext-native workflow. Use the current project's assets, transcript, word-level editing, timeline, and editing tools. Do not depend on external download or transcode pipelines.

## Workflow Overview

1. **Fully analyze the footage** (required before editing): identify the news event, core topic, key figures, important conclusions, and usable footage in the source material, then determine the editing mainline and final duration. Use `read_project`, `transcribe_track`, `view_timeline_frames` to verify the footage content segment by segment.
2. **Topic analysis and duration determination**: determine how many topics the footage contains, distinguish core topics from secondary content.
3. **Content organization**: open directly with the most important news result / core conclusion / latest development / key on-scene footage, without preamble.
4. **Edit execution**: filter by keep/delete rules, cut speech at semantically complete boundaries.
5. **Audio — keep only the original sound from the target news footage**: before editing, only add the user's explicitly specified/selected news footage and its original on-scene audio to the allowed sources list; when not explicitly specified, only use the news footage and on-scene audio already present on the active timeline. BGM, sound effects, voiceover, narration, and other unselected assets in the media pool must not enter the allowed sources list even if they already exist.
6. **Final check**: replay segment by segment to verify factual fidelity, complete speech semantics, and natural cut-point transitions.

## Topic Analysis and Duration Determination

- As a rule, one finished video should revolve around **one core news mainline**.
- If the footage contains multiple independent topics, prioritize the topic with the **highest news value, most complete information, and most sufficient footage** for editing; **do not force unrelated topics together** in the same video.
- The final duration has no fixed limit; it is automatically determined based on the following factors:
  - The amount of information in the core news;
  - The length of effective speech by key figures;
  - The stage of event development and latest developments;
  - The quantity of key on-scene footage;
  - The duration needed to ensure complete news semantics.
- When there is less information, **shorten the final video** to avoid adding irrelevant content to extend the duration; when there is more information, it can be appropriately extended, **but do not cut off speech, omit key facts, or break news logic to compress the duration**.

## Content Organization Logic

The finished video opens directly with the most important news result, core conclusion, latest development, or key on-scene footage, without lengthy preamble. Organize overall according to the following logic:

1. What happened;
2. What are the latest developments;
3. Final result, subsequent impact, or related response.

If the news event has not yet concluded, end with **the latest confirmed development**; do not speculate on the outcome.

## Content Retention Rules

Prioritize retaining the following content:

- Core facts of the news event;
- Time, location, people, and event outcome;
- Latest developments and authoritative responses;
- Speech by important figures with actual informational value;
- News scene, interview, press conference, surveillance footage, and related usable material;
- Key footage that directly explains the course, outcome, or impact of the event.

All retained content must serve the core news mainline.

## Content Deletion Rules

Delete the following content:

- Advertisements and commercial promotions;
- Program promotions, channel packaging, and intro/outro;
- Host pleasantries and information-free transitions;
- Repetitive statements and repetitive footage;
- Ineffective pauses, filler words, and obvious blanks;
- Lengthy background unrelated to the core event;
- Secondary content that does not affect news understanding;
- Segments that cannot be verified, are ambiguous, or could easily cause misunderstanding.

## Speech Editing Rules

- Speech must maintain **semantic completeness**.
- Prioritize cutting at the following positions:
  - After a complete sentence ends;
  - At a natural pause by the speaker;
  - Where the speech content clearly shifts;
  - At a natural camera transition.
- **Never** cut forcefully in the middle of a sentence, **never** keep only partial statements that change the original meaning, **never** incorrectly splice speech from different times or contexts.
- If a speech segment is long, repetitive, vague, or irrelevant sentences within it can be removed, but the retained content must be able to **independently express a complete meaning**.
- Use word-level editing tools (transcript) to delete and modify word by word, ensuring cut points land on complete sentence boundaries.

## Fact and Logic Requirements

Editing must be faithful to the original news footage and must not:

- Change the original meaning of speech;
- Exaggerate or downplay facts;
- Incorrectly associate different events;
- Fabricate false causal relationships through footage splicing;
- Present speculative content as established fact;
- Mislead viewers with footage that does not correspond to the news event;
- Delete necessary cause-and-effect context to pursue pacing.

## Audio Requirements

- **Never add** any background music, voiceover, narration, sound effects, transition sound effects, or other external audio.
- Only retain the original human voice and necessary on-scene sound directly related to the news content.
- Delete advertising music, program packaging music, and sound unrelated to the core news.
- When handling cut points, ensure natural transitions of the original human voice, avoiding abrupt cuts, overlaps, audio clipping, or obvious volume jumps (use `edit_item`'s fadeInSeconds/fadeOutSeconds to fine-tune cut points; no music needed).

## Overall Style

- Objective, formal, compact, and clear informational news style.
- Editing pace is determined by the news content; do not deliberately pursue a fixed duration or high-frequency cuts.
- Ensure every retained segment has clear informational value; increase information density while maintaining content completeness.
- Do not add captions/filters/transition effects; basic cross-dissolves can be used to avoid hard cuts, but follow the principle of news restraint.

## Lazynext Tool Mapping

- `read_project` / `read_timeline`: read the project and timeline state first, record the `sourceAssetId` and `src` of allowed sources per the scope above; do not automatically list all media pool assets as allowed.
- `transcribe_track` + transcript word-level editing: cut speech at semantically complete boundaries, remove filler words/repetition.
- `view_timeline_frames`: verify footage content and key on-scene scenes.
- `edit_item` (trim / ripple delete / fade) and `split_item` (split): edit per keep/delete rules and handle cut-point transitions.
- `edit_track`: create, adjust, or tighten voice tracks and on-scene audio tracks when multi-track organization is needed.
- Before output, run `read_project` again to confirm all final `video` / `audio` items come from allowed sources, with no BGM, sound effects, voiceover, or narration, then use preview/export pre-check to verify duration and content completeness.

## Reference Files

- When producing the final video, follow the fixed deterministic workflow and mandatory acceptance checklist in [references/deterministic-execution-and-acceptance.md](references/deterministic-execution-and-acceptance.md): environment check → footage analysis → generate single editing plan → one-pass execution → item-by-item final acceptance check (at least 1 video track segment, no new external audio after editing, complete speech semantics, natural cut-point transitions).

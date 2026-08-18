# News Rough Cut — Deterministic Execution Template and Acceptance Checklist

> Lazynext-native reference. Draws on common practices from industry deterministic editing workflows (environment check → footage analysis → generate single deterministic editing plan → one-pass execution → mandatory acceptance).
> Follows the rules in this skill's SKILL.md: faithful to original footage, no external audio added, speech cut at semantically complete boundaries, objective and restrained news style.

## I. Execution Sequence (fixed sequence, do not skip steps)

1. **Environment and Footage Check (prerequisite, required)**
   - Use `read_project` / `read_timeline` to confirm the current project and timeline exist and contain target footage segments.
   - Build the allowed sources list: only record the `sourceAssetId` and `src` of the user's explicitly specified/selected news footage and its original on-scene audio; when not explicitly specified, only include the news footage and on-scene audio already present on the active timeline. BGM, SFX, voiceover, narration, and other unselected assets in the media pool are not included.
   - Use `transcribe_track` to get the word-level transcript; if a track cannot be transcribed, resolve the footage accessibility issue first before continuing.
   - Use `view_timeline_frames` to verify key footage and source content.
   - If the prerequisite check fails → stop and report what is missing; do not pretend to be done.

2. **Footage Analysis and Topic Determination**
   - Identify: news event / core topic / key figures / important conclusions / usable footage.
   - Determine topic count: one finished video revolves around one core news mainline; for multiple topics, select the one with the highest news value, most complete information, and most sufficient footage.
   - Determine the final duration upper limit (determined by information volume and effective speech length; no rigid fixed value).

3. **Generate Editing Plan (plan first, then execute)**
   - Produce **one clear editing plan** per the "keep / delete" rules: segments to keep (with sentence boundaries), filler words/repetition/ads to delete, cut points to fine-tune.
   - Principle: open directly with conclusion/latest development/key footage; cut speech only at complete sentence endings/natural pauses/clear shifts/camera transitions.
   - This step produces a "deterministic plan" — it is not asking the user to approve each step; the plan is formed in one pass.

4. **One-Pass Execution**
   - Use `edit_item`'s batch update/delete to apply trim, ripple delete, and fade; call `split_item` when segments need to be split.
   - Speech cuts must land on complete sentence boundaries (ensured by word-level transcript).
   - **Do not add** any BGM / narration / SFX / transition SFX; do not add any `video` / `audio` from the media pool outside the allowed sources list, even if that asset existed before editing.

5. **Final Acceptance Check (mandatory, see below)**
   - Run `read_project` again, compare all final `video` / `audio` `sourceAssetId` / `src` against the allowed sources list item by item; trim, split, and move of the same allowed source are valid; any unselected source (including audio carried within newly added video) is invalid.
   - Replay segment by segment to verify: factual fidelity, complete speech semantics, natural cut-point transitions, no audio clipping/abrupt cuts.

## II. Mandatory Acceptance Checklist (required for finished video, check each item)

| Acceptance Item | Criterion | If Not Passed |
|---|---|---|
| Project exists and is readable | `read_project` successfully returns the current active project | Stop, report project read failure reason |
| At least 1 video track segment | Retained footage segments exist on the timeline | Explain no usable footage, no finished video |
| Final length matches information volume | No irrelevant content added to pad duration; no speech/key facts cut to compress | Rebalance duration and content |
| Opening delivers the core | First segment is conclusion/latest development/key footage, no lengthy preamble | Adjust the opening |
| Speech semantics complete | Each retained speech segment can independently express a complete meaning, no "cut in the middle of a sentence" | Fix cut points |
| No external audio | All final `video` / `audio` belong to the user-selected news footage/original on-scene audio allowed sources; BGM, SFX, voiceover, narration in the media pool that were not selected must not be used | Remove unselected source segments and re-accept |
| Cut-point transitions | No abrupt cuts, overlaps, or obvious volume jumps; fadeInSeconds/fadeOutSeconds can be used for fine-tuning | Add 1-2 frame fade in/out |
| Facts and logic | Do not change original meaning, do not exaggerate or downplay, do not incorrectly associate, do not present speculation as fact, do not use mismatched footage | Revert to original footage and re-cut |

## III. SKILL.md Tool Mapping

- `read_project` / `read_timeline`, `transcribe_track`, `view_timeline_frames`, `edit_item` (trim / ripple delete / fade), `split_item`, `edit_track`.
- The "no new audio" acceptance check must compare the initially established selected-footage allowed sources list against the final `read_project`; do not use the entire media pool as the baseline, and do not judge by audio track segment count.

## IV. Failure Recovery

- If any acceptance item fails → revert to the "Generate Editing Plan" step to re-plan (not from scratch, but locate the step that violated the rules).
- If the timeline is corrupted, use the project's undo/history to return to the pre-execution state and rerun.
- Only after all acceptance items pass, report "finished video complete" and provide verifiable results such as final duration, number of retained segments, and number of cut points.

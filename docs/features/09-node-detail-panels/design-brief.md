# Design Brief — Node Detail Panels

> **Feature**: 09 — Node Detail Panels
> **Date**: 2026-04-05
> **Target Fidelity**: Mockup

---

## Overview

**What**: Three tabbed side panels for viewing and editing the details of Lazynext's core node primitives: Task, Doc, and Decision.
**Why**: Users need a consistent, focused way to view and edit node properties without leaving the canvas or workflow context.
**Where**: Right-side panel that opens when a user clicks on a node in the canvas or workflow view.

---

## Target Users
- **Individual contributors**: Need to edit task details, write documents, and review/log decisions
- **Team leads**: Need to review and update node properties, track quality scores
- **Collaborators**: Need to co-edit docs and comment on decisions

---

## Requirements

### Must Have
- [x] Tab navigation between Task, Doc, and Decision panels with colored indicators (blue, emerald, orange)
- [x] **Task Panel**: Editable title, Status dropdown (Todo/In Progress/In Review/Done/Blocked), Priority selector (Low/Medium/High/Urgent), Assignee dropdown with avatars, Due date picker, Description textarea, Subtasks with checkboxes, Tags with add button, Attachments upload area, Delete action
- [x] **Doc Panel**: Editable title, Collaborator avatars with invite button, Floating rich-text toolbar (Bold/Italic/Underline/Strikethrough, H1/H2/H3, List/Code, Link/Quote), Tiptap-style editor with prose content, Slash command dropdown (/ to insert Task, Doc, Decision, Heading, Bullet List, Code Block, Table), Node reference inline mentions (@Ship onboarding v2), Word count and last-edited timestamp
- [x] **Decision Panel**: Editable title, Status dropdown (Open/In Discussion/Decided/Revisit), Question text, Resolution textarea, Rationale textarea, Options Considered with visual chosen indicator (green border), Decision Type dropdown (Reversible/Irreversible), Quality Score display (large number + progress bar + helper text), Outcome dropdown (Pending/Good/Bad/Neutral), Made by (avatar + name + date), Collapsible thread/comments section

### Nice to Have
- [x] Slash command dropdown with icons for each node type
- [x] Inline node mention pills (@Ship onboarding v2) in doc editor
- [x] Priority button group with color-coded active states
- [x] Quality score gradient progress bar

### Out of Scope
- Real Tiptap editor integration (mockup shows static content)
- Canvas/workflow context behind the panel
- Panel resize or drag behavior
- Real-time collaborative editing cursors

---

## Layout

**Page type**: Side panel (detail/editing)
**Primary layout**: Tab bar (sticky top) switching between 3 panel views, each as a narrow column (max-w-sm for Task/Decision, max-w-4xl for Doc)
**Key sections** (in order):

**Task Panel:**
1. **Header**: Blue dot + "TASK" label + close button
2. **Title**: Inline-editable text input
3. **Status**: Dropdown selector
4. **Priority**: 4-button segmented control
5. **Assignee**: Dropdown with avatars
6. **Due Date**: Date input
7. **Description**: Textarea
8. **Subtasks**: Checkbox list + add button
9. **Tags**: Pill list + add button
10. **Attachments**: Upload area
11. **Delete**: Destructive action link

**Doc Panel:**
1. **Header**: Green dot + "DOC" label + word count + last edited + Share button + close button
2. **Title**: Inline-editable text input
3. **Collaborators**: Avatar stack + invite button
4. **Toolbar**: Floating rich-text formatting bar
5. **Editor**: Prose content area with slash command dropdown

**Decision Panel:**
1. **Header**: Orange dot + "DECISION" label + close button
2. **Title**: Inline-editable text input
3. **Status**: Dropdown (Open/In Discussion/Decided/Revisit)
4. **Question**: Read-only text block
5. **Resolution**: Textarea
6. **Rationale**: Textarea
7. **Options Considered**: Pill chips with chosen indicator
8. **Decision Type**: Dropdown
9. **Quality Score**: Large score display with progress bar
10. **Outcome**: Dropdown
11. **Made by**: Author card
12. **Thread**: Collapsible comments section

---

## States & Interactions

| State | Description |
|---|---|
| **Default** | Task panel active (first tab), all fields populated with sample data |
| **Empty** | Not mocked — fields would show placeholder text |
| **Loading** | Not explicitly mocked |
| **Error** | Not explicitly mocked |
| **Success** | Not explicitly mocked — changes save inline |

**Key interactions**:
- **Tab switching**: Click tab buttons to switch between Task/Doc/Decision views
- **Dropdown toggle**: Click to open/close dropdown menus; close on outside click
- **Priority selection**: Click button in segmented control, active button gets color + border
- **Subtask toggle**: Click checkbox to mark subtask complete (strikethrough text)
- **Slash command**: Type "/" in doc editor to open insert block dropdown
- **Thread toggle**: Click "3 comments" to expand/collapse thread section (chevron rotates)
- **Close panel**: X button in header

---

## Responsive Behavior
- **Mobile**: Panels take full screen width, tab bar remains sticky at top
- **Tablet**: Panels overlay canvas at ~400px width
- **Desktop**: Panels display as right-side column alongside canvas

---

## Content

| Element | Content Type | Example/Notes |
|---|---|---|
| **Task title** | User-generated | "Ship onboarding v2" |
| **Task status** | Enum | Todo, In Progress, In Review, Done, Blocked |
| **Task priority** | Enum | Low (gray), Medium (blue), High (orange), Urgent (red) |
| **Task assignee** | User | "Avas Patel" with AP avatar |
| **Task due date** | Date | "2026-04-10" |
| **Task subtasks** | Checkbox list | "Set up Supabase Auth integration" (done), "Build onboarding UI" (pending) |
| **Task tags** | Pills | "frontend", "onboarding" |
| **Doc title** | User-generated | "Product Requirements Doc" |
| **Doc word count** | Computed | "1,240 words" |
| **Doc content** | Rich text | Overview, Key Requirements, Timeline sections |
| **Decision title** | User-generated | "Use Supabase for Auth + DB?" |
| **Decision status** | Enum | Open, In Discussion, Decided, Revisit |
| **Quality score** | Computed 0-100 | "84/100" with green progress bar |
| **Options considered** | Pill chips | Supabase (chosen, green border), Firebase, PlanetScale |
| **Decision type** | Enum | Reversible, Irreversible |
| **Outcome** | Enum | Pending, Good, Bad, Neutral |

---

## Constraints
- Task and Decision panels use narrow width (max-w-sm), Doc panel uses wider width (max-w-4xl) to accommodate editor
- Quality score is auto-calculated, not manually editable
- Doc editor shows Tiptap-style toolbar but actual implementation needs Tiptap integration
- Slash command dropdown supports inserting: Task, Doc, Decision, Heading, Bullet List, Code Block, Table
- Thread section in Decision panel is collapsible to save vertical space

---

## References
- Feature 07 (Decision DNA View) for decision quality scoring patterns
- Feature 11 (Thread Comments Panel) for expanded thread functionality
- Feature 05 (Workflow Canvas) for canvas context where panels open
- Lazynext primitives: TASK (blue), DOC (emerald), DECISION (orange)

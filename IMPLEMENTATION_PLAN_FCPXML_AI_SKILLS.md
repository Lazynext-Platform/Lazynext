# 📋 Kế hoạch triển khai: FCPXML Export & AI Skill-Based Editing

## 🎯 Tổng quan
Hệ thống chuyển đổi Lazynext từ "AI Native Editor" sang **"AI Pre-Production & Rough Cut Engine"** chuyên biệt, xuất bản sang DaVinci Resolve Studio thông qua FCPXML.

**Triết lý thiết kế:**
- ✅ Làm cực tốt: Timing, audio sync, rough cut, AI đề xuất
- ❌ Không làm: Color grading, VFX phức tạp, final render (chuyển sang Resolve)
- 💡 Core value: Tiết kiệm 70% thời gian dựng thô, editor tập trung vào sáng tạo trong Resolve

---

## 🏗️ Kiến trúc tổng thể

```
┌─────────────────────────────────────────────────────────────┐
│                    LAZYNEXT CORE                            │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ Skill Engine │  │ AI Agents    │  │ FCPXML Exporter  │  │
│  │ (skill.md)   │  │ (Chronos)    │  │ (Rust Serializer)│  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
│         │                  │                    │           │
│         ▼                  ▼                    ▼           │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Timeline State (CRDT)                   │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    OUTPUT LAYER                             │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ Media Folder │  │ FCPXML File  │  │ Skill Library    │  │
│  │ (linked)     │  │ (.fcpxml)    │  │ (skill/*.md)     │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │ DaVinci Resolve │
                    │   Studio 18+    │
                    └─────────────────┘
```

---

## 📦 Phase 0: Foundation & Research (Tuần 0)

### Mục tiêu
- Nghiên cứu FCPXML schema
- Thiết kế cấu trúc skill.md
- Chuẩn bị hạ tầng test

### Công việc chi tiết

#### 0.1. FCPXML Schema Research
- [ ] Phân tích FCPXML 1.8 specification
- [ ] Tạo bộ test cases từ các project mẫu
- [ ] Xác định mapping table: Lazynext → FCPXML
  - Video clips, audio clips, transitions
  - Basic transforms (position, scale, rotation)
  - Opacity, speed changes
  - Markers, roles, metadata
- [ ] **Không map**: Effects phức tạp, color grading, Fusion

#### 0.2. Skill.md Design
- [ ] Định nghĩa schema cho skill.md
- [ ] Tạo template cho các thể loại:
  - `pre-wedding.md`
  - `event.md`
  - `music-video.md`
  - `corporate.md`
  - `social-media.md`
  - `documentary.md`
- [ ] Thiết kế cấu trúc learning log

#### 0.3. Test Environment Setup
- [ ] Cài đặt DaVinci Resolve Studio (test license)
- [ ] Chuẩn bị sample footage cho từng thể loại
- [ ] Setup folder structure cho media linking

**Deliverables:**
- `docs/fcpxml-spec.md` - Tài liệu kỹ thuật FCPXML
- `skills/templates/` - 6 template skill đầu tiên
- `tests/fcpxml-samples/` - Bộ test files

**Thời gian:** 3-4 ngày
**Độ khó:** ⭐⭐
**Rủi ro:** Thấp (research-only)

---

## 🚀 Phase 1: FCPXML Export Core (Tuần 1-2)

### Mục tiêu
Xuất timeline thành file .fcpxml hợp lệ, import thành công vào DaVinci Resolve với đầy đủ clips, audio, basic edits.

### Module 1.1: Rust FCPXML Serializer

#### Cấu trúc thư mục mới
```
crates/
├── fcpxml-exporter/          # NEW
│   ├── Cargo.toml
│   ├── src/
│   │   ├── lib.rs
│   │   ├── serializer.rs     # Core XML builder
│   │   ├── models.rs         # FCPXML data structures
│   │   ├── mapping.rs        # Lazynext → FCPXML mapping
│   │   ├── media_linking.rs  # Path resolution
│   │   └── validation.rs     # Schema validation
│   └── tests/
│       ├── integration_test.rs
│       └── fixtures/
```

#### Implementation details
```rust
// crates/fcpxml-exporter/src/models.rs
pub struct FCPXML {
    pub version: String, // "1.8"
    pub project: Project,
}

pub struct Project {
    pub name: String,
    pub format: Format,
    pub sequence: Sequence,
}

pub struct Sequence {
    pub duration: FrameCount,
    pub rate: FrameRate,
    pub tracks: Vec<Track>,
    pub markers: Vec<Marker>,
}

pub struct Track {
    pub track_type: TrackType, // Video, Audio1, Audio2...
    pub clips: Vec<Clip>,
}

pub struct Clip {
    pub id: String,
    pub name: String,
    pub start: FrameCount,
    pub duration: FrameCount,
    pub media_ref: MediaRef,
    pub transform: Option<Transform>,
    pub speed: Option<f32>,
    pub markers: Vec<Marker>,
}

pub struct MediaRef {
    pub path: PathBuf, // Relative path
    pub name: String,
    pub duration: FrameCount,
    pub rate: FrameRate,
}
```

#### Mapping rules
| Lazynext Feature | FCPXML Element | Priority | Notes |
|-----------------|----------------|----------|-------|
| Video Clip | `<asset>` + `<clip>` | P0 | Basic mapping |
| Audio Clip | `<asset>` + `<clip>` (audio role) | P0 | Separate tracks |
| Cut/Split | Multiple `<clip>` elements | P0 | Same asset ref |
| Position/Scale | `<transform>` | P0 | Basic 2D only |
| Opacity | `<opacity>` | P0 | Simple keyframes |
| Speed Change | `<speed>` | P0 | Constant speed |
| Fade In/Out | `<transition>` | P1 | Cross dissolve |
| Markers | `<marker>` | P1 | With metadata |
| Titles | `<title>` | P2 | Basic text only |
| Color Correction | ❌ Skip | - | Let Resolve handle |
| VFX/Filters | ❌ Skip | - | Let Resolve handle |

#### Media Linking Strategy
```rust
// crates/fcpxml-exporter/src/media_linking.rs

pub struct MediaLinker {
    base_path: PathBuf,
    output_dir: PathBuf,
}

impl MediaLinker {
    /// Tạo cấu trúc folder:
    /// project_export/
    /// ├── timeline.fcpxml
    /// └── media/
    ///     ├── video_001.mp4
    ///     ├── audio_001.wav
    ///     └── sfx_explosion.wav
    
    pub fn create_linked_structure(&self, timeline: &Timeline) -> Result<()> {
        // 1. Copy tất cả media vào media/
        // 2. Generate FCPXML với relative paths
        // 3. Validate tất cả links đều valid
    }
    
    /// Sound Effect Library integration
    pub fn resolve_sfx(&self, sfx_name: &str) -> Option<PathBuf> {
        // Tìm trong thư viện SFX built-in
        // Trả về path tuyệt đối để copy
    }
}
```

### Module 1.2: Sound Effect Library

#### Cấu trúc thư viện
```
assets/
└── sound-library/
    ├── ambient/
    │   ├── forest_day.wav
    │   ├── city_night.wav
    │   ├── office_hum.wav
    │   └── wind_seaside.wav
    ├── impacts/
    │   ├── hit_soft.wav
    │   ├── hit_hard.wav
    │   └── whoosh_transition.wav
    ├── transitions/
    │   ├── swoosh_up.wav
    │   ├── swoosh_down.wav
    │   └── riser_cinematic.wav
    └── music/
        ├── pre-wedding/
        │   ├── romantic_piano_01.mp3
        │   └── acoustic_guitar_02.mp3
        ├── event/
        │   ├── upbeat_party_01.mp3
        │   └── energetic_dance_02.mp3
        └── corporate/
            ├── inspiring_business_01.mp3
            └── tech_innovation_02.mp3
```

#### Metadata system
```json
// assets/sound-library/metadata.json
{
  "sfx_id": "ambient_forest_01",
  "name": "Forest Day Ambience",
  "category": "ambient",
  "tags": ["nature", "birds", "peaceful", "daytime"],
  "duration_ms": 180000,
  "bpm": null,
  "mood": ["calm", "natural"],
  "suitable_for": ["documentary", "pre-wedding", "travel"]
}
```

### Module 1.3: Integration with Timeline

#### API endpoints mới
```typescript
// apps/web/app/api/export/fcpxml/route.ts
POST /api/export/fcpxml
{
  projectId: string,
  options: {
    includeMarkers: boolean,
    includeBasicTransforms: boolean,
    mediaLinkingStrategy: 'copy' | 'reference',
    outputDir: string
  }
}

Response: {
  success: boolean,
  fcpxmlPath: string,
  mediaPath: string,
  validationReport: ValidationReport,
  resolveCompatibility: CompatibilityReport
}
```

#### CLI command
```bash
# crates/cli/src/commands/export.rs
lazynext export fcpxml \
  --project my-wedding \
  --output ./exports/wedding-resolve \
  --media-linking copy \
  --include-markers \
  --validate
```

### Testing Strategy

#### Unit Tests
- [ ] Test XML serialization correctness
- [ ] Test path resolution (absolute → relative)
- [ ] Test frame rate conversion
- [ ] Test duration calculations

#### Integration Tests
- [ ] Export simple timeline (1 video, 1 audio)
- [ ] Export multi-track timeline
- [ ] Export with speed changes
- [ ] Export with markers

#### E2E Tests (Manual)
- [ ] Import vào DaVinci Resolve
- [ ] Verify all media linked correctly
- [ ] Verify timing chính xác (< 1 frame error)
- [ ] Verify basic transforms applied
- [ ] Test với 10+ projects thực tế

**Deliverables:**
- `crates/fcpxml-exporter/` - Rust crate hoàn chỉnh
- `assets/sound-library/` - 50+ SFX, 20+ music tracks
- Working export feature trong Web App + CLI
- Documentation: `docs/fcpxml-export-guide.md`

**Thời gian:** 10-12 ngày
**Độ khó:** ⭐⭐⭐⭐
**Rủi ro:** Trung bình (FCPXLM edge cases)

---

## 🧠 Phase 2: Skill-Based Editing Engine (Tuần 3-4)

### Mục tiêu
Xây dựng hệ thống skill.md để điều khiển AI editing theo quy tắc cụ thể, không tự do sáng tạo.

### Module 2.1: Skill.md Schema & Parser

#### Cấu trúc skill.md
```markdown
# Skill: Pre-Wedding Edit

## Metadata
- **Version**: 1.0
- **Last Updated**: 2025-01-15
- **Author**: System + User Feedback
- **Suitable For**: pre-wedding, engagement, love-story

## Editing Rules

### Pacing
- Average shot duration: 3-5 seconds
- Fast cuts during action scenes: 1-2 seconds
- Slow moments for emotional shots: 6-8 seconds
- Never hold static shot > 10 seconds unless intentional

### Transitions
- Primary: Hard cuts (90%)
- Secondary: Cross dissolve (10%) for scene changes
- Avoid: Flashy transitions, wipes, spins
- Scene change rule: Dissolve only when location/time changes

### Music Selection
- BPM range: 70-100 (romantic), 100-120 (upbeat)
- Mood: romantic, dreamy, emotional, joyful
- Structure:
  - Intro: Soft instrumental (first 30s)
  - Build: Add vocals/percussion
  - Peak: Full arrangement for key moments
  - Outro: Fade out gently

### Sound Design
- Ambient layers: Always add subtle ambience
  - Nature scenes: birds, wind, water
  - Urban scenes: distant traffic, city hum
  - Indoor: room tone, subtle reverb
- SFX placement:
  - Whoosh on fast transitions
  - Soft impacts on title reveals
  - No SFX on emotional moments
- Music ducking: Reduce music -6dB during speech

### Color Hints (for Resolve)
- Suggest: Warm tones, soft contrast
- Avoid: Over-saturated, harsh shadows
- Skin tones: Natural, slightly warm

### Shot Priorities
1. Couple interaction (holding hands, laughing)
2. Close-ups (eyes, smiles, details)
3. Wide establishing shots
4. B-roll of venue/nature
5. Golden hour footage (priority for slow-mo)

### Don'ts
- ❌ No jump cuts in romantic sequences
- ❌ No shaky cam unless intentional style
- ❌ No music drops during vows/speeches
- ❌ No overuse of slow motion (max 20% of timeline)
```

#### Rust parser
```rust
// crates/skill-engine/src/parser.rs

pub struct Skill {
    pub id: String,
    pub name: String,
    pub version: SemVer,
    pub metadata: SkillMetadata,
    pub rules: EditingRules,
}

pub struct EditingRules {
    pub pacing: PacingRules,
    pub transitions: TransitionRules,
    pub music: MusicRules,
    pub sound_design: SoundDesignRules,
    pub shot_priorities: Vec<ShotPriority>,
    pub constraints: Vec<Constraint>, // Don'ts
}

pub struct SkillParser {
    // Parse markdown → Structured Skill
    pub fn parse(content: &str) -> Result<Skill>;
    
    // Validate skill against schema
    pub fn validate(skill: &Skill) -> ValidationResult;
    
    // Merge multiple skills (inheritance)
    pub fn merge(base: &Skill, overlay: &Skill) -> Skill;
}
```

### Module 2.2: Skill Manager UI

#### Tab quản lý skills
```typescript
// apps/web/app/(dashboard)/skills/page.tsx

Features:
├── Danh sách skills (grid view)
│   ├── Pre-Wedding v1.2 ✅
│   ├── Event Wedding v2.0 ✅
│   ├── Music Video v0.9 🧪
│   └── Corporate v1.1 ✅
│
├── Skill Editor (Markdown + Preview)
│   ├── Live preview rules
│   ├── Version history
│   ├── A/B testing toggle
│
├── Learning Logs
│   ├── Recent edits áp dụng skill này
│   ├── Success metrics (user accepted/rejected)
│   ├── Suggested improvements
│
└── Create New Skill
    ├── Template selector
    ├── Wizard-guided setup
    └── Test mode (dry run)
```

### Module 2.3: AI Agent Integration

#### Chronos Copilot với skill context
```rust
// crates/ai-agents/src/chronos.rs

pub struct ChronosAgent {
    skill: Skill,
    timeline: Timeline,
    user_intent: Option<UserIntent>,
}

impl ChronosAgent {
    /// Edit với skill constraint
    pub async fn edit_with_skill(&self, request: EditRequest) -> Result<Timeline> {
        // 1. Load skill rules
        // 2. Filter AI suggestions qua rules
        // 3. Apply only valid edits
        // 4. Log decision cho learning
    }
    
    /// Đề xuất nhạc dựa trên skill
    pub fn suggest_music(&self) -> Vec<MusicTrack> {
        let rules = &self.skill.rules.music;
        
        self.sound_library
            .query()
            .bpm_range(rules.bpm_min, rules.bpm_max)
            .moods(&rules.moods)
            .categories(&rules.categories)
            .execute()
    }
    
    /// Auto thêm ambient sound
    pub fn add_ambient_layers(&self) -> Timeline {
        for clip in &self.timeline.video_clips {
            let scene_type = self.classify_scene(clip);
            let ambient = self.skill.rules.sound_design
                .get_ambient_for(scene_type);
            
            if let Some(ambient) = ambient {
                self.timeline.add_audio_layer(ambient, clip.duration);
            }
        }
    }
}
```

### Module 2.4: Genre-Based Templates

#### Pre-configured skills
1. **Pre-Wedding** (`pre-wedding.md`)
   - Romantic pacing, soft transitions
   - Music: 70-100 BPM, acoustic/piano
   - Heavy on close-ups, slow-mo golden hour

2. **Event Wedding** (`event-wedding.md`)
   - Faster pacing, documentary style
   - Capture key moments (vows, first dance)
   - Music: Dynamic, match energy of moments

3. **Music Video** (`music-video.md`)
   - Beat-synced cuts
   - Creative transitions allowed
   - Heavy SFX, stylized

4. **Corporate** (`corporate.md`)
   - Clean, professional pacing
   - Minimal SFX, clear audio
   - Focus on messaging, branding

5. **Social Media** (`social-media.md`)
   - Ultra-fast cuts (<2s average)
   - Vertical format optimized
   - Trendy music, bold text

6. **Documentary** (`documentary.md`)
   - Story-driven pacing
   - Natural sound design
   - Interview-focused structure

**Deliverables:**
- `crates/skill-engine/` - Parser + Executor
- `skills/` - 6 skills hoàn chỉnh
- Skills Manager UI trong Web App
- AI integration với skill constraints

**Thời gian:** 10-12 ngày
**Độ khó:** ⭐⭐⭐⭐⭐
**Rủi ro:** Trung bình (cần tuning AI behavior)

---

## 🤖 Phase 3: Natural Language Editing & Self-Learning (Tuần 5-6)

### Mục tiêu
Cho phép edit bằng ngôn ngữ tự nhiên và xây dựng cơ chế self-learning từ user feedback.

### Module 3.1: Natural Language Interface

#### Chat-based editing
```typescript
// apps/web/app/(dashboard)/project/[id]/chat-editor/page.tsx

User: "Cắt đoạn này ngắn hơn, chỉ giữ lại khoảnh khắc cô ấy cười"
User: "Thêm nhạc nền vui tươi, BPM khoảng 120"
User: "Chèn sound effect whoosh ở mỗi chuyển cảnh"
User: "Tạo intro 5 giây với title 'Wedding of Anna & John'"

System: [Áp dụng skill: Pre-Wedding v1.2]
- Đã cắt clip từ 10s → 4s (giữ frame cười)
- Đã thêm track: "Upbeat Acoustic 02" (118 BPM)
- Đã thêm 3 whoosh SFX tại timestamps: 0:05, 0:12, 0:18
- Đã tạo title intro với font Montserrat
```

#### Intent extraction
```rust
// crates/ai-agents/src/intent_parser.rs

pub struct UserIntent {
    pub action: ActionType,
    pub target: TargetSpecifier,
    pub parameters: HashMap<String, Value>,
    pub constraints: Vec<Constraint>,
}

pub enum ActionType {
    Trim,
    InsertMusic,
    AddSFX,
    CreateTitle,
    ChangePacing,
    ApplyTransition,
    // ...
}

impl IntentParser {
    pub async fn parse(&self, utterance: &str, context: &EditContext) -> Result<UserIntent> {
        // Use LLM để extract intent
        // Nhưng GIỚI HẠN bởi skill rules
        
        let raw_intent = self.llm.extract(utterance).await?;
        
        // Validate với skill hiện tại
        if !self.skill.allows(&raw_intent) {
            return Err(EditError::ViolatesSkill(raw_intent));
        }
        
        Ok(raw_intent)
    }
}
```

### Module 3.2: Self-Learning System

#### Learning mechanism (Batch processing)
```rust
// crates/skill-engine/src/learning.rs

pub struct LearningEngine {
    db: Database,
    skill_repo: SkillRepository,
}

/// KHÔNG học realtime (tốn token)
/// Học theo batch sau N projects hoặc M giờ

pub struct LearningJob {
    pub trigger: LearningTrigger, // Time-based or Count-based
    pub scope: LearningScope,      // Which skills to update
}

pub enum LearningTrigger {
    AfterProjects(count: u32),      // Sau mỗi 10 projects
    AfterTime(Duration),            // Sau mỗi 7 ngày
    ManualTrigger,                  // User yêu cầu
}

impl LearningEngine {
    /// Thu thập data từ user actions
    pub fn log_action(&self, action: LoggedAction) {
        // Lưu vào DB:
        // - Skill nào được dùng
        // - User đã accept/reject suggestion nào
        // - User đã manual override gì
        // - Final outcome (exported, shared, etc.)
    }
    
    /// Batch learning job (chạy background)
    pub async fn run_learning_cycle(&self, skill_id: &str) -> Result<SkillUpdate> {
        // 1. Lấy tất cả actions trong period
        let actions = self.db.get_recent_actions(skill_id, last_n_days: 7).await?;
        
        // 2. Phân tích patterns
        let patterns = self.analyze_patterns(&actions);
        
        // 3. Đề xuất cập nhật skill
        let proposed_changes = self.propose_changes(patterns);
        
        // 4. ONLY đề xuất, KHÔNG auto apply
        // User phải review và approve
        
        // 5. Nếu approved → tạo version mới
        if proposed_changes.approved {
            let new_version = self.skill_repo.create_version(
                skill_id,
                proposed_changes,
            ).await?;
            
            // 6. Log learning event
            self.log_learning_event(skill_id, new_version);
        }
        
        Ok(proposed_changes)
    }
    
    /// Token optimization strategies
    fn analyze_patterns(&self, actions: &[LoggedAction]) -> Patterns {
        // KHÔNG gọi LLM cho từng action
        // Aggregate statistics trước:
        // - % times user accepted music suggestion
        // - Average trim ratio
        // - Most used SFX types
        // - Common manual overrides
        
        let stats = self.compute_statistics(actions);
        
        // Chỉ gọi LLM 1 lần để summarize patterns
        // Input: Statistics (nhỏ gọn)
        // Output: Proposed rule changes
        
        // Estimated: ~500 tokens per learning cycle
        // vs ~50,000 tokens nếu học realtime
    }
}
```

#### Learning logs structure
```sql
-- Database schema
CREATE TABLE skill_learning_logs (
    id UUID PRIMARY KEY,
    skill_id VARCHAR NOT NULL,
    project_id UUID,
    timestamp TIMESTAMPTZ,
    
    -- Action details
    action_type VARCHAR,
    ai_suggestion JSONB,
    user_decision VARCHAR, -- 'accepted', 'rejected', 'modified'
    user_override JSONB,   -- Nếu modified
    
    -- Context
    genre VARCHAR,
    timeline_duration INTEGER,
    clip_count INTEGER,
    
    -- Outcome
    exported BOOLEAN,
    exported_format VARCHAR, -- 'fcpxml', 'mp4', etc.
    user_rating INTEGER      -- 1-5 stars
);

-- Aggregated stats (cho learning cycles)
CREATE TABLE skill_stats (
    skill_id VARCHAR PRIMARY KEY,
    last_updated TIMESTAMPTZ,
    
    acceptance_rate FLOAT,      -- % AI suggestions accepted
    avg_trim_ratio FLOAT,
    top_music_choices JSONB,
    top_sfx_choices JSONB,
    common_overrides JSONB,
    
    version_history JSONB
);
```

### Module 3.3: Review & Approval Workflow

#### UI cho learning proposals
```typescript
// apps/web/app/(dashboard)/skills/[id]/learning-proposals/page.tsx

Skill: Pre-Wedding v1.2
Learning Period: Last 7 days (47 projects)

Proposed Changes:
┌─────────────────────────────────────────────────────┐
│ Rule: Music BPM Range                               │
│ Current: 70-100                                     │
│ Proposed: 75-110                                    │
│ Reason: 78% projects user chọn nhạc >100 BPM       │
│ Confidence: High (37/47 projects)                   │
│                                                     │
│ [Preview Impact] [Accept] [Reject] [Modify]        │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ Rule: Average Shot Duration                         │
│ Current: 3-5 seconds                                │
│ Proposed: 2.5-4.5 seconds                           │
│ Reason: Xu hướng edit nhanh hơn                     │
│ Confidence: Medium (22/47 projects)                 │
│                                                     │
│ [Preview Impact] [Accept] [Reject] [Modify]        │
└─────────────────────────────────────────────────────┘

[Approve All] [Reject All] [Schedule for Review]
```

### Module 3.4: Token Optimization Strategies

#### Cost analysis
```
Realtime learning (BAD):
- Mỗi action: 500 tokens (LLM call)
- 100 actions/project × 10 projects/day = 1,000 calls
- 1,000 × 500 = 500,000 tokens/day
- ≈ $2.50/day (Gemini Pro) → $75/month

Batch learning (GOOD):
- Aggregate stats: 0 tokens (SQL queries)
- Pattern analysis: 500 tokens/cycle
- 1 cycle/week = 2,000 tokens/month
- ≈ $0.01/month

Tiết kiệm: 99.9% token cost!
```

#### Implementation tactics
1. **Cache aggressively**: Store parsed skills, không re-parse
2. **Local-first**: Tất cả skill execution chạy local (Wasm)
3. **LLM only khi cần**: 
   - Intent parsing (user input)
   - Learning summarization (batch)
   - KHÔNG cho routine editing
4. **Streaming responses**: Cho chat interface, giảm latency perception

**Deliverables:**
- Natural language chat editor
- Learning engine với batch processing
- Review workflow UI
- Token usage dashboard

**Thời gian:** 12-14 ngày
**Độ khó:** ⭐⭐⭐⭐⭐
**Rủi ro:** Cao (cần fine-tuning learning algorithm)

---

## 🎨 Phase 4: Polish & Integration (Tuần 7)

### Mục tiêu
Hoàn thiện UX, testing end-to-end, documentation.

### Công việc
- [ ] UI polish cho Skills Manager
- [ ] Performance optimization (export speed < 5s cho 10min timeline)
- [ ] Error handling & validation reports
- [ ] Tutorial & onboarding flow
- [ ] Documentation đầy đủ
- [ ] Beta testing với 5-10 users thực tế

**Deliverables:**
- Production-ready feature set
- User documentation
- Video tutorials

**Thời gian:** 5-7 ngày
**Độ khó:** ⭐⭐⭐
**Rủi ro:** Thấp

---

## 📊 Tổng kết kế hoạch

### Timeline tổng thể
```
Week 0: ████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░  (Research)
Week 1: ░░░░████████░░░░░░░░░░░░░░░░░░░░░░░░  (FCPXLM Core)
Week 2: ░░░░░░░░████████░░░░░░░░░░░░░░░░░░░░  (FCPXLM + SFX Lib)
Week 3: ░░░░░░░░░░░░████████░░░░░░░░░░░░░░░░  (Skill Engine)
Week 4: ░░░░░░░░░░░░░░░░████████░░░░░░░░░░░░  (Skills + AI Integration)
Week 5: ░░░░░░░░░░░░░░░░░░░░████████░░░░░░░░  (NLP Editor)
Week 6: ░░░░░░░░░░░░░░░░░░░░░░░░████████░░░░  (Self-Learning)
Week 7: ░░░░░░░░░░░░░░░░░░░░░░░░░░░░████████  (Polish & Release)
```

### Tổng thời gian: 7-8 tuần (≈ 2 tháng)

### Độ ưu tiên implement

#### Priority 0 (Must have - Tuần 1-2)
1. ✅ FCPXML Export core
2. ✅ Media linking (copy strategy)
3. ✅ Basic validation

#### Priority 1 (Should have - Tuần 3-4)
4. ✅ Sound Effect Library
5. ✅ Skill.md parser & executor
6. ✅ 6 genre skills templates
7. ✅ Skills Manager UI (basic)

#### Priority 2 (Nice to have - Tuần 5-6)
8. ✅ Natural language editing
9. ✅ Auto ambient sound
10. ✅ Music suggestion by genre/BPM
11. ✅ Batch learning system

#### Priority 3 (Future - Sau MVP)
12. Advanced learning (ML models)
13. Community skill sharing
14. Plugin system cho custom effects
15. Real-time collab trên FCPXML

### Tài nguyên cần thiết

#### Nhân sự
- 1 Rust developer (FCPXLM exporter, skill engine)
- 1 Full-stack developer (UI, API integration)
- 1 AI/ML engineer (NLP, learning system)
- 1 Video editor part-time (test & validate output)

#### Infrastructure
- Modal GPUs cho AI inference (nếu cần)
- Storage cho sound library (~5GB)
- Database cho learning logs

#### Third-party
- DaVinci Resolve Studio license (testing)
- Gemini API (NLP, learning)
- Optional: Music licensing cho commercial tracks

### Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| FCPXML incompatibility | Medium | High | Test early với nhiều versions của Resolve |
| AI editing quality poor | Medium | Medium | Skill constraints, human review loop |
| Learning produces bad rules | Low | Medium | Require user approval, rollback mechanism |
| Performance issues (large timelines) | Medium | Medium | Optimize serializer, streaming export |
| Sound library copyright | Low | High | Use only royalty-free/open-source |

### Success Metrics

1. **Technical**
   - FCPXML import success rate: >95%
   - Media linking errors: <1%
   - Export time: <1s per minute of timeline
   - Learning cycle token cost: <$0.05/week

2. **User Experience**
   - Time saved vs manual editing: >50%
   - User satisfaction (NPS): >7
   - Skill acceptance rate: >70%
   - Repeat usage: >60%

3. **Business**
   - Conversion from free → paid: +20%
   - Enterprise interest: 5+ inquiries
   - Community skills created: 10+ in first month

---

## 🎯 Next Steps

### Immediate (This week)
1. [ ] Review và approve plan này
2. [ ] Setup DaVinci Resolve test environment
3. [ ] Bắt đầu Phase 0 (Research)
4. [ ] Tạo repository structure mới

### Sau khi approve
1. Tạo issues chi tiết cho từng module
2. Assign developers
3. Setup project board
4. Begin sprint planning

---

## 📝 Ghi chú quan trọng

### Design Principles
1. **Không reinvent the wheel**: FCPXML là standard, không tạo format riêng
2. **Skill-first**: Mọi AI decision phải qua skill filter
3. **Human-in-the-loop**: Learning chỉ đề xuất, user quyết định
4. **Token-efficient**: Batch processing, cache, local-first
5. **Resolve-compatible**: Test liên tục với Resolve thực tế

### Future Extensions (Post-MVP)
- Support AAF export (cho Premiere Pro)
- EDL export (legacy systems)
- Direct Resolve Remote API integration
- Cloud rendering service
- Marketplace cho skills & SFX

---

**Document Version**: 1.0  
**Created**: 2025-01-15  
**Status**: Pending Review  
**Author**: AI Assistant + User Collaboration

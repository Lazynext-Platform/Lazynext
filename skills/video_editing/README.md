# Video Editing Skills Library

Thư viện kỹ năng chỉnh sửa video cho Lazynext AI Editor.

## Cách sử dụng

Mỗi file `.md` trong thư mục này định nghĩa một "skill" - tập hợp các quy tắc chỉnh sửa cho một thể loại video cụ thể.

### Cấu trúc skill file

```markdown
# [Tên Skill]

## Mục tiêu
[Mô tả ngắn gọn mục đích của skill]

## Quy tắc chỉnh sửa

### Nhịp độ (Pacing)
- [Quy tắc về tốc độ cắt]
- [Quy tắc về chuyển cảnh]

### Âm thanh (Sound Design)
- [Loại nhạc]
- [BPM range]
- [Ambient sound preferences]
- [Volume levels]

### Màu sắc (Color Grading)
- [Tone màu]
- [Saturation/Contrast guidelines]

### Timeline structure
- [Cấu trúc timeline mẫu với timestamps]

## File references
- Music library: [path]
- SFX library: [path]
- LUTs: [path]
```

## Skills hiện có

| Skill | Mô tả | BPM | Duration |
|-------|-------|-----|----------|
| pre-wedding.md | Pre-wedding romantic editing | 60-80 | 3-5 min |
| event.md | Event highlights editing | 100-120 | 5-10 min |

## Tích hợp với AI Agent

AI Agent sẽ đọc skill file và áp dụng các quy tắc khi:
1. Tạo timeline tự động
2. Đề xuất nhạc nền
3. Thêm ambient sound
4. Chọn transition types
5. Export FCPXML

## Cập nhật skill

Skill được cập nhật qua 2 cách:
1. **Manual**: Editor chỉnh sửa trực tiếp file `.md`
2. **Batch Learning**: Hệ thống tổng hợp từ nhiều dự án thành công (weekly)

## Learning Mechanism

```
User edits project → Save changes → Batch processor (weekly)
→ Analyze patterns → Update skill.md → Version control
```

Không học realtime để tiết kiệm token và đảm bảo chất lượng.

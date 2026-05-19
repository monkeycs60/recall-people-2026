#!/usr/bin/env python3
from __future__ import annotations

import argparse
import math
import shutil
import subprocess
from dataclasses import dataclass
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[2]
DEFAULT_SOURCE_DIR = Path("/tmp/recall-app-store-screenshots")
FALLBACK_SOURCE_DIR = ROOT / "screenshots" / "appstore-final"
OUTPUT_DIR = ROOT / "screenshots" / "appstore-story-strip"
CHARACTER_DIR = ROOT / "screenshots" / "appstore-character-assets"

SHOT_SIZE = (1320, 2868)
VIDEO_SIZE = (886, 1920)
FPS = 30
VIDEO_SECONDS = 30

FONT_DIR = ROOT / "frontend" / "node_modules" / "@expo-google-fonts" / "plus-jakarta-sans"
FONT_REGULAR = FONT_DIR / "400Regular" / "PlusJakartaSans_400Regular.ttf"
FONT_MEDIUM = FONT_DIR / "500Medium" / "PlusJakartaSans_500Medium.ttf"
FONT_SEMIBOLD = FONT_DIR / "600SemiBold" / "PlusJakartaSans_600SemiBold.ttf"
FONT_BOLD = FONT_DIR / "700Bold" / "PlusJakartaSans_700Bold.ttf"
FONT_EXTRABOLD = FONT_DIR / "800ExtraBold" / "PlusJakartaSans_800ExtraBold.ttf"

INK = (31, 27, 52)
MUTED = (124, 117, 151)
PRIMARY = (91, 53, 242)
PRIMARY_DARK = (61, 36, 155)
SURFACE = (255, 255, 255)
LAVENDER = (241, 236, 255)
HAIRLINE = (222, 216, 235)
PEACH = (255, 226, 216)
AMBER = (255, 239, 196)
MINT = (218, 247, 230)
BLUE = (220, 237, 255)


@dataclass(frozen=True)
class Slide:
    filename: str
    source: str
    title: str
    subtitle: str
    eyebrow: str
    accent: tuple[int, int, int]
    callouts: tuple[str, ...]
    character: str | None = None
    phone_width: int = 930
    phone_y: int = 610
    phone_x: int | None = None
    phone_angle: float = 0
    character_side: str = "left"


SLIDES = [
    Slide(
        "01-capture-note.png",
        "05-voice-capture-ready.png",
        "Just say who you met",
        "Mention a name. Tell the last interaction. Recall People structures the rest.",
        "VOICE-FIRST",
        BLUE,
        ("Name", "Context", "Last interaction"),
        "speaker-phone.png",
        phone_width=970,
        phone_y=640,
        phone_x=250,
        phone_angle=-5,
        character_side="left",
    ),
    Slide(
        "02-ai-review.png",
        "06-review-new-contact.png",
        "Review what AI found",
        "Confirm contact details, events, and follow-ups before saving.",
        "AI REVIEW",
        PEACH,
        ("Details", "Events", "Follow-ups"),
        "reviewer-tablet.png",
        phone_width=960,
        phone_y=620,
        phone_x=110,
        phone_angle=4,
        character_side="right",
    ),
    Slide(
        "03-contact-profile.png",
        "03-romain-detail.png",
        "Every person gets context",
        "Essentials, meeting context, and the next natural follow-up in one profile.",
        "SMART PROFILES",
        LAVENDER,
        ("Summary", "Next action", "Meeting context"),
        "founder-calendar.png",
        phone_width=960,
        phone_y=635,
        phone_x=220,
        phone_angle=-3,
        character_side="left",
    ),
    Slide(
        "04-upcoming-events.png",
        "02-news-upcoming.png",
        "Never miss the right moment",
        "See upcoming launches, trips, birthdays, and follow-ups from your notes.",
        "UPCOMING",
        AMBER,
        ("Launches", "Trips", "Birthdays"),
        "founder-calendar.png",
        phone_width=950,
        phone_y=610,
        phone_x=80,
        phone_angle=3,
        character_side="right",
    ),
    Slide(
        "05-ask-network.png",
        "04-assistant-romain-answer.png",
        "Ask your network anything",
        "Find who to contact by context, not just by name.",
        "SEARCHABLE MEMORY",
        MINT,
        ("Ask naturally", "Answers from notes", "Open the profile"),
        "global-networker.png",
        phone_width=960,
        phone_y=625,
        phone_x=230,
        phone_angle=-4,
        character_side="left",
    ),
    Slide(
        "06-five-languages.png",
        "__language__",
        "Works in 5 languages",
        "Use the interface and voice notes in English, French, Spanish, Italian, and German.",
        "GLOBAL NETWORK",
        LAVENDER,
        ("English", "Français", "Español", "Italiano", "Deutsch"),
        "global-networker.png",
        phone_width=940,
        phone_y=635,
        phone_x=105,
        phone_angle=4,
        character_side="right",
    ),
]


def font(path: Path, size: int) -> ImageFont.FreeTypeFont:
    if path.exists():
        return ImageFont.truetype(str(path), size=size)
    return ImageFont.truetype("DejaVuSans.ttf", size=size)


FONTS = {
    "regular": lambda size: font(FONT_REGULAR, size),
    "medium": lambda size: font(FONT_MEDIUM, size),
    "semibold": lambda size: font(FONT_SEMIBOLD, size),
    "bold": lambda size: font(FONT_BOLD, size),
    "extrabold": lambda size: font(FONT_EXTRABOLD, size),
}


def resolve_source_dir(source_dir: Path | None) -> Path:
    if source_dir and source_dir.exists():
        return source_dir
    if DEFAULT_SOURCE_DIR.exists():
        return DEFAULT_SOURCE_DIR
    return FALLBACK_SOURCE_DIR


def find_source(source_dir: Path, filename: str) -> Path:
    if filename == "__language__":
        return Path("__language__")

    path = source_dir / filename
    if path.exists():
        return path

    fallback_map = {
        "01-contacts-list.png": "01-contacts.png",
        "02-news-upcoming.png": "04-upcoming.png",
        "03-romain-detail.png": "02-contact-detail.png",
        "04-assistant-romain-answer.png": "05-assistant-result.png",
        "05-voice-capture-ready.png": "07-voice-note.png",
        "06-review-new-contact.png": "09-review-after-recording.png",
    }
    fallback = FALLBACK_SOURCE_DIR / fallback_map.get(filename, filename)
    if fallback.exists():
        return fallback
    raise FileNotFoundError(f"Missing source screenshot: {filename}")


def render_language_source() -> Image.Image:
    width, height = (1440, 3120)
    img = gradient((width, height), (250, 248, 255), (241, 237, 250))
    draw = ImageDraw.Draw(img, "RGBA")

    draw.rounded_rectangle((72, 104, 248, 156), radius=26, fill=(234, 225, 255))
    draw.text((108, 116), "Recall People", font=FONTS["bold"](24), fill=PRIMARY_DARK)

    y = 390
    draw.text((112, y), "Choose your", font=FONTS["extrabold"](92), fill=INK)
    draw.text((112, y + 104), "language", font=FONTS["extrabold"](92), fill=PRIMARY)
    draw.text(
        (112, y + 240),
        "Use Recall People in your own language, and transcribe voice notes naturally.",
        font=FONTS["semibold"](36),
        fill=MUTED,
        spacing=8,
    )

    languages = [
        ("EN", "English", "Selected"),
        ("FR", "Français", "French"),
        ("ES", "Español", "Spanish"),
        ("IT", "Italiano", "Italian"),
        ("DE", "Deutsch", "German"),
    ]
    card_y = 940
    for index, (flag, name, caption) in enumerate(languages):
        top = card_y + index * 250
        selected = index == 0
        fill = SURFACE if not selected else (245, 241, 255)
        outline = PRIMARY if selected else HAIRLINE
        draw.rounded_rectangle((92, top, width - 92, top + 198), radius=54, fill=fill, outline=outline, width=4 if selected else 2)
        draw.rounded_rectangle((144, top + 48, 226, top + 130), radius=28, fill=(234, 225, 255))
        code_w, _ = text_size(draw, flag, FONTS["extrabold"](28))
        draw.text((185 - code_w // 2, top + 73), flag, font=FONTS["extrabold"](28), fill=PRIMARY_DARK)
        draw.text((260, top + 48), name, font=FONTS["bold"](42), fill=INK)
        draw.text((260, top + 108), caption, font=FONTS["semibold"](26), fill=MUTED)
        if selected:
            draw.ellipse((width - 214, top + 62, width - 146, top + 130), fill=PRIMARY)
            draw.text((width - 196, top + 72), "✓", font=FONTS["extrabold"](36), fill=SURFACE)

    draw.rounded_rectangle((112, height - 390, width - 112, height - 250), radius=70, fill=PRIMARY)
    cta = "Get started"
    tw, th = text_size(draw, cta, FONTS["bold"](42))
    draw.text(((width - tw) // 2, height - 342), cta, font=FONTS["bold"](42), fill=SURFACE)
    return img.convert("RGB")


def rounded_mask(size: tuple[int, int], radius: int) -> Image.Image:
    mask = Image.new("L", size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, size[0], size[1]), radius=radius, fill=255)
    return mask


def paste_rounded(base: Image.Image, layer: Image.Image, xy: tuple[int, int], radius: int) -> None:
    mask = rounded_mask(layer.size, radius)
    base.paste(layer, xy, mask)


def alpha_composite_clipped(base: Image.Image, layer: Image.Image, xy: tuple[int, int]) -> None:
    x, y = xy
    left = max(0, x)
    top = max(0, y)
    right = min(base.width, x + layer.width)
    bottom = min(base.height, y + layer.height)
    if right <= left or bottom <= top:
        return
    crop = layer.crop((left - x, top - y, right - x, bottom - y))
    base.alpha_composite(crop, (left, top))


def text_size(draw: ImageDraw.ImageDraw, text: str, font_obj: ImageFont.FreeTypeFont) -> tuple[int, int]:
    bbox = draw.textbbox((0, 0), text, font=font_obj)
    return bbox[2] - bbox[0], bbox[3] - bbox[1]


def wrap_text(draw: ImageDraw.ImageDraw, text: str, font_obj: ImageFont.FreeTypeFont, max_width: int) -> list[str]:
    words = text.split()
    lines: list[str] = []
    current = ""
    for word in words:
        candidate = f"{current} {word}".strip()
        if text_size(draw, candidate, font_obj)[0] <= max_width or not current:
            current = candidate
        else:
            lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def draw_wrapped(
    draw: ImageDraw.ImageDraw,
    xy: tuple[int, int],
    text: str,
    font_obj: ImageFont.FreeTypeFont,
    fill: tuple[int, int, int],
    max_width: int,
    line_gap: int,
) -> int:
    x, y = xy
    for line in wrap_text(draw, text, font_obj, max_width):
        draw.text((x, y), line, font=font_obj, fill=fill)
        y += text_size(draw, line, font_obj)[1] + line_gap
    return y


def gradient(size: tuple[int, int], top: tuple[int, int, int], bottom: tuple[int, int, int]) -> Image.Image:
    width, height = size
    img = Image.new("RGB", size, top)
    px = img.load()
    for y in range(height):
        ratio = y / max(1, height - 1)
        color = tuple(int(top[i] * (1 - ratio) + bottom[i] * ratio) for i in range(3))
        for x in range(width):
            px[x, y] = color
    return img.convert("RGBA")


def draw_decor(draw: ImageDraw.ImageDraw, width: int, height: int, accent: tuple[int, int, int]) -> None:
    soft = (*accent, 95)
    draw.ellipse((-260, 170, 330, 760), fill=soft)
    draw.ellipse((width - 280, 680, width + 210, 1170), fill=(*PEACH, 85))
    draw.ellipse((width - 230, height - 590, width + 180, height - 180), fill=(*MINT, 80))
    for i, (x, y, r) in enumerate([(990, 250, 9), (1140, 360, 14), (180, 930, 11), (1040, 2190, 7)]):
        draw.ellipse((x - r, y - r, x + r, y + r), fill=PRIMARY if i % 2 == 0 else accent)


def make_phone(
    source: Image.Image,
    target_width: int,
    shadow: bool = True,
    crop_top: int = 0,
    crop_bottom: int = 0,
) -> Image.Image:
    source = source.convert("RGBA")
    if crop_top or crop_bottom:
        source = source.crop((0, crop_top, source.width, source.height - crop_bottom))

    content_width = target_width - 44
    content_height = round(content_width * source.height / source.width)
    frame_width = target_width
    frame_height = content_height + 44

    phone = Image.new("RGBA", (frame_width, frame_height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(phone)
    draw.rounded_rectangle((0, 0, frame_width, frame_height), radius=72, fill=(31, 31, 38))
    draw.rounded_rectangle((13, 13, frame_width - 13, frame_height - 13), radius=62, fill=(8, 8, 12))

    content = source.resize((content_width, content_height), Image.Resampling.LANCZOS)
    paste_rounded(phone, content, (22, 22), 52)

    if not shadow:
        return phone

    canvas = Image.new("RGBA", (frame_width + 130, frame_height + 130), (0, 0, 0, 0))
    shadow_img = Image.new("RGBA", phone.size, (0, 0, 0, 95))
    shadow_mask = rounded_mask(phone.size, 72).filter(ImageFilter.GaussianBlur(28))
    canvas.paste(shadow_img, (70, 84), shadow_mask)
    canvas.paste(phone, (50, 32), phone)
    return canvas


def rotate_layer(layer: Image.Image, angle: float) -> Image.Image:
    if abs(angle) < 0.01:
        return layer
    return layer.rotate(angle, resample=Image.Resampling.BICUBIC, expand=True)


def load_character(name: str | None, target_height: int) -> Image.Image | None:
    if not name:
        return None
    path = CHARACTER_DIR / name
    if not path.exists():
        return None
    char = Image.open(path).convert("RGBA")
    bbox = char.getbbox()
    if bbox:
        char = char.crop(bbox)
    ratio = target_height / char.height
    return char.resize((round(char.width * ratio), target_height), Image.Resampling.LANCZOS)


def draw_callout(draw: ImageDraw.ImageDraw, xy: tuple[int, int], text: str, fill: tuple[int, int, int]) -> tuple[int, int]:
    badge_font = FONTS["bold"](30)
    x, y = xy
    tw, th = text_size(draw, text, badge_font)
    pad_x, pad_y = 24, 15
    draw.rounded_rectangle(
        (x, y, x + tw + pad_x * 2, y + th + pad_y * 2),
        radius=26,
        fill=SURFACE,
        outline=HAIRLINE,
        width=2,
    )
    draw.ellipse((x + 20, y + 22, x + 40, y + 42), fill=fill)
    draw.text((x + pad_x + 28, y + pad_y - 1), text, font=badge_font, fill=INK)
    return tw + pad_x * 2, th + pad_y * 2


def draw_callouts(draw: ImageDraw.ImageDraw, slide: Slide, x: int, y: int, max_width: int) -> int:
    cursor_x = x
    cursor_y = y
    row_height = 0
    gap = 16
    for callout in slide.callouts:
        tw, th = text_size(draw, callout, FONTS["bold"](30))
        width = tw + 48
        height = th + 30
        if cursor_x + width > x + max_width and cursor_x > x:
            cursor_x = x
            cursor_y += row_height + gap
            row_height = 0
        draw_callout(draw, (cursor_x, cursor_y), callout, slide.accent)
        cursor_x += width + gap
        row_height = max(row_height, height)
    return cursor_y + row_height


def render_slide(slide: Slide, source_dir: Path, size: tuple[int, int] = SHOT_SIZE, video: bool = False) -> Image.Image:
    width, height = size
    scale = width / SHOT_SIZE[0]
    img = gradient(size, (251, 249, 255), (240, 236, 249))
    draw = ImageDraw.Draw(img, "RGBA")
    draw_decor(draw, width, height, slide.accent)

    margin = round(76 * scale)
    top = round(132 * scale)
    eyebrow_font = FONTS["extrabold"](round(31 * scale))
    title_font = FONTS["extrabold"](round((90 if not video else 74) * scale))
    subtitle_font = FONTS["semibold"](round(35 * scale))

    draw.rounded_rectangle(
        (margin, top - round(70 * scale), margin + round(530 * scale), top - round(8 * scale)),
        radius=round(32 * scale),
        fill=(*slide.accent, 175),
    )
    draw.text((margin + round(34 * scale), top - round(58 * scale)), slide.eyebrow, font=eyebrow_font, fill=PRIMARY_DARK)
    y = draw_wrapped(draw, (margin, top + round(10 * scale)), slide.title, title_font, INK, width - 2 * margin, round(8 * scale))
    draw_wrapped(draw, (margin, y + round(18 * scale)), slide.subtitle, subtitle_font, MUTED, width - 2 * margin, round(8 * scale))

    draw_callouts(draw, slide, margin, round(500 * scale), width - 2 * margin)

    source_path = find_source(source_dir, slide.source)
    source = render_language_source() if slide.source == "__language__" else Image.open(source_path)
    phone_width = round((slide.phone_width if not video else min(680, slide.phone_width)) * scale)
    phone = make_phone(source, phone_width)
    phone = rotate_layer(phone, slide.phone_angle if not video else slide.phone_angle * 0.55)

    phone_x = round(((slide.phone_x if slide.phone_x is not None else (SHOT_SIZE[0] - phone.width) // 2)) * scale)
    phone_y = round((slide.phone_y if not video else max(610, slide.phone_y - 45)) * scale)
    alpha_composite_clipped(img, phone, (phone_x, phone_y))

    character = load_character(slide.character, round((690 if not video else 520) * scale))
    if character:
        if slide.character_side == "right":
            char_x = width - character.width + round(18 * scale)
        else:
            char_x = -round(34 * scale)
        char_y = height - character.height - round(128 * scale)
        shadow = Image.new("RGBA", (character.width, character.height), (0, 0, 0, 0))
        shadow_mask = character.split()[-1].filter(ImageFilter.GaussianBlur(20))
        shadow.paste((0, 0, 0, 70), (0, 0), shadow_mask)
        alpha_composite_clipped(img, shadow, (char_x + round(24 * scale), char_y + round(32 * scale)))
        alpha_composite_clipped(img, character, (char_x, char_y))

    footer_font = FONTS["bold"](round(28 * scale))
    footer = "Recall People"
    fw, _ = text_size(draw, footer, footer_font)
    draw.text(((width - fw) // 2, height - round(108 * scale)), footer, font=footer_font, fill=(*INK, 155))
    return img.convert("RGB")


def render_contact_sheet(files: list[Path], output: Path) -> None:
    thumbs = []
    for file in files:
        im = Image.open(file).convert("RGB")
        im.thumbnail((300, 652), Image.Resampling.LANCZOS)
        thumbs.append((file.name, im.copy()))

    cell_w, cell_h = 340, 740
    sheet = Image.new("RGB", (cell_w * 3, cell_h * 2), (248, 246, 255))
    draw = ImageDraw.Draw(sheet)
    label_font = FONTS["bold"](18)
    for idx, (name, thumb) in enumerate(thumbs):
        col, row = idx % 3, idx // 3
        x = col * cell_w + (cell_w - thumb.width) // 2
        y = row * cell_h + 24
        sheet.paste(thumb, (x, y))
        draw.text((col * cell_w + 24, row * cell_h + 690), name, font=label_font, fill=INK)
    sheet.save(output)


def render_video_frames(source_dir: Path, frames_dir: Path) -> None:
    frames_dir.mkdir(parents=True, exist_ok=True)
    for old in frames_dir.glob("frame_*.png"):
        old.unlink()

    base_slides = [render_slide(slide, source_dir, VIDEO_SIZE, video=True).convert("RGBA") for slide in SLIDES]
    frames_per_slide = FPS * 5
    total_frames = FPS * VIDEO_SECONDS
    for frame_idx in range(total_frames):
        slide_idx = min(frame_idx // frames_per_slide, len(SLIDES) - 1)
        local = frame_idx % frames_per_slide
        progress = local / max(1, frames_per_slide - 1)
        base = base_slides[slide_idx].copy()

        draw = ImageDraw.Draw(base, "RGBA")
        # Subtle autoplay-safe progress cue.
        bar_margin = 68
        bar_y = VIDEO_SIZE[1] - 72
        draw.rounded_rectangle((bar_margin, bar_y, VIDEO_SIZE[0] - bar_margin, bar_y + 10), radius=5, fill=(211, 205, 228, 180))
        draw.rounded_rectangle(
            (bar_margin, bar_y, bar_margin + int((VIDEO_SIZE[0] - 2 * bar_margin) * progress), bar_y + 10),
            radius=5,
            fill=PRIMARY,
        )

        # Fade in/out each scene to avoid hard cuts.
        alpha = 255
        fade = 10
        if local < fade:
            alpha = int(255 * local / fade)
        elif local > frames_per_slide - fade:
            alpha = int(255 * (frames_per_slide - local) / fade)
        if alpha < 255:
            overlay = Image.new("RGBA", VIDEO_SIZE, (251, 249, 255, 255 - alpha))
            base.alpha_composite(overlay)

        base.convert("RGB").save(frames_dir / f"frame_{frame_idx:04d}.png", compress_level=1)


def build_video(frames_dir: Path, output: Path) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    cmd = [
        "ffmpeg",
        "-y",
        "-framerate",
        str(FPS),
        "-i",
        str(frames_dir / "frame_%04d.png"),
        "-f",
        "lavfi",
        "-i",
        f"anullsrc=channel_layout=stereo:sample_rate=48000",
        "-t",
        str(VIDEO_SECONDS),
        "-c:v",
        "libx264",
        "-profile:v",
        "high",
        "-level",
        "4.0",
        "-pix_fmt",
        "yuv420p",
        "-r",
        str(FPS),
        "-x264-params",
        "bitrate=10000:vbv-maxrate=12000:vbv-bufsize=20000:nal-hrd=cbr:filler=1:force-cfr=1",
        "-c:a",
        "aac",
        "-ar",
        "48000",
        "-ac",
        "2",
        "-b:a",
        "256k",
        "-shortest",
        str(output),
    ]
    subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)


def verify_outputs(output_dir: Path) -> bool:
    screenshot_dir = output_dir / "6.9"
    files = sorted(screenshot_dir.glob("*.png"))
    ok = True
    for file in files:
        with Image.open(file) as img:
            if img.size != SHOT_SIZE:
                print(f"BAD {file}: {img.size}")
                ok = False
    if len(files) != len(SLIDES):
        print(f"BAD screenshot count: {len(files)}")
        ok = False
    elif ok:
        print(f"OK screenshots: {len(files)} files at {SHOT_SIZE[0]}x{SHOT_SIZE[1]}")

    video = output_dir / "video" / "recall-people-preview-draft.mp4"
    if not video.exists():
        print(f"BAD missing preview: {video}")
        return False

    probe = subprocess.run(
        [
            "ffprobe",
            "-v",
            "error",
            "-select_streams",
            "v:0",
            "-show_entries",
            "stream=width,height,r_frame_rate,duration",
            "-of",
            "default=nw=1",
            str(video),
        ],
        check=True,
        text=True,
        stdout=subprocess.PIPE,
    ).stdout
    print(probe.strip())
    if "width=886" not in probe or "height=1920" not in probe or "r_frame_rate=30/1" not in probe:
        ok = False
    else:
        print("OK preview: 886x1920, 30fps")
    return ok


def generate(source_dir: Path, output_dir: Path, skip_video: bool) -> None:
    screenshot_dir = output_dir / "6.9"
    screenshot_dir.mkdir(parents=True, exist_ok=True)
    generated: list[Path] = []
    for slide in SLIDES:
        image = render_slide(slide, source_dir)
        path = screenshot_dir / slide.filename
        image.save(path, "PNG", optimize=True)
        generated.append(path)
        print(f"Wrote {path.relative_to(ROOT)}")

    render_contact_sheet(generated, output_dir / "contact-sheet.png")
    print(f"Wrote {(output_dir / 'contact-sheet.png').relative_to(ROOT)}")

    if skip_video:
        return

    frames_dir = output_dir / "video" / "frames"
    render_video_frames(source_dir, frames_dir)
    video_path = output_dir / "video" / "recall-people-preview-draft.mp4"
    build_video(frames_dir, video_path)
    print(f"Wrote {video_path.relative_to(ROOT)}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source-dir", type=Path, default=None)
    parser.add_argument("--output-dir", type=Path, default=OUTPUT_DIR)
    parser.add_argument("--verify-only", action="store_true")
    parser.add_argument("--skip-video", action="store_true")
    parser.add_argument("--clean", action="store_true")
    args = parser.parse_args()

    output_dir = args.output_dir
    if args.verify_only:
        raise SystemExit(0 if verify_outputs(output_dir) else 1)

    source_dir = resolve_source_dir(args.source_dir)
    if args.clean and output_dir.exists():
        shutil.rmtree(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    print(f"Using source screenshots: {source_dir}")
    generate(source_dir, output_dir, args.skip_video)


if __name__ == "__main__":
    main()

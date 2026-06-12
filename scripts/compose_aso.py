#!/usr/bin/env python3
"""Compose finished App Store screenshots (1290x2796) from raw captures.

Layout per frame: colored background + centered headline/subline on top,
rounded phone mockup with soft shadow bleeding off the bottom.
"""
import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

SRC = "/home/clement/Desktop/Recall People screenshots final 2026-06-02"
OUT = "/home/clement/Desktop/Recall People ASO composed 2026-06-06"
os.makedirs(OUT, exist_ok=True)

W, H = 1290, 2796                      # App Store 6.7"
PW = 1100                              # phone mockup width
RADIUS = 78
PHONE_TOP = 470
MARGIN = 96
TOP = 150

FONT_BOLD = "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"
FONT_REG = "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf"

LIGHT_BG = (247, 244, 255)
PURPLE_BG = (107, 79, 255)
DARK_TXT = (26, 20, 40)
LIGHT_SUB = (110, 103, 134)
WHITE = (255, 255, 255)
WHITE_SUB = (255, 255, 255, 200)
ACCENT = (255, 214, 107)              # warm yellow pill

FRAMES = [
    dict(img="19-contacts-final-clean.png", bg="light",
         head=["Never blank on a", "person again"],
         sub="Names, details and follow-ups in one place"),
    dict(img="10-record-voice.png", bg="purple",
         head=["Just say who", "you met"],
         sub="AI saves their profile, tastes and what's next"),
    dict(img="20-contact-detail-loves-visible.png", bg="light",
         head=["Walk in already", "prepared"],
         sub="Who they are and what matters, at a glance"),
    dict(img="25-helen-timeline-two-new-events.png", bg="light",
         head=["Never miss the", "moment that matters"],
         sub="Birthdays, trips, plans — reminded in time"),
    dict(img="22-overdue-topics-view.png", bg="purple",
         head=["Follow up before", "it's too late"],
         sub="Recall nudges the people you owe a reply"),
    dict(img="09-contact-icebreakers.png", bg="light",
         head=["Always know", "what to ask"],
         sub="Smart talking points drawn from your notes"),
    dict(img="14-assistant.png", bg="light",
         head=["Ask your network", "anything"],
         sub="Find people by what you remember about them"),
    dict(img="16-profile-language-sheet.png", bg="purple",
         head=["Speak your", "language"],
         sub="EN · FR · ES · DE · IT",
         pill="14-day free trial · no card"),
]


def rounded_mask(size, r):
    m = Image.new("L", size, 0)
    d = ImageDraw.Draw(m)
    d.rounded_rectangle([0, 0, size[0], size[1]], radius=r, fill=255)
    return m


def fit_font(draw, text, path, start, maxw):
    size = start
    while size > 20:
        f = ImageFont.truetype(path, size)
        w = draw.textlength(text, font=f)
        if w <= maxw:
            return f
        size -= 2
    return ImageFont.truetype(path, 20)


def draw_centered(draw, text, font, y, color):
    w = draw.textlength(text, font=font)
    draw.text(((W - w) / 2, y), text, font=font, fill=color)
    bbox = font.getbbox(text)
    return y + (bbox[3] - bbox[1])


for i, fr in enumerate(FRAMES, 1):
    purple = fr["bg"] == "purple"
    base = Image.new("RGBA", (W, H), (*(PURPLE_BG if purple else LIGHT_BG), 255))

    # --- phone mockup ---
    phone = Image.open(os.path.join(SRC, fr["img"])).convert("RGBA")
    scale = PW / phone.width
    ph = int(phone.height * scale)
    phone = phone.resize((PW, ph), Image.LANCZOS)
    phone.putalpha(rounded_mask((PW, ph), RADIUS))
    px = (W - PW) // 2

    # soft shadow
    shadow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    blk = Image.new("RGBA", (PW, ph), (0, 0, 0, 0))
    ImageDraw.Draw(blk).rounded_rectangle([0, 0, PW, ph], radius=RADIUS,
                                          fill=(18, 12, 34, 150))
    shadow.alpha_composite(blk, (px, PHONE_TOP + 34))
    shadow = shadow.filter(ImageFilter.GaussianBlur(42))
    base.alpha_composite(shadow)
    base.alpha_composite(phone, (px, PHONE_TOP))

    # --- text ---
    draw = ImageDraw.Draw(base)
    maxw = W - 2 * MARGIN
    head_color = WHITE if purple else DARK_TXT
    sub_color = (255, 255, 255, 205) if purple else (*LIGHT_SUB, 255)

    y = TOP
    for line in fr["head"]:
        f = fit_font(draw, line, FONT_BOLD, 86, maxw)
        lw = draw.textlength(line, font=f)
        draw.text(((W - lw) / 2, y), line, font=f, fill=head_color)
        y += 100
    y += 24
    fs = fit_font(draw, fr["sub"], FONT_REG, 42, maxw)
    sw = draw.textlength(fr["sub"], font=fs)
    draw.text(((W - sw) / 2, y), fr["sub"], font=fs, fill=sub_color)

    # --- optional CTA pill (frame 8) ---
    if fr.get("pill"):
        pf = ImageFont.truetype(FONT_BOLD, 40)
        pw = draw.textlength(fr["pill"], font=pf)
        pad_x, pad_y = 52, 30
        bw, bh = pw + 2 * pad_x, 40 + 2 * pad_y
        bx, by = (W - bw) / 2, PHONE_TOP - bh - 28
        draw.rounded_rectangle([bx, by, bx + bw, by + bh], radius=bh / 2,
                               fill=ACCENT)
        draw.text((bx + pad_x, by + pad_y - 4), fr["pill"], font=pf,
                  fill=DARK_TXT)

    out = os.path.join(OUT, f"aso-{i:02d}.png")
    base.convert("RGB").save(out, "PNG")
    print("wrote", out)

print("DONE ->", OUT)

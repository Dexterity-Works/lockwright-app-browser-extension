#!/usr/bin/env python3
"""CWS listing art. Landscape. No alpha. Hatch plate from docs/logo.svg."""
from __future__ import annotations

import subprocess
import tempfile
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

EXT = Path(__file__).resolve().parents[2]
ROOT = EXT.parent
LOGO = ROOT / "docs" / "logo.svg"
OUT = Path(__file__).resolve().parent

WELL = (8, 9, 11)
PLATE = (20, 22, 27)
BRASS = (176, 141, 87)
MORTISE = (212, 175, 119)
INK = (246, 246, 246)
MUTED = (196, 184, 164)
STROKE = (42, 46, 54)

SERIF = "/usr/share/fonts/google-noto/NotoSerif-Regular.ttf"
SERIF_B = "/usr/share/fonts/google-noto/NotoSerif-Bold.ttf"
SANS = "/usr/share/fonts/liberation-sans-fonts/LiberationSans-Regular.ttf"
SANS_B = "/usr/share/fonts/liberation-sans-fonts/LiberationSans-Bold.ttf"


def font(path: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(path, size)


def raster_logo(px: int) -> Image.Image:
    with tempfile.TemporaryDirectory() as tmp:
        dest = Path(tmp) / "logo.png"
        subprocess.check_call(
            [
                "magick",
                "-background",
                "#08090b",
                str(LOGO),
                "-resize",
                f"{px}x{px}",
                str(dest),
            ]
        )
        return Image.open(dest).convert("RGBA")


def flatten(im: Image.Image, bg=WELL) -> Image.Image:
    base = Image.new("RGB", im.size, bg)
    if im.mode == "RGBA":
        base.paste(im, mask=im.split()[-1])
        return base
    return im.convert("RGB")


def save_jpg(im: Image.Image, path: Path) -> None:
    im.convert("RGB").save(path, "JPEG", quality=92)


def browser_chrome(mark: Image.Image) -> Image.Image:
    w, h = 1280, 800
    im = Image.new("RGB", (w, h), WELL)
    d = ImageDraw.Draw(im)
    d.rectangle((0, 0, w, 56), fill=PLATE)
    d.ellipse((18, 18, 38, 38), outline=STROKE, width=2)
    d.ellipse((48, 18, 68, 38), outline=STROKE, width=2)
    d.rounded_rectangle((96, 12, 980, 44), 14, fill=WELL, outline=STROKE, width=2)
    d.text((116, 18), "https://bank.example", font=font(SANS, 18), fill=MUTED)
    im.paste(flatten(mark.resize((28, 28))), (1228, 14))
    return im


def shot_popup(mark: Image.Image) -> Image.Image:
    im = browser_chrome(mark)
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((760, 72, 1248, 760), 16, fill=PLATE, outline=STROKE, width=2)
    im.paste(flatten(mark.resize((36, 36))), (784, 92))
    d.text((832, 96), "Lockwright", font=font(SERIF_B, 28), fill=INK)
    d.text((784, 148), "Current site", font=font(SANS, 16), fill=MUTED)
    d.rounded_rectangle((784, 176, 1224, 268), 12, fill=WELL, outline=BRASS, width=2)
    d.text((804, 192), "bank.example", font=font(SANS_B, 20), fill=INK)
    d.text((804, 224), "ada · ••••••••", font=font(SANS, 18), fill=MUTED)
    d.rounded_rectangle((1088, 196, 1204, 248), 10, fill=BRASS)
    d.text((1110, 208), "Fill", font=font(SANS_B, 18), fill=WELL)
    d.text((784, 300), "Vault", font=font(SANS, 16), fill=MUTED)
    for i, (name, user) in enumerate(
        (("mail.example", "ada@"), ("forge.example", "tor"), ("notes", "tax 2025"))
    ):
        y = 328 + i * 88
        d.rounded_rectangle((784, y, 1224, y + 76), 12, fill=WELL, outline=STROKE, width=2)
        d.text((804, y + 12), name, font=font(SANS_B, 18), fill=INK)
        d.text((804, y + 42), user, font=font(SANS, 16), fill=MUTED)
    d.text((80, 640), "Fill from the toolbar.", font=font(SERIF, 36), fill=INK)
    d.text(
        (80, 696),
        "The vault stays in the desktop app.",
        font=font(SANS, 22),
        fill=MUTED,
    )
    return im


def shot_pair(mark: Image.Image) -> Image.Image:
    im = browser_chrome(mark)
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((220, 120, 1060, 700), 20, fill=PLATE, outline=STROKE, width=2)
    im.paste(flatten(mark.resize((72, 72))), (604, 160))
    d.text((520, 252), "Pair with desktop", font=font(SERIF_B, 36), fill=INK)
    d.text(
        (340, 312),
        "Paste the code from Lockwright on this computer.",
        font=font(SANS, 20),
        fill=MUTED,
    )
    d.rounded_rectangle((380, 380, 900, 500), 16, fill=WELL, outline=BRASS, width=2)
    d.text((470, 418), "617653-7F83", font=font(SANS_B, 36), fill=MORTISE)
    d.rounded_rectangle((380, 540, 900, 620), 16, fill=BRASS)
    tw = d.textlength("Confirm pair", font=font(SANS_B, 24))
    d.text(((1280 - tw) / 2, 562), "Confirm pair", font=font(SANS_B, 24), fill=WELL)
    return im


def shot_autofill(mark: Image.Image) -> Image.Image:
    im = browser_chrome(mark)
    d = ImageDraw.Draw(im)
    d.text((80, 96), "Sign in", font=font(SERIF_B, 40), fill=INK)
    d.text((80, 180), "Email", font=font(SANS, 18), fill=MUTED)
    d.rounded_rectangle((80, 212, 620, 280), 12, fill=PLATE, outline=BRASS, width=2)
    d.text((100, 232), "ada@", font=font(SANS, 20), fill=INK)
    d.text((80, 320), "Password", font=font(SANS, 18), fill=MUTED)
    d.rounded_rectangle((80, 352, 620, 420), 12, fill=PLATE, outline=BRASS, width=2)
    d.text((100, 372), "••••••••••••", font=font(SANS, 20), fill=INK)
    d.rounded_rectangle((640, 200, 980, 430), 14, fill=PLATE, outline=STROKE, width=2)
    im.paste(flatten(mark.resize((28, 28))), (660, 220))
    d.text((700, 222), "Lockwright", font=font(SANS_B, 18), fill=INK)
    d.text((660, 268), "bank.example", font=font(SANS, 16), fill=MUTED)
    d.text((660, 300), "ada", font=font(SANS_B, 20), fill=INK)
    d.rounded_rectangle((660, 350, 960, 400), 10, fill=BRASS)
    d.text((760, 362), "Autofill", font=font(SANS_B, 18), fill=WELL)
    d.text((80, 640), "Autofill on the page.", font=font(SERIF, 36), fill=INK)
    d.text(
        (80, 696),
        "Logins, cards, and identities. Nothing is uploaded.",
        font=font(SANS, 22),
        fill=MUTED,
    )
    return im


def shot_generator(mark: Image.Image) -> Image.Image:
    im = browser_chrome(mark)
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((160, 120, 1120, 680), 20, fill=PLATE, outline=STROKE, width=2)
    d.text((200, 160), "Generate a password", font=font(SERIF_B, 36), fill=INK)
    d.rounded_rectangle((200, 230, 1080, 340), 14, fill=WELL, outline=STROKE, width=2)
    d.text((232, 262), "k7#Qm2!vL9pR4wXe", font=font(SANS_B, 32), fill=MORTISE)
    d.text((200, 380), "20 characters", font=font(SANS, 20), fill=MUTED)
    d.rounded_rectangle((200, 420, 1080, 444), 8, fill=STROKE)
    d.rounded_rectangle((200, 412, 760, 452), 12, fill=BRASS)
    d.ellipse((732, 400, 788, 464), fill=MORTISE)
    d.text((200, 500), "Special characters", font=font(SANS, 22), fill=INK)
    d.rounded_rectangle((960, 492, 1080, 548), 24, fill=BRASS)
    d.ellipse((1028, 500, 1072, 540), fill=WELL)
    d.rounded_rectangle((200, 580, 1080, 648), 14, fill=BRASS)
    tw = d.textlength("Copy", font=font(SANS_B, 24))
    d.text(((1280 - tw) / 2, 598), "Copy", font=font(SANS_B, 24), fill=WELL)
    return im


def shot_local(mark: Image.Image) -> Image.Image:
    im = browser_chrome(mark)
    d = ImageDraw.Draw(im)
    im.paste(flatten(mark.resize((160, 160))), (160, 220))
    d.text((360, 240), "No cloud vault", font=font(SERIF_B, 44), fill=INK)
    d.text(
        (360, 310),
        "Pair the desktop app. Sync is device to device.",
        font=font(SANS, 24),
        fill=MUTED,
    )
    rows = [
        ("On this computer", "Encrypted vault in Lockwright desktop"),
        ("In the browser", "Autofill after you pair"),
        ("Between devices", "Peer to peer. No account."),
    ]
    y = 420
    for title, sub in rows:
        d.rounded_rectangle((160, y, 1120, y + 88), 14, fill=PLATE, outline=STROKE, width=2)
        d.text((200, y + 16), title, font=font(SANS_B, 22), fill=INK)
        d.text((200, y + 48), sub, font=font(SANS, 18), fill=MUTED)
        y += 104
    return im


def small_tile(mark: Image.Image) -> Image.Image:
    im = Image.new("RGB", (440, 280), WELL)
    d = ImageDraw.Draw(im)
    im.paste(flatten(mark.resize((96, 96))), (28, 92))
    d.text((140, 100), "Lockwright", font=font(SERIF_B, 32), fill=INK)
    d.text((140, 148), "Autofill. No cloud.", font=font(SANS, 18), fill=MUTED)
    return im


def marquee(mark: Image.Image) -> Image.Image:
    im = Image.new("RGB", (1400, 560), WELL)
    d = ImageDraw.Draw(im)
    im.paste(flatten(mark.resize((280, 280))), (80, 140))
    d.text((400, 170), "Lockwright", font=font(SERIF_B, 72), fill=INK)
    d.text(
        (400, 270),
        "Browser autofill for a vault that stays on your computer.",
        font=font(SANS, 28),
        fill=MUTED,
    )
    d.rounded_rectangle((400, 360, 760, 440), 16, fill=BRASS)
    d.text((448, 382), "No cloud account", font=font(SANS_B, 24), fill=WELL)
    return im


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    mark = raster_logo(512)
    shots = [
        ("screenshot-01-popup.jpg", shot_popup),
        ("screenshot-02-autofill.jpg", shot_autofill),
        ("screenshot-03-pair.jpg", shot_pair),
        ("screenshot-04-generator.jpg", shot_generator),
        ("screenshot-05-local.jpg", shot_local),
    ]
    for name, fn in shots:
        save_jpg(fn(mark), OUT / name)
    save_jpg(small_tile(mark), OUT / "promo-small-440x280.jpg")
    save_jpg(marquee(mark), OUT / "promo-marquee-1400x560.jpg")
    print(f"wrote {OUT}")


if __name__ == "__main__":
    main()

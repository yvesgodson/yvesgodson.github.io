"""Generate the downloadable CV from English profile MDX files."""

from html import escape
from pathlib import Path
import re

import yaml
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "src" / "content" / "profile"
OUTPUT = ROOT / "public" / "documents"
FONT_CANDIDATES = [
    Path("C:/Windows/Fonts/arial.ttf"),
    Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"),
]
FONT_BOLD_CANDIDATES = [
    Path("C:/Windows/Fonts/arialbd.ttf"),
    Path("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"),
]


def font(candidates: list[Path], name: str) -> str:
    for path in candidates:
        if path.exists():
            pdfmetrics.registerFont(TTFont(name, str(path)))
            return name
    raise FileNotFoundError(f"No font found for {name}")


REGULAR = font(FONT_CANDIDATES, "CVRegular")
BOLD = font(FONT_BOLD_CANDIDATES, "CVBold")
pdfmetrics.registerFontFamily(REGULAR, normal=REGULAR, bold=BOLD)


def sections():
    result = []
    for path in (SOURCE / "cv").glob("*.mdx"):
        source = path.read_text(encoding="utf-8")
        match = re.match(r"---\s*\n(.*?)\n---\s*\n(.*)", source, re.S)
        if not match:
            raise ValueError(f"Invalid frontmatter: {path}")
        data = yaml.safe_load(match.group(1))
        if data.get("draft"):
            continue
        body = match.group(2).strip()
        if not body or "À compléter" in body or "To be completed" in body:
            continue
        result.append((data["order"], data["title"], body))
    return sorted(result)


def inline_markdown(value: str) -> str:
    value = escape(value)
    return re.sub(r"\*\*(.*?)\*\*", r"<b>\1</b>", value)


def build():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    target = OUTPUT / "AKOTO-Yves-CV.pdf"
    ink = colors.HexColor("#20252B")
    muted = colors.HexColor("#414A54")
    title = ParagraphStyle("title", fontName=BOLD, fontSize=21, leading=27, textColor=ink)
    contact = ParagraphStyle("contact", fontName=REGULAR, fontSize=8.5, leading=14, textColor=muted)
    heading = ParagraphStyle("heading", fontName=BOLD, fontSize=11, leading=15, spaceBefore=15, spaceAfter=5, textColor=ink)
    body_style = ParagraphStyle("body", fontName=REGULAR, fontSize=9.4, leading=15, textColor=ink, alignment=TA_LEFT, spaceAfter=6)
    bullet_style = ParagraphStyle("bullet", parent=body_style, leftIndent=12, firstLineIndent=-10)

    story = [Paragraph("AKOTO Yves", title), Spacer(1, 6)]
    story.append(Paragraph("akotchaye07@gmail.com  |  github.com/yvesgodson  |  linkedin.com/in/yves-akoto", contact))
    story.append(Spacer(1, 21))

    for index, (_, section_title, text) in enumerate(sections()):
        if index:
            story.append(Paragraph(escape(section_title), heading))
        for block in re.split(r"\n\s*\n", text):
            lines = block.strip().splitlines()
            for line in lines:
                if line.startswith("- "):
                    story.append(Paragraph("• " + inline_markdown(line[2:]), bullet_style))
                elif line.strip():
                    story.append(Paragraph(inline_markdown(line.strip()), body_style))

    SimpleDocTemplate(
        str(target), pagesize=A4, rightMargin=55, leftMargin=55,
        topMargin=48, bottomMargin=48,
        title="AKOTO Yves - CV", author="AKOTO Yves",
    ).build(story)
    print(target)


if __name__ == "__main__":
    build()

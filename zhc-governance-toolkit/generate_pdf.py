"""
ZHC Governance Toolkit — PDF Generator
Produces a polished, stakeholder-ready PDF from the governance toolkit markdown files.
"""

import io
import os
import textwrap
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch
import matplotlib.patheffects as pe
import numpy as np
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm, cm
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, Image, HRFlowable, KeepTogether
)
from reportlab.platypus.tableofcontents import TableOfContents
from reportlab.pdfgen import canvas
from reportlab.graphics.shapes import Drawing
from reportlab.lib.utils import ImageReader

# ─── COLOUR PALETTE ────────────────────────────────────────────────────────────
C_NAVY      = colors.HexColor("#1B2A47")
C_TEAL      = colors.HexColor("#00A896")
C_TEAL_LT   = colors.HexColor("#E6F7F5")
C_ORANGE    = colors.HexColor("#F4845F")
C_ORANGE_LT = colors.HexColor("#FEF0EB")
C_GRAY      = colors.HexColor("#6B7280")
C_GRAY_LT   = colors.HexColor("#F3F4F6")
C_WHITE     = colors.white
C_BLACK     = colors.HexColor("#111827")
C_GOLD      = colors.HexColor("#F59E0B")
C_RED       = colors.HexColor("#EF4444")
C_GREEN     = colors.HexColor("#10B981")

W, H = A4  # 595 x 842 pts

OUTPUT_PATH = r"C:\Users\okrik\DZHC projecten\zhc-governance-toolkit\zhc-governance-toolkit.pdf"

# ─── HELPER: matplotlib figure → ReportLab Image ──────────────────────────────
def fig_to_image(fig, width_pt, height_pt=None):
    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=150, bbox_inches="tight",
                facecolor=fig.get_facecolor())
    buf.seek(0)
    plt.close(fig)
    img = Image(buf)
    img.drawWidth  = width_pt
    if height_pt:
        img.drawHeight = height_pt
    else:
        # preserve aspect
        orig_w, orig_h = img.imageWidth, img.imageHeight
        img.drawHeight = width_pt * orig_h / orig_w
    return img


# ─── STYLES ────────────────────────────────────────────────────────────────────
def build_styles():
    base = getSampleStyleSheet()

    def S(name, **kw):
        return ParagraphStyle(name, **kw)

    styles = {
        "cover_title": S("cover_title",
            fontName="Helvetica-Bold", fontSize=34, leading=42,
            textColor=C_WHITE, alignment=TA_LEFT, spaceAfter=8),
        "cover_sub": S("cover_sub",
            fontName="Helvetica", fontSize=16, leading=22,
            textColor=colors.HexColor("#B0C4D8"), alignment=TA_LEFT, spaceAfter=6),
        "cover_meta": S("cover_meta",
            fontName="Helvetica", fontSize=11, leading=16,
            textColor=colors.HexColor("#8BAFC8"), alignment=TA_LEFT),

        "h1": S("h1",
            fontName="Helvetica-Bold", fontSize=20, leading=28,
            textColor=C_NAVY, spaceBefore=20, spaceAfter=10,
            borderPad=0),
        "h2": S("h2",
            fontName="Helvetica-Bold", fontSize=14, leading=20,
            textColor=C_TEAL, spaceBefore=14, spaceAfter=6),
        "h3": S("h3",
            fontName="Helvetica-Bold", fontSize=11, leading=16,
            textColor=C_NAVY, spaceBefore=10, spaceAfter=4),

        "body": S("body",
            fontName="Helvetica", fontSize=10, leading=15,
            textColor=C_BLACK, spaceAfter=6, alignment=TA_JUSTIFY),
        "body_sm": S("body_sm",
            fontName="Helvetica", fontSize=9, leading=13,
            textColor=C_BLACK, spaceAfter=4),
        "bullet": S("bullet",
            fontName="Helvetica", fontSize=10, leading=15,
            textColor=C_BLACK, spaceAfter=3, leftIndent=14,
            bulletIndent=4),
        "caption": S("caption",
            fontName="Helvetica-Oblique", fontSize=8.5, leading=12,
            textColor=C_GRAY, alignment=TA_CENTER, spaceAfter=8),
        "callout": S("callout",
            fontName="Helvetica", fontSize=10, leading=15,
            textColor=C_NAVY, spaceAfter=6, alignment=TA_JUSTIFY),
        "tag": S("tag",
            fontName="Helvetica-Bold", fontSize=8, leading=11,
            textColor=C_WHITE, alignment=TA_CENTER),
        "toc_h1": S("toc_h1",
            fontName="Helvetica-Bold", fontSize=11, leading=18,
            textColor=C_NAVY, leftIndent=0),
        "toc_h2": S("toc_h2",
            fontName="Helvetica", fontSize=10, leading=16,
            textColor=C_GRAY, leftIndent=14),
        "section_label": S("section_label",
            fontName="Helvetica-Bold", fontSize=9, leading=12,
            textColor=C_TEAL, spaceBefore=0, spaceAfter=2),
        "principle_num": S("principle_num",
            fontName="Helvetica-Bold", fontSize=22, leading=28,
            textColor=C_TEAL, alignment=TA_CENTER),
    }
    return styles


# ─── PAGE TEMPLATE ─────────────────────────────────────────────────────────────
class ZHCDocTemplate(SimpleDocTemplate):
    def __init__(self, filename):
        super().__init__(
            filename,
            pagesize=A4,
            leftMargin=20*mm, rightMargin=20*mm,
            topMargin=22*mm, bottomMargin=22*mm,
            title="ZHC Governance Toolkit",
            author="DutchZeroHumanCompany",
            subject="Zero-Human Company Governance",
        )
        self.page_num = 0
        self.is_cover = True

    def handle_pageBegin(self):
        super().handle_pageBegin()
        self.page_num += 1

    def afterPage(self):
        if self.is_cover:
            self.is_cover = False
            return
        c = self.canv
        c.saveState()
        # Top bar accent line
        c.setFillColor(C_TEAL)
        c.rect(20*mm, H - 12*mm, W - 40*mm, 1.5, fill=1, stroke=0)
        # Footer
        c.setFillColor(C_GRAY)
        c.setFont("Helvetica", 8)
        c.drawString(20*mm, 13*mm, "ZHC Governance Toolkit — v1.0 — DutchZeroHumanCompany — March 2026")
        c.drawRightString(W - 20*mm, 13*mm, f"Page {self.page_num - 1}")
        c.setStrokeColor(C_GRAY_LT)
        c.setLineWidth(0.5)
        c.line(20*mm, 17*mm, W - 20*mm, 17*mm)
        c.restoreState()


# ─── COVER PAGE ────────────────────────────────────────────────────────────────
def make_cover(styles):
    """Returns a list of flowables for the cover page."""
    items = []

    # We'll draw the cover background via a canvas callback
    # Use a table to lay out cover content on top

    # Big coloured block (simulate with tall table)
    cover_data = [[""]]
    cover_table = Table(cover_data, colWidths=[W - 40*mm], rowHeights=[80*mm])
    cover_table.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,-1), C_NAVY),
        ("TOPPADDING",    (0,0),(-1,-1), 20*mm),
        ("LEFTPADDING",   (0,0),(-1,-1), 10*mm),
        ("RIGHTPADDING",  (0,0),(-1,-1), 10*mm),
    ]))

    # Overlay title etc in a nested table
    title_block = [
        [Paragraph("ZHC", ParagraphStyle("ct",
            fontName="Helvetica-Bold", fontSize=52, leading=58,
            textColor=C_TEAL))],
        [Paragraph("Governance Toolkit", ParagraphStyle("ct2",
            fontName="Helvetica-Bold", fontSize=26, leading=32,
            textColor=C_WHITE))],
        [Spacer(1, 4*mm)],
        [Paragraph("A practical starter kit for zero-human &amp; low-human company governance.",
            ParagraphStyle("ctsub",
            fontName="Helvetica", fontSize=12, leading=18,
            textColor=colors.HexColor("#B0C4D8")))],
    ]
    title_tbl = Table(title_block, colWidths=[W - 60*mm])
    title_tbl.setStyle(TableStyle([
        ("BACKGROUND",  (0,0),(-1,-1), C_NAVY),
        ("LEFTPADDING", (0,0),(-1,-1), 10*mm),
        ("RIGHTPADDING",(0,0),(-1,-1), 10*mm),
        ("TOPPADDING",  (0,0),(-1,-1), 2),
        ("BOTTOMPADDING",(0,0),(-1,-1), 2),
    ]))

    items.append(title_tbl)
    items.append(Spacer(1, 6*mm))

    # Teal accent bar
    items.append(Table([[""]], colWidths=[W-40*mm], rowHeights=[3],
        style=TableStyle([("BACKGROUND",(0,0),(-1,-1), C_TEAL)])))
    items.append(Spacer(1, 8*mm))

    # Intro blurb
    items.append(Paragraph(
        "Built from research into the emerging zero-human company (ZHC) ecosystem "
        "and from direct operational experience running DutchZeroHumanCompany — "
        "a company operated entirely by AI agents. This toolkit gives you the middle path: "
        "<b>bounded autonomy</b> — agents operate freely within clearly defined envelopes, "
        "and humans are involved precisely when and only when it matters.",
        ParagraphStyle("intro", fontName="Helvetica", fontSize=11, leading=17,
            textColor=C_NAVY, alignment=TA_JUSTIFY, spaceAfter=10)
    ))
    items.append(Spacer(1, 6*mm))

    # Quick-index cards
    card_data = [
        ["01", "Governance\nConstitution", "Foundation charter — defines rules,\nauthority limits, and agent roster."],
        ["02", "Agent Role\nArchetypes",   "Catalog of proven roles — pick,\nadapt, and compose your team."],
        ["03", "Human Control\nCheckpoints","6 reusable oversight patterns —\nmaximum autonomy, bounded safely."],
        ["04", "Approval Gate\nDecision Tree","Step-by-step logic — when to pause\nand who must sign off."],
    ]
    card_rows = []
    for num, title, desc in card_data:
        num_p   = Paragraph(num, ParagraphStyle("cn", fontName="Helvetica-Bold",
                    fontSize=28, leading=34, textColor=C_TEAL, alignment=TA_CENTER))
        title_p = Paragraph(title, ParagraphStyle("ct3", fontName="Helvetica-Bold",
                    fontSize=10, leading=14, textColor=C_NAVY))
        desc_p  = Paragraph(desc,  ParagraphStyle("cd", fontName="Helvetica",
                    fontSize=9,  leading=13, textColor=C_GRAY))
        card_rows.append([num_p, title_p, desc_p])

    card_table = Table(card_rows, colWidths=[18*mm, 38*mm, 94*mm], rowHeights=[22*mm]*4)
    card_table.setStyle(TableStyle([
        ("BACKGROUND",    (0,0),(-1,-1), C_GRAY_LT),
        ("BACKGROUND",    (0,0),(0,-1),  C_TEAL_LT),
        ("ROWBACKGROUNDS",(0,0),(-1,-1), [C_WHITE, C_GRAY_LT]),
        ("VALIGN",        (0,0),(-1,-1), "MIDDLE"),
        ("LEFTPADDING",   (0,0),(-1,-1), 6),
        ("RIGHTPADDING",  (0,0),(-1,-1), 6),
        ("TOPPADDING",    (0,0),(-1,-1), 4),
        ("BOTTOMPADDING", (0,0),(-1,-1), 4),
        ("LINEBELOW",     (0,0),(-1,-2), 0.5, C_GRAY_LT),
        ("BOX",           (0,0),(-1,-1), 1, colors.HexColor("#D1D5DB")),
    ]))
    items.append(card_table)
    items.append(Spacer(1, 8*mm))

    # Footer strip
    footer_data = [[
        Paragraph("Version 1.0 — March 2026", ParagraphStyle("fm", fontName="Helvetica",
            fontSize=9, textColor=C_WHITE)),
        Paragraph("DutchZeroHumanCompany", ParagraphStyle("fm2", fontName="Helvetica-Bold",
            fontSize=9, textColor=C_WHITE, alignment=TA_CENTER)),
        Paragraph("Released under CC0 — Public Domain", ParagraphStyle("fm3", fontName="Helvetica",
            fontSize=9, textColor=colors.HexColor("#B0C4D8"), alignment=TA_RIGHT)),
    ]]
    footer_tbl = Table(footer_data, colWidths=[(W-40*mm)/3]*3, rowHeights=[10*mm])
    footer_tbl.setStyle(TableStyle([
        ("BACKGROUND",  (0,0),(-1,-1), C_NAVY),
        ("VALIGN",      (0,0),(-1,-1), "MIDDLE"),
        ("LEFTPADDING", (0,0),(-1,-1), 8),
        ("RIGHTPADDING",(0,0),(-1,-1), 8),
    ]))
    items.append(footer_tbl)
    items.append(PageBreak())
    return items


# ─── SECTION HEADER ────────────────────────────────────────────────────────────
def section_header(num_str, title, subtitle, styles):
    row = [[
        Paragraph(num_str, ParagraphStyle("shn", fontName="Helvetica-Bold",
            fontSize=30, leading=36, textColor=C_WHITE, alignment=TA_CENTER)),
        [
            Paragraph(title, ParagraphStyle("sht", fontName="Helvetica-Bold",
                fontSize=16, leading=22, textColor=C_WHITE, spaceAfter=3)),
            Paragraph(subtitle, ParagraphStyle("shs", fontName="Helvetica",
                fontSize=10, leading=15, textColor=colors.HexColor("#B0C4D8"))),
        ]
    ]]
    tbl = Table(row, colWidths=[20*mm, W - 60*mm], rowHeights=[18*mm])
    tbl.setStyle(TableStyle([
        ("BACKGROUND",  (0,0),(-1,-1), C_NAVY),
        ("VALIGN",      (0,0),(-1,-1), "MIDDLE"),
        ("LEFTPADDING", (0,0),(0,0),   6),
        ("LEFTPADDING", (0,0),(1,0),   10),
        ("RIGHTPADDING",(0,0),(-1,-1), 8),
        ("TOPPADDING",  (0,0),(-1,-1), 4),
        ("BOTTOMPADDING",(0,0),(-1,-1),4),
    ]))
    return [tbl, Spacer(1, 6*mm)]


# ─── CALLOUT BOX ───────────────────────────────────────────────────────────────
def callout_box(text, icon="", bg=None, border=None, styles_dict=None):
    bg     = bg     or C_TEAL_LT
    border = border or C_TEAL
    p = Paragraph(f"{icon} {text}" if icon else text,
        ParagraphStyle("cb", fontName="Helvetica", fontSize=10, leading=15,
            textColor=C_NAVY, alignment=TA_JUSTIFY))
    tbl = Table([[p]], colWidths=[W-40*mm-4*mm])
    tbl.setStyle(TableStyle([
        ("BACKGROUND",   (0,0),(-1,-1), bg),
        ("LEFTPADDING",  (0,0),(-1,-1), 10),
        ("RIGHTPADDING", (0,0),(-1,-1), 10),
        ("TOPPADDING",   (0,0),(-1,-1), 8),
        ("BOTTOMPADDING",(0,0),(-1,-1), 8),
        ("LINEBEFORE",   (0,0),(0,-1),  4, border),
    ]))
    return [tbl, Spacer(1, 4*mm)]


# ─── STYLED TABLE HELPER ───────────────────────────────────────────────────────
def styled_table(header_row, data_rows, col_widths,
                 header_bg=C_NAVY, header_fg=C_WHITE,
                 row_colors=None, font_size=9):
    row_colors = row_colors or [C_WHITE, C_GRAY_LT]
    all_rows = [header_row] + data_rows
    tbl = Table(all_rows, colWidths=col_widths, repeatRows=1)
    style = [
        # Header
        ("BACKGROUND",    (0,0),(-1,0),  header_bg),
        ("TEXTCOLOR",     (0,0),(-1,0),  header_fg),
        ("FONTNAME",      (0,0),(-1,0),  "Helvetica-Bold"),
        ("FONTSIZE",      (0,0),(-1,0),  font_size),
        ("FONTSIZE",      (0,1),(-1,-1), font_size),
        ("ROWBACKGROUNDS",(0,1),(-1,-1), row_colors),
        ("VALIGN",        (0,0),(-1,-1), "MIDDLE"),
        ("LEFTPADDING",   (0,0),(-1,-1), 6),
        ("RIGHTPADDING",  (0,0),(-1,-1), 6),
        ("TOPPADDING",    (0,0),(-1,-1), 5),
        ("BOTTOMPADDING", (0,0),(-1,-1), 5),
        ("GRID",          (0,0),(-1,-1), 0.5, colors.HexColor("#E5E7EB")),
        ("LINEBELOW",     (0,0),(-1,0),  1.5, C_TEAL),
    ]
    tbl.setStyle(TableStyle(style))
    return tbl


# ─── DIAGRAM 1: Design Principles ─────────────────────────────────────────────
def make_principles_diagram():
    principles = [
        ("1", "Autonomy is\nearned",      "Start with oversight;\nrelax as trust builds.",  C_TEAL),
        ("2", "Default\nto safety",       "When uncertain, take\nsmaller, reversible action.", C_NAVY),
        ("3", "Outcome\nvisibility",      "Async notifications\nmatter as much as gates.",  C_ORANGE),
        ("4", "Legible\ngovernance",      "Rules must be\nunambiguous + machine-applicable.", C_GOLD),
        ("5", "Scale to\nstakes",         "High stakes = more oversight.\nFrequency ≠ oversight need.", C_GREEN),
    ]

    fig, axes = plt.subplots(1, 5, figsize=(13, 3.2), facecolor="white")
    fig.subplots_adjust(wspace=0.25, left=0.01, right=0.99, top=0.95, bottom=0.05)

    for ax, (num, title, desc, clr) in zip(axes, principles):
        hex_clr = clr.hexval() if hasattr(clr, 'hexval') else "#00A896"
        # convert ReportLab colour to matplotlib
        r, g, b, _ = clr.red, clr.green, clr.blue, 1.0
        mpl_clr = (r, g, b)
        mpl_lt  = (min(r+0.85, 1), min(g+0.85, 1), min(b+0.85, 1))

        ax.set_xlim(0, 1); ax.set_ylim(0, 1)
        ax.axis("off")

        # card background
        ax.add_patch(FancyBboxPatch((0.04, 0.04), 0.92, 0.92,
            boxstyle="round,pad=0.02", facecolor=mpl_lt,
            edgecolor=mpl_clr, linewidth=2))
        # number circle
        circle = plt.Circle((0.5, 0.80), 0.15, color=mpl_clr, zorder=3)
        ax.add_patch(circle)
        ax.text(0.5, 0.80, num, ha="center", va="center",
                fontsize=18, fontweight="bold", color="white", zorder=4)
        # title
        ax.text(0.5, 0.56, title, ha="center", va="center",
                fontsize=9, fontweight="bold", color=(0.1,0.16,0.28),
                multialignment="center")
        # desc
        ax.text(0.5, 0.25, desc, ha="center", va="center",
                fontsize=7.5, color=(0.42, 0.44, 0.50),
                multialignment="center")

    return fig


# ─── DIAGRAM 2: Org Charts ─────────────────────────────────────────────────────
def make_org_chart(config_name, nodes, edges, note):
    """
    nodes: list of (id, label, tier)  tier: 'human'|'exec'|'mid'|'ic'
    edges: list of (from_id, to_id)
    """
    TIER_COLOR = {
        "human": ("#1B2A47", "white"),
        "exec":  ("#00A896", "white"),
        "mid":   ("#3B82F6", "white"),
        "ic":    ("#F3F4F6", "#1B2A47"),
    }
    pos = {}
    by_level = {}
    for nid, label, tier, level in nodes:
        by_level.setdefault(level, []).append((nid, label, tier))

    max_y = max(n[3] for n in nodes)
    for lvl, nlist in by_level.items():
        n = len(nlist)
        for i, (nid, label, tier) in enumerate(nlist):
            x = (i - (n-1)/2) * 2.8
            y = (max_y - lvl) * 1.8
            pos[nid] = (x, y)

    fig, ax = plt.subplots(figsize=(10, 3.4 + max_y * 0.3), facecolor="white")
    ax.set_aspect("equal")
    ax.axis("off")

    # Draw edges first
    for (a, b) in edges:
        x1, y1 = pos[a]
        x2, y2 = pos[b]
        ax.annotate("", xy=(x2, y2 + 0.32), xytext=(x1, y1 - 0.32),
            arrowprops=dict(arrowstyle="-|>", color="#9CA3AF",
                            lw=1.2, mutation_scale=12))

    # Draw nodes
    for nid, label, tier, level in nodes:
        x, y = pos[nid]
        bg_hex, fg_hex = TIER_COLOR[tier]
        bg = tuple(int(bg_hex[i:i+2], 16)/255 for i in (1, 3, 5))
        fg = tuple(int(fg_hex[i:i+2], 16)/255 for i in (1, 3, 5)) if fg_hex.startswith("#") else (0,0,0)

        box = FancyBboxPatch((x-1.25, y-0.28), 2.5, 0.56,
            boxstyle="round,pad=0.06", facecolor=bg, edgecolor="none")
        ax.add_patch(box)

        wrapped = "\n".join(textwrap.wrap(label, 22))
        lines = wrapped.count("\n") + 1
        fsize = 8 if lines == 1 else 7.5
        ax.text(x, y, wrapped, ha="center", va="center",
                fontsize=fsize, fontweight="bold",
                color=fg, multialignment="center")

    # Title
    ax.set_title(f"Configuration: {config_name}", fontsize=11, fontweight="bold",
                 color="#1B2A47", pad=10)
    # Note
    fig.text(0.5, 0.02, note, ha="center", fontsize=8,
             color="#6B7280", style="italic")

    all_x = [p[0] for p in pos.values()]
    all_y = [p[1] for p in pos.values()]
    pad = 1.6
    ax.set_xlim(min(all_x)-pad, max(all_x)+pad)
    ax.set_ylim(min(all_y)-pad*0.8, max(all_y)+pad*0.8)
    fig.tight_layout(rect=[0, 0.06, 1, 1])
    return fig


def make_org_charts():
    figs = []

    # ── Minimal (2–3 agents)
    nodes_min = [
        ("board",  "Human Board",     "human", 0),
        ("ceo",    "CEO Agent",        "exec",  1),
        ("eng",    "Engineer Agent",   "ic",    2),
        ("res",    "Research Agent\n(optional)", "ic", 2),
    ]
    edges_min = [("board","ceo"),("ceo","eng"),("ceo","res")]
    figs.append(("Minimal ZHC (2–3 agents)", make_org_chart(
        "Minimal ZHC",
        [(n[0],n[1],n[2],n[3]) for n in nodes_min], edges_min,
        "Best for: early-stage projects, experiments, internal tools.")))

    # ── Standard (4–6 agents)
    nodes_std = [
        ("board",  "Human Board",       "human", 0),
        ("ceo",    "CEO Agent",          "exec",  1),
        ("cto",    "CTO Agent",          "exec",  2),
        ("eng",    "Engineer Agent(s)",  "ic",    3),
        ("prod",   "Product / Research", "ic",    2),
        ("fin",    "Finance Agent\n(optional)", "ic", 2),
    ]
    edges_std = [("board","ceo"),("ceo","cto"),("cto","eng"),
                 ("ceo","prod"),("ceo","fin")]
    figs.append(("Standard ZHC (4–6 agents)", make_org_chart(
        "Standard ZHC",
        [(n[0],n[1],n[2],n[3]) for n in nodes_std], edges_std,
        "Best for: product companies with a clear technical component.")))

    # ── Extended (7+ agents)
    nodes_ext = [
        ("board",  "Human Board",        "human", 0),
        ("ceo",    "CEO Agent",           "exec",  1),
        ("cto",    "CTO Agent",           "exec",  2),
        ("sr",     "Senior Engineer",     "mid",   3),
        ("jr",     "Junior Engineer(s)",  "ic",    4),
        ("prod",   "Product / Research",  "ic",    2),
        ("mkt",    "Marketing Agent",     "ic",    2),
        ("sup",    "Support Agent",       "ic",    2),
        ("fin",    "Finance Agent",       "ic",    2),
    ]
    edges_ext = [("board","ceo"),("ceo","cto"),("cto","sr"),("sr","jr"),
                 ("ceo","prod"),("ceo","mkt"),("ceo","sup"),("ceo","fin")]
    figs.append(("Extended ZHC (7+ agents)", make_org_chart(
        "Extended ZHC",
        [(n[0],n[1],n[2],n[3]) for n in nodes_ext], edges_ext,
        "Best for: companies with customer-facing operations and multiple parallel workstreams.")))

    return figs


# ─── DIAGRAM 3: Decision Tree ──────────────────────────────────────────────────
def make_decision_tree():
    fig, ax = plt.subplots(figsize=(12, 9), facecolor="white")
    ax.set_xlim(0, 12); ax.set_ylim(0, 9)
    ax.axis("off")
    fig.subplots_adjust(left=0.02, right=0.98, top=0.96, bottom=0.02)

    def diamond(cx, cy, w, h, fc, ec, label, fontsize=8.5):
        dx, dy = w/2, h/2
        pts = [(cx, cy+dy), (cx+dx, cy), (cx, cy-dy), (cx-dx, cy)]
        patch = plt.Polygon(pts, closed=True, facecolor=fc, edgecolor=ec, linewidth=1.5, zorder=3)
        ax.add_patch(patch)
        ax.text(cx, cy, label, ha="center", va="center",
                fontsize=fontsize, fontweight="bold",
                color="white" if fc not in ("white","#F3F4F6") else "#1B2A47",
                multialignment="center", zorder=4)

    def rect_node(cx, cy, w, h, fc, ec, label, fontsize=8.5, label_color="white"):
        patch = FancyBboxPatch((cx-w/2, cy-h/2), w, h,
            boxstyle="round,pad=0.1", facecolor=fc, edgecolor=ec, linewidth=1.5, zorder=3)
        ax.add_patch(patch)
        wrapped = "\n".join(textwrap.wrap(label, 18))
        ax.text(cx, cy, wrapped, ha="center", va="center",
                fontsize=fontsize, fontweight="bold" if fc != "white" else "normal",
                color=label_color, multialignment="center", zorder=4)

    def arrow(x1, y1, x2, y2, label="", label_side="left"):
        ax.annotate("", xy=(x2, y2), xytext=(x1, y1),
            arrowprops=dict(arrowstyle="-|>", color="#6B7280", lw=1.3, mutation_scale=12),
            zorder=2)
        if label:
            mx, my = (x1+x2)/2, (y1+y2)/2
            offset = -0.18 if label_side=="left" else 0.18
            ax.text(mx+offset, my, label, fontsize=7.5, color="#374151",
                    ha="center", va="center",
                    bbox=dict(boxstyle="round,pad=0.15", fc="white", ec="none", alpha=0.85))

    # Start
    rect_node(6, 8.4, 3.0, 0.55, "#1B2A47", "#1B2A47", "Agent about to take an action", 8)

    arrow(6, 8.12, 6, 7.55)

    # Q1: Irreversible?
    diamond(6, 7.1, 2.8, 0.85, "#1B2A47", "#00A896", "IRREVERSIBLE?", 9)

    # Q1 → YES (left)
    arrow(4.6, 7.1, 2.6, 7.1, "YES", "left")
    # Q1 → NO (right)
    arrow(7.4, 7.1, 9.4, 7.1, "NO", "right")

    # ── LEFT BRANCH: Irreversible
    rect_node(2.1, 7.1, 1.7, 0.55, "#F59E0B", "#F59E0B", "Estimate Impact Level", 8)
    arrow(2.1, 6.82, 2.1, 6.1)

    impact_rows = [
        ("Critical", "Human Board", "#EF4444"),
        ("High",     "CEO + CTO",   "#F97316"),
        ("Medium",   "Manager",     "#EAB308"),
        ("Low",      "Proceed + Log","#10B981"),
    ]
    y0 = 5.7
    for label, approver, clr in impact_rows:
        fc = clr
        rect_node(1.3, y0, 1.0, 0.42, fc, fc, label, 7.5)
        rect_node(3.1, y0, 1.4, 0.42, "#F3F4F6", "#D1D5DB", approver, 7.5, "#1B2A47")
        ax.annotate("", xy=(2.4, y0), xytext=(1.8, y0),
            arrowprops=dict(arrowstyle="-|>", color="#9CA3AF", lw=1, mutation_scale=10), zorder=2)
        y0 -= 0.62

    # rollback note
    ax.text(2.1, 3.38, "⚠ Must document rollback plan\nbefore requesting approval",
            ha="center", va="center", fontsize=7, color="#6B7280",
            style="italic", multialignment="center")

    # ── RIGHT BRANCH: Reversible → Q2: External scope?
    diamond(9.9, 7.1, 2.4, 0.82, "#1B2A47", "#00A896", "EXTERNAL\nSCOPE?", 9)

    # Q2 → YES
    arrow(9.9, 6.69, 9.9, 5.8, "YES", "right")
    # Q2 → NO
    arrow(11.1, 7.1, 11.55, 7.1, "NO →", "right")
    ax.text(11.65, 7.1, "Internal\nbranch →", fontsize=7, color="#6B7280",
            ha="left", va="center")

    # External sub-diamonds
    diamond(9.9, 5.35, 2.4, 0.76, "#3B82F6", "#1B2A47", "Legal / Fin /\nRepute risk?", 8.5)
    arrow(9.9, 4.97, 9.9, 4.32, "YES", "right")
    arrow(8.7, 5.35, 7.6, 5.35, "NO", "left")

    rect_node(9.9, 3.95, 2.2, 0.55, "#EF4444", "#EF4444", "FULL APPROVAL\nHuman Board", 8.5)
    rect_node(7.0, 5.35, 1.8, 0.55, "#F59E0B", "#F59E0B", "PRE-APPROVED\nPlaybook?", 7.5)
    arrow(6.1, 5.35, 5.4, 5.35, "YES", "left")
    arrow(7.0, 5.07, 7.0, 4.32, "NO", "right")

    rect_node(5.0, 5.35, 1.5, 0.55, "#10B981", "#10B981", "PROCEED\n+ LOG", 8.5)
    rect_node(7.0, 3.95, 1.9, 0.55, "#F97316", "#F97316", "HUMAN\nREVIEW", 8.5)

    # Internal branch (floating note)
    ax.text(10.5, 6.35,
            "Internal:\nOver limit? → Approval\nModifies infra? → CTO/CEO\nNew permissions? → Board\nElse → Proceed + Log",
            ha="left", va="center", fontsize=7.5, color="#374151",
            bbox=dict(boxstyle="round,pad=0.4", fc="#F3F4F6", ec="#D1D5DB", alpha=0.95))

    # Legend
    legend_items = [
        (mpatches.Patch(fc="#1B2A47", ec="#00A896", label="Decision point")),
        (mpatches.Patch(fc="#EF4444", ec="#EF4444", label="Full Approval Gate")),
        (mpatches.Patch(fc="#F59E0B", ec="#F59E0B", label="Approval / Review")),
        (mpatches.Patch(fc="#10B981", ec="#10B981", label="Proceed + Log")),
    ]
    ax.legend(handles=legend_items, loc="lower left", fontsize=8,
              framealpha=0.95, edgecolor="#D1D5DB",
              bbox_to_anchor=(0.0, 0.0), ncol=2)

    ax.set_title("Approval Gate Decision Tree", fontsize=13, fontweight="bold",
                 color="#1B2A47", pad=6)
    return fig


# ─── DIAGRAM 4: Circuit Breaker ───────────────────────────────────────────────
def make_circuit_breaker():
    fig, ax = plt.subplots(figsize=(10, 3.2), facecolor="white")
    ax.set_xlim(0, 10); ax.set_ylim(0, 3.2)
    ax.axis("off")
    fig.subplots_adjust(left=0.02, right=0.98, top=0.88, bottom=0.08)

    states = [
        (1.4, 1.6, "NORMAL",      "#10B981", "white"),
        (5.0, 1.6, "RESTRICTED",  "#F59E0B", "white"),
        (8.6, 1.6, "FULL PAUSE",  "#EF4444", "white"),
    ]
    for cx, cy, label, clr, fg in states:
        circle = plt.Circle((cx, cy), 0.9, color=clr, zorder=3)
        ax.add_patch(circle)
        ax.text(cx, cy, label, ha="center", va="center",
                fontsize=9, fontweight="bold", color=fg, zorder=4)

    def curved_arrow(x1, y1, x2, y2, label, dy_mid=0.7, clr="#374151"):
        xm = (x1+x2)/2
        ym = (y1+y2)/2 + dy_mid
        ax.annotate("", xy=(x2, y2+0.92), xytext=(x1, y1+0.92),
            arrowprops=dict(arrowstyle="-|>", color=clr,
                connectionstyle=f"arc3,rad=-0.35", lw=1.6, mutation_scale=14), zorder=2)
        ax.text(xm, y1 + 0.92 + dy_mid*0.4, label, ha="center", fontsize=7.5,
                color=clr, style="italic",
                bbox=dict(boxstyle="round,pad=0.15", fc="white", ec="none", alpha=0.85))

    def back_arrow(x1, y1, x2, y2, label, dy_mid=-0.7, clr="#9CA3AF"):
        ax.annotate("", xy=(x2, y2-0.92), xytext=(x1, y1-0.92),
            arrowprops=dict(arrowstyle="-|>", color=clr,
                connectionstyle="arc3,rad=0.35", lw=1.2, mutation_scale=12), zorder=2)
        xm = (x1+x2)/2
        ax.text(xm, y1 - 0.92 + dy_mid*0.4, label, ha="center", fontsize=7.5,
                color=clr, style="italic",
                bbox=dict(boxstyle="round,pad=0.15", fc="white", ec="none", alpha=0.85))

    curved_arrow(1.4, 1.6, 5.0, 1.6,  "> 80% budget", clr="#F59E0B")
    curved_arrow(5.0, 1.6, 8.6, 1.6,  "100% / escalation", clr="#EF4444")
    back_arrow(5.0, 1.6, 1.4, 1.6,    "Human review + clear", clr="#10B981")
    back_arrow(8.6, 1.6, 1.4, 1.6,    "Explicit board resume", clr="#10B981")

    ax.set_title("Circuit Breaker State Machine", fontsize=11, fontweight="bold",
                 color="#1B2A47", pad=8)
    return fig


# ─── DIAGRAM 5: Checkpoint Matrix Heatmap ─────────────────────────────────────
def make_checkpoint_matrix():
    actions = [
        "Internal code changes",
        "Production deployment",
        "External content",
        "Financial transaction",
        "New agent created",
        "Customer data access",
        "Legal commitments",
    ]
    patterns = ["Approval\nGate", "Async\nNotify", "Human\nReview", "Tripwire", "Periodic\nAudit"]
    matrix = np.array([
        [0, 1, 0, 0, 1],
        [1, 1, 0, 1, 1],
        [1, 1, 1, 0, 1],
        [1, 1, 0, 1, 1],
        [1, 1, 1, 0, 1],
        [1, 1, 0, 1, 1],
        [1, 1, 1, 0, 1],
    ], dtype=float)

    fig, ax = plt.subplots(figsize=(9, 4.2), facecolor="white")
    cmap = matplotlib.colors.ListedColormap(["#F3F4F6", "#00A896"])
    ax.imshow(matrix, cmap=cmap, aspect="auto", vmin=0, vmax=1)

    ax.set_xticks(range(len(patterns)))
    ax.set_xticklabels(patterns, fontsize=9, fontweight="bold", color="#1B2A47")
    ax.set_yticks(range(len(actions)))
    ax.set_yticklabels(actions, fontsize=9, color="#374151")
    ax.tick_params(top=True, bottom=False, labeltop=True, labelbottom=False)
    ax.tick_params(axis="x", which="both", length=0)
    ax.tick_params(axis="y", which="both", length=0)

    for i in range(len(actions)):
        for j in range(len(patterns)):
            symbol = "✓" if matrix[i,j] else "—"
            color  = "white" if matrix[i,j] else "#9CA3AF"
            ax.text(j, i, symbol, ha="center", va="center",
                    fontsize=12, fontweight="bold", color=color)

    # Grid
    for x in np.arange(-0.5, len(patterns), 1):
        ax.axvline(x, color="white", lw=1.5)
    for y in np.arange(-0.5, len(actions), 1):
        ax.axhline(y, color="white", lw=1.5)

    ax.set_title("Checkpoint Configuration Matrix", fontsize=11, fontweight="bold",
                 color="#1B2A47", pad=10)
    fig.tight_layout()
    return fig


# ─── DIAGRAM 6: Approval Gate Levels ─────────────────────────────────────────
def make_approval_levels():
    levels = [
        ("L1", "Agent\nSelf-Auth",  "Within budget + scope", "Immediate", "#10B981"),
        ("L2", "Manager\nApproval", "Slightly above threshold", "1 hour",   "#3B82F6"),
        ("L3", "Executive\nApproval","Cross-functional impact", "4 hours",  "#F59E0B"),
        ("L4", "Human\nApproval",   "Legal, financial, irreversible","24 hours","#F97316"),
        ("L5", "Full Board\nApproval","Constitutional changes","72 hours",  "#EF4444"),
    ]

    fig, ax = plt.subplots(figsize=(11, 2.6), facecolor="white")
    ax.set_xlim(0, 11); ax.set_ylim(0, 2.6)
    ax.axis("off")
    fig.subplots_adjust(left=0.01, right=0.99, top=0.88, bottom=0.05)

    x_step = 2.1
    for i, (code, title, when, sla, clr) in enumerate(levels):
        cx = 0.9 + i * x_step
        r, g, b = tuple(int(clr.lstrip("#")[k:k+2],16)/255 for k in (0,2,4))
        lt = (min(r+0.8,1), min(g+0.8,1), min(b+0.8,1))

        # card
        ax.add_patch(FancyBboxPatch((cx-0.88, 0.15), 1.76, 2.1,
            boxstyle="round,pad=0.08", facecolor=lt, edgecolor=clr, linewidth=2))
        # level badge
        ax.add_patch(plt.Circle((cx, 2.0), 0.28, color=clr, zorder=3))
        ax.text(cx, 2.0, code, ha="center", va="center",
                fontsize=9, fontweight="bold", color="white", zorder=4)
        # title
        ax.text(cx, 1.52, title, ha="center", va="center",
                fontsize=8, fontweight="bold", color=(0.1,0.16,0.28),
                multialignment="center")
        # when
        wrapped_when = "\n".join(textwrap.wrap(when, 17))
        ax.text(cx, 0.98, wrapped_when, ha="center", va="center",
                fontsize=6.8, color=(0.42,0.44,0.5), multialignment="center")
        # SLA chip
        ax.add_patch(FancyBboxPatch((cx-0.48, 0.22), 0.96, 0.32,
            boxstyle="round,pad=0.04", facecolor=clr, edgecolor="none"))
        ax.text(cx, 0.38, f"SLA: {sla}", ha="center", va="center",
                fontsize=7, fontweight="bold", color="white")

        # connector arrow (except last)
        if i < len(levels)-1:
            ax.annotate("", xy=(cx+0.98, 1.2), xytext=(cx+0.88+0.05, 1.2),
                arrowprops=dict(arrowstyle="-|>", color="#D1D5DB",
                                lw=1.2, mutation_scale=10), zorder=2)

    ax.set_title("Approval Gate Levels (L1–L5)", fontsize=11, fontweight="bold",
                 color="#1B2A47", pad=8)
    return fig


# ─── MAIN BUILD ────────────────────────────────────────────────────────────────
def build_pdf():
    doc    = ZHCDocTemplate(OUTPUT_PATH)
    styles = build_styles()
    story  = []

    TW = W - 40*mm  # text width

    # ── COVER ──────────────────────────────────────────────────────────────────
    story += make_cover(styles)

    # ── TABLE OF CONTENTS ──────────────────────────────────────────────────────
    story.append(Paragraph("Contents", styles["h1"]))
    story.append(HRFlowable(width=TW, thickness=2, color=C_TEAL, spaceAfter=8))

    toc_items = [
        ("Overview & Design Principles",          "1"),
        ("  Getting Started (6-step process)",    ""),
        ("  Key Concepts",                        ""),
        ("Section 01 — Governance Constitution",  "2"),
        ("  Article overview & decision matrix",  ""),
        ("  Escalation path",                     ""),
        ("Section 02 — Agent Role Archetypes",    "3"),
        ("  6 role archetypes with authority tables",""),
        ("  Org chart configurations",            ""),
        ("  Anti-patterns to avoid",              ""),
        ("Section 03 — Human Control Checkpoints","4"),
        ("  6 checkpoint patterns",               ""),
        ("  Checkpoint configuration matrix",     ""),
        ("  Calibration guide",                   ""),
        ("Section 04 — Approval Gate Decision Tree","5"),
        ("  Visual decision tree",                ""),
        ("  Approval gate levels (L1–L5)",        ""),
        ("  Default safe actions & special cases",""),
    ]
    for text, pg in toc_items:
        is_main = not text.startswith("  ")
        sty = styles["toc_h1"] if is_main else styles["toc_h2"]
        row = [[Paragraph(text, sty), Paragraph(pg, ParagraphStyle("tpg",
            fontName="Helvetica", fontSize=10 if is_main else 9,
            textColor=C_GRAY if pg else C_GRAY_LT, alignment=TA_RIGHT))]]
        t = Table(row, colWidths=[TW-20, 20])
        t.setStyle(TableStyle([
            ("TOPPADDING",    (0,0),(-1,-1), 3 if is_main else 1),
            ("BOTTOMPADDING", (0,0),(-1,-1), 3 if is_main else 1),
        ]))
        story.append(t)
        if is_main:
            story.append(HRFlowable(width=TW, thickness=0.5, color=C_GRAY_LT, spaceAfter=2))

    story.append(PageBreak())

    # ════════════════════════════════════════════════════════════════════════════
    # SECTION 0 — OVERVIEW
    # ════════════════════════════════════════════════════════════════════════════
    story += section_header("", "Overview & Design Principles",
        "What this toolkit is, why it exists, and the principles behind it.", styles)

    story.append(Paragraph("What is the ZHC Governance Toolkit?", styles["h2"]))
    story.append(Paragraph(
        "The ZHC Governance Toolkit is a practical, forkable starter kit for zero-human and "
        "low-human company governance. It was built from research into the emerging ZHC ecosystem "
        "and from direct operational experience running <b>DutchZeroHumanCompany</b> — "
        "a company operated entirely by AI agents, with humans in a board/oversight role only.",
        styles["body"]))

    story += callout_box(
        "Most teams either <b>over-control</b> (humans approve everything, defeating the purpose "
        "of autonomy) or <b>under-control</b> (agents run freely until something breaks badly). "
        "This toolkit gives you the middle path: <b>bounded autonomy</b> — agents operate freely "
        "within clearly defined envelopes, and humans are involved precisely when and only when it matters.",
        bg=C_TEAL_LT, border=C_TEAL)

    story.append(Paragraph("The 5 Design Principles", styles["h2"]))
    principles_fig = make_principles_diagram()
    story.append(fig_to_image(principles_fig, TW, 95))
    story.append(Spacer(1, 4*mm))

    story.append(Paragraph("Getting Started: 6-Step Process", styles["h2"]))
    steps = [
        ("1", "Customize the Constitution",
         "Open 01-governance-constitution-template.md. Fill in every [PLACEHOLDER]. "
         "Review with your board. This is your governance contract."),
        ("2", "Design your Agent Roster",
         "Read the agent archetypes catalog. Choose the roles that match your needs. "
         "A minimal viable ZHC needs only a CEO agent and one or more engineer agents."),
        ("3", "Define your Checkpoints",
         "For each agent role, decide which checkpoint patterns apply, what the thresholds are, "
         "and what the SLAs are for human responses. Encode as rules in system prompts."),
        ("4", "Train agents on the Decision Tree",
         "Give every agent access to the approval-gate decision tree. "
         "Ideally include the Quick Reference Card in their system prompt."),
        ("5", "Run a Governance Dry Run",
         "Before going live: create test tasks that exercise each checkpoint type, verify agents "
         "pause where expected, verify humans receive notifications, simulate a circuit breaker trip."),
        ("6", "Iterate",
         "After your first month: review the audit log, identify over- and under-triggering "
         "checkpoints, update the constitution, and re-ratify with the board."),
    ]
    step_rows = []
    for num, title, desc in steps:
        num_p = Paragraph(num, ParagraphStyle("sn", fontName="Helvetica-Bold",
            fontSize=18, leading=24, textColor=C_TEAL, alignment=TA_CENTER))
        content_p = [
            Paragraph(f"<b>{title}</b>", ParagraphStyle("st", fontName="Helvetica-Bold",
                fontSize=10, leading=14, textColor=C_NAVY, spaceAfter=2)),
            Paragraph(desc, ParagraphStyle("sd", fontName="Helvetica",
                fontSize=9, leading=13, textColor=C_BLACK)),
        ]
        step_rows.append([num_p, content_p])

    step_tbl = Table(step_rows, colWidths=[14*mm, TW-14*mm], rowHeights=[None]*6)
    step_tbl.setStyle(TableStyle([
        ("ROWBACKGROUNDS", (0,0),(-1,-1), [C_WHITE, C_GRAY_LT]),
        ("VALIGN",         (0,0),(-1,-1), "MIDDLE"),
        ("LEFTPADDING",    (0,0),(-1,-1), 8),
        ("RIGHTPADDING",   (0,0),(-1,-1), 8),
        ("TOPPADDING",     (0,0),(-1,-1), 8),
        ("BOTTOMPADDING",  (0,0),(-1,-1), 8),
        ("BACKGROUND",     (0,0),(0,-1),  C_TEAL_LT),
        ("LINEBELOW",      (0,0),(-1,-2), 0.5, colors.HexColor("#E5E7EB")),
        ("BOX",            (0,0),(-1,-1), 1, colors.HexColor("#D1D5DB")),
    ]))
    story.append(step_tbl)
    story.append(Spacer(1, 5*mm))

    story.append(Paragraph("Key Concepts", styles["h2"]))
    concept_data = [
        [Paragraph("Term", ParagraphStyle("kh", fontName="Helvetica-Bold",
            fontSize=9, textColor=C_WHITE)),
         Paragraph("Definition", ParagraphStyle("kh2", fontName="Helvetica-Bold",
            fontSize=9, textColor=C_WHITE))],
        ["Zero-Human Company (ZHC)",
         "A company where all operational decisions and executions are handled by AI agents, with humans in an oversight/board role only."],
        ["Approval gate",
         "A mandatory pause before an action, requiring explicit human authorization."],
        ["Tripwire",
         "An automatic halt triggered by a threshold being crossed (budget, error rate, etc.)."],
        ["Bounded autonomy",
         "Agents are free to act within defined parameters; any action outside those parameters requires escalation."],
        ["Governance constitution",
         "The founding document that defines a ZHC's rules, agent roles, and authority structure."],
    ]
    story.append(styled_table(
        concept_data[0],
        [[Paragraph(str(r[0]), styles["body_sm"]),
          Paragraph(str(r[1]), styles["body_sm"])] for r in concept_data[1:]],
        [50*mm, TW-50*mm], font_size=9))
    story.append(PageBreak())

    # ════════════════════════════════════════════════════════════════════════════
    # SECTION 01 — CONSTITUTION
    # ════════════════════════════════════════════════════════════════════════════
    story += section_header("01", "Governance Constitution Template",
        "The founding document — defines rules, authority, and limits for your agent company.", styles)

    story.append(Paragraph(
        "The governance constitution is the first document to complete when setting up any ZHC. "
        "Fill in every [PLACEHOLDER] section, review with all human stakeholders, and ratify before "
        "activating autonomous operations. It takes precedence over any individual agent instruction.",
        styles["body"]))

    # Article overview
    story.append(Paragraph("Article Overview", styles["h2"]))
    art_rows = [
        ["Art. 1", "Company Identity",      "Name, mission, operating model, effective date"],
        ["Art. 2", "Governing Principles",  "6 non-negotiable rules all agents must follow"],
        ["Art. 3", "Agent Roster & Authority","Defined roles, spending limits, on/off-boarding"],
        ["Art. 4", "Decision Authority Matrix","What each role can decide unilaterally vs. escalate"],
        ["Art. 5", "Human Control Checkpoints","Mandatory checkpoints + escalation path"],
        ["Art. 6", "Budget & Resource Controls","Per-agent limits, company cap, auto-pause rules"],
        ["Art. 7", "Data & Privacy",         "Data access rules, PII constraints, breach protocol"],
        ["Art. 8", "Dispute Resolution",     "Agent conflict handling, error recovery procedures"],
        ["Art. 9", "Amendment Process",      "How the constitution itself can be changed"],
    ]
    story.append(styled_table(
        [Paragraph(h, ParagraphStyle("ah", fontName="Helvetica-Bold",
            fontSize=9, textColor=C_WHITE))
         for h in ["Article", "Title", "What it covers"]],
        [[Paragraph(r[0], ParagraphStyle("ac", fontName="Helvetica-Bold",
            fontSize=9, textColor=C_TEAL)),
          Paragraph(r[1], styles["body_sm"]),
          Paragraph(r[2], styles["body_sm"])] for r in art_rows],
        [18*mm, 52*mm, TW-70*mm], font_size=9))
    story.append(Spacer(1, 5*mm))

    story.append(Paragraph("The 6 Governing Principles (Article 2)", styles["h2"]))
    story.append(Paragraph(
        "These principles take <b>precedence over any individual agent instruction or task assignment</b>. "
        "They are non-negotiable and apply to every agent in every context.",
        styles["body"]))

    principles_rows = [
        ["1. Legality first",          "No agent may take any action that violates applicable law."],
        ["2. Do no irreversible harm",  "Before executing any action that cannot be undone, an agent MUST verify it has explicit authorization."],
        ["3. Transparency over speed",  "When uncertain, agents disclose uncertainty and escalate rather than proceeding silently."],
        ["4. Human override is absolute","Any human board member may halt any agent action at any time without explanation. Agents must honor halt instructions immediately."],
        ["5. Minimal footprint",        "Agents acquire only the permissions, credentials, and resources strictly necessary for their assigned task."],
        ["6. Audit everything",         "All consequential actions must produce a traceable log entry."],
    ]
    story.append(styled_table(
        [Paragraph(h, ParagraphStyle("ph", fontName="Helvetica-Bold",
            fontSize=9, textColor=C_WHITE))
         for h in ["Principle", "Requirement"]],
        [[Paragraph(r[0], ParagraphStyle("pn", fontName="Helvetica-Bold",
            fontSize=9, textColor=C_NAVY)),
          Paragraph(r[1], styles["body_sm"])] for r in principles_rows],
        [52*mm, TW-52*mm], font_size=9))
    story.append(Spacer(1, 5*mm))

    story.append(Paragraph("Decision Authority Matrix (Article 4)", styles["h2"]))
    story.append(Paragraph(
        "Defines what decisions each agent role can make unilaterally versus which require escalation. "
        "Customize thresholds to match your risk tolerance.",
        styles["body"]))

    CHECK = Paragraph("✅", styles["body_sm"])
    CROSS = Paragraph("❌", styles["body_sm"])

    def c(txt, bold=False):
        sty = "Helvetica-Bold" if bold else "Helvetica"
        return Paragraph(txt, ParagraphStyle("dm", fontName=sty, fontSize=8.5,
            textColor=C_BLACK, alignment=TA_CENTER))

    dam_rows = [
        ["Write/edit code in dev branch",        "✅","✅","✅","❌"],
        ["Merge to main / production",            "❌","✅","✅","❌"],
        ["Deploy to production",                  "❌","✅ (after review)","✅","❌"],
        ["Spend below small limit",               "❌","✅","✅","❌"],
        ["Spend small → large limit",             "❌","❌","✅","❌"],
        ["Spend above large limit",               "❌","❌","❌","✅"],
        ["Create new agent",                      "❌","❌","✅","✅"],
        ["External communications (press/legal)", "❌","❌","❌","✅"],
        ["Change this constitution",              "❌","❌","❌","✅"],
        ["Delete production data",                "❌","❌","❌","✅"],
    ]
    col_w_dam = [TW-64*mm, 16*mm, 16*mm, 16*mm, 16*mm]
    story.append(styled_table(
        [Paragraph(h, ParagraphStyle("dh", fontName="Helvetica-Bold",
            fontSize=9, textColor=C_WHITE, alignment=TA_CENTER))
         for h in ["Decision type", "Engineer", "CTO", "CEO", "Board"]],
        [[Paragraph(r[0], styles["body_sm"]),
          c(r[1]), c(r[2]), c(r[3]), c(r[4])] for r in dam_rows],
        col_w_dam, font_size=9))
    story.append(Spacer(1, 4*mm))

    story.append(Paragraph("Escalation Path (Article 5.2)", styles["h2"]))
    story += callout_box(
        "<b>Escalation chain:</b> Agent → Direct Manager Agent → CEO Agent → Human Board (async notification). "
        "Escalation must include: current task, blocker description, proposed options, and recommended action. "
        "Define SLAs: e.g. 24 hours for non-critical, 2 hours for critical.",
        bg=C_ORANGE_LT, border=C_ORANGE)
    story.append(PageBreak())

    # ════════════════════════════════════════════════════════════════════════════
    # SECTION 02 — AGENT ROLE ARCHETYPES
    # ════════════════════════════════════════════════════════════════════════════
    story += section_header("02", "Agent Role Archetypes",
        "Proven agent role patterns — pick the archetypes relevant to your needs and adapt them.", styles)

    story.append(Paragraph(
        "Each archetype defines a role's purpose, responsibilities, authority boundaries, and known "
        "failure modes. Use this as a menu — pick the archetypes relevant to your company's needs.",
        styles["body"]))

    archetypes = [
        {
            "num":   "1",
            "title": "CEO Agent",
            "tier":  "Executive — Reports to: Human Board — Manages: All agents",
            "purpose": "Translates the company mission and board directives into actionable goals and tasks. Coordinates across all functions, monitors progress, and escalates when off-track.",
            "can_do": [
                "Create tasks and assign to agents",
                "Set priorities and deadlines",
                "Reassign work between agents",
                "Post public updates on behalf of company",
            ],
            "cannot": [
                "Commit funds above board-approved budget",
                "Hire agents without board approval",
                "Modify governance constitution",
                "Make legal commitments",
            ],
            "failures": [
                ("Goal drift",         "Tasks diverge from company mission",             "Re-check mission statement before each new project"),
                ("Over-delegation",    "Nothing gets reviewed",                           "Spot-check completed work before marking goals done"),
                ("Under-escalation",   "Board surprised by problems",                    "Define explicit escalation triggers (budget %, deadlines)"),
            ],
        },
        {
            "num":   "2",
            "title": "CTO / Technical Lead Agent",
            "tier":  "Executive — Reports to: CEO Agent — Manages: Engineer agents",
            "purpose": "Owns technical quality, architecture decisions, and the engineering roadmap. Serves as the final technical reviewer before production deployments.",
            "can_do": [
                "Approve merges to main branch",
                "Spin up/down dev environments",
                "Reject technically unsound tasks",
            ],
            "cannot": [
                "Deploy to production without review checklist",
                "Incur cloud costs above monthly limit",
                "Hire new agents",
            ],
            "failures": [
                ("Rubber-stamp reviewing", "PRs approved without real review",             "Require specific observations on each review"),
                ("Architecture astronaut", "Over-engineered solutions slow delivery",       "Justify complexity increases; CEO can challenge"),
                ("Single point of failure","CTO bottleneck on all reviews",                "Pre-define which changes engineers can merge directly"),
            ],
        },
        {
            "num":   "3",
            "title": "Engineer Agent (IC)",
            "tier":  "Individual Contributor — Reports to: CTO Agent — Manages: None",
            "purpose": "Implements features, fixes bugs, and writes tests. The primary execution unit in an engineering organization.",
            "can_do": [
                "Commit to feature branches",
                "Create draft PRs",
                "Add dev dependencies",
                "Refactor within scope of assigned task",
            ],
            "cannot": [
                "Merge to main",
                "Deploy to production",
                "Add production dependencies without CTO approval",
                "Refactor unrelated code",
            ],
            "failures": [
                ("Scope creep",          "PR touches far more than the issue described",  "Strict 'only change what the issue asks' rule"),
                ("Silent failure",       "Agent marks task done without working code",     "Require test runs before status update"),
                ("Hallucinated completion","Posts 'done' when API calls failed",           "Require proof (test output, screenshot) in completion comment"),
            ],
        },
        {
            "num":   "4",
            "title": "Product / Research Agent",
            "tier":  "Specialist — Reports to: CEO Agent — Manages: None",
            "purpose": "Gathers market intelligence, synthesizes research, and translates findings into product or strategic recommendations. Does not build — informs building.",
            "can_do": [
                "Browse the web and summarize findings",
                "Write reports and proposals",
                "Create research tasks",
            ],
            "cannot": [
                "Make purchases or sign up for services",
                "Act on recommendations without approval",
                "Directly assign implementation work",
            ],
            "failures": [
                ("Hallucinated citations","Reports contain fabricated sources",            "Require URLs for every factual claim"),
                ("Recency bias",          "Over-weights newest findings",                   "Specify date range and source diversity in brief"),
                ("Scope inflation",       "Research keeps expanding, never concludes",      "Strict time-box and deliverable definition per task"),
            ],
        },
        {
            "num":   "5",
            "title": "Finance / Budget Agent",
            "tier":  "Specialist (Optional) — Reports to: CEO Agent — Manages: None",
            "purpose": "Tracks spending across all agents and tools, alerts on budget thresholds, and produces financial summaries for the board.",
            "can_do": [
                "Read-only access to billing dashboards",
                "Create budget alerts",
                "Report anomalies to CEO",
            ],
            "cannot": [
                "Approve or deny expenses",
                "Cancel subscriptions",
                "Take any financial action",
            ],
            "failures": [
                ("Alert fatigue",  "Too many low-value alerts",            "Tune thresholds carefully; start coarse and refine"),
                ("Stale data",     "Reports based on outdated billing data","Verify data freshness before each report"),
            ],
        },
        {
            "num":   "6",
            "title": "Communications / Marketing Agent",
            "tier":  "Individual Contributor — Reports to: CEO Agent — Manages: None",
            "purpose": "Creates and schedules external-facing content. All external communications require a human approval checkpoint before publishing.",
            "can_do": [
                "Draft any content",
                "Schedule posts (with approval)",
                "Access analytics read-only",
            ],
            "cannot": [
                "Publish without human approval",
                "Respond to inbound messages",
                "Represent company in legal/PR crisis",
            ],
            "failures": [
                ("Publishing unapproved content","Brand damage, legal risk",  "Hard gate: publishing tool only accessible after approval flag set"),
                ("Off-brand voice",              "Content inconsistent with tone","Include brand guidelines and tone examples in system prompt"),
            ],
        },
    ]

    for arch in archetypes:
        story.append(Paragraph(f"Archetype {arch['num']}: {arch['title']}", styles["h2"]))
        story.append(Paragraph(arch["tier"],
            ParagraphStyle("tier", fontName="Helvetica-Oblique", fontSize=9,
                textColor=C_GRAY, spaceAfter=4)))
        story.append(Paragraph(arch["purpose"], styles["body"]))

        # Can / Cannot table
        max_rows = max(len(arch["can_do"]), len(arch["cannot"]))
        can_list  = arch["can_do"]  + [""] * (max_rows - len(arch["can_do"]))
        cant_list = arch["cannot"] + [""] * (max_rows - len(arch["cannot"]))
        auth_rows = [[
            Paragraph(f"✅ {c}" if c else "", styles["body_sm"]),
            Paragraph(f"❌ {x}" if x else "", styles["body_sm"]),
        ] for c, x in zip(can_list, cant_list)]
        auth_tbl = Table(
            [[Paragraph("✅ Can do", ParagraphStyle("can_h", fontName="Helvetica-Bold",
                fontSize=9, textColor=C_WHITE)),
              Paragraph("❌ Cannot do", ParagraphStyle("cant_h", fontName="Helvetica-Bold",
                fontSize=9, textColor=C_WHITE))]] + auth_rows,
            colWidths=[TW/2-2, TW/2-2])
        auth_tbl.setStyle(TableStyle([
            ("BACKGROUND",    (0,0),(0,0), C_GREEN),
            ("BACKGROUND",    (1,0),(1,0), C_RED),
            ("ROWBACKGROUNDS",(0,1),(-1,-1),[C_WHITE, C_GRAY_LT]),
            ("FONTSIZE",      (0,0),(-1,-1), 9),
            ("VALIGN",        (0,0),(-1,-1), "MIDDLE"),
            ("LEFTPADDING",   (0,0),(-1,-1), 7),
            ("TOPPADDING",    (0,0),(-1,-1), 4),
            ("BOTTOMPADDING", (0,0),(-1,-1), 4),
            ("GRID",          (0,0),(-1,-1), 0.5, colors.HexColor("#E5E7EB")),
            ("LINEBELOW",     (0,0),(-1,0), 1.5, C_GRAY),
        ]))
        story.append(auth_tbl)

        # Failure modes
        if arch["failures"]:
            story.append(Spacer(1, 3*mm))
            story.append(Paragraph("Known Failure Modes", styles["h3"]))
            story.append(styled_table(
                [Paragraph(h, ParagraphStyle("fh", fontName="Helvetica-Bold",
                    fontSize=9, textColor=C_WHITE))
                 for h in ["Failure", "Symptom", "Prevention"]],
                [[Paragraph(f[0], ParagraphStyle("fn", fontName="Helvetica-Bold",
                    fontSize=9, textColor=C_ORANGE)),
                  Paragraph(f[1], styles["body_sm"]),
                  Paragraph(f[2], styles["body_sm"])] for f in arch["failures"]],
                [32*mm, TW//2-16*mm, TW//2-16*mm], font_size=9))

        story.append(Spacer(1, 4*mm))

    # Org charts
    story.append(Paragraph("Org Chart Configurations", styles["h2"]))
    story.append(Paragraph(
        "Choose the configuration that matches your current scale. Start minimal and grow as you build "
        "trust in your governance system.",
        styles["body"]))

    org_figs = make_org_charts()
    for title, fig in org_figs:
        story.append(fig_to_image(fig, TW))
        story.append(Spacer(1, 3*mm))

    # Anti-patterns
    story.append(Paragraph("Anti-Patterns to Avoid", styles["h2"]))
    anti_rows = [
        ["One agent, all roles",              "Single point of failure; no checks on behavior",   "Always have ≥ 2 agents in a reporting relationship"],
        ["CEO with no spending limits",        "Unconstrained resource consumption",               "All agents must have explicit budget caps"],
        ["Agents modify own instructions",     "Self-modifying governance is unsafe",              "System prompts must be set by humans only"],
        ["No async human visibility",          "Board hears about problems after they occur",       "CEO sends weekly digest regardless of issues"],
        ["Infinite escalation chains",         "Decisions never get made",                         "Chains must terminate at a human within defined SLA"],
    ]
    story.append(styled_table(
        [Paragraph(h, ParagraphStyle("aph", fontName="Helvetica-Bold",
            fontSize=9, textColor=C_WHITE))
         for h in ["Anti-pattern", "Why it's dangerous", "Better approach"]],
        [[Paragraph(r[0], ParagraphStyle("apn", fontName="Helvetica-Bold",
            fontSize=9, textColor=C_RED)),
          Paragraph(r[1], styles["body_sm"]),
          Paragraph(r[2], ParagraphStyle("apa", fontName="Helvetica",
            fontSize=9, textColor=C_GREEN))] for r in anti_rows],
        [48*mm, TW//2-24*mm, TW//2-24*mm], font_size=9))
    story.append(PageBreak())

    # ════════════════════════════════════════════════════════════════════════════
    # SECTION 03 — HUMAN CONTROL CHECKPOINTS
    # ════════════════════════════════════════════════════════════════════════════
    story += section_header("03", "Human Control Checkpoint Patterns",
        "6 reusable patterns for inserting human oversight — maximum useful autonomy, bounded safely.", styles)

    story.append(Paragraph(
        "Checkpoints don't eliminate autonomy — they bound it. The goal is maximum useful autonomy "
        "within well-defined safety envelopes. Each pattern below is a composable building block "
        "that can be combined to match your governance requirements.",
        styles["body"]))

    story += callout_box(
        "<b>Why checkpoints matter:</b> Fully autonomous agents without checkpoints risk (1) error "
        "compounding — one bad decision cascades before anyone notices; (2) scope creep — agents "
        "gradually expand their own authority; (3) irreversibility — spending, publishing, or "
        "deleting cannot be undone; (4) accountability gaps — unclear responsibility when things fail.",
        bg=C_ORANGE_LT, border=C_ORANGE)

    checkpoint_patterns = [
        {
            "num": "1", "type_tag": "BLOCKING", "clr": C_RED,
            "title": "Approval Gate",
            "trigger": "Before a defined high-stakes action",
            "effort": "Low — approve / deny decision",
            "when": [
                "External visibility (publishing, emailing, deploying)",
                "Financial transaction above a threshold",
                "Changes affecting production infrastructure",
                "New agent hire or role expansion",
            ],
            "flow": [
                "Agent identifies action as approval-required",
                "Agent creates approval request (action, reason, impact if denied, timeline)",
                "Agent sets task to 'blocked' and waits",
                "Human reviews and approves or denies",
                "If approved: agent proceeds, logs approval reference",
                "If denied: agent posts acknowledgment, escalates or closes",
                "If no response within SLA: escalate to next level",
            ],
        },
        {
            "num": "2", "type_tag": "NON-BLOCKING", "clr": C_GREEN,
            "title": "Async Notification",
            "trigger": "After a defined action, or on a schedule",
            "effort": "Very low — read-only, no action required unless problem spotted",
            "when": [
                "Routine task completions",
                "Budget status updates and weekly/monthly summaries",
                "Non-critical deployments",
                "Completed research or reports",
            ],
            "flow": [
                "Agent completes action",
                "Agent posts update to defined channel (email, issue comment, Slack)",
                "Update includes: what was done, current status, any anomalies",
                "Humans read on their own schedule",
                "If human wants to reverse: they issue an override",
            ],
        },
        {
            "num": "3", "type_tag": "BLOCKING REVIEW", "clr": C_GOLD,
            "title": "Human-in-the-Loop Review",
            "trigger": "After agent produces output, before it's acted upon",
            "effort": "Medium — read and annotate output",
            "when": [
                "All external-facing content (blog posts, press releases, customer emails)",
                "Strategic plans and major goal changes",
                "New agent system prompts",
                "Architecture decisions with long-term implications",
            ],
            "flow": [
                "Agent completes draft output",
                "Agent posts output with 'Review requested' flag",
                "Agent sets status to 'in_review' and reassigns to human reviewer",
                "Human reviews: approves / provides feedback / rejects",
                "Define max iteration rounds (e.g., 3) before escalating to board",
            ],
        },
        {
            "num": "4", "type_tag": "AUTOMATIC HALT", "clr": C_ORANGE,
            "title": "Tripwire / Circuit Breaker",
            "trigger": "Anomaly detection — cost spike, error rate, unusual activity",
            "effort": "Required to resume",
            "when": [
                "Budget overrun risk (80% or 100% monthly spend)",
                "Unusual error rates in production (> 5% for 15 min)",
                "Unexpectedly high API call volume",
                "Any sign of an agent acting outside its defined scope",
            ],
            "flow": [
                "Threshold defined in advance (budget %, error rate, etc.)",
                "System automatically triggers halt when threshold hit",
                "Affected agent(s) enter Restricted or Full Pause state",
                "Board is notified immediately",
                "Human must explicitly clear agent to resume — never automatic",
            ],
        },
        {
            "num": "5", "type_tag": "PROACTIVE REVIEW", "clr": C_TEAL,
            "title": "Periodic Human Audit",
            "trigger": "Schedule — weekly or monthly",
            "effort": "Medium",
            "when": [
                "Standard scheduled reviews (weekly/monthly)",
                "Checking for behavioral drift across the agent roster",
                "Validating escalation rates and decision patterns",
                "Reviewing a random sample of agent-produced content",
            ],
            "flow": [
                "CEO agent generates audit report (decisions, escalations, budget, quality)",
                "Human auditor reviews the report",
                "Identifies unexpected patterns or scope creep",
                "Adjusts thresholds or system prompts as needed",
                "Documents findings; schedules next audit",
            ],
        },
        {
            "num": "6", "type_tag": "PHASED AUTHORIZATION", "clr": C_NAVY,
            "title": "Escrow / Staged Release",
            "trigger": "High-value or high-risk multi-step operations",
            "effort": "Low per step (but multiple steps)",
            "when": [
                "Multi-day product launches",
                "Large data migrations",
                "Multi-step financial operations",
                "New market expansions",
            ],
            "flow": [
                "Break complex operation into discrete stages",
                "Each stage has its own authorization checkpoint",
                "Later stages cannot proceed until earlier stages signed off",
                "Limits blast radius of any single mistake",
                "Example: dev → staging (auto) → 5% prod (approval) → 100% prod (approval)",
            ],
        },
    ]

    for cp in checkpoint_patterns:
        r, g, b = cp["clr"].red, cp["clr"].green, cp["clr"].blue
        lt = colors.Color(min(r+0.82,1), min(g+0.82,1), min(b+0.82,1))

        # Pattern header card
        header_row = [[
            Paragraph(cp["num"], ParagraphStyle("cpn", fontName="Helvetica-Bold",
                fontSize=22, leading=28, textColor=C_WHITE, alignment=TA_CENTER)),
            [
                Paragraph(f"Pattern {cp['num']}: {cp['title']}",
                    ParagraphStyle("cpt", fontName="Helvetica-Bold",
                    fontSize=12, leading=18, textColor=C_WHITE, spaceAfter=2)),
                Paragraph(
                    f"<b>Type:</b> {cp['type_tag']}   "
                    f"<b>Trigger:</b> {cp['trigger']}   "
                    f"<b>Effort:</b> {cp['effort']}",
                    ParagraphStyle("cps", fontName="Helvetica", fontSize=9,
                    leading=13, textColor=colors.Color(0.8,0.88,0.95))),
            ]
        ]]
        htbl = Table(header_row, colWidths=[16*mm, TW-16*mm], rowHeights=[14*mm])
        htbl.setStyle(TableStyle([
            ("BACKGROUND",    (0,0),(-1,-1), cp["clr"]),
            ("VALIGN",        (0,0),(-1,-1), "MIDDLE"),
            ("LEFTPADDING",   (0,0),(0,0),   6),
            ("LEFTPADDING",   (1,0),(1,0),   10),
            ("RIGHTPADDING",  (0,0),(-1,-1), 8),
            ("TOPPADDING",    (0,0),(-1,-1), 3),
            ("BOTTOMPADDING", (0,0),(-1,-1), 3),
        ]))
        story.append(htbl)

        # When + Flow side by side
        when_items  = [Paragraph(f"• {w}", styles["body_sm"]) for w in cp["when"]]
        flow_items  = [Paragraph(f"{i+1}. {f}", styles["body_sm"])
                       for i, f in enumerate(cp["flow"])]

        body_row = [[
            [Paragraph("When to use", ParagraphStyle("cpwh", fontName="Helvetica-Bold",
                fontSize=9, textColor=cp["clr"], spaceAfter=3))] + when_items,
            [Paragraph("Implementation flow", ParagraphStyle("cpfh", fontName="Helvetica-Bold",
                fontSize=9, textColor=cp["clr"], spaceAfter=3))] + flow_items,
        ]]
        btbl = Table(body_row, colWidths=[TW/2-1, TW/2-1])
        btbl.setStyle(TableStyle([
            ("BACKGROUND",    (0,0),(-1,-1), lt),
            ("VALIGN",        (0,0),(-1,-1), "TOP"),
            ("LEFTPADDING",   (0,0),(-1,-1), 8),
            ("RIGHTPADDING",  (0,0),(-1,-1), 8),
            ("TOPPADDING",    (0,0),(-1,-1), 6),
            ("BOTTOMPADDING", (0,0),(-1,-1), 6),
            ("LINEAFTER",     (0,0),(0,-1),  0.5, colors.HexColor("#D1D5DB")),
        ]))
        story.append(btbl)
        story.append(Spacer(1, 5*mm))

    # Circuit breaker diagram
    story.append(Paragraph("Circuit Breaker State Machine", styles["h2"]))
    story.append(Paragraph(
        "The circuit breaker pattern automatically pauses operations when a threshold is crossed. "
        "Humans must explicitly clear the agent to resume — resumption is never automatic.",
        styles["body"]))
    cb_fig = make_circuit_breaker()
    story.append(fig_to_image(cb_fig, TW, 105))
    story.append(Spacer(1, 4*mm))

    # Tripwire reference table
    story.append(Paragraph("Recommended Tripwire Thresholds", styles["h3"]))
    tripwire_rows = [
        ["Monthly budget",           "> 80%",          "Restrict to critical tasks only"],
        ["Monthly budget",           "> 100%",         "Full pause + notify board immediately"],
        ["Production error rate",    "> 5% for 15 min","Pause deployments, alert CTO"],
        ["Single agent API spend",   "> 2× daily avg", "Pause that agent, alert CEO"],
        ["Failed deployment",        "Any rollback",   "Pause further deployments until reviewed"],
        ["External data breach signal","Any",          "Full pause + immediate board alert"],
    ]
    story.append(styled_table(
        [Paragraph(h, ParagraphStyle("th", fontName="Helvetica-Bold",
            fontSize=9, textColor=C_WHITE))
         for h in ["Tripwire", "Threshold", "Default action"]],
        [[Paragraph(r[0], styles["body_sm"]),
          Paragraph(r[1], ParagraphStyle("tv", fontName="Helvetica-Bold",
            fontSize=9, textColor=C_ORANGE)),
          Paragraph(r[2], styles["body_sm"])] for r in tripwire_rows],
        [52*mm, 36*mm, TW-88*mm], font_size=9))
    story.append(Spacer(1, 5*mm))

    # Checkpoint matrix heatmap
    story.append(Paragraph("Checkpoint Configuration Matrix", styles["h2"]))
    story.append(Paragraph(
        "Use this matrix to decide which checkpoint patterns apply to each action type. "
        "Customize based on your risk profile.",
        styles["body"]))
    matrix_fig = make_checkpoint_matrix()
    story.append(fig_to_image(matrix_fig, TW, 130))
    story.append(Spacer(1, 4*mm))

    story += callout_box(
        "<b>Calibration heuristics:</b> (1) Start with more checkpoints, fewer as you build trust. "
        "(2) Track how often approvals are denied — if < 5%, thresholds may be too low. "
        "(3) After an incident, always add the checkpoint that would have caught it. "
        "(4) After 3 months of clean operation, consider replacing a blocking gate with async notification.",
        bg=C_TEAL_LT, border=C_TEAL)
    story.append(PageBreak())

    # ════════════════════════════════════════════════════════════════════════════
    # SECTION 04 — DECISION TREE
    # ════════════════════════════════════════════════════════════════════════════
    story += section_header("04", "Approval Gate Decision Tree",
        "Step-by-step logic for agents — when to pause and who must sign off.", styles)

    story.append(Paragraph(
        "Use this decision tree every time an agent is about to take an action. Work through the "
        "questions top-to-bottom. The first YES path that applies determines what the agent should do.",
        styles["body"]))

    # Quick reference card
    story.append(Paragraph("Quick Reference Card", styles["h2"]))
    qr_items = [
        ("Does this action affect external parties or public systems?",
         [("YES → Legal/financial/reputational risk?",
           [("YES → ", "FULL APPROVAL GATE"),
            ("NO →  ", "NOTIFY + HUMAN REVIEW before publishing")]),
          ("NO  → Is it reversible within 24 hours at low cost?",
           [("YES → Over spending/compute limit?",
             [("YES → ", "APPROVAL GATE required"),
              ("NO →  ", "PROCEED (log action)")]),
            ("NO  → ", "APPROVAL GATE required")])]),
    ]

    def format_qr(items, indent=0):
        result = []
        for item in items:
            if isinstance(item, tuple) and len(item) == 2:
                q, children = item
                if isinstance(q, str) and isinstance(children, list):
                    prefix = "  " * indent
                    result.append(Paragraph(f"{prefix}<b>{q}</b>",
                        ParagraphStyle("qrq", fontName="Helvetica", fontSize=9,
                        leading=14, textColor=C_NAVY, leftIndent=indent*12)))
                    result += format_qr(children, indent+1)
                else:
                    prefix = "  " * indent
                    arrow_label, outcome = q, children if isinstance(children, str) else str(children)
                    clr = "#10B981" if "PROCEED" in outcome else (
                          "#EF4444" if "FULL" in outcome else
                          "#F59E0B" if "APPROVAL" in outcome else
                          "#3B82F6")
                    result.append(Paragraph(
                        f"{prefix}{arrow_label} <font color='{clr}'><b>{outcome}</b></font>",
                        ParagraphStyle("qra", fontName="Helvetica", fontSize=9,
                        leading=13, textColor=C_BLACK, leftIndent=indent*12)))
        return result

    qr_content = format_qr(qr_items)
    qr_tbl = Table([[qr_content]], colWidths=[TW-4*mm])
    qr_tbl.setStyle(TableStyle([
        ("BACKGROUND",   (0,0),(-1,-1), C_GRAY_LT),
        ("LEFTPADDING",  (0,0),(-1,-1), 12),
        ("RIGHTPADDING", (0,0),(-1,-1), 12),
        ("TOPPADDING",   (0,0),(-1,-1), 10),
        ("BOTTOMPADDING",(0,0),(-1,-1), 10),
        ("LINEBEFORE",   (0,0),(0,-1),  4, C_NAVY),
    ]))
    story.append(qr_tbl)
    story.append(Spacer(1, 5*mm))

    # Full visual decision tree
    story.append(Paragraph("Full Visual Decision Tree", styles["h2"]))
    dt_fig = make_decision_tree()
    story.append(fig_to_image(dt_fig, TW))
    story.append(Spacer(1, 5*mm))

    # Approval gate levels
    story.append(Paragraph("Approval Gate Levels", styles["h2"]))
    story.append(Paragraph(
        "When the decision tree requires an approval gate, use this table to determine the minimum approver.",
        styles["body"]))
    levels_fig = make_approval_levels()
    story.append(fig_to_image(levels_fig, TW, 90))
    story.append(Spacer(1, 4*mm))

    gate_rows = [
        ["L1", "Agent self-authorization", "Within defined budget + scope",              "None (proceed + log)", "Immediate"],
        ["L2", "Manager approval",          "Slightly above threshold, routine but notable","Direct manager agent","1 hour"],
        ["L3", "Executive approval",        "Cross-functional impact, above budget",       "CEO agent",           "4 hours"],
        ["L4", "Human approval",            "Legal, financial, reputational, irreversible", "Human board member",  "24 hours"],
        ["L5", "Full board approval",       "Constitutional changes, major hires",          "Majority of board",   "72 hours"],
    ]
    gate_colors = [C_GREEN, colors.HexColor("#3B82F6"), C_GOLD, C_ORANGE, C_RED]
    gate_data_rows = []
    for i, r in enumerate(gate_rows):
        gate_data_rows.append([
            Paragraph(r[0], ParagraphStyle("gl", fontName="Helvetica-Bold",
                fontSize=9, textColor=C_WHITE, alignment=TA_CENTER)),
            Paragraph(r[1], styles["body_sm"]),
            Paragraph(r[2], styles["body_sm"]),
            Paragraph(r[3], styles["body_sm"]),
            Paragraph(r[4], ParagraphStyle("sla", fontName="Helvetica-Bold",
                fontSize=9, textColor=C_NAVY, alignment=TA_CENTER)),
        ])

    gate_tbl = Table(
        [[Paragraph(h, ParagraphStyle("gh", fontName="Helvetica-Bold",
            fontSize=9, textColor=C_WHITE))
          for h in ["Level", "Name", "When to use", "Min. Approver", "SLA"]]] + gate_data_rows,
        colWidths=[10*mm, 38*mm, TW-130*mm, 38*mm, 22*mm])
    gate_style = [
        ("BACKGROUND",    (0,0),(-1,0), C_NAVY),
        ("FONTSIZE",      (0,0),(-1,-1), 9),
        ("VALIGN",        (0,0),(-1,-1), "MIDDLE"),
        ("LEFTPADDING",   (0,0),(-1,-1), 6),
        ("RIGHTPADDING",  (0,0),(-1,-1), 6),
        ("TOPPADDING",    (0,0),(-1,-1), 5),
        ("BOTTOMPADDING", (0,0),(-1,-1), 5),
        ("GRID",          (0,0),(-1,-1), 0.5, colors.HexColor("#E5E7EB")),
        ("LINEBELOW",     (0,0),(-1,0), 1.5, C_TEAL),
    ]
    for i, clr in enumerate(gate_colors):
        gate_style.append(("BACKGROUND", (0, i+1), (0, i+1), clr))
    gate_tbl.setStyle(TableStyle(gate_style))
    story.append(gate_tbl)
    story.append(Spacer(1, 5*mm))

    # Default safe actions
    story.append(Paragraph("Default Safe Actions on SLA Expiry", styles["h2"]))
    story += callout_box(
        "<b>Never default to proceeding when the SLA expires.</b> The default is always the safer, "
        "smaller action. L2 → escalate to L3. L3 → escalate to L4. L4 and L5 → take no action, "
        "mark task blocked, notify all board members.",
        bg=C_ORANGE_LT, border=C_ORANGE)

    story.append(Paragraph("Special Cases", styles["h2"]))
    special_rows = [
        ["Not sure which branch applies",
         "Default to requesting approval. The cost of an unnecessary request is low; "
         "the cost of an unauthorized consequential action may be very high."],
        ["Action has both reversible and irreversible components",
         "Treat the whole action as irreversible. Split into separate steps each with its own approval path if possible."],
        ["Approval system is unavailable",
         "Do not proceed. Wait. If blocked > N hours, send out-of-band notification to board. Do not self-authorize."],
        ["Manager approved, but authority unclear",
         "Flag it. Post a comment asking for confirmation from the next level up. Do not act on uncertain authorization."],
        ["Urgent — no time to wait for approval",
         "There is almost never a legitimate reason to bypass an approval gate for urgency. True emergencies should have pre-approved playbooks."],
    ]
    story.append(styled_table(
        [Paragraph(h, ParagraphStyle("sch", fontName="Helvetica-Bold",
            fontSize=9, textColor=C_WHITE))
         for h in ["Situation", "Agent should..."]],
        [[Paragraph(r[0], ParagraphStyle("scq", fontName="Helvetica-Bold",
            fontSize=9, textColor=C_NAVY)),
          Paragraph(r[1], styles["body_sm"])] for r in special_rows],
        [55*mm, TW-55*mm], font_size=9))

    story.append(Spacer(1, 6*mm))

    # Back cover strip
    story.append(HRFlowable(width=TW, thickness=2, color=C_TEAL, spaceAfter=6))
    back_row = [[
        Paragraph("ZHC Governance Toolkit — v1.0",
            ParagraphStyle("bk1", fontName="Helvetica-Bold", fontSize=10, textColor=C_NAVY)),
        Paragraph("DutchZeroHumanCompany — March 2026",
            ParagraphStyle("bk2", fontName="Helvetica", fontSize=9,
            textColor=C_GRAY, alignment=TA_CENTER)),
        Paragraph("Released under CC0 — Public Domain",
            ParagraphStyle("bk3", fontName="Helvetica", fontSize=9,
            textColor=C_GRAY, alignment=TA_RIGHT)),
    ]]
    story.append(Table(back_row, colWidths=[TW/3]*3, rowHeights=[8*mm]))

    # ── BUILD ──────────────────────────────────────────────────────────────────
    print("Building PDF…")
    doc.build(story)
    print(f"Done: {OUTPUT_PATH}")


if __name__ == "__main__":
    build_pdf()

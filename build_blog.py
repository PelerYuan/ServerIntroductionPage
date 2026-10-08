"""Render the blog-*.md posts into static HTML pages that share style.css.

Usage: python build_blog.py
"""
import html
import re
from pathlib import Path

ROOT = Path(__file__).parent

POSTS = [
    {
        "md": "blog-1-gpu-fan-control.md",
        "out": "fan-control.html",
        "nav": "Fan control",
        "tag": "GPU cooling",
        "summary": "A passive datacenter GPU, a fan wired to the host, and a temperature that only the VM can read. How a small API bridges the two.",
        "cover_pos": "50% 55%",
    },
    {
        "md": "blog-2-openrgb-over-ssh.md",
        "out": "openrgb.html",
        "nav": "Remote RGB",
        "tag": "Chassis lighting",
        "summary": "OpenRGB is a GUI program and Proxmox has no desktop. SSH X11 forwarding lets the laptop be the display.",
        "cover_pos": "50% 50%",
    },
]

DATE = "Oct 2026"

# Animated, theme-matched diagrams drawn inline instead of the static SVG files.
INLINE_DIAGRAMS = {
    "assets/fan.svg": "partials/net-fan.html",
    "assets/rgb.svg": "partials/net-rgb.html",
}


def inline(text):
    t = html.escape(text, quote=False)
    t = re.sub(r"`([^`]+)`", r"<code>\1</code>", t)
    t = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", t)
    t = re.sub(r"(?<!\*)\*([^*\n]+)\*(?!\*)", r"<em>\1</em>", t)
    t = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", r'<a href="\2">\1</a>', t)
    return t


def slug(text):
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def parse(md):
    """Return title, cover(alt, src, caption), body_html, toc."""
    lines = md.split("\n")
    title = ""
    cover = None
    toc = []
    out = []
    i = 0

    def para_end(j):
        while j < len(lines) and lines[j].strip() and not re.match(r"(#|!\[|\||- |> |---)", lines[j]):
            j += 1
        return j

    while i < len(lines):
        line = lines[i]
        if not line.strip():
            i += 1
        elif line.startswith("# "):
            title = line[2:].strip()
            i += 1
        elif line.startswith("*Xingjian"):
            i += 1  # byline is rebuilt in the template
        elif line.startswith("## "):
            h = line[3:].strip()
            toc.append((slug(h), h))
            out.append(f'<h2 id="{slug(h)}">{inline(h)}</h2>')
            i += 1
        elif line.startswith("!["):
            m = re.match(r"!\[(.*?)\]\((.*?)\)", line)
            alt, src = m.group(1), m.group(2)
            j = i + 1
            while j < len(lines) and not lines[j].strip():
                j += 1
            cap = ""
            if j < len(lines) and lines[j].startswith("*") and lines[j].endswith("*"):
                cap = lines[j].strip("*")
                i = j + 1
            else:
                i += 1
            if "cover" in src:
                cover = (alt, src, cap)
                continue
            partial = INLINE_DIAGRAMS.get(src)
            if partial:
                svg = (ROOT / partial).read_text(encoding="utf-8").strip()
                inner = f'<div class="diagram net-fig">{svg}</div>'
            else:
                wrap = "diagram" if src.endswith(".svg") else "photo"
                inner = f'<div class="{wrap}"><img src="{src}" alt="{html.escape(alt)}" loading="lazy"></div>'
            out.append(
                f'<figure class="fig">{inner}'
                + (f"<figcaption>{inline(cap)}</figcaption>" if cap else "")
                + "</figure>"
            )
        elif line.startswith("|"):
            rows = []
            while i < len(lines) and lines[i].startswith("|"):
                rows.append([c.strip() for c in lines[i].strip().strip("|").split("|")])
                i += 1
            head, body = rows[0], rows[2:]
            th = "".join(f"<th>{inline(c)}</th>" for c in head)
            tb = "".join("<tr>" + "".join(f"<td>{inline(c)}</td>" for c in r) + "</tr>" for r in body)
            out.append(f'<div class="tbl"><table><thead><tr>{th}</tr></thead><tbody>{tb}</tbody></table></div>')
        elif line.startswith("- "):
            items = []
            while i < len(lines) and lines[i].startswith("- "):
                items.append(lines[i][2:].strip())
                i += 1
            out.append("<ul>" + "".join(f"<li>{inline(x)}</li>" for x in items) + "</ul>")
        elif line.startswith("---"):
            i += 1
        else:
            j = para_end(i)
            j = max(j, i + 1)
            out.append(f"<p>{inline(' '.join(l.strip() for l in lines[i:j]))}</p>")
            i = j
    return title, cover, "\n".join(out), toc


def words(md):
    return len(re.findall(r"[A-Za-z0-9'’°-]+", md))


def head(title, desc):
    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{html.escape(title)}</title>
<meta name="description" content="{html.escape(desc)}">
<meta name="theme-color" content="#0a0a0f">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='8' fill='%230a0a0f'/%3E%3Cpath d='M8 11h16M8 16h16M8 21h16' stroke='%2300d4ff' stroke-width='2.4' stroke-linecap='round'/%3E%3C/svg%3E">
<link rel="preload" href="assets/fonts/inter-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="assets/fonts/jbmono-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="style.css">
</head>"""


def nav(current):
    links = "".join(
        f'<a href="{p["out"]}"{" class=on" if p is current else ""}>{p["nav"]}</a>' for p in POSTS
    )
    return f"""<div class="progress" id="progress"></div>
<div class="glow" id="glow" aria-hidden="true"></div>
<header class="nav scrolled" id="nav">
  <a class="nav__brand" href="index.html"><span class="dot"></span>peler<span class="muted">@homelab</span></a>
  <nav class="nav__links" aria-label="Notes">
    <a href="index.html">Overview</a>{links}
  </nav>
  <a class="nav__back" href="index.html#writing">All notes</a>
</header>"""


def render(post):
    md = (ROOT / post["md"]).read_text(encoding="utf-8")
    title, cover, body, toc = parse(md)
    mins = max(1, round(words(md) / 220))
    other = next(p for p in POSTS if p is not post)
    other_title = parse((ROOT / other["md"]).read_text(encoding="utf-8"))[0]

    toc_html = "".join(f'<a href="#{i}">{html.escape(t)}</a>' for i, t in toc)
    cover_html = ""
    if cover:
        alt, src, cap = cover
        cover_html = f"""<figure class="post-cover reveal">
    <img src="{src}" alt="{html.escape(alt)}" style="object-position:{post['cover_pos']}">
    <figcaption>{inline(cap)}</figcaption>
  </figure>"""

    return f"""{head(title + ' — Peler Homelab', post['summary'])}
<body>
{nav(post)}

<main class="post">
  <header class="post-head wrap">
    <a class="crumb" href="index.html#writing">← Server O&amp;M</a>
    <p class="eyebrow">ENGINEERING NOTES · {html.escape(post['tag'].upper())}</p>
    <h1>{html.escape(title)}</h1>
    <p class="post-meta"><span>Xingjian Yuan</span><i></i><span>{DATE}</span><i></i><span>{mins} min read</span></p>
  </header>

  <div class="wrap">{cover_html}</div>

  <div class="wrap post-grid">
    <aside class="toc" aria-label="Contents"><p class="toc__label">CONTENTS</p>{toc_html}</aside>
    <article class="prose">
{body}
    </article>
  </div>

  <section class="wrap post-more">
    <p class="eyebrow">NEXT NOTE</p>
    <a class="note-card" href="{other['out']}">
      <span class="note-card__tag">{html.escape(other['tag'])}</span>
      <h3>{html.escape(other_title)}</h3>
      <p>{html.escape(other['summary'])}</p>
      <span class="note-card__go">Read the note →</span>
    </a>
  </section>
</main>

<footer class="foot">
  <div class="wrap foot__row"><span>© <span id="year"></span> Xingjian Yuan · Peler</span></div>
</footer>

<div class="lightbox" id="lightbox" hidden role="dialog" aria-modal="true" aria-label="Image viewer">
  <button class="lightbox__close" aria-label="Close">×</button>
  <img alt="">
</div>
<script src="blog.js"></script>
</body>
</html>
"""


if __name__ == "__main__":
    for p in POSTS:
        (ROOT / p["out"]).write_text(render(p), encoding="utf-8")
        print("wrote", p["out"])

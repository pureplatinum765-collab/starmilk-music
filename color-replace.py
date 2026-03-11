#!/usr/bin/env python3
"""
Batch replace fluorescent/neon colors with earthy matte equivalents in index.html.
Mapping:
  - rgba(147,51,234,...) [purple neon] → rgba(107,91,138,...) [muted purple]
  - rgba(168,85,247,...) [violet neon] → rgba(123,105,152,...) [muted violet]
  - rgba(124,58,237,...) [blue-purple neon] → rgba(74,85,120,...) [muted indigo]
  - rgba(99,102,241,...) [indigo neon] → rgba(74,85,120,...) [muted indigo]
  - rgba(79,70,229,...) [deep indigo] → rgba(74,85,120,...) [muted indigo]
  - rgba(245,158,11,...) [bright amber] → rgba(201,148,74,...) [matte gold]
  - rgba(252,211,77,...) [bright yellow] → rgba(219,184,122,...) [soft gold]
  - rgba(234,179,...) [amber-ish] → rgba(201,148,74,...) [matte gold]
  - rgba(20,184,166,...) [bright teal] → rgba(74,124,111,...) [matte teal]
  - rgba(6,182,212,...) [cyan] → rgba(74,124,111,...) [matte teal]
  - rgba(13,148,136,...) [teal-dark] → rgba(74,124,111,...) [matte teal]
  - rgba(236,72,153,...) [pink] → rgba(176,138,138,...) [muted rose]
  
  Hex colors:
  - #9333ea → #6b5b8a
  - #4338ca → #4a5578
  - #6366f1 → #4a5578
  - #8b5cf6 → #6b5b8a
  - #a855f7 → #7b6998
  - #7c3aed → #6b5b8a
  - #c084fc → #9b8ab8  (lighter muted purple)
  - #818cf8 → #7b8aad  (lighter muted indigo)
  - #e879f9 → #b08a8a  (muted rose)
  - #ec4899 → #b08a8a
  - #f59e0b → #c9944a
  - #eab308 → #c9944a
  - #fbbf24 → #dbb87a
  - #14b8a6 → #4a7c6f
  - #06b6d4 → #4a7c6f
  - #22d3ee → #7eb8a4
  - #0ea5e9 → #5a8a9a
  
  Background darks:
  - rgba(12,3,24,...) → rgba(18,24,39,...) [match --card]
  - rgba(5,0,14,...) → rgba(11,14,26,...) [match --bg]
  - rgba(24,8,38,...) → rgba(18,24,39,...) [match --card]
  - rgba(11,2,22,...) → rgba(11,14,26,...) [match --bg]
  - #04010a → #0b0e1a
  
  Also reduce glow intensities — neon glows become soft matte shadows.
"""
import re

with open('index.html', 'r') as f:
    content = f.read()

# Count changes
changes = 0
original = content

# ── rgba replacements (preserve alpha values) ──

def replace_rgba(old_rgb, new_rgb, text):
    """Replace rgba(R,G,B,A) keeping alpha, with optional spaces."""
    global changes
    # Match rgba(R,G,B,alpha) with flexible whitespace
    pattern = rf'rgba\(\s*{old_rgb[0]}\s*,\s*{old_rgb[1]}\s*,\s*{old_rgb[2]}\s*,'
    replacement = f'rgba({new_rgb[0]},{new_rgb[1]},{new_rgb[2]},'
    new_text = re.sub(pattern, replacement, text)
    if new_text != text:
        count = len(re.findall(pattern, text))
        changes += count
        print(f"  rgba({old_rgb[0]},{old_rgb[1]},{old_rgb[2]}) → rgba({new_rgb[0]},{new_rgb[1]},{new_rgb[2]}): {count} replacements")
    return new_text

# Purple neon → muted purple
content = replace_rgba((147,51,234), (107,91,138), content)
# Violet neon → muted violet  
content = replace_rgba((168,85,247), (123,105,152), content)
# Blue-purple neon → muted indigo
content = replace_rgba((124,58,237), (74,85,120), content)
# Indigo neon → muted indigo
content = replace_rgba((99,102,241), (74,85,120), content)
# Deep indigo → muted indigo
content = replace_rgba((79,70,229), (74,85,120), content)
# Bright amber → matte gold
content = replace_rgba((245,158,11), (201,148,74), content)
# Bright yellow → soft gold
content = replace_rgba((252,211,77), (219,184,122), content)
# Teal bright → matte teal
content = replace_rgba((20,184,166), (74,124,111), content)
# Cyan → matte teal
content = replace_rgba((6,182,212), (74,124,111), content)
# Teal dark → matte teal
content = replace_rgba((13,148,136), (74,124,111), content)
# Pink → muted rose
content = replace_rgba((236,72,153), (176,138,138), content)

# ── Hex replacements ──
hex_map = {
    '#9333ea': '#6b5b8a',
    '#4338ca': '#4a5578',
    '#6366f1': '#4a5578',
    '#8b5cf6': '#6b5b8a',
    '#a855f7': '#7b6998',
    '#7c3aed': '#6b5b8a',
    '#c084fc': '#9b8ab8',
    '#818cf8': '#7b8aad',
    '#e879f9': '#b08a8a',
    '#ec4899': '#b08a8a',
    '#f59e0b': '#c9944a',
    '#eab308': '#c9944a',
    '#fbbf24': '#dbb87a',
    '#14b8a6': '#4a7c6f',
    '#06b6d4': '#4a7c6f',
    '#22d3ee': '#7eb8a4',
    '#0ea5e9': '#5a8a9a',
}

for old_hex, new_hex in hex_map.items():
    # Case-insensitive replacement
    pattern = re.compile(re.escape(old_hex), re.IGNORECASE)
    count = len(pattern.findall(content))
    if count > 0:
        content = pattern.sub(new_hex, content)
        changes += count
        print(f"  {old_hex} → {new_hex}: {count} replacements")

# ── Dark background replacements ──
dark_map = [
    ((12,3,24), (18,24,39)),    # → --card
    ((5,0,14), (11,14,26)),     # → --bg
    ((24,8,38), (18,24,39)),    # → --card
    ((11,2,22), (11,14,26)),    # → --bg
]

for old_rgb, new_rgb in dark_map:
    content = replace_rgba(old_rgb, new_rgb, content)

# Replace hex dark background
old_dark = '#04010a'
new_dark = '#0b0e1a'
count = content.lower().count(old_dark.lower())
if count > 0:
    content = re.sub(re.escape(old_dark), new_dark, content, flags=re.IGNORECASE)
    changes += count
    print(f"  {old_dark} → {new_dark}: {count} replacements")

# ── Reduce glow intensity ──
# Large drop-shadow glows with high alpha: reduce alpha by ~40%
def reduce_glow_alpha(text):
    """Find drop-shadow with high alpha (>0.5) and reduce them."""
    global changes
    def reduce(match):
        alpha = float(match.group(1))
        if alpha > 0.5:
            new_alpha = round(alpha * 0.55, 2)
            return match.group(0).replace(match.group(1), str(new_alpha))
        return match.group(0)
    
    # Match drop-shadow patterns with alpha > 0.5
    pattern = r'drop-shadow\(0 0 \d+px rgba\(\d+,\d+,\d+,(\d+\.?\d*)\)\)'
    new_text = re.sub(pattern, reduce, text)
    if new_text != text:
        cnt = sum(1 for m in re.finditer(pattern, text) if float(m.group(1)) > 0.5)
        changes += cnt
        print(f"  Reduced {cnt} high-alpha drop-shadows")
    return new_text

content = reduce_glow_alpha(content)

# ── Also reduce box-shadow neon glows ──
# Patterns like: 0 0 10px rgba(X,X,X,.9) → reduce high alphas
def reduce_boxshadow_glow(text):
    global changes
    def reduce(match):
        full = match.group(0)
        alpha = float(match.group(1))
        if alpha > 0.6:
            new_alpha = round(alpha * 0.5, 2)
            return full.replace(f',{match.group(1)})', f',{new_alpha})')
        return full
    
    pattern = r'0 0 \d+px rgba\(\d+,\d+,\d+,(\d+\.?\d*)\)'
    new_text = re.sub(pattern, reduce, text)
    return new_text

content = reduce_boxshadow_glow(content)

with open('index.html', 'w') as f:
    f.write(content)

print(f"\n✓ Total: {changes} color replacements made")

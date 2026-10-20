"""Regenerate the two exact inline CSP hashes after editing index.html."""
from pathlib import Path
import base64
import hashlib
import re

path = Path(__file__).with_name('index.html')
html = path.read_text(encoding='utf-8')
for tag in ('script', 'style'):
    bodies = re.findall(r'<' + tag + r'[^>]*>(.*?)</' + tag + '>', html, re.S)
    if len(bodies) != 1:
        raise ValueError('Expected exactly one inline ' + tag + ' block')
    digest = base64.b64encode(hashlib.sha256(bodies[0].encode()).digest()).decode()
    html, changed = re.subn(tag + r"-src 'sha256-[^']+'", tag + "-src 'sha256-" + digest + "'", html)
    if changed != 1:
        raise ValueError('Expected one CSP directive for ' + tag)
path.write_text(html, encoding='utf-8')
print('Updated script and style CSP hashes.')

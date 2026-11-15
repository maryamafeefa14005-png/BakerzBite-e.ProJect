"""Copies data/*.json and sitemap.xml into js/data.js.

Browsers block reading local JSON/XML files when index.html is opened by
double-clicking (file://). js/data.js holds the same data so the site still
works that way; on a web server the app reads the real JSON/XML files.
Run this again after editing anything in data/ or sitemap.xml.
"""
import json, os, sys

ROOT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
data = {}
for name in ('site', 'products', 'merchandise', 'offers', 'reviews', 'faq', 'gallery'):
    with open(os.path.join(ROOT, 'data', name + '.json'), encoding='utf-8') as f:
        data[name] = json.load(f)
with open(os.path.join(ROOT, 'sitemap.xml'), encoding='utf-8') as f:
    data['sitemapXml'] = f.read()
out = ('/* AUTO-GENERATED from data/*.json and sitemap.xml by tools/bundle_data.py.\n'
       '   Used only when index.html is opened directly from disk (file://). */\n'
       'window.BAKERZ_DATA = ' + json.dumps(data, ensure_ascii=False) + ';\n')
with open(os.path.join(ROOT, 'js', 'data.js'), 'w', encoding='utf-8') as f:
    f.write(out)
print('js/data.js', len(out) // 1024, 'KB')

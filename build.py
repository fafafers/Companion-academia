#!/usr/bin/env python3
"""
Build do Zézinho Bodybuilder.

Junta src/ (HTML, CSS e JS) em um único dist/index.html, copia public/
(ícones, fontes, imagens, manifesto) e gera o service worker com a
lista de arquivos para funcionar offline.

Uso:
    python3 build.py            # gera a pasta dist/
    python3 build.py --zip      # gera dist/ e também zezinho-dist.zip (para o Netlify Drop)

Só usa a biblioteca padrão do Python 3.8+. Nada para instalar.
"""
import os, shutil, sys, time, json, zipfile

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC, PUBLIC, DIST = (os.path.join(ROOT, d) for d in ('src', 'public', 'dist'))

# Ordem importa: dados primeiro, inicialização por último
JS_FILES = ['data.js', 'images.js', 'app.js', 'analytics.js', 'nutrition.js', 'profile.js', 'init.js']


def read(path):
    with open(path, encoding='utf-8') as f:
        return f.read()


def build():
    if os.path.exists(DIST):
        shutil.rmtree(DIST)
    shutil.copytree(PUBLIC, DIST, ignore=shutil.ignore_patterns('.gitkeep', 'sw.template.js'))

    html = read(os.path.join(SRC, 'index.html'))
    css = read(os.path.join(SRC, 'styles.css'))
    files = list(JS_FILES)
    # images.local.js (opcional, fora do git): imagens só suas, sem publicar no repositório
    if os.path.exists(os.path.join(SRC, 'js', 'images.local.js')):
        files.insert(files.index('images.js') + 1, 'images.local.js')
    js = '\n\n'.join(f'/* ---- {name} ---- */\n' + read(os.path.join(SRC, 'js', name)) for name in files)
    html = html.replace('/* @@CSS@@ */', css).replace('/* @@JS@@ */', js)
    with open(os.path.join(DIST, 'index.html'), 'w', encoding='utf-8') as f:
        f.write(html)

    # Service worker: lista tudo que está em dist/ e muda a versão a cada build,
    # assim o app instalado baixa a versão nova sozinho.
    assets = ['./']
    for base, _, files in os.walk(DIST):
        for name in files:
            rel = os.path.relpath(os.path.join(base, name), DIST).replace(os.sep, '/')
            if rel.startswith('.') or rel.startswith('screenshots/') or rel in ('_headers', 'sw.js') or rel.endswith('.txt'):
                continue
            assets.append(rel)
    version = time.strftime('%Y%m%d-%H%M%S')
    sw = read(os.path.join(PUBLIC, 'sw.template.js'))
    sw = sw.replace('@@VERSION@@', version).replace('@@ASSETS@@', json.dumps(sorted(assets), ensure_ascii=False))
    with open(os.path.join(DIST, 'sw.js'), 'w', encoding='utf-8') as f:
        f.write(sw)

    size = os.path.getsize(os.path.join(DIST, 'index.html')) / 1024
    print(f'dist/ gerado: index.html com {size:.0f} KB, {len(assets)} arquivos no cache offline, versão {version}')


def make_zip():
    out = os.path.join(ROOT, 'zezinho-dist.zip')
    with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
        for base, _, files in os.walk(DIST):
            for name in files:
                full = os.path.join(base, name)
                z.write(full, os.path.relpath(full, DIST))
    print('zip gerado:', os.path.relpath(out, ROOT))


if __name__ == '__main__':
    build()
    if '--zip' in sys.argv:
        make_zip()

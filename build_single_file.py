# -*- coding: utf-8 -*-
"""把整个游戏打包成一个 HTML 文件。

用法（项目根目录）：
    python build_single_file.py

产物：死亡细胞_手机单文件版.html
—— 所有 CSS / JS 全部内联，手机端无需服务器、无需同一 Wi-Fi：
   把该文件发到手机（微信/QQ/邮件/网盘），用浏览器打开即可游玩。
"""

import io
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "手机版.html"


def read(rel):
    return io.open(ROOT / rel, encoding="utf-8").read()


def main():
    html = read("index.html")

    css = read("css/style.css")
    html = html.replace(
        '<link rel="stylesheet" href="css/style.css">',
        "<style>\n" + css + "\n</style>",
    )

    def inline_js(m):
        code = read(m.group(1))
        return "<script>\n" + code + "\n</script>"

    html = re.sub(r'<script src="([^"]+)"></script>', inline_js, html)
    html = html.replace(
        "<title>死亡细胞 · 无间回廊</title>",
        "<title>死亡细胞 · 无间回廊（手机版）</title>",
    )

    io.open(OUT, "w", encoding="utf-8", newline="\n").write(html)
    print("已生成：%s（%.1f KB）" % (OUT.name, OUT.stat().st_size / 1024))


if __name__ == "__main__":
    main()

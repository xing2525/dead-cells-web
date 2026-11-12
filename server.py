# -*- coding: utf-8 -*-
"""《死亡细胞》原型本地启动器。

在 PyCharm 中直接运行本文件即可：
  - 以当前目录为网站根目录启动静态服务器
  - 自动打开默认浏览器
  - 默认端口 8123，被占用时自动顺延
  - 按 Ctrl+C 停止

仅使用 Python 标准库，无需安装任何依赖。
"""

import argparse
import socket
import threading
import webbrowser
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent
HOST = "0.0.0.0"      # 监听所有网卡：同一 Wi-Fi 下的手机可直接访问
DEFAULT_PORT = 8123
PORT_TRIES = 10


def lan_ip():
    """取本机在局域网中的 IPv4 地址（不实际发包）。"""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except OSError:
        return "127.0.0.1"


class GameHandler(SimpleHTTPRequestHandler):
    """静态文件处理器：禁用缓存，避免修改后浏览器仍加载旧脚本。"""

    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        super().end_headers()

    def guess_type(self, path):
        mime = super().guess_type(path)
        if mime.startswith("text/") or mime in ("application/javascript", "application/json"):
            return mime + "; charset=utf-8"
        return mime

    def do_GET(self):
        if self.path == "/favicon.ico":
            self.send_response(204)
            self.end_headers()
            return
        super().do_GET()

    def log_message(self, fmt, *args):
        # 只保留错误日志，让 PyCharm 控制台保持整洁
        if args and str(args[1]).startswith(("4", "5")):
            super().log_message(fmt, *args)


def create_server(host, start_port):
    handler = partial(GameHandler, directory=str(ROOT))
    for port in range(start_port, start_port + PORT_TRIES):
        try:
            httpd = ThreadingHTTPServer((host, port), handler)
            return httpd, port
        except OSError:
            continue
    raise OSError("端口 %d-%d 均被占用，请关闭占用程序后重试。"
                  % (start_port, start_port + PORT_TRIES - 1))


def main():
    parser = argparse.ArgumentParser(description="启动《死亡细胞》网页原型")
    parser.add_argument("--port", type=int, default=DEFAULT_PORT, help="起始端口，默认 8123")
    parser.add_argument("--no-browser", action="store_true", help="不自动打开浏览器")
    args = parser.parse_args()

    httpd, port = create_server(HOST, args.port)
    url = "http://127.0.0.1:%d/" % port
    phone_url = "http://%s:%d/" % (lan_ip(), port)

    print("=" * 52)
    print("  死亡细胞 · DEAD CELLS  (网页原型)")
    print("  电脑访问：%s" % url)
    print("  手机访问：%s" % phone_url)
    print("  （手机需与本机连同一个 Wi-Fi；用手机浏览器打开上面的地址）")
    print("  按 Ctrl+C 停止服务器")
    print("=" * 52)

    if not args.no_browser:
        threading.Timer(0.6, lambda: webbrowser.open(url)).start()

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n服务器已停止。")
    finally:
        httpd.server_close()


if __name__ == "__main__":
    main()

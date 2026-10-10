import argparse
import contextlib
import http.server
import logging
import os
import socket
import sys
import threading
import time
import webbrowser
import tkinter as tk
from tkinter import ttk, filedialog, messagebox

DEFAULT_HOST = "127.0.0.1"
DEFAULT_PORT = 8009
DEFAULT_OPEN_BROWSER = True
DEFAULT_DIR = os.path.dirname(os.path.abspath(__file__))
DEFAULT_INDEX = "index.html"


def build_argument_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Lightweight static server with CORS, SPA fallback, and auto-port selection.",
    )
    parser.add_argument("--host", default=DEFAULT_HOST, help=f"Host interface to bind (default: {DEFAULT_HOST})")
    parser.add_argument("--port", type=int, default=DEFAULT_PORT, help=f"Preferred port to bind (default: {DEFAULT_PORT})")
    parser.add_argument("--dir", dest="directory", default=DEFAULT_DIR, help=f"Directory to serve (default: {DEFAULT_DIR})")
    parser.add_argument("--open", dest="open_browser", action=argparse.BooleanOptionalAction, default=DEFAULT_OPEN_BROWSER, help="Open the browser after start (default: true)")
    parser.add_argument("--spa-index", dest="spa_index", default=DEFAULT_INDEX, help=f"SPA fallback file (default: {DEFAULT_INDEX})")
    parser.add_argument("--enable-spa", dest="enable_spa", action=argparse.BooleanOptionalAction, default=True, help="Enable SPA fallback for 404 on non-file paths (default: true)")
    parser.add_argument("--cors", dest="enable_cors", action=argparse.BooleanOptionalAction, default=True, help="Enable permissive CORS headers (default: true)")
    parser.add_argument("--log-level", default="INFO", choices=["CRITICAL","ERROR","WARNING","INFO","DEBUG"], help="Logging level (default: INFO)")
    parser.add_argument("--browse-delay", type=float, default=0.3, help="Delay seconds before opening the browser (default: 0.3)")
    parser.add_argument("--max-port-tries", type=int, default=15, help="Number of sequential ports to try if preferred is busy (default: 15)")
    return parser


class StaticRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, directory: str = DEFAULT_DIR, enable_cors: bool = True, enable_spa: bool = True, spa_index: str = DEFAULT_INDEX, **kwargs):
        self._enable_cors = enable_cors
        self._enable_spa = enable_spa
        self._spa_index = spa_index
        super().__init__(*args, directory=directory, **kwargs)

    # Logging
    def log_message(self, format: str, *args) -> None:  # noqa: A003 - match base signature
        logging.info("%s - - %s", self.address_string(), format % args)

    # CORS headers
    def end_headers(self) -> None:
        if self._enable_cors:
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "*")
            self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        super().end_headers()

    def do_OPTIONS(self) -> None:  # Preflight support
        self.send_response(204)
        self.end_headers()

    # SPA fallback on 404 for non-asset paths
    def send_error(self, code, message=None, explain=None):  # noqa: N802 (match base name)
        if code == 404 and self._enable_spa and self._should_fallback_to_spa():
            logging.debug("SPA fallback for path: %s", self.path)
            return self._serve_spa_index()
        return super().send_error(code, message, explain)

    def _should_fallback_to_spa(self) -> bool:
        # If path looks like a file (has extension), don't SPA-fallback
        _, ext = os.path.splitext(self.translate_path(self.path))
        return ext == "" or ext == "."

    def _serve_spa_index(self):
        spa_path = os.path.join(self.directory, self._spa_index)
        if os.path.isfile(spa_path):
            try:
                with open(spa_path, "rb") as f:
                    self.send_response(200)
                    self.send_header("Content-Type", "text/html; charset=utf-8")
                    fs = os.fstat(f.fileno())
                    self.send_header("Content-Length", str(fs.st_size))
                    self.end_headers()
                    self.copyfile(f, self.wfile)
                return
            except OSError:
                pass
        # Fall back to standard 404 if index missing or failed
        super().send_error(404, "File not found")


def find_available_port(host: str, preferred_port: int, max_tries: int) -> int:
    for offset in range(max_tries):
        port = preferred_port + offset
        with contextlib.closing(socket.socket(socket.AF_INET, socket.SOCK_STREAM)) as sock:
            sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            try:
                sock.bind((host, port))
                return port
            except OSError:
                continue
    raise OSError(f"No available port found starting at {preferred_port} within {max_tries} tries")


def open_browser_later(url: str, delay_seconds: float) -> None:
    def _open():
        time.sleep(max(0.0, delay_seconds))
        try:
            webbrowser.open(url)
        except Exception:
            logging.warning("Failed to open browser for %s", url)
    threading.Thread(target=_open, daemon=True).start()


def serve(host: str, port: int, directory: str, open_browser: bool, browse_delay: float, enable_cors: bool, enable_spa: bool, spa_index: str) -> None:
    handler_factory = lambda *args, **kwargs: StaticRequestHandler(  # noqa: E731
        *args,
        directory=directory,
        enable_cors=enable_cors,
        enable_spa=enable_spa,
        spa_index=spa_index,
        **kwargs,
    )

    server = http.server.ThreadingHTTPServer((host, port), handler_factory)

    url = f"http://{host}:{port}/"
    logging.info("Serving %s at %s", directory, url)

    if open_browser:
        open_browser_later(url, browse_delay)

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        logging.info("Shutdown requested (KeyboardInterrupt)")
    finally:
        with contextlib.suppress(Exception):
            server.shutdown()
        with contextlib.suppress(Exception):
            server.server_close()
        logging.info("Server stopped.")


class ServerController:
    def __init__(self):
        self._server: http.server.ThreadingHTTPServer | None = None
        self._thread: threading.Thread | None = None
        self.url: str | None = None

    def is_running(self) -> bool:
        return self._thread is not None and self._thread.is_alive()

    def start(self, host: str, port: int, directory: str, open_browser: bool, browse_delay: float, enable_cors: bool, enable_spa: bool, spa_index: str) -> None:
        if self.is_running():
            return

        handler_factory = lambda *args, **kwargs: StaticRequestHandler(  # noqa: E731
            *args,
            directory=directory,
            enable_cors=enable_cors,
            enable_spa=enable_spa,
            spa_index=spa_index,
            **kwargs,
        )

        # Try exact port; raise if occupied (GUI will display error)
        server = http.server.ThreadingHTTPServer((host, port), handler_factory)
        self._server = server
        self.url = f"http://{host}:{port}/"
        logging.info("Serving %s at %s", directory, self.url)

        def _run():
            try:
                server.serve_forever()
            except Exception as exc:  # pragma: no cover - defensive
                logging.error("Server error: %s", exc)
            finally:
                with contextlib.suppress(Exception):
                    server.server_close()
                logging.info("Server stopped.")

        self._thread = threading.Thread(target=_run, daemon=True)
        self._thread.start()

        if open_browser:
            open_browser_later(self.url, browse_delay)

    def stop(self) -> None:
        server = self._server
        if server is None:
            return
        with contextlib.suppress(Exception):
            server.shutdown()
        # Wait briefly for thread to exit
        if self._thread is not None:
            self._thread.join(timeout=2.0)
        self._server = None
        self._thread = None


class ServerGUI(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("RPS List Dev Server")
        self.resizable(False, False)

        self.controller = ServerController()

        # Variables
        self.var_host = tk.StringVar(value=DEFAULT_HOST)
        self.var_port = tk.StringVar(value=str(DEFAULT_PORT))
        self.var_dir = tk.StringVar(value=DEFAULT_DIR)
        self.var_open = tk.BooleanVar(value=DEFAULT_OPEN_BROWSER)
        self.var_spa = tk.BooleanVar(value=True)
        self.var_cors = tk.BooleanVar(value=True)

        self._build_widgets()
        self._update_status()

        # Ensure proper shutdown on window close
        self.protocol("WM_DELETE_WINDOW", self._on_close)

    def _build_widgets(self) -> None:
        pad = {"padx": 8, "pady": 6}

        frm = ttk.Frame(self)
        frm.grid(row=0, column=0, sticky="nsew")

        # Host
        ttk.Label(frm, text="Host").grid(row=0, column=0, sticky="w", **pad)
        self.ent_host = ttk.Entry(frm, textvariable=self.var_host, width=20)
        self.ent_host.grid(row=0, column=1, sticky="w", **pad)

        # Port
        ttk.Label(frm, text="Port").grid(row=0, column=2, sticky="w", **pad)
        self.ent_port = ttk.Entry(frm, textvariable=self.var_port, width=8)
        self.ent_port.grid(row=0, column=3, sticky="w", **pad)

        # Directory
        ttk.Label(frm, text="Directory").grid(row=1, column=0, sticky="w", **pad)
        self.ent_dir = ttk.Entry(frm, textvariable=self.var_dir, width=48)
        self.ent_dir.grid(row=1, column=1, columnspan=3, sticky="we", **pad)
        ttk.Button(frm, text="Browse...", command=self._choose_dir).grid(row=1, column=4, sticky="w", **pad)

        # Options
        ttk.Checkbutton(frm, text="Open browser", variable=self.var_open).grid(row=2, column=0, sticky="w", **pad)
        ttk.Checkbutton(frm, text="Enable SPA fallback", variable=self.var_spa).grid(row=2, column=1, sticky="w", **pad)
        ttk.Checkbutton(frm, text="Enable CORS", variable=self.var_cors).grid(row=2, column=2, sticky="w", **pad)

        # Buttons
        self.btn_start = ttk.Button(frm, text="Start", command=self._on_start)
        self.btn_start.grid(row=3, column=0, **pad)

        self.btn_stop = ttk.Button(frm, text="Stop", command=self._on_stop)
        self.btn_stop.grid(row=3, column=1, **pad)

        self.btn_refresh = ttk.Button(frm, text="Refresh", command=self._on_refresh)
        self.btn_refresh.grid(row=3, column=2, **pad)

        self.btn_open = ttk.Button(frm, text="Open in Browser", command=self._on_open)
        self.btn_open.grid(row=3, column=3, **pad)

        # Status
        self.lbl_status = ttk.Label(frm, text="Idle", foreground="#3a3a3a")
        self.lbl_status.grid(row=4, column=0, columnspan=5, sticky="w", **pad)

    def _choose_dir(self) -> None:
        initial = self.var_dir.get() or os.getcwd()
        chosen = filedialog.askdirectory(initialdir=initial, title="Choose directory to serve")
        if chosen:
            self.var_dir.set(chosen)

    def _on_start(self) -> None:
        if self.controller.is_running():
            return
        host = self.var_host.get().strip() or DEFAULT_HOST
        try:
            port = int(self.var_port.get().strip())
        except ValueError:
            messagebox.showerror("Invalid Port", "Please enter a valid port number.")
            return
        directory = os.path.abspath(self.var_dir.get().strip() or DEFAULT_DIR)
        if not os.path.isdir(directory):
            messagebox.showerror("Invalid Directory", f"Directory does not exist:\n{directory}")
            return
        try:
            self.controller.start(
                host=host,
                port=port,
                directory=directory,
                open_browser=self.var_open.get(),
                browse_delay=0.2,
                enable_cors=self.var_cors.get(),
                enable_spa=self.var_spa.get(),
                spa_index=DEFAULT_INDEX,
            )
        except OSError as exc:
            messagebox.showerror("Failed to Start Server", str(exc))
            return
        self._update_status()

    def _on_stop(self) -> None:
        self.controller.stop()
        self._update_status()

    def _on_refresh(self) -> None:
        if self.controller.url:
            open_browser_later(self.controller.url, 0.0)

    def _on_open(self) -> None:
        self._on_refresh()

    def _update_status(self) -> None:
        if self.controller.is_running():
            self.lbl_status.config(text=f"Running at {self.controller.url}")
            self.btn_start.state(["disabled"]) 
            self.btn_stop.state(["!disabled"]) 
            self.btn_refresh.state(["!disabled"]) 
            self.btn_open.state(["!disabled"]) 
        else:
            self.lbl_status.config(text="Stopped")
            self.btn_start.state(["!disabled"]) 
            self.btn_stop.state(["disabled"]) 
            self.btn_refresh.state(["disabled"]) 
            self.btn_open.state(["disabled"]) 

    def _on_close(self) -> None:
        self.controller.stop()
        self.destroy()


def main(argv: list[str] | None = None) -> int:
    parser = build_argument_parser()
    parser.add_argument("--gui", dest="gui", action=argparse.BooleanOptionalAction, default=True, help="Launch GUI (default: true)")
    args = parser.parse_args(argv)

    logging.basicConfig(
        level=getattr(logging, str(args.log_level).upper(), logging.INFO),
        format="[%(levelname)s] %(message)s",
    )

    if args.gui:
        # Launch GUI application
        app = ServerGUI()
        app.mainloop()
    else:
        directory = os.path.abspath(args.directory)
        if not os.path.isdir(directory):
            logging.error("Directory does not exist: %s", directory)
            return 2

        try:
            port = find_available_port(args.host, args.port, args.max_port_tries)
        except OSError as exc:
            logging.error(str(exc))
            return 3

        serve(
            host=args.host,
            port=port,
            directory=directory,
            open_browser=bool(args.open_browser),
            browse_delay=float(args.browse_delay),
            enable_cors=bool(args.enable_cors),
            enable_spa=bool(args.enable_spa),
            spa_index=str(args.spa_index),
        )
    return 0


if __name__ == "__main__":
    sys.exit(main())

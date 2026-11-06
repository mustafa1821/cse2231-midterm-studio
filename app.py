#!/usr/bin/env python3
"""CSE 2231 Midterm Studio: localhost-only review app and Java practice judge.

Run `python app.py`; the coding judge requires `java` and `javac` on PATH.

Warning: this compiles and executes source code submitted from the LOCAL
browser tab. Only run code you trust; no strong sandboxing is provided.
"""
import argparse
import json
import os
import shutil
import subprocess
import tempfile
import threading
import webbrowser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

ROOT = Path(__file__).resolve().parent
STATIC = (ROOT / "static").resolve()
SUPPORT_SOURCE = (ROOT / "CourseSupport.java").read_text(encoding="utf8")
PROBLEMS = json.loads((ROOT / "data" / "coding.json").read_text(encoding="utf8"))
REVIEWS = json.loads((ROOT / "data" / "review.json").read_text(encoding="utf8"))
PROBLEM_BY_ID = {p["id"]: p for p in PROBLEMS}
PUBLIC_PROBLEMS = [
    {k: v for k, v in p.items() if k not in ("solution", "tests")} | {"testCount": len(p["tests"])}
    for p in PROBLEMS
]

MAX_REQUEST = 65_000
MAX_RESPONSE = 30_000
COMPILE_TIMEOUT = 14
RUN_TIMEOUT = 8
SAMPLE_TESTS = 2

CONTENT_TYPES = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".svg": "image/svg+xml",
    ".pdf": "application/pdf",
}

def find_jdk_bin():
    """Locate a JDK bin folder: PATH first, then JAVA_HOME and common install dirs.

    The fallback matters right after installing a JDK, before PATH changes reach
    already-open terminals.
    """
    if shutil.which("javac"):
        return None
    candidates = []
    if os.environ.get("JAVA_HOME"):
        candidates.append(Path(os.environ["JAVA_HOME"]))
    for base in ("Microsoft", "Eclipse Adoptium", "Java", "Zulu", "Amazon Corretto", "BellSoft"):
        for root in (os.environ.get("ProgramFiles"), os.environ.get("ProgramW6432")):
            if root and (Path(root) / base).is_dir():
                candidates += sorted((Path(root) / base).glob("*jdk*"), reverse=True)
    for home in candidates:
        if (home / "bin" / ("javac.exe" if os.name == "nt" else "javac")).is_file():
            return home / "bin"
    return None


JDK_BIN = find_jdk_bin()
if JDK_BIN:
    os.environ["PATH"] = str(JDK_BIN) + os.pathsep + os.environ.get("PATH", "")


RUNNER_TEMPLATE = """import java.util.*;
public class TestRunner {
    static void check(boolean value) { if (!value) throw new AssertionError("expected condition was false"); }
    static boolean heap(int[] a) { return heapPrefix(a, a.length); }
    static boolean heapPrefix(int[] a, int size) { for (int i = 1; i < size; i++) if (a[(i - 1) / 2] > a[i]) return false; return true; }
    static boolean sameBag(int[] a, int[] b) { int[] x = a.clone(), y = b.clone(); Arrays.sort(x); Arrays.sort(y); return Arrays.equals(x, y); }
    public static void main(String[] args) {
        int passed = 0;
%(tests)s
        System.out.println("SUMMARY|" + passed + "|" + %(total)d);
    }
}
"""

TEST_TEMPLATE = """        try {
            %(code)s
            System.out.println("PASS|" + %(label)s); passed++;
        } catch (Throwable ex) {
            System.out.println("FAIL|" + %(label)s + "|" + ex.getClass().getSimpleName() + ": " + String.valueOf(ex.getMessage()));
        }"""


def build_runner(problem, mode="submit"):
    """Generate TestRunner.java for the full suite (submit) or a small sample (run)."""
    tests = problem["tests"] if mode == "submit" else problem["tests"][:SAMPLE_TESTS]
    blocks = []
    for t in tests:
        # Tests starting with '@' are raw statements; others are boolean expressions.
        code = t["code"][1:] if t["code"].startswith("@") else f'check({t["code"]});'
        blocks.append(TEST_TEMPLATE % {"code": code, "label": json.dumps(t["name"])})
    return RUNNER_TEMPLATE % {"tests": "\n".join(blocks), "total": len(tests)}


def failure(message, tests=None, total=0):
    return {"ok": False, "compile_error": message, "tests": tests or [], "passed": 0, "total": total}


def run_process(args, cwd, timeout):
    return subprocess.run(
        args, cwd=cwd, capture_output=True, text=True,
        encoding="utf-8", errors="replace", timeout=timeout,
    )


def parse_results(stdout):
    tests, passed, total = [], 0, 0
    for line in stdout[:MAX_RESPONSE].splitlines():
        if line.startswith("PASS|"):
            tests.append({"name": line[5:], "passed": True, "message": "Passed"})
        elif line.startswith("FAIL|"):
            parts = line.split("|", 2)
            tests.append({"name": parts[1], "passed": False, "message": parts[2] if len(parts) > 2 else "Failed"})
        elif line.startswith("SUMMARY|"):
            parts = line.split("|")
            passed, total = int(parts[1]), int(parts[2])
    return tests, passed, total


def grade(problem, code, mode="submit"):
    if len(code) > MAX_REQUEST:
        return failure("Source code is too long.")
    with tempfile.TemporaryDirectory(prefix="cse2231judge_") as d:
        work = Path(d)
        (work / "Solution.java").write_text(code, encoding="utf8")
        (work / "CourseSupport.java").write_text(SUPPORT_SOURCE, encoding="utf8")
        (work / "TestRunner.java").write_text(build_runner(problem, mode), encoding="utf8")
        try:
            compiled = run_process(
                ["javac", "-encoding", "UTF-8", "-d", d, "Solution.java", "CourseSupport.java", "TestRunner.java"],
                d, COMPILE_TIMEOUT,
            )
            if compiled.returncode != 0:
                return failure((compiled.stderr + compiled.stdout)[:MAX_RESPONSE])
            run = run_process(["java", "-Xmx128m", "-cp", d, "TestRunner"], d, RUN_TIMEOUT)
        except subprocess.TimeoutExpired:
            return failure("Time limit exceeded (compilation or execution). Check for infinite loops.")
        except FileNotFoundError:
            return failure("Java JDK not found: install JDK 17+ and ensure java and javac are on your PATH.")

    tests, passed, total = parse_results(run.stdout)
    if not total and run.returncode:
        return failure("Runtime error: " + run.stderr[:MAX_RESPONSE], tests, len(problem["tests"]))
    return {
        "ok": total > 0 and passed == total,
        "compile_error": "",
        "tests": tests,
        "passed": passed,
        "total": total,
        "stderr": run.stderr[:4000],
    }


class Handler(BaseHTTPRequestHandler):
    server_version = "MidtermStudio/1.0"

    def log_message(self, fmt, *args):
        print("[Studio]", fmt % args)

    def write_json(self, value, status=200):
        blob = json.dumps(value, ensure_ascii=False).encode("utf8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(blob)))
        self.end_headers()
        self.wfile.write(blob)

    def write_file(self, path):
        blob = path.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", CONTENT_TYPES.get(path.suffix, "application/octet-stream"))
        self.send_header("Cache-Control", "no-cache")
        self.send_header("Content-Length", str(len(blob)))
        self.end_headers()
        self.wfile.write(blob)

    def do_GET(self):
        url = urlparse(self.path)
        if url.path == "/api/review":
            return self.write_json(REVIEWS)
        if url.path == "/api/problems":
            return self.write_json(PUBLIC_PROBLEMS)
        if url.path == "/api/solution":
            pid = parse_qs(url.query).get("id", [""])[0]
            if pid not in PROBLEM_BY_ID:
                return self.write_json({"error": "Unknown ID"}, 404)
            return self.write_json({"solution": PROBLEM_BY_ID[pid]["solution"]})
        if url.path == "/api/status":
            return self.write_json({
                "javac": shutil.which("javac"),
                "java": shutil.which("java"),
                "problemCount": len(PROBLEMS),
                "mc": len(REVIEWS["multiple_choice"]),
                "short": len(REVIEWS["short_response"]),
            })
        rel = "index.html" if url.path == "/" else url.path.lstrip("/")
        path = (STATIC / rel).resolve()
        if not path.is_relative_to(STATIC) or not path.is_file():
            return self.send_error(404)
        return self.write_file(path)

    def do_POST(self):
        if self.path != "/api/grade":
            return self.write_json({"error": "Unknown route"}, 404)
        try:
            n = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            n = 0
        if n <= 0 or n > MAX_REQUEST + 4096:
            return self.write_json({"error": "Request too large or empty"}, 413)
        try:
            data = json.loads(self.rfile.read(n))
            pid, code, mode = data["id"], data["code"], data.get("mode", "submit")
        except (ValueError, KeyError, TypeError):
            return self.write_json({"error": "Invalid JSON payload"}, 400)
        if not isinstance(code, str) or pid not in PROBLEM_BY_ID or mode not in ("run", "submit"):
            return self.write_json({"error": "Invalid problem, code or mode"}, 400)
        return self.write_json(grade(PROBLEM_BY_ID[pid], code, mode))


def main():
    parser = argparse.ArgumentParser(description="Local review app and Java coding studio for CSE 2231")
    parser.add_argument("--port", type=int, default=8765)
    parser.add_argument("--no-browser", action="store_true", help="do not open a browser tab on start")
    args = parser.parse_args()

    try:
        server = ThreadingHTTPServer(("127.0.0.1", args.port), Handler)
    except OSError:
        raise SystemExit(f"Port {args.port} is already in use. Try: python app.py --port 9000")

    url = f"http://127.0.0.1:{args.port}/"
    print(f"CSE 2231 Midterm Studio running at {url}")
    print(f"{len(PROBLEMS)} Java problems, {len(REVIEWS['multiple_choice'])} MCQs, "
          f"{len(REVIEWS['short_response'])} short-response prompts")
    if not shutil.which("javac"):
        print("Note: javac not found on PATH. Review questions work; the Java judge needs JDK 17+.")
    print("WARNING: Submitted Java code runs locally. Only submit code you trust. Ctrl+C to stop.")
    if not args.no_browser:
        threading.Timer(0.6, webbrowser.open, (url,)).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()

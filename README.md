# CSE 2231 Midterm Studio

A free, offline study app for **OSU CSE 2231 (Software II)**, covering everything up through Midterm 2 (Nov 6, 2026). It runs on your own computer in your browser, a bit like a mini practice site built for this course.

| | |
|---|---|
| **181 review questions** | 125 multiple choice + 56 short response, each with an answer and explanation |
| **57 Java coding problems** | Write code in the browser, then press **Run** / **Submit** to have it compiled and tested locally |
| **Full question bank PDF** | 43 pages, readable inside the app or printable |
| **Progress tracking** | Completed, needs-review and bookmarked questions are saved in your browser |

> These are **original practice problems**, not official OSU exam questions or predictions. Use them to study, not as a substitute for the course materials.

---

## Quick start (about 5 minutes)

### 1. Download the app

**Option A: no Git needed**
Click the green **Code** button at the top of this page → **Download ZIP**. Then right-click the ZIP → **Extract All…** into a normal folder (e.g. your Desktop or Documents).

**Option B: with Git**
```bash
git clone https://github.com/mustafa1821/cse2231-midterm-studio.git
cd cse2231-midterm-studio
```

### 2. Install the two requirements (one time only)

| You need | Why | Check it's installed |
|---|---|---|
| **Python 3.10+** | Runs the app | `python --version` |
| **Java JDK 17+** | Only for the Java Coding problems (the review questions work without it) | `javac -version` |

**Windows** (PowerShell):
```powershell
winget install Python.Python.3.12
winget install Microsoft.OpenJDK.21
```
Or download Python from [python.org](https://www.python.org/downloads/) (tick **"Add python.exe to PATH"** in the installer) and a JDK from [Microsoft](https://learn.microsoft.com/java/openjdk/download).

**macOS** (with [Homebrew](https://brew.sh)):
```bash
brew install python openjdk@21
```

**Linux** (Debian/Ubuntu):
```bash
sudo apt install python3 openjdk-21-jdk
```

### 3. Start it

- **Windows:** double-click **`START_WINDOWS.bat`** in the folder.
- **macOS / Linux:** open a terminal in the folder and run `python3 app.py`.

Your browser opens **http://127.0.0.1:8765** automatically. If it doesn't, paste that address into your browser.

Keep the terminal window open while you study. Press **Ctrl+C** in it (or close it) when you're done.

---

## How to use it

The top bar switches between modes.

### Question Bank
- Browse all 181 questions in a table. Search, then filter by topic, status (completed / not completed / bookmarked / needs review) or type.
- Click any row to expand its answer and explanation. Use **Expand all answers & explanations** to see a whole page at once.
- **Practice this question** jumps into interactive practice at that question.
- **Read PDF in app** shows the full PDF; **Open PDF edition** opens it in a new tab for printing.

### Multiple Choice
- Pick an answer, then **Check answer**. You'll see whether you were right and why.
- Wrong answers are marked **Needs review** so you can filter for them later. **Try again** resets a question.
- **Study mode** reveals the explanation without submitting.
- Keyboard: **A–D** (or **1–4**) to pick, **Enter** to check, **N** for next.

### Short Response
- Type your answer, then **Reveal model answer & explanation**.
- Grade yourself: **I got this right** or **Needs another try**.

### Java Coding
- Read the problem on the left; write your code on the right inside `public class Solution`.
- **Run tests** checks a small sample of tests. **Submit solution** (or **Ctrl+Enter**) runs every test; a full pass marks the problem complete.
- Stuck? Try the **Approach & Hints** tab. The **Solution** tab shows a reference implementation.
- Your code is saved automatically as you type.

### Getting around
- **Problem List** (top centre) opens a searchable list of every question in the current mode. The arrows go to the previous/next question, and the shuffle button picks a random one.
- Drag the divider between the left and right panels to resize them.
- The ring in the top-right shows your overall completion.

> **Note on the Java problems:** they use a small built-in `CourseSupport.java` model plus standard Java collections, so they compile without OSU's `components.jar`. Read each method signature carefully: these types are simplified *adaptations*, not the official OSU components.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `python` is not recognized | Reinstall Python and tick **"Add python.exe to PATH"**, then open a new terminal. |
| Top bar says **JDK not found** | Install a JDK (step 2), then restart the app. The app also looks in the usual JDK install folders, so you don't need to edit PATH yourself. A JRE alone is not enough. |
| "Port 8765 is already in use" | The app is probably already running in another window. Otherwise start it with `python app.py --port 9000` and open http://127.0.0.1:9000. |
| Code won't compile | Keep the class name `Solution`, match the given method signature exactly, and keep `import java.util.*;`. |
| My progress disappeared | Progress lives in your browser's storage for `127.0.0.1:8765`. Clearing browser data, switching browsers or changing the port starts fresh. |
| Browser didn't open | Go to http://127.0.0.1:8765 manually. |

### Security note

The coding judge compiles and runs the Java code you submit **on your own computer**. The server only listens on `127.0.0.1`, so other devices can't reach it, but it isn't a hardened sandbox. Only run code you wrote or trust.

---

## What's covered

- HW01–HW28, Projects P01–P07, lecture/lab topics and the Autumn 2026 practice midterm, up to Midterm 2 (Nov 6, 2026, after HW28 and P07).
- Course schedule: https://cse22x1.engineering.osu.edu/2231/schedule.html
- Topics after Nov 6 are intentionally not included.

## For tinkerers

No packages to install: the server uses only Python's standard library plus your system's `java`/`javac`. Every question, test and reference solution is plain JSON you can edit.

```text
app.py                   Local web server + Java compile/test judge
CourseSupport.java       Simplified tree/AST/linked-list models used by coding problems
data/review.json         Multiple-choice and short-response questions and answers
data/coding.json         57 coding problems: starters, tests, reference solutions
static/index.html        App page
static/app.js            App logic
static/style.css         Styling
static/favicon.svg       Tab icon
static/question-bank.pdf Full 43-page question bank
START_WINDOWS.bat        Double-click launcher for Windows
```

Options: `python app.py --port 9000` uses a different port; `python app.py --no-browser` doesn't open a browser tab.

---

*Independent study tool, not affiliated with or endorsed by The Ohio State University.*

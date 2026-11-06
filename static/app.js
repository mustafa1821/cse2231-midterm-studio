"use strict";

/* ------------------------------------------------------------------ *
 * Utilities
 * ------------------------------------------------------------------ */
const $ = (id) => document.getElementById(id);
const ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const esc = (text) => String(text ?? "").replace(/[&<>"']/g, (c) => ESCAPES[c]);
const snippet = (text, n = 100) => {
  text = String(text);
  return text.length > n ? text.slice(0, n - 1) + "…" : text;
};
const LETTERS = "ABCD";
const choiceText = (q, letter = q.answer) => q.choices[letter.charCodeAt(0) - 65];
const isMC = (q) => q.id.startsWith("M");
const BANK_PAGE_SIZE = 14;
const PRACTICE_MODES = ["mc", "short", "code"];

const ICON = {
  check: '<svg viewBox="0 0 16 16" class="i i-check" aria-label="Completed"><path d="m3.5 8.5 3 3 6-7" /></svg>',
  retry: '<svg viewBox="0 0 16 16" class="i i-retry" aria-label="Needs review"><path d="M13 8a5 5 0 1 1-1.5-3.6M13 2.5v2.6h-2.6" /></svg>',
  star: '<svg viewBox="0 0 16 16" class="i i-star" aria-label="Bookmarked"><path d="m8 2 1.8 3.8 4.2.5-3.1 2.9.8 4.1L8 11.3l-3.7 2 .8-4.1L2 6.3l4.2-.5z" /></svg>',
  starOutline: '<svg viewBox="0 0 16 16" class="i"><path d="m8 2 1.8 3.8 4.2.5-3.1 2.9.8 4.1L8 11.3l-3.7 2 .8-4.1L2 6.3l4.2-.5z" /></svg>',
  search: '<svg viewBox="0 0 16 16" class="i"><circle cx="7" cy="7" r="4.5" /><path d="m10.5 10.5 3 3" /></svg>',
  doc: '<svg viewBox="0 0 16 16" class="i"><path d="M4 2h5l3 3v9H4zM9 2v3h3M6 8h4M6 10.5h4" /></svg>',
  bulb: '<svg viewBox="0 0 16 16" class="i"><path d="M6 12.5h4M6.5 14.5h3M8 1.5a4.5 4.5 0 0 0-2.6 8.2c.4.3.6.8.6 1.3v.5h4V11c0-.5.2-1 .6-1.3A4.5 4.5 0 0 0 8 1.5z" /></svg>',
  flask: '<svg viewBox="0 0 16 16" class="i"><path d="M6 2h4M6.5 2v4L3 13a1 1 0 0 0 .9 1.5h8.2A1 1 0 0 0 13 13L9.5 6V2" /></svg>',
  code: '<svg viewBox="0 0 16 16" class="i"><path d="m5.5 4-4 4 4 4M10.5 4l4 4-4 4" /></svg>',
  terminal: '<svg viewBox="0 0 16 16" class="i"><path d="m3 4 4 4-4 4M8.5 12.5h5" /></svg>',
  pen: '<svg viewBox="0 0 16 16" class="i"><path d="M11 2.5 13.5 5 6 12.5H3.5V10z" /></svg>',
  reset: '<svg viewBox="0 0 16 16" class="i"><path d="M3 8a5 5 0 1 0 1.5-3.6M3 2.5v2.6h2.6" /></svg>',
  copy: '<svg viewBox="0 0 16 16" class="i"><rect x="5" y="5" width="8.5" height="8.5" rx="1.5" /><path d="M3 10.5V3.5A1 1 0 0 1 4 2.5h6.5" /></svg>',
  play: '<svg viewBox="0 0 16 16" class="i"><path d="M5 3.5v9l7-4.5z" /></svg>',
  ext: '<svg viewBox="0 0 16 16" class="i"><path d="M9 2.5h4.5V7M13.5 2.5 7.5 8.5M12 9.5v4H2.5V4h4" /></svg>',
};

/* ------------------------------------------------------------------ *
 * Persistent progress (same key as earlier versions, so progress is kept)
 * ------------------------------------------------------------------ */
const STORAGE_KEY = "cse2231_midterm_studio_v2";
const store = (() => {
  let s;
  try {
    s = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    s = {};
  }
  for (const k of ["completed", "bookmarks", "choices", "responses", "drafts", "attempts", "checked", "wrong"]) {
    s[k] ??= {};
  }
  return s;
})();
function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* storage full or disabled: keep working in memory */
  }
}

/* ------------------------------------------------------------------ *
 * App state
 * ------------------------------------------------------------------ */
const app = {
  mode: "bank",
  id: null,
  mc: [],
  short: [],
  code: [],
  filtered: [],
  filters: { search: "", topic: "", status: "" },
  submitted: false,
  loading: false,
  grade: null,
  solution: null,
  leftTab: "description",
  split: 45,
  bankPage: 0,
  bankKind: "all",
  bankView: "browse",
  bankRevealAll: false,
};

const MODE_LABELS = {
  home: "Question Bank",
  bank: "Question Bank",
  mc: "Multiple Choice",
  short: "Short Response",
  code: "Java Coding",
};

/** Items listed for a given mode (Overview lists the bank). */
function items(mode = app.mode) {
  if (mode === "bank" || mode === "home") return [...app.mc, ...app.short];
  if (mode === "mc") return app.mc;
  if (mode === "short") return app.short;
  return app.code;
}
const activeItem = () => items().find((q) => q.id === app.id);
const main = () => $("main");
const isPractice = () => PRACTICE_MODES.includes(app.mode);

function statusOf(q) {
  if (store.completed[q.id]) return "done";
  if (store.wrong[q.id]) return "retry";
  return "";
}
function statusIcon(q) {
  const s = statusOf(q);
  return s === "done" ? ICON.check : s === "retry" ? ICON.retry : "";
}
function difficultyOf(q) {
  return q.difficulty || "";
}

/* ------------------------------------------------------------------ *
 * Stats & progress
 * ------------------------------------------------------------------ */
function counts() {
  const done = (list) => list.filter((q) => store.completed[q.id]).length;
  return {
    mc: [done(app.mc), app.mc.length],
    short: [done(app.short), app.short.length],
    code: [done(app.code), app.code.length],
  };
}

function renderStats() {
  const total = app.mc.length + app.short.length + app.code.length;
  const done = Object.values(store.completed).filter(Boolean).length;
  const pct = total ? Math.round((done * 100) / total) : 0;
  $("bankcount").textContent = app.mc.length + app.short.length;
  $("mccount").textContent = app.mc.length;
  $("shortcount").textContent = app.short.length;
  $("codecount").textContent = app.code.length;
  $("progressText").textContent = pct + "%";
  $("progressRing").style.setProperty("--p", pct);
  const values = { mc: app.mc.length, short: app.short.length, code: app.code.length, done };
  main()
    .querySelectorAll("[data-stat]")
    .forEach((el) => (el.textContent = values[el.dataset.stat]));
}

/* ------------------------------------------------------------------ *
 * Filters (shared by the bank toolbar and the problem-list drawer)
 * ------------------------------------------------------------------ */
function topicOptions() {
  const topics = [...new Set(items().map((q) => q.topic))].sort();
  if (app.filters.topic && !topics.includes(app.filters.topic)) app.filters.topic = "";
  return (
    '<option value="">All topics</option>' +
    topics.map((t) => `<option value="${esc(t)}" ${t === app.filters.topic ? "selected" : ""}>${esc(t)}</option>`).join("")
  );
}

function filtersHTML() {
  const s = app.filters.status;
  const opt = (v, label) => `<option value="${v}" ${s === v ? "selected" : ""}>${label}</option>`;
  return `<label class="search">${ICON.search}<input data-filter="search" type="search" placeholder="Search questions…" aria-label="Search questions" autocomplete="off" value="${esc(app.filters.search)}" /></label>
    <select data-filter="topic" aria-label="Filter topic">${topicOptions()}</select>
    <select data-filter="status" aria-label="Filter status">
      ${opt("", "All statuses")}${opt("complete", "Completed")}${opt("unseen", "Not completed")}${opt("bookmarked", "Bookmarked")}${opt("wrong", "Needs review")}
    </select>`;
}

function matchesStatus(q, status) {
  switch (status) {
    case "complete":
      return !!store.completed[q.id];
    case "bookmarked":
      return !!store.bookmarks[q.id];
    case "wrong":
      return !!store.wrong[q.id];
    case "unseen":
      return !store.completed[q.id];
    default:
      return true;
  }
}

function matchesSearch(q, search) {
  if (!search) return true;
  return [q.id, q.title, q.question, q.description, q.topic, q.source, q.explanation, q.answer]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .includes(search);
}

function applyFilters() {
  const search = app.filters.search.toLowerCase().trim();
  const { topic, status } = app.filters;
  app.filtered = items().filter(
    (q) => (!topic || q.topic === topic) && matchesSearch(q, search) && matchesStatus(q, status),
  );
}

function onFilterInput(e) {
  const el = e.target.closest("[data-filter]");
  if (!el) return;
  app.filters[el.dataset.filter] = el.value;
  // Keep the other copy of the controls in sync without re-rendering this one.
  document.querySelectorAll(`[data-filter="${el.dataset.filter}"]`).forEach((other) => {
    if (other !== el) other.value = el.value;
  });
  app.bankPage = 0;
  renderList();
  if (app.mode === "bank" && app.bankView === "browse") renderBankRows();
}

/* ------------------------------------------------------------------ *
 * Problem-list drawer
 * ------------------------------------------------------------------ */
function renderDrawerFilters() {
  $("drawerFilters").innerHTML = filtersHTML();
}

function renderList() {
  applyFilters();
  $("drawerTitle").textContent = MODE_LABELS[app.mode];
  $("listCaption").textContent = MODE_LABELS[app.mode];
  $("listCount").textContent = `${app.filtered.length} / ${items().length}`;
  $("questionList").innerHTML =
    app.filtered
      .map((q) => {
        const diff = difficultyOf(q);
        return `<button class="entry ${q.id === app.id ? "selected" : ""}" data-id="${q.id}" role="listitem">
          <span class="entry-state">${statusIcon(q) || (store.bookmarks[q.id] ? ICON.star : "")}</span>
          <span class="entry-title"><span class="entry-id">${q.id}.</span> ${esc(snippet(q.title || q.question, 70))}</span>
          <span class="entry-meta ${diff.toLowerCase()}">${diff ? diff : esc(snippet(q.topic, 22))}</span>
        </button>`;
      })
      .join("") || '<p class="muted list-empty">No questions match these filters.</p>';
}

function openDrawer(open = true) {
  document.body.classList.toggle("drawer-open", open);
  if (open) $("questionList").querySelector(".entry.selected")?.scrollIntoView({ block: "center" });
}

/* ------------------------------------------------------------------ *
 * Workspace (split-pane) shell shared by all practice modes
 * ------------------------------------------------------------------ */
function tabsHTML(tabs, active, attr) {
  return tabs
    .map(
      ([key, icon, label]) =>
        `<button class="tab ${key === active ? "active" : ""}" ${attr}="${key}">${icon}${label}</button>`,
    )
    .join("");
}

function descriptionHead(q) {
  const saved = !!store.bookmarks[q.id];
  const diff = difficultyOf(q);
  const state = store.completed[q.id]
    ? `<span class="solved">Completed ${ICON.check}</span>`
    : store.wrong[q.id]
      ? '<span class="tag tag-retry">Needs review</span>'
      : "";
  return `<h1 class="q-title">${esc(q.title || "Practice question " + q.id)}</h1>
    <div class="q-meta">
      ${diff ? `<span class="tag diff ${diff.toLowerCase()}">${diff}</span>` : ""}
      <span class="tag">${esc(q.topic)}</span>
      <span class="tag tag-plain">${q.id} · ${esc(q.source || "CSE 2231")}</span>
      ${state}
      <button id="bookmark" class="icon-btn bookmark ${saved ? "marked" : ""}" title="Bookmark this question">${saved ? ICON.star : ICON.starOutline}<span>${saved ? "Saved" : "Save"}</span></button>
    </div>`;
}

function workspaceHTML({ leftTabs, leftBody, rightTabs, rightBody, rightFoot = "" }) {
  return `<div class="workspace" id="workspace" style="--split:${app.split}%">
    <section class="panel">
      <div class="panel-tabs">${leftTabs}</div>
      <div class="panel-body prose">${leftBody}</div>
    </section>
    <div class="gutter" id="gutter" role="separator" aria-orientation="vertical" title="Drag to resize"></div>
    <section class="panel panel-right">
      <div class="panel-tabs">${rightTabs}</div>
      <div class="panel-body">${rightBody}</div>
      ${rightFoot}
    </section>
  </div>`;
}

function bindWorkspace() {
  $("bookmark")?.addEventListener("click", toggleBookmark);
  $("nextQ")?.addEventListener("click", () => step(1));
  const gutter = $("gutter");
  const ws = $("workspace");
  if (!gutter || !ws) return;
  gutter.onpointerdown = (e) => {
    gutter.setPointerCapture(e.pointerId);
    document.body.classList.add("resizing");
    const rect = ws.getBoundingClientRect();
    gutter.onpointermove = (ev) => {
      app.split = Math.min(75, Math.max(25, ((ev.clientX - rect.left) / rect.width) * 100));
      ws.style.setProperty("--split", app.split + "%");
    };
    gutter.onpointerup = () => {
      gutter.onpointermove = null;
      document.body.classList.remove("resizing");
    };
  };
}

function toggleBookmark() {
  store.bookmarks[app.id] = !store.bookmarks[app.id];
  persist();
  render();
}

function step(delta) {
  const list = app.filtered.some((x) => x.id === app.id) ? app.filtered : items();
  const pos = list.findIndex((x) => x.id === app.id);
  if (pos >= 0) select(list[(pos + delta + list.length) % list.length].id);
}

/* ------------------------------------------------------------------ *
 * Overview
 * ------------------------------------------------------------------ */
function renderHome() {
  main().replaceChildren($("homeTemplate").content.cloneNode(true));
  main()
    .querySelectorAll("[data-goto]")
    .forEach((b) => (b.onclick = () => chooseMode(b.dataset.goto)));
  renderStats();
}

/* ------------------------------------------------------------------ *
 * Multiple choice
 * ------------------------------------------------------------------ */
function renderMC(q) {
  const chosen = store.choices[q.id] || "";
  const answered = !!store.checked[q.id] || !!store.completed[q.id] || app.submitted;
  const right = chosen === q.answer;

  const options = q.choices
    .map((text, i) => {
      const l = LETTERS[i];
      const status = !answered ? "" : l === q.answer ? "correct" : chosen === l ? "incorrect" : "";
      return `<button class="option ${chosen === l ? "selected" : ""} ${status}" data-choice="${l}" ${answered ? "disabled" : ""}>
        <span class="letter">${l}</span><span>${esc(text)}</span>
      </button>`;
    })
    .join("");

  const verdict = answered
    ? `<div class="verdict ${right ? "ok" : "bad"}">
        <div class="verdict-title">${right ? "Correct" : "Answer: " + q.answer + " — " + esc(choiceText(q))}</div>
        <p>${esc(q.explanation)}</p>
        <div class="verdict-foot">Answer ${q.answer} · ${esc(q.source || "Course review")} · ${store.attempts[q.id] || 0} attempts</div>
      </div>`
    : "";

  const leftBody = `${descriptionHead(q)}
    <p class="q-text">${esc(q.question)}</p>
    <div class="section-label">SELECT ONE ANSWER · ORIGINAL PRACTICE QUESTION</div>
    ${
      answered
        ? ""
        : `<details class="accordion">
            <summary>Study mode · Show explanation without submitting</summary>
            <div><p><strong>Answer ${q.answer}: ${esc(choiceText(q))}</strong></p><p>${esc(q.explanation)}</p></div>
          </details>`
    }`;

  const rightBody = `${verdict}<div class="options">${options}</div>
    <p class="kbd-hint"><kbd>A</kbd>–<kbd>D</kbd> to pick · <kbd>Enter</kbd> to check · <kbd>N</kbd> for next</p>`;

  const rightFoot = `<div class="panel-foot">
      <button id="nextQ" class="btn btn-ghost">Next question</button>
      <span class="spacer"></span>
      <button id="retryMC" class="btn" ${!answered ? "disabled" : ""}>Try again</button>
      <button id="checkMC" class="btn btn-submit" ${answered || !chosen ? "disabled" : ""}>Check answer</button>
    </div>`;

  main().innerHTML = workspaceHTML({
    leftTabs: tabsHTML([["description", ICON.doc, "Description"]], "description", "data-tab"),
    leftBody,
    rightTabs: tabsHTML([["answer", ICON.pen, "Answer"]], "answer", "data-rtab"),
    rightBody,
    rightFoot,
  });

  main()
    .querySelectorAll("[data-choice]")
    .forEach((b) => (b.onclick = () => chooseOption(q, b.dataset.choice)));
  $("checkMC").onclick = () => checkMC(q);
  $("retryMC").onclick = () => {
    delete store.checked[q.id];
    delete store.choices[q.id];
    delete store.completed[q.id];
    app.submitted = false;
    persist();
    render();
  };
  bindWorkspace();
}

function chooseOption(q, letter) {
  if (store.checked[q.id] || store.completed[q.id] || app.submitted) return;
  store.choices[q.id] = letter;
  persist();
  renderMC(q);
}

function checkMC(q) {
  if (!store.choices[q.id] || store.checked[q.id]) return;
  app.submitted = true;
  store.checked[q.id] = true;
  store.attempts[q.id] = (store.attempts[q.id] || 0) + 1;
  if (store.choices[q.id] === q.answer) {
    store.completed[q.id] = true;
    delete store.wrong[q.id];
  } else {
    store.wrong[q.id] = true;
    delete store.completed[q.id];
  }
  persist();
  render();
}

/* ------------------------------------------------------------------ *
 * Short response
 * ------------------------------------------------------------------ */
function renderShort(q) {
  const visible = app.submitted;
  const written = store.responses[q.id] || "";

  const leftBody = `${descriptionHead(q)}
    <p class="q-text">${esc(q.question)}</p>
    <div class="section-label">WRITE A SHORT RESPONSE · Self-graded response</div>
    ${
      visible
        ? `<div class="model">
            <h3>Model answer</h3>
            <div class="answer-prose">${esc(q.answer)}</div>
            <h3>Why this works</h3>
            <div class="answer-prose">${esc(q.explanation || "Follow the contract and justify each step in the model answer.")}</div>
            <div class="verdict-foot">${esc(q.source || "Course review")}</div>
            <div class="self-grade">
              <button id="correctSelf" class="btn btn-submit">I got this right</button>
              <button id="reviewSelf" class="btn">Needs another try</button>
            </div>
          </div>`
        : ""
    }`;

  const rightBody = `<label for="answerArea" class="field-label">Your explanation or work</label>
    <textarea class="short-answer" id="answerArea" placeholder="Write your reasoning here before revealing the model answer…">${esc(written)}</textarea>`;

  const rightFoot = `<div class="panel-foot">
      <button id="nextQ" class="btn btn-ghost">Next question</button>
      <span class="spacer"></span>
      <button id="revealAnswer" class="btn ${visible ? "" : "btn-submit"}">${visible ? "Hide model answer" : "Reveal model answer & explanation"}</button>
    </div>`;

  main().innerHTML = workspaceHTML({
    leftTabs: tabsHTML([["description", ICON.doc, "Description"]], "description", "data-tab"),
    leftBody,
    rightTabs: tabsHTML([["answer", ICON.pen, "Response"]], "answer", "data-rtab"),
    rightBody,
    rightFoot,
  });

  $("answerArea").oninput = (e) => {
    store.responses[q.id] = e.target.value;
    persist();
  };
  $("revealAnswer").onclick = () => {
    app.submitted = !app.submitted;
    renderShort(q);
  };
  const selfGrade = (correct) => {
    if (correct) {
      store.completed[q.id] = true;
      delete store.wrong[q.id];
    } else {
      delete store.completed[q.id];
      store.wrong[q.id] = true;
    }
    persist();
    step(1);
  };
  if ($("correctSelf")) $("correctSelf").onclick = () => selfGrade(true);
  if ($("reviewSelf")) $("reviewSelf").onclick = () => selfGrade(false);
  bindWorkspace();
}

/* ------------------------------------------------------------------ *
 * Java coding
 * ------------------------------------------------------------------ */
function codeLeftBody(q) {
  if (app.leftTab === "hints") {
    const hints = (q.hints || [])
      .map((h, i) => `<details class="accordion"><summary>Hint ${i + 1}</summary><div><p>${esc(h)}</p></div></details>`)
      .join("");
    return `<h2>Approach &amp; explanation</h2>
      <details class="accordion" open><summary>Show guided approach</summary><div><p>${esc(q.explanation || "Solve the task from its contract and test boundary cases.")}</p></div></details>
      <h2>Hints</h2>${hints}`;
  }
  if (app.leftTab === "solution") {
    if (!app.solution || app.solution.id !== q.id) return '<p class="muted">Loading reference implementation…</p>';
    return `<h2>Reference implementation</h2>
      <p class="muted">Compare your approach to the model answer. This does not overwrite your editor.</p>
      <pre class="code-block">${esc(app.solution.text)}</pre>`;
  }
  return `${descriptionHead(q)}
    <p class="q-text">${esc(q.description)}</p>
    <h2>Method signature</h2>
    <pre class="code-block signature">${esc(q.signature)}</pre>
    <h2>Grading</h2>
    <p>${q.testCount} total test cases. Run tests a small sample; Submit tests all cases. Your Java class must be named <code>Solution</code>, and <code>CourseSupport</code> models are provided by the judge. <strong>These simplified types are not the official OSU components library.</strong></p>`;
}

function renderCode(q) {
  const code = store.drafts[q.id] ?? q.starter;
  const leftTabs = tabsHTML(
    [
      ["description", ICON.doc, "Description"],
      ["hints", ICON.bulb, "Approach &amp; Hints"],
      ["solution", ICON.flask, "Solution"],
    ],
    app.leftTab,
    "data-tab",
  );

  main().innerHTML = `<div class="workspace" id="workspace" style="--split:${app.split}%">
    <section class="panel">
      <div class="panel-tabs">${leftTabs}</div>
      <div class="panel-body prose" id="leftBody">${codeLeftBody(q)}</div>
    </section>
    <div class="gutter" id="gutter" role="separator" aria-orientation="vertical" title="Drag to resize"></div>
    <div class="stack">
      <section class="panel editor-panel">
        <div class="panel-tabs">
          ${tabsHTML([["code", ICON.code, "Code"]], "code", "data-rtab")}
          <span class="spacer"></span>
          <span class="lang">Java 17+ · Solution.java</span>
          <button class="icon-btn" id="resetEditor" title="Reset to starter code">${ICON.reset}</button>
          <button class="icon-btn" id="copyCode" title="Copy code">${ICON.copy}</button>
        </div>
        <div class="editor">
          <pre class="line-numbers" id="lineNumbers" aria-hidden="true"></pre>
          <textarea class="code-editor" id="codeEditor" aria-label="Java solution editor" spellcheck="false" wrap="off">${esc(code)}</textarea>
        </div>
      </section>
      <section class="panel console-panel">
        <div class="panel-tabs">
          ${tabsHTML([["result", ICON.terminal, "Test Result"]], "result", "data-rtab")}
          <span class="spacer"></span>
          <span class="kbd-hint"><kbd>Ctrl</kbd>+<kbd>Enter</kbd> to submit</span>
        </div>
        <div class="panel-body results" id="results" aria-live="polite">${resultsHTML()}</div>
        <div class="panel-foot">
          <span class="spacer"></span>
          <button class="btn" id="runTests" ${app.loading ? "disabled" : ""}>${ICON.play}Run tests</button>
          <button class="btn btn-submit" id="submitCode" ${app.loading ? "disabled" : ""}>Submit solution</button>
        </div>
      </section>
    </div>
  </div>`;

  const editor = $("codeEditor");
  const gutter = $("lineNumbers");
  const paintLines = () => {
    const n = editor.value.split("\n").length;
    gutter.textContent = Array.from({ length: n }, (_, i) => i + 1).join("\n");
  };
  const saveDraft = () => {
    store.drafts[q.id] = editor.value;
    persist();
    paintLines();
  };
  paintLines();
  editor.oninput = saveDraft;
  editor.onscroll = () => (gutter.scrollTop = editor.scrollTop);
  editor.onkeydown = (e) => {
    if (e.key === "Tab") {
      e.preventDefault();
      editor.setRangeText("    ", editor.selectionStart, editor.selectionEnd, "end");
      saveDraft();
    }
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      gradeCode("submit");
    }
  };

  main()
    .querySelectorAll("[data-tab]")
    .forEach((b) => (b.onclick = () => setCodeTab(q, b.dataset.tab)));
  $("runTests").onclick = () => gradeCode("run");
  $("submitCode").onclick = () => gradeCode("submit");
  $("resetEditor").onclick = () => {
    if (!confirm("Reset editor to starter code?")) return;
    store.drafts[q.id] = q.starter;
    app.grade = null;
    persist();
    renderCode(q);
  };
  $("copyCode").onclick = async () => {
    const btn = $("copyCode");
    try {
      await navigator.clipboard.writeText(editor.value);
    } catch {
      editor.select();
      document.execCommand("copy");
    }
    btn.classList.add("flash");
    btn.title = "Copied";
    setTimeout(() => btn.isConnected && (btn.classList.remove("flash"), (btn.title = "Copy code")), 1200);
  };
  bindWorkspace();
}

async function setCodeTab(q, tab) {
  app.leftTab = tab;
  main()
    .querySelectorAll("[data-tab]")
    .forEach((b) => b.classList.toggle("active", b.dataset.tab === tab));
  $("leftBody").innerHTML = codeLeftBody(q);
  $("bookmark")?.addEventListener("click", toggleBookmark);
  if (tab === "solution" && app.solution?.id !== q.id) {
    try {
      const json = await fetch("/api/solution?id=" + encodeURIComponent(q.id)).then((r) => r.json());
      app.solution = { id: q.id, text: json.solution };
    } catch (e) {
      app.solution = { id: q.id, text: "Could not load the reference solution: " + e.message };
    }
    if (app.id === q.id && app.leftTab === "solution") $("leftBody").innerHTML = codeLeftBody(q);
  }
}

function resultsHTML() {
  const r = app.grade;
  if (!r)
    return '<div class="muted empty-console">Run your code to get compiler feedback and sample tests. Submit to check every available test.</div>';
  if (r.compile_error)
    return `<div class="verdict-line bad">Compilation / runtime error</div><pre class="console">${esc(r.compile_error)}</pre>`;

  let out = `<div class="verdict-line ${r.ok ? "ok" : "bad"}">${r.ok ? "Accepted" : "Some tests failed"}<span>${r.passed}/${r.total} tests passed</span></div>`;
  out += '<div class="cases">';
  out += r.tests
    .map(
      (t) => `<div class="case ${t.passed ? "ok" : "bad"}">
        <span class="dot"></span>
        <span><strong>${esc(t.name)}</strong>${t.passed ? "" : `<span class="case-msg">${esc(t.message)}</span>`}</span>
      </div>`,
    )
    .join("");
  out += "</div>";
  if (r.stderr) out += `<pre class="console">${esc(r.stderr)}</pre>`;
  return out;
}

function setGrading(busy) {
  app.loading = busy;
  if ($("runTests")) $("runTests").disabled = busy;
  if ($("submitCode")) $("submitCode").disabled = busy;
}

async function gradeCode(mode) {
  const q = activeItem();
  if (!q || app.loading) return;
  app.grade = null;
  $("results").innerHTML = '<div class="muted loading">Compiling Java and running tests…</div>';
  setGrading(true);

  const code = $("codeEditor").value;
  store.drafts[q.id] = code;
  persist();
  try {
    const response = await fetch("/api/grade", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: q.id, code, mode }),
    });
    const json = await response.json();
    if (!response.ok) throw Error(json.error || "Server error");
    app.grade = json;
    if (mode === "submit") {
      store.attempts[q.id] = (store.attempts[q.id] || 0) + 1;
      if (json.ok) store.completed[q.id] = true;
      persist();
      renderStats();
      renderList();
    }
  } catch (e) {
    app.grade = { compile_error: String(e) };
  } finally {
    setGrading(false);
    // Only paint results if the user is still on this problem.
    if (app.id === q.id && $("results")) $("results").innerHTML = resultsHTML();
  }
}

/* ------------------------------------------------------------------ *
 * Question bank (problem table)
 * ------------------------------------------------------------------ */
function bankQuestions() {
  return app.filtered.filter(
    (q) => app.bankKind === "all" || (app.bankKind === "mc" ? isMC(q) : !isMC(q)),
  );
}

function bankRowHTML(q) {
  const mc = isMC(q);
  const choices = mc
    ? q.choices
        .map(
          (c, i) =>
            `<div class="bank-choice ${LETTERS[i] === q.answer ? "right" : ""}"><span>${LETTERS[i]}</span>${esc(c)}</div>`,
        )
        .join("")
    : "";
  const answer = mc ? `${q.answer}. ${choiceText(q)}` : q.answer;
  const open = app.bankRevealAll || q.id === app.id ? "open" : "";

  return `<details class="row" data-bank-id="${q.id}" ${open}>
    <summary>
      <span class="c-status">${statusIcon(q)}</span>
      <span class="c-title"><span class="row-id">${q.id}.</span> ${esc(q.question)}</span>
      <span class="c-topic">${esc(q.topic)}</span>
      <span class="c-type ${mc ? "mc" : "sr"}">${mc ? "Multiple choice" : "Short response"}</span>
    </summary>
    <div class="row-details">
      ${choices}
      <div class="model">
        <h3>${mc ? "Correct answer" : "Model response"}</h3>
        <div class="answer-prose">${esc(answer)}</div>
        <h3>${mc ? "Explanation" : "Why this works"}</h3>
        <div class="answer-prose">${esc(q.explanation || q.answer)}</div>
      </div>
      <div class="row-actions">
        <button class="btn btn-sm practice-link" data-target="${q.id}">Practice this question</button>
        <span class="muted">${esc(q.source || "Course review")}</span>
      </div>
    </div>
  </details>`;
}

function progressCardHTML() {
  const c = counts();
  const done = c.mc[0] + c.short[0] + c.code[0];
  const total = c.mc[1] + c.short[1] + c.code[1];
  const pct = total ? Math.round((done * 100) / total) : 0;
  const bar = ([d, t], label, cls) =>
    `<div class="pbar ${cls}"><div class="pbar-head"><span>${label}</span><span><b>${d}</b> / ${t}</span></div><div class="pbar-track"><div style="width:${t ? (d * 100) / t : 0}%"></div></div></div>`;
  return `<div class="card progress-card">
    <div class="ring-big" style="--p:${pct}"><div><b>${done}</b><span>/${total}</span><small>Completed</small></div></div>
    <div class="pbars">${bar(c.mc, "Multiple choice", "easy")}${bar(c.short, "Short response", "medium")}${bar(c.code, "Java coding", "hard")}</div>
  </div>`;
}

function renderBank() {
  const qCount = app.mc.length + app.short.length;
  const topicCount = new Set(items("bank").map((q) => q.topic)).size;
  const header = `<div class="bank-top">
      <div class="bank-intro">
        <div class="kicker">COMPLETE EXPLANATION LIBRARY</div>
        <h1>Every question. Every answer.</h1>
        <p>${qCount} review questions with answer explanations, model short responses, and links to interactive practice. Browse by topic or search across all questions.</p>
        <div class="bank-figures">
          <span><b>${app.mc.length}</b> Multiple choice</span>
          <span><b>${app.short.length}</b> Short response</span>
          <span><b>${topicCount}</b> Topic groups</span>
        </div>
      </div>
      ${progressCardHTML()}
    </div>
    <div class="subtabs" role="tablist">
      <button role="tab" class="${app.bankView === "browse" ? "active" : ""}" data-bank-view="browse">Searchable question bank</button>
      <button role="tab" class="${app.bankView === "pdf" ? "active" : ""}" data-bank-view="pdf">Read PDF in app</button>
      <span class="spacer"></span>
      <a class="btn btn-sm btn-ghost" href="/question-bank.pdf" target="_blank" rel="noopener">${ICON.ext}Open PDF edition</a>
    </div>`;

  if (app.bankView === "pdf") {
    main().innerHTML = `<div class="page">${header}
      <p class="muted pdf-note">Full 43-page question bank, including answer explanations and model responses. Use your browser's PDF controls to navigate or print. <a href="/question-bank.pdf" target="_blank" rel="noopener">Open PDF in a new tab</a></p>
      <iframe class="bank-pdf" src="/question-bank.pdf#toolbar=1" title="Complete question bank PDF"></iframe></div>`;
  } else {
    main().innerHTML = `<div class="page">${header}
      <div class="toolbar">
        ${filtersHTML()}
        <select id="bankKind" aria-label="Question type">
          <option value="all">All questions</option>
          <option value="mc">Multiple choice</option>
          <option value="short">Short response</option>
        </select>
        <span class="spacer"></span>
        <button class="btn btn-sm btn-ghost" id="revealAllBank">${app.bankRevealAll ? "Collapse all answers" : "Expand all answers & explanations"}</button>
      </div>
      <div class="table">
        <div class="table-head"><span>Status</span><span>Question</span><span>Topic</span><span>Type</span></div>
        <div id="bankRows"></div>
      </div>
      <div class="pager" id="bankPager"></div>
      <footer class="page-foot">
        <span>Your answers and code are saved in this browser.</span>
        <span>Independent study tool · not an official OSU testing platform</span>
      </footer></div>`;

    $("bankKind").value = app.bankKind;
    $("bankKind").onchange = (e) => {
      app.bankKind = e.target.value;
      app.bankPage = 0;
      app.id = null;
      renderBankRows();
    };
    $("revealAllBank").onclick = () => {
      app.bankRevealAll = !app.bankRevealAll;
      $("revealAllBank").textContent = app.bankRevealAll ? "Collapse all answers" : "Expand all answers & explanations";
      renderBankRows();
    };
    renderBankRows();
  }

  main()
    .querySelectorAll("[data-bank-view]")
    .forEach(
      (b) =>
        (b.onclick = () => {
          app.bankView = b.dataset.bankView;
          renderBank();
        }),
    );
}

/** Re-render only the table body and pager, so the toolbar keeps focus while typing. */
function renderBankRows() {
  if (!$("bankRows")) return;
  const qs = bankQuestions();
  const pages = Math.max(1, Math.ceil(qs.length / BANK_PAGE_SIZE));
  app.bankPage = Math.min(app.bankPage, pages - 1);
  const start = app.bankPage * BANK_PAGE_SIZE;

  $("bankRows").innerHTML =
    qs.slice(start, start + BANK_PAGE_SIZE).map(bankRowHTML).join("") ||
    '<div class="table-empty">No questions match your filters. Try another topic or search term.</div>';

  const pageButtons = [];
  for (let i = 0; i < pages; i++) {
    if (i === 0 || i === pages - 1 || Math.abs(i - app.bankPage) <= 1) {
      pageButtons.push(`<button class="page-btn ${i === app.bankPage ? "active" : ""}" data-page="${i}">${i + 1}</button>`);
    } else if (pageButtons.at(-1) !== "…") pageButtons.push("…");
  }
  $("bankPager").innerHTML = `<span class="muted">Page ${app.bankPage + 1} of ${pages} · Showing ${qs.length ? start + 1 : 0}–${Math.min(start + BANK_PAGE_SIZE, qs.length)} of ${qs.length} · ${qs.length} matching questions</span>
    <div class="pages">
      <button class="page-btn" data-page="${app.bankPage - 1}" ${app.bankPage === 0 ? "disabled" : ""} aria-label="Previous">‹</button>
      ${pageButtons.map((b) => (b === "…" ? '<span class="ellipsis">…</span>' : b)).join("")}
      <button class="page-btn" data-page="${app.bankPage + 1}" ${app.bankPage >= pages - 1 ? "disabled" : ""} aria-label="Next">›</button>
    </div>`;
}

function onBankClick(e) {
  const pageBtn = e.target.closest("[data-page]");
  if (pageBtn && !pageBtn.disabled) {
    app.bankPage = Number(pageBtn.dataset.page);
    app.id = null;
    renderBankRows();
    window.scrollTo(0, main().querySelector(".toolbar").offsetTop - 70);
    return;
  }
  const practice = e.target.closest(".practice-link");
  if (practice) chooseMode(practice.dataset.target[0] === "M" ? "mc" : "short", practice.dataset.target);
}

/* ------------------------------------------------------------------ *
 * Navigation
 * ------------------------------------------------------------------ */
function render() {
  document.body.dataset.mode = app.mode;
  main().classList.toggle("is-workspace", isPractice());
  renderStats();
  renderList();
  if (app.mode === "home") return renderHome();
  if (app.mode === "bank") return renderBank();
  const q = activeItem();
  if (!q) return;
  if (app.mode === "mc") renderMC(q);
  else if (app.mode === "short") renderShort(q);
  else renderCode(q);
}

function select(id) {
  if (!id) return;
  if (app.mode === "home") {
    app.mode = "bank";
    syncModeButtons();
  }
  const q = items().find((x) => x.id === id);
  if (!q) return;
  app.id = id;
  app.submitted = !!store.completed[q.id] || !!store.checked[q.id];
  app.grade = null;
  if (app.mode === "code" && app.leftTab === "solution") app.leftTab = "description";
  openDrawer(false);

  if (app.mode === "bank") {
    const i = bankQuestions().findIndex((x) => x.id === id);
    if (i >= 0) {
      app.bankPage = Math.floor(i / BANK_PAGE_SIZE);
      app.bankView = "browse";
    }
    render();
    requestAnimationFrame(() =>
      document.querySelector(`[data-bank-id="${id}"]`)?.scrollIntoView({ block: "center", behavior: "smooth" }),
    );
  } else {
    render();
    window.scrollTo(0, 0);
  }
}

function syncModeButtons() {
  document.querySelectorAll(".mode").forEach((x) => x.classList.toggle("active", x.dataset.mode === app.mode));
}

function chooseMode(mode, id = null) {
  app.mode = mode;
  app.id = null;
  app.submitted = false;
  app.grade = null;
  app.leftTab = "description";
  app.bankPage = 0;
  syncModeButtons();
  renderDrawerFilters();
  if (mode === "bank" || mode === "home") {
    render();
    window.scrollTo(0, 0);
  } else {
    renderList();
    select(id || app.filtered[0]?.id || items()[0]?.id);
  }
}

/** Keyboard shortcuts outside text fields: A–D / 1–4 choose, Enter checks, N next, Esc closes the list. */
function onKeyDown(e) {
  if (e.key === "Escape") return openDrawer(false);
  const tag = e.target.tagName;
  if (["INPUT", "TEXTAREA", "SELECT"].includes(tag) || e.ctrlKey || e.metaKey || e.altKey) return;
  const q = activeItem();
  if (!q || !isPractice()) return;
  const key = e.key.toUpperCase();
  if (key === "N") {
    e.preventDefault();
    step(1);
  } else if (app.mode === "mc") {
    const idx = LETTERS.indexOf(key) >= 0 ? LETTERS.indexOf(key) : "1234".indexOf(key);
    if (idx >= 0 && idx < q.choices.length) {
      e.preventDefault();
      chooseOption(q, LETTERS[idx]);
    } else if (key === "ENTER" && (tag !== "BUTTON" || !main().contains(e.target) || e.target.matches(".option"))) {
      e.preventDefault();
      checkMC(q);
    }
  }
}

/* ------------------------------------------------------------------ *
 * Startup
 * ------------------------------------------------------------------ */
async function init() {
  try {
    const getJSON = (url) =>
      fetch(url).then((r) => {
        if (!r.ok) throw Error(`${url} returned ${r.status}`);
        return r.json();
      });
    const [review, problems, status] = await Promise.all([
      getJSON("/api/review"),
      getJSON("/api/problems"),
      getJSON("/api/status"),
    ]);
    app.mc = review.multiple_choice;
    app.short = review.short_response;
    app.code = problems;

    const runtime = $("runtimeStatus");
    runtime.textContent = status.javac ? "Java compiler ready" : "JDK not found";
    runtime.classList.add(status.javac ? "ok" : "bad");
    if (!status.javac) runtime.title = "Install JDK 17+ and put javac on your PATH to use the coding judge.";

    document.querySelectorAll(".mode").forEach((b) => (b.onclick = () => chooseMode(b.dataset.mode)));
    $("brandHome").onclick = () => chooseMode("home");
    $("questionList").addEventListener("click", (e) => {
      const entry = e.target.closest("[data-id]");
      if (entry) select(entry.dataset.id);
    });
    document.addEventListener("input", onFilterInput);
    main().addEventListener("click", onBankClick);
    $("openList").onclick = () => openDrawer(!document.body.classList.contains("drawer-open"));
    $("closeList").onclick = () => openDrawer(false);
    $("drawerBackdrop").onclick = () => openDrawer(false);
    $("prevQ").onclick = () => step(-1);
    $("nextNav").onclick = () => step(1);
    $("shuffle").onclick = () => {
      const pool = app.filtered.length ? app.filtered : items();
      if (pool.length) select(pool[Math.floor(Math.random() * pool.length)].id);
    };
    document.addEventListener("keydown", onKeyDown);

    renderDrawerFilters();
    render();
  } catch (e) {
    main().innerHTML = `<div class="page"><div class="card load-error">
      <h1>Could not load the question bank</h1>
      <p>Start with <code>python app.py</code> in the downloaded folder. Error: ${esc(e.message)}</p>
    </div></div>`;
  }
}

init();

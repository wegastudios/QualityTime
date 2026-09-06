(() => {
  "use strict";

  const USERS_KEY = "qt.users";
  const HISTORY_PREFIX = "qt.history.";
  const FILTERS_OPEN_KEY = "qt.filtersOpen";
  const HISTORY_MAX = 50;
  const KNOWN_ICONS = ["ricordi", "sogni", "valori", "creativita", "curiosita", "emozioni", "lavoro", "percorso", "famiglia"];
  const FALLBACK_ICON = "ricordi";

  // Icona per ogni sezione di domande.csv (per nome esatto della sezione).
  // Aggiungi qui una riga se aggiungi una sezione nuova nel CSV.
  const SECTION_ICONS = {
    "Ricordi e Radici": "ricordi",
    "Passioni ed Esperienze": "sogni",
    "Valori e Visioni": "valori",
    "Gusto e Creatività": "creativita",
    "Curiosità e Immaginazione": "curiosita",
    "L'Amore e i Sentimenti": "emozioni",
    "Il Lavoro e le Realizzazioni": "lavoro",
    "La Vita e il Percorso Personale": "percorso",
    "Famiglia": "famiglia",
  };

  const els = {
    homeView: document.getElementById("homeView"),
    gameView: document.getElementById("gameView"),
    addUserForm: document.getElementById("addUserForm"),
    newUserName: document.getElementById("newUserName"),
    userList: document.getElementById("userList"),
    usersEmpty: document.getElementById("usersEmpty"),
    backBtn: document.getElementById("backBtn"),
    currentName: document.getElementById("currentName"),
    category: document.getElementById("category"),
    catUse: document.getElementById("catUse"),
    catName: document.getElementById("catName"),
    question: document.getElementById("question"),
    counter: document.getElementById("counter"),
    drawBtn: document.getElementById("drawBtn"),
    filters: document.getElementById("filters"),
    filtersToggle: document.getElementById("filtersToggle"),
    filtersBody: document.getElementById("filtersBody"),
    filtersCount: document.getElementById("filtersCount"),
    sectionChips: document.getElementById("sectionChips"),
    allSectionsBtn: document.getElementById("allSectionsBtn"),
    sectionsWarn: document.getElementById("sectionsWarn"),
    historyBtn: document.getElementById("historyBtn"),
    panel: document.getElementById("historyPanel"),
    closeHistoryBtn: document.getElementById("closeHistoryBtn"),
    clearHistoryBtn: document.getElementById("clearHistoryBtn"),
    historyList: document.getElementById("historyList"),
    historyEmpty: document.getElementById("historyEmpty"),
    scrim: document.getElementById("scrim"),
  };

  let sections = [];        // [{id, nome, icona, domande:[...]}]
  let allQuestions = [];     // [{text, secId, secNome, icona}]
  let sectionById = {};      // id -> sezione
  let activeSections = new Set();
  let lastText = "";
  let currentId = null;
  let currentUser = null;
  let history = [];

  /* ---------- Archiviazione ---------- */
  function readJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      const parsed = raw ? JSON.parse(raw) : fallback;
      return parsed == null ? fallback : parsed;
    } catch (_) {
      return fallback;
    }
  }

  function writeJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (_) {}
  }

  function loadUsers() {
    const list = readJSON(USERS_KEY, []);
    return Array.isArray(list) ? list : [];
  }

  function saveUsers(list) {
    writeJSON(USERS_KEY, list);
  }

  function persistCurrentUser() {
    if (!currentUser) return;
    const users = loadUsers();
    const idx = users.findIndex((u) => u.id === currentUser.id);
    if (idx >= 0) {
      users[idx] = currentUser;
      saveUsers(users);
    }
  }

  function historyKey(id) {
    return HISTORY_PREFIX + id;
  }

  function newId() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return "u" + Date.now() + Math.random().toString(16).slice(2);
  }

  /* ---------- Domande e sezioni (da domande.csv) ---------- */
  function slug(str) {
    const accents = { à: "a", á: "a", è: "e", é: "e", ì: "i", í: "i", î: "i", ò: "o", ó: "o", ù: "u", ú: "u", ç: "c" };
    return String(str)
      .toLowerCase()
      .replace(/[àáèéìíîòóùúç]/g, (c) => accents[c] || c)
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "sezione";
  }

  // Decodifica un file di testo provando prima UTF-8 e poi Windows-1252
  // (Excel in italiano spesso salva i CSV in ANSI/Windows-1252).
  function decodeText(buffer) {
    let text = new TextDecoder("utf-8").decode(buffer);
    if (text.includes("�")) {
      try {
        text = new TextDecoder("windows-1252").decode(buffer);
      } catch (_) {}
    }
    return text.replace(/^﻿/, "");
  }

  // Parser CSV minimale: gestisce virgolette " e campi con il delimitatore dentro.
  function parseCSV(text, delimiter) {
    const rows = [];
    let row = [];
    let field = "";
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (inQuotes) {
        if (c === '"') {
          if (text[i + 1] === '"') { field += '"'; i++; }
          else inQuotes = false;
        } else field += c;
      } else if (c === '"') {
        inQuotes = true;
      } else if (c === delimiter) {
        row.push(field); field = "";
      } else if (c === "\n" || c === "\r") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        row.push(field); field = "";
        if (row.some((v) => v !== "")) rows.push(row);
        row = [];
      } else {
        field += c;
      }
    }
    if (field !== "" || row.length) {
      row.push(field);
      if (row.some((v) => v !== "")) rows.push(row);
    }
    return rows;
  }

  async function loadQuestions() {
    sections = [];
    try {
      const res = await fetch("domande.csv", { cache: "no-cache" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const text = decodeText(await res.arrayBuffer());
      const firstLine = text.split(/\r?\n/, 1)[0] || "";
      const delimiter = (firstLine.split(";").length > firstLine.split(",").length) ? ";" : ",";
      const rows = parseCSV(text, delimiter);
      if (rows.length) rows.shift(); // via l'intestazione

      const byName = new Map(); // nome sezione -> {id, nome, icona, domande[]}
      for (const cols of rows) {
        const nome = (cols[0] || "").trim();
        const domanda = (cols[2] || "").trim();
        const iconaCsv = (cols[3] || "").trim();
        if (!nome || !domanda) continue;
        if (!byName.has(nome)) {
          const icona = KNOWN_ICONS.includes(iconaCsv)
            ? iconaCsv
            : (SECTION_ICONS[nome] || FALLBACK_ICON);
          byName.set(nome, { id: slug(nome), nome, icona, domande: [] });
        }
        byName.get(nome).domande.push(domanda);
      }
      sections = [...byName.values()].filter((s) => s.domande.length > 0);
    } catch (err) {
      sections = [];
      console.error("Impossibile caricare domande.csv:", err);
    }

    sectionById = {};
    allQuestions = [];
    for (const s of sections) {
      sectionById[s.id] = s;
      for (const text of s.domande) {
        allQuestions.push({ text, secId: s.id, secNome: s.nome, icona: s.icona });
      }
    }
  }

  function defaultSectionIds() {
    return sections.map((s) => s.id);
  }

  function pool() {
    return allQuestions.filter((q) => activeSections.has(q.secId));
  }

  function pickQuestion() {
    const p = pool();
    if (p.length === 0) return null;
    if (p.length === 1) return p[0];
    let q = null;
    do {
      q = p[Math.floor(Math.random() * p.length)];
    } while (q.text === lastText);
    return q;
  }

  /* ---------- Formattazione date ---------- */
  function relativeDay(ts) {
    if (!ts) return "";
    const day = 86400000;
    const startOf = (d) => {
      const x = new Date(d);
      x.setHours(0, 0, 0, 0);
      return x.getTime();
    };
    const diff = Math.round((startOf(Date.now()) - startOf(ts)) / day);
    if (diff <= 0) return "oggi";
    if (diff === 1) return "ieri";
    if (diff < 7) return diff + " giorni fa";
    if (diff < 14) return "una settimana fa";
    if (diff < 31) return Math.floor(diff / 7) + " settimane fa";
    return new Date(ts).toLocaleDateString("it-IT");
  }

  /* ---------- Schermata iniziale ---------- */
  function renderUsers() {
    const users = loadUsers().sort(
      (a, b) => (b.lastPlayedAt || 0) - (a.lastPlayedAt || 0)
    );
    els.userList.innerHTML = "";
    els.usersEmpty.hidden = users.length > 0;

    const frag = document.createDocumentFragment();
    for (const user of users) {
      const count = (readJSON(historyKey(user.id), []) || []).length;
      const li = document.createElement("li");

      const open = document.createElement("button");
      open.type = "button";
      open.className = "user-open";
      open.innerHTML = '<span class="user-name"></span><span class="user-meta"></span>';
      open.querySelector(".user-name").textContent = user.name;
      const bits = [count === 1 ? "1 domanda" : count + " domande"];
      if (user.lastPlayedAt) bits.push("ultima volta " + relativeDay(user.lastPlayedAt));
      open.querySelector(".user-meta").textContent = bits.join(" · ");
      open.addEventListener("click", () => startSession(user.id));

      const del = document.createElement("button");
      del.type = "button";
      del.className = "icon-btn delete-user";
      del.setAttribute("aria-label", "Elimina " + user.name);
      del.innerHTML =
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16"/><path d="M10 4h4M7 7l1 13h8l1-13"/><path d="M10 11v6M14 11v6"/></svg>';
      del.addEventListener("click", (e) => {
        e.stopPropagation();
        deleteUser(user.id, user.name);
      });

      li.append(open, del);
      frag.appendChild(li);
    }
    els.userList.appendChild(frag);
  }

  function addUser(name) {
    const clean = name.trim().replace(/\s+/g, " ");
    if (!clean) return;
    const users = loadUsers();
    const existing = users.find((u) => u.name.toLowerCase() === clean.toLowerCase());
    if (existing) {
      startSession(existing.id);
      return;
    }
    const now = Date.now();
    const user = {
      id: newId(),
      name: clean,
      createdAt: now,
      lastPlayedAt: now,
      sections: defaultSectionIds(),
    };
    users.push(user);
    saveUsers(users);
    els.newUserName.value = "";
    startSession(user.id);
  }

  function deleteUser(id, name) {
    if (!window.confirm('Eliminare "' + name + '" e tutta la sua cronologia?\nL\'operazione non si può annullare.')) return;
    const users = loadUsers().filter((u) => u.id !== id);
    saveUsers(users);
    try {
      localStorage.removeItem(historyKey(id));
    } catch (_) {}
    if (currentId === id) {
      currentId = null;
      currentUser = null;
    }
    renderUsers();
  }

  /* ---------- Sessione di gioco ---------- */
  function startSession(id) {
    const users = loadUsers();
    const user = users.find((u) => u.id === id);
    if (!user) {
      renderUsers();
      return;
    }
    user.lastPlayedAt = Date.now();

    // Normalizza le sezioni salvate nel profilo rispetto all'archivio attuale
    const valid = new Set(defaultSectionIds());
    let saved = Array.isArray(user.sections) ? user.sections.filter((s) => valid.has(s)) : null;
    if (!saved || saved.length === 0) saved = defaultSectionIds();
    user.sections = saved;
    saveUsers(users);

    currentId = id;
    currentUser = user;
    activeSections = new Set(saved);
    history = readJSON(historyKey(id), []) || [];
    lastText = "";

    els.currentName.textContent = user.name;
    els.category.hidden = true;
    els.question.textContent = "Premi il pulsante per iniziare.";
    renderSections();
    updatePoolState();

    els.homeView.hidden = true;
    els.gameView.hidden = false;
    window.scrollTo(0, 0);
  }

  function exitSession() {
    closePanels();
    els.gameView.hidden = true;
    els.homeView.hidden = false;
    renderUsers();
  }

  function updatePoolState() {
    const n = pool().length;
    const noSection = activeSections.size === 0;
    els.drawBtn.disabled = n === 0;
    els.sectionsWarn.hidden = !noSection;
    if (allQuestions.length === 0) {
      els.counter.textContent = "";
    } else if (noSection) {
      els.counter.textContent = "Nessuna sezione selezionata";
    } else {
      els.counter.textContent =
        "Estratte: " + history.length + " · In gioco: " + n + " domande";
    }
    els.filtersCount.textContent = activeSections.size + "/" + sections.length;
    const allOn = sections.length > 0 && activeSections.size === sections.length;
    els.allSectionsBtn.textContent = allOn ? "Nessuna" : "Tutte";
  }

  function setFiltersOpen(open) {
    els.filtersBody.hidden = !open;
    els.filtersToggle.setAttribute("aria-expanded", String(open));
    els.filtersToggle.querySelector(".ft-sign").textContent = open ? "−" : "+";
    try {
      localStorage.setItem(FILTERS_OPEN_KEY, open ? "1" : "0");
    } catch (_) {}
  }

  function showText(text) {
    els.question.classList.add("swap");
    els.category.classList.add("swap");
    window.setTimeout(() => {
      els.question.textContent = text;
      els.question.classList.remove("swap");
      els.category.classList.remove("swap");
    }, 180);
  }

  function setCategory(icona, nome) {
    els.catUse.setAttribute("href", "#i-" + icona);
    els.catName.textContent = nome;
    els.category.hidden = false;
  }

  function draw() {
    const q = pickQuestion();
    if (!q) {
      els.category.hidden = true;
      showText(
        allQuestions.length === 0
          ? "Archivio non disponibile. Apri l'app dalla versione pubblicata online."
          : "Seleziona almeno una sezione per pescare una domanda."
      );
      return;
    }
    lastText = q.text;
    setCategory(q.icona, q.secNome);
    showText(q.text);
    history.unshift({ text: q.text, at: Date.now(), sec: q.secId, icona: q.icona });
    if (history.length > HISTORY_MAX) history.length = HISTORY_MAX;
    if (currentId) writeJSON(historyKey(currentId), history);
    updatePoolState();
    renderHistory();
  }

  /* ---------- Filtro sezioni (sempre visibile) ---------- */
  function renderSections() {
    els.filters.hidden = sections.length < 2;
    els.sectionChips.innerHTML = "";
    const frag = document.createDocumentFragment();
    for (const s of sections) {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "chip";
      chip.setAttribute("aria-pressed", String(activeSections.has(s.id)));
      chip.innerHTML =
        '<svg class="chip-ic" aria-hidden="true"><use href="#i-' + s.icona + '"/></svg><span></span>';
      chip.querySelector("span").textContent = s.nome;
      chip.addEventListener("click", () => {
        const on = chip.getAttribute("aria-pressed") !== "true";
        chip.setAttribute("aria-pressed", String(on));
        toggleSection(s.id, on);
      });
      frag.appendChild(chip);
    }
    els.sectionChips.appendChild(frag);
  }

  function toggleSection(id, on) {
    if (on) activeSections.add(id);
    else activeSections.delete(id);
    if (currentUser) {
      currentUser.sections = [...activeSections];
      persistCurrentUser();
    }
    updatePoolState();
  }

  function toggleAllSections() {
    const allOn = activeSections.size === sections.length;
    activeSections = allOn ? new Set() : new Set(defaultSectionIds());
    if (currentUser) {
      currentUser.sections = [...activeSections];
      persistCurrentUser();
    }
    renderSections();
    updatePoolState();
  }

  /* ---------- Cronologia ---------- */
  function renderHistory() {
    els.historyList.innerHTML = "";
    els.historyEmpty.hidden = history.length > 0;
    const frag = document.createDocumentFragment();
    for (const entry of history) {
      const li = document.createElement("li");
      const icona = KNOWN_ICONS.includes(entry.icona) ? entry.icona : null;
      if (icona) {
        li.innerHTML =
          '<svg class="hist-icon" aria-hidden="true"><use href="#i-' + icona + '"/></svg>';
      }
      li.appendChild(document.createTextNode(entry.text));
      frag.appendChild(li);
    }
    els.historyList.appendChild(frag);
  }

  function clearHistory() {
    if (history.length === 0) return;
    if (!window.confirm("Vuoi svuotare la cronologia di questa persona?")) return;
    history = [];
    if (currentId) writeJSON(historyKey(currentId), history);
    updatePoolState();
    renderHistory();
  }

  /* ---------- Pannelli ---------- */
  function openHistory() {
    renderHistory();
    els.panel.hidden = false;
    els.scrim.hidden = false;
  }

  function closePanels() {
    els.panel.hidden = true;
    els.scrim.hidden = true;
  }

  /* ---------- Eventi ---------- */
  els.addUserForm.addEventListener("submit", (e) => {
    e.preventDefault();
    addUser(els.newUserName.value);
  });
  els.backBtn.addEventListener("click", exitSession);
  els.drawBtn.addEventListener("click", draw);
  els.allSectionsBtn.addEventListener("click", toggleAllSections);
  els.filtersToggle.addEventListener("click", () => setFiltersOpen(els.filtersBody.hidden));
  els.historyBtn.addEventListener("click", openHistory);
  els.closeHistoryBtn.addEventListener("click", closePanels);
  els.scrim.addEventListener("click", closePanels);
  els.clearHistoryBtn.addEventListener("click", clearHistory);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closePanels();
  });

  /* ---------- Avvio ---------- */
  let filtersOpen = false;
  try {
    filtersOpen = localStorage.getItem(FILTERS_OPEN_KEY) === "1";
  } catch (_) {}
  setFiltersOpen(filtersOpen);

  renderUsers();
  loadQuestions().then(() => {
    if (!els.gameView.hidden && currentUser) {
      const valid = new Set(defaultSectionIds());
      const saved = (currentUser.sections || []).filter((s) => valid.has(s));
      activeSections = new Set(saved.length ? saved : defaultSectionIds());
      renderSections();
      updatePoolState();
    }
  });

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("service-worker.js").catch(() => {});
    });
  }
})();

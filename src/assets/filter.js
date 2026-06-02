(function () {
  "use strict";

  // ---- Filtering ----------------------------------------------------------
  // Active filters: each type holds a Set of selected values. An entry is shown
  // when, for every type that has selections, the entry matches at least one
  // (AND across types, OR within a type).
  var active = { section: new Set(), region: new Set(), status: new Set() };
  var entries = Array.prototype.slice.call(document.querySelectorAll(".entry[data-section]"));
  var sectionBlocks = Array.prototype.slice.call(document.querySelectorAll("[data-section-block]"));
  var countEl = document.getElementById("result-count");

  function matches(entry) {
    return Object.keys(active).every(function (type) {
      var sel = active[type];
      if (sel.size === 0) return true;
      return sel.has(entry.getAttribute("data-" + type));
    });
  }

  function apply() {
    var visible = 0;
    entries.forEach(function (entry) {
      var show = matches(entry);
      entry.style.display = show ? "" : "none";
      if (show) visible++;
    });

    // Hide a whole section block if it has no visible entries AND a section
    // filter is active that excludes it. Otherwise keep the heading for context.
    sectionBlocks.forEach(function (block) {
      var key = block.getAttribute("data-section-block");
      var sectionFilterOn = active.section.size > 0;
      if (sectionFilterOn && !active.section.has(key)) {
        block.style.display = "none";
      } else {
        block.style.display = "";
      }
    });

    if (countEl) {
      var anyFilter = active.section.size || active.region.size || active.status.size;
      countEl.textContent = anyFilter
        ? visible + " " + (visible === 1 ? "entry" : "entries") + " shown"
        : entries.length + " entries total";
    }
  }

  document.querySelectorAll(".chip[data-filter]").forEach(function (chip) {
    chip.addEventListener("click", function () {
      var type = chip.getAttribute("data-filter");
      var value = chip.getAttribute("data-value");
      if (active[type].has(value)) {
        active[type].delete(value);
        chip.classList.remove("active");
      } else {
        active[type].add(value);
        chip.classList.add("active");
      }
      apply();
    });
  });

  var clearBtn = document.getElementById("clear-filters");
  if (clearBtn) {
    clearBtn.addEventListener("click", function (e) {
      e.preventDefault();
      Object.keys(active).forEach(function (t) { active[t].clear(); });
      document.querySelectorAll(".chip.active").forEach(function (c) { c.classList.remove("active"); });
      apply();
    });
  }

  apply(); // initialize count

  // ---- Contact form (AJAX, so no page redirect) ---------------------------
  var form = document.getElementById("suggest-form");
  if (form) {
    var statusEl = document.getElementById("form-status");
    var btn = document.getElementById("submit-btn");
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      // Honeypot: if the hidden box is checked, silently pretend success.
      if (form.botcheck && form.botcheck.checked) {
        statusEl.textContent = "Thanks — received.";
        form.reset();
        return;
      }
      btn.disabled = true;
      statusEl.textContent = "Sending…";
      var data = new FormData(form);
      fetch("https://api.web3forms.com/submit", { method: "POST", body: data })
        .then(function (r) { return r.json(); })
        .then(function (json) {
          if (json.success) {
            statusEl.textContent = "Thank you. Your suggestion was received.";
            statusEl.style.color = "var(--ink)";
            form.reset();
          } else {
            statusEl.textContent = "Something went wrong. Please try again later.";
            statusEl.style.color = "var(--red)";
          }
        })
        .catch(function () {
          statusEl.textContent = "Network error. Please try again later.";
          statusEl.style.color = "var(--red)";
        })
        .finally(function () { btn.disabled = false; });
    });
  }
})();

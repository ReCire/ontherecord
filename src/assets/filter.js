(function () {
  "use strict";

  // =========================================================================
  // SCORING WEIGHTS — edit here to retune relevance
  // =========================================================================
  var W = {
    TITLE_PHRASE:  100, // full query is a substring of title
    TITLE_TOKEN:    25, // each token found in title
    TITLE_STARTS:   10, // bonus: title starts with a token
    TAG_TOKEN:       8, // each token found in tag
    SECTION_TOKEN:   5, // each token found in section label
    BODY_TOKEN:      2, // each token found in body (once per token)
  };

  // =========================================================================
  // STATE
  // =========================================================================
  var active  = { section: new Set(), region: new Set(), status: new Set() };
  var query   = "";                 // current search query string
  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  // section collapse state: key → true (expanded) | false (collapsed)
  var sectionExpanded = {};

  // =========================================================================
  // DOM REFERENCES
  // =========================================================================
  var entryEls      = Array.prototype.slice.call(document.querySelectorAll(".entry[data-section]"));
  var sectionBlocks = Array.prototype.slice.call(document.querySelectorAll("[data-section-block]"));
  var countEl       = document.getElementById("result-count");
  var activeHint    = document.getElementById("active-hint");
  var searchInput   = document.getElementById("search-input");
  var searchClear   = document.getElementById("search-clear");

  // =========================================================================
  // SEARCH INDEX — built once, never re-read DOM per keystroke
  // =========================================================================
  var index = entryEls.map(function (el) {
    var titleEl   = el.querySelector("h3");
    var tagEl     = el.querySelector(".tag");
    var bodyEl    = el.querySelector(".body");
    var sectionBlock = el.closest ? el.closest("[data-section-block]")
                      : (function () {
                          var p = el.parentNode;
                          while (p && !p.getAttribute("data-section-block")) p = p.parentNode;
                          return p;
                        })();

    var titleRaw  = titleEl  ? titleEl.textContent  : "";
    var tagRaw    = tagEl    ? tagEl.textContent     : "";
    var bodyRaw   = bodyEl   ? bodyEl.textContent    : "";
    var sectionLabel = sectionBlock ? (sectionBlock.getAttribute("data-section-label") || "") : "";

    // Strip the tag text from the title text so it doesn't double-score
    var titleClean = titleRaw.replace(tagRaw, "").trim();

    return {
      el:           el,
      title:        titleClean.toLowerCase(),
      titleRaw:     titleClean,         // for highlighting (preserves case)
      tag:          tagRaw.toLowerCase(),
      sectionLabel: sectionLabel.toLowerCase(),
      sectionLabelRaw: sectionLabel,
      body:         bodyRaw.toLowerCase(),
      originalIndex: 0,                 // set after map
    };
  });
  // Store original document order
  index.forEach(function (r, i) { r.originalIndex = i; });

  // =========================================================================
  // FACET FILTER
  // =========================================================================
  function matchesFacets(el) {
    return Object.keys(active).every(function (type) {
      var sel = active[type];
      if (sel.size === 0) return true;
      return sel.has(el.getAttribute("data-" + type));
    });
  }

  // =========================================================================
  // SEARCH SCORING
  // =========================================================================
  function score(rec, tokens) {
    if (!tokens.length) return 1; // no query — passes with neutral score

    var s = 0;
    var titleLC = rec.title;
    var tagLC   = rec.tag;
    var secLC   = rec.sectionLabel;
    var bodyLC  = rec.body;

    // Every token must match somewhere (AND semantics). Bail early if any miss.
    var fullHaystack = titleLC + " " + tagLC + " " + secLC + " " + bodyLC;
    for (var i = 0; i < tokens.length; i++) {
      if (fullHaystack.indexOf(tokens[i]) === -1) return 0;
    }

    // Full phrase bonus (title)
    var fullQuery = tokens.join(" ");
    if (titleLC.indexOf(fullQuery) !== -1) s += W.TITLE_PHRASE;

    // Per-token scoring
    for (var j = 0; j < tokens.length; j++) {
      var t = tokens[j];
      if (titleLC.indexOf(t) !== -1) {
        s += W.TITLE_TOKEN;
        if (titleLC.indexOf(t) === 0) s += W.TITLE_STARTS;
      }
      if (tagLC.indexOf(t)   !== -1) s += W.TAG_TOKEN;
      if (secLC.indexOf(t)   !== -1) s += W.SECTION_TOKEN;
      if (bodyLC.indexOf(t)  !== -1) s += W.BODY_TOKEN;
    }

    return s;
  }

  // =========================================================================
  // HIGHLIGHT — safe text-node walker, never innerHTML raw user input
  // =========================================================================
  function escapeRe(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  // Wrap matched substrings in <mark> inside a single text node.
  // Returns a DocumentFragment.
  function highlightText(text, tokens) {
    if (!tokens.length) {
      return document.createTextNode(text);
    }
    var pattern = new RegExp("(" + tokens.map(escapeRe).join("|") + ")", "gi");
    var frag = document.createDocumentFragment();
    var last = 0;
    var m;
    while ((m = pattern.exec(text)) !== null) {
      if (m.index > last) {
        frag.appendChild(document.createTextNode(text.slice(last, m.index)));
      }
      var mark = document.createElement("mark");
      mark.textContent = m[0];
      frag.appendChild(mark);
      last = m.index + m[0].length;
    }
    if (last < text.length) {
      frag.appendChild(document.createTextNode(text.slice(last)));
    }
    return frag;
  }

  // Apply / remove highlights in a single h3 (title only).
  // We store the original textContent on the element to restore it cleanly.
  function applyHighlight(rec, tokens) {
    var h3 = rec.el.querySelector("h3");
    if (!h3) return;

    // Always restore from stored original first
    if (!rec._origH3HTML) rec._origH3HTML = h3.innerHTML;
    h3.innerHTML = rec._origH3HTML;

    if (!tokens.length) return;

    // Only highlight the title text node (the last child or main text),
    // not the <span class="tag"> part
    var tagSpan = h3.querySelector(".tag");
    var textNode = null;

    // Find the text node that is the title (not inside .tag)
    for (var i = h3.childNodes.length - 1; i >= 0; i--) {
      var n = h3.childNodes[i];
      if (n.nodeType === 3 && n.textContent.trim()) { textNode = n; break; }
    }
    if (!textNode) return;

    var original = textNode.textContent;
    var frag = highlightText(original, tokens);
    h3.replaceChild(frag, textNode);
  }

  function clearAllHighlights() {
    index.forEach(function (rec) {
      if (rec._origH3HTML) {
        var h3 = rec.el.querySelector("h3");
        if (h3) h3.innerHTML = rec._origH3HTML;
      }
    });
  }

  // =========================================================================
  // EMPTY STATE
  // =========================================================================
  var emptyState = (function () {
    var el = document.createElement("p");
    el.id = "search-empty";
    el.className = "search-empty";
    el.style.display = "none";
    // Content set dynamically
    document.querySelector(".wrap").appendChild(el);
    return el;
  })();

  function showEmpty(q) {
    emptyState.style.display = "";
    emptyState.innerHTML = "No entries match \u201c" + q.replace(/</g, "&lt;") + "\u201d. "
      + "<a href='#' id='empty-clear'>Try fewer words or clear search.</a>";
    var lnk = document.getElementById("empty-clear");
    if (lnk) lnk.addEventListener("click", function (e) { e.preventDefault(); clearSearch(); });
  }

  function hideEmpty() {
    emptyState.style.display = "none";
  }

  // =========================================================================
  // SECTION COLLAPSE — toggle a single section open/closed
  // =========================================================================
  function setSectionExpanded(block, expanded) {
    var key     = block.getAttribute("data-section-block");
    var head    = block.querySelector("[data-sec-toggle]");
    var content = block.querySelector(".sec-content");
    sectionExpanded[key] = expanded;
    if (head)    head.setAttribute("aria-expanded", expanded ? "true" : "false");
    if (content) {
      if (expanded) { content.removeAttribute("hidden"); }
      else          { content.setAttribute("hidden", ""); }
    }
  }

  // Force a section open (called by render when it has visible entries)
  function ensureSectionOpen(block) {
    var key = block.getAttribute("data-section-block");
    if (!sectionExpanded[key]) setSectionExpanded(block, true);
  }

  // Wire toggle click + keyboard on every [data-sec-toggle] head
  sectionBlocks.forEach(function (block) {
    var key  = block.getAttribute("data-section-block");
    var head = block.querySelector("[data-sec-toggle]");
    sectionExpanded[key] = true; // default: expanded
    if (!head) return;
    function toggle() {
      setSectionExpanded(block, !sectionExpanded[key]);
      updateExpandAllLabel();
    }
    head.addEventListener("click", toggle);
    head.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); }
    });
  });

  // =========================================================================
  // EXPAND-ALL / COLLAPSE-ALL CONTROL
  // =========================================================================
  var expandAllBtn = document.getElementById("expand-all");

  function updateExpandAllLabel() {
    if (!expandAllBtn) return;
    var anyCollapsed = sectionBlocks.some(function (b) {
      return !sectionExpanded[b.getAttribute("data-section-block")];
    });
    // Label describes the ACTION (what clicking will do) — if any collapsed,
    // clicking will expand all; otherwise clicking will collapse all.
    if (anyCollapsed) {
      expandAllBtn.textContent = "Expand all";
      expandAllBtn.setAttribute("aria-label", "Expand all sections");
    } else {
      expandAllBtn.textContent = "Collapse all";
      expandAllBtn.setAttribute("aria-label", "Collapse all sections");
    }
  }

  if (expandAllBtn) {
    expandAllBtn.addEventListener("click", function () {
      var anyCollapsed = sectionBlocks.some(function (b) {
        return !sectionExpanded[b.getAttribute("data-section-block")];
      });
      // If any are collapsed → expand all; else collapse all
      sectionBlocks.forEach(function (b) { setSectionExpanded(b, anyCollapsed); });
      updateExpandAllLabel();
    });
  }

  // =========================================================================
  // FLAT-RESULTS MODE — hides section headers & pullquotes during search
  // =========================================================================
  function enterFlatMode() {
    sectionBlocks.forEach(function (block) {
      block.setAttribute("data-flat", "1");
      // Ensure content is visible while in flat mode (collapsed sections
      // would hide matching entries otherwise)
      var content = block.querySelector(".sec-content");
      if (content) content.removeAttribute("hidden");
    });
    document.querySelectorAll(".sec-head").forEach(function (el) {
      el.setAttribute("data-hidden-search", "1");
      el.style.display = "none";
    });
  }

  function exitFlatMode() {
    sectionBlocks.forEach(function (block) {
      block.removeAttribute("data-flat");
      // Restore each section's collapsed state
      var key = block.getAttribute("data-section-block");
      var content = block.querySelector(".sec-content");
      if (content) {
        if (sectionExpanded[key]) { content.removeAttribute("hidden"); }
        else                      { content.setAttribute("hidden", ""); }
      }
    });
    document.querySelectorAll("[data-hidden-search]").forEach(function (el) {
      el.removeAttribute("data-hidden-search");
      el.style.display = "";
    });
  }

  // =========================================================================
  // SECTION EYEBROW — small label showing section name on cards in flat mode
  // =========================================================================
  function ensureEyebrow(rec) {
    if (rec.el.querySelector(".entry-section-eyebrow")) return;
    var eyebrow = document.createElement("span");
    eyebrow.className = "entry-section-eyebrow";
    eyebrow.textContent = rec.sectionLabelRaw;
    rec.el.insertBefore(eyebrow, rec.el.firstChild);
  }

  function removeEyebrow(rec) {
    var eb = rec.el.querySelector(".entry-section-eyebrow");
    if (eb) eb.parentNode.removeChild(eb);
  }

  // =========================================================================
  // FLIP REORDER — single-reflow DOM reorder with optional animation
  // =========================================================================
  function reorderEntries(orderedEls) {
    // We need a common parent to insert into.
    // In grouped mode all entries are in their section blocks;
    // in flat/search mode we move them all into the first section block
    // (which is still in the DOM), in score order.
    // Strategy: collect pre positions, move nodes, apply inverted transforms.

    var rects = {};
    var vph = window.innerHeight;

    if (!reducedMotion) {
      orderedEls.forEach(function (el) {
        var r = el.getBoundingClientRect();
        // Only FLIP elements near the viewport (±1 screen) for 60fps
        if (r.bottom > -vph && r.top < vph * 2) {
          rects[el] = { top: r.top, left: r.left };
        }
      });
    }

    // Move all entries into a fragment in order, then re-insert after sec-head
    // of the first visible section block
    var targetBlock = sectionBlocks[0];
    if (!targetBlock) return;

    var frag = document.createDocumentFragment();
    orderedEls.forEach(function (el) { frag.appendChild(el); });
    // Insert after sec-head
    var secHead = targetBlock.querySelector(".sec-head");
    if (secHead && secHead.nextSibling) {
      targetBlock.insertBefore(frag, secHead.nextSibling);
    } else {
      targetBlock.appendChild(frag);
    }

    if (!reducedMotion && Object.keys(rects).length) {
      orderedEls.forEach(function (el) {
        if (!rects[el]) return;
        var newR = el.getBoundingClientRect();
        var dy = rects[el].top - newR.top;
        var dx = rects[el].left - newR.left;
        if (dy === 0 && dx === 0) return;
        el.style.transition = "none";
        el.style.transform  = "translate(" + dx + "px," + dy + "px)";
        // Force reflow
        el.getBoundingClientRect(); // eslint-disable-line no-unused-expressions
        el.style.transition = "transform 180ms ease";
        el.style.transform  = "";
        el.addEventListener("transitionend", function onEnd() {
          el.style.transition = "";
          el.removeEventListener("transitionend", onEnd);
        });
      });
    }
  }

  // Restore original DOM order (back to grouped layout)
  function restoreOrder() {
    // Sort index by originalIndex, put each entry back in its section block
    var bySection = {};
    index.forEach(function (rec) {
      var key = rec.el.getAttribute("data-section");
      if (!bySection[key]) bySection[key] = [];
      bySection[key].push(rec);
    });

    sectionBlocks.forEach(function (block) {
      var key = block.getAttribute("data-section-block");
      var recs = bySection[key];
      if (!recs) return;
      recs.sort(function (a, b) { return a.originalIndex - b.originalIndex; });
      var frag = document.createDocumentFragment();
      recs.forEach(function (r) { frag.appendChild(r.el); });
      var secHead = block.querySelector(".sec-head");
      if (secHead && secHead.nextSibling) {
        block.insertBefore(frag, secHead.nextSibling);
      } else {
        block.appendChild(frag);
      }
    });
  }

  // =========================================================================
  // URL SYNC
  // =========================================================================
  function syncUrl(q) {
    if (!history.replaceState) return;
    var url = window.location.pathname + (q ? "?q=" + encodeURIComponent(q) : "");
    history.replaceState(null, "", url);
  }

  function readUrlQuery() {
    var m = window.location.search.match(/[?&]q=([^&]*)/);
    return m ? decodeURIComponent(m[1].replace(/\+/g, " ")) : "";
  }

  // =========================================================================
  // CORE RENDER — single path for both facets and search
  // =========================================================================
  var _searchActive = false;

  function render() {
    var tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    var hasQuery = tokens.length > 0;

    // -- Compute scores & visibility
    var results = [];
    index.forEach(function (rec) {
      var passesFacets = matchesFacets(rec.el);
      var s = hasQuery ? score(rec, tokens) : 1;
      var visible = passesFacets && s > 0;
      rec._score   = s;
      rec._visible = visible;
    });

    // -- Switch layout mode
    if (hasQuery && !_searchActive) {
      _searchActive = true;
      enterFlatMode();
    } else if (!hasQuery && _searchActive) {
      _searchActive = false;
      exitFlatMode();
      restoreOrder();
      index.forEach(function (rec) { removeEyebrow(rec); });
      clearAllHighlights();
    }

    if (hasQuery) {
      // Flat mode: sort visible by score desc, originalIndex asc (stable)
      var visible = index.filter(function (r) { return r._visible; });
      visible.sort(function (a, b) {
        return b._score - a._score || a.originalIndex - b.originalIndex;
      });

      // Show/hide + eyebrows + highlights
      index.forEach(function (rec) {
        rec.el.style.display = rec._visible ? "" : "none";
        if (rec._visible) {
          ensureEyebrow(rec);
          applyHighlight(rec, tokens);
        } else {
          removeEyebrow(rec);
          applyHighlight(rec, []); // restore
        }
      });

      // Reorder visible entries in DOM
      if (visible.length) {
        reorderEntries(visible.map(function (r) { return r.el; }));
      }

      // Section blocks: show first block as container, hide rest
      sectionBlocks.forEach(function (block, i) {
        block.style.display = i === 0 ? "" : "none";
      });

      // Empty state
      if (visible.length === 0) {
        showEmpty(query.trim());
      } else {
        hideEmpty();
      }

    } else {
      // Grouped mode
      var totalVisible = 0;
      sectionBlocks.forEach(function (block) {
        var key = block.getAttribute("data-section-block");
        var sectionFilterOn = active.section.size > 0;
        if (sectionFilterOn && !active.section.has(key)) {
          block.style.display = "none";
        } else {
          block.style.display = "";
          // Count visible entries in this block
          var blockVisible = 0;
          index.forEach(function (rec) {
            if (rec.el.getAttribute("data-section") === key) {
              rec.el.style.display = rec._visible ? "" : "none";
              if (rec._visible) { blockVisible++; totalVisible++; }
            }
          });
          // Task 3: force section open if it has matching entries
          if (blockVisible > 0) ensureSectionOpen(block);
          // Task 4: hide the section's pullquote if 0 entries are visible
          var pq = block.querySelector(".pullquote");
          if (pq) pq.style.display = blockVisible > 0 ? "" : "none";
        }
      });
      hideEmpty();
    }

    // -- Update count
    if (countEl) {
      var anyFilter = active.section.size || active.region.size || active.status.size;
      if (hasQuery) {
        var n = index.filter(function (r) { return r._visible; }).length;
        countEl.textContent = n + " " + (n === 1 ? "result" : "results") + " for \u201c" + query.trim() + "\u201d";
      } else if (anyFilter) {
        var shown = index.filter(function (r) { return r._visible; }).length;
        countEl.textContent = shown + " " + (shown === 1 ? "entry" : "entries") + " shown";
      } else {
        countEl.textContent = index.length + " entries total";
      }
    }

    updateHint();
    updateExpandAllLabel();
  }

  // =========================================================================
  // HINT
  // =========================================================================
  function updateHint() {
    if (!activeHint) return;
    var total = active.section.size + active.region.size + active.status.size;
    activeHint.textContent = total > 0 ? " \u00b7 " + total + " active" : "";
  }

  // =========================================================================
  // FACET CHIPS
  // =========================================================================
  document.querySelectorAll(".chip[data-filter]").forEach(function (chip) {
    chip.addEventListener("click", function () {
      var type  = chip.getAttribute("data-filter");
      var value = chip.getAttribute("data-value");
      if (active[type].has(value)) {
        active[type].delete(value);
        chip.classList.remove("active");
      } else {
        active[type].add(value);
        chip.classList.add("active");
      }
      render();
    });
  });

  var clearBtn = document.getElementById("clear-filters");
  if (clearBtn) {
    clearBtn.addEventListener("click", function (e) {
      e.preventDefault();
      Object.keys(active).forEach(function (t) { active[t].clear(); });
      document.querySelectorAll(".chip.active").forEach(function (c) { c.classList.remove("active"); });
      render();
    });
  }

  // =========================================================================
  // SEARCH INPUT
  // =========================================================================
  function clearSearch() {
    if (searchInput) { searchInput.value = ""; searchInput.blur(); }
    if (searchClear) searchClear.hidden = true;
    query = "";
    syncUrl("");
    render();
  }

  var debounceTimer;
  if (searchInput) {
    // Populate from URL on load
    var urlQ = readUrlQuery();
    if (urlQ) {
      searchInput.value = urlQ;
      query = urlQ;
      if (searchClear) searchClear.hidden = false;
    }

    searchInput.addEventListener("input", function () {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(function () {
        query = searchInput.value;
        if (searchClear) searchClear.hidden = !query;
        syncUrl(query);
        render();
      }, 100);
    });

    searchInput.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { e.preventDefault(); clearSearch(); }
    });
  }

  if (searchClear) {
    searchClear.addEventListener("click", function () { clearSearch(); });
  }

  // =========================================================================
  // KEYBOARD SHORTCUTS — "/" or Cmd/Ctrl+K focuses search
  // =========================================================================
  document.addEventListener("keydown", function (e) {
    if (!searchInput) return;
    var tag = document.activeElement && document.activeElement.tagName;
    var inInput = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";

    if (e.key === "/" && !inInput) {
      e.preventDefault();
      searchInput.focus();
      searchInput.select();
    }
    if ((e.metaKey || e.ctrlKey) && e.key === "k") {
      e.preventDefault();
      searchInput.focus();
      searchInput.select();
    }
  });

  // =========================================================================
  // COLLAPSIBLE FILTER PANEL
  // =========================================================================
  var toggleBtn  = document.getElementById("filter-toggle");
  var filterBody = document.getElementById("filter-body");

  if (toggleBtn && filterBody) {
    toggleBtn.addEventListener("click", function () {
      var open = filterBody.hasAttribute("hidden");
      if (open) {
        filterBody.removeAttribute("hidden");
        toggleBtn.setAttribute("aria-expanded", "true");
      } else {
        filterBody.setAttribute("hidden", "");
        toggleBtn.setAttribute("aria-expanded", "false");
      }
    });
  }

  // =========================================================================
  // CONTACT FORM
  // =========================================================================
  var form = document.getElementById("suggest-form");
  if (form) {
    var statusEl = document.getElementById("form-status");
    var btn      = document.getElementById("submit-btn");
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (form.botcheck && form.botcheck.checked) {
        statusEl.textContent = "Thanks \u2014 received.";
        form.reset();
        return;
      }
      btn.disabled = true;
      statusEl.textContent = "Sending\u2026";
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

  // =========================================================================
  // INIT
  // =========================================================================
  render();
})();

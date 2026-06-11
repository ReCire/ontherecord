// ============================================================================
// entry.js — tiny, standalone share + copy-link affordance for the STATIC
// per-entry pages (/entry/{slug}/, /de/eintrag/{slug}/). These pages do NOT
// load filter.js (no list/search/view machinery), so this is the only script
// they run. It mirrors the same DOM contract as filter.js's share code:
//   .entry-share[data-slug][data-title][data-entry-url][data-portrait]
//     .share-native   (revealed when Web Share with files is supported)
//     .share-link     (real <a> to the entry page; JS upgrades to clipboard copy)
// ============================================================================
(function () {
  "use strict";

  function triggerDownload(url, filename) {
    var a = document.createElement("a");
    a.href = url;
    a.download = filename || "";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  function shareCard(slug, title, portraitUrl, entryUrl) {
    var url = portraitUrl || "";
    var shareUrl = entryUrl ? (window.location.origin + entryUrl) : window.location.href;
    if (!url) {
      if (navigator.share) navigator.share({ title: title || "On The Record", url: shareUrl }).catch(function () {});
      return;
    }
    return fetch(url)
      .then(function (resp) { return resp.blob(); })
      .then(function (blob) {
        var file = new File([blob], slug + ".png", { type: "image/png" });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          return navigator.share({
            files: [file],
            title: title || "On The Record",
            text: title ? (title + " \u2014 ontherecord.me") : "ontherecord.me",
            url: shareUrl,
          });
        }
        triggerDownload(url, slug + ".png");
      })
      .catch(function (e) {
        if (e && e.name === "AbortError") return;
        triggerDownload(url, slug + ".png");
      });
  }

  // Reveal native share buttons when Web Share with files is supported.
  if (navigator.canShare && navigator.share) {
    document.querySelectorAll(".share-native").forEach(function (btn) {
      btn.removeAttribute("hidden");
    });
  }

  document.addEventListener("click", function (e) {
    var target = e.target;
    if (!target || !target.closest) return;

    var btn = target.closest(".share-native");
    if (btn) {
      var wrap = btn.closest(".entry-share");
      if (!wrap) return;
      shareCard(
        wrap.getAttribute("data-slug"),
        wrap.getAttribute("data-title") || "",
        wrap.getAttribute("data-portrait") || "",
        wrap.getAttribute("data-entry-url") || ""
      );
      return;
    }

    var link = target.closest(".share-link");
    if (link && navigator.clipboard && navigator.clipboard.writeText) {
      e.preventDefault();
      var href = link.getAttribute("href") || "";
      var abs = href.indexOf("http") === 0 ? href : (window.location.origin + href);
      navigator.clipboard.writeText(abs).then(function () {
        if (link.dataset.copying) return;
        var original = link.textContent;
        link.dataset.copying = "1";
        link.textContent = link.getAttribute("data-copied-label") || "copied";
        link.classList.add("is-copied");
        setTimeout(function () {
          link.textContent = original;
          link.classList.remove("is-copied");
          delete link.dataset.copying;
        }, 1600);
      }).catch(function () {
        window.location.href = abs;
      });
    }
  });
})();

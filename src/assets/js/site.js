// Minimal progressive enhancement: mark active nav links + expose JS capability.
// No dependencies, no build step.
document.documentElement.classList.add("js");

// Front-page Elly intro (see partials/elly-intro.njk). The inline head script
// decides whether it plays (html.intro-on); here we only handle skip + cleanup.
(function () {
  var el = document.getElementById("elly-intro");
  if (!el) return;
  if (!document.documentElement.classList.contains("intro-on")) { el.remove(); return; }
  var t0 = Date.now(), gone = false;
  function remove() {
    if (gone) return;
    gone = true;
    el.remove();
    document.documentElement.classList.remove("intro-on");
    document.removeEventListener("keydown", onKey);
  }
  function skip() { el.classList.add("is-out"); setTimeout(remove, 400); }
  function onKey(e) { if (e.key === "Escape") skip(); }
  el.addEventListener("animationend", function (e) { if (e.target === el) remove(); });
  el.querySelector(".ei-skip").addEventListener("click", skip);
  el.addEventListener("click", function () { if (Date.now() - t0 > 1000) skip(); });
  document.addEventListener("keydown", onKey);
  setTimeout(remove, 5400); // safety net if animationend never fires (e.g. hidden tab)
})();

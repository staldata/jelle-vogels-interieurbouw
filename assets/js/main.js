// Conditional Popover API polyfill (only when native support is missing)
if (!Object.hasOwn(HTMLElement.prototype, "popover")) {
  import("https://unpkg.com/@oddbird/popover-polyfill@latest/dist/popover.min.js").catch(() => {});
}

/* ==========================================================================
   1. Adaptive Single-Tree Navbar (navbar guide)
   ========================================================================== */
const header = document.querySelector(".site-header");
if (header) {
  const inner = header.querySelector(".header-inner");
  const menu = header.querySelector(".site-menu");
  const menuBtn = header.querySelector(".menu-button");

  if (inner && menu && menuBtn) {
    let lastHeaderWidth = 0;

    const updateNavLayout = () => {
      const wasWide = header.classList.contains("is-wide");
      const currentWidth = header.getBoundingClientRect().width;

      if (!wasWide && currentWidth <= lastHeaderWidth && lastHeaderWidth > 0) {
        return;
      }
      lastHeaderWidth = currentWidth;

      let wasOpen = false;
      if (!wasWide) {
        try {
          wasOpen = menu.matches(":popover-open, .\\:popover-open");
        } catch {
          wasOpen = menu.classList.contains(":popover-open");
        }
      }
      if (wasOpen && typeof menu.hidePopover === "function") {
        try {
          menu.hidePopover();
        } catch {}
      }

      header.classList.add("is-measuring");
      header.classList.add("is-wide");
      menu.removeAttribute("popover");

      const fits = inner.scrollWidth <= inner.clientWidth + 1;

      if (fits) {
        header.classList.add("is-wide");
        menu.removeAttribute("popover");
      } else {
        header.classList.remove("is-wide");
        menu.setAttribute("popover", "auto");
        if (wasOpen && typeof menu.showPopover === "function") {
          try {
            menu.showPopover();
          } catch {}
        }
      }

      requestAnimationFrame(() => {
        header.classList.remove("is-measuring");
      });
    };

    // Close collapsed popover menu when clicking an anchor link on the same page
    menu.addEventListener("click", (e) => {
      if (
        !header.classList.contains("is-wide") &&
        e.target.closest("a") &&
        typeof menu.hidePopover === "function"
      ) {
        try {
          menu.hidePopover();
        } catch {}
      }
    });

    const ro = new ResizeObserver(() => updateNavLayout());
    ro.observe(header);
    ro.observe(menu);

    if (document.fonts?.ready) {
      document.fonts.ready.then(() => {
        lastHeaderWidth = 0;
        updateNavLayout();
      });
    }
    updateNavLayout();
  }
}

/* ==========================================================================
   2. State-Aware Sticky Header Fallback (state-aware-sticky-headers guide)
   ========================================================================== */
const sentinel = document.querySelector(".sticky-sentinel");
if (header && sentinel && !CSS.supports("container-type: scroll-state")) {
  const stickyObserver = new IntersectionObserver(
    ([entry]) => {
      header.classList.toggle("is-stuck", !entry.isIntersecting);
    },
    { threshold: [0] }
  );
  stickyObserver.observe(sentinel);
}

/* ==========================================================================
   3. Top-Layer Lightbox Dialog (dialog + light-dismiss + animate-top-layer)
   ========================================================================== */
const lightbox = document.getElementById("lightbox");
if (lightbox) {
  const lbImg = lightbox.querySelector("#lightbox-img");
  const lbTitle = lightbox.querySelector("#lightbox-title");
  const lbCategory = lightbox.querySelector("#lightbox-category");
  const lbCounter = lightbox.querySelector("#lightbox-counter");
  const prevBtn = lightbox.querySelector("#lightbox-prev");
  const nextBtn = lightbox.querySelector("#lightbox-next");
  const closeBtn = lightbox.querySelector("#lightbox-close");

  let supportsDisplayTransition;
  const canTransitionDisplay = () => {
    if (supportsDisplayTransition !== undefined) return supportsDisplayTransition;
    if (!window.CSS?.supports?.("transition-behavior", "allow-discrete") || !document.body) {
      return false;
    }
    const probe = document.createElement("div");
    probe.style.cssText = "transition: display 1s allow-discrete !important; display: block;";
    document.body.appendChild(probe);
    getComputedStyle(probe).display;
    probe.style.display = "none";
    supportsDisplayTransition = getComputedStyle(probe).display === "block";
    probe.remove();
    return supportsDisplayTransition;
  };

  const supportsTopLayerExit = () =>
    Boolean(window.CSS?.supports?.("overlay", "auto") && canTransitionDisplay());

  const closeTopLayer = async (el) => {
    if (!supportsTopLayerExit()) {
      el.setAttribute("data-closing", "");
      const animations = el.getAnimations({ subtree: true });
      if (animations.length > 0) {
        await Promise.race([
          Promise.allSettled(animations.map((a) => a.finished)),
          new Promise((r) => setTimeout(r, 1000)),
        ]);
      }
      if (!el.hasAttribute("data-closing")) return;
      el.removeAttribute("data-closing");
    }
    el.close();
  };

  let activeItems = [];
  let activeIndex = 0;

  const getVisibleTriggers = () =>
    [...document.querySelectorAll(".gallery-trigger")].filter((btn) => {
      const card = btn.closest(".gallery-item");
      return !card || !card.hidden;
    });

  const renderSlide = (index) => {
    if (!activeItems.length) return;
    activeIndex = (index + activeItems.length) % activeItems.length;
    const item = activeItems[activeIndex];
    const img = item.querySelector("img");
    const src = item.dataset.full || img?.getAttribute("src") || "";
    const alt = img?.getAttribute("alt") || item.dataset.title || "Interieurproject foto";
    const title = item.dataset.title || alt;
    const cat = item.dataset.categoryLabel || "Project";

    lbImg.src = src;
    lbImg.alt = alt;
    if (img?.getAttribute("width") && img?.getAttribute("height")) {
      lbImg.setAttribute("width", img.getAttribute("width"));
      lbImg.setAttribute("height", img.getAttribute("height"));
    }
    lbTitle.textContent = title;
    lbCategory.textContent = cat;
    lbCounter.textContent = `${activeIndex + 1} / ${activeItems.length}`;
  };

  document.addEventListener("click", (e) => {
    const trigger = e.target.closest(".gallery-trigger");
    if (!trigger) return;
    activeItems = getVisibleTriggers();
    const idx = Math.max(0, activeItems.indexOf(trigger));
    renderSlide(idx);
    lightbox.removeAttribute("data-closing");
    lightbox.showModal();
  });

  prevBtn?.addEventListener("click", () => renderSlide(activeIndex - 1));
  nextBtn?.addEventListener("click", () => renderSlide(activeIndex + 1));
  closeBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    closeTopLayer(lightbox);
  });

  lightbox.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      renderSlide(activeIndex - 1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      renderSlide(activeIndex + 1);
    }
  });

  lightbox.addEventListener("cancel", (e) => {
    if (e.cancelable) {
      e.preventDefault();
      closeTopLayer(lightbox);
    }
  });

  // Fallback for browsers lacking dialog[closedby="any"]
  if (!("closedBy" in HTMLDialogElement.prototype)) {
    const isOutside = (e, dlg) => {
      const r = dlg.getBoundingClientRect();
      return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
    };
    let pressedOutside = false;
    lightbox.addEventListener("pointerdown", (e) => {
      pressedOutside = isOutside(e, lightbox);
    });
    lightbox.addEventListener("pointerup", (e) => {
      if (pressedOutside && isOutside(e, lightbox)) {
        closeTopLayer(lightbox);
      }
    });
  }
}

/* ==========================================================================
   4. Portfolio Category Filter (projecten.html)
   ========================================================================== */
const filterBar = document.querySelector(".filter-bar");
if (filterBar) {
  const buttons = [...filterBar.querySelectorAll(".filter-btn")];
  const items = [...document.querySelectorAll(".gallery-item[data-category]")];
  const statusEl = document.getElementById("filter-status");

  filterBar.addEventListener("click", (e) => {
    const btn = e.target.closest(".filter-btn");
    if (!btn) return;
    const cat = btn.dataset.filter;

    buttons.forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));

    let visibleCount = 0;
    items.forEach((item) => {
      const cats = (item.dataset.category || "").split(/\s+/);
      const show = cat === "alles" || cats.includes(cat);
      item.hidden = !show;
      if (show) visibleCount += 1;
    });

    if (statusEl) {
      statusEl.textContent = `${visibleCount} projectfoto's getoond in categorie ${btn.textContent.trim()}.`;
    }
  });
}

/* ==========================================================================
   5. Scroll Reveal Fallback (scroll-entry-exit-effects guide)
   ========================================================================== */
const revealEls = document.querySelectorAll(".reveal");
if (
  revealEls.length > 0 &&
  !(CSS.supports("animation-timeline", "view()") && CSS.supports("animation-range", "entry")) &&
  matchMedia("(prefers-reduced-motion: no-preference)").matches
) {
  const revealObserver = new IntersectionObserver(
    (entries, observer) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-reveal-visible");
          entry.target.classList.remove("is-reveal-pending");
          observer.unobserve(entry.target);
        }
      }
    },
    { threshold: 0.08, rootMargin: "0px 0px -30px 0px" }
  );

  revealEls.forEach((el) => {
    const rect = el.getBoundingClientRect();
    if (rect.top > window.innerHeight * 0.92) {
      el.classList.add("is-reveal-pending");
      revealObserver.observe(el);
    }
  });
}

/* ==========================================================================
   6. Deferred Contact Form Validation & Consistent ARIA (forms + validate guide)
   ========================================================================== */
const contactForm = document.getElementById("contact-form");
if (contactForm) {
  const linkError = (el, shown) => {
    const errorId = el.dataset.error;
    if (!errorId) return;
    const ids = (el.getAttribute("aria-describedby") || "")
      .split(/\s+/)
      .filter((id) => id && id !== errorId);
    if (shown) ids.push(errorId);
    if (ids.length) el.setAttribute("aria-describedby", ids.join(" "));
    else el.removeAttribute("aria-describedby");
  };

  const announcer = document.createElement("div");
  announcer.setAttribute("aria-live", "polite");
  announcer.classList.add("visually-hidden");
  document.body.append(announcer);

  let announceTimer;
  let announcedField;

  const spokenText = (node) => {
    const copy = node.cloneNode(true);
    copy.querySelectorAll('[aria-hidden="true"]').forEach((n) => n.remove());
    copy.querySelectorAll('[role="img"][aria-label]').forEach((n) => {
      n.replaceWith(`${n.getAttribute("aria-label")}: `);
    });
    return copy.textContent.replace(/\s+/g, " ").trim();
  };

  const announceError = (el) => {
    const error = document.getElementById(el.dataset.error);
    if (!error) return;
    const label = el.labels?.[0] ? `${spokenText(el.labels[0])}: ` : "";
    clearTimeout(announceTimer);
    announcer.textContent = "";
    announcedField = el;
    announceTimer = setTimeout(() => {
      announcer.textContent = label + spokenText(error);
    }, 500);
  };

  const supportsUserInvalid = CSS.supports("selector(:user-invalid)");
  const dirtyState = new WeakMap();
  const flagged = new WeakSet();
  const announced = new WeakSet();

  const syncAria = (el, announce = false) => {
    if (!el.matches?.("input, select, textarea")) return;
    const invalid = supportsUserInvalid
      ? el.matches(":user-invalid")
      : el.classList.contains("user-invalid-fallback");

    if (invalid) {
      if (announce && !announced.has(el)) {
        announceError(el);
        announced.add(el);
      }
      el.setAttribute("aria-invalid", "true");
      linkError(el, true);
      flagged.add(el);
    } else if (flagged.has(el) || el.getAttribute("aria-invalid") !== "true") {
      el.setAttribute("aria-invalid", "false");
      linkError(el, false);
      flagged.delete(el);
      announced.delete(el);
      if (announcedField === el) {
        clearTimeout(announceTimer);
        announcer.textContent = "";
      }
    }
  };

  contactForm.querySelectorAll("input, select, textarea").forEach((el) => syncAria(el));

  if (!supportsUserInvalid) {
    const updateFallback = (input) => {
      const isValid = input.validity.valid;
      input.classList.toggle("user-invalid-fallback", !isValid);
      input.classList.toggle("user-valid-fallback", isValid);
      syncAria(input, !isValid);
    };

    contactForm.addEventListener(
      "blur",
      (e) => {
        const input = e.target;
        if (!input.checkValidity) return;
        const st = dirtyState.get(input) || { hasInteracted: false, hasBlurred: false };
        st.hasBlurred = true;
        dirtyState.set(input, st);
        if (st.hasInteracted) updateFallback(input);
      },
      true
    );

    contactForm.addEventListener("input", (e) => {
      const input = e.target;
      if (!input.checkValidity) return;
      const st = dirtyState.get(input) || { hasInteracted: false, hasBlurred: false };
      st.hasInteracted = true;
      dirtyState.set(input, st);
      if (st.hasBlurred) updateFallback(input);
    });

    contactForm.addEventListener(
      "invalid",
      (e) => {
        const input = e.target;
        if (!input.checkValidity) return;
        dirtyState.set(input, { hasInteracted: true, hasBlurred: true });
        announced.add(input);
        updateFallback(input);
      },
      true
    );
  } else {
    contactForm.addEventListener("blur", (e) => syncAria(e.target, true), true);
    contactForm.addEventListener("input", (e) => {
      if (e.target.hasAttribute("aria-invalid")) syncAria(e.target);
    });
    contactForm.addEventListener("change", (e) => syncAria(e.target, true), true);
    contactForm.addEventListener(
      "invalid",
      (e) => {
        announced.add(e.target);
        syncAria(e.target);
      },
      true
    );
  }

  contactForm.addEventListener(
    "reset",
    () => {
      setTimeout(() => {
        [...contactForm.elements].forEach((el) => {
          dirtyState.delete(el);
          el.classList?.remove("user-invalid-fallback", "user-valid-fallback");
          syncAria(el);
        });
      });
    },
    true
  );

  const statusBox = document.getElementById("form-status");
  const statusTitle = document.getElementById("form-status-title");
  const statusBody = document.getElementById("form-status-body");
  const fallbackActions = document.getElementById("form-fallback-actions");
  const mailtoBtn = document.getElementById("form-mailto-link");
  const submitBtn = document.getElementById("contact-submit");
  const endpoint =
    contactForm.dataset.endpoint || "https://api.web3forms.com/submit";

  contactForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!contactForm.checkValidity()) {
      const firstInvalid = contactForm.querySelector(":invalid");
      firstInvalid?.focus();
      return;
    }

    const data = new FormData(contactForm);
    if (data.get("botcheck")) {
      if (statusBox) {
        statusBox.classList.remove("form-status--error");
        if (statusTitle) statusTitle.textContent = "Bedankt! Uw bericht is verstuurd.";
        if (statusBody) {
          statusBody.innerHTML =
            'We nemen zo snel mogelijk contact met u op. Liever direct overleggen? Bel naar <a href="tel:+31633006830">+31 (6) 33 00 68 30</a>.';
        }
        if (fallbackActions) fallbackActions.hidden = true;
        statusBox.hidden = false;
        statusBox.focus();
      }
      return;
    }

    const accessKey = String(
      data.get("access_key") || "24b065c0-8ce4-499e-9b84-c479778e55a5"
    ).trim();
    const fromName = String(
      data.get("from_name") || "Jelle Vogels Interieurbouw Website"
    ).trim();
    const fullName = `${data.get("first_name") || ""} ${data.get("last_name") || ""}`.trim();
    const email = String(data.get("email_address") || "").trim();
    const phone = String(data.get("phone_number") || "").trim();
    const subject = String(data.get("subject") || "Aanvraag maatwerk interieur").trim();
    const message = String(data.get("message") || "").trim();

    const bodyText = [
      `Naam: ${fullName}`,
      `E-mail: ${email}`,
      `Telefoon: ${phone}`,
      "",
      message,
    ].join("\n");

    if (mailtoBtn) {
      mailtoBtn.href = `mailto:info@jellevogelsinterieurbouw.nl?subject=${encodeURIComponent(
        subject
      )}&body=${encodeURIComponent(bodyText)}`;
    }

    const originalLabel = submitBtn?.textContent || "Verzenden";
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Bezig met versturen...";
    }

    const payload = {
      access_key: accessKey,
      subject: `Nieuwe aanvraag via website: ${subject}`,
      from_name: fromName,
      replyto: email,
      name: fullName,
      email,
      Telefoon: phone,
      Onderwerp: subject,
      Bericht: message,
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      const result = await res.json().catch(() => ({}));

      if (!res.ok || result.success !== true) {
        throw new Error(result.message || `HTTP ${res.status}`);
      }

      if (statusBox) {
        statusBox.classList.remove("form-status--error");
        if (statusTitle) statusTitle.textContent = "Bedankt! Uw bericht is verstuurd.";
        if (statusBody) {
          statusBody.innerHTML =
            'We nemen zo snel mogelijk contact met u op. Liever direct overleggen? Bel naar <a href="tel:+31633006830">+31 (6) 33 00 68 30</a>.';
        }
        if (fallbackActions) fallbackActions.hidden = true;
        statusBox.hidden = false;
        statusBox.focus();
      }
      contactForm.reset();
      announcer.textContent = "Bedankt! Uw bericht is verstuurd.";
    } catch (err) {
      console.warn("Web3Forms error:", err);
      const msg = String(err?.message || "").trim();
      const isTimeout = err?.name === "AbortError";

      if (statusBox) {
        statusBox.classList.add("form-status--error");
        if (statusTitle) statusTitle.textContent = "Het versturen lukte even niet.";
        if (statusBody) {
          statusBody.textContent = "";
          if (isTimeout) {
            statusBody.append(
              "De formulierdienst reageerde niet op tijd (timeout na 12s). Klik hieronder om uw bericht direct via uw e-mailprogramma te versturen, of bel naar "
            );
          } else {
            statusBody.append(
              "Klik hieronder om uw bericht direct via uw e-mailprogramma te versturen, of bel naar "
            );
          }
          const telLink = document.createElement("a");
          telLink.href = "tel:+31633006830";
          telLink.textContent = "+31 (6) 33 00 68 30";
          statusBody.append(telLink, ".");
          if (!isTimeout && msg) {
            const detail = document.createElement("span");
            detail.style.display = "block";
            detail.style.marginTop = "0.4rem";
            detail.style.fontSize = "0.85em";
            detail.textContent = `Technische melding: ${msg}`;
            statusBody.append(detail);
          }
        }
        if (fallbackActions) fallbackActions.hidden = false;
        statusBox.hidden = false;
        statusBox.focus();
      }
      announcer.textContent =
        "Het versturen via het formulier lukte niet. Gebruik de knop om uw e-mailprogramma te openen.";
    } finally {
      clearTimeout(timeoutId);
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = originalLabel;
      }
    }
  });
}

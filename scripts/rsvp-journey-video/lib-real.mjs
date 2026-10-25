/** Shared helpers for real-product RSVP journey recording. */
export async function hideChrome(page) {
  await page
    .addStyleTag({
      content: `
      nextjs-portal, [data-nextjs-dialog-overlay], #__next-build-watcher,
      iframe[src*="userway"], .userway, .uwy, #userwayAccessibilityIcon, [class*="userway"],
      header, footer, a[href*="wa.me"] {
        display: none !important; visibility: hidden !important; opacity: 0 !important;
      }
    `,
    })
    .catch(() => {});
  await page.evaluate(() => {
    const kill = (el) => el && el.style.setProperty("display", "none", "important");
    document.querySelectorAll("body *").forEach((el) => {
      const t = (el.textContent || "").replace(/\s+/g, " ").trim();
      if (!t || t.length > 140) return;
      if (
        t.includes("דמו מבודד") ||
        t.includes("אירוע הדוגמה") ||
        t === "התחל סיור מחדש" ||
        t === "סיום והשארת פרטים" ||
        /^\d+\s*Issues$/i.test(t)
      ) {
        let cur = el;
        for (let i = 0; i < 6 && cur; i++) {
          const style = window.getComputedStyle(cur);
          if (style.position === "fixed" || style.position === "sticky") {
            kill(cur);
            return;
          }
          cur = cur.parentElement;
        }
        const r = el.getBoundingClientRect();
        if ((t.includes("אירוע הדוגמה") || t.includes("דמו מבודד")) && r.height > 20 && r.height < 120) {
          kill(el);
        }
      }
    });
  });
}

/**
 * Open real WhatsApp template preview from messages/new and mount a fullscreen
 * clone overlay. Pinning the in-tree shell fails (fixed is trapped / below fold),
 * so we clone the real product DOM onto documentElement.
 */
export async function showRealWhatsApp(page, base) {
  await page.goto(`${base}/try/dashboard/messages/new`, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await page.waitForTimeout(1800);
  await hideChrome(page);

  await page.waitForFunction(
    () =>
      [...document.querySelectorAll("*")].some(
        (el) => (el.textContent || "").trim() === "INVISTIMO · WhatsApp"
      ) &&
      [...document.querySelectorAll("button")].some(
        (el) => (el.textContent || "").replace(/\s+/g, " ").trim() === "אישור הגעה"
      ),
    { timeout: 25000 }
  );

  const ok = await page.evaluate(() => {
    document.getElementById("wa-record-overlay")?.remove();

    const label = [...document.querySelectorAll("*")].find(
      (el) => (el.textContent || "").trim() === "INVISTIMO · WhatsApp"
    );
    if (!label) return false;

    let shell = label;
    let best = label;
    for (let i = 0; i < 14 && shell; i++) {
      const cls = String(shell.className || "");
      const r = shell.getBoundingClientRect();
      if (
        r.height > 280 &&
        r.width > 220 &&
        (cls.includes("rounded") || cls.includes("ECE5DD") || cls.includes("overflow-hidden"))
      ) {
        best = shell;
      }
      if (cls.includes("ECE5DD") && cls.includes("rounded")) {
        best = shell;
        break;
      }
      shell = shell.parentElement;
    }

    const overlay = document.createElement("div");
    overlay.id = "wa-record-overlay";
    overlay.setAttribute("data-wa-shell", "1");
    overlay.style.cssText = [
      "position:fixed",
      "inset:0",
      "z-index:2147483646",
      "background:#ECE5DD",
      "overflow:auto",
      "display:flex",
      "align-items:stretch",
      "justify-content:center",
      "padding:0",
      "margin:0",
    ]
      .map((r) => `${r} !important`)
      .join(";");

    const clone = best.cloneNode(true);
    clone.style.cssText = [
      "width:100%",
      "max-width:100%",
      "min-height:100%",
      "height:auto",
      "border-radius:0",
      "margin:0",
      "position:relative",
      "inset:auto",
      "box-shadow:none",
      "background:#ECE5DD",
    ]
      .map((r) => `${r} !important`)
      .join(";");

    [...clone.querySelectorAll("img")].forEach((img) => {
      img.style.setProperty("height", "210px", "important");
      img.style.setProperty("max-height", "210px", "important");
      img.style.setProperty("width", "100%", "important");
      img.style.setProperty("object-fit", "cover", "important");
      img.style.setProperty("object-position", "center top", "important");
      img.style.setProperty("display", "block", "important");
    });

    [...clone.querySelectorAll("button, a")].forEach((el) => {
      const t = (el.textContent || "").replace(/\s+/g, " ").trim();
      if (t === "אישור הגעה") {
        el.removeAttribute("disabled");
        el.setAttribute("data-wa-cta", "1");
      }
    });

    overlay.appendChild(clone);
    document.documentElement.appendChild(overlay);
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    overlay.scrollTop = 0;
    return !!overlay.querySelector("[data-wa-cta='1']");
  });

  if (!ok) throw new Error("WhatsApp preview clone overlay failed");
  await page.waitForTimeout(400);
}

/** Pulse/highlight the personal-link CTA inside the WA overlay. */
export async function pulsePersonalLinkCta(page) {
  await page.evaluate(() => {
    const shell = document.querySelector("[data-wa-shell='1']") || document.body;
    const btn =
      shell.querySelector("[data-wa-cta='1']") ||
      [...shell.querySelectorAll("button, a")].find((el) => {
        const t = (el.textContent || "").replace(/\s+/g, " ").trim();
        return t === "אישור הגעה";
      });
    if (!btn) return;
    btn.setAttribute("data-wa-cta", "1");
    btn.style.setProperty("outline", "3px solid rgba(29,111,184,.55)", "important");
    btn.style.setProperty("transform", "scale(0.98)", "important");
    btn.style.setProperty("box-shadow", "0 0 0 6px rgba(29,111,184,.18)", "important");
    btn.scrollIntoView({ block: "center" });
  });
}

export async function clickPersonalLinkCta(page) {
  const cta = page.locator("[data-wa-cta='1']").first();
  if (await cta.count()) {
    await cta.click({ force: true }).catch(() => {});
  } else {
    await page
      .locator("button, a")
      .filter({ hasText: /^אישור הגעה$/ })
      .first()
      .click({ force: true })
      .catch(() => {});
  }
}

export function phoneCompositeFilter({ stageW, stageH, phoneW, phoneH, duration }) {
  const phoneX = Math.round((stageW * 2 - phoneW * 2) / 2);
  const phoneY = Math.round((stageH * 2 - phoneH * 2) / 2);
  const pad = 18;
  const screenX = phoneX + pad;
  const screenY = phoneY + pad;
  const screenDrawW = phoneW * 2 - pad * 2;
  const screenDrawH = phoneH * 2 - pad * 2;
  return {
    filter: [
      `color=c=0xF7EDDF:s=${stageW * 2}x${stageH * 2}:d=${duration},format=rgba[bg]`,
      `color=c=0x1C1612:s=${phoneW * 2}x${phoneH * 2}:d=${duration},format=rgba[phone]`,
      `[0:v]fps=30,scale=${screenDrawW}:${screenDrawH}:force_original_aspect_ratio=increase,crop=${screenDrawW}:${screenDrawH},format=rgba,setpts=PTS-STARTPTS[screen]`,
      `[bg][phone]overlay=${phoneX}:${phoneY}[withphone]`,
      `[withphone][screen]overlay=${screenX}:${screenY}:eof_action=repeat,trim=duration=${duration},setpts=PTS-STARTPTS[out]`,
    ].join(";"),
  };
}

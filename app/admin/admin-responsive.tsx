"use client";

import { useEffect } from "react";

const TABLE_SELECTOR = "table.admin-table, table.admin-fit-table";
const SCROLL_SELECTOR = ".admin-table-scroll, .admin-hscroll, .admin-canvas-scroll";

function labelAdminTables(root: ParentNode) {
  root.querySelectorAll(TABLE_SELECTOR).forEach((table) => {
    const headers = Array.from(table.querySelectorAll(":scope > thead th")).map(
      (th) => (th.textContent || "").replace(/\s+/g, " ").trim()
    );
    if (!headers.length) return;

    table.querySelectorAll(":scope > tbody > tr").forEach((row) => {
      const cells = Array.from(row.children).filter(
        (cell): cell is HTMLTableCellElement => cell.tagName === "TD"
      );
      if (
        cells.length === 1 &&
        cells[0].colSpan > 1
      ) {
        if (cells[0].hasAttribute("data-label")) {
          cells[0].removeAttribute("data-label");
        }
        return;
      }

      cells.forEach((cell, index) => {
        const label = headers[index] || "";
        if (!label) return;
        if (cell.getAttribute("data-label") !== label) {
          cell.setAttribute("data-label", label);
        }
      });
    });
  });
}

function alignRtlScrollers(root: ParentNode) {
  const width = window.innerWidth;
  const bucket = width < 768 ? "phone" : width < 1280 ? "tablet" : "desktop";

  root.querySelectorAll<HTMLElement>(SCROLL_SELECTOR).forEach((el) => {
    const isTable = el.classList.contains("admin-table-scroll");
    if (isTable && bucket !== "tablet") return;
    if (el.dataset.rtlAligned === bucket) return;
    if (el.scrollWidth <= el.clientWidth + 2) return;
    el.scrollLeft = el.scrollWidth;
    el.dataset.rtlAligned = bucket;
  });
}

/** Labels table cells for the mobile card layout and aligns RTL scrollers. */
export function AdminResponsiveEnhancer({ pathname }: { pathname: string }) {
  useEffect(() => {
    const root = document.querySelector(".admin-app");
    if (!root) return;

    let frame = 0;
    const apply = () => {
      labelAdminTables(root);
      alignRtlScrollers(root);
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(apply);
    };

    schedule();
    const observer = new MutationObserver(schedule);
    observer.observe(root, { childList: true, subtree: true });
    window.addEventListener("resize", schedule);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", schedule);
    };
  }, [pathname]);

  return null;
}

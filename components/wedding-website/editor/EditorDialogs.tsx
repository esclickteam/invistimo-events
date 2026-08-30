"use client";

import { useEffect, useMemo, useState } from "react";
import { WEDDING_TEMPLATES } from "@/config/weddingWebsite/templates";
import { repairWeddingImageUrl } from "@/lib/weddingWebsite/images";
import { EditorModal, ModalButton } from "./EditorUI";
import type { WeddingMediaSlot, WeddingTemplateId } from "@/types/weddingWebsite";

export type ConfirmRequest = {
  title: string;
  message: string;
  confirmLabel: string;
  tone?: "primary" | "danger";
  onConfirm: () => void;
};

export function ConfirmDialog({
  request,
  onClose,
}: {
  request: ConfirmRequest;
  onClose: () => void;
}) {
  return (
    <EditorModal
      title={request.title}
      onClose={onClose}
      width="440px"
      footer={
        <>
          <ModalButton label="ביטול" onClick={onClose} />
          <ModalButton
            tone={request.tone || "primary"}
            label={request.confirmLabel}
            onClick={() => {
              request.onConfirm();
              onClose();
            }}
          />
        </>
      }
    >
      <p className="text-sm font-semibold leading-7 text-[#5c4632]">{request.message}</p>
    </EditorModal>
  );
}

export function PublishDialog({
  changeCount,
  publicPath,
  publishing,
  onPublish,
  onClose,
}: {
  changeCount: number;
  publicPath: string;
  publishing: boolean;
  onPublish: () => void;
  onClose: () => void;
}) {
  return (
    <EditorModal
      title="פרסום האתר"
      description="הגרסה שאתם רואים בעורך תהפוך לגרסה שכל האורחים רואים."
      onClose={onClose}
      width="480px"
      footer={
        <>
          <ModalButton label="עוד לא" onClick={onClose} />
          <ModalButton
            tone="primary"
            label={publishing ? "מפרסם..." : "פרסום עכשיו"}
            disabled={publishing}
            onClick={onPublish}
          />
        </>
      }
    >
      <p className="text-sm font-semibold leading-7 text-[#5c4632]">
        {changeCount > 0
          ? `יש ${changeCount} שינויים שטרם פורסמו. האתר יעודכן עבור כל האורחים. לפרסם עכשיו?`
          : "אין שינויים חדשים לפרסום."}
      </p>
      {publicPath ? (
        <p className="mt-3 rounded-xl bg-[#FBF8F2] p-3 text-xs font-bold text-[#8A7B69]">
          כתובת האתר: <span className="font-mono">{publicPath}</span>
        </p>
      ) : null}
    </EditorModal>
  );
}

export function TemplateGalleryDialog({
  currentId,
  onApply,
  onClose,
}: {
  currentId: WeddingTemplateId;
  onApply: (id: WeddingTemplateId) => void;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<WeddingTemplateId>(currentId);
  const template = WEDDING_TEMPLATES.find((item) => item.id === selected);
  const changing = selected !== currentId;

  return (
    <EditorModal
      title="החלפת תבנית"
      description="התוכן, התמונות, הגלריה ואישורי ההגעה נשמרים. מתחלפים העיצוב והפריסה."
      onClose={onClose}
      width="900px"
      footer={
        <>
          <ModalButton label="ביטול" onClick={onClose} />
          <a
            href={`/wedding-website/${selected}`}
            target="_blank"
            rel="noreferrer"
            className="min-h-[42px] rounded-2xl border border-[#E7DED1] bg-white px-5 pt-3 text-sm font-black text-[#241A14] hover:bg-[#F7F1E8]"
          >
            הצגת התבנית
          </a>
          <ModalButton
            tone="primary"
            label={changing ? "החלת התבנית" : "זו התבנית הנוכחית"}
            disabled={!changing}
            onClick={() => onApply(selected)}
          />
        </>
      }
    >
      {changing ? (
        <p className="mb-4 rounded-xl border border-[#E8C48A] bg-[#FDF6E7] p-3 text-xs font-bold leading-5 text-[#7A5A24]">
          התאמות עיצוב שביצעתם ידנית (צבעים, פונטים וריווח לפי מקטע) מבוססות על הפלטה של התבנית
          הנוכחית ועשויות להיראות שונה בתבנית החדשה.
        </p>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {WEDDING_TEMPLATES.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={selected === item.id}
            onClick={() => setSelected(item.id)}
            className={`overflow-hidden rounded-2xl border text-right transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C9A962] ${
              selected === item.id
                ? "border-[#C9A962] ring-2 ring-[#C9A962]/30"
                : "border-[#EFE4D6] hover:border-[#C9A962]/50"
            }`}
          >
            <img
              src={repairWeddingImageUrl(item.previewImage)}
              alt=""
              className="h-32 w-full object-cover bg-[#F7F1E8]"
            />
            <div className="p-3">
              <p className="text-sm font-black text-[#241A14]">{item.name}</p>
              <p className="mt-0.5 text-[11px] font-semibold text-[#8A7B69]">{item.tagline}</p>
              {item.id === currentId ? (
                <span className="mt-2 inline-flex rounded-lg bg-[#F0E7DA] px-2 py-1 text-[10px] font-black text-[#5c4632]">
                  התבנית הנוכחית
                </span>
              ) : null}
            </div>
          </button>
        ))}
      </div>
      {template ? (
        <p className="mt-4 text-xs font-semibold leading-6 text-[#8A7B69]">{template.description}</p>
      ) : null}
    </EditorModal>
  );
}

export type MediaLibraryItem = WeddingMediaSlot & {
  publicId?: string;
  createdAt?: string;
  name?: string;
};

export function MediaLibraryDialog({
  invitationId,
  onPick,
  onClose,
}: {
  invitationId: string;
  /** Undefined slot means the library was opened for browsing only. */
  onPick: ((slot: WeddingMediaSlot) => void) | null;
  onClose: () => void;
}) {
  const [items, setItems] = useState<MediaLibraryItem[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch("/api/wedding-website/media", { credentials: "include", cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        setItems(Array.isArray(data?.items) ? data.items : []);
      })
      .catch(() => {
        if (!cancelled) setError("לא הצלחנו לטעון את ספריית המדיה.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((item) =>
      `${item.name || ""} ${item.src}`.toLowerCase().includes(needle)
    );
  }, [items, query]);

  async function remove(item: MediaLibraryItem) {
    if (!item.publicId) return;
    setBusyId(item.publicId);
    try {
      const res = await fetch("/api/wedding-website/media", {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          publicId: item.publicId,
          invitationId,
          resourceType: item.type,
        }),
      });
      if (!res.ok) throw new Error("DELETE_FAILED");
      setItems((current) => current.filter((entry) => entry.publicId !== item.publicId));
    } catch {
      setError("לא הצלחנו למחוק את הקובץ.");
    } finally {
      setBusyId("");
    }
  }

  return (
    <EditorModal
      title="ספריית המדיה"
      description="כל התמונות והסרטונים שהעליתם נשמרים כאן ואפשר להשתמש בהם שוב בכל מקום באתר."
      onClose={onClose}
      width="820px"
      footer={<ModalButton label="סגירה" onClick={onClose} />}
    >
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="חיפוש לפי שם קובץ"
        aria-label="חיפוש בספריית המדיה"
        className="mb-4 min-h-[42px] w-full rounded-2xl border border-[#E7DED1] px-4 text-sm font-semibold"
      />

      {error ? (
        <p className="mb-3 rounded-xl bg-[#FDEDEA] p-3 text-xs font-bold text-[#A6402C]">{error}</p>
      ) : null}

      {loading ? (
        <p className="py-10 text-center text-sm font-bold text-[#8A7B69]">טוען מדיה...</p>
      ) : filtered.length === 0 ? (
        <p className="py-10 text-center text-sm font-bold text-[#8A7B69]">
          {items.length === 0
            ? "עדיין לא העליתם תמונות או סרטונים."
            : "לא נמצאו קבצים שמתאימים לחיפוש."}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {filtered.map((item) => (
            <div
              key={item.src}
              className="group overflow-hidden rounded-2xl border border-[#EFE4D6] bg-white"
            >
              <button
                type="button"
                disabled={!onPick}
                onClick={() => onPick?.(item)}
                className="block w-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#C9A962] disabled:cursor-default"
                aria-label={onPick ? `שימוש בקובץ ${item.name || ""}` : item.name || ""}
              >
                {item.type === "video" ? (
                  <video src={item.src} muted className="h-24 w-full object-cover" />
                ) : (
                  <img src={item.src} alt="" className="h-24 w-full object-cover" />
                )}
              </button>
              <div className="flex items-center justify-between gap-1 px-2 py-1.5">
                <span className="truncate text-[10px] font-bold text-[#8A7B69]" title={item.name}>
                  {item.type === "video" ? "סרטון" : "תמונה"}
                </span>
                {item.publicId ? (
                  <button
                    type="button"
                    onClick={() => remove(item)}
                    disabled={busyId === item.publicId}
                    aria-label={`מחיקת ${item.name || "קובץ"}`}
                    className="min-h-[28px] rounded-lg px-1.5 text-[10px] font-black text-[#C0503C] hover:bg-[#FDEDEA] disabled:opacity-40"
                  >
                    מחיקה
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </EditorModal>
  );
}

export type HistoryEntry = { id: number; label: string; at: number };

export function HistoryDialog({
  entries,
  activeIndex,
  onJump,
  onClose,
}: {
  entries: HistoryEntry[];
  activeIndex: number;
  onJump: (index: number) => void;
  onClose: () => void;
}) {
  return (
    <EditorModal
      title="היסטוריית עריכה"
      description="ההיסטוריה נשמרת למשך הסשן הנוכחי. לחיצה על שורה מחזירה את האתר לאותו רגע."
      onClose={onClose}
      width="480px"
      footer={<ModalButton label="סגירה" onClick={onClose} />}
    >
      {entries.length <= 1 ? (
        <p className="py-6 text-center text-sm font-bold text-[#8A7B69]">עדיין לא ביצעתם שינויים.</p>
      ) : (
        <ol className="space-y-1">
          {entries.map((entry, index) => (
            <li key={entry.id}>
              <button
                type="button"
                onClick={() => {
                  onJump(index);
                  onClose();
                }}
                aria-current={index === activeIndex}
                className={`flex min-h-[42px] w-full items-center justify-between gap-3 rounded-xl px-3 text-right text-xs font-bold transition ${
                  index === activeIndex
                    ? "bg-[#C9A962]/20 text-[#241A14]"
                    : "text-[#5c4632] hover:bg-[#F7F1E8]"
                }`}
              >
                <span>{entry.label}</span>
                <span className="font-mono text-[10px] text-[#8A7B69]">
                  {new Date(entry.at).toLocaleTimeString("he-IL", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </button>
            </li>
          ))}
        </ol>
      )}
    </EditorModal>
  );
}

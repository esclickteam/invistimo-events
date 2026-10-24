"use client";

import { useEffect, useMemo, useState, use } from "react";
import Link from "next/link";
import {
  Heart,
  Home,
  Images,
  Link2,
  Menu,
  Plus,
  Share2,
  Upload,
  Users,
  Video,
  Sparkles,
} from "lucide-react";
import { Logo } from "@/components/ui";
import { Uploader } from "@/components/Uploader";
import { formatDateHe } from "@/lib/utils";

type AlbumPayload = {
  event: {
    id: string;
    slug: string;
    hostNames: string;
    title: string;
    eventDate: string | null;
    personalMessage: string | null;
    faceAiEnabled: boolean;
    faceAiAvailable: boolean;
    allowDownload: boolean;
    stories: { id: string; title: string; sortOrder: number }[];
  };
  stats: { photos: number; videos: number; guests: number };
  canUpload: boolean;
  isOwner: boolean;
  media: {
    id: string;
    type: string;
    url: string;
    thumbUrl: string;
    durationMs: number | null;
    width: number | null;
    height: number | null;
    createdAt: string;
  }[];
  nextCursor: string | null;
};

export default function GuestAlbumPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const [data, setData] = useState<AlbumPayload | null>(null);
  const [filter, setFilter] = useState<"all" | "photos" | "videos">("all");
  const [chapterId, setChapterId] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [showBlessings, setShowBlessings] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [greeting, setGreeting] = useState({ authorName: "", body: "" });
  const [greetingMsg, setGreetingMsg] = useState("");

  async function load() {
    const qs = new URLSearchParams({
      filter,
      ...(chapterId ? { chapterId } : {}),
    });
    const res = await fetch(`/api/public/album/${slug}?${qs}`);
    const json = await res.json();
    if (!json.ok) {
      setError(json.error || "שגיאה");
      return;
    }
    setData(json.data);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, filter, chapterId]);

  const duration = (ms: number | null) => {
    if (!ms) return "";
    const s = Math.round(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  };

  const mobile = useMemo(() => true, []);

  async function submitGreeting(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch(`/api/public/album/${slug}/greetings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(greeting),
    });
    const json = await res.json();
    if (!json.ok) setGreetingMsg(json.error);
    else {
      setGreetingMsg("הברכה נשלחה וממתינה לאישור");
      setGreeting({ authorName: "", body: "" });
    }
  }

  if (error) {
    return (
      <main className="mx-auto max-w-lg px-5 py-20 text-center">
        <Logo />
        <p className="mt-8 text-[var(--muted)]">{error}</p>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="mx-auto max-w-lg px-5 py-20 text-center text-[var(--muted)]">
        טוען את האלבום…
      </main>
    );
  }

  const { event, stats, media, canUpload } = data;

  return (
    <main className="pb-28 md:pb-10">
      {/* Desktop header */}
      <header className="sticky top-0 z-30 hidden md:block border-b border-[var(--line)] bg-[color-mix(in_srgb,var(--bg)_85%,transparent)] backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <Logo className="text-xl" />
          <nav className="flex items-center gap-6 text-sm text-[var(--muted)]">
            <button type="button" onClick={() => setChapterId(null)}>
              האלבום שלנו
            </button>
            <button type="button" onClick={() => setFilter("videos")}>
              סרטונים
            </button>
            <span>אנשים</span>
            <button type="button">רגעים</button>
          </nav>
          <div className="flex items-center gap-2">
            <button
              className="btn-ghost text-sm"
              onClick={() => navigator.clipboard.writeText(window.location.href)}
            >
              <Share2 size={16} /> שיתוף
            </button>
            <button
              className="btn-ghost text-sm"
              onClick={() => navigator.clipboard.writeText(window.location.href)}
            >
              <Link2 size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile hero */}
      <section className="md:hidden relative min-h-[52vh] overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(28,25,23,0.25), rgba(28,25,23,0.55)), url('https://images.unsplash.com/photo-1511285560929-80b456fe3caa?auto=format&fit=crop&w=1200&q=80') center/cover",
          }}
        />
        <div className="relative z-10 flex items-center justify-between px-4 pt-4 text-white">
          <Logo className="text-lg text-white" />
          <Menu />
        </div>
        <div className="relative z-10 px-5 pt-24 pb-8 text-white animate-fade-up">
          <h1 className="font-display text-5xl">{event.hostNames}</h1>
          <p className="mt-2 opacity-90">
            {event.title} · {formatDateHe(event.eventDate)}
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 md:px-5">
        {/* Mobile CTAs */}
        <section className="mobile-cta md:hidden -mt-6 relative z-20 mb-8">
          {canUpload ? (
            <button type="button" onClick={() => setShowUpload(true)}>
              <Upload className="text-[var(--gold-deep)]" />
              <span>
                <strong className="block">העלאת תמונות וסרטונים</strong>
                <span className="text-sm text-[var(--muted)]">שתפו את הרגעים שלכם</span>
              </span>
            </button>
          ) : null}
          <button
            type="button"
            onClick={() =>
              alert(
                event.faceAiAvailable
                  ? "פתיחת זיהוי פנים"
                  : "זיהוי פנים אינו פעיל עדיין — התכונה תוצג רק לאחר אינטגרציה מאושרת ובדיקה."
              )
            }
          >
            <Sparkles className="text-[var(--gold-deep)]" />
            <span>
              <strong className="block">מצא אותי בתמונות</strong>
              <span className="text-sm text-[var(--muted)]">
                {event.faceAiAvailable
                  ? "חיפוש AI באלבום זה בלבד"
                  : "יופעל לאחר אישור ספק AI"}
              </span>
            </span>
          </button>
          <button type="button" onClick={() => setShowBlessings(true)}>
            <Heart className="text-[var(--gold-deep)]" />
            <span>
              <strong className="block">ברכות לזוג</strong>
              <span className="text-sm text-[var(--muted)]">כתבו ברכה לספר הדיגיטלי</span>
            </span>
          </button>
        </section>

        {/* Desktop hero */}
        <section className="hidden md:grid grid-cols-[180px_1fr] gap-8 items-end py-12 animate-fade-up">
          <div className="space-y-3 text-sm">
            <div>
              <div className="font-display text-3xl">{stats.photos}</div>
              <div className="text-[var(--muted)]">תמונות</div>
            </div>
            <div>
              <div className="font-display text-3xl">{stats.videos}</div>
              <div className="text-[var(--muted)]">סרטונים</div>
            </div>
            <div>
              <div className="font-display text-3xl">{stats.guests}</div>
              <div className="text-[var(--muted)]">אורחים</div>
            </div>
          </div>
          <div className="text-center">
            <h1 className="font-display text-6xl md:text-7xl">{event.hostNames}</h1>
            <p className="mt-3 text-lg text-[var(--muted)]">
              {event.title} · {formatDateHe(event.eventDate)}
            </p>
            {event.personalMessage ? (
              <p className="mt-4 mx-auto max-w-xl text-[var(--muted)]">{event.personalMessage}</p>
            ) : null}
            <div className="mt-6 flex justify-center gap-2">
              {(
                [
                  ["all", "הכל"],
                  ["photos", "תמונות"],
                  ["videos", "סרטונים"],
                ] as const
              ).map(([k, label]) => (
                <button
                  key={k}
                  type="button"
                  className="pill"
                  data-active={filter === k}
                  onClick={() => setFilter(k)}
                >
                  {label}
                </button>
              ))}
              {canUpload ? (
                <button type="button" className="btn-gold text-sm" onClick={() => setShowUpload(true)}>
                  <Upload size={16} /> העלאה
                </button>
              ) : null}
            </div>
          </div>
        </section>

        {event.stories?.length ? (
          <section className="mb-10 animate-fade-up stagger-2">
            <h2 className="font-display text-2xl mb-4">רגעי האירוע</h2>
            <div className="story-rail">
              {event.stories.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  className="story-card"
                  onClick={() => setChapterId(chapterId === s.id ? null : s.id)}
                >
                  <div
                    className="story-thumb"
                    style={{
                      outline: chapterId === s.id ? "2px solid var(--gold)" : undefined,
                    }}
                  >
                    <span className="story-num">{String(i + 1).padStart(2, "0")}</span>
                    <div
                      className="h-full w-full"
                      style={{
                        background: `linear-gradient(160deg, rgba(196,165,116,0.35), rgba(28,25,23,0.25)), #d6cbb8`,
                      }}
                    />
                  </div>
                  <p className="mt-2 text-sm">{s.title}</p>
                </button>
              ))}
            </div>
          </section>
        ) : null}

        <section className="masonry animate-soft-scale stagger-3">
          {media.length === 0 ? (
            <div className="surface p-10 text-center text-[var(--muted)]">
              עדיין אין תמונות מאושרות בגלריה.
              {canUpload ? " העלו את הראשונות!" : ""}
            </div>
          ) : (
            media.map((m) => (
              <button
                key={m.id}
                type="button"
                className="masonry-item relative w-full overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--bg-deep)]"
                onClick={() => setLightbox(m.url)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={m.thumbUrl || m.url}
                  alt=""
                  className="w-full object-cover"
                  style={{
                    aspectRatio:
                      m.width && m.height ? `${m.width}/${m.height}` : "4/5",
                  }}
                />
                {m.type === "VIDEO" ? (
                  <span className="absolute bottom-3 inset-inline-start-3 rounded-full bg-black/55 px-2.5 py-1 text-xs text-white">
                    ▶ {duration(m.durationMs)}
                  </span>
                ) : null}
              </button>
            ))
          )}
        </section>
      </div>

      {/* Mobile bottom nav */}
      <nav className="bottom-nav md:hidden">
        <Link href={`/a/${slug}`}>
          <Home size={18} />
          בית
        </Link>
        <button type="button" onClick={() => setFilter("videos")}>
          <Video size={18} />
          סרטונים
        </button>
        <button type="button" onClick={() => canUpload && setShowUpload(true)}>
          <span className="plus">
            <Plus size={22} />
          </span>
        </button>
        <button type="button">
          <Users size={18} />
          אנשים
        </button>
        <button type="button" onClick={() => setFilter("all")}>
          <Images size={18} />
          אלבום
        </button>
      </nav>

      {showUpload ? (
        <div className="fixed inset-0 z-50 bg-black/40 p-4 flex items-end md:items-center justify-center">
          <div className="w-full max-w-lg">
            <Uploader
              eventId={event.id}
              onDone={() => {
                setShowUpload(false);
                load();
              }}
            />
            <button
              className="btn-ghost mt-3 w-full bg-[var(--card)]"
              onClick={() => setShowUpload(false)}
            >
              סגירה
            </button>
          </div>
        </div>
      ) : null}

      {showBlessings ? (
        <div className="fixed inset-0 z-50 bg-black/40 p-4 flex items-end md:items-center justify-center">
          <form onSubmit={submitGreeting} className="surface w-full max-w-lg p-5">
            <h3 className="font-display text-3xl mb-4">ספר ברכות</h3>
            <input
              className="mb-3 w-full rounded-2xl border border-[var(--line)] bg-[var(--card)] px-4 py-3"
              placeholder="השם שלכם"
              value={greeting.authorName}
              onChange={(e) => setGreeting({ ...greeting, authorName: e.target.value })}
              required
            />
            <textarea
              className="mb-3 w-full rounded-2xl border border-[var(--line)] bg-[var(--card)] px-4 py-3 min-h-28"
              placeholder="ברכה לזוג…"
              value={greeting.body}
              onChange={(e) => setGreeting({ ...greeting, body: e.target.value })}
              required
            />
            {greetingMsg ? <p className="mb-3 text-sm">{greetingMsg}</p> : null}
            <div className="flex gap-2">
              <button type="submit" className="btn-gold flex-1">
                שליחה
              </button>
              <button
                type="button"
                className="btn-ghost flex-1"
                onClick={() => setShowBlessings(false)}
              >
                סגירה
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {lightbox ? (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightbox} alt="" className="max-h-full max-w-full object-contain" />
        </div>
      ) : null}

      {/* silence unused */}
      {mobile ? null : null}
    </main>
  );
}

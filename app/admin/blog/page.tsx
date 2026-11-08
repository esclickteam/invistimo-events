"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AdminButton, AdminEmptyState, AdminPanel } from "@/app/components/admin/ui/AdminUI";

type Row = {
  id: string;
  title: string;
  slug: string;
  status: "draft" | "published";
  categoryId: string;
};

export default function AdminBlogPage() {
  const [posts, setPosts] = useState<Row[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/blog")
      .then((response) => response.json())
      .then((data) => setPosts(data.posts || []))
      .catch(() => setError("לא ניתן לטעון את המאמרים"));
  }, []);

  return (
    <div className="grid gap-4" dir="rtl">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-black">בלוג</h1>
        <Link href="/admin/blog/new">
          <AdminButton>מאמר חדש</AdminButton>
        </Link>
      </div>
      {error ? <p className="text-sm font-bold text-red-700">{error}</p> : null}
      <AdminPanel>
        {posts.length ? (
          <ul className="divide-y">
            {posts.map((post) => (
              <li key={post.id} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-bold">{post.title}</p>
                  <p className="text-xs text-[var(--admin-muted)]">{post.status === "published" ? "מפורסם" : "טיוטה"}</p>
                </div>
                <Link href={`/admin/blog/${post.id}`} className="text-sm font-bold">עריכה</Link>
              </li>
            ))}
          </ul>
        ) : (
          <AdminEmptyState text="עדיין אין מאמרים חדשים. המדריכים הקיימים נשארים באתר גם בלי רשומה כאן." />
        )}
      </AdminPanel>
    </div>
  );
}

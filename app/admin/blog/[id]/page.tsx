"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import BlogEditor, { type BlogEditorValue } from "@/app/admin/blog/BlogEditor";

export default function EditBlogPostPage() {
  const params = useParams<{ id: string }>();
  const [initial, setInitial] = useState<BlogEditorValue | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/admin/blog/${params.id}`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error("המאמר לא נמצא");
        setInitial(data.post);
      })
      .catch((err) => setError(err.message));
  }, [params.id]);

  return (
    <div className="grid gap-4" dir="rtl">
      <h1 className="text-2xl font-black">עריכת מאמר</h1>
      {error ? <p className="text-sm font-bold text-red-700">{error}</p> : null}
      {initial ? <BlogEditor postId={params.id} initial={initial} /> : null}
    </div>
  );
}

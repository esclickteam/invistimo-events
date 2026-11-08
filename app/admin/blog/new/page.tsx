"use client";

import BlogEditor from "@/app/admin/blog/BlogEditor";

export default function NewBlogPostPage() {
  return (
    <div className="grid gap-4" dir="rtl">
      <h1 className="text-2xl font-black">מאמר חדש</h1>
      <BlogEditor />
    </div>
  );
}

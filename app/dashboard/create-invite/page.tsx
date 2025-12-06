"use client";

import { useRef, useState, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import EditorCanvas from "./EditorCanvas";
import Sidebar from "./Sidebar";
import Toolbar from "./Toolbar";

// ⭐ Query Client עם הגדרות מטייבות מהירות ותקניות
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 דקה - לא טוען מחדש סתם
      gcTime: 5 * 60 * 1000, // ⬅️ ב־tanstack v5 זה gcTime במקום cacheTime
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export default function CreateInvitePage() {
  const canvasRef = useRef<any>(null);

  // אובייקט נבחר מהקנבס
  const [selectedObject, setSelectedObject] = useState<any | null>(null);

  // מפתח API לגוגל פונטים
  const googleApiKey =
    "AIzaSyACcKM0Zf756koiR1MtC8OtS7xMUdwWjfg";

  /* ============================================================
     ⭐ PRELOAD — טוען מראש את כל הספריות כדי שהטאבים יהיו מידיים
  ============================================================ */
  useEffect(() => {
    queryClient.prefetchQuery({
      queryKey: ["library", "elements"],
      queryFn: () => fetch("/api/invity/library/element").then((r) => r.json()),
    });

    queryClient.prefetchQuery({
      queryKey: ["library", "shapes"],
      queryFn: () => fetch("/api/invity/library/shapes").then((r) => r.json()),
    });

    queryClient.prefetchQuery({
      queryKey: ["library", "backgrounds"],
      queryFn: () => fetch("/api/invity/library/backgrounds").then((r) =>
        r.json()
      ),
    });

    queryClient.prefetchQuery({
      queryKey: ["library", "animations"],
      queryFn: () => fetch("/api/invity/library/animations").then((r) =>
        r.json()
      ),
    });
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex h-screen bg-gray-100 overflow-hidden">

        {/* ⭐ SIDEBAR */}
        <Sidebar
          canvasRef={canvasRef}
          googleApiKey={googleApiKey}
          selectedObject={selectedObject}
        />

        {/* ⭐ EDITOR + TOOLBAR */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <Toolbar />

          <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
            <EditorCanvas 
              ref={canvasRef} 
              onSelect={setSelectedObject} 
            />
          </div>
        </div>
      </div>
    </QueryClientProvider>
  );
}

"use client";

import { useRef, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import EditorCanvas from "./EditorCanvas";
import Sidebar from "./Sidebar";
import Toolbar from "./Toolbar";

const queryClient = new QueryClient();

export default function CreateInvitePage() {
  const canvasRef = useRef<any>(null);
  const [selectedObject, setSelectedObject] = useState<any | null>(null);

  // Google Fonts API Key
  const googleApiKey = "AIzaSyACcKM0Zf756koiR1MtC8OtS7xMUdwWjfg";

  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex h-screen bg-gray-100">
        {/* Sidebar */}
        <Sidebar canvasRef={canvasRef} googleApiKey={googleApiKey} />

        {/* Editor */}
        <div className="flex-1 flex flex-col">
          <Toolbar />
          <div className="flex-1 flex items-center justify-center p-4">
            <EditorCanvas ref={canvasRef} onSelect={setSelectedObject} />
          </div>
        </div>
      </div>
    </QueryClientProvider>
  );
}

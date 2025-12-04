"use client";

import { useRef, useState } from "react";
import EditorCanvas from "./EditorCanvas"; // ✅ ייבוא נכון
import Sidebar from "./Sidebar"; // ✅ ייבוא נכון
import Toolbar from "./Toolbar"; // ✅ ייבוא נכון

export default function CreateInvitePage() {
  // אין טיפוס בשם CanvasAPI — נחליף ל-any
  const canvasRef = useRef<any>(null);

  // שמירה על אובייקט שנבחר
  const [selectedObject, setSelectedObject] = useState<any | null>(null);

  return (
    <div className="flex h-screen bg-gray-100">
      {/* צד שמאל: Sidebar */}
      <Sidebar canvasRef={canvasRef} />

      {/* מרכז העורך */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <Toolbar />

        {/* Canvas */}
        <div className="flex-1 flex items-center justify-center p-4">
          <EditorCanvas ref={canvasRef} onSelect={setSelectedObject} />
        </div>
      </div>
    </div>
  );
}

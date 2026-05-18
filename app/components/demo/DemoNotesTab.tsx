"use client";

import { useState } from "react";
import { Plus, Trash2, StickyNote } from "lucide-react";

type Note = {
  _id: string;
  title: string;
  text: string;
  createdAt: string;
};

type Props = {
  notes: Note[];
  addNote: (note: Omit<Note, "_id">) => void;
  updateNote: (noteId: string, payload: Partial<Note>) => void;
  deleteNote: (noteId: string) => void;
};

export default function DemoNotesTab({
  notes,
  addNote,
  updateNote,
  deleteNote,
}: Props) {
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");

  const handleAdd = () => {
    if (!title.trim() || !text.trim()) return;

    addNote({
      title: title.trim(),
      text: text.trim(),
      createdAt: new Date().toISOString().slice(0, 10),
    });

    setTitle("");
    setText("");
  };

  return (
    <section className="rounded-3xl border border-[#e6d7c8] bg-white p-5 shadow-sm">
      <div className="mb-5">
        <h2 className="text-xl font-black text-[#2f241c]">הערות פנימיות</h2>
        <p className="text-sm text-[#7b6a58]">
          הערות לדוגמה לניהול האירוע. לא נשמרות באמת.
        </p>
      </div>

      <div className="mb-5 grid gap-2 md:grid-cols-[220px_1fr_auto]">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="כותרת הערה"
          className="rounded-2xl border border-[#d8c5b3] px-4 py-2 text-sm outline-none focus:border-[#8a5a2b]"
        />

        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="תוכן הערה"
          className="rounded-2xl border border-[#d8c5b3] px-4 py-2 text-sm outline-none focus:border-[#8a5a2b]"
        />

        <button
          type="button"
          onClick={handleAdd}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#8a5a2b] px-4 py-2 text-sm font-bold text-white"
        >
          <Plus size={16} />
          הוסף
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {notes.map((note) => (
          <div
            key={note._id}
            className="rounded-3xl border border-[#eadccd] bg-[#fffaf5] p-4"
          >
            <div className="mb-3 flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-[#8a5a2b]">
                <StickyNote size={19} />
              </div>

              <div>
                <h3 className="font-black text-[#2f241c]">{note.title}</h3>
                <p className="text-xs font-bold text-[#8f8478]">
                  {note.createdAt}
                </p>
              </div>
            </div>

            <p className="text-sm leading-6 text-[#7b6a58]">{note.text}</p>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  updateNote(note._id, {
                    text: `${note.text} · עודכן בדמו`,
                  })
                }
                className="rounded-2xl border border-[#d8c5b3] bg-white px-3 py-2 text-sm font-bold text-[#6f4b2b]"
              >
                עדכן בדמו
              </button>

              <button
                type="button"
                onClick={() => deleteNote(note._id)}
                className="inline-flex items-center gap-2 rounded-2xl border border-red-100 bg-white px-3 py-2 text-sm font-bold text-red-600"
              >
                <Trash2 size={16} />
                מחיקה
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
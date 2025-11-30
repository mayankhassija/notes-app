"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";


type Note = {
  id: string;
  title: string;
  content: string;
  created_at: string;
};

export default function HomePage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    fetchNotes();

    const channel = supabase
      .channel("public:notes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notes" },
        () => fetchNotes()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function fetchNotes() {
    const { data, error } = await supabase
      .from("notes")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) setNotes(data as Note[]);
  }

  async function createNote() {
    if (!title.trim()) return alert("Title required");
    await supabase.from("notes").insert([{ title, content }]);
    setTitle("");
    setContent("");
    fetchNotes();
  }

  function startEdit(note: Note) {
    setEditingId(note.id);
    setTitle(note.title);
    setContent(note.content);
  }

  async function updateNote() {
    if (!editingId) return;
    await supabase
      .from("notes")
      .update({ title, content, updated_at: new Date() })
      .eq("id", editingId);

    setEditingId(null);
    setTitle("");
    setContent("");
    fetchNotes();
  }

  async function deleteNote(id: string) {
    if (!confirm("Delete this note?")) return;
    await supabase.from("notes").delete().eq("id", id);
    fetchNotes();
  }

  return (
    <main style={{ maxWidth: 800, margin: "40px auto" }}>
      <h1>Notes</h1>

      <div style={{ marginBottom: 20 }}>
        <input
          placeholder="Title"
          value={title}
          onChange={e => setTitle(e.target.value)}
          style={{ width: "100%", padding: 8, marginBottom: 8 }}
        />

        <textarea
          placeholder="Content"
          value={content}
          onChange={e => setContent(e.target.value)}
          style={{ width: "100%", padding: 8, height: 120 }}
        />

        {editingId ? (
          <div style={{ marginTop: 8 }}>
            <button onClick={updateNote} style={{ marginRight: 8 }}>
              Save
            </button>
            <button
              onClick={() => {
                setEditingId(null);
                setTitle("");
                setContent("");
              }}
            >
              Cancel
            </button>
          </div>
        ) : (
          <button onClick={createNote} style={{ marginTop: 8 }}>
            Create Note
          </button>
        )}
      </div>

      <section>
        {notes.length === 0 ? (
          <p>No notes yet.</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0 }}>
            {notes.map(n => (
              <li
                key={n.id}
                style={{
                  border: "1px solid #ddd",
                  padding: 12,
                  marginBottom: 8,
                  borderRadius: 6
                }}
              >
                <strong>{n.title}</strong>
                <div style={{ fontSize: 13, color: "#666" }}>
                  {new Date(n.created_at).toLocaleString()}
                </div>
                <p>{n.content}</p>

                <div style={{ marginTop: 10 }}>
                  <button
                    onClick={() => startEdit(n)}
                    style={{ marginRight: 8 }}
                  >
                    Edit
                  </button>
                  <button onClick={() => deleteNote(n.id)}>Delete</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

import { useState, useEffect, useMemo } from "react";
import { Plus, Edit, Trash2, Bell, BookOpen, Calendar } from "lucide-react";
import { Button } from "../components/ui/Button";
import { Modal } from "../components/ui/Modal";
import { useUserProfile } from "../hooks/useUserProfile";
import { useConfirm } from "../context/ConfirmContext";
import { supabase } from "../lib/supabase";
import { formatDateUTC } from "../lib/dateUtils";
import { cn } from "../lib/utils";
import { getSpanishValidationProps } from "../lib/formUtils";
import bibleData from "../assets/RVR1960-Spanish.json";

const BIBLE = bibleData as unknown as Record<string, Record<string, Record<string, string>>>;
const BOOK_NAMES = Object.keys(BIBLE).sort((a, b) => a.localeCompare(b));

interface Notice {
  id: string;
  title: string;
  content: string | null;
  is_active: boolean;
  created_by: string;
  created_at: string;
}

interface DailyVerse {
  id: string;
  display_date: string;
  book: string;
  chapter: number;
  verse_start: number;
  verse_end: number;
  created_by: string;
  created_at: string;
}

type Tab = "notices" | "verses";

export default function NoticesPage() {
  const { hasPermission } = useUserProfile();
  const confirm = useConfirm();
  const [activeTab, setActiveTab] = useState<Tab>("notices");
  const canEdit = hasPermission("operador");

  // ── Notices state ──
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNotice, setEditingNotice] = useState<Notice | null>(null);
  const [formData, setFormData] = useState({ title: "", content: "", is_active: true });

  // ── Daily verses state ──
  const [dailyVerses, setDailyVerses] = useState<DailyVerse[]>([]);
  const [versesLoading, setVersesLoading] = useState(true);
  const [isVerseModalOpen, setIsVerseModalOpen] = useState(false);
  const [editingVerse, setEditingVerse] = useState<DailyVerse | null>(null);
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
  const [selectedBook, setSelectedBook] = useState("");
  const [selectedChapter, setSelectedChapter] = useState("");
  const [verseStart, setVerseStart] = useState("");
  const [verseEnd, setVerseEnd] = useState("");

  const chapters = useMemo(() => {
    if (!selectedBook || !BIBLE[selectedBook]) return [] as string[];
    return Object.keys(BIBLE[selectedBook]).sort((a, b) => parseInt(a) - parseInt(b));
  }, [selectedBook]);

  const verseNumbers = useMemo(() => {
    if (!selectedBook || !selectedChapter || !BIBLE[selectedBook]?.[selectedChapter]) return [] as string[];
    return Object.keys(BIBLE[selectedBook][selectedChapter]).sort((a, b) => parseInt(a) - parseInt(b));
  }, [selectedBook, selectedChapter]);

  // ── Load data ──
  useEffect(() => {
    loadNotices();
    loadDailyVerses();
  }, []);

  const loadNotices = async () => {
    try {
      const { data, error } = await supabase.from("notices").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      setNotices(data || []);
    } catch (error) {
      console.error("Error loading notices:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadDailyVerses = async () => {
    try {
      const { data, error } = await supabase.from("daily_verses").select("*").order("display_date", { ascending: false });
      if (error) throw error;
      setDailyVerses(data || []);
    } catch (error) {
      console.error("Error loading daily verses:", error);
    } finally {
      setVersesLoading(false);
    }
  };

  // ── Notices CRUD ──
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingNotice) {
        const { error } = await supabase.from("notices").update(formData).eq("id", editingNotice.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("notices").insert([formData]);
        if (error) throw error;
      }
      await loadNotices();
      setIsModalOpen(false);
      setEditingNotice(null);
      resetForm();
    } catch (error) {
      console.error("Error saving notice:", error);
    }
  };

  const handleEdit = (notice: Notice) => {
    setEditingNotice(notice);
    setFormData({ title: notice.title, content: notice.content || "", is_active: notice.is_active });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: "¿Eliminar Notificación?",
      message: "¿Estás seguro de que quieres eliminar esta notificación?",
      type: "danger",
      confirmLabel: "Eliminar",
      cancelLabel: "Cancelar",
    });
    if (!confirmed) return;
    try {
      const { error } = await supabase.from("notices").delete().eq("id", id);
      if (error) throw error;
      await loadNotices();
    } catch (error) {
      console.error("Error deleting notice:", error);
    }
  };

  const resetForm = () => setFormData({ title: "", content: "", is_active: true });

  const openCreateModal = () => {
    setEditingNotice(null);
    resetForm();
    setIsModalOpen(true);
  };

  // ── Daily verses CRUD ──
  const resetVerseForm = () => {
    setSelectedBook("");
    setSelectedChapter("");
    setVerseStart("");
    setVerseEnd("");
    setSelectedDate(() => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    });
  };

  const openCreateVerseModal = () => {
    setEditingVerse(null);
    resetVerseForm();
    setIsVerseModalOpen(true);
  };

  const openEditVerseModal = (v: DailyVerse) => {
    setEditingVerse(v);
    setSelectedDate(v.display_date);
    setSelectedBook(v.book);
    setSelectedChapter(String(v.chapter));
    setVerseStart(String(v.verse_start));
    setVerseEnd(String(v.verse_end));
    setIsVerseModalOpen(true);
  };

  const handleVerseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBook || !selectedChapter || !verseStart || !verseEnd || !selectedDate) return;

    const payload = {
      display_date: selectedDate,
      book: selectedBook,
      chapter: parseInt(selectedChapter),
      verse_start: parseInt(verseStart),
      verse_end: parseInt(verseEnd),
    };

    try {
      if (editingVerse) {
        const { error } = await supabase.from("daily_verses").update(payload).eq("id", editingVerse.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("daily_verses").insert([payload]);
        if (error) throw error;
      }
      await loadDailyVerses();
      setIsVerseModalOpen(false);
      setEditingVerse(null);
      resetVerseForm();
    } catch (error) {
      console.error("Error saving daily verse:", error);
    }
  };

  const handleDeleteVerse = async (id: string) => {
    const confirmed = await confirm({
      title: "¿Eliminar Versículo?",
      message: "¿Estás seguro de que quieres eliminar este versículo programado?",
      type: "danger",
      confirmLabel: "Eliminar",
      cancelLabel: "Cancelar",
    });
    if (!confirmed) return;
    try {
      const { error } = await supabase.from("daily_verses").delete().eq("id", id);
      if (error) throw error;
      await loadDailyVerses();
    } catch (error) {
      console.error("Error deleting daily verse:", error);
    }
  };

  const getVerseText = (v: DailyVerse) => {
    const book = BIBLE[v.book];
    if (!book) return "";
    const ch = book[String(v.chapter)];
    if (!ch) return "";
    let text = "";
    for (let i = v.verse_start; i <= v.verse_end; i++) {
      const vt = ch[String(i)];
      if (vt) text += (text ? " " : "") + vt;
    }
    return text;
  };

  const getVerseRef = (v: DailyVerse) => {
    if (v.verse_start === v.verse_end) return `${v.book} ${v.chapter}:${v.verse_start}`;
    return `${v.book} ${v.chapter}:${v.verse_start}-${v.verse_end}`;
  };

  const groupedByDate = useMemo(() => {
    const map = new Map<string, DailyVerse[]>();
    for (const v of dailyVerses) {
      const arr = map.get(v.display_date) || [];
      arr.push(v);
      map.set(v.display_date, arr);
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [dailyVerses]);

  if (loading && versesLoading) {
    return (
      <div className="flex-1 p-6 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-logo-primary/30 border-t-logo-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#1d1d1f]">Notificaciones y Avisos</h1>
            <p className="text-sm text-[#86868b] mt-1">Gestiona las comunicaciones para la comunidad</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-2xl w-fit">
          <button
            onClick={() => setActiveTab("notices")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer",
              activeTab === "notices" ? "bg-white text-[#1d1d1f] shadow-sm" : "text-[#86868b] hover:text-[#1d1d1f]"
            )}
          >
            <Bell size={16} />
            Avisos
          </button>
          <button
            onClick={() => setActiveTab("verses")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer",
              activeTab === "verses" ? "bg-white text-[#1d1d1f] shadow-sm" : "text-[#86868b] hover:text-[#1d1d1f]"
            )}
          >
            <BookOpen size={16} />
            Versículos del Día
          </button>
        </div>

        {/* ── Tab: Notices ── */}
        {activeTab === "notices" && (
          <>
            <div className="flex justify-end mb-4">
              {canEdit && (
                <Button onClick={openCreateModal} size="sm" className="flex items-center gap-2">
                  <Plus size={16} />
                  Nueva Notificación
                </Button>
              )}
            </div>
            <div className="space-y-4">
              {notices.map((notice) => (
                <div
                  key={notice.id}
                  className={cn(
                    "p-6 rounded-2xl border transition-all duration-200",
                    notice.is_active
                      ? "bg-white border-gray-100 shadow-sm hover:shadow-md"
                      : "bg-gray-50 border-gray-200 opacity-60"
                  )}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-logo-primary/10 flex items-center justify-center">
                        <Bell size={18} className="text-logo-primary" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-[#1d1d1f] text-lg">{notice.title}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-[#86868b]">
                            {formatDateUTC(notice.created_at, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </span>
                          {!notice.is_active && (
                            <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">Inactiva</span>
                          )}
                        </div>
                      </div>
                    </div>
                    {canEdit && (
                      <div className="flex gap-2 ml-4">
                        <Button size="sm" variant="outline" onClick={() => handleEdit(notice)}>
                          <Edit size={14} />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(notice.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    )}
                  </div>
                  {notice.content && (
                    <div className="pl-13">
                      <p className="text-sm text-[#86868b] leading-relaxed whitespace-pre-wrap">{notice.content}</p>
                    </div>
                  )}
                </div>
              ))}
              {notices.length === 0 && (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Bell size={24} className="text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-[#1d1d1f] mb-2">No hay notificaciones</h3>
                  <p className="text-sm text-[#86868b]">Crea la primera notificación para comunicar con la comunidad</p>
                </div>
              )}
            </div>
          </>
        )}

        {/* ── Tab: Verses ── */}
        {activeTab === "verses" && (
          <>
            <div className="flex justify-end mb-4">
              {canEdit && (
                <Button onClick={openCreateVerseModal} size="sm" className="flex items-center gap-2">
                  <Plus size={16} />
                  Programar Versículo
                </Button>
              )}
            </div>

            {versesLoading ? (
              <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-2 border-logo-primary/30 border-t-logo-primary rounded-full animate-spin" />
              </div>
            ) : dailyVerses.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <BookOpen size={24} className="text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-[#1d1d1f] mb-2">Sin versículos programados</h3>
                <p className="text-sm text-[#86868b]">
                  Los días sin programación mostrarán un versículo aleatorio automáticamente.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {groupedByDate.map(([date, verses]) => (
                  <div key={date} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="flex items-center gap-3 px-5 py-3 bg-gray-50 border-b border-gray-100">
                      <Calendar size={16} className="text-logo-primary shrink-0" />
                      <span className="text-sm font-semibold text-[#1d1d1f]">
                        {formatDateUTC(date, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                      </span>
                      <span className="text-xs text-[#86868b] ml-auto">
                        {verses.length} versículo{verses.length > 1 ? "s" : ""}
                      </span>
                    </div>
                    <div className="divide-y divide-gray-50">
                      {verses.map((v, idx) => (
                        <div key={v.id} className="flex items-start gap-3 px-5 py-4 group">
                          <span className="w-6 h-6 rounded-full bg-logo-primary/10 text-logo-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                            {idx + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-[#1d1d1f] leading-relaxed">{getVerseText(v)}</p>
                            <p className="text-xs font-semibold text-logo-primary mt-1">{getVerseRef(v)}</p>
                          </div>
                          {canEdit && (
                            <div className="flex gap-1 shrink-0">
                              <button
                                onClick={() => openEditVerseModal(v)}
                                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-[#1d1d1f] transition-all cursor-pointer"
                              >
                                <Edit size={14} />
                              </button>
                              <button
                                onClick={() => handleDeleteVerse(v.id)}
                                className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-all cursor-pointer"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Modal: Create/Edit Notice ── */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingNotice ? "Editar Notificación" : "Nueva Notificación"}
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-[#1d1d1f] mb-2">Título</label>
            <input
              type="text"
              required
              {...getSpanishValidationProps("Por favor, ingresa el título")}
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-logo-primary focus:border-transparent transition-all"
              placeholder="Ej: Próximo retiro espiritual"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#1d1d1f] mb-2">Contenido (opcional)</label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              rows={4}
              className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-logo-primary focus:border-transparent transition-all resize-none"
              placeholder="Detalles de la notificación..."
            />
          </div>
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-4 h-4 text-logo-primary bg-gray-100 border-gray-300 rounded focus:ring-logo-primary"
            />
            <label htmlFor="is_active" className="text-sm font-medium text-[#1d1d1f]">
              Notificación activa
            </label>
          </div>
          <div className="flex gap-3 pt-4">
            <Button type="submit" variant="success" className="flex-1">
              {editingNotice ? "Guardar Cambios" : "Crear Notificación"}
            </Button>
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} className="flex-1">
              Cancelar
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── Modal: Create/Edit Daily Verse ── */}
      <Modal
        isOpen={isVerseModalOpen}
        onClose={() => setIsVerseModalOpen(false)}
        title={editingVerse ? "Editar Versículo" : "Programar Versículo del Día"}
        size="lg"
      >
        <form onSubmit={handleVerseSubmit} className="space-y-5">
          {/* Date picker */}
          <div>
            <label className="block text-sm font-medium text-[#1d1d1f] mb-2">Fecha de visualización</label>
            <input
              type="date"
              required
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-logo-primary focus:border-transparent transition-all"
            />
          </div>

          {/* Book selector */}
          <div>
            <label className="block text-sm font-medium text-[#1d1d1f] mb-2">Libro</label>
            <select
              required
              value={selectedBook}
              onChange={(e) => {
                setSelectedBook(e.target.value);
                setSelectedChapter("");
                setVerseStart("");
                setVerseEnd("");
              }}
              className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-logo-primary focus:border-transparent transition-all bg-white"
            >
              <option value="">Selecciona un libro</option>
              {BOOK_NAMES.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          {/* Chapter selector */}
          <div>
            <label className="block text-sm font-medium text-[#1d1d1f] mb-2">Capítulo</label>
            <select
              required
              value={selectedChapter}
              onChange={(e) => {
                setSelectedChapter(e.target.value);
                setVerseStart("");
                setVerseEnd("");
              }}
              disabled={!selectedBook}
              className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-logo-primary focus:border-transparent transition-all bg-white disabled:opacity-50"
            >
              <option value="">Selecciona un capítulo</option>
              {chapters.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Verse range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#1d1d1f] mb-2">Versículo desde</label>
              <select
                required
                value={verseStart}
                onChange={(e) => {
                  setVerseStart(e.target.value);
                  if (!verseEnd || parseInt(e.target.value) > parseInt(verseEnd)) {
                    setVerseEnd(e.target.value);
                  }
                }}
                disabled={!selectedChapter}
                className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-logo-primary focus:border-transparent transition-all bg-white disabled:opacity-50"
              >
                <option value="">Desde</option>
                {verseNumbers.map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1d1d1f] mb-2">Versículo hasta</label>
              <select
                required
                value={verseEnd}
                onChange={(e) => setVerseEnd(e.target.value)}
                disabled={!verseStart}
                className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-logo-primary focus:border-transparent transition-all bg-white disabled:opacity-50"
              >
                <option value="">Hasta</option>
                {verseNumbers.filter((v) => !verseStart || parseInt(v) >= parseInt(verseStart)).map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Preview */}
          {selectedBook && selectedChapter && verseStart && verseEnd && BIBLE[selectedBook]?.[selectedChapter] && (
            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
              <p className="text-xs font-semibold text-logo-primary mb-2">Vista previa</p>
              <p className="text-sm text-[#1d1d1f] leading-relaxed">
                {(() => {
                  const ch = BIBLE[selectedBook][selectedChapter];
                  let text = "";
                  for (let i = parseInt(verseStart); i <= parseInt(verseEnd); i++) {
                    const vt = ch[String(i)];
                    if (vt) text += (text ? " " : "") + vt;
                  }
                  return text || "Sin texto disponible";
                })()}
              </p>
              <p className="text-xs font-semibold text-[#86868b] mt-2">
                — {selectedBook} {selectedChapter}:{verseStart === verseEnd ? verseStart : `${verseStart}-${verseEnd}`}
              </p>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button type="submit" variant="success" className="flex-1">
              {editingVerse ? "Guardar Cambios" : "Programar Versículo"}
            </Button>
            <Button type="button" variant="outline" onClick={() => setIsVerseModalOpen(false)} className="flex-1">
              Cancelar
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

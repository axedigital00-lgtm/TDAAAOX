"use client";
import { useState } from "react";
import { Plus, MessageSquare, Trash2, Pencil, X } from "lucide-react";
import type { ConversationSummary } from "@/hooks/useAxiaConversations";
import { useT } from "@/components/I18nProvider";

function grouperParPeriode(list: ConversationSummary[]) {
  const now = Date.now();
  const groups: Record<string, ConversationSummary[]> = {
    "Aujourd'hui": [], "Hier": [], "7 derniers jours": [], "Plus ancien": [],
  };
  for (const c of list) {
    const diffJours = (now - new Date(c.updatedAt).getTime()) / 86400000;
    if (diffJours < 1) groups["Aujourd'hui"].push(c);
    else if (diffJours < 2) groups["Hier"].push(c);
    else if (diffJours < 7) groups["7 derniers jours"].push(c);
    else groups["Plus ancien"].push(c);
  }
  return Object.entries(groups).filter(([, items]) => items.length > 0);
}

export function AxiaConversationSidebar({
  conversations, activeId, loading, onSelect, onNew, onDelete, onRename, onClose,
}: {
  conversations: ConversationSummary[];
  activeId: string | null;
  loading?: boolean;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onRename: (id: string, titre: string) => void;
  onClose?: () => void;
}) {
  const t = useT();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  function confirmerRenommage(id: string) {
    const val = editValue.trim();
    if (val) onRename(id, val);
    setEditingId(null);
  }

  return (
    <div className="w-full h-full flex flex-col bg-carte">
      <div className="flex-shrink-0 p-3 flex items-center gap-2">
        <button onClick={onNew}
          className="flex-1 flex items-center gap-2 min-h-10 px-3.5 py-2 rounded-controle text-sm font-semibold text-encre border border-bordure hover:bg-carte-2 transition-colors">
          <Plus size={15} />{" "}{t("Nouvelle conversation")}
        </button>
        {onClose && (
          <button onClick={onClose} aria-label={t("Fermer l'historique")} title={t("Fermer l'historique")}
            className="w-10 h-10 rounded-controle flex items-center justify-center flex-shrink-0 text-doux hover:bg-carte-2 hover:text-encre transition-colors">
            <X size={16} />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-3 space-y-4 min-h-0">
        {loading ? (
          <p className="ax-aide text-center px-4 py-6">{t("Chargement…")}</p>
        ) : conversations.length === 0 ? (
          <p className="ax-aide text-center px-4 py-6 leading-relaxed">
            {t("Aucune conversation pour le moment — écris à AXIA pour en démarrer une.")}
          </p>
        ) : (
          grouperParPeriode(conversations).map(([label, items]) => (
            <div key={label}>
              <p className="text-[10px] font-bold text-doux uppercase tracking-wider px-2.5 mb-1.5">{t(label)}</p>
              <div className="space-y-0.5">
                {items.map(c => {
                  const active = activeId === c.id;
                  return (
                    <div key={c.id}
                      onClick={() => editingId !== c.id && onSelect(c.id)}
                      className={`group flex items-center gap-2 min-h-10 px-2.5 py-1.5 rounded-controle cursor-pointer transition-colors ${active ? "bg-primaire-fond" : "hover:bg-carte-2"}`}>
                      <MessageSquare size={13} className={`flex-shrink-0 ${active ? "text-encre" : "text-discret"}`} />
                      {editingId === c.id ? (
                        <input
                          autoFocus
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          onClick={e => e.stopPropagation()}
                          onBlur={() => confirmerRenommage(c.id)}
                          onKeyDown={e => {
                            if (e.key === "Enter") confirmerRenommage(c.id);
                            if (e.key === "Escape") setEditingId(null);
                          }}
                          className="flex-1 min-w-0 bg-transparent text-base lg:text-[13px] text-encre outline-none border-b border-bordure-forte"
                        />
                      ) : (
                        <span className={`flex-1 min-w-0 truncate text-[13px] ${active ? "text-encre font-semibold" : "text-doux"}`}>
                          {t(c.titre)}
                        </span>
                      )}
                      {editingId !== c.id && (
                        <div className="flex lg:hidden lg:group-hover:flex items-center gap-0.5 flex-shrink-0">
                          <button
                            onClick={e => { e.stopPropagation(); setEditingId(c.id); setEditValue(c.titre); }}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-doux hover:bg-carte" title={t("Renommer")} aria-label={t("Renommer")}>
                            <Pencil size={12} />
                          </button>
                          <button
                            onClick={e => { e.stopPropagation(); onDelete(c.id); }}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-erreur hover:bg-erreur-fond" title={t("Supprimer")} aria-label={t("Supprimer")}>
                            <Trash2 size={12} />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

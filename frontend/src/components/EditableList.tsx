import { useState } from "react";
import type { ReactNode } from "react";
import { ChevronDown, ChevronRight, Trash2, Check, X, User, MessageCircle } from "lucide-react";
import type { InfoItem, Message } from "../types/person";
import { Speaker } from "../types/person";

type EditableListProps = {
  items: InfoItem[];
  onUpdate: (itemId: string, newValue: string) => void;
  onDelete: (itemId: string) => void;
  title: string;
  icon?: ReactNode;
  emptyMessage?: string;
  getMessageById: (messageId: string) => Message | undefined;
};

export default function EditableList({
  items,
  onUpdate,
  onDelete,
  title,
  icon,
  emptyMessage = "No items yet",
  getMessageById,
}: EditableListProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  function startEdit(itemId: string, currentValue: string) {
    setEditingItemId(itemId);
    setEditValue(currentValue);
  }

  function saveEdit(itemId: string) {
    if (editValue.trim()) {
      onUpdate(itemId, editValue.trim());
    }
    setEditingItemId(null);
    setEditValue("");
  }

  function cancelEdit() {
    setEditingItemId(null);
    setEditValue("");
  }

  function handleDelete(itemId: string) {
    onDelete(itemId);
  }

  function formatSource(message: Message | undefined): ReactNode {
    if (!message) {
      return <span className="text-xs text-gray-400 italic">Source unavailable</span>;
    }

    const speakerLabel = message.speaker === Speaker.USER ? 'You' : 'Them';
    const speakerIcon = message.speaker === Speaker.USER ? (
      <User className="w-3 h-3" />
    ) : (
      <MessageCircle className="w-3 h-3" />
    );

    return (
      <div className="flex items-start gap-2">
        <span
          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium ${
            message.speaker === Speaker.USER
              ? 'bg-indigo-100 text-indigo-700'
              : 'bg-purple-100 text-purple-700'
          }`}
        >
          {speakerIcon}
          {speakerLabel}
        </span>
        <span className="text-xs text-gray-500 line-clamp-2 flex-1">{message.text}</span>
      </div>
    );
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <section className="bg-white rounded-lg border border-gray-200">
      <button
        onClick={() => setCollapsed((prev) => !prev)}
        className="w-full px-3 md:px-4 py-2.5 md:py-3 flex items-center gap-2 md:gap-3 text-left hover:bg-gray-50 transition-colors rounded-t-lg"
      >
        <span className="text-gray-600">
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </span>
        <span className="text-gray-600">{icon}</span>
        <h3 className="flex-1 text-sm font-semibold text-gray-900">{title}</h3>
        <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
          {items.length}
        </span>
      </button>

      {!collapsed && (
        <div className="border-t border-gray-200">
          {items.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <p className="text-sm text-gray-500">{emptyMessage}</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {items.map((item) => (
                <li key={item.id} className="px-3 md:px-4 py-2.5 md:py-3 hover:bg-gray-50 transition-colors group">
                  {editingItemId === item.id ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveEdit(item.id);
                          if (e.key === 'Escape') cancelEdit();
                        }}
                        className="w-full px-3 py-2 text-sm border border-indigo-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        autoFocus
                      />
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => saveEdit(item.id)}
                          className="px-2 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-all duration-150 hover:shadow-sm active:scale-95 flex items-center gap-1"
                        >
                          <Check className="w-3 h-3" />
                          Save
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-all duration-150 active:scale-95 flex items-center gap-1"
                        >
                          <X className="w-3 h-3" />
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p
                            className="text-sm text-gray-900 cursor-pointer hover:text-indigo-600"
                            onClick={() => startEdit(item.id, item.value)}
                          >
                            {item.value}
                          </p>
                          <div className="mt-1.5">
                            {formatSource(getMessageById(item.messageId))}
                          </div>
                        </div>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-600 transition-all duration-150 hover:scale-110 active:scale-95"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}

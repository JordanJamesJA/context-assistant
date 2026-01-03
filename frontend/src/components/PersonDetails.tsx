import {
  Heart,
  Calendar,
  MapPin,
  FileText,
  Sparkles,
  Menu,
} from "lucide-react";
import type { Person, Message } from "../types/person";
import EditableList from "./EditableList";

type PersonDetailsProps = {
  person: Person | null;
  onUpdateInterest: (itemId: string, newValue: string) => void;
  onUpdateDate: (itemId: string, newValue: string) => void;
  onUpdatePlace: (itemId: string, newValue: string) => void;
  onUpdateNote: (itemId: string, newValue: string) => void;
  onDeleteInterest: (itemId: string) => void;
  onDeleteDate: (itemId: string) => void;
  onDeletePlace: (itemId: string) => void;
  onDeleteNote: (itemId: string) => void;
  getMessageById: (messageId: string) => Message | undefined;
  onMenuClick: () => void;
};

export default function PersonDetails({
  person,
  onUpdateInterest,
  onUpdateDate,
  onUpdatePlace,
  onUpdateNote,
  onDeleteInterest,
  onDeleteDate,
  onDeletePlace,
  onDeleteNote,
  getMessageById,
  onMenuClick,
}: PersonDetailsProps) {
  if (!person) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-6">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <Sparkles className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          No person selected
        </h3>
        <p className="text-sm text-gray-500 max-w-sm">
          Select a person from the sidebar to view and manage their context
        </p>
      </div>
    );
  }

  const totalItems =
    person.interests.length +
    person.importantDates.length +
    person.places.length +
    person.notes.length;

  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-gray-200 px-4 md:px-6 py-4 bg-white">
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuClick}
            className="md:hidden p-2 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-all duration-200 border border-indigo-200 hover:border-indigo-300 hover:shadow-sm active:scale-95"
            title="Open menu"
          >
            <Menu className="w-6 h-6 text-indigo-700" />
          </button>
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-linear-to-br from-indigo-400 to-purple-500 flex items-center justify-center shrink-0">
            <span className="text-white text-base md:text-lg font-semibold">
              {person.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg md:text-xl font-semibold text-gray-900 truncate">
              {person.name}
            </h2>
            <p className="text-xs md:text-sm text-gray-500">
              {totalItems} {totalItems === 1 ? "item" : "items"} tracked
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar px-4 md:px-6 py-4 space-y-4 md:space-y-6">
        {totalItems === 0 ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Sparkles className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-sm text-gray-500">
              No context extracted yet. Start a conversation below!
            </p>
          </div>
        ) : (
          <>
            <EditableList
              title="Interests"
              items={person.interests}
              onUpdate={onUpdateInterest}
              onDelete={onDeleteInterest}
              icon={<Heart className="w-4 h-4" />}
              emptyMessage="No interests tracked yet"
              getMessageById={getMessageById}
            />

            <EditableList
              title="Important Dates"
              items={person.importantDates}
              onUpdate={onUpdateDate}
              onDelete={onDeleteDate}
              icon={<Calendar className="w-4 h-4" />}
              emptyMessage="No dates tracked yet"
              getMessageById={getMessageById}
            />

            <EditableList
              title="Places"
              items={person.places}
              onUpdate={onUpdatePlace}
              onDelete={onDeletePlace}
              icon={<MapPin className="w-4 h-4" />}
              emptyMessage="No places tracked yet"
              getMessageById={getMessageById}
            />

            <EditableList
              title="Notes"
              items={person.notes}
              onUpdate={onUpdateNote}
              onDelete={onDeleteNote}
              icon={<FileText className="w-4 h-4" />}
              emptyMessage="No notes tracked yet"
              getMessageById={getMessageById}
            />
          </>
        )}
      </div>
    </div>
  );
}

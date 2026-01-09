import { useState, useEffect, useRef } from 'react';
import { User, Plus, Trash2, X } from 'lucide-react';
import type { Person } from '../types/person';

/**
 * Sidebar Component
 *
 * Displays the list of people and handles person management (add/remove/select).
 * Responsive: Slides in/out on mobile, always visible on desktop.
 *
 * Props Pattern:
 * - Receives people array and selectedPersonId from parent state
 * - Uses callback props (onSelectPerson, onAddPerson, onRemovePerson) to notify parent of changes
 * - This maintains unidirectional data flow: parent owns state, child requests changes
 */
type SidebarProps = {
  people: Person[];
  selectedPersonId: string | null;
  onSelectPerson: (id: string) => void;
  onAddPerson: (name: string) => void;
  onRemovePerson: (id: string) => void;
  isOpen: boolean;
  onClose: () => void;
};

export default function Sidebar({
  people,
  selectedPersonId,
  onSelectPerson,
  onAddPerson,
  onRemovePerson,
  isOpen,
  onClose,
}: SidebarProps) {
  // Local UI state for inline add person form
  const [isAddingPerson, setIsAddingPerson] = useState(false);
  const [newPersonName, setNewPersonName] = useState('');

  // Touch gesture tracking for swipe-to-close on mobile
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const isDragging = useRef<boolean>(false);

  function handleAddClick() {
    setIsAddingPerson(true);
  }

  function handleAddSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedName = newPersonName.trim();
    if (trimmedName) {
      onAddPerson(trimmedName);
      setNewPersonName('');
      setIsAddingPerson(false);
    }
  }

  function handleAddCancel() {
    setNewPersonName('');
    setIsAddingPerson(false);
  }

  function handleRemoveClick(e: React.MouseEvent, personId: string) {
    e.stopPropagation();
    if (confirm('Are you sure you want to remove this person? All their data will be deleted.')) {
      onRemovePerson(personId);
    }
  }

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      touchStartX.current = touch.clientX;
      touchStartY.current = touch.clientY;
      isDragging.current = false;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!e.touches[0]) return;

      const touch = e.touches[0];
      const deltaX = touch.clientX - touchStartX.current;
      const deltaY = touch.clientY - touchStartY.current;

      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
        isDragging.current = true;
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!isDragging.current) return;

      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - touchStartX.current;
      const minSwipeDistance = 50;

      if (isOpen && deltaX < -minSwipeDistance) {
        onClose();
      } else if (!isOpen && touchStartX.current < 50 && deltaX > minSwipeDistance) {
        e.preventDefault();
      }

      isDragging.current = false;
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: false });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isOpen, onClose]);

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed md:relative z-50 md:z-0
          w-64 bg-gray-50 border-r border-gray-200 flex flex-col h-screen
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        <div className="h-14 flex items-center justify-between px-4 border-b border-gray-200">
          <h1 className="text-sm font-semibold text-gray-900">Context Assistant</h1>
          <div className="flex items-center gap-1">
            <button
              onClick={handleAddClick}
              className="p-1.5 hover:bg-gray-200 rounded-md transition-all duration-150 hover:scale-105 active:scale-95"
              title="Add person"
            >
              <Plus className="w-4 h-4 text-gray-600" />
            </button>
            <button
              onClick={onClose}
              className="md:hidden p-1.5 hover:bg-gray-200 rounded-md transition-all duration-150 hover:scale-105 active:scale-95"
              title="Close menu"
            >
              <X className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </div>

        {isAddingPerson && (
        <div className="px-4 py-3 border-b border-gray-200 bg-white">
          <form onSubmit={handleAddSubmit}>
            <input
              type="text"
              value={newPersonName}
              onChange={(e) => setNewPersonName(e.target.value)}
              placeholder="Enter name..."
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              autoFocus
              onBlur={handleAddCancel}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  handleAddCancel();
                }
              }}
            />
          </form>
        </div>
        )}

        <div className="flex-1 overflow-y-auto custom-scrollbar">
        {people.length === 0 && !isAddingPerson ? (
          <div className="py-8 px-4 text-center">
            <p className="text-sm text-gray-500">No people yet</p>
            <p className="text-xs text-gray-400 mt-1">Click + to add someone</p>
          </div>
        ) : (
          <div className="py-2">
            {people.map((person) => (
              <button
                key={person.id}
                onClick={() => onSelectPerson(person.id)}
                className={`
                  w-full px-4 py-2.5 flex items-center gap-3 text-left
                  transition-colors duration-150 group
                  ${
                    selectedPersonId === person.id
                      ? 'bg-white border-l-2 border-indigo-500 text-gray-900'
                      : 'text-gray-700 hover:bg-gray-100 border-l-2 border-transparent'
                  }
                `}
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-sm font-medium">
                    {person.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{person.name}</p>
                  <p className="text-xs text-gray-500 truncate">
                    {person.interests.length +
                      person.importantDates.length +
                      person.places.length +
                      person.notes.length}{' '}
                    items
                  </p>
                </div>
                <button
                  onClick={(e) => handleRemoveClick(e, person.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-600 transition-all duration-150 hover:scale-110 active:scale-95"
                  title="Remove person"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </button>
            ))}
          </div>
        )}
        </div>

        <div className="border-t border-gray-200 p-3">
        <div className="flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors">
          <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0">
            <User className="w-5 h-5 text-gray-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">You</p>
            <p className="text-xs text-gray-500 truncate">View profile</p>
          </div>
        </div>
        </div>
      </aside>
    </>
  );
}

import { useState, useEffect, useRef } from "react";
import Sidebar from "./components/Sidebar";
import type {
  Person,
  Message,
  InfoItem,
  Speaker as SpeakerType,
} from "./types/person";
import ConversationInput from "./components/ConversationInput";
import PersonDetails from "./components/PersonDetails";

/**
 * Root Application Component
 *
 * State Management Strategy:
 * - All application state lives here (people, messages, selectedPersonId)
 * - Uses prop drilling pattern to pass state and callbacks down to children
 * - This centralized approach ensures single source of truth and predictable data flow
 *
 * Data Flow:
 * 1. User submits conversation → ConversationInput
 * 2. onSubmit callback flows up to App.tsx
 * 3. App sends text to backend AI service
 * 4. Backend returns categorized facts
 * 5. App transforms facts into InfoItems and updates people state
 * 6. State change triggers re-render, flowing updated props down to PersonDetails
 *
 * Why This Pattern:
 * - Immutability: All state updates create new objects/arrays (spread operator pattern)
 * - React reconciliation: Immutable updates ensure React detects changes correctly
 * - Predictable: Data flows down via props, events flow up via callbacks
 * - Debuggable: All state mutations happen in one place
 */
function App() {
  // Core application state
  //people: Array of all tracked individuals with their extracted information
  const [people, setPeople] = useState<Person[]>([]);

  // messages: Historical record of all conversations for source tracking
  const [messages, setMessages] = useState<Message[]>([]);

  // selectedPersonId: Currently active person (null = no selection)
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);

  // isSidebarOpen: Mobile sidebar visibility state
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Touch gesture tracking for mobile swipe-to-open sidebar
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const isDragging = useRef<boolean>(false);

  /**
   * Generates unique IDs for people, messages, and info items
   * Uses timestamp + random string to ensure uniqueness across sessions
   */
  function generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Creates a new person and automatically selects them
   * Immutability: Uses spread operator to create new array
   */
  function handleAddPerson(name: string) {
    const newPerson: Person = {
      id: generateId(),
      name,
      interests: [],
      importantDates: [],
      places: [],
      notes: [],
    };

    setPeople((prev) => [...prev, newPerson]);
    setSelectedPersonId(newPerson.id);
    setIsSidebarOpen(false);
  }

  /**
   * Removes a person and all their associated messages
   * Also handles cleanup of selected person ID if they were active
   */
  function handleRemovePerson(personId: string) {
    setPeople((prev) => prev.filter((p) => p.id !== personId));
    setMessages((prev) => prev.filter((m) => m.personId !== personId));

    if (selectedPersonId === personId) {
      const remainingPeople = people.filter((p) => p.id !== personId);
      setSelectedPersonId(
        remainingPeople.length > 0 ? remainingPeople[0].id : null
      );
    }
  }

  /**
   * Deletes a single item from a person's category
   * Immutability: Creates new person object with filtered array
   */
  function handleDeleteItem(
    itemId: string,
    itemType: "interests" | "importantDates" | "places" | "notes"
  ) {
    if (!selectedPersonId) return;

    setPeople((prevPeople) =>
      prevPeople.map((person) =>
        person.id === selectedPersonId
          ? {
              ...person,
              [itemType]: person[itemType].filter((item) => item.id !== itemId),
            }
          : person
      )
    );
  }

  /**
   * Core conversation processing flow:
   * 1. Create and store message for source tracking
   * 2. Send text to backend AI service for extraction
   * 3. Transform AI response into InfoItems
   * 4. Update selected person with new items
   * 5. Deduplicate to prevent duplicate entries
   *
   * Why async: Backend API call requires waiting for AI processing
   */
  async function handleConversationSubmit(text: string, speaker: SpeakerType) {
    if (!selectedPersonId) return;

    const message: Message = {
      id: generateId(),
      personId: selectedPersonId,
      text,
      speaker,
      timestamp: new Date().getTime(),
    };

    setMessages((prev) => [...prev, message]);

    try {
      const response = await fetch("http://localhost:5000/extract", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({ text, messageId: message.id }),
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ message: "Unknown error" }));

        return;
      }

      const data = await response.json();

      // Defensive programming: Ensure all response fields are arrays
      // Backend may return partial data or malformed responses
      const safeInterests = Array.isArray(data?.interests)
        ? data.interests
        : [];

      const safeDates = Array.isArray(data?.importantDates)
        ? data.importantDates
        : [];

      const safePlaces = Array.isArray(data?.places) ? data.places : [];
      const safeNotes = Array.isArray(data?.notes) ? data.notes : [];

      // Transform backend response into InfoItems with generated IDs
      // Each item links back to source message via messageId for traceability
      const newInterests: InfoItem[] = safeInterests.map(
        (item: { value: string }) => ({
          id: generateId(),
          value: item.value,
          messageId: message.id,
        })
      );

      const newDates: InfoItem[] = safeDates.map((item: { value: string }) => ({
        id: generateId(),
        value: item.value,
        messageId: message.id,
      }));

      const newPlaces: InfoItem[] = safePlaces.map(
        (item: { value: string }) => ({
          id: generateId(),
          value: item.value,
          messageId: message.id,
        })
      );

      const newNotes: InfoItem[] = safeNotes.map((item: { value: string }) => ({
        id: generateId(),
        value: item.value,
        messageId: message.id,
      }));

      // Immutable state update: Map over people array, update only selected person
      // Deduplication prevents same information from being stored multiple times
      setPeople((prevPeople) =>
        prevPeople.map((person) =>
          person.id === selectedPersonId
            ? {
                ...person,
                interests: deduplicateItems([
                  ...person.interests,
                  ...newInterests,
                ]),
                importantDates: deduplicateItems([
                  ...person.importantDates,
                  ...newDates,
                ]),
                places: deduplicateItems([...person.places, ...newPlaces]),
                notes: deduplicateItems([...person.notes, ...newNotes]),
              }
            : person
        )
      );
    } catch (error) {
      // Silently handle extraction errors
    }
  }

  /**
   * Deduplicates items by value to prevent duplicate entries
   * Uses Map to keep only the most recent item with each unique value
   * This handles cases where AI extracts same fact from different messages
   */
  function deduplicateItems(items: InfoItem[]): InfoItem[] {
    const seen = new Map<string, InfoItem>();
    for (const item of items) {
      seen.set(item.value, item);
    }
    return Array.from(seen.values());
  }

  /**
   * Generic item update handler - updates value while preserving ID and messageId
   * Immutability: Creates new person object with new array containing updated item
   */
  function updateItem(
    itemId: string,
    newValue: string,
    itemType: "interests" | "importantDates" | "places" | "notes"
  ) {
    if (!selectedPersonId) return;

    setPeople((prevPeople) =>
      prevPeople.map((person) =>
        person.id === selectedPersonId
          ? {
              ...person,
              [itemType]: person[itemType].map((item) =>
                item.id === itemId ? { ...item, value: newValue } : item
              ),
            }
          : person
      )
    );
  }

  // Category-specific update handlers
  // Why separate functions: Allows PersonDetails to pass type-safe callbacks to EditableList
  function updateInterest(itemId: string, newValue: string) {
    updateItem(itemId, newValue, "interests");
  }

  function updateDate(itemId: string, newValue: string) {
    updateItem(itemId, newValue, "importantDates");
  }

  function updatePlace(itemId: string, newValue: string) {
    updateItem(itemId, newValue, "places");
  }

  function updateNote(itemId: string, newValue: string) {
    updateItem(itemId, newValue, "notes");
  }

  // Category-specific delete handlers
  // Why separate functions: Type-safe prop passing to child components
  function deleteInterest(itemId: string) {
    handleDeleteItem(itemId, "interests");
  }

  function deleteDate(itemId: string) {
    handleDeleteItem(itemId, "importantDates");
  }

  function deletePlace(itemId: string) {
    handleDeleteItem(itemId, "places");
  }

  function deleteNote(itemId: string) {
    handleDeleteItem(itemId, "notes");
  }

  /**
   * Retrieves original message for source display in EditableList
   * Allows users to see context of where each fact came from
   */
  function getMessageById(messageId: string): Message | undefined {
    return messages.find((m) => m.id === messageId);
  }

  /**
   * Touch gesture handling for mobile sidebar
   * Enables swipe-right-from-edge to open sidebar (iOS/Android native pattern)
   *
   * Why refs instead of state: Touch tracking doesn't need to trigger re-renders
   * Why passive listeners: Better scroll performance on mobile
   */
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

      // Only register horizontal swipes (not vertical scrolling)
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
        isDragging.current = true;
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!isDragging.current) return;

      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - touchStartX.current;
      const minSwipeDistance = 50;

      // Open sidebar when swiping right from left edge
      if (
        !isSidebarOpen &&
        touchStartX.current < 50 &&
        deltaX > minSwipeDistance
      ) {
        setIsSidebarOpen(true);
      }

      isDragging.current = false;
    };

    document.addEventListener("touchstart", handleTouchStart, {
      passive: true,
    });
    document.addEventListener("touchmove", handleTouchMove, { passive: true });
    document.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, [isSidebarOpen]);

  // Derived state: Compute selected person from ID
  // Why derived: Prevents state duplication and ensures consistency
  const selectedPerson = people.find((p) => p.id === selectedPersonId) ?? null;

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar
        people={people}
        selectedPersonId={selectedPersonId}
        onSelectPerson={(id) => {
          setSelectedPersonId(id);
          setIsSidebarOpen(false);
        }}
        onAddPerson={handleAddPerson}
        onRemovePerson={handleRemovePerson}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-hidden bg-gray-50">
          <PersonDetails
            person={selectedPerson}
            onUpdateInterest={updateInterest}
            onUpdateDate={updateDate}
            onUpdatePlace={updatePlace}
            onUpdateNote={updateNote}
            onDeleteInterest={deleteInterest}
            onDeleteDate={deleteDate}
            onDeletePlace={deletePlace}
            onDeleteNote={deleteNote}
            getMessageById={getMessageById}
            onMenuClick={() => setIsSidebarOpen(true)}
          />
        </div>

        <div className="border-t border-gray-200 bg-white">
          <ConversationInput
            selectedPersonId={selectedPersonId}
            onSubmit={handleConversationSubmit}
          />
        </div>
      </main>
    </div>
  );
}

export default App;

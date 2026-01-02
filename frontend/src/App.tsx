import { useState, useEffect, useRef } from "react";
import Sidebar from "./components/Sidebar";
import type { Person, Message, InfoItem, Speaker as SpeakerType } from "./types/person";
import ConversationInput from "./components/ConversationInput";
import PersonDetails from "./components/PersonDetails";

function App() {
  const [people, setPeople] = useState<Person[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const isDragging = useRef<boolean>(false);

  function generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

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

  function handleRemovePerson(personId: string) {
    setPeople((prev) => prev.filter((p) => p.id !== personId));
    setMessages((prev) => prev.filter((m) => m.personId !== personId));

    if (selectedPersonId === personId) {
      const remainingPeople = people.filter((p) => p.id !== personId);
      setSelectedPersonId(remainingPeople.length > 0 ? remainingPeople[0].id : null);
    }
  }

  function handleDeleteItem(
    itemId: string,
    itemType: 'interests' | 'importantDates' | 'places' | 'notes'
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

    const response = await fetch("http://localhost:5000/extract", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text, messageId: message.id }),
    });

    const data = await response.json();

    const newInterests: InfoItem[] = data.interests.map((item: { value: string }) => ({
      id: generateId(),
      value: item.value,
      messageId: message.id,
    }));

    const newDates: InfoItem[] = data.importantDates.map((item: { value: string }) => ({
      id: generateId(),
      value: item.value,
      messageId: message.id,
    }));

    const newPlaces: InfoItem[] = data.places.map((item: { value: string }) => ({
      id: generateId(),
      value: item.value,
      messageId: message.id,
    }));

    const newNotes: InfoItem[] = data.notes.map((item: { value: string }) => ({
      id: generateId(),
      value: item.value,
      messageId: message.id,
    }));

    setPeople((prevPeople) =>
      prevPeople.map((person) =>
        person.id === selectedPersonId
          ? {
              ...person,
              interests: deduplicateItems([...person.interests, ...newInterests]),
              importantDates: deduplicateItems([...person.importantDates, ...newDates]),
              places: deduplicateItems([...person.places, ...newPlaces]),
              notes: deduplicateItems([...person.notes, ...newNotes]),
            }
          : person
      )
    );
  }

  function deduplicateItems(items: InfoItem[]): InfoItem[] {
    const seen = new Map<string, InfoItem>();
    for (const item of items) {
      seen.set(item.value, item);
    }
    return Array.from(seen.values());
  }

  function updateItem(
    itemId: string,
    newValue: string,
    itemType: 'interests' | 'importantDates' | 'places' | 'notes'
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

  function updateInterest(itemId: string, newValue: string) {
    updateItem(itemId, newValue, 'interests');
  }

  function updateDate(itemId: string, newValue: string) {
    updateItem(itemId, newValue, 'importantDates');
  }

  function updatePlace(itemId: string, newValue: string) {
    updateItem(itemId, newValue, 'places');
  }

  function updateNote(itemId: string, newValue: string) {
    updateItem(itemId, newValue, 'notes');
  }

  function deleteInterest(itemId: string) {
    handleDeleteItem(itemId, 'interests');
  }

  function deleteDate(itemId: string) {
    handleDeleteItem(itemId, 'importantDates');
  }

  function deletePlace(itemId: string) {
    handleDeleteItem(itemId, 'places');
  }

  function deleteNote(itemId: string) {
    handleDeleteItem(itemId, 'notes');
  }

  function getMessageById(messageId: string): Message | undefined {
    return messages.find((m) => m.id === messageId);
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

      if (!isSidebarOpen && touchStartX.current < 50 && deltaX > minSwipeDistance) {
        setIsSidebarOpen(true);
      }

      isDragging.current = false;
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isSidebarOpen]);

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

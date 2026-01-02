import { useState, useRef, useEffect } from "react";
import { Send, FileText, Loader2, User, MessageCircle } from "lucide-react";
import { Speaker, type Speaker as SpeakerType } from "../types/person";

type ConversationInputProps = {
  selectedPersonId: string | null;
  onSubmit: (message: string, speaker: SpeakerType) => Promise<void>;
};

export default function ConversationInput({
  selectedPersonId,
  onSubmit,
}: ConversationInputProps) {
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [speaker, setSpeaker] = useState<SpeakerType>(Speaker.PERSON); // Default: what they said
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
    }
  }, [message]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPersonId || !message.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onSubmit(message, speaker);
      setMessage("");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }

  function handleFileClick() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.txt';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          setMessage(event.target?.result as string);
        };
        reader.readAsText(file);
      }
    };
    input.click();
  }

  function toggleSpeaker() {
    setSpeaker((prev) => (prev === Speaker.USER ? Speaker.PERSON : Speaker.USER));
  }

  const placeholderText = selectedPersonId
    ? speaker === Speaker.PERSON
      ? "What did they say...? (Shift+Enter for new line)"
      : "What did you say...? (Shift+Enter for new line)"
    : "Select a person to start extracting context";

  return (
    <form onSubmit={handleSubmit} className="px-3 md:px-6 pb-4 md:pb-6 pt-4 md:pt-0">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow focus-within:shadow-md focus-within:border-indigo-300">
          {selectedPersonId && (
            <div className="flex flex-wrap items-center gap-2 px-3 md:px-4 pt-3 pb-2 border-b border-gray-100">
              <span className="text-xs text-gray-500 font-medium">Who said this?</span>
              <button
                type="button"
                onClick={toggleSpeaker}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-150 hover:scale-105 active:scale-95 ${
                  speaker === Speaker.USER
                    ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                    : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                }`}
              >
                {speaker === Speaker.USER ? (
                  <>
                    <User className="w-3 h-3" />
                    You
                  </>
                ) : (
                  <>
                    <MessageCircle className="w-3 h-3" />
                    Them
                  </>
                )}
              </button>
              <span className="text-xs text-gray-400 hidden sm:inline">(click to switch)</span>
            </div>
          )}

          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholderText}
            disabled={!selectedPersonId || isSubmitting}
            rows={1}
            className="w-full px-3 md:px-4 py-3 text-sm md:text-[15px] text-gray-900 placeholder-gray-400 resize-none focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed rounded-t-xl"
            style={{ maxHeight: '200px' }}
          />

          <div className="flex items-center justify-between px-2 md:px-3 py-2 border-t border-gray-100">
            <button
              type="button"
              onClick={handleFileClick}
              disabled={!selectedPersonId || isSubmitting}
              className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95"
              title="Upload text file"
            >
              <FileText className="w-4 h-4" />
            </button>

            <button
              type="submit"
              disabled={!selectedPersonId || !message.trim() || isSubmitting}
              className="px-3 py-1.5 bg-indigo-600 text-white text-xs md:text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 hover:shadow-md active:scale-95 flex items-center gap-1.5 md:gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Extracting...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Extract</span>
                </>
              )}
            </button>
          </div>
        </div>

        <p className="text-xs text-gray-500 text-center mt-2 px-2">
          This will extract interests, dates, places, and notes from your conversation
        </p>
      </div>
    </form>
  );
}

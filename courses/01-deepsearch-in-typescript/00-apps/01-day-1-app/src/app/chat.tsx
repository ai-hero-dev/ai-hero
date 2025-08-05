"use client";

import { useChat } from "@ai-sdk/react";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { StickToBottom } from "use-stick-to-bottom";
import { ChatMessage } from "~/components/chat-message";
import { SignInModal } from "~/components/sign-in-modal";
import { isNewChatCreated } from "~/utils";
import type { Message } from "ai";
import type { OurMessageAnnotation } from "~/get-next-action";

interface ChatProps {
  userName: string;
  isAuthenticated: boolean;
  chatId: string | undefined;
  initialMessages: Message[];
}

export const ChatPage = ({
  userName,
  isAuthenticated,
  chatId,
  initialMessages,
}: ChatProps) => {
  const {
    messages,
    input,
    handleInputChange,
    handleSubmit: originalHandleSubmit,
    isLoading,
    data,
  } = useChat({
    body: {
      chatId,
    },
    initialMessages,
  });
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [pendingChatId, setPendingChatId] = useState<string | null>(null);
  const router = useRouter();

  // Log our messages
  console.log(messages);

  // Handle redirect when a new chat is created
  useEffect(() => {
    const lastDataItem = data?.[data.length - 1];

    if (lastDataItem && isNewChatCreated(lastDataItem)) {
      // Store the new chat ID but don't redirect immediately
      setPendingChatId(lastDataItem.chatId);
    }
  }, [data]);

  // Redirect only after streaming is complete and we have a pending chat ID
  useEffect(() => {
    if (pendingChatId && !isLoading) {
      router.push(`?id=${pendingChatId}`);
      setPendingChatId(null);
    }
  }, [pendingChatId, isLoading, router]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!isAuthenticated) {
      setShowSignInModal(true);
      return;
    }

    originalHandleSubmit(e);
  };

  return (
    <>
      <div className="flex flex-1 flex-col">
        <StickToBottom
          className="mx-auto w-full max-w-[65ch] flex-1 overflow-y-auto p-4 md:max-w-[80ch] lg:max-w-[90ch] xl:max-w-[100ch] [&>div]:scrollbar-thin [&>div]:scrollbar-track-gray-800 [&>div]:scrollbar-thumb-gray-600 [&>div]:hover:scrollbar-thumb-gray-500"
          resize="smooth"
          initial="smooth"
          role="log"
          aria-label="Chat messages"
        >
          <StickToBottom.Content className="flex flex-col gap-4">
            {messages.map((message, index) => {
              return (
                <ChatMessage
                  key={index}
                  parts={message.parts ?? []}
                  role={message.role}
                  userName={userName}
                  annotations={
                    (message.annotations ?? []) as OurMessageAnnotation[]
                  }
                />
              );
            })}
          </StickToBottom.Content>
        </StickToBottom>

        <div className="border-t border-gray-700">
          <form
            onSubmit={handleSubmit}
            className="mx-auto max-w-[65ch] p-4 md:max-w-[80ch] lg:max-w-[90ch] xl:max-w-[100ch]"
          >
            <div className="flex gap-2">
              <input
                value={input}
                onChange={handleInputChange}
                placeholder={
                  isAuthenticated
                    ? "Say something..."
                    : "Sign in to start chatting..."
                }
                autoFocus={isAuthenticated}
                disabled={isLoading}
                aria-label="Chat input"
                className="flex-1 rounded border border-gray-700 bg-gray-800 p-2 text-gray-200 placeholder-gray-400 focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={isLoading}
                className="rounded bg-gray-700 px-4 py-2 text-white hover:bg-gray-600 focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50 disabled:hover:bg-gray-700"
              >
                {isLoading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  "Send"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      <SignInModal
        isOpen={showSignInModal}
        onClose={() => setShowSignInModal(false)}
      />
    </>
  );
};

import { PlusIcon } from "lucide-react";
import Link from "next/link";
import { auth } from "~/server/auth/index.ts";
import { ChatPage } from "./chat.tsx";
import { AuthButton } from "../components/auth-button.tsx";
import { getChats, getChat } from "../server/db/queries";
import type { Message as AIMessage } from "ai";
import { nanoid } from "nanoid";

interface SidebarChat {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
}

async function getSidebarAndChatData({
  userId,
  chatId,
}: {
  userId?: string;
  chatId?: string;
}) {
  const isAuthenticated = !!userId;
  let chats: SidebarChat[] = [];
  let initialMessages: AIMessage[] | undefined = undefined;

  if (isAuthenticated) {
    chats = await getChats({ userId });
    if (chatId) {
      const chat = await getChat({ userId, chatId });
      if (chat && chat.messages) {
        initialMessages = chat.messages.map((msg) => ({
          id: msg.id,
          role: msg.role as "user" | "assistant",
          parts: msg.parts as AIMessage["parts"],
          content: "",
        }));
      }
    }
  }
  return { chats, initialMessages, isAuthenticated };
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ chatId?: string }>;
}) {
  const session = await auth();
  const userName = session?.user?.name ?? "Guest";
  const userId = session?.user?.id;
  const { chatId: chatIdFromUrl } = await searchParams;

  // Always provide a stable chatId
  const chatId = chatIdFromUrl ?? nanoid();
  const isNewChat = !chatIdFromUrl;

  const { chats, initialMessages, isAuthenticated } =
    await getSidebarAndChatData({ userId, chatId: chatIdFromUrl });

  return (
    <div className="flex h-screen bg-gray-950">
      {/* Sidebar */}
      <div className="flex w-64 flex-col border-r border-gray-700 bg-gray-900">
        <div className="p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-400">Your Chats</h2>
            {isAuthenticated && (
              <Link
                href="/"
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
                title="New Chat"
              >
                <PlusIcon className="size-5" />
              </Link>
            )}
          </div>
        </div>
        <div className="-mt-1 flex-1 space-y-2 overflow-y-auto px-4 pt-1 scrollbar-thin scrollbar-track-gray-800 scrollbar-thumb-gray-600">
          {chats.length > 0 ? (
            chats.map((chat) => (
              <div key={chat.id} className="flex items-center gap-2">
                <Link
                  href={`/?chatId=${chat.id}`}
                  className={`flex-1 rounded-lg p-3 text-left text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                    chat.id === chatIdFromUrl
                      ? "bg-gray-700"
                      : "hover:bg-gray-750 bg-gray-800"
                  }`}
                >
                  {chat.title}
                </Link>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-500">
              {isAuthenticated
                ? "No chats yet. Start a new conversation!"
                : "Sign in to start chatting"}
            </p>
          )}
        </div>
        <div className="p-4">
          <AuthButton
            isAuthenticated={isAuthenticated}
            userImage={session?.user?.image}
          />
        </div>
      </div>

      <ChatPage
        key={chatId}
        userName={userName}
        isAuthenticated={isAuthenticated}
        chatId={chatId}
        isNewChat={isNewChat}
        initialMessages={initialMessages}
      />
    </div>
  );
}

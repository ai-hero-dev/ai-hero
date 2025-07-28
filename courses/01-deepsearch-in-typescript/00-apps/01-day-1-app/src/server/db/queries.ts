import { eq, and, desc, ne } from "drizzle-orm";
import type { Message } from "ai";

import { db } from "./index";
import { chats, messages } from "./schema";

export const upsertChat = async (opts: {
  userId: string;
  chatId: string;
  title: string;
  messages: Message[];
}) => {
  const { userId, chatId, title, messages: chatMessages } = opts;

  // Check if chat exists and belongs to user
  const existingChat = await db
    .select()
    .from(chats)
    .where(and(eq(chats.id, chatId), eq(chats.userId, userId)))
    .limit(1);

  if (existingChat.length > 0) {
    // Chat exists, delete all existing messages and replace them
    await db.delete(messages).where(eq(messages.chatId, chatId));
  } else {
    // Check if chatId is already used by a different user
    const chatWithDifferentUser = await db
      .select()
      .from(chats)
      .where(and(eq(chats.id, chatId), ne(chats.userId, userId)))
      .limit(1);

    if (chatWithDifferentUser.length > 0) {
      throw new Error(`Chat ID is already in use by another user`);
    }

    // Create new chat
    await db.insert(chats).values({
      id: chatId,
      title,
      userId,
    });
  }

  // Insert all messages
  if (chatMessages.length > 0) {
    const messageValues = chatMessages.map((message, index) => ({
      chatId,
      role: message.role,
      parts: message.parts,
      order: index,
    }));

    await db.insert(messages).values(messageValues);
  }

  return { id: chatId };
};

export const getChat = async (opts: { userId: string; chatId: string }) => {
  const { userId, chatId } = opts;

  // Get chat with messages, ensuring it belongs to the user
  const chatWithMessages = await db
    .select({
      chat: chats,
      message: messages,
    })
    .from(chats)
    .leftJoin(messages, eq(chats.id, messages.chatId))
    .where(and(eq(chats.id, chatId), eq(chats.userId, userId)))
    .orderBy(messages.order);

  if (chatWithMessages.length === 0) {
    return null;
  }

  const chat = chatWithMessages[0]?.chat;

  const dbMessages = chatWithMessages
    .filter((row) => row.message !== null)
    .map((row) => row.message!);

  // Convert database messages back to AI SDK Message format
  const aiMessages: Message[] = dbMessages.map((msg) => ({
    id: msg.id,
    role: msg.role as "user" | "assistant" | "system",
    content: msg.parts as string,
  }));

  return {
    ...chat,
    messages: aiMessages,
  };
};

export const getChats = async (userId: string) => {
  const userChats = await db
    .select({
      id: chats.id,
      title: chats.title,
      createdAt: chats.createdAt,
      updatedAt: chats.updatedAt,
    })
    .from(chats)
    .where(eq(chats.userId, userId))
    .orderBy(desc(chats.updatedAt));

  return userChats;
};

import { db } from "./index";
import { chats, messages, userRequests } from "./schema";
import { eq, and, gte, lt } from "drizzle-orm";
import type { Message as AIMessage } from "ai";
import { nanoid } from "nanoid";
import { env } from "~/env";
import { generateText } from "ai";
import { model } from "~/app/api/chat/model";

export const upsertChat = async (opts: {
  userId: string;
  chatId: string;
  title?: string;
  messages: AIMessage[];
}) => {
  // Check if chat exists
  const chat = await db.query.chats.findFirst({
    where: eq(chats.id, opts.chatId),
  });

  if (chat && chat.userId !== opts.userId) {
    throw new Error("Chat does not belong to this user");
  }

  if (!chat) {
    // Create new chat
    await db.insert(chats).values({
      id: opts.chatId,
      userId: opts.userId,
      title: opts.title ?? "New Chat",
    });
  } else {
    // Update title and updatedAt only if title is provided
    if (opts.title !== undefined) {
      await db
        .update(chats)
        .set({ title: opts.title, updatedAt: new Date() })
        .where(eq(chats.id, opts.chatId));
    } else {
      // Only update updatedAt if no title is provided
      await db
        .update(chats)
        .set({ updatedAt: new Date() })
        .where(eq(chats.id, opts.chatId));
    }
    // Delete existing messages
    await db.delete(messages).where(eq(messages.chatId, opts.chatId));
  }

  // Insert new messages
  if (opts.messages.length > 0) {
    console.log("upserting messages", opts.messages);
    await db.insert(messages).values(
      opts.messages.map((m, i) => ({
        id: nanoid(),
        chatId: opts.chatId,
        role: m.role,
        parts: m.parts,
        annotations: m.annotations,
        order: i,
      })),
    );
  }
};

export const getChat = async (opts: { userId: string; chatId: string }) => {
  const chat = await db.query.chats.findFirst({
    where: and(eq(chats.id, opts.chatId), eq(chats.userId, opts.userId)),
    with: {
      messages: {
        orderBy: (messages, { asc }) => [asc(messages.order)],
      },
    },
  });
  return chat;
};

export const getChats = async (opts: { userId: string }) => {
  return db.query.chats.findMany({
    where: eq(chats.userId, opts.userId),
    columns: {
      id: true,
      title: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: (chats, { desc }) => [desc(chats.updatedAt)],
  });
};

export const generateChatTitle = async (messages: AIMessage[]) => {
  const { text } = await generateText({
    model,
    system: `You are a chat title generator.
      You will be given a chat history, and you will need to generate a title for the chat.
      The title should be a single sentence that captures the essence of the chat.
      The title should be no more than 50 characters.
      The title should be in the same language as the chat history.
      `,
    prompt: `Here is the chat history:

      ${messages.map((m) => m.content).join("\n")}
    `,
  });

  return text;
};

const DAILY_LIMIT = env.DB_DAILY_LIMIT;

export async function checkRateLimit(userId: string) {
  // Get user from DB to check admin status
  const user = await db.query.users.findFirst({
    where: (u, { eq }) => eq(u.id, userId),
  });
  if (!user) {
    return { allowed: false, isAdmin: false, error: "User not found" };
  }
  if (user.isAdmin) {
    return { allowed: true, isAdmin: true };
  }
  // Count requests for today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const requestsToday = await db
    .select()
    .from(userRequests)
    .where(
      and(
        eq(userRequests.userId, userId),
        gte(userRequests.requestedAt, today),
        lt(userRequests.requestedAt, tomorrow),
      ),
    );
  const requestCount = requestsToday.length;
  if (requestCount >= DAILY_LIMIT) {
    return { allowed: false, isAdmin: false, error: "Too Many Requests" };
  }
  // Insert new request
  await db.insert(userRequests).values({ userId });
  return { allowed: true, isAdmin: false };
}

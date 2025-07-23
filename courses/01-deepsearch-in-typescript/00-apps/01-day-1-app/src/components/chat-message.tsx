import ReactMarkdown, { type Components } from "react-markdown";
import type { Message } from "ai";
import { useState } from "react";
import { ReasoningSteps } from "./reasoning-steps";
import type { MessageAnnotation } from "~/lib/get-next-action";

// MessagePart covers all possible message content types. Hover to see all options!
export type MessagePart = NonNullable<Message["parts"]>[number];

interface ChatMessageProps {
  parts: MessagePart[];
  role: string;
  userName: string;
  annotations: MessageAnnotation[];
}

const components: Components = {
  // Override default elements with custom styling
  p: ({ children }) => <p className="mb-4 first:mt-0 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="mb-4 list-disc pl-4">{children}</ul>,
  ol: ({ children }) => <ol className="mb-4 list-decimal pl-4">{children}</ol>,
  li: ({ children }) => <li className="mb-1">{children}</li>,
  code: ({ className, children, ...props }) => (
    <code className={`${className ?? ""}`} {...props}>
      {children}
    </code>
  ),
  pre: ({ children }) => (
    <pre className="mb-4 overflow-x-auto rounded-lg bg-gray-700 p-4">
      {children}
    </pre>
  ),
  a: ({ children, ...props }) => (
    <a
      className="text-blue-400 underline"
      target="_blank"
      rel="noopener noreferrer"
      {...props}
    >
      {children}
    </a>
  ),
};

const Markdown = ({ children }: { children: string }) => {
  return <ReactMarkdown components={components}>{children}</ReactMarkdown>;
};

function renderPart(part: MessagePart, idx: number) {
  if (part.type === "text") {
    return <Markdown key={idx}>{part.text}</Markdown>;
  }
  if (part.type === "tool-invocation") {
    const { toolInvocation } = part;
    // Show tool call/result in a readable way
    if (
      toolInvocation.state === "call" ||
      toolInvocation.state === "partial-call"
    ) {
      return (
        <div
          key={idx}
          className="my-2 rounded bg-gray-700 p-2 text-sm text-gray-200"
        >
          <div className="mb-1 font-mono text-xs">
            🔧 Tool Call: <b>{toolInvocation.toolName}</b>
          </div>
          <pre className="overflow-x-auto whitespace-pre-wrap break-all">
            {JSON.stringify(toolInvocation.args, null, 2)}
          </pre>
        </div>
      );
    }
    if (toolInvocation.state === "result") {
      // Collapsible tool result
      return (
        <CollapsibleToolResult key={idx} toolInvocation={toolInvocation} />
      );
    }
  }
  return null;
}

function CollapsibleToolResult({ toolInvocation }: { toolInvocation: any }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="my-2 rounded bg-gray-800 p-2 text-sm text-gray-200">
      <div className="flex items-center justify-between">
        <div className="mb-1 font-mono text-xs">
          ✅ Tool Result: <b>{toolInvocation.toolName}</b>
        </div>
        <button
          type="button"
          className="ml-2 rounded bg-gray-700 px-2 py-1 text-xs text-gray-300 hover:bg-gray-600"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          {open ? "Hide details" : "Show details"}
        </button>
      </div>
      {open && (
        <>
          <div className="mb-1 font-mono text-xs">Args:</div>
          <pre className="mb-1 overflow-x-auto whitespace-pre-wrap break-all">
            {JSON.stringify(toolInvocation.args, null, 2)}
          </pre>
          <div className="mb-1 font-mono text-xs">Result:</div>
          <pre className="overflow-x-auto whitespace-pre-wrap break-all">
            {JSON.stringify(toolInvocation.result, null, 2)}
          </pre>
        </>
      )}
    </div>
  );
}

export const ChatMessage = ({
  parts,
  role,
  userName,
  annotations,
}: ChatMessageProps) => {
  const isAI = role === "assistant";

  return (
    <div className="mb-6">
      <div
        className={`rounded-lg p-4 ${
          isAI ? "bg-gray-800 text-gray-300" : "bg-gray-900 text-gray-300"
        }`}
      >
        <p className="mb-2 text-sm font-semibold text-gray-400">
          {isAI ? "AI" : userName}
        </p>
        {isAI && annotations && annotations.length > 0 && (
          <ReasoningSteps annotations={annotations} />
        )}
        <div className="prose prose-invert max-w-none">
          {parts.map((part, idx) => renderPart(part, idx))}
        </div>
      </div>
    </div>
  );
};

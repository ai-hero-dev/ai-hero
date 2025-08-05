import ReactMarkdown, { type Components } from "react-markdown";
import type { Message } from "ai";
import { ReasoningSteps } from "./reasoning-steps";
import type { OurMessageAnnotation } from "../get-next-action";

export type MessagePart = NonNullable<Message["parts"]>[number];

interface ChatMessageProps {
  parts: MessagePart[];
  role: string;
  userName: string;
  annotations?: OurMessageAnnotation[];
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

const ToolInvocation = ({
  part,
}: {
  part: Extract<MessagePart, { type: "tool-invocation" }>;
}) => {
  const { toolInvocation } = part;

  return (
    <div className="bg-gray-750 mb-4 rounded-lg border border-gray-600 p-3">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-sm font-medium text-blue-400">
          {toolInvocation.toolName}
        </span>
        <span
          className={`rounded px-2 py-1 text-xs ${
            toolInvocation.state === "partial-call"
              ? "bg-yellow-900 text-yellow-200"
              : toolInvocation.state === "call"
                ? "bg-blue-900 text-blue-200"
                : "bg-green-900 text-green-200"
          }`}
        >
          {toolInvocation.state === "partial-call"
            ? "Calling..."
            : toolInvocation.state === "call"
              ? "Called"
              : "Result"}
        </span>
      </div>

      {toolInvocation.state !== "partial-call" && (
        <div className="mb-2">
          <div className="mb-1 text-xs text-gray-400">Arguments:</div>
          <pre className="overflow-x-auto rounded bg-gray-900 p-2 text-xs">
            {JSON.stringify(toolInvocation.args, null, 2)}
          </pre>
        </div>
      )}

      {toolInvocation.state === "result" && "result" in toolInvocation && (
        <div>
          <div className="mb-1 text-xs text-gray-400">Result:</div>
          <pre className="overflow-x-auto rounded bg-gray-900 p-2 text-xs">
            {JSON.stringify(toolInvocation.result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

const MessagePartRenderer = ({ part }: { part: MessagePart }) => {
  switch (part.type) {
    case "text":
      return <Markdown>{part.text}</Markdown>;

    case "tool-invocation":
      return <ToolInvocation part={part} />;

    default:
      return null;
  }
};

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
          {parts.map((part, index) => (
            <MessagePartRenderer key={index} part={part} />
          ))}
        </div>
      </div>
    </div>
  );
};

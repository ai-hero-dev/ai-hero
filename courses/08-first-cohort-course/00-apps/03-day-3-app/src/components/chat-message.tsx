import ReactMarkdown, { type Components } from "react-markdown";
import type { Message } from "ai";

export type MessagePart = NonNullable<Message["parts"]>[number];

export type LanguageModelV1Source = (NonNullable<Message["parts"]>[number] & {
  type: "source";
})["source"];

interface ChatMessageProps {
  parts: MessagePart[] | undefined;
  role: string;
  userName: string;
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
  toolInvocation,
}: {
  toolInvocation: NonNullable<
    MessagePart & { type: "tool-invocation" }
  >["toolInvocation"];
}) => {
  return (
    <div className="mb-4 rounded-lg bg-gray-700 p-4">
      <div className="mb-2 font-mono text-sm text-gray-400">
        {toolInvocation.toolName}
      </div>
      <div className="overflow-x-auto">
        <pre className="text-sm">
          {JSON.stringify(toolInvocation.args, null, 2)}
        </pre>
        {toolInvocation.state === "result" && (
          <>
            <div className="my-2 border-t border-gray-600" />
            <pre className="text-sm">
              {JSON.stringify(toolInvocation.result, null, 2)}
            </pre>
          </>
        )}
      </div>
    </div>
  );
};

export const ChatMessage = ({ parts, role, userName }: ChatMessageProps) => {
  const isAI = role === "assistant";

  const sources = parts?.filter((part) => part.type === "source") ?? [];

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

        <div className="prose prose-invert max-w-none">
          {parts?.map((part, index) => {
            if (part.type === "text") {
              return <Markdown key={index}>{part.text}</Markdown>;
            }

            // if (part.type === "tool-invocation") {
            //   return (
            //     <ToolInvocation
            //       key={index}
            //       toolInvocation={part.toolInvocation}
            //     />
            //   );
            // }

            return null;
          })}
        </div>

        {sources.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-x-3 gap-y-2">
            {sources?.map((part) => {
              const displayUrl = part.source.url.startsWith("http")
                ? new URL(part.source.url).hostname
                : part.source.url;

              return (
                <a
                  className="font-mono text-xs text-gray-400"
                  href={part.source.url}
                  key={part.source.id}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {displayUrl}
                </a>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

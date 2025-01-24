import { useChat } from "ai/react";
import { createRoot } from "react-dom/client";
import "./tailwind.css";
import {
  Wrapper,
  Message,
  ToolInvocation,
  ChatInput,
} from "../../../_shared/components/components.tsx";

const App = () => {
  const {
    messages,
    addToolResult,
    input,
    isLoading,
    handleInputChange,
    handleSubmit,
  } = useChat({
    api: "http://localhost:4317/api/chat",
    initialInput: "Delete example.ts for me",
  });

  const toolsAwaitingConfirmation = isLoading
    ? []
    : messages.flatMap(
        (message) =>
          message.toolInvocations?.filter(
            (invocation) =>
              invocation.state === "call",
          ) ?? [],
      );

  return (
    <Wrapper>
      {messages.map((message) => (
        <>
          <Message
            key={message.id}
            role={message.role}
            content={message.content}
          />
        </>
      ))}
      {toolsAwaitingConfirmation.map((invocation) => (
        <ToolInvocation
          key={invocation.toolCallId}
          toolName={invocation.toolName}
          args={invocation.args}
          onProceed={() => {
            fetch(
              "http://localhost:4317/api/call-tool",
              {
                method: "POST",
                body: JSON.stringify(invocation),
              },
            )
              .then((r) => r.json())
              .then((r) => {
                addToolResult({
                  toolCallId: invocation.toolCallId,
                  result: r,
                });
              })
              .catch((e) => {
                addToolResult({
                  toolCallId: invocation.toolCallId,
                  result: JSON.stringify({
                    error: e.message,
                  }),
                });
              });
          }}
        />
      ))}
      <ChatInput
        input={input}
        onChange={handleInputChange}
        onSubmit={handleSubmit}
        disabled={toolsAwaitingConfirmation.length > 0}
      />
    </Wrapper>
  );
};

const root = createRoot(
  document.getElementById("root")!,
);
root.render(<App />);

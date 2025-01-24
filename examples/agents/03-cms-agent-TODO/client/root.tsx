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
    handleInputChange,
    handleSubmit,
    isLoading,
  } = useChat({
    api: "http://localhost:4317/api/chat",
  });

  const hasUncalledTools =
    !isLoading &&
    messages.some((message) =>
      message.toolInvocations?.some(
        (invocation) => invocation.state === "call",
      ),
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
          {hasUncalledTools
            ? message.toolInvocations
                ?.filter(
                  (invocation) =>
                    invocation.state === "call",
                )
                ?.map((invocation) => (
                  <ToolInvocation
                    key={invocation.toolCallId}
                    toolName={invocation.toolName}
                    args={invocation.args}
                    onProceed={() => {
                      fetch(
                        "http://localhost:4317/api/call-tool",
                        {
                          method: "POST",
                          body: JSON.stringify(
                            invocation,
                          ),
                        },
                      )
                        .then((r) => r.json())
                        .then((r) => {
                          addToolResult({
                            toolCallId:
                              invocation.toolCallId,
                            result: r,
                          });
                        })
                        .catch((e) => {
                          addToolResult({
                            toolCallId:
                              invocation.toolCallId,
                            result: JSON.stringify({
                              error: e.message,
                            }),
                          });
                        });
                    }}
                  />
                ))
            : null}
        </>
      ))}
      <ChatInput
        input={input}
        onChange={handleInputChange}
        onSubmit={handleSubmit}
        disabled={hasUncalledTools}
      />
    </Wrapper>
  );
};

const root = createRoot(
  document.getElementById("root")!,
);
root.render(<App />);

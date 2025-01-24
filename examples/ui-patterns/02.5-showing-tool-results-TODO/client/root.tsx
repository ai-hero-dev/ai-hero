import { useChat } from "ai/react";
import { createRoot } from "react-dom/client";
import {
  ChatInput,
  Message,
  Wrapper,
} from "../../../_shared/components/components.tsx";
import "./tailwind.css";

const App = () => {
  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
  } = useChat({
    api: "http://localhost:4317/api/chat",
    initialInput:
      "What's inside the examples directory?",
  });

  return (
    <Wrapper>
      {messages.map((message) => (
        <>
          <Message
            key={message.id}
            role={message.role}
            content={message.content}
          />
          {message.toolInvocations
            ?.filter(
              (invocation) =>
                invocation.state === "result",
            )
            ?.map((invocation) => (
              <pre key={invocation.toolCallId}>
                {JSON.stringify(
                  invocation.result,
                  null,
                  2,
                )}
              </pre>
            ))}
        </>
      ))}
      <ChatInput
        input={input}
        onChange={handleInputChange}
        onSubmit={handleSubmit}
      />
    </Wrapper>
  );
};

const root = createRoot(
  document.getElementById("root")!,
);
root.render(<App />);

import { type ReactNode } from "react";

export const Wrapper = (props: {
  children: React.ReactNode;
}) => {
  return (
    <div className="flex flex-col w-full max-w-md py-24 mx-auto stretch">
      {props.children}
    </div>
  );
};

export const FadeIn = (props: {
  children: ReactNode;
}) => {
  return (
    <span
      style={{
        animation: "fadeIn 0.2s",
      }}
    >
      {props.children}
    </span>
  );
};

export const Message = ({
  role,
  content,
}: {
  role: string;
  content: string;
}) => (
  <div className="whitespace-pre-wrap my-6">
    <FadeIn>
      {role === "user" ? "User: " : "AI: "}
    </FadeIn>
    {content.split(" ").map((word, i) => (
      <FadeIn key={`${word}_${i}`}>{word} </FadeIn>
    ))}
  </div>
);

export const ToolInvocation = ({
  toolName,
  args,
  onProceed,
}: {
  toolName: string;
  args: any;
  onProceed: () => void;
}) => (
  <div className="space-y-2">
    <p>
      LLM is requesting to call {toolName} with args:
    </p>
    <pre>{JSON.stringify(args, null, 2)}</pre>
    <button
      className="bg-white text-gray-800 px-2 py-1 rounded font-semibold text-sm"
      onClick={onProceed}
    >
      Proceed
    </button>
  </div>
);

export const ChatInput = ({
  input,
  onChange,
  onSubmit,
  disabled,
}: {
  input: string;
  onChange: (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => void;
  onSubmit: (e: React.FormEvent) => void;
  disabled?: boolean;
}) => (
  <form onSubmit={onSubmit}>
    <input
      className={`fixed bottom-0 w-full max-w-md p-2 mb-8 border-2 border-zinc-700 rounded shadow-xl bg-gray-800 ${
        disabled ? "opacity-50 cursor-not-allowed" : ""
      }`}
      value={input}
      placeholder={
        disabled
          ? "Please handle tool calls first..."
          : "Say something..."
      }
      onChange={onChange}
      disabled={disabled}
      autoFocus
    />
  </form>
);

import type React from "react";
import { createRoot } from "react-dom/client";
import {
  Message,
  Wrapper,
} from "../../../_shared/components/components.tsx";
import "./tailwind.css";
import { useRef, useState } from "react";

const App = () => {
  const [text, setText] = useState("");

  const abortController = useRef<AbortController>(
    new AbortController(),
  );

  const onSubmit: React.FormEventHandler<
    HTMLFormElement
  > = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    // Abort any previous requests and create a new AbortController
    abortController.current.abort();
    abortController.current = new AbortController();

    setText("");

    const response = await fetch(
      "http://localhost:4317/api/generate",
      {
        method: "POST",
        signal: abortController.current.signal,
        body: JSON.stringify({
          prompt: formData.get("prompt"),
        }),
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    const stream = response.body!.pipeThrough(
      new TextDecoderStream(),
    );

    for await (const chunk of stream) {
      setText((text) => text + chunk);
    }
  };

  return (
    <Wrapper>
      <form onSubmit={onSubmit}>
        <input
          autoFocus
          className="border-2 border-gray-700 rounded-lg p-2 px-3 w-full"
          type="text"
          name="prompt"
          placeholder="Say something..."
        ></input>
      </form>
      <Message role={"AI"} content={text}></Message>
    </Wrapper>
  );
};

const root = createRoot(
  document.getElementById("root")!,
);
root.render(<App />);

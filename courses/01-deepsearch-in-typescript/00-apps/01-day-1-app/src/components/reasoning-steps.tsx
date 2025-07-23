import { useState } from "react";
import { SearchIcon, LinkIcon } from "lucide-react";
import ReactMarkdown from "react-markdown";
import type { MessageAnnotation } from "~/lib/get-next-action";

export const ReasoningSteps = ({
  annotations,
}: {
  annotations: MessageAnnotation[];
}) => {
  const [openStep, setOpenStep] = useState<number | null>(null);

  if (annotations.length === 0) return null;

  return (
    <div className="mb-4 w-full">
      <ul className="space-y-1">
        {annotations.map((annotation, index) => {
          const isOpen = openStep === index;
          return (
            <li key={index} className="relative">
              <button
                onClick={() => setOpenStep(isOpen ? null : index)}
                className={`min-w-34 flex w-full flex-shrink-0 items-center rounded px-2 py-1 text-left text-sm transition-colors ${
                  isOpen
                    ? "bg-gray-700 text-gray-200"
                    : "text-gray-400 hover:bg-gray-800 hover:text-gray-300"
                }`}
              >
                <span
                  className={`z-10 mr-3 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 border-gray-500 text-xs font-bold ${
                    isOpen
                      ? "border-blue-400 text-white"
                      : "bg-gray-800 text-gray-300"
                  }`}
                >
                  {index + 1}
                </span>
                {annotation.action.title}
              </button>
              <div className={`${isOpen ? "mt-1" : "hidden"}`}>
                {isOpen && (
                  <div className="px-2 py-1">
                    <div className="text-sm italic text-gray-400">
                      <ReactMarkdown>
                        {annotation.action.reasoning}
                      </ReactMarkdown>
                    </div>
                    {annotation.action.type === "search" && (
                      <div className="mt-2 flex items-center gap-2 text-sm text-gray-400">
                        <SearchIcon className="size-4" />
                        <span>{annotation.action.query}</span>
                      </div>
                    )}
                    {annotation.action.type === "scrape" && (
                      <div className="mt-2 flex items-center gap-2 text-sm text-gray-400">
                        <LinkIcon className="size-4" />
                        <span>
                          {annotation.action.urls
                            ?.map((url) => new URL(url).hostname)
                            ?.join(", ")}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

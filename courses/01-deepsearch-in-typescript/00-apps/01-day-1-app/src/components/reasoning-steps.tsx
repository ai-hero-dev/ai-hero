import { useState } from "react";
import { Search, Brain, CheckCircle } from "lucide-react";
import type { OurMessageAnnotation } from "../get-next-action";

export const ReasoningSteps = ({
  annotations,
}: {
  annotations: OurMessageAnnotation[];
}) => {
  const [openStep, setOpenStep] = useState<number | null>(null);

  if (annotations.length === 0) return null;

  const getIcon = (actionType: string) => {
    switch (actionType) {
      case "continue":
        return <Search className="size-4" />;
      case "answer":
        return <CheckCircle className="size-4" />;
      default:
        return <Brain className="size-4" />;
    }
  };

  const getActionDescription = (action: OurMessageAnnotation["action"]) => {
    if (action.type === "continue") {
      if (action.title.includes("Planning")) {
        return "Planning search strategy and generating queries";
      }
      return "Continuing research with additional searches";
    }
    return "Providing final answer";
  };

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
                <div className="flex items-center gap-2">
                  {getIcon(annotation.action.type)}
                  <span>{annotation.action.title}</span>
                </div>
              </button>
              <div className={`${isOpen ? "mt-1" : "hidden"}`}>
                {isOpen && (
                  <div className="px-2 py-1">
                    <div className="text-sm italic text-gray-400">
                      {annotation.action.reasoning}
                    </div>
                    <div className="mt-2 flex items-center gap-2 text-sm text-gray-400">
                      {getIcon(annotation.action.type)}
                      <span>{getActionDescription(annotation.action)}</span>
                      {annotation.action.type === "continue" && (
                        <span className="text-xs text-gray-500">
                          (includes scraping)
                        </span>
                      )}
                    </div>
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

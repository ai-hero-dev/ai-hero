import { useState } from "react";
import { Search, Brain, CheckCircle, Globe, ExternalLink } from "lucide-react";
import type { OurMessageAnnotation, SourceItem } from "../get-next-action";

const SourcesGrid = ({ sources }: { sources: SourceItem[] }) => {
  return (
    <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
      {sources.map((source, index) => (
        <a
          key={index}
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:bg-gray-750 flex items-start gap-3 rounded-lg border border-gray-600 bg-gray-800 p-3 transition-colors"
        >
          <div className="flex size-8 flex-shrink-0 items-center justify-center rounded bg-gray-700">
            {source.favicon ? (
              <img
                src={source.favicon}
                alt=""
                className="size-4"
                onError={(e) => {
                  const img = e.currentTarget;
                  const fallback = img.nextElementSibling as HTMLElement;
                  img.style.display = "none";
                  if (fallback) fallback.style.display = "block";
                }}
              />
            ) : null}
            <Globe
              className="size-4 text-gray-400"
              style={{ display: source.favicon ? "none" : "block" }}
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <h4 className="line-clamp-2 text-sm font-medium text-gray-200">
                {source.title}
              </h4>
              <ExternalLink className="size-3 flex-shrink-0 text-gray-400" />
            </div>
            <p className="mt-1 line-clamp-2 text-xs text-gray-400">
              {source.snippet}
            </p>
            <p className="mt-1 truncate text-xs text-gray-500">
              {new URL(source.url).hostname}
            </p>
          </div>
        </a>
      ))}
    </div>
  );
};

export const ReasoningSteps = ({
  annotations,
}: {
  annotations: OurMessageAnnotation[];
}) => {
  const [openStep, setOpenStep] = useState<number | null>(null);

  if (annotations.length === 0) return null;

  const getIcon = (annotation: OurMessageAnnotation) => {
    if (annotation.type === "SOURCES") {
      return <Globe className="size-4" />;
    }
    switch (annotation.action.type) {
      case "continue":
        return <Search className="size-4" />;
      case "answer":
        return <CheckCircle className="size-4" />;
      default:
        return <Brain className="size-4" />;
    }
  };

  const getTitle = (annotation: OurMessageAnnotation) => {
    if (annotation.type === "SOURCES") {
      return `Found ${annotation.sources.length} sources`;
    }
    return annotation.action.title;
  };

  const getActionDescription = (annotation: OurMessageAnnotation) => {
    if (annotation.type === "SOURCES") {
      return `Searching and gathering information from ${annotation.sources.length} web sources`;
    }
    const action = annotation.action;
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
                  {getIcon(annotation)}
                  <span>{getTitle(annotation)}</span>
                </div>
              </button>
              <div className={`${isOpen ? "mt-1" : "hidden"}`}>
                {isOpen && (
                  <div className="px-2 py-1">
                    {annotation.type === "SOURCES" ? (
                      <>
                        <div className="text-sm italic text-gray-400">
                          Found {annotation.sources.length} sources for:{" "}
                          {annotation.query}
                        </div>
                        <SourcesGrid sources={annotation.sources} />
                        <div className="mt-2 flex items-center gap-2 text-sm text-gray-400">
                          {getIcon(annotation)}
                          <span>{getActionDescription(annotation)}</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="text-sm italic text-gray-400">
                          {annotation.action.reasoning}
                        </div>
                        {annotation.action.feedback && (
                          <div className="mt-2 rounded bg-gray-800 p-2 text-sm text-gray-300">
                            <div className="mb-1 text-xs font-semibold text-gray-400">
                              Evaluator Feedback:
                            </div>
                            {annotation.action.feedback}
                          </div>
                        )}
                        <div className="mt-2 flex items-center gap-2 text-sm text-gray-400">
                          {getIcon(annotation)}
                          <span>{getActionDescription(annotation)}</span>
                          {annotation.action.type === "continue" && (
                            <span className="text-xs text-gray-500">
                              (includes scraping)
                            </span>
                          )}
                        </div>
                      </>
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

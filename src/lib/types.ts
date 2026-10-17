export const categories = [
  { id: "technology", label: "Technology", subtitle: "Ideas that move us forward", color: "#baef69", icon: "cpu" },
  { id: "science", label: "Science", subtitle: "Discovery, in real time", color: "#72c8fb", icon: "science" },
  { id: "culture", label: "Culture", subtitle: "The things that make us human", color: "#ccadff", icon: "culture" },
  { id: "other", label: "Everything else", subtitle: "A little bit of everything", color: "#f4b578", icon: "globe" },
] as const;

export type Category = (typeof categories)[number]["id"];

export interface WikiEdit {
  id: string;
  title: string;
  comment: string;
  timestamp: number;
  delta: number;
  url: string;
}

export interface DecisionResult {
  category: Category;
  confidence: number;
  probabilities: { value: Category; probability: number }[];
  latencyMs: number;
  model: string;
  inputTokens: number;
}

export interface RoutedEdit extends WikiEdit, DecisionResult {
  decidedAt: number;
}

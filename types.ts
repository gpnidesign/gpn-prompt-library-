
export interface PromptParameter {
  id: string;
  key: string;
  value: string;
}

export interface PromptEntry {
  id: string;
  beforeImage?: string; // base64 string
  afterImage?: string; // base64 string
  prompt: string;
  model?: string;
  parameters: PromptParameter[];
  tags: string[];
  createdAt: string; // ISO string
  isFavorite?: boolean;
}

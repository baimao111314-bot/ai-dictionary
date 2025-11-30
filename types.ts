import { Type } from "@google/genai";

export interface Language {
    code: string;
    name: string;
    flag: string;
}

export interface VibeData {
    title: string;
    content: string;
    tags: string[];
}

export interface EtymologyPart {
    part: string;
    type: string;
    meaning: string;
}

export interface EtymologyData {
    breakdown: EtymologyPart[];
    story: string;
}

export interface MovieQuote {
    title: string;
    quote: string;
    audio?: string;
}

export interface ExampleSentence {
    origin: string;
    trans: string;
}

export interface DefinitionItem {
    pos: string; // Part of speech (noun, verb, etc.)
    meaning: string;
}

export interface DictionaryData {
    typoDetected: boolean;
    correctedQuery: string;
    originalTypo?: string;
    sourceLanguage?: string;
    definitions: DefinitionItem[]; // Changed from single string to array
    commonPatterns: string[]; // New field
    vibe: VibeData;
    etymology: EtymologyData;
    synonyms: string[];
    antonyms: string[];
    movies: MovieQuote[];
    examples: ExampleSentence[];
}

export interface SavedItem {
    word: string;
    data: DictionaryData;
    tags: string[];
    date: Date;
}

// Global Constants for Schemas
export const DICTIONARY_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    typoDetected: { type: Type.BOOLEAN },
    correctedQuery: { type: Type.STRING },
    sourceLanguage: { type: Type.STRING },
    
    // Updated Schema for definitions
    definitions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          pos: { type: Type.STRING },
          meaning: { type: Type.STRING }
        }
      }
    },
    
    // New Schema field
    commonPatterns: {
        type: Type.ARRAY,
        items: { type: Type.STRING }
    },

    vibe: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        content: { type: Type.STRING },
        tags: { type: Type.ARRAY, items: { type: Type.STRING } }
      }
    },
    etymology: {
      type: Type.OBJECT,
      properties: {
        breakdown: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              part: { type: Type.STRING },
              type: { type: Type.STRING },
              meaning: { type: Type.STRING }
            }
          }
        },
        story: { type: Type.STRING }
      }
    },
    synonyms: { type: Type.ARRAY, items: { type: Type.STRING } },
    antonyms: { type: Type.ARRAY, items: { type: Type.STRING } },
    movies: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          quote: { type: Type.STRING }
        }
      }
    },
    examples: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          origin: { type: Type.STRING },
          trans: { type: Type.STRING }
        }
      }
    }
  }
};

export const OCR_SCHEMA = {
    type: Type.ARRAY,
    items: { type: Type.STRING }
};
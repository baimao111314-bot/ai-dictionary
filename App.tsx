import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import { 
  Book, 
  MessageCircle, 
  Volume2, 
  Sparkles, 
  Save, 
  ArrowRight, 
  X, 
  Send,
  Play,
  Film,
  Puzzle,
  History,
  Tag,
  Plus,
  Check,
  Filter,
  Trash2,
  Pause,
  Activity,
  Upload,
  Image as ImageIcon,
  FileText,
  ScanLine,
  GitBranch,
  GitMerge,
  Loader2,
  AlertTriangle,
  CheckSquare,
  Square,
  MousePointerClick,
  Library,
  Brain,
  ChevronLeft,
  ChevronRight,
  Globe,
  Layers
} from 'lucide-react';
import { 
    DictionaryData, 
    SavedItem, 
    Language, 
    DICTIONARY_SCHEMA, 
    OCR_SCHEMA 
} from './types';

// --- Constants & Helper Data ---

const LANGUAGES: Language[] = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'zh', name: '中文 (Chinese)', flag: '🇨🇳' },
  { code: 'la', name: 'Latina (Latin)', flag: '🏛️' },
];

const BotIcon = ({size}: {size: number}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="10" rx="2" />
        <circle cx="12" cy="5" r="2" />
        <path d="M12 7v4" />
        <line x1="8" y1="16" x2="8" y2="16" />
        <line x1="16" y1="16" x2="16" y2="16" />
    </svg>
);

const getPosColor = (pos: string) => {
    const p = pos.toLowerCase();
    if (p.includes('noun') || p.includes('mingci')) return 'bg-blue-100 text-blue-700 border-blue-200';
    if (p.includes('verb') || p.includes('dongci')) return 'bg-green-100 text-green-700 border-green-200';
    if (p.includes('adj') || p.includes('xing')) return 'bg-purple-100 text-purple-700 border-purple-200';
    if (p.includes('adv') || p.includes('fu')) return 'bg-orange-100 text-orange-700 border-orange-200';
    if (p.includes('prep') || p.includes('jie')) return 'bg-pink-100 text-pink-700 border-pink-200';
    return 'bg-gray-100 text-gray-700 border-gray-200';
};

// --- Gemini API Integration ---

// Initialize GenAI Client
const apiKey = process.env.API_KEY || ""; 
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const callGeminiAPI = async (
    prompt: string, 
    systemInstruction: string = "", 
    responseSchema: any = null, 
    imageData: { mimeType: string; data: string } | null = null
) => {
  try {
    if (!apiKey) throw new Error("API Key not found. Please check settings.");

    const model = "gemini-2.5-flash"; // Using 2.5 Flash for speed and efficiency
    const parts: any[] = [{ text: prompt }];
    
    // Add image data if provided (for OCR/Vision)
    if (imageData) {
        parts.push({ inlineData: { mimeType: imageData.mimeType, data: imageData.data } });
    }

    const config: any = {
      temperature: 0.7,
    };

    if (systemInstruction && systemInstruction.trim()) {
      config.systemInstruction = systemInstruction;
    }

    if (responseSchema) {
      config.responseMimeType = "application/json";
      config.responseSchema = responseSchema;
    }

    const response = await ai.models.generateContent({
      model,
      contents: { parts },
      config
    });

    const text = response.text;
    if (!text) throw new Error("No content generated");

    return responseSchema ? JSON.parse(text) : text;
  } catch (error) {
    console.error("Gemini Request Failed:", error);
    throw error;
  }
};

// --- Prompts ---

const getDictionaryPrompt = (query: string, langName: string) => `
Analyze the word or phrase: "${query}".
Target Language for explanation: ${langName}.
Provide a structured JSON response.

Requirements:
1. Spell Check: First, check if "${query}" is misspelled.
   - If misspelled: Set "typoDetected" to true, "correctedQuery" to the correct spelling.
   - If correct: Set "typoDetected" to false, "correctedQuery" to "${query}".
2. Language Detect: Identify the source language code (e.g. 'en-US', 'zh-CN', 'la').
3. Definitions: Provide a list of definitions. For EACH definition, identify the Part of Speech (POS) (e.g., Noun, Verb, Adjective). 
   - Important: If a word has multiple meanings/POS, list them separately.
   - Explanation in ${langName}.
4. Common Patterns: List 3 common collocations, idioms, or grammatical patterns involving this word (e.g., "to make a decision", "heavy rain").
5. Vibe Check: A fun, slang-aware, "friend-like" explanation of how to use the word, its nuance, or cultural context. Title should be fun. Content in ${langName}.
6. Etymology: Breakdown of roots/suffixes and a short interesting origin story in ${langName}.
7. Synonyms/Antonyms: 3-4 single words each.
8. Movies: 2 famous movie quotes containing the word (if possible).
9. Examples: 2 sentences. "origin" is the sentence in the word's language, "trans" is the translation in ${langName}.
`;

const getStoryPrompt = (words: string[], langName: string) => `
Write a creative, short story (approx 100-150 words) that incorporates the following vocabulary list: ${words.join(", ")}.
The story should be written in the language of the vocabulary words, but provide a context or summary in ${langName} at the end.
Make the story fun and slightly whimsical.
Highlight the used vocabulary words by wrapping them in **double asterisks**.
`;

// --- Fallback Data ---
const getFallbackData = (query: string, isZh: boolean): DictionaryData => ({
    typoDetected: false,
    correctedQuery: query,
    sourceLanguage: isZh ? 'zh-CN' : 'en-US',
    definitions: [
        { pos: 'Noun', meaning: isZh ? '（离线模式）一种意外发现美好事物的运气。' : '(Offline Mode) Finding something good without looking for it.' }
    ],
    commonPatterns: ['No connection available', 'Please check internet'],
    vibe: {
      title: isZh ? '离线 Vibe' : 'Offline Vibe',
      content: isZh ? '似乎无法连接到 Gemini。请检查网络或 API Key。' : 'Seems like we can\'t reach Gemini right now. Check your net or API Key.',
      tags: ['Offline', 'Error']
    },
    synonyms: ['Chance', 'Destiny'],
    antonyms: ['Misfortune'],
    etymology: {
      breakdown: [{ part: 'Offline', type: 'Status', meaning: 'No Connection' }],
      story: 'Data unavailable.'
    },
    movies: [{ title: 'System', quote: "Connection lost." }],
    examples: [{ origin: 'Please try again later.', trans: '请稍后再试。' }]
});

const speakText = (text: string, lang = 'en-US') => {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  
  const utterance = new SpeechSynthesisUtterance(text);
  
  // Clean up lang code to ensure browser compatibility (e.g. 'zh' -> 'zh-CN')
  let targetLang = lang;
  if (lang.startsWith('zh')) targetLang = 'zh-CN';
  if (lang.startsWith('en')) targetLang = 'en-US';
  
  utterance.lang = targetLang;
  
  // Try to select a "Natural" voice (Google/Microsoft usually better than system default)
  const voices = window.speechSynthesis.getVoices();
  const preferredVoice = voices.find(v => v.lang === targetLang && (v.name.includes('Google') || v.name.includes('Microsoft')))
                      || voices.find(v => v.lang === targetLang);
  
  if (preferredVoice) {
      utterance.voice = preferredVoice;
  }

  // Adjust rate: Chinese sounds robotic if too slow, 1.0 is more natural. English learners prefer slightly slower.
  utterance.rate = targetLang.startsWith('zh') ? 1.0 : 0.9; 
  
  window.speechSynthesis.speak(utterance);
};

// --- Components ---

const Onboarding = ({ onSelectLanguage }: { onSelectLanguage: (l: Language) => void }) => (
  <div className="flex flex-col items-center justify-center min-h-screen bg-indigo-600 p-6 text-white animate-in fade-in duration-500">
    <div className="mb-8 p-4 bg-white/10 rounded-full">
      <Sparkles size={48} className="text-yellow-400 animate-pulse" />
    </div>
    <h1 className="text-3xl font-bold mb-2 text-center">Welcome to LingoPop</h1>
    <p className="text-indigo-200 mb-8 text-center max-w-xs">Pick your mother tongue to start your AI language journey.</p>
    
    <div className="grid grid-cols-1 gap-4 w-full max-w-xs">
      {LANGUAGES.map((lang) => (
        <button
          key={lang.code}
          onClick={() => onSelectLanguage(lang)}
          className="flex flex-row items-center justify-center gap-3 p-4 bg-white/10 hover:bg-white/20 active:scale-95 transition-all rounded-xl border border-white/10 backdrop-blur-sm"
        >
          <span className="text-3xl">{lang.flag}</span>
          <span className="font-medium text-lg">{lang.name}</span>
        </button>
      ))}
    </div>
  </div>
);

const ImportModal = ({ isOpen, onClose, onImport }: { isOpen: boolean, onClose: () => void, onImport: (words: string[]) => void }) => {
    const [mode, setMode] = useState<'text' | 'image'>('text'); 
    const [inputText, setInputText] = useState('');
    const [scanning, setScanning] = useState(false);
    const [scannedWords, setScannedWords] = useState<string[]>([]);
    const [selectedScannedWords, setSelectedScannedWords] = useState<string[]>([]);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const ITEMS_PER_PAGE = 50;

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = async (e) => {
                const base64String = e.target?.result as string;
                setSelectedImage(base64String);
                setScanning(true);
                setScannedWords([]);
                setSelectedScannedWords([]);
                setCurrentPage(1);

                try {
                    const base64Data = base64String.split(',')[1];
                    const mimeType = base64String.split(';')[0].split(':')[1];

                    const prompt = "Analyze this image and identify all distinct words visible in the text. Return a clean list of strings. Do not filter out common words like 'the', 'is', 'a' if they appear. I need to recognize ALL words. Return JSON array.";
                    
                    const words = await callGeminiAPI(prompt, "", OCR_SCHEMA, { mimeType, data: base64Data });
                    
                    if (Array.isArray(words)) {
                        setScannedWords(words);
                        setSelectedScannedWords(words);
                    } else {
                        setScannedWords(['Error parsing text']);
                    }
                } catch (error) {
                    console.error("OCR Failed", error);
                    setScannedWords([]);
                } finally {
                    setScanning(false);
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const toggleWordSelection = (word: string) => {
        if (selectedScannedWords.includes(word)) {
            setSelectedScannedWords(selectedScannedWords.filter(w => w !== word));
        } else {
            setSelectedScannedWords([...selectedScannedWords, word]);
        }
    };

    const toggleSelectAll = () => {
        if (selectedScannedWords.length === scannedWords.length) {
            setSelectedScannedWords([]);
        } else {
            setSelectedScannedWords([...scannedWords]);
        }
    };

    const confirmImport = () => {
        const words = mode === 'text' 
            ? inputText.split(/[\n,]+/).map(w => w.trim()).filter(w => w)
            : selectedScannedWords;
        
        onImport(words);
        setInputText('');
        setScannedWords([]);
        setSelectedScannedWords([]);
        setSelectedImage(null);
        setCurrentPage(1);
    };

    const totalPages = Math.ceil(scannedWords.length / ITEMS_PER_PAGE);
    const paginatedWords = scannedWords.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-end sm:items-center justify-center animate-in fade-in duration-200 backdrop-blur-sm">
            <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 animate-in slide-in-from-bottom duration-300 shadow-2xl h-[85vh] sm:h-auto flex flex-col">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <Upload size={20} className="text-indigo-600"/> 
                        Import Words
                    </h3>
                    <button onClick={onClose} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200"><X size={20}/></button>
                </div>

                <div className="flex gap-2 p-1 bg-gray-100 rounded-xl mb-6">
                    <button 
                        onClick={() => setMode('text')}
                        className={`flex-1 py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all ${mode === 'text' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500'}`}
                    >
                        <FileText size={16}/> Text Batch
                    </button>
                    <button 
                        onClick={() => setMode('image')}
                        className={`flex-1 py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all ${mode === 'image' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500'}`}
                    >
                        <ImageIcon size={16}/> Image Scan
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto min-h-[200px]">
                    {mode === 'text' ? (
                        <textarea
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            placeholder="Paste your word list here (separated by commas or new lines)..."
                            className="w-full h-full bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl p-4 outline-none focus:border-indigo-400 resize-none text-gray-700"
                        />
                    ) : (
                        <div className="h-full flex flex-col">
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                onChange={handleFileSelect} 
                                accept="image/*" 
                                className="hidden" 
                            />
                            
                            {!selectedImage ? (
                                <div 
                                    onClick={() => fileInputRef.current?.click()}
                                    className="flex-1 border-2 border-dashed border-indigo-200 bg-indigo-50 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-indigo-100 transition-colors relative overflow-hidden"
                                >
                                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
                                        <ImageIcon className="text-indigo-400" size={32}/>
                                    </div>
                                    <p className="text-indigo-900 font-bold">Tap to Upload Local Image</p>
                                    <p className="text-indigo-400 text-xs mt-2">Supports JPG, PNG</p>
                                </div>
                            ) : (
                                <div className="flex-1 relative rounded-xl overflow-hidden bg-black group flex flex-col">
                                    <div className="h-48 relative shrink-0">
                                        <img src={selectedImage} alt="Uploaded" className="w-full h-full object-contain bg-black opacity-80" />
                                        <button onClick={() => { setSelectedImage(null); setScannedWords([]); }} className="absolute top-2 right-2 p-2 bg-black/50 text-white rounded-full hover:bg-black/70"><Trash2 size={16}/></button>
                                        
                                        {scanning && (
                                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 z-10">
                                                <ScanLine className="w-16 h-16 text-yellow-400 animate-bounce"/>
                                                <p className="text-white font-bold mt-4">AI Analyzing Text...</p>
                                                <div className="absolute top-0 left-0 w-full h-1 bg-yellow-400 animate-[scan_2s_infinite] shadow-[0_0_15px_rgba(250,204,21,0.8)]"></div>
                                            </div>
                                        )}
                                    </div>

                                    {!scanning && scannedWords.length > 0 && (
                                        <div className="flex-1 bg-white p-4 overflow-y-auto">
                                            <div className="flex justify-between items-center mb-4 sticky top-0 bg-white py-2 z-10 border-b border-gray-100">
                                                <span className="text-sm font-bold text-gray-800 flex items-center gap-1">
                                                    <MousePointerClick size={14}/>
                                                    Found {scannedWords.length} words
                                                </span>
                                                <button onClick={toggleSelectAll} className="text-xs text-indigo-600 font-bold flex items-center gap-1 hover:bg-indigo-50 px-2 py-1 rounded">
                                                    {selectedScannedWords.length === scannedWords.length ? <CheckSquare size={14}/> : <Square size={14}/>}
                                                    {selectedScannedWords.length === scannedWords.length ? 'Deselect All' : 'Select All'}
                                                </button>
                                            </div>
                                            <div className="flex flex-wrap gap-2 mb-4">
                                                {paginatedWords.map((w, i) => {
                                                    const isSelected = selectedScannedWords.includes(w);
                                                    return (
                                                        <button 
                                                            key={i} 
                                                            onClick={() => toggleWordSelection(w)}
                                                            className={`px-3 py-2 rounded-lg text-sm font-bold flex items-center gap-2 border transition-all active:scale-95
                                                                ${isSelected 
                                                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-md ring-2 ring-indigo-200' 
                                                                    : 'bg-white text-gray-500 border-gray-200 hover:border-indigo-300'
                                                                }`}
                                                        >
                                                            {isSelected ? <Check size={14}/> : <Plus size={14}/>} {w}
                                                        </button>
                                                    );
                                                })}
                                            </div>

                                            {totalPages > 1 && (
                                                <div className="flex items-center justify-center gap-4 py-2 border-t border-gray-100 mt-2 mb-2">
                                                    <button 
                                                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                                        disabled={currentPage === 1}
                                                        className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-30 transition-colors"
                                                    >
                                                        <ChevronLeft size={20}/>
                                                    </button>
                                                    <span className="text-sm font-bold text-gray-500 min-w-[80px] text-center">
                                                        Page {currentPage} / {totalPages}
                                                    </span>
                                                    <button 
                                                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                                        disabled={currentPage === totalPages}
                                                        className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-30 transition-colors"
                                                    >
                                                        <ChevronRight size={20}/>
                                                    </button>
                                                </div>
                                            )}
                                            
                                            <button 
                                                onClick={confirmImport}
                                                disabled={selectedScannedWords.length === 0}
                                                className="w-full py-3 bg-green-500 text-white font-bold rounded-xl shadow-md hover:bg-green-600 active:scale-95 transition-all flex justify-center items-center gap-2 mb-2"
                                            >
                                                <Check size={20}/>
                                                Confirm & Import ({selectedScannedWords.length})
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <button 
                    onClick={confirmImport}
                    disabled={mode === 'text' ? !inputText.trim() : selectedScannedWords.length === 0}
                    className="w-full py-4 mt-4 bg-indigo-600 text-white font-bold rounded-xl shadow-lg hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 flex justify-center items-center gap-2"
                >
                    Import {mode === 'image' && selectedScannedWords.length > 0 ? `(${selectedScannedWords.length})` : ''} to Notebook
                </button>
            </div>
        </div>
    );
};

const TagModal = ({ isOpen, onClose, initialTags = [], availableTags, onSave, onRemove, onCreateTag }: any) => {
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [newTagInput, setNewTagInput] = useState('');
  
    useEffect(() => {
        setSelectedTags(Array.isArray(initialTags) ? initialTags : []);
    }, [isOpen, initialTags]);
  
    const toggleTag = (tag: string) => {
      if (selectedTags.includes(tag)) {
        setSelectedTags(selectedTags.filter(t => t !== tag));
      } else {
        setSelectedTags([...selectedTags, tag]);
      }
    };
  
    const handleCreate = () => {
      if (newTagInput.trim() && !availableTags.includes(newTagInput.trim())) {
        const newTag = newTagInput.trim();
        onCreateTag(newTag);
        setSelectedTags([...selectedTags, newTag]);
        setNewTagInput('');
      }
    };
  
    if (!isOpen) return null;
  
    return (
      <div className="fixed inset-0 bg-black/60 z-[60] flex items-end sm:items-center justify-center animate-in fade-in duration-200 backdrop-blur-sm">
        <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 animate-in slide-in-from-bottom duration-300 shadow-2xl flex flex-col max-h-[90vh]">
          <div className="flex justify-between items-center mb-6 shrink-0">
            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <Tag size={20} className="text-indigo-600"/> 
              Save to Collection
            </h3>
            <button onClick={onClose} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200"><X size={20}/></button>
          </div>
  
          {/* Scrollable Tags Area */}
          <div className="flex-1 overflow-y-auto mb-6 min-h-0">
            <div className="flex flex-wrap gap-2">
                {availableTags.map((tag: string) => (
                <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`px-4 py-2 rounded-full text-sm font-bold border transition-all flex items-center gap-2
                    ${selectedTags.includes(tag) 
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' 
                        : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'}`}
                >
                    {tag}
                    {selectedTags.includes(tag) && <Check size={14}/>}
                </button>
                ))}
            </div>
          </div>
  
          {/* Fixed Bottom Controls */}
          <div className="shrink-0 space-y-4">
            <div className="flex gap-2">
                <input
                value={newTagInput}
                onChange={(e) => setNewTagInput(e.target.value)}
                placeholder="Create new tag..."
                className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-100"
                onKeyPress={(e) => e.key === 'Enter' && handleCreate()}
                />
                <button 
                onClick={handleCreate}
                disabled={!newTagInput.trim()}
                className="p-3 bg-indigo-100 text-indigo-600 rounded-xl disabled:opacity-50 hover:bg-indigo-200"
                >
                <Plus size={24}/>
                </button>
            </div>
    
            <div className="flex gap-3">
                {initialTags.length > 0 && (
                    <button 
                        onClick={onRemove}
                        className="p-4 bg-red-50 text-red-500 font-bold rounded-xl hover:bg-red-100 transition-colors"
                        title="Remove from notebook"
                    >
                        <Trash2 size={24}/>
                    </button>
                )}
                <button 
                    onClick={() => onSave(selectedTags)}
                    className="flex-1 py-4 bg-indigo-600 text-white font-bold rounded-xl shadow-lg hover:bg-indigo-700 active:scale-95 transition-all"
                >
                    {initialTags.length > 0 ? 'Update Tags' : 'Save Words'}
                </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

const ResultCard = ({ result, query, onOpenSaveModal, isSaved, onChat, onSelectWord }: any) => {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [playingMovieIdx, setPlayingMovieIdx] = useState<number | null>(null);

  const { 
    typoDetected = false,
    correctedQuery = query,
    sourceLanguage = 'en-US',
    definitions = [],
    commonPatterns = [],
    vibe = { title: "Vibe Check", content: "No vibe data.", tags: [] },
    etymology = { breakdown: [], story: "Etymology unavailable." },
    synonyms = [],
    antonyms = [],
    movies = [],
    examples = []
  } = result || {};

  const safeDefinitions = Array.isArray(definitions) ? definitions : [];
  const safePatterns = Array.isArray(commonPatterns) ? commonPatterns : [];
  const safeTags = Array.isArray(vibe?.tags) ? vibe.tags : [];
  const safeBreakdown = Array.isArray(etymology?.breakdown) ? etymology.breakdown : [];
  const safeMovies = Array.isArray(movies) ? movies : [];
  const safeExamples = Array.isArray(examples) ? examples : [];
  const safeSynonyms = Array.isArray(synonyms) ? synonyms : [];
  const safeAntonyms = Array.isArray(antonyms) ? antonyms : [];
  
  const safeVibeContent = typeof vibe?.content === 'string' ? vibe.content : "";
  const safeVibeTitle = typeof vibe?.title === 'string' ? vibe.title : "Vibe";
  const safeEtymologyStory = typeof etymology?.story === 'string' ? etymology.story : "";

  const handlePlayMovie = (movie: any, idx: number) => {
    if (playingMovieIdx === idx) {
        window.speechSynthesis.cancel();
        setPlayingMovieIdx(null);
        return;
    }
    setPlayingMovieIdx(idx);

    if (movie.audio) {
        const audio = new Audio(movie.audio);
        audio.play().then(() => {
            audio.onended = () => setPlayingMovieIdx(null);
        }).catch(err => {
            speakMovieFallback(movie, idx);
        });
    } else {
        speakMovieFallback(movie, idx);
    }
  };

  const speakMovieFallback = (movie: any, idx: number) => {
      if (!window.speechSynthesis) return;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(movie.quote);
      utterance.lang = sourceLanguage;
      utterance.rate = 0.85; 
      utterance.pitch = 0.9;
      utterance.onend = () => setPlayingMovieIdx(null);
      window.speechSynthesis.speak(utterance);
  };

  const displayWord = typoDetected ? correctedQuery : query;

  return (
    <div className="bg-white rounded-3xl shadow-xl overflow-hidden mb-24 animate-in slide-in-from-bottom-10 duration-500">
      
      {/* Typo Correction Banner */}
      {typoDetected && (
          <div className="bg-yellow-400 text-black px-6 py-3 font-bold flex items-center justify-center gap-2 animate-in slide-in-from-top duration-300">
              <AlertTriangle size={20}/>
              <span>Corrected from "{result.originalTypo || 'typo'}" to "{correctedQuery}"</span>
          </div>
      )}

      {/* AI Image Area */}
      <div className="relative h-64 bg-gray-200 group">
        {!imgLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-indigo-100 text-indigo-300">
                <Sparkles className="animate-spin-slow" size={40}/>
            </div>
        )}
        <img 
          src={`https://picsum.photos/seed/${displayWord}/600/400`} 
          alt={displayWord} 
          className={`w-full h-full object-cover transition-opacity duration-500 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => setImgLoaded(true)}
        />
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-6 pt-20">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-4xl font-black text-white tracking-tight mb-1">{displayWord}</h2>
              <div className="flex gap-2">
                <button onClick={() => speakText(displayWord, sourceLanguage)} className="text-white/80 hover:text-yellow-400 transition-colors">
                  <Volume2 size={24} />
                </button>
              </div>
            </div>
            <button 
              onClick={onOpenSaveModal}
              className={`p-3 rounded-full shadow-lg transition-all active:scale-90 ${isSaved ? 'bg-yellow-400 text-black' : 'bg-white/20 backdrop-blur text-white'}`}
            >
              <Save size={24} fill={isSaved ? "currentColor" : "none"} />
            </button>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-8">
        {/* Definition Section */}
        <section>
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Definitions</h3>
          <div className="space-y-3">
              {safeDefinitions.map((def: any, idx: number) => (
                  <div key={idx} className="flex gap-3 items-start">
                       <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border shrink-0 mt-1 ${getPosColor(def.pos)}`}>
                           {def.pos}
                       </span>
                       <p className="text-lg font-medium text-gray-800 leading-relaxed">
                           {def.meaning}
                       </p>
                  </div>
              ))}
              {safeDefinitions.length === 0 && (
                  <p className="text-gray-500">No definition available.</p>
              )}
          </div>
        </section>

        {/* Common Patterns Section */}
        {safePatterns.length > 0 && (
            <section className="bg-amber-50 rounded-xl p-4 border border-amber-100">
                <h3 className="flex items-center gap-2 text-xs font-bold text-amber-600 uppercase tracking-wider mb-3">
                    <Layers size={14}/> Common Patterns
                </h3>
                <ul className="space-y-2">
                    {safePatterns.map((pat: string, idx: number) => (
                        <li key={idx} className="flex gap-2 items-start text-amber-900 font-medium text-sm">
                            <span className="text-amber-400">•</span>
                            {pat}
                        </li>
                    ))}
                </ul>
            </section>
        )}
        
        {/* Synonyms & Antonyms */}
        <section className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                <h3 className="text-xs font-bold text-green-600 uppercase tracking-wider mb-3 flex items-center gap-1">
                    <GitBranch size={12}/> Synonyms
                </h3>
                <div className="flex flex-wrap gap-2">
                    {safeSynonyms.map((word: string, idx: number) => (
                        <button 
                            key={idx} 
                            onClick={() => onSelectWord(word)}
                            className="text-sm font-medium text-gray-700 bg-white px-3 py-1.5 rounded-lg border border-gray-200 hover:border-indigo-400 hover:text-indigo-600 transition-colors shadow-sm"
                        >
                            {word}
                        </button>
                    ))}
                    {safeSynonyms.length === 0 && <span className="text-xs text-gray-400">None found</span>}
                </div>
            </div>
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                <h3 className="text-xs font-bold text-red-500 uppercase tracking-wider mb-3 flex items-center gap-1">
                    <GitMerge size={12}/> Antonyms
                </h3>
                <div className="flex flex-wrap gap-2">
                    {safeAntonyms.map((word: string, idx: number) => (
                        <button 
                            key={idx} 
                            onClick={() => onSelectWord(word)}
                            className="text-sm font-medium text-gray-700 bg-white px-3 py-1.5 rounded-lg border border-gray-200 hover:border-red-400 hover:text-red-600 transition-colors shadow-sm"
                        >
                            {word}
                        </button>
                    ))}
                    {safeAntonyms.length === 0 && <span className="text-xs text-gray-400">None found</span>}
                </div>
            </div>
        </section>

        {/* Vibe Check */}
        <section className="bg-indigo-50 p-5 rounded-2xl border-l-4 border-indigo-500 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <MessageCircle size={80} />
          </div>
          <h3 className="flex items-center gap-2 text-indigo-700 font-bold mb-2">
            <Sparkles size={18} />
            {safeVibeTitle}
          </h3>
          <p className="text-indigo-900 text-sm leading-6 relative z-10">
            {safeVibeContent}
          </p>
          <div className="flex gap-2 mt-3 relative z-10">
            {safeTags.map((tag: string, idx: number) => (
              <span key={idx} className="text-xs font-bold bg-indigo-100 text-indigo-600 px-2 py-1 rounded-md">
                #{tag}
              </span>
            ))}
          </div>
        </section>

        {/* Etymology / Roots Section */}
        <section>
            <h3 className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">
                <Puzzle size={14}/> Word DNA & History
            </h3>
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                {/* Visual Roots Breakdown */}
                <div className="flex flex-wrap gap-2 mb-4">
                    {safeBreakdown.map((part: any, idx: number) => (
                        <React.Fragment key={idx}>
                             <div className="flex flex-col bg-white border border-gray-200 rounded-lg p-2 shadow-sm min-w-[80px]">
                                <span className="font-bold text-indigo-600 text-center">{part.part}</span>
                                <span className="text-[10px] text-gray-400 text-center uppercase border-t border-gray-100 mt-1 pt-1">{part.type}</span>
                                <span className="text-[10px] text-gray-600 text-center">{part.meaning}</span>
                             </div>
                             {idx < safeBreakdown.length - 1 && (
                                 <div className="flex items-center text-gray-300">+</div>
                             )}
                        </React.Fragment>
                    ))}
                </div>
                <div className="flex gap-3 items-start">
                    <History size={16} className="text-gray-400 mt-1 flex-shrink-0"/>
                    <p className="text-sm text-gray-600 leading-relaxed italic">
                        "{safeEtymologyStory}"
                    </p>
                </div>
            </div>
        </section>

        {/* Movie Clips Section */}
        <section>
            <h3 className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">
                <Film size={14}/> Seen in Movies (Original Audio)
            </h3>
            <div className="flex gap-4 overflow-x-auto pb-4 snap-x">
                {safeMovies.map((movie: any, idx: number) => {
                    const isPlaying = playingMovieIdx === idx;
                    return (
                        <div 
                            key={idx} 
                            className={`snap-center shrink-0 w-60 bg-black rounded-xl overflow-hidden relative group cursor-pointer transition-all ${isPlaying ? 'ring-2 ring-yellow-400 scale-[1.02]' : ''}`} 
                            onClick={() => handlePlayMovie(movie, idx)}
                        >
                            <img 
                                src={`https://picsum.photos/seed/${(movie.title || 'movie') + idx}/300/200`} 
                                alt={movie.title}
                                className={`w-full h-32 object-cover transition-opacity ${isPlaying ? 'opacity-40' : 'opacity-80 group-hover:opacity-60'}`}
                            />
                            
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                {isPlaying ? (
                                    <>
                                        <div className="flex gap-1 items-end h-8 mb-2">
                                            <span className="w-1 bg-yellow-400 animate-[bounce_1s_infinite] h-4"></span>
                                            <span className="w-1 bg-yellow-400 animate-[bounce_1.2s_infinite] h-8"></span>
                                            <span className="w-1 bg-yellow-400 animate-[bounce_0.8s_infinite] h-6"></span>
                                            <span className="w-1 bg-yellow-400 animate-[bounce_1.1s_infinite] h-3"></span>
                                        </div>
                                        <div className="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg">
                                            <Pause size={20} className="text-black fill-black"/>
                                        </div>
                                    </>
                                ) : (
                                    <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <Play size={20} className="text-white fill-white"/>
                                    </div>
                                )}
                            </div>

                            <div className="bg-gray-900 p-3 relative">
                                <h4 className="text-white text-sm font-bold truncate">{movie.title}</h4>
                                <p className="text-gray-400 text-xs mt-1 line-clamp-2 italic">"{movie.quote}"</p>
                                {isPlaying && (
                                    <span className="absolute top-[-10px] right-3 bg-yellow-400 text-black text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                        <Activity size={10}/> Playing
                                    </span>
                                )}
                            </div>
                        </div>
                    );
                })}
                {safeMovies.length === 0 && <p className="text-gray-400 text-sm">No movie clips found.</p>}
            </div>
        </section>

        {/* Examples */}
        <section className="space-y-4">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Examples</h3>
          {safeExamples.map((ex: any, i: number) => (
            <div key={i} className="group bg-gray-50 hover:bg-yellow-50 transition-colors p-4 rounded-xl cursor-pointer" onClick={() => speakText(ex.origin, sourceLanguage)}>
              <div className="flex justify-between items-start mb-1">
                <p className="font-semibold text-gray-800 text-lg">{ex.origin}</p>
                <Volume2 size={16} className="text-gray-400 group-hover:text-yellow-600" />
              </div>
              <p className="text-gray-500">{ex.trans}</p>
            </div>
          ))}
        </section>
        
        {/* Chat Prompt */}
        <button 
          onClick={onChat}
          className="w-full py-4 bg-indigo-100 text-indigo-700 font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-indigo-200 transition-colors"
        >
          <MessageCircle size={20} />
          Ask AI about "{displayWord}"
        </button>
      </div>
    </div>
  );
};

const ChatInterface = ({ query, onClose, language }: { query: string, onClose: () => void, language: Language }) => {
  const [messages, setMessages] = useState([
    { role: 'ai', text: language.code === 'zh' ? `嘿！我是你的 ${query} 助手。有什么想问的吗？` : `Hey! I'm your assistant for "${query}". Any questions?` }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);

    try {
        const prompt = `
            Context: The user is learning about the word "${query}".
            User's Mother Tongue: ${language.name}.
            User Question: "${userMsg}".
            
            Answer the user's question in a helpful, friendly, tutor-like persona. 
            Keep the answer relatively concise (under 50 words unless asked for more).
            Use ${language.name} for the explanation.
        `;
        
        const aiResponseText = await callGeminiAPI(prompt);
        setMessages(prev => [...prev, { role: 'ai', text: typeof aiResponseText === 'string' ? aiResponseText : JSON.stringify(aiResponseText) }]);
    } catch (err) {
        setMessages(prev => [...prev, { role: 'ai', text: "Sorry, I'm having trouble connecting to my brain right now. Try again?" }]);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col animate-in slide-in-from-bottom duration-300">
      <div className="p-4 border-b flex justify-between items-center bg-indigo-600 text-white shadow-md">
        <h3 className="font-bold flex items-center gap-2"><BotIcon size={20}/> Chat: {query}</h3>
        <button onClick={onClose}><X size={24} /></button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-4 rounded-2xl text-sm ${
              m.role === 'user' 
                ? 'bg-indigo-600 text-white rounded-br-none' 
                : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none shadow-sm'
            }`}>
              {m.text}
            </div>
          </div>
        ))}
        {loading && (
            <div className="flex justify-start">
                <div className="bg-white border border-gray-200 p-4 rounded-2xl rounded-bl-none shadow-sm flex gap-2 items-center text-gray-400 text-sm">
                    <Loader2 className="animate-spin" size={16}/> Thinking...
                </div>
            </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="p-4 bg-white border-t flex gap-2">
        <input 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question..."
          className="flex-1 bg-gray-100 rounded-full px-4 outline-none focus:ring-2 focus:ring-indigo-500"
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
        />
        <button onClick={handleSend} disabled={loading} className="p-3 bg-indigo-600 rounded-full text-white hover:bg-indigo-700 disabled:opacity-50">
          <Send size={18} />
        </button>
      </div>
    </div>
  );
};

const Flashcard = ({ item }: { item: SavedItem }) => {
  const [flipped, setFlipped] = useState(false);
  const mainDef = item.data.definitions?.[0]?.meaning || "Definition unavailable";

  return (
    <div className="h-96 w-full perspective-1000 cursor-pointer group" onClick={() => setFlipped(!flipped)}>
      <div className={`relative w-full h-full transition-all duration-500 transform-style-3d ${flipped ? 'rotate-y-180' : ''}`}>
        
        {/* Front */}
        <div className="absolute inset-0 w-full h-full bg-white rounded-3xl shadow-xl p-8 flex flex-col items-center justify-center backface-hidden border-b-8 border-indigo-600">
          <img src={`https://picsum.photos/seed/${item.word}/200/200`} className="w-32 h-32 rounded-full object-cover mb-6 border-4 border-yellow-400" alt="concept" />
          <h2 className="text-4xl font-black text-gray-800">{item.word}</h2>
          <div className="flex gap-2 mt-4 flex-wrap justify-center">
            {item.tags?.map(t => <span key={t} className="text-[10px] bg-gray-100 px-2 py-1 rounded-full text-gray-500 font-bold">{t}</span>)}
          </div>
          <p className="text-gray-400 mt-4 text-sm font-medium uppercase tracking-widest">Tap to flip</p>
        </div>

        {/* Back */}
        <div className="absolute inset-0 w-full h-full bg-indigo-600 rounded-3xl shadow-xl p-8 flex flex-col items-center justify-center rotate-y-180 backface-hidden text-white">
          <p className="text-lg text-center font-medium mb-6 leading-relaxed">{mainDef}</p>
          <div className="bg-white/10 p-4 rounded-xl w-full">
             <p className="text-sm italic text-center opacity-90">"{item.data.examples?.[0]?.origin || 'No example'}"</p>
          </div>
        </div>

      </div>
    </div>
  );
};

const Notebook = ({ savedItems, allTags, onClose, onOpenStory, onOpenCards }: any) => {
    const [filter, setFilter] = useState('All');

    const filteredItems = filter === 'All' 
        ? savedItems 
        : savedItems.filter((item: SavedItem) => item.tags && item.tags.includes(filter));

    // Calculate counts for each tag
    const getCount = (tag: string) => {
        if (tag === 'All') return savedItems.length;
        return savedItems.filter((item: SavedItem) => item.tags && item.tags.includes(tag)).length;
    };

    return (
        <div className="fixed inset-0 bg-gray-50 z-40 overflow-y-auto animate-in slide-in-from-right duration-300">
            <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-3xl font-black text-gray-800">My Notebook</h2>
                    <button onClick={onClose} className="p-2 bg-gray-200 rounded-full hover:bg-gray-300"><X size={24}/></button>
                </div>

                {/* Filter Bar with Counts */}
                <div className="flex gap-2 overflow-x-auto pb-4 mb-4 no-scrollbar">
                    <button 
                        onClick={() => setFilter('All')}
                        className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors flex items-center gap-2 ${filter === 'All' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-500 border border-gray-200'}`}
                    >
                        All Words <span className="bg-white/20 px-1.5 rounded-md text-xs">{getCount('All')}</span>
                    </button>
                    {allTags.map((tag: string) => (
                        <button 
                            key={tag}
                            onClick={() => setFilter(tag)}
                            className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors flex items-center gap-2 ${filter === tag ? 'bg-indigo-600 text-white' : 'bg-white text-gray-500 border border-gray-200'}`}
                        >
                            {tag} <span className={`px-1.5 rounded-md text-xs ${filter === tag ? 'bg-white/20' : 'bg-gray-100'}`}>{getCount(tag)}</span>
                        </button>
                    ))}
                </div>

                {savedItems.length === 0 ? (
                    <div className="text-center mt-20 opacity-50">
                        <Book size={64} className="mx-auto mb-4"/>
                        <p>Notebook is empty.</p>
                    </div>
                ) : (
                    <>
                        <div className="flex gap-2 mb-6">
                            <button 
                                onClick={() => onOpenStory(filteredItems)}
                                className="flex-1 py-3 bg-yellow-400 text-black font-bold rounded-xl shadow-sm hover:bg-yellow-500 transition-colors flex items-center justify-center gap-2"
                            >
                                <Book size={18}/> Story Mode
                            </button>
                            <button 
                                onClick={() => onOpenCards(filteredItems)}
                                className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-sm hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                            >
                                <Brain size={18}/> {filter === 'All' ? 'Study All' : `Study ${filter}`}
                            </button>
                        </div>

                        {/* List */}
                        <div className="grid grid-cols-1 gap-4">
                            {filteredItems.map((item: SavedItem, idx: number) => {
                                const defText = item.data.definitions?.[0]?.meaning || "No definition";
                                return (
                                    <div key={idx} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
                                        <div>
                                            <h3 className="font-bold text-lg">{item.word}</h3>
                                            <p className="text-xs text-gray-500 truncate max-w-[200px] mb-2">{defText}</p>
                                            <div className="flex gap-1 flex-wrap">
                                                {item.tags?.map(t => (
                                                    <span key={t} className="text-[10px] bg-indigo-50 text-indigo-500 px-2 py-0.5 rounded-md font-bold">
                                                        #{t}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                        <button onClick={() => speakText(item.word, item.data.sourceLanguage)} className="p-2 text-indigo-500"><Volume2 size={20}/></button>
                                    </div>
                                );
                            })}
                        </div>
                        {filteredItems.length === 0 && (
                            <div className="text-center py-10 text-gray-400">
                                <Filter className="mx-auto mb-2 opacity-50"/>
                                <p>No words found in "{filter}" category.</p>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

const StoryMode = ({ items, onClose, language }: { items: SavedItem[], onClose: () => void, language: Language }) => {
  const [story, setStory] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Use a ref to prevent double-firing in strict mode if needed, though dependency array is safe here
  useEffect(() => {
    const generateStory = async () => {
        setLoading(true);
        const words = items.map(i => i.word);
        const prompt = getStoryPrompt(words, language.name);
        
        try {
            const result = await callGeminiAPI(prompt);
            setStory(typeof result === 'string' ? result : "Unexpected format");
        } catch (err) {
            setStory(language.code === 'zh' ? "抱歉，无法生成故事。" : "Sorry, couldn't generate story.");
        } finally {
            setLoading(false);
        }
    };
    if (items.length > 0) {
        generateStory();
    } else {
        setLoading(false);
        setStory("No words selected for story.");
    }
  }, [items, language]);

  return (
    <div className="fixed inset-0 bg-yellow-400 z-50 flex flex-col p-6 animate-in zoom-in-95 duration-300">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-black text-indigo-900 flex gap-2 items-center"><Sparkles/> Story Time</h2>
        <button onClick={onClose} className="bg-black/10 p-2 rounded-full text-indigo-900"><X/></button>
      </div>
      <div className="bg-white/90 backdrop-blur rounded-3xl p-8 flex-1 shadow-xl overflow-y-auto">
        {loading ? (
            <div className="flex flex-col items-center justify-center h-full text-indigo-400">
                <Sparkles className="animate-spin mb-4" size={48}/>
                <p className="animate-pulse">Gemini is weaving your story...</p>
            </div>
        ) : (
          <p className="text-xl leading-loose font-medium text-gray-800 whitespace-pre-line">
            {story.split('**').map((part, i) => 
              i % 2 === 1 ? <span key={i} className="bg-yellow-200 text-indigo-700 px-1 rounded mx-1 border-b-2 border-yellow-500 font-bold">{part}</span> : part
            )}
          </p>
        )}
      </div>
    </div>
  );
};

// --- Main App Logic ---

export default function LingoPop() {
  const [language, setLanguage] = useState<Language | null>(null);
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<DictionaryData | null>(null);
  const [loading, setLoading] = useState(false);
  const [savedItems, setSavedItems] = useState<SavedItem[]>([]);
  
  // Categorization State
  const [allTags, setAllTags] = useState(['General', 'Travel', 'Work', 'Food', 'Love']);
  const [showTagModal, setShowTagModal] = useState(false);
  const [currentEditingItem, setCurrentEditingItem] = useState<{ word: string, tags: string[] } | null>(null); 
  const [pendingImportWords, setPendingImportWords] = useState<string[]>([]);

  // New Feature States
  const [showImportModal, setShowImportModal] = useState(false);

  // Views
  const [showNotebook, setShowNotebook] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showStory, setShowStory] = useState(false);
  const [studyMode, setStudyMode] = useState(false);
  const [studyIndex, setStudyIndex] = useState(0);
  const [studyItems, setStudyItems] = useState<SavedItem[]>([]);

  // Pre-load voices on mount to reduce latency
  useEffect(() => {
     if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.getVoices();
     }
  }, []);

  // Trigger search with specific text
  const performSearch = async (text: string) => {
    if (!language) return;
    setQuery(text);
    setLoading(true);
    setResult(null);
    setShowNotebook(false); 
    
    try {
        const prompt = getDictionaryPrompt(text, language.name);
        const data = await callGeminiAPI(prompt, "", DICTIONARY_SCHEMA);
        
        // Auto-correct logic
        if (data.typoDetected && data.correctedQuery) {
            setQuery(data.correctedQuery);
            data.originalTypo = text; // Store for UI banner
        }
        
        setResult(data as DictionaryData);
    } catch (err) {
        console.error("Gemini Lookup Failed", err);
        // Fallback to mock data if API fails
        const fallback = getFallbackData(text, language.code === 'zh');
        setResult(fallback);
    } finally {
        setLoading(false);
    }
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    performSearch(query);
  };

  const openSaveModal = () => {
      if (!result) return;
      const existingItem = savedItems.find(i => i.word === query);
      setCurrentEditingItem({
          word: query,
          tags: existingItem ? existingItem.tags : []
      });
      setShowTagModal(true);
  };

  const handleSaveTags = async (selectedTags: string[]) => {
      // BATCH IMPORT MODE
      if (pendingImportWords.length > 0 && language) {
          setShowTagModal(false);
          setLoading(true);
          
          const tagsToSave = selectedTags.length > 0 ? selectedTags : ['Imported'];

          // Process in parallel with concurrency limit (simulated by batching here or just Promise.all)
          // For UX, we do small batch
          const importPromises = pendingImportWords.slice(0, 10).map(async (w) => {
              try {
                  const prompt = getDictionaryPrompt(w, language.name);
                  const data = await callGeminiAPI(prompt, "", DICTIONARY_SCHEMA);
                  return {
                      word: w,
                      data: data as DictionaryData,
                      tags: tagsToSave,
                      date: new Date()
                  };
              } catch (e) {
                  console.error(`Failed to import ${w}`, e);
                  return null;
              }
          });

          const newItemsResults = await Promise.all(importPromises);
          const validItems = newItemsResults.filter((i): i is SavedItem => i !== null);
          
          // Avoid duplicates
          const uniqueNewItems = validItems.filter(newItem => 
              !savedItems.find(s => s.word.toLowerCase() === newItem.word.toLowerCase())
          );
          
          setSavedItems(prev => [...prev, ...uniqueNewItems]);
          setPendingImportWords([]);
          setLoading(false);
          setShowNotebook(true);
          return;
      }

      // SINGLE ITEM EDIT MODE
      if (currentEditingItem && result) {
        const existingIndex = savedItems.findIndex(i => i.word === currentEditingItem.word);
        const newItem: SavedItem = {
            word: currentEditingItem.word,
            data: result, 
            tags: selectedTags,
            date: new Date()
        };

        if (existingIndex >= 0) {
            const newItems = [...savedItems];
            newItems[existingIndex] = { ...newItems[existingIndex], tags: selectedTags };
            setSavedItems(newItems);
        } else {
            setSavedItems([...savedItems, newItem]);
        }
      }
      setShowTagModal(false);
  };

  const handleRemoveItem = () => {
      if (currentEditingItem) {
          setSavedItems(savedItems.filter(i => i.word !== currentEditingItem.word));
          setShowTagModal(false);
      }
  }

  const handleCreateTag = (newTag: string) => {
      if(!allTags.includes(newTag)) {
          setAllTags([...allTags, newTag]);
      }
  }

  const handleBatchImport = (words: string[]) => {
    setPendingImportWords(words);
    setShowImportModal(false);
    // Open Tag Modal to let user choose tags for these words
    setCurrentEditingItem(null); 
    setShowTagModal(true);
  }

  // --- Render ---

  if (!language) return <Onboarding onSelectLanguage={setLanguage} />;

  // Study Mode Overlay
  if (studyMode) return (
    <div className="fixed inset-0 bg-gray-900 z-50 flex flex-col justify-center p-6 animate-in fade-in">
      <div className="absolute top-6 left-6 right-6 flex justify-between text-white">
        <span className="font-bold opacity-50">{studyIndex + 1} / {studyItems.length}</span>
        <button onClick={() => setStudyMode(false)}><X/></button>
      </div>
      <Flashcard item={studyItems[studyIndex]} />
      <div className="mt-8 flex justify-between gap-4">
        <button 
          disabled={studyIndex === 0}
          onClick={() => setStudyIndex(i => i - 1)}
          className="p-4 bg-white/10 rounded-full text-white disabled:opacity-30"
        >
          <ArrowRight className="rotate-180"/>
        </button>
        <button 
          disabled={studyIndex === studyItems.length - 1}
          onClick={() => setStudyIndex(i => i + 1)}
          className="p-4 bg-yellow-400 rounded-full text-black disabled:bg-gray-700 disabled:text-gray-500"
        >
          <ArrowRight />
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100 font-sans text-gray-900 pb-20 max-w-md mx-auto relative shadow-2xl border-x border-gray-200">
      
      {/* Header */}
      <header className="sticky top-0 bg-white/80 backdrop-blur-md z-30 px-6 py-4 flex justify-between items-center border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-600 text-white p-1.5 rounded-lg">
            <Sparkles size={18} />
          </div>
          <span className="font-bold text-xl tracking-tight text-indigo-900">LingoPop</span>
        </div>
        <div className="flex gap-3">
          <button 
            className="p-2 text-gray-500 hover:text-indigo-600 transition-colors"
            onClick={() => setLanguage(null)}
            title="Switch Language"
          >
            <Globe size={24} />
          </button>
          <button 
            className="p-2 text-gray-500 hover:text-indigo-600 transition-colors"
            onClick={() => setShowImportModal(true)}
            title="Import Words"
          >
            <Upload size={24} />
          </button>
          <button 
            className="relative p-2 text-gray-500 hover:text-indigo-600 transition-colors"
            onClick={() => setShowNotebook(true)}
          >
            <Library size={24} />
            {savedItems.length > 0 && <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>}
          </button>
        </div>
      </header>

      <main className="p-6">
        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="mb-8 sticky top-20 z-20">
          <div className="relative group">
            <input 
              type="text" 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type a word or phrase..."
              className="w-full bg-white p-5 pl-5 pr-14 rounded-2xl shadow-lg shadow-indigo-100 text-lg font-medium focus:outline-none focus:ring-4 focus:ring-indigo-100 transition-all placeholder:text-gray-300"
            />
            <button 
              type="submit" 
              className="absolute right-3 top-3 p-2 bg-indigo-600 text-white rounded-xl shadow-md hover:bg-indigo-700 transition-transform active:scale-95"
            >
              {loading ? <Loader2 className="animate-spin" size={20}/> : <ArrowRight size={20} />}
            </button>
          </div>
        </form>

        {/* Empty State */}
        {!result && !loading && (
          <div className="text-center mt-20 opacity-40">
            <div className="inline-block p-6 bg-indigo-50 rounded-full mb-4">
              <Book size={48} className="text-indigo-300"/>
            </div>
            <p className="text-lg font-medium text-gray-400">What are we learning today?</p>
            <div className="flex gap-2 justify-center mt-4">
               <button onClick={() => { performSearch('Serendipity'); }} className="text-xs bg-white px-3 py-1 rounded-full border">Try "Serendipity"</button>
               <button onClick={() => { performSearch('Coffee'); }} className="text-xs bg-white px-3 py-1 rounded-full border">Try "Coffee"</button>
            </div>
          </div>
        )}

        {/* Content */}
        {result && (
          <ResultCard 
            result={result} 
            query={query}
            isSaved={!!savedItems.find(i => i.word === query)}
            onOpenSaveModal={openSaveModal}
            onChat={() => setShowChat(true)}
            onSelectWord={performSearch}
          />
        )}
      </main>

      {/* Modals & Overlays */}
      {showTagModal && (
          <TagModal
            isOpen={showTagModal}
            onClose={() => {
                setShowTagModal(false);
                setPendingImportWords([]); // Clear pending imports on cancel
                setCurrentEditingItem(null);
            }}
            initialTags={currentEditingItem?.tags}
            availableTags={allTags}
            onSave={handleSaveTags}
            onRemove={handleRemoveItem}
            onCreateTag={handleCreateTag}
          />
      )}

      {showImportModal && (
          <ImportModal 
            isOpen={showImportModal}
            onClose={() => setShowImportModal(false)}
            onImport={handleBatchImport}
          />
      )}

      {showNotebook && (
        <Notebook 
          savedItems={savedItems} 
          allTags={allTags}
          language={language}
          onClose={() => setShowNotebook(false)}
          onOpenStory={(filteredItems: SavedItem[]) => {
              setStudyItems(filteredItems); 
              setShowStory(true);
          }}
          onOpenCards={(filteredItems: SavedItem[]) => {
            if(filteredItems.length > 0) {
              setStudyItems(filteredItems);
              setStudyIndex(0);
              setStudyMode(true);
            }
          }}
        />
      )}

      {showChat && (
        <ChatInterface 
          query={query} 
          language={language}
          onClose={() => setShowChat(false)} 
        />
      )}

      {showStory && (
        <StoryMode 
          items={studyItems.length > 0 ? studyItems : savedItems}
          language={language}
          onClose={() => setShowStory(false)}
        />
      )}
      
    </div>
  );
}
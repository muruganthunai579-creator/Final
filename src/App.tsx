/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Upload, Image as ImageIcon, Trophy, Loader2, AlertCircle, CheckCircle2, Languages, Star, Sparkles, ArrowRight, Settings, X, Key, Copy, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Initialize Free API
// In Vite, environment variables are accessed via import.meta.env
const getApiKey = () => {
  // Check Vite specific env first (Vite replaces this at build time)
  const viteKey = (import.meta as any).env?.VITE_GEMINI_API_KEY;
  if (viteKey) return viteKey;
  
  // Fallback to process.env (for AI Studio/Node environments)
  try {
    return (process as any).env?.GEMINI_API_KEY || '';
  } catch {
    return '';
  }
};

const apiKey = getApiKey();
const freeAPI = new GoogleGenAI({ apiKey });
const isKeyDetected = !!apiKey;

interface PredictionResult {
  winner: 'Team A' | 'Team B' | 'Draw';
  confidence: number;
  analysis: string;
  stats: {
    teamA: string;
    teamB: string;
  };
  tamilAnalysis?: string;
  scorePrediction?: string;
  tossAdvice?: string;
}

const TRANSLATIONS = {
  en: {
    title: "Jothida Predictor",
    subtitle: "Graham Paagai Murai",
    uploadLabel: "Upload Rasi Chart",
    uploadSub: "Select a clear image of the planetary positions",
    teamAName: "Team A Name",
    teamBName: "Team B Name",
    teamARoster: "Team A Houses",
    teamBRoster: "Team B Houses",
    predictBtn: "Analyze with Free API",
    analyzing: "Free API Analyzing...",
    confidence: "Confidence",
    winner: "Predicted Winner",
    aiAnalysis: "Free API Analysis",
    teamAStatus: "Team A Strength",
    teamBStatus: "Team B Strength",
    waiting: "Awaiting Input",
    waitingSub: "Upload a Rasi or Prasannam chart to begin the analysis.",
    changeImg: "Change Image",
    systemActive: "System Online",
    probability: "Winning Probability",
    score: "Score Prediction",
    matchSummary: "Match Summary",
    settings: "Settings",
    apiKeyLabel: "Gemini API Key",
    apiKeyPlaceholder: "Enter your API key here...",
    save: "Save",
    apiKeyHelp: "Your key is saved locally in your browser.",
    keyStatus: "API Key Status",
    keyFound: "Key Found",
    keyMissing: "Key Missing",
    copy: "Copy",
    copied: "Copied!"
  },
  ta: {
    title: "ஜோதிட கணிப்பு",
    subtitle: "கிரக பாகை முறை",
    uploadLabel: "ராசி கட்டம் பதிவேற்றவும்",
    uploadSub: "கிரக நிலைகள் தெளிவாகத் தெரியும் படத்தை தேர்வு செய்யவும்",
    teamAName: "அணி A பெயர்",
    teamBName: "அணி B பெயர்",
    teamARoster: "அணி A வீடுகள்",
    teamBRoster: "அணி B வீடுகள்",
    predictBtn: "இலவச API மூலம் கணி",
    analyzing: "இலவச API ஆய்வு செய்கிறது...",
    confidence: "துல்லியம்",
    winner: "வெற்றியாளர்",
    aiAnalysis: "இலவச API விளக்கம்",
    teamAStatus: "அணி A பலம்",
    teamBStatus: "அணி B பலம்",
    waiting: "பதிவேற்றத்திற்காக காத்திருக்கிறது",
    waitingSub: "வெற்றியைக் கணிக்க ராசி அல்லது பிரசன்ன கட்டத்தைப் பதிவேற்றவும்.",
    changeImg: "படத்தை மாற்றவும்",
    systemActive: "செயலில் உள்ளது",
    probability: "வெற்றி வாய்ப்பு",
    score: "ஸ்கோர் கணிப்பு",
    matchSummary: "போட்டி சுருக்கம்",
    settings: "அமைப்புகள்",
    apiKeyLabel: "Gemini API Key",
    apiKeyPlaceholder: "உங்கள் API Key-ஐ இங்கே உள்ளிடவும்...",
    save: "சேமி",
    apiKeyHelp: "உங்கள் Key உங்கள் உலாவியில் (Browser) பாதுகாப்பாகச் சேமிக்கப்படும்.",
    keyStatus: "API Key நிலை",
    keyFound: "Key உள்ளது",
    keyMissing: "Key இல்லை",
    copy: "நகலெடு",
    copied: "நகலெடுக்கப்பட்டது!"
  }
};

export default function App() {
  const [lang, setLang] = useState<'en' | 'ta'>('ta');
  const [image, setImage] = useState<string | null>(null);
  const [teamAName, setTeamAName] = useState('');
  const [teamBName, setTeamBName] = useState('');
  const [loading, setLoading] = useState(false);
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [manualApiKey, setManualApiKey] = useState(() => localStorage.getItem('gemini_api_key') || '');
  const [showSettings, setShowSettings] = useState(false);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const t = TRANSLATIONS[lang];

  const handleCopy = async () => {
    if (!manualApiKey) return;
    try {
      await navigator.clipboard.writeText(manualApiKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const saveApiKey = (key: string) => {
    localStorage.setItem('gemini_api_key', key);
    setManualApiKey(key);
    setShowSettings(false);
    setError(null);
  };

  const currentApiKey = manualApiKey || apiKey;
  const isKeyActive = !!currentApiKey;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
        setPrediction(null);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePredict = async () => {
    if (!image) return;

    if (!isKeyActive) {
      setError(lang === 'ta' ? "API Key அமைக்கப்படவில்லை. 'Settings' ஐகானை கிளிக் செய்து உங்கள் API Key-ஐ உள்ளிடவும்." : "API Key is missing. Click the 'Settings' icon to enter your API key.");
      setShowSettings(true);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const activeGenAI = new GoogleGenAI({ apiKey: currentApiKey });
      const base64Data = image.split(',')[1];
      
      const prompt = `
        You are a Master Vedic Astrologer specializing in "KP Astrology", "Prasannam", and "Aarudam" for sports prediction.
        
        Analyze this Rasi/Prasannam chart screenshot.
        
        Teams:
        - Team A (Udhayam / 1st House): ${teamAName || 'Team A'}
        - Team B (7th House / Opponent): ${teamBName || 'Team B'}
        
        PREDICTION RULES:
        1. Winner Calculation (Aarudam & Athipathi Analysis):
           - Identify the "Aarudam" (Arudha Lagna) in the chart.
           - Identify the "Aaruda Athipathi" (Lord of the Arudha Lagna).
           - CRITICAL RULE: If the Aaruda Athipathi is in "Pagai" (Enemy House) or "Neecham" (Debilitation), the opposite team wins.
           - Analyze the combination of "Aarudam + Athipathi" strength.
           - Team A (Udhayam) success houses: 1, 6, 11.
           - Team B (7th House) success houses: 7, 12, 5.
           - Determine the winner based on which team has stronger planetary placements in their respective success houses.
        
        2. Score Prediction (Use Paagai & Paarvai Murai):
           - Use "Graham Paagai Murai" (Planetary Degree Method) to identify the sub-lord strength of the 2nd and 11th houses.
           - Use "Paarvai Murai" (Aspect Method) to see how planets like Jupiter, Mars, and Saturn influence the scoring houses.
           - Higher degrees and positive aspects (like Jupiter's 5, 7, 9) on the 2nd/11th houses indicate a higher score.
        
        Return the result in JSON format:
        {
          "winner": "Team A" | "Team B" | "Draw",
          "confidence": number,
          "analysis": "Explanation of the winner based on Udhayam, 7th House, Aarudam, and Athipathi in English",
          "tamilAnalysis": "Detailed explanation in Tamil (தமிழ் விளக்கம் - உதயம், 7-ம் பாவம், ஆருடம், ஆருட அதிபதி, பாகை மற்றும் பார்வை முறை கணிப்பு விவரங்கள்)",
          "scorePrediction": "Technical score range calculated using Paagai and Paarvai Murai",
          "stats": {
            "teamA": "Udhayam (1, 6, 11) summary",
            "teamB": "7th House (7, 12, 5) summary"
          }
        }
      `;

      const response = await activeGenAI.models.generateContent({
        model: "gemini-2.0-flash",
        contents: [{
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: "image/png",
                data: base64Data
              }
            }
          ]
        }],
        config: {
          responseMimeType: "application/json"
        }
      });

      let rawText = response.text || '{}';
      // Robust JSON extraction in case the model wraps it in markdown
      if (rawText.includes('```json')) {
        rawText = rawText.split('```json')[1].split('```')[0].trim();
      } else if (rawText.includes('```')) {
        rawText = rawText.split('```')[1].split('```')[0].trim();
      }

      const result = JSON.parse(rawText);
      setPrediction(result);
    } catch (err: any) {
      console.error("Prediction error:", err);
      
      const errorMessage = err?.message || "";
      
      if (errorMessage.includes("API_KEY_INVALID") || errorMessage.includes("403")) {
        setError(lang === 'ta' ? "API Key தவறானது. Netlify-ல் சரியான Key-ஐச் சேர்க்கவும்." : "Invalid API Key. Please check your Netlify environment variables.");
      } else if (errorMessage.includes("QUOTA_EXCEEDED") || errorMessage.includes("429")) {
        setError(lang === 'ta' ? "இலவச சேவைக்கான அளவு முடிந்துவிட்டது. சிறிது நேரம் கழித்து முயற்சிக்கவும்." : "Free quota exceeded. Please try again in a few minutes.");
      } else if (errorMessage.includes("SAFETY")) {
        setError(lang === 'ta' ? "பாதுகாப்பு காரணங்களால் இந்தக் கணிப்பு தடுக்கப்பட்டது." : "Prediction blocked due to safety filters.");
      } else {
        setError(lang === 'ta' ? "கணிப்பு வரவில்லை. உங்கள் இணைய இணைப்பைச் சரிபார்த்து மீண்டும் முயற்சிக்கவும்." : "Prediction failed. Please check your connection and try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="min-h-screen bg-[#FDFDFB] text-[#1A1A1A] font-sans selection:bg-[#F5F2ED]">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-[#EBEBE8]">
        <div className="max-w-7xl mx-auto px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-[#1A1A1A] rounded-full flex items-center justify-center shadow-lg">
              <Star className="text-[#B8860B] w-5 h-5 fill-current" />
            </div>
            <div>
              <h1 className="text-xl font-serif font-bold tracking-tight leading-none">{t.title}</h1>
              <p className="text-[9px] text-[#B8860B] font-bold uppercase tracking-[0.2em] mt-1">{t.subtitle}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 hover:bg-[#F5F2ED] rounded-full transition-colors relative group"
              title={t.settings}
            >
              <Settings className="w-4 h-4 text-[#1A1A1A]" />
              {!isKeyActive && (
                <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
              )}
            </button>
            <button 
              onClick={() => setLang(lang === 'en' ? 'ta' : 'en')}
              className="px-4 py-2 border border-[#EBEBE8] hover:bg-[#F5F2ED] rounded-full text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2"
            >
              <Languages className="w-3 h-3" />
              {lang === 'en' ? 'தமிழ்' : 'English'}
            </button>
            <div className="hidden sm:flex items-center gap-2 text-[9px] font-bold text-green-600 uppercase tracking-widest">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
              {t.systemActive}
            </div>
          </div>
        </div>
      </nav>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSettings(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[40px] shadow-2xl overflow-hidden border border-[#EBEBE8]"
            >
              <div className="p-10">
                <div className="flex items-center justify-between mb-10">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-[#F5F2ED] rounded-2xl flex items-center justify-center">
                      <Settings className="w-5 h-5 text-[#1A1A1A]" />
                    </div>
                    <h2 className="text-2xl font-serif font-bold">{t.settings}</h2>
                  </div>
                  <button
                    onClick={() => setShowSettings(false)}
                    className="p-2 hover:bg-[#F5F2ED] rounded-full transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-8">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-[#B8860B] mb-3">
                      {t.apiKeyLabel}
                    </label>
                    <div className="relative group">
                      <Key className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#B8860B]" />
                      <input
                        type="password"
                        value={manualApiKey}
                        onChange={(e) => setManualApiKey(e.target.value)}
                        placeholder={t.apiKeyPlaceholder}
                        className="w-full pl-14 pr-14 py-5 bg-[#F5F2ED] border-2 border-transparent focus:border-[#B8860B] rounded-3xl outline-none transition-all text-sm font-mono"
                      />
                      {manualApiKey && (
                        <button
                          onClick={handleCopy}
                          className="absolute right-4 top-1/2 -translate-y-1/2 p-2 hover:bg-white rounded-xl transition-all flex items-center gap-2"
                          title={t.copy}
                        >
                          {copied ? (
                            <Check className="w-4 h-4 text-green-600" />
                          ) : (
                            <Copy className="w-4 h-4 text-[#B8860B]" />
                          )}
                        </button>
                      )}
                    </div>
                    <p className="mt-3 text-[10px] text-gray-500 italic leading-relaxed">
                      {t.apiKeyHelp}
                    </p>
                  </div>

                  <div className="flex items-center justify-between p-5 bg-[#F5F2ED] rounded-3xl">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{t.keyStatus}</span>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${isKeyActive ? 'bg-green-500' : 'bg-red-500'}`} />
                      <span className="text-[10px] font-bold uppercase tracking-widest">{isKeyActive ? t.keyFound : t.keyMissing}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => saveApiKey(manualApiKey)}
                    className="w-full py-5 bg-[#1A1A1A] text-white rounded-3xl font-bold text-xs uppercase tracking-[0.2em] hover:bg-black transition-all shadow-xl shadow-black/10"
                  >
                    {t.save}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <main className="max-w-7xl mx-auto px-8 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">
          
          {/* Left Side: Input & Config */}
          <div className="lg:col-span-7 space-y-12">
            <div 
              onClick={triggerFileInput}
              className={`relative group cursor-pointer rounded-[40px] border border-[#EBEBE8] transition-all duration-700 flex flex-col items-center justify-center overflow-hidden bg-white shadow-sm hover:shadow-xl hover:-translate-y-1
                ${image ? 'border-[#B8860B]/30' : 'hover:border-[#B8860B]/20'}
                aspect-[16/10]`}
            >
              {image ? (
                <>
                  <img src={image} alt="Chart" className="w-full h-full object-contain p-8" />
                  <div className="absolute inset-0 bg-white/90 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-4">
                    <div className="w-14 h-14 bg-[#1A1A1A] rounded-full flex items-center justify-center shadow-xl">
                      <Upload className="text-white w-6 h-6" />
                    </div>
                    <p className="text-[9px] font-bold tracking-[0.3em] uppercase text-gray-900">
                      {t.changeImg}
                    </p>
                  </div>
                </>
              ) : (
                <div className="p-16 text-center space-y-8">
                  <div className="w-24 h-24 bg-[#F5F2ED] text-[#B8860B] rounded-full flex items-center justify-center mx-auto group-hover:scale-105 transition-transform duration-700">
                    <ImageIcon className="w-10 h-10 stroke-[1.5]" />
                  </div>
                </div>
              )}
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept="image/*"
                className="hidden"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <label className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em] px-4">{t.teamAName}</label>
                <input 
                  type="text"
                  value={teamAName}
                  onChange={(e) => setTeamAName(e.target.value)}
                  placeholder="Team A"
                  className="w-full px-8 py-4 bg-white rounded-full border border-[#EBEBE8] focus:outline-none focus:border-[#B8860B]/30 transition-all text-sm font-serif"
                />
              </div>
              <div className="space-y-4">
                <label className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em] px-4">{t.teamBName}</label>
                <input 
                  type="text"
                  value={teamBName}
                  onChange={(e) => setTeamBName(e.target.value)}
                  placeholder="Team B"
                  className="w-full px-8 py-4 bg-white rounded-full border border-[#EBEBE8] focus:outline-none focus:border-[#B8860B]/30 transition-all text-sm font-serif"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="p-8 bg-white rounded-[32px] border border-[#EBEBE8] shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em]">{teamAName || t.teamARoster}</p>
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                </div>
                <div className="flex flex-wrap gap-3">
                  {[1, 2, 3, 6, 10, 11].map(n => (
                    <span key={n} className="w-12 h-12 flex items-center justify-center bg-[#F5F2ED] text-[#1A1A1A] rounded-2xl text-sm font-bold border border-[#EBEBE8]">{n}</span>
                  ))}
                </div>
              </div>
              <div className="p-8 bg-white rounded-[32px] border border-[#EBEBE8] shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em]">{teamBName || t.teamBRoster}</p>
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                </div>
                <div className="flex flex-wrap gap-3">
                  {[4, 5, 7, 8, 9, 12].map(n => (
                    <span key={n} className="w-12 h-12 flex items-center justify-center bg-[#F5F2ED] text-[#1A1A1A] rounded-2xl text-sm font-bold border border-[#EBEBE8]">{n}</span>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={handlePredict}
              disabled={!image || loading}
              className={`w-full py-6 rounded-full font-bold text-sm uppercase tracking-[0.3em] transition-all duration-500 flex items-center justify-center gap-4 shadow-xl
                ${!image || loading 
                  ? 'bg-gray-100 text-gray-300 cursor-not-allowed shadow-none' 
                  : 'bg-[#1A1A1A] text-white hover:bg-[#2A2A2A] active:scale-[0.98] shadow-[#1A1A1A]/10'}`}
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {t.analyzing}
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 text-[#B8860B]" />
                  {t.predictBtn}
                </>
              )}
            </button>
          </div>

          {/* Right Side: Results */}
          <div className="lg:col-span-5 sticky top-32">
            <AnimatePresence mode="wait">
              {error && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="p-8 bg-red-50 border border-red-100 rounded-[32px] flex items-start gap-4 text-red-800 shadow-sm"
                >
                  <AlertCircle className="w-6 h-6 shrink-0" />
                  <p className="text-xs font-medium">{error}</p>
                </motion.div>
              )}

              {prediction ? (
                <motion.div
                  key="prediction"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-8"
                >
                  <div className="bg-white rounded-[40px] p-12 border border-[#EBEBE8] shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-10">
                      <div className="text-right">
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-1">{t.confidence}</p>
                        <p className="text-3xl font-serif font-bold text-[#B8860B] tracking-tighter">{prediction.confidence}%</p>
                      </div>
                    </div>

                    <div className="space-y-12">
                      <div className="space-y-2">
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em]">{t.winner}</p>
                        <h3 className={`text-5xl font-serif font-bold tracking-tighter leading-none ${
                          prediction.winner === 'Team A' ? 'text-blue-600' : 
                          prediction.winner === 'Team B' ? 'text-orange-600' : 'text-gray-400'
                        }`}>
                          {prediction.winner === 'Team A' ? (teamAName || (lang === 'ta' ? 'அணி A' : 'Team A')) : 
                           prediction.winner === 'Team B' ? (teamBName || (lang === 'ta' ? 'அணி B' : 'Team B')) : 
                           (lang === 'ta' ? 'சமம்' : 'Draw')}
                        </h3>
                      </div>

                      <div className="h-px bg-[#F5F2ED] w-full" />

                      <div className="space-y-8">
                        <div className="grid grid-cols-1 gap-8">
                          <div className="space-y-3">
                            <p className="text-[9px] font-bold text-blue-500 uppercase tracking-[0.2em]">{teamAName || t.teamAStatus}</p>
                            <p className="text-xs font-light leading-relaxed text-gray-600 bg-[#F5F2ED]/30 p-6 rounded-[24px] border border-[#F5F2ED]">{prediction.stats.teamA}</p>
                          </div>
                          <div className="space-y-3">
                            <p className="text-[9px] font-bold text-orange-500 uppercase tracking-[0.2em]">{teamBName || t.teamBStatus}</p>
                            <p className="text-xs font-light leading-relaxed text-gray-600 bg-[#F5F2ED]/30 p-6 rounded-[24px] border border-[#F5F2ED]">{prediction.stats.teamB}</p>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em]">{t.aiAnalysis}</p>
                          <div className="text-sm font-serif italic leading-relaxed text-gray-800 bg-[#F5F2ED] p-8 rounded-[32px] border border-[#EBEBE8]">
                            {lang === 'ta' && prediction.tamilAnalysis ? prediction.tamilAnalysis : prediction.analysis}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-10 bg-[#1A1A1A] rounded-[40px] text-white shadow-2xl relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-[#B8860B]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-8">
                        <h4 className="text-[9px] font-bold uppercase tracking-[0.3em] flex items-center gap-3">
                          <Trophy className="w-4 h-4 text-[#B8860B]" />
                          {t.probability}
                        </h4>
                      </div>
                      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden flex">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${prediction.winner === 'Team A' ? prediction.confidence : 100 - prediction.confidence}%` }}
                          transition={{ duration: 2, ease: "circOut" }}
                          className="h-full bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]" 
                        />
                        <div className="h-full bg-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.5)] flex-1" />
                      </div>
                      <div className="flex justify-between mt-6 text-[8px] font-bold uppercase tracking-[0.3em] text-gray-500">
                        <span className={prediction.winner === 'Team A' ? 'text-blue-400' : ''}>{teamAName || 'Team A'}</span>
                        <span className={prediction.winner === 'Team B' ? 'text-orange-400' : ''}>{teamBName || 'Team B'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Match Summary Card at the bottom */}
                  <div className="p-10 bg-white border border-[#EBEBE8] rounded-[40px] shadow-xl space-y-8">
                    <h4 className="text-[9px] font-bold uppercase tracking-[0.3em] text-gray-400 flex items-center gap-3">
                      <Trophy className="w-4 h-4 text-[#B8860B]" />
                      {t.matchSummary}
                    </h4>
                    
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">{t.winner}</p>
                        <p className="text-sm font-serif font-bold text-[#B8860B]">
                          {prediction.winner === 'Team A' ? teamAName || 'Team A' : prediction.winner === 'Team B' ? teamBName || 'Team B' : 'Draw'}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">{t.score}</p>
                        <p className="text-sm font-serif font-bold text-gray-900">
                          {prediction.scorePrediction || '-'}
                        </p>
                      </div>
                    </div>

                    {prediction.tossAdvice && (
                      <div className="pt-4 border-t border-[#F5F2ED]">
                        <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mb-2">Toss Advice</p>
                        <p className="text-xs italic text-gray-600">{prediction.tossAdvice}</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              ) : !loading && (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="h-full min-h-[600px] border border-[#EBEBE8] rounded-[40px] flex flex-col items-center justify-center text-center p-16 space-y-8 bg-white/40 backdrop-blur-sm"
                >
                  <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center text-gray-200 shadow-xl border border-[#EBEBE8]">
                    <Star className="w-12 h-12 stroke-[1]" />
                  </div>
                  <div className="space-y-4">
                    <h3 className="text-xl font-serif font-medium text-gray-400">{t.waiting}</h3>
                    <p className="text-xs text-gray-400 font-light max-w-xs mx-auto leading-relaxed">{t.waitingSub}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-8 py-24 border-t border-[#EBEBE8]">
        <div className="flex flex-col md:flex-row justify-between items-center gap-12 text-[9px] font-bold text-gray-400 uppercase tracking-[0.3em]">
          <div className="flex items-center gap-4">
            <Star className="w-4 h-4 text-[#B8860B]" />
            <p>© 2026 Jothida Predictor. Graham Paagai Murai.</p>
          </div>
          <div className="flex gap-12">
            <a href="#" className="hover:text-[#1A1A1A] transition-colors">Privacy</a>
            <a href="#" className="hover:text-[#1A1A1A] transition-colors">Terms</a>
            <a href="#" className="hover:text-[#1A1A1A] transition-colors">Methodology</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, X, Send, Mic, MicOff, AlertCircle, Check, Loader2, ArrowRight } from 'lucide-react';
import { useMemoria } from '@/lib/storage/store';
import { CreateActivityInput, ActivityType, ActivityPriority } from '@/types/database.types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

interface ParsedResult {
  title: string;
  type: ActivityType;
  subject_id: string | null;
  subject_name?: string;
  start_datetime: string;
  end_datetime?: string | null;
  priority: ActivityPriority;
  description?: string;
}

export function QuickAddModal({ isOpen, onClose }: Props) {
  const { subjects, addActivity } = useMemoria();

  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsedResult, setParsedResult] = useState<ParsedResult | null>(null);
  const [isListening, setIsListening] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  // Global Ctrl+K shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        // Toggle or open
        if (isOpen) onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setPrompt('');
      setParsedResult(null);
      setError(null);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Speech to text support (Web Speech API)
  const toggleSpeech = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError('Tu navegador no soporta dictado por voz.');
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'es-ES';
      recognition.interimResults = false;

      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setPrompt(transcript);
        setIsListening(false);
      };
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);

      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  const handleProcess = async () => {
    if (!prompt.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/ai/quick-add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          raw_text: prompt.trim(),
          user_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          current_datetime: new Date().toISOString(),
          subjects_context: subjects.map((s) => ({
            id: s.id,
            name: s.name,
            code: s.code,
          })),
        }),
      });

      if (!res.ok) {
        throw new Error('Error al procesar con el asistente IA.');
      }

      const data = await res.json();
      setParsedResult(data.parsed);
    } catch (err: any) {
      // Graceful local fallback parsing if offline or API key missing
      console.warn('API error, executing heuristic fallback', err);
      const fallback = heuristicParse(prompt, subjects);
      setParsedResult(fallback);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmAdd = () => {
    if (!parsedResult) return;

    const newActivity: CreateActivityInput = {
      title: parsedResult.title,
      description: parsedResult.description || null,
      type: parsedResult.type,
      subject_id: parsedResult.subject_id,
      start_datetime: parsedResult.start_datetime,
      end_datetime: parsedResult.end_datetime || null,
      is_all_day: false,
      priority: parsedResult.priority,
      status: 'pending',
      metadata: { created_via: 'memorIA_ai' },
    };

    addActivity(newActivity);
    onClose();
  };

  const examplePrompts = [
    'Examen parcial de Redes el próximo martes a las 10 am',
    'Entrega de taller de Cálculo mañana a las 11:59 pm',
    'Reunión de equipo proyecto de Estructuras el viernes a las 3 pm',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-2xl border border-blue-500/30 bg-[#0f1422] p-6 shadow-2xl shadow-blue-900/20">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-yellow-300 shadow-md">
              <Sparkles className="h-4 w-4 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Asistente memorIA</h2>
              <p className="text-[11px] text-slate-400">Entrada rápida en lenguaje natural</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/20 p-2.5 text-xs text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Text Input */}
        <div className="mt-4">
          <label className="block text-xs font-medium text-slate-300 mb-1.5">
            Escribe o pega lo que te dijo el profesor o tu equipo:
          </label>
          <div className="relative flex items-center">
            <input
              ref={inputRef}
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleProcess();
              }}
              placeholder="Ej. Tarea de Cálculo para este jueves a las 23:59..."
              className="w-full rounded-xl border border-slate-700 bg-slate-800/90 pl-3.5 pr-20 py-3 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <div className="absolute right-2 flex items-center gap-1">
              <button
                type="button"
                onClick={toggleSpeech}
                className={`rounded-lg p-1.5 transition ${
                  isListening
                    ? 'bg-red-600 text-white animate-pulse'
                    : 'text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                }`}
                title={isListening ? 'Detener dictado' : 'Dictar por voz'}
              >
                {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </button>
              <button
                type="button"
                onClick={handleProcess}
                disabled={isLoading || !prompt.trim()}
                className="rounded-lg bg-blue-600 p-1.5 text-white hover:bg-blue-500 disabled:opacity-40 transition"
                title="Procesar con IA"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRight className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Example prompts */}
        {!parsedResult && (
          <div className="mt-4 space-y-1.5">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Ejemplos rápidos para probar:
            </span>
            <div className="flex flex-col gap-1.5">
              {examplePrompts.map((ex, i) => (
                <button
                  key={i}
                  onClick={() => setPrompt(ex)}
                  className="rounded-lg border border-slate-800 bg-slate-900/60 p-2 text-left text-xs text-slate-400 hover:border-slate-700 hover:text-slate-200 transition"
                >
                  "{ex}"
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Parsed Result Preview */}
        {parsedResult && (
          <div className="mt-5 rounded-xl border border-blue-500/40 bg-blue-950/20 p-4 animate-in fade-in">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-bold text-blue-300">
                <Check className="h-4 w-4 text-emerald-400" />
                memorIA detectó esta actividad:
              </span>
              <span className="rounded bg-blue-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase text-blue-300">
                {parsedResult.type}
              </span>
            </div>

            <div className="mt-3 space-y-1.5 text-xs">
              <div className="font-semibold text-white text-sm">
                {parsedResult.title}
              </div>

              {parsedResult.subject_name && (
                <div className="text-slate-300">
                  <span className="text-slate-500">Materia:</span> {parsedResult.subject_name}
                </div>
              )}

              <div className="text-slate-300">
                <span className="text-slate-500">Fecha y hora:</span>{' '}
                {format(new Date(parsedResult.start_datetime), "EEEE d 'de' MMMM, HH:mm", {
                  locale: es,
                })}
              </div>

              <div className="text-slate-300">
                <span className="text-slate-500">Prioridad:</span>{' '}
                <span className="capitalize">{parsedResult.priority}</span>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-end gap-2 border-t border-slate-800 pt-3">
              <button
                type="button"
                onClick={() => setParsedResult(null)}
                className="rounded-lg px-3 py-1.5 text-xs text-slate-400 hover:bg-slate-800 hover:text-white transition"
              >
                Volver a escribir
              </button>
              <button
                type="button"
                onClick={handleConfirmAdd}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-500 transition active:scale-95"
              >
                <Check className="h-3.5 w-3.5" />
                <span>Confirmar y Agendar</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Heuristic fallback in case network / API key is not yet set
function heuristicParse(text: string, subjects: any[]): ParsedResult {
  const lower = text.toLowerCase();
  let type: ActivityType = 'task';
  let priority: ActivityPriority = 'medium';

  if (lower.includes('examen') || lower.includes('parcial') || lower.includes('evaluación')) {
    type = 'exam';
    priority = 'high';
  } else if (lower.includes('reunión') || lower.includes('meet') || lower.includes('zoom')) {
    type = 'meeting';
  }

  // Subject matching
  let matchedSubject = subjects.find((s) =>
    lower.includes(s.name.toLowerCase()) || (s.code && lower.includes(s.code.toLowerCase()))
  );

  const now = new Date();
  let targetDate = new Date(now);

  if (lower.includes('mañana')) {
    targetDate.setDate(now.getDate() + 1);
  } else if (lower.includes('martes')) {
    targetDate.setDate(now.getDate() + ((2 + 7 - now.getDay()) % 7 || 7));
  } else if (lower.includes('miércoles') || lower.includes('miercoles')) {
    targetDate.setDate(now.getDate() + ((3 + 7 - now.getDay()) % 7 || 7));
  } else if (lower.includes('jueves')) {
    targetDate.setDate(now.getDate() + ((4 + 7 - now.getDay()) % 7 || 7));
  } else if (lower.includes('viernes')) {
    targetDate.setDate(now.getDate() + ((5 + 7 - now.getDay()) % 7 || 7));
  } else {
    targetDate.setDate(now.getDate() + 2);
  }

  // Time detection
  let hour = 10;
  let minute = 0;
  const timeMatch = lower.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
  if (timeMatch) {
    hour = parseInt(timeMatch[1], 10);
    if (timeMatch[3] === 'pm' && hour < 12) hour += 12;
    if (timeMatch[3] === 'am' && hour === 12) hour = 0;
    if (timeMatch[2]) minute = parseInt(timeMatch[2], 10);
  }

  targetDate.setHours(hour, minute, 0, 0);

  return {
    title: text.length > 50 ? text.slice(0, 50) + '...' : text,
    type,
    subject_id: matchedSubject ? matchedSubject.id : null,
    subject_name: matchedSubject ? matchedSubject.name : undefined,
    start_datetime: targetDate.toISOString(),
    end_datetime: new Date(targetDate.getTime() + 60 * 60 * 1000).toISOString(),
    priority,
    description: `Detectado automáticamente por memorIA: "${text}"`,
  };
}

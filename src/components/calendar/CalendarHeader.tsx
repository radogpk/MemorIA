"use client";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Download,
  GraduationCap,
  SlidersHorizontal,
} from "lucide-react";
import { addDays, format, isSameDay, startOfWeek } from "date-fns";
import { es } from "date-fns/locale";
import { useMemoria } from "@/lib/storage/store";
import {
  calendarDate,
  calendarDayKey,
  fallsOnDay,
} from "@/lib/calendar/presentation";
import type { CalendarEvent, CalendarViewMode } from "@/lib/calendar/types";
import type { Subject } from "@/types/database.types";
import { CalendarFilterBar } from "./CalendarFilterBar";
interface Props {
  viewMode: CalendarViewMode;
  onViewModeChange: (mode: CalendarViewMode) => void;
  currentDate: Date;
  onSelectDate: (date: Date) => void;
  events: CalendarEvent[];
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onExportIcs: () => void;
  onOpenStudyPlanner: () => void;
  subjects: Subject[];
  selectedSubjectId: string | null;
  selectedType: string | null;
  onSelectSubject: (id: string | null) => void;
  onSelectType: (type: string | null) => void;
}
export function CalendarHeader(p: Props) {
  const { viewMode, setViewMode, activeProfile, partnerProfile } = useMemoria();
  const week = startOfWeek(p.currentDate, { weekStartsOn: 1 });
  const filtered = !!p.selectedType || !!p.selectedSubjectId;
  return (
    <header className="agenda-toolbar">
      <div className="agenda-title-line">
        <h1>Tu agenda</h1>
        <label className="agenda-date-picker">
          <CalendarDays size={17} />
          <input
            aria-label="Elegir fecha de la agenda"
            type="date"
            value={calendarDayKey(p.currentDate)}
            onChange={(e) => {
              if (e.target.value)
                p.onSelectDate(new Date(`${e.target.value}T12:00:00`));
            }}
          />
        </label>
      </div>
      <div className="agenda-control-line">
        <select
          aria-label="Ver agenda de"
          className="agenda-owner-select"
          value={viewMode}
          onChange={(e) => setViewMode(e.target.value as typeof viewMode)}
        >
          <option value="mine">Mi agenda</option>
          <option value="partner">{partnerProfile?.name || "Pareja"}</option>
          <option value="both">Ambos</option>
        </select>
        <div
          className="agenda-view-switch"
          role="group"
          aria-label="Vista del calendario"
        >
          {(["day", "week", "month"] as const).map((view) => (
            <button
              key={view}
              aria-pressed={p.viewMode === view}
              onClick={() => p.onViewModeChange(view)}
            >
              {{ day: "Día", week: "Semana", month: "Mes" }[view]}
            </button>
          ))}
        </div>
      </div>
      <div className="agenda-period-line">
        <button
          className="icon-button"
          aria-label={
            p.viewMode === "month" ? "Mes anterior" : "Semana anterior"
          }
          onClick={p.onPrev}
        >
          <ChevronLeft size={19} />
        </button>
        <span>{format(p.currentDate, "MMMM yyyy", { locale: es })}</span>
        <button className="today-shortcut" onClick={p.onToday}>
          Hoy
        </button>
        <button
          className="icon-button"
          aria-label={
            p.viewMode === "month" ? "Mes siguiente" : "Semana siguiente"
          }
          onClick={p.onNext}
        >
          <ChevronRight size={19} />
        </button>
      </div>
      {p.viewMode !== "month" && (
        <div
          className="agenda-week-strip"
          role="group"
          aria-label="Días de la semana"
        >
          {Array.from({ length: 7 }, (_, i) => addDays(week, i)).map((day) => {
            const count = p.events.filter((event) =>
              fallsOnDay(event, day),
            ).length;
            return (
              <button
                key={calendarDayKey(day)}
                aria-label={`${format(day, "EEEE d 'de' MMMM", { locale: es })}, ${count} ${count === 1 ? "compromiso" : "compromisos"}`}
                aria-pressed={isSameDay(day, p.currentDate)}
                aria-current={
                  isSameDay(day, calendarDate()) ? "date" : undefined
                }
                onClick={() => p.onSelectDate(day)}
              >
                <span>{format(day, "EEEEEE", { locale: es })}</span>
                <strong>{format(day, "d")}</strong>
                <span
                  className={`week-day-marker ${count ? "has-events" : ""}`}
                  aria-hidden="true"
                />
              </button>
            );
          })}
        </div>
      )}
      <details className="agenda-options">
        <summary>
          <SlidersHorizontal size={15} />
          {filtered ? "Filtros activos" : "Filtros y opciones"}
          {filtered && <span className="active-filter-dot" />}
        </summary>
        <div className="agenda-options-body">
          <CalendarFilterBar
            subjects={p.subjects}
            selectedSubjectId={p.selectedSubjectId}
            onSelectSubject={p.onSelectSubject}
            selectedType={p.selectedType}
            onSelectType={p.onSelectType}
          />
          {filtered && (
            <button
              className="text-button"
              onClick={() => {
                p.onSelectSubject(null);
                p.onSelectType(null);
              }}
            >
              Quitar filtros
            </button>
          )}
          <div className="agenda-extra-actions">
            <button className="text-button" onClick={p.onOpenStudyPlanner}>
              <GraduationCap size={17} />
              Organizar estudio
            </button>
            <button className="text-button" onClick={p.onExportIcs}>
              <Download size={17} />
              Exportar agenda
            </button>
          </div>
          <p className="hint">
            {viewMode === "mine"
              ? activeProfile.name
              : viewMode === "partner"
                ? partnerProfile?.name
                : "Ambos perfiles"}
            . Horarios de Perú.
          </p>
        </div>
      </details>
    </header>
  );
}

"use client";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Download,
  GraduationCap,
} from "lucide-react";
import { CalendarViewMode } from "@/lib/calendar/types";
import { useMemoria } from "@/lib/storage/store";
import { format } from "date-fns";
import { es } from "date-fns/locale";
interface Props {
  viewMode: CalendarViewMode;
  onViewModeChange: (m: CalendarViewMode) => void;
  currentDate: Date;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onOpenQuickAdd: () => void;
  onOpenManualAdd: () => void;
  onExportIcs?: () => void;
  onOpenStudyPlanner?: () => void;
}
export function CalendarHeader(p: Props) {
  const { viewMode, setViewMode, activeProfile, partnerProfile } = useMemoria();
  return (
    <div className="calendar-toolbar">
      <div className="section-heading">
        <div className="date-navigation">
          <button
            className="icon-button"
            aria-label="Periodo anterior"
            onClick={p.onPrev}
          >
            <ChevronLeft size={20} />
          </button>
          <button className="button secondary small" onClick={p.onToday}>
            Hoy
          </button>
          <button
            className="icon-button"
            aria-label="Periodo siguiente"
            onClick={p.onNext}
          >
            <ChevronRight size={20} />
          </button>
          <h1>{format(p.currentDate, "MMMM yyyy", { locale: es })}</h1>
        </div>
        <button className="button small" onClick={p.onOpenManualAdd}>
          <Plus size={17} /> Actividad
        </button>
      </div>
      <div className="calendar-controls">
        <div className="segmented" aria-label="Agenda de">
          {(
            [
              { id: "mine", label: activeProfile.name },
              { id: "partner", label: partnerProfile?.name || "Pareja" },
              { id: "both", label: "Ambos" },
            ] as const
          ).map((m) => (
            <button
              key={m.id}
              aria-pressed={viewMode === m.id}
              className={viewMode === m.id ? "active" : ""}
              onClick={() => setViewMode(m.id)}
            >
              {m.label}
            </button>
          ))}
        </div>
        <div className="calendar-tools">
          <div className="segmented" aria-label="Vista del calendario">
            {(["day", "week", "month"] as const).map((m) => (
              <button
                key={m}
                className={p.viewMode === m ? "active" : ""}
                aria-pressed={p.viewMode === m}
                onClick={() => p.onViewModeChange(m)}
              >
                {{ day: "Día", week: "Semana", month: "Mes" }[m]}
              </button>
            ))}
          </div>
          {p.onOpenStudyPlanner && (
            <button
              className="icon-button"
              title="Organizar estudio"
              aria-label="Organizar estudio"
              onClick={p.onOpenStudyPlanner}
            >
              <GraduationCap size={19} />
            </button>
          )}
          {p.onExportIcs && (
            <button
              className="icon-button"
              title="Exportar agenda visible (.ics)"
              aria-label="Exportar agenda visible"
              onClick={p.onExportIcs}
            >
              <Download size={18} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

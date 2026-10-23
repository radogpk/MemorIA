"use client";
import Link from "next/link";
import { Plus } from "lucide-react";
import { useMemoria } from "@/lib/storage/store";
import { InvitationList } from "@/components/invitations/InvitationList";
import { isVisibleActivity } from "@/lib/storage/model";
export default function TogetherPage() {
  const { activeProfile, partnerProfile, activities } = useMemoria();
  const shared = activities.filter(
    (a) =>
      a.is_shared && !a.invitation && isVisibleActivity(a, activeProfile.id),
  );
  return (
    <div className="page together-page">
      <div className="page-heading">
        <div>
          <h1>Planes que se confirman.</h1>
          <p>
            {activeProfile.name} y {partnerProfile?.name}. Propongan, respondan
            y encuentren un momento juntos.
          </p>
        </div>
        <Link className="button" href="/together/plan">
          <Plus size={18} /> Buscar una hora juntos
        </Link>
      </div>
      <div className="together-intro">
        <h2>Primero, una hora que les funcione.</h2>
        <p>
          Revisa las dos agendas y elige un espacio libre. La propuesta llega al
          otro perfil. Al aceptarla, aparece en ambas agendas. Si cambias la
          fecha o los detalles, tendrá que confirmarla de nuevo.
        </p>
      </div>
      <section>
        <h2 className="section-title">Invitaciones</h2>
        <InvitationList />
      </section>
      {shared.length > 0 && (
        <section className="shared-existing">
          <h2>Actividades compartidas</h2>
          <p className="hint">
            Estos planes se compartieron sin pedir confirmación.
          </p>
          {shared.map((a) => (
            <div className="upcoming-row" key={a.id}>
              <strong>{a.title}</strong>
              <span>
                {new Intl.DateTimeFormat("es-PE", {
                  dateStyle: "medium",
                  timeStyle: "short",
                  timeZone: "America/Lima",
                }).format(new Date(a.start_datetime))}
              </span>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

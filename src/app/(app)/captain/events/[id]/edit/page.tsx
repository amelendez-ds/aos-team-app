import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateEvent } from "@/app/captain/actions";
import EventForm from "@/components/EventForm";

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (me?.role !== "captain" && me?.role !== "admin") redirect("/");

  const { data: event } = await supabase
    .from("events")
    .select("id, name, start_date, end_date, location, format, notes")
    .eq("id", id)
    .maybeSingle();

  if (!event) {
    notFound();
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <h2 className="text-xl tracking-wide text-gold">Edit Event</h2>
      <section className="mt-4 rounded-lg border border-bronze/40 bg-surface p-6 shadow-lg">
        <EventForm
          initial={event}
          action={updateEvent.bind(null, event.id)}
          submitLabel="Save Changes"
        />
      </section>
    </div>
  );
}

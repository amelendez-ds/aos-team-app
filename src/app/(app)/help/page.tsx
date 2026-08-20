import Link from "next/link";

function HelpSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-bronze/40 bg-surface p-5 shadow-lg sm:p-6">
      <h3 className="font-display text-base tracking-wide text-gold">
        {title}
      </h3>
      <div className="mt-2 flex flex-col gap-2 text-sm leading-relaxed text-text">
        {children}
      </div>
    </section>
  );
}

export default function HelpPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl tracking-wide text-gold">How the App Works</h2>
        <div
          aria-hidden
          className="mt-3 h-px w-2/3 max-w-md bg-gradient-to-r from-transparent via-gold to-transparent"
        />
      </div>

      <HelpSection title="Logging a Game">
        <p>
          Use{" "}
          <Link href="/games/new" className="text-gold hover:underline">
            Log a Game
          </Link>{" "}
          after every battle: your faction, the opponent&apos;s faction, the
          result, and optionally scores, battle tactics, the event it belongs
          to, and notes. Your games live under{" "}
          <Link href="/games" className="text-gold hover:underline">
            My Games
          </Link>
          , where you can edit or delete them. Every other number in the app —
          proficiency, ranks, team statistics — is derived from these records,
          so log faithfully.
        </p>
      </HelpSection>

      <HelpSection title="Proficiency &amp; Ranks">
        <p>
          <Link href="/proficiency" className="text-gold hover:underline">
            Proficiency
          </Link>{" "}
          tracks two things per faction: mastery of the armies you{" "}
          <em>field</em>, and knowledge of the enemies you <em>face</em>. Levels
          rise automatically as you log games (quickly at first, slower as you
          rack them up), and you can nudge any level with the + / − buttons —
          say, for practice games that never got logged.
        </p>
        <p>
          Each level carries a lore rank, flavoured by Grand Alliance — from
          Untested up through the legendary tiers, which is what the glowing
          titles on your home page mean. Your Overall Mastery weighs every
          faction you play (60%) and face (40%), with more-played matchups
          counting for more. Your home page also distinguishes your{" "}
          <strong>Main Army</strong> (the one you choose in{" "}
          <Link href="/settings" className="text-gold hover:underline">
            Settings
          </Link>
          ) from your <strong>Strongest Army</strong> (the one your logged
          games say you are best with).
        </p>
      </HelpSection>

      <HelpSection title="Events &amp; Matchup Preferences">
        <p>
          The{" "}
          <Link href="/events" className="text-gold hover:underline">
            Events
          </Link>{" "}
          tab lists upcoming and past team events: our lineup (who brings
          what) and every opposing team with their factions.
        </p>
        <p>
          Before an event, submit your <strong>matchup ranking</strong> for
          each opposing team: order their factions from 1 (the matchup you
          most want) downward using the ▲▼ buttons. The captain sees these
          rankings alongside your proficiency when deciding pairings, so
          submitting them ahead of time genuinely matters. You can change a
          ranking any time before the round is paired.
        </p>
      </HelpSection>

      <HelpSection title="Team Overview">
        <p>
          <Link href="/team" className="text-gold hover:underline">
            Team
          </Link>{" "}
          is the shared picture: the team&apos;s overall record, our win rate
          into every enemy faction (what we dominate at the top, what hurts us
          at the bottom), a roster card for every member with their rank and
          armies, and recent event results. It is read-only — it simply
          reflects everyone&apos;s logged games.
        </p>
      </HelpSection>

      <HelpSection title="The Captain's Panel">
        <p>
          Captains and the admin have an extra tool: the Captain Panel, the
          war room used on event day. It combines the event lineup, each
          player&apos;s proficiency into the enemy factions, and the matchup
          preferences you submitted, then helps the captain pair players
          against the opposing team — one battle per opposing team, recorded
          round by round. If you are not the captain, nothing there concerns
          you beyond making sure your games and preferences are up to date.
        </p>
        <p>
          Events are created and edited there too, and can be deleted from the
          same list. Deleting an event also removes its opponent teams, lineup,
          preference rankings and recorded pairings — games logged against it
          are kept, but no longer count towards that event.
        </p>
      </HelpSection>

      <p className="text-center text-xs text-muted">
        Questions beyond this? Ask the team admin.
      </p>
    </div>
  );
}

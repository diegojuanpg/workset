import { createClient } from "@/lib/supabase/server";
import { athleteName } from "@/lib/athletes/name";
import type { Sex } from "@/lib/competitions/federations";

export interface Entry {
  athleteId: string;
  ageCategory: string | null;
  weightClass: string | null;
  /** yyyy-mm-dd. The single day this athlete lifts; null = the meet's first day. */
  competesOn: string | null;
}

export interface Competition {
  id: string;
  name: string;
  location: string | null;
  startsOn: string;
  endsOn: string;
  type: string;
  federation: string;
  /** Age categories the meet runs. Empty = all of the federation's. */
  ageCategories: string[];
  entries: Entry[];
}

export interface RosterAthlete {
  id: string;
  name: string;
  /** null while the invite is unclaimed — no athlete_profiles row, so no weight class filter. */
  sex: Sex | null;
}

/** Everything the Competitions page renders: the meets and the roster to enter them. */
export async function getCompetitionsPageData(): Promise<{
  competitions: Competition[];
  roster: RosterAthlete[];
}> {
  const supabase = await createClient();

  // athlete_profiles is a separate hop: athletes → profiles → athlete_profiles has no
  // direct FK, so PostgREST can't embed it. Cheaper to map two lists than to nest.
  const [{ data: comps }, { data: athletes }, { data: profiles }] =
    await Promise.all([
      supabase
        .from("competitions")
        .select(
          "id, name, location, starts_on, ends_on, type, federation, age_categories, competition_athletes(athlete_id, age_category, weight_class, competes_on)",
        )
        .order("starts_on", { ascending: true }),
      supabase
        .from("athletes")
        .select("id, first_name, last_name, athlete_id")
        .order("first_name"),
      supabase.from("athlete_profiles").select("profile_id, sex"),
    ]);

  const sexByProfile = new Map(
    (profiles ?? []).map((p) => [p.profile_id, p.sex as Sex]),
  );

  return {
    competitions: (comps ?? []).map((c) => ({
      id: c.id,
      name: c.name,
      location: c.location,
      startsOn: c.starts_on,
      endsOn: c.ends_on,
      type: c.type,
      federation: c.federation,
      ageCategories: c.age_categories ?? [],
      entries: (c.competition_athletes ?? []).map((e) => ({
        athleteId: e.athlete_id,
        ageCategory: e.age_category,
        weightClass: e.weight_class,
        competesOn: e.competes_on,
      })),
    })),
    roster: (athletes ?? []).map((a) => ({
      id: a.id,
      name: athleteName(a.first_name, a.last_name),
      sex: a.athlete_id ? (sexByProfile.get(a.athlete_id) ?? null) : null,
    })),
  };
}

export interface AthleteCompetition {
  id: string;
  name: string;
  /** yyyy-mm-dd. One day, never a range: an athlete lifts on a single day of a meet, so the
   *  calendar marks that day and no other. */
  on: string;
  federation: string;
}

/** The meets one athlete is entered in. Read through competition_athletes so the athlete's own
 *  RLS does the authorising — a coach only ever sees their own roster's entries. */
export async function getAthleteCompetitions(
  athleteId: string,
): Promise<AthleteCompetition[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("competition_athletes")
    .select("competes_on, competitions(id, name, starts_on, federation)")
    .eq("athlete_id", athleteId);

  return (data ?? [])
    .flatMap(({ competes_on, competitions: c }) =>
      c
        ? [
            {
              id: c.id,
              name: c.name,
              // Unset means the coach never picked a session, which for a one-day meet is the
              // only answer and for a longer one is the opening day.
              on: competes_on ?? c.starts_on,
              federation: c.federation,
            },
          ]
        : [],
    )
    .sort((a, b) => a.on.localeCompare(b.on));
}

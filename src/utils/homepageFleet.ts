export type HomepageFleetAgent = {
  readonly slug: string;
  readonly label: string;
  readonly description: string;
  readonly status: "verified";
};

export const curatedHomepageFleet = [
  {
    slug: "default-silas",
    label: "default / silas",
    description:
      "default Hermes operator/orchestrator; task queue, plans, dispatch, and system support",
    status: "verified",
  },
  {
    slug: "ada-vector",
    label: "ada-vector",
    description:
      "Taskflow intelligence + evaluation data; structured evidence, verifier maps, quantum-readiness scoring, eval/preference datasets",
    status: "verified",
  },
  {
    slug: "archer",
    label: "archer",
    description:
      "Financial markets analysis; trade/risk evaluation, market structure, technical levels, and thesis tracking",
    status: "verified",
  },
  {
    slug: "chip-renwick",
    label: "chip-renwick",
    description:
      "Broker-dealer compliance engineering; FINRA controls, supervision, books/records, audit evidence",
    status: "verified",
  },
  {
    slug: "luca",
    label: "luca",
    description:
      "Brand architecture + marketing strategy; content systems, voice, campaigns, and performance interpretation",
    status: "verified",
  },
  {
    slug: "nick-mercer",
    label: "nick-mercer",
    description:
      "OpenSCAD physical design; parametric parts, prototypes, review packets, fabrication caveats",
    status: "verified",
  },
  {
    slug: "valeria-cruz",
    label: "valeria-cruz",
    description:
      "International real-estate operations; Panama-first market intelligence, buyer trust, software/product execution, lead-generation systems",
    status: "verified",
  },
  {
    slug: "wren-ashford",
    label: "wren-ashford",
    description:
      "Product/UI creative direction; UX critique, design contracts, implementation handoffs, visual acceptance",
    status: "verified",
  },
  {
    slug: "xander",
    label: "xander",
    description:
      "Otoxan controller/fleet operator; control-plane buildout, fleet operations, internal agent runtime coordination",
    status: "verified",
  },
] as const satisfies readonly HomepageFleetAgent[];

export function getHomepageFleetCountLabel(
  fleet: readonly HomepageFleetAgent[] = curatedHomepageFleet
) {
  return `${fleet.length} verified agents`;
}

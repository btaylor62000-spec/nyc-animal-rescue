/**
 * Reading a place out of free text.
 *
 * Shared by the importer (which tags records) and the chat assistant (which
 * reads a borough out of a question), so "Park Slope" means Brooklyn in both.
 * When they disagreed, the assistant answered a Park Slope question without
 * knowing it was in Brooklyn.
 */
export type BoroughId = 'manhattan' | 'brooklyn' | 'queens' | 'bronx' | 'staten-island';

export const BOROUGH_PATTERNS: Array<{ tag: BoroughId; pattern: RegExp }> = [
  { tag: 'brooklyn', pattern: /\bbrooklyn\b|\bkings county\b|\bbklyn\b|\bBK\b/i },
  { tag: 'queens', pattern: /\bqueens\b/i },
  { tag: 'bronx', pattern: /\bbronx\b/i },
  { tag: 'manhattan', pattern: /\bmanhattan\b|\bnew york county\b/i },
  { tag: 'staten-island', pattern: /\bstaten island\b|\brichmond county\b|\bSI\b/i },
];

/**
 * Neighbourhood names that reliably imply a borough. Only unambiguous ones --
 * "Ridgewood" (Queens and New Jersey) and similar collisions are left out
 * rather than guessed.
 */
export const NEIGHBORHOOD_BOROUGH: Array<{ tag: BoroughId; pattern: RegExp }> = [
  {
    tag: 'brooklyn',
    pattern:
      /\b(greenpoint|williamsburg|bushwick|bed.?stuy|bedford.?stuyvesant|crown heights|flatbush|park slope|sunset park|bay ridge|midwood|sheepshead bay|brownsville|east new york|ocean hill|gowanus|red hook|dumbo|canarsie|borough park|windsor terrace|prospect heights|prospect park|carroll gardens|bensonhurst|coney island|fort greene|clinton hill|south slope|boerum hill|cobble hill|greenwood|ditmas park|marine park|bay parkway|brighton beach|sunset park|east flatbush|kensington|gravesend|bushwick)\b/i,
  },
  {
    tag: 'queens',
    pattern:
      /\b(astoria|long island city|\bLIC\b|jackson heights|flushing|jamaica|forest hills|rego park|elmhurst|woodside|sunnyside|corona|rockaway|far rockaway|woodhaven|glendale|maspeth|bayside|richmond hill|ozone park|howard beach|whitestone|college point|kew gardens|middle village|ridgewood queens|st albans|springfield gardens|fresh meadows|jamaica estates)\b/i,
  },
  {
    tag: 'manhattan',
    pattern:
      /\b(harlem|east harlem|washington heights|inwood|upper east side|upper west side|\bUES\b|\bUWS\b|chelsea|soho|tribeca|east village|west village|greenwich village|lower east side|\bLES\b|midtown|hell'?s kitchen|morningside heights|chinatown|murray hill|gramercy|battery park|financial district|yorkville|hamilton heights|alphabet city|kips bay)\b/i,
  },
  {
    tag: 'bronx',
    pattern:
      /\b(riverdale|fordham|throgs neck|pelham bay|mott haven|hunts point|kingsbridge|morris park|parkchester|soundview|castle hill|city island|tremont|concourse|bedford park|norwood|woodlawn|belmont|melrose|port morris|co-?op city)\b/i,
  },
  {
    tag: 'staten-island',
    pattern:
      /\b(st\.? george|tottenville|great kills|new dorp|port richmond|stapleton|clove|annadale|west brighton|todt hill|bulls head|eltingville|dongan hills|mariners harbor)\b/i,
  },
];

/** Every borough named or implied by a piece of text. */
export function boroughsIn(text: string): BoroughId[] {
  const found = new Set<BoroughId>();
  for (const b of BOROUGH_PATTERNS) if (b.pattern.test(text)) found.add(b.tag);
  for (const n of NEIGHBORHOOD_BOROUGH) if (n.pattern.test(text)) found.add(n.tag);
  return [...found];
}

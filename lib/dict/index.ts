import type { Locale } from "../i18n";
import { pt, type Dict } from "./pt";
import { en } from "./en";
import type { Occasion } from "../occasions";
import type { MusicStyle } from "../music-styles";
import type { Plan } from "../pricing";
import { GROUP_LABELS } from "../occasions";

export type { Dict };

export function getDict(locale: Locale): Dict {
  return locale === "pt" ? pt : en;
}

/**
 * Aplica o overlay de exibição do dicionário sobre um item dos dados-base.
 * Em PT o overlay é vazio e o item volta intocado; em EN, só os campos de
 * exibição mudam — `prompt`, `lyricGuidance`, `slug`/`id` etc. ficam como são.
 */
export function locOccasion(d: Dict, o: Occasion): Occasion {
  const ov = d.occasionOv[o.slug];
  return ov ? ({ ...o, ...ov } as Occasion) : o;
}

export function locStyle(d: Dict, s: MusicStyle): MusicStyle {
  const ov = d.styleOv[s.id];
  return ov ? ({ ...s, ...ov } as MusicStyle) : s;
}

export function locVocal<T extends { id: string; label: string; description: string }>(d: Dict, v: T): T {
  const ov = d.vocalOv[v.id];
  return ov ? ({ ...v, ...ov } as T) : v;
}

export function locPlan(d: Dict, p: Plan): Plan {
  const ov = d.planOv[p.id];
  return ov ? ({ ...p, ...ov } as Plan) : p;
}

export function locGroup(d: Dict, group: keyof typeof GROUP_LABELS): string {
  return d.groupOv[group] ?? GROUP_LABELS[group];
}

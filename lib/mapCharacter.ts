import { Character } from "@/app/ficha/[id]/CharacterSheet";

/**
 * Converts a raw API response into a typed Character object.
 * All fields have safe defaults so new schema additions only need
 * to be handled here, not in every call site.
 */
export function mapCharacter(full: any, overrides?: Partial<Character>): Character {
  return {
    id:             full.id,
    nome:           full.nome,
    campaignId:     full.campaignId ?? full.campaign?.id ?? "",
    origemId:       full.origemId ?? null,
    nivel:          full.nivel ?? 1,
    xpAtual:        full.xpAtual ?? 0,
    hpAtual:        full.hpAtual,
    hpMax:          full.hpMax,
    energiaAtual:   full.energiaAtual,
    energiaMax:     full.energiaMax,
    maestriaBonus:  full.maestriaBonus ?? 2,
    isApproved:     full.isApproved ?? false,
    grau:           full.grau ?? "4",
    pendingAptidaoSlots:   full.pendingAptidaoSlots ?? 0,
    specialization: full.specialization
      ? {
          id:                   full.specialization.id,
          nome:                 full.specialization.nome,
          bonusAtributos:       full.specialization.bonusAtributos,
          habilidadesTreinadas: full.specialization.habilidadesTreinadas,
        }
      : null,
    origemRelacao:  full.origemRelacao ?? null,
    campaign:       full.campaign ? { name: full.campaign.name } : { name: "" },
    attributes:     full.attributes
      ? { FOR: full.attributes.FOR, AGI: full.attributes.AGI, VIG: full.attributes.VIG, INT: full.attributes.INT, PRE: full.attributes.PRE }
      : null,
    skills:         full.skills ?? [],
    techniques:     full.techniques ?? [],
    weapons:        full.weapons ?? [],
    aptitudes:      full.aptitudes ?? [],
    abilities:      full.abilities ?? [],
    talentos:       full.talentos  ?? [],
    ...overrides,
  };
}

import { z } from 'zod';

export const dateSchema = z.object({
  year: z.number().int().refine(y => y !== 0, 'В исторической датировке нет нулевого года'),
  endYear: z.number().int().refine(y => y !== 0).optional(),
  approximate: z.boolean().optional(), month: z.number().int().min(1).max(12).optional(),
  day: z.number().int().min(1).max(31).optional(), label: z.string().optional(),
});
export type HistoricalDate = z.infer<typeof dateSchema>;
export const kinds = ['period','event','person','dynasty','place','province','battle','article','object','source','dataset'] as const;
export type EntityKind = typeof kinds[number];
export const sectionSchema = z.object({ title: z.string(), text: z.string(), sourceIds: z.array(z.string()).min(1) });
export const baseSchema = z.object({
  id: z.string().regex(/^[a-z][a-z0-9-]+$/), kind: z.enum(kinds), title: z.string().min(2),
  subtitle: z.string().optional(), summary: z.string().min(30),
  status: z.enum(['draft','needs_review','verified']),
  review: z.object({ date: z.string(), scope: z.string(), evidence: z.array(z.string()).min(1) }).optional(),
  date: dateSchema.optional(), aliases: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]), periodIds: z.array(z.string()).default([]),
  relatedIds: z.array(z.string()).default([]), sourceIds: z.array(z.string()).default([]),
  sections: z.array(sectionSchema).default([]), image: z.string().optional(),
});
export const entitySchema = baseSchema.extend({
  coordinates: z.tuple([z.number().min(-180).max(180),z.number().min(-90).max(90)]).optional(),
  coordinateAccuracy: z.string().optional(), modernName: z.string().optional(),
  province: z.string().optional(), pleiadesId: z.string().optional(),
  url: z.string().url().optional(), license: z.string().optional(),
  version: z.string().optional(), attribution: z.string().optional(),
  museum: z.string().optional(), accessionNumber: z.string().optional(),
  material: z.string().optional(), dimensions: z.string().optional(),
  provenance: z.string().optional(), objectDate: z.string().optional(),
  sourceType: z.enum(['primary','research','catalogue','geodata']).optional(),
  roles: z.array(z.string()).optional(), family: z.string().optional(),
  commanders: z.array(z.string()).optional(), opponents: z.array(z.string()).optional(),
  placeId: z.string().optional(),
});
export type Entity = z.infer<typeof entitySchema>;
export type HistoricalPeriod = Entity & {kind:'period'};
export type HistoricalEvent = Entity & {kind:'event'};
export type Person = Entity & {kind:'person'};
export type Dynasty = Entity & {kind:'dynasty'};
export type HistoricalPlace = Entity & {kind:'place';coordinates:[number,number]};
export type Province = Entity & {kind:'province'};
export type Battle = Entity & {kind:'battle'};
export type Article = Entity & {kind:'article'};
export type MuseumObject = Entity & {kind:'object';museum:string;accessionNumber:string};
export type HistoricalSource = Entity & {kind:'source';url:string};
export type MapDataset = Entity & {kind:'dataset';license:string;url:string};

export function chronologicalYear(year: number): number { return year < 0 ? year + 1 : year; }
export function formatYear(year: number): string { return year < 0 ? `${Math.abs(year)} до н. э.` : `${year} н. э.`; }
export function formatDate(date?: HistoricalDate): string {
  if (!date) return '';
  if (date.label) return date.label;
  return `${date.approximate ? 'ок. ' : ''}${formatYear(date.year)}${date.endYear ? ` — ${formatYear(date.endYear)}` : ''}`;
}
export const kindLabels: Record<EntityKind,string> = {period:'Эпоха',event:'Событие',person:'Личность',dynasty:'Династия',place:'Место',province:'Провинция',battle:'Сражение',article:'Исследование',object:'Музейный предмет',source:'Источник',dataset:'Геоданные'};
export const kindRoutes: Record<EntityKind,string> = {period:'history',event:'events',person:'people',dynasty:'dynasties',place:'places',province:'provinces',battle:'battles',article:'articles',object:'collection',source:'sources',dataset:'datasets'};
export function entityUrl(e: Pick<Entity,'id'|'kind'>): string {return `/${kindRoutes[e.kind]}/${e.id}/`;}

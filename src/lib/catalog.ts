import raw from '../data/catalog.json';
import { entitySchema, type EntityKind, chronologicalYear } from './schema';
export const allEntities = raw.map(e => entitySchema.parse(e));
// Publication requires both verification status and a concrete review record.
export const entities = allEntities.filter(e => e.status === 'verified' && e.review);
export const byId = new Map(entities.map(e => [e.id,e]));
export function getEntity(id: string) {const e=byId.get(id);if(!e) throw new Error(`Unknown published entity: ${id}`);return e;}
export function ofKind(kind: EntityKind) {return entities.filter(e => e.kind === kind);}
export function related(id: string) {const e=getEntity(id);return entities.filter(x=>x.id!==id && (e.relatedIds.includes(x.id) || x.relatedIds.includes(id)));}
export function inPeriod(id:string) {return entities.filter(e=>e.periodIds.includes(id));}
export function chronological<T extends {date?: {year:number}}>(items:T[]):T[] {return [...items].sort((a,b)=>chronologicalYear(a.date?.year??9999)-chronologicalYear(b.date?.year??9999));}

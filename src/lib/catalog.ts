import raw from '../data/catalog.json';
import { entitySchema, type Entity, type EntityKind, chronologicalYear } from './schema';
export const allEntities = raw.map(e => entitySchema.parse(e));
// Publication requires both verification status and a concrete review record.
export function isPublished(e:Entity):boolean {return e.status==='verified'&&!!e.review;}
export const entities = allEntities.filter(isPublished);
export const byId = new Map(entities.map(e => [e.id,e]));
export function getEntity(id: string) {const e=byId.get(id);if(!e) throw new Error(`Unknown published entity: ${id}`);return e;}
export function ofKind(kind: EntityKind) {return entities.filter(e => e.kind === kind);}
export function related(id: string) {
 const e=getEntity(id);
 // Keep the editor's explicit reading path ahead of incidental backlinks as the corpus grows.
 const direct=e.relatedIds.map(key=>byId.get(key)).filter((item):item is typeof e=>!!item&&item.id!==id);
 const directIds=new Set(direct.map(item=>item.id));
 return [...direct,...entities.filter(item=>item.id!==id&&!directIds.has(item.id)&&item.relatedIds.includes(id))];
}
export function inPeriod(id:string) {return entities.filter(e=>e.periodIds.includes(id));}
export function chronological<T extends {date?: {year:number}}>(items:T[]):T[] {return [...items].sort((a,b)=>chronologicalYear(a.date?.year??9999)-chronologicalYear(b.date?.year??9999));}

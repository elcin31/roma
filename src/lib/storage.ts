const key='roma-library-v1';
export function readSaved():{ids:string[];available:boolean} {
  let raw:string|null;
  try{raw=localStorage.getItem(key);}catch{return {ids:[],available:false};}
  try{const data:unknown=JSON.parse(raw||'[]');return {ids:Array.isArray(data)?[...new Set(data.filter((x):x is string=>typeof x==='string'))]:[],available:true};}
  catch{return {ids:[],available:true};} // Corrupted bookmarks can be replaced; storage itself remains usable.
}
export function writeSaved(ids:string[]):boolean {try{localStorage.setItem(key,JSON.stringify(ids));return true}catch{return false}}

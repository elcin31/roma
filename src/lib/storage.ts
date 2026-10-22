const key='roma-library-v1';
export function readSaved():{ids:string[];available:boolean} {try{const data:unknown=JSON.parse(localStorage.getItem(key)||'[]');return {ids:Array.isArray(data)?[...new Set(data.filter((x):x is string=>typeof x==='string'))]:[],available:true}}catch{return {ids:[],available:false}}}
export function writeSaved(ids:string[]):boolean {try{localStorage.setItem(key,JSON.stringify(ids));return true}catch{return false}}

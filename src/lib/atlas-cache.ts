import type {FeatureCollection} from 'geojson';
export type DatasetId='land'|'republic'|'trajan'|'severan'|'roads'|'provinces';
/** One atlas instance retains at most the six approved datasets; no unbounded year cache. */
export function createAtlasLoader(){
  const cache=new Map<DatasetId,FeatureCollection>();
  return async(id:DatasetId,signal:AbortSignal):Promise<FeatureCollection>=>{
    signal.throwIfAborted();
    const cached=cache.get(id);
    if(cached)return cached;
    const response=await fetch(`/geo/${id}.geojson`,{signal});
    if(!response.ok)throw new Error(`Dataset ${id}: HTTP ${response.status}`);
    const data=await response.json() as FeatureCollection;
    signal.throwIfAborted();
    if(data.type!=='FeatureCollection'||!Array.isArray(data.features))throw new Error(`Invalid GeoJSON: ${id}`);
    cache.set(id,data);
    return data;
  };
}

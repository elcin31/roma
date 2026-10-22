"""Refresh only existing, reviewed Pleiades places. Coordinate changes require editorial review.
Uses cached responses unless --refresh is given; never overwrites the historical catalogue.
"""
import json, sys, urllib.request
from datetime import date
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / 'research'
CACHE.mkdir(exist_ok=True)
catalogue = json.loads((ROOT / 'src/data/catalog.json').read_text())
features, provenance = [], []
for place in catalogue:
    if place['kind'] != 'place' or place['status'] != 'verified' or not place.get('review'):
        continue
    cache = CACHE / f"place-{place['id']}.txt"
    url = f"https://pleiades.stoa.org/places/{place['pleiadesId']}"
    if '--refresh' in sys.argv or not cache.exists():
        cache.write_bytes(urllib.request.urlopen(url + '/json', timeout=60).read())
    source = json.loads(cache.read_text())
    assert str(source['id']) == place['pleiadesId'], f"Pleiades ID mismatch: {place['id']}"
    assert source['reprPoint'] == place['coordinates'], f"Coordinates changed: review {place['id']} before import"
    features.append({'type': 'Feature', 'id': place['id'], 'geometry': {'type': 'Point', 'coordinates': source['reprPoint']}, 'properties': {'id': place['id'], 'title': place['title'], 'ancient': source['title'], 'url': url}})
    provenance.append({'id': place['id'], 'pleiadesId': place['pleiadesId'], 'url': url, 'retrieved': date.fromtimestamp(cache.stat().st_mtime).isoformat(), 'license': 'CC BY 3.0 US', 'contributors': source.get('creators', []) + source.get('contributors', [])})
geo = {'type': 'FeatureCollection', 'attribution': 'Pleiades contributors, CC BY 3.0 US', 'license': 'https://creativecommons.org/licenses/by/3.0/us/', 'features': features}
(ROOT / 'public/geo/places.geojson').write_text(json.dumps(geo, ensure_ascii=False, separators=(',', ':')))
for target in ['src/data/place-provenance.json', 'public/data/place-provenance.json']:
    (ROOT / target).parent.mkdir(parents=True, exist_ok=True)
    (ROOT / target).write_text(json.dumps(provenance, ensure_ascii=False, indent=2))
print(f'Imported {len(features)} reviewed places')

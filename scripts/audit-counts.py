"""Compare exact selected record indices with Shapely/GEOS, independent of Turf.
Run node scripts/audit-counts.mjs first. Requires Python with shapely installed.
"""
import json
import subprocess
from datetime import datetime, timezone
from pathlib import Path
import shapely
from shapely.geometry import shape
root=Path(__file__).resolve().parents[1]
data=json.loads((root/'.tmp/count-audit.json').read_text(encoding='utf-8'))
datasets={d['id']:[shape(f['geometry']) for f in d['features']] for d in data['datasets']}
report={'checked_at':datetime.now(timezone.utc).isoformat(), 'source_commit':subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip(), 'engine':f'Shapely {shapely.__version__} / GEOS {shapely.geos_version_string}', 'feature_counts':{k:len(v) for k,v in datasets.items()}, 'invalid_geometries':{k:sum(not g.is_valid for g in v) for k,v in datasets.items()},'checks':[]}
for case in data['cases']:
    region=shape(case['selection']['geometry'])
    expected={i for i,g in enumerate(datasets[case['layerId']]) if g.intersects(region)}
    actual=set(case['indices'])
    report['checks'].append({'name':case['name'],'app':case['total'],'geos':len(expected),'missing':sorted(expected-actual),'extra':sorted(actual-expected),'warnings':case['warnings']})
report['passed']=all(not c['missing'] and not c['extra'] and not c['warnings'] for c in report['checks'])
(root/'docs/count-audit.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(report,ensure_ascii=False,indent=2))
raise SystemExit(0 if report['passed'] else 1)

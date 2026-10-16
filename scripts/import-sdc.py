"""Read the supplied workbook without modifying it; create a local import snapshot."""
import argparse
import hashlib
import json
from pathlib import Path
import openpyxl

parser = argparse.ArgumentParser()
parser.add_argument('workbook', type=Path)
parser.add_argument('--output', type=Path, default=Path('data/sdc-import.json'))
parser.add_argument('--locations', type=Path)
args = parser.parse_args()
workbook = openpyxl.load_workbook(args.workbook, read_only=True, data_only=True)
sheet = workbook['Membres - SDC Centre-Ville']
rows = list(sheet.iter_rows(values_only=True))
if tuple(rows[0][:4]) != ('Type rue', 'Nom rue', 'OBNL', 'Marque de Commerce'):
    raise ValueError('Unexpected source columns')
result = []
for number, row in enumerate(rows[1:], 2):
    if not any(value is not None for value in row):
        continue
    kind, street, nonprofit, name, activity = [str(value or '').strip() for value in row[:5]]
    if not name or not street:
        raise ValueError(f'Missing name or street on row {number}')
    result.append(dict(row=number, name=name, street=f'{kind.lower()} {street}'.strip(), activity=activity, nonprofit=bool(nonprofit), vacant=name.casefold() == 'vacant'))
payload = dict(sha=hashlib.sha256(args.workbook.read_bytes()).hexdigest(), sourceName=args.workbook.name, sheet=sheet.title, rows=result,
               locations=json.loads(args.locations.read_text(encoding='utf-8')) if args.locations else [])
args.output.parent.mkdir(parents=True, exist_ok=True)
args.output.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps(dict(rows=len(result), vacancies=sum(row['vacant'] for row in result), named=sum(not row['vacant'] for row in result)), ensure_ascii=False))

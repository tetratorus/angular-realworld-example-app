"""Builds tests/uat-scenarios-executed.xlsx from tests/uat-evidence/{react,angular}/results.json.

Sheet 1 'UAT Scenarios' = executed against React (the system under test).
Sheet 2 'Angular parity' = same scenarios executed against the Angular source app, business-level comparison.
Optional tests/uat-evidence/manual.json overrides React evidence for scenarios executed via computer use.
"""
import json, os, sys
from openpyxl import load_workbook
from openpyxl.styles import Alignment, Font, PatternFill
from build_uat import build
from uat_scenarios import S

HERE = os.path.dirname(os.path.abspath(__file__))
load = lambda p: json.load(open(p)) if os.path.exists(p) else {}
react = load(os.path.join(HERE, "uat-evidence/react/results.json"))
angular = load(os.path.join(HERE, "uat-evidence/angular/results.json"))
manual = load(os.path.join(HERE, "uat-evidence/manual.json"))

def evidence(r, extra=""):
    shots = r.get("screenshots", [])
    parts = [extra] if extra else []
    if r.get("video"): parts.append(f"Video: {r['video']}")
    if shots: parts.append(f"Screenshots ({len(shots)}, one per step): {os.path.dirname(shots[0])}/")
    return "\n".join(parts)

results = {}
for tid, *_ in S:
    r = react.get(tid)
    if not r: continue
    m = manual.get(tid, {})
    method = m.get("method", "Playwright (headed, video, screenshot per step)")
    status = r["status"] if m.get("status", r["status"]) == r["status"] else "Fail"
    actual = (m["actual"] + "\nPlaywright re-run: " + r["actual"]) if m.get("actual") else r["actual"]
    results[tid] = {"actual": actual, "status": status,
                    "evidence": f"Method: {method}\n" + evidence(r, m.get("evidence", "")) + f"\nRun: {r['ranAt']}"}

out = os.path.join(HERE, "uat-scenarios-executed.xlsx")
passed = sum(1 for r in results.values() if r["status"] == "Pass")
build(out, results, title="Conduit UAT — executed against React (http://localhost:5173)",
      subtitle=f"{passed}/{len(S)} Pass. Local seeded mock API reset before every scenario. Evidence paths are relative to the repository root.")

wb = load_workbook(out)
ws = wb.create_sheet("Angular parity")
ws.append(["Test ID", "Scenario", "React status", "React actual", "Angular status", "Angular actual", "Business-level parity"])
for c in ws[1]:
    c.font = Font(bold=True, color="FFFFFF"); c.fill = PatternFill("solid", fgColor="1F4E78")
for i, w in enumerate([11, 36, 12, 50, 12, 50, 16]): ws.column_dimensions[chr(65 + i)].width = w
same = 0
for tid, mod, sc, *_ in S:
    r, a = react.get(tid, {}), angular.get(tid, {})
    match = bool(r) and bool(a) and r.get("status") == a.get("status") and r.get("actual") == a.get("actual")
    same += match
    ws.append([tid, sc, r.get("status", "Not Run"), r.get("actual", ""), a.get("status", "Not Run"), a.get("actual", ""),
               "Match" if match else ("Same status" if r.get("status") == a.get("status") else "MISMATCH")])
    for c in ws[ws.max_row]: c.alignment = Alignment(wrap_text=True, vertical="top")
ws.append([]); ws.append([f"{same}/{len(S)} scenarios give identical status and identical observed actual result on both apps."])
wb.save(out)
print(f"React {passed}/{len(S)} pass; Angular {sum(1 for x in angular.values() if x['status']=='Pass')}/{len(S)} pass; identical {same}/{len(S)}")

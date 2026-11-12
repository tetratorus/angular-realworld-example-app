"""Builds tests/uat-scenarios.xlsx (blank results) from uat_scenarios.py."""
import sys
from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.worksheet.datavalidation import DataValidation
from uat_scenarios import S

HEAD = ["Test ID","Module","Scenario","Preconditions","Test Data","Steps","Expected Result","Actual Result","Status","Evidence"]
WIDTH = [11,15,36,28,34,46,44,44,10,40]

def build(path, results=None, title="Conduit UAT", subtitle=""):
    wb = Workbook(); ws = wb.active; ws.title = "UAT Scenarios"
    thin = Side(style="thin", color="999999")
    ws.append([title]); ws["A1"].font = Font(bold=True, size=14)
    ws.append([subtitle]); ws.append([])
    ws.append(HEAD)
    for i, w in enumerate(WIDTH): ws.column_dimensions[chr(65+i)].width = w
    for c in ws[4]:
        c.font = Font(bold=True, color="FFFFFF"); c.fill = PatternFill("solid", fgColor="1F4E78")
        c.alignment = Alignment(wrap_text=True, vertical="center"); c.border = Border(top=thin,bottom=thin,left=thin,right=thin)
    for tid, mod, sc, pre, data, steps, exp in S:
        r = (results or {}).get(tid, {})
        ws.append([tid, mod, sc, pre, data, "\n".join(f"{i+1}. {s}" for i, s in enumerate(steps)), exp,
                   r.get("actual",""), r.get("status","Not Run"), r.get("evidence","")])
        row = ws.max_row
        for c in ws[row]:
            c.alignment = Alignment(wrap_text=True, vertical="top"); c.border = Border(top=thin,bottom=thin,left=thin,right=thin)
        st = ws.cell(row, 9)
        st.fill = PatternFill("solid", fgColor={"Pass":"C6EFCE","Fail":"FFC7CE","Blocked":"FFEB9C"}.get(st.value, "FFFFFF"))
    dv = DataValidation(type="list", formula1='"Pass,Fail,Blocked,Not Run"'); ws.add_data_validation(dv); dv.add(f"I5:I{ws.max_row}")
    ws.freeze_panes = "A5"; ws.auto_filter.ref = f"A4:J{ws.max_row}"
    wb.save(path)

if __name__ == "__main__":
    build(sys.argv[1] if len(sys.argv) > 1 else "uat-scenarios.xlsx",
          subtitle="25 scenarios across all screens. Environment: local mock API (seeded), React app http://localhost:5173, Angular app http://localhost:4200.")

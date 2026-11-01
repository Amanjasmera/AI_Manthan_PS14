import csv
import io
import zipfile
from datetime import datetime
from pathlib import Path
from typing import List, Any, Dict, Optional
from sqlalchemy.orm import Session

from app.models import Screening, Patient, DoctorReview


def escape_xml(s: Any) -> str:
    """Escapes special characters for XML inclusion."""
    if s is None:
        return ""
    text = str(s)
    return (
        text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
        .replace("'", "&apos;")
    )


def generate_excel_xlsx(headers: List[str], rows: List[List[Any]], sheet_name: str = "Screening Records") -> bytes:
    """
    Generates a valid, production-standard OpenXML spreadsheet (.xlsx)
    using Python standard library zipfile.
    Compatible with Microsoft Excel, LibreOffice, Apple Numbers, and Google Sheets.
    """
    clean_sheet_name = escape_xml(sheet_name[:31])
    buf = io.BytesIO()

    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
        # 1. [Content_Types].xml
        z.writestr(
            "[Content_Types].xml",
            """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>""",
        )

        # 2. _rels/.rels
        z.writestr(
            "_rels/.rels",
            """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>""",
        )

        # 3. xl/_rels/workbook.xml.rels
        z.writestr(
            "xl/_rels/workbook.xml.rels",
            """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>""",
        )

        # 4. xl/workbook.xml
        z.writestr(
            "xl/workbook.xml",
            f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="{clean_sheet_name}" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>""",
        )

        # 5. xl/styles.xml (Header font + styling)
        z.writestr(
            "xl/styles.xml",
            """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="2">
    <font><name val="Calibri"/><sz val="11"/><color rgb="FF000000"/></font>
    <font><name val="Calibri"/><sz val="11"/><b/><color rgb="FFFFFFFF"/></font>
  </fonts>
  <fills count="3">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF0B1D36"/></patternFill></fill>
  </fills>
  <borders count="1">
    <border><left/><right/><top/><bottom/><diagonal/></border>
  </borders>
  <cellStyleXfs count="1">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>
  </cellStyleXfs>
  <cellXfs count="2">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/>
  </cellXfs>
</styleSheet>""",
        )

        # 6. xl/worksheets/sheet1.xml
        xml_rows = []
        # Header Row (Row 1)
        header_cells = "".join(
            [f'<c t="inlineStr" s="1"><is><t>{escape_xml(h)}</t></is></c>' for h in headers]
        )
        xml_rows.append(f'<row r="1">{header_cells}</row>')

        # Data Rows (Row 2 .. N)
        for r_idx, row in enumerate(rows, start=2):
            cells = []
            for val in row:
                escaped = escape_xml(val)
                cells.append(f'<c t="inlineStr" s="0"><is><t>{escaped}</t></is></c>')
            xml_rows.append(f'<row r="{r_idx}">{"".join(cells)}</row>')

        sheet_xml = f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>
    {"".join(xml_rows)}
  </sheetData>
</worksheet>"""
        z.writestr("xl/worksheets/sheet1.xml", sheet_xml)

    return buf.getvalue()


def generate_csv(headers: List[str], rows: List[List[Any]]) -> str:
    """Generates standard CSV content as string."""
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(headers)
    for row in rows:
        writer.writerow([str(v if v is not None else "") for v in row])
    return output.getvalue()


SCREENING_REGISTRY_HEADERS = [
    "Screening ID",
    "Patient Name",
    "Age",
    "Gender",
    "Diabetes History",
    "Eye Evaluated",
    "Image File Path",
    "Predicted DR Grade",
    "ICDR Grade Name",
    "Confidence (%)",
    "Referral Urgency",
    "Screening Status",
    "Doctor Verified",
    "Doctor Name",
    "Doctor License",
    "Doctor Confirmed Grade",
    "Doctor Clinical Notes",
    "Doctor Referral Recommendation",
    "Created Date"
]


def extract_registry_rows(db: Session) -> List[List[Any]]:
    """Fetches all screening records joined with patient and doctor review data."""
    screenings = (
        db.query(Screening)
        .order_by(Screening.created_at.desc())
        .all()
    )

    rows: List[List[Any]] = []
    for s in screenings:
        p = s.patient
        patient_name = p.full_name if p else "Anonymous"
        age = p.age if p else 50
        gender = p.gender if p else "Unknown"
        history = p.diabetes_history if p else "Type 2 Diabetes"

        # Check doctor review
        review = s.doctor_review
        is_verified = bool(review is not None or s.status in ["REVIEWED", "Doctor Verified"])
        doc_name = review.doctor_name if review else ""
        doc_license = review.doctor_license if review else ""
        doc_grade = review.confirmed_grade if review else ""
        doc_notes = review.clinical_notes if review else (s.doctor_notes or "")
        doc_referral = review.referral_recommendation if review else ""

        status_label = "Doctor Verified" if is_verified else (s.status or "Pending")

        rows.append([
            s.id,
            patient_name,
            age,
            gender,
            history,
            s.eye_side or "RIGHT",
            s.raw_image_path or "",
            s.predicted_grade if s.predicted_grade is not None else 0,
            s.grade_name or "Unclassified",
            round((s.confidence or 0.0) * 100, 1),
            s.referral_urgency or "ROUTINE",
            status_label,
            "Yes" if is_verified else "No",
            doc_name,
            doc_license,
            doc_grade,
            doc_notes,
            doc_referral,
            s.created_at.strftime("%Y-%m-%d %H:%M:%S") if s.created_at else ""
        ])

    return rows


def export_registry_to_files(db: Session, export_dir: Path) -> Dict[str, str]:
    """
    Exports the current database screening registry to both .xlsx and .csv files
    saved inside the export_dir.
    """
    export_dir.mkdir(parents=True, exist_ok=True)
    rows = extract_registry_rows(db)

    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    xlsx_filename = f"netra_x_screening_registry_{timestamp}.xlsx"
    csv_filename = f"netra_x_screening_registry_{timestamp}.csv"
    latest_xlsx = "screening_registry_latest.xlsx"
    latest_csv = "screening_registry_latest.csv"

    xlsx_bytes = generate_excel_xlsx(SCREENING_REGISTRY_HEADERS, rows)
    csv_str = generate_csv(SCREENING_REGISTRY_HEADERS, rows)

    # Write timestamped files
    xlsx_path = export_dir / xlsx_filename
    xlsx_path.write_bytes(xlsx_bytes)

    csv_path = export_dir / csv_filename
    csv_path.write_text(csv_str, encoding="utf-8")

    # Write latest pointers
    (export_dir / latest_xlsx).write_bytes(xlsx_bytes)
    (export_dir / latest_csv).write_text(csv_str, encoding="utf-8")

    return {
        "xlsx_path": str(xlsx_path),
        "csv_path": str(csv_path),
        "latest_xlsx_path": str(export_dir / latest_xlsx),
        "latest_csv_path": str(export_dir / latest_csv),
        "record_count": str(len(rows))
    }


def export_screenings_to_system_excel(output_file: Optional[str] = None) -> str:
    """
    Convenience helper function: exports all screening registry data
    directly into an Excel (.xlsx) file on the system.
    Returns the absolute path to the generated Excel file.
    """
    from app.database import SessionLocal
    from app.config import EXPORT_DIR

    db = SessionLocal()
    try:
        if output_file:
            target_path = Path(output_file)
            target_path.parent.mkdir(parents=True, exist_ok=True)
            rows = extract_registry_rows(db)
            xlsx_bytes = generate_excel_xlsx(SCREENING_REGISTRY_HEADERS, rows)
            target_path.write_bytes(xlsx_bytes)
            return str(target_path.resolve())
        else:
            res = export_registry_to_files(db=db, export_dir=EXPORT_DIR)
            return res["latest_xlsx_path"]
    finally:
        db.close()


if __name__ == "__main__":
    saved_path = export_screenings_to_system_excel()
    print(f"Successfully exported screening registry to Excel: {saved_path}")

from flask import Blueprint, request, make_response
from ..models.asset import Asset
from ..models.risk import RiskAssessment
from ..models.action import ActionItem
import json
import io
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from ..utils.auth import require_auth

reports_bp = Blueprint('reports', __name__)

@reports_bp.route('/asset/<asset_id>', methods=['GET'])
@require_auth
def asset_report(asset_id):
    asset = Asset.query.get_or_404(asset_id)
    latest_risk = RiskAssessment.query.filter_by(asset_id=asset_id).order_by(RiskAssessment.timestamp.desc()).first()
    actions = ActionItem.query.filter_by(asset_id=asset_id).order_by(ActionItem.created_at.desc()).all()

    explain = None
    if latest_risk and latest_risk.notes:
        try:
            explain = json.loads(latest_risk.notes)
        except Exception:
            explain = None

    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=letter)
    width, height = letter
    y = height - 50

    def draw_line(text, offset=16, bold=False):
        nonlocal y
        if y < 80:
            c.showPage()
            y = height - 50
        c.setFont("Helvetica-Bold" if bold else "Helvetica", 11)
        c.drawString(50, y, text)
        y -= offset

    draw_line("SPARK Asset Integrity Report", bold=True, offset=22)
    draw_line(f"Asset ID: {asset.id}")
    draw_line(f"Type: {asset.type}")
    draw_line(f"Location: {asset.location or 'N/A'}", offset=22)

    draw_line("Latest Risk Assessment", bold=True, offset=18)
    draw_line(f"Risk Score: {latest_risk.risk_score if latest_risk else 'N/A'}")
    draw_line(f"Degradation: {latest_risk.degradation_type if latest_risk else 'N/A'}")
    draw_line(f"Confidence: {latest_risk.confidence_score if latest_risk else 'N/A'}", offset=22)

    draw_line("Explainability", bold=True, offset=18)
    for label, items in [
        ("RoF Drivers", (explain or {}).get("rof_drivers", [])),
        ("CoF Drivers", (explain or {}).get("cof_drivers", [])),
        ("Failure Modes", (explain or {}).get("failure_mode_candidates", [])),
        ("Assumptions", (explain or {}).get("assumptions", []))
    ]:
        draw_line(f"{label}:", bold=True, offset=16)
        if items:
            for item in items:
                draw_line(f"- {item}", offset=14)
        else:
            draw_line("- None", offset=14)
        y -= 6

    draw_line("Actions", bold=True, offset=18)
    if actions:
        for a in actions:
            draw_line(f"{a.created_at.strftime('%Y-%m-%d %H:%M')} — {a.recommendation} — {a.status} (approved: {a.approved_action or 'N/A'})", offset=14)
    else:
        draw_line("No actions recorded", offset=14)

    c.showPage()
    c.save()
    buffer.seek(0)
    pdf = buffer.getvalue()

    resp = make_response(pdf)
    resp.headers['Content-Type'] = 'application/pdf'
    resp.headers['Content-Disposition'] = f'attachment; filename=\"SPARK_Report_{asset.id}.pdf\"'
    return resp

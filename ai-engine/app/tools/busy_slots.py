import re
from datetime import datetime, timedelta

from app.core_api import CoreApi
from app.tools._common import PROPERTIES, valid_code

NAME = "busy_slots"
SCHEMA = {
    "type": "function",
    "function": {
        "name": NAME,
        "description": "Các khung giờ đã kín của 1 căn trong 1 ngày để gợi ý khung còn trống.",
        "parameters": {
            "type": "object",
            "properties": {"code": {"type": "string"}, "date": {"type": "string", "description": "YYYY-MM-DD"}},
            "required": ["code", "date"],
        },
    },
}


async def run(api: CoreApi, args: dict) -> dict:
    code, date = args["code"], args["date"]
    if not valid_code(code):
        return {"error": "bad_code"}
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", date):
        return {"error": "bad_date"}
    try:
        day = datetime.strptime(date, "%Y-%m-%d")
    except ValueError:
        return {"error": "bad_date"}
    nxt = (day + timedelta(days=1)).strftime("%Y-%m-%d")
    res = await api.get(
        f"{PROPERTIES}/units/{code}/busy-slots", {"from": f"{date}T00:00:00+07:00", "to": f"{nxt}T00:00:00+07:00"}
    )
    return {"code": code, "date": date, "busy": res.get("slots", []), "bookUrl": f"/units/{code}?book=1"}

import openpyxl
import json
import re

excel_path = 'd:/AI VIN/P-010/tech data/data/dataluot6duthongtincan.xlsx'

def analyze():
    wb = openpyxl.load_workbook(excel_path)
    sheet = wb.active
    rows = list(sheet.iter_rows(values_only=True))
    headers = rows[0]
    print(f"Total rows in Excel: {len(rows)-1}")
    
    items = []
    for idx, r in enumerate(rows[1:], start=1):
        item = dict(zip(headers, r))
        item['index'] = idx
        items.append(item)
    
    print(f"Parsed {len(items)} items.")
    
    # Analyze prices, layouts, zones, descriptions
    for i, it in enumerate(items[:15]):
        print(f"\n--- Item {i+1} ---")
        print("Zone:", it.get("Phân khu / Dự án"))
        print("Price:", it.get("Giá (VNĐ)"))
        print("Area:", it.get("Diện tích (m²)"))
        print("Bedrooms:", it.get("Số phòng ngủ"))
        print("Bathrooms:", it.get("Số phòng tắm"))
        print("Furnishing:", it.get("Nội thất"))
        print("Desc:", it.get("Mô tả ngắn"))
        print("Folder:", it.get("Thư mục ảnh"))

if __name__ == "__main__":
    analyze()

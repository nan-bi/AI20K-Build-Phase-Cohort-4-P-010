import openpyxl
import json
import os
import re

excel_path = 'd:/AI VIN/P-010/tech data/data/dataluot6duthongtincan.xlsx'
images_dir = 'd:/AI VIN/P-010/tech data/data/imageluot6'

def parse_all():
    wb = openpyxl.load_workbook(excel_path)
    sheet = wb.active
    rows = list(sheet.iter_rows(values_only=True))
    headers = rows[0]
    
    raw_items = []
    for idx, r in enumerate(rows[1:], start=1):
        item = dict(zip(headers, r))
        item['row_num'] = idx
        raw_items.append(item)
    
    print(f"Total raw items: {len(raw_items)}")
    
    # Check each item
    for it in raw_items:
        desc = it.get('Mô tả ngắn') or ''
        price = it.get('Giá (VNĐ)')
        zone = it.get('Phân khu / Dự án') or ''
        folder_num = f"can_{it['row_num']:03d}"
        folder_path = os.path.join(images_dir, folder_num)
        has_images = os.path.exists(folder_path) and len(os.listdir(folder_path)) > 0
        img_count = len(os.listdir(folder_path)) if has_images else 0
        
        print(f"[{it['row_num']:02d}] Imgs: {img_count} | Zone: {zone} | Price: {price} | Desc: {desc[:60]}")

if __name__ == "__main__":
    parse_all()

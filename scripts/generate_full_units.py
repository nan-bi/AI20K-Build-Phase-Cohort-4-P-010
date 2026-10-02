import os
import re
import json
import shutil
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.path.append('scripts')
from normalize_dataset import clean_and_normalize, BUILDING_SPECS

# Target paths
WEB_PUBLIC_UNITS = r"d:\AI VIN\P-010\apps\web\public\units"
TECH_DATA_IMGS = r"d:\AI VIN\P-010\tech data\data\imageluot6"

DIRECTIONS = ["Đông Nam", "Tây Nam", "Đông Bắc", "Tây Bắc", "Đông", "Nam", "Tây", "Bắc"]
VIEWS = [
    "View nội khu thoáng mát",
    "View biển hồ nước ngọt",
    "View công viên Nhật Bản",
    "View phố đi bộ và shophouse",
    "View hồ điều hòa",
    "View vườn hoa và sân thể thao",
    "View bể bơi nội khu",
    "View panorama khoáng đạt",
]

LANDLORDS = ["L1", "L2", "L3", "L4", "L5"]

def generate():
    excel_units = clean_and_normalize()
    print(f"Total excel units: {len(excel_units)}")

    unit_seeds = []
    
    # Track used IDs to avoid collision
    used_ids = set()

    # Layout sort rank
    layout_rank = {
        "Studio": 1,
        "1PN": 2,
        "2PN": 3,
        "3PN": 4,
    }

    for idx, u in enumerate(excel_units, start=1):
        bldg = u['buildingCode']
        floor = u['floorNumber']
        door = u['source_row'] % 15 + 1
        
        # Clean id: e.g. s1-02-0502 -> lower case
        # bldg e.g. S1.02 -> s1-02, ZR1 -> zr1, BE3 -> be3, R1.02 -> r1-02, P4 -> p4, H1 -> h1, M2 -> m2
        bldg_slug = bldg.lower().replace(".", "-")
        unit_id = f"{bldg_slug}-{floor:02d}-{floor:02d}{door:02d}"
        
        # Ensure unique ID
        sub_idx = 1
        original_id = unit_id
        while unit_id in used_ids:
            unit_id = f"{original_id}-{sub_idx}"
            sub_idx += 1
        used_ids.add(unit_id)

        # Map Layout
        layout_raw = u['layoutType']
        is_plus = False
        if layout_raw == 'STUDIO':
            layout = "Studio"
            beds = 1
            baths = 1
            area = 30 + (idx % 5)
        elif layout_raw == 'ONE_BED_PLUS':
            layout = "1PN"
            is_plus = True
            beds = 1
            baths = 1
            area = 45 + (idx % 4)
        elif layout_raw == 'TWO_BED_ONE_BATH':
            layout = "2PN"
            beds = 2
            baths = 1
            area = 55 + (idx % 4)
        elif layout_raw == 'TWO_BED_TWO_BATH':
            layout = "2PN"
            beds = 2
            baths = 2
            area = 63 + (idx % 6)
        elif layout_raw == 'THREE_BED':
            layout = "3PN"
            beds = 3
            baths = 2
            area = 75 + (idx % 8)
        else:
            layout = "1PN"
            beds = 1
            baths = 1
            area = 45

        # Direction and view
        direction = DIRECTIONS[idx % len(DIRECTIONS)]
        view = VIEWS[idx % len(VIEWS)]
        
        # Furnishing
        desc_lower = u['description'].lower()
        if 'cơ bản' in desc_lower or 'nội thất liền tường' in desc_lower or 'căn cơ bản' in desc_lower:
            furnishing = "basic"
        elif 'nhà trống' in desc_lower or 'không đồ' in desc_lower:
            furnishing = "empty"
        else:
            furnishing = "full"

        # Lock
        lock = "smart" if bldg != "ZR1" and bldg != "ZR2" and (idx % 5 != 0) else "physical"
        
        # Landlord
        landlord = LANDLORDS[idx % len(LANDLORDS)]

        # Images count
        can_folder = u['canFolder']
        src_folder = os.path.join(TECH_DATA_IMGS, can_folder)
        img_count = 0
        if os.path.exists(src_folder):
            imgs = [f for f in sorted(os.listdir(src_folder)) if f.lower().endswith(('.jpg', '.jpeg', '.png'))]
            img_count = len(imgs)
            
            # Copy to public/units/{unit_id}/1.jpg, 2.jpg...
            dest_folder = os.path.join(WEB_PUBLIC_UNITS, unit_id)
            os.makedirs(dest_folder, exist_ok=True)
            for i, img_name in enumerate(imgs, start=1):
                src_file = os.path.join(src_folder, img_name)
                dest_file = os.path.join(dest_folder, f"{i}.jpg")
                shutil.copy2(src_file, dest_file)
        
        if img_count == 0:
            img_count = 4 # fallback

        # Items list
        items = ["ac", "fridge", "kitchen", "heater", "bed", "curtain"]
        if furnishing == "full":
            items.extend(["wardrobe", "sofa", "tv"])
            if idx % 2 == 0:
                items.append("washer")
            if idx % 3 == 0:
                items.append("balcony")
        elif furnishing == "basic":
            items = ["ac", "heater", "kitchen", "curtain"]
            if idx % 2 == 0:
                items.append("fridge")

        # Verified Day
        day = 10 + (idx % 18)
        verified_day = f"2026-09-{day:02d}"

        # Title formatting
        if layout == "Studio":
            title = f"Studio {bldg} {furnishing == 'full' and 'full đồ cao cấp' or 'nội thất cơ bản'}, {direction.lower()}"
        elif layout == "1PN":
            title = f"{is_plus and '1PN+' or '1PN'} {bldg} tầng {floor}, view {view.lower().replace('view ', '')}"
        elif layout == "2PN":
            title = f"2PN{baths}WC {bldg} diện tích {area}m², không gian thoáng sáng"
        else:
            title = f"3PN2WC {bldg} tầng {floor} view {view.lower().replace('view ', '')}, tiện nghi gia đình"

        # Description
        clean_desc = u['description'].replace('"', "'").strip()
        if len(clean_desc) < 20:
            clean_desc = f"Căn hộ {layout} diện tích {area}m² toà {bldg}, tầng {floor}. Đầy đủ tiện ích nội khu Vinhomes Ocean Park, nhận nhà ở ngay."

        seed_obj = {
            "id": unit_id,
            "building": bldg,
            "floor": floor,
            "door": door,
            "layout": layout,
            "plus": is_plus,
            "bedrooms": beds,
            "bathrooms": baths,
            "areaM2": area,
            "direction": direction,
            "view": view,
            "furnishing": furnishing,
            "rent": u['baseRentPrice'],
            "marketAvg": u['marketAvgPrice'],
            "baseStatus": "available",
            "lock": lock,
            "landlordId": landlord,
            "images": img_count,
            "interest24h": (idx * 2 + 1) % 5,
            "petFriendly": (idx % 4 == 0),
            "minMonths": 6 if layout == "Studio" or idx % 3 == 0 else 12,
            "verifiedDay": verified_day,
            "title": title,
            "description": clean_desc,
            "items": list(set(items)),
        }
        unit_seeds.append(seed_obj)

    # Sort from smallest to largest layout, area, rent
    unit_seeds.sort(key=lambda s: (layout_rank[s['layout']], s['areaM2'], s['rent']))

    print(f"Generated {len(unit_seeds)} seeds.")
    print("Breakdown by layout:")
    for lk in ["Studio", "1PN", "2PN", "3PN"]:
        cnt = sum(1 for s in unit_seeds if s['layout'] == lk)
        print(f"  {lk}: {cnt} căn")

    return unit_seeds

if __name__ == "__main__":
    generate()

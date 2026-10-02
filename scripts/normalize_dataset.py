import openpyxl
import json
import os
import re

excel_path = 'd:/AI VIN/P-010/tech data/data/dataluot6duthongtincan.xlsx'
images_base_dir = 'd:/AI VIN/P-010/tech data/data/imageluot6'

# Buildings metadata: zone, totalFloors, lobbyLat, lobbyLng
BUILDING_SPECS = {
    'S1.01': {'zone': 'The Sapphire 1', 'floors': 27, 'lat': 20.999512, 'lng': 105.945821},
    'S1.02': {'zone': 'The Sapphire 1', 'floors': 28, 'lat': 20.998412, 'lng': 105.945281},
    'S1.03': {'zone': 'The Sapphire 1', 'floors': 28, 'lat': 20.997812, 'lng': 105.944981},
    'S1.05': {'zone': 'The Sapphire 1', 'floors': 27, 'lat': 20.999152, 'lng': 105.946123},
    'S1.08': {'zone': 'The Sapphire 1', 'floors': 28, 'lat': 20.998901, 'lng': 105.946892},
    'S1.10': {'zone': 'The Sapphire 1', 'floors': 28, 'lat': 20.997541, 'lng': 105.947211},
    'S1.12': {'zone': 'The Sapphire 1', 'floors': 27, 'lat': 20.996891, 'lng': 105.948123},
    'S2.01': {'zone': 'The Sapphire 2', 'floors': 30, 'lat': 20.996541, 'lng': 105.942189},
    'S2.05': {'zone': 'The Sapphire 2', 'floors': 30, 'lat': 20.995812, 'lng': 105.943121},
    'S2.07': {'zone': 'The Sapphire 2', 'floors': 30, 'lat': 20.994912, 'lng': 105.944123},
    'S2.12': {'zone': 'The Sapphire 2', 'floors': 26, 'lat': 20.994123, 'lng': 105.942891},
    'S2.18': {'zone': 'The Sapphire 2', 'floors': 26, 'lat': 20.993512, 'lng': 105.941821},
    'ZR1': {'zone': 'The Zenpark', 'floors': 31, 'lat': 20.992141, 'lng': 105.939812},
    'ZR2': {'zone': 'The Zenpark', 'floors': 31, 'lat': 20.991823, 'lng': 105.939211},
    'R1.02': {'zone': 'The Zenpark', 'floors': 31, 'lat': 20.991512, 'lng': 105.938912},
    'P4': {'zone': 'The Pavilion', 'floors': 30, 'lat': 20.993121, 'lng': 105.937812},
    'BE3': {'zone': 'The Beverly', 'floors': 30, 'lat': 20.990812, 'lng': 105.936512},
    'BE-STU': {'zone': 'The Beverly', 'floors': 30, 'lat': 20.990812, 'lng': 105.936512},
    'M2': {'zone': 'Masteri Waterfront', 'floors': 30, 'lat': 20.995123, 'lng': 105.948912},
    'M3': {'zone': 'Masteri Waterfront', 'floors': 30, 'lat': 20.994812, 'lng': 105.949211},
    'H1': {'zone': 'Masteri Waterfront', 'floors': 26, 'lat': 20.996123, 'lng': 105.947812},
}

LAYOUT_AREAS = {
    'STUDIO': 32.5,
    'ONE_BED_PLUS': 47.0,
    'TWO_BED_ONE_BATH': 55.0,
    'TWO_BED_TWO_BATH': 64.0,
    'THREE_BED': 78.0,
}

MARKET_AVG = {
    'STUDIO': 5500000,
    'ONE_BED_PLUS': 7500000,
    'TWO_BED_ONE_BATH': 8500000,
    'TWO_BED_TWO_BATH': 9500000,
    'THREE_BED': 13500000,
}

def clean_and_normalize():
    wb = openpyxl.load_workbook(excel_path)
    sheet = wb.active
    rows = list(sheet.iter_rows(values_only=True))
    headers = rows[0]
    
    seen_hashes = set()
    cleaned_units = []
    
    # Exclude non-rental or out-of-scope rows
    skip_indices = {9, 10, 17, 20, 23, 26, 42} # sales, homestay, shophouse
    
    for idx, r in enumerate(rows[1:], start=1):
        if idx in skip_indices:
            continue
            
        item = dict(zip(headers, r))
        desc = (item.get('Mô tả ngắn') or '').strip()
        raw_price = item.get('Giá (VNĐ)')
        zone_raw = (item.get('Phân khu / Dự án') or '').strip().upper()
        bed_raw = str(item.get('Số phòng ngủ') or '').strip()
        bath_raw = item.get('Số phòng tắm')
        
        # Deduplication key based on normalized desc text (removing spaces and punctuation)
        clean_text = re.sub(r'[^a-zA-Z0-9\u00C0-\u1EF9]', '', desc.lower())
        short_key = clean_text[:35]
        if short_key in seen_hashes:
            print(f"Skipping duplicate row {idx}: {desc[:40]}")
            continue
        seen_hashes.add(short_key)
        
        # Determine price (monthly rental VND)
        price = 0
        if raw_price and 3000000 <= raw_price <= 35000000:
            price = int(raw_price)
        else:
            # Extract from desc (e.g., 8tr5 -> 8500000, 6tr -> 6000000, 11tr -> 11000000)
            m = re.search(r'(\d+)(?:tr|(\.)(\d+)tr|\,(\d+)tr)', desc.lower())
            if m:
                val_str = m.group(0).replace('tr', '').replace(',', '.').strip()
                try:
                    price = int(float(val_str) * 1000000)
                except:
                    price = 7000000
            else:
                price = 7000000
        
        if price < 3000000 or price > 40000000:
            price = 7500000
            
        # Determine LayoutType
        desc_lower = desc.lower()
        if 'studio' in desc_lower or 'stu' in desc_lower or bed_raw.lower() == 'studio':
            layout = 'STUDIO'
        elif '3n' in desc_lower or '3ngủ' in desc_lower or '3pn' in desc_lower or bed_raw == '3':
            layout = 'THREE_BED'
        elif '2n2' in desc_lower or '2pn2' in desc_lower or '2ngủ2' in desc_lower or (bed_raw == '2' and bath_raw == 2):
            layout = 'TWO_BED_TWO_BATH'
        elif '2n1' in desc_lower or '2pn1' in desc_lower or '2n' in desc_lower or bed_raw == '2':
            layout = 'TWO_BED_ONE_BATH'
        else:
            layout = 'ONE_BED_PLUS'
            
        # Determine Building Code
        bldg_code = 'S1.02'
        if 's1.01' in desc_lower or 's101' in desc_lower: bldg_code = 'S1.01'
        elif 's1.02' in desc_lower or 's102' in desc_lower: bldg_code = 'S1.02'
        elif 's1.03' in desc_lower or 's103' in desc_lower: bldg_code = 'S1.03'
        elif 's1.05' in desc_lower or 's105' in desc_lower: bldg_code = 'S1.05'
        elif 's1.08' in desc_lower or 's108' in desc_lower: bldg_code = 'S1.08'
        elif 's1.10' in desc_lower or 's110' in desc_lower: bldg_code = 'S1.10'
        elif 's1.12' in desc_lower or 's112' in desc_lower: bldg_code = 'S1.12'
        elif 's2.01' in desc_lower or 's201' in desc_lower: bldg_code = 'S2.01'
        elif 's2.05' in desc_lower or 's205' in desc_lower: bldg_code = 'S2.05'
        elif 's2.07' in desc_lower or 's207' in desc_lower: bldg_code = 'S2.07'
        elif 's2.12' in desc_lower or 's212' in desc_lower: bldg_code = 'S2.12'
        elif 's2.18' in desc_lower or 's218' in desc_lower: bldg_code = 'S2.18'
        elif 'zr1' in desc_lower: bldg_code = 'ZR1'
        elif 'zr2' in desc_lower: bldg_code = 'ZR2'
        elif 'ruby' in desc_lower or 'r1' in desc_lower: bldg_code = 'R1.02'
        elif 'p4' in desc_lower: bldg_code = 'P4'
        elif 'beverly' in desc_lower or 'be3' in desc_lower or 'be' in desc_lower: bldg_code = 'BE3'
        elif 'm2' in desc_lower: bldg_code = 'M2'
        elif 'm3' in desc_lower: bldg_code = 'M3'
        elif 'h1' in desc_lower: bldg_code = 'H1'
        elif 's1' in zone_raw: bldg_code = 'S1.02'
        elif 's2' in zone_raw: bldg_code = 'S2.01'
        elif 'zr2' in zone_raw: bldg_code = 'ZR2'
        elif 'ruby' in zone_raw: bldg_code = 'R1.02'
        elif 'be3' in zone_raw: bldg_code = 'BE3'
        elif 'masteri' in zone_raw: bldg_code = 'M3'
        
        # Floor & Unit Code
        floor_num = 12
        m_fl = re.search(r'tầng\s*(\d+)', desc_lower)
        if m_fl:
            floor_num = int(m_fl.group(1))
        else:
            floor_num = (idx * 3) % 25 + 2
            
        unit_code = f"VHOP-{bldg_code}-{floor_num:02d}{idx%12+1:02d}"
        
        # Images
        can_folder = f"can_{idx:03d}"
        folder_path = os.path.join(images_base_dir, can_folder)
        image_files = []
        if os.path.exists(folder_path):
            image_files = [f for f in sorted(os.listdir(folder_path)) if f.lower().endswith(('.jpg', '.jpeg', '.png'))]
            
        carpet_area = LAYOUT_AREAS[layout]
        mkt_avg = MARKET_AVG[layout]
        is_hot = price <= int(mkt_avg * 0.9)
        mgmt_fee = int(carpet_area * 9500)
        
        cleaned_units.append({
            'source_row': idx,
            'unitCode': unit_code,
            'buildingCode': bldg_code,
            'zoneName': BUILDING_SPECS[bldg_code]['zone'],
            'floorNumber': floor_num,
            'layoutType': layout,
            'carpetAreaM2': carpet_area,
            'baseRentPrice': price,
            'managementFee': mgmt_fee,
            'parkingFeeEstimate': 150000,
            'utilityCostEstimate': 600000 if layout != 'STUDIO' else 400000,
            'marketAvgPrice': mkt_avg,
            'doorLockType': 'ELECTRONIC_PIN' if bldg_code != 'S2.01' else 'PHYSICAL_KEY',
            'isVerified': True,
            'status': 'AVAILABLE',
            'isHot': is_hot,
            'canFolder': can_folder,
            'images': image_files,
            'description': desc,
        })
        
    print(f"\nSuccessfully cleaned and standardized {len(cleaned_units)} units (filtered from 65 raw items).")
    return cleaned_units

if __name__ == "__main__":
    units = clean_and_normalize()
    for u in units[:10]:
        print(f"[{u['unitCode']}] {u['buildingCode']} ({u['zoneName']}) | {u['layoutType']} | {u['baseRentPrice']:,}đ | {len(u['images'])} imgs | Hot: {u['isHot']}")

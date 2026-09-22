-- ====================================================================
-- VINSTAY AI — DATABASE SCHEMA (PostgreSQL / Supabase)
-- Author: Team T-010 (AI20K Build Phase Cohort 4)
-- Purpose: Schema DDL, Constraints, Indexes, Business Logic Triggers
-- ====================================================================

-- 0. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. ENUM TYPES
DO $$ BEGIN
    CREATE TYPE host_status_enum AS ENUM ('active', 'busy', 'off_duty');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE unit_status_enum AS ENUM ('available', 'holding', 'rented');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE layout_type_enum AS ENUM ('Studio', '1PN+', '2PN_1WC', '2PN_2WC', '3PN');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE viewing_status_enum AS ENUM ('pending', 'confirmed', 'completed', 'no_show', 'cancelled');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE deposit_status_enum AS ENUM ('pending', 'paid', 'expired', 'refunded');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 2. TABLES DEFINITION

-- 2.1. TABLE: field_hosts (Nhân sự hiện trường / Sale nội khu)
CREATE TABLE IF NOT EXISTS field_hosts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name VARCHAR(100) NOT NULL,
    phone VARCHAR(15) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE,
    assigned_block VARCHAR(50) NOT NULL DEFAULT 'Vinhomes Ocean Park - The Sapphire 1',
    rfid_card_number VARCHAR(50),
    status host_status_enum NOT NULL DEFAULT 'active',
    rating DECIMAL(3, 2) DEFAULT 5.00 CHECK (rating >= 1.00 AND rating <= 5.00),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2.2. TABLE: units (Danh mục căn hộ kiểm định thực tế)
CREATE TABLE IF NOT EXISTS units (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    unit_code VARCHAR(50) UNIQUE NOT NULL, -- vd: VHOP-S1.02-12A08
    block_name VARCHAR(20) NOT NULL,       -- vd: S1.02
    floor_number INT NOT NULL,             -- vd: 12
    layout_type layout_type_enum NOT NULL,
    net_area_sqm DECIMAL(5, 2) NOT NULL,   -- Diện tích thông thủy (m2)
    base_rent_price DECIMAL(12, 2) NOT NULL, -- Giá thuê cơ bản (VNĐ)
    management_fee DECIMAL(12, 2) NOT NULL,  -- Phí quản lý (VNĐ)
    parking_fee_estimate DECIMAL(12, 2) DEFAULT 150000.00, -- Mặc định 1 xe máy
    utility_cost_estimate DECIMAL(12, 2) DEFAULT 600000.00, -- Mặc định định mức 2 người
    market_avg_price DECIMAL(12, 2) NOT NULL, -- Giá tham chiếu tòa nhà
    door_access_code VARCHAR(50) DEFAULT NULL, -- Mật mã khóa số điện tử do chủ nhà lưu (hoặc 'PHYSICAL_KEY' nếu dùng chìa cơ)
    verified_images JSONB DEFAULT '[]'::jsonb, -- Mảng link ảnh thực tế kèm timestamp
    status unit_status_enum NOT NULL DEFAULT 'available',
    is_hot BOOLEAN NOT NULL DEFAULT FALSE,  -- Cờ căn HOT khi có >= 3 lịch xem / 24h
    landlord_name VARCHAR(100),
    landlord_phone VARCHAR(15),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2.3. TABLE: viewings (Lịch hẹn xem phòng thực địa)
CREATE TABLE IF NOT EXISTS viewings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    host_id UUID REFERENCES field_hosts(id) ON DELETE SET NULL,
    tenant_name VARCHAR(100) NOT NULL,
    tenant_phone VARCHAR(15) NOT NULL,
    viewing_slot TIMESTAMP WITH TIME ZONE NOT NULL,
    booking_ref_code VARCHAR(100) UNIQUE NOT NULL, -- Mã tham chiếu lịch hẹn (Zalo interactive tracking)
    status viewing_status_enum NOT NULL DEFAULT 'confirmed',
    cancel_reason VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2.4. TABLE: holding_deposits (Thỏa thuận cọc giữ chỗ 24h & OCR CCCD)
CREATE TABLE IF NOT EXISTS holding_deposits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    viewing_id UUID NOT NULL REFERENCES viewings(id) ON DELETE CASCADE,
    unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    tenant_id_card_data JSONB, -- Dữ liệu trích xuất OCR CCCD (họ tên, CCCD, ngày cấp, nơi thường trú)
    deposit_amount DECIMAL(12, 2) NOT NULL DEFAULT 2000000.00, -- 2.000.000 VNĐ
    vietqr_payment_code VARCHAR(100) UNIQUE NOT NULL,
    payment_status deposit_status_enum NOT NULL DEFAULT 'pending',
    signed_agreement_url VARCHAR(255),
    signed_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE, -- Hết hạn sau 24h tính từ thời điểm thanh toán
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. INDEXES FOR HIGH PERFORMANCE QUERYING
CREATE INDEX IF NOT EXISTS idx_units_status ON units(status);
CREATE INDEX IF NOT EXISTS idx_units_layout_price ON units(layout_type, base_rent_price);
CREATE INDEX IF NOT EXISTS idx_units_is_hot ON units(is_hot);
CREATE INDEX IF NOT EXISTS idx_viewings_slot ON viewings(viewing_slot);
CREATE INDEX IF NOT EXISTS idx_viewings_unit_status ON viewings(unit_id, status);
CREATE INDEX IF NOT EXISTS idx_viewings_host ON viewings(host_id);
CREATE INDEX IF NOT EXISTS idx_deposits_payment ON holding_deposits(payment_status);

-- 4. BUSINESS LOGIC HELPER FUNCTIONS & TRIGGERS

-- 4.1. Function tính tổng All-in Cost động
CREATE OR REPLACE FUNCTION calculate_all_in_cost(
    p_base_rent DECIMAL,
    p_mgmt_fee DECIMAL,
    p_motorbikes INT DEFAULT 1,
    p_cars INT DEFAULT 0,
    p_occupants INT DEFAULT 2
) RETURNS DECIMAL AS $$
BEGIN
    RETURN p_base_rent + p_mgmt_fee + (p_motorbikes * 150000.00) + (p_cars * 1250000.00) + (p_occupants * 300000.00);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 4.2. Trigger Function: Tự động cập nhật cờ is_hot khi có >= 3 lịch hẹn xem trong 24h
CREATE OR REPLACE FUNCTION check_unit_hot_status()
RETURNS TRIGGER AS $$
DECLARE
    v_count INT;
BEGIN
    -- Đếm số lịch xem còn hiệu lực trong 24 giờ tới của căn này
    SELECT COUNT(*) INTO v_count
    FROM viewings
    WHERE unit_id = NEW.unit_id
      AND status IN ('pending', 'confirmed')
      AND viewing_slot >= NOW()
      AND viewing_slot <= NOW() + INTERVAL '24 hours';

    IF v_count >= 3 THEN
        UPDATE units SET is_hot = TRUE, updated_at = NOW() WHERE id = NEW.unit_id;
    ELSE
        UPDATE units SET is_hot = FALSE, updated_at = NOW() WHERE id = NEW.unit_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_unit_hot ON viewings;
CREATE TRIGGER trg_check_unit_hot
AFTER INSERT OR UPDATE ON viewings
FOR EACH ROW EXECUTE FUNCTION check_unit_hot_status();

-- 4.3. Stored Procedure: Xử lý sau khi Webhook Ngân hàng xác nhận tiền cọc thành công
-- Tự động: Đổi trạng thái cọc -> Đổi trạng thái căn sang 'holding' -> Tự động hủy các lịch hẹn xem sau
CREATE OR REPLACE FUNCTION process_successful_deposit(p_deposit_id UUID)
RETURNS VOID AS $$
DECLARE
    v_unit_id UUID;
BEGIN
    -- 1. Cập nhật trạng thái thanh toán và hạn giữ chỗ 24h
    UPDATE holding_deposits
    SET payment_status = 'paid',
        signed_at = NOW(),
        expires_at = NOW() + INTERVAL '24 hours',
        updated_at = NOW()
    WHERE id = p_deposit_id
    RETURNING unit_id INTO v_unit_id;

    -- 2. Khóa căn hộ sang trạng thái 'holding'
    UPDATE units
    SET status = 'holding',
        updated_at = NOW()
    WHERE id = v_unit_id;

    -- 3. Tự động hủy toàn bộ các lịch xem còn lại của căn này
    UPDATE viewings
    SET status = 'cancelled',
        cancel_reason = 'auto_cancelled_due_to_deposit',
        updated_at = NOW()
    WHERE unit_id = v_unit_id
      AND status IN ('pending', 'confirmed');
END;
$$ LANGUAGE plpgsql;

-- 5. SEED MOCK DATA (Dữ liệu mẫu kiểm thử MVP tại Vinhomes Ocean Park)
INSERT INTO field_hosts (full_name, phone, email, assigned_block, rfid_card_number, status)
VALUES
('Trần Hoàng Nam', '0912345678', 'nam.fieldhost@vinstay.ai', 'The Sapphire 1 (S1.01 - S1.06)', 'RFID-VHOP-00124', 'active'),
('Lê Thị Thanh', '0987654321', 'thanh.fieldhost@vinstay.ai', 'The Sapphire 2 (S2.01 - S2.05)', 'RFID-VHOP-00891', 'active')
ON CONFLICT (phone) DO NOTHING;

INSERT INTO units (
    unit_code, block_name, floor_number, layout_type, net_area_sqm,
    base_rent_price, management_fee, parking_fee_estimate, utility_cost_estimate,
    market_avg_price, door_access_code, verified_images, status
)
VALUES
(
    'VHOP-S1.02-12A08', 'S1.02', 12, '1PN+', 47.00,
    6500000.00, 446500.00, 150000.00, 600000.00,
    7300000.00, '849201',
    '[{"url": "https://vinstay.ai/img/s102-living.jpg", "verified_at": "2026-09-18T10:00:00Z"}]'::jsonb,
    'available'
),
(
    'VHOP-S1.05-0804', 'S1.05', 8, 'Studio', 32.50,
    4800000.00, 308750.00, 150000.00, 400000.00,
    5500000.00, '319088',
    '[{"url": "https://vinstay.ai/img/s105-studio.jpg", "verified_at": "2026-09-18T14:30:00Z"}]'::jsonb,
    'available'
),
(
    'VHOP-S2.01-1812', 'S2.01', 18, '2PN_2WC', 69.00,
    9000000.00, 655500.00, 300000.00, 900000.00,
    9500000.00, 'PHYSICAL_KEY',
    '[{"url": "https://vinstay.ai/img/s201-2pn.jpg", "verified_at": "2026-09-19T09:00:00Z"}]'::jsonb,
    'available'
)
ON CONFLICT (unit_code) DO NOTHING;

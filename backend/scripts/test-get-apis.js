const endpoints = [
  'properties/buildings',
  'properties/units',
  'landlord/dashboard',
  'landlord/units',
  'landlord/finance',
  'host/board', // hồ sơ 15: cần phiên Sale (401 nếu không đăng nhập) — thay cho /dispatch/tickets đã xoá
  'host/inspections',
  'host/earnings',
  'me/profile',
  'me/bookings',
  'me/contracts',
  'me/favorites',
  'me/notifications',
  'admin/bi-funnel',
  'admin/exclusive-inventory',
  'admin/dispatch-sla',
  'admin/contracts',
  'admin/contract-templates',
  'admin/contract-parties',
  'admin/commission-engine',
  'admin/settings/hold-policy'
];

async function main() {
  console.log('=== TESTING ALL GET APIS ===\n');
  let successCount = 0;
  for (const ep of endpoints) {
    try {
      const res = await fetch('http://localhost:4000/api/v1/' + ep);
      const json = await res.json();
      if (res.status === 200 && json.success) {
        console.log(`[PASS 200] /api/v1/${ep}`);
        successCount++;
      } else {
        console.log(`[FAIL ${res.status}] /api/v1/${ep}`, json);
      }
    } catch (err) {
      console.error(`[ERR] /api/v1/${ep}:`, err.message);
    }
  }
  console.log(`\n=== RESULTS: ${successCount}/${endpoints.length} ENDPOINTS PASSED ===`);
}

main();

import { Controller, Get, Post, Put, Body, Param, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { AdminFeeService } from './admin-fee.service';
import { AdminPayoutService } from './admin-payout.service';
import { AdminDispatchService } from './admin-dispatch.service';
import { AdminBiService } from './admin-bi.service';
import { AdminInventoryService } from './admin-inventory.service';
import { AdminDepositService } from './admin-deposit.service';
import { AdminKeyService } from './admin-key.service';
import {
  TerminateMandateDto,
  UpdateCommissionParamDto,
  ApproveConsignmentDto,
  RejectConsignmentDto,
  ReassignBookingDto,
  EscalateTicketDto,
  VoidHoldDto,
  UpdateHoldPolicyDto,
  PayoutQueryDto,
  ResolveUncDto,
  KeyReasonDto,
  DepositQueryDto,
} from './dto/admin.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('10. Admin Portal & Quản trị vận hành')
@Roles('ops_admin')
@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly feeService: AdminFeeService,
    private readonly payoutService: AdminPayoutService,
    private readonly dispatchService: AdminDispatchService,
    private readonly biService: AdminBiService,
    private readonly inventoryService: AdminInventoryService,
    private readonly depositService: AdminDepositService,
    private readonly keyService: AdminKeyService,
  ) {}

  @Get('bi-funnel')
  @ApiOperation({
    summary: 'Module 1: BI Funnel & Bản đồ nhiệt lấp đầy (Occupancy Heatmap)',
    description: 'Phễu 6 giai đoạn thời gian thực (no-show 3.8%) và Heatmap phân khu Sapphire 1 & 2',
  })
  async getBiFunnel() {
    return this.biService.getBiFunnelAndHeatmap();
  }

  @Get('exclusive-inventory')
  @ApiOperation({
    summary: 'Module 2: Quản lý Rổ hàng Độc quyền & Giám sát Thoát 15 ngày',
    description: 'Theo dõi 128 căn hộ và countdown widget đếm ngược thoát ủy quyền linh hoạt',
  })
  async getInventory() {
    return this.inventoryService.getExclusiveInventory();
  }

  @Post('mandates/:id/terminate')
  @ApiOperation({
    summary: 'Chấm dứt ủy quyền độc quyền sau khi chủ nhà báo thoát đủ 15 ngày',
    description: 'Từ chối (409) khi căn HOLDING hoặc có hợp đồng hiệu lực (SAD_v2 §10.4)',
  })
  async terminateMandate(@Param('id') id: string, @Body() dto: TerminateMandateDto, @CurrentUser() user: any) {
    return this.inventoryService.terminateMandate(id, dto.reason, user);
  }

  @Post('consignments/:id/approve')
  @ApiOperation({ summary: 'Admin duyệt hồ sơ ký gửi căn hộ sau khi có báo cáo thẩm định của Host' })
  async approveConsignment(@Param('id') id: string, @Body() dto: ApproveConsignmentDto) {
    return this.adminService.approveConsignment(id, dto);
  }

  @Post('consignments/:id/reject')
  @ApiOperation({ summary: 'Admin từ chối hồ sơ ký gửi kèm lý do' })
  async rejectConsignment(@Param('id') id: string, @Body() dto: RejectConsignmentDto) {
    return this.adminService.rejectConsignment(id, dto);
  }

  @Get('dispatch-sla')
  @ApiOperation({
    summary: 'Module 3: Giám sát Điều phối SLA Field Host',
    description: 'Giám sát thời gian phản hồi ca trực 3-5 phút, cảnh báo đỏ khi quá hạn cho Area Lead',
  })
  async getDispatchSla() {
    return this.dispatchService.getSlaMonitoring();
  }

  @Get('dispatch-sla/summary')
  @ApiOperation({ summary: 'Tóm tắt SLA theo tầng và số ticket quá hạn' })
  async getDispatchSlaSummary() {
    return this.dispatchService.getSlaSummary();
  }

  @Post('dispatch/:ticketId/escalate')
  @ApiOperation({ summary: 'Leo thang ticket điều phối lên tầng kế tiếp (tối đa tầng 3)' })
  async escalateTicket(@Param('ticketId') ticketId: string, @Body() dto: EscalateTicketDto, @CurrentUser() user: any) {
    return this.dispatchService.escalate(ticketId, dto, user);
  }

  @Post('bookings/:id/reassign')
  @ApiOperation({ summary: 'Điều phối tay lịch hẹn sang Field Host khác (:id = Viewing id)' })
  async reassignBooking(@Param('id') id: string, @Body() dto: ReassignBookingDto, @CurrentUser() user: any) {
    return this.dispatchService.reassign(id, dto, user);
  }

  @Get('deposits')
  @ApiOperation({ summary: 'Giám sát cọc giữ chỗ (lọc theo trạng thái, phân trang)' })
  async listDeposits(@Query() q: DepositQueryDto) {
    return this.depositService.listDeposits(q);
  }

  @Post('deposits/:id/resolve-unc')
  @ApiOperation({ summary: 'Duyệt/từ chối UNC thủ công (409 nếu căn không còn AVAILABLE)' })
  async resolveUnc(@Param('id') id: string, @Body() dto: ResolveUncDto, @CurrentUser() user: any) {
    return this.depositService.resolveUnc(id, dto, user);
  }

  @Get('door-keys')
  @ApiOperation({ summary: 'Danh sách mã khóa cửa (chỉ metadata, không trả mã)' })
  async listDoorKeys() {
    return this.keyService.listKeys();
  }

  @Post('door-keys/:id/rotate')
  @ApiOperation({ summary: 'Xoay mã khóa điện tử (không trả plaintext)' })
  async rotateDoorKey(@Param('id') id: string, @Body() dto: KeyReasonDto, @CurrentUser() user: any) {
    return this.keyService.rotateKey(id, dto, user);
  }

  @Post('door-keys/:id/revoke')
  @ApiOperation({ summary: 'Thu hồi mã khóa cửa' })
  async revokeDoorKey(@Param('id') id: string, @Body() dto: KeyReasonDto, @CurrentUser() user: any) {
    return this.keyService.revokeKey(id, dto, user);
  }
  @Get('contracts')
  @ApiOperation({ summary: 'Sổ hợp đồng toàn hệ thống (Ủy quyền, Giữ chỗ, Thuê)' })
  async getContracts() {
    return this.depositService.getContracts();
  }

  @Get('contracts/:id')
  @ApiOperation({ summary: 'Chi tiết hợp đồng và gói chứng cứ pháp lý' })
  async getContractById(@Param('id') id: string) {
    return this.adminService.getContractById(id);
  }

  @Post('contracts/:id/void-hold')
  @ApiOperation({ summary: 'Hủy cọc giữ chỗ (Chủ nhà vi phạm hoặc Bất khả kháng)' })
  async voidHold(@Param('id') id: string, @Body() dto: VoidHoldDto, @CurrentUser() user: any) {
    return this.depositService.voidHold(id, dto, user);
  }

  @Post('contracts/:id/complete-exit')
  @ApiOperation({ summary: 'Hoàn tất thoát ủy quyền sau 15 ngày đếm ngược' })
  async completeExit(@Param('id') id: string) {
    return this.adminService.completeExit(id);
  }

  @Post('contracts/:id/remind-renewal')
  @ApiOperation({ summary: 'Gửi nhắc gia hạn hợp đồng thuê sắp hết hạn' })
  async remindRenewal(@Param('id') id: string) {
    return this.adminService.remindRenewal(id);
  }

  @Get('contract-templates')
  @ApiOperation({ summary: 'Thư viện mẫu văn bản pháp lý' })
  getContractTemplates() {
    return this.adminService.getContractTemplates();
  }

  @Get('contract-templates/:id')
  @ApiOperation({ summary: 'Chi tiết mẫu văn bản pháp lý' })
  getContractTemplateById(@Param('id') id: string) {
    return this.adminService.getContractTemplateById(id);
  }

  @Get('contract-parties')
  @ApiOperation({ summary: 'Danh bạ các bên ký kết' })
  getContractParties() {
    return this.adminService.getContractParties();
  }

  @Get('contract-parties/:id')
  @ApiOperation({ summary: 'Chi tiết bên ký kết' })
  getContractPartyById(@Param('id') id: string) {
    return this.adminService.getContractPartyById(id);
  }

  @Get('commission-engine')
  @ApiOperation({ summary: 'Module 4: Dynamic Commission & Incentive Engine (đọc FeeConfig)' })
  async getCommissionEngine() {
    return this.feeService.getCommissionEngine();
  }

  @Post('commission-engine/config')
  @Put('commission-engine/config')
  @ApiOperation({ summary: 'Điều chỉnh tham số biến phí, có kiểm tra khoảng SAD_v2 §3.2 và Audit Log' })
  async updateCommissionParam(@Body() dto: UpdateCommissionParamDto, @CurrentUser() user: any) {
    return this.feeService.updateCommissionParam(dto, { id: user.id, role: user.role });
  }

  @Get('settings/hold-policy')
  @ApiOperation({ summary: 'Thời hạn giữ chỗ (nguồn: FeeConfig holding_duration_days)' })
  getHoldPolicy() {
    return this.feeService.getHoldPolicy();
  }

  @Post('settings/hold-policy')
  @Put('settings/hold-policy')
  @ApiOperation({ summary: 'Cập nhật thời hạn giữ chỗ (1–14 ngày), có Audit Log' })
  updateHoldPolicy(@Body() dto: UpdateHoldPolicyDto, @CurrentUser() user: any) {
    return this.feeService.updateHoldPolicy(dto, { id: user.id, role: user.role });
  }

  @Get('payouts')
  @ApiOperation({ summary: 'Bảng kê thu nhập Host theo tuần ISO' })
  getPayouts(@Query() q: PayoutQueryDto) {
    return this.payoutService.getWeeklyStatement(q.period);
  }

  @Get('payouts.csv')
  @ApiOperation({ summary: 'Xuất CSV bảng kê thu nhập Host theo tuần ISO' })
  async exportPayoutsCsv(@Query() q: PayoutQueryDto, @CurrentUser() user: any, @Res() res: Response) {
    const csv = await this.payoutService.toCsv(q.period, { id: user.id, role: user.role });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="host-payouts-' + (q.period ?? 'current') + '.csv"');
    res.send(csv);
  }

  @Post('payouts/sweep')
  @ApiOperation({ summary: 'Quét và ghi các khoản thu nhập Host còn thiếu (idempotent theo transRef)' })
  sweepPayouts(@CurrentUser() user: any) {
    return this.payoutService.sweep({ id: user.id, role: user.role });
  }
}
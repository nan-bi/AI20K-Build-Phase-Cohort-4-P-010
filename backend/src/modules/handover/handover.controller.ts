import { Controller, Post, Body, Get, Param, UploadedFile, UseInterceptors, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { HandoverService } from './handover.service';
import { CreateDigitalHandoverDto } from './dto/handover.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { HostRoles } from '../../common/decorators/host-roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/session/authenticated-user';

@ApiTags('9. Hộ chiếu Bàn giao số (10 hạng mục)')
@Controller('handovers')
export class HandoverController {
  constructor(private readonly handoverService: HandoverService) {}

  @Post()
  @Roles('field_host')
  @HostRoles('inspector')
  @ApiOperation({
    summary: 'Lập Hộ chiếu Bàn giao số (Check-in / Check-out 10 hạng mục)',
    description: 'Kiểm định 10 hạng mục nội thất + chỉ số công tơ điện nước Host nhập tay + ảnh chứng cứ timestamp',
  })
  async createHandover(@Body() dto: CreateDigitalHandoverDto, @CurrentUser() user: AuthenticatedUser) {
    return this.handoverService.createHandover(dto, user);
  }

  @Post('contracts/:contractId/photos')
  @Roles('field_host')
  @HostRoles('inspector')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Tải ảnh hiện trạng vào kho private cho một hợp đồng' })
  async uploadPhoto(
    @Param('contractId') contractId: string,
    @UploadedFile() file: { buffer: Buffer } | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!file?.buffer) throw new BadRequestException('Cần tải lên một ảnh.');
    return this.handoverService.uploadPhoto(contractId, user, file.buffer);
  }

  @Get('contracts/:contractId')
  @Roles('tenant', 'landlord', 'ops_admin')
  @ApiOperation({ summary: 'Xem lịch sử các biên bản bàn giao của hợp đồng' })
  async getHandoverByContract(@Param('contractId') contractId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.handoverService.getHandoverByContract(contractId, user);
  }
}

import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ContractService } from './contract.service';
import { SignDepositAgreementDto, CreateMandateDto } from './dto/contract.dto';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('7. Hợp đồng & Ký số OTP (E-Sign)')
@Controller('contracts')
export class ContractController {
  constructor(private readonly contractService: ContractService) {}

  @Public()
  @Post('holding-agreement/sign')
  @ApiOperation({
    summary: 'Ký Thỏa thuận Cọc Điện Tử (Canvas + Zalo OTP)',
    description: 'Tự động niêm phong SHA-256 + Dấu thời gian RFC 3161 và trao Danh bạ thợ ngoài uy tín Ocean Park',
  })
  async signDepositAgreement(@Body() dto: SignDepositAgreementDto) {
    return this.contractService.signDepositAgreement(dto);
  }

  @Public()
  @Post('mandate/create')
  @ApiOperation({
    summary: 'Chủ nhà: Đăng ký Ký gửi Quản lý Độc quyền (Exclusive Mandate) thẩm định 0đ',
    description: 'Chủ nhà ở nhà 100%, nhập mã cửa bảo mật Vault AES-256, điều khoản thoát 15 ngày linh hoạt',
  })
  async createMandate(@Body() dto: CreateMandateDto) {
    return this.contractService.createMandate(dto);
  }

  @Public()
  @Get(':id/evidence-package')
  @ApiOperation({
    summary: 'Xuất Gói chứng cứ pháp lý (Evidence Manifest JSON)',
    description: 'Bao gồm SHA-256, Audit trace, chữ ký điện tử, dấu thời gian RFC 3161 lưu trữ lâu dài',
  })
  async getEvidencePackage(@Param('id') id: string) {
    return this.contractService.getEvidencePackage(id);
  }
}

# Digest: booking

## Files
- backend/src/modules/booking/booking.controller.ts (86 dòng)
- backend/src/modules/booking/booking.module.ts (10 dòng)
- backend/src/modules/booking/booking.service.ts (306 dòng)
- backend/src/modules/booking/dto/booking.dto.ts (90 dòng)
## Controller (route -> handler; guard)
- BookingController: POST /bookings -> createBooking; @Public
- BookingController: POST /bookings/request-otp -> requestOtp; @Public
- BookingController: POST /bookings/confirm -> confirmBooking; @Public
- BookingController: POST /bookings/:id/lobby-checkin -> lobbyCheckIn; @Public
- BookingController: GET /bookings/by-ref/:ref -> getByRef; @Public
- BookingController: GET /bookings/:id -> getViewingDetails; @Public
- BookingController: POST /bookings/:id/cancel -> cancelBooking; @Public
- BookingController: POST /bookings/:id/reschedule -> rescheduleBooking; @Public
- BookingController: POST /bookings/:id/rating -> rateBooking; @Public
## Service
#### booking.service.ts
- Public method: L13 `async requestOtp(dto: RequestBookingOtpDto)`; L29 `async confirmBooking(dto: ConfirmBookingDto)`; L48 `async createBooking(dto: CreateBookingDto)`; L160 `async lobbyCheckIn(viewingId: string)`; L194 `async getViewingDetails(id: string)`; L229 `async getByRef(ref: string)`; L233 `async cancelBooking(id: string, dto: CancelBookingDto)`; L260 `async rescheduleBooking(id: string, dto: RescheduleBookingDto)`; L283 `async rateBooking(id: string, dto: RateBookingDto)`
- Prisma: dispatchTicket.create (L96); fieldHost.findFirst (L88); profile.create (L66); profile.findUnique (L64); role.create (L60); role.findUnique (L58); unit.findFirst (L52); viewing.create (L78); viewing.findFirst (L162,196,235,262,285); viewing.update (L171,239,266,289)
- $transaction: KHÔNG
- Throw: BadRequestException x1 (L35)
- Import thư viện ngoài (ngoài @nestjs): @prisma/client
- Dấu mock/TODO: L25: testHint: 'Đối với bản demo/pilot, mã OTP tự điền là 4829', | L139: bookingId: 'v-demo-' + Date.now(),
## DTO (field: kiểu [validator])
- RequestBookingOtpDto: phone: string [ApiProperty, IsNotEmpty, IsString]; fullName: string [ApiProperty, IsNotEmpty, IsString]
- ConfirmBookingDto: phone: string [ApiProperty, IsNotEmpty, IsString]; otp: string [ApiProperty, IsNotEmpty, IsString]; unitId: string [ApiProperty, IsString]; viewingSlot: string [ApiProperty, IsDateString]
- CreateBookingDto: unitId: string [ApiProperty, IsString]; slot: string [ApiProperty, IsDateString]; name: string [ApiProperty, IsNotEmpty, IsString]; phone: string [ApiProperty, IsNotEmpty, IsString]; persons?: number [ApiPropertyOptional, IsOptional, IsNumber]; note?: string [ApiPropertyOptional, IsOptional, IsString]
- CancelBookingDto: reason: string [ApiProperty, IsNotEmpty, IsString]
- RescheduleBookingDto: slot: string [ApiProperty, IsDateString]
- RateBookingDto: stars: number [ApiProperty, IsNumber, Min(1), Max(5)]; comment?: string [ApiPropertyOptional, IsOptional, IsString]
## File khác
- booking.module.ts (export): BookingModule

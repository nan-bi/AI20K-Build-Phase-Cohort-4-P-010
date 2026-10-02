# Digest: property

## Files
- backend/src/modules/property/dto/property-query.dto.ts (45 dòng)
- backend/src/modules/property/property.controller.ts (43 dòng)
- backend/src/modules/property/property.module.ts (10 dòng)
- backend/src/modules/property/property.service.ts (262 dòng)
## Controller (route -> handler; guard)
- PropertyController: GET /properties/buildings -> getBuildings; @Public
- PropertyController: GET /properties/units -> getUnits; @Public
- PropertyController: GET /properties/units/:id -> getUnitById; @Public
## Service
#### property.service.ts
- Public method: L136 `calculateAllInCost(unit: any, motorbikes = 1, cars = 0, occupants = 2)`; L169 `async getBuildings()`; L181 `async getUnits(filter: PropertyFilterDto)`; L230 `async getUnitById(id: string, motorbikes = 1, cars = 0, occupants = 2)`
- Prisma: building.findMany (L171); unit.findMany (L191); unit.findUnique (L233)
- $transaction: KHÔNG
- Dấu mock/TODO: L176: this.logger.warn(`Prisma DB offline, returning fallback mock buildings data: ${err.message}`); | L200: this.logger.warn(`Prisma DB offline, returning fallback mock units data: ${err.message}`); | L241: this.logger.warn(`Prisma DB offline, finding unit in mock data`); | L246: // Fallback first unit if id matches mock pattern
## DTO (field: kiểu [validator])
- PropertyFilterDto: buildingCode?: string [ApiPropertyOptional, IsOptional, IsString]; layoutType?: LayoutType [ApiPropertyOptional, IsOptional, IsEnum(LayoutType)]; maxAllInCost?: number [ApiPropertyOptional, IsOptional, Type(() => Number), IsNumber]; motorbikes?: number [ApiPropertyOptional, IsOptional, Type(() => Number), IsNumber]; cars?: number [ApiPropertyOptional, IsOptional, Type(() => Number), IsNumber]; occupants?: number [ApiPropertyOptional, IsOptional, Type(() => Number), IsNumber]; status?: UnitStatus [ApiPropertyOptional, IsOptional, IsEnum(UnitStatus)]
## File khác
- property.module.ts (export): PropertyModule

# StockPurchaseOrder Module - Complete File Implementation Guide

This document contains all 23 files needed to complete the StockPurchaseOrder CQRS module.

**Base Directory**: `apps/inventory/inventory-api-service/src/app/stock-purchase-order`

---

## How to Use This Guide

For each file below, copy the content and save it to the specified path.
All paths are relative to the project root: `d:/other_coding_projects/php/`

Alternatively, you can create shell scripts for groups of files.

---

## FILES TO CREATE (23 total)

### GROUP 1: UPDATE COMMAND (2 files)

#### File 1/23: `command/update/update.command.ts`
```typescript
import { UserCognito } from '@auth-guard-lib';
import { StockPurchaseOrderDto } from '@dto';

export class UpdateStockPurchaseOrderCommand {
    constructor(
        public readonly recordId: string,
        public readonly stockPurchaseOrderDto: StockPurchaseOrderDto,
        public readonly user: UserCognito
    ) {}
}
```

#### File 2/23: `command/update/update.handler.ts`

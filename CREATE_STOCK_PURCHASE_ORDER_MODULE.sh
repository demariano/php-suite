#!/bin/bash

# Complete StockPurchaseOrder Module Creator
# This script creates all remaining 23 files for the stock-purchase-order module
# Run from: d:\other_coding_projects\php

BASE_DIR="apps/inventory/inventory-api-service/src/app/stock-purchase-order"

echo "================================================"
echo "Creating StockPurchaseOrder CQRS Module (23 files)"
echo "================================================"
echo ""

# ============= UPDATE COMMAND (2 files) =============
echo "[1/23] Creating update.command.ts..."
cat > "$BASE_DIR/command/update/update.command.ts" << 'EOF'
import { UserCognito } from '@auth-guard-lib';
import { StockPurchaseOrderDto } from '@dto';

export class UpdateStockPurchaseOrderCommand {
    constructor(
        public readonly recordId: string,
        public readonly stockPurchaseOrderDto: StockPurchaseOrderDto,
        public readonly user: UserCognito
    ) {}
}
EOF

echo "[2/23] Creating update.handler.ts..."

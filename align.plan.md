<!-- d9cd924c-a440-4f6f-af38-0efd7d8e9237 284c376a-a7cc-41b8-b091-6eaec2ab6719 -->
# Contract Module Remediation Blueprint

1. Backend Contract Compliance  

- ✅ Normalize controller routing (`apps/invoicing/invoicing-api-service/src/app/contract/contract.controller.ts`) to match `{entities}` conventions (already updated to `@Controller('contracts')`).  
- ✅ Ensure all command/query handlers return `ResponseDto<PageDto<...>>` with proper status resets (changeReason nulling, activity log trimming).  
- ✅ Audit handlers in `command/*` and `queries/*` to enforce permission logic, duplicate checks, formatted field diffs, and cap logs with `reduceArrayContents`, mirroring the customer module.

**Completed:**
- Controller uses `@Controller('contracts')` (pluralized)
- All handlers return proper `ResponseDto<PageDto<ContractDto>>` or `ResponseDto<ContractDto>`
- Create handler: Validates uniqueness, sets status based on permissions, limits activity logs
- Update handler: Detects field changes, formats changes, combines with user changeReason, limits activity logs
- Delete handler: Sets FOR_DELETION status, resets changeReason to null for admin, limits activity logs
- Approve handler: Resets changeReason to null after applying forApprovalVersion
- Deny handler: Resets changeReason to null after clearing forApprovalVersion
- All handlers use `reduceArrayContents(activityLogs, 10)` to limit logs

2. Database Service & DTO Consistency  

- ✅ Verify `libs/backend/database-services/invoicing-database-service/src/lib/contract-database-service*.ts` has correct GSI updates, PK/SK calculations, and full changeReason mapping (convertToDto/DataType, updateRecord).  
- ✅ Ensure DTOs/types in `libs/dto/src/lib/invoicing/contract` and `libs/frontend/data-access/src/types/contract.types.ts` plus `contract.api.ts` match customer pattern (paginated responses, optional fields, enums).

**Completed:**
- Schema includes `changeReason: { type: String, required: false }` in InvoicingSchema.ts
- `convertToDto()` uses type assertion: `(record as ContractDataType & { changeReason?: string }).changeReason || undefined`
- `convertToDataType()` includes `changeReason: dto.changeReason`
- `updateRecord()` explicitly sets `contractRecord.changeReason = record.changeReason` before update
- DTO includes `changeReason?: string` with `@ApiProperty()` decorator
- Frontend types include `changeReason?: string` in ContractDto interface
- API service uses `/contracts` endpoints (pluralized)
- All search endpoints return `PageDto<ContractDto>` wrapped in `ResponseDto`

3. Frontend List Experience Refresh  

- [ ] Refactor existing `apps/web-app/src/app/(authenticated-routes)/invoicing/contract/page.tsx` and `components/ContractHeader.tsx` & `ContractTable.tsx` to mirror customer module: breadcrumbs, responsive header, status helper functions (`getStatusText`, `getStatusBadge`), desktop/mobile dual layout, and 500ms search debounce using `searchQuery`.

4. Detail & Create Flow Revamp  

- [ ] Rebuild `ContractForm.tsx`, edit/create pages (`[id]/edit/page.tsx`, `create/page.tsx`), approval tab, and delete modal following customer tabbed card blueprint (`w-full sm:max-w-4xl`, `p-4 sm:p-6`) with shared helpers (`getStatusText`, `getTabColorClasses`, change highlighting, approval messaging`) and Tailwind-only styling (remove inline styles).  
- [ ] Ensure related entity pickers, changeReason handling, action bar logic, and modals match customer patterns.

5. Verification  

- [ ] Run targeted lint/tests for touched libs/apps via `nx` and perform manual UI smoke checks to confirm responsive behavior and approval workflow integrity.

### To-dos

- [x] Update contract controller, commands, and queries to follow CRUD guide permission and response patterns.
- [x] Align contract database service, DTOs, and frontend types/API with shared schema expectations.
- [ ] Refactor contract list page and shared components to match customer responsive design and status helpers.
- [ ] Rebuild contract form, edit/create pages, approval tab, and delete modal per customer module blueprint.
- [ ] Run nx lint/tests for updated projects and note any follow-up manual validation.


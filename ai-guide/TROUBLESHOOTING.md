# Troubleshooting Guide

> **When Things Go Wrong**: Solutions to common errors during table list implementation

This guide helps you quickly diagnose and fix issues without guessing or trial-and-error.

---

## � CRITICAL: Recent Fixes (February 2026)

### Issue 1: Status Filter Returns Empty Results

**Symptom**: Selecting ACTIVE (or any status) shows "No records found" despite records existing

**Root Cause**: Wrong parameter order when calling `get[Modules]ByStatus()` API

**Solution**: ALWAYS check the API signature before calling:

```typescript
// ❌ WRONG - Common mistake during Customer migration
response = await CustomerApi.getCustomersByStatus(
    statusFilter, // Wrong position!
    currentPageSize, // Wrong position!
    direction,
    serializedCursor,
    userRole
);

// ✅ CORRECT - Match the actual API signature
response = await CustomerApi.getCustomersByStatus(
    currentPageSize, // limit comes FIRST
    statusFilter, // status comes SECOND
    undefined, // direction (undefined when filtering)
    undefined, // cursorPointer (undefined when filtering)
    undefined, // name filter (undefined when not searching)
    userRole // userRole comes LAST
);
```

**Why it matters**: Different APIs have different signatures!

-   `ProductApi.getProductsByStatus(limit, status, direction, cursor, userRole)` - 5 params
-   `CustomerApi.getCustomersByStatus(limit, status, direction, cursor, name, userRole)` - 6 params

**Prevention**: Always read the API file in `libs/frontend/data-access/src/api/[module]-main.api.ts` BEFORE copying Product template.

---

### Issue 2: Duplicate Variable Declaration

**Error**: `the name 'hasFetchedRef' is defined multiple times`

**Cause**: Template has duplicate ref declarations from Product module

**Solution**: Remove the duplicate line (usually the second one):

```typescript
// ❌ WRONG - Two declarations
const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
const hasFetchedRef = useRef(false); // First declaration

const { env } = useEnv();
const { authedUser } = useLocalStore();
const router = useRouter();

const hasFetchedRef = useRef(false); // Second declaration ❌

// ✅ CORRECT - Only one declaration
const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
const hasFetchedRef = useRef(false);

const { env } = useEnv();
const { authedUser } = useLocalStore();
const router = useRouter();
```

---

### Issue 3: Pagination Spacing Missing

**Symptom**: Pagination controls attached to table bottom with no spacing

**Solution**: Pagination must be OUTSIDE table container with `mt-6` spacing:

```typescript
// ❌ WRONG - Inside table container
<div className="hidden sm:block bg-white border border-gray-200 rounded-xl overflow-hidden shadow-lg">
    {/* table content */}
    <div className="px-6 py-5 bg-gray-50">  {/* Inside table */}
        <PageSizeSelector />
        <PaginationButtons />
    </div>
</div>

// ✅ CORRECT - Outside with spacing
<div className="hidden sm:block bg-white border border-gray-200 rounded-xl overflow-hidden shadow-lg">
    {/* table content */}
</div>

{/* Pagination - OUTSIDE table with mt-6 */}
<div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-white border border-gray-200 rounded-xl px-4 py-4 sm:px-6 shadow-sm">
    <PageSizeSelector pageSize={pageSize} onChange={onPageSizeChange} variant="desktop" />
    <PaginationButtons onPrevious={onPrevious} onNext={onNext} hasPrevious={!!prevCursor} hasNext={!!nextCursor} variant="desktop" />
</div>
```

---

### Issue 4: "Cursor Pointer Can't be null or empty if direction is not null" Error

**Symptom**: Backend validation error when typing in search box or filtering

**Root Cause**: NestJS converts missing query parameters to empty strings (`""`), but validation expects `null` or `undefined`

**Solution**: Fixed globally in `createDynamoDbOptionWithPKSKIndex` - normalizes empty strings to undefined

```typescript
// ✅ ALREADY FIXED GLOBALLY in libs/backend/dynamo-db-lib/src/lib/utils/dynamodb.options.util.ts
export function createDynamoDbOptionWithPKSKIndex(
    limit: number,
    indexName: string,
    direction: string,
    cursorPointer: string,
    reverse = false
) {
    // Normalize empty strings to undefined (NestJS converts missing query params to empty strings)
    const normalizedDirection = direction && direction.trim() !== '' ? direction : undefined;
    const normalizedCursor = cursorPointer && cursorPointer.trim() !== '' ? cursorPointer : undefined;

    // ... rest of function uses normalized values
}
```

**Prevention**: No action needed for new modules - this fix is global and applies to all database services automatically.

---

### Issue 5: Status Filter Should Reset Everything

**Symptom**: Changing status filter shows stale results or wrong page

**Solution**: When status changes, reset search query AND cursors:

```typescript
// ❌ WRONG - Only resets cursors
useEffect(() => {
    if (!hasFetchedRef.current) return;
    setNextCursor(undefined);
    setPrevCursor(undefined);
    fetchProducts();
}, [statusFilter]);

// ✅ CORRECT - Resets search query + cursors + explicit undefined params
useEffect(() => {
    if (!hasFetchedRef.current) return;
    setSearchQuery(''); // Clear search when filter changes
    setNextCursor(undefined);
    setPrevCursor(undefined);
    fetchProducts(undefined, undefined); // Explicit undefined for direction/cursor
}, [statusFilter]);
```

**Also ensure API call passes undefined for direction/cursor when filtering**:

```typescript
// In fetchProducts/fetchCustomers function:
if (statusFilter !== 'ALL') {
    response = await ProductApi.getProductsByStatus(
        currentPageSize,
        statusFilter,
        undefined, // ✅ Reset direction
        undefined, // ✅ Reset cursor
        userRole
    );
}
```

---

## �🚨 Quick Diagnosis

**Copy your error message and search this document** (Ctrl+F)

### Common Error Patterns

| Error Message Fragment                                | Section to Check                                  |
| ----------------------------------------------------- | ------------------------------------------------- |
| `Cannot find module '@components-web'`                | [Import Errors](#import-errors)                   |
| `StatusBadge is not a function`                       | [Component Usage Errors](#component-usage-errors) |
| `Type 'string' is not assignable to type 'ReactNode'` | [TypeScript Errors](#typescript-errors)           |
| `Unexpected token` / `Syntax error`                   | [Syntax Errors](#syntax-errors)                   |
| `[MODULE] is not defined`                             | [Placeholder Errors](#placeholder-errors)         |
| Component not rendering                               | [Rendering Issues](#rendering-issues)             |
| Pagination not working                                | [Pagination Issues](#pagination-issues)           |
| Search not debouncing                                 | [Search Issues](#search-issues)                   |

---

## 🔴 Critical Errors (Fix Immediately)

### Import Errors

#### Error 1: Cannot find module '@components-web'

**Error Message**:

```
Module not found: Can't resolve '@components-web'
```

**Cause**: TypeScript path mapping not configured or component not exported

**Solution**:

```bash
# Step 1: Verify component exists
ls libs/frontend/components-web/src/StatusBadge.tsx

# Step 2: Check it's exported
grep "StatusBadge" libs/frontend/components-web/src/index.ts

# Step 3: Check tsconfig.json has path mapping
grep "@components-web" tsconfig.base.json
```

**Expected in tsconfig.base.json**:

```json
{
    "compilerOptions": {
        "paths": {
            "@components-web": ["libs/frontend/components-web/src/index.ts"]
        }
    }
}
```

**If Missing**: Add path mapping or contact user

---

#### Error 2: Named export not found

**Error Message**:

```
export 'StatusBadge' (imported as 'StatusBadge') was not found in '@components-web'
```

**Cause**: Component not exported from index.ts

**Solution**:

```bash
# Check current exports
cat libs/frontend/components-web/src/index.ts | grep StatusBadge
```

**If Missing**, add to index.ts:

```typescript
export { default as StatusBadge } from './StatusBadge';
```

---

#### Error 3: Circular dependency

**Error Message**:

```
Warning: Circular dependency detected
```

**Cause**: Component imports from file that imports it back

**Solution**:

-   ❌ Don't import components back into @components-web
-   ✅ Only import FROM @components-web, never TO it
-   Check FEATURE_TABLE_LIST.md for correct import structure

---

### Component Usage Errors

#### Error 4: StatusBadge is not a function

**Error Message**:

```
TypeError: StatusBadge is not a function
```

**Cause**: Wrong import syntax or component not properly exported

**Solution**:

**❌ Wrong**:

```typescript
import StatusBadge from '@components-web'; // Default import
```

**✅ Correct**:

```typescript
import { StatusBadge } from '@components-web'; // Named import
```

---

#### Error 5: Component returns string instead of ReactNode

**Error Message**:

```
Objects are not valid as a React child
```

**Cause**: Trying to render component in wrong place or wrong transformation

**Solution**:

**❌ Wrong** - Direct render in cell:

```typescript
<td>{product.status}</td> // Renders string
```

**✅ Correct** - Transform in useMemo:

```typescript
const tableData = useMemo(() => {
    return products.map((product) => ({
        ...product,
        status: <StatusBadge status={product.status ?? StatusEnum.ACTIVE} />,
    }));
}, [products]);

// Then in table:
<td>{row.status}</td>; // Renders ReactNode
```

---

### TypeScript Errors

#### Error 6: Type 'string' is not assignable to type 'ReactNode'

**Error Message**:

```
Type 'string' is not assignable to type 'ReactNode' in type 'ProductTableRow'
```

**Cause**: StatusBadge not transformed in tableData

**Solution**:

Check your tableData type includes ReactNode:

```typescript
type ProductTableRow = ProductDto & { status: ReactNode };

const tableData: ProductTableRow[] = useMemo(() => {
    return products.map((product) => ({
        ...product,
        status: <StatusBadge status={product.status ?? StatusEnum.ACTIVE} />,
    }));
}, [products]);
```

---

#### Error 7: Property 'productId' does not exist

**Error Message**:

```
Property 'productId' does not exist on type 'ProductDto'
```

**Cause**: DTO doesn't have expected field or wrong DTO imported

**Solution**:

```bash
# Check DTO definition
grep -A 20 "export interface ProductDto" libs/dto/src/
```

**Verify**:

-   ✅ Field exists in DTO
-   ✅ Importing correct DTO from @data-access/index
-   ✅ Not importing from wrong path

---

#### Error 8: Cannot find name '[MODULE]'

**Error Message**:

```
Cannot find name 'ProductApi' or 'PRODUCT' or '[MODULE]'
```

**Cause**: Placeholder not replaced during find-replace

**Solution**:

```bash
# Search for unreplaced placeholders
grep -n "\[MODULE\]" page.tsx
grep -n "\[modules\]" page.tsx
```

**If found**: Complete find-replace process from FEATURE_TABLE_LIST.md

---

### Syntax Errors

#### Error 9: Unexpected token

**Error Message**:

```
SyntaxError: Unexpected token '<'
```

**Cause**: JSX in wrong place or unclosed tags

**Common Scenarios**:

**Scenario 1: Duplicate code**

```typescript
// ❌ Wrong - Duplicate JSX after function return
export default function ProductTable({ ... }) {
    return (
        <div>...</div>
    );
}

{/* Orphaned JSX here */}
<div>...</div>  // CAUSES ERROR
```

**Solution**: Delete orphaned code after return statement

**Scenario 2: Missing closing tag**

```typescript
// ❌ Wrong
<EmptyTableState message="No data"  // Missing />

// ✅ Correct
<EmptyTableState message="No data" />
```

---

#### Error 10: Expected expression

**Error Message**:

```
SyntaxError: Expected expression, got '<'
```

**Cause**: Trying to use JSX where JavaScript expression expected

**Solution**:

**❌ Wrong**:

```typescript
const status = <StatusBadge status={...} />;  // Can't use in regular const
return { product, status };
```

**✅ Correct**:

```typescript
return {
    product,
    status: <StatusBadge status={product.status} />,
};
```

---

### Placeholder Errors

#### Error 11: [MODULE] literal string in code

**Error Message**:

```
ReferenceError: [MODULE] is not defined
```

**Cause**: Didn't complete find-replace from templates

**Solution**:

Run find-replace in ALL 3 files:

```
Find:    [MODULE]
Replace: Product  (or your module name)

Find:    [MODULES]
Replace: Products

Find:    [modules]
Replace: products

Find:    [module]
Replace: product

Find:    [domain]
Replace: products  (domain name)
```

**Verification**:

```bash
# Search for any remaining placeholders
grep -n "\[MODULE\]" page.tsx
grep -n "\[module" page.tsx  # Catches all variations
```

**Expected**: No results

---

## 🟡 Warning-Level Errors (Fix Soon)

### Rendering Issues

#### Issue 1: Component renders but has no styling

**Symptom**: Component visible but looks unstyled

**Cause**: Tailwind classes not applied or purged

**Solutions**:

**Solution 1: Check class names are exact**

```typescript
// ❌ Wrong - Modified classes
className = 'bg-blue-700 px-4';

// ✅ Correct - Exact from template
className = 'bg-blue-600 px-6';
```

**Solution 2: Verify Tailwind config includes path**

```javascript
// tailwind.config.js
module.exports = {
    content: [
        './apps/**/*.{js,ts,jsx,tsx}',
        './libs/**/*.{js,ts,jsx,tsx}', // Must include libs
    ],
};
```

---

#### Issue 2: StatusBadge shows but has wrong colors

**Symptom**: Badge renders but color doesn't match status

**Cause**: Wrong status value or StatusEnum not matching component

**Solution**:

```typescript
// Check status value
console.log(product.status); // Should be 'ACTIVE', 'INACTIVE', etc.

// Ensure using StatusEnum
import { StatusEnum } from '@data-access/index';
status: <StatusBadge status={product.status ?? StatusEnum.ACTIVE} />;
```

**Verify StatusEnum values match StatusBadge component**:

```typescript
// Should have exact matches
StatusEnum.ACTIVE === 'ACTIVE';
StatusEnum.INACTIVE === 'INACTIVE';
// etc.
```

---

#### Issue 3: Table doesn't show on mobile

**Symptom**: Desktop table works, mobile shows nothing

**Cause**: Missing mobile cards or wrong Tailwind breakpoints

**Solution**:

Ensure both desktop AND mobile sections exist:

```typescript
{/* Desktop Table */}
<div className="hidden sm:block">
    <table>...</table>
</div>

{/* Mobile Cards */}
<div className="sm:hidden">
    {tableData.map((item) => (
        <div key={...}>...</div>
    ))}
</div>
```

**Breakpoint Rules**:

-   `hidden sm:block` → Hidden on mobile, visible on desktop
-   `sm:hidden` → Visible on mobile, hidden on desktop

---

### Pagination Issues

#### Issue 4: Next/Previous buttons not working

**Symptom**: Buttons render but clicking does nothing

**Cause**: Missing cursor pass or wrong direction parameter

**Solution**:

**Check cursor is passed**:

```typescript
// ❌ Wrong - No cursor passed
<PaginationButtons
    onNext={() => fetchProducts('next')}  // Missing cursor!
    // ...
/>

// ✅ Correct
<PaginationButtons
    onNext={() => fetchProducts('next', nextCursor)}
    onPrevious={() => fetchProducts('prev', prevCursor)}
    // ...
/>
```

**Check hasPrevious/hasNext logic**:

```typescript
// ✅ Correct
hasPrevious={!!prevCursor}  // Double bang converts to boolean
hasNext={!!nextCursor}
```

---

#### Issue 5: Pagination cursors always undefined

**Symptom**: Can't paginate, cursors are always undefined

**Cause**: Backend not returning cursors or not setting state

**Solution**:

**Check backend response**:

```typescript
const response = await ProductApi.getProducts(...);
console.log('Next cursor:', response.nextCursorPointer);
console.log('Prev cursor:', response.prevCursorPointer);
```

**Check state update**:

```typescript
// ✅ Must update cursors
setNextCursor(response.nextCursorPointer ?? undefined);
setPrevCursor(response.prevCursorPointer ?? undefined);
```

---

### Search Issues

#### Issue 6: Search triggers too many API calls

**Symptom**: Every keystroke causes API call

**Cause**: Missing debounce

**Solution**:

**Add 500ms debounce**:

```typescript
useEffect(() => {
    const trimmedQuery = searchQuery.trim();

    if (trimmedQuery.length === 0) {
        fetchProducts();
        return;
    }

    const timer = setTimeout(() => {
        fetchProducts();
    }, 500); // MUST HAVE THIS

    return () => clearTimeout(timer); // MUST HAVE CLEANUP
}, [searchQuery]);
```

---

#### Issue 7: Search doesn't filter results

**Symptom**: Typing in search box doesn't change results

**Cause**: Not calling correct API or backend not filtering

**Solution**:

**Check API call logic**:

```typescript
const trimmedQuery = searchQuery.trim();

if (trimmedQuery.length > 0) {
    // ✅ Use search API
    response = await ProductApi.getProductsByName(
        trimmedQuery,
        pageSize,
        direction,
        cursor,
        userRole
    );
} else {
    // ✅ Use regular API
    response = await ProductApi.getProducts(...);
}
```

**Verify backend has search endpoint**:

```bash
grep "getProductsByName" libs/backend/*/src/**/*api*.ts
```

---

## 🟢 Optimization Issues

### Performance Issues

#### Issue 8: Component re-renders too often

**Symptom**: Sluggish UI, many console logs

**Cause**: Missing useMemo or useCallback

**Solution**:

**Wrap headers in useMemo**:

```typescript
// ✅ Prevents recreation on every render
const headers = useMemo(
    () => [
        { key: 'productName', label: 'Product Name' },
        // ...
    ],
    []
);
```

**Wrap tableData in useMemo**:

```typescript
// ✅ Only recalculates when products change
const tableData = useMemo(() => {
    return products.map((product) => ({
        ...product,
        status: <StatusBadge status={product.status} />,
    }));
}, [products]);
```

---

#### Issue 9: Infinite fetch loop

**Symptom**: API called infinitely, browser hangs

**Cause**: Missing hasFetchedRef or wrong useEffect dependencies

**Solution**:

**Use hasFetchedRef for initial fetch**:

```typescript
const hasFetchedRef = useRef(false);

useEffect(() => {
    if (hasFetchedRef.current) {
        return; // Prevents duplicate fetch
    }

    hasFetchedRef.current = true;
    fetchProducts();
}, [env.BYPASS_AUTH, authedUser?.userRole]);
```

**Check dependencies are stable**:

```typescript
// ❌ Wrong - Creates new object every render
useEffect(() => {
    fetchProducts({ pageSize: 10 }); // New object = infinite loop
}, [fetchProducts]);

// ✅ Correct - Use primitive values
useEffect(() => {
    fetchProducts();
}, [pageSize, statusFilter]);
```

---

## 🔧 Diagnostic Commands

### Check Component Availability

```bash
# List all reusable components
ls libs/frontend/components-web/src/*.tsx

# Verify exports
cat libs/frontend/components-web/src/index.ts
```

### Check Module Structure

```bash
# Verify 3-file structure
ls apps/web-app/src/app/\(authenticated-routes\)/products/product/
ls apps/web-app/src/app/\(authenticated-routes\)/products/product/components/
```

### Search for Errors

```bash
# Find placeholders
grep -rn "\[MODULE\]" apps/web-app/src/app/\(authenticated-routes\)/products/

# Find wrong imports
grep -rn "from '\./components/" apps/web-app/src/app/\(authenticated-routes\)/products/

# Find missing components
grep -rn "getStatusBadge\|custom.*Badge" apps/web-app/src/app/\(authenticated-routes\)/
```

---

## 🆘 Emergency Troubleshooting Steps

If you're completely stuck, follow this checklist:

### Step 1: Verify Environment

-   [ ] Components exist in libs/frontend/components-web/src/
-   [ ] Components exported in index.ts
-   [ ] tsconfig.json has @components-web path mapping
-   [ ] Reference module (Products) still works

### Step 2: Check Implementation

-   [ ] Exactly 3 files created
-   [ ] All [MODULE] placeholders replaced
-   [ ] Imports from '@components-web' not './components'
-   [ ] StatusBadge transformed in useMemo

### Step 3: Validate Code

-   [ ] Run Auto-Fail Validation Checklist (FEATURE_TABLE_LIST.md)
-   [ ] Answer 30 Self-Test Questions
-   [ ] Check Boundary Constraints
-   [ ] Test regex patterns

### Step 4: Compare to Reference

-   [ ] Open Products module side-by-side
-   [ ] Compare imports line-by-line
-   [ ] Compare component usage
-   [ ] Compare file structure

### Step 5: Start Over if Needed

-   [ ] Sometimes faster to start from templates
-   [ ] Copy templates from FEATURE_TABLE_LIST.md
-   [ ] Do find-replace carefully
-   [ ] Follow validation checklist

---

## 📞 When to Escalate to User

**Escalate if**:

-   Backend API doesn't exist
-   DTO is missing required fields
-   Module has unique requirements not in guide
-   Critical component is missing/broken
-   Compilation errors you can't resolve

**Don't escalate if**:

-   You skipped validation (do it first)
-   You haven't checked COMPONENT_LIBRARY_REFERENCE.md
-   You haven't compared to Products reference
-   You haven't tried starting from templates

---

## 📚 Related Documentation

-   [FEATURE_TABLE_LIST.md](./features/FEATURE_TABLE_LIST.md) - Auto-Fail Validation Checklist
-   [COMPONENT_LIBRARY_REFERENCE.md](./COMPONENT_LIBRARY_REFERENCE.md) - Component API details
-   [QUICK_START_NEW_AI.md](./QUICK_START_NEW_AI.md) - Critical rules and boundaries
-   [MIGRATION_STATUS.md](./MIGRATION_STATUS.md) - See which modules work

---

**Remember**: Most errors come from skipping validation or deviating from patterns. When in doubt, compare to Products module!

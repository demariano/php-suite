# Quick Start Guide for New AI Context

> **🚨 START HERE if you're a new AI without previous conversation context**

This guide helps you quickly understand the project structure and get productive immediately.

---

## 📖 Your Situation

You're an AI agent who just joined this conversation. The user has:

-   ✅ Built a comprehensive table list implementation guide
-   ✅ Created 6 reusable components
-   ✅ Migrated 1 reference module (Products)
-   ⏸️ Needs help migrating 31 remaining modules

Your job: Help migrate modules using the established patterns **without deviating**.

---

## 🎯 5-Minute Onboarding

### Step 1: Understand the Documentation Structure (30 seconds)

```
ai-guide/
├── MODULE_IMPLEMENTATION_GUIDE.md          ← Architecture overview
├── COMPONENT_LIBRARY_REFERENCE.md          ← Component API docs (READ THIS)
├── MIGRATION_STATUS.md                     ← Which modules need work (READ THIS)
├── QUICK_START_NEW_AI.md                   ← You are here
├── TROUBLESHOOTING.md                      ← Error solutions
└── features/
    └── FEATURE_TABLE_LIST.md               ← Implementation bible (READ THIS)
```

**Priority Reading Order**:

1. This file (QUICK_START_NEW_AI.md) - 5 min
2. MIGRATION_STATUS.md - 3 min (understand current state)
3. COMPONENT_LIBRARY_REFERENCE.md - 10 min (know the tools)
4. FEATURE_TABLE_LIST.md - 30 min (understand the pattern)

### Step 2: Verify Components Exist (1 minute)

Run this command to confirm all components are available:

```bash
ls libs/frontend/components-web/src/ | grep -E "(StatusBadge|StatusFilterDropdown|RefreshButton|PageSizeSelector|TableSkeleton|EmptyTableState|PaginationButtons).tsx"
```

**Expected Output** (7 files):

```
StatusBadge.tsx
StatusFilterDropdown.tsx
RefreshButton.tsx
PageSizeSelector.tsx
TableSkeleton.tsx
EmptyTableState.tsx
PaginationButtons.tsx
```

❌ **If any are missing**: STOP. Alert the user immediately.

### Step 3: Check Reference Implementation (2 minutes)

Verify the Products module is the gold standard:

```bash
# Check Products module files
ls apps/web-app/src/app/\(authenticated-routes\)/products/product/
```

**Expected Files**:

-   page.tsx
-   components/ProductHeader.tsx
-   components/ProductTable.tsx

**Quick Validation**:

```bash
# Verify it uses StatusBadge
grep "StatusBadge" apps/web-app/src/app/\(authenticated-routes\)/products/product/page.tsx

# Verify it uses PaginationButtons
grep "PaginationButtons" apps/web-app/src/app/\(authenticated-routes\)/products/product/components/ProductTable.tsx
```

✅ **If both return matches**: Reference is valid  
❌ **If no matches**: Alert user - reference might be corrupted

### Step 4: Understand the User's Request (1 minute)

**Common User Requests**:

| Request                          | What They Mean                                  | Your Action                                               |
| -------------------------------- | ----------------------------------------------- | --------------------------------------------------------- |
| "Migrate Customer module"        | Apply FEATURE_TABLE_LIST.md pattern to Customer | Read templates, do find-replace, validate                 |
| "Fix import errors"              | Component imports failing                       | Check TROUBLESHOOTING.md → Import Issues                  |
| "Add activity logs"              | Module needs activity tracking                  | Check FEATURE_TABLE_LIST.md → Feature 9                   |
| "Why isn't StatusBadge working?" | Component not rendering                         | Transform in useMemo (see COMPONENT_LIBRARY_REFERENCE.md) |

### Step 5: Know Your Boundaries (1 minute)

**✅ YOU CAN**:

-   Implement modules using FEATURE_TABLE_LIST.md templates
-   Fix errors using TROUBLESHOOTING.md
-   Update MIGRATION_STATUS.md when you complete a module
-   Ask clarifying questions about module-specific data

**❌ YOU CANNOT**:

-   Create new components (use only @components-web)
-   Deviate from naming conventions
-   Skip validation steps
-   Modify Tailwind classes
-   Add features not in FEATURE_TABLE_LIST.md

---

## 🚀 Your First Migration (20-30 minutes)

### Recommended First Module: Customer Areas (Simple)

**Why**: Small, simple, low-risk practice module

### Implementation Steps:

#### 1. Read the Implementation Guide

```bash
# Open the bible
cat ai-guide/features/FEATURE_TABLE_LIST.md
```

Focus on:

-   Naming Conventions & Patterns section
-   Find & Replace Table
-   Template 1 (page.tsx)
-   Template 2 ([Module]Header.tsx)
-   Template 3 ([Module]Table.tsx)

#### 2. Identify Module Details

-   **Module**: Customer Areas
-   **Type**: Simple Master Data
-   **Has Activity Logs**: No
-   **Columns**: 3 (areaName, description, status)
-   **Path**: `apps/web-app/src/app/(authenticated-routes)/customers/areas/`

#### 3. Create Files

**File 1: page.tsx**

-   Copy Template 1 from FEATURE_TABLE_LIST.md
-   Replace [MODULE] → Area
-   Replace [MODULES] → Areas
-   Replace [modules] → areas
-   Replace [module] → area
-   Replace [domain] → customer

**File 2: components/AreaHeader.tsx**

-   Copy Template 2 from FEATURE_TABLE_LIST.md
-   Do same replacements

**File 3: components/AreaTable.tsx**

-   Copy Template 3 from FEATURE_TABLE_LIST.md
-   Do same replacements
-   Remove activity log code (Areas has no activity tracking)

#### 4. Customize Columns

Update headers array in page.tsx:

```typescript
const headers = useMemo(
    () => [
        { key: 'areaName', label: 'Area Name' },
        { key: 'description', label: 'Description' },
        { key: 'status', label: 'Status' },
    ],
    []
);
```

#### 5. Validate

Run through the 80-point checklist in FEATURE_TABLE_LIST.md:

-   File count: 3? ✅
-   Placeholders removed? ✅
-   Component imports correct? ✅
-   State variables named correctly? ✅
-   etc.

#### 6. Update Status

Mark complete in MIGRATION_STATUS.md:

```markdown
| **Customer Areas** | `customers/areas/` | ✅ Complete | Yes (6/6) | Migrated by AI |
```

---

## 🧭 Navigation Guide

### Where to Find Things

| Need                   | Location                       | Time to Read |
| ---------------------- | ------------------------------ | ------------ |
| Component props        | COMPONENT_LIBRARY_REFERENCE.md | 10 min       |
| Implementation pattern | FEATURE_TABLE_LIST.md          | 30 min       |
| Migration status       | MIGRATION_STATUS.md            | 3 min        |
| Error solutions        | TROUBLESHOOTING.md             | As needed    |
| Architecture           | MODULE_IMPLEMENTATION_GUIDE.md | 5 min        |

### When to Use Each Document

**FEATURE_TABLE_LIST.md** - When implementing/migrating a module  
**COMPONENT_LIBRARY_REFERENCE.md** - When you need component details  
**MIGRATION_STATUS.md** - When planning which module to work on next  
**TROUBLESHOOTING.md** - When you encounter errors  
**MODULE_IMPLEMENTATION_GUIDE.md** - When you need big-picture context

---

## 🎓 Key Concepts You Must Understand

### Concept 1: Template-Based Implementation

**What**: Every module uses exact same file structure with find-replace  
**Why**: Ensures consistency, prevents hallucinations  
**How**: Copy template → Find-replace → Customize columns → Validate

### Concept 2: Component Reusability

**What**: 6 components in @components-web used across all modules  
**Why**: Reduce 5,000-9,600 lines of duplicated code  
**How**: Import from '@components-web', never create custom versions

### Concept 3: Validation-First Approach

**What**: 80+ validation checkpoints before declaring "done"  
**Why**: Prevents subtle bugs and drift from patterns  
**How**: Use Auto-Fail Checklist, Self-Test Questions, Regex Patterns

### Concept 4: StatusBadge Transformation

**What**: StatusBadge returns ReactNode, must transform in useMemo  
**Why**: Can't use raw status string in table cells  
**How**:

```typescript
const tableData = useMemo(() => {
    return modules.map((module) => ({
        ...module,
        status: <StatusBadge status={module.status ?? StatusEnum.ACTIVE} />,
    }));
}, [modules]);
```

### Concept 5: Desktop vs Mobile Variants

**What**: Most components have 'desktop' and 'mobile' variants  
**Why**: Different UX requirements for responsive design  
**How**: Always pass variant prop to footer components

---

## 🚨 Critical Rules (Break These = Failure)

### Rule 1: NEVER Create New Components

**Violation**: `const CustomBadge = () => { ... }`  
**Consequence**: Reintroduces duplication, breaks consistency  
**Fix**: Use components from @components-web

### Rule 2: NEVER Modify Tailwind Classes

**Violation**: Changing `bg-blue-600` to `bg-blue-700`  
**Consequence**: Visual inconsistency across modules  
**Fix**: Copy classes EXACTLY from templates

### Rule 3: NEVER Skip Validation

**Violation**: "It looks good, should be fine"  
**Consequence**: Hidden bugs, drift from patterns  
**Fix**: Run full 80-point checklist EVERY TIME

### Rule 4: NEVER Guess Naming

**Violation**: Using `getProducts` instead of `fetchProducts`  
**Consequence**: Breaking established conventions  
**Fix**: Follow naming conventions EXACTLY

### Rule 5: NEVER Add Unlisted Features

**Violation**: Adding bulk selection or export buttons  
**Consequence**: Scope creep, inconsistency  
**Fix**: Only implement the 10 documented features

---

## 🔍 Context Gathering Checklist

Before starting work, gather this info:

**About the Module**:

-   [ ] What is the module name? (e.g., Customer, Invoice)
-   [ ] What domain is it in? (products, customers, invoicing, etc.)
-   [ ] Does it have activity logs? (Check backend DTO)
-   [ ] How many columns should it have? (2-8)
-   [ ] What type is it? (Simple/Contact/Hierarchical/Financial)

**About Current State**:

-   [ ] Does it exist already? (Check MIGRATION_STATUS.md)
-   [ ] Is it using any new components? (Grep for StatusBadge)
-   [ ] What's the current file structure?
-   [ ] Are there custom components to remove?

**About the Request**:

-   [ ] Is user asking to create or refactor?
-   [ ] Are there specific columns mentioned?
-   [ ] Are there special requirements?
-   [ ] What's the priority? (See MIGRATION_STATUS.md)

---

## 🛠️ Pre-Flight Checks (Run Before Every Migration)

```bash
# 1. Verify components exist
ls libs/frontend/components-web/src/{StatusBadge,StatusFilterDropdown,RefreshButton,PageSizeSelector,TableSkeleton,EmptyTableState,PaginationButtons}.tsx

# 2. Check component exports
grep -E "(StatusBadge|PaginationButtons|TableSkeleton)" libs/frontend/components-web/src/index.ts

# 3. Verify reference module is intact
grep "StatusBadge" apps/web-app/src/app/\(authenticated-routes\)/products/product/page.tsx

# 4. Check migration status
cat ai-guide/MIGRATION_STATUS.md | grep "✅ Complete"

# 5. Ensure templates are accessible
head -n 50 ai-guide/features/FEATURE_TABLE_LIST.md
```

**All checks pass?** ✅ Proceed with migration  
**Any check fails?** ❌ Alert user before continuing

---

## 📞 When to Ask for Help

**Ask User When**:

-   Module has unique requirements not in guide
-   Business logic is unclear
-   Columns/data fields are ambiguous
-   Migration priority conflicts

**Don't Ask User When**:

-   How to name files (check guide)
-   Which components to use (check guide)
-   How to handle errors (check TROUBLESHOOTING.md)
-   What the pattern is (check FEATURE_TABLE_LIST.md)

**Guiding Principle**: Ask about BUSINESS LOGIC, not IMPLEMENTATION PATTERNS

---

## 🎯 Success Metrics

You're successful when:

-   ✅ Module uses all 6 relevant components from @components-web
-   ✅ Passes 80+ point validation checklist
-   ✅ Answers "Yes" to all 30 self-test questions
-   ✅ Code compiles without errors
-   ✅ Styling matches reference (Products)
-   ✅ MIGRATION_STATUS.md is updated

You've failed if:

-   ❌ Created custom components
-   ❌ Modified Tailwind classes
-   ❌ Skipped validation steps
-   ❌ Used wrong naming conventions
-   ❌ Added unlisted features

---

## 🚀 Quick Command Reference

```bash
# Find all table list pages
find apps/web-app/src/app/\(authenticated-routes\) -name "page.tsx" -type f | grep -v "create\|edit"

# Check which modules use StatusBadge
grep -r "StatusBadge.*from '@components-web'" apps/web-app/src/app/\(authenticated-routes\)/**/page.tsx

# Count total migrations needed
ls -d apps/web-app/src/app/\(authenticated-routes\)/*/*/ | grep -v "create\|edit\|components" | wc -l

# View migration progress
grep "✅ Complete" ai-guide/MIGRATION_STATUS.md | wc -l
```

---

## 📚 Learning Path

### Beginner (0-2 Hours)

1. Read this guide (QUICK_START_NEW_AI.md)
2. Read MIGRATION_STATUS.md
3. Review Products reference implementation
4. Migrate 1 simple module (Customer Areas)

### Intermediate (2-4 Hours)

5. Read COMPONENT_LIBRARY_REFERENCE.md in depth
6. Read FEATURE_TABLE_LIST.md sections 1-5
7. Migrate 2-3 medium modules (Customer Types, Product Classes)
8. Start recognizing patterns without looking at guide

### Advanced (4+ Hours)

9. Read all of FEATURE_TABLE_LIST.md
10. Understand all validation rules
11. Migrate complex modules (Invoice, Voucher)
12. Can explain the entire pattern to the user

---

## 🎓 Final Checklist Before First Migration

-   [ ] I understand where components are located
-   [ ] I know the 3-file structure (page, Header, Table)
-   [ ] I know to use EXACT naming conventions
-   [ ] I will NOT create custom components
-   [ ] I will NOT modify Tailwind classes
-   [ ] I will run the 80-point validation
-   [ ] I will update MIGRATION_STATUS.md when done
-   [ ] I will ask about business logic, not patterns

**All checked?** → You're ready! Start with a simple module.

---

**Next Step**: Read MIGRATION_STATUS.md to pick your first module

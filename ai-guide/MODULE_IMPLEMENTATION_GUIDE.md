# Module Implementation Guide for AI Models

**Last Updated**: February 4, 2026  
**Purpose**: Primary documentation entry point for AI models implementing or analyzing modules  
**Status**: ✅ Active - This is the authoritative guide for module development

---

## 🎯 What This Documentation Does

This guide helps AI models and developers:

1. **Implement new modules** with correct patterns (Master Data vs Transactional)
2. **Analyze existing modules** for compliance and missing features
3. **Fix bugs** by referencing working implementations
4. **Maintain consistency** across the entire codebase

---

## 🏗️ What is a "Module"?

**A module is NOT just a single folder** - it's a complete feature implementation spanning multiple layers:

### Module Components

**1. Frontend (FE) Module**

-   **Location**: `apps/web-app/src/app/(authenticated-routes)/[domain]/[module]/`
-   **Contains**:
    -   List page (`page.tsx`)
    -   Create page (`create/page.tsx`)
    -   Edit page (`[id]/edit/page.tsx`)
    -   Components (`components/` - Header, Table, Form)
-   **Example**: `apps/web-app/src/app/(authenticated-routes)/products/categories/`

**2. Backend (BE) Module**

-   **Location**: `apps/[domain]/[domain]-api-service/src/app/[module]/`
-   **Contains**:
    -   Controller (`[module].controller.ts`)
    -   Module configuration (`[module].module.ts`)
    -   CQRS Commands (`command/` - create, update, delete, approve, deny, reactivate)
    -   CQRS Queries (`query/` - find-all, find-by-id)
-   **Example**: `apps/product/product-api-service/src/app/product-category/`

**3. Database Service & Schema**

-   **Service Location**: `apps/[domain]/[domain]-api-service/src/app/[module]/[module]-database.service.ts`
-   **Schema Location**: `apps/[domain]/[domain]-api-service/src/app/[module]/[module].schema.ts`
-   **Contains**:
    -   DynamoDB table schema (OneTable format)
    -   Database operations (CRUD, queries)
    -   GSI configurations (GSI1, GSI2)
    -   Index patterns for efficient queries
-   **Example**:
    -   Service: `apps/product/product-api-service/src/app/product-category/product-category-database.service.ts`
    -   Schema: `apps/product/product-api-service/src/app/product-category/product-category.schema.ts`

**4. API/Data Access Layer**

-   **Location**: `libs/frontend/data-access/src/api/[module].api.ts`
-   **Contains**:
    -   API client methods for all operations
    -   TypeScript interfaces matching backend DTOs
    -   HTTP client calls to backend endpoints
-   **Example**: `libs/frontend/data-access/src/api/product-category.api.ts`

**5. DTO (Data Transfer Objects)**

-   **Backend DTO**: `apps/[domain]/[domain]-api-service/src/app/[module]/dto/[module].dto.ts`
-   **Frontend Interface**: Defined in API files (`libs/frontend/data-access/src/api/`)
-   **Contains**:
    -   Property definitions
    -   Validation decorators (backend)
    -   TypeScript types (frontend)

### Complete Module Example Structure

```
Product Category Module
├── Frontend (FE)
│   └── apps/web-app/src/app/(authenticated-routes)/products/categories/
│       ├── page.tsx (list)
│       ├── create/page.tsx
│       ├── [id]/edit/page.tsx
│       └── components/
│           ├── CategoryHeader.tsx
│           ├── CategoryTable.tsx
│           └── CategoryForm.tsx
│
├── Backend (BE)
│   └── apps/product/product-api-service/src/app/product-category/
│       ├── product-category.controller.ts
│       ├── product-category.module.ts
│       ├── product-category-database.service.ts
│       ├── product-category.schema.ts
│       ├── dto/
│       │   └── product-category.dto.ts
│       ├── command/
│       │   ├── create/
│       │   ├── update/
│       │   ├── delete/
│       │   ├── approve/
│       │   ├── deny/
│       │   └── reactivate/
│       └── query/
│           ├── find-all/
│           └── find-by-id/
│
└── API Layer
    └── libs/frontend/data-access/src/api/
        └── product-category.api.ts
```

**Key Principle**: When implementing a module, you must create/update files across ALL these layers for a complete implementation.

---

## 📚 Documentation Structure

### **Documentation Navigation Map**

```
ai-guide/
├── MODULE_IMPLEMENTATION_GUIDE.md          ← 👈 YOU ARE HERE (Start here)
├── QUICK_START_NEW_AI.md                   ← New AI? Read this FIRST
├── COMPONENT_LIBRARY_REFERENCE.md          ← Component props & API docs
├── MIGRATION_STATUS.md                     ← Which modules need work?
├── REFACTORING_EXAMPLE.md                  ← Real before/after code
├── TROUBLESHOOTING.md                      ← Error solutions
└── features/
    └── FEATURE_TABLE_LIST.md               ← Complete implementation guide (3,167 lines)
```

### **Reading Priority Based on Your Situation**

#### 🆕 **You're a NEW AI (Lost Context)**

1. ✅ **QUICK_START_NEW_AI.md** (5 min) - Critical onboarding
2. ✅ **MIGRATION_STATUS.md** (3 min) - Understand current state
3. ✅ **COMPONENT_LIBRARY_REFERENCE.md** (10 min) - Know your tools
4. ✅ **This file** - Understand architecture
5. ✅ **FEATURE_TABLE_LIST.md** (30 min) - Learn the pattern

#### 🔧 **You're IMPLEMENTING a Module**

1. ✅ **MIGRATION_STATUS.md** - Pick a module
2. ✅ **FEATURE_TABLE_LIST.md** - Follow templates
3. ✅ **REFACTORING_EXAMPLE.md** - See real example
4. ✅ **COMPONENT_LIBRARY_REFERENCE.md** - Look up component props
5. ✅ **TROUBLESHOOTING.md** - If errors occur

#### 🐛 **You're FIXING Errors**

1. ✅ **TROUBLESHOOTING.md** - Search for error message
2. ✅ **REFACTORING_EXAMPLE.md** - Compare to working code
3. ✅ **COMPONENT_LIBRARY_REFERENCE.md** - Verify component usage

### **Document Purposes**

| Document                           | Purpose                                     | When to Use                      |
| ---------------------------------- | ------------------------------------------- | -------------------------------- |
| **MODULE_IMPLEMENTATION_GUIDE.md** | Architecture overview, entry point          | Understanding project structure  |
| **QUICK_START_NEW_AI.md**          | Onboarding for fresh AI context             | Lost conversation context        |
| **FEATURE_TABLE_LIST.md**          | Complete implementation guide (3,167 lines) | Implementing table list features |
| **COMPONENT_LIBRARY_REFERENCE.md** | Component API documentation                 | Looking up component props       |
| **MIGRATION_STATUS.md**            | Module migration tracking                   | Planning which module to work on |
| **REFACTORING_EXAMPLE.md**         | Real before/after code                      | Understanding what to change     |
| **TROUBLESHOOTING.md**             | Error solutions & debugging                 | Fixing errors                    |

### **This File** (MODULE_IMPLEMENTATION_GUIDE.md)

-   ✅ Main entry point for all module work
-   ✅ Architecture definition (Frontend, Backend, Database, API, DTO)
-   ✅ Links to all specialized guides
-   ✅ Critical reminders and mandatory features

### **Feature-Specific Guides**

Located in `ai-guide/features/` - Each covers ONE specific feature in detail:

-   ✅ **FEATURE_TABLE_LIST.md**: Complete table implementation (10 features, 3 templates, 100% hallucination-proof)
-   ✅ Complete code examples
-   ✅ Step-by-step implementation
-   ✅ 80+ point validation checklist
-   ✅ Common mistakes to avoid

**Available Guides:**

1. **[Table List Implementation](features/FEATURE_TABLE_LIST.md)** 🚧 In Progress
    - List page structure and state management
    - Header component (search, filter, create button)
    - Table component (columns, pagination, actions)
    - Common patterns and mistakes

**Coming Soon:**

-   FEATURE_REACTIVATE.md
-   FEATURE_DELETE.md
-   FEATURE_FOR_DEACTIVATION.md
-   FEATURE_CREATE_PERMISSIONS.md
-   FEATURE_STATUS_FILTER.md
-   FEATURE_APPROVE_DENY.md
-   FEATURE_ACTIVITY_LOGS.md

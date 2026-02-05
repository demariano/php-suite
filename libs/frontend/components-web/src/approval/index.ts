/**
 * Approval Components Barrel Export
 *
 * Re-exports all approval-related components for easy importing.
 *
 * @example
 * import {
 *   ApprovalActionButtons,
 *   DeletionApprovalCard,
 *   DeactivationApprovalCard,
 *   FieldDiffRow,
 *   ArrayDiffTable,
 *   ChangeSummaryCard,
 *   computeArrayDiff,
 * } from '@components-web/approval';
 */

// Components
export { ApprovalActionButtons } from './ApprovalActionButtons';
export type { ApprovalActionButtonsProps } from './ApprovalActionButtons';

export { DeletionApprovalCard } from './DeletionApprovalCard';
export type { DeletionApprovalCardProps } from './DeletionApprovalCard';

export { DeactivationApprovalCard } from './DeactivationApprovalCard';
export type { DeactivationApprovalCardProps } from './DeactivationApprovalCard';

export { FieldDiffContainer, FieldDiffHeader, FieldDiffRow } from './FieldDiffRow';
export type { FieldDiffContainerProps, FieldDiffRowProps } from './FieldDiffRow';

export { ArrayDiffTable } from './ArrayDiffTable';
export type { ArrayDiffColumn, ArrayDiffTableProps } from './ArrayDiffTable';

export { ChangeSummaryCard } from './ChangeSummaryCard';
export type { ArrayChangeSummary, ChangeSummaryCardProps } from './ChangeSummaryCard';

export { ChangeReasonReadOnly } from './ChangeReasonReadOnly';
export type { ChangeReasonReadOnlyProps } from './ChangeReasonReadOnly';

// Utilities
export {
    DEFAULT_ARRAY_DIFF_EXCLUDE_FIELDS,
    computeArrayDiff,
    getDiffStatusClasses,
    getDiffStatusLabel,
} from './computeArrayDiff';
export type { ArrayDiffItem, ArrayDiffResult, ArrayDiffStatus, ComputeArrayDiffOptions } from './computeArrayDiff';

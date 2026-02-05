/**
 * Form Components Barrel Export
 *
 * Re-exports all form-related reusable components for easy importing.
 *
 * @example
 * import {
 *   FormActionButtons,
 *   FormSectionCard,
 *   ValidationErrors,
 *   EditFormTabs,
 *   InnerRecordTable,
 * } from '@components-web/form-components';
 */

// Components
export { FormActionButtons } from './FormActionButtons';
export type { FormActionButtonsProps } from './FormActionButtons';

export { FormSectionCard } from './FormSectionCard';
export type { FormSectionCardProps, FormSectionIcon } from './FormSectionCard';

export { ValidationErrors } from './ValidationErrors';
export type { ValidationErrorsProps } from './ValidationErrors';

export { EditFormTabs } from './EditFormTabs';
export type { EditFormTab, EditFormTabsProps } from './EditFormTabs';

export { InnerRecordTable } from './InnerRecordTable';
export type { InnerRecordColumn, InnerRecordTableProps } from './InnerRecordTable';

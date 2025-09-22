export type FieldType = 'input' | 'textarea' | 'select' | 'checkbox';
// upload = 'upload',
// select = 'select',
// multiInputs = 'multiInputs',
// colorPicker = 'colorPicker',
// multiSelect = 'multiSelect',
// nestedDropdown = 'nestedDropdown',
// nestedMultiSelect = 'nestedMultiSelect'
// }

export type FormSection = {
    sectionTitle?: string;
    fields: FormStructureItem[][];
};

export type InputType = 'text' | 'password' | 'number'; //  | 'email' | 'datetime' | 'datetime-local' | 'date' | 'month' | 'time' | 'week' | 'email' | 'url' | 'search' | 'tel' | 'color'

export type FormStructureItem = {
    label: string;
    name: string;
    fieldType?: FieldType;
    inputType?: InputType;
    // portion: 2 | 4 | 6 | 12,
    maxLength?: number;
    options?: Option[];
    placeholder?: string;
    disabled?: boolean;
    extra?: string | React.ReactNode;
    // for uploading file
    uploadUrl?: string;
    onScrolledToBottom?: (value: boolean) => void;
    isInfiniteScrollable?: boolean;
    isSpacer?: boolean;
    // TODO set actual string type
    autoComplete?: string;
};

export type Option = {
    value: string | number;
    label: string;
};

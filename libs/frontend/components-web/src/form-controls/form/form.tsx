'use client';

import { yupResolver } from '@hookform/resolvers/yup';
import clsx from 'classnames';
import { Fragment, ReactNode, useCallback } from 'react';
import {
    Controller, ControllerFieldState, ControllerRenderProps, DefaultValues, FieldPath, Path,
    SubmitHandler, UseFormStateReturn, useForm
} from 'react-hook-form';
import { useImmer } from 'use-immer';
import { AnyObjectSchema } from 'yup';
import { Typography } from '../../data-display/typography/typography';
import { EyeOff } from '../../icons/EyeOff';
import { EyeOn } from '../../icons/EyeOn';
import { FormSection, FormStructureItem, Option } from '../../types/input';
import { Button } from '../button/button';
import Checkbox from '../checkbox/checkbox';
import { DropdownOptions } from '../dropdown-options/dropdown-options';
import Input from '../input/input';
import styles from './form.module.scss';

export interface FormProps<T> {
    className?: string;
    data?: DefaultValues<T>;
    structure: FormSection[];
    onSubmitForm: (data: T) => void;
    /**
     * For reference, here is yup docs https://github.com/jquense/yup
     */
    schema: AnyObjectSchema;
    isShowLabels?: boolean;
    formSize?: 'sm' | 'lg';

    // submit button
    submitLabel?: string;
    isProcessing?: boolean;

    // close button
    withCloseButton?: boolean;
    closeLabel?: string;
    isButtonFullWidth?: boolean;

    children?: ReactNode;
    resultError?: { [key: string]: string };
    resetResultError?: () => void;
}

export const Form = <T extends object>({
    className = '',
    data,
    structure,
    onSubmitForm,
    schema,
    // isShowLabels = true,
    // formSize = 'sm',
    submitLabel = 'Submit',
    isProcessing = false,
    withCloseButton,
    closeLabel = 'Close',
    // isButtonFullWidth,
    children,
    resultError,
    resetResultError,
}: FormProps<T>): JSX.Element => {
    const [viewPassword, setViewPassword] = useImmer<string[]>([]);

    const { control, handleSubmit } = useForm({
        resolver: yupResolver(schema),
        defaultValues: data || undefined,
    });

    const onSubmit: SubmitHandler<T> = (data): void => {
        onSubmitForm(data);
    };

    const handleClose = () => {
        // dispatch(clearModalContent());
    };

    const toggleVisible = useCallback(
        (key: string) => {
            const index = viewPassword.findIndex((v) => v === key);

            setViewPassword((currentValue) => {
                if (index === -1) {
                    currentValue.push(key);
                } else {
                    currentValue.splice(index, 1);
                }
            });
        },
        [viewPassword]
    );

    const renderField = (
        {
            field: { onChange, value },
            fieldState: { error },
        }: {
            field: ControllerRenderProps<T, Path<T>>;
            fieldState: ControllerFieldState;
            formState: UseFormStateReturn<T>;
        },
        col: FormStructureItem
    ) => {
        switch (col.fieldType) {
            case 'select':
                return (
                    <DropdownOptions
                        name={col.name}
                        value={col.options?.find((opt) => opt.value === value)}
                        label={col.label}
                        options={col.options || []}
                        placeholder={col.placeholder}
                        variant={
                            col.disabled || isProcessing
                                ? 'disabled'
                                : error?.message
                                    ? 'error'
                                    : 'default'
                        }
                        helperText={
                            error?.message || resultError?.[col.name] || ''
                        }
                        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                        // @ts-ignore
                        onChange={(v: Option) => onChange(v?.value)}
                    />
                );
            case 'checkbox':
                return (
                    <Checkbox
                        isChecked={value || undefined}
                        label={col.label}
                        onClick={onChange}
                    />
                );
            default:
                return (
                    <Input
                        name={col.name}
                        label={col.label}
                        // value={(value as unknown as string) || ''}
                        defaultValue={(value as unknown as string) || undefined}
                        placeholder={col.placeholder}
                        component={col.fieldType}
                        type={
                            col.inputType === 'password' &&
                                viewPassword.includes(col.name)
                                ? 'text'
                                : col.inputType || 'text'
                        }
                        variant={
                            col.disabled || isProcessing
                                ? 'disabled'
                                : error?.message
                                    ? 'error'
                                    : 'default'
                        }
                        helperText={
                            error?.message || resultError?.[col.name] || ''
                        }
                        onChange={(event) => {
                            onChange(event);
                            // eslint-disable-next-line @typescript-eslint/no-unused-expressions, no-prototype-builtins
                            resultError?.hasOwnProperty(col.name) &&
                                resetResultError &&
                                resetResultError();
                        }}
                        rightIcon={
                            col.inputType === 'password'
                                ? viewPassword.includes(col.name)
                                    ? EyeOn
                                    : EyeOff
                                : undefined
                        }
                        onRightIconClick={() => toggleVisible(col.name)}
                        extraDetail={col.extra}
                    />
                );
        }
    };

    return (
        <form
            className={clsx(styles['form'], className)}
            onSubmit={handleSubmit(onSubmit)}
        >
            <div className="w-full">
                {structure.map((sec, s) => (
                    <Fragment key={`sec-${s}`}>
                        {sec.sectionTitle && (
                            <Typography
                                variant="h6"
                                className={clsx('mb-4', { 'mt-6': !!s })}
                            >
                                {sec.sectionTitle}
                            </Typography>
                        )}

                        {sec.fields.map((row, r) => (
                            <div className="flex gap-3" key={`row-${r}`}>
                                {row.map((col: FormStructureItem, c) =>
                                    col.isSpacer ? (
                                        <div className="flex-1" key={`col-${c}`} />
                                    ) : (
                                        <div
                                            className={clsx('pb-2 flex-1 relative', {
                                                'pt-4': col.fieldType !== 'checkbox',
                                            })}
                                            key={`col-${c}`}
                                        >
                                            <Controller
                                                control={control}
                                                name={col.name as FieldPath<T>}
                                                // defaultValue={data && data.hasOwnProperty(col.name) ? data[col.name] : null}
                                                render={(props) =>
                                                    renderField(props, col)
                                                }
                                            />
                                        </div>
                                    )
                                )}
                            </div>
                        ))}
                    </Fragment>
                ))}
            </div>

            {children}

            <div className={'flex flex-row gap-3 pt-7 w-full justify-end'} >
                {withCloseButton && (
                    <Button
                        label={closeLabel}
                        onClick={handleClose}
                        className="flex-1"
                    />
                )}
                <Button
                    label={submitLabel}
                    type="submit"
                    disabled={isProcessing}
                    className="flex-1"
                    isProcessing={isProcessing}
                />
            </div>
        </form>
    );
};

export default Form;

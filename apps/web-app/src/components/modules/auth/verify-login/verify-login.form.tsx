'use client';

import { Button, Typography } from '@components-web';
import Spinner from '@components-web/data-display/spinner/spinner';
import inputStyles from '@components-web/form-controls/input/input.module.scss';
import { useCountdown } from '@data-access/hooks/useCountdown';
import { useSessionStore } from '@data-access/state-management';
import { CognitoDto } from '@dto';
import { ROUTES, STORAGE_KEY } from '@utils/config/constants';
import cn from 'classnames';
import Cookies from 'js-cookie';
import { useRouter } from 'next/navigation';
import { ChangeEvent, useEffect, useRef, useState } from 'react';
import { useHandleResendOTP } from './useHandleResendOTP';
import { useHandleVerifyLogin } from './useHandleVerifyLogin';
import styles from './verify-login.module.scss';

const VerifyLoginForm = () => {
    const router = useRouter();
    const { tempLoginInfo } = useSessionStore();
    const verifyLoginMutation = useHandleVerifyLogin();
    const resendOTPMutation = useHandleResendOTP();
    const { countdown, enableCounting, isCounting } = useCountdown();

    const [otp, setOtp] = useState<string[]>(new Array(6).fill(''));
    const [activeOTPIndex, setActiveOTPIndex] = useState<number>(0);
    const [isError, setIsError] = useState<boolean>(false);

    // Create an array of refs for each input
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    const handleOnChange = (
        { target }: ChangeEvent<HTMLInputElement>,
        index: number
    ) => {
        const { value } = target;
        const newOtp: string[] = [...otp];
        const val = value.substring(value.length - 1);

        // check if value entered is number
        const isNumber = /[0-9]/.test(val);

        newOtp[index] = isNumber ? val : '';

        // Update OTP state
        setOtp(newOtp);

        // Move to next/previous input based on value
        if (!val) {
            // If cleared, move to previous input
            setActiveOTPIndex(Math.max(0, index - 1));
        } else if (isNumber && index < 5) {
            // If number entered and not last input, move to next
            setActiveOTPIndex(index + 1);
        }

        // Clear error state when user starts typing
        if (isError) {
            setIsError(false);
        }
    };

    const handleOnKeyDown = (
        e: React.KeyboardEvent<HTMLInputElement>,
        index: number
    ) => {
        if (e.key === 'Backspace') {
            // If current input is empty and backspace is pressed, move to previous input
            if (!otp[index] && index > 0) {
                setActiveOTPIndex(index - 1);
            }
        }
    };

    const handleVerify = async () => {
        if (otp.includes('')) {
            setIsError(true);
            return;
        }

        verifyLoginMutation.mutateAsync({
            email: tempLoginInfo?.email || '',
            code: otp.join(''),
            session: Cookies.get(STORAGE_KEY.COGNITO_SESSION) as string,
        });
    };

    const handleRequestNew = async () => {
        resendOTPMutation.mutateAsync(tempLoginInfo as CognitoDto);
        enableCounting(true);
    };

    useEffect(() => {
        // if tempLoginInfo is not defined, redirect to login page
        if (!tempLoginInfo || tempLoginInfo === undefined) {
            router.push(ROUTES.AUTH_LOGIN);
        }
    }, [tempLoginInfo]);

    // Focus the active input whenever activeOTPIndex changes
    useEffect(() => {
        if (inputRefs.current[activeOTPIndex]) {
            inputRefs.current[activeOTPIndex]?.focus();
        }
    }, [activeOTPIndex]);

    useEffect(() => {
        enableCounting(true);
        // Focus the first input on component mount
        if (inputRefs.current[0]) {
            inputRefs.current[0]?.focus();
        }
    }, []);

    return (
        <div className={styles['verify-login']}>
            <Typography variant="h3">
                Please confirm your account by entering the verification code
                sent to {tempLoginInfo?.email}
            </Typography>

            <div>
                <div className={styles['verify-login__otp']}>
                    {otp.map((_, index) => (
                        <div
                            key={index}
                            className={cn(
                                inputStyles['input-wrapper'],
                                styles['verify-login__otp-input'],
                                {
                                    [inputStyles['input-error']]: isError,
                                }
                            )}
                        >
                            <div className={inputStyles['input-field']}>
                                <input
                                    ref={(el) => {
                                        inputRefs.current[index] = el;
                                    }}
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    className={inputStyles['input']}
                                    onChange={(e) => handleOnChange(e, index)}
                                    onKeyDown={(e) => handleOnKeyDown(e, index)}
                                    value={otp[index]}
                                />
                            </div>
                        </div>
                    ))}
                </div>

                {isError && (
                    <Typography className={styles['verify-login__error']}>
                        Please enter the verification code completely
                    </Typography>
                )}
            </div>

            <Button
                label="Verify"
                className="w-full"
                isProcessing={verifyLoginMutation.isPending}
                onClick={handleVerify}
            />

            <div>
                <Typography>
                    It may take a minute to receive your code.
                </Typography>
                <div>
                    {isCounting ? (
                        <Typography>
                            Resend code in {countdown}
                        </Typography>
                    ) : (
                        <div className={styles['verify-login__resend']}>
                            <Typography>Haven&apos;t received it?</Typography>

                            {resendOTPMutation.isPending ? (
                                <Spinner />
                            ) : (
                                <div
                                    onClick={handleRequestNew}
                                    className="cursor-pointer"
                                >
                                    <Typography variant="body1-thicker">
                                        Resend a new code
                                    </Typography>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default VerifyLoginForm;

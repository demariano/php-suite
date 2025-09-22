import { Typography } from '@components-web';
import cn from 'classnames';
import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ReactNode, useMemo } from 'react';
import { LoginForm, NewPasswordForm, RegisterForm, VerifyLoginForm } from '../../../components/modules/auth';
import styles from './styles.module.scss';

type AuthAction = 'login' | 'verify-login' | 'registration' | 'set-new-password';

interface IAuthActionPage {
    params: {
        action: AuthAction
    }
}

const checkActionSlug = (action: AuthAction) => {
    const validActions: AuthAction[] = ['login', 'verify-login', 'registration', 'set-new-password'];

    if (!validActions.includes(action)) {
        redirect('/404');
    }
}

const AuthActionPage: React.FC<IAuthActionPage> = ({ params: { action } }) => {
    checkActionSlug(action);

    const pageCopy = useMemo(() => {
        let copy: { title: ReactNode, description?: ReactNode } = {
            title: 'Welcome\nback',
            description: <>
                Log in to your account
                <br /><br />
                No account? Register <Link href='/auth/registration'>here.</Link>
            </>
        }

        if (action === 'verify-login') {
            copy = {
                title: 'Verify that\nit’s you',
                description: undefined
            }
        }

        if (action === 'registration') {
            copy = {
                title: 'Register',
                description: <>
                    Already has an account?
                    <br /><br />
                    Log in <Link href='/auth/login'>here.</Link>
                </>
            }
        }

        if (action === 'set-new-password') {
            copy = {
                title: <>Set your new password</>,
                description: undefined
            }
        }

        return copy;
    }, [action]);

    return (
        <div className={cn(styles['auth-action'], { [styles[`--${action}`]]: !!action })}>
            <div className={styles['auth-action__content']}>
                <div className='w-[28rem] pb-3 mt-10'>
                    <div className={styles['auth-action__title']}>
                        <Typography
                            variant='h1'
                            className={styles['auth-action__title-header']}>
                            {pageCopy.title}
                        </Typography>

                        {pageCopy.description && (
                            <Typography
                                variant='h3'
                                className={styles['auth-action__title-instruction']}>
                                {pageCopy.description}
                            </Typography>
                        )}
                    </div>

                    <div className={styles['auth-action__form']}>
                        {action === 'login'
                            ? <LoginForm />
                            : action === 'verify-login'
                                ? <VerifyLoginForm />
                            : action === 'registration'
                                ? <RegisterForm />
                                : <NewPasswordForm />
                        }
                    </div>
                </div>
            </div>

            <div className={styles['auth-action__cover-background']}>
                <div className={styles['auth-action__cover-overlay']} />
                <Image
                    src="/assets/images/oldst_logo.png"
                    alt="Authentication cover logo"
                    className={styles['auth-action__cover-logo']}
                    width={500}
                    height={340} />
            </div>
        </div>
    )
}

export default AuthActionPage;
// import { getUserDetailsByEmail, patchUserDetails } from "@web-app/api/user";
import {
    AdminInitiateAuthCommandOutput,
    AdminRespondToAuthChallengeCommandOutput,
} from '@aws-sdk/client-cognito-identity-provider';
import { CognitoDto, CognitoVerifyMfaDto } from '@dto';
import { ROUTES, STORAGE_KEY } from '@utils/config/constants';
import Cookies from 'js-cookie';
import { usePathname, useRouter } from 'next/navigation';
import { useLocalStore } from '../local-state-management';
import { useSessionStore } from '../state-management';
import { disconnectSocket } from '../websocket/socket';
// import { ResponseDto } from '@dto';

export type AuthResponse = {
    email: string;
    data: {
        AuthenticationResult: {
            AccessToken: string;
            IdToken: string;
            RefreshToken: string;
        };
    };
};

const useAuth = () => {
    const router = useRouter();
    const pathname = usePathname();

    const {
        resetAll: resetSessionStore,
        setFlashNotification,
        updateTempLoginInfo,
        clearTempLoginInfo,
    } = useSessionStore();

    const { updateAuthedUser, resetAll: resetLocalStore } = useLocalStore();

    // Used for logging and setting new password for NEW_PASSWORD_REQUIRED
    const authenticationUser = async (
        resp:
            | AdminRespondToAuthChallengeCommandOutput
            | AdminInitiateAuthCommandOutput,
        data: CognitoDto | CognitoVerifyMfaDto,
        shouldUpdate?: boolean
    ) => {
        updateAuthedUser({
            email: data.email,
        });

        if (resp.ChallengeName === 'EMAIL_OTP') {
            updateTempLoginInfo(data);
            Cookies.set(STORAGE_KEY.COGNITO_SESSION, resp.Session as string);

            router.push(ROUTES.AUTH_VERIFY_LOGIN);
        } else if (resp.ChallengeName === 'NEW_PASSWORD_REQUIRED') {
            updateTempLoginInfo(data);
            Cookies.set(STORAGE_KEY.COGNITO_SESSION, resp.Session as string);

            router.push(ROUTES.AUTH_COMPLETE_PROFILE);
        } else {
            setFlashNotification({
                title: 'Successfully logged in',
                message: 'Redirecting to dashboard...',
                alertType: 'success',
            });

            Cookies.set(
                STORAGE_KEY.ACCESS_TOKEN,
                resp.AuthenticationResult?.AccessToken as string
            );
            Cookies.set(
                STORAGE_KEY.REFRESH_TOKEN,
                resp.AuthenticationResult?.RefreshToken as string
            );
            Cookies.set(
                STORAGE_KEY.ID_TOKEN,
                resp.AuthenticationResult?.IdToken as string
            );

            // const { email, firstName, lastName } = data;
            // let userDetails: ProfileData = {};

            // TODO update user details if needed
            // ({ data: userDetails } = await getUserDetailsByEmail(email));

            if (shouldUpdate) {
                //     ({ data: userDetails } = await patchUserDetails({
                //         id: userDetails.id,
                //         firstName,
                //         lastName
                //     }))
            }

            router.replace(ROUTES.DASHBOARD);

            setTimeout(() => {
                clearTempLoginInfo();
                Cookies.remove(STORAGE_KEY.COGNITO_SESSION);
            }, 5000);
        }
    };

    const clearUserDetails = () => {
        Cookies.remove(STORAGE_KEY.ACCESS_TOKEN);
        Cookies.remove(STORAGE_KEY.REFRESH_TOKEN);
        Cookies.remove(STORAGE_KEY.ID_TOKEN);

        // Disconnect websocket when user logs out
        disconnectSocket();

        resetSessionStore();
        resetLocalStore();
    };

    const bypassAuth = () => {
        const bypassEmail = 'admin@old.st';
        const bypassToken = 'bypass-auth-token';
        const publicPaths = [ROUTES.AUTH_LOGIN, ROUTES.AUTH_SIGNUP];

        updateAuthedUser({
            email: bypassEmail,
        });

        Cookies.set(STORAGE_KEY.ACCESS_TOKEN, bypassToken);
        Cookies.set(STORAGE_KEY.REFRESH_TOKEN, bypassToken);
        Cookies.set(STORAGE_KEY.ID_TOKEN, bypassToken);

        // redirect to dashboard if on public path
        if (publicPaths.includes(pathname.split('?')[0])) {
            router.replace(ROUTES.DASHBOARD);
        }
    };

    return { authenticationUser, clearUserDetails, bypassAuth };
};

export default useAuth;

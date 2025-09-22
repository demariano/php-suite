import '@components-web/styles/index.scss';
import { NextPage } from 'next';
import { DEFAULT_METADATA } from '../config/metadata';
import { ILayout } from '../types/layout';
import './global.scss';

export const metadata = DEFAULT_METADATA;

const RootLayout: NextPage<ILayout> = async ({ children }) => {
    return (
        <html lang="en">
            <body>
                {children}
            </body>
        </html>
    );
}
export default RootLayout;
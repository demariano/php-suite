import { render } from '@testing-library/react';

import FlashNotification from './flash-notification';

describe('FlashNotification', () => {
    it('should render successfully', () => {
        const { baseElement } = render(<FlashNotification />);

        expect(baseElement).toBeTruthy();
    });
});

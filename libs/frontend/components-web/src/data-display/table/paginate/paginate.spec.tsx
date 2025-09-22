import { render } from '@testing-library/react';

import Paginate from './paginate';

describe('Paginate', () => {
    it('should render successfully', () => {
        const { baseElement } = render(<Paginate />);

        expect(baseElement).toBeTruthy();
    });
});

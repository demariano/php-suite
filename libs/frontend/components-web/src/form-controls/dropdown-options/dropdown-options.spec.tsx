import { render } from '@testing-library/react';

import DropdownOptions from './dropdown-options';

describe('DropdownOptions', () => {
    it('should render successfully', () => {
        const { baseElement } = render(<DropdownOptions />);

        expect(baseElement).toBeTruthy();
    });
});

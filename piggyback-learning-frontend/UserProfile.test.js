
import { render, screen } from '@testing-library/react';
import UserProfile from './UserProfile';

test('renders user profile', () => {
    render(<UserProfile />);
    const profileName = screen.getByText(/Ian Tyler Applebaum/i);
    expect(profileName).toBeInTheDocument();
});

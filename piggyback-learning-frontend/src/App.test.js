import { render, screen } from '@testing-library/react';
import App from './App';

test('renders Piggyback Learning homepage', () => {
  render(<App />);
  const headingElement = screen.getByText(/Welcome to Piggyback Learning!/i);
  expect(headingElement).toBeInTheDocument();
});


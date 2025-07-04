import React from 'react';
import { render, screen } from '@testing-library/react';
import LoadingSpinner from '../../components/LoadingSpinner';

describe('LoadingSpinner', () => {
  it('renders with default props', () => {
    render(<LoadingSpinner />);
    
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders with custom text', () => {
    const customText = 'Saving data...';
    render(<LoadingSpinner text={customText} />);
    
    expect(screen.getByText(customText)).toBeInTheDocument();
  });

  it('renders with large size', () => {
    render(<LoadingSpinner size="lg" />);
    
    const spinner = screen.getByRole('status');
    expect(spinner).toHaveClass('w-12', 'h-12');
  });

  it('renders with medium size by default', () => {
    render(<LoadingSpinner />);
    
    const spinner = screen.getByRole('status');
    expect(spinner).toHaveClass('w-8', 'h-8');
  });

  it('renders with small size', () => {
    render(<LoadingSpinner size="sm" />);
    
    const spinner = screen.getByRole('status');
    expect(spinner).toHaveClass('w-4', 'h-4');
  });

  it('has proper ARIA attributes', () => {
    render(<LoadingSpinner text="Loading data..." />);
    
    const spinner = screen.getByRole('status');
    expect(spinner).toHaveAttribute('aria-label', 'Loading data...');
  });

  it('contains the spinning animation element', () => {
    render(<LoadingSpinner />);
    
    const spinningElement = screen.getByRole('status').querySelector('.animate-spin');
    expect(spinningElement).toBeInTheDocument();
  });
}); 
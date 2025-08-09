import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import AddressAutocomplete from '../../components/AddressAutocomplete';

// Mock fetch
global.fetch = jest.fn();

describe('AddressAutocomplete', () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  it('renders address input with search icon', () => {
    render(
      <AddressAutocomplete 
        value="" 
        onChange={() => {}} 
        placeholder="Enter address" 
      />
    );

    expect(screen.getByPlaceholderText('Enter address')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('calls onChange when input value changes', () => {
    const mockOnChange = jest.fn();
    render(
      <AddressAutocomplete 
        value="" 
        onChange={mockOnChange} 
        placeholder="Enter address" 
      />
    );

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '123 Main St' } });

    expect(mockOnChange).toHaveBeenCalledWith('123 Main St');
  });

  it('shows loading spinner when searching', async () => {
    fetch.mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        json: () => Promise.resolve([])
      }), 100))
    );

    render(
      <AddressAutocomplete 
        value="" 
        onChange={() => {}} 
        placeholder="Enter address" 
      />
    );

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '123 Main Street' } });

    // Wait for debounced search to trigger
    await waitFor(() => {
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    }, { timeout: 500 });
  });

  it('displays suggestions when API returns results', async () => {
    const mockResponse = {
      success: true,
      suggestions: [
        {
          id: '1',
          displayName: '123 Main St, Anytown, CA 12345, USA',
          address: {
            street: '123 Main St',
            city: 'Anytown',
            state: 'CA',
            zipCode: '12345',
            country: 'USA'
          },
          lat: 37.7749,
          lon: -122.4194
        }
      ]
    };

    fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse)
    });

    render(
      <AddressAutocomplete 
        value="" 
        onChange={() => {}} 
        placeholder="Enter address" 
      />
    );

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '123 Main Street' } });

    await waitFor(() => {
      expect(screen.getByText('123 Main St')).toBeInTheDocument();
      expect(screen.getByText('Anytown, CA 12345')).toBeInTheDocument();
    });
  });

  it('calls onAddressSelect when suggestion is clicked', async () => {
    const mockOnAddressSelect = jest.fn();
    const mockResponse = {
      success: true,
      suggestions: [
        {
          id: '1',
          displayName: '123 Main St, Anytown, CA 12345, USA',
          address: {
            street: '123 Main St',
            city: 'Anytown',
            state: 'CA',
            zipCode: '12345',
            country: 'USA'
          },
          lat: 37.7749,
          lon: -122.4194
        }
      ]
    };

    fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse)
    });

    render(
      <AddressAutocomplete 
        value="" 
        onChange={() => {}} 
        onAddressSelect={mockOnAddressSelect}
        placeholder="Enter address" 
      />
    );

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '123 Main Street' } });

    await waitFor(() => {
      expect(screen.getByText('123 Main St')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('123 Main St'));

    expect(mockOnAddressSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        address: {
          street: '123 Main St',
          city: 'Anytown',
          state: 'CA',
          zipCode: '12345',
          country: 'USA'
        }
      })
    );
  });

  it('shows clear button when input has value', () => {
    render(
      <AddressAutocomplete 
        value="123 Main St" 
        onChange={() => {}} 
        placeholder="Enter address" 
      />
    );

    expect(screen.getByTitle('Clear address')).toBeInTheDocument();
  });

  it('clears input when clear button is clicked', () => {
    const mockOnChange = jest.fn();
    render(
      <AddressAutocomplete 
        value="123 Main St" 
        onChange={mockOnChange} 
        placeholder="Enter address" 
      />
    );

    const clearButton = screen.getByTitle('Clear address');
    fireEvent.click(clearButton);

    expect(mockOnChange).toHaveBeenCalledWith('');
  });

  it('does not search for queries shorter than 3 characters', () => {
    render(
      <AddressAutocomplete 
        value="" 
        onChange={() => {}} 
        placeholder="Enter address" 
      />
    );

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'ab' } });

    expect(fetch).not.toHaveBeenCalled();
  });
}); 
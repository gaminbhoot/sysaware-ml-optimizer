import { render, screen, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FleetView } from './FleetView';
import { MemoryRouter } from 'react-router-dom';
import { NotificationProvider } from '../context/NotificationContext';
import { NotificationContainer } from '../components/Notification';

// Mock the API calls
global.fetch = vi.fn();

describe('FleetView Robustness', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderWithProviders = (ui: React.ReactNode) => {
    return render(
      <NotificationProvider>
        <MemoryRouter>
          {ui}
          <NotificationContainer />
        </MemoryRouter>
      </NotificationProvider>
    );
  };

  it('renders loading state initially and then data', async () => {
    (fetch as any).mockResolvedValueOnce({
      json: async () => ({ status: 'success', history: [] })
    });
    (fetch as any).mockResolvedValueOnce({
      json: async () => ({ status: 'success', nodes: [] })
    });

    renderWithProviders(<FleetView />);

    expect(screen.getByText('Infrastructure')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.getByText('No active nodes detected. Ensure your CLI or Server is running.')).toBeInTheDocument();
    });
  });

  it('handles API failure gracefully', async () => {
    // Mock a network failure
    (fetch as any).mockRejectedValue(new Error('Network Error'));

    renderWithProviders(<FleetView />);

    // Should still show the heading even if data fetch fails
    expect(screen.getByText('Infrastructure')).toBeInTheDocument();
    
    // Should show error notification
    await waitFor(() => {
      expect(screen.getByText('Sync Failed')).toBeInTheDocument();
      expect(screen.getByText('Could not connect to the telemetry server. Retrying...')).toBeInTheDocument();
    });
  });

  it('renders active nodes correctly', async () => {
    const mockNodes = [
      {
        machine_id: 'test_machine_linux',
        hardware_profile: { cpu: 'Intel i7', ram_gb: 32 },
        status: 'benchmarking',
        last_seen: new Date().toISOString()
      }
    ];

    (fetch as any).mockResolvedValueOnce({
      json: async () => ({ status: 'success', history: [] })
    });
    (fetch as any).mockResolvedValueOnce({
      json: async () => ({ status: 'success', nodes: mockNodes })
    });

    renderWithProviders(<FleetView />);

    await waitFor(() => {
      expect(screen.getByText('test')).toBeInTheDocument(); // Machine ID split
      expect(screen.getByText('Intel i7')).toBeInTheDocument();
      expect(screen.getByText('benchmarking')).toBeInTheDocument();
    });
  });

  it('handles malformed API response gracefully', async () => {
    (fetch as any).mockResolvedValueOnce({
      json: async () => ({ status: 'success', history: null }) // malformed history
    });
    (fetch as any).mockResolvedValueOnce({
      json: async () => ({ status: 'success', nodes: undefined }) // missing nodes
    });

    renderWithProviders(<FleetView />);

    await waitFor(() => {
      expect(screen.getByText('Infrastructure')).toBeInTheDocument();
    });
    
    // Should not crash and show empty state
    expect(screen.getByText('No active nodes detected. Ensure your CLI or Server is running.')).toBeInTheDocument();
  });

  it('renders join request modal when SSE message received', async () => {
    (fetch as any).mockResolvedValue({
      json: async () => ({ status: 'success', history: [], nodes: [] })
    });

    renderWithProviders(<FleetView />);

    // Get the EventSource instance created by the component
    // We need to trigger its onmessage handler
    const eventSourceInstance = vi.mocked(EventSource).mock.results[0].value;
    
    await act(async () => {
      eventSourceInstance.onmessage({
        data: JSON.stringify({ type: 'join_request', machine_id: 'new_node_id' })
      });
    });

    expect(screen.getByText('Join Request')).toBeInTheDocument();
    expect(screen.getByText('new_node_id')).toBeInTheDocument();
  });
});

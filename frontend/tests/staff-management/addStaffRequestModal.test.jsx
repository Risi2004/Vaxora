import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import AddStaffRequestModal from '../../src/features/hospital/components/AddStaffRequestModal';
import staffService from '../../src/features/hospital/services/staffService';

vi.mock('../../src/features/hospital/services/staffService', () => ({
  default: {
    searchCandidates: vi.fn(),
  },
}));

describe('Staff Management - Add Staff Request Modal', () => {
  const onClose = vi.fn();
  const onSendRequest = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders invite modal fields when open', () => {
    render(
      <AddStaffRequestModal
        isOpen
        onClose={onClose}
        onSendRequest={onSendRequest}
      />
    );

    expect(screen.getByRole('heading', { name: /add new staff/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/kasun|doctor\.demo|vax-d/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send request/i })).toBeInTheDocument();
  });

  it('shows validation when submitting without selecting a practitioner', async () => {
    render(
      <AddStaffRequestModal
        isOpen
        onClose={onClose}
        onSendRequest={onSendRequest}
      />
    );

    fireEvent.submit(screen.getByRole('button', { name: /send request/i }).closest('form'));

    expect(
      await screen.findByText(/search by name, email, or vaxora id, then select a practitioner/i)
    ).toBeInTheDocument();
    expect(onSendRequest).not.toHaveBeenCalled();
  });

  it('searches candidates, selects one, and submits invitation', async () => {
    staffService.searchCandidates.mockResolvedValue([
      {
        registrationNumber: 'VAX-D-9001',
        fullName: 'Dr Kasun Silva',
        email: 'doctor.demo@vaxora.lk',
        role: 'DOCTOR',
        specialization: 'Immunology',
        alreadyAffiliated: false,
      },
    ]);
    onSendRequest.mockResolvedValue({});

    render(
      <AddStaffRequestModal
        isOpen
        onClose={onClose}
        onSendRequest={onSendRequest}
      />
    );

    const input = screen.getByPlaceholderText(/kasun|doctor\.demo|vax-d/i);
    fireEvent.change(input, { target: { value: 'Kasun' } });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });

    const candidate = await screen.findByText('Dr Kasun Silva');
    fireEvent.click(candidate);

    expect(screen.getByText(/selected:/i)).toBeInTheDocument();
    expect(screen.getByText('Dr Kasun Silva')).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /send request/i }));
    });

    await waitFor(() => {
      expect(onSendRequest).toHaveBeenCalledWith('VAX-D-9001');
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('blocks already-affiliated candidates from being invited again', async () => {
    staffService.searchCandidates.mockResolvedValue([
      {
        registrationNumber: 'VAX-D-9002',
        fullName: 'Dr Already Linked',
        email: 'linked@vaxora.lk',
        role: 'DOCTOR',
        alreadyAffiliated: true,
      },
    ]);

    render(
      <AddStaffRequestModal
        isOpen
        onClose={onClose}
        onSendRequest={onSendRequest}
      />
    );

    fireEvent.change(screen.getByPlaceholderText(/kasun|doctor\.demo|vax-d/i), {
      target: { value: 'Already' },
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });

    expect(await screen.findByText(/already invited or affiliated/i)).toBeInTheDocument();
    fireEvent.click(screen.getByText('Dr Already Linked'));

    // Disabled candidate should not become selected / submitable
    fireEvent.submit(screen.getByRole('button', { name: /send request/i }).closest('form'));
    expect(onSendRequest).not.toHaveBeenCalled();
  });
});

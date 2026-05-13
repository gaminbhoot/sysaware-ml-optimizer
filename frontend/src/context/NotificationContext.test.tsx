import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { NotificationProvider, useNotification } from './NotificationContext';
import { ReactNode } from 'react';

const wrapper = ({ children }: { children: ReactNode }) => (
  <NotificationProvider>{children}</NotificationProvider>
);

describe('NotificationContext', () => {
  it('should initialize with empty notifications', () => {
    const { result } = renderHook(() => useNotification(), { wrapper });
    expect(result.current.notifications).toEqual([]);
  });

  it('should add a notification', () => {
    const { result } = renderHook(() => useNotification(), { wrapper });

    act(() => {
      result.current.addNotification({
        type: 'success',
        message: 'Test message'
      });
    });

    expect(result.current.notifications).toHaveLength(1);
    expect(result.current.notifications[0]).toMatchObject({
      type: 'success',
      message: 'Test message'
    });
    expect(result.current.notifications[0].id).toBeDefined();
  });

  it('should remove a notification', () => {
    const { result } = renderHook(() => useNotification(), { wrapper });

    act(() => {
      result.current.addNotification({
        type: 'info',
        message: 'To be removed'
      });
    });

    const id = result.current.notifications[0].id;

    act(() => {
      result.current.removeNotification(id);
    });

    expect(result.current.notifications).toHaveLength(0);
  });

  it('should auto-remove notification after duration', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useNotification(), { wrapper });

    act(() => {
      result.current.addNotification({
        type: 'warning',
        message: 'Auto remove',
        duration: 1000
      });
    });

    expect(result.current.notifications).toHaveLength(1);

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.notifications).toHaveLength(0);
    vi.useRealTimers();
  });
});

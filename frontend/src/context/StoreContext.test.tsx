import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { StoreProvider, useStore } from '../context/StoreContext';
import { type ReactNode } from 'react';

const wrapper = ({ children }: { children: ReactNode }) => (
  <StoreProvider>{children}</StoreProvider>
);

describe('StoreContext', () => {
  it('should initialize with default values', () => {
    const { result } = renderHook(() => useStore(), { wrapper });

    expect(result.current.goal).toBe('latency');
    expect(result.current.modelPath).toBe('');
    expect(result.current.isTuning).toBe(false);
    expect(result.current.systemProfile).toBe(null);
  });

  it('should update goal', () => {
    const { result } = renderHook(() => useStore(), { wrapper });

    act(() => {
      result.current.setGoal('memory');
    });

    expect(result.current.goal).toBe('memory');
  });

  it('should update model path', () => {
    const { result } = renderHook(() => useStore(), { wrapper });

    act(() => {
      result.current.setModelPath('/path/to/model.pt');
    });

    expect(result.current.modelPath).toBe('/path/to/model.pt');
  });

  it('should throw error when used outside of StoreProvider', () => {
    // Suppress console.error for this test as we expect an error
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    expect(() => renderHook(() => useStore())).toThrow('useStore must be used within StoreProvider');
    
    consoleSpy.mockRestore();
  });
});

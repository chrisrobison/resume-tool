/**
 * Example Test File
 * Demonstrates Vitest testing patterns and setup
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockElement, simulateEvent, waitFor } from '../setup.js';

describe('Example Test Suite', () => {
  describe('DOM Manipulation', () => {
    it('should create mock elements', () => {
      const button = createMockElement('button', {
        class: 'test-button',
        id: 'test-btn'
      });

      expect(button.tagName).toBe('BUTTON');
      expect(button.className).toBe('test-button');
      expect(button.id).toBe('test-btn');
    });

    it('should simulate events', () => {
      const button = createMockElement('button');
      const clickHandler = vi.fn();
      button.addEventListener('click', clickHandler);

      simulateEvent(button, 'click');

      expect(clickHandler).toHaveBeenCalledTimes(1);
    });
  });

  describe('LocalStorage Mock', () => {
    beforeEach(() => {
      localStorage.clear();
    });

    it('should store and retrieve data', () => {
      localStorage.setItem('test-key', 'test-value');
      const value = localStorage.getItem('test-key');

      expect(value).toBe('test-value');
    });

    it('should remove data', () => {
      localStorage.setItem('test-key', 'test-value');
      localStorage.removeItem('test-key');

      expect(localStorage.getItem('test-key')).toBeNull();
    });

    it('should clear all data', () => {
      localStorage.setItem('key1', 'value1');
      localStorage.setItem('key2', 'value2');
      localStorage.clear();

      expect(localStorage.length).toBe(0);
    });
  });

  describe('Async Operations', () => {
    it('should handle promises', async () => {
      const result = await Promise.resolve('success');
      expect(result).toBe('success');
    });

    it('should use waitFor helper', async () => {
      let counter = 0;
      setTimeout(() => { counter = 5; }, 100);

      await waitFor(() => counter === 5);

      expect(counter).toBe(5);
    });
  });

  describe('Mock Functions', () => {
    it('should create and verify mock functions', () => {
      const mockFn = vi.fn((x) => x * 2);

      const result = mockFn(5);

      expect(result).toBe(10);
      expect(mockFn).toHaveBeenCalledWith(5);
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should mock return values', () => {
      const mockFn = vi.fn();
      mockFn.mockReturnValue('mocked');

      expect(mockFn()).toBe('mocked');
    });

    it('should mock resolved promises', async () => {
      const mockFn = vi.fn();
      mockFn.mockResolvedValue('async result');

      const result = await mockFn();

      expect(result).toBe('async result');
    });
  });

  describe('Fetch Mock', () => {
    it('should mock fetch calls', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: 'test' })
      });

      const response = await fetch('/api/test');
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.data).toBe('test');
    });
  });
});

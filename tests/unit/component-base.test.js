/**
 * Unit Tests for ComponentBase
 * Tests the base class for all Web Components
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ComponentBase, FormValidationMixin, ModalMixin } from '../../js/component-base.js';

// Mock the store module
vi.mock('../../js/store.js', () => ({
  getState: vi.fn(() => ({ test: 'state' })),
  setState: vi.fn(),
  subscribe: vi.fn(() => vi.fn()) // Returns unsubscribe function
}));

// Register ComponentBase as a custom element for testing
if (!customElements.get('test-component-base')) {
  customElements.define('test-component-base', ComponentBase);
}

describe('ComponentBase', () => {
  let component;
  let mockAppManager;

  beforeEach(() => {
    // Create mock app manager
    mockAppManager = {
      registerComponent: vi.fn(),
      unregisterComponent: vi.fn(),
      handleComponentError: vi.fn(),
      showToast: vi.fn(),
      showModal: vi.fn(),
      closeModal: vi.fn()
    };

    // Make app manager globally available
    global.window.appManager = mockAppManager;

    // Create test component using DOM method
    component = document.createElement('test-component-base');
  });

  afterEach(() => {
    if (component && component._isConnected) {
      component.disconnectedCallback();
    }
    global.window.appManager = null;
  });

  describe('Constructor', () => {
    it('should initialize with default properties', () => {
      expect(component._data).toBeNull();
      expect(component._isInitialized).toBe(false);
      expect(component._isConnected).toBe(false);
      expect(component._storeSubscription).toBeNull();
      expect(component._appManager).toBeNull();
    });

    it('should set component name and generate unique ID', () => {
      expect(component._componentName).toBe('ComponentBase');
      expect(component._componentId).toBeTruthy();
      expect(component._componentId).toMatch(/^componentbase_\d+_[a-z0-9]+$/);
    });

    it('should bind standard methods', () => {
      expect(typeof component.setData).toBe('function');
      expect(typeof component.getData).toBe('function');
      expect(typeof component.refresh).toBe('function');
      expect(typeof component.validate).toBe('function');
    });

    it('should generate unique IDs for different instances', () => {
      const component2 = document.createElement('test-component-base');
      expect(component._componentId).not.toBe(component2._componentId);
    });
  });

  describe('connectedCallback', () => {
    it('should set _isConnected to true', async () => {
      // Skip dependency check for this test
      component._skipDependencyCheck = true;
      await component.connectedCallback();
      expect(component._isConnected).toBe(true);
    });

    it('should not reconnect if already connected', async () => {
      component._skipDependencyCheck = true;
      component._isConnected = true;
      const initSpy = vi.spyOn(component, 'initialize');

      await component.connectedCallback();

      expect(initSpy).not.toHaveBeenCalled();
    });

    it('should call waitForDependencies and initialize', async () => {
      component._skipDependencyCheck = true;
      const waitSpy = vi.spyOn(component, 'waitForDependencies');
      const initSpy = vi.spyOn(component, 'initialize');

      await component.connectedCallback();
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(waitSpy).toHaveBeenCalled();
      expect(initSpy).toHaveBeenCalled();
    });
  });

  describe('disconnectedCallback', () => {
    it('should set _isConnected to false', () => {
      component._isConnected = true;
      component.disconnectedCallback();
      expect(component._isConnected).toBe(false);
    });

    it('should call cleanup', () => {
      const cleanupSpy = vi.spyOn(component, 'cleanup');
      component.disconnectedCallback();
      expect(cleanupSpy).toHaveBeenCalled();
    });

    it('should handle errors during cleanup', () => {
      vi.spyOn(component, 'cleanup').mockImplementation(() => {
        throw new Error('Cleanup failed');
      });

      // Should not throw
      expect(() => component.disconnectedCallback()).not.toThrow();
    });
  });

  describe('waitForDependencies', () => {
    it('should resolve immediately if skipDependencyCheck is true', async () => {
      component._skipDependencyCheck = true;
      await expect(component.waitForDependencies()).resolves.toBeUndefined();
    });

    it('should wait for dependencies to be ready', async () => {
      const promise = component.waitForDependencies();

      // Dependencies should be found (mocked)
      await promise;

      expect(component._appManager).toBeTruthy();
    });

    it('should timeout after max attempts', async () => {
      // Remove app manager
      global.window.appManager = null;

      const promise = component.waitForDependencies();
      await promise; // Should resolve even without dependencies

      expect(component._appManager).toBeNull();
    }, 10000); // Increase timeout for this test
  });

  describe('initialize', () => {
    beforeEach(() => {
      component._skipDependencyCheck = true;
    });

    it('should not initialize twice', async () => {
      await component.initialize();
      const onInitSpy = vi.spyOn(component, 'onInitialize');

      await component.initialize();

      expect(onInitSpy).not.toHaveBeenCalled();
    });

    it('should register with app manager', async () => {
      component._appManager = mockAppManager;
      await component.initialize();

      expect(mockAppManager.registerComponent).toHaveBeenCalledWith(
        component._componentId,
        component
      );
    });

    it('should subscribe to store', async () => {
      const subscribeSpy = vi.spyOn(component, 'subscribeToStore');
      await component.initialize();

      expect(subscribeSpy).toHaveBeenCalled();
    });

    it('should call onInitialize hook', async () => {
      const onInitSpy = vi.spyOn(component, 'onInitialize');
      await component.initialize();

      expect(onInitSpy).toHaveBeenCalled();
    });

    it('should set _isInitialized to true', async () => {
      await component.initialize();
      expect(component._isInitialized).toBe(true);
    });

    it('should emit component-initialized event', async () => {
      const emitSpy = vi.spyOn(component, 'emitEvent');
      await component.initialize();

      expect(emitSpy).toHaveBeenCalledWith('component-initialized', {
        componentId: component._componentId
      });
    });

    it('should handle initialization errors', async () => {
      const error = new Error('Init error');
      vi.spyOn(component, 'onInitialize').mockRejectedValue(error);
      const errorSpy = vi.spyOn(component, 'handleError');

      await component.initialize();

      expect(errorSpy).toHaveBeenCalledWith(error, 'Failed to initialize component');
    });
  });

  describe('setData', () => {
    it('should update component data', () => {
      const testData = { test: 'value' };
      component.setData(testData);

      expect(component._data).toEqual(testData);
    });

    it('should call onDataChange hook', () => {
      const onDataChangeSpy = vi.spyOn(component, 'onDataChange');
      const testData = { test: 'value' };

      component.setData(testData, 'test-source');

      expect(onDataChangeSpy).toHaveBeenCalledWith(testData, null, 'test-source', null);
    });

    it('should emit data-changed event', () => {
      const emitSpy = vi.spyOn(component, 'emitEvent');
      const testData = { test: 'value' };

      component.setData(testData, 'test-source', 'origin-id');

      expect(emitSpy).toHaveBeenCalledWith('data-changed', {
        componentId: component._componentId,
        data: testData,
        previousData: null,
        source: 'test-source',
        origin: 'origin-id'
      });
    });

    it('should track previous data', () => {
      const data1 = { test: 'value1' };
      const data2 = { test: 'value2' };
      const onDataChangeSpy = vi.spyOn(component, 'onDataChange');

      component.setData(data1);
      component.setData(data2);

      expect(onDataChangeSpy).toHaveBeenLastCalledWith(data2, data1, 'external', null);
    });

    it('should handle errors during setData', () => {
      vi.spyOn(component, 'onDataChange').mockImplementation(() => {
        throw new Error('Data change error');
      });
      const errorSpy = vi.spyOn(component, 'handleError');

      component.setData({ test: 'value' });

      expect(errorSpy).toHaveBeenCalled();
    });
  });

  describe('getData', () => {
    it('should return current data', () => {
      const testData = { test: 'value' };
      component._data = testData;

      expect(component.getData()).toEqual(testData);
    });

    it('should return null if no data set', () => {
      expect(component.getData()).toBeNull();
    });
  });

  describe('refresh', () => {
    it('should skip refresh if not initialized', async () => {
      const onRefreshSpy = vi.spyOn(component, 'onRefresh');

      await component.refresh();

      expect(onRefreshSpy).not.toHaveBeenCalled();
    });

    it('should call onRefresh when initialized', async () => {
      component._isInitialized = true;
      const onRefreshSpy = vi.spyOn(component, 'onRefresh');

      await component.refresh();

      expect(onRefreshSpy).toHaveBeenCalledWith(false);
    });

    it('should force refresh when requested', async () => {
      const onRefreshSpy = vi.spyOn(component, 'onRefresh');

      await component.refresh(true);

      expect(onRefreshSpy).toHaveBeenCalledWith(true);
    });

    it('should emit component-refreshed event', async () => {
      component._isInitialized = true;
      const emitSpy = vi.spyOn(component, 'emitEvent');

      await component.refresh(true);

      expect(emitSpy).toHaveBeenCalledWith('component-refreshed', {
        componentId: component._componentId,
        forced: true
      });
    });

    it('should handle refresh errors', async () => {
      component._isInitialized = true;
      vi.spyOn(component, 'onRefresh').mockRejectedValue(new Error('Refresh error'));
      const errorSpy = vi.spyOn(component, 'handleError');

      await component.refresh();

      expect(errorSpy).toHaveBeenCalled();
    });
  });

  describe('validate', () => {
    it('should return valid by default', () => {
      const result = component.validate();

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should call onValidate hook', () => {
      const onValidateSpy = vi.spyOn(component, 'onValidate');

      component.validate();

      expect(onValidateSpy).toHaveBeenCalled();
    });

    it('should handle validation errors', () => {
      vi.spyOn(component, 'onValidate').mockImplementation(() => {
        throw new Error('Validation error');
      });

      const result = component.validate();

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Validation error occurred');
    });
  });

  describe('emitEvent', () => {
    it('should dispatch custom event', () => {
      const dispatchSpy = vi.spyOn(component, 'dispatchEvent');
      const detail = { test: 'data' };

      component.emitEvent('test-event', detail);

      expect(dispatchSpy).toHaveBeenCalled();
      const event = dispatchSpy.mock.calls[0][0];
      expect(event.detail).toEqual(detail);
      expect(event.bubbles).toBe(true);
      expect(event.composed).toBe(true);
    });

    it('should handle bubbles parameter', () => {
      const dispatchSpy = vi.spyOn(component, 'dispatchEvent');

      component.emitEvent('test-event', null, false);

      const event = dispatchSpy.mock.calls[0][0];
      expect(event.bubbles).toBe(false);
    });

    it('should handle event dispatch errors', () => {
      vi.spyOn(component, 'dispatchEvent').mockImplementation(() => {
        throw new Error('Dispatch error');
      });

      // Should not throw
      expect(() => component.emitEvent('test-event')).not.toThrow();
    });
  });

  describe('handleError', () => {
    it('should log error to console', () => {
      const consoleSpy = vi.spyOn(console, 'error');
      const error = new Error('Test error');

      component.handleError(error, 'test context');

      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should emit component-error event', () => {
      const emitSpy = vi.spyOn(component, 'emitEvent');
      const error = new Error('Test error');

      component.handleError(error, 'test context');

      expect(emitSpy).toHaveBeenCalledWith('component-error', expect.objectContaining({
        componentId: component._componentId,
        componentName: 'ComponentBase',
        error: 'Test error',
        context: 'test context'
      }));
    });

    it('should notify app manager if available', () => {
      component._appManager = mockAppManager;
      const error = new Error('Test error');

      component.handleError(error, 'test context');

      expect(mockAppManager.handleComponentError).toHaveBeenCalledWith(
        component._componentId,
        error,
        'test context'
      );
    });
  });

  describe('cleanup', () => {
    it('should unsubscribe from store', () => {
      const unsubscribe = vi.fn();
      component._storeSubscription = unsubscribe;

      component.cleanup();

      expect(unsubscribe).toHaveBeenCalled();
      expect(component._storeSubscription).toBeNull();
    });

    it('should call onCleanup hook', () => {
      const onCleanupSpy = vi.spyOn(component, 'onCleanup');

      component.cleanup();

      expect(onCleanupSpy).toHaveBeenCalled();
    });

    it('should unregister from app manager', () => {
      component._appManager = mockAppManager;
      component._isInitialized = true;

      component.cleanup();

      expect(mockAppManager.unregisterComponent).toHaveBeenCalledWith(component._componentId);
    });

    it('should set _isInitialized to false', () => {
      component._isInitialized = true;

      component.cleanup();

      expect(component._isInitialized).toBe(false);
    });

    it('should handle cleanup errors', () => {
      vi.spyOn(component, 'onCleanup').mockImplementation(() => {
        throw new Error('Cleanup error');
      });

      // Should not throw
      expect(() => component.cleanup()).not.toThrow();
    });
  });

  describe('getMetadata', () => {
    it('should return component metadata', () => {
      component._data = { test: 'value' };
      component._isInitialized = true;
      component._isConnected = true;

      const metadata = component.getMetadata();

      expect(metadata).toEqual({
        componentName: 'ComponentBase',
        componentId: component._componentId,
        isInitialized: true,
        isConnected: true,
        hasData: true,
        dataType: 'object'
      });
    });

    it('should handle null data', () => {
      const metadata = component.getMetadata();

      expect(metadata.hasData).toBe(false);
      expect(metadata.dataType).toBeNull();
    });
  });

  describe('updateGlobalState', () => {
    it('should call setState with updates', async () => {
      const { setState } = await import('../../js/store.js');
      const updates = { test: 'value' };

      component.updateGlobalState(updates, 'test-source', 'origin-id');

      expect(setState).toHaveBeenCalledWith(updates, 'test-source', 'origin-id');
    });

    it('should use component name as default source', async () => {
      const { setState } = await import('../../js/store.js');

      component.updateGlobalState({ test: 'value' });

      expect(setState).toHaveBeenCalledWith(
        { test: 'value' },
        expect.stringContaining('ComponentBase'),
        component._componentId
      );
    });

    it('should handle setState errors', async () => {
      const { setState } = await import('../../js/store.js');
      setState.mockImplementation(() => {
        throw new Error('setState error');
      });
      const errorSpy = vi.spyOn(component, 'handleError');

      component.updateGlobalState({ test: 'value' });

      expect(errorSpy).toHaveBeenCalled();
    });
  });

  describe('getGlobalState', () => {
    it('should return state from store', async () => {
      const { getState } = await import('../../js/store.js');
      getState.mockReturnValue({ test: 'state' });

      const state = component.getGlobalState();

      expect(state).toEqual({ test: 'state' });
    });

    it('should handle path parameter', async () => {
      const { getState } = await import('../../js/store.js');

      component.getGlobalState('test.path');

      expect(getState).toHaveBeenCalledWith('test.path');
    });

    it('should handle getState errors', async () => {
      const { getState } = await import('../../js/store.js');
      getState.mockImplementation(() => {
        throw new Error('getState error');
      });

      const result = component.getGlobalState();

      expect(result).toBeNull();
    });
  });

  describe('showToast', () => {
    it('should call app manager showToast', () => {
      component._appManager = mockAppManager;

      component.showToast('Test message', 'success');

      expect(mockAppManager.showToast).toHaveBeenCalledWith('Test message', 'success');
    });

    it('should use default type', () => {
      component._appManager = mockAppManager;

      component.showToast('Test message');

      expect(mockAppManager.showToast).toHaveBeenCalledWith('Test message', 'info');
    });

    it('should handle missing app manager', () => {
      const consoleSpy = vi.spyOn(console, 'log');

      component.showToast('Test message');

      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe('isReady', () => {
    it('should return false when not initialized', () => {
      component._isConnected = true;
      expect(component.isReady()).toBe(false);
    });

    it('should return false when not connected', () => {
      component._isInitialized = true;
      expect(component.isReady()).toBe(false);
    });

    it('should return true when both initialized and connected', () => {
      component._isInitialized = true;
      component._isConnected = true;
      expect(component.isReady()).toBe(true);
    });
  });
});

describe('FormValidationMixin', () => {
  let component;

  beforeEach(() => {
    component = document.createElement('test-component-base');
  });

  describe('validateForm', () => {
    it('should return error if form not found', () => {
      const result = component.validateForm(null);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Form not found');
    });

    it('should validate required fields', () => {
      const form = document.createElement('form');
      const input = document.createElement('input');
      input.setAttribute('required', '');
      input.name = 'testField';
      input.value = '';
      form.appendChild(input);

      const result = component.validateForm(form);

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('testField');
    });

    it('should pass when required fields have values', () => {
      const form = document.createElement('form');
      const input = document.createElement('input');
      input.setAttribute('required', '');
      input.value = 'test value';
      form.appendChild(input);

      const result = component.validateForm(form);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should validate email fields', () => {
      const form = document.createElement('form');
      const input = document.createElement('input');
      input.type = 'email';
      input.name = 'emailField';
      input.value = 'invalid-email';
      form.appendChild(input);

      const result = component.validateForm(form);

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('emailField');
    });

    it('should validate URL fields', () => {
      const form = document.createElement('form');
      const input = document.createElement('input');
      input.type = 'url';
      input.name = 'urlField';
      input.value = 'not-a-url';
      form.appendChild(input);

      const result = component.validateForm(form);

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('urlField');
    });
  });

  describe('isValidEmail', () => {
    it('should validate correct email', () => {
      expect(component.isValidEmail('test@example.com')).toBe(true);
    });

    it('should reject invalid email', () => {
      expect(component.isValidEmail('invalid-email')).toBe(false);
      expect(component.isValidEmail('no@domain')).toBe(false);
      expect(component.isValidEmail('@example.com')).toBe(false);
    });
  });

  describe('isValidURL', () => {
    it('should validate correct URL', () => {
      expect(component.isValidURL('https://example.com')).toBe(true);
      expect(component.isValidURL('http://test.org')).toBe(true);
    });

    it('should reject invalid URL', () => {
      expect(component.isValidURL('not-a-url')).toBe(false);
      expect(component.isValidURL('just plain text')).toBe(false);
    });
  });
});

describe('ModalMixin', () => {
  let component;
  let mockAppManager;

  beforeEach(() => {
    mockAppManager = {
      showModal: vi.fn(),
      closeModal: vi.fn()
    };
    component = document.createElement('test-component-base');
    component._appManager = mockAppManager;
  });

  describe('showModal', () => {
    it('should call app manager showModal', () => {
      component.showModal('test-modal', { data: 'test' });

      expect(mockAppManager.showModal).toHaveBeenCalledWith('test-modal', { data: 'test' });
    });

    it('should handle missing app manager', () => {
      component._appManager = null;
      const consoleSpy = vi.spyOn(console, 'warn');

      component.showModal('test-modal');

      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe('closeModal', () => {
    it('should call app manager closeModal', () => {
      component.closeModal('test-modal');

      expect(mockAppManager.closeModal).toHaveBeenCalledWith('test-modal');
    });

    it('should handle missing app manager', () => {
      component._appManager = null;
      const consoleSpy = vi.spyOn(console, 'warn');

      component.closeModal('test-modal');

      expect(consoleSpy).toHaveBeenCalled();
    });
  });
});

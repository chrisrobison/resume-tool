/**
 * A simple reactive state management system using JavaScript Proxies
 */

/**
 * Creates a reactive state object that notifies subscribers of changes
 * @param {Object} initialState - The initial state object
 * @returns {Object} - A reactive state object with subscribe/unsubscribe methods
 */
export function createStore(initialState = {}) {
  // Deep clone the initial state to avoid mutation of the original object
  const state = JSON.parse(JSON.stringify(initialState));
  const subscribers = new Set();
  
  // Create a proxy to track all state changes
  const stateProxy = new Proxy(state, {
    set(target, property, value) {
      const oldValue = target[property];
      // Only update and notify if the value actually changed
      if (JSON.stringify(oldValue) !== JSON.stringify(value)) {
        target[property] = value;
        notifySubscribers({ property, oldValue, newValue: value });
      }
      return true;
    },
    
    deleteProperty(target, property) {
      if (property in target) {
        const oldValue = target[property];
        delete target[property];
        notifySubscribers({ property, oldValue, newValue: undefined, deleted: true });
      }
      return true;
    }
  });
  
  /**
   * Creates a deep proxy for nested objects to maintain reactivity
   * @param {Object} obj - Object to make reactive
   * @param {String} path - Current property path
   * @returns {Proxy} - A reactive proxy object
   */
  function makeDeepReactive(obj, path = '') {
    // Return primitive values as is
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }
    
    // Process arrays and objects
    Object.keys(obj).forEach(key => {
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        obj[key] = makeDeepReactive(obj[key], path ? `${path}.${key}` : key);
      }
    });
    
    return new Proxy(obj, {
      set(target, property, value) {
        const oldValue = target[property];
        // Handle nested objects by making them reactive too
        if (typeof value === 'object' && value !== null) {
          value = makeDeepReactive(value, path ? `${path}.${property}` : property);
        }
        
        // Only update and notify if the value actually changed
        if (JSON.stringify(oldValue) !== JSON.stringify(value)) {
          target[property] = value;
          const propPath = path ? `${path}.${property}` : property;
          notifySubscribers({ property: propPath, oldValue, newValue: value });
        }
        return true;
      },
      
      deleteProperty(target, property) {
        if (property in target) {
          const oldValue = target[property];
          delete target[property];
          const propPath = path ? `${path}.${property}` : property;
          notifySubscribers({ property: propPath, oldValue, newValue: undefined, deleted: true });
        }
        return true;
      }
    });
  }
  
  // Make the initial state deeply reactive
  Object.keys(state).forEach(key => {
    if (typeof state[key] === 'object' && state[key] !== null) {
      state[key] = makeDeepReactive(state[key], key);
    }
  });
  
  /**
   * Notifies all subscribers about state changes
   * @param {Object} change - Details about what changed in the state
   */
  function notifySubscribers(change) {
    subscribers.forEach(subscriber => {
      subscriber(stateProxy, change);
    });
  }
  
  return {
    /**
     * The reactive state object
     */
    state: stateProxy,
    
    /**
     * Subscribe to state changes
     * @param {Function} subscriber - Callback that receives the state and change details
     * @returns {Function} - Unsubscribe function
     */
    subscribe(subscriber) {
      subscribers.add(subscriber);
      return () => {
        subscribers.delete(subscriber);
      };
    },
    
    /**
     * Unsubscribe from state changes
     * @param {Function} subscriber - The subscriber function to remove
     */
    unsubscribe(subscriber) {
      subscribers.delete(subscriber);
    },
    
    /**
     * Batch multiple state updates with a single notification
     * @param {Function} updateFn - Function that receives the state and makes multiple updates
     */
    batch(updateFn) {
      const originalNotify = notifySubscribers;
      const changes = [];
      
      // Temporarily replace the notify function to collect changes
      notifySubscribers = (change) => {
        changes.push(change);
      };
      
      // Make the changes
      updateFn(stateProxy);
      
      // Restore the original notify function and notify once with all changes
      notifySubscribers = originalNotify;
      if (changes.length > 0) {
        subscribers.forEach(subscriber => {
          subscriber(stateProxy, { batch: true, changes });
        });
      }
    },
    
    /**
     * Reset the state to a new value
     * @param {Object} newState - The new state object
     */
    reset(newState = {}) {
      // Clear the current state
      Object.keys(state).forEach(key => {
        delete state[key];
      });
      
      // Add the new state properties
      Object.entries(newState).forEach(([key, value]) => {
        if (typeof value === 'object' && value !== null) {
          state[key] = makeDeepReactive(JSON.parse(JSON.stringify(value)), key);
        } else {
          state[key] = value;
        }
      });
      
      notifySubscribers({ reset: true, newState: stateProxy });
    },
    
    /**
     * Get a snapshot of the current state as a plain object
     * @returns {Object} - Plain object representation of the state
     */
    getSnapshot() {
      return JSON.parse(JSON.stringify(state));
    }
  };
}

/**
 * Binds an HTML input element to a state property
 * @param {HTMLElement} element - The input element to bind
 * @param {Object} state - The reactive state object
 * @param {String} path - Dot notation path to the state property
 */
export function bindInput(element, state, path) {
  // Handle dot notation paths like 'basics.name'
  const setNestedValue = (obj, path, value) => {
    const parts = path.split('.');
    const lastProp = parts.pop();
    let current = obj;
    
    // Navigate to the correct property
    for (const part of parts) {
      if (!current[part] || typeof current[part] !== 'object') {
        current[part] = {};
      }
      current = current[part];
    }
    
    // Set the value
    current[lastProp] = value;
  };
  
  // Get a nested value from an object using dot notation
  const getNestedValue = (obj, path) => {
    return path.split('.').reduce((acc, part) => 
      acc && acc[part] !== undefined ? acc[part] : '', obj);
  };
  
  // Set initial value from state
  const value = getNestedValue(state, path);
  if (value !== undefined) {
    if (element.type === 'checkbox') {
      element.checked = Boolean(value);
    } else {
      element.value = value;
    }
  }
  
  // Update element when state changes
  const updateFromState = (state) => {
    const newValue = getNestedValue(state, path);
    if (element.type === 'checkbox') {
      element.checked = Boolean(newValue);
    } else if (element.value !== newValue && newValue !== undefined) {
      element.value = newValue;
    }
  };
  
  // Listen for changes to update the state
  const updateState = () => {
    let value;
    if (element.type === 'checkbox') {
      value = element.checked;
    } else if (element.type === 'number') {
      value = element.value === '' ? '' : Number(element.value);
    } else {
      value = element.value;
    }
    setNestedValue(state, path, value);
  };
  
  // Add event listeners
  element.addEventListener('input', updateState);
  element.addEventListener('change', updateState);
  
  return updateFromState;
}

/**
 * Creates a binding between a form element and a state object
 * @param {HTMLFormElement} formElement - The form element containing inputs
 * @param {Object} state - The reactive state object
 * @param {String} basePath - Base path to add before the input name
 * @returns {Function} - Function to update all bound form elements
 */
export function bindForm(formElement, state, basePath = '') {
  const updateFunctions = new Map();
  
  // Find all input elements in the form
  const inputs = formElement.querySelectorAll('input, textarea, select');
  
  inputs.forEach(input => {
    if (!input.name) return;
    
    const path = basePath ? `${basePath}.${input.name}` : input.name;
    const updateFn = bindInput(input, state, path);
    updateFunctions.set(input, updateFn);
  });
  
  // Return a function that updates all inputs from the state
  return (newState) => {
    updateFunctions.forEach(updateFn => updateFn(newState || state));
  };
}
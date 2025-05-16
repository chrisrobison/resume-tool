/**
 * UI and data utility helper functions
 */

/**
 * Creates and renders list items from a data array
 * @param {Array} items - Array of data items
 * @param {Function} renderFn - Function that renders a single item and returns an HTML element
 * @param {HTMLElement} container - Container to append items to
 * @param {Object} options - Additional options
 * @returns {void}
 */
export function renderList(items, renderFn, container, options = {}) {
  const { emptyMessage, emptyClass, onItemClick } = options;
  
  // Clear the container first
  container.innerHTML = '';
  
  // Display empty state if there are no items
  if (!items || items.length === 0) {
    if (emptyMessage) {
      const emptyEl = document.createElement('div');
      emptyEl.className = emptyClass || 'empty-state';
      emptyEl.innerHTML = emptyMessage;
      container.appendChild(emptyEl);
    }
    return;
  }
  
  // Create and append each item
  items.forEach((item, index) => {
    const element = renderFn(item, index);
    
    // Add click handler if provided
    if (onItemClick && element) {
      element.addEventListener('click', (e) => {
        onItemClick(item, index, e);
      });
    }
    
    if (element) {
      container.appendChild(element);
    }
  });
}

/**
 * Sets up a modal with open/close functionality
 * @param {HTMLElement} modalElement - The modal element to bind
 * @param {Object} options - Modal options
 * @returns {Object} - Modal control methods
 */
export function bindModal(modalElement, options = {}) {
  const { 
    closeSelector = '.modal-close, .modal-cancel',
    onOpen, 
    onClose,
    beforeOpen,
    beforeClose,
    animation = true
  } = options;
  
  // Find close buttons
  const closeButtons = modalElement.querySelectorAll(closeSelector);
  
  // Set up close functionality for buttons
  closeButtons.forEach(button => {
    button.addEventListener('click', () => {
      close();
    });
  });
  
  // Close when clicking outside the modal content
  modalElement.addEventListener('click', (e) => {
    if (e.target === modalElement) {
      close();
    }
  });
  
  // Close on escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modalElement.classList.contains('hidden')) {
      close();
    }
  });
  
  // Open the modal
  function open() {
    if (beforeOpen && beforeOpen() === false) {
      return false;
    }
    
    if (animation) {
      modalElement.classList.remove('hidden');
      // Force a reflow for the animation to work
      void modalElement.offsetWidth;
      modalElement.classList.add('show');
    } else {
      modalElement.classList.remove('hidden');
    }
    
    if (onOpen) onOpen();
    return true;
  }
  
  // Close the modal
  function close() {
    if (beforeClose && beforeClose() === false) {
      return false;
    }
    
    if (animation) {
      modalElement.classList.remove('show');
      modalElement.addEventListener('transitionend', function handler() {
        modalElement.classList.add('hidden');
        modalElement.removeEventListener('transitionend', handler);
      }, { once: true });
    } else {
      modalElement.classList.add('hidden');
    }
    
    if (onClose) onClose();
    return true;
  }
  
  return {
    open,
    close,
    isOpen: () => !modalElement.classList.contains('hidden')
  };
}

/**
 * Creates a toast notification
 * @param {String} message - Message to display
 * @param {Object} options - Toast options
 * @returns {HTMLElement} - The toast element
 */
export function showToast(message, options = {}) {
  const { 
    type = 'success', 
    duration = 3000,
    parent = document.body
  } = options;
  
  // Create or reuse toast container
  let toastContainer = document.getElementById('toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.style.cssText = `
      position: fixed;
      bottom: 1rem;
      right: 1rem;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    `;
    parent.appendChild(toastContainer);
  }
  
  // Create toast element
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  
  // Add to container
  toastContainer.appendChild(toast);
  
  // Show the toast (with a slight delay for animation)
  setTimeout(() => {
    toast.classList.add('show');
  }, 10);
  
  // Auto remove after duration
  setTimeout(() => {
    toast.classList.remove('show');
    toast.addEventListener('transitionend', () => {
      toastContainer.removeChild(toast);
      
      // Remove container if empty
      if (toastContainer.children.length === 0) {
        parent.removeChild(toastContainer);
      }
    }, { once: true });
  }, duration);
  
  return toast;
}

/**
 * Format a date string in a human-readable format
 * @param {String} dateString - Date string in YYYY-MM-DD format
 * @param {Boolean} includeDay - Whether to include the day
 * @returns {String} - Formatted date string
 */
export function formatDate(dateString, includeDay = false) {
  if (!dateString) return '';
  if (dateString.toLowerCase() === 'present') return 'Present';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date)) return dateString;
    
    const options = {
      year: 'numeric',
      month: 'short',
      day: includeDay ? 'numeric' : undefined
    };
    
    return date.toLocaleDateString(undefined, options);
  } catch (error) {
    return dateString;
  }
}

/**
 * Generate a random ID
 * @returns {String} - Random ID
 */
export function generateId() {
  return Math.random().toString(36).substring(2, 15);
}

/**
 * Create an element with attributes and children
 * @param {String} tagName - HTML tag name
 * @param {Object} attributes - Element attributes
 * @param {Array|HTMLElement|String} children - Child elements or text
 * @returns {HTMLElement} - The created element
 */
export function createElement(tagName, attributes = {}, children = []) {
  const element = document.createElement(tagName);
  
  // Set attributes
  Object.entries(attributes).forEach(([key, value]) => {
    if (key === 'className') {
      element.className = value;
    } else if (key === 'dataset') {
      Object.entries(value).forEach(([dataKey, dataValue]) => {
        element.dataset[dataKey] = dataValue;
      });
    } else if (key.startsWith('on') && typeof value === 'function') {
      element.addEventListener(key.substring(2).toLowerCase(), value);
    } else {
      element.setAttribute(key, value);
    }
  });
  
  // Add children
  if (children) {
    if (Array.isArray(children)) {
      children.forEach(child => {
        if (child) {
          if (typeof child === 'string') {
            element.appendChild(document.createTextNode(child));
          } else {
            element.appendChild(child);
          }
        }
      });
    } else if (typeof children === 'string') {
      element.textContent = children;
    } else {
      element.appendChild(children);
    }
  }
  
  return element;
}

/**
 * Converts an array of text lines into a list of items
 * @param {String} text - Text with items separated by line breaks
 * @returns {Array} - Array of trimmed items
 */
export function textToList(text) {
  if (!text) return [];
  return text.split('\n')
    .map(item => item.trim())
    .filter(item => item.length > 0);
}

/**
 * Converts an array into a text string with items on separate lines
 * @param {Array} list - Array of items
 * @returns {String} - Text with items separated by line breaks
 */
export function listToText(list) {
  if (!list || !Array.isArray(list)) return '';
  return list.join('\n');
}

/**
 * Debounce function to limit how often a function is called
 * @param {Function} func - Function to debounce
 * @param {Number} wait - Wait time in milliseconds
 * @returns {Function} - Debounced function
 */
export function debounce(func, wait = 300) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}
/**
 * ConfirmationModal component - Generic confirmation dialog
 */
export class ConfirmationModal extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._isOpen = false;
    this._title = 'Confirm Action';
    this._message = 'Are you sure you want to proceed?';
    this._confirmLabel = 'Confirm';
    this._cancelLabel = 'Cancel';
    this._confirmClass = 'primary';
    this._onConfirm = null;
    this._onCancel = null;
  }
  
  /**
   * Set the dialog title
   */
  set title(value) {
    this._title = value;
    const titleEl = this.shadowRoot.querySelector('.modal-title');
    if (titleEl) titleEl.textContent = value;
  }
  
  get title() {
    return this._title;
  }
  
  /**
   * Set the dialog message
   */
  set message(value) {
    this._message = value;
    const messageEl = this.shadowRoot.querySelector('.modal-message');
    if (messageEl) messageEl.textContent = value;
  }
  
  get message() {
    return this._message;
  }
  
  /**
   * Set the confirmation button label
   */
  set confirmLabel(value) {
    this._confirmLabel = value;
    const confirmBtn = this.shadowRoot.querySelector('#confirm-button');
    if (confirmBtn) confirmBtn.textContent = value;
  }
  
  get confirmLabel() {
    return this._confirmLabel;
  }
  
  /**
   * Set the cancel button label
   */
  set cancelLabel(value) {
    this._cancelLabel = value;
    const cancelBtn = this.shadowRoot.querySelector('#cancel-button');
    if (cancelBtn) cancelBtn.textContent = value;
  }
  
  get cancelLabel() {
    return this._cancelLabel;
  }
  
  /**
   * Set the confirmation button class
   */
  set confirmClass(value) {
    this._confirmClass = value;
    const confirmBtn = this.shadowRoot.querySelector('#confirm-button');
    if (confirmBtn) {
      confirmBtn.className = value || 'primary';
    }
  }
  
  get confirmClass() {
    return this._confirmClass;
  }
  
  /**
   * Set the confirmation callback
   */
  set onConfirm(callback) {
    this._onConfirm = callback;
  }
  
  /**
   * Set the cancel callback
   */
  set onCancel(callback) {
    this._onCancel = callback;
  }
  
  connectedCallback() {
    this.render();
    this.setupEventListeners();
  }
  
  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
        }
        
        .modal-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-color: rgba(0, 0, 0, 0.5);
          display: none;
          justify-content: center;
          align-items: center;
          z-index: 1000;
          opacity: 0;
          transition: opacity 0.3s ease;
        }
        
        .modal-backdrop.show {
          display: flex;
          opacity: 1;
        }
        
        .modal {
          background-color: white;
          border-radius: 0.5rem;
          padding: 1.5rem;
          width: 90%;
          max-width: 500px;
          transform: translateY(20px);
          transition: transform 0.3s ease;
        }
        
        .modal-backdrop.show .modal {
          transform: translateY(0);
        }
        
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }
        
        .modal-title {
          font-size: 1.2rem;
          font-weight: 600;
          margin: 0;
        }
        
        .modal-close {
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
        }
        
        .modal-body {
          margin-bottom: 1.5rem;
        }
        
        .modal-message {
          line-height: 1.5;
        }
        
        .button-group {
          display: flex;
          gap: 0.5rem;
          justify-content: flex-end;
        }
        
        button {
          padding: 0.5rem 1rem;
          background-color: var(--primary-color, #3a86ff);
          color: white;
          border: none;
          border-radius: 0.25rem;
          cursor: pointer;
          font-family: inherit;
          font-size: 1rem;
        }
        
        button.secondary {
          background-color: var(--secondary-color, #6c757d);
        }
        
        button.danger {
          background-color: var(--danger-color, #dc3545);
        }
        
        button.success {
          background-color: var(--success-color, #28a745);
        }
      </style>
      
      <div class="modal-backdrop">
        <div class="modal">
          <div class="modal-header">
            <h3 class="modal-title">${this._title}</h3>
            <button class="modal-close">&times;</button>
          </div>
          <div class="modal-body">
            <p class="modal-message">${this._message}</p>
          </div>
          <div class="button-group">
            <button id="cancel-button" class="secondary">${this._cancelLabel}</button>
            <button id="confirm-button" class="${this._confirmClass}">${this._confirmLabel}</button>
          </div>
        </div>
      </div>
    `;
  }
  
  setupEventListeners() {
    // Close button
    const closeButton = this.shadowRoot.querySelector('.modal-close');
    closeButton.addEventListener('click', () => {
      this.cancel();
    });
    
    // Cancel button
    const cancelButton = this.shadowRoot.querySelector('#cancel-button');
    cancelButton.addEventListener('click', () => {
      this.cancel();
    });
    
    // Confirm button
    const confirmButton = this.shadowRoot.querySelector('#confirm-button');
    confirmButton.addEventListener('click', () => {
      this.confirm();
    });
    
    // Close on backdrop click
    const backdrop = this.shadowRoot.querySelector('.modal-backdrop');
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) {
        this.cancel();
      }
    });
  }
  
  /**
   * Open the modal
   */
  open() {
    // Update elements with current values
    const titleEl = this.shadowRoot.querySelector('.modal-title');
    const messageEl = this.shadowRoot.querySelector('.modal-message');
    const confirmBtn = this.shadowRoot.querySelector('#confirm-button');
    const cancelBtn = this.shadowRoot.querySelector('#cancel-button');
    
    titleEl.textContent = this._title;
    messageEl.textContent = this._message;
    confirmBtn.textContent = this._confirmLabel;
    cancelBtn.textContent = this._cancelLabel;
    
    // Reset and set the confirm button class
    confirmBtn.className = this._confirmClass || 'primary';
    
    // Show the modal
    const backdrop = this.shadowRoot.querySelector('.modal-backdrop');
    backdrop.classList.add('show');
    this._isOpen = true;
  }
  
  /**
   * Close the modal
   */
  close() {
    const backdrop = this.shadowRoot.querySelector('.modal-backdrop');
    backdrop.classList.remove('show');
    this._isOpen = false;
  }
  
  /**
   * Confirm the action
   */
  confirm() {
    if (typeof this._onConfirm === 'function') {
      this._onConfirm();
    }
    
    this.close();
  }
  
  /**
   * Cancel the action
   */
  cancel() {
    if (typeof this._onCancel === 'function') {
      this._onCancel();
    }
    
    this.close();
  }
}

// Define the custom element
customElements.define('confirmation-modal', ConfirmationModal);

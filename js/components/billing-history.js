/**
 * Billing History Component
 * Displays payment transactions and invoices
 */

class BillingHistory {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error(`Container #${containerId} not found`);
            return;
        }

        this.transactions = [];
        this.loading = false;
        this.currentPage = 1;
        this.pageSize = 10;
        this.totalPages = 1;
        this.apiBaseUrl = window.location.origin;

        this.init();
    }

    /**
     * Initialize the component
     */
    async init() {
        this.render(); // Render loading state
        await this.loadTransactions();
        this.render(); // Render with data
        this.attachEventListeners();
    }

    /**
     * Load payment transactions from API
     */
    async loadTransactions() {
        this.loading = true;
        const token = this.getAuthToken();

        if (!token) {
            console.error('No auth token found');
            return;
        }

        try {
            const response = await fetch(
                `${this.apiBaseUrl}/api/payments/transactions?page=${this.currentPage}&limit=${this.pageSize}`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            );

            if (response.ok) {
                const data = await response.json();
                this.transactions = data.transactions || [];
                this.totalPages = Math.ceil((data.total || 0) / this.pageSize);
            } else {
                console.error('Failed to load transactions');
            }

        } catch (error) {
            console.error('Error loading transactions:', error);
        } finally {
            this.loading = false;
        }
    }

    /**
     * Get authentication token
     */
    getAuthToken() {
        return localStorage.getItem('authToken') || localStorage.getItem('token');
    }

    /**
     * Render the component
     */
    render() {
        if (this.loading) {
            this.container.innerHTML = this.renderLoading();
            return;
        }

        this.container.innerHTML = `
            <div class="billing-history">
                ${this.renderHeader()}
                ${this.transactions.length > 0 ?
                    this.renderTransactionsTable() :
                    this.renderEmptyState()
                }
                ${this.transactions.length > 0 ? this.renderPagination() : ''}
            </div>
        `;
    }

    /**
     * Render loading state
     */
    renderLoading() {
        return `
            <div class="billing-history loading">
                <div class="loading-spinner"></div>
                <p>Loading billing history...</p>
            </div>
        `;
    }

    /**
     * Render header
     */
    renderHeader() {
        return `
            <div class="billing-header">
                <h2>💳 Billing History</h2>
                <p class="billing-subtitle">View all your past payments and invoices</p>
            </div>
        `;
    }

    /**
     * Render transactions table
     */
    renderTransactionsTable() {
        return `
            <div class="transactions-table-container">
                <table class="transactions-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Description</th>
                            <th>Type</th>
                            <th>Status</th>
                            <th>Amount</th>
                            <th>Invoice</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.transactions.map(tx => this.renderTransactionRow(tx)).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    /**
     * Render single transaction row
     */
    renderTransactionRow(tx) {
        const statusClass = this.getStatusClass(tx.status);
        const typeClass = tx.transaction_type === 'refund' ? 'refund' : 'payment';

        return `
            <tr class="transaction-row">
                <td class="tx-date">${this.formatDate(tx.created_at)}</td>
                <td class="tx-description">${tx.description || 'Subscription payment'}</td>
                <td class="tx-type">
                    <span class="type-badge ${typeClass}">
                        ${tx.transaction_type === 'refund' ? '↩️ Refund' : '💳 Payment'}
                    </span>
                </td>
                <td class="tx-status">
                    <span class="status-badge ${statusClass}">
                        ${this.formatStatus(tx.status)}
                    </span>
                </td>
                <td class="tx-amount ${typeClass}">
                    ${tx.transaction_type === 'refund' ? '-' : ''}${this.formatAmount(tx.amount_cents, tx.currency)}
                </td>
                <td class="tx-invoice">
                    ${tx.stripe_invoice_url ?
                        `<a href="${tx.stripe_invoice_url}" target="_blank" class="invoice-link">📄 View</a>` :
                        '<span class="no-invoice">—</span>'
                    }
                </td>
            </tr>
        `;
    }

    /**
     * Render empty state
     */
    renderEmptyState() {
        return `
            <div class="empty-state">
                <div class="empty-icon">📭</div>
                <h3>No billing history yet</h3>
                <p>Your payment transactions will appear here once you subscribe.</p>
            </div>
        `;
    }

    /**
     * Render pagination
     */
    renderPagination() {
        if (this.totalPages <= 1) return '';

        const pages = [];
        for (let i = 1; i <= this.totalPages; i++) {
            if (
                i === 1 ||
                i === this.totalPages ||
                (i >= this.currentPage - 1 && i <= this.currentPage + 1)
            ) {
                pages.push(i);
            } else if (pages[pages.length - 1] !== '...') {
                pages.push('...');
            }
        }

        return `
            <div class="pagination">
                <button
                    class="pagination-btn prev"
                    ${this.currentPage === 1 ? 'disabled' : ''}
                    data-page="${this.currentPage - 1}">
                    ← Previous
                </button>

                <div class="pagination-pages">
                    ${pages.map(page => {
                        if (page === '...') {
                            return '<span class="pagination-ellipsis">...</span>';
                        }
                        return `
                            <button
                                class="pagination-btn page ${page === this.currentPage ? 'active' : ''}"
                                data-page="${page}">
                                ${page}
                            </button>
                        `;
                    }).join('')}
                </div>

                <button
                    class="pagination-btn next"
                    ${this.currentPage === this.totalPages ? 'disabled' : ''}
                    data-page="${this.currentPage + 1}">
                    Next →
                </button>
            </div>
        `;
    }

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        // Pagination buttons
        const paginationButtons = this.container.querySelectorAll('.pagination-btn[data-page]');
        paginationButtons.forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const page = parseInt(e.target.getAttribute('data-page'));
                if (page && page !== this.currentPage) {
                    this.currentPage = page;
                    await this.loadTransactions();
                    this.render();
                    this.attachEventListeners();
                }
            });
        });
    }

    /**
     * Format date
     */
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    /**
     * Format amount
     */
    formatAmount(cents, currency = 'USD') {
        const amount = cents / 100;
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency.toUpperCase()
        }).format(amount);
    }

    /**
     * Format status
     */
    formatStatus(status) {
        const statusMap = {
            completed: 'Completed',
            pending: 'Pending',
            failed: 'Failed',
            refunded: 'Refunded'
        };
        return statusMap[status] || status;
    }

    /**
     * Get status class
     */
    getStatusClass(status) {
        const classMap = {
            completed: 'success',
            pending: 'warning',
            failed: 'error',
            refunded: 'info'
        };
        return classMap[status] || 'default';
    }

    /**
     * Refresh component
     */
    async refresh() {
        this.currentPage = 1;
        await this.loadTransactions();
        this.render();
        this.attachEventListeners();
    }

    /**
     * Export to CSV
     */
    exportToCSV() {
        const headers = ['Date', 'Description', 'Type', 'Status', 'Amount', 'Currency'];
        const rows = this.transactions.map(tx => [
            this.formatDate(tx.created_at),
            tx.description || 'Subscription payment',
            tx.transaction_type,
            tx.status,
            tx.amount_cents / 100,
            tx.currency
        ]);

        let csv = headers.join(',') + '\n';
        csv += rows.map(row => row.join(',')).join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `billing-history-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BillingHistory;
}

// utils.js - Utility functions for the resume editor

// DOM selector shorthand functions
export const $ = str => document.querySelector(str);
export const $$ = str => document.querySelectorAll(str);

// HTML escape function for security
export function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Safely parse JSON with error handling
export function safelyParseJSON(json) {
    try {
        return JSON.parse(json);
    } catch (e) {
        console.error("Error parsing JSON:", e);
        return null;
    }
}

// Format date with support for different formats
export function formatDate(dateStr, format = 'YYYY-MM-DD') {
    if (!dateStr) return "";
    if (dateStr.toLowerCase() === "present") return "Present";
    
    try {
        const date = new Date(dateStr);
        
        // Check if date is valid
        if (isNaN(date.getTime())) {
            return dateStr;
        }
        
        // Format date based on format parameter
        switch (format) {
            case 'YYYY-MM-DD':
                return date.toISOString().split('T')[0];
            case 'MM/DD/YYYY':
                return `${date.getMonth()+1}/${date.getDate()}/${date.getFullYear()}`;
            case 'MMM YYYY':
                return `${getMonthName(date.getMonth(), true)} ${date.getFullYear()}`;
            case 'YYYY':
                return date.getFullYear().toString();
            default:
                return date.toISOString().split('T')[0];
        }
    } catch (e) {
        return dateStr;
    }
}

// Helper function to get month name
function getMonthName(monthIndex, abbreviated = false) {
    const months = [
        ['January', 'Jan'],
        ['February', 'Feb'],
        ['March', 'Mar'],
        ['April', 'Apr'],
        ['May', 'May'],
        ['June', 'Jun'],
        ['July', 'Jul'],
        ['August', 'Aug'],
        ['September', 'Sep'],
        ['October', 'Oct'],
        ['November', 'Nov'],
        ['December', 'Dec']
    ];
    
    return months[monthIndex][abbreviated ? 1 : 0];
}

// Get current date in ISO format
export function getCurrentDate() {
    return new Date().toISOString();
}

// Show toast notification
export function showToast(message, type = "success") {
    const toast = $('#toast');
    toast.textContent = message;
    toast.className = `toast ${type} active`;
    
    setTimeout(() => {
        toast.classList.remove('active');
    }, 3000);
}

// Create an element with attributes and children
export function createElement(tag, attributes = {}, children = []) {
    const element = document.createElement(tag);
    
    // Set attributes
    Object.entries(attributes).forEach(([key, value]) => {
        if (key === 'className') {
            element.className = value;
        } else if (key === 'textContent') {
            element.textContent = value;
        } else {
            element.setAttribute(key, value);
        }
    });
    
    // Append children
    children.forEach(child => {
        if (typeof child === 'string') {
            element.appendChild(document.createTextNode(child));
        } else if (child instanceof Node) {
            element.appendChild(child);
        }
    });
    
    return element;
}
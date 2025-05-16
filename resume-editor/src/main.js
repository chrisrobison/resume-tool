/**
 * Main application entry point
 */
import './components/resume-editor.js';

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Load global styles
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'src/styles/global.css';
  document.head.appendChild(link);
  
  console.log('Resume.json Editor initialized');
});
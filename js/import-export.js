// import-export.js - Import and export functionality
import { $, showToast, safelyParseJSON } from './utils.js';
import { hideModal } from './modals.js';

// Export resume to JSON
export function exportResumeToJson(resumeData) {
    // Update lastModified date
    resumeData.meta.lastModified = new Date().toISOString();
    
    try {
        const jsonData = JSON.stringify(resumeData, null, 2);
        
        // Set the JSON in the export textarea
        const jsonOutput = $('#json-output');
        if (jsonOutput) {
            jsonOutput.value = jsonData;
        }
        
        return jsonData;
    } catch (e) {
        console.error('Error exporting resume to JSON:', e);
        showToast('Error exporting resume data', 'error');
        return null;
    }
}

// Import resume from JSON string
export function importResumeFromJson(jsonString, app) {
    try {
        const importedData = safelyParseJSON(jsonString);
        
        if (!importedData || typeof importedData !== 'object') {
            showToast('Invalid JSON data format', 'error');
            return false;
        }
        
        // Validate imported data (basic validation)
        if (!importedData.basics) {
            showToast('Invalid resume data: missing basics section', 'error');
            return false;
        }
        
        // Ensure imported data has all required sections
        const requiredSections = ['basics', 'work', 'education', 'skills', 'projects', 'meta'];
        
        requiredSections.forEach(section => {
            if (!importedData[section]) {
                importedData[section] = section === 'basics' 
                    ? { name: '', location: {} } 
                    : section === 'meta' 
                        ? { version: "1.0.0", lastModified: new Date().toISOString() } 
                        : [];
            }
        });
        
        // Ensure basics.location exists
        if (!importedData.basics.location) {
            importedData.basics.location = {};
        }
        
        // Update the data
        Object.assign(app.data, importedData);
        
        // Update UI with imported data
        app.updateAllFields();
        
        showToast('Resume data imported successfully', 'success');
        return true;
    } catch (e) {
        console.error('Error importing resume from JSON:', e);
        showToast('Error importing resume data', 'error');
        return false;
    }
}

// Setup import functionality
export function setupImportFunctionality(app) {
    // Paste JSON import
    $('#import-paste')?.addEventListener('click', () => {
        const jsonInput = $('#json-input');
        
        if (!jsonInput || !jsonInput.value.trim()) {
            showToast('Please enter JSON data', 'error');
            return;
        }
        
        if (importResumeFromJson(jsonInput.value.trim(), app)) {
            hideModal('import-modal');
        }
    });
    
    // File upload import
    setupFileImport(app);
    
    // URL import
    setupUrlImport(app);
}

// Setup file upload import
function setupFileImport(app) {
    const fileInput = $('#file-input');
    const dragDropArea = $('#drag-drop-area');
    const fileName = $('#file-name');
    const importFileBtn = $('#import-file');
    
    if (!fileInput || !dragDropArea || !fileName || !importFileBtn) return;
    
    // Click to browse
    dragDropArea.addEventListener('click', () => {
        fileInput.click();
    });
    
    // Handle file selection
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        
        if (file) {
            fileName.textContent = file.name;
            fileName.classList.remove('hidden');
            importFileBtn.disabled = false;
        } else {
            fileName.classList.add('hidden');
            importFileBtn.disabled = true;
        }
    });
    
    // Drag and drop handling
    dragDropArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        dragDropArea.classList.add('drag-over');
    });
    
    dragDropArea.addEventListener('dragleave', () => {
        dragDropArea.classList.remove('drag-over');
    });
    
    dragDropArea.addEventListener('drop', (e) => {
        e.preventDefault();
        dragDropArea.classList.remove('drag-over');
        
        const file = e.dataTransfer.files[0];
        
        if (file) {
            fileInput.files = e.dataTransfer.files;
            fileName.textContent = file.name;
            fileName.classList.remove('hidden');
            importFileBtn.disabled = false;
        }
    });
    
    // Import from file button
    importFileBtn.addEventListener('click', () => {
        const file = fileInput.files[0];
        
        if (!file) {
            showToast('Please select a file', 'error');
            return;
        }
        
        const reader = new FileReader();
        
        reader.onload = (e) => {
            try {
                if (importResumeFromJson(e.target.result, app)) {
                    hideModal('import-modal');
                    
                    // Reset file input
                    fileInput.value = '';
                    fileName.classList.add('hidden');
                    importFileBtn.disabled = true;
                }
            } catch (error) {
                showToast('Error reading file', 'error');
            }
        };
        
        reader.onerror = () => {
            showToast('Error reading file', 'error');
        };
        
        reader.readAsText(file);
    });
}

// Setup URL import
function setupUrlImport(app) {
    const importUrlBtn = $('#import-url');
    const urlInput = $('#url-input');
    
    if (!importUrlBtn || !urlInput) return;
    
    importUrlBtn.addEventListener('click', async () => {
        const url = urlInput.value.trim();
        
        if (!url) {
            showToast('Please enter a URL', 'error');
            return;
        }
        
        try {
            importUrlBtn.disabled = true;
            importUrlBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Importing...';
            
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            
            const jsonData = await response.text();
            
            if (importResumeFromJson(jsonData, app)) {
                hideModal('import-modal');
                urlInput.value = '';
            }
        } catch (error) {
            showToast('Error fetching resume from URL', 'error');
            console.error('URL import error:', error);
        } finally {
            importUrlBtn.disabled = false;
            importUrlBtn.innerHTML = '<i class="fa-solid fa-check"></i> Import';
        }
    });
}

// Setup export functionality
export function setupExportFunctionality(app) {
    const exportButton = $('#export-button');
    const copyJsonButton = $('#copy-json');
    const downloadJsonButton = $('#download-json');
    
    if (exportButton) {
        exportButton.addEventListener('click', () => {
            const jsonData = exportResumeToJson(app.data);
            $('#json-output').value = jsonData;
            showModal('export-modal');
        });
    }
    
    if (copyJsonButton) {
        copyJsonButton.addEventListener('click', () => {
            const jsonOutput = $('#json-output');
            
            if (!jsonOutput || !jsonOutput.value) {
                showToast('No data to copy', 'error');
                return;
            }
            
            jsonOutput.select();
            
            try {
                document.execCommand('copy');
                showToast('JSON copied to clipboard', 'success');
            } catch (err) {
                console.error('Error copying to clipboard:', err);
                showToast('Failed to copy to clipboard', 'error');
            }
        });
    }
    
    if (downloadJsonButton) {
        downloadJsonButton.addEventListener('click', () => {
            const jsonOutput = $('#json-output');
            
            if (!jsonOutput || !jsonOutput.value) {
                showToast('No data to download', 'error');
                return;
            }
            
            try {
                const blob = new Blob([jsonOutput.value], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                
                a.href = url;
                a.download = 'resume.json';
                a.click();
                URL.revokeObjectURL(url);
                
                showToast('JSON file downloaded', 'success');
            } catch (err) {
                console.error('Error downloading JSON:', err);
                showToast('Failed to download JSON', 'error');
            }
        });
    }
}
/**
 * Storage utilities for persisting resume data
 */

// Constants
const STORAGE_KEY_PREFIX = 'resume_editor_';
const RESUME_LIST_KEY = `${STORAGE_KEY_PREFIX}list`;
const CURRENT_RESUME_KEY = `${STORAGE_KEY_PREFIX}current`;
const DEFAULT_RESUME_NAME = 'My Resume';

/**
 * Default empty resume template that follows the JSON Resume schema
 */
export const DEFAULT_RESUME = {
  basics: {
    name: "",
    label: "",
    email: "",
    phone: "",
    url: "",
    summary: "",
    location: {
      address: "",
      postalCode: "",
      city: "",
      countryCode: "",
      region: ""
    },
    profiles: []
  },
  work: [],
  education: [],
  skills: [],
  projects: [],
  meta: {
    theme: "",
    version: "1.0.0",
    language: "en",
    lastModified: new Date().toISOString()
  }
};

/**
 * Storage service for managing resumes
 */
export const ResumeStorage = {
  /**
   * Initialize storage and return the current resume
   * @returns {Object} The current resume data
   */
  init() {
    // Try to load the resume list
    const resumeList = this.getResumeList();
    
    // If there are no resumes, create a default one
    if (resumeList.length === 0) {
      const newResume = {
        id: this._generateId(),
        name: DEFAULT_RESUME_NAME,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      resumeList.push(newResume);
      this._saveResumeList(resumeList);
      this._saveResumeData(newResume.id, DEFAULT_RESUME);
      this.setCurrentResume(newResume.id);
      
      return { ...DEFAULT_RESUME, _meta: newResume };
    }
    
    // Try to get the current resume ID
    let currentResumeId = localStorage.getItem(CURRENT_RESUME_KEY);
    
    // Check if the current resume exists in the list
    if (!currentResumeId || !resumeList.some(resume => resume.id === currentResumeId)) {
      currentResumeId = resumeList[0].id;
      this.setCurrentResume(currentResumeId);
    }
    
    // Load the current resume
    const resumeData = this.getResumeById(currentResumeId);
    const resumeMeta = resumeList.find(r => r.id === currentResumeId);
    
    return { ...resumeData, _meta: resumeMeta };
  },
  
  /**
   * Get the list of all resumes
   * @returns {Array} Array of resume metadata
   */
  getResumeList() {
    try {
      const listJSON = localStorage.getItem(RESUME_LIST_KEY);
      return listJSON ? JSON.parse(listJSON) : [];
    } catch (error) {
      console.error('Error loading resume list:', error);
      return [];
    }
  },
  
  /**
   * Get a resume by ID
   * @param {String} id Resume ID
   * @returns {Object} Resume data
   */
  getResumeById(id) {
    try {
      const resumeJSON = localStorage.getItem(`${STORAGE_KEY_PREFIX}${id}`);
      return resumeJSON ? JSON.parse(resumeJSON) : { ...DEFAULT_RESUME };
    } catch (error) {
      console.error(`Error loading resume ${id}:`, error);
      return { ...DEFAULT_RESUME };
    }
  },
  
  /**
   * Save a resume
   * @param {String} id Resume ID
   * @param {Object} data Resume data
   * @returns {Boolean} Success status
   */
  saveResume(id, data) {
    try {
      // Update the last modified date
      const resumeToSave = {
        ...data,
        meta: {
          ...data.meta,
          lastModified: new Date().toISOString()
        }
      };
      
      // Save the resume data
      this._saveResumeData(id, resumeToSave);
      
      // Update the resume list
      const resumeList = this.getResumeList();
      const resumeIndex = resumeList.findIndex(resume => resume.id === id);
      
      if (resumeIndex >= 0) {
        resumeList[resumeIndex].updatedAt = new Date().toISOString();
        this._saveResumeList(resumeList);
      }
      
      return true;
    } catch (error) {
      console.error(`Error saving resume ${id}:`, error);
      return false;
    }
  },
  
  /**
   * Create a new resume
   * @param {String} name Resume name
   * @param {Object} data Resume data (optional)
   * @returns {Object} New resume data with metadata
   */
  createResume(name = DEFAULT_RESUME_NAME, data = null) {
    const newId = this._generateId();
    const now = new Date().toISOString();
    
    // Create resume metadata
    const newResume = {
      id: newId,
      name,
      createdAt: now,
      updatedAt: now
    };
    
    // Add to the resume list
    const resumeList = this.getResumeList();
    resumeList.push(newResume);
    this._saveResumeList(resumeList);
    
    // Save the resume data
    const resumeData = data || { ...DEFAULT_RESUME };
    this._saveResumeData(newId, resumeData);
    
    // Set as current resume
    this.setCurrentResume(newId);
    
    return { ...resumeData, _meta: newResume };
  },
  
  /**
   * Create a copy of an existing resume
   * @param {String} sourceId ID of the resume to copy
   * @param {String} newName Name for the new resume
   * @returns {Object} New resume data with metadata
   */
  duplicateResume(sourceId, newName = null) {
    // Get the source resume
    const sourceResume = this.getResumeById(sourceId);
    const sourceMetadata = this.getResumeList().find(r => r.id === sourceId);
    
    // Generate a name if not provided
    if (!newName) {
      newName = `${sourceMetadata?.name || DEFAULT_RESUME_NAME} (Copy)`;
    }
    
    // Create new resume with the copied data
    return this.createResume(newName, sourceResume);
  },
  
  /**
   * Delete a resume
   * @param {String} id Resume ID
   * @returns {Boolean} Success status
   */
  deleteResume(id) {
    try {
      // Get the resume list
      const resumeList = this.getResumeList();
      const newList = resumeList.filter(resume => resume.id !== id);
      
      // Prevent deleting all resumes
      if (newList.length === 0) {
        return false;
      }
      
      // Remove from storage
      localStorage.removeItem(`${STORAGE_KEY_PREFIX}${id}`);
      this._saveResumeList(newList);
      
      // If deleting the current resume, set a new current
      const currentId = localStorage.getItem(CURRENT_RESUME_KEY);
      if (currentId === id) {
        this.setCurrentResume(newList[0].id);
      }
      
      return true;
    } catch (error) {
      console.error(`Error deleting resume ${id}:`, error);
      return false;
    }
  },
  
  /**
   * Rename a resume
   * @param {String} id Resume ID
   * @param {String} newName New resume name
   * @returns {Boolean} Success status
   */
  renameResume(id, newName) {
    try {
      if (!newName || newName.trim() === '') {
        return false;
      }
      
      const resumeList = this.getResumeList();
      const resumeIndex = resumeList.findIndex(resume => resume.id === id);
      
      if (resumeIndex >= 0) {
        resumeList[resumeIndex].name = newName.trim();
        resumeList[resumeIndex].updatedAt = new Date().toISOString();
        this._saveResumeList(resumeList);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error(`Error renaming resume ${id}:`, error);
      return false;
    }
  },
  
  /**
   * Set the current resume
   * @param {String} id Resume ID
   */
  setCurrentResume(id) {
    localStorage.setItem(CURRENT_RESUME_KEY, id);
  },
  
  /**
   * Get the current resume ID
   * @returns {String} Current resume ID
   */
  getCurrentResumeId() {
    return localStorage.getItem(CURRENT_RESUME_KEY);
  },
  
  /**
   * Import a resume from JSON
   * @param {Object|String} json Resume JSON data
   * @param {String} name Name for the imported resume
   * @returns {Object} Imported resume with metadata
   */
  importResume(json, name = 'Imported Resume') {
    try {
      // Parse the JSON if needed
      const resumeData = typeof json === 'string' ? JSON.parse(json) : json;
      
      // Validate that it has the basic structure
      if (!resumeData.basics) {
        resumeData.basics = DEFAULT_RESUME.basics;
      }
      
      // Ensure all required arrays exist
      ['work', 'education', 'skills', 'projects'].forEach(section => {
        if (!Array.isArray(resumeData[section])) {
          resumeData[section] = [];
        }
      });
      
      // Ensure meta section exists
      if (!resumeData.meta) {
        resumeData.meta = DEFAULT_RESUME.meta;
      }
      
      // Create new resume with the imported data
      return this.createResume(name, resumeData);
    } catch (error) {
      console.error('Error importing resume:', error);
      return null;
    }
  },
  
  /**
   * Export resume as JSON
   * @param {String} id Resume ID (optional, uses current if not provided)
   * @returns {String} JSON string
   */
  exportResumeJson(id = null) {
    const resumeId = id || this.getCurrentResumeId();
    const resume = this.getResumeById(resumeId);
    
    // Don't include internal metadata in the export
    const exportData = { ...resume };
    delete exportData._meta;
    
    return JSON.stringify(exportData, null, 2);
  },
  
  /**
   * Export resume as downloadable file
   * @param {String} id Resume ID (optional, uses current if not provided)
   */
  exportResumeFile(id = null) {
    const resumeId = id || this.getCurrentResumeId();
    const resumeList = this.getResumeList();
    const resumeMeta = resumeList.find(r => r.id === resumeId);
    const jsonData = this.exportResumeJson(resumeId);
    
    // Create a download link
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const filename = `${resumeMeta?.name || 'resume'}_${new Date().toISOString().split('T')[0]}.json`;
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    
    // Clean up
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  },
  
  /**
   * Save resume data to localStorage
   * @private
   * @param {String} id Resume ID
   * @param {Object} data Resume data
   */
  _saveResumeData(id, data) {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${id}`, JSON.stringify(data));
  },
  
  /**
   * Save resume list to localStorage
   * @private
   * @param {Array} list Resume list
   */
  _saveResumeList(list) {
    localStorage.setItem(RESUME_LIST_KEY, JSON.stringify(list));
  },
  
  /**
   * Generate a unique ID
   * @private
   * @returns {String} Unique ID
   */
  _generateId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
};
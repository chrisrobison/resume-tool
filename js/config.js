// config.js - Default resume schema and configuration

// Default empty resume schema
export const defaultResumeData = {
    basics: {
        name: "",
        label: "",
        email: "",
        phone: "",
        website: "",
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

// Configuration options
export const config = {
    storage: {
        resumeKey: "resumeJson",
        savedResumesKey: "savedResumes", 
        settingsKey: "resumeEditorSettings"
    },
    preview: {
        themes: ["modern", "classic", "minimal"]
    },
    api: {
        defaultServiceType: "claude"
    }
};
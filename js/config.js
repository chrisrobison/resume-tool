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
        settingsKey: "resumeEditorSettings",
        apiKeysKey: "resumeApiKeys"
    },
    preview: {
        themes: ["modern", "classic", "minimal"]
    },
    api: {
        defaultServiceType: "claude",
        services: {
            claude: {
                name: "Claude",
                model: "claude-3-opus-20240229",
                maxTokens: 4000
            },
            chatgpt: {
                name: "ChatGPT",
                model: "gpt-4-turbo-preview",
                maxTokens: 4000
            }
        }
    }
};
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
        apiKeysKey: "resumeApiKeys",
        jobsKey: "jobs",
        logsKey: "activityLogs"
    },
    preview: {
        themes: ["modern", "classic", "minimal"]
    },
    api: {
        defaultServiceType: "claude",
        services: {
            claude: {
                name: "Claude",
                model: "claude-opus-4-20250514",
                maxTokens: 4000
            },
            chatgpt: {
                name: "ChatGPT",
                model: "gpt-4o",
                maxTokens: 4000
            }
        }
    }
};
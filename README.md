# ✨ Resume.json Editor ✨

🚀 A modern, browser-based tool for creating stunning resumes with the [JSON Resume](https://jsonresume.org/) schema!

![Resume.json Editor Screenshot](https://via.placeholder.com/800x450.png?text=Resume.json+Editor)

## ✅ Why Use This Tool?

- 🔒 **100% Private**: Your data never leaves your browser - no servers involved!
- 📄 **Multiple Resumes**: Create different versions for different job applications
- 🌐 **Standard Format**: Uses the popular JSON Resume schema for compatibility
- 💾 **Easy Backup**: Import/export to JSON files or copy to clipboard
- 🔄 **Auto-Save**: Never lose your work with automatic local storage saving
- 📱 **Works Everywhere**: Responsive design for desktop, tablet, and mobile
- 🎨 **Multiple Themes**: Choose from Modern, Classic, or Minimal themes
- 📝 **Job Tracking**: Manage job applications and track status changes
- 📊 **Activity History**: Track your resume activities and job applications
- 🤖 **AI Integration**: Optional AI-powered resume tailoring with Claude or OpenAI

## 🚀 Getting Started

### Quick Start

1. 🖱️ Open `index.html` in your browser
2. ✏️ Fill in your resume details in the simple form interface
3. 💾 Your work automatically saves in your browser
4. 📤 Export as JSON when you're finished!

### 📥 Importing a Resume

Got an existing JSON Resume? No problem!

1. Click the "Import" button
2. Choose your preferred method:
   - 📋 Paste JSON directly
   - 📁 Upload a JSON file
   - 🔗 Enter a URL to a JSON resume

### 📤 Exporting Your Masterpiece

1. Click the "Export" button
2. Choose how you want your resume:
   - 📁 Download as a JSON file
   - 📋 Copy to clipboard

### 🔄 Managing Multiple Resumes

- 💾 Save resumes with descriptive names
- 📂 Load saved resumes from local storage
- 🗑️ Delete resumes you no longer need

### 📊 Job Management

- 📝 Create job entries with detailed information
- 📊 Track job application status (saved, applied, interviewing, etc.)
- 📌 Associate tailored resumes with specific jobs
- 📋 Add notes and contact information for each opportunity
- 📅 View status history and application timeline

### 🤖 AI Resume Tailoring

- 🔄 Automatically tailor your resume to match job descriptions
- ✍️ Generate customized cover letters
- 🔌 Support for both Claude and OpenAI APIs
- 🔐 Secure API key management
- 📝 Logging of all AI interactions

## 🧰 Project Structure

```
resume-tool/
├── index.html            # 🏠 Main application HTML
├── styles.css            # 🎨 Global styles
├── js/                   # 📁 JavaScript modules
│   ├── core.js           # 🧠 Main application object
│   ├── config.js         # ⚙️ Configuration settings
│   ├── ui.js             # 🖥️ UI management
│   ├── utils.js          # 🔧 Utility functions
│   ├── storage.js        # 💾 Local storage operations
│   ├── modals.js         # 🪟 Modal dialog handling
│   ├── preview.js        # 👁️ Resume preview rendering
│   ├── import-export.js  # 📤 Import/export functionality
│   ├── jobs.js           # 💼 Job management
│   ├── logs.js           # 📊 Activity logging
│   └── theme-styles.css  # 🎭 Theme-specific styles
├── DEVELOPER.md          # 📘 Developer documentation
└── README.md             # 📝 Project overview
```

## 👩‍💻 Development

Super simple! No complicated build tools or dependencies!

### 🏃‍♂️ Running Locally

Simply open `index.html` in your web browser:

```bash
# Open the file directly or use:
open index.html
```

### 🛠️ Making Changes

1. Edit files in the project directory
2. Refresh your browser to see changes
3. That's it! No compilation needed! 🎉

### 📋 For Detailed Documentation

For more detailed development information, check out the `DEVELOPER.md` file, which includes:

- 🧠 Complete architecture explanation
- 📊 Data schemas and models
- 🧩 Module details and API references
- 🔍 Troubleshooting guidance
- 🚀 Future enhancement ideas

## 🔧 Technical Details

### Architecture

- 📦 **Modular Design**: Clean separation of concerns in specialized modules
- 🧩 **Namespace Pattern**: Explicit imports and function references for clarity
- 💾 **Local Storage**: Everything saved right in your browser
- 🚫 **No Dependencies**: Plain JavaScript - no external libraries!
- 📝 **JSON Schema**: Based on the standardized JSON Resume format
- 🎨 **Theme System**: Multiple visual styles for resume previews
- 🧪 **Event Delegation**: Efficient event handling for dynamic elements

### 🌐 Browser Support

Works great in all modern browsers:
- Chrome/Edge
- Firefox
- Safari

## 🔒 Privacy

Your data stays on YOUR device! No servers, no tracking, no data collection.

Note: If you choose to use the AI resume tailoring features, job descriptions and resume data will be sent to the AI service (Claude or OpenAI) using your own API key, but you have full control over this process.

## 🤝 Contributing

Contributions welcome! Here's how:

1. 🍴 Fork the repository
2. 🌱 Create your feature branch: `git checkout -b feature/cool-new-thing`
3. 💾 Commit your changes: `git commit -m 'Add some cool feature'`
4. 📤 Push to the branch: `git push origin feature/cool-new-thing`
5. 🔃 Open a pull request

## 📜 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👏 Acknowledgments

- 🙏 Based on the [JSON Resume](https://jsonresume.org/) schema
- 💡 Built to make resume creation fun and easy!
- 🤖 AI assistance from Claude by Anthropic

## 🌟 Features

- ✅ **Complete Resume Editor**: Edit all resume sections with validation
- ✅ **Multiple Resume Themes**: Modern, Classic, and Minimal designs
- ✅ **Job Application Tracking**: Full job management system
- ✅ **Activity History**: Logging of all resume and job activities  
- ✅ **AI Integration**: Optional resume tailoring with AI models
- ✅ **Local Storage**: Save multiple resumes and jobs locally
- ✅ **Import/Export**: Multiple ways to save and share your data
- ✅ **Responsive Design**: Works on desktop and mobile devices

---

Happy resume building and job hunting! 🎉
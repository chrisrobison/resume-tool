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

- ➕ Create new resumes with the "+" button
- 🔄 Switch between them using the dropdown
- ✏️ Rename, duplicate, or delete resumes with ease

## 🧰 Project Structure

```
resume-tool/
├── index.html           # 🏠 Main application file
├── reference.html       # 📚 UI reference & components
└── resume-editor/       # 🧩 Modular version
    ├── index.html       # 🚪 Entry point
    └── src/
        ├── main.js      # 🚀 Application start
        ├── components/  # 🧩 Web components
        ├── utils/       # 🔧 Helper functions
        └── styles/      # 🎨 CSS styles
```

## 👩‍💻 Development

Super simple! No complicated build tools or dependencies!

### 🏃‍♂️ Running Locally

Simply open `resume-editor/index.html` in your web browser:

```bash
# Open the file directly or use:
open resume-editor/index.html
```

### 🛠️ Making Changes

1. Edit files in the `resume-editor/src/` directory
2. Refresh your browser to see changes
3. That's it! No compilation needed! 🎉

## 🔧 Technical Details

### Architecture

- 🧩 **Web Components**: Custom elements for a modular design
- ⚡ **Reactive State**: Smart updates when data changes
- 💾 **Local Storage**: Everything saved right in your browser
- 🚫 **No Dependencies**: Plain JavaScript - no external libraries!

### 🌐 Browser Support

Works great in all modern browsers:
- Chrome/Edge
- Firefox
- Safari

## 🔒 Privacy

Your data stays on YOUR device! No servers, no tracking, no data collection. 

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

---

Happy resume building! 🎉
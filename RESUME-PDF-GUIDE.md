# YAML Resume to PDF Converter

Convert your resume from YAML format to a beautifully formatted PDF using your existing theme system.

## Features

✨ **Three Professional Themes**
- **Modern** - Clean, contemporary design with blue accents
- **Classic** - Traditional, formal serif style
- **Minimal** - Simple, clean sans-serif layout

📋 **JSON Resume Standard**
- Follows the [JSON Resume](https://jsonresume.org/schema/) specification
- Supports all standard sections: Work, Education, Skills, Projects, etc.

🚀 **Easy to Use**
- Simple command-line interface
- No build process required
- Uses existing Puppeteer installation

## Quick Start

### 1. Create Your Resume in YAML

See `resume-example.yaml` for a complete template. Here's a minimal example:

```yaml
basics:
  name: Your Name
  label: Your Title
  email: you@example.com
  phone: (555) 123-4567
  summary: Brief professional summary here

work:
  - name: Company Name
    position: Your Position
    startDate: 2020-01-01
    endDate: 2023-12-31
    highlights:
      - Achievement 1
      - Achievement 2

education:
  - institution: University Name
    area: Your Major
    studyType: Bachelor of Science
    startDate: 2016-09-01
    endDate: 2020-05-31

skills:
  - name: Programming
    keywords:
      - JavaScript
      - Python
      - React
```

### 2. Convert to PDF

**Using npm scripts (recommended):**

```bash
# Generate PDF from example
npm run resume:example

# Generate with different themes
npm run resume:modern    # Modern theme
npm run resume:classic   # Classic theme
npm run resume:minimal   # Minimal theme
```

**Using Node directly:**

```bash
# Basic usage (uses default modern theme)
node yaml-to-pdf.js resume.yaml

# Specify output filename
node yaml-to-pdf.js resume.yaml my-resume.pdf

# Specify theme
node yaml-to-pdf.js resume.yaml output.pdf classic

# All options
node yaml-to-pdf.js resume.yaml john-doe-resume.pdf minimal
```

## Usage

```
node yaml-to-pdf.js <input.yaml> [output.pdf] [theme]
```

### Arguments

| Argument | Required | Default | Description |
|----------|----------|---------|-------------|
| `input.yaml` | ✅ Yes | - | Path to your YAML resume file |
| `output.pdf` | ❌ No | `[name]-resume.pdf` | Output PDF filename |
| `theme` | ❌ No | `modern` | Theme: modern, classic, or minimal |

### Examples

```bash
# Use defaults (modern theme, auto-named output)
node yaml-to-pdf.js resume.yaml

# Specify output filename
node yaml-to-pdf.js resume.yaml john-smith-2024.pdf

# Use classic theme
node yaml-to-pdf.js resume.yaml resume.pdf classic

# Use minimal theme with custom name
node yaml-to-pdf.js my-resume.yaml minimalist-cv.pdf minimal

# Generate all three themes
node yaml-to-pdf.js resume.yaml resume-modern.pdf modern
node yaml-to-pdf.js resume.yaml resume-classic.pdf classic
node yaml-to-pdf.js resume.yaml resume-minimal.pdf minimal

# Works with alternative format too (company/prior_experience)
node yaml-to-pdf.js resume-rinse.yaml output.pdf modern
```

## Available Themes

### Modern Theme
- **Font:** Segoe UI, Tahoma, Geneva, Verdana
- **Style:** Clean, contemporary with blue accent colors
- **Best For:** Tech industry, startups, creative roles
- **Features:** Color-coded sections, modern typography

### Classic Theme
- **Font:** Times New Roman, Times, serif
- **Style:** Traditional, formal black and white
- **Best For:** Corporate, legal, finance, academic positions
- **Features:** Professional serif fonts, clear hierarchy

### Minimal Theme
- **Font:** Arial, sans-serif
- **Style:** Simple, clean, minimalist
- **Best For:** Design roles, modern companies, portfolios
- **Features:** Maximum readability, efficient use of space

## YAML Resume Format

The script supports **two data formats**:

### 1. Standard JSON Resume Format
The script fully supports the [JSON Resume](https://jsonresume.org/schema/) standard (see `resume-example.yaml`).

### 2. Alternative Format with `company` and `prior_experience`
The script also handles alternative formats that use:
- `company` instead of `name` in work entries
- `prior_experience` section for older jobs (merged into work experience)
- See `resume-rinse.yaml` for an example

Both formats work seamlessly! The script automatically normalizes the data.

### Main Sections

### Required Section

- **basics** - Your basic information (name, email, phone, etc.)

### Optional Sections

- **work** - Work experience
- **education** - Education history
- **skills** - Technical and soft skills
- **projects** - Personal or professional projects
- **profiles** - Social media and online profiles (GitHub, LinkedIn, etc.)
- **awards** - Awards and honors
- **publications** - Published works
- **languages** - Language proficiencies
- **interests** - Personal interests
- **references** - Professional references
- **volunteer** - Volunteer experience

### Example Structure (Standard Format)

```yaml
basics:
  name: Full Name
  label: Job Title
  email: email@example.com
  phone: (555) 123-4567
  website: https://yoursite.com
  summary: Brief professional summary
  location:
    city: City
    region: State
    countryCode: US

work:
  - name: Company Name
    position: Job Title
    startDate: 2020-01-01
    endDate: 2023-12-31
    summary: Brief role description
    highlights:
      - Key achievement 1
      - Key achievement 2

education:
  - institution: University Name
    area: Major
    studyType: Degree Type
    startDate: 2016-09-01
    endDate: 2020-05-31
    gpa: '3.8'

skills:
  - name: Skill Category
    level: Expert
    keywords:
      - Specific Skill 1
      - Specific Skill 2

projects:
  - name: Project Name
    description: What the project does
    url: https://github.com/username/project
    startDate: 2022-01-01
    endDate: 2022-06-30
    highlights:
      - Project achievement 1
      - Project achievement 2
    keywords:
      - Technology 1
      - Technology 2
```

### Alternative Format Example

If you prefer using `company` instead of `name` and want to separate older experience:

```yaml
basics:
  name: Your Name
  label: Your Title
  email: you@example.com
  location:
    city: San Francisco
    region: CA

work:
  - company: Current Company
    position: Senior Engineer
    startDate: 2020-01-01
    # No endDate means current position
    summary: Brief description
    highlights:
      - Achievement 1
      - Achievement 2

prior_experience:
  - company: Previous Company
    position: Engineer
    summary: Brief description of role
    # No dates needed for prior experience
```

Both formats are automatically normalized and rendered identically!


## Tips for Best Results

### Content Tips

1. **Be Concise** - Keep descriptions clear and focused
2. **Use Action Verbs** - Start bullet points with strong verbs
3. **Quantify Results** - Include numbers and metrics when possible
4. **Keep It Current** - Focus on recent and relevant experience
5. **Proofread** - Check for typos and formatting issues

### Technical Tips

1. **Date Format** - Use ISO format: `YYYY-MM-DD`
2. **Special Characters** - Will be automatically escaped
3. **Line Length** - Keep lines reasonable for readability
4. **Test Themes** - Generate all three to see which looks best
5. **File Size** - PDFs are typically 50-200KB

### Layout Tips

1. **One Page Ideal** - Aim for 1-2 pages maximum
2. **Prioritize Content** - Put most important info first
3. **Use Highlights** - Bullet points are more readable than paragraphs
4. **Skills Organization** - Group related skills together
5. **White Space** - Don't overcrowd the page

## Troubleshooting

### Common Issues

**"File not found" error**
```bash
# Make sure the file path is correct
ls -la resume.yaml
node yaml-to-pdf.js resume.yaml
```

**"Invalid resume format" error**
```bash
# Ensure your YAML has a "basics" section
# Check YAML syntax is valid
```

**PDF is too long**
```bash
# Reduce content, focus on most relevant items
# Use shorter bullet points
# Remove older or less relevant experience
```

**Theme doesn't look right**
```bash
# Try a different theme
node yaml-to-pdf.js resume.yaml output.pdf classic
node yaml-to-pdf.js resume.yaml output.pdf minimal
```

### Debugging

To see detailed output:

```bash
# Run with Node debugging
NODE_DEBUG=* node yaml-to-pdf.js resume.yaml
```

## Advanced Usage

### Batch Processing

Generate all three themes at once:

```bash
#!/bin/bash
for theme in modern classic minimal; do
  node yaml-to-pdf.js resume.yaml "resume-${theme}.pdf" "$theme"
done
```

### Custom Styling

The themes use CSS from `js/theme-styles.css`. To customize:

1. Edit `js/theme-styles.css` for global changes
2. Or modify the `generateHTML()` function in `yaml-to-pdf.js` for script-specific changes

### Programmatic Use

You can also use the script as a module:

```javascript
const { convertYamlToPdf } = require('./yaml-to-pdf.js');

convertYamlToPdf('resume.yaml', 'output.pdf', 'modern')
  .then(() => console.log('Done!'))
  .catch(err => console.error(err));
```

## NPM Scripts Reference

Convenient npm scripts are available in `package.json`:

| Script | Command | Description |
|--------|---------|-------------|
| `npm run resume:pdf` | - | Show help |
| `npm run resume:example` | Generate example PDF | Creates PDF from example YAML |
| `npm run resume:modern` | Modern theme | Generate with modern theme |
| `npm run resume:classic` | Classic theme | Generate with classic theme |
| `npm run resume:minimal` | Minimal theme | Generate with minimal theme |

## Requirements

- Node.js >= 14.0.0
- Puppeteer (already installed in this project)
- No additional dependencies needed!

## Support

For issues or questions:

1. Check `resume-example.yaml` for a working example
2. Verify your YAML syntax is valid
3. Try the example first: `npm run resume:example`
4. Review this guide for troubleshooting tips

## License

This script is part of the NextRole project and follows the same MIT license.

---

**Pro Tip:** Generate all three themes and pick the one that best represents your professional brand! Each theme emphasizes different aspects of your resume.

# Project Structure Map

This file contains a comprehensive map of the JavaScript project structure, including file organization, modules, classes, functions, and key relationships.

## Table of Contents
1. [Project Overview](#project-overview)
2. [File Structure](#file-structure)
3. [Dependencies](#dependencies)
4. [Modules & Classes](#modules--classes)
5. [Functions & Methods](#functions--methods)
6. [Global Variables & Constants](#global-variables--constants)
7. [Event Listeners & DOM Interactions](#event-listeners--dom-interactions)
8. [API Endpoints & External Calls](#api-endpoints--external-calls)

## Project Overview

- **JavaScript Files:** 23
- **HTML Files:** 9
- **CSS Files:** 3
- **Generated:** Mon Jun  9 02:36:39 PM PDT 2025

## File Structure

```
components/
  ai-assistant.js
  api-settings.js
  demo.html
  job-manager.js
  resume-analytics.js
  resume-editor.js
  resume-viewer.js
demo.html
DEVELOPER.md
goal.html
help.html
index.html
jobs.css
jobs.html
js/
  config.js
  core.js
  import-export.js
  jobs.js
  logs.js
  main.js
  modals.js
  preview.js
  README.md
  storage.js
  theme-styles.css
  ui.js
  utils.js
main.js
package-test.json
PROJECT_MAP.md
README.md
reference.html
resume-component.html
resume.json
server/
  chatgptService.js
  claudeService.js
  index.js
  package.json
styles.css
test-demo.js
test-in-browser.js
TESTING.md
verify-demo.html
```

## Dependencies

### Module Imports

**components/ai-assistant.js:**
```javascript
import { logApiCall } from '../js/jobs.js';
```

**components/job-manager.js:**
```javascript
import { JOB_STATUSES, createDefaultJob, saveJob, deleteJob, updateJobStatus, associateResumeWithJob, addJobLog, editJob } from '../js/jobs.js';
```

**components/resume-analytics.js:**
```javascript
        const requiredFields = ['name', 'email', 'phone', 'summary'];
            const requiredFields = ['company', 'position', 'startDate'];
            const missingFields = requiredFields.filter(field => !job[field]);
            const requiredFields = ['institution', 'studyType', 'area', 'startDate'];
            const missingFields = requiredFields.filter(field => !edu[field]);
```

**components/resume-editor.js:**
```javascript
    importJSON(jsonString) {
```

**js/core.js:**
```javascript
import * as utils from './utils.js';
import * as config from './config.js';
import * as ui from './ui.js';
import * as storage from './storage.js';
import * as modals from './modals.js';
import * as preview from './preview.js';
import * as importExport from './import-export.js';
import * as jobs from './jobs.js';
import * as logs from './logs.js';
import '../components/job-manager.js';
```

**js/import-export.js:**
```javascript
import { $, showToast, safelyParseJSON } from './utils.js';
import { hideModal, showModal } from './modals.js';
        const requiredSections = ['basics', 'work', 'education', 'skills', 'projects', 'meta'];
                importedData[section] = section === 'basics' 
            importedData.basics.location = {};
            importFileBtn.disabled = false;
            importFileBtn.disabled = true;
            importFileBtn.disabled = false;
    importFileBtn.addEventListener('click', () => {
                    importFileBtn.disabled = true;
```

**js/jobs.js:**
```javascript
import { $, $$, showToast } from './utils.js';
import { showModal, hideModal } from './modals.js';
```

**js/logs.js:**
```javascript
import { $, $$ } from './utils.js';
```

**js/main.js:**
```javascript
import { app } from './core.js';
import '../components/job-manager.js';
```

**js/modals.js:**
```javascript
import { $, $$, showToast } from './utils.js';
import { createSectionItem } from './ui.js';
        importButton.addEventListener('click', () => {
```

**js/preview.js:**
```javascript
import { $, escapeHtml, formatDate } from './utils.js';
```

**js/storage.js:**
```javascript
import { config } from './config.js';
import { safelyParseJSON, showToast } from './utils.js';
```

**js/ui.js:**
```javascript
import { $, $$, createElement, showToast } from './utils.js';
```

**main.js:**
```javascript
        importFromText() {
        importFromFile() {
        importFromUrl() {
            const SWIPE_THRESHOLD = 50; // Minimum distance required for a swipe
```

**server/chatgptService.js:**
```javascript
const axios = require('axios');
```

**server/claudeService.js:**
```javascript
const axios = require('axios');
```

**server/index.js:**
```javascript
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const http = require('http');
const https = require('https');
const { tailorResumeWithClaude } = require('./claudeService');
const { tailorResumeWithChatGPT } = require('./chatgptService');
```

**test-demo.js:**
```javascript
const puppeteer = require('puppeteer');
const path = require('path');
```

**components/demo.html (Script Tags):**
```html
    <script type="module" src="resume-editor.js"></script>
    <script src="resume-viewer.js"></script>
```

**index.html (Script Tags):**
```html
    <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js" integrity="sha512-GsLlZN/3F2ErC5ifS5QtgpiJtWd43JWSuIgh7mbzZ8zBps+dvLusV+eNQATqgA/HdeKFVgA5v3S/cIrLF7QnIg==" crossorigin="anonymous" referrerpolicy="no-referrer"></script>
<script type="module" src="js/main.js"></script>
```

**jobs.html (Script Tags):**
```html
    <script type="module" src="./components/resume-editor.js"></script>
```

**reference.html (Script Tags):**
```html
    <script src="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/js/all.min.js" integrity="sha512-fD9DI5bZwQxOi7MhYWnnNPlvXdp/2Pj3XSTRrFs5FQa4mizyGLnJcN6tuvUS6LbmgN1ut+XGSABKvjN0H6Aoow==" crossorigin="anonymous" referrerpolicy="no-referrer"></script>
```

## Modules & Classes

### components/ai-assistant.js

**Classes:**
```javascript
class AIAssistant extends HTMLElement {
```

**Module Objects:**
```javascript
        const response = await fetch('/api/tailor-resume', {
```

### components/api-settings.js

**Classes:**
```javascript
class ApiSettings extends HTMLElement {
```

**Module Objects:**
```javascript
            const response = await fetch('https://api.anthropic.com/v1/messages', {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
```

### components/job-manager.js

**Classes:**
```javascript
class JobManager extends HTMLElement {
```

**Module Objects:**
```javascript
        const jobInfo = {
            const jobInfo = {
```

### components/resume-analytics.js

**Classes:**
```javascript
class ResumeAnalytics extends HTMLElement {
```

**Module Objects:**
```javascript
        const analysis = {
        const getScoreColor = (score) => {
```

### components/resume-editor.js

**Classes:**
```javascript
class ResumeEditor extends HTMLElement {
```

**Module Objects:**
```javascript
            const workData = {
            const educationData = {
            const projectData = {
        const opt = {
        const map = {
```

### components/resume-viewer.js

**Classes:**
```javascript
class ResumeJson extends HTMLElement {
```

**Module Objects:**
```javascript
        const templates = {
        const templateStyles = {
```

### js/import-export.js

**Constructor Functions:**
```javascript
function setupFileImport(app) {
function setupUrlImport(app) {
```

### js/jobs.js

**Constructor Functions:**
```javascript
function createJobCard(job) {
function getStatusClass(status) {
function viewJobDetails(job, app) {
function showUpdateStatusModal(job, app) {
```

**Module Objects:**
```javascript
    const logEntry = {
    const logEntry = {
```

### js/logs.js

**Constructor Functions:**
```javascript
function createLogItem(log) {
function formatAction(action) {
```

**Module Objects:**
```javascript
    const logEntry = {
        const filters = {
```

### js/modals.js

**Constructor Functions:**
```javascript
function setupModalCloseHandlers() {
function setupProfileModal(app) {
function setupWorkModal(app) {
function setupEducationModal(app) {
function setupSkillsModal(app) {
```

**Module Objects:**
```javascript
            const profileData = {
            const workData = {
            const educationData = {
            const skillData = {
            const projectData = {
```

### js/preview.js

**Constructor Functions:**
```javascript
function generateModernTheme(resumeData) {
function generateClassicTheme(resumeData) {
function generateMinimalTheme(resumeData) {
```

**Module Objects:**
```javascript
        const options = {
```

### js/utils.js

**Constructor Functions:**
```javascript
function getMonthName(monthIndex, abbreviated = false) {
```

### main.js

**Module Objects:**
```javascript
    const app = {
            const options = {
                const payload = {
            const jobInfo = {
            const sampleData = {
```

### test-demo.js

**Module Objects:**
```javascript
    const hasWorkEvents = await page.evaluate(() => {
    const hasProjectsEvents = await page.evaluate(() => {
    const noErrors = await page.evaluate(() => {
```

### test-in-browser.js

**Constructor Functions:**
```javascript
function runQuickTests() {
function testEditButtonFunctionality() {
```

## Functions & Methods

### components/ai-assistant.js

**Methods:**
```javascript
    constructor() {
    connectedCallback() {
    setJob(job) {
    setResume(resume) {
    render() {
    renderContent() {
        if (!this._job) {
        if (!this._resume) {
        if (this._isGenerating) {
    setupEventListeners() {
```

### components/api-settings.js

**Methods:**
```javascript
    constructor() {
    connectedCallback() {
    loadApiKeys() {
    saveApiKeys() {
    render() {
    setupEventListeners() {
            if (tgt.dataset.click) {
        if (!apiKey) {
        if (this._selectedService === 'claude') {
            if (!response.ok) {
```

### components/job-manager.js

**Methods:**
```javascript
    constructor() {
    connectedCallback() {
    loadJobs() {
    render() {
    renderJobList() {
        if (jobs.length === 0) {
    renderJobDetail() {
        if (!this._selectedJob) {
    renderJobTab(job) {
    renderDetailsTab(job) {
```

### components/resume-analytics.js

**Functions:**
```javascript
            const filledFields = locationFields.filter(field => basics.location[field]);
            const missingFields = requiredFields.filter(field => !job[field]);
            const missingFields = requiredFields.filter(field => !edu[field]);
        const words = cleanText.split(/\s+/).filter(word => 
        const getScoreColor = (score) => {
```

**Methods:**
```javascript
    constructor() {
    connectedCallback() {
    analyzeResume() {
    analyzeBasics(analysis) {
            if (!basics[field]) {
        if (basics.summary) {
            if (summaryLength < 50) {
        if (basics.location) {
            if (filledFields.length === locationFields.length) {
        if (basics.profiles && basics.profiles.length > 0) {
```

### components/resume-editor.js

**Functions:**
```javascript
                const existingResume = registry.find(r => r.name === name && r.id !== this.data.meta.id);
        const existingResume = registry.find(r => r.name === nameInput.value && r.id !== this.data.meta.id);
            const existingIndex = registry.findIndex(r => r.id === resumeId);
            const index = registry.findIndex(r => r.id === resumeId);
            const latestResume = registry.sort((a, b) => new Date(b.savedDate) - new Date(a.savedDate))[0];
```

**Methods:**
```javascript
    constructor() {
    connectedCallback() {
            if (e.key === 'Escape') {
    disconnectedCallback() {
    initLocalStorage() {
            if (!resumeRegistry) {
    isLocalStorageAvailable() {
    getDefaultResumeData() {
    render() {
            if (saveBtn) {
```

### components/resume-viewer.js

**Functions:**
```javascript
                const profilesHtml = data.basics.profiles.map(p => 
            const workHtml = data.work.map(job => `
            const educationHtml = data.education.map(edu => `
            const skillsHtml = data.skills.map(skill => `
            const projectsHtml = data.projects.map(project => `
```

**Methods:**
```javascript
    constructor() {
    connectedCallback() {
    attributeChangedCallback(name, oldValue, newValue) {
        if (name === 'template') {
    render() {
        if (!this._resumeData) {
    processTemplate(template, data) {
        if (data.basics) {
            if (data.basics.profiles) {
        if (data.work) {
```

### js/core.js

**Methods:**
```javascript
    init() {
        if (!this.data.education) {
        if (!this.data.skills) {
        if (!this.data.projects) {
        if (sidebarItems.length > 0) {
                    if (viewId) {
                        if (viewId === 'jobs') {
    setupJobEventListeners() {
    setupEventListeners() {
    setupSaveLoadEventListeners() {
```

### js/import-export.js

**Functions:**
```javascript
function setupFileImport(app) {
function setupUrlImport(app) {
```

**Methods:**
```javascript
        if (jsonOutput) {
        if (!importedData || typeof importedData !== 'object') {
        if (!importedData.basics) {
            if (!importedData[section]) {
        if (!importedData.basics.location) {
        if (file) {
        if (file) {
        if (!file) {
        if (!url) {
            if (!response.ok) {
```

### js/jobs.js

**Functions:**
```javascript
function createJobCard(job) {
function getStatusClass(status) {
function viewJobDetails(job, app) {
function showUpdateStatusModal(job, app) {
```

**Methods:**
```javascript
    if (jobs[jobId]) {
    if (newStatus === 'applied' && !job.dateApplied) {
        if (child !== emptyState) {
    if (jobsList.length === 0) {
    switch (status) {
    if (job.dateApplied) {
    if (job.url) {
    if (job.resumeId) {
    if (job.statusHistory && job.statusHistory.length > 0) {
    if (!app) {
```

### js/logs.js

**Functions:**
```javascript
function createLogItem(log) {
function formatAction(action) {
```

**Methods:**
```javascript
    if (filters.type) {
    if (filters.startDate) {
    if (filters.endDate) {
    if (filters.search) {
    if (logs.length === 0) {
    switch (log.type) {
    switch (log.type) {
```

### js/modals.js

**Functions:**
```javascript
function setupModalCloseHandlers() {
function setupProfileModal(app) {
function setupWorkModal(app) {
function setupEducationModal(app) {
function setupSkillsModal(app) {
function setupProjectsModal(app) {
function setupImportModal(app) {
function setupExportModal(app) {
function setupSaveLoadModals(app) {
function setupJobsModal(app) {
function setupSettingsModal(app) {
```

**Methods:**
```javascript
            if (e.target === modal) {
    if (modal) {
            if (firstInput) {
    if (modal) {
    if (addProfileBtn) {
    if (saveProfileBtn) {
            if (!network) {
            if (app.state.currentEditIndex >= 0) {
        if (child !== emptyState) {
    if (app.data.basics.profiles.length === 0) {
```

### js/preview.js

**Functions:**
```javascript
function generateModernTheme(resumeData) {
function generateClassicTheme(resumeData) {
function generateMinimalTheme(resumeData) {
```

**Methods:**
```javascript
    if (previewRefreshBtn) {
    if (previewPrintBtn) {
    if (previewPdfBtn) {
    if (previewThemeSelect) {
            switch(theme) {
    if (!resumeData || !resumeData.basics) {
    if (!resumeData || !resumeData.basics) {
    if (!resumeData || !resumeData.basics) {
```

### js/storage.js

**Methods:**
```javascript
        if (savedResumes[name]) {
```

### js/ui.js

**Methods:**
```javascript
            if (viewId) {
            if (tabId) {
                if (window.innerWidth <= 768) {
        if (item.dataset.view === viewId) {
    if (window.innerWidth <= 768) {
        if (tab.dataset.tab === tabId) {
        if (tab.dataset.modalTab === tabId) {
        if (difference > 0) {
            if (nextTab) {
            if (prevTab) {
```

### js/utils.js

**Functions:**
```javascript
function getMonthName(monthIndex, abbreviated = false) {
```

**Methods:**
```javascript
        switch (format) {
        if (key === 'className') {
        if (typeof child === 'string') {
```

### main.js

**Functions:**
```javascript
    const $ = str => document.querySelector(str);
    const $$ = str => document.querySelectorAll(str);
                const existingIndex = registry.findIndex(r => r.id === resumeId);
                const updatedRegistry = registry.filter(r => r.id !== resumeId);
                const resumeIndex = registry.findIndex(r => r.id === resumeId);
            const existingResume = registry.find(r => r.name === nameInput.value && r.id !== app.data.meta.id);
                const existingResume = registry.find(r => r.name === newName && r.id !== app.data.meta.id);
            const job = jobs.find(j => j.id === jobId);
            const jobIndex = jobs.findIndex(j => j.id === jobId);
            const updatedJobs = jobs.filter(j => j.id !== jobId);
```

**Methods:**
```javascript
        init() {
            if (sidebarItems.length > 0) {
                        if (viewId) {
        setupEventListeners() {
                    if (viewId) {
                    if (tabId) {
                        if (window.innerWidth <= 768) {
                if (fileName) {
                if (file && file.type === 'application/json') {
        formatDate(dateStr) {
```

### server/chatgptService.js

**Methods:**
```javascript
      if (!jsonMatch) {
    if (!result.resume || !result.coverLetter || !result.jobDescription) {
```

### server/claudeService.js

**Methods:**
```javascript
    if (!response.data || !response.data.content || !response.data.content[0] || !response.data.content[0].text) {
    if (!jsonMatch) {
    if (!result.resume || !result.coverLetter || !result.jobDescription) {
    if (error.response) {
```

### server/index.js

**Methods:**
```javascript
  if (req.secure || req.hostname === 'localhost' || req.hostname === '127.0.0.1') {
    if (!prompt || !apiType || !apiKey) {
    if (apiType === 'claude') {
```

### test-demo.js

**Functions:**
```javascript
    const hasWorkEvents = await page.evaluate(() => {
    const hasProjectsEvents = await page.evaluate(() => {
    const noErrors = await page.evaluate(() => {
```

**Methods:**
```javascript
    if (hasWorkEvents && hasProjectsEvents) {
    if (noErrors) {
if (require.main === module) {
```

### test-in-browser.js

**Functions:**
```javascript
function runQuickTests() {
function testEditButtonFunctionality() {
```

**Methods:**
```javascript
            if (test.details) {
            if (test.details) {
    if (passed === total) {
    if (!window.app.currentResumeData) {
    if (editButtons.length > 0) {
if (typeof module !== 'undefined' && module.exports) {
```

## Global Variables & Constants

### js/logs.js
```javascript
const MAX_LOGS = 100;
```

### server/chatgptService.js
```javascript
const axios = require('axios');
```

### server/claudeService.js
```javascript
const axios = require('axios');
```

### server/index.js
```javascript
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const http = require('http');
const https = require('https');
const { tailorResumeWithClaude } = require('./claudeService');
const { tailorResumeWithChatGPT } = require('./chatgptService');
const app = express();
```

### test-demo.js
```javascript
const puppeteer = require('puppeteer');
const path = require('path');
```

## Event Listeners & DOM Interactions

### components/ai-assistant.js
```javascript
        this.shadowRoot.addEventListener('click', (e) => {
        const serviceSelector = this.shadowRoot.getElementById('ai-service');
            serviceSelector.addEventListener('change', (e) => {
        const section = document.createElement('div');
        this.shadowRoot.querySelector('.ai-content').appendChild(section);
        const error = document.createElement('div');
        this.shadowRoot.querySelector('.ai-content').appendChild(error);
            const success = document.createElement('div');
```

### components/api-settings.js
```javascript
        this.shadowRoot.addEventListener('click', (e) => {
        const apiKeyInput = this.shadowRoot.getElementById('api-key');
        const statusElement = this.shadowRoot.getElementById('status-message');
```

### components/job-manager.js
```javascript
        const resumeViewer = this.shadowRoot.querySelector('#job-resume-viewer');
        if (window.app && typeof window.app.getSavedResumes === 'function') {
            return window.app.getSavedResumes() || [];
        if (window.app && typeof window.app.getSavedResumes === 'function') {
            const savedResumes = window.app.getSavedResumes();
        this.shadowRoot.addEventListener('click', (e) => {
        this.shadowRoot.addEventListener('change', (e) => {
        this.shadowRoot.addEventListener('submit', (e) => {
        this.shadowRoot.addEventListener('input', (e) => {
        this.shadowRoot.addEventListener('change', (e) => {
```

### components/resume-editor.js
```javascript
        document.addEventListener('keydown', this._escapeHandler);
        document.removeEventListener('keydown', this._escapeHandler);
            const saveButton = document.querySelector('#save-button');
            const loadButton = document.querySelector('#load-button');
            const saveBtn = this.querySelector('#resume-save-btn');
        this.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', () => {
        const saveButton = document.querySelector('#save-button');
            saveButton.addEventListener('click', () => this.openSaveModal());
        const loadButton = document.querySelector('#load-button');
```

### js/core.js
```javascript
                item.addEventListener('click', () => {
        utils.$('#add-job-button')?.addEventListener('click', () => {
        utils.$('#save-job-edit')?.addEventListener('click', () => {
        utils.$('#update-job-status')?.addEventListener('click', () => {
            utils.$('.tab[data-tab="preview"]').addEventListener('click', () => {
        utils.$('#copy-button')?.addEventListener('click', () => {
        utils.$('#save-button')?.addEventListener('click', () => {
        utils.$('#load-button')?.addEventListener('click', () => {
            const item = document.createElement('div');
        savedResumesList.querySelectorAll('.load-resume').forEach(btn => {
```

### js/import-export.js
```javascript
    $('#import-paste')?.addEventListener('click', () => {
    dragDropArea.addEventListener('click', () => {
    fileInput.addEventListener('change', (e) => {
    dragDropArea.addEventListener('dragover', (e) => {
    dragDropArea.addEventListener('dragleave', () => {
    dragDropArea.addEventListener('drop', (e) => {
    importFileBtn.addEventListener('click', () => {
    importUrlBtn.addEventListener('click', async () => {
        exportButton.addEventListener('click', () => {
        copyJsonButton.addEventListener('click', () => {
```

### js/jobs.js
```javascript
    const item = document.createElement('div');
    $('#jobs-container')?.addEventListener('click', e => {
            const historyItem = document.createElement('div');
```

### js/logs.js
```javascript
    const item = document.createElement('div');
    const expandButton = item.querySelector('.log-expand');
    expandButton.addEventListener('click', () => {
        const details = item.querySelector('.log-details');
        const icon = expandButton.querySelector('i');
    filtersForm.addEventListener('submit', (e) => {
            type: filtersForm.querySelector('#log-filter-type').value || null,
            startDate: filtersForm.querySelector('#log-filter-start-date').value || null,
            endDate: filtersForm.querySelector('#log-filter-end-date').value || null,
            search: filtersForm.querySelector('#log-filter-search').value || null
```

### js/modals.js
```javascript
        btn.addEventListener('click', () => {
        btn.addEventListener('click', () => {
        modal.addEventListener('click', (e) => {
            const firstInput = modal.querySelector('input, textarea, select');
    modal.querySelectorAll('input, textarea').forEach(input => {
        addProfileBtn.addEventListener('click', () => {
        saveProfileBtn.addEventListener('click', () => {
    $('#profiles-container').addEventListener('click', (e) => {
        addWorkBtn.addEventListener('click', () => {
        saveWorkBtn.addEventListener('click', () => {
```

### js/preview.js
```javascript
        previewRefreshBtn.addEventListener('click', () => {
        previewPrintBtn.addEventListener('click', () => {
            window.print();
        previewPdfBtn.addEventListener('click', () => {
        previewThemeSelect.addEventListener('change', () => {
```

### js/ui.js
```javascript
        item.addEventListener('click', () => {
    $('.hamburger-menu').addEventListener('click', () => {
    $('.menu-backdrop').addEventListener('click', () => {
        tab.addEventListener('click', () => {
                if (window.innerWidth <= 768) {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (window.innerWidth <= 768) {
    modal.querySelectorAll('.tab').forEach(tab => {
    modal.querySelectorAll('.panel').forEach(panel => panel.classList.remove('active'));
    modal.querySelector(`#${tabId}-panel`).classList.add('active');
```

### js/utils.js
```javascript
export const $ = str => document.querySelector(str);
export const $$ = str => document.querySelectorAll(str);
    const element = document.createElement(tag);
            element.appendChild(document.createTextNode(child));
```

### main.js
```javascript
    const $ = str => document.querySelector(str);
    const $$ = str => document.querySelectorAll(str);
                    item.addEventListener('click', () => {
                item.addEventListener('click', () => {
            $('.hamburger-menu').addEventListener('click', () => {
            $('.menu-backdrop').addEventListener('click', () => {
                tab.addEventListener('click', () => {
                        if (window.innerWidth <= 768) {
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                btn.addEventListener('click', app.closeAllModals);
```

### test-demo.js
```javascript
        const workList = document.querySelector('#work-list');
        const projectsList = document.querySelector('#projects-list');
            if (!window.app) return false;
            if (typeof window.app.setupSectionEventDelegation !== 'function') return false;
            if (typeof window.app.updateWorkSection !== 'function') return false;
            if (typeof window.app.updateProjectsSection !== 'function') return false;
```

### test-in-browser.js
```javascript
        test: () => typeof window.app === 'object' && window.app !== null,
        details: 'window.app should be defined'
        test: () => containers.every(selector => document.querySelector(selector) !== null),
        test: () => typeof window.app.setupSectionEventDelegation === 'function',
        test: () => updateMethods.every(method => typeof window.app[method] === 'function'),
        window.app.setupSectionEventDelegation();
    const workList = document.querySelector('#work-list');
    const projectsList = document.querySelector('#projects-list');
                if (workList) workList.addEventListener('test', () => {});
                if (projectsList) projectsList.addEventListener('test', () => {});
```

## API Endpoints & External Calls

### components/ai-assistant.js
```javascript
        const response = await fetch('/api/tailor-resume', {
```

### components/api-settings.js
```javascript
            const response = await fetch('https://api.anthropic.com/v1/messages', {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
```

### components/job-manager.js
```javascript
        this._selectedJob.title = formData.get('title') || '';
        this._selectedJob.company = formData.get('company') || '';
        this._selectedJob.postDate = formData.get('postDate') || '';
        this._selectedJob.shortDescription = formData.get('shortDescription') || '';
        this._selectedJob.location = formData.get('location') || '';
        this._selectedJob.url = formData.get('url') || '';
        this._selectedJob.description = formData.get('description') || '';
        this._selectedJob.notes = formData.get('notes') || '';
        this._selectedJob.contactName = formData.get('contactName') || '';
        this._selectedJob.contactEmail = formData.get('contactEmail') || '';
```

### components/resume-viewer.js
```javascript
            const response = await fetch(url);
```

### js/import-export.js
```javascript
            const response = await fetch(url);
```

### js/modals.js
```javascript
                    const endpoint = `http://${window.location.hostname}:3000/api/tailor-resume`;
                    const response = await fetch(endpoint, {
            const response = await fetch('https://api.anthropic.com/v1/messages', {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
```

### main.js
```javascript
            fetch(url)
                fetch(apiurl, {
            fetch('https://api.anthropic.com/v1/messages', {
            fetch('https://api.openai.com/v1/chat/completions', {
                    "website": "https://johndoe.com",
                            "url": "https://linkedin.com/in/johndoe"
                            "url": "https://github.com/johndoe"
                        "url": "https://techsolutions.example.com",
                        "url": "https://webdevco.example.com",
                        "url": "https://github.com/johndoe/ecommerce"
```

### server/chatgptService.js
```javascript
const axios = require('axios');
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
```

### server/claudeService.js
```javascript
const axios = require('axios');
    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
```

### server/index.js
```javascript
  const httpsUrl = `https://${req.hostname}${req.url}`;
app.post('/api/tailor-resume', async (req, res) => {
app.get('*', (req, res) => {
```


---

## Usage Instructions

This file should be included in your project's CLAUDE.md or similar documentation file. When working with Claude on this project, reference this map to provide context about:

- File organization and structure
- Available modules and classes
- Function and method signatures
- Dependencies and imports
- DOM interaction patterns
- API endpoints and external services

**Regenerate this file when:**
- Adding new modules or significant features
- Restructuring the project
- Adding new dependencies
- Changing core architecture

**Command to regenerate:**
```bash
./js-project-mapper.sh [project-directory] [output-file]
```


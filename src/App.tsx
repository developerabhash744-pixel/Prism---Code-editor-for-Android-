import React, { useState, useEffect, useRef } from 'react';
import CodeMirror, { EditorView } from '@uiw/react-codemirror';
import { dracula } from '@uiw/codemirror-theme-dracula';
import { githubDark, githubLight } from '@uiw/codemirror-theme-github';
import { nord } from '@uiw/codemirror-theme-nord';
import { material } from '@uiw/codemirror-theme-material';
import { tokyoNight } from '@uiw/codemirror-theme-tokyo-night';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';

const themesMap: Record<string, any> = {
  dracula,
  githubDark,
  githubLight,
  nord,
  material,
  tokyoNight
};
import { javascript } from '@codemirror/lang-javascript';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { python } from '@codemirror/lang-python';
import { markdown } from '@codemirror/lang-markdown';

// Lucide React Icons
import {
  Plus,
  Trash2,
  Play,
  Settings,
  Terminal,
  Eye,
  RefreshCw,
  X,
  Code2,
  Info,
  AlertTriangle,
  XCircle,
  FileCode,
  Sparkles,
  Search,
  Package,
  Folder,
  FolderOpen,
  GitBranch,
  Filter,
  ChevronRight,
  ChevronDown,
  FilePlus,
  FolderPlus,
  FolderMinus,
  User,
  Command,
  Activity
} from 'lucide-react';

import './App.css';

// Types
interface VirtualFile {
  name: string;
  content: string;
  language: string;
}

interface TreeNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: TreeNode[];
  fileData?: VirtualFile;
}

function buildFileTree(files: VirtualFile[], emptyFolders: string[] = []): TreeNode {
  const root: TreeNode = { name: 'workspace', path: 'workspace', type: 'folder', children: [] };

  const addFolder = (folderPath: string) => {
    const parts = folderPath.split('/');
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const currentPath = parts.slice(0, i + 1).join('/');

      current.children = current.children || [];
      let folder = current.children.find(c => c.name === part && c.type === 'folder');
      if (!folder) {
        folder = {
          name: part,
          path: currentPath,
          type: 'folder',
          children: []
        };
        current.children.push(folder);
      }
      current = folder;
    }
  };

  files.forEach(file => {
    const parts = file.name.split('/');
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;
      const currentPath = parts.slice(0, i + 1).join('/');

      current.children = current.children || [];
      if (isLast) {
        if (!current.children.some(c => c.name === part)) {
          current.children.push({
            name: part,
            path: file.name,
            type: 'file',
            fileData: file
          });
        }
      } else {
        let folder = current.children.find(c => c.name === part && c.type === 'folder');
        if (!folder) {
          folder = {
            name: part,
            path: currentPath,
            type: 'folder',
            children: []
          };
          current.children.push(folder);
        }
        current = folder;
      }
    }
  });

  emptyFolders.forEach(addFolder);

  const sortNodes = (node: TreeNode) => {
    if (node.children) {
      node.children.sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === 'folder' ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });
      node.children.forEach(sortNodes);
    }
  };
  sortNodes(root);

  return root;
}

interface ConsoleLog {
  level: 'log' | 'warn' | 'error';
  text: string;
  timestamp: Date;
}

// Initial File System
const DEFAULT_FILES: VirtualFile[] = [
  {
    name: 'src/index.html',
    language: 'html',
    content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Prism Live Preview</title>
  <link rel="stylesheet" href="assets/style.css">
</head>
<body>
  <div class="card">
    <div class="glow-orb"></div>
    <h1>Welcome to Prism! 🚀</h1>
    <p>A high-performance code editor running completely in your browser.</p>
    
    <div class="interactive-demo">
      <p id="counter-val">Clicks: 0</p>
      <button id="click-btn" class="glow-button">Click Me!</button>
    </div>
  </div>

  <script src="assets/script.js"></script>
</body>
</html>`
  },
  {
    name: 'src/assets/style.css',
    language: 'css',
    content: `body {
  margin: 0;
  padding: 24px;
  font-family: 'Outfit', system-ui, -apple-system, sans-serif;
  background: radial-gradient(circle at center, #0f1016 0%, #050508 100%);
  color: #f3f4f6;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  box-sizing: border-box;
  overflow: hidden;
}

.card {
  position: relative;
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 40px 32px;
  border-radius: 20px;
  max-width: 440px;
  width: 100%;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.4);
  text-align: center;
  z-index: 1;
}

.glow-orb {
  position: absolute;
  top: -40px;
  left: 50%;
  transform: translateX(-50%);
  width: 150px;
  height: 150px;
  background: radial-gradient(circle, rgba(91, 109, 242, 0.4) 0%, rgba(91, 109, 242, 0) 70%);
  z-index: -1;
  pointer-events: none;
}

h1 {
  font-size: 28px;
  margin-top: 0;
  margin-bottom: 12px;
  font-weight: 700;
  background: linear-gradient(135deg, #00f2fe 0%, #4facfe 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

p {
  color: #9ca3af;
  font-size: 15px;
  line-height: 1.6;
  margin-bottom: 24px;
}

.interactive-demo {
  margin-top: 24px;
  padding: 20px;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.04);
}

#counter-val {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 12px;
  color: #00f2fe;
}

.glow-button {
  background: linear-gradient(135deg, #5b6df2 0%, #8b5cf6 100%);
  color: white;
  border: none;
  padding: 12px 28px;
  font-size: 15px;
  font-weight: 600;
  border-radius: 10px;
  cursor: pointer;
  box-shadow: 0 4px 15px rgba(91, 109, 242, 0.3);
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.glow-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(91, 109, 242, 0.5);
  filter: brightness(1.1);
}

.glow-button:active {
  transform: translateY(0);
}`
  },
  {
    name: 'src/assets/script.js',
    language: 'javascript',
    content: `// Dynamic Interaction Code
console.log("Welcome to Prism Editor Console! 🚀");
console.log("Loading script.js...");

const counterVal = document.getElementById('counter-val');
const clickBtn = document.getElementById('click-btn');
let clicks = 0;

if (clickBtn) {
  clickBtn.addEventListener('click', () => {
    clicks++;
    counterVal.textContent = \`Clicks: \${clicks}\`;
    
    // Testing console output logging
    console.log(\`Clicked! Total clicks: \${clicks}\`);
    
    if (clicks === 5) {
      console.warn("Nice work! That's 5 clicks. Let's make it to 10!");
    }
    
    if (clicks === 10) {
      console.error("Critical click threshold reached! 💥 Just kidding, congrats on 10 clicks!");
    }
  });
}`
  },
  {
    name: 'README.md',
    language: 'markdown',
    content: `# 🌈 Prism Code Editor

Welcome to **Prism**, a premium, offline-first mobile-responsive code editor built with React, Vite, and CodeMirror 6.

## 🛠️ Features

* **Virtual Filesystem:** Edit multiple files, delete, rename, and add new ones.
* **Instant Hot Run:** Press the **Run** button to compile your HTML, CSS, and JS.
* **Integrated Web Console:** Intercept logs, warnings, and errors directly.
* **Custom Styling & Themes:** Multiple themes, custom font sizes, word wrap, and line numbers.
* **Offline Ready:** All libraries are packaged inside.

## 📱 Mobile Layouts
Prism automatically shifts to a bottom-nav tabbed system on smaller mobile devices, maximizing screenspace. When compiled to an **APK**, it feels like a native mobile app!
`
  }
];

// Available modules structure (plugins/extensions)
interface Module {
  id: string;
  name: string;
  description: string;
  cdnUrl: string;
  version: string;
}

const AVAILABLE_MODULES: Module[] = [
  { id: 'tailwind', name: 'Tailwind CSS (Play CDN)', description: 'Utility-first CSS framework directly in preview.', cdnUrl: 'https://cdn.tailwindcss.com', version: '3.4.1' },
  { id: 'confetti', name: 'Canvas Confetti', description: 'Create beautiful confetti explosions in code.', cdnUrl: 'https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.3/dist/confetti.browser.min.js', version: '1.9.3' },
  { id: 'lodash', name: 'Lodash', description: 'Utility library for arrays, numbers, objects, strings.', cdnUrl: 'https://cdn.jsdelivr.net/npm/lodash@4.17.21/lodash.min.js', version: '4.17.21' },
  { id: 'gsap', name: 'GSAP Animation', description: 'Ultra high-performance professional animations.', cdnUrl: 'https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js', version: '3.12.5' },
  { id: 'chartjs', name: 'Chart.js', description: 'Simple yet flexible JavaScript charting.', cdnUrl: 'https://cdn.jsdelivr.net/npm/chart.js@4.4.2/dist/chart.umd.js', version: '4.4.2' },
  { id: 'anime', name: 'Anime.js', description: 'Lightweight JavaScript animation library.', cdnUrl: 'https://cdn.jsdelivr.net/npm/animejs@3.2.2/lib/anime.min.js', version: '3.2.2' },
  { id: 'fontawesome', name: 'FontAwesome Icons', description: 'CDN link for FontAwesome icons CSS pack.', cdnUrl: 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css', version: '6.5.1' },
  { id: 'animatecss', name: 'Animate.css', description: 'Ready-to-use cross-browser CSS animations library.', cdnUrl: 'https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.1.1/animate.min.css', version: '4.1.1' },
  { id: 'threejs', name: 'Three.js', description: '3D Library for JavaScript WebGL rendering.', cdnUrl: 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js', version: 'r128' },
  { id: 'jquery', name: 'jQuery', description: 'Fast, small, feature-rich DOM control library.', cdnUrl: 'https://code.jquery.com/jquery-3.7.1.min.js', version: '3.7.1' }
];

export default function App() {
  // --- STATE ---
  const [files, setFiles] = useState<VirtualFile[]>([]);
  
  const [activeFileName, setActiveFileName] = useState<string>('Welcome');

  const [openTabs, setOpenTabs] = useState<string[]>(['Welcome']);

  // Editor Settings
  const [fontSize, setFontSize] = useState<number>(14);
  const [themeName, setThemeName] = useState<string>('dracula');
  const [wordWrap, setWordWrap] = useState<boolean>(true);
  const [lineNumbers, setLineNumbers] = useState<boolean>(true);

  // View States
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [mobileTab, setMobileTab] = useState<'editor' | 'preview' | 'console'>('editor');
  const [consoleLogs, setConsoleLogs] = useState<ConsoleLog[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string>('');

  // Expanded folders record
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>(() => {
    return { 'workspace': true, 'src': true, 'src/assets': true };
  });

  const toggleFolder = (path: string) => {
    setExpandedFolders(prev => ({
      ...prev,
      [path]: prev[path] === false ? true : false
    }));
  };

  const getFileIconColor = (filename: string) => {
    if (filename.endsWith('.html')) return '#e34f26';
    if (filename.endsWith('.css')) return '#1572b6';
    if (filename.endsWith('.js') || filename.endsWith('.jsx')) return '#f7df1e';
    if (filename.endsWith('.ts') || filename.endsWith('.tsx')) return '#3178c6';
    if (filename.endsWith('.md')) return '#4facfe';
    return 'var(--text-secondary)';
  };

  // Terminal & folders state
  const [isTerminalInstalled, setIsTerminalInstalled] = useState<boolean>(() => {
    return localStorage.getItem('prism_terminal_installed') === 'true';
  });
  const [recentFolders, setRecentFolders] = useState<string[]>(() => {
    return JSON.parse(localStorage.getItem('prism_recent_folders') || '[]');
  });
  const [activeConsoleTab, setActiveConsoleTab] = useState<'logs' | 'terminal'>('logs');

  const [terminalLines, setTerminalLines] = useState<string[]>([
    'Prism Terminal v1.0.0 (Internal Storage Shell)',
    'Connected to app file storage.',
    'Type "help" for a list of available filesystem commands.',
    ''
  ]);
  const [terminalInput, setTerminalInput] = useState<string>('');
  const [terminalPath, setTerminalPath] = useState<string>('workspace');

  const [terminalOS, setTerminalOS] = useState<string>(() => {
    return localStorage.getItem('prism_terminal_os') || 'alpine';
  });
  const [installingOS, setInstallingOS] = useState<boolean>(false);
  const [installProgress, setInstallProgress] = useState<number>(0);
  const [installStatusText, setInstallStatusText] = useState<string>('');

  // Loading states
  const [loadingProgress, setLoadingProgress] = useState<number>(0);
  const [loadingText, setLoadingText] = useState<string>('Initializing engines...');
  const [appLoaded, setAppLoaded] = useState<boolean>(false);

  // Simulated resource loading sequence
  useEffect(() => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.floor(Math.random() * 8) + 4;
      if (progress >= 100) {
        progress = 100;
        setLoadingProgress(100);
        setLoadingText('Prism is ready!');
        clearInterval(interval);
        if (Capacitor.isNativePlatform()) {
          loadNativeFilesystem();
        }
        setTimeout(() => {
          setAppLoaded(true);
        }, 500);
      } else {
        setLoadingProgress(progress);
        if (progress < 20) {
          setLoadingText('Initializing Prism core engines...');
        } else if (progress < 45) {
          setLoadingText('Loading CodeMirror editor modules...');
        } else if (progress < 65) {
          setLoadingText('Restoring virtual workspace files...');
        } else if (progress < 85) {
          setLoadingText('Loading editor theme packages...');
        } else {
          setLoadingText('Configuring sandbox environment...');
        }
      }
    }, 120);
    return () => clearInterval(interval);
  }, []);

  // Activity Bar & Sidebar layout tabs
  const [activeSidebarTab, setActiveSidebarTab] = useState<'files' | 'search' | 'modules' | 'settings' | 'terminal'>('files');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [moduleSearchQuery, setModuleSearchQuery] = useState<string>('');
  const [installedExpanded, setInstalledExpanded] = useState<boolean>(true);
  const [popularExpanded, setPopularExpanded] = useState<boolean>(false);
  const [recommendedExpanded, setRecommendedExpanded] = useState<boolean>(true);
  
  const [installedModules, setInstalledModules] = useState<string[]>(() => {
    const saved = localStorage.getItem('prism_installed_modules');
    return saved ? JSON.parse(saved) : [];
  });

  // Sync modules to localStorage
  useEffect(() => {
    localStorage.setItem('prism_installed_modules', JSON.stringify(installedModules));
  }, [installedModules]);

  // Modals
  const [showNewFileModal, setShowNewFileModal] = useState<boolean>(false);
  const [newFileName, setNewFileName] = useState<string>('');
  
  const [showRenameModal, setShowRenameModal] = useState<boolean>(false);
  const [renameTargetName, setRenameTargetName] = useState<string>('');
  const [renameNewName, setRenameNewName] = useState<string>('');

  // Custom modal states
  const [showNewFolderModal, setShowNewFolderModal] = useState<boolean>(false);
  const [newFolderName, setNewFolderName] = useState<string>('');

  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [deleteTargetName, setDeleteTargetName] = useState<string>('');

  const [showGitModal, setShowGitModal] = useState<boolean>(false);
  const [gitRepoUrl, setGitRepoUrl] = useState<string>('');

  const [showOpenFolderModal, setShowOpenFolderModal] = useState<boolean>(false);
  const [folderToOpenName, setFolderToOpenName] = useState<string>('');

  // Empty folders track
  const [emptyFolders, setEmptyFolders] = useState<string[]>([]);

  // Folder open and Explorer menu states
  const [isFolderOpen, setIsFolderOpen] = useState<boolean>(false);
  const [showExplorerMenu, setShowExplorerMenu] = useState<boolean>(false);

  // Profile and Settings popover states
  const [activePopover, setActivePopover] = useState<'profile' | 'settings' | null>(null);

  // Command Palette states
  const [showCommandPalette, setShowCommandPalette] = useState<boolean>(false);
  const [commandSearch, setCommandSearch] = useState<string>('');

  // Additional settings
  const [tabSize, setTabSize] = useState<number>(4);

  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Sync to LocalStorage
  useEffect(() => {
    localStorage.setItem('prism_files', JSON.stringify(files));
  }, [files]);

  // Sync modules to localStorage
  useEffect(() => {
    localStorage.setItem('prism_installed_modules', JSON.stringify(installedModules));
  }, [installedModules]);

  // Click outside listener to close popovers
  useEffect(() => {
    const handleOutsideClick = () => {
      setActivePopover(null);
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  // Handle preview messages (console redirection)
  useEffect(() => {
    const handleConsoleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'PRISM_CONSOLE_LOG') {
        const { level, data } = event.data;
        setConsoleLogs(prev => [
          ...prev,
          {
            level,
            text: data,
            timestamp: new Date()
          }
        ]);
      }
    };

    window.addEventListener('message', handleConsoleMessage);
    return () => window.removeEventListener('message', handleConsoleMessage);
  }, []);

  const activeFile = files.find(f => f.name === activeFileName);

  // --- ACTIONS ---
  
  // File System Operations
  const handleCreateFile = () => {
    if (!newFileName.trim()) return;
    
    // Check duplication
    if (files.some(f => f.name.toLowerCase() === newFileName.toLowerCase())) {
      alert('A file with this name already exists.');
      return;
    }

    const extension = newFileName.split('.').pop()?.toLowerCase() || '';
    let language = 'text';
    if (['html', 'htm'].includes(extension)) language = 'html';
    else if (extension === 'css') language = 'css';
    else if (['js', 'jsx', 'ts', 'tsx'].includes(extension)) language = 'javascript';
    else if (extension === 'py') language = 'python';
    else if (['md', 'markdown'].includes(extension)) language = 'markdown';

    const newFile: VirtualFile = {
      name: newFileName,
      content: '',
      language
    };

    setFiles(prev => [...prev, newFile]);
    setActiveFileName(newFileName);
    if (!openTabs.includes(newFileName)) {
      setOpenTabs(prev => [...prev, newFileName]);
    }
    
    // Write native file to internal storage
    if (Capacitor.isNativePlatform()) {
      Filesystem.writeFile({
        path: newFileName,
        data: '',
        directory: Directory.Data,
        encoding: Encoding.UTF8,
        recursive: true
      }).catch(err => console.error("Error creating native file:", err));
    }

    // Auto-expand parents
    const parts = newFileName.split('/');
    if (parts.length > 1) {
      const expandedUpdate: Record<string, boolean> = {};
      for (let i = 0; i < parts.length - 1; i++) {
        const currentPath = parts.slice(0, i + 1).join('/');
        expandedUpdate[currentPath] = true;
      }
      setExpandedFolders(prev => ({ ...prev, ...expandedUpdate }));
    }

    setNewFileName('');
    setShowNewFileModal(false);
  };

  const handleRenameFile = () => {
    if (!renameNewName.trim() || !renameTargetName) return;

    if (files.some(f => f.name.toLowerCase() === renameNewName.toLowerCase() && f.name !== renameTargetName)) {
      alert('A file with this name already exists.');
      return;
    }

    // Rename native file in internal storage
    if (Capacitor.isNativePlatform()) {
      Filesystem.rename({
        from: renameTargetName,
        to: renameNewName,
        directory: Directory.Data
      }).catch(err => console.error("Error renaming native file:", err));
    }

    setFiles(prev => prev.map(f => {
      if (f.name === renameTargetName) {
        return { ...f, name: renameNewName };
      }
      return f;
    }));

    // Update active tab and open tabs
    if (activeFileName === renameTargetName) {
      setActiveFileName(renameNewName);
    }
    setOpenTabs(prev => prev.map(t => t === renameTargetName ? renameNewName : t));

    setRenameTargetName('');
    setRenameNewName('');
    setShowRenameModal(false);
  };

  const handleDeleteFile = (fileName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteTargetName(fileName);
    setShowDeleteModal(true);
  };

  const handleEditorChange = (value: string) => {
    if (!activeFileName) return;
    setFiles(prev => prev.map(f => {
      if (f.name === activeFileName) {
        return { ...f, content: value };
      }
      return f;
    }));

    // Write file content changes to native internal storage
    if (Capacitor.isNativePlatform() && activeFileName !== 'Terminal' && activeFileName !== 'Settings') {
      Filesystem.writeFile({
        path: activeFileName,
        data: value,
        directory: Directory.Data,
        encoding: Encoding.UTF8,
        recursive: true
      }).catch(err => console.error("Error saving file content:", err));
    }
  };

  const handleCloseTab = (tabName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newTabs = openTabs.filter(t => t !== tabName);
    setOpenTabs(newTabs);

    if (activeFileName === tabName) {
      if (newTabs.length > 0) {
        setActiveFileName(newTabs[0]);
      } else {
        setActiveFileName('');
      }
    }
  };

  const handleSelectTab = (tabName: string) => {
    setActiveFileName(tabName);
    if (mobileTab === 'preview' || mobileTab === 'console') {
      setMobileTab('editor');
    }
  };

  // Compile and run the Virtual HTML Project in Sandbox iframe
  const handleRunCode = () => {
    const htmlFile = files.find(f => f.name.endsWith('.html'));
    if (!htmlFile) {
      alert('Error: You need at least one HTML file (e.g. index.html) to run the preview.');
      return;
    }

    setConsoleLogs([]); // Clear console

    // Retrieve other files
    const cssFiles = files.filter(f => f.name.endsWith('.css'));
    const jsFiles = files.filter(f => f.name.endsWith('.js'));

    let htmlContent = htmlFile.content;

    // Console redirection script
    const consoleRedirectScript = `
      <script>
        (function() {
          const _log = console.log;
          const _warn = console.warn;
          const _error = console.error;

          function sendLog(level, args) {
            const formatted = args.map(arg => {
              if (typeof arg === 'object') {
                try { return JSON.stringify(arg); } catch (e) { return '[Object]'; }
              }
              return String(arg);
            }).join(' ');
            
            window.parent.postMessage({
              type: 'PRISM_CONSOLE_LOG',
              level: level,
              data: formatted
            }, '*');
          }

          console.log = function(...args) {
            sendLog('log', args);
            _log.apply(console, args);
          };

          console.warn = function(...args) {
            sendLog('warn', args);
            _warn.apply(console, args);
          };

          console.error = function(...args) {
            sendLog('error', args);
            _error.apply(console, args);
          };

          window.onerror = function(message, source, lineno, colno, error) {
            sendLog('error', [message + ' (line ' + lineno + ')']);
            return false;
          };
        })();
      </script>
    `;

    // Intercept installed modules and append their CDN script/link tags in <head>
    let modulesScriptTags = '';
    installedModules.forEach(moduleId => {
      const module = AVAILABLE_MODULES.find(m => m.id === moduleId);
      if (module) {
        if (module.cdnUrl.endsWith('.css') || module.id === 'fontawesome' || module.id === 'animatecss') {
          modulesScriptTags += `<link rel="stylesheet" href="${module.cdnUrl}">\n`;
        } else {
          modulesScriptTags += `<script src="${module.cdnUrl}"></script>\n`;
        }
      }
    });

    // Inject console script and module CDN scripts at top of head
    if (htmlContent.includes('<head>')) {
      htmlContent = htmlContent.replace('<head>', `<head>\n${modulesScriptTags}${consoleRedirectScript}`);
    } else {
      htmlContent = modulesScriptTags + consoleRedirectScript + htmlContent;
    }

    // Inject virtual stylesheets
    cssFiles.forEach(cssFile => {
      const basename = cssFile.name.split('/').pop() || cssFile.name;
      const regex = new RegExp(`<link[^>]*href=["']([^"']*${basename})["'][^>]*>`, 'g');
      if (regex.test(htmlContent)) {
        htmlContent = htmlContent.replace(regex, `<style>${cssFile.content}</style>`);
      } else {
        // Fallback: append css if not explicitly linked but exists
        htmlContent = htmlContent.replace('</head>', `<style>${cssFile.content}</style></head>`);
      }
    });

    // Inject virtual JS scripts
    jsFiles.forEach(jsFile => {
      const basename = jsFile.name.split('/').pop() || jsFile.name;
      const regex = new RegExp(`<script[^>]*src=["']([^"']*${basename})["'][^>]*>\\s*<\\/script>`, 'g');
      if (regex.test(htmlContent)) {
        htmlContent = htmlContent.replace(regex, `<script>${jsFile.content}</script>`);
      } else {
        // Fallback: append at bottom of body
        htmlContent = htmlContent.replace('</body>', `<script>${jsFile.content}</script></body>`);
      }
    });

    // Revoke old URL if exists
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    // Create a Blob URL
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    setPreviewUrl(url);

    // Switch view on mobile to show running code
    if (window.innerWidth <= 768) {
      setMobileTab('preview');
    }
  };



  const handleOpenFolder = () => {
    setFolderToOpenName('PrismProject');
    setShowOpenFolderModal(true);
  };

  const handleOpenFolderConfirm = () => {
    if (!folderToOpenName.trim()) return;
    const folderName = folderToOpenName.trim();
    setRecentFolders(prev => {
      const next = [folderName, ...prev.filter(f => f !== folderName)].slice(0, 5);
      localStorage.setItem('prism_recent_folders', JSON.stringify(next));
      return next;
    });
    
    setIsFolderOpen(true);
    localStorage.setItem('prism_folder_open', 'true');

    // Create mock starter files for the project
    const folderFiles = [
      { name: `${folderName}/index.html`, content: `<!DOCTYPE html>\n<html>\n<head>\n  <meta charset="utf-8">\n  <title>${folderName}</title>\n  <link rel="stylesheet" href="style.css">\n</head>\n<body>\n  <h1>Welcome to ${folderName}!</h1>\n  <script src="script.js"></script>\n</body>\n</html>`, language: 'html' },
      { name: `${folderName}/style.css`, content: `body {\n  font-family: sans-serif;\n  background-color: #12131c;\n  color: white;\n  text-align: center;\n  padding-top: 100px;\n}`, language: 'css' },
      { name: `${folderName}/script.js`, content: `console.log("Project folder ${folderName} loaded.");`, language: 'javascript' }
    ];

    setFiles(folderFiles);
    setEmptyFolders([folderName]);
    setActiveFileName(`${folderName}/index.html`);
    setOpenTabs(['Welcome', `${folderName}/index.html`]);

    setFolderToOpenName('');
    setShowOpenFolderModal(false);
  };

  const handleCloneRepo = () => {
    setGitRepoUrl('https://github.com/prism/editor.git');
    setShowGitModal(true);
  };

  const handleGitCloneConfirm = () => {
    if (!gitRepoUrl.trim()) return;
    const repoUrl = gitRepoUrl.trim();
    const repoName = repoUrl.split('/').pop()?.replace('.git', '') || 'repo';
    const clonedFiles = [
      { name: `${repoName}/README.md`, content: `# Cloned Git Repository: ${repoName}\n\nMock git clone completed successfully from ${repoUrl}.\n`, language: 'markdown' },
      { name: `${repoName}/app.js`, content: `// Mock main file from cloned repo\nconsole.log("Welcome to ${repoName}!");\n`, language: 'javascript' }
    ];

    setIsFolderOpen(true);
    localStorage.setItem('prism_folder_open', 'true');

    setFiles(clonedFiles);
    setEmptyFolders([repoName]);
    setActiveFileName(`${repoName}/README.md`);
    setOpenTabs(['Welcome', `${repoName}/README.md`]);

    setGitRepoUrl('');
    setShowGitModal(false);
  };

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;
    const path = newFolderName.trim();
    if (emptyFolders.includes(path)) {
      alert("Folder already exists.");
      return;
    }
    setEmptyFolders(prev => [...prev, path]);

    // Create native folder in internal storage
    if (Capacitor.isNativePlatform()) {
      Filesystem.mkdir({
        path: path,
        directory: Directory.Data,
        recursive: true
      }).catch(err => console.error("Error creating native folder:", err));
    }
    
    // Auto-expand parents
    const parts = path.split('/');
    const expandedUpdate: Record<string, boolean> = {};
    for (let i = 0; i < parts.length; i++) {
      const currentPath = parts.slice(0, i + 1).join('/');
      expandedUpdate[currentPath] = true;
    }
    setExpandedFolders(prev => ({ ...prev, ...expandedUpdate }));

    setNewFolderName('');
    setShowNewFolderModal(false);
  };

  const handleDeleteConfirm = () => {
    const fileName = deleteTargetName;
    
    if (Capacitor.isNativePlatform()) {
      const isFolder = emptyFolders.includes(fileName);
      if (isFolder) {
        Filesystem.rmdir({
          path: fileName,
          directory: Directory.Data,
          recursive: true
        }).catch(err => console.error("Error deleting native folder:", err));
      } else {
        Filesystem.deleteFile({
          path: fileName,
          directory: Directory.Data
        }).catch(err => console.error("Error deleting native file:", err));
      }
    }

    const nextFiles = files.filter(f => f.name !== fileName && !f.name.startsWith(fileName + '/'));
    setFiles(nextFiles);
    setEmptyFolders(prev => prev.filter(f => f !== fileName && !f.startsWith(fileName + '/')));
    setOpenTabs(prev => prev.filter(t => t !== fileName && !t.startsWith(fileName + '/')));

    if (activeFileName === fileName || activeFileName.startsWith(fileName + '/')) {
      if (nextFiles.length > 0) {
        setActiveFileName(nextFiles[0].name);
      } else {
        setActiveFileName('Welcome');
      }
    }
    setShowDeleteModal(false);
  };

  const handleOpenSettings = () => {
    setActiveFileName('Settings');
    if (!openTabs.includes('Settings')) {
      setOpenTabs(prev => [...prev, 'Settings']);
    }
    setActivePopover(null);
  };

  const handleShowWelcome = () => {
    setActiveFileName('Welcome');
    if (!openTabs.includes('Welcome')) {
      setOpenTabs(prev => [...prev, 'Welcome']);
    }
    setActivePopover(null);
  };

  const handleRestoreDefaults = () => {
    setFiles(DEFAULT_FILES);
    setEmptyFolders(['src', 'src/assets']);
    setIsFolderOpen(true);
    localStorage.setItem('prism_folder_open', 'true');
    setActiveFileName('Welcome');
    setOpenTabs(['Welcome', ...DEFAULT_FILES.map(f => f.name)]);
    setActivePopover(null);
    alert("Workspace defaults restored.");
  };

  const handleClearWorkspace = () => {
    setFiles([]);
    setEmptyFolders([]);
    setIsFolderOpen(false);
    localStorage.setItem('prism_folder_open', 'false');
    setActiveFileName('Welcome');
    setOpenTabs(['Welcome']);
    setActivePopover(null);
  };

  const handleTogglePopover = (popover: 'profile' | 'settings', e: React.MouseEvent) => {
    e.stopPropagation();
    setActivePopover(prev => prev === popover ? null : popover);
  };

  const getCommands = () => {
    const commandsList = [
      { name: "Create New File", description: "Open file creation prompt", action: () => { setShowNewFileModal(true); } },
      { name: "Create New Folder", description: "Open folder creation prompt", action: () => { setShowNewFolderModal(true); } },
      { name: "Open Folder", description: "Open workspace settings directory", action: () => { setShowOpenFolderModal(true); } },
      { name: "Clone Repository", description: "Import Git repository from remote URL", action: () => { setShowGitModal(true); } },
      { name: "Open Preferences / Editor Settings", description: "Configure fonts, wordwrap, and layout", action: () => { handleOpenSettings(); } },
      { name: "Show Welcome Page", description: "Open startup dashboard", action: () => { handleShowWelcome(); } },
      { name: "Restore Default Project", description: "Reset workspace to clean slate", action: () => { handleRestoreDefaults(); } },
      { name: "Clear Workspace / Close Folder", description: "Empty files from editor", action: () => { handleClearWorkspace(); } },
      { name: "Run Active Preview", description: "Compile HTML, CSS, and script assets", action: () => { handleRunCode(); } },
      { name: "Configure / Install Linux OS Terminal", description: "Activate browser Linux terminal emulator", action: () => { setActiveSidebarTab('terminal'); setSidebarOpen(true); } }
    ];

    if (!commandSearch.trim()) return commandsList;
    return commandsList.filter(cmd => 
      cmd.name.toLowerCase().includes(commandSearch.toLowerCase()) || 
      cmd.description.toLowerCase().includes(commandSearch.toLowerCase())
    );
  };


  const handleInstallOS = () => {
    setInstallingOS(true);
    setInstallProgress(0);
    setInstallStatusText("Contacting mirror servers...");

    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.floor(Math.random() * 15) + 5;
      if (progress >= 100) {
        progress = 100;
        setInstallProgress(100);
        setInstallStatusText("OS setup completed successfully!");
        clearInterval(interval);
        setTimeout(() => {
          setIsTerminalInstalled(true);
          localStorage.setItem('prism_terminal_installed', 'true');
          localStorage.setItem('prism_terminal_os', terminalOS);
          setInstallingOS(false);
          setActiveConsoleTab('terminal');
        }, 800);
      } else {
        setInstallProgress(progress);
        if (progress < 25) {
          setInstallStatusText("Downloading disk image rootfs...");
        } else if (progress < 55) {
          setInstallStatusText("Extracting kernel modules...");
        } else if (progress < 80) {
          setInstallStatusText("Initializing system configuration files...");
        } else {
          setInstallStatusText("Booting virtual machine sandbox...");
        }
      }
    }, 250);
  };

  const handleUninstallOS = () => {
    if (!confirm("Are you sure you want to uninstall the operating system? All virtual system data will be wiped.")) return;
    setIsTerminalInstalled(false);
    localStorage.setItem('prism_terminal_installed', 'false');
    setOpenTabs(prev => prev.filter(t => t !== 'Terminal'));
    if (activeFileName === 'Terminal') {
      setActiveFileName('Welcome');
    }
  };

  const getLanguageFromExtension = (filename: string) => {
    const extension = filename.split('.').pop()?.toLowerCase() || '';
    if (['html', 'htm'].includes(extension)) return 'html';
    if (extension === 'css') return 'css';
    if (['js', 'jsx', 'ts', 'tsx'].includes(extension)) return 'javascript';
    if (extension === 'py') return 'python';
    if (['md', 'markdown'].includes(extension)) return 'markdown';
    return 'text';
  };

  const handleTerminalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!terminalInput.trim()) return;
    const cmd = terminalInput.trim();
    const parts = cmd.split(' ');
    const commandName = parts[0].toLowerCase();
    const args = parts.slice(1);
    
    let output: string[] = [`guest@prism-device:/${terminalPath}$ ${cmd}`];

    switch (commandName) {
      case 'help':
        output.push(
          'Filesystem commands:',
          '  ls           - List files and directories in current path',
          '  cd [path]    - Change directory',
          '  touch [file] - Create an empty file',
          '  mkdir [dir]  - Create a new directory',
          '  cat [file]   - View file content',
          '  rm [file]    - Delete a file',
          '  clear        - Clear terminal screen',
          '  run          - Run HTML/CSS/JS preview'
        );
        break;
      case 'ls': {
        const prefix = terminalPath === 'workspace' ? '' : terminalPath + '/';
        const items = new Set<string>();
        
        files.forEach(f => {
          if (prefix === '') {
            const fileParts = f.name.split('/');
            items.add(fileParts[0]);
          } else if (f.name.startsWith(prefix)) {
            const subPath = f.name.substring(prefix.length);
            const fileParts = subPath.split('/');
            items.add(fileParts[0]);
          }
        });
        
        emptyFolders.forEach(folder => {
          if (prefix === '') {
            const folderParts = folder.split('/');
            items.add(folderParts[0] + '/');
          } else if (folder.startsWith(prefix) && folder !== terminalPath) {
            const subPath = folder.substring(prefix.length);
            const folderParts = subPath.split('/');
            items.add(folderParts[0] + '/');
          }
        });

        if (items.size === 0) {
          output.push('(directory is empty)');
        } else {
          output.push(Array.from(items).join('    '));
        }
        break;
      }
      case 'cd': {
        const target = args[0];
        if (!target || target === '~' || target === '/') {
          setTerminalPath('workspace');
        } else if (target === '..') {
          if (terminalPath !== 'workspace') {
            const partsPath = terminalPath.split('/');
            partsPath.pop();
            setTerminalPath(partsPath.join('/') || 'workspace');
          }
        } else {
          const checkPath = terminalPath === 'workspace' ? target : `${terminalPath}/${target}`;
          const exists = files.some(f => f.name.startsWith(checkPath + '/')) || emptyFolders.includes(checkPath);
          if (exists) {
            setTerminalPath(checkPath);
          } else {
            output.push(`cd: no such file or directory: ${target}`);
          }
        }
        break;
      }
      case 'touch': {
        const filename = args[0];
        if (!filename) {
          output.push('Usage: touch [filename]');
          break;
        }
        const fullPath = terminalPath === 'workspace' ? filename : `${terminalPath}/${filename}`;
        if (files.some(f => f.name === fullPath)) {
          output.push(`touch: file already exists: ${filename}`);
          break;
        }
        const newFile = {
          name: fullPath,
          content: '',
          language: getLanguageFromExtension(filename)
        };
        setFiles(prev => [...prev, newFile]);
        
        // Write native file to internal storage
        if (Capacitor.isNativePlatform()) {
          Filesystem.writeFile({
            path: fullPath,
            data: '',
            directory: Directory.Data,
            encoding: Encoding.UTF8,
            recursive: true
          }).catch(err => console.error("Error creating native file via terminal:", err));
        }

        // Auto expand
        const partsTouch = fullPath.split('/');
        if (partsTouch.length > 1) {
          const expandedUpdate: Record<string, boolean> = {};
          for (let i = 0; i < partsTouch.length - 1; i++) {
            const currentPath = partsTouch.slice(0, i + 1).join('/');
            expandedUpdate[currentPath] = true;
          }
          setExpandedFolders(prev => ({ ...prev, ...expandedUpdate }));
        }

        output.push(`Created file: ${fullPath}`);
        break;
      }
      case 'mkdir': {
        const foldername = args[0];
        if (!foldername) {
          output.push('Usage: mkdir [foldername]');
          break;
        }
        const fullPath = terminalPath === 'workspace' ? foldername : `${terminalPath}/${foldername}`;
        if (emptyFolders.includes(fullPath)) {
          output.push(`mkdir: directory already exists: ${foldername}`);
          break;
        }
        setEmptyFolders(prev => [...prev, fullPath]);

        // Create native folder in internal storage
        if (Capacitor.isNativePlatform()) {
          Filesystem.mkdir({
            path: fullPath,
            directory: Directory.Data,
            recursive: true
          }).catch(err => console.error("Error creating native folder via terminal:", err));
        }
        
        // Auto expand
        const partsMkdir = fullPath.split('/');
        const expandedUpdate: Record<string, boolean> = {};
        for (let i = 0; i < partsMkdir.length; i++) {
          const currentPath = partsMkdir.slice(0, i + 1).join('/');
          expandedUpdate[currentPath] = true;
        }
        setExpandedFolders(prev => ({ ...prev, ...expandedUpdate }));

        output.push(`Created directory: ${fullPath}`);
        break;
      }
      case 'cat': {
        const filename = args[0];
        if (!filename) {
          output.push('Usage: cat [filename]');
          break;
        }
        const fullPath = terminalPath === 'workspace' ? filename : `${terminalPath}/${filename}`;
        const target = files.find(f => f.name === fullPath);
        if (target) {
          output.push(...target.content.split('\n'));
        } else {
          output.push(`cat: ${filename}: No such file`);
        }
        break;
      }
      case 'rm': {
        const filename = args[0];
        if (!filename) {
          output.push('Usage: rm [filename]');
          break;
        }
        const fullPath = terminalPath === 'workspace' ? filename : `${terminalPath}/${filename}`;
        const exists = files.some(f => f.name === fullPath);

        // Remove native file/folder in internal storage
        if (Capacitor.isNativePlatform()) {
          if (exists) {
            Filesystem.deleteFile({
              path: fullPath,
              directory: Directory.Data
            }).catch(err => console.error(err));
          } else if (emptyFolders.includes(fullPath)) {
            Filesystem.rmdir({
              path: fullPath,
              directory: Directory.Data,
              recursive: true
            }).catch(err => console.error(err));
          }
        }

        if (exists) {
          setFiles(prev => prev.filter(f => f.name !== fullPath));
          setOpenTabs(prev => prev.filter(t => t !== fullPath));
          if (activeFileName === fullPath) {
            setActiveFileName('Welcome');
          }
          output.push(`Removed file: ${fullPath}`);
        } else if (emptyFolders.includes(fullPath)) {
          setEmptyFolders(prev => prev.filter(f => f !== fullPath));
          output.push(`Removed directory: ${fullPath}`);
        } else {
          output.push(`rm: ${filename}: No such file or directory`);
        }
        break;
      }
      case 'clear':
        setTerminalLines([]);
        setTerminalInput('');
        return;
      case 'run':
        output.push('Compiling active project workspace files...', 'Running simulation preview...');
        handleRunCode();
        break;
      default:
        output.push(`sh: command not found: ${commandName}`);
    }

    setTerminalLines(prev => [...prev, ...output, '']);
    setTerminalInput('');
  };

  const renderTerminalShell = () => {
    return (
      <div className="console-logs-list" style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: 'var(--spacing-md)', background: '#0a0a0f', fontFamily: 'var(--font-mono)' }}>
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px', paddingBottom: 'var(--spacing-md)' }}>
          {terminalLines.map((line, idx) => {
            const isPrompt = line.startsWith('guest@prism-device');
            return (
              <div key={idx} style={{ color: isPrompt ? 'var(--accent-secondary)' : 'var(--text-primary)', fontSize: '0.8rem', whiteSpace: 'pre-wrap' }}>
                {line}
              </div>
            );
          })}
        </div>
        <form onSubmit={handleTerminalSubmit} className="terminal-input-container" style={{ display: 'flex', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '8px' }}>
          <span className="terminal-prompt" style={{ color: 'var(--accent-success)', marginRight: '8px', fontSize: '0.8rem', fontWeight: 'bold' }}>
            guest@prism-device:/{terminalPath}$
          </span>
          <input 
            type="text" 
            className="terminal-input-field" 
            value={terminalInput}
            onChange={(e) => setTerminalInput(e.target.value)}
            style={{ flex: 1, background: 'none', border: 'none', color: 'white', outline: 'none', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}
            placeholder="Type 'help' to see commands..."
            autoFocus
          />
        </form>
      </div>
    );
  };

  const loadNativeFilesystem = async () => {
    try {
      const { files: nativeFiles, folders: nativeFolders } = await readDirRecursive('');
      if (nativeFiles.length > 0) {
        setFiles(nativeFiles);
        setIsFolderOpen(true);
      }
      if (nativeFolders.length > 0) {
        const expanded: Record<string, boolean> = { 'workspace': true };
        nativeFolders.forEach(folder => {
          expanded[folder] = true;
        });
        setExpandedFolders(prev => ({ ...prev, ...expanded }));
        setEmptyFolders(nativeFolders);
      }
    } catch (err) {
      console.error("Error loading native files:", err);
    }
  };

  const readDirRecursive = async (currentPath: string): Promise<{files: VirtualFile[], folders: string[]}> => {
    try {
      const result = await Filesystem.readdir({
        path: currentPath,
        directory: Directory.Data
      });
      let collectedFiles: VirtualFile[] = [];
      let collectedFolders: string[] = [];
      
      for (const file of result.files) {
        const relativePath = currentPath === '' ? file.name : `${currentPath}/${file.name}`;
        if (file.type === 'directory') {
          collectedFolders.push(relativePath);
          const sub = await readDirRecursive(relativePath);
          collectedFiles.push(...sub.files);
          collectedFolders.push(...sub.folders);
        } else {
          const fileContent = await Filesystem.readFile({
            path: relativePath,
            directory: Directory.Data,
            encoding: Encoding.UTF8
          });
          collectedFiles.push({
            name: relativePath,
            content: fileContent.data as string,
            language: getLanguageFromExtension(file.name)
          });
        }
      }
      return { files: collectedFiles, folders: collectedFolders };
    } catch (e) {
      return { files: [], folders: [] };
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const name = file.name;
      if (files.some(f => f.name.toLowerCase() === name.toLowerCase())) {
        alert('File already exists in workspace.');
        return;
      }
      const extension = name.split('.').pop()?.toLowerCase() || '';
      let language = 'text';
      if (['html', 'htm'].includes(extension)) language = 'html';
      else if (extension === 'css') language = 'css';
      else if (['js', 'jsx', 'ts', 'tsx'].includes(extension)) language = 'javascript';
      else if (extension === 'py') language = 'python';
      else if (['md', 'markdown'].includes(extension)) language = 'markdown';

      const newFile: VirtualFile = { name, content, language };
      setFiles(prev => [...prev, newFile]);
      setActiveFileName(name);
      if (!openTabs.includes(name)) {
        setOpenTabs(prev => [...prev, name]);
      }
    };
    reader.readAsText(file);
  };



  // --- SIDEBAR ACTIVITY BAR HELPERS & SEARCH ---
  const handleActivityTabClick = (tab: 'files' | 'search' | 'modules' | 'settings' | 'terminal') => {
    if (activeSidebarTab === tab && sidebarOpen) {
      setSidebarOpen(false);
    } else {
      setActiveSidebarTab(tab);
      setSidebarOpen(true);
    }
  };

  const getSearchResults = () => {
    if (!searchQuery.trim()) return [];
    const results: { file: string; matches: { line: number; text: string }[] }[] = [];

    files.forEach(file => {
      const lines = file.content.split('\n');
      const fileMatches: { line: number; text: string }[] = [];

      lines.forEach((lineText, idx) => {
        if (lineText.toLowerCase().includes(searchQuery.toLowerCase())) {
          fileMatches.push({
            line: idx + 1,
            text: lineText.trim()
          });
        }
      });

      if (fileMatches.length > 0) {
        results.push({
          file: file.name,
          matches: fileMatches
        });
      }
    });

    return results;
  };

  // --- LANGUAGE PARSER ---
  const getLanguageExtension = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'html':
      case 'htm':
        return [html()];
      case 'css':
        return [css()];
      case 'js':
      case 'jsx':
        return [javascript({ jsx: true })];
      case 'ts':
      case 'tsx':
        return [javascript({ jsx: true, typescript: true })];
      case 'py':
        return [python()];
      case 'md':
      case 'markdown':
        return [markdown()];
      default:
        return [];
    }
  };

  // Theme resolution helper
  const getTheme = () => {
    return themesMap[themeName] || dracula;
  };

  // Recursive directory tree renderer
  const renderTree = (node: TreeNode, depth: number = 0, isLastChild: boolean = true, parentVerticalLines: boolean[] = []): React.ReactNode => {
    if (node.path === 'workspace') {
      return (
        <div className="tree-root">
          <div 
            className="tree-folder-header root-folder"
            onClick={() => toggleFolder('workspace')}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px', 
              padding: '6px 8px', 
              cursor: 'pointer', 
              fontWeight: 'bold', 
              fontSize: '0.85rem',
              color: 'var(--text-primary)'
            }}
          >
            {expandedFolders['workspace'] !== false ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            <Folder size={14} style={{ color: 'var(--accent-secondary)' }} />
            <span>WORKSPACE</span>
          </div>
          {expandedFolders['workspace'] !== false && (
            <div className="tree-children" style={{ display: 'flex', flexDirection: 'column' }}>
              {node.children?.map((child, idx, arr) => 
                renderTree(child, depth + 1, idx === arr.length - 1, [...parentVerticalLines, idx !== arr.length - 1])
              )}
            </div>
          )}
        </div>
      );
    }

    const isFolder = node.type === 'folder';
    const isExpanded = expandedFolders[node.path] !== false;

    return (
      <div key={node.path} className="tree-item-wrapper" style={{ position: 'relative' }}>
        
        {/* Item Header */}
        <div 
          className={`tree-item ${node.type === 'file' && activeFileName === node.path ? 'active' : ''}`}
          onClick={() => {
            if (isFolder) {
              toggleFolder(node.path);
            } else if (node.fileData) {
              setActiveFileName(node.path);
              if (!openTabs.includes(node.path)) {
                setOpenTabs(prev => [...prev, node.path]);
              }
            }
          }}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            padding: '4px 6px 4px 14px', 
            cursor: 'pointer', 
            fontSize: '0.85rem',
            position: 'relative',
            marginLeft: `${(depth - 1) * 16 + 12}px`
          }}
        >
          {/* Vertical guidelines for parent levels */}
          {parentVerticalLines.map((hasVertical, idx) => {
            if (!hasVertical) return null;
            const offset = (depth - (idx + 1)) * 16 + 2;
            return (
              <div 
                key={idx}
                style={{
                  width: '1px',
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  position: 'absolute',
                  left: `-${offset}px`,
                  top: '0',
                  bottom: '0'
                }}
              />
            );
          })}

          {/* Tree Elbow connector */}
          {depth > 0 && (
            <div className="tree-connector" style={{ position: 'absolute', left: '-2px', top: '0', bottom: '0', width: '10px' }}>
              {/* Vertical segment */}
              <div 
                style={{ 
                  width: '1px', 
                  backgroundColor: 'rgba(255, 255, 255, 0.1)', 
                  position: 'absolute', 
                  left: '0', 
                  top: '0', 
                  height: isLastChild ? '50%' : '100%' 
                }} 
              />
              {/* Horizontal segment */}
              <div 
                style={{ 
                  height: '1px', 
                  backgroundColor: 'rgba(255, 255, 255, 0.1)', 
                  position: 'absolute', 
                  left: '0', 
                  top: '50%', 
                  width: '8px' 
                }} 
              />
            </div>
          )}

          {/* Icon and label */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, zIndex: 1, paddingLeft: '8px', minWidth: 0 }}>
            {isFolder ? (
              <>
                {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                <Folder size={14} style={{ color: 'var(--accent-secondary)', flexShrink: 0 }} />
              </>
            ) : (
              <FileCode size={14} style={{ color: getFileIconColor(node.name), flexShrink: 0 }} />
            )}
            <span className="tree-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{node.name}</span>
          </div>

          {/* Delete File Button (only for files) */}
          {!isFolder && (
            <button 
              className="file-delete-btn"
              onClick={(e) => {
                handleDeleteFile(node.path, e);
              }}
              title="Delete File"
            >
              <Trash2 size={12} />
            </button>
          )}
        </div>

        {/* Nested Children */}
        {isFolder && isExpanded && (
          <div className="tree-children" style={{ display: 'flex', flexDirection: 'column' }}>
            {node.children?.map((child, idx, arr) => 
              renderTree(child, depth + 1, idx === arr.length - 1, [...parentVerticalLines, idx !== arr.length - 1])
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="app-container">
      {/* 1. TOP HEADER NAVBAR */}
      <header className="header-bar">
        <div className="header-logo">
          <Code2 size={24} className="cyan-glow-pulse" style={{ color: 'var(--accent-secondary)' }} />
        </div>

        <div className="header-actions">
          <button 
            className="action-btn primary glow-btn-pulse" 
            onClick={handleRunCode}
            title="Compile & Run"
          >
            <Play size={15} fill="currentColor" />
            <span>Run</span>
          </button>
        </div>
      </header>

      {/* 2. MAIN WORKSPACE */}
      <div className="main-workspace">
        
        {/* 2. SIDEBAR CONTAINER (Activity Bar + Active Panel Pane) */}
        <div className={`sidebar-container ${sidebarOpen ? 'open' : 'collapsed'}`}>
          
          {/* A. Activity Bar */}
          <aside className="activity-bar">
            <div className="activity-group">
              <button 
                className={`activity-btn ${activeSidebarTab === 'files' && sidebarOpen ? 'active' : ''}`}
                onClick={() => handleActivityTabClick('files')}
                title="File Explorer"
              >
                <Folder size={20} />
              </button>
              <button 
                className={`activity-btn ${activeSidebarTab === 'search' && sidebarOpen ? 'active' : ''}`}
                onClick={() => handleActivityTabClick('search')}
                title="Search Code"
              >
                <Search size={20} />
              </button>
              <button 
                className={`activity-btn ${activeSidebarTab === 'modules' && sidebarOpen ? 'active' : ''}`}
                onClick={() => handleActivityTabClick('modules')}
                title="Modules"
              >
                <Package size={20} />
              </button>
              <button 
                className={`activity-btn ${activeSidebarTab === 'terminal' && sidebarOpen ? 'active' : ''}`}
                onClick={() => handleActivityTabClick('terminal')}
                title="Terminal Management"
              >
                <Terminal size={20} />
              </button>
            </div>

            <div className="activity-group" style={{ gap: '12px', position: 'relative' }}>
              <button 
                id="activity-profile-btn"
                className={`activity-btn ${activePopover === 'profile' ? 'active' : ''}`}
                onClick={(e) => handleTogglePopover('profile', e)}
                title="Accounts"
              >
                <User size={20} />
              </button>
              
              <button 
                id="activity-settings-btn"
                className={`activity-btn ${activePopover === 'settings' ? 'active' : ''}`}
                onClick={(e) => handleTogglePopover('settings', e)}
                title="Manage"
              >
                <Settings size={20} />
              </button>

              {/* Profile Floating popover */}
              {activePopover === 'profile' && (
                <div className="activity-popover" style={{ bottom: '52px' }} onClick={(e) => e.stopPropagation()}>
                  <div className="popover-header">Accounts</div>
                  <div style={{ padding: '6px 10px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Logged in as <strong style={{ color: 'var(--text-primary)' }}>guest_dev_42</strong>
                  </div>
                  <button className="popover-item" onClick={() => alert("Sign in to cloud synchronization...")}>
                    <span>Sign in to sync settings...</span>
                  </button>
                  <button className="popover-item" onClick={() => alert("Virtual Workspace Sync is active.")}>
                    <span>Sync Settings is On</span>
                  </button>
                </div>
              )}

              {/* Settings Floating popover */}
              {activePopover === 'settings' && (
                <div className="activity-popover" style={{ bottom: '8px' }} onClick={(e) => e.stopPropagation()}>
                  <div className="popover-header">Manage</div>
                  <button className="popover-item" onClick={() => { setShowCommandPalette(true); setActivePopover(null); }}>
                    <Command size={14} />
                    <span>Command Palette...</span>
                  </button>
                  <button className="popover-item" onClick={handleOpenSettings}>
                    <Settings size={14} />
                    <span>Settings</span>
                  </button>
                  <button className="popover-item" onClick={handleShowWelcome}>
                    <Sparkles size={14} />
                    <span>Welcome Screen</span>
                  </button>
                  <button className="popover-item" onClick={() => { handleRestoreDefaults(); setActivePopover(null); }}>
                    <RefreshCw size={14} />
                    <span>Restore Defaults</span>
                  </button>
                  <button className="popover-item" onClick={() => { handleClearWorkspace(); setActivePopover(null); }}>
                    <Trash2 size={14} />
                    <span>Close Folder</span>
                  </button>
                </div>
              )}
            </div>
          </aside>

          {/* B. Active Panel Pane (264px width) */}
          {sidebarOpen && (
            <div className="sidebar-panel-content animate-fade">
              {activeSidebarTab === 'files' && (
                <>
                  <div className="sidebar-header" style={{ borderBottom: 'none', paddingBottom: '0' }}>
                    <span className="sidebar-title" style={{ fontSize: '0.85rem', letterSpacing: '0.05em' }}>EXPLORER</span>
                    <button className="file-action-icon-btn" onClick={() => setShowExplorerMenu(true)} title="Explorer Actions">
                      <span style={{ fontSize: '1.2rem', lineHeight: '0.5', verticalAlign: 'middle', fontWeight: 'bold' }}>...</span>
                    </button>
                  </div>

                  <div className="sidebar-content" style={{ display: 'flex', flexDirection: 'column' }}>
                    {!isFolderOpen ? (
                      /* No Folder Open Placeholder */
                      <div className="no-folder-placeholder" style={{ padding: 'var(--spacing-md) var(--spacing-sm)', color: 'var(--text-secondary)', textAlign: 'left' }}>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 'var(--spacing-md)', lineHeight: '1.4' }}>
                          You have not yet opened a folder. Open a local workspace folder or clone a repository to get started.
                        </p>
                        <button 
                          className="action-btn primary" 
                          onClick={() => setShowOpenFolderModal(true)} 
                          style={{ width: '100%', marginBottom: 'var(--spacing-sm)', fontSize: '0.75rem', padding: '8px' }}
                        >
                          Open Folder
                        </button>
                        <button 
                          className="action-btn secondary" 
                          onClick={() => setShowGitModal(true)} 
                          style={{ width: '100%', fontSize: '0.75rem', padding: '8px' }}
                        >
                          Clone Repository
                        </button>
                      </div>
                    ) : (
                      <>
                        {/* WORKSPACE Header with actions */}
                        <div 
                          style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center', 
                            padding: '4px 8px', 
                            borderBottom: '1px solid var(--border-color)',
                            marginBottom: '6px'
                          }}
                        >
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>WORKSPACE</span>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button 
                              className="file-action-icon-btn" 
                              onClick={() => setShowNewFileModal(true)}
                              title="New File"
                              style={{ padding: '2px' }}
                            >
                              <FilePlus size={14} />
                            </button>
                            <button 
                              className="file-action-icon-btn" 
                              onClick={() => setShowNewFolderModal(true)}
                              title="New Folder"
                              style={{ padding: '2px' }}
                            >
                              <FolderPlus size={14} />
                            </button>
                            <button 
                              className="file-action-icon-btn" 
                              onClick={() => {
                                setExpandedFolders(prev => ({ ...prev, 'workspace': true }));
                                alert("Refreshed workspace file tree.");
                              }}
                              title="Refresh Explorer"
                              style={{ padding: '2px' }}
                            >
                              <RefreshCw size={14} />
                            </button>
                            <button 
                              className="file-action-icon-btn" 
                              onClick={() => {
                                setExpandedFolders({ 'workspace': true });
                              }}
                              title="Collapse All Folders"
                              style={{ padding: '2px' }}
                            >
                              <FolderMinus size={14} />
                            </button>
                          </div>
                        </div>

                        <div className="files-panel" style={{ flex: 1 }}>
                          <div className="file-list">
                            {/* Welcome Page static item */}
                            <div 
                              className={`file-item ${activeFileName === 'Welcome' ? 'active' : ''}`}
                              onClick={() => {
                                setActiveFileName('Welcome');
                                if (!openTabs.includes('Welcome')) {
                                  setOpenTabs(prev => [...prev, 'Welcome']);
                                }
                              }}
                              style={{ marginBottom: '8px' }}
                            >
                              <div className="file-info">
                                <Sparkles size={16} style={{ color: 'var(--accent-secondary)' }} />
                                <span style={{ fontWeight: 600 }}>Welcome Screen</span>
                              </div>
                            </div>

                            {/* Folder Tree rendering */}
                            {renderTree(buildFileTree(files, emptyFolders))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </>
              )}

              {activeSidebarTab === 'search' && (
                <>
                  <div className="sidebar-header">
                    <span className="sidebar-title">Search Project</span>
                  </div>
                  <div className="sidebar-content">
                    <div className="search-panel">
                      <div className="search-input-wrapper">
                        <input 
                          type="text" 
                          placeholder="Search text in files..." 
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="search-input"
                        />
                      </div>

                      <div className="search-results-list">
                        {getSearchResults().map((res, fIdx) => (
                          <div key={fIdx} className="search-result-file">
                            <div className="search-result-file-title">
                              <FileCode size={14} style={{ color: 'var(--text-secondary)' }} />
                              <span>{res.file}</span>
                            </div>
                            {res.matches.map((match, mIdx) => (
                              <div 
                                key={mIdx} 
                                className="search-result-match"
                                onClick={() => {
                                  setActiveFileName(res.file);
                                  if (!openTabs.includes(res.file)) {
                                    setOpenTabs(prev => [...prev, res.file]);
                                  }
                                }}
                              >
                                <span className="search-result-line-number">{match.line}:</span>
                                <span>{match.text}</span>
                              </div>
                            ))}
                          </div>
                        ))}
                        {searchQuery.trim() && getSearchResults().length === 0 && (
                          <div className="console-empty" style={{ fontSize: '0.8rem' }}>No results found.</div>
                        )}
                        {!searchQuery.trim() && (
                          <div className="console-empty" style={{ fontSize: '0.8rem' }}>Type code to search.</div>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}

              {activeSidebarTab === 'modules' && (
                <>
                  <div className="sidebar-header">
                    <span className="sidebar-title">Modules</span>
                    <button 
                      className="file-action-icon-btn" 
                      onClick={() => alert("Searching modules database...")}
                      title="Search modules"
                    >
                      <Search size={16} />
                    </button>
                  </div>
                  
                  <div className="sidebar-content">
                    <div className="modules-panel">
                      
                      {/* Search Bar Container */}
                      <div className="search-input-wrapper" style={{ position: 'relative' }}>
                        <input 
                          type="text" 
                          placeholder="Search modules..." 
                          value={moduleSearchQuery}
                          onChange={(e) => setModuleSearchQuery(e.target.value)}
                          className="search-input"
                          style={{ paddingRight: '56px' }}
                        />
                        <div style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', display: 'flex', gap: '4px', alignItems: 'center' }}>
                          <button 
                            className="file-action-icon-btn" 
                            style={{ padding: '2px', color: 'var(--text-muted)' }}
                            onClick={() => alert("Filter applied: All modules")}
                            title="Filter Modules"
                          >
                            <Filter size={13} />
                          </button>
                          <button 
                            className="file-action-icon-btn" 
                            style={{ padding: '2px', color: 'var(--text-muted)' }}
                            onClick={() => setModuleSearchQuery('')}
                            title="Clear Filter"
                          >
                            <X size={13} />
                          </button>
                        </div>
                      </div>

                      {/* Accordions */}
                      <div className="modules-list" style={{ marginTop: 'var(--spacing-sm)' }}>
                        
                        {/* 1. INSTALLED ACCORDION */}
                        <div>
                          <div 
                            className="module-accordion-header"
                            onClick={() => setInstalledExpanded(!installedExpanded)}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '8px 4px',
                              cursor: 'pointer',
                              borderBottom: '1px solid var(--border-color)',
                              marginBottom: '6px'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                              {installedExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                              <span>INSTALLED</span>
                            </div>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                              {installedModules.length}
                            </span>
                          </div>

                          {installedExpanded && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                              {AVAILABLE_MODULES.filter(mod => installedModules.includes(mod.id) && mod.name.toLowerCase().includes(moduleSearchQuery.toLowerCase())).map(mod => (
                                <div key={mod.id} className="module-card">
                                  <div className="module-card-header">
                                    <span className="module-name">{mod.name}</span>
                                    <span className="module-badge installed">Active</span>
                                  </div>
                                  <p className="module-desc">{mod.description}</p>
                                  <button 
                                    className="action-btn secondary"
                                    style={{ padding: '4px 8px', fontSize: '0.75rem', width: '100%' }}
                                    onClick={() => setInstalledModules(prev => prev.filter(id => id !== mod.id))}
                                  >
                                    Uninstall
                                  </button>
                                </div>
                              ))}
                              {installedModules.filter(id => AVAILABLE_MODULES.find(m => m.id === id)?.name.toLowerCase().includes(moduleSearchQuery.toLowerCase())).length === 0 && (
                                <div className="console-empty" style={{ fontSize: '0.75rem', padding: '6px 0' }}>No matching installed modules.</div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* 2. POPULAR ACCORDION (no extension comes should be shown) */}
                        <div>
                          <div 
                            className="module-accordion-header"
                            onClick={() => setPopularExpanded(!popularExpanded)}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '8px 4px',
                              cursor: 'pointer',
                              borderBottom: '1px solid var(--border-color)',
                              marginBottom: '6px'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                              {popularExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                              <span>POPULAR</span>
                            </div>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>0</span>
                          </div>

                          {popularExpanded && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                              <div className="console-empty" style={{ fontSize: '0.75rem', padding: '6px 0' }}>No popular modules available.</div>
                            </div>
                          )}
                        </div>

                        {/* 3. RECOMMENDED ACCORDION (suggest 10 only) */}
                        <div>
                          <div 
                            className="module-accordion-header"
                            onClick={() => setRecommendedExpanded(!recommendedExpanded)}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '8px 4px',
                              cursor: 'pointer',
                              borderBottom: '1px solid var(--border-color)',
                              marginBottom: '6px'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                              {recommendedExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                              <span>RECOMMENDED</span>
                            </div>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                              {AVAILABLE_MODULES.filter(mod => mod.name.toLowerCase().includes(moduleSearchQuery.toLowerCase())).length}
                            </span>
                          </div>

                          {recommendedExpanded && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              {AVAILABLE_MODULES.filter(mod => mod.name.toLowerCase().includes(moduleSearchQuery.toLowerCase())).map(mod => {
                                const isInstalled = installedModules.includes(mod.id);
                                return (
                                  <div key={mod.id} className="module-card">
                                    <div className="module-card-header">
                                      <span className="module-name">{mod.name}</span>
                                      <span className={`module-badge ${isInstalled ? 'installed' : 'uninstalled'}`}>
                                        {isInstalled ? 'Active' : 'Add'}
                                      </span>
                                    </div>
                                    <p className="module-desc">{mod.description}</p>
                                    <button 
                                      className={`action-btn ${isInstalled ? 'secondary' : 'primary'}`}
                                      style={{ padding: '4px 8px', fontSize: '0.75rem', width: '100%' }}
                                      onClick={() => {
                                        if (isInstalled) {
                                          setInstalledModules(prev => prev.filter(id => id !== mod.id));
                                        } else {
                                          setInstalledModules(prev => [...prev, mod.id]);
                                        }
                                      }}
                                    >
                                      {isInstalled ? 'Uninstall' : 'Install Module'}
                                    </button>
                                  </div>
                                );
                              })}
                              {AVAILABLE_MODULES.filter(mod => mod.name.toLowerCase().includes(moduleSearchQuery.toLowerCase())).length === 0 && (
                                <div className="console-empty" style={{ fontSize: '0.75rem', padding: '6px 0' }}>No modules found matching query.</div>
                              )}
                            </div>
                          )}
                        </div>

                      </div>

                    </div>
                  </div>
                </>
              )}

              {activeSidebarTab === 'terminal' && (
                <>
                  <div className="sidebar-header">
                    <span className="sidebar-title">OS Terminal</span>
                  </div>
                  <div className="sidebar-content" style={{ padding: 'var(--spacing-md)' }}>
                    {!isTerminalInstalled ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                          Install a native-style Linux operating system runtime inside your browser sandbox.
                        </p>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                            <input 
                              type="radio" 
                              name="terminal-os-select" 
                              value="alpine" 
                              checked={terminalOS === 'alpine'}
                              onChange={() => setTerminalOS('alpine')}
                              disabled={installingOS}
                            />
                            <span>Alpine Linux (RISC-V)</span>
                          </label>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: '20px', display: 'block', marginTop: '-4px' }}>
                            Lightweight RISC-V environment (JSLinux). Boot up under 3 seconds.
                          </span>

                          <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginTop: '4px' }}>
                            <input 
                              type="radio" 
                              name="terminal-os-select" 
                              value="debian" 
                              checked={terminalOS === 'debian'}
                              onChange={() => setTerminalOS('debian')}
                              disabled={installingOS}
                            />
                            <span>Debian Linux (WebVM)</span>
                          </label>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: '20px', display: 'block', marginTop: '-4px' }}>
                            CheerpX virtual machine. Supports full package management (apt install).
                          </span>

                          <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginTop: '4px' }}>
                            <input 
                              type="radio" 
                              name="terminal-os-select" 
                              value="v86" 
                              checked={terminalOS === 'v86'}
                              onChange={() => setTerminalOS('v86')}
                              disabled={installingOS}
                            />
                            <span>Alpine Linux (x86 v86)</span>
                          </label>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: '20px', display: 'block', marginTop: '-4px' }}>
                            x86-emulated Alpine environment. Includes basic shell tools.
                          </span>
                        </div>

                        {installingOS ? (
                          <div style={{ marginTop: 'var(--spacing-md)' }}>
                            <span style={{ fontSize: '0.75rem', color: 'var(--accent-secondary)' }}>{installStatusText}</span>
                            <div className="progress-track" style={{ height: '6px', marginTop: '6px' }}>
                              <div className="progress-fill" style={{ width: `${installProgress}%`, backgroundColor: 'var(--accent-secondary)' }} />
                            </div>
                          </div>
                        ) : (
                          <button 
                            className="action-btn primary" 
                            style={{ width: '100%', marginTop: 'var(--spacing-sm)' }}
                            onClick={handleInstallOS}
                          >
                            Install Linux OS
                          </button>
                        )}
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                        <div style={{ padding: 'var(--spacing-sm)', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                          <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block' }}>Active Runtime</span>
                          <strong style={{ fontSize: '0.9rem', color: 'var(--accent-success)' }}>
                            {terminalOS === 'alpine' ? 'Alpine Linux (RISC-V)' : terminalOS === 'debian' ? 'Debian Linux (WebVM)' : 'Alpine Linux (x86 v86)'}
                          </strong>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginTop: '4px' }}>Status: Running (sandbox)</span>
                        </div>

                        <button 
                          className="action-btn primary" 
                          style={{ width: '100%', fontSize: '0.8rem' }}
                          onClick={() => {
                            setActiveFileName('Terminal');
                            if (!openTabs.includes('Terminal')) {
                              setOpenTabs(prev => [...prev, 'Terminal']);
                            }
                          }}
                        >
                          Open Terminal in Editor
                        </button>

                        <button 
                          className="action-btn secondary" 
                          style={{ width: '100%', fontSize: '0.8rem' }}
                          onClick={() => {
                            setActiveConsoleTab('terminal');
                            alert("Terminal focused in the console tab below!");
                          }}
                        >
                          Focus Bottom Console Terminal
                        </button>

                        <button 
                          className="action-btn secondary" 
                          style={{ width: '100%', fontSize: '0.8rem', borderColor: 'var(--accent-error)', color: 'var(--accent-error)', marginTop: 'var(--spacing-lg)' }}
                          onClick={handleUninstallOS}
                        >
                          Uninstall OS / Reset Terminal
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

        </div>

        {/* EDITOR AREA CONTAINER */}
        <main className={`editor-workspace ${
          window.innerWidth > 768 || mobileTab === 'editor' ? 'mobile-view-active' : 'mobile-view-hidden'
        }`}>
          {/* Tabs bar */}
          <div className="tabs-bar">
            {openTabs.map((tab) => (
              <div 
                key={tab} 
                className={`editor-tab ${tab === activeFileName ? 'active' : ''}`}
                onClick={() => handleSelectTab(tab)}
              >
                <span>{tab}</span>
                <button 
                  className="tab-close" 
                  onClick={(e) => handleCloseTab(tab, e)}
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>

          {/* Actual CodeMirror editor */}
          {activeFileName === 'Terminal' ? (
            <div style={{ width: '100%', height: '100%', background: '#0a0a0f', overflow: 'hidden', position: 'relative' }}>
              {renderTerminalShell()}
            </div>
          ) : activeFileName === 'Settings' ? (
            <div className="settings-container animate-fade">
              <div className="settings-group-card">
                <h3 className="settings-group-title">
                  <Settings size={18} />
                  <span>Editor Settings</span>
                </h3>
                
                <div className="settings-row">
                  <div className="setting-detail">
                    <span className="setting-name">Font Size</span>
                    <span className="setting-desc">Controls the font size in pixels.</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button className="action-btn secondary" style={{ padding: '4px 8px' }} onClick={() => setFontSize(prev => Math.max(8, prev - 1))}>-</button>
                    <span style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>{fontSize}px</span>
                    <button className="action-btn secondary" style={{ padding: '4px 8px' }} onClick={() => setFontSize(prev => Math.min(32, prev + 1))}>+</button>
                  </div>
                </div>

                <div className="settings-row">
                  <div className="setting-detail">
                    <span className="setting-name">Color Theme</span>
                    <span className="setting-desc">Select code colors for the editor.</span>
                  </div>
                  <select 
                    className="setting-input-select" 
                    value={themeName} 
                    onChange={(e) => setThemeName(e.target.value)}
                    style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'white', padding: '4px 8px', borderRadius: '4px' }}
                  >
                    <option value="dracula">Dracula</option>
                    <option value="oneDark">One Dark</option>
                    <option value="githubDark">GitHub Dark</option>
                    <option value="nord">Nord</option>
                    <option value="tokyoNight">Tokyo Night</option>
                  </select>
                </div>

                <div className="settings-row">
                  <div className="setting-detail">
                    <span className="setting-name">Word Wrap</span>
                    <span className="setting-desc">Wrap lines that exceed viewport width.</span>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={wordWrap} 
                    onChange={(e) => setWordWrap(e.target.checked)} 
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                </div>

                <div className="settings-row">
                  <div className="setting-detail">
                    <span className="setting-name">Line Numbers</span>
                    <span className="setting-desc">Show line count in the left gutter.</span>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={lineNumbers} 
                    onChange={(e) => setLineNumbers(e.target.checked)} 
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                </div>

                <div className="settings-row">
                  <div className="setting-detail">
                    <span className="setting-name">Tab Size</span>
                    <span className="setting-desc">Number of spaces to use for indentation.</span>
                  </div>
                  <select 
                    className="setting-input-select" 
                    value={tabSize} 
                    onChange={(e) => setTabSize(Number(e.target.value))}
                    style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'white', padding: '4px 8px', borderRadius: '4px' }}
                  >
                    <option value="2">2 Spaces</option>
                    <option value="4">4 Spaces</option>
                    <option value="8">8 Spaces</option>
                  </select>
                </div>
              </div>

              <div className="settings-group-card">
                <h3 className="settings-group-title">
                  <Activity size={18} />
                  <span>System Diagnostics</span>
                </h3>

                <div className="settings-row">
                  <div className="setting-detail">
                    <span className="setting-name">Workspace Files count</span>
                    <span className="setting-desc">Number of virtual source files compiled.</span>
                  </div>
                  <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--accent-secondary)' }}>{files.length} Files</span>
                </div>

                <div className="settings-row">
                  <div className="setting-detail">
                    <span className="setting-name">LocalStorage Size</span>
                    <span className="setting-desc">Estimated disk space used by virtual workspace.</span>
                  </div>
                  <span style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>
                    {Math.round(JSON.stringify(files).length / 102.4) / 10} KB
                  </span>
                </div>

                <div className="settings-row">
                  <div className="setting-detail">
                    <span className="setting-name">Active Environment</span>
                    <span className="setting-desc">System browser metadata.</span>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Chrome/Webkit Sandbox</span>
                </div>
              </div>
            </div>
          ) : activeFileName === 'Welcome' ? (
            <div className="welcome-container animate-fade">
              <div className="welcome-header">
                <h1 className="welcome-title">PRISM</h1>
                <p className="welcome-tagline">Write code, build worlds.</p>
              </div>

              <div className="welcome-sections">
                {/* 1. Start Section */}
                <div className="welcome-section">
                  <h3 className="welcome-section-title">
                    <Sparkles size={16} style={{ color: 'var(--accent-secondary)' }} />
                    <span>Start</span>
                  </h3>
                  
                  <div className="welcome-option" onClick={() => setShowNewFileModal(true)}>
                    <Plus size={16} />
                    <span>New File</span>
                  </div>

                  <div className="welcome-option" onClick={() => setShowNewFolderModal(true)}>
                    <FolderPlus size={16} />
                    <span>Create New Folder</span>
                  </div>

                  <div className="welcome-option" onClick={() => document.getElementById('file-uploader')?.click()}>
                    <FolderOpen size={16} />
                    <span>Open File</span>
                  </div>
                  <input 
                    type="file" 
                    id="file-uploader" 
                    style={{ display: 'none' }} 
                    onChange={handleFileUpload} 
                  />

                  <div className="welcome-option" onClick={handleOpenFolder}>
                    <Folder size={16} />
                    <span>Open Folder</span>
                  </div>

                  <div className="welcome-option" onClick={handleCloneRepo}>
                    <GitBranch size={16} />
                    <span>Clone Git Repository</span>
                  </div>

                  {/* welcome terminal option card removed */}
                </div>

                {/* 2. Recent Section */}
                <div className="welcome-section">
                  <h3 className="welcome-section-title">
                    <RefreshCw size={16} style={{ color: 'var(--accent-primary)' }} />
                    <span>Recent Project Folders</span>
                  </h3>
                  
                  {recentFolders.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {recentFolders.map((folder, idx) => (
                        <div key={idx} className="welcome-recent-item" onClick={() => alert(`Opened folder: ${folder}`)}>
                          <span>{folder}</span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Project</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="recent-fallback-text">
                      No recent folders opened. 
                      You can <span className="recent-fallback-link" onClick={handleOpenFolder}>open a folder from internal storage</span> to begin.
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : activeFile ? (
            <div className="cm-editor-container" style={{ '--editor-font-size': `${fontSize}px` } as React.CSSProperties}>
              <CodeMirror
                value={activeFile.content}
                height="100%"
                theme={getTheme()}
                extensions={[
                  wordWrap ? EditorView.lineWrapping : [],
                  ...getLanguageExtension(activeFile.name)
                ]}
                onChange={handleEditorChange}
                basicSetup={{
                  lineNumbers: lineNumbers,
                  foldGutter: true,
                  dropCursor: true,
                  allowMultipleSelections: true,
                  indentOnInput: true,
                  bracketMatching: true,
                  closeBrackets: true,
                  autocompletion: true,
                  rectangularSelection: true,
                  crosshairCursor: true,
                  highlightActiveLine: true,
                  highlightSelectionMatches: true,
                  closeBracketsKeymap: true,
                  searchKeymap: true,
                  foldKeymap: true,
                  completionKeymap: true,
                  lintKeymap: true,
                }}
              />
            </div>
          ) : (
            <div className="no-tabs-placeholder animate-fade">
              <Sparkles size={48} className="placeholder-icon" />
              <h3>No Files Open</h3>
              <p>Select a file from the sidebar or create a new file to start coding.</p>
              <button className="action-btn primary" onClick={() => setShowNewFileModal(true)}>
                Create File
              </button>
            </div>
          )}
        </main>

        {/* SPLIT VIEW (PREVIEW & CONSOLE) FOR DESKTOP */}
        <section className={`split-workspace ${
          window.innerWidth > 768 ? 'desktop-view' : 
          mobileTab !== 'editor' ? 'mobile-view-active' : 'mobile-view-hidden'
        }`}>
          {/* A. Live Preview Panel */}
          <div className={`preview-panel ${
            window.innerWidth <= 768 && mobileTab !== 'preview' ? 'mobile-view-hidden' : ''
          }`}>
            <div className="preview-header">
              <div className="preview-address-bar">
                <span className="preview-address-text">
                  {previewUrl ? 'prism://app/index.html' : 'prism://sandbox/idle'}
                </span>
              </div>
              <button className="file-action-icon-btn" onClick={handleRunCode} title="Reload Preview">
                <RefreshCw size={14} />
              </button>
            </div>

            <div className="preview-iframe-container">
              {previewUrl ? (
                <iframe
                  ref={iframeRef}
                  className="preview-iframe"
                  src={previewUrl}
                  sandbox="allow-scripts allow-modals"
                  title="live-preview"
                />
              ) : (
                <div className="preview-iframe-placeholder">
                  <Eye size={36} className="placeholder-icon" />
                  <p style={{ fontSize: '0.875rem' }}>Press Run to load sandbox preview</p>
                </div>
              )}
            </div>
          </div>

          {/* B. Integrated Console Panel */}
          <div className={`console-panel ${
            window.innerWidth <= 768 && mobileTab !== 'console' ? 'mobile-view-hidden' : ''
          }`}>
            <div className="console-header">
              <div className="console-title-container" style={{ gap: '12px' }}>
                <button 
                  className={`console-title-tab ${activeConsoleTab === 'logs' ? 'active' : ''}`}
                  style={{ 
                    background: 'none', 
                    border: 'none', 
                    color: activeConsoleTab === 'logs' ? 'var(--accent-secondary)' : 'var(--text-secondary)',
                    fontWeight: 600,
                    fontSize: '0.8rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    padding: '0 4px',
                    borderBottom: activeConsoleTab === 'logs' ? '2px solid var(--accent-secondary)' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                  onClick={() => setActiveConsoleTab('logs')}
                >
                  <Terminal size={14} />
                  <span>Console Logs</span>
                </button>

                {isTerminalInstalled && (
                  <button 
                    className={`console-title-tab ${activeConsoleTab === 'terminal' ? 'active' : ''}`}
                    style={{ 
                      background: 'none', 
                      border: 'none', 
                      color: activeConsoleTab === 'terminal' ? 'var(--accent-success)' : 'var(--text-secondary)',
                      fontWeight: 600,
                      fontSize: '0.8rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      padding: '0 4px',
                      borderBottom: activeConsoleTab === 'terminal' ? '2px solid var(--accent-success)' : 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                    onClick={() => setActiveConsoleTab('terminal')}
                  >
                    <Terminal size={14} />
                    <span>Terminal</span>
                  </button>
                )}
              </div>

              <div className="console-header-actions">
              {activeConsoleTab === 'logs' && (
                <button 
                  className="action-btn secondary" 
                  style={{ padding: '2px 8px', fontSize: '0.7rem' }} 
                  onClick={() => setConsoleLogs([])}
                >
                  Clear
                </button>
              )}
            </div>
            </div>

            {activeConsoleTab === 'logs' ? (
              <div className="console-logs-list">
                {consoleLogs.length > 0 ? (
                  consoleLogs.map((log, idx) => (
                    <div key={idx} className={`console-log-row ${log.level}`}>
                      {log.level === 'log' && <Info size={12} style={{ marginTop: '2px' }} />}
                      {log.level === 'warn' && <AlertTriangle size={12} style={{ marginTop: '2px' }} />}
                      {log.level === 'error' && <XCircle size={12} style={{ marginTop: '2px' }} />}
                      
                      <span className="console-log-timestamp">
                        {log.timestamp.toLocaleTimeString([], { hour12: false })}
                      </span>
                      <span className="console-log-text">{log.text}</span>
                    </div>
                  ))
                ) : (
                  <div className="console-empty">No console logs output yet.</div>
                )}
              </div>
            ) : (
              <div className="console-logs-list" style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '0' }}>
                {isTerminalInstalled ? (
                  renderTerminalShell()
                ) : (
                  <div style={{ padding: 'var(--spacing-md)', display: 'flex', flexDirection: 'column', gap: '8px', color: 'var(--text-secondary)' }}>
                    <span>Terminal is not installed yet.</span>
                    <button 
                      className="action-btn primary" 
                      style={{ alignSelf: 'flex-start', fontSize: '0.75rem', padding: '4px 10px' }}
                      onClick={() => { setActiveSidebarTab('terminal'); setSidebarOpen(true); }}
                    >
                      Configure & Install OS Terminal
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

      </div>

      {/* 3. MOBILE BOTTOM NAV BAR */}
      <nav className="mobile-nav-bar">
        <button 
          className={`mobile-nav-tab ${mobileTab === 'editor' ? 'active' : ''}`}
          onClick={() => setMobileTab('editor')}
        >
          <Code2 size={18} />
          <span>Editor</span>
        </button>
        <button 
          className={`mobile-nav-tab ${mobileTab === 'preview' ? 'active' : ''}`}
          onClick={() => {
            setMobileTab('preview');
            // Auto run code if not run yet
            if (!previewUrl) handleRunCode();
          }}
        >
          <Eye size={18} />
          <span>Preview</span>
        </button>
        <button 
          className={`mobile-nav-tab ${mobileTab === 'console' ? 'active' : ''}`}
          onClick={() => setMobileTab('console')}
        >
          <Terminal size={18} />
          <span>Console ({consoleLogs.length})</span>
        </button>
      </nav>

      {/* --- MODALS --- */}
      {/* A. Create File Modal */}
      {showNewFileModal && (
        <div className="modal-overlay" onClick={() => setShowNewFileModal(false)}>
          <div className="modal-content animate-fade" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Create New File</h3>
            <input 
              className="modal-input"
              type="text" 
              placeholder="e.g. app.js, styles.css"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateFile()}
              autoFocus
            />
            <div className="modal-actions">
              <button className="action-btn secondary" onClick={() => setShowNewFileModal(false)}>
                Cancel
              </button>
              <button className="action-btn primary" onClick={handleCreateFile}>
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* B. Rename File Modal */}
      {showRenameModal && (
        <div className="modal-overlay" onClick={() => setShowRenameModal(false)}>
          <div className="modal-content animate-fade" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Rename File: {renameTargetName}</h3>
            <input 
              className="modal-input"
              type="text" 
              value={renameNewName}
              onChange={(e) => setRenameNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleRenameFile()}
              autoFocus
            />
            <div className="modal-actions">
              <button className="action-btn secondary" onClick={() => setShowRenameModal(false)}>
                Cancel
              </button>
              <button className="action-btn primary" onClick={handleRenameFile}>
                Rename
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Folder Modal */}
      {showNewFolderModal && (
        <div className="modal-overlay" onClick={() => setShowNewFolderModal(false)}>
          <div className="modal-content animate-fade" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">New Folder</h3>
            <input 
              className="modal-input"
              type="text" 
              placeholder="e.g. src/components"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
              autoFocus
            />
            <div className="modal-actions">
              <button className="action-btn secondary" onClick={() => setShowNewFolderModal(false)}>
                Cancel
              </button>
              <button className="action-btn primary" onClick={handleCreateFolder}>
                Create Folder
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal-content animate-fade" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Delete File</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 'var(--spacing-md)' }}>
              Are you sure you want to delete <strong style={{ color: 'var(--text-primary)' }}>{deleteTargetName}</strong>? This action cannot be undone.
            </p>
            <div className="modal-actions">
              <button className="action-btn secondary" onClick={() => setShowDeleteModal(false)}>
                Cancel
              </button>
              <button className="action-btn primary" style={{ backgroundColor: 'var(--accent-error)', borderColor: 'var(--accent-error)' }} onClick={handleDeleteConfirm}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Git Clone Modal */}
      {showGitModal && (
        <div className="modal-overlay" onClick={() => setShowGitModal(false)}>
          <div className="modal-content animate-fade" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Clone Git Repository</h3>
            <input 
              className="modal-input"
              type="text" 
              placeholder="https://github.com/username/repo.git"
              value={gitRepoUrl}
              onChange={(e) => setGitRepoUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleGitCloneConfirm()}
              autoFocus
            />
            <div className="modal-actions">
              <button className="action-btn secondary" onClick={() => setShowGitModal(false)}>
                Cancel
              </button>
              <button className="action-btn primary" onClick={handleGitCloneConfirm}>
                Clone Repo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Open Folder Modal */}
      {showOpenFolderModal && (
        <div className="modal-overlay" onClick={() => setShowOpenFolderModal(false)}>
          <div className="modal-content animate-fade" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Open Project Folder</h3>
            <input 
              className="modal-input"
              type="text" 
              placeholder="Project folder name..."
              value={folderToOpenName}
              onChange={(e) => setFolderToOpenName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleOpenFolderConfirm()}
              autoFocus
            />
            <div className="modal-actions">
              <button className="action-btn secondary" onClick={() => setShowOpenFolderModal(false)}>
                Cancel
              </button>
              <button className="action-btn primary" onClick={handleOpenFolderConfirm}>
                Open Folder
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Explorer Actions Menu Modal */}
      {showExplorerMenu && (
        <div className="modal-overlay" onClick={() => setShowExplorerMenu(false)}>
          <div className="modal-content animate-fade" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Workspace Actions</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', margin: 'var(--spacing-md) 0' }}>
              <button 
                className="action-btn primary" 
                style={{ width: '100%' }}
                onClick={() => {
                  setFiles(DEFAULT_FILES);
                  setEmptyFolders(['src', 'src/assets']);
                  setIsFolderOpen(true);
                  localStorage.setItem('prism_folder_open', 'true');
                  setActiveFileName('Welcome');
                  setOpenTabs(['Welcome', ...DEFAULT_FILES.map(f => f.name)]);
                  setShowExplorerMenu(false);
                  alert("Workspace defaults restored.");
                }}
              >
                Restore Default Project
              </button>
              
              <button 
                className="action-btn secondary" 
                style={{ width: '100%', border: '1px solid var(--accent-error)', color: 'var(--accent-error)' }}
                onClick={() => {
                  setFiles([]);
                  setEmptyFolders([]);
                  setIsFolderOpen(false);
                  localStorage.setItem('prism_folder_open', 'false');
                  setActiveFileName('Welcome');
                  setOpenTabs(['Welcome']);
                  setShowExplorerMenu(false);
                }}
              >
                Close Folder (Clear Workspace)
              </button>
            </div>
            <div className="modal-actions">
              <button className="action-btn secondary" onClick={() => setShowExplorerMenu(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Command Palette Modal */}
      {showCommandPalette && (
        <div className="command-palette-overlay" onClick={() => setShowCommandPalette(false)}>
          <div className="command-palette-content animate-fade" onClick={(e) => e.stopPropagation()}>
            <input 
              type="text" 
              className="command-palette-input" 
              placeholder="Type a command to execute..." 
              value={commandSearch}
              onChange={(e) => setCommandSearch(e.target.value)}
              autoFocus
            />
            <div className="command-palette-list">
              {getCommands().map((cmd, idx) => (
                <button 
                  key={idx} 
                  className="command-palette-item"
                  onClick={() => {
                    cmd.action();
                    setShowCommandPalette(false);
                    setCommandSearch('');
                  }}
                >
                  <Command size={14} style={{ color: 'var(--accent-secondary)' }} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontWeight: 600 }}>{cmd.name}</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{cmd.description}</span>
                  </div>
                </button>
              ))}
              {getCommands().length === 0 && (
                <div style={{ padding: '12px', fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                  No matching commands found.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* splash screen loader overlay */}
      {!appLoaded && (
        <div className="splash-screen" style={{ opacity: loadingProgress === 100 ? 0 : 1 }}>
          <div className="splash-logo-container">
            <div className="splash-glow-orb cyan-glow-pulse" />
            <Code2 size={72} className="cyan-glow-pulse" style={{ color: 'var(--accent-secondary)' }} />
            <h1 className="splash-title">PRISM</h1>
            <p className="splash-subtitle">Web Code Studio</p>
          </div>
          
          <div className="splash-progress-container">
            <span className="progress-text">{loadingText}</span>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${loadingProgress}%` }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

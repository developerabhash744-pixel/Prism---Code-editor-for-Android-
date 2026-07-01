import React, { useState, useEffect, useRef } from 'react';
import CodeMirror, { EditorView } from '@uiw/react-codemirror';
import { dracula } from '@uiw/codemirror-theme-dracula';
import { githubDark, githubLight } from '@uiw/codemirror-theme-github';
import { nord } from '@uiw/codemirror-theme-nord';
import { material } from '@uiw/codemirror-theme-material';
import { tokyoNight } from '@uiw/codemirror-theme-tokyo-night';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import { FilePicker } from '@capawesome/capacitor-file-picker';

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
  Settings,
  Terminal,
  Eye,
  RefreshCw,
  X,
  Code2,
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
  ChevronLeft,
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

// ConsoleLog interface removed

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
  
  // User Login & Profile states
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    return localStorage.getItem('prism_logged_in') === 'true';
  });
  const [username, setUsername] = useState<string>(() => {
    return localStorage.getItem('prism_username') || '';
  });
  const [email, setEmail] = useState<string>(() => {
    return localStorage.getItem('prism_email') || '';
  });

  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);
  const [showProfileSettingsModal, setShowProfileSettingsModal] = useState<boolean>(false);
  const [loginUsername, setLoginUsername] = useState<string>('');
  const [loginEmail, setLoginEmail] = useState<string>('');

  // Welcome Screen configuration state
  const [showWelcomeOnStartup, setShowWelcomeOnStartup] = useState<boolean>(() => {
    const saved = localStorage.getItem('prism_show_welcome_startup');
    return saved === null ? true : saved === 'true';
  });

  const [activeFileName, setActiveFileName] = useState<string>(() => {
    const savedShow = localStorage.getItem('prism_show_welcome_startup');
    const show = savedShow === null ? true : savedShow === 'true';
    return show ? 'Welcome' : '';
  });

  const [openTabs, setOpenTabs] = useState<string[]>(() => {
    const savedShow = localStorage.getItem('prism_show_welcome_startup');
    const show = savedShow === null ? true : savedShow === 'true';
    return show ? ['Welcome'] : [];
  });

  // Editor Settings
  const [fontSize, setFontSize] = useState<number>(14);
  const [themeName, setThemeName] = useState<string>('dracula');
  const [wordWrap, setWordWrap] = useState<boolean>(true);
  const [lineNumbers, setLineNumbers] = useState<boolean>(true);

  // View States
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [mobileTab, setMobileTab] = useState<'editor' | 'preview'>('editor');
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
  const [terminalLines, setTerminalLines] = useState<string[]>([
    'Prism Terminal v1.0.0 (Internal Storage Shell)',
    'Connected to app file storage.',
    'Type "help" for a list of available filesystem commands.',
    ''
  ]);
  const [terminalInput, setTerminalInput] = useState<string>('');
  const [terminalPath, setTerminalPath] = useState<string>('~');
  const [terminalOS] = useState<string>(() => {
    return localStorage.getItem('prism_terminal_os') || 'ubuntu';
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

  // Sync showWelcomeOnStartup to localStorage
  useEffect(() => {
    localStorage.setItem('prism_show_welcome_startup', String(showWelcomeOnStartup));
  }, [showWelcomeOnStartup]);

  // Modals
  const [showNewFileModal, setShowNewFileModal] = useState<boolean>(false);
  const [newFileName, setNewFileName] = useState<string>('');
  
  const [showRenameModal, setShowRenameModal] = useState<boolean>(false);
  const [renameTargetName, setRenameTargetName] = useState<string>('');
  const [renameNewName, setRenameNewName] = useState<string>('');

  // Custom modal states
  const [showNewFolderModal, setShowNewFolderModal] = useState<boolean>(false);
  const [newFolderName, setNewFolderName] = useState<string>('');



  const [showGitModal, setShowGitModal] = useState<boolean>(false);
  const [gitRepoUrl, setGitRepoUrl] = useState<string>('');

  const [selectedDetailModuleId, setSelectedDetailModuleId] = useState<string | null>(null);

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
        if (level === 'error') console.error(`[Sandbox] ${data}`);
        else if (level === 'warn') console.warn(`[Sandbox] ${data}`);
        else console.log(`[Sandbox] ${data}`);
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

  const deletePath = async (pathName: string) => {
    const isFolder = emptyFolders.includes(pathName) || files.some(f => f.name.startsWith(pathName + '/'));
    if (Capacitor.isNativePlatform()) {
      if (isFolder) {
        await Filesystem.rmdir({
          path: pathName,
          directory: Directory.Data,
          recursive: true
        }).catch(err => console.error("Error deleting native folder:", err));
      } else {
        await Filesystem.deleteFile({
          path: pathName,
          directory: Directory.Data
        }).catch(err => console.error("Error deleting native file:", err));
      }
    }

    const nextFiles = files.filter(f => f.name !== pathName && !f.name.startsWith(pathName + '/'));
    setFiles(nextFiles);
    setEmptyFolders(prev => prev.filter(f => f !== pathName && !f.startsWith(pathName + '/')));
    setOpenTabs(prev => prev.filter(t => t !== pathName && !t.startsWith(pathName + '/')));

    if (activeFileName === pathName || activeFileName.startsWith(pathName + '/')) {
      if (nextFiles.length > 0) {
        setActiveFileName(nextFiles[0].name);
      } else {
        setActiveFileName('Welcome');
      }
    }
  };

  const handleCreateFileInFolder = (parentFolder: string) => {
    const fileNameInput = prompt("Enter new file name:");
    if (!fileNameInput || !fileNameInput.trim()) return;
    const cleanFileName = fileNameInput.trim();
    const newFilePath = `${parentFolder}/${cleanFileName}`;

    if (files.some(f => f.name.toLowerCase() === newFilePath.toLowerCase())) {
      alert('A file with this name already exists.');
      return;
    }

    const extension = cleanFileName.split('.').pop()?.toLowerCase() || '';
    let language = 'text';
    if (['html', 'htm'].includes(extension)) language = 'html';
    else if (extension === 'css') language = 'css';
    else if (['js', 'jsx', 'ts', 'tsx'].includes(extension)) language = 'javascript';
    else if (extension === 'py') language = 'python';
    else if (['md', 'markdown'].includes(extension)) language = 'markdown';

    const newFile: VirtualFile = {
      name: newFilePath,
      content: '',
      language
    };

    setFiles(prev => [...prev, newFile]);
    setActiveFileName(newFilePath);
    if (!openTabs.includes(newFilePath)) {
      setOpenTabs(prev => [...prev, newFilePath]);
    }

    if (Capacitor.isNativePlatform()) {
      Filesystem.writeFile({
        path: newFilePath,
        data: '',
        directory: Directory.Data,
        encoding: Encoding.UTF8,
        recursive: true
      }).catch(err => console.error("Error creating native file:", err));
    }

    setExpandedFolders(prev => ({ ...prev, [parentFolder]: true }));
  };

  const handleCreateFolderInFolder = (parentFolder: string) => {
    const folderNameInput = prompt("Enter new folder name:");
    if (!folderNameInput || !folderNameInput.trim()) return;
    const cleanFolderName = folderNameInput.trim();
    const newFolderPath = `${parentFolder}/${cleanFolderName}`;

    if (emptyFolders.includes(newFolderPath)) {
      alert("Folder already exists.");
      return;
    }

    setEmptyFolders(prev => [...prev, newFolderPath]);

    if (Capacitor.isNativePlatform()) {
      Filesystem.mkdir({
        path: newFolderPath,
        directory: Directory.Data,
        recursive: true
      }).catch(err => console.error("Error creating native folder:", err));
    }

    setExpandedFolders(prev => ({ ...prev, [parentFolder]: true, [newFolderPath]: true }));
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
    if (mobileTab === 'preview') {
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



  const readExternalDirRecursive = async (
    absolutePath: string, 
    relativePrefix: string = '', 
    allFiles: VirtualFile[] = [], 
    allFolders: Set<string> = new Set()
  ): Promise<{ files: VirtualFile[], folders: string[] }> => {
    const res = await Filesystem.readdir({
      path: absolutePath
    });

    for (const file of res.files) {
      const isDir = file.type === 'directory';
      const fileRelPath = relativePrefix ? `${relativePrefix}/${file.name}` : file.name;
      const fileAbsPath = `${absolutePath}/${file.name}`;

      if (isDir) {
        allFolders.add(fileRelPath);
        await readExternalDirRecursive(fileAbsPath, fileRelPath, allFiles, allFolders);
      } else {
        const contentRes = await Filesystem.readFile({
          path: fileAbsPath,
          encoding: Encoding.UTF8
        }).catch(() => ({ data: '' }));

        allFiles.push({
          name: fileRelPath,
          content: contentRes.data as string,
          language: getLanguageFromExtension(file.name)
        });
      }
    }

    return {
      files: allFiles,
      folders: Array.from(allFolders)
    };
  };

  const handleOpenFolder = async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        const result = await FilePicker.pickDirectory();
        if (!result || !result.path) return;
        
        // Show loading progress
        setLoadingProgress(15);
        setLoadingText("Accessing native folder tree...");
        setAppLoaded(false);

        const data = await readExternalDirRecursive(result.path);
        
        // Sync these files with App sandboxed Directory.Data so offline preview has them
        setLoadingProgress(60);
        setLoadingText("Synchronizing files to offline workspace...");
        
        for (const folder of data.folders) {
          await Filesystem.mkdir({
            path: folder,
            directory: Directory.Data,
            recursive: true
          }).catch(() => {});
        }
        for (const f of data.files) {
          await Filesystem.writeFile({
            path: f.name,
            data: f.content,
            directory: Directory.Data,
            encoding: Encoding.UTF8,
            recursive: true
          }).catch(() => {});
        }

        setFiles(data.files);
        setEmptyFolders(data.folders);
        setIsFolderOpen(true);
        setAppLoaded(true);

        if (data.files.length > 0) {
          const firstFile = data.files[0].name;
          setActiveFileName(firstFile);
          setOpenTabs(['Welcome', firstFile]);
        }
        
        // Extract root folder name
        const folderName = result.path.split('/').pop() || 'Project';
        alert(`Successfully imported folder "${folderName}" with ${data.files.length} files!`);
      } catch (err: any) {
        setAppLoaded(true);
        console.error("Directory picking failed:", err);
        alert(`Failed to open folder: ${err.message || err}`);
      }
    } else {
      document.getElementById('folder-picker')?.click();
    }
  };

  const handleFolderSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;
    
    const loadedFiles: VirtualFile[] = [];
    const loadedFolders = new Set<string>();

    const firstPath = selectedFiles[0].webkitRelativePath || '';
    const rootFolderName = firstPath.split('/')[0] || 'Project';

    let processedCount = 0;
    Array.from(selectedFiles).forEach(file => {
      const reader = new FileReader();
      const relativePath = file.webkitRelativePath || file.name;
      
      const cleanPath = relativePath.startsWith(rootFolderName + '/') 
        ? relativePath.substring(rootFolderName.length + 1)
        : relativePath;

      const pathParts = cleanPath.split('/');
      for (let i = 0; i < pathParts.length - 1; i++) {
        loadedFolders.add(pathParts.slice(0, i + 1).join('/'));
      }

      reader.onload = async (event) => {
        const content = event.target?.result as string || '';
        
        loadedFiles.push({
          name: cleanPath,
          content,
          language: getLanguageFromExtension(file.name)
        });

        processedCount++;
        if (processedCount === selectedFiles.length) {
          if (Capacitor.isNativePlatform()) {
            for (const folder of Array.from(loadedFolders)) {
              await Filesystem.mkdir({
                path: folder,
                directory: Directory.Data,
                recursive: true
              }).catch(() => {});
            }
            for (const f of loadedFiles) {
              await Filesystem.writeFile({
                path: f.name,
                data: f.content,
                directory: Directory.Data,
                encoding: Encoding.UTF8,
                recursive: true
              }).catch(() => {});
            }
          }

          setFiles(loadedFiles);
          setEmptyFolders(Array.from(loadedFolders));
          setIsFolderOpen(true);
          
          if (loadedFiles.length > 0) {
            const firstFile = loadedFiles[0].name;
            setActiveFileName(firstFile);
            setOpenTabs(['Welcome', firstFile]);
          }
          alert(`Successfully opened folder "${rootFolderName}" with ${loadedFiles.length} files!`);
        }
      };
      reader.readAsText(file);
    });
  };

  const handleCloneRepo = () => {
    setGitRepoUrl('https://github.com/prism/editor.git');
    setShowGitModal(true);
  };

  const handleGitCloneConfirm = async () => {
    if (!gitRepoUrl.trim()) return;
    const repoUrl = gitRepoUrl.trim();
    
    // Match owner/repo pattern
    const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/\.]+)/);
    if (!match) {
      alert("Invalid GitHub URL. Please enter a valid repository URL (e.g. https://github.com/owner/repo).");
      return;
    }
    
    const owner = match[1];
    const repoName = match[2].replace('.git', '');
    
    setLoadingProgress(10);
    setLoadingText(`Connecting to ${repoName}...`);
    setAppLoaded(false);
    
    try {
      let branch = 'main';
      const repoInfoRes = await fetch(`https://api.github.com/repos/${owner}/${repoName}`);
      if (repoInfoRes.ok) {
        const repoInfo = await repoInfoRes.json();
        branch = repoInfo.default_branch || 'main';
      }

      const treeRes = await fetch(`https://api.github.com/repos/${owner}/${repoName}/git/trees/${branch}?recursive=1`);
      if (!treeRes.ok) {
        throw new Error("Failed to retrieve repository tree. Is it a public repository?");
      }
      
      const treeData = await treeRes.json();
      const treeItems = treeData.tree || [];
      
      const loadedFiles: VirtualFile[] = [];
      
      const fileItems = treeItems.filter((item: any) => item.type === 'blob');
      const folderItems = treeItems.filter((item: any) => item.type === 'tree').map((item: any) => item.path);
      
      let downloadedCount = 0;
      
      for (const item of fileItems) {
        const path = item.path;
        const rawFileUrl = `https://raw.githubusercontent.com/${owner}/${repoName}/${branch}/${path}`;
        const fileRes = await fetch(rawFileUrl);
        
        let content = '';
        if (fileRes.ok) {
          content = await fileRes.text();
        }
        
        loadedFiles.push({
          name: path,
          content,
          language: getLanguageFromExtension(path)
        });
        
        downloadedCount++;
        setLoadingProgress(Math.min(98, Math.round((downloadedCount / fileItems.length) * 100)));
        setLoadingText(`Downloading ${path}...`);
      }
      
      if (Capacitor.isNativePlatform()) {
        for (const folder of folderItems) {
          await Filesystem.mkdir({
            path: folder,
            directory: Directory.Data,
            recursive: true
          }).catch(() => {});
        }
        for (const file of loadedFiles) {
          await Filesystem.writeFile({
            path: file.name,
            data: file.content,
            directory: Directory.Data,
            encoding: Encoding.UTF8,
            recursive: true
          }).catch(() => {});
        }
      }
      
      setFiles(loadedFiles);
      setEmptyFolders(folderItems);
      setIsFolderOpen(true);
      setAppLoaded(true);
      
      if (loadedFiles.length > 0) {
        const first = loadedFiles[0].name;
        setActiveFileName(first);
        setOpenTabs(['Welcome', first]);
      }
      
      setGitRepoUrl('');
      setShowGitModal(false);
      alert(`Successfully cloned repository "${repoName}" with ${loadedFiles.length} files!`);
    } catch (err: any) {
      setAppLoaded(true);
      alert(`Clone failed: ${err.message}`);
    }
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
      {name: "Open Folder", description: "Open project folder from device storage", action: () => { handleOpenFolder(); } },
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
          setActiveFileName('Terminal');
          if (!openTabs.includes('Terminal')) {
            setOpenTabs(prev => [...prev, 'Terminal']);
          }
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
        <div className="tree-root" style={{ display: 'flex', flexDirection: 'column' }}>
          {node.children?.map((child, idx, arr) => 
            renderTree(child, depth, idx === arr.length - 1, [])
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

          {/* Row Actions Panel */}
          <div className="tree-item-actions" onClick={(e) => e.stopPropagation()}>
            {isFolder ? (
              <>
                <button 
                  className="file-action-icon-btn" 
                  onClick={() => handleCreateFolderInFolder(node.path)}
                  title="New Folder"
                  style={{ display: 'inline-flex', padding: '4px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                >
                  <FolderPlus size={12} />
                </button>
                <button 
                  className="file-action-icon-btn" 
                  onClick={() => handleCreateFileInFolder(node.path)}
                  title="New File"
                  style={{ display: 'inline-flex', padding: '4px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                >
                  <FilePlus size={12} />
                </button>
                <button 
                  className="file-action-icon-btn" 
                  onClick={() => {
                    if (confirm(`Are you sure you want to delete folder "${node.name}" and all its contents?`)) {
                      deletePath(node.path);
                    }
                  }}
                  title="Delete Folder"
                  style={{ display: 'inline-flex', padding: '4px', background: 'none', border: 'none', color: 'var(--accent-error)', cursor: 'pointer' }}
                >
                  <Trash2 size={12} />
                </button>
              </>
            ) : (
              <button 
                className="file-action-icon-btn" 
                onClick={() => {
                  if (confirm(`Are you sure you want to delete file "${node.name}"?`)) {
                    deletePath(node.path);
                  }
                }}
                title="Delete File"
                style={{ display: 'inline-flex', padding: '4px', background: 'none', border: 'none', color: 'var(--accent-error)', cursor: 'pointer' }}
              >
                <Trash2 size={12} />
              </button>
            )}
          </div>
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
      <header className="header-bar" style={{ position: 'relative' }}>
        <div className="header-logo">
          <Code2 size={24} className="cyan-glow-pulse" style={{ color: 'var(--accent-secondary)' }} />
        </div>

        <div className="header-actions" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {/* Mobile Preview Toggle */}
          {window.innerWidth <= 768 && (
            <button
              className="activity-btn"
              onClick={() => {
                setMobileTab(prev => prev === 'editor' ? 'preview' : 'editor');
                if (mobileTab === 'editor' && !previewUrl) {
                  handleRunCode();
                }
              }}
              title="Toggle Live Preview"
              style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-primary)' }}
            >
              {mobileTab === 'preview' ? <Code2 size={16} /> : <Eye size={16} />}
            </button>
          )}

          <button 
            id="activity-profile-btn"
            className={`activity-btn ${activePopover === 'profile' ? 'active' : ''}`}
            onClick={(e) => handleTogglePopover('profile', e)}
            title="Accounts"
            style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-primary)' }}
          >
            <User size={16} />
          </button>

          {/* Profile Floating popover absolute positioned under top right header */}
          {activePopover === 'profile' && (
            <div className="activity-popover" style={{ top: '48px', right: '12px', left: 'auto', bottom: 'auto', zIndex: 1000 }} onClick={(e) => e.stopPropagation()}>
              <div className="popover-header">Account</div>
              {isLoggedIn ? (
                <>
                  <div style={{ padding: '8px 12px', fontSize: '0.8rem', color: 'var(--text-secondary)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    Logged in as: <strong style={{ color: 'var(--accent-success)', display: 'block', marginTop: '2px' }}>{username}</strong>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginTop: '2px' }}>{email}</span>
                  </div>
                  <button className="popover-item" onClick={() => {
                    setLoginUsername(username);
                    setLoginEmail(email);
                    setShowProfileSettingsModal(true);
                    setActivePopover(null);
                  }}>
                    <span>Profile Settings</span>
                  </button>
                  <button className="popover-item" onClick={() => {
                    setIsLoggedIn(false);
                    setUsername('');
                    setEmail('');
                    localStorage.removeItem('prism_username');
                    localStorage.removeItem('prism_email');
                    localStorage.removeItem('prism_logged_in');
                    setActivePopover(null);
                    alert("Logged out successfully!");
                  }} style={{ color: 'var(--accent-error)' }}>
                    <span>Logout</span>
                  </button>
                </>
              ) : (
                <>
                  <div style={{ padding: '8px 12px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Not signed in
                  </div>
                  <button className="popover-item" onClick={() => {
                    setLoginUsername('');
                    setLoginEmail('');
                    setShowLoginModal(true);
                    setActivePopover(null);
                  }}>
                    <span>Sign In...</span>
                  </button>
                </>
              )}
            </div>
          )}
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
                id="activity-settings-btn"
                className={`activity-btn ${activePopover === 'settings' ? 'active' : ''}`}
                onClick={(e) => handleTogglePopover('settings', e)}
                title="Manage"
              >
                <Settings size={20} />
              </button>

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
                          onClick={handleOpenFolder} 
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
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>PROJECT FILES</span>
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
                  <div className="sidebar-header" style={{ display: 'flex', alignItems: 'center' }}>
                    {selectedDetailModuleId ? (
                      <button 
                        className="file-action-icon-btn" 
                        onClick={() => setSelectedDetailModuleId(null)}
                        title="Back to List"
                        style={{ display: 'inline-flex', padding: '4px', background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', marginRight: '6px' }}
                      >
                        <ChevronLeft size={16} />
                      </button>
                    ) : null}
                    <span className="sidebar-title">
                      {selectedDetailModuleId ? 'About Module' : 'Modules'}
                    </span>
                    {!selectedDetailModuleId && (
                      <button 
                        className="file-action-icon-btn" 
                        onClick={() => alert("Searching modules database...")}
                        title="Search modules"
                      >
                        <Search size={16} />
                      </button>
                    )}
                  </div>
                  
                  <div className="sidebar-content">
                    {selectedDetailModuleId ? (() => {
                      const mod = AVAILABLE_MODULES.find(m => m.id === selectedDetailModuleId);
                      if (!mod) return <div style={{ padding: 'var(--spacing-md)' }}>Module not found.</div>;
                      const isInstalled = installedModules.includes(mod.id);

                      return (
                        <div style={{ padding: 'var(--spacing-md)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                          <div>
                            <h2 style={{ fontSize: '1.1rem', color: 'var(--text-primary)', fontWeight: 700, marginBottom: '2px' }}>{mod.name}</h2>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>Version: {mod.version}</span>
                          </div>

                          <div style={{ padding: '10px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                            {mod.description}
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Integration Package URL</span>
                            <code style={{ fontSize: '0.68rem', wordBreak: 'break-all', padding: '6px', background: '#0b0c10', borderRadius: '4px', border: '1px solid var(--border-color)', color: 'var(--accent-secondary)' }}>
                              {mod.cdnUrl}
                            </code>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Usage Guidelines</span>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                              {mod.id === 'tailwind' && "No JavaScript calls needed. Simply apply Tailwind CSS helper utility classes (like class=\"flex text-red-500\") directly on your project HTML markup tags."}
                              {mod.id === 'fontawesome' && "Insert FontAwesome icon code tags (like <i class=\"fa fa-home\"></i> or <span class=\"fa fa-search\"></span>) directly into your HTML content."}
                              {mod.id === 'animatecss' && "Apply Animate.css trigger styles (like class=\"animate__animated animate__bounce\") directly inside your markup elements."}
                              {mod.id !== 'tailwind' && mod.id !== 'fontawesome' && mod.id !== 'animatecss' && `This library exports its API object globally. You can execute code referencing standard object "${mod.id === 'confetti' ? 'confetti' : mod.id === 'lodash' ? '_' : mod.id === 'jquery' ? '$' : mod.id === 'threejs' ? 'Three' : mod.id}" inside your script files.`}
                            </div>
                          </div>

                          <button 
                            className={`action-btn ${isInstalled ? 'secondary' : 'primary'}`}
                            style={{ 
                              width: '100%', 
                              padding: '10px', 
                              fontSize: '0.8rem', 
                              fontWeight: 600,
                              borderColor: isInstalled ? 'var(--accent-error)' : 'var(--accent-primary)',
                              color: isInstalled ? 'var(--accent-error)' : 'white',
                              marginTop: 'var(--spacing-md)' 
                            }}
                            onClick={() => {
                              if (isInstalled) {
                                setInstalledModules(prev => prev.filter(id => id !== mod.id));
                              } else {
                                setInstalledModules(prev => [...prev, mod.id]);
                              }
                            }}
                          >
                            {isInstalled ? 'Uninstall Package' : 'Install Package'}
                          </button>

                          <button 
                            className="action-btn secondary"
                            style={{ width: '100%', padding: '8px', fontSize: '0.75rem' }}
                            onClick={() => setSelectedDetailModuleId(null)}
                          >
                            ← Back to Database
                          </button>
                        </div>
                      );
                    })() : (
                      <div className="modules-panel" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                        {/* Warning Info Box */}
                        <div style={{ padding: '8px 10px', background: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245, 158, 11, 0.15)', borderRadius: 'var(--radius-md)', fontSize: '0.72rem', color: 'var(--accent-warning)', display: 'flex', flexDirection: 'column', gap: '2px', marginBottom: '4px' }}>
                          <span style={{ fontWeight: 600 }}>📡 Online Fetch Configuration</span>
                          <span>Installing or loading these extension modules requires an active internet connection on your device to load scripts from CDNs.</span>
                        </div>

                        {/* Search Bar Container */}
                        <div className="search-input-wrapper" style={{ position: 'relative' }}>
                          <input 
                            type="text" 
                            placeholder="Search modules..." 
                            value={moduleSearchQuery}
                            onChange={(e) => setModuleSearchQuery(e.target.value)}
                            className="search-input"
                            style={{ paddingRight: '56px', width: '100%' }}
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
                                  <div 
                                    key={mod.id} 
                                    className="module-card" 
                                    onClick={() => setSelectedDetailModuleId(mod.id)}
                                    style={{ cursor: 'pointer' }}
                                  >
                                    <div className="module-card-header">
                                      <span className="module-name">{mod.name}</span>
                                      <span className="module-badge installed">Active</span>
                                    </div>
                                    <p className="module-desc">{mod.description}</p>
                                  </div>
                                ))}
                                {installedModules.filter(id => AVAILABLE_MODULES.find(m => m.id === id)?.name.toLowerCase().includes(moduleSearchQuery.toLowerCase())).length === 0 && (
                                  <div className="console-empty" style={{ fontSize: '0.75rem', padding: '6px 0' }}>No matching installed modules.</div>
                                )}
                              </div>
                            )}
                          </div>

                          {/* 2. POPULAR ACCORDION */}
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

                          {/* 3. RECOMMENDED ACCORDION */}
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
                                    <div 
                                      key={mod.id} 
                                      className="module-card"
                                      onClick={() => setSelectedDetailModuleId(mod.id)}
                                      style={{ cursor: 'pointer' }}
                                    >
                                      <div className="module-card-header">
                                        <span className="module-name">{mod.name}</span>
                                        <span className={`module-badge ${isInstalled ? 'installed' : 'uninstalled'}`}>
                                          {isInstalled ? 'Active' : 'Add'}
                                        </span>
                                      </div>
                                      <p className="module-desc">{mod.description}</p>
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
                    )}
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
                          Install an Ubuntu Linux operating system runtime inside your browser sandbox.
                        </p>

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
                            Install Ubuntu OS
                          </button>
                        )}
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                        <div style={{ padding: 'var(--spacing-sm)', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                          <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block' }}>Active Runtime</span>
                          <strong style={{ fontSize: '0.9rem', color: 'var(--accent-success)' }}>
                            Ubuntu Linux (WebVM)
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
                    <span className="setting-name">Show Welcome Page on Startup</span>
                    <span className="setting-desc">Show the welcome screen when the application is launched.</span>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={showWelcomeOnStartup} 
                    onChange={(e) => setShowWelcomeOnStartup(e.target.checked)} 
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

              <div className="settings-group-card">
                <h3 className="settings-group-title">
                  <Terminal size={18} />
                  <span>Terminal OS Configuration</span>
                </h3>

                <div className="settings-row">
                  <div className="setting-detail">
                    <span className="setting-name">Installed Linux OS Runtime</span>
                    <span className="setting-desc">Status: {isTerminalInstalled ? "Ubuntu Linux (WebVM) Installed" : "Not Installed"}</span>
                  </div>
                  {isTerminalInstalled ? (
                    <button 
                      className="action-btn secondary" 
                      style={{ borderColor: 'var(--accent-error)', color: 'var(--accent-error)', padding: '4px 12px', fontSize: '0.75rem' }}
                      onClick={handleUninstallOS}
                    >
                      Uninstall Ubuntu OS
                    </button>
                  ) : (
                    <button 
                      className="action-btn primary" 
                      style={{ padding: '4px 12px', fontSize: '0.75rem' }}
                      onClick={() => {
                        setActiveSidebarTab('terminal');
                        setSidebarOpen(true);
                      }}
                    >
                      Install OS...
                    </button>
                  )}
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

                {/* 2. Recent Section removed */}
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

        {/* SPLIT VIEW (PREVIEW) */}
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
                  <p style={{ fontSize: '0.875rem' }}>Select a file and edit code to preview</p>
                </div>
              )}
            </div>
          </div>
        </section>

      </div>

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

      {/* Hidden Folder Picker Input */}
      <input 
        type="file" 
        id="folder-picker" 
        {...{ webkitdirectory: "", directory: "" }}
        multiple 
        style={{ display: 'none' }} 
        onChange={handleFolderSelect}
      />

      {/* Login Modal */}
      {showLoginModal && (
        <div className="modal-overlay" onClick={() => setShowLoginModal(false)}>
          <div className="modal-content animate-fade" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Sign In</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', margin: '12px 0' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Username</label>
                <input 
                  className="modal-input"
                  type="text" 
                  placeholder="Enter username"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && document.getElementById('signin-btn')?.click()}
                  autoFocus
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Email Address</label>
                <input 
                  className="modal-input"
                  type="email" 
                  placeholder="Enter email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && document.getElementById('signin-btn')?.click()}
                />
              </div>
            </div>
            <div className="modal-actions">
              <button className="action-btn secondary" onClick={() => setShowLoginModal(false)}>
                Cancel
              </button>
              <button id="signin-btn" className="action-btn primary" onClick={() => {
                if (!loginUsername.trim() || !loginEmail.trim()) {
                  alert("Please fill in both fields.");
                  return;
                }
                setUsername(loginUsername);
                setEmail(loginEmail);
                setIsLoggedIn(true);
                localStorage.setItem('prism_username', loginUsername);
                localStorage.setItem('prism_email', loginEmail);
                localStorage.setItem('prism_logged_in', 'true');
                setShowLoginModal(false);
                alert(`Welcome back, ${loginUsername}!`);
              }}>
                Sign In
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Profile Settings Modal */}
      {showProfileSettingsModal && (
        <div className="modal-overlay" onClick={() => setShowProfileSettingsModal(false)}>
          <div className="modal-content animate-fade" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Profile Settings</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', margin: '12px 0' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Username</label>
                <input 
                  className="modal-input"
                  type="text" 
                  placeholder="Enter username"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && document.getElementById('profile-save-btn')?.click()}
                  autoFocus
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Email Address</label>
                <input 
                  className="modal-input"
                  type="email" 
                  placeholder="Enter email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && document.getElementById('profile-save-btn')?.click()}
                />
              </div>
            </div>
            <div className="modal-actions">
              <button className="action-btn secondary" onClick={() => setShowProfileSettingsModal(false)}>
                Cancel
              </button>
              <button id="profile-save-btn" className="action-btn primary" onClick={() => {
                if (!loginUsername.trim() || !loginEmail.trim()) {
                  alert("Please fill in both fields.");
                  return;
                }
                setUsername(loginUsername);
                setEmail(loginEmail);
                localStorage.setItem('prism_username', loginUsername);
                localStorage.setItem('prism_email', loginEmail);
                setShowProfileSettingsModal(false);
                alert("Profile settings updated!");
              }}>
                Save Changes
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

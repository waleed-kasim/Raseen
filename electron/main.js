import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_FILE = path.join(app.getPath('userData'), 'quran_data.json');

function createWindow() {
    const isDev = !app.isPackaged;

    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        icon: path.join(__dirname, '..', 'icon.png'),
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.cjs')
        }
    });

    if (isDev) {
        win.loadFile(path.join(__dirname, '..', 'index.html'));
    } else {
        win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
    }

    win.setMenuBarVisibility(false);
}

ipcMain.handle('load-data', async () => {
    try {
        if (fs.existsSync(DATA_FILE)) {
            const data = fs.readFileSync(DATA_FILE, 'utf8');
            return JSON.parse(data);
        }

        const defaultPath = path.join(__dirname, '..', 'data', 'quran_data.json');
        if (fs.existsSync(defaultPath)) {
            const data = fs.readFileSync(defaultPath, 'utf8');
            return JSON.parse(data);
        }

        return { pages: [], links: [], lastPageId: null };
    } catch (error) {
        console.error('Failed to load data:', error);
        return { pages: [], links: [], lastPageId: null };
    }
});

ipcMain.handle('save-data', async (event, data) => {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');

        try {
            const localPath = path.join(__dirname, '..', 'data', 'quran_data.json');
            fs.writeFileSync(localPath, JSON.stringify(data, null, 2), 'utf8');
            console.log('Saved to local project file:', localPath);
        } catch (localErr) {
            console.log('Could not save to local file:', localErr.message);
        }

        return true;
    } catch (error) {
        console.error('Failed to save data:', error);
        return false;
    }
});

ipcMain.handle('run-build', async () => {
    return new Promise((resolve) => {
        const batPath = path.join(__dirname, '..', 'build_everything.bat');
        // Use 'start' to open in a new terminal window as requested
        exec(`start cmd /c "${batPath}"`, (error) => {
            if (error) {
                console.error('Build trigger failed:', error);
                resolve(false);
            } else {
                resolve(true);
            }
        });
    });
});

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

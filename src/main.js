import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { SpeechClient } from '@google-cloud/speech';
import { GoogleGenAI } from '@google/genai';
import express from 'express';
import http from 'http';
import { Server as IOServer } from 'socket.io';
import 'dotenv/config'; 

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Google clients
const speechClient = new SpeechClient();
const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API });

let speechStream;

/**
 * Start streaming Google Speech-to-Text and emit full transcripts.
 */
function initSpeechStream(io) {
    speechStream = speechClient
        .streamingRecognize({
            config: {
                encoding: 'LINEAR16',
                sampleRateHertz: 48000,
                languageCode: 'en-US'
            },
            interimResults: false
        })
        .on('data', data => {
            const transcript = data.results?.[0]?.alternatives?.[0]?.transcript;
            if (transcript) {
                io.emit('question', transcript);
                queryGenAI(transcript, io);
            }
        })
        .on('error', console.error);
}

// Receive audio chunks from renderer
ipcMain.on('audio-chunk', (_, chunk) => {
    if (speechStream) {
        speechStream.write(Buffer.from(chunk));
    }
});

/**
 * Query Google GenAI for an answer and emit back to client.
 */
async function queryGenAI(prompt, io) {
    try {
        const res = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            temperature: 0.2,
            maxOutputTokens: 256
        });
        const answer = res.candidates?.[0]?.content || 'No answer available.';
        io.emit('answer', answer);
    } catch (err) {
        console.error('GenAI error:', err);
        io.emit('answer', 'Error fetching answer.');
    }
}

/**
 * Spin up Express + Socket.io server for mobile clients.
 */
function startServer() {
    console.log('Credentials loaded from:', process.env.GOOGLE_APPLICATION_CREDENTIALS);
    const webApp = express();
    const server = http.createServer(webApp);
    const io = new IOServer(server);

    webApp.use(express.static(path.join(__dirname, 'mobile')));

    io.on('connection', () => {
        if (!speechStream) initSpeechStream(io);
    });

    server.listen(3000, () => {
        console.log('Server running at http://localhost:3000');
    });

    return io;
}

/**
 * Create the Electron window and load renderer.
 */
function createWindow() {
    const win = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true
        }
    });
    win.loadFile(path.join(__dirname, 'index.html'));
}

// App lifecycle
app.whenReady().then(() => {
    createWindow();
    startServer();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

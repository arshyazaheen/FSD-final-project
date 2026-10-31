import multer from 'multer';
import path from 'path';

// Store in memory during processing so plaintext is never saved to disk unencrypted
const storage = multer.memoryStorage();

const FORBIDDEN_EXTENSIONS = new Set([
  '.exe',
  '.bat',
  '.cmd',
  '.sh',
  '.vbs',
  '.ps1',
  '.msi',
  '.com',
  '.scr',
  '.pif',
  '.jar',
  '.php',
  '.phtml',
  '.php5',
  '.jsp',
  '.jspx',
  '.asp',
  '.aspx',
  '.cgi',
  '.pl',
  '.dll',
  '.so',
  '.dylib',
  '.elf',
  '.bin',
  '.app',
  '.deb',
  '.rpm',
  '.apk',
  '.dmg',
  '.iso',
  '.hta',
  '.wsf',
]);

function fileFilter(req, file, cb) {
  const originalName = file.originalname || '';

  // Prevent null byte and path traversal injection in filename
  if (originalName.includes('\0') || originalName.includes('..') || originalName.includes('/') || originalName.includes('\\')) {
    return cb(new Error('Invalid or suspicious filename characters detected.'), false);
  }

  const ext = path.extname(originalName).toLowerCase();
  if (FORBIDDEN_EXTENSIONS.has(ext)) {
    return cb(new Error(`Executable and script file uploads (${ext}) are prohibited for security.`), false);
  }

  // Check for multi-extension masking (e.g. payload.exe.pdf or script.sh.png)
  const parts = originalName.toLowerCase().split('.');
  if (parts.length > 2) {
    for (let i = 1; i < parts.length - 1; i++) {
      const intermediateExt = `.${parts[i]}`;
      if (FORBIDDEN_EXTENSIONS.has(intermediateExt)) {
        return cb(
          new Error(`Malicious double-extension detected (${intermediateExt}). Upload prohibited.`),
          false
        );
      }
    }
  }

  cb(null, true);
}

export const uploadMiddleware = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50 MB
    files: 1,
  },
  fileFilter,
});

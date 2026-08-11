/**
 * 文件上传中间件（multer）
 * 仅允许图片类型，按业务子目录存放，文件名使用随机串避免覆盖与路径穿越
 */
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const config = require('../config');

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_EXT = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

/**
 * 创建上传中间件
 * @param {'avatar'|'cover'} subDir 子目录
 */
function createUploader(subDir = 'cover') {
  const destDir = path.resolve(__dirname, '../../', config.upload.dir, subDir);
  fs.mkdirSync(destDir, { recursive: true });

  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      fs.mkdirSync(destDir, { recursive: true });
      cb(null, destDir);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const safeExt = ALLOWED_EXT.includes(ext) ? ext : '.png';
      const name = `${Date.now()}_${crypto.randomBytes(6).toString('hex')}${safeExt}`;
      cb(null, name);
    },
  });

  return multer({
    storage,
    limits: { fileSize: config.upload.maxSizeMB * 1024 * 1024, files: 1 },
    fileFilter: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      if (!ALLOWED_MIME.includes(file.mimetype) || !ALLOWED_EXT.includes(ext)) {
        return cb(new Error('仅支持 jpg / png / gif / webp 格式的图片'));
      }
      cb(null, true);
    },
  });
}

/** 将磁盘路径转为对外可访问的 URL */
function toPublicUrl(subDir, filename) {
  return `${config.staticBaseUrl}/${config.upload.dir}/${subDir}/${filename}`;
}

module.exports = { createUploader, toPublicUrl };

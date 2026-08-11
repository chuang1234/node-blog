/**
 * 重置用户密码工具
 *
 * 用法:
 *   node scripts/resetPassword.js <用户名> <新密码>
 *
 * 示例:
 *   node scripts/resetPassword.js admin admin123
 *
 * 适用场景:
 *   - 手工导入 seed.sql 后默认账号无法登录（seed 中为占位 hash）
 *   - 忘记管理员密码需要重置
 */
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const config = require('../src/config');

const [, , username, newPassword] = process.argv;

async function main() {
  if (!username || !newPassword) {
    console.log('');
    console.log('用法: node scripts/resetPassword.js <用户名> <新密码>');
    console.log('示例: node scripts/resetPassword.js admin admin123');
    console.log('');
    process.exitCode = 1;
    return;
  }

  if (newPassword.length < 6) {
    console.log('✗ 密码长度至少 6 位');
    process.exitCode = 1;
    return;
  }

  let conn = null;
  try {
    conn = await mysql.createConnection({
      host: config.db.host,
      port: config.db.port,
      user: config.db.user,
      password: config.db.password,
      database: config.db.database,
    });

    const [rows] = await conn.query('SELECT id, username, role FROM `users` WHERE `username` = ?', [
      username,
    ]);
    if (!rows.length) {
      console.log(`✗ 用户不存在: ${username}`);
      process.exitCode = 1;
      return;
    }

    const hash = await bcrypt.hash(newPassword, 10);
    await conn.query('UPDATE `users` SET `password` = ? WHERE `id` = ?', [hash, rows[0].id]);

    console.log('');
    console.log(`✓ 密码重置成功`);
    console.log(`  用户: ${rows[0].username} (id=${rows[0].id}, role=${rows[0].role})`);
    console.log(`  新密码: ${newPassword}`);
    console.log('');
  } catch (err) {
    console.log(`✗ 重置失败: ${err.message}`);
    process.exitCode = 1;
  } finally {
    if (conn) await conn.end();
  }
}

main();

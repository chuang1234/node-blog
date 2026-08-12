/**
 * 关注关系数据访问层
 */
const db = require('../config/db');

const PUBLIC_FIELDS = 'u.id, u.username, u.nickname, u.avatar, u.bio';

module.exports = {
  /** 是否已关注 */
  async isFollowing(followerId, followingId) {
    const row = await db.queryOne(
      'SELECT 1 AS ok FROM follows WHERE follower_id = ? AND following_id = ? LIMIT 1',
      [followerId, followingId]
    );
    return !!row;
  },

  /** 关注（幂等，重复关注不报错） */
  async follow(followerId, followingId) {
    await db.execute(
      'INSERT IGNORE INTO follows (follower_id, following_id) VALUES (?, ?)',
      [followerId, followingId]
    );
  },

  /** 取消关注 */
  async unfollow(followerId, followingId) {
    await db.execute(
      'DELETE FROM follows WHERE follower_id = ? AND following_id = ?',
      [followerId, followingId]
    );
  },

  /** 统计某用户的粉丝数 / 关注数 */
  async getCounts(userId) {
    const [follower, following] = await Promise.all([
      db.queryOne('SELECT COUNT(*) AS c FROM follows WHERE following_id = ?', [userId]),
      db.queryOne('SELECT COUNT(*) AS c FROM follows WHERE follower_id = ?', [userId]),
    ]);
    return {
      followerCount: follower ? follower.c : 0,
      followingCount: following ? following.c : 0,
    };
  },

  /** 粉丝列表（关注了 userId 的人） */
  async listFollowers(userId, { offset = 0, pageSize = 20 }) {
    const list = await db.query(
      `SELECT ${PUBLIC_FIELDS},
              (SELECT COUNT(*) FROM follows f2 WHERE f2.follower_id = u.id AND f2.following_id = ?) AS isFollowing
       FROM follows f
       JOIN users u ON u.id = f.follower_id
       WHERE f.following_id = ? AND u.status = 1
       ORDER BY f.created_at DESC
       LIMIT ${Number(pageSize)} OFFSET ${Number(offset)}`,
      [userId, userId]
    );
    const countRow = await db.queryOne('SELECT COUNT(*) AS total FROM follows WHERE following_id = ?', [userId]);
    return { list, total: countRow ? countRow.total : 0 };
  },

  /** 关注列表（userId 关注了的人） */
  async listFollowing(userId, { offset = 0, pageSize = 20 }) {
    const list = await db.query(
      `SELECT ${PUBLIC_FIELDS},
              (SELECT COUNT(*) FROM follows f2 WHERE f2.follower_id = ? AND f2.following_id = u.id) AS isFollowing
       FROM follows f
       JOIN users u ON u.id = f.following_id
       WHERE f.follower_id = ? AND u.status = 1
       ORDER BY f.created_at DESC
       LIMIT ${Number(pageSize)} OFFSET ${Number(offset)}`,
      [userId, userId]
    );
    const countRow = await db.queryOne('SELECT COUNT(*) AS total FROM follows WHERE follower_id = ?', [userId]);
    return { list, total: countRow ? countRow.total : 0 };
  },
};

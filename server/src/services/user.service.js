/**
 * 用户业务服务
 */
const userDao = require('../dao/user.dao');
const jwtUtil = require('../utils/jwt');
const cache = require('../config/redis');
const { errors } = require('../utils/response');
const { hashPassword, comparePassword, stripTags } = require('../utils/helper');

/** 清除用户信息缓存 */
async function clearUserCache(userId) {
  await cache.del(`user:info:${userId}`);
}

/** 组装对外返回的用户对象（剔除敏感字段） */
function toSafeUser(user) {
  if (!user) return null;
  const { password, ...rest } = user;
  return rest;
}

module.exports = {
  /** 注册 */
  async register({ username, email, password, nickname }) {
    if (await userDao.findByUsername(username)) {
      throw errors.conflict('该用户名已被注册');
    }
    if (await userDao.findByEmail(email)) {
      throw errors.conflict('该邮箱已被注册');
    }

    const hashed = await hashPassword(password);
    const id = await userDao.create({
      username,
      email,
      password: hashed,
      nickname: stripTags(nickname || username).slice(0, 50),
    });

    const user = await userDao.findById(id);
    const token = jwtUtil.sign({ id: user.id, username: user.username, role: user.role });
    return { token, user: toSafeUser(user) };
  },

  /** 登录 */
  async login({ account, password }) {
    const user = await userDao.findByAccount(account);
    if (!user) throw errors.param('账号或密码错误');

    const matched = await comparePassword(password, user.password);
    if (!matched) throw errors.param('账号或密码错误');
    if (user.status !== 1) throw errors.forbidden('账号已被禁用，请联系管理员');

    await userDao.updateLoginTime(user.id);
    await clearUserCache(user.id);

    const token = jwtUtil.sign({ id: user.id, username: user.username, role: user.role });
    const refreshToken = jwtUtil.signRefresh({ id: user.id });
    return { token, refreshToken, user: toSafeUser(user) };
  },

  /** 获取当前登录用户信息 */
  async getProfile(userId) {
    const user = await userDao.findById(userId);
    if (!user) throw errors.notFound('用户不存在');
    const safe = toSafeUser(user);
    // 附加粉丝 / 关注数（关注系统）
    try {
      const followDao = require('../dao/follow.dao');
      const counts = await followDao.getCounts(userId);
      safe.followerCount = counts.followerCount;
      safe.followingCount = counts.followingCount;
    } catch (e) {
      console.warn(`获取关注数失败(已忽略): ${e.message}`);
    }
    return safe;
  },

  /** 查看他人主页 */
  async getPublicProfile(userId, viewerId) {
    const user = await userDao.findPublicById(userId);
    if (!user) throw errors.notFound('用户不存在或已被禁用');
    // 登录用户查看他人主页时，附带「是否关注」状态
    if (viewerId && String(viewerId) !== String(userId)) {
      const followDao = require('../dao/follow.dao');
      user.isFollowing = await followDao.isFollowing(viewerId, userId);
    }
    return user;
  },

  /** 更新个人资料 */
  async updateProfile(userId, data) {
    const payload = {};
    if (data.nickname !== undefined) payload.nickname = stripTags(data.nickname).slice(0, 50);
    if (data.bio !== undefined) payload.bio = stripTags(data.bio).slice(0, 500);
    if (data.avatar !== undefined) payload.avatar = data.avatar;
    if (data.aiStyle !== undefined) payload.ai_style = data.aiStyle;

    if (data.email !== undefined) {
      const exist = await userDao.findByEmail(data.email);
      if (exist && String(exist.id) !== String(userId)) throw errors.conflict('该邮箱已被其他账号使用');
      payload.email = data.email;
    }

    await userDao.updateProfile(userId, payload);
    await clearUserCache(userId);
    return this.getProfile(userId);
  },

  /** 修改密码 */
  async changePassword(userId, { oldPassword, newPassword }) {
    const user = await userDao.findById(userId);
    if (!user) throw errors.notFound('用户不存在');

    const matched = await comparePassword(oldPassword, user.password);
    if (!matched) throw errors.param('原密码不正确');
    if (oldPassword === newPassword) throw errors.param('新密码不能与原密码相同');

    await userDao.updatePassword(userId, await hashPassword(newPassword));
    await clearUserCache(userId);
    return true;
  },

  /** 更新头像 */
  async updateAvatar(userId, avatarUrl) {
    await userDao.updateProfile(userId, { avatar: avatarUrl });
    await clearUserCache(userId);
    return avatarUrl;
  },

  // ---------------- 管理端 ----------------

  async adminList(query) {
    return userDao.findPage(query);
  },

  async adminUpdateStatus(userId, status, operatorId) {
    if (String(userId) === String(operatorId)) throw errors.param('不能修改自己的账号状态');
    const target = await userDao.findById(userId);
    if (!target) throw errors.notFound('用户不存在');
    await userDao.updateStatus(userId, status);
    await clearUserCache(userId);
    return true;
  },

  async adminUpdateRole(userId, role, operatorId) {
    if (String(userId) === String(operatorId)) throw errors.param('不能修改自己的角色');
    const target = await userDao.findById(userId);
    if (!target) throw errors.notFound('用户不存在');
    await userDao.updateRole(userId, role);
    await clearUserCache(userId);
    return true;
  },

  async adminRemove(userId, operatorId) {
    if (String(userId) === String(operatorId)) throw errors.param('不能删除自己的账号');
    const target = await userDao.findById(userId);
    if (!target) throw errors.notFound('用户不存在');
    if (target.role === 'admin') throw errors.forbidden('不能删除管理员账号，请先降级为普通用户');
    await userDao.remove(userId);
    await clearUserCache(userId);
    return true;
  },

  toSafeUser,
  clearUserCache,
};

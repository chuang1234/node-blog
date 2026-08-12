import { useNavigate, useLocation } from 'react-router-dom';
import { Modal } from 'antd';
import { useTranslation } from 'react-i18next';
import { useAppSelector } from '@/store';

/**
 * 游客操作限制。
 *
 * 已登录:   requireLogin() 返回 true，调用方可继续执行敏感操作
 * 未登录:   弹出登录提示（不强制跳转整页），返回 false；
 *           用户可在弹窗中主动选择「去登录」或关闭后继续浏览
 *
 * 用于点赞 / 收藏 / 关注等需要登录的动作，让分享链接的游客
 * 即使未登录也能正常浏览内容，仅在主动触发受限操作时得到引导。
 */
export function useRequireLogin() {
  const user = useAppSelector((s) => s.auth.user);
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  return function requireLogin(): boolean {
    if (user) return true;

    Modal.confirm({
      title: t('auth.loginRequiredTitle'),
      content: t('auth.loginRequiredDesc'),
      okText: t('auth.toLogin'),
      cancelText: t('common.cancel'),
      onOk: () => {
        const redirect = encodeURIComponent(location.pathname + location.search);
        navigate(`/login?redirect=${redirect}`);
      },
    });
    return false;
  };
}

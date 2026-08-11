/**
 * 登录页
 */
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Form, Input, Button, Alert, Divider } from 'antd';
import { UserOutlined, LockOutlined, RobotOutlined } from '@ant-design/icons';
import type { LoginPayload } from '@/types';
import { useAppDispatch } from '@/store';
import { login } from '@/store/authSlice';
import { message as antdMessage } from 'antd';
import './auth.less';

export default function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const [form] = Form.useForm<LoginPayload>();

  const onFinish = async (values: LoginPayload) => {
    try {
      await dispatch(login(values)).unwrap();
      antdMessage.success(t('auth.loginSuccess'));
      const to = (location.state as { from?: { pathname: string } } | null)?.from?.pathname || '/';
      navigate(to, { replace: true });
    } catch {
      // 错误已由 request 拦截器统一提示
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-card__logo">
          <span className="auth-card__logo-mark">AI</span>
          <h1>{t('auth.loginTitle')}</h1>
          <p>{t('auth.loginSubtitle')}</p>
        </div>

        <Alert
          className="auth-card__demo"
          type="info"
          showIcon
          message={t('auth.demoHint')}
        />

        <Form form={form} layout="vertical" onFinish={onFinish} requiredMark={false}>
          <Form.Item
            name="account"
            rules={[{ required: true, message: t('auth.accountPlaceholder') }]}
          >
            <Input
              size="large"
              prefix={<UserOutlined />}
              placeholder={t('auth.accountPlaceholder')}
              autoComplete="username"
            />
          </Form.Item>
          <Form.Item
            name="password"
            rules={[{ required: true, message: t('auth.passwordPlaceholder') }]}
          >
            <Input.Password
              size="large"
              prefix={<LockOutlined />}
              placeholder={t('auth.passwordPlaceholder')}
              autoComplete="current-password"
            />
          </Form.Item>
          <Form.Item>
            <Button type="primary" size="large" block htmlType="submit">
              {t('auth.login')}
            </Button>
          </Form.Item>
        </Form>

        <Divider plain style={{ fontSize: 12, color: 'var(--c-text-tertiary)' }}>
          <RobotOutlined /> AI Agent Blog
        </Divider>

        <div className="auth-card__footer">
          {t('auth.noAccount')} <Link to="/register">{t('auth.toRegister')}</Link>
        </div>
      </div>
    </div>
  );
}

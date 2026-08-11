/**
 * 注册页
 */
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Form, Input, Button, Divider } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined, SmileOutlined, RobotOutlined } from '@ant-design/icons';
import type { RegisterPayload } from '@/types';
import { useAppDispatch } from '@/store';
import { register } from '@/store/authSlice';
import { message as antdMessage } from 'antd';
import './auth.less';

interface RegisterForm extends RegisterPayload {
  confirm?: string;
}

export default function Register() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [form] = Form.useForm<RegisterForm>();

  const onFinish = async (values: RegisterForm) => {
    try {
      const { confirm: _confirm, ...payload } = values;
      await dispatch(register(payload)).unwrap();
      antdMessage.success(t('auth.registerSuccess'));
      navigate('/', { replace: true });
    } catch {
      // 错误已由 request 拦截器统一提示
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-card__logo">
          <span className="auth-card__logo-mark">AI</span>
          <h1>{t('auth.registerTitle')}</h1>
          <p>{t('auth.registerSubtitle')}</p>
        </div>

        <Form form={form} layout="vertical" onFinish={onFinish} requiredMark={false}>
          <Form.Item
            name="username"
            rules={[
              { required: true, message: t('auth.usernamePlaceholder') },
              { pattern: /^[a-zA-Z0-9_]{3,20}$/, message: t('auth.usernamePlaceholder') },
            ]}
          >
            <Input size="large" prefix={<UserOutlined />} placeholder={t('auth.usernamePlaceholder')} />
          </Form.Item>
          <Form.Item name="nickname">
            <Input size="large" prefix={<SmileOutlined />} placeholder={t('auth.nicknamePlaceholder')} />
          </Form.Item>
          <Form.Item
            name="email"
            rules={[
              { required: true, message: t('auth.emailPlaceholder') },
              { type: 'email', message: t('auth.emailPlaceholder') },
            ]}
          >
            <Input size="large" prefix={<MailOutlined />} placeholder={t('auth.emailPlaceholder')} />
          </Form.Item>
          <Form.Item
            name="password"
            rules={[
              { required: true, message: t('auth.passwordPlaceholder') },
              { min: 6, message: t('auth.passwordPlaceholder') },
            ]}
          >
            <Input.Password size="large" prefix={<LockOutlined />} placeholder={t('auth.passwordPlaceholder')} />
          </Form.Item>
          <Form.Item
            name="confirm"
            dependencies={['password']}
            rules={[
              { required: true, message: t('auth.confirmPasswordPlaceholder') },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) return Promise.resolve();
                  return Promise.reject(new Error(t('auth.passwordMismatch')));
                },
              }),
            ]}
          >
            <Input.Password size="large" prefix={<LockOutlined />} placeholder={t('auth.confirmPasswordPlaceholder')} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" size="large" block htmlType="submit">
              {t('auth.register')}
            </Button>
          </Form.Item>
        </Form>

        <Divider plain style={{ fontSize: 12, color: 'var(--c-text-tertiary)' }}>
          <RobotOutlined /> AI Agent Blog
        </Divider>

        <div className="auth-card__footer">
          {t('auth.hasAccount')} <Link to="/login">{t('auth.toLogin')}</Link>
        </div>
      </div>
    </div>
  );
}

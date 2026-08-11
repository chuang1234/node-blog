/**
 * 站点页脚
 */
import { useTranslation } from 'react-i18next';
import { GithubOutlined, RobotOutlined } from '@ant-design/icons';
import './Footer.less';

export default function Footer() {
  const { t } = useTranslation();
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <div className="site-footer__brand">
          <span className="site-footer__logo">
            <RobotOutlined /> AI Agent Blog
          </span>
          <p>{t('auth.loginSubtitle')}</p>
        </div>
        <div className="site-footer__links">
          <a href="https://github.com" target="_blank" rel="noreferrer">
            <GithubOutlined /> GitHub
          </a>
          <a href="/api-docs" target="_blank" rel="noreferrer">
            API Docs
          </a>
        </div>
        <div className="site-footer__copy">© {year} AI Agent Blog · Powered by Node.js & React</div>
      </div>
    </footer>
  );
}

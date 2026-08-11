/**
 * 403 无权限页面
 */
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button, Result } from 'antd';
import { HomeOutlined } from '@ant-design/icons';

export default function Forbidden() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Result
        status="403"
        title="403"
        subTitle={t('error.forbiddenDesc')}
        extra={
          <Button type="primary" icon={<HomeOutlined />} onClick={() => navigate('/')}>
            {t('error.backHome')}
          </Button>
        }
      />
    </div>
  );
}

import React, { useState, useEffect } from 'react'
import { ConfigProvider, App as AntApp } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import RecordPage from './components/RecordPage'
import SettingsPage from './components/SettingsPage'
import StatsPage from './components/StatsPage'
import ImportExportPage from './components/ImportExportPage'

const DEFAULT_CATEGORIES = [
  { id: 'food', name: '食材', color: '#FF6B6B', icon: '🍜', type: 'expense' },
  { id: 'dining', name: '餐饮', color: '#FF9F43', icon: '🍽️', type: 'expense' },
  { id: 'clothes', name: '衣服', color: '#F368E0', icon: '👕', type: 'expense' },
  { id: 'transport', name: '出行', color: '#00D2D3', icon: '🚌', type: 'expense' },
  { id: 'car', name: '养车', color: '#1E90FF', icon: '🚗', type: 'expense' },
  { id: 'entertainment', name: '休闲', color: '#FF6B81', icon: '🎮', type: 'expense' },
  { id: 'daily', name: '日用', color: '#7BED9F', icon: '🛒', type: 'expense' },
  { id: 'education', name: '教育', color: '#FD79A8', icon: '📚', type: 'expense' },
  { id: 'cat', name: '养猫', color: '#E84393', icon: '🐱', type: 'expense' },
  { id: 'medical', name: '医疗', color: '#00B894', icon: '🏥', type: 'expense' },
  { id: 'rent', name: '住房水电', color: '#A29BFE', icon: '🏠', type: 'expense' },
  { id: 'other', name: '其他', color: '#636E72', icon: '📦', type: 'expense' },
  { id: 'salary', name: '工资收入', color: '#00B894', icon: '💰', type: 'income' },
  { id: 'other-income', name: '其他收入', color: '#52c41a', icon: '💵', type: 'income' }
]

const EXCHANGE_RATES = {
  CNY: 1,
  USD: 7.2,
  HKD: 0.92
}

const STORAGE_KEYS = {
  CATEGORIES: 'bookkeeping_categories',
  EXCHANGE_RATES: 'bookkeeping_exchange_rates',
  THEME: 'bookkeeping_theme'
}

const THEMES = {
  default: { bg: '#f5f5f5', card: '#fff', text: '#333', primary: '#1677FF' },
  dark: { bg: '#1f1f1f', card: '#2d2d2d', text: '#e0e0e0', primary: '#1890ff' },
  green: { bg: '#f0f9f0', card: '#fff', text: '#333', primary: '#52c41a' }
}

function App() {
  const [activeTab, setActiveTab] = useState('record')
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES)
  const [exchangeRates, setExchangeRates] = useState(EXCHANGE_RATES)
  const [currentTheme, setCurrentTheme] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.THEME)
    return saved || 'default'
  })
  const [showThemeMenu, setShowThemeMenu] = useState(false)

  const theme = THEMES[currentTheme] || THEMES.default

  useEffect(() => {
    const savedCategories = localStorage.getItem(STORAGE_KEYS.CATEGORIES)
    if (savedCategories) setCategories(JSON.parse(savedCategories))

    const savedRates = localStorage.getItem(STORAGE_KEYS.EXCHANGE_RATES)
    if (savedRates) setExchangeRates(JSON.parse(savedRates))
  }, [])

  const handleSaveSettings = (newCategories, newRates, newUserPaymentDates) => {
    if (newCategories) {
      setCategories(newCategories)
      localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(newCategories))
    }
    if (newRates) {
      setExchangeRates(newRates)
      localStorage.setItem(STORAGE_KEYS.EXCHANGE_RATES, JSON.stringify(newRates))
    }
    if (newUserPaymentDates) {
      localStorage.setItem('bookkeeping_user_payment_dates', JSON.stringify(newUserPaymentDates))
    }
  }

  const tabItems = [
    { key: 'record', label: '记账' },
    { key: 'stats', label: '统计' },
    { key: 'import-export', label: '导入导出' },
    { key: 'settings', label: '设置' }
  ]

  useEffect(() => {
    document.body.setAttribute('data-theme', currentTheme)
  }, [currentTheme])

  return (
    <ConfigProvider locale={zhCN}>
      <AntApp>
        <div style={{ minHeight: '100vh', background: theme.bg, color: theme.text }}>
          <div style={{ padding: '16px' }}>
            {activeTab === 'record' && (
              <RecordPage
                categories={categories}
                exchangeRates={exchangeRates}
                theme={theme}
              />
            )}
            {activeTab === 'stats' && (
              <StatsPage categories={categories} theme={theme} />
            )}
            {activeTab === 'import-export' && (
              <ImportExportPage categories={categories} exchangeRates={exchangeRates} theme={theme} />
            )}
            {activeTab === 'settings' && (
              <SettingsPage
                categories={categories}
                exchangeRates={exchangeRates}
                onSave={handleSaveSettings}
                theme={theme}
              />
            )}
          </div>

          <div style={{
            position: 'fixed',
            left: '20px',
            bottom: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            zIndex: 1000
          }}>
            {tabItems.map(item => (
              <button
                key={item.key}
                onClick={() => setActiveTab(item.key)}
                title={item.label}
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '20px',
                  background: activeTab === item.key ? theme.primary : '#fff',
                  color: activeTab === item.key ? '#fff' : '#333',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                  transition: 'all 0.2s'
                }}
              >
                {item.key === 'record' && '📒'}
                {item.key === 'stats' && '📊'}
                {item.key === 'import-export' && '📥'}
                {item.key === 'settings' && '⚙️'}
              </button>
            ))}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowThemeMenu(!showThemeMenu)}
                title="主题"
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '20px',
                  background: showThemeMenu ? theme.primary : '#fff',
                  color: showThemeMenu ? '#fff' : '#333',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                  transition: 'all 0.2s'
                }}
              >
                🎨
              </button>
              {showThemeMenu && (
                <div style={{
                  position: 'absolute',
                  left: '60px',
                  bottom: '0',
                  background: theme.card,
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  padding: '8px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  minWidth: '100px'
                }}>
                  {Object.keys(THEMES).map(t => (
                    <button
                      key={t}
                      onClick={() => {
                        setCurrentTheme(t)
                        localStorage.setItem(STORAGE_KEYS.THEME, t)
                        setShowThemeMenu(false)
                      }}
                      style={{
                        padding: '8px 12px',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        background: currentTheme === t ? theme.primary : 'transparent',
                        color: currentTheme === t ? '#fff' : theme.text,
                        fontSize: '14px',
                        textAlign: 'left'
                      }}
                    >
                      {t === 'default' ? '默认' : t === 'dark' ? '暗色' : '绿色'}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </AntApp>
    </ConfigProvider>
  )
}

export default App

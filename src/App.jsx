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
  EXCHANGE_RATES: 'bookkeeping_exchange_rates'
}

function App() {
  const [activeTab, setActiveTab] = useState('record')
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES)
  const [exchangeRates, setExchangeRates] = useState(EXCHANGE_RATES)

  useEffect(() => {
    const savedCategories = localStorage.getItem(STORAGE_KEYS.CATEGORIES)
    if (savedCategories) setCategories(JSON.parse(savedCategories))

    const savedRates = localStorage.getItem(STORAGE_KEYS.EXCHANGE_RATES)
    if (savedRates) setExchangeRates(JSON.parse(savedRates))
  }, [])

  const handleSaveSettings = (newCategories, newRates) => {
    if (newCategories) {
      setCategories(newCategories)
      localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(newCategories))
    }
    if (newRates) {
      setExchangeRates(newRates)
      localStorage.setItem(STORAGE_KEYS.EXCHANGE_RATES, JSON.stringify(newRates))
    }
  }

  const tabItems = [
    { key: 'record', label: '记账' },
    { key: 'stats', label: '统计' },
    { key: 'import-export', label: '导入导出' },
    { key: 'settings', label: '设置' }
  ]

  return (
    <ConfigProvider locale={zhCN}>
      <AntApp>
        <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
          <div style={{
            background: '#fff',
            padding: '12px 24px',
            borderBottom: '1px solid #f0f0f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>记账本</h1>
            <div style={{ display: 'flex', gap: '8px' }}>
              {tabItems.map(item => (
                <button
                  key={item.key}
                  onClick={() => setActiveTab(item.key)}
                  style={{
                    padding: '6px 16px',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    background: activeTab === item.key ? '#1677FF' : '#f5f5f5',
                    color: activeTab === item.key ? '#fff' : '#333'
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ padding: '16px' }}>
            {activeTab === 'record' && (
              <RecordPage
                categories={categories}
                exchangeRates={exchangeRates}
              />
            )}
            {activeTab === 'stats' && (
              <StatsPage categories={categories} />
            )}
            {activeTab === 'import-export' && (
              <ImportExportPage categories={categories} exchangeRates={exchangeRates} />
            )}
            {activeTab === 'settings' && (
              <SettingsPage
                categories={categories}
                exchangeRates={exchangeRates}
                onSave={handleSaveSettings}
              />
            )}
          </div>
        </div>
      </AntApp>
    </ConfigProvider>
  )
}

export default App

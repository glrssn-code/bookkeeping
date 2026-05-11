import React, { useState } from 'react'
import { Button, Modal, message, InputNumber, Input } from 'antd'
import './SettingsPage.css'

const PRESET_COLORS = [
  '#FF6B6B', '#FF9F43', '#F368E0', '#00D2D3', '#1E90FF',
  '#FF6B81', '#7BED9F', '#A29BFE', '#FD79A8', '#E84393',
  '#00B894', '#636E72', '#6C5CE7', '#74B9FF', '#81ECEC',
  '#FDCB6E', '#E17055', '#D63031', '#B2BEC3', '#55A3FF',
  '#FF7675'
]

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

function SettingsPage({ categories, exchangeRates, onSave }) {
  const [localCategories, setLocalCategories] = useState(categories)
  const [localRates, setLocalRates] = useState(exchangeRates)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [editingColorCategory, setEditingColorCategory] = useState(null)

  const handleSave = () => {
    onSave(localCategories, localRates)
    message.success('设置已保存')
  }

  const handleResetCategories = () => {
    Modal.confirm({
      title: '确认重置',
      content: '确定要重置所有类别吗？',
      okText: '确认',
      cancelText: '取消',
      onOk: () => {
        setLocalCategories(DEFAULT_CATEGORIES)
        message.success('已重置为默认类别')
      }
    })
  }

  const handleCategoryColorChange = (id) => {
    setLocalCategories(prev =>
      prev.map(c => c.id === editingColorCategory?.id ? { ...c, color: id } : c)
    )
    setShowColorPicker(false)
    setEditingColorCategory(null)
  }

  const openColorPicker = (category) => {
    setEditingColorCategory(category)
    setShowColorPicker(true)
  }

  const moveCategory = (catId, direction) => {
    const expenseCats = localCategories.filter(c => c.type === 'expense')
    const currentPos = expenseCats.findIndex(c => c.id === catId)

    if (direction === 'up' && currentPos > 0) {
      const newCategories = [...localCategories]
      const expenseIndices = newCategories.map((c, i) => c.type === 'expense' ? i : -1).filter(i => i !== -1)
      const currentActualIdx = expenseIndices[currentPos]
      const prevActualIdx = expenseIndices[currentPos - 1]
      ;[newCategories[currentActualIdx], newCategories[prevActualIdx]] = [newCategories[prevActualIdx], newCategories[currentActualIdx]]
      setLocalCategories(newCategories)
    } else if (direction === 'down' && currentPos < expenseCats.length - 1) {
      const newCategories = [...localCategories]
      const expenseIndices = newCategories.map((c, i) => c.type === 'expense' ? i : -1).filter(i => i !== -1)
      const currentActualIdx = expenseIndices[currentPos]
      const nextActualIdx = expenseIndices[currentPos + 1]
      ;[newCategories[currentActualIdx], newCategories[nextActualIdx]] = [newCategories[nextActualIdx], newCategories[currentActualIdx]]
      setLocalCategories(newCategories)
    }
  }

  return (
    <div className="settings-container">
      <div className="settings-left">
        <div className="settings-section">
          <div className="section-title">支出类别设置（颜色和排序）</div>
          <div className="category-list">
            {localCategories.filter(c => c.type === 'expense').map((cat, idx) => (
              <div key={cat.id} className="category-setting-item">
                <span className="category-setting-icon">{cat.icon}</span>
                <span className="category-setting-name">{cat.name}</span>
                <div
                  className="color-swatch"
                  style={{ background: cat.color }}
                  onClick={() => openColorPicker(cat)}
                />
                <Button size="small" onClick={() => moveCategory(cat.id, 'up')} disabled={idx === 0}>↑</Button>
                <Button size="small" onClick={() => moveCategory(cat.id, 'down')} disabled={idx === localCategories.filter(c => c.type === 'expense').length - 1}>↓</Button>
              </div>
            ))}
          </div>
          <div className="section-title" style={{ marginTop: '20px' }}>收入类别设置（颜色）</div>
          <div className="category-list">
            {localCategories.filter(c => c.type === 'income').map(cat => (
              <div key={cat.id} className="category-setting-item">
                <span className="category-setting-icon">{cat.icon}</span>
                <span className="category-setting-name">{cat.name}</span>
                <div
                  className="color-swatch"
                  style={{ background: cat.color }}
                  onClick={() => openColorPicker(cat)}
                />
              </div>
            ))}
          </div>
          <Button onClick={handleResetCategories} style={{ marginTop: '12px' }}>
            重置类别
          </Button>
        </div>
      </div>

      <div className="settings-right">
        <div className="settings-section">
          <div className="section-title">汇率设置</div>
          <div className="exchange-rate-list">
            <div className="exchange-rate-item">
              <span>USD</span>
              <InputNumber
                value={localRates.USD}
                onChange={v => setLocalRates(prev => ({ ...prev, USD: v }))}
                min={0}
                precision={2}
              />
            </div>
            <div className="exchange-rate-item">
              <span>HKD</span>
              <InputNumber
                value={localRates.HKD}
                onChange={v => setLocalRates(prev => ({ ...prev, HKD: v }))}
                min={0}
                precision={2}
              />
            </div>
            <div className="exchange-rate-item">
              <span>CNY</span>
              <span style={{ color: '#999' }}>基准货币</span>
            </div>
          </div>
        </div>
      </div>

      <Modal
        open={showColorPicker}
        title="选择颜色"
        onCancel={() => { setShowColorPicker(false); setEditingColorCategory(null) }}
        footer={null}
      >
        <div className="color-picker-grid">
          {PRESET_COLORS.map(color => (
            <div
              key={color}
              className="color-picker-item"
              style={{ background: color }}
              onClick={() => handleCategoryColorChange(color)}
            />
          ))}
        </div>
      </Modal>

      <div className="settings-actions">
        <Button type="primary" onClick={handleSave}>
          保存设置
        </Button>
      </div>
    </div>
  )
}

export default SettingsPage

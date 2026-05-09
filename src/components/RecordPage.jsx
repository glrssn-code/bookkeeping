import React, { useState, useEffect } from 'react'
import { InputNumber, Select, Button, Modal, message } from 'antd'
import { getRecordsByDate, addRecord, deleteRecord, getAllRecords } from '../lib/db'
import './RecordPage.css'

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

function RecordPage({ categories, platforms, userSettings, exchangeRates }) {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [records, setRecords] = useState([])
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [selectedType, setSelectedType] = useState('expense')
  const [amount, setAmount] = useState(null)
  const [currency, setCurrency] = useState('CNY')
  const [remark, setRemark] = useState('')
  const [currentUser, setCurrentUser] = useState('user1')
  const [selectedPlatforms, setSelectedPlatforms] = useState(userSettings.user1Platforms)

  useEffect(() => {
    loadRecords()
  }, [selectedDate])

  useEffect(() => {
    setSelectedPlatforms(currentUser === 'user1' ? userSettings.user1Platforms : userSettings.user2Platforms)
  }, [currentUser, userSettings])

  const loadRecords = async () => {
    const dateStr = formatDate(selectedDate)
    const allRecords = await getAllRecords()
    const dayRecords = allRecords.filter(r => r.date === dateStr)
    setRecords(dayRecords)
  }

  const formatDate = (date) => {
    const d = new Date(date)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }

  const getDaysInMonth = (date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const days = []
    const startPadding = firstDay.getDay()
    for (let i = startPadding - 1; i >= 0; i--) {
      const d = new Date(year, month, -i)
      days.push({ date: d, otherMonth: true })
    }
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push({ date: new Date(year, month, i), otherMonth: false })
    }
    const endPadding = 42 - days.length
    for (let i = 1; i <= endPadding; i++) {
      days.push({ date: new Date(year, month + 1, i), otherMonth: true })
    }
    return days
  }

  const isToday = (date) => {
    const t = new Date()
    return date.getDate() === t.getDate() &&
           date.getMonth() === t.getMonth() &&
           date.getFullYear() === t.getFullYear()
  }

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))
  }

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))
  }

  const handleDayClick = (date) => {
    setSelectedDate(date)
  }

  const handleSubmit = async () => {
    if (!selectedCategory || !amount) {
      message.warning('请选择类别并输入金额')
      return
    }
    if (selectedPlatforms.length === 0) {
      message.warning('请选择支付平台')
      return
    }

    const rate = exchangeRates[currency] || 1
    const convertedAmount = amount * rate

    for (const platform of selectedPlatforms) {
      await addRecord({
        date: formatDate(selectedDate),
        type: selectedType,
        category: selectedCategory,
        platform,
        amount: convertedAmount,
        originalAmount: amount,
        originalCurrency: currency,
        remark,
        user: currentUser
      })
    }

    message.success('记录成功')
    setAmount(null)
    setRemark('')
    loadRecords()
  }

  const handleDelete = async (id) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这条记录吗？',
      okText: '确认',
      cancelText: '取消',
      onOk: async () => {
        await deleteRecord(id)
        message.success('删除成功')
        loadRecords()
      }
    })
  }

  const filteredCategories = categories.filter(c => c.type === selectedType)

  const days = getDaysInMonth(currentMonth)

  return (
    <div className="record-page">
      <div className="calendar-card">
        <div className="calendar-header">
          <button className="nav-btn" onClick={handlePrevMonth}>&lt;</button>
          <span className="calendar-title">
            {currentMonth.getFullYear()}年{currentMonth.getMonth() + 1}月
          </span>
          <button className="nav-btn" onClick={handleNextMonth}>&gt;</button>
        </div>
        <div className="calendar-grid">
          {WEEKDAYS.map(d => <div key={d} className="calendar-weekday">{d}</div>)}
          {days.map(({ date, otherMonth }, i) => {
            const dateStr = formatDate(date)
            const isSelected = formatDate(selectedDate) === dateStr
            return (
              <div
                key={i}
                className={`calendar-day ${otherMonth ? 'other-month' : ''} ${isToday(date) ? 'today' : ''} ${isSelected ? 'selected' : ''}`}
                onClick={() => handleDayClick(date)}
              >
                <span>{date.getDate()}</span>
              </div>
            )
          })}
        </div>
      </div>

      <div className="record-center">
        <div className="user-selector">
          <button
            className={`user-tab ${currentUser === 'user1' ? 'active' : ''}`}
            onClick={() => setCurrentUser('user1')}
          >
            用户1
          </button>
          <button
            className={`user-tab ${currentUser === 'user2' ? 'active' : ''}`}
            onClick={() => setCurrentUser('user2')}
          >
            用户2
          </button>
        </div>

        <div className="type-tabs">
          <button
            className={`type-tab ${selectedType === 'expense' ? 'active' : ''}`}
            onClick={() => { setSelectedType('expense'); setSelectedCategory(null) }}
          >
            支出
          </button>
          <button
            className={`type-tab ${selectedType === 'income' ? 'active' : ''}`}
            onClick={() => { setSelectedType('income'); setSelectedCategory(null) }}
          >
            收入
          </button>
        </div>

        <div className="platform-grid">
          {platforms.map(p => (
            <div
              key={p.id}
              className={`platform-chip ${selectedPlatforms.includes(p.id) ? 'selected' : ''}`}
              style={{
                borderColor: p.color,
                color: selectedPlatforms.includes(p.id) ? '#fff' : p.color,
                background: selectedPlatforms.includes(p.id) ? p.color : 'transparent'
              }}
              onClick={() => {
                setSelectedPlatforms(prev =>
                  prev.includes(p.id) ? prev.filter(x => x !== p.id) : [...prev, p.id]
                )
              }}
            >
              {p.name}
            </div>
          ))}
        </div>

        <div className="category-grid">
          {filteredCategories.map(cat => (
            <div
              key={cat.id}
              className={`category-item ${selectedCategory === cat.id ? 'selected' : ''}`}
              onClick={() => setSelectedCategory(cat.id)}
              style={{ borderColor: selectedCategory === cat.id ? cat.color : 'transparent' }}
            >
              <span className="category-icon">{cat.icon}</span>
              <span className="category-name">{cat.name}</span>
            </div>
          ))}
        </div>

        {selectedCategory && (
          <div className="input-section">
            <div className="input-row">
              <InputNumber
                className="amount-input"
                placeholder="金额"
                value={amount}
                onChange={setAmount}
                min={0}
                precision={2}
                style={{ width: '100%' }}
              />
              <Select
                className="currency-select"
                value={currency}
                onChange={setCurrency}
                options={[
                  { value: 'CNY', label: 'CNY' },
                  { value: 'HKD', label: 'HKD' },
                  { value: 'USD', label: 'USD' }
                ]}
              />
            </div>
            <Input.TextArea
              className="remark-input"
              placeholder="备注（可选）"
              value={remark}
              onChange={e => setRemark(e.target.value)}
              rows={2}
            />
            <Button type="primary" className="submit-btn" onClick={handleSubmit}>
              记 录
            </Button>
          </div>
        )}
      </div>

      <div className="record-right">
        <div className="records-header">
          <span className="records-title">
            {selectedDate.getMonth() + 1}月{selectedDate.getDate()}日 记录
          </span>
        </div>
        <div className="records-list">
          {records.length === 0 ? (
            <div className="no-records">暂无记录</div>
          ) : (
            records.slice().reverse().map(record => {
              const cat = categories.find(c => c.id === record.category)
              const plat = platforms.find(p => p.id === record.platform)
              return (
                <div
                  key={record.id}
                  className="record-item"
                  style={{ borderLeftColor: cat?.color || '#ccc' }}
                >
                  <div className="record-category">
                    <span>{cat?.icon}</span>
                    <span>{cat?.name}</span>
                    <span style={{ color: plat?.color, fontSize: '11px' }}>{plat?.name}</span>
                  </div>
                  {record.remark && <div className="record-remark">{record.remark}</div>}
                  <div className="record-amount" style={{ color: record.type === 'income' ? '#52c41a' : '#ff4d4f' }}>
                    {record.type === 'income' ? '+' : '-'}{record.amount?.toFixed(2)}
                  </div>
                  <div className="record-meta">
                    <span>{record.originalCurrency} {record.originalAmount?.toFixed(2)}</span>
                    <span style={{ cursor: 'pointer', color: '#ff4d4f' }} onClick={() => handleDelete(record.id)}>删除</span>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

export default RecordPage

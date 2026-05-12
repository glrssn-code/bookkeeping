import React, { useState, useEffect, useRef } from 'react'
import { InputNumber, Input, Select, Button, Modal, message } from 'antd'
import { getRecordsByDate, addRecord, deleteRecord, getAllRecords, updateRecord } from '../lib/db'
import './RecordPage.css'

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

function RecordPage({ categories, exchangeRates, theme }) {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [records, setRecords] = useState([])
  const [monthRecords, setMonthRecords] = useState([])
  const [selectedType, setSelectedType] = useState('expense')
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('CNY')
  const [remark, setRemark] = useState('')
  const [editingRecord, setEditingRecord] = useState(null)
  const [editDate, setEditDate] = useState(null)
  const [editAmount, setEditAmount] = useState(null)
  const [editRemark, setEditRemark] = useState('')
  const amountInputRef = useRef(null)

  const expenseCategories = categories.filter(c => c.type === 'expense')
  const incomeCategories = categories.filter(c => c.type === 'income')
  const filteredCategories = selectedType === 'expense' ? expenseCategories : incomeCategories
  const defaultCategory = filteredCategories[0]?.id

  useEffect(() => {
    loadRecords()
  }, [selectedDate])

  useEffect(() => {
    loadMonthRecords()
    amountInputRef.current?.focus()
  }, [selectedCategory, defaultCategory, currentMonth])

  const loadRecords = async () => {
    const dateStr = formatDate(selectedDate)
    const allRecords = await getAllRecords()
    const dayRecords = allRecords.filter(r => r.date === dateStr)
    setRecords(dayRecords)
  }

  const loadMonthRecords = async () => {
    const allRecords = await getAllRecords()
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`
    const filtered = allRecords.filter(r => r.date.startsWith(monthStr))
    setMonthRecords(filtered)
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
    if (date.getMonth() !== currentMonth.getMonth() || date.getFullYear() !== currentMonth.getFullYear()) {
      setCurrentMonth(new Date(date.getFullYear(), date.getMonth()))
    }
    setTimeout(() => amountInputRef.current?.focus(), 50)
  }

  const handleSubmit = async () => {
    const numAmount = parseFloat(amount)
    const categoryToUse = selectedCategory || defaultCategory
    if (!categoryToUse || !numAmount || numAmount <= 0) {
      message.warning('请输入有效金额')
      return
    }
    if (numAmount > 9999999) {
      message.warning('单笔最大金额为9999999')
      return
    }
    const rate = exchangeRates[currency] || 1
    const convertedAmount = numAmount * rate

    await addRecord({
      date: formatDate(selectedDate),
      type: selectedType,
      category: categoryToUse,
      amount: convertedAmount,
      originalAmount: numAmount,
      originalCurrency: currency,
      remark
    })

    message.success('记录成功')
    setAmount('')
    setRemark('')
    amountInputRef.current?.focus()
    await loadMonthRecords()
    await loadRecords()
  }

  const handleAmountChange = (e) => {
    const value = e.target.value
    // 只允许数字和小数点
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setAmount(value)
    }
  }

  const handleAmountKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSubmit()
    } else if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
      e.preventDefault()
      handleCategoryNavigation(e)
    }
  }

  const handleCategoryNavigation = async (e) => {
    const cols = 3
    const currentIdx = filteredCategories.findIndex(c => c.id === (selectedCategory || defaultCategory))
    console.log('Navigation:', e.key, 'currentIdx:', currentIdx, 'filteredCategories.length:', filteredCategories.length)
    if (currentIdx === -1) return

    let newIdx = currentIdx
    if (e.key === 'ArrowLeft') {
      newIdx = currentIdx - 1
    } else if (e.key === 'ArrowRight') {
      newIdx = currentIdx + 1
    } else if (e.key === 'ArrowUp') {
      newIdx = currentIdx - cols
    } else if (e.key === 'ArrowDown') {
      newIdx = currentIdx + cols
    }

    if (newIdx >= 0 && newIdx < filteredCategories.length) {
      const numAmount = parseFloat(amount)
      if (amount && numAmount && numAmount > 0 && numAmount <= 9999999) {
        const rate = exchangeRates[currency] || 1
        const convertedAmount = numAmount * rate
        await addRecord({
          date: formatDate(selectedDate),
          type: selectedType,
          category: selectedCategory || defaultCategory,
          amount: convertedAmount,
          originalAmount: numAmount,
          originalCurrency: currency,
          remark
        })
        setAmount('')
        setRemark('')
        loadRecords()
      }
      setSelectedCategory(filteredCategories[newIdx].id)
    }
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
        await loadMonthRecords()
        await loadRecords()
      }
    })
  }

  const handleEdit = (record) => {
    setEditingRecord(record)
    setEditDate(record.date)
    setEditAmount(record.originalAmount)
    setEditRemark(record.remark || '')
  }

  const handleEditSave = async () => {
    if (!editAmount) {
      message.warning('请输入金额')
      return
    }
    const rate = exchangeRates[editDate ? currency : 'CNY'] || 1
    const convertedAmount = editAmount * rate

    await updateRecord(editingRecord.id, {
      date: editDate,
      amount: convertedAmount,
      originalAmount: editAmount,
      originalCurrency: currency,
      remark: editRemark
    })
    message.success('修改成功')
    setEditingRecord(null)
    await loadMonthRecords()
    await loadRecords()
  }

  const days = getDaysInMonth(currentMonth)

  return (
    <div className="record-page">
      <div className="calendar-card">
        <div className="calendar-header">
          <button className="nav-btn" onClick={handlePrevMonth}>&lt;</button>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
            <span className="calendar-title">
              {currentMonth.getFullYear()}年{currentMonth.getMonth() + 1}月
            </span>
            <div style={{ display: 'flex', gap: '16px', fontSize: '12px' }}>
              <span style={{ color: '#52c41a' }}>收入 ¥{monthRecords.filter(r => r.type === 'income').reduce((sum, r) => sum + r.amount, 0).toFixed(0)}</span>
              <span style={{ color: '#ff4d4f' }}>支出 ¥{monthRecords.filter(r => r.type === 'expense').reduce((sum, r) => sum + r.amount, 0).toFixed(0)}</span>
            </div>
          </div>
          <button className="nav-btn" onClick={handleNextMonth}>&gt;</button>
        </div>
        <div className="calendar-grid">
          {WEEKDAYS.map(d => <div key={d} className="calendar-weekday">{d}</div>)}
          {days.map(({ date, otherMonth }, i) => {
            const dateStr = formatDate(date)
            const isSelected = formatDate(selectedDate) === dateStr
            const dayRecords = monthRecords.filter(r => r.date === dateStr)
            const dayIncome = dayRecords.filter(r => r.type === 'income').reduce((sum, r) => sum + r.amount, 0)
            const dayExpense = dayRecords.filter(r => r.type === 'expense').reduce((sum, r) => sum + r.amount, 0)
            return (
              <div
                key={i}
                className={`calendar-day ${otherMonth ? 'other-month' : ''} ${isToday(date) ? 'today' : ''} ${isSelected ? 'selected' : ''}`}
                onClick={() => handleDayClick(date)}
              >
                <span className="calendar-day-num">{date.getDate()}</span>
                {!otherMonth && (
                  <>
                    <span className="calendar-day-expense">{dayExpense > 0 ? `-¥${dayExpense.toFixed(0)}` : '¥0'}</span>
                    <span className="calendar-day-income">{dayIncome > 0 ? `+¥${dayIncome.toFixed(0)}` : '¥0'}</span>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className="record-center">
        <div className="type-tabs">
          <button
            className={`type-tab ${selectedType === 'expense' ? 'active' : ''}`}
            onClick={() => { setSelectedType('expense'); setSelectedCategory(null); setAmount(''); setRemark('') }}
          >
            支出
          </button>
          <button
            className={`type-tab ${selectedType === 'income' ? 'active' : ''}`}
            onClick={() => { setSelectedType('income'); setSelectedCategory(null); setAmount(''); setRemark('') }}
          >
            收入
          </button>
        </div>

        <div className="category-grid">
          {filteredCategories.map(cat => (
            <div
              key={cat.id}
              className={`category-item ${(selectedCategory || defaultCategory) === cat.id ? 'selected' : ''}`}
              onClick={() => setSelectedCategory(cat.id)}
              style={{ borderColor: (selectedCategory || defaultCategory) === cat.id ? cat.color : 'transparent', color: cat.color }}
            >
              <span className="category-icon">{cat.icon}</span>
              <span className="category-name">{cat.name}</span>
            </div>
          ))}
        </div>

        <div className="input-section">
          <div className="input-row">
            <Input
              ref={amountInputRef}
              className="amount-input"
              placeholder="输入金额"
              value={amount}
              onChange={handleAmountChange}
              onKeyDown={handleAmountKeyDown}
              maxLength={10}
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
              return (
                <div
                  key={record.id}
                  className="record-item"
                  style={{ borderLeftColor: cat?.color || '#ccc' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div className="record-category">
                      <span>{cat?.icon}</span>
                      <span>{cat?.name}</span>
                    </div>
                    <div className="record-amount" style={{ color: record.type === 'income' ? '#52c41a' : '#ff4d4f' }}>
                      {record.type === 'income' ? '+' : '-'}{record.amount?.toFixed(2)}
                    </div>
                  </div>
                  {record.remark && <div className="record-remark">{record.remark}</div>}
                  <div className="record-meta">
                    <span>{record.originalCurrency} {record.originalAmount?.toFixed(2)}</span>
                    <span style={{ cursor: 'pointer', color: '#1677FF' }} onClick={() => handleEdit(record)}>编辑</span>
                    <span style={{ cursor: 'pointer', color: '#ff4d4f' }} onClick={() => handleDelete(record.id)}>删除</span>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      <Modal
        open={!!editingRecord}
        title="编辑记录"
        onCancel={() => setEditingRecord(null)}
        onOk={handleEditSave}
        okText="保存"
        cancelText="取消"
      >
        {editingRecord && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '10px 0' }}>
            <div>
              <div style={{ marginBottom: '4px' }}>日期</div>
              <Input
                value={editDate}
                onChange={e => setEditDate(e.target.value)}
                placeholder="YYYY-MM-DD"
              />
            </div>
            <div>
              <div style={{ marginBottom: '4px' }}>金额</div>
              <InputNumber
                value={editAmount}
                onChange={setEditAmount}
                min={0}
                precision={2}
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <div style={{ marginBottom: '4px' }}>备注</div>
              <Input.TextArea
                value={editRemark}
                onChange={e => setEditRemark(e.target.value)}
                rows={2}
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default RecordPage

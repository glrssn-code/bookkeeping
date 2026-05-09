import React, { useState } from 'react'
import { Upload, Button, message, Modal, Select, Table } from 'antd'
import { getAllRecords, clearAllRecords, importRecords } from '../lib/db'
import * as XLSX from 'xlsx'
import './ImportExportPage.css'

const { Dragger } = Upload

function ImportExportPage({ categories, platforms, exchangeRates }) {
  const [loading, setLoading] = useState(false)
  const [showClearConfirm, setShowClearConfirm] = useState(false)

  const handleExportExcel = async (recordList, year) => {
    setLoading(true)
    try {
      const filtered = year ? recordList.filter(r => new Date(r.date).getFullYear() === year) : recordList

      const monthGroups = {}
      filtered.forEach(r => {
        const d = new Date(r.date)
        const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        if (!monthGroups[monthKey]) monthGroups[monthKey] = []
        monthGroups[monthKey].push(r)
      })

      const workbook = XLSX.utils.book_new()

      Object.entries(monthGroups).sort(([a], [b]) => a.localeCompare(b)).forEach(([month, recs]) => {
        const sheetData = []
        const catNames = {}
        categories.forEach(c => { catNames[c.id] = c.name })
        const platNames = {}
        platforms.forEach(p => { platNames[p.id] = p.name })

        const grouped = {}
        recs.forEach(r => {
          const key = `${r.date}|${r.type}|${r.category}|${r.platform}|${r.remark || ''}`
          if (!grouped[key]) {
            grouped[key] = { ...r, count: 0, totalAmount: 0 }
          }
          grouped[key].count++
          grouped[key].totalAmount += r.amount
        })

        const sortedKeys = Object.keys(grouped).sort()
        sortedKeys.forEach(key => {
          const r = grouped[key]
          const amountVal = r.count === 1 ? r.originalAmount : `${r.originalAmount}(x${r.count})`
          sheetData.push({
            '日期': r.date,
            '类型': r.type === 'income' ? '收入' : '支出',
            '类别': catNames[r.category] || r.category,
            '平台': platNames[r.platform] || r.platform,
            '金额': amountVal,
            '备注': r.remark || ''
          })
        })

        const totals = { income: 0, expense: 0 }
        recs.forEach(r => {
          totals[r.type] += r.amount
        })

        sheetData.push({}, {
          '日期': '汇总',
          '类型': '收入',
          '类别': '',
          '平台': '',
          '金额': totals.income.toFixed(2),
          '备注': ''
        }, {
          '日期': '汇总',
          '类型': '支出',
          '类别': '',
          '平台': '',
          '金额': totals.expense.toFixed(2),
          '备注': ''
        }, {
          '日期': '汇总',
          '类型': '结余',
          '类别': '',
          '平台': '',
          '金额': (totals.income - totals.expense).toFixed(2),
          '备注': ''
        })

        const worksheet = XLSX.utils.json_to_sheet(sheetData)
        worksheet['!cols'] = [
          { wch: 12 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 15 }, { wch: 20 }
        ]
        XLSX.utils.book_append_sheet(workbook, worksheet, month)
      })

      XLSX.writeFile(workbook, `记账本导出_${new Date().toLocaleDateString().replace(/\//g, '-')}.xlsx`)
      message.success('导出成功')
    } catch (err) {
      console.error(err)
      message.error('导出失败')
    }
    setLoading(false)
  }

  const handleExportClick = async () => {
    const allRecords = await getAllRecords()
    if (allRecords.length === 0) {
      message.warning('暂无数据可导出')
      return
    }

    const years = [...new Set(allRecords.map(r => new Date(r.date).getFullYear()))]

    if (years.length >= 2) {
      Modal.confirm({
        title: '选择导出年份',
        content: (
          <div style={{ padding: '10px 0' }}>
            <p style={{ marginBottom: 16 }}>您有 {years.length} 年的数据，请选择要导出的年份：</p>
            <Select
              placeholder="选择年份"
              style={{ width: '100%' }}
              options={years.sort().reverse().map(y => ({ value: y, label: `${y}年` }))}
              onChange={(selectedYear) => handleExportExcel(allRecords, selectedYear)}
            />
          </div>
        ),
        okText: '导出全部',
        cancelText: '取消',
        onOk: () => handleExportExcel(allRecords, null),
      })
    } else {
      handleExportExcel(allRecords, null)
    }
  }

  const handleImport = async (file) => {
    setLoading(true)
    try {
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data)
      const sheetName = workbook.SheetNames[0]
      const sheet = workbook.Sheets[sheetName]
      const json = XLSX.utils.sheet_to_json(sheet)

      const records = json
        .filter(row => row['日期'] && row['类型'] && row['金额'])
        .map(row => {
          let amount = row['金额']
          let originalAmount = amount
          let originalCurrency = 'CNY'

          const match = String(amount).match(/^([^(]+)(?:\(x(\d+)\))?$/)
          if (match) {
            originalAmount = parseFloat(match[1])
          }

          const typeMap = { '收入': 'income', '支出': 'expense' }
          const categoryMap = {}
          categories.forEach(c => { categoryMap[c.name] = c.id })
          const platformMap = {}
          platforms.forEach(p => { platformMap[p.name] = p.id })

          return {
            date: row['日期'],
            type: typeMap[row['类型']] || 'expense',
            category: categoryMap[row['类别']] || 'other',
            platform: platformMap[row['平台']] || 'wechat',
            amount: originalAmount,
            originalAmount,
            originalCurrency,
            remark: row['备注'] || '',
            createdAt: new Date().toISOString()
          }
        })

      if (records.length > 0) {
        await importRecords(records)
        message.success(`成功导入 ${records.length} 条记录`)
      } else {
        message.warning('未能解析到有效记录')
      }
    } catch (err) {
      console.error(err)
      message.error('导入失败')
    }
    setLoading(false)
    return false
  }

  const handleClearData = () => {
    setShowClearConfirm(true)
  }

  const confirmClearData = async () => {
    await clearAllRecords()
    message.success('已清除所有数据')
    setShowClearConfirm(false)
  }

  const exportSettings = async () => {
    const settings = {
      categories,
      platforms,
      exchangeRates,
      exportedAt: new Date().toISOString()
    }
    const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `记账本设置_${new Date().toLocaleDateString().replace(/\//g, '-')}.json`
    a.click()
    URL.revokeObjectURL(url)
    message.success('设置导出成功')
  }

  const importSettings = async (file) => {
    try {
      const text = await file.text()
      const settings = JSON.parse(text)
      if (settings.categories && settings.platforms) {
        localStorage.setItem('bookkeeping_categories', JSON.stringify(settings.categories))
        localStorage.setItem('bookkeeping_platforms', JSON.stringify(settings.platforms))
        localStorage.setItem('bookkeeping_exchange_rates', JSON.stringify(settings.exchangeRates || { CNY: 1, USD: 7.2, HKD: 0.92 }))
        message.success('设置导入成功，请刷新页面')
      } else {
        message.error('设置文件格式无效')
      }
    } catch (err) {
      message.error('设置导入失败')
    }
    return false
  }

  return (
    <div className="import-export-container">
      <div className="import-export-section">
        <h3 className="section-title">数据导入</h3>
        <Dragger
          accept=".xlsx,.xls,.json"
          showUploadList={false}
          beforeUpload={handleImport}
        >
          <div className="dragger-content">
            <p className="dragger-icon">📁</p>
            <p className="dragger-text">点击或拖拽Excel文件到此处导入记录</p>
            <p className="dragger-hint">支持 .xlsx, .xls, .json 格式</p>
          </div>
        </Dragger>
      </div>

      <div className="import-export-section">
        <h3 className="section-title">数据导出</h3>
        <div className="action-buttons">
          <Button type="primary" onClick={handleExportClick} loading={loading}>
            导出Excel
          </Button>
        </div>
      </div>

      <div className="import-export-section">
        <h3 className="section-title">设置导入导出</h3>
        <div className="action-buttons">
          <Button onClick={exportSettings}>导出设置</Button>
          <Upload
            accept=".json"
            showUploadList={false}
            beforeUpload={importSettings}
          >
            <Button>导入设置</Button>
          </Upload>
        </div>
      </div>

      <div className="import-export-section danger-zone">
        <h3 className="section-title">危险操作</h3>
        <Button danger onClick={handleClearData}>
          清除所有数据
        </Button>
      </div>

      <Modal
        open={showClearConfirm}
        title="确认清除所有数据"
        onCancel={() => setShowClearConfirm(false)}
        onOk={confirmClearData}
        okText="确认"
        cancelText="取消"
        okButtonProps={{ danger: true }}
      >
        <p style={{ color: '#ff4d4f' }}>警告：此操作不可逆！</p>
        <p>确定要清除所有记账记录吗？此操作将删除所有数据且无法恢复。</p>
      </Modal>
    </div>
  )
}

export default ImportExportPage

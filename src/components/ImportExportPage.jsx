import React, { useState } from 'react'
import { Upload, Button, message, Modal, Select, Table } from 'antd'
import { getAllRecords, clearAllRecords, importRecords } from '../lib/db'
import * as XLSX from 'xlsx'
import './ImportExportPage.css'

const { Dragger } = Upload

function ImportExportPage({ categories, exchangeRates }) {
  const [loading, setLoading] = useState(false)
  const [showClearConfirm, setShowClearConfirm] = useState(false)

  const handleExportExcel = async (recordList, year) => {
    setLoading(true)
    try {
      const filtered = recordList.filter(r => new Date(r.date).getFullYear() === year)

      const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月']
      const categoryIds = ['food', 'dining', 'clothes', 'transport', 'car', 'entertainment', 'daily', 'education', 'cat', 'medical', 'rent', 'other', 'salary', 'other-income']
      const categoryNames = ['食材', '餐饮', '衣服', '出行', '养车', '休闲', '日用', '教育', '养猫', '医疗', '住房水电', '其他', '工资收入', '其他收入']

      const workbook = XLSX.utils.book_new()

      // 先创建年度汇总数据
      const summaryAoa = []
      const summaryHeaderRow = ['月份', ...categoryNames, '支出合计', '收入合计']
      summaryAoa.push(summaryHeaderRow)

      for (let month = 0; month < 12; month++) {
        const sheetNameForFormula = `'${year}${monthNames[month]}'`
        const daysInMonth = new Date(year, month + 1, 0).getDate()
        const lastRow = daysInMonth + 2  // header + days rows + summary label row (row 33 for 31-day month)

        const summaryMonthRow = [monthNames[month]]
        for (let i = 0; i < categoryIds.length; i++) {
          const colLetter = XLSX.utils.encode_col(i + 1)
          summaryMonthRow.push({ t: 'n', v: 0, f: `SUM(${sheetNameForFormula}!${colLetter}2:${colLetter}${lastRow})` })
        }
        // 支出合计 = SUM(B34:M34) 即食材到其他（不包括工资和其他收入），引用汇总数据行
        summaryMonthRow.push({ t: 'n', v: 0, f: `SUM(${sheetNameForFormula}!B${lastRow + 1}:M${lastRow + 1})` })
        // 收入合计 = SUM(N34:O34) 即工资和其他收入，引用汇总数据行
        summaryMonthRow.push({ t: 'n', v: 0, f: `SUM(${sheetNameForFormula}!N${lastRow + 1}:O${lastRow + 1})` })
        summaryAoa.push(summaryMonthRow)
      }

      // 年度汇总标签行
      const summaryYearLabelRow = ['年度汇总']
      for (let i = 0; i < categoryIds.length; i++) {
        summaryYearLabelRow.push(`${categoryNames[i]}汇总`)
      }
      summaryYearLabelRow.push('支出汇总')
      summaryYearLabelRow.push('收入合计')
      summaryAoa.push(summaryYearLabelRow)

      // 年度汇总数据行
      const summaryYearRow = ['']
      for (let i = 0; i < categoryIds.length; i++) {
        const colLetter = XLSX.utils.encode_col(i + 1)
        summaryYearRow.push({ t: 'n', v: 0, f: `SUM(${colLetter}2:${colLetter}13)` })
      }
      summaryYearRow.push({ t: 'n', v: 0, f: `SUM(P2:P13)` })
      summaryYearRow.push({ t: 'n', v: 0, f: `SUM(Q2:Q13)` })
      summaryAoa.push(summaryYearRow)

      const summarySheet = XLSX.utils.aoa_to_sheet(summaryAoa)
      summarySheet['!cols'] = [
        { wch: 12 },
        ...Array(14).fill({ wch: 10 }),
        { wch: 12 },
        { wch: 12 }
      ]
      XLSX.utils.book_append_sheet(workbook, summarySheet, '年度汇总')

      // 创建月度sheets
      for (let month = 0; month < 12; month++) {
        const monthRecords = filtered.filter(r => new Date(r.date).getMonth() === month)
        const sheetName = `${year}${monthNames[month]}`
        const daysInMonth = new Date(year, month + 1, 0).getDate()
        const aoa = []

        const headerRow = ['日期', ...categoryNames, '支出合计', '收入合计', '支出备注', '收入备注']
        aoa.push(headerRow)

        for (let day = 1; day <= daysInMonth; day++) {
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const dayRecords = monthRecords.filter(r => r.date === dateStr)

          const row = [`${month + 1}月${day}日`]
          let dayExpense = 0
          let dayIncome = 0
          const expenseRemarks = []
          const incomeRemarks = []

          for (const catId of categoryIds) {
            const catRecords = dayRecords.filter(r => r.category === catId)
            if (catRecords.length === 0) {
              row.push('')
            } else if (catRecords.length === 1) {
              row.push({ t: 'n', v: catRecords[0].amount, f: `=${catRecords[0].amount}` })
            } else {
              const amounts = catRecords.map(r => r.amount)
              const displayValue = amounts.join('+')
              row.push({ t: 'n', v: amounts.reduce((sum, v) => sum + v, 0), f: `=${displayValue}` })
            }

            if (catId === 'salary' || catId === 'other-income') {
              dayIncome += catRecords.reduce((sum, r) => sum + r.amount, 0)
            } else {
              dayExpense += catRecords.reduce((sum, r) => sum + r.amount, 0)
            }

            catRecords.forEach(r => {
              if (r.remark) {
                if (catId === 'salary' || catId === 'other-income') {
                  incomeRemarks.push(r.remark)
                } else {
                  expenseRemarks.push(r.remark)
                }
              }
            })
          }

          const rowNum = day + 1
          row.push({ t: 'n', v: dayExpense > 0 ? dayExpense : 0, f: `SUM(B${rowNum}:M${rowNum})` })
          row.push({ t: 'n', v: dayIncome > 0 ? dayIncome : 0, f: `SUM(N${rowNum}:O${rowNum})` })
          row.push(expenseRemarks.length > 0 ? expenseRemarks.join('+') : '')
          row.push(incomeRemarks.length > 0 ? incomeRemarks.join('+') : '')

          aoa.push(row)
        }

        const lastRow = daysInMonth + 1
        const summaryLabelRow = ['本月汇总']
        const summaryValueRow = ['']
        for (let i = 0; i < categoryIds.length; i++) {
          const catName = categoryNames[i]
          const colLetter = XLSX.utils.encode_col(i + 1)
          summaryLabelRow.push(`${catName}汇总`)
          summaryValueRow.push({ t: 'n', v: 0, f: `SUM(${colLetter}2:${colLetter}${lastRow})` })
        }
        summaryLabelRow.push('支出汇总')
        summaryLabelRow.push('收入汇总')
        summaryLabelRow.push('')
        summaryLabelRow.push('')
        summaryValueRow.push({ t: 'n', v: 0, f: `SUM(B2:M${lastRow})` })
        summaryValueRow.push({ t: 'n', v: 0, f: `SUM(N2:O${lastRow})` })
        summaryValueRow.push('')
        summaryValueRow.push('')
        aoa.push(summaryLabelRow)
        aoa.push(summaryValueRow)

        const worksheet = XLSX.utils.aoa_to_sheet(aoa)
        worksheet['!cols'] = [
          { wch: 12 },
          ...Array(14).fill({ wch: 10 }),
          { wch: 12 },
          { wch: 12 },
          { wch: 20 },
          { wch: 20 }
        ]
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)
      }

      // 创建原始数据sheet
      const rawDataAoa = []
      const rawDataHeaderRow = ['日期', '类型', '类别', '金额', '原始金额', '货币', '备注']
      rawDataAoa.push(rawDataHeaderRow)
      filtered.forEach(record => {
        const cat = categories.find(c => c.id === record.category)
        rawDataAoa.push([
          record.date,
          record.type === 'income' ? '收入' : '支出',
          cat ? cat.name : record.category,
          record.amount,
          record.originalAmount,
          record.originalCurrency,
          record.remark || ''
        ])
      })
      const rawDataSheet = XLSX.utils.aoa_to_sheet(rawDataAoa)
      rawDataSheet['!cols'] = [
        { wch: 12 },
        { wch: 8 },
        { wch: 12 },
        { wch: 12 },
        { wch: 12 },
        { wch: 8 },
        { wch: 20 }
      ]
      XLSX.utils.book_append_sheet(workbook, rawDataSheet, '原始数据')

      XLSX.writeFile(workbook, `记账本导出_${year}_${new Date().toLocaleDateString().replace(/\//g, '-')}.xlsx`)
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
        onOk: () => {
          const sortedYears = years.sort((a, b) => b - a)
          handleExportExcel(allRecords, sortedYears[0])
        },
      })
    } else {
      handleExportExcel(allRecords, years[0])
    }
  }

  const handleImport = async (file) => {
    setLoading(true)
    try {
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data, { cellFormula: true, cellText: true })

      const categoryIds = ['food', 'dining', 'clothes', 'transport', 'car', 'entertainment', 'daily', 'education', 'cat', 'medical', 'rent', 'other', 'salary', 'other-income']
      const categoryNamesInExcel = ['食材', '餐饮', '衣服', '出行', '养车', '休闲', '日用', '教育', '养猫', '医疗', '住房水电', '其他', '工资收入', '其他收入']

      const allRecords = []
      const recordKeys = new Set() // 用于去重 date|amount|category

      const addRecordIfNotDuplicate = (record) => {
        const key = `${record.date}|${record.amount}|${record.category}|${record.originalCurrency || 'CNY'}`
        if (!recordKeys.has(key)) {
          recordKeys.add(key)
          allRecords.push(record)
        }
      }

      // 优先从原始数据sheet导入（包含完整的备注信息）
      if (workbook.SheetNames.includes('原始数据')) {
        const rawSheet = workbook.Sheets['原始数据']
        if (rawSheet['!ref']) {
          const rawData = XLSX.utils.sheet_to_json(rawSheet, { header: 1 })
          const headers = rawData[0]
          // 找到各列的索引
          const dateIdx = headers.indexOf('日期')
          const typeIdx = headers.indexOf('类型')
          const categoryIdx = headers.indexOf('类别')
          const amountIdx = headers.indexOf('金额')
          const originalAmountIdx = headers.indexOf('原始金额')
          const currencyIdx = headers.indexOf('货币')
          const remarkIdx = headers.indexOf('备注')

          for (let i = 1; i < rawData.length; i++) {
            const row = rawData[i]
            if (!row[dateIdx] || !row[amountIdx]) continue

            // 根据类别名称找到对应的category id
            const catName = row[categoryIdx]
            const catId = categoryIds.find(id => {
              const idx = categoryIds.indexOf(id)
              return categoryNamesInExcel[idx] === catName
            })

            addRecordIfNotDuplicate({
              date: String(row[dateIdx]).trim(),
              type: row[typeIdx] === '收入' ? 'income' : 'expense',
              category: catId || 'other',
              amount: parseFloat(row[amountIdx]) || 0,
              originalAmount: parseFloat(row[originalAmountIdx]) || parseFloat(row[amountIdx]) || 0,
              originalCurrency: row[currencyIdx] || 'CNY',
              remark: row[remarkIdx] || '',
              createdAt: new Date().toISOString()
            })
          }
        }
      }

      // 同时从月度sheets解析，以防直接修改了月度sheet而原始数据sheet未同步
      workbook.SheetNames.forEach(sheetName => {
        const sheet = workbook.Sheets[sheetName]
        if (!sheet['!ref']) return
        if (sheetName === '原始数据' || sheetName === '年度汇总') return

        const year = parseInt(sheetName.substring(0, 4))
        const monthPart = sheetName.substring(4)
        const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月']
        const monthIndex = monthNames.indexOf(monthPart)
        if (monthIndex === -1) return

        const range = XLSX.utils.decode_range(sheet['!ref'])
        const lastRow = range.e.r

        for (let rowNum = 1; rowNum <= lastRow; rowNum++) {
          const dateCellRef = XLSX.utils.encode_cell({ r: rowNum, c: 0 })
          const dateCell = sheet[dateCellRef]
          if (!dateCell || !dateCell.v) continue

          const dateStr = String(dateCell.v)
          const dayMatch = dateStr.match(/^(\d+)月(\d+)日$/)
          if (!dayMatch) continue

          const day = parseInt(dayMatch[2])
          const fullDate = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`

          for (let colNum = 0; colNum < categoryIds.length; colNum++) {
            const cellRef = XLSX.utils.encode_cell({ r: rowNum, c: colNum + 1 })
            const cell = sheet[cellRef]
            if (!cell) continue

            const catId = categoryIds[colNum]
            const isIncome = catId === 'salary' || catId === 'other-income'

            if (cell.f) {
              const formula = cell.f
              const parts = formula.split('+')
              parts.forEach(part => {
                const num = parseFloat(part.trim())
                if (!isNaN(num) && num !== 0) {
                  addRecordIfNotDuplicate({
                    date: fullDate,
                    type: isIncome ? 'income' : 'expense',
                    category: catId,
                    amount: num,
                    originalAmount: num,
                    originalCurrency: 'CNY',
                    remark: '',
                    createdAt: new Date().toISOString()
                  })
                }
              })
            } else if (typeof cell.v === 'number' && cell.v !== 0) {
              addRecordIfNotDuplicate({
                date: fullDate,
                type: isIncome ? 'income' : 'expense',
                category: catId,
                amount: cell.v,
                originalAmount: cell.v,
                originalCurrency: 'CNY',
                remark: '',
                createdAt: new Date().toISOString()
              })
            } else if (typeof cell.v === 'string' && cell.v.trim() !== '') {
              const parsed = parseFloat(cell.v)
              if (!isNaN(parsed) && parsed !== 0) {
                addRecordIfNotDuplicate({
                  date: fullDate,
                  type: isIncome ? 'income' : 'expense',
                  category: catId,
                  amount: parsed,
                  originalAmount: parsed,
                  originalCurrency: 'CNY',
                  remark: '',
                  createdAt: new Date().toISOString()
                })
              }
            }
          }
        }
      })

      if (allRecords.length > 0) {
        await importRecords(allRecords)
        message.success(`成功导入 ${allRecords.length} 条记录`)
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
      if (settings.categories) {
        localStorage.setItem('bookkeeping_categories', JSON.stringify(settings.categories))
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

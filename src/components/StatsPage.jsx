import React, { useState, useEffect } from 'react'
import * as echarts from 'echarts'
import ReactECharts from 'echarts-for-react'
import { getAllRecords } from '../lib/db'
import { Select } from 'antd'

function StatsPage({ categories }) {
  const [records, setRecords] = useState([])
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(1)

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (years.length > 0 && !years.includes(selectedYear)) {
      setSelectedYear(years[0])
    }
  }, [years, selectedYear])

  const loadData = async () => {
    const all = await getAllRecords()
    setRecords(all)
  }

  const years = [...new Set(records.map(r => new Date(r.date).getFullYear()))]

  const yearRecords = records.filter(r => new Date(r.date).getFullYear() === selectedYear)

  const getMonthlyData = () => {
    const monthlyData = {}
    for (let i = 1; i <= 12; i++) {
      monthlyData[i] = { income: 0, expense: 0 }
    }
    yearRecords.forEach(r => {
      const month = new Date(r.date).getMonth() + 1
      if (r.type === 'income') {
        monthlyData[month].income += r.amount
      } else {
        monthlyData[month].expense += r.amount
      }
    })
    return monthlyData
  }

  const getCategoryData = () => {
    const catData = {}
    categories.filter(c => c.type === 'expense').forEach(c => {
      catData[c.id] = { name: c.name, icon: c.icon, color: c.color, total: 0 }
    })
    yearRecords.filter(r => r.type === 'expense').forEach(r => {
      if (catData[r.category]) {
        catData[r.category].total += r.amount
      }
    })
    return Object.values(catData).filter(c => c.total > 0)
  }

  const getMonthCategoryData = () => {
    const catData = {}
    categories.filter(c => c.type === 'expense').forEach(c => {
      catData[c.id] = { name: c.name, icon: c.icon, color: c.color, total: 0 }
    })
    yearRecords
      .filter(r => r.type === 'expense' && new Date(r.date).getMonth() + 1 === selectedMonth)
      .forEach(r => {
        if (catData[r.category]) {
          catData[r.category].total += r.amount
        }
      })
    return Object.values(catData).filter(c => c.total > 0)
  }

  const getPrevYearMonthlyData = () => {
    const prevYearRecords = records.filter(r => new Date(r.date).getFullYear() === selectedYear - 1)
    const monthlyData = {}
    for (let i = 1; i <= 12; i++) {
      monthlyData[i] = { income: 0, expense: 0 }
    }
    prevYearRecords.forEach(r => {
      const month = new Date(r.date).getMonth() + 1
      if (r.type === 'income') {
        monthlyData[month].income += r.amount
      } else {
        monthlyData[month].expense += r.amount
      }
    })
    return monthlyData
  }

  const getPrevMonthData = () => {
    if (selectedMonth === 1) return null
    const monthRecords = yearRecords.filter(r => new Date(r.date).getMonth() + 1 === selectedMonth - 1)
    let income = 0, expense = 0
    monthRecords.forEach(r => {
      if (r.type === 'income') income += r.amount
      else expense += r.amount
    })
    return { income, expense, balance: income - expense }
  }

  const getSelectedMonthData = () => {
    const monthRecords = yearRecords.filter(r => new Date(r.date).getMonth() + 1 === selectedMonth)
    let income = 0, expense = 0
    monthRecords.forEach(r => {
      if (r.type === 'income') income += r.amount
      else expense += r.amount
    })
    return { income, expense, balance: income - expense }
  }

  const prevYearMonthlyData = years.includes(selectedYear - 1) ? getPrevYearMonthlyData() : null
  const selectedMonthData = getSelectedMonthData()
  const prevMonthData = getPrevMonthData()

  const getYearlyStats = () => {
    let income = 0
    let expense = 0
    yearRecords.forEach(r => {
      if (r.type === 'income') income += r.amount
      else expense += r.amount
    })
    return { income, expense, balance: income - expense }
  }

  const monthlyData = getMonthlyData()
  const categoryData = getCategoryData()
  const monthCategoryData = getMonthCategoryData()
  const yearlyStats = getYearlyStats()

  const monthlyChartOption = {
    title: { text: `${selectedYear}年月度统计`, left: 'center', textStyle: { fontSize: 16 } },
    tooltip: { trigger: 'axis' },
    legend: { data: ['收入', '支出'], top: 30 },
    grid: { left: '10%', right: '10%', bottom: '15%', top: '25%' },
    xAxis: {
      type: 'category',
      data: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']
    },
    yAxis: { type: 'value' },
    series: [
      {
        name: '收入',
        type: 'bar',
        data: Object.values(monthlyData).map(m => m.income.toFixed(2)),
        itemStyle: { color: '#52c41a' }
      },
      {
        name: '支出',
        type: 'bar',
        data: Object.values(monthlyData).map(m => m.expense.toFixed(2)),
        itemStyle: { color: '#ff4d4f' }
      }
    ]
  }

  const monthPieChartOption = {
    title: { text: `${selectedYear}年${selectedMonth}月支出构成`, left: 'center', textStyle: { fontSize: 16 } },
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    legend: { orient: 'vertical', right: '5%', top: '30%' },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      center: ['35%', '50%'],
      data: monthCategoryData.map(c => ({
        name: `${c.icon} ${c.name}`,
        value: c.total.toFixed(2),
        itemStyle: { color: c.color }
      }))
    }]
  }

  const trendChartOption = {
    title: { text: `${selectedYear}年收支趋势`, left: 'center', textStyle: { fontSize: 16 } },
    tooltip: {
      trigger: 'axis',
      formatter: function(params) {
        let result = params[0].name + '<br/>'
        params.forEach(p => {
          if (p.seriesName === '结余') {
            result += p.seriesName + ': ' + (p.value >= 0 ? '+' : '') + p.value + '<br/>'
          } else {
            result += p.seriesName + ': ' + p.value + '<br/>'
          }
        })
        return result
      }
    },
    legend: { data: ['收入', '支出', '结余'], top: 30 },
    grid: { left: '10%', right: '10%', bottom: '15%', top: '25%' },
    xAxis: {
      type: 'category',
      data: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']
    },
    yAxis: { type: 'value' },
    series: [
      {
        name: '收入',
        type: 'line',
        data: Object.values(monthlyData).map(m => m.income.toFixed(2)),
        itemStyle: { color: '#52c41a' },
        smooth: true
      },
      {
        name: '支出',
        type: 'line',
        data: Object.values(monthlyData).map(m => (-m.expense).toFixed(2)),
        itemStyle: { color: '#ff4d4f' },
        smooth: true
      },
      {
        name: '结余',
        type: 'line',
        data: Object.values(monthlyData).map(m => (m.income - m.expense).toFixed(2)),
        itemStyle: { color: '#1677FF' },
        smooth: true
      }
    ]
  }

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '16px' }}>
      <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>统计页面</h2>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <Select
            value={selectedYear}
            onChange={setSelectedYear}
            style={{ width: 100 }}
            options={years.sort().reverse().map(y => ({ value: y, label: y + '年' }))}
          />
        </div>
      </div>

      {yearRecords.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#999', padding: '60px 0', background: '#fff', borderRadius: '8px' }}>
          暂无数据
        </div>
      ) : (
        <>
          <div style={{ background: '#fff', borderRadius: '8px', padding: '20px', marginBottom: '16px' }}>
            <h3 style={{ marginBottom: '16px' }}>{selectedYear}年年度统计</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
              <div style={{ textAlign: 'center', padding: '16px', background: '#f6ffed', borderRadius: '8px', border: '1px solid #b7eb8f' }}>
                <div style={{ color: '#52c41a', fontSize: '14px', marginBottom: '8px' }}>年度收入</div>
                <div style={{ fontSize: '24px', fontWeight: 600, color: '#52c41a' }}>{yearlyStats.income.toFixed(2)}</div>
              </div>
              <div style={{ textAlign: 'center', padding: '16px', background: '#fff2f0', borderRadius: '8px', border: '1px solid #ffccc7' }}>
                <div style={{ color: '#ff4d4f', fontSize: '14px', marginBottom: '8px' }}>年度支出</div>
                <div style={{ fontSize: '24px', fontWeight: 600, color: '#ff4d4f' }}>{yearlyStats.expense.toFixed(2)}</div>
              </div>
              <div style={{ textAlign: 'center', padding: '16px', background: '#f0f5ff', borderRadius: '8px', border: '1px solid #adc6ff' }}>
                <div style={{ color: '#1677FF', fontSize: '14px', marginBottom: '8px' }}>年度结余</div>
                <div style={{ fontSize: '24px', fontWeight: 600, color: '#1677FF' }}>{yearlyStats.balance.toFixed(2)}</div>
              </div>
            </div>

            <h4 style={{ marginTop: '24px', marginBottom: '12px' }}>支出类别明细（全年）</h4>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#fafafa' }}>
                  <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #f0f0f0' }}>类别</th>
                  <th style={{ padding: '10px', textAlign: 'right', borderBottom: '1px solid #f0f0f0' }}>金额</th>
                  <th style={{ padding: '10px', textAlign: 'right', borderBottom: '1px solid #f0f0f0' }}>占比</th>
                </tr>
              </thead>
              <tbody>
                {categoryData.sort((a, b) => b.total - a.total).map(c => (
                  <tr key={c.id}>
                    <td style={{ padding: '10px', borderBottom: '1px solid #f0f0f0' }}>
                      <span style={{ marginRight: '8px' }}>{c.icon}</span>
                      {c.name}
                    </td>
                    <td style={{ padding: '10px', textAlign: 'right', borderBottom: '1px solid #f0f0f0' }}>{c.total.toFixed(2)}</td>
                    <td style={{ padding: '10px', textAlign: 'right', borderBottom: '1px solid #f0f0f0' }}>{(c.total / yearlyStats.expense * 100).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ background: '#fff', borderRadius: '8px', padding: '20px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0 }}>月度支出趋势曲线</h3>
            </div>
            <ReactECharts option={trendChartOption} style={{ height: '300px' }} />
          </div>

          <div style={{ background: '#fff', borderRadius: '8px', padding: '20px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0 }}>月度支出饼图</h3>
              <Select
                value={selectedMonth}
                onChange={setSelectedMonth}
                style={{ width: 120 }}
                options={[
                  { value: 1, label: '一月' },
                  { value: 2, label: '二月' },
                  { value: 3, label: '三月' },
                  { value: 4, label: '四月' },
                  { value: 5, label: '五月' },
                  { value: 6, label: '六月' },
                  { value: 7, label: '七月' },
                  { value: 8, label: '八月' },
                  { value: 9, label: '九月' },
                  { value: 10, label: '十月' },
                  { value: 11, label: '十一月' },
                  { value: 12, label: '十二月' }
                ]}
              />
            </div>
            <ReactECharts option={monthPieChartOption} style={{ height: '300px' }} />
          </div>

          <div style={{ background: '#fff', borderRadius: '8px', padding: '20px', marginBottom: '16px' }}>
            <ReactECharts option={monthlyChartOption} style={{ height: '300px' }} />
          </div>

          <div style={{ background: '#fff', borderRadius: '8px', padding: '20px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0 }}>月度同比环比</h3>
              <Select
                value={selectedMonth}
                onChange={setSelectedMonth}
                style={{ width: 120 }}
                options={[
                  { value: 1, label: '一月' },
                  { value: 2, label: '二月' },
                  { value: 3, label: '三月' },
                  { value: 4, label: '四月' },
                  { value: 5, label: '五月' },
                  { value: 6, label: '六月' },
                  { value: 7, label: '七月' },
                  { value: 8, label: '八月' },
                  { value: 9, label: '九月' },
                  { value: 10, label: '十月' },
                  { value: 11, label: '十一月' },
                  { value: 12, label: '十二月' }
                ]}
              />
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#fafafa' }}>
                  <th style={{ padding: '10px', textAlign: 'center', borderBottom: '1px solid #f0f0f0' }}>指标</th>
                  <th style={{ padding: '10px', textAlign: 'right', borderBottom: '1px solid #f0f0f0' }}>{selectedMonth}月</th>
                  {prevMonthData && <th style={{ padding: '10px', textAlign: 'right', borderBottom: '1px solid #f0f0f0' }}>上月</th>}
                  {prevYearMonthlyData && <th style={{ padding: '10px', textAlign: 'right', borderBottom: '1px solid #f0f0f0' }}>去年{selectedMonth}月</th>}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ padding: '10px', borderBottom: '1px solid #f0f0f0', textAlign: 'center' }}>收入</td>
                  <td style={{ padding: '10px', borderBottom: '1px solid #f0f0f0', textAlign: 'right', color: '#52c41a' }}>{selectedMonthData.income.toFixed(2)}</td>
                  {prevMonthData && <td style={{ padding: '10px', borderBottom: '1px solid #f0f0f0', textAlign: 'right' }}>{prevMonthData.income.toFixed(2)}</td>}
                  {prevYearMonthlyData && <td style={{ padding: '10px', borderBottom: '1px solid #f0f0f0', textAlign: 'right' }}>{prevYearMonthlyData[selectedMonth].income.toFixed(2)}</td>}
                </tr>
                <tr>
                  <td style={{ padding: '10px', borderBottom: '1px solid #f0f0f0', textAlign: 'center' }}>支出</td>
                  <td style={{ padding: '10px', borderBottom: '1px solid #f0f0f0', textAlign: 'right', color: '#ff4d4f' }}>{selectedMonthData.expense.toFixed(2)}</td>
                  {prevMonthData && <td style={{ padding: '10px', borderBottom: '1px solid #f0f0f0', textAlign: 'right' }}>{prevMonthData.expense.toFixed(2)}</td>}
                  {prevYearMonthlyData && <td style={{ padding: '10px', borderBottom: '1px solid #f0f0f0', textAlign: 'right' }}>{prevYearMonthlyData[selectedMonth].expense.toFixed(2)}</td>}
                </tr>
                <tr>
                  <td style={{ padding: '10px', borderBottom: '1px solid #f0f0f0', textAlign: 'center' }}>结余</td>
                  <td style={{ padding: '10px', borderBottom: '1px solid #f0f0f0', textAlign: 'right', color: selectedMonthData.balance >= 0 ? '#52c41a' : '#ff4d4f' }}>{selectedMonthData.balance.toFixed(2)}</td>
                  {prevMonthData && <td style={{ padding: '10px', borderBottom: '1px solid #f0f0f0', textAlign: 'right', color: prevMonthData.balance >= 0 ? '#52c41a' : '#ff4d4f' }}>{prevMonthData.balance.toFixed(2)}</td>}
                  {prevYearMonthlyData && <td style={{ padding: '10px', borderBottom: '1px solid #f0f0f0', textAlign: 'right', color: (prevYearMonthlyData[selectedMonth].income - prevYearMonthlyData[selectedMonth].expense) >= 0 ? '#52c41a' : '#ff4d4f' }}>{(prevYearMonthlyData[selectedMonth].income - prevYearMonthlyData[selectedMonth].expense).toFixed(2)}</td>}
                </tr>
              </tbody>
            </table>
            {(prevMonthData || prevYearMonthlyData) && (
              <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '16px' }}>
                <thead>
                  <tr style={{ background: '#fafafa' }}>
                    <th style={{ padding: '10px', textAlign: 'center', borderBottom: '1px solid #f0f0f0' }}>变化率</th>
                    <th style={{ padding: '10px', textAlign: 'right', borderBottom: '1px solid #f0f0f0' }}>环比（较上月）</th>
                    <th style={{ padding: '10px', textAlign: 'right', borderBottom: '1px solid #f0f0f0' }}>同比（较去年）</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ padding: '10px', borderBottom: '1px solid #f0f0f0', textAlign: 'center' }}>收入</td>
                    <td style={{ padding: '10px', borderBottom: '1px solid #f0f0f0', textAlign: 'right' }}>
                      {prevMonthData ? (
                        <span style={{ color: selectedMonthData.income >= prevMonthData.income ? '#52c41a' : '#ff4d4f' }}>
                          {prevMonthData.income > 0 ? ((selectedMonthData.income - prevMonthData.income) / prevMonthData.income * 100).toFixed(1) + '%' : '-'}
                        </span>
                      ) : '-'}
                    </td>
                    <td style={{ padding: '10px', borderBottom: '1px solid #f0f0f0', textAlign: 'right' }}>
                      {prevYearMonthlyData ? (
                        <span style={{ color: selectedMonthData.income >= prevYearMonthlyData[selectedMonth].income ? '#52c41a' : '#ff4d4f' }}>
                          {prevYearMonthlyData[selectedMonth].income > 0 ? ((selectedMonthData.income - prevYearMonthlyData[selectedMonth].income) / prevYearMonthlyData[selectedMonth].income * 100).toFixed(1) + '%' : '-'}
                        </span>
                      ) : '-'}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: '10px', borderBottom: '1px solid #f0f0f0', textAlign: 'center' }}>支出</td>
                    <td style={{ padding: '10px', borderBottom: '1px solid #f0f0f0', textAlign: 'right' }}>
                      {prevMonthData ? (
                        <span style={{ color: selectedMonthData.expense <= prevMonthData.expense ? '#52c41a' : '#ff4d4f' }}>
                          {prevMonthData.expense > 0 ? ((selectedMonthData.expense - prevMonthData.expense) / prevMonthData.expense * 100).toFixed(1) + '%' : '-'}
                        </span>
                      ) : '-'}
                    </td>
                    <td style={{ padding: '10px', borderBottom: '1px solid #f0f0f0', textAlign: 'right' }}>
                      {prevYearMonthlyData ? (
<span style={{ color: selectedMonthData.expense <= prevYearMonthlyData[selectedMonth].expense ? '#52c41a' : '#ff4d4f' }}>
                          {prevYearMonthlyData[selectedMonth].expense > 0 ? ((selectedMonthData.expense - prevYearMonthlyData[selectedMonth].expense) / prevYearMonthlyData[selectedMonth].expense * 100).toFixed(1) + '%' : '-'}
                        </span>
                      ) : '-'}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: '10px', borderBottom: '1px solid #f0f0f0', textAlign: 'center' }}>结余</td>
                    <td style={{ padding: '10px', borderBottom: '1px solid #f0f0f0', textAlign: 'right' }}>
                      {prevMonthData ? (
                        <span style={{ color: selectedMonthData.balance >= prevMonthData.balance ? '#52c41a' : '#ff4d4f' }}>
                          {prevMonthData.balance > 0 ? ((selectedMonthData.balance - prevMonthData.balance) / prevMonthData.balance * 100).toFixed(1) + '%' : '-'}
                        </span>
                      ) : '-'}
                    </td>
                    <td style={{ padding: '10px', borderBottom: '1px solid #f0f0f0', textAlign: 'right' }}>
                      {prevYearMonthlyData ? (
                        <span style={{ color: selectedMonthData.balance >= (prevYearMonthlyData[selectedMonth].income - prevYearMonthlyData[selectedMonth].expense) ? '#52c41a' : '#ff4d4f' }}>
                          {(prevYearMonthlyData[selectedMonth].income - prevYearMonthlyData[selectedMonth].expense) > 0 ? ((selectedMonthData.balance - (prevYearMonthlyData[selectedMonth].income - prevYearMonthlyData[selectedMonth].expense)) / (prevYearMonthlyData[selectedMonth].income - prevYearMonthlyData[selectedMonth].expense) * 100).toFixed(1) + '%' : '-'}
                        </span>
                      ) : '-'}
                    </td>
                  </tr>
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default StatsPage
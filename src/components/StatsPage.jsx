import React, { useState, useEffect } from 'react'
import * as echarts from 'echarts'
import ReactECharts from 'echarts-for-react'
import { getAllRecords } from '../lib/db'

function StatsPage({ categories }) {
  const [records, setRecords] = useState([])
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    const all = await getAllRecords()
    setRecords(all)
  }

  const years = [...new Set(records.map(r => new Date(r.date).getFullYear()))]
  if (years.length > 0 && !years.includes(selectedYear)) {
    setSelectedYear(years[0])
  }

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

  const categoryChartOption = {
    title: { text: `${selectedYear}年支出构成`, left: 'center', textStyle: { fontSize: 16 } },
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    legend: { orient: 'vertical', right: '5%', top: '30%' },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      center: ['35%', '50%'],
      data: categoryData.map(c => ({
        name: `${c.icon} ${c.name}`,
        value: c.total.toFixed(2),
        itemStyle: { color: c.color }
      }))
    }]
  }

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '16px' }}>
      <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>统计页面</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          {years.sort().reverse().map(y => (
            <button
              key={y}
              onClick={() => setSelectedYear(y)}
              style={{
                padding: '6px 16px',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                background: y === selectedYear ? '#1677FF' : '#f5f5f5',
                color: y === selectedYear ? '#fff' : '#333'
              }}
            >
              {y}年
            </button>
          ))}
        </div>
      </div>

      {yearRecords.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#999', padding: '60px 0', background: '#fff', borderRadius: '8px' }}>
          暂无数据
        </div>
      ) : (
        <>
          <div style={{ background: '#fff', borderRadius: '8px', padding: '20px', marginBottom: '16px' }}>
            <ReactECharts option={monthlyChartOption} style={{ height: '300px' }} />
          </div>

          <div style={{ background: '#fff', borderRadius: '8px', padding: '20px', marginBottom: '16px' }}>
            <ReactECharts option={categoryChartOption} style={{ height: '300px' }} />
          </div>

          <div style={{ background: '#fff', borderRadius: '8px', padding: '20px' }}>
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

            <h4 style={{ marginTop: '24px', marginBottom: '12px' }}>支出类别明细</h4>
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
        </>
      )}
    </div>
  )
}

export default StatsPage

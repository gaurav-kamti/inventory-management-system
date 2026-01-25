import React, { useState, useEffect } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    LineChart, Line, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import api from '../utils/api';
import './Analytics.css';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

const Analytics = () => {
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('all');
    const [data, setData] = useState({
        stockData: [],
        salesTrend: [],
        paymentStatus: [],
        purchaseVsSales: []
    });

    const tabs = [
        { id: 'all', label: 'All Overview' },
        { id: 'stock', label: 'Top 10 Stock Levels' },
        { id: 'sales', label: 'Recent Sales Trend' },
        { id: 'collections', label: 'Collection Status' },
        { id: 'procurement', label: 'Revenue vs Procurement' }
    ];

    useEffect(() => {
        fetchAnalyticsData();
    }, []);

    const fetchAnalyticsData = async () => {
        try {
            setLoading(true);
            const [productsRes, salesRes, purchasesRes] = await Promise.all([
                api.get('/products'),
                api.get('/sales'),
                api.get('/purchases')
            ]);

            // 1. Stock Data (Top 10 products by stock)
            const stockData = productsRes.data
                .sort((a, b) => b.stock - a.stock)
                .slice(0, 10)
                .map(p => ({
                    name: (p.name || '').length > 15 ? (p.name || '').substring(0, 12) + '...' : (p.name || 'Unknown'),
                    stock: p.stock
                }));

            // 2. Sales Trend (Last 10 entries)
            const salesByDate = {};
            salesRes.data.forEach(sale => {
                const date = new Date(sale.createdAt).toLocaleDateString();
                salesByDate[date] = (salesByDate[date] || 0) + parseFloat(sale.total);
            });
            const salesTrend = Object.keys(salesByDate).map(date => ({
                date,
                amount: salesByDate[date]
            })).slice(-10);

            // 3. Payment Status
            let totalPaid = 0;
            let totalDue = 0;
            salesRes.data.forEach(sale => {
                totalPaid += parseFloat(sale.amountPaid || 0);
                totalDue += parseFloat(sale.amountDue || 0);
            });
            const paymentStatus = [
                { name: 'Collected', value: totalPaid },
                { name: 'Outstanding', value: totalDue }
            ];

            // 4. Purchase vs Sales
            const comparison = {};
            salesRes.data.forEach(sale => {
                const date = new Date(sale.createdAt).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
                if (!comparison[date]) comparison[date] = { date, sales: 0, purchases: 0 };
                comparison[date].sales += parseFloat(sale.total);
            });
            purchasesRes.data.forEach(purchase => {
                const date = new Date(purchase.receivedDate).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
                if (!comparison[date]) comparison[date] = { date, sales: 0, purchases: 0 };
                comparison[date].purchases += parseFloat(purchase.totalCost);
            });
            const purchaseVsSales = Object.values(comparison).sort((a, b) => new Date(a.date) - new Date(b.date)).slice(-6);

            // 5. Check if it's all zeros/empty and provide demo data if needed
            const isDataEmpty = stockData.length === 0 && salesTrend.length === 0 && totalPaid === 0;

            if (isDataEmpty) {
                console.log('Using demo data for analytics');
                setData({
                    stockData: [
                        { name: 'iPhone 15', stock: 45 },
                        { name: 'MacBook Pro', stock: 32 },
                        { name: 'AirPods', stock: 78 },
                        { name: 'iPad Air', stock: 24 },
                        { name: 'Apple Watch', stock: 56 }
                    ],
                    salesTrend: [
                        { date: '01/20', amount: 1200 },
                        { date: '01/21', amount: 1900 },
                        { date: '01/22', amount: 1500 },
                        { date: '01/23', amount: 2800 },
                        { date: '01/24', amount: 2200 }
                    ],
                    paymentStatus: [
                        { name: 'Collected', value: 8500 },
                        { name: 'Outstanding', value: 1500 }
                    ],
                    purchaseVsSales: [
                        { date: 'Jan 25', sales: 15000, purchases: 11000 },
                        { date: 'Feb 25', sales: 18000, purchases: 12000 },
                        { date: 'Mar 25', sales: 16000, purchases: 14000 }
                    ],
                    isDemo: true
                });
            } else {
                setData({ stockData, salesTrend, paymentStatus, purchaseVsSales, isDemo: false });
            }
            setLoading(false);
        } catch (error) {
            console.error('Error fetching analytics data:', error);
            setLoading(false);
        }
    };


    if (loading) return <div className="loading">Gathering insights...</div>;

    return (
        <div className="analytics-container" style={{ padding: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '10px' }}>
                <h1 className="page-title" style={{ margin: 0 }}>Business Analytics</h1>
                {data.isDemo && (
                    <span className="badge badge-warning" style={{ fontSize: '0.7rem' }}>Demo Preview</span>
                )}
            </div>
            <div className="analytics-tabs glass" style={{ marginTop: '10px' }}>

                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className={`charts-grid ${activeTab !== 'all' ? 'single-chart' : ''}`}>
                {/* Stock Levels Bar Chart */}
                {(activeTab === 'all' || activeTab === 'stock') && (
                    <div className="chart-card glass">
                        <h3>Top 10 Stock Levels</h3>
                        <div className="chart-wrapper">
                            <ResponsiveContainer width="100%" height={activeTab === 'all' ? 300 : 500}>
                                <BarChart data={data.stockData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                                    <XAxis dataKey="name" stroke="#ccc" tick={{ fontSize: 10 }} />
                                    <YAxis stroke="#ccc" />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                                        itemStyle={{ color: '#86efac' }}
                                    />
                                    <Bar dataKey="stock" fill="#6366f1" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}

                {/* Sales Trend Line Chart */}
                {(activeTab === 'all' || activeTab === 'sales') && (
                    <div className="chart-card glass">
                        <h3>Recent Sales Trend</h3>
                        <div className="chart-wrapper">
                            <ResponsiveContainer width="100%" height={activeTab === 'all' ? 300 : 500}>
                                <LineChart data={data.salesTrend}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                                    <XAxis dataKey="date" stroke="#ccc" tick={{ fontSize: 10 }} />
                                    <YAxis stroke="#ccc" />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                                        itemStyle={{ color: '#6366f1' }}
                                    />
                                    <Line type="monotone" dataKey="amount" stroke="#6366f1" strokeWidth={3} dot={{ r: 4 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}

                {/* Payment Status Pie Chart */}
                {(activeTab === 'all' || activeTab === 'collections') && (
                    <div className="chart-card glass">
                        <h3>Collection Status</h3>
                        <div className="chart-wrapper">
                            <ResponsiveContainer width="100%" height={activeTab === 'all' ? 300 : 500}>
                                <PieChart>
                                    <Pie
                                        data={data.paymentStatus}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={activeTab === 'all' ? 60 : 100}
                                        outerRadius={activeTab === 'all' ? 80 : 140}
                                        paddingAngle={5}
                                        dataKey="value"
                                        label={activeTab !== 'all'}
                                    >
                                        {data.paymentStatus.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={index === 0 ? '#10b981' : '#f43f5e'} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                                    />
                                    <Legend verticalAlign="bottom" height={36} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}

                {/* Purchase vs Sales Area Chart */}
                {(activeTab === 'all' || activeTab === 'procurement') && (
                    <div className="chart-card glass">
                        <h3>Revenue vs Procurement</h3>
                        <div className="chart-wrapper">
                            <ResponsiveContainer width="100%" height={activeTab === 'all' ? 300 : 500}>
                                <AreaChart data={data.purchaseVsSales}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                                    <XAxis dataKey="date" stroke="#ccc" />
                                    <YAxis stroke="#ccc" />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                                    />
                                    <Legend />
                                    <Area type="monotone" dataKey="sales" stackId="1" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                                    <Area type="monotone" dataKey="purchases" stackId="1" stroke="#82ca9d" fill="#82ca9d" fillOpacity={0.6} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}
            </div>

        </div>
    );
};

export default Analytics;

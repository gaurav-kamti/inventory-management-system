import { useState, useEffect } from 'react'
import api from '../utils/api'
import './Inventory.css'

function Inventory() {
    const [products, setProducts] = useState([])

    useEffect(() => {
        fetchProducts()
    }, [])

    const fetchProducts = async () => {
        const response = await api.get('/products')
        setProducts(response.data)
    }

    return (
        <div className="inventory-page">
            <div className="page-header">
                <h1 className="page-title">Inventory Items</h1>
                <div className="header-actions">
                    {/* Buttons moved to Sell/Purchase page */}
                </div>
            </div>

            <div className="card">
                <h2 style={{ color: 'white', marginBottom: '20px' }}>All Items ({products.length})</h2>
                <table className="table">
                    <thead>
                        <tr>
                            <th>Item Name</th>
                            <th>Supplier</th>
                            <th>Stock</th>
                            <th>Cost Price</th>
                            <th>Stock Value</th>
                        </tr>
                    </thead>
                    <tbody>
                        {products.map(product => (
                            <tr key={product.id}>
                                <td><strong>{product.name}</strong></td>
                                <td>{product.Supplier?.name || '-'}</td>
                                <td>{product.stock}</td>
                                <td>${parseFloat(product.purchasePrice).toFixed(2)}</td>
                                <td>${(product.stock * product.purchasePrice).toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr className="inventory-total-row">
                            <td style={{ fontWeight: 'bold', padding: '15px', color: 'white' }}>Total Inventory Value:</td>
                            <td></td>
                            <td></td>
                            <td></td>
                            <td style={{ fontWeight: 'bold', color: '#86efac', fontSize: '1.2em', padding: '15px' }}>
                                ${products.reduce((sum, p) => sum + (p.stock * (p.purchasePrice || 0)), 0).toFixed(2)}
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    )
}

export default Inventory

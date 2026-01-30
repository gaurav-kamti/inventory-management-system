import { useState, useEffect } from 'react'
import api from '../utils/api'
import './Products.css'

function Products() {
    const [products, setProducts] = useState([])
    const [showModal, setShowModal] = useState(false)
    const [formData, setFormData] = useState({
        name: '', purchasePrice: '', sellingPrice: '', stock: 0
    })

    useEffect(() => {
        fetchProducts()
    }, [])

    const fetchProducts = async () => {
        const response = await api.get('/products')
        setProducts(response.data)
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        try {
            await api.post('/products', formData)
            setShowModal(false)
            fetchProducts()
            setFormData({
                name: '', purchasePrice: '', sellingPrice: '', stock: 0
            })
        } catch (error) {
            alert(error.response?.data?.error || 'Error creating product')
        }
    }

    return (
        <div className="products-page">
            <div className="page-header">
                <h1 className="page-title">Products</h1>
                <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                    + Add Product
                </button>
            </div>

            <div className="card">
                <table className="table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Stock</th>
                            <th>Purchase Price</th>
                            <th>Selling Price</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {products.map(product => (
                            <tr key={product.id}>
                                <td>{product.name}</td>
                                <td>{product.stock}</td>
                                <td>${product.purchasePrice}</td>
                                <td>${product.sellingPrice}</td>
                                <td>
                                    {product.stock <= 10 ? (
                                        <span className="badge badge-warning">Low Stock</span>
                                    ) : (
                                        <span className="badge badge-success">In Stock</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal glass" onClick={(e) => e.stopPropagation()}>
                        <h2>Add New Product</h2>
                        <form onSubmit={handleSubmit}>
                            <input className="input" placeholder="Product Name" value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                            <div className="form-row">
                                <input type="number" step="0.01" className="input" placeholder="Purchase Price" value={formData.purchasePrice}
                                    onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })} required />
                                <input type="number" step="0.01" className="input" placeholder="Selling Price" value={formData.sellingPrice}
                                    onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })} required />
                            </div>
                            <input type="number" className="input" placeholder="Initial Stock" value={formData.stock}
                                onChange={(e) => setFormData({ ...formData, stock: e.target.value })} />
                            <div className="modal-actions">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary">Add Product</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}

export default Products

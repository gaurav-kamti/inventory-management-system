import { useState, useEffect } from 'react'
import api from '../utils/api'
import './Products.css'

function Products() {
    const [products, setProducts] = useState([])
    const [categories, setCategories] = useState([])
    const [brands, setBrands] = useState([])
    const [showModal, setShowModal] = useState(false)
    const [formData, setFormData] = useState({
        sku: '', name: '', description: '', categoryId: '', brandId: '',
        purchasePrice: '', sellingPrice: '', stock: 0, lowStockThreshold: 10, unit: 'pieces'
    })

    useEffect(() => {
        fetchProducts()
        fetchCategories()
        fetchBrands()
    }, [])

    const fetchProducts = async () => {
        const response = await api.get('/products')
        setProducts(response.data)
    }

    const fetchCategories = async () => {
        const response = await api.get('/categories')
        setCategories(response.data)
    }

    const fetchBrands = async () => {
        const response = await api.get('/brands')
        setBrands(response.data)
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        try {
            await api.post('/products', formData)
            setShowModal(false)
            fetchProducts()
            setFormData({
                sku: '', name: '', description: '', categoryId: '', brandId: '',
                purchasePrice: '', sellingPrice: '', stock: 0, lowStockThreshold: 10, unit: 'pieces'
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
                            <th>SKU</th>
                            <th>Name</th>
                            <th>Category</th>
                            <th>Brand</th>
                            <th>Stock</th>
                            <th>Purchase Price</th>
                            <th>Selling Price</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {products.map(product => (
                            <tr key={product.id}>
                                <td>{product.sku}</td>
                                <td>{product.name}</td>
                                <td>{product.Category?.name || '-'}</td>
                                <td>{product.Brand?.name || '-'}</td>
                                <td>{product.stock} {product.unit}</td>
                                <td>${product.purchasePrice}</td>
                                <td>${product.sellingPrice}</td>
                                <td>
                                    {product.stock <= product.lowStockThreshold ? (
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
                            <div className="form-row">
                                <input className="input" placeholder="SKU" value={formData.sku}
                                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })} required />
                                <input className="input" placeholder="Product Name" value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                            </div>
                            <textarea className="input" placeholder="Description" value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
                            <div className="form-row">
                                <select className="input" value={formData.categoryId}
                                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}>
                                    <option value="">Select Category</option>
                                    {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                                </select>
                                <select className="input" value={formData.brandId}
                                    onChange={(e) => setFormData({ ...formData, brandId: e.target.value })}>
                                    <option value="">Select Brand</option>
                                    {brands.map(brand => <option key={brand.id} value={brand.id}>{brand.name}</option>)}
                                </select>
                            </div>
                            <div className="form-row">
                                <input type="number" className="input" placeholder="Purchase Price" value={formData.purchasePrice}
                                    onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })} required />
                                <input type="number" className="input" placeholder="Selling Price" value={formData.sellingPrice}
                                    onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })} required />
                            </div>
                            <div className="form-row">
                                <input type="number" className="input" placeholder="Initial Stock" value={formData.stock}
                                    onChange={(e) => setFormData({ ...formData, stock: e.target.value })} />
                                <input type="number" className="input" placeholder="Low Stock Alert" value={formData.lowStockThreshold}
                                    onChange={(e) => setFormData({ ...formData, lowStockThreshold: e.target.value })} />
                            </div>
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

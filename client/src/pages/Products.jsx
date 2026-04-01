import { useState, useEffect } from 'react'
import api from '../services/api'
import './Products.css'

function Products() {
    const [products, setProducts] = useState([])
    const [showModal, setShowModal] = useState(false)
    const [isEditing, setIsEditing] = useState(false)
    const [editId, setEditId] = useState(null)
    const [formData, setFormData] = useState({
        name: '', purchasePrice: '', sellingPrice: '', stock: 0, hsn: '8301', gst: 18, quantityUnit: 'Pcs', size: '', sizeUnit: 'mm'
    })

    useEffect(() => {
        fetchProducts()
    }, [])

    const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, product: null })

    useEffect(() => {
        const handleClick = () => setContextMenu({ visible: false, x: 0, y: 0, product: null });
        window.addEventListener('click', handleClick);
        return () => window.removeEventListener('click', handleClick);
    }, []);

    const handleContextMenu = (e, product) => {
        e.preventDefault();
        setContextMenu({ visible: true, x: e.pageX, y: e.pageY, product });
    };

    const fetchProducts = async () => {
        const response = await api.get('/products')
        setProducts(response.data)
    }

    const openAddModal = () => {
        setIsEditing(false)
        setEditId(null)
        setFormData({ name: '', purchasePrice: '', sellingPrice: '', stock: 0, hsn: '8301', gst: 18, quantityUnit: 'Pcs', size: '', sizeUnit: 'mm' })
        setShowModal(true)
    }

    const openEditModal = (product) => {
        setIsEditing(true)
        setEditId(product.id)
        setFormData({
            name: product.name,
            purchasePrice: product.purchasePrice,
            sellingPrice: product.sellingPrice,
            stock: product.stock,
            hsn: product.hsn || '8301',
            gst: product.gst || 18,
            quantityUnit: product.quantityUnit || 'Pcs',
            size: product.size || '',
            sizeUnit: product.sizeUnit || 'mm'
        })
        setShowModal(true)
    }

    const handleDelete = async (id) => {
        if (window.confirm('Delete this product permanently?')) {
            try {
                await api.delete(`/products/${id}`)
                fetchProducts()
            } catch (err) {
                alert('Error deleting product')
            }
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        try {
            if (isEditing) {
                await api.put(`/products/${editId}`, formData)
            } else {
                await api.post('/products', formData)
            }
            setShowModal(false)
            fetchProducts()
        } catch (error) {
            alert(error.response?.data?.error || 'Error saving product')
        }
    }

    return (
        <div className="products-page">
            <div className="page-header">
                <h1 className="page-title">Product Catalog</h1>
                <button className="btn btn-primary" onClick={openAddModal}>
                    + New Product
                </button>
            </div>

            <div className="card">
                <table className="table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Size</th>
                            <th>Stock</th>
                            <th>Purchase Price</th>
                            <th>Selling Price</th>
                            <th>GST</th>
                        </tr>
                    </thead>
                    <tbody>
                        {products.map(product => (
                            <tr key={product.id} onContextMenu={(e) => handleContextMenu(e, product)} style={{ cursor: 'context-menu' }}>
                                <td style={{ fontWeight: 700 }}>{product.name}</td>
                                <td style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{product.size || '--'} {product.size ? product.sizeUnit : ''}</td>
                                <td>
                                    <span className={`badge ${product.stock <= 10 ? 'badge-warning' : 'badge-success'}`}>
                                        {product.stock} {product.quantityUnit || 'Pcs'}
                                    </span>
                                </td>
                                <td>₹{product.purchasePrice}</td>
                                <td>₹{product.sellingPrice}</td>
                                <td>{product.gst}%</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Context Menu */}
            {contextMenu.visible && (
                <div style={{
                    position: 'absolute', top: contextMenu.y, left: contextMenu.x,
                    background: '#1e293b', border: '1px solid #334155', borderRadius: '12px',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.5)', zIndex: 10000, overflow: 'hidden',
                    minWidth: '150px'
                }}>
                    <div
                        className="context-item"
                        style={{ padding: '12px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', transition: 'background 0.2s', color: '#fff' }}
                        onClick={() => openEditModal(contextMenu.product)}
                        onMouseEnter={(e) => e.target.style.background = '#334155'}
                        onMouseLeave={(e) => e.target.style.background = 'transparent'}
                    >
                        <span>✏️</span> Edit Update
                    </div>
                    <div
                        className="context-item"
                        style={{ padding: '12px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', transition: 'background 0.2s', borderTop: '1px solid #334155', color: '#fca5a5' }}
                        onClick={() => handleDelete(contextMenu.product.id)}
                        onMouseEnter={(e) => e.target.style.background = '#334155'}
                        onMouseLeave={(e) => e.target.style.background = 'transparent'}
                    >
                        <span>🗑️</span> Delete Permanent
                    </div>
                </div>
            )}

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal glass" onClick={(e) => e.stopPropagation()}>
                        <h2 style={{ marginBottom: '20px' }}>{isEditing ? 'Update Product' : 'Add New Product'}</h2>
                        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '15px' }}>
                            <div className="form-group">
                                <label>Product Name</label>
                                <input className="input" placeholder="Name" value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                            </div>

                            <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                <div className="form-group">
                                    <label>Purchase Price (₹)</label>
                                    <input type="number" step="0.01" className="input" value={formData.purchasePrice}
                                        onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })} required />
                                </div>
                                <div className="form-group">
                                    <label>Selling Price (₹)</label>
                                    <input type="number" step="0.01" className="input" value={formData.sellingPrice}
                                        onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })} required />
                                </div>
                            </div>

                            <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                <div className="form-group">
                                    <label>Initial Stock</label>
                                    <input type="number" className="input" value={formData.stock}
                                        onChange={(e) => setFormData({ ...formData, stock: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label>Unit</label>
                                    <select className="input" value={formData.quantityUnit}
                                        onChange={(e) => setFormData({ ...formData, quantityUnit: e.target.value })}>
                                        <option value="Pcs">Pcs</option>
                                        <option value="Set">Set</option>
                                        <option value="Box">Box</option>
                                    </select>
                                </div>
                            </div>

                            <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                <div className="form-group">
                                    <label>Size (Dimensions)</label>
                                    <input className="input" placeholder="50, 4.5, etc." value={formData.size}
                                        onChange={(e) => setFormData({ ...formData, size: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label>Size Unit</label>
                                    <select className="input" value={formData.sizeUnit}
                                        onChange={(e) => setFormData({ ...formData, sizeUnit: e.target.value })}>
                                        <option value="mm">mm</option>
                                        <option value="cm">cm</option>
                                        <option value="inches">inches</option>
                                        <option value="Meter">Meter</option>
                                        <option value="--">None</option>
                                    </select>
                                </div>
                            </div>

                            <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                <div className="form-group">
                                    <label>HSN</label>
                                    <input className="input" value={formData.hsn}
                                        onChange={(e) => setFormData({ ...formData, hsn: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label>GST (%)</label>
                                    <input type="number" className="input" value={formData.gst}
                                        onChange={(e) => setFormData({ ...formData, gst: e.target.value })} />
                                </div>
                            </div>

                            <div className="modal-actions" style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
                                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" style={{ flex: 2 }}>{isEditing ? 'Save Changes' : 'Create Product'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}

export default Products

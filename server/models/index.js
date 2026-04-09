const sequelize = require('../config/database');
const User = require('./User');
const Product = require('./Product');
const Brand = require('./Brand');
const Category = require('./Category');
const Customer = require('./Customer');
const Sale = require('./Sale');
const SaleItem = require('./SaleItem');
const CreditTransaction = require('./CreditTransaction');
const Supplier = require('./Supplier');
const Purchase = require('./Purchase');
const Settings = require('./Settings');
const SupplierTransaction = require('./SupplierTransaction');
const StockMovement = require('./StockMovement');

// Associations
Sale.belongsTo(Customer, { foreignKey: 'customerId' });
Sale.belongsTo(User, { foreignKey: 'userId' });
Customer.hasMany(Sale, { foreignKey: 'customerId' });

Sale.hasMany(SaleItem, { foreignKey: 'saleId' });
SaleItem.belongsTo(Sale, { foreignKey: 'saleId' });
SaleItem.belongsTo(Product, { foreignKey: 'productId' });

CreditTransaction.belongsTo(Customer, { foreignKey: 'customerId' });
CreditTransaction.belongsTo(Sale, { foreignKey: 'saleId' });
Customer.hasMany(CreditTransaction, { foreignKey: 'customerId' });

Purchase.belongsTo(Product, { foreignKey: 'productId' });
Purchase.belongsTo(Supplier, { foreignKey: 'supplierId' });
Product.hasMany(Purchase, { foreignKey: 'productId' });
Supplier.hasMany(Purchase, { foreignKey: 'supplierId' });

Supplier.hasMany(SupplierTransaction, { foreignKey: 'supplierId' });
SupplierTransaction.belongsTo(Supplier, { foreignKey: 'supplierId' });
Purchase.hasOne(SupplierTransaction, { foreignKey: 'purchaseId' });
SupplierTransaction.belongsTo(Purchase, { foreignKey: 'purchaseId' });

StockMovement.belongsTo(Product, { foreignKey: 'productId' });
StockMovement.belongsTo(User, { foreignKey: 'userId' });
Product.hasMany(StockMovement, { foreignKey: 'productId' });

module.exports = {
  sequelize,
  User,
  Product,
  Customer,
  Sale,
  SaleItem,
  CreditTransaction,
  Supplier,
  Purchase,
  Settings,
  SupplierTransaction,
  StockMovement,
  Brand,
  Category
};



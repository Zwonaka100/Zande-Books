-- ========================================
-- ZANDE BOOKS - COA TEMPLATES FOR ALL INDUSTRIES
-- Pre-built Chart of Accounts for Quick Setup
-- ========================================

-- ========================================
-- TEMPLATE 1: RETAIL BUSINESS
-- ========================================
INSERT INTO coa_templates (industry_type, account_code, account_name, account_type, parent_account_code, description, is_header, vat_applicable, sort_order) VALUES

-- ASSETS
('RETAIL', '1000', 'Assets', 'ASSET', NULL, 'All company assets', TRUE, FALSE, 1),
('RETAIL', '1100', 'Current Assets', 'ASSET', '1000', 'Assets convertible to cash within 1 year', TRUE, FALSE, 2),
('RETAIL', '1110', 'Petty Cash', 'ASSET', '1100', 'Small cash for daily expenses', FALSE, FALSE, 3),
('RETAIL', '1120', 'Bank - FNB Cheque Account', 'ASSET', '1100', 'Primary bank account', FALSE, FALSE, 4),
('RETAIL', '1130', 'Bank - Savings Account', 'ASSET', '1100', 'Savings/Reserve account', FALSE, FALSE, 5),
('RETAIL', '1140', 'Accounts Receivable', 'ASSET', '1100', 'Money owed by customers', FALSE, FALSE, 6),
('RETAIL', '1150', 'Inventory - Finished Goods', 'ASSET', '1100', 'Stock ready for sale', FALSE, FALSE, 7),
('RETAIL', '1160', 'Prepaid Expenses', 'ASSET', '1100', 'Expenses paid in advance', FALSE, FALSE, 8),

('RETAIL', '1500', 'Fixed Assets', 'ASSET', '1000', 'Long-term assets', TRUE, FALSE, 20),
('RETAIL', '1510', 'Furniture & Fixtures', 'ASSET', '1500', 'Store furniture, shelving', FALSE, FALSE, 21),
('RETAIL', '1520', 'Computer Equipment', 'ASSET', '1500', 'POS systems, computers', FALSE, FALSE, 22),
('RETAIL', '1530', 'Motor Vehicles', 'ASSET', '1500', 'Delivery vehicles', FALSE, FALSE, 23),
('RETAIL', '1540', 'Leasehold Improvements', 'ASSET', '1500', 'Store renovations', FALSE, FALSE, 24),

('RETAIL', '1900', 'Accumulated Depreciation', 'ASSET', '1000', 'Contra-asset account', TRUE, FALSE, 40),
('RETAIL', '1910', 'Accum Depreciation - Furniture', 'ASSET', '1900', 'Depreciation on furniture', FALSE, FALSE, 41),
('RETAIL', '1920', 'Accum Depreciation - Equipment', 'ASSET', '1900', 'Depreciation on equipment', FALSE, FALSE, 42),
('RETAIL', '1930', 'Accum Depreciation - Vehicles', 'ASSET', '1900', 'Depreciation on vehicles', FALSE, FALSE, 43),

-- LIABILITIES
('RETAIL', '2000', 'Liabilities', 'LIABILITY', NULL, 'All company liabilities', TRUE, FALSE, 50),
('RETAIL', '2100', 'Current Liabilities', 'LIABILITY', '2000', 'Debts due within 1 year', TRUE, FALSE, 51),
('RETAIL', '2110', 'Accounts Payable', 'LIABILITY', '2100', 'Money owed to suppliers', FALSE, FALSE, 52),
('RETAIL', '2120', 'VAT Payable', 'LIABILITY', '2100', 'VAT owed to SARS', FALSE, FALSE, 53),
('RETAIL', '2130', 'PAYE Payable', 'LIABILITY', '2100', 'Tax on employee salaries', FALSE, FALSE, 54),
('RETAIL', '2140', 'UIF Payable', 'LIABILITY', '2100', 'Unemployment Insurance Fund', FALSE, FALSE, 55),
('RETAIL', '2150', 'Credit Card - Business', 'LIABILITY', '2100', 'Business credit card', FALSE, FALSE, 56),
('RETAIL', '2160', 'Accrued Expenses', 'LIABILITY', '2100', 'Expenses incurred but not paid', FALSE, FALSE, 57),

('RETAIL', '2500', 'Long-term Liabilities', 'LIABILITY', '2000', 'Debts due after 1 year', TRUE, FALSE, 70),
('RETAIL', '2510', 'Bank Loan', 'LIABILITY', '2500', 'Business loan from bank', FALSE, FALSE, 71),
('RETAIL', '2520', 'Vehicle Finance', 'LIABILITY', '2500', 'Vehicle loan', FALSE, FALSE, 72),

-- EQUITY
('RETAIL', '3000', 'Equity', 'EQUITY', NULL, 'Owner''s stake in business', TRUE, FALSE, 80),
('RETAIL', '3100', 'Owner''s Capital', 'EQUITY', '3000', 'Initial and additional investment', FALSE, FALSE, 81),
('RETAIL', '3200', 'Owner''s Drawings', 'EQUITY', '3000', 'Money withdrawn by owner', FALSE, FALSE, 82),
('RETAIL', '3300', 'Retained Earnings', 'EQUITY', '3000', 'Accumulated profit/loss', FALSE, FALSE, 83),
('RETAIL', '3900', 'Current Year Earnings', 'EQUITY', '3000', 'Profit/loss for current year', FALSE, FALSE, 84),

-- REVENUE
('RETAIL', '4000', 'Revenue', 'REVENUE', NULL, 'All income', TRUE, FALSE, 90),
('RETAIL', '4100', 'Sales Revenue', 'REVENUE', '4000', 'Income from selling goods', FALSE, TRUE, 91),
('RETAIL', '4200', 'Sales Returns', 'REVENUE', '4000', 'Returns and allowances (contra-revenue)', FALSE, TRUE, 92),
('RETAIL', '4300', 'Discounts Allowed', 'REVENUE', '4000', 'Discounts given to customers', FALSE, FALSE, 93),
('RETAIL', '4900', 'Other Income', 'REVENUE', '4000', 'Interest, rental income, etc.', FALSE, FALSE, 94),

-- COST OF GOODS SOLD
('RETAIL', '5000', 'Cost of Goods Sold', 'EXPENSE', NULL, 'Direct costs of products sold', TRUE, FALSE, 100),
('RETAIL', '5100', 'Purchases', 'EXPENSE', '5000', 'Inventory purchases', FALSE, TRUE, 101),
('RETAIL', '5200', 'Purchase Returns', 'EXPENSE', '5000', 'Returns to suppliers (contra-expense)', FALSE, TRUE, 102),
('RETAIL', '5300', 'Freight In', 'EXPENSE', '5000', 'Shipping costs on purchases', FALSE, TRUE, 103),
('RETAIL', '5400', 'Stock Shrinkage', 'EXPENSE', '5000', 'Lost, stolen, damaged stock', FALSE, FALSE, 104),

-- OPERATING EXPENSES
('RETAIL', '6000', 'Operating Expenses', 'EXPENSE', NULL, 'Day-to-day business costs', TRUE, FALSE, 110),
('RETAIL', '6100', 'Salaries & Wages', 'EXPENSE', '6000', 'Employee compensation', FALSE, FALSE, 111),
('RETAIL', '6200', 'Rent Expense', 'EXPENSE', '6000', 'Store/office rental', FALSE, FALSE, 112),
('RETAIL', '6300', 'Utilities', 'EXPENSE', '6000', 'Electricity, water, gas', FALSE, FALSE, 113),
('RETAIL', '6400', 'Telephone & Internet', 'EXPENSE', '6000', 'Communication costs', FALSE, TRUE, 114),
('RETAIL', '6500', 'Office Supplies', 'EXPENSE', '6000', 'Stationery, printing', FALSE, TRUE, 115),
('RETAIL', '6600', 'Advertising & Marketing', 'EXPENSE', '6000', 'Promotions, social media ads', FALSE, TRUE, 116),
('RETAIL', '6700', 'Insurance', 'EXPENSE', '6000', 'Business, stock, vehicle insurance', FALSE, FALSE, 117),
('RETAIL', '6800', 'Bank Charges', 'EXPENSE', '6000', 'Bank fees, card charges', FALSE, FALSE, 118),
('RETAIL', '6900', 'Professional Fees', 'EXPENSE', '6000', 'Accountant, lawyer fees', FALSE, TRUE, 119),
('RETAIL', '7000', 'Repairs & Maintenance', 'EXPENSE', '6000', 'Equipment repairs', FALSE, TRUE, 120),
('RETAIL', '7100', 'Vehicle Expenses', 'EXPENSE', '6000', 'Fuel, repairs, license', FALSE, TRUE, 121),
('RETAIL', '7200', 'Travel & Entertainment', 'EXPENSE', '6000', 'Business travel, client meals', FALSE, TRUE, 122),
('RETAIL', '7300', 'Training & Development', 'EXPENSE', '6000', 'Staff training', FALSE, TRUE, 123),
('RETAIL', '7400', 'Security Expenses', 'EXPENSE', '6000', 'Alarm, guards, cash-in-transit', FALSE, TRUE, 124),

-- OTHER EXPENSES
('RETAIL', '9000', 'Other Expenses', 'EXPENSE', NULL, 'Non-operating expenses', TRUE, FALSE, 200),
('RETAIL', '9100', 'Depreciation', 'EXPENSE', '9000', 'Asset depreciation expense', FALSE, FALSE, 201),
('RETAIL', '9200', 'Interest Expense', 'EXPENSE', '9000', 'Loan interest', FALSE, FALSE, 202),
('RETAIL', '9300', 'Loss on Asset Disposal', 'EXPENSE', '9000', 'Loss when selling assets', FALSE, FALSE, 203);


-- ========================================
-- TEMPLATE 2: SERVICES BUSINESS
-- ========================================
INSERT INTO coa_templates (industry_type, account_code, account_name, account_type, parent_account_code, description, is_header, vat_applicable, sort_order) VALUES

-- ASSETS (Similar to retail but without inventory)
('SERVICES', '1000', 'Assets', 'ASSET', NULL, 'All company assets', TRUE, FALSE, 1),
('SERVICES', '1100', 'Current Assets', 'ASSET', '1000', 'Liquid assets', TRUE, FALSE, 2),
('SERVICES', '1110', 'Petty Cash', 'ASSET', '1100', 'Small cash', FALSE, FALSE, 3),
('SERVICES', '1120', 'Bank - FNB Cheque Account', 'ASSET', '1100', 'Primary bank', FALSE, FALSE, 4),
('SERVICES', '1130', 'Bank - Savings Account', 'ASSET', '1100', 'Savings', FALSE, FALSE, 5),
('SERVICES', '1140', 'Accounts Receivable', 'ASSET', '1100', 'Money owed by clients', FALSE, FALSE, 6),
('SERVICES', '1150', 'Unbilled Receivables', 'ASSET', '1100', 'Work done but not invoiced', FALSE, FALSE, 7),
('SERVICES', '1160', 'Prepaid Expenses', 'ASSET', '1100', 'Expenses paid in advance', FALSE, FALSE, 8),

('SERVICES', '1500', 'Fixed Assets', 'ASSET', '1000', 'Long-term assets', TRUE, FALSE, 20),
('SERVICES', '1510', 'Furniture & Fixtures', 'ASSET', '1500', 'Office furniture', FALSE, FALSE, 21),
('SERVICES', '1520', 'Computer Equipment', 'ASSET', '1500', 'Computers, servers', FALSE, FALSE, 22),
('SERVICES', '1530', 'Software', 'ASSET', '1500', 'Business software licenses', FALSE, FALSE, 23),
('SERVICES', '1540', 'Motor Vehicles', 'ASSET', '1500', 'Company vehicles', FALSE, FALSE, 24),

('SERVICES', '1900', 'Accumulated Depreciation', 'ASSET', '1000', 'Contra-asset', TRUE, FALSE, 40),
('SERVICES', '1910', 'Accum Depreciation - Furniture', 'ASSET', '1900', NULL, FALSE, FALSE, 41),
('SERVICES', '1920', 'Accum Depreciation - Equipment', 'ASSET', '1900', NULL, FALSE, FALSE, 42),
('SERVICES', '1930', 'Accum Depreciation - Vehicles', 'ASSET', '1900', NULL, FALSE, FALSE, 43),

-- LIABILITIES
('SERVICES', '2000', 'Liabilities', 'LIABILITY', NULL, 'All liabilities', TRUE, FALSE, 50),
('SERVICES', '2100', 'Current Liabilities', 'LIABILITY', '2000', 'Short-term debts', TRUE, FALSE, 51),
('SERVICES', '2110', 'Accounts Payable', 'LIABILITY', '2100', 'Money owed to suppliers', FALSE, FALSE, 52),
('SERVICES', '2120', 'VAT Payable', 'LIABILITY', '2100', 'VAT owed to SARS', FALSE, FALSE, 53),
('SERVICES', '2130', 'PAYE Payable', 'LIABILITY', '2100', 'Employee tax', FALSE, FALSE, 54),
('SERVICES', '2140', 'UIF Payable', 'LIABILITY', '2100', 'UIF contributions', FALSE, FALSE, 55),
('SERVICES', '2150', 'Deferred Revenue', 'LIABILITY', '2100', 'Payments received for work not done', FALSE, FALSE, 56),
('SERVICES', '2160', 'Accrued Expenses', 'LIABILITY', '2100', 'Expenses not yet paid', FALSE, FALSE, 57),

('SERVICES', '2500', 'Long-term Liabilities', 'LIABILITY', '2000', 'Long-term debts', TRUE, FALSE, 70),
('SERVICES', '2510', 'Bank Loan', 'LIABILITY', '2500', 'Business loan', FALSE, FALSE, 71),

-- EQUITY
('SERVICES', '3000', 'Equity', 'EQUITY', NULL, 'Owner equity', TRUE, FALSE, 80),
('SERVICES', '3100', 'Owner''s Capital', 'EQUITY', '3000', 'Owner investment', FALSE, FALSE, 81),
('SERVICES', '3200', 'Owner''s Drawings', 'EQUITY', '3000', 'Owner withdrawals', FALSE, FALSE, 82),
('SERVICES', '3300', 'Retained Earnings', 'EQUITY', '3000', 'Accumulated profit', FALSE, FALSE, 83),
('SERVICES', '3900', 'Current Year Earnings', 'EQUITY', '3000', 'Current year profit', FALSE, FALSE, 84),

-- REVENUE
('SERVICES', '4000', 'Revenue', 'REVENUE', NULL, 'All income', TRUE, FALSE, 90),
('SERVICES', '4100', 'Service Revenue - Consulting', 'REVENUE', '4000', 'Consulting fees', FALSE, TRUE, 91),
('SERVICES', '4200', 'Service Revenue - Project Work', 'REVENUE', '4000', 'Project-based income', FALSE, TRUE, 92),
('SERVICES', '4300', 'Service Revenue - Retainer', 'REVENUE', '4000', 'Monthly retainer fees', FALSE, TRUE, 93),
('SERVICES', '4400', 'Service Revenue - Training', 'REVENUE', '4000', 'Training income', FALSE, TRUE, 94),
('SERVICES', '4500', 'Reimbursable Expenses', 'REVENUE', '4000', 'Client expenses billed back', FALSE, TRUE, 95),
('SERVICES', '4900', 'Other Income', 'REVENUE', '4000', 'Interest, misc income', FALSE, FALSE, 96),

-- COST OF SERVICES
('SERVICES', '5000', 'Cost of Services', 'EXPENSE', NULL, 'Direct service costs', TRUE, FALSE, 100),
('SERVICES', '5100', 'Subcontractor Costs', 'EXPENSE', '5000', 'Freelancers, subcontractors', FALSE, TRUE, 101),
('SERVICES', '5200', 'Direct Labor', 'EXPENSE', '5000', 'Staff directly on client work', FALSE, FALSE, 102),
('SERVICES', '5300', 'Client Expenses', 'EXPENSE', '5000', 'Travel, meals for clients', FALSE, TRUE, 103),

-- OPERATING EXPENSES
('SERVICES', '6000', 'Operating Expenses', 'EXPENSE', NULL, 'Operating costs', TRUE, FALSE, 110),
('SERVICES', '6100', 'Salaries & Wages', 'EXPENSE', '6000', 'Admin staff salaries', FALSE, FALSE, 111),
('SERVICES', '6200', 'Rent Expense', 'EXPENSE', '6000', 'Office rental', FALSE, FALSE, 112),
('SERVICES', '6300', 'Utilities', 'EXPENSE', '6000', 'Electricity, water', FALSE, FALSE, 113),
('SERVICES', '6400', 'Telephone & Internet', 'EXPENSE', '6000', 'Communications', FALSE, TRUE, 114),
('SERVICES', '6500', 'Office Supplies', 'EXPENSE', '6000', 'Stationery, supplies', FALSE, TRUE, 115),
('SERVICES', '6600', 'Advertising & Marketing', 'EXPENSE', '6000', 'Marketing costs', FALSE, TRUE, 116),
('SERVICES', '6700', 'Insurance', 'EXPENSE', '6000', 'Professional indemnity, etc.', FALSE, FALSE, 117),
('SERVICES', '6800', 'Bank Charges', 'EXPENSE', '6000', 'Bank fees', FALSE, FALSE, 118),
('SERVICES', '6900', 'Professional Fees', 'EXPENSE', '6000', 'Accountant, legal', FALSE, TRUE, 119),
('SERVICES', '7000', 'Software Subscriptions', 'EXPENSE', '6000', 'SaaS tools, licenses', FALSE, TRUE, 120),
('SERVICES', '7100', 'Vehicle Expenses', 'EXPENSE', '6000', 'Fuel, maintenance', FALSE, TRUE, 121),
('SERVICES', '7200', 'Travel & Entertainment', 'EXPENSE', '6000', 'Business travel', FALSE, TRUE, 122),
('SERVICES', '7300', 'Training & Development', 'EXPENSE', '6000', 'Staff training', FALSE, TRUE, 123),
('SERVICES', '7400', 'Professional Development', 'EXPENSE', '6000', 'Certifications, memberships', FALSE, TRUE, 124),

-- OTHER EXPENSES
('SERVICES', '9000', 'Other Expenses', 'EXPENSE', NULL, 'Non-operating', TRUE, FALSE, 200),
('SERVICES', '9100', 'Depreciation', 'EXPENSE', '9000', 'Asset depreciation', FALSE, FALSE, 201),
('SERVICES', '9200', 'Interest Expense', 'EXPENSE', '9000', 'Loan interest', FALSE, FALSE, 202);


-- ========================================
-- TEMPLATE 3: RESTAURANT/FOOD SERVICE
-- ========================================
INSERT INTO coa_templates (industry_type, account_code, account_name, account_type, parent_account_code, description, is_header, vat_applicable, sort_order) VALUES

-- ASSETS
('RESTAURANT', '1000', 'Assets', 'ASSET', NULL, 'All assets', TRUE, FALSE, 1),
('RESTAURANT', '1100', 'Current Assets', 'ASSET', '1000', 'Current assets', TRUE, FALSE, 2),
('RESTAURANT', '1110', 'Cash on Hand', 'ASSET', '1100', 'Till/register cash', FALSE, FALSE, 3),
('RESTAURANT', '1120', 'Bank - Cheque Account', 'ASSET', '1100', 'Main bank', FALSE, FALSE, 4),
('RESTAURANT', '1140', 'Accounts Receivable', 'ASSET', '1100', 'Corporate accounts', FALSE, FALSE, 5),
('RESTAURANT', '1150', 'Inventory - Food', 'ASSET', '1100', 'Food ingredients', FALSE, FALSE, 6),
('RESTAURANT', '1160', 'Inventory - Beverages', 'ASSET', '1100', 'Drinks, alcohol', FALSE, FALSE, 7),
('RESTAURANT', '1170', 'Inventory - Supplies', 'ASSET', '1100', 'Packaging, napkins', FALSE, FALSE, 8),

('RESTAURANT', '1500', 'Fixed Assets', 'ASSET', '1000', 'Fixed assets', TRUE, FALSE, 20),
('RESTAURANT', '1510', 'Kitchen Equipment', 'ASSET', '1500', 'Stoves, ovens, fridges', FALSE, FALSE, 21),
('RESTAURANT', '1520', 'Furniture & Fixtures', 'ASSET', '1500', 'Tables, chairs, decor', FALSE, FALSE, 22),
('RESTAURANT', '1530', 'POS System', 'ASSET', '1500', 'Point of sale equipment', FALSE, FALSE, 23),
('RESTAURANT', '1540', 'Leasehold Improvements', 'ASSET', '1500', 'Restaurant build-out', FALSE, FALSE, 24),

('RESTAURANT', '1900', 'Accumulated Depreciation', 'ASSET', '1000', 'Contra-asset', TRUE, FALSE, 40),

-- LIABILITIES
('RESTAURANT', '2000', 'Liabilities', 'LIABILITY', NULL, 'All liabilities', TRUE, FALSE, 50),
('RESTAURANT', '2100', 'Current Liabilities', 'LIABILITY', '2000', 'Current liabilities', TRUE, FALSE, 51),
('RESTAURANT', '2110', 'Accounts Payable', 'LIABILITY', '2100', 'Suppliers', FALSE, FALSE, 52),
('RESTAURANT', '2120', 'VAT Payable', 'LIABILITY', '2100', 'SARS VAT', FALSE, FALSE, 53),
('RESTAURANT', '2130', 'PAYE/UIF Payable', 'LIABILITY', '2100', 'Staff taxes', FALSE, FALSE, 54),
('RESTAURANT', '2140', 'Tips Payable', 'LIABILITY', '2100', 'Staff tips to distribute', FALSE, FALSE, 55),

('RESTAURANT', '2500', 'Long-term Liabilities', 'LIABILITY', '2000', 'Long-term debts', TRUE, FALSE, 70),
('RESTAURANT', '2510', 'Bank Loan', 'LIABILITY', '2500', 'Equipment loan', FALSE, FALSE, 71),

-- EQUITY
('RESTAURANT', '3000', 'Equity', 'EQUITY', NULL, 'Owner equity', TRUE, FALSE, 80),
('RESTAURANT', '3100', 'Owner''s Capital', 'EQUITY', '3000', 'Owner investment', FALSE, FALSE, 81),
('RESTAURANT', '3300', 'Retained Earnings', 'EQUITY', '3000', 'Accumulated profit', FALSE, FALSE, 82),
('RESTAURANT', '3900', 'Current Year Earnings', 'EQUITY', '3000', 'Current year', FALSE, FALSE, 83),

-- REVENUE
('RESTAURANT', '4000', 'Revenue', 'REVENUE', NULL, 'All income', TRUE, FALSE, 90),
('RESTAURANT', '4100', 'Food Sales', 'REVENUE', '4000', 'Food revenue', FALSE, TRUE, 91),
('RESTAURANT', '4200', 'Beverage Sales', 'REVENUE', '4000', 'Drink revenue', FALSE, TRUE, 92),
('RESTAURANT', '4300', 'Alcohol Sales', 'REVENUE', '4000', 'Alcohol revenue', FALSE, TRUE, 93),
('RESTAURANT', '4400', 'Catering Revenue', 'REVENUE', '4000', 'Off-site catering', FALSE, TRUE, 94),
('RESTAURANT', '4500', 'Delivery Revenue', 'REVENUE', '4000', 'Delivery orders', FALSE, TRUE, 95),

-- COST OF GOODS SOLD
('RESTAURANT', '5000', 'Cost of Goods Sold', 'EXPENSE', NULL, 'Direct costs', TRUE, FALSE, 100),
('RESTAURANT', '5100', 'Food Cost', 'EXPENSE', '5000', 'Ingredients, food purchases', FALSE, TRUE, 101),
('RESTAURANT', '5200', 'Beverage Cost', 'EXPENSE', '5000', 'Drink purchases', FALSE, TRUE, 102),
('RESTAURANT', '5300', 'Alcohol Cost', 'EXPENSE', '5000', 'Alcohol purchases', FALSE, TRUE, 103),
('RESTAURANT', '5400', 'Packaging Cost', 'EXPENSE', '5000', 'Takeaway containers', FALSE, TRUE, 104),

-- OPERATING EXPENSES
('RESTAURANT', '6000', 'Operating Expenses', 'EXPENSE', NULL, 'Operating costs', TRUE, FALSE, 110),
('RESTAURANT', '6100', 'Salaries - Kitchen Staff', 'EXPENSE', '6000', 'Chef, cooks', FALSE, FALSE, 111),
('RESTAURANT', '6200', 'Salaries - Wait Staff', 'EXPENSE', '6000', 'Waiters, waitresses', FALSE, FALSE, 112),
('RESTAURANT', '6300', 'Salaries - Management', 'EXPENSE', '6000', 'Manager, supervisor', FALSE, FALSE, 113),
('RESTAURANT', '6400', 'Rent Expense', 'EXPENSE', '6000', 'Premises rental', FALSE, FALSE, 114),
('RESTAURANT', '6500', 'Utilities', 'EXPENSE', '6000', 'Electric, gas, water', FALSE, FALSE, 115),
('RESTAURANT', '6600', 'Cleaning Supplies', 'EXPENSE', '6000', 'Detergents, sanitizers', FALSE, TRUE, 116),
('RESTAURANT', '6700', 'Laundry & Linen', 'EXPENSE', '6000', 'Tablecloths, uniforms', FALSE, TRUE, 117),
('RESTAURANT', '6800', 'Music & Entertainment', 'EXPENSE', '6000', 'Live music, SAMRO fees', FALSE, TRUE, 118),
('RESTAURANT', '6900', 'Marketing & Promotions', 'EXPENSE', '6000', 'Advertising', FALSE, TRUE, 119),
('RESTAURANT', '7000', 'Licenses & Permits', 'EXPENSE', '6000', 'Liquor license, health permits', FALSE, FALSE, 120),
('RESTAURANT', '7100', 'Equipment Maintenance', 'EXPENSE', '6000', 'Repairs on kitchen gear', FALSE, TRUE, 121),
('RESTAURANT', '7200', 'Delivery Fees', 'EXPENSE', '6000', 'Uber Eats, Mr D commissions', FALSE, FALSE, 122),
('RESTAURANT', '7300', 'Bank & Card Fees', 'EXPENSE', '6000', 'Card machine fees', FALSE, FALSE, 123),
('RESTAURANT', '7400', 'Insurance', 'EXPENSE', '6000', 'Public liability, etc.', FALSE, FALSE, 124),

-- OTHER EXPENSES
('RESTAURANT', '9000', 'Other Expenses', 'EXPENSE', NULL, 'Non-operating', TRUE, FALSE, 200),
('RESTAURANT', '9100', 'Depreciation', 'EXPENSE', '9000', 'Asset depreciation', FALSE, FALSE, 201),
('RESTAURANT', '9200', 'Interest Expense', 'EXPENSE', '9000', 'Loan interest', FALSE, FALSE, 202);


-- ========================================
-- TEMPLATE 4: MANUFACTURING
-- ========================================
INSERT INTO coa_templates (industry_type, account_code, account_name, account_type, parent_account_code, description, is_header, vat_applicable, sort_order) VALUES

-- ASSETS
('MANUFACTURING', '1000', 'Assets', 'ASSET', NULL, 'All assets', TRUE, FALSE, 1),
('MANUFACTURING', '1100', 'Current Assets', 'ASSET', '1000', 'Current assets', TRUE, FALSE, 2),
('MANUFACTURING', '1110', 'Petty Cash', 'ASSET', '1100', 'Small cash', FALSE, FALSE, 3),
('MANUFACTURING', '1120', 'Bank - Cheque Account', 'ASSET', '1100', 'Main bank', FALSE, FALSE, 4),
('MANUFACTURING', '1140', 'Accounts Receivable', 'ASSET', '1100', 'Customer receivables', FALSE, FALSE, 5),
('MANUFACTURING', '1150', 'Inventory - Raw Materials', 'ASSET', '1100', 'Materials to be used', FALSE, FALSE, 6),
('MANUFACTURING', '1160', 'Inventory - Work in Progress', 'ASSET', '1100', 'Partially finished goods', FALSE, FALSE, 7),
('MANUFACTURING', '1170', 'Inventory - Finished Goods', 'ASSET', '1100', 'Ready to sell products', FALSE, FALSE, 8),
('MANUFACTURING', '1180', 'Inventory - Packaging Materials', 'ASSET', '1100', 'Boxes, labels', FALSE, FALSE, 9),

('MANUFACTURING', '1500', 'Fixed Assets', 'ASSET', '1000', 'Fixed assets', TRUE, FALSE, 20),
('MANUFACTURING', '1510', 'Land', 'ASSET', '1500', 'Factory land', FALSE, FALSE, 21),
('MANUFACTURING', '1520', 'Buildings', 'ASSET', '1500', 'Factory building', FALSE, FALSE, 22),
('MANUFACTURING', '1530', 'Machinery & Equipment', 'ASSET', '1500', 'Production machines', FALSE, FALSE, 23),
('MANUFACTURING', '1540', 'Tools & Dies', 'ASSET', '1500', 'Manufacturing tools', FALSE, FALSE, 24),
('MANUFACTURING', '1550', 'Motor Vehicles', 'ASSET', '1500', 'Delivery trucks', FALSE, FALSE, 25),

('MANUFACTURING', '1900', 'Accumulated Depreciation', 'ASSET', '1000', 'Contra-asset', TRUE, FALSE, 40),

-- LIABILITIES
('MANUFACTURING', '2000', 'Liabilities', 'LIABILITY', NULL, 'All liabilities', TRUE, FALSE, 50),
('MANUFACTURING', '2100', 'Current Liabilities', 'LIABILITY', '2000', 'Current liabilities', TRUE, FALSE, 51),
('MANUFACTURING', '2110', 'Accounts Payable', 'LIABILITY', '2100', 'Supplier payables', FALSE, FALSE, 52),
('MANUFACTURING', '2120', 'VAT Payable', 'LIABILITY', '2100', 'SARS VAT', FALSE, FALSE, 53),
('MANUFACTURING', '2130', 'PAYE/UIF Payable', 'LIABILITY', '2100', 'Payroll taxes', FALSE, FALSE, 54),

('MANUFACTURING', '2500', 'Long-term Liabilities', 'LIABILITY', '2000', 'Long-term debts', TRUE, FALSE, 70),
('MANUFACTURING', '2510', 'Bank Loan', 'LIABILITY', '2500', 'Equipment financing', FALSE, FALSE, 71),
('MANUFACTURING', '2520', 'Mortgage Payable', 'LIABILITY', '2500', 'Factory mortgage', FALSE, FALSE, 72),

-- EQUITY
('MANUFACTURING', '3000', 'Equity', 'EQUITY', NULL, 'Owner equity', TRUE, FALSE, 80),
('MANUFACTURING', '3100', 'Share Capital', 'EQUITY', '3000', 'Shareholder investment', FALSE, FALSE, 81),
('MANUFACTURING', '3300', 'Retained Earnings', 'EQUITY', '3000', 'Accumulated profit', FALSE, FALSE, 82),
('MANUFACTURING', '3900', 'Current Year Earnings', 'EQUITY', '3000', 'Current profit', FALSE, FALSE, 83),

-- REVENUE
('MANUFACTURING', '4000', 'Revenue', 'REVENUE', NULL, 'All income', TRUE, FALSE, 90),
('MANUFACTURING', '4100', 'Sales Revenue', 'REVENUE', '4000', 'Product sales', FALSE, TRUE, 91),
('MANUFACTURING', '4200', 'Contract Manufacturing', 'REVENUE', '4000', 'Manufacturing for others', FALSE, TRUE, 92),

-- COST OF GOODS MANUFACTURED
('MANUFACTURING', '5000', 'Cost of Goods Manufactured', 'EXPENSE', NULL, 'Direct production costs', TRUE, FALSE, 100),
('MANUFACTURING', '5100', 'Raw Materials', 'EXPENSE', '5000', 'Material purchases', FALSE, TRUE, 101),
('MANUFACTURING', '5200', 'Direct Labor', 'EXPENSE', '5000', 'Production workers wages', FALSE, FALSE, 102),
('MANUFACTURING', '5300', 'Factory Overhead', 'EXPENSE', '5000', 'Indirect production costs', FALSE, TRUE, 103),
('MANUFACTURING', '5400', 'Freight In', 'EXPENSE', '5000', 'Shipping on materials', FALSE, TRUE, 104),

-- OPERATING EXPENSES
('MANUFACTURING', '6000', 'Operating Expenses', 'EXPENSE', NULL, 'Operating costs', TRUE, FALSE, 110),
('MANUFACTURING', '6100', 'Salaries - Admin', 'EXPENSE', '6000', 'Admin staff', FALSE, FALSE, 111),
('MANUFACTURING', '6200', 'Salaries - Sales', 'EXPENSE', '6000', 'Sales team', FALSE, FALSE, 112),
('MANUFACTURING', '6300', 'Rent - Office', 'EXPENSE', '6000', 'Office space', FALSE, FALSE, 113),
('MANUFACTURING', '6400', 'Utilities - Office', 'EXPENSE', '6000', 'Office utilities', FALSE, FALSE, 114),
('MANUFACTURING', '6500', 'Utilities - Factory', 'EXPENSE', '6000', 'Factory power, water', FALSE, FALSE, 115),
('MANUFACTURING', '6600', 'Maintenance & Repairs', 'EXPENSE', '6000', 'Machine maintenance', FALSE, TRUE, 116),
('MANUFACTURING', '6700', 'Quality Control', 'EXPENSE', '6000', 'Testing, inspections', FALSE, TRUE, 117),
('MANUFACTURING', '6800', 'Research & Development', 'EXPENSE', '6000', 'Product development', FALSE, TRUE, 118),
('MANUFACTURING', '6900', 'Marketing & Sales', 'EXPENSE', '6000', 'Marketing costs', FALSE, TRUE, 119),
('MANUFACTURING', '7000', 'Shipping & Delivery', 'EXPENSE', '6000', 'Freight out to customers', FALSE, TRUE, 120),
('MANUFACTURING', '7100', 'Insurance - Factory', 'EXPENSE', '6000', 'Factory insurance', FALSE, FALSE, 121),
('MANUFACTURING', '7200', 'Safety & Compliance', 'EXPENSE', '6000', 'Safety equipment, audits', FALSE, TRUE, 122),

-- OTHER EXPENSES
('MANUFACTURING', '9000', 'Other Expenses', 'EXPENSE', NULL, 'Non-operating', TRUE, FALSE, 200),
('MANUFACTURING', '9100', 'Depreciation', 'EXPENSE', '9000', 'Asset depreciation', FALSE, FALSE, 201),
('MANUFACTURING', '9200', 'Interest Expense', 'EXPENSE', '9000', 'Loan interest', FALSE, FALSE, 202);

-- ========================================
-- TEMPLATES COMPLETE
-- ========================================

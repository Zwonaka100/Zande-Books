const supabase = window.supabase;

// ========================================
// GL INTEGRATION SETTINGS
// ========================================

const GLIntegrationSettings = {
  autoPostSales: true,
  autoPostPurchases: true,
  autoPostBanking: true,
  autoPostExpenses: true,
  requireConfirmation: false // Set to true if you want user confirmation before posting
};

// Function to check if auto-posting is enabled
function shouldAutoPostToGL(module) {
  const setting = GLIntegrationSettings[`autoPost${module.charAt(0).toUpperCase() + module.slice(1)}`];
  return setting === true;
}

// Function to get user confirmation if required
async function confirmGLPosting(module, amount) {
  if (!GLIntegrationSettings.requireConfirmation) return true;
  
  return confirm(`Post this ${module} transaction (R${amount.toFixed(2)}) to General Ledger?`);
}

// Make settings globally available
window.GLIntegrationSettings = GLIntegrationSettings;
window.shouldAutoPostToGL = shouldAutoPostToGL;
window.confirmGLPosting = confirmGLPosting;

// Navigation will be handled by initializeSectionHandlers() in DOMContentLoaded

// --- Customers Module Logic ---

// Wrap in function to be called after DOM is ready
function initializeCustomerModals() {
  // Open modal
  const addCustomerBtn = document.getElementById('addCustomerBtn');
  if (addCustomerBtn) {
    addCustomerBtn.onclick = function() {
      openCustomerModal();
    };
  }

  const closeCustomerModal = document.getElementById('closeCustomerModal');
  if (closeCustomerModal) {
    closeCustomerModal.onclick = function() {
      closeCustomerModal();
    };
  }
}

function openCustomerModal(customer = null) {
  document.getElementById('customerModal').style.display = 'block';
  document.getElementById('customerModalTitle').textContent = customer ? 'Edit Customer' : 'Add Customer';
  document.getElementById('customerForm').reset();
  document.getElementById('customerId').value = customer ? customer.id : '';
  document.getElementById('customerCode').value = customer ? customer.customer_code || '' : '';
  document.getElementById('customerName').value = customer ? customer.name || '' : '';
  document.getElementById('customerEmail').value = customer ? customer.email || '' : '';
  document.getElementById('customerPhone').value = customer ? customer.phone || '' : '';
  document.getElementById('customerAddress').value = customer ? customer.address || '' : '';
  document.getElementById('customerVat').value = customer ? customer.vat_number || '' : '';
  document.getElementById('customerCreditPeriod').value = customer ? customer.credit_period || 0 : 0;
  document.getElementById('customerCreditLimit').value = customer ? customer.credit_limit || 0 : 0;
}

function closeCustomerModal() {
  document.getElementById('customerModal').style.display = 'none';
}

// Handle form submit (add/edit)
document.getElementById('customerForm').onsubmit = async function(e) {
  e.preventDefault();
  console.log("Customer form submitted!");

  const id = document.getElementById('customerId').value;
  const customerCode = document.getElementById('customerCode').value;
  
  // Check if customer code already exists (for new customers)
  if (!id) {
    const { data: existingCustomer } = await supabase
      .from('customers')
      .select('id')
      .eq('customer_code', customerCode)
      .single();
      
    if (existingCustomer) {
      alert('Customer code already exists! Please use a different code.');
      return;
    }
  }

  const customer = {
    customer_code: customerCode,
    name: document.getElementById('customerName').value,
    email: document.getElementById('customerEmail').value,
    phone: document.getElementById('customerPhone').value,
    address: document.getElementById('customerAddress').value,
    vat_number: document.getElementById('customerVat').value,
    credit_period: Number(document.getElementById('customerCreditPeriod').value),
    credit_limit: Number(document.getElementById('customerCreditLimit').value)
  };

  let result;
  if (id) {
    result = await supabase.from('customers').update(customer).eq('id', id);
  } else {
    result = await supabase.from('customers').insert([customer]);
  }
  
  console.log("Supabase result:", result);
  
  if (result.error) {
    alert('Error saving customer: ' + result.error.message);
    return;
  }

  closeCustomerModal();
  loadCustomers();
};

// Load customers from Supabase
async function loadCustomers() {
  console.log("Loading customers...");
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .order('name', { ascending: true });
    
  console.log("Customers data:", data);
  console.log("Customers error:", error);
  
  const tbody = document.querySelector('#customersTable tbody');
  tbody.innerHTML = '';
  
  if (error) {
    console.error("Error loading customers:", error);
    tbody.innerHTML = '<tr><td colspan="9">Error loading customers</td></tr>';
    return;
  }
  
  if (data && data.length > 0) {
    data.forEach(cust => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${cust.customer_code || ''}</td>
        <td>${cust.name || ''}</td>
        <td>${cust.email || ''}</td>
        <td>${cust.phone || ''}</td>
        <td>${cust.address || ''}</td>
        <td>${cust.vat_number || ''}</td>
        <td>${cust.credit_period || 0}</td>
        <td>${cust.credit_limit || 0}</td>
        <td>
          <button class="zande-btn action-btn" title="Edit" onclick="editCustomer('${cust.id}')">
            <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l4 4-10 10H2v-4L12 2z"/></svg>
          </button>
          <button class="zande-btn action-btn" title="Delete" onclick="deleteCustomer('${cust.id}')">
            <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h12M9 6v8m-4 0h8a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H5a2 2 0 0 0 2 2v6a2 2 0 0 0 2 2z"/></svg>
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } else {
    tbody.innerHTML = '<tr><td colspan="9">No customers found</td></tr>';
  }
}

// Edit customer
window.editCustomer = async function(id) {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('id', id)
    .single();
  if (data) openCustomerModal(data);
};

// Delete customer
window.deleteCustomer = async function(id) {
  if (!confirm('Are you sure you want to delete this customer?')) return;
  await supabase
    .from('customers')
    .delete()
    .eq('id', id);
  loadCustomers();
};

// Load customers when Customers section is shown
const customersBtn = document.querySelector('[data-module="customers"]');
if (customersBtn) {
  customersBtn.addEventListener('click', loadCustomers);
}

// Export Functions
async function exportCustomersExcel() {
  const { data, error } = await supabase.from('customers').select('*').order('name', { ascending: true });
  if (error) {
    alert('Error fetching customers for export');
    return;
  }

  // Prepare data for Excel
  const excelData = data.map(customer => ({
    'Customer Code': customer.customer_code || '',
    'Customer Name': customer.name || '',
    'Email': customer.email || '',
    'Phone': customer.phone || '',
    'Address': customer.address || '',
    'VAT Number': customer.vat_number || '',
    'Credit Period (days)': customer.credit_period || 0,
    'Credit Limit': customer.credit_limit || 0
  }));

  // Create workbook and worksheet
  const ws = XLSX.utils.json_to_sheet(excelData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Customers');

  // Save file
  XLSX.writeFile(wb, `ZandeBooks_Customers_${new Date().toISOString().split('T')[0]}.xlsx`);
}

async function exportCustomersPdf() {
  const { data, error } = await supabase.from('customers').select('*').order('name', { ascending: true });
  if (error) {
    alert('Error fetching customers for export');
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  // Add title
  doc.setFontSize(18);
  doc.text('ZandeBooks - Customer List', 14, 22);
  doc.setFontSize(11);
  doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 32);

  // Prepare table data
  const tableData = data.map(customer => [
    customer.customer_code || '',
    customer.name || '',
    customer.email || '',
    customer.phone || '',
    customer.address || '',
    customer.vat_number || '',
    customer.credit_period || 0,
    customer.credit_limit || 0
  ]);

  // Create table
  doc.autoTable({
    head: [['Code', 'Name', 'Email', 'Phone', 'Address', 'VAT', 'Credit Days', 'Credit Limit']],
    body: tableData,
    startY: 40,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [11, 31, 58] }
  });

  // Save PDF
  doc.save(`ZandeBooks_Customers_${new Date().toISOString().split('T')[0]}.pdf`);
}

async function exportCustomersCsv() {
  const { data, error } = await supabase.from('customers').select('*').order('name', { ascending: true });
  if (error) {
    alert('Error fetching customers for export');
    return;
  }

  // Prepare CSV content
  const headers = ['Customer Code', 'Customer Name', 'Email', 'Phone', 'Address', 'VAT Number', 'Credit Period (days)', 'Credit Limit'];
  const csvContent = [
    headers.join(','),
    ...data.map(customer => [
      `"${customer.customer_code || ''}"`,
      `"${customer.name || ''}"`,
      `"${customer.email || ''}"`,
      `"${customer.phone || ''}"`,
      `"${customer.address || ''}"`,
      `"${customer.vat_number || ''}"`,
      customer.credit_period || 0,
      customer.credit_limit || 0
    ].join(','))
  ].join('\n');

  // Create and download file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `ZandeBooks_Customers_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Wire up export buttons
document.getElementById('exportCustomersExcel').onclick = exportCustomersExcel;
document.getElementById('exportCustomersPdf').onclick = exportCustomersPdf;
document.getElementById('exportCustomersCsv').onclick = exportCustomersCsv;

// --- Suppliers Module Logic ---

// Open modal
document.getElementById('addSupplierBtn').onclick = function() {
  openSupplierModal();
};

document.getElementById('closeSupplierModal').onclick = function() {
  closeSupplierModal();
};

function openSupplierModal(supplier = null) {
  document.getElementById('supplierModal').style.display = 'block';
  document.getElementById('supplierModalTitle').textContent = supplier ? 'Edit Supplier' : 'Add Supplier';
  document.getElementById('supplierForm').reset();
  
  // 🆕 Load expense accounts for default selection
  loadExpenseAccountsForSupplier();
  
  // Clear previous documents
  supplierUploadedDocuments = [];
  supplierExistingDocuments = [];
  updateSupplierDocumentPreview();
  
  // Populate basic fields
  document.getElementById('supplierId').value = supplier ? supplier.id : '';
  document.getElementById('supplierCode').value = supplier ? supplier.supplier_code || '' : '';
  document.getElementById('supplierName').value = supplier ? supplier.name || '' : '';
  document.getElementById('supplierEmail').value = supplier ? supplier.email || '' : '';
  document.getElementById('supplierPhone').value = supplier ? supplier.phone || '' : '';
  document.getElementById('supplierAddress').value = supplier ? supplier.address || '' : '';
  document.getElementById('supplierVat').value = supplier ? supplier.vat_number || '' : '';
  document.getElementById('supplierPaymentTerms').value = supplier ? supplier.payment_terms || 30 : 30;
  document.getElementById('supplierCreditLimit').value = supplier ? supplier.credit_limit || 0 : 0;
  
  // 🆕 Populate new integration fields
  document.getElementById('supplierDefaultExpenseAccount').value = supplier ? supplier.default_expense_account || '' : '';
  document.getElementById('supplierCurrency').value = supplier ? supplier.currency_code || 'ZAR' : 'ZAR';
  document.getElementById('supplierIsPreferred').checked = supplier ? supplier.is_preferred || false : false;
  
  // 🆕 Display supplier statistics
  if (supplier) {
    document.getElementById('supplierTotalSpent').textContent = `R${(supplier.total_spent_ytd || 0).toFixed(2)}`;
    document.getElementById('supplierAverageOrder').textContent = `R${(supplier.average_order_value || 0).toFixed(2)}`;
    document.getElementById('supplierLastOrder').textContent = supplier.last_order_date ? 
      new Date(supplier.last_order_date).toLocaleDateString() : 'Never';
      
    // 🆕 Load existing documents
    loadExistingSupplierDocuments(supplier.id);
  } else {
    document.getElementById('supplierTotalSpent').textContent = 'R0.00';
    document.getElementById('supplierAverageOrder').textContent = 'R0.00';
    document.getElementById('supplierLastOrder').textContent = 'Never';
  }
  
  // Handle bank details (existing logic)
  if (supplier && supplier.bank_details) {
    try {
      const bankDetails = JSON.parse(supplier.bank_details);
      document.getElementById('supplierBankName').value = bankDetails.bank_name || '';
      document.getElementById('supplierAccountNumber').value = bankDetails.account_number || '';
      document.getElementById('supplierBranchCode').value = bankDetails.branch_code || '';
      document.getElementById('supplierAccountType').value = bankDetails.account_type || '';
      document.getElementById('supplierSwiftCode').value = bankDetails.swift_code || '';
    } catch (e) {
      document.getElementById('supplierBankName').value = supplier.bank_details || '';
    }
  } else {
    // Clear banking fields
    document.getElementById('supplierBankName').value = '';
    document.getElementById('supplierAccountNumber').value = '';
    document.getElementById('supplierBranchCode').value = '';
    document.getElementById('supplierAccountType').value = '';
    document.getElementById('supplierSwiftCode').value = '';
  }
  
  // 🆕 Setup document upload listener
  const fileInput = document.getElementById('supplierDocuments');
  if (fileInput) {
    fileInput.onchange = handleSupplierDocumentUpload;
  }
}

function closeSupplierModal() {
  document.getElementById('supplierModal').style.display = 'none';
}

// Handle form submit (add/edit)
document.getElementById('supplierForm').onsubmit = async function(e) {
  e.preventDefault();
  console.log("Enhanced supplier form submitted with documents!");

  const id = document.getElementById('supplierId').value;
  const supplierCode = document.getElementById('supplierCode').value;
  
  // Check if supplier code already exists (for new suppliers)
  if (!id) {
    const { data: existingSupplier } = await supabase
      .from('suppliers')
      .select('id')
      .eq('supplier_code', supplierCode)
      .single();
      
    if (existingSupplier) {
      alert('Supplier code already exists! Please use a different code.');
      return;
    }
  }

  const supplier = {
    supplier_code: supplierCode,
    name: document.getElementById('supplierName').value,
    email: document.getElementById('supplierEmail').value,
    phone: document.getElementById('supplierPhone').value,
    address: document.getElementById('supplierAddress').value,
    vat_number: document.getElementById('supplierVat').value,
    payment_terms: Number(document.getElementById('supplierPaymentTerms').value),
    credit_limit: Number(document.getElementById('supplierCreditLimit').value),
    bank_details: JSON.stringify({
      bank_name: document.getElementById('supplierBankName').value,
      account_number: document.getElementById('supplierAccountNumber').value,
      branch_code: document.getElementById('supplierBranchCode').value,
      account_type: document.getElementById('supplierAccountType').value,
      swift_code: document.getElementById('supplierSwiftCode').value
    }),
    // 🆕 NEW INTEGRATION FIELDS
    default_expense_account: document.getElementById('supplierDefaultExpenseAccount').value || null,
    currency_code: document.getElementById('supplierCurrency').value,
    is_preferred: document.getElementById('supplierIsPreferred').checked
  };

  let result;
  if (id) {
    result = await supabase.from('suppliers').update(supplier).eq('id', id);
  } else {
    result = await supabase.from('suppliers').insert([supplier]).select().single();
  }
  
  console.log("Enhanced supplier save result:", result);
  
  if (result.error) {
    alert('Error saving supplier: ' + result.error.message);
    return;
  }

  // 🆕 Save document associations
  const supplierId = id || result.data.id;
  if (supplierUploadedDocuments.length > 0 || supplierExistingDocuments.some(d => d.marked_for_deletion)) {
    await saveSupplierDocumentAssociations(supplierId);
  }

  const action = id ? 'updated' : 'created';
  const documentCount = supplierUploadedDocuments.length;
  const documentMessage = documentCount > 0 ? ` with ${documentCount} document(s)` : '';
  
  showNotification(`✅ Supplier ${action} successfully${documentMessage}!`, 'success');
  
  // Clear document arrays
  supplierUploadedDocuments = [];
  supplierExistingDocuments = [];
  
  closeSupplierModal();
  loadSuppliers();
};

// Load suppliers from Supabase
async function loadSuppliers() {
  console.log("Loading suppliers...");
  const { data, error } = await supabase
    .from('suppliers')
    .select('*')
    .order('name', { ascending: true });
    
  console.log("Suppliers data:", data);
  console.log("Suppliers error:", error);
  
  const tbody = document.querySelector('#suppliersTable tbody');
  tbody.innerHTML = '';
  
  if (error) {
    console.error("Error loading suppliers:", error);
    tbody.innerHTML = '<tr><td colspan="9">Error loading suppliers</td></tr>';
    return;
  }
  
  if (data && data.length > 0) {
    data.forEach(supp => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${supp.supplier_code || ''}</td>
        <td>
          ${supp.name || ''}
          <div id="supplierDocIndicator_${supp.id}" style="margin-top: 4px;"></div>
        </td>
        <td>${supp.email || ''}</td>
        <td>${supp.phone || ''}</td>
        <td>${supp.address || ''}</td>
        <td>${supp.vat_number || ''}</td>
        <td>${supp.payment_terms || 30}</td>
        <td>${supp.credit_limit || 0}</td>
        <td>
          <button class="zande-btn action-btn" title="View Details" onclick="viewSupplier('${supp.id}')">
            <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
            <circle cx="12" cy="12" r="3"></circle>
            </svg>
          </button>
          <button class="zande-btn action-btn" title="View Documents" onclick="viewSupplierDocuments('${supp.id}')">
            <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002 2V8z"></path>
              <path d="M14 2v6h6"></path>
              <path d="M16 13H8"></path>
              <path d="M16 17H8"></path>
              <path d="M10 9H8"></path>
            </svg>
          </button>
          <button class="zande-btn action-btn" title="Edit" onclick="editSupplier('${supp.id}')">
            <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l4 4-10 10H2v-4L12 2z"/></svg>
          </button>
          <button class="zande-btn action-btn" title="Delete" onclick="deleteSupplier('${supp.id}')">
            <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h12M9 6v8m-4 0h8a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H5a2 2 0 0 0 2 2v6a2 2 0 0 0 2 2z"/></svg>
          </button>
        </td>
      `;
      tbody.appendChild(tr);
      
      // 🆕 Load document indicator
      loadSupplierDocumentIndicator(supp.id);
    });
  } else {
    tbody.innerHTML = '<tr><td colspan="9">No suppliers found</td></tr>';
  }
}

// Load supplier document indicator
async function loadSupplierDocumentIndicator(supplierId) {
  try {
    const { data, error } = await supabase
      .from('supplier_documents')
      .select('id, document_category, expiry_date')
      .eq('supplier_id', supplierId);
    
    const indicatorElement = document.getElementById(`supplierDocIndicator_${supplierId}`);
    if (indicatorElement && data) {
      const documentCount = data.length;
      const expiringDocs = data.filter(doc => {
        if (!doc.expiry_date) return false;
        const daysUntilExpiry = Math.ceil((new Date(doc.expiry_date) - new Date()) / (1000 * 60 * 60 * 24));
        return daysUntilExpiry <= 30;
      }).length;
      
      if (documentCount > 0) {
        let indicatorHTML = `
          <span style="background: #059669; color: white; padding: 2px 6px; border-radius: 10px; font-size: 0.75em; margin-right: 4px;">
            📄 ${documentCount} doc${documentCount > 1 ? 's' : ''}
          </span>
        `;
        
        if (expiringDocs > 0) {
          indicatorHTML += `
            <span style="background: #dc2626; color: white; padding: 2px 6px; border-radius: 10px; font-size: 0.75em;">
              ⚠️ ${expiringDocs} expiring
            </span>
          `;
        }
        
        indicatorElement.innerHTML = indicatorHTML;
      }
    }
  } catch (error) {
    // Silently handle error - table might not exist yet
    console.log('Document indicator load error (table may not exist):', error);
  }
}

// View supplier documents
async function viewSupplierDocuments(supplierId) {
  try {
    const { data: supplier } = await supabase
      .from('suppliers')
      .select('name, supplier_code')
      .eq('id', supplierId)
      .single();
      
    const { data: documents, error } = await supabase
      .from('supplier_documents')
      .select('*')
      .eq('supplier_id', supplierId)
      .order('uploaded_at', { ascending: false });
    
    if (error) {
      console.error('Error loading supplier documents:', error);
      showNotification('Error loading documents', 'error');
      return;
    }
    
    if (!documents || documents.length === 0) {
      showNotification('No documents found for this supplier', 'info');
      return;
    }
    
    showSupplierDocumentsModal(documents, supplier);
    
  } catch (error) {
    console.error('Error in viewSupplierDocuments:', error);
    showNotification('Error viewing documents', 'error');
  }
}

// Show supplier documents modal
function showSupplierDocumentsModal(documents, supplier) {
  // Remove existing modal if any
  const existingModal = document.getElementById('supplierDocumentsModal');
  if (existingModal) {
    existingModal.remove();
  }
  
  const modal = document.createElement('div');
  modal.id = 'supplierDocumentsModal';
  modal.className = 'zande-modal';
  modal.style.display = 'block';
  modal.innerHTML = `
    <div class="zande-modal-content" style="max-width: 800px;">
      <div class="modal-header">
        <h3>📄 Documents for ${supplier.supplier_code} - ${supplier.name}</h3>
        <span class="close" onclick="document.getElementById('supplierDocumentsModal').remove()">&times;</span>
      </div>
      
      <div style="margin: 20px 0;">
        <p><strong>Found ${documents.length} document(s):</strong></p>
        
        <div style="display: grid; gap: 12px; margin-top: 15px; max-height: 400px; overflow-y: auto;">
          ${documents.map(doc => {
            const categoryIcon = getSupplierDocumentIcon(doc.document_category);
            const fileIcon = getFileIcon(doc.file_type);
            const expiryWarning = checkDocumentExpiry(doc.expiry_date);
            
            return `
              <div style="display: flex; align-items: center; justify-content: space-between; padding: 15px; border: 1px solid #e5e7eb; border-radius: 8px; background: white;">
                <div style="display: flex; align-items: center;">
                  <span style="font-size: 32px; margin-right: 15px;">${categoryIcon}${fileIcon}</span>
                  <div>
                    <div style="font-weight: 600; color: #111;">${doc.file_name}</div>
                    <div style="color: #666; font-size: 0.9em; margin-top: 4px;">
                      ${getCategoryDisplayName(doc.document_category)} • 
                      ${formatFileSize(doc.file_size)} • 
                      Uploaded ${new Date(doc.uploaded_at).toLocaleDateString()}
                      ${doc.uploaded_by ? ` by ${doc.uploaded_by}` : ''}
                    </div>
                    ${doc.expiry_date ? `
                      <div style="color: ${expiryWarning ? '#dc2626' : '#666'}; font-size: 0.9em; margin-top: 2px;">
                        📅 Expires: ${new Date(doc.expiry_date).toLocaleDateString()}
                        ${expiryWarning ? ` ${expiryWarning}` : ''}
                      </div>
                    ` : ''}
                  </div>
                </div>
                <button onclick="downloadSupplierDocument('${doc.file_path}', '${doc.file_name}')" 
                        style="padding: 10px 20px; background: #059669; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500;">
                  📥 Download
                </button>
              </div>
            `;
          }).join('')}
        </div>
      </div>
      
      <div class="modal-footer">
        <button onclick="document.getElementById('supplierDocumentsModal').remove()" class="zande-btn secondary">Close</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
}

// Edit supplier
window.editSupplier = async function(id) {
  const { data, error } = await supabase
    .from('suppliers')
    .select('*')
    .eq('id', id)
    .single();
  if (data) openSupplierModal(data);
};

// Delete supplier
window.deleteSupplier = async function(id) {
  if (!confirm('Are you sure you want to delete this supplier?')) return;
  await supabase
    .from('suppliers')
    .delete()
    .eq('id', id);
  loadSuppliers();
};

// Load suppliers when Suppliers section is shown
const suppliersBtn = document.querySelector('[data-module="suppliers"]');
if (suppliersBtn) {
  suppliersBtn.addEventListener('click', loadSuppliers);
}

// Supplier Export Functions
async function exportSuppliersExcel() {
  const { data, error } = await supabase.from('suppliers').select('*').order('name', { ascending: true });
  if (error) {
    alert('Error fetching suppliers for export');
    return;
  }

  const excelData = data.map(supplier => ({
    'Supplier Code': supplier.supplier_code || '',
    'Supplier Name': supplier.name || '',
    'Email': supplier.email || '',
    'Phone': supplier.phone || '',
    'Address': supplier.address || '',
    'VAT Number': supplier.vat_number || '',
    'Payment Terms (days)': supplier.payment_terms || 30,
    'Credit Limit': supplier.credit_limit || 0,
    'Bank Details': supplier.bank_details || ''
  }));

  const ws = XLSX.utils.json_to_sheet(excelData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Suppliers');
  XLSX.writeFile(wb, `ZandeBooks_Suppliers_${new Date().toISOString().split('T')[0]}.xlsx`);
}

async function exportSuppliersPdf() {
  const { data, error } = await supabase.from('suppliers').select('*').order('name', { ascending: true });
  if (error) {
    alert('Error fetching suppliers for export');
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.text('ZandeBooks - Supplier List', 14, 22);
  doc.setFontSize(11);
  doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 32);

  const tableData = data.map(supplier => [
    supplier.supplier_code || '',
    supplier.name || '',
    supplier.email || '',
    supplier.phone || '',
    supplier.vat_number || '',
    supplier.payment_terms || 30,
    supplier.credit_limit || 0
  ]);

  doc.autoTable({
    head: [['Code', 'Name', 'Email', 'Phone', 'VAT', 'Payment Terms', 'Credit Limit']],
    body: tableData,
    startY: 40,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [11, 31, 58] }
  });

  doc.save(`ZandeBooks_Suppliers_${new Date().toISOString().split('T')[0]}.pdf`);
}

async function exportSuppliersCsv() {
  const { data, error } = await supabase.from('suppliers').select('*').order('name', { ascending: true });
  if (error) {
    alert('Error fetching suppliers for export');
    return;
  }

  const headers = ['Supplier Code', 'Supplier Name', 'Email', 'Phone', 'Address', 'VAT Number', 'Payment Terms (days)', 'Credit Limit', 'Bank Details'];
  const csvContent = [
    headers.join(','),
    ...data.map(supplier => [
      `"${supplier.supplier_code || ''}"`,
      `"${supplier.name || ''}"`,
      `"${supplier.email || ''}"`,
      `"${supplier.phone || ''}"`,
      `"${supplier.address || ''}"`,
      `"${supplier.vat_number || ''}"`,
      supplier.payment_terms || 30,
      supplier.credit_limit || 0,
      `"${supplier.bank_details || ''}"`
    ].join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `ZandeBooks_Suppliers_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}


async function loadExpenseAccountsForSupplier() {
  try {
    console.log('🗂️ Loading expense accounts for supplier default...');
    
    // Ensure Chart of Accounts is loaded
    await loadChartOfAccounts();
    
    // Get all expense accounts from COA
    const expenseAccounts = (chartOfAccounts || chartOfAccountsData || [])
      .filter(account => account.account_type === 'Expense' && account.is_active !== false)
      .sort((a, b) => (a.account_code || a.code).localeCompare(b.account_code || b.code));
    
    const expenseAccountSelect = document.getElementById('supplierDefaultExpenseAccount');
    if (expenseAccountSelect) {
      expenseAccountSelect.innerHTML = '<option value="">No Default Account</option>';
      
      // Group by category if available
      const categories = [...new Set(expenseAccounts.map(acc => acc.account_category).filter(cat => cat))];
      
      if (categories.length > 0) {
        categories.forEach(category => {
          const categoryAccounts = expenseAccounts.filter(acc => acc.account_category === category);
          if (categoryAccounts.length > 0) {
            const optgroup = document.createElement('optgroup');
            optgroup.label = category;
            
            categoryAccounts.forEach(account => {
              const option = document.createElement('option');
              const accountCode = account.account_code || account.code;
              const accountName = account.account_name || account.name;
              option.value = accountCode;
              option.textContent = `${accountCode} - ${accountName}`;
              optgroup.appendChild(option);
            });
            
            expenseAccountSelect.appendChild(optgroup);
          }
        });
      }
      
      // Add uncategorized accounts
      const uncategorized = expenseAccounts.filter(acc => !acc.account_category);
      if (uncategorized.length > 0) {
        if (categories.length > 0) {
          const optgroup = document.createElement('optgroup');
          optgroup.label = 'Other Expenses';
          
          uncategorized.forEach(account => {
            const option = document.createElement('option');
            const accountCode = account.account_code || account.code;
            const accountName = account.account_name || account.name;
            option.value = accountCode;
            option.textContent = `${accountCode} - ${accountName}`;
            optgroup.appendChild(option);
          });
          
          expenseAccountSelect.appendChild(optgroup);
        } else {
          uncategorized.forEach(account => {
            const option = document.createElement('option');
            const accountCode = account.account_code || account.code;
            const accountName = account.account_name || account.name;
            option.value = accountCode;
            option.textContent = `${accountCode} - ${accountName}`;
            expenseAccountSelect.appendChild(option);
          });
        }
      }
    }
    
    console.log(`✅ Loaded ${expenseAccounts.length} expense accounts for supplier default`);
    
  } catch (error) {
    console.error('❌ Error loading expense accounts for supplier:', error);
  }
}

// Supplier Document Management
let supplierUploadedDocuments = [];
let supplierExistingDocuments = [];

// Handle supplier document upload
function handleSupplierDocumentUpload() {
  const fileInput = document.getElementById('supplierDocuments');
  const files = fileInput.files;
  
  if (files.length === 0) return;
  
  console.log(`📎 Selected ${files.length} document(s) for supplier`);
  
  // Validate files
  const maxSize = 10 * 1024 * 1024; // 10MB
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'text/plain',
    'text/csv'
  ];
  
  const validFiles = [];
  const errors = [];
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    
    // Check file size
    if (file.size > maxSize) {
      errors.push(`${file.name}: File too large (max 10MB)`);
      continue;
    }
    
    // Check file type
    if (!allowedTypes.includes(file.type)) {
      errors.push(`${file.name}: Unsupported file type`);
      continue;
    }
    
    validFiles.push(file);
  }
  
  if (errors.length > 0) {
    alert('Some files were rejected:\n' + errors.join('\n'));
  }
  
  if (validFiles.length > 0) {
    uploadSupplierDocuments(validFiles);
  }
}

// Upload supplier documents to Supabase Storage
async function uploadSupplierDocuments(files) {
  const progressBar = document.getElementById('supplierProgressBar');
  const uploadStatus = document.getElementById('supplierUploadStatus');
  const uploadProgress = document.getElementById('supplierUploadProgress');
  
  uploadProgress.style.display = 'block';
  uploadStatus.textContent = 'Preparing upload...';
  
  const category = document.getElementById('supplierDocumentCategory').value || 'other';
  const expiryDate = document.getElementById('supplierDocumentExpiry').value;
  
  try {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Update progress
      const progress = ((i + 1) / files.length) * 100;
      progressBar.style.width = `${progress}%`;
      uploadStatus.textContent = `Uploading ${file.name}... (${i + 1}/${files.length})`;
      
      // Generate unique filename
      const timestamp = Date.now();
      const fileExtension = file.name.split('.').pop();
      const uniqueFileName = `supplier_${timestamp}_${Math.random().toString(36).substr(2, 9)}.${fileExtension}`;
      
      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('supplier-documents')
        .upload(`documents/${uniqueFileName}`, file, {
          cacheControl: '3600',
          upsert: false
        });
      
      if (error) {
        console.error('Upload error for', file.name, ':', error);
        throw new Error(`Failed to upload ${file.name}: ${error.message}`);
      }
      
      // Store document information
      const documentInfo = {
        id: Math.random().toString(36).substr(2, 9), // Temporary ID
        file_name: file.name,
        file_path: data.path,
        file_size: file.size,
        file_type: file.type,
        document_category: category,
        expiry_date: expiryDate || null,
        uploaded_at: new Date().toISOString(),
        is_new: true // Flag for new uploads
      };
      
      supplierUploadedDocuments.push(documentInfo);
      
      console.log('✅ Uploaded:', file.name, '→', data.path);
    }
    
    uploadStatus.textContent = 'Upload completed successfully!';
    setTimeout(() => {
      uploadProgress.style.display = 'none';
    }, 2000);
    
    // Update document preview
    updateSupplierDocumentPreview();
    showNotification(`${files.length} document(s) uploaded successfully!`, 'success');
    
    // Clear form fields
    document.getElementById('supplierDocumentCategory').value = '';
    document.getElementById('supplierDocumentExpiry').value = '';
    
  } catch (error) {
    console.error('❌ Upload failed:', error);
    uploadStatus.textContent = 'Upload failed: ' + error.message;
    uploadStatus.style.color = '#dc2626';
    showNotification('Document upload failed: ' + error.message, 'error');
  }
}

// Update supplier document preview
function updateSupplierDocumentPreview() {
  const documentPreview = document.getElementById('supplierDocumentPreview');
  const documentList = document.getElementById('supplierDocumentList');
  
  const allDocuments = [...supplierExistingDocuments, ...supplierUploadedDocuments];
  
  if (allDocuments.length === 0) {
    documentPreview.style.display = 'none';
    return;
  }
  
  documentPreview.style.display = 'block';
  documentList.innerHTML = '';
  
  allDocuments.forEach((doc, index) => {
    const documentItem = document.createElement('div');
    documentItem.style.cssText = `
      display: flex; 
      align-items: center; 
      justify-content: space-between; 
      padding: 12px; 
      border: 1px solid #e5e7eb; 
      border-radius: 8px; 
      margin-bottom: 8px; 
      background: ${doc.is_new ? '#f0fdf4' : '#ffffff'};
    `;
    
    const categoryIcon = getSupplierDocumentIcon(doc.document_category);
    const fileIcon = getFileIcon(doc.file_type);
    const fileSize = formatFileSize(doc.file_size);
    
    // Check if document is expiring soon
    const expiryWarning = checkDocumentExpiry(doc.expiry_date);
    
    documentItem.innerHTML = `
      <div style="display: flex; align-items: center;">
        <span style="font-size: 24px; margin-right: 12px;">${categoryIcon}${fileIcon}</span>
        <div>
          <div style="font-weight: 500; color: #111;">
            ${doc.file_name}
            ${doc.is_new ? '<span style="background: #059669; color: white; padding: 2px 6px; border-radius: 10px; font-size: 0.7em; margin-left: 8px;">NEW</span>' : ''}
          </div>
          <small style="color: #666;">
            ${getCategoryDisplayName(doc.document_category)} • ${fileSize}
            ${doc.expiry_date ? ` • Expires: ${new Date(doc.expiry_date).toLocaleDateString()}` : ''}
            ${expiryWarning ? ` <span style="color: #dc2626; font-weight: 600;">${expiryWarning}</span>` : ''}
          </small>
        </div>
      </div>
      <div>
        ${!doc.is_new ? `
          <button onclick="downloadSupplierDocument('${doc.file_path}', '${doc.file_name}')" 
                  style="padding: 6px 12px; margin-right: 8px; border: 1px solid #059669; background: white; color: #059669; border-radius: 6px; cursor: pointer; font-size: 0.8em;">
            📥 Download
          </button>
        ` : ''}
        <button onclick="removeSupplierDocument(${index}, ${doc.is_new ? 'true' : 'false'})" 
                style="padding: 6px 12px; border: 1px solid #dc2626; background: white; color: #dc2626; border-radius: 6px; cursor: pointer; font-size: 0.8em;">
          🗑️ Remove
        </button>
      </div>
    `;
    
    documentList.appendChild(documentItem);
  });
}

// Get supplier document category icon
function getSupplierDocumentIcon(category) {
  const icons = {
    rental_agreement: '🏢',
    insurance_policy: '🛡️',
    terms_conditions: '📋',
    service_agreement: '🤝',
    tax_documents: '🧾',
    banking_details: '🏦',
    business_registration: '📄',
    compliance_certificates: '✅',
    other: '📎'
  };
  return icons[category] || '📎';
}

// Get category display name
function getCategoryDisplayName(category) {
  const names = {
    rental_agreement: 'Rental Agreement',
    insurance_policy: 'Insurance Policy',
    terms_conditions: 'Terms & Conditions',
    service_agreement: 'Service Agreement',
    tax_documents: 'Tax Documents',
    banking_details: 'Banking Details',
    business_registration: 'Business Registration',
    compliance_certificates: 'Compliance Certificates',
    other: 'Other Documents'
  };
  return names[category] || 'Document';
}

// Check document expiry
function checkDocumentExpiry(expiryDate) {
  if (!expiryDate) return null;
  
  const today = new Date();
  const expiry = new Date(expiryDate);
  const daysUntilExpiry = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
  
  if (daysUntilExpiry < 0) {
    return '⚠️ EXPIRED';
  } else if (daysUntilExpiry <= 30) {
    return `⚠️ Expires in ${daysUntilExpiry} days`;
  }
  
  return null;
}

// Download supplier document
async function downloadSupplierDocument(filePath, fileName) {
  try {
    const { data, error } = await supabase.storage
      .from('supplier-documents')
      .download(filePath);
    
    if (error) throw error;
    
    // Create download link
    const url = URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showNotification(`Downloaded: ${fileName}`, 'success');
    
  } catch (error) {
    console.error('Download error:', error);
    showNotification('Download failed: ' + error.message, 'error');
  }
}

// Remove supplier document
function removeSupplierDocument(index, isNew) {
  if (isNew === 'true' || isNew === true) {
    // Remove from uploaded documents
    const docIndex = index - supplierExistingDocuments.length;
    if (docIndex >= 0 && docIndex < supplierUploadedDocuments.length) {
      const removedDoc = supplierUploadedDocuments.splice(docIndex, 1)[0];
      console.log('🗑️ Removed uploaded document:', removedDoc.file_name);
      
      // Delete from storage immediately
      deleteSupplierDocumentFromStorage(removedDoc.file_path);
    }
  } else {
    // Mark existing document for deletion
    if (index < supplierExistingDocuments.length) {
      supplierExistingDocuments[index].marked_for_deletion = true;
      console.log('🗑️ Marked existing document for deletion:', supplierExistingDocuments[index].file_name);
    }
  }
  
  updateSupplierDocumentPreview();
}

// Delete document from storage
async function deleteSupplierDocumentFromStorage(filePath) {
  try {
    const { error } = await supabase.storage
      .from('supplier-documents')
      .remove([filePath]);
    
    if (error) {
      console.error('Storage deletion error:', error);
    } else {
      console.log('✅ Deleted from storage:', filePath);
    }
  } catch (error) {
    console.error('Error deleting from storage:', error);
  }
}

// Load existing supplier documents
async function loadExistingSupplierDocuments(supplierId) {
  try {
    const { data, error } = await supabase
      .from('supplier_documents')
      .select('*')
      .eq('supplier_id', supplierId)
      .order('uploaded_at', { ascending: false });
    
    if (error && error.code !== 'PGRST116') {
      console.error('Error loading existing documents:', error);
      return;
    }
    
    supplierExistingDocuments = data || [];
    supplierUploadedDocuments = []; // Clear uploaded documents when editing
    updateSupplierDocumentPreview();
    
    console.log(`📁 Loaded ${supplierExistingDocuments.length} existing documents for supplier ${supplierId}`);
    
  } catch (error) {
    console.error('Error in loadExistingSupplierDocuments:', error);
    supplierExistingDocuments = [];
  }
}

// Save supplier document associations
async function saveSupplierDocumentAssociations(supplierId) {
  try {
    console.log('💾 Saving document associations for supplier:', supplierId);
    
    // Save new document uploads
    if (supplierUploadedDocuments.length > 0) {
      const documentRecords = supplierUploadedDocuments.map(doc => ({
        supplier_id: supplierId,
        file_name: doc.file_name,
        file_path: doc.file_path,
        file_size: doc.file_size,
        file_type: doc.file_type,
        document_category: doc.document_category,
        expiry_date: doc.expiry_date,
        uploaded_at: doc.uploaded_at,
        uploaded_by: 'Current User'
      }));
      
      const { error: insertError } = await supabase
        .from('supplier_documents')
        .insert(documentRecords);
      
      if (insertError) {
        console.error('Error saving document records:', insertError);
        showNotification('Supplier saved but document associations failed', 'warning');
      } else {
        console.log(`✅ Saved ${documentRecords.length} document associations`);
      }
    }
    
    // Handle document deletions
    const documentsToDelete = supplierExistingDocuments.filter(doc => doc.marked_for_deletion);
    if (documentsToDelete.length > 0) {
      for (const doc of documentsToDelete) {
        // Delete from database
        await supabase
          .from('supplier_documents')
          .delete()
          .eq('id', doc.id);
        
        // Delete from storage
        await deleteSupplierDocumentFromStorage(doc.file_path);
      }
      
      console.log(`🗑️ Deleted ${documentsToDelete.length} documents`);
    }
    
  } catch (error) {
    console.error('Error saving document associations:', error);
    showNotification('Documents uploaded but associations may not be saved properly', 'warning');
  }
}

// Wire up supplier export buttons
document.getElementById('exportSuppliersExcel').onclick = exportSuppliersExcel;
document.getElementById('exportSuppliersPdf').onclick = exportSuppliersPdf;
document.getElementById('exportSuppliersCsv').onclick = exportSuppliersCsv;

// View supplier details
window.viewSupplier = async function(id) {
  const { data, error } = await supabase
    .from('suppliers')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error || !data) {
    alert('Error loading supplier details');
    return;
  }
  
  // Fill basic information
  document.getElementById('viewSupplierCode').textContent = data.supplier_code || 'N/A';
  document.getElementById('viewSupplierName').textContent = data.name || 'N/A';
  document.getElementById('viewSupplierEmail').textContent = data.email || 'N/A';
  document.getElementById('viewSupplierPhone').textContent = data.phone || 'N/A';
  document.getElementById('viewSupplierAddress').textContent = data.address || 'N/A';
  document.getElementById('viewSupplierVat').textContent = data.vat_number || 'N/A';
  document.getElementById('viewSupplierPaymentTerms').textContent = data.payment_terms || 30;
  document.getElementById('viewSupplierCreditLimit').textContent = data.credit_limit || 0;
  
  // Fill banking details
  if (data.bank_details) {
    try {
      const bankDetails = JSON.parse(data.bank_details);
      document.getElementById('viewBankName').textContent = bankDetails.bank_name || 'N/A';
      document.getElementById('viewAccountNumber').textContent = bankDetails.account_number || 'N/A';
      document.getElementById('viewBranchCode').textContent = bankDetails.branch_code || 'N/A';
      document.getElementById('viewAccountType').textContent = bankDetails.account_type || 'N/A';
      document.getElementById('viewSwiftCode').textContent = bankDetails.swift_code || 'N/A';
    } catch (e) {
      // If bank_details is not JSON (old format)
      document.getElementById('viewBankName').textContent = data.bank_details || 'N/A';
      document.getElementById('viewAccountNumber').textContent = 'N/A';
      document.getElementById('viewBranchCode').textContent = 'N/A';
      document.getElementById('viewAccountType').textContent = 'N/A';
      document.getElementById('viewSwiftCode').textContent = 'N/A';
    }
  } else {
    // No banking details
    document.getElementById('viewBankName').textContent = 'N/A';
    document.getElementById('viewAccountNumber').textContent = 'N/A';
    document.getElementById('viewBranchCode').textContent = 'N/A';
    document.getElementById('viewAccountType').textContent = 'N/A';
    document.getElementById('viewSwiftCode').textContent = 'N/A';
  }
  
  // Show the modal
  document.getElementById('viewSupplierModal').style.display = 'block';
};

// Close view modal
function closeViewSupplierModal() {
  document.getElementById('viewSupplierModal').style.display = 'none';
}

// Wire up the close button
document.getElementById('closeViewSupplierModal').onclick = closeViewSupplierModal;

// --- Products & Services Module Logic ---

// Open modal
document.getElementById('addProductBtn').onclick = function() {
  openProductModal();
};

document.getElementById('closeProductModal').onclick = function() {
  closeProductModal();
};

// Show/hide stock fields based on category
document.getElementById('productCategory').onchange = function() {
  const stockFields = document.getElementById('stockFields');
  if (this.value === 'Product') {
    stockFields.style.display = 'block';
  } else {
    stockFields.style.display = 'none';
  }
};

function openProductModal(product = null) {
  document.getElementById('productModal').style.display = 'block';
  document.getElementById('productModalTitle').textContent = product ? 'Edit Product/Service' : 'Add Product/Service';
  document.getElementById('productForm').reset();
  document.getElementById('productId').value = product ? product.id : '';
  document.getElementById('productCode').value = product ? product.product_code || '' : '';
  document.getElementById('productName').value = product ? product.name || '' : '';
  document.getElementById('productDescription').value = product ? product.description || '' : '';
  document.getElementById('productCategory').value = product ? product.category || '' : '';
  document.getElementById('productUnit').value = product ? product.unit_of_measure || 'Each' : 'Each';
  document.getElementById('productTaxCode').value = product ? product.tax_code || 'Standard' : 'Standard';
  document.getElementById('productCostPrice').value = product ? product.cost_price || 0 : 0;
  document.getElementById('productSellPrice').value = product ? product.sell_price || 0 : 0;
  document.getElementById('productStock').value = product ? product.stock_quantity || 0 : 0;
  document.getElementById('productReorderLevel').value = product ? product.reorder_level || 0 : 0;
  document.getElementById('productStatus').value = product ? product.is_active : 'true';
  
  // Show/hide stock fields based on category
  const stockFields = document.getElementById('stockFields');
  if (product && product.category === 'Product') {
    stockFields.style.display = 'block';
  } else {
    stockFields.style.display = 'none';
  }
}

function closeProductModal() {
  document.getElementById('productModal').style.display = 'none';
}

// Handle form submit (add/edit)
document.getElementById('productForm').onsubmit = async function(e) {
  e.preventDefault();
  console.log("Product form submitted!");

  const id = document.getElementById('productId').value;
  const productCode = document.getElementById('productCode').value;
  
  // Check if product code already exists (for new products)
  if (!id) {
    const { data: existingProduct } = await supabase
      .from('products')
      .select('id')
      .eq('product_code', productCode)
      .single();
      
    if (existingProduct) {
      alert('Product/Service code already exists! Please use a different code.');
      return;
    }
  }

  const category = document.getElementById('productCategory').value;
  const product = {
    product_code: productCode,
    name: document.getElementById('productName').value,
    description: document.getElementById('productDescription').value,
    category: category,
    unit_of_measure: document.getElementById('productUnit').value,
    tax_code: document.getElementById('productTaxCode').value,
    cost_price: Number(document.getElementById('productCostPrice').value),
    sell_price: Number(document.getElementById('productSellPrice').value),
    stock_quantity: category === 'Product' ? Number(document.getElementById('productStock').value) : 0,
    reorder_level: category === 'Product' ? Number(document.getElementById('productReorderLevel').value) : 0,
    is_active: document.getElementById('productStatus').value === 'true'
  };

  let result;
  if (id) {
    result = await supabase.from('products').update(product).eq('id', id);
  } else {
    result = await supabase.from('products').insert([product]);
  }
  
  console.log("Supabase result:", result);
  
  if (result.error) {
    alert('Error saving product/service: ' + result.error.message);
    return;
  }

  closeProductModal();
  loadProducts();
};

// Load products from Supabase
async function loadProducts() {
  console.log("Loading products...");
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('name', { ascending: true });
    
  console.log("Products data:", data);
  console.log("Products error:", error);
  
  const tbody = document.querySelector('#productsTable tbody');
  tbody.innerHTML = '';
  
  if (error) {
    console.error("Error loading products:", error);
    tbody.innerHTML = '<tr><td colspan="9">Error loading products</td></tr>';
    return;
  }
  
  if (data && data.length > 0) {
    data.forEach(prod => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${prod.product_code || ''}</td>
        <td>${prod.name || ''}</td>
        <td>${prod.category || ''}</td>
        <td>${prod.unit_of_measure || ''}</td>
        <td>${prod.tax_code || 'Standard'}</td>
        <td>${prod.cost_price || 0}</td>
        <td>${prod.sell_price || 0}</td>
        <td>${prod.category === 'Product' ? (prod.stock_quantity || 0) : 'N/A'}</td>
        <td><span class="${prod.is_active ? 'status-active' : 'status-inactive'}">${prod.is_active ? 'Active' : 'Inactive'}</span></td>
        <td>
          <button class="zande-btn action-btn" title="View Details" onclick="viewProduct('${prod.id}')">
            <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
          </button>
          <button class="zande-btn action-btn" title="Edit" onclick="editProduct('${prod.id}')">
            <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l4 4-10 10H2v-4L12 2z"/></svg>
          </button>
          <button class="zande-btn action-btn" title="Delete" onclick="deleteProduct('${prod.id}')">
            <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h12M9 6v8m-4 0h8a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H5a2 2 0 0 0 2 2v6a2 2 0 0 0 2 2z"/></svg>
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } else {
    tbody.innerHTML = '<tr><td colspan="9">No products/services found</td></tr>';
  }
}

// Edit product
window.editProduct = async function(id) {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .single();
  if (data) openProductModal(data);
};

// Delete product
window.deleteProduct = async function(id) {
  if (!confirm('Are you sure you want to delete this product/service?')) return;
  await supabase
    .from('products')
    .delete()
    .eq('id', id);
  loadProducts();
};

// View product details
window.viewProduct = async function(id) {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error || !data) {
    alert('Error loading product details');
    return;
  }
  
  // Fill basic information
  document.getElementById('viewProductCode').textContent = data.product_code || 'N/A';
  document.getElementById('viewProductName').textContent = data.name || 'N/A';
  document.getElementById('viewProductDescription').textContent = data.description || 'N/A';
  document.getElementById('viewProductCategory').textContent = data.category || 'N/A';
  document.getElementById('viewProductUnit').textContent = data.unit_of_measure || 'N/A';
  document.getElementById('viewProductTaxCode').textContent = data.tax_code || 'Standard';
  document.getElementById('viewProductCostPrice').textContent = data.cost_price || 0;
  document.getElementById('viewProductSellPrice').textContent = data.sell_price || 0;
  document.getElementById('viewProductStock').textContent = data.stock_quantity || 0;
  document.getElementById('viewProductReorderLevel').textContent = data.reorder_level || 0;
  document.getElementById('viewProductStatus').textContent = data.is_active ? 'Active' : 'Inactive';
  
  // Show/hide stock fields for services
  const stockSection = document.getElementById('viewStockSection');
  const reorderSection = document.getElementById('viewReorderSection');
  if (data.category === 'Service') {
    stockSection.style.display = 'none';
    reorderSection.style.display = 'none';
  } else {
    stockSection.style.display = 'block';
    reorderSection.style.display = 'block';
  }
  
  // Show the modal
  document.getElementById('viewProductModal').style.display = 'block';
};

// Close view modal
function closeViewProductModal() {
  document.getElementById('viewProductModal').style.display = 'none';
}

// Wire up the close button
document.getElementById('closeViewProductModal').onclick = closeViewProductModal;

// Load products when Products section is shown
const productsBtn = document.querySelector('[data-module="products"]');
if (productsBtn) {
  productsBtn.addEventListener('click', loadProducts);
}

// Products Export Functions
async function exportProductsExcel() {
  const { data, error } = await supabase.from('products').select('*').order('name', { ascending: true });
  if (error) {
    alert('Error fetching products for export');
    return;
  }

  const excelData = data.map(product => ({
    'Product Code': product.product_code || '',
    'Name': product.name || '',
    'Description': product.description || '',
    'Category': product.category || '',
    'Unit of Measure': product.unit_of_measure || '',
    'Tax Code': product.tax_code || 'Standard',
    'Cost Price': product.cost_price || 0,
    'Sell Price': product.sell_price || 0,
    'Stock Quantity': product.category === 'Product' ? (product.stock_quantity || 0) : 'N/A',
    'Reorder Level': product.category === 'Product' ? (product.reorder_level || 0) : 'N/A',
    'Status': product.is_active ? 'Active' : 'Inactive'
  }));

  const ws = XLSX.utils.json_to_sheet(excelData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Products & Services');
  XLSX.writeFile(wb, `ZandeBooks_Products_${new Date().toISOString().split('T')[0]}.xlsx`);
}

async function exportProductsPdf() {
  const { data, error } = await supabase.from('products').select('*').order('name', { ascending: true });
  if (error) {
    alert('Error fetching products for export');
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.text('ZandeBooks - Products & Services List', 14, 22);
  doc.setFontSize(11);
  doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 32);

  // Separate products and services
  const products = data.filter(item => item.category === 'Product');
  const services = data.filter(item => item.category === 'Service');

  let yPosition = 45;

  // Products table
  if (products.length > 0) {
    doc.setFontSize(14);
    doc.text('Products', 14, yPosition);
    yPosition += 10;

    const productTableData = products.map(product => [
      product.product_code || '',
      product.name || '',
      product.unit_of_measure || '',
      product.cost_price || 0,
      product.sell_price || 0,
      product.stock_quantity || 0,
      product.is_active ? 'Active' : 'Inactive'
    ]);

    doc.autoTable({
      head: [['Code', 'Name', 'Unit', 'Cost Price', 'Sell Price', 'Stock', 'Status']],
      body: productTableData,
      startY: yPosition,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [11, 31, 58] }
    });

    yPosition = doc.lastAutoTable.finalY + 20;
  }

  // Services table
  if (services.length > 0) {
    doc.setFontSize(14);
    doc.text('Services', 14, yPosition);
    yPosition += 10;

    const serviceTableData = services.map(service => [
      service.product_code || '',
      service.name || '',
      service.unit_of_measure || '',
      service.cost_price || 0,
      service.sell_price || 0,
      service.is_active ? 'Active' : 'Inactive'
    ]);

    doc.autoTable({
      head: [['Code', 'Name', 'Unit', 'Cost Price', 'Sell Price', 'Status']],
      body: serviceTableData,
      startY: yPosition,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [11, 31, 58] }
    });
  }

  doc.save(`ZandeBooks_Products_${new Date().toISOString().split('T')[0]}.pdf`);
}

async function exportProductsCsv() {
  const { data, error } = await supabase.from('products').select('*').order('name', { ascending: true });
  if (error) {
    alert('Error fetching products for export');
    return;
  }

  const headers = ['Product Code', 'Name', 'Description', 'Category', 'Unit of Measure', 'Cost Price', 'Sell Price', 'Stock Quantity', 'Reorder Level', 'Status'];
  const csvContent = [
    headers.join(','),
    ...data.map(product => [
      `"${product.product_code || ''}"`,
      `"${product.name || ''}"`,
      `"${product.description || ''}"`,
      `"${product.category || ''}"`,
      `"${product.unit_of_measure || ''}"`,
      product.cost_price || 0,
      product.sell_price || 0,
      product.category === 'Product' ? (product.stock_quantity || 0) : 'N/A',
      product.category === 'Product' ? (product.reorder_level || 0) : 'N/A',
      `"${product.is_active ? 'Active' : 'Inactive'}"`
    ].join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `ZandeBooks_Products_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Wire up product export buttons
document.getElementById('exportProductsExcel').onclick = exportProductsExcel;
document.getElementById('exportProductsPdf').onclick = exportProductsPdf;
document.getElementById('exportProductsCsv').onclick = exportProductsCsv;

// --- Sales Module Logic ---

// Global variables for sales
let currentLineItems = [];
let salesDocumentCounter = { Invoice: 1, Quote: 1, 'Credit Note': 1 };

// Initialize sales module
document.getElementById('addInvoiceBtn').onclick = () => openSalesModal('Invoice');
document.getElementById('addQuoteBtn').onclick = () => openSalesModal('Quote');
document.getElementById('closeSalesModal').onclick = closeSalesModal;
document.getElementById('addLineItemBtn').onclick = addLineItem;

// Open sales modal
async function openSalesModal(documentType, salesDocument = null) {
  console.log('Opening sales modal for:', documentType);
  
  try {
    // Load customers and products first
    await loadCustomersForSales();
    await loadProductsForSales();
    
    // Ensure modal exists
    const modal = document.getElementById('salesModal');
    if (!modal) {
      console.error('Sales modal not found!');
      alert('Sales modal not found. Please refresh the page.');
      return;
    }
    
    modal.style.display = 'block';
    document.getElementById('salesModalTitle').textContent = salesDocument ? 
      `Edit ${documentType}` : `Create ${documentType}`;
    
    // Reset form and line items
    document.getElementById('salesForm').reset();
    currentLineItems = [];
    
    // Set document type
    const docTypeSelect = document.getElementById('salesDocumentType');
    if (docTypeSelect) {
      docTypeSelect.value = documentType;
      docTypeSelect.disabled = true;
    }

    // Generate document number
    if (!salesDocument) {
      const docNumberField = document.getElementById('salesDocumentNumber');
      if (docNumberField) {
        docNumberField.value = generateDocumentNumber(documentType);
      }
    }
    
    // Set today's date
    const dateField = document.getElementById('salesDocumentDate');
    if (dateField) {
      dateField.value = new Date().toISOString().split('T')[0];
    }
    
    // Set due date (30 days from today for invoices)
    if (documentType === 'Invoice') {
      const dueDateField = document.getElementById('salesDueDate');
      if (dueDateField) {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 30);
        dueDateField.value = dueDate.toISOString().split('T')[0];
      }
    }
    
    // If editing existing document
    if (salesDocument) {
      populateSalesForm(salesDocument);
    } else {
      // Add one empty line item for new documents
      addLineItem();
    }
    
    updateTotals();
    
  } catch (error) {
    console.error('Error opening sales modal:', error);
    alert('Error opening sales modal: ' + error.message);
  }
}

// Close sales modal
function closeSalesModal() {
  document.getElementById('salesModal').style.display = 'none';
  currentLineItems = [];
}

// Generate document number
function generateDocumentNumber(documentType) {
  const prefix = {
    'Invoice': 'INV',
    'Quote': 'QUO', 
    'Credit Note': 'CN'
  };
  
  const number = salesDocumentCounter[documentType].toString().padStart(4, '0');
  salesDocumentCounter[documentType]++;
  
  return `${prefix[documentType]}${number}`;
}

// Load customers for sales dropdown
async function loadCustomersForSales() {
  try {
    console.log('Loading customers for sales...');
    
    const { data, error } = await supabase
      .from('customers')
      .select('id, name, customer_code')
      .order('name');
    
    if (error) {
      console.error('Error loading customers:', error);
      throw error;
    }
    
    const customerSelect = document.getElementById('salesCustomer');
    if (!customerSelect) {
      console.error('Customer select element not found!');
      return;
    }
    
    customerSelect.innerHTML = '<option value="">Select Customer</option>';
    
    if (data && data.length > 0) {
      data.forEach(customer => {
        const option = document.createElement('option');
        option.value = customer.id;
        option.textContent = `${customer.customer_code} - ${customer.name}`;
        customerSelect.appendChild(option);
      });
      console.log(`Loaded ${data.length} customers`);
    } else {
      console.log('No customers found');
    }
    
  } catch (error) {
    console.error('Error in loadCustomersForSales:', error);
    showNotification('Error loading customers: ' + error.message, 'error');
  }
}

/**
 * Enhanced customer loading with payment terms integration
 */
async function loadCustomersForSalesEnhanced() {
  try {
    console.log('Loading customers for sales with enhanced data...');
    const { data, error } = await supabase
      .from('customers')
      .select('id, name, customer_code, email, payment_terms, credit_limit, currency_code')
      .eq('is_active', true)
      .order('name');
    
    if (error) {
      console.error('Error loading customers:', error);
      throw error;
    }
    
    const customerSelect = document.getElementById('salesCustomer');
    if (customerSelect) {
      customerSelect.innerHTML = '<option value="">Select Customer</option>';
      
      data.forEach(customer => {
        const option = document.createElement('option');
        option.value = customer.id;
        option.textContent = `${customer.customer_code} - ${customer.name}`;
        
        // Add data attributes for auto-filling
        option.dataset.paymentTerms = customer.payment_terms || '30';
        option.dataset.creditLimit = customer.credit_limit || '0';
        option.dataset.currency = customer.currency_code || 'ZAR';
        option.dataset.email = customer.email || '';
        
        customerSelect.appendChild(option);
      });
      
      // Add customer change event listener
      customerSelect.onchange = handleCustomerSelection;
    }
    
    console.log(`✅ Loaded ${data.length} customers with enhanced data`);
    
  } catch (error) {
    console.error('Error loading customers:', error);
    showNotification('Error loading customers: ' + error.message, 'error');
  }
}

/**
 * Handle customer selection and auto-fill data
 */
function handleCustomerSelection() {
  const customerSelect = document.getElementById('salesCustomer');
  const selectedOption = customerSelect.options[customerSelect.selectedIndex];
  
  if (!selectedOption || !selectedOption.value) {
    return;
  }
  
  console.log('🏢 Customer selected, auto-filling data...');
  
  // Auto-fill due date based on payment terms
  const paymentTerms = parseInt(selectedOption.dataset.paymentTerms) || 30;
  const dueDateField = document.getElementById('salesDueDate');
  if (dueDateField) {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + paymentTerms);
    dueDateField.value = dueDate.toISOString().split('T')[0];
    
    const termsDays = paymentTerms === 1 ? '1 day' : `${paymentTerms} days`;
    showNotification(`📅 Due date set to ${termsDays} (customer payment terms)`, 'info');
  }
  
  // Show customer information panel
  showCustomerInfoPanel(selectedOption);
}

/**
 * Show customer information panel in sales modal
 */
function showCustomerInfoPanel(customerOption) {
  // Check if info panel exists, create if not
  let infoPanel = document.getElementById('customerInfoPanel');
  if (!infoPanel) {
    infoPanel = document.createElement('div');
    infoPanel.id = 'customerInfoPanel';
    infoPanel.style.cssText = `
      background: #f0f9ff;
      border: 1px solid #0ea5e9;
      border-radius: 8px;
      padding: 12px;
      margin-top: 10px;
      font-size: 0.9em;
    `;
    
    // Insert after customer select field
    const customerFieldGroup = document.getElementById('salesCustomer').closest('.sales-field-group');
    customerFieldGroup.appendChild(infoPanel);
  }
  
  const paymentTerms = customerOption.dataset.paymentTerms || '30';
  const creditLimit = customerOption.dataset.creditLimit || '0';
  const currency = customerOption.dataset.currency || 'ZAR';
  const email = customerOption.dataset.email || 'Not provided';
  
  infoPanel.innerHTML = `
    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
      <span style="color: #0369a1; font-weight: 600;">🏢 Customer Information</span>
    </div>
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 0.85em;">
      <div><strong>Payment Terms:</strong> ${paymentTerms} days</div>
      <div><strong>Credit Limit:</strong> R${parseFloat(creditLimit).toFixed(2)}</div>
      <div><strong>Currency:</strong> ${currency}</div>
      <div><strong>Email:</strong> ${email}</div>
    </div>
  `;
}

// Update your openSalesModal function to use the enhanced customer loading
// Replace the loadCustomersForSales() call with loadCustomersForSalesEnhanced()

// Load products for line item dropdowns - FIXED VERSION
async function loadProductsForSales() {
  try {
    console.log('Loading products for sales...');
    
    const { data, error } = await supabase
      .from('products')
      .select('id, product_code, name, sell_price, tax_code, category, stock_quantity')
      .eq('is_active', true)
      .order('name');
    
    if (error) {
      console.error('Error loading products:', error);
      throw error;
    }
    
    window.salesProducts = data || [];
    console.log(`Loaded ${window.salesProducts.length} products`);
    
  } catch (error) {
    console.error('Error in loadProductsForSales:', error);
    showNotification('Error loading products: ' + error.message, 'error');
  }
}

// Add line item
function addLineItem() {
  console.log('Adding new line item...');
  
  // Initialize currentLineItems if it doesn't exist
  if (!currentLineItems) {
    currentLineItems = [];
  }
  
  const newItem = {
    product_id: '',
    description: '',
    quantity: 1,
    unit_price: 0,
    tax_code: 'Standard',
    tax_rate: 15,
    line_total: 0,
    product_info: null
  };
  
  currentLineItems.push(newItem);
  console.log('Line item added:', newItem);
  console.log('Total line items:', currentLineItems.length);
  
  renderLineItems();
  updateTotals();
}

// Remove line item
function removeLineItem(index) {
  currentLineItems.splice(index, 1);
  renderLineItems();
  updateTotals();
}

// Render line items table

function renderLineItems() {
  const container = document.getElementById('lineItemsContainer');
  if (!container) {
    console.error('Line items container not found!');
    return;
  }
  
  container.innerHTML = '';
  
  if (!currentLineItems || currentLineItems.length === 0) {
    container.innerHTML = '<tr><td colspan="7" class="empty-line-items" style="text-align: center; padding: 20px; color: #666;">No line items added</td></tr>';
    return;
  }
  
  currentLineItems.forEach((item, index) => {
    // Stock warning for products
    let stockWarning = '';
    if (item.product_info && item.product_info.category === 'Product') {
      const available = item.product_info.stock_quantity || 0;
      if (item.quantity > available) {
        stockWarning = `<div style="color: red; font-size: 0.8em;">⚠️ Stock: ${available} available</div>`;
      } else if (available <= 5) {
        stockWarning = `<div style="color: orange; font-size: 0.8em;">⚠️ Low stock: ${available}</div>`;
      }
    }
    
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>
        <select class="line-item-select product-select" data-line-index="${index}" style="width: 100%;">
          <option value="">Select Product/Service</option>
          ${window.salesProducts ? window.salesProducts.map(product => 
            `<option value="${product.id}" ${item.product_id === product.id ? 'selected' : ''}>
              ${product.product_code} - ${product.name}${product.category === 'Product' ? ` (Stock: ${product.stock_quantity || 0})` : ''}
            </option>`
          ).join('') : ''}
        </select>
        ${stockWarning}
      </td>
      <td>
        <input type="text" class="line-item-input" value="${item.description || ''}" 
               data-line-index="${index}" data-field="description"
               placeholder="Description" style="width: 100%;">
      </td>
      <td>
        <input type="number" class="line-item-input" value="${item.quantity || 1}" min="0" step="0.01"
               data-line-index="${index}" data-field="quantity" style="width: 100%;">
      </td>
      <td>
        <input type="number" class="line-item-input" value="${(item.unit_price || 0).toFixed(2)}" min="0" step="0.01"
               data-line-index="${index}" data-field="unit_price" style="width: 100%;">
      </td>
      <td>
        <select class="line-item-select tax-select" data-line-index="${index}" data-field="tax_code" style="width: 100%;">
          <option value="Standard" ${item.tax_code === 'Standard' ? 'selected' : ''}>15%</option>
          <option value="Zero" ${item.tax_code === 'Zero' ? 'selected' : ''}>0%</option>
          <option value="Exempt" ${item.tax_code === 'Exempt' ? 'selected' : ''}>Exempt</option>
          <option value="Reduced" ${item.tax_code === 'Reduced' ? 'selected' : ''}>5%</option>
        </select>
      </td>
      <td style="text-align: right; font-weight: bold; color: var(--zande-green);">
        R${(item.line_total || 0).toFixed(2)}
      </td>
      <td>
        <button type="button" class="remove-line-btn" data-line-index="${index}" title="Remove" 
                style="background: #dc2626; color: white; border: none; border-radius: 4px; padding: 5px 8px; cursor: pointer;">
          ×
        </button>
      </td>
    `;
    container.appendChild(row);
  });
  
  // Add event listeners after creating the rows
  setupLineItemEventListeners();
}

// Add this new function to handle event listeners properly
function setupLineItemEventListeners() {
  console.log('Setting up line item event listeners...');
  
  // Remove old event listeners first to prevent duplicates
  document.querySelectorAll('.product-select').forEach(select => {
    select.removeEventListener('change', selectProduct);
  });
  
  // Product selection dropdowns
  document.querySelectorAll('.product-select[data-line-index]').forEach(select => {
    select.addEventListener('change', function() {
      const index = parseInt(this.dataset.lineIndex);
      const productId = this.value;
      console.log('Product selected:', productId, 'for line', index);
      selectProduct(index, productId);
    });
  });
  
  // Tax code dropdowns
  document.querySelectorAll('.tax-select[data-line-index]').forEach(select => {
    select.addEventListener('change', function() {
      const index = parseInt(this.dataset.lineIndex);
      const field = this.dataset.field;
      const value = this.value;
      console.log('Tax code changed:', value, 'for line', index);
      updateLineItem(index, field, value);
    });
  });
  
  // Input fields (description, quantity, unit_price)
  document.querySelectorAll('.line-item-input[data-line-index]').forEach(input => {
    input.addEventListener('input', function() {
      const index = parseInt(this.dataset.lineIndex);
      const field = this.dataset.field;
      const value = this.value;
      console.log('Field updated:', field, '=', value, 'for line', index);
      updateLineItem(index, field, value);
    });
    
    // Also add change event for when user leaves the field
    input.addEventListener('change', function() {
      const index = parseInt(this.dataset.lineIndex);
      const field = this.dataset.field;
      const value = this.value;
      updateLineItem(index, field, value);
    });
  });
  
  // Remove buttons
  document.querySelectorAll('.remove-line-btn[data-line-index]').forEach(button => {
    button.addEventListener('click', function() {
      const index = parseInt(this.dataset.lineIndex);
      console.log('Removing line item:', index);
      removeLineItem(index);
    });
  });
  
  console.log('✅ Line item event listeners set up');
}


// Select product and auto-fill details
function selectProduct(index, productId) {
  console.log(`Selecting product ${productId} for line ${index}`);
  
  // Ensure currentLineItems exists and has the right index
  if (!currentLineItems || !currentLineItems[index]) {
    console.error('Invalid line item index:', index);
    return;
  }
  
  if (!productId) {
    // Clear fields if no product selected
    currentLineItems[index].product_id = '';
    currentLineItems[index].description = '';
    currentLineItems[index].unit_price = 0;
    currentLineItems[index].tax_code = 'Standard';
    currentLineItems[index].tax_rate = 15;
    currentLineItems[index].product_info = null;
    calculateLineTotal(index);
    renderLineItems();
    updateTotals();
    return;
  }
  
  // Find the product in the loaded products
  const product = window.salesProducts?.find(p => p.id === productId);
  if (product) {
    console.log('Found product:', product);
    
    // Auto-fill all the details
    currentLineItems[index].product_id = productId;
    currentLineItems[index].description = product.name || '';
    currentLineItems[index].unit_price = parseFloat(product.sell_price) || 0;
    currentLineItems[index].tax_code = product.tax_code || 'Standard';
    
    // Set tax rate based on tax code
    const taxRates = { 'Standard': 15, 'Zero': 0, 'Exempt': 0, 'Reduced': 5 };
    currentLineItems[index].tax_rate = taxRates[product.tax_code] || 15;
    
    // Store product info for stock checking
    currentLineItems[index].product_info = product;
    
    // Calculate line total immediately
    calculateLineTotal(index);
    
    console.log('Updated line item:', currentLineItems[index]);
    
    // Re-render and update totals
    renderLineItems();
    updateTotals();
  } else {
    console.error('Product not found with ID:', productId);
    console.log('Available products:', window.salesProducts);
  }
}

// Update line item field
function updateLineItem(index, field, value) {
  console.log(`Updating line ${index}, field ${field}, value ${value}`); // Debug
  
  // Update the field value
  currentLineItems[index][field] = field === 'quantity' || field === 'unit_price' ? 
    parseFloat(value) || 0 : value;
  
  // Update tax rate when tax code changes
  if (field === 'tax_code') {
    const taxRates = { 'Standard': 15, 'Zero': 0, 'Exempt': 0, 'Reduced': 5 };
    currentLineItems[index].tax_rate = taxRates[value] || 15;
  }
  
  // Stock validation for quantity changes
  if (field === 'quantity') {
    const item = currentLineItems[index];
    if (item.product_info && item.product_info.category === 'Product') {
      const availableStock = item.product_info.stock_quantity || 0;
      const requestedQty = parseFloat(value) || 0;
      
      if (requestedQty > availableStock) {
        const productName = item.product_info.name;
        alert(`⚠️ Warning: Requested quantity (${requestedQty}) exceeds available stock (${availableStock}) for "${productName}". You can still proceed, but stock will go negative.`);
      }
    }
  }
  
  // Always recalculate when quantity or unit price changes
  if (field === 'quantity' || field === 'unit_price') {
    calculateLineTotal(index);
  }
  
  console.log(`Updated item:`, currentLineItems[index]); // Debug
  
  // Re-render to show updated values and update totals
  renderLineItems();
  updateTotals();
}

// Calculate line total with automatic price update
function calculateLineTotal(index) {
  const item = currentLineItems[index];
  
  // Ensure we have valid numbers
  const quantity = parseFloat(item.quantity) || 0;
  const unitPrice = parseFloat(item.unit_price) || 0;
  
  // Auto-calculate line total based on quantity × unit price
  item.line_total = quantity * unitPrice;
  
  console.log(`Line ${index}: ${quantity} × ${unitPrice} = ${item.line_total}`); // Debug line
}

// Update document totals
function updateTotals() {
  let subtotal = 0;
  let taxAmount = 0;
  
  currentLineItems.forEach(item => {
    const lineTotal = parseFloat(item.line_total) || 0;
    const taxRate = parseFloat(item.tax_rate) || 0;
    
    subtotal += lineTotal;
    taxAmount += (lineTotal * taxRate / 100);
  });
  
  const total = subtotal + taxAmount;
  
  // Update display with proper formatting
  document.getElementById('salesSubtotal').textContent = subtotal.toFixed(2);
  document.getElementById('salesTaxAmount').textContent = taxAmount.toFixed(2);
  document.getElementById('salesTotalAmount').textContent = total.toFixed(2);
  
  console.log(`Totals: Subtotal=${subtotal.toFixed(2)}, Tax=${taxAmount.toFixed(2)}, Total=${total.toFixed(2)}`); // Debug line
}



/**
 * Process inventory updates when sales invoices are created
 */
async function processSalesInventoryUpdates(salesDoc, lineItems) {
  console.log('📦 Processing inventory updates for sales:', salesDoc.document_number);
  
  if (salesDoc.document_type !== 'Invoice') {
    console.log('⏭️ Skipping inventory update - not an invoice');
    return;
  }
  
  try {
    const inventoryUpdates = [];
    
    for (const item of lineItems) {
      if (!item.product_id) {
        console.log('⏭️ Skipping line item - no product_id:', item.description);
        continue;
      }
      
      if (!item.quantity || item.quantity <= 0) {
        console.log('⏭️ Skipping line item - invalid quantity:', item.quantity);
        continue;
      }
      
      // Get current product data
      const { data: currentProduct, error: productError } = await supabase
        .from('products')
        .select('stock_quantity, product_code, name, category')
        .eq('id', item.product_id)
        .single();
      
      if (productError) {
        console.error('Error getting product data for ID:', item.product_id, productError);
        continue;
      }
      
      if (!currentProduct) {
        console.error('Product not found for ID:', item.product_id);
        continue;
      }
      
      // Only update stock for products (not services)
      if (currentProduct.category !== 'Product') {
        console.log('⏭️ Skipping inventory update - not a product:', currentProduct.name);
        continue;
      }
      
      const currentStock = parseFloat(currentProduct.stock_quantity) || 0;
      const saleQuantity = parseFloat(item.quantity);
      
      // Calculate new stock level (subtract for sales)
      const newStockLevel = currentStock - saleQuantity;
      
      if (newStockLevel < 0) {
        console.warn(`⚠️ Warning: ${currentProduct.product_code} will have negative stock: ${newStockLevel}`);
        // You might want to prevent this or warn the user
      }
      
      console.log(`📊 Product ${currentProduct.product_code} inventory update:`, {
        oldStock: currentStock,
        newStock: newStockLevel,
        saleQty: saleQuantity
      });
      
      // Update product stock
      const { error: updateError } = await supabase
        .from('products')
        .update({
          stock_quantity: newStockLevel,
          updated_at: new Date().toISOString()
        })
        .eq('id', item.product_id);
      
      if (updateError) {
        console.error('Error updating product stock:', updateError);
        throw new Error(`Failed to update stock for ${currentProduct.name}: ${updateError.message}`);
      } else {
        inventoryUpdates.push({
          product_id: item.product_id,
          product_code: currentProduct.product_code,
          product_name: currentProduct.name,
          quantity_sold: saleQuantity,
          old_stock: currentStock,
          new_stock_level: newStockLevel
        });
        
        console.log(`✅ Updated stock for ${currentProduct.product_code}: ${currentStock} → ${newStockLevel}`);
      }
    }
    
    if (inventoryUpdates.length > 0) {
      console.log('✅ Inventory updates completed:', inventoryUpdates);
      showSalesInventoryUpdateSummary(inventoryUpdates);
      await logSalesInventoryTransactions(salesDoc, inventoryUpdates);
    } else {
      console.log('ℹ️ No inventory updates were performed');
    }
    
  } catch (error) {
    console.error('❌ Error processing inventory updates:', error);
    showNotification('Inventory update failed: ' + error.message, 'error');
    throw error;
  }
}

/**
 * Show inventory update summary for sales
 */
function showSalesInventoryUpdateSummary(inventoryUpdates) {
  const totalItems = inventoryUpdates.length;
  const totalQuantity = inventoryUpdates.reduce((sum, update) => sum + update.quantity_sold, 0);
  
  let summaryHTML = `
    <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 15px; margin: 10px 0;">
      <div style="display: flex; align-items: center; margin-bottom: 10px;">
        <span style="font-size: 24px; margin-right: 10px;">📦</span>
        <strong style="color: #92400e;">Inventory Updated!</strong>
      </div>
      <p style="margin-bottom: 10px; color: #92400e;">
        <strong>${totalItems} product(s)</strong> sold with <strong>${totalQuantity} units</strong> deducted from inventory.
      </p>
      <div style="max-height: 150px; overflow-y: auto; font-size: 0.9em;">
        ${inventoryUpdates.map(update => `
          <div style="margin-bottom: 8px; padding: 8px; background: white; border-radius: 4px; border-left: 3px solid #f59e0b;">
            <div style="font-weight: 600; color: #111;">
              ${update.product_code} - ${update.product_name}
            </div>
            <div style="color: #666; font-size: 0.8em;">
              📊 Stock: ${update.old_stock} → <strong>${update.new_stock_level.toFixed(2)}</strong> (-${update.quantity_sold})
              ${update.new_stock_level < 5 ? '<span style="color: #dc2626; font-weight: bold;"> ⚠️ LOW STOCK</span>' : ''}
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
  
  // Show as a brief notification instead of modal for sales
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 80px;
    right: 20px;
    max-width: 400px;
    z-index: 10001;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    border-radius: 8px;
    animation: slideInRight 0.3s ease-out;
  `;
  notification.innerHTML = summaryHTML;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    if (notification.parentElement) {
      notification.remove();
    }
  }, 8000);
}

/**
 * Log sales inventory transactions for audit trail
 */
async function logSalesInventoryTransactions(salesDoc, inventoryUpdates) {
  try {
    const inventoryLogs = inventoryUpdates.map(update => ({
      product_id: update.product_id,
      transaction_type: 'Sales Invoice',
      quantity_change: -update.quantity_sold, // Negative for sales
      stock_before: update.old_stock,
      stock_after: update.new_stock_level,
      reference_document: salesDoc.document_number,
      reference_id: salesDoc.id,
      transaction_date: salesDoc.document_date,
      notes: `Sale to ${salesDoc.customer_name || 'Customer'} - ${salesDoc.document_type}`,
      created_at: new Date().toISOString()
    }));
    
    const existingLogs = JSON.parse(localStorage.getItem('inventory_transactions') || '[]');
    const allLogs = [...existingLogs, ...inventoryLogs];
    localStorage.setItem('inventory_transactions', JSON.stringify(allLogs));
    
    console.log('✅ Sales inventory transactions logged to localStorage');
    
  } catch (error) {
    console.error('Error logging sales inventory transactions:', error);
  }
}


/**
 * Update sales document status with inventory and GL implications
 */
async function updateSalesDocumentStatus(documentId, currentStatus) {
  const statuses = ['Draft', 'Sent', 'Accepted', 'Invoiced', 'Paid', 'Cancelled'];
  
  const statusOptions = statuses.map((status, index) => 
    `${index + 1}. ${status}${status === currentStatus ? ' (Current)' : ''}`
  ).join('\n');
  
  const newStatusNumber = prompt(
    `Select new status:\n\n${statusOptions}\n\nEnter number (1-6):`,
    (statuses.indexOf(currentStatus) + 1).toString()
  );
  
  if (!newStatusNumber || newStatusNumber < 1 || newStatusNumber > 6) {
    return;
  }
  
  const selectedStatus = statuses[parseInt(newStatusNumber) - 1];
  
  if (selectedStatus === currentStatus) {
    showNotification('Status unchanged', 'info');
    return;
  }
  
  try {
    console.log(`🔄 Updating sales document ${documentId} status: ${currentStatus} → ${selectedStatus}`);
    
    // Get document details for processing
    const { data: salesDoc, error: fetchError } = await supabase
      .from('sales_documents')
      .select(`
        *,
        customers (name, customer_code),
        sales_line_items (*)
      `)
      .eq('id', documentId)
      .single();
    
    if (fetchError) throw fetchError;
    
    // Update status in database
    const { error } = await supabase
      .from('sales_documents')
      .update({ status: selectedStatus })
      .eq('id', documentId);
    
    if (error) throw error;
    
    // Process status-specific actions
    await processSalesStatusChange(salesDoc, currentStatus, selectedStatus);
    
    // Refresh the table
    loadSalesDocuments();
    
    // Refresh related modules if user is viewing them
    if (document.getElementById('general-ledgerSection')?.style.display !== 'none') {
      loadGeneralLedgerData();
    }
    
    if (document.getElementById('productsSection')?.style.display !== 'none') {
      loadProducts();
    }
    
    showNotification(`Status updated to "${selectedStatus}" successfully!`, 'success');
    
  } catch (error) {
    console.error('❌ Error updating status:', error);
    showNotification('Error updating status: ' + error.message, 'error');
  }
}

// Add this after your existing updateCustomerBalance function (around line 2810)

// Make it globally accessible
window.updateCustomerBalance = updateCustomerBalance;

// Process sales status changes with inventory and GL implications
async function processSalesStatusChange(salesDoc, oldStatus, newStatus) {
  console.log(`Processing status change: ${oldStatus} → ${newStatus}`);
  
  // Convert Quote to Invoice
  if (oldStatus === 'Accepted' && newStatus === 'Invoiced' && salesDoc.document_type === 'Quote') {
    try {
      // Create invoice from quote
      const invoiceData = {
        ...salesDoc,
        id: undefined, // Remove quote ID
        document_type: 'Invoice',
        document_number: generateDocumentNumber('Invoice'),
        status: 'Draft',
        quote_reference: salesDoc.document_number, // Link to original quote
        created_at: new Date().toISOString()
      };
      
      const { data: newInvoice, error: invoiceError } = await supabase
        .from('sales_documents')
        .insert([invoiceData])
        .select()
        .single();
      
      if (invoiceError) throw invoiceError;
      
      // Copy line items
      const lineItemsData = salesDoc.sales_line_items.map(item => ({
        ...item,
        id: undefined, // Remove quote line item ID
        sales_document_id: newInvoice.id
      }));
      
      await supabase
        .from('sales_line_items')
        .insert(lineItemsData);
      
      // Update quote status to "Converted"
      await supabase
        .from('sales_documents')
        .update({ status: 'Converted' })
        .eq('id', salesDoc.id);
      
      showNotification(`✅ Invoice ${newInvoice.document_number} created from quote!`, 'success');
      
    } catch (error) {
      console.error('Error creating invoice from quote:', error);
      showNotification('Error creating invoice: ' + error.message, 'error');
    }
  }
  
  // Process inventory and GL for invoices
  if ((newStatus === 'Paid' || newStatus === 'Invoiced') && 
      salesDoc.document_type === 'Invoice') {
    
    try {
      // Update inventory
      await processSalesInventoryUpdates(salesDoc, salesDoc.sales_line_items);
      
      // Post to GL
      const glEntries = GLEntryTemplates.salesInvoice(salesDoc, salesDoc.sales_line_items);
      const glResult = await postToGeneralLedger(glEntries, 'sales', salesDoc.id);
      
      if (glResult.success) {
        await supabase
          .from('sales_documents')
          .update({ posted_to_gl: true })
          .eq('id', salesDoc.id);
      }
      
    } catch (error) {
      console.error('Processing error:', error);
      showNotification('Status updated but processing failed: ' + error.message, 'warning');
    }
  }
}

// Make the function global
window.processSalesStatusChange = processSalesStatusChange;




// Update your existing view/edit/delete placeholder functions
window.viewSalesDocument = async function(id) {
  try {
    const { data: doc, error } = await supabase
      .from('sales_documents')
      .select(`
        *,
        customers (name, customer_code),
        sales_line_items (*)
      `)
      .eq('id', id)
      .single();
    
    if (error) throw error;
    
    let details = `SALES DOCUMENT DETAILS\n\n`;
    details += `Document: ${doc.document_number}\n`;
    details += `Type: ${doc.document_type}\n`;
    details += `Customer: ${doc.customers?.name || 'Unknown'}\n`;
    details += `Date: ${new Date(doc.document_date).toLocaleDateString()}\n`;
    details += `Due Date: ${doc.due_date ? new Date(doc.due_date).toLocaleDateString() : 'Not set'}\n`;
    details += `Total: R${doc.total_amount.toFixed(2)}\n`;
    details += `Status: ${doc.status}\n\n`;
    details += `LINE ITEMS:\n`;
    doc.sales_line_items.forEach(item => {
      details += `- ${item.description}: ${item.quantity} × R${item.unit_price} = R${item.line_total.toFixed(2)}\n`;
    });
    
    alert(details);
    
  } catch (error) {
    console.error('Error viewing sales document:', error);
    alert('Error loading document details');
  }
};

window.editSalesDocument = async function(id) {
  try {
    const { data: document, error } = await supabase
      .from('sales_documents')
      .select(`
        *,
        sales_line_items(*)
      `)
      .eq('id', id)
      .single();
    
    if (error) throw error;
    
    await openSalesModal(document.document_type, document);
    
  } catch (error) {
    console.error('Error loading sales document for edit:', error);
    alert('Error loading document details');
  }
};

window.deleteSalesDocument = async function(id) {
  if (!confirm('Are you sure you want to delete this sales document?')) return;
  
  try {
    // Delete line items first
    await supabase.from('sales_line_items').delete().eq('sales_document_id', id);
    
    // Delete main document
    await supabase.from('sales_documents').delete().eq('id', id);
    
    showNotification('Sales document deleted successfully!', 'success');
    loadSalesDocuments();
    
  } catch (error) {
    console.error('Error deleting sales document:', error);
    alert('Error deleting sales document: ' + error.message);
  }
};



// Add status update function to existing functions
window.updateSalesDocumentStatus = updateSalesDocumentStatus;
window.processSalesStatusChange = processSalesStatusChange;
window.handleCustomerSelection = handleCustomerSelection;
window.showCustomerInfoPanel = showCustomerInfoPanel;

// Make functions globally accessible
window.processSalesInventoryUpdates = processSalesInventoryUpdates;
window.showSalesInventoryUpdateSummary = showSalesInventoryUpdateSummary;
window.logSalesInventoryTransactions = logSalesInventoryTransactions;

// Update customer balance function
async function updateCustomerBalance(customerId, amount, operation) {
  try {
    const { data: customer, error } = await supabase
      .from('customers')
      .select('current_balance')
      .eq('id', customerId)
      .single();
    
    if (error) throw error;
    
    const currentBalance = parseFloat(customer.current_balance) || 0;
    const newBalance = operation === 'increase' ? 
      currentBalance + amount : currentBalance - amount;
    
    await supabase
      .from('customers')
      .update({ current_balance: newBalance })
      .eq('id', customerId);
    
    console.log(`Customer balance updated: ${currentBalance} → ${newBalance}`);
    return { success: true, newBalance };
    
  } catch (error) {
    console.error('Error updating customer balance:', error);
    throw error;
  }
}




// Handle form submission
document.getElementById('salesForm').onsubmit = async function(e) {
  e.preventDefault();
  
  try {
    // VALIDATION FIRST
    const customerId = document.getElementById('salesCustomer').value;
    const documentDate = document.getElementById('salesDocumentDate').value;
    
    if (!customerId) {
      throw new Error('Please select a customer');
    }
    
    if (!documentDate) {
      throw new Error('Please enter a document date');
    }
    
    // Validate line items
    if (!currentLineItems || currentLineItems.length === 0) {
      throw new Error('Please add at least one line item');
    }
    
    // Check each line item
    for (let i = 0; i < currentLineItems.length; i++) {
      const item = currentLineItems[i];
      
      if (!item.description) {
        throw new Error(`Line ${i + 1}: Please enter a description`);
      }
      
      if (!item.quantity || item.quantity <= 0) {
        throw new Error(`Line ${i + 1}: Please enter a valid quantity`);
      }
      
      if (!item.unit_price || item.unit_price < 0) {
        throw new Error(`Line ${i + 1}: Please enter a valid unit price`);
      }
    }
    
    // Check totals balance
    const subtotalText = document.getElementById('salesSubtotal').textContent;
    const total = parseFloat(subtotalText) || 0;
    if (total <= 0) {
      throw new Error('Document total must be greater than zero');
    }
    
    console.log("Validation passed! Saving sales document...");
    showNotification('Saving sales document...', 'info');
    
    // Get customer name for GL posting
    const customerSelect = document.getElementById('salesCustomer');
    const customerName = customerSelect.options[customerSelect.selectedIndex]?.textContent?.split(' - ')[1] || 'Customer';
    
    // Determine if this is a cash sale or credit sale
    const isCashSale = confirm('Is this a cash sale?\n\nClick "OK" for Cash Sale (immediate payment)\nClick "Cancel" for Credit Sale (invoice to be paid later)');
    
    // Get calculated totals
    const taxText = document.getElementById('salesTaxAmount').textContent;
    const totalText = document.getElementById('salesTotalAmount').textContent;
    
    const salesDocument = {
      document_type: document.getElementById('salesDocumentType').value,
      document_number: document.getElementById('salesDocumentNumber').value,
      customer_id: customerId,
      customer_name: customerName,
      document_date: documentDate,
      due_date: document.getElementById('salesDueDate').value || null,
      reference: document.getElementById('salesReference').value || null,
      subtotal: parseFloat(subtotalText) || 0,
      tax_amount: parseFloat(taxText) || 0,
      total_amount: parseFloat(totalText) || 0,
      status: isCashSale ? 'Paid' : 'Invoiced',
      is_cash_sale: isCashSale,
      notes: document.getElementById('salesNotes').value || null
    };
    
    // Get product cost prices for COGS calculation
    const enhancedLineItems = await Promise.all(currentLineItems.map(async (item) => {
      if (item.product_id) {
        try {
          const { data: product } = await supabase
            .from('products')
            .select('cost_price')
            .eq('id', item.product_id)
            .single();
          
          return {
            ...item,
            cost_price: product?.cost_price || 0
          };
        } catch (error) {
          console.warn('Could not get cost price for product:', item.product_id);
          return { ...item, cost_price: 0 };
        }
      }
      return item;
    }));
    
    // Save sales document
    const { data: docData, error: docError } = await supabase
      .from('sales_documents')
      .insert([salesDocument])
      .select()
      .single();
    
    if (docError) throw new Error('Error saving sales document: ' + docError.message);
    
    // Save line items
    const lineItemsToSave = enhancedLineItems.map(item => ({
      sales_document_id: docData.id,
      product_id: item.product_id || null,
      description: item.description,
      quantity: parseFloat(item.quantity) || 0,
      unit_price: parseFloat(item.unit_price) || 0,
      tax_code: item.tax_code || 'Standard',
      tax_rate: parseFloat(item.tax_rate) || 15,
      line_total: parseFloat(item.line_total) || 0
    }));
    
    const { error: lineError } = await supabase
      .from('sales_line_items')
      .insert(lineItemsToSave);
    
    if (lineError) throw new Error('Error saving line items: ' + lineError.message);
    
    // POST TO GENERAL LEDGER with proper GL entries
    if (salesDocument.document_type === 'Invoice') {
      try {
        const invoiceDataForGL = {
          ...salesDocument,
          customer_name: customerName,
          document_id: docData.id
        };
        
        // Choose the correct GL template based on cash/credit sale
        const glEntries = isCashSale 
          ? GLEntryTemplates.cashSale(invoiceDataForGL, enhancedLineItems)
          : GLEntryTemplates.salesInvoice(invoiceDataForGL, enhancedLineItems);
        
        const glResult = await postToGeneralLedger(glEntries, 'sales', docData.id);
        
        if (glResult.success) {
          await supabase
            .from('sales_documents')
            .update({ status: isCashSale ? 'Paid' : 'Invoiced', posted_to_gl: true })
            .eq('id', docData.id);
          
          const saleTypeText = isCashSale ? 'Cash sale' : 'Credit sale';
          showNotification(`✅ ${saleTypeText} saved and posted to General Ledger!`, 'success');
        } else {
          console.warn('⚠️ GL posting failed:', glResult.error);
          showNotification('Invoice saved but GL posting failed: ' + glResult.error, 'warning');
        }
        
      } catch (glError) {
        console.error('GL posting error:', glError);
        showNotification('Invoice saved but GL posting failed: ' + glError.message, 'warning');
      }
    } else {
      const docTypeText = salesDocument.document_type === 'Quote' ? 'Quote' : 'Sales document';
      showNotification(`${docTypeText} saved successfully!`, 'success');
    }
    
    // UPDATE CUSTOMER BALANCE for credit sales
    if (!isCashSale && salesDocument.document_type === 'Invoice') {
      try {
        await updateCustomerBalance(customerId, salesDocument.total_amount, 'increase');
        console.log('✅ Customer balance updated for credit sale');
      } catch (balanceError) {
        console.error('Error updating customer balance:', balanceError);
        showNotification('Sale saved but customer balance update failed', 'warning');
      }
    }
    
    // Close modal and refresh
    closeSalesModal();
    await loadSalesDocuments();
    
    // PROCESS INVENTORY UPDATES FOR ALL INVOICES
    if (salesDocument.document_type === 'Invoice') {
      try {
        await processSalesInventoryUpdates(docData, enhancedLineItems);
      } catch (inventoryError) {
        console.error('Inventory update error:', inventoryError);
        showNotification('Invoice saved but inventory update failed: ' + inventoryError.message, 'warning');
      }
    }
    
  } catch (error) {
    console.error("Error saving sales document:", error);
    showNotification(error.message, 'error');
    return;
  }
};

// Load sales documents
async function loadSalesDocuments() {
  console.log("Loading sales documents...");
  
  const { data, error } = await supabase
    .from('sales_documents')
    .select(`
      *,
      customers (name, customer_code)
    `)
    .order('document_date', { ascending: false });
    
  console.log("Sales documents data:", data);
  console.log("Sales documents error:", error);
  
  const tbody = document.querySelector('#salesTable tbody');
  tbody.innerHTML = '';
  
  if (error) {
    console.error("Error loading sales documents:", error);
    tbody.innerHTML = '<tr><td colspan="9">Error loading sales documents</td></tr>'; // Updated colspan
    return;
  }
  
  if (data && data.length > 0) {
    data.forEach(doc => {
      const row = document.createElement('tr');
      
      // Get status color for styling
      const statusClass = `status-${doc.status.toLowerCase().replace(' ', '-')}`;
      
      row.innerHTML = `
        <td>${doc.document_number}</td>
        <td>${doc.document_type}</td>
        <td>${doc.customers ? `${doc.customers.customer_code} - ${doc.customers.name}` : 'N/A'}</td>
        <td>${new Date(doc.document_date).toLocaleDateString()}</td>
        <td>${doc.due_date ? new Date(doc.due_date).toLocaleDateString() : 'N/A'}</td>
        <td style="font-weight: bold; color: var(--zande-green);">R${doc.total_amount.toFixed(2)}</td>
        <td>
          <button onclick="updateSalesDocumentStatus('${doc.id}', '${doc.status}')" 
                  class="modern-btn status-btn" title="Update Status"
                  style="padding: 6px 12px; background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; border-radius: 6px; cursor: pointer; font-size: 0.9em; font-weight: 500;">
            📋 ${doc.status}
          </button>
        </td>
        <td>
          <button class="zande-btn action-btn" title="View" onclick="viewSalesDocument('${doc.id}')">
            <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
          </button>
          <button class="zande-btn action-btn" title="Edit" onclick="editSalesDocument('${doc.id}')">
            <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2l4 4-10 10H2v-4L12 2z"/>
            </svg>
          </button>
          <button class="zande-btn action-btn" title="Delete" onclick="deleteSalesDocument('${doc.id}')">
            <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 6h12M9 6v8m-4 0h8a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H5a2 2 0 0 0 2 2v6a2 2 0 0 0 2 2z"/>
            </svg>
          </button>
        </td>
      `;
      tbody.appendChild(row);
    });
  } else {
    tbody.innerHTML = '<tr><td colspan="9">No sales documents found</td></tr>'; // Updated colspan
  }
}

// Placeholder functions for view/edit/delete (we'll implement these in Step 5)
window.viewSalesDocument = function(id) {
  alert('View functionality will be added in Step 5');
};

window.editSalesDocument = function(id) {
  alert('Edit functionality will be added in Step 5');
};

window.deleteSalesDocument = function(id) {
  if (!confirm('Are you sure you want to delete this sales document?')) return;
  // Delete functionality will be added in Step 5
  alert('Delete functionality will be added in Step 5');
};

// Load sales documents when Sales section is shown
const salesBtn = document.querySelector('[data-module="sales"]');
if (salesBtn) {
  salesBtn.addEventListener('click', loadSalesDocuments);
}

// Initialize sales module
document.getElementById('addInvoiceBtn').onclick = () => openSalesModal('Invoice');
document.getElementById('addQuoteBtn').onclick = () => openSalesModal('Quote');
document.getElementById('addCreditNoteBtn').onclick = () => openSalesModal('Credit Note'); // ADD THIS
document.getElementById('closeSalesModal').onclick = closeSalesModal;
document.getElementById('addLineItemBtn').onclick = addLineItem;

// Add this debug function

// Debug function to check sales module state
function debugSalesModule() {
  console.log('=== SALES MODULE DEBUG ===');
  console.log('1. Modal exists:', !!document.getElementById('salesModal'));
  console.log('2. Form exists:', !!document.getElementById('salesForm'));
  console.log('3. Line items container exists:', !!document.getElementById('lineItemsContainer'));
  console.log('4. Current line items:', currentLineItems);
  console.log('5. Sales products loaded:', window.salesProducts?.length || 0);
  console.log('6. Customer select exists:', !!document.getElementById('salesCustomer'));
  console.log('7. Document type select exists:', !!document.getElementById('salesDocumentType'));
  
  // Check if Supabase is working
  console.log('8. Supabase client:', !!window.supabase);
  
  // Check if buttons are wired up
  console.log('9. Add invoice button exists:', !!document.getElementById('addInvoiceBtn'));
  console.log('10. Add quote button exists:', !!document.getElementById('addQuoteBtn'));
  
  console.log('=== END DEBUG ===');
}

// Make it globally available
window.debugSalesModule = debugSalesModule;

// ========================================
// PURCHASES MODULE - CLEAN VERSION
// ========================================

// Global variables for purchases
let purchaseLineItems = [];
let purchaseDocuments = [];

// Initialize Purchases when section is clicked
const purchasesBtn = document.querySelector('[data-module="purchases"]');
if (purchasesBtn) {
  purchasesBtn.addEventListener('click', initializePurchases);
}

async function initializePurchases() {
  console.log('Loading Purchases module...');
  await loadPurchaseSuppliers();
  await loadProductsForPurchases(); // NEW NAME
  await loadPurchaseDocuments();
  setupPurchaseButtons();
}

// Setup button event listeners
function setupPurchaseButtons() {
  document.getElementById('addPurchaseOrderBtn').onclick = () => openPurchaseModal('Purchase Order');
  document.getElementById('addBillBtn').onclick = () => openPurchaseModal('Bill');
  document.getElementById('addPurchaseCreditNoteBtn').onclick = () => openPurchaseModal('Credit Note');
  document.getElementById('closePurchaseModal').onclick = closePurchaseModal;
  document.getElementById('addPurchaseLineItemBtn').onclick = addPurchaseLineItem;
  document.getElementById('purchaseForm').onsubmit = savePurchaseDocument;
  
  // Add filter listeners - ONLY IF ELEMENTS EXIST
  const statusFilter = document.getElementById('filterStatus');
  const typeFilter = document.getElementById('filterDocumentType');
  const dateFromFilter = document.getElementById('filterDateFrom');
  const dateToFilter = document.getElementById('filterDateTo');
  const searchFilter = document.getElementById('filterSearch');
  const applyBtn = document.getElementById('applyFilters');
  const clearBtn = document.getElementById('clearFilters');
  
  if (statusFilter) statusFilter.onchange = applyPurchaseFilters;
  if (typeFilter) typeFilter.onchange = applyPurchaseFilters;
  if (dateFromFilter) dateFromFilter.onchange = applyPurchaseFilters;
  if (dateToFilter) dateToFilter.onchange = applyPurchaseFilters;
  
  // Real-time search as you type for the search box
  if (searchFilter) {
    searchFilter.oninput = applyPurchaseFilters;
  }
  
  // Manual apply and clear buttons
  if (applyBtn) applyBtn.onclick = applyPurchaseFilters;
  if (clearBtn) clearBtn.onclick = clearPurchaseFilters;
  
  // Export buttons - keep existing working ones
  const excelBtn = document.getElementById('exportPurchasesExcel');
  const pdfBtn = document.getElementById('exportPurchasesPdf');
  const csvBtn = document.getElementById('exportPurchasesCsv');
  
  if (excelBtn) excelBtn.onclick = exportPurchasesExcel;
  if (pdfBtn) pdfBtn.onclick = exportPurchasesPdf;
  if (csvBtn) csvBtn.onclick = exportPurchasesCsv;
}

// Step 1: Basic Purchase Filters (Simple Version)
let filteredPurchaseDocuments = []; // Store filtered results

// Enhanced filter function with SINGLE search box
function applyPurchaseFilters() {
  console.log('Applying enhanced filters...');
  
  // Get current filter values
  const statusFilter = document.getElementById('filterStatus')?.value || '';
  const typeFilter = document.getElementById('filterDocumentType')?.value || '';
  const dateFromFilter = document.getElementById('filterDateFrom')?.value || '';
  const dateToFilter = document.getElementById('filterDateTo')?.value || '';
  const searchFilter = document.getElementById('filterSearch')?.value.toLowerCase() || '';
  
  // Start with all documents
  let filtered = [...purchaseDocuments];
  
  // Apply status filter
  if (statusFilter) {
    filtered = filtered.filter(doc => doc.status === statusFilter);
  }
  
  // Apply document type filter
  if (typeFilter) {
    filtered = filtered.filter(doc => doc.document_type === typeFilter);
  }
  
  // Apply date from filter
  if (dateFromFilter) {
    filtered = filtered.filter(doc => {
      const docDate = new Date(doc.document_date);
      const fromDate = new Date(dateFromFilter);
      return docDate >= fromDate;
    });
  }
  
  // Apply date to filter
  if (dateToFilter) {
    filtered = filtered.filter(doc => {
      const docDate = new Date(doc.document_date);
      const toDate = new Date(dateToFilter);
      return docDate <= toDate;
    });
  }
  
  // Apply UNIVERSAL SEARCH - Document Number OR Supplier Name
  if (searchFilter) {
    filtered = filtered.filter(doc => {
      const docNumber = (doc.document_number || '').toLowerCase();
      const supplierName = (doc.suppliers?.name || '').toLowerCase();
      
      // Return true if search term is found in EITHER document number OR supplier name
      return docNumber.includes(searchFilter) || supplierName.includes(searchFilter);
    });
  }
  
  // Store filtered results
  filteredPurchaseDocuments = filtered;
  
  // Update the table display
  renderFilteredPurchases(filtered);
  
  // Update results display
  const resultsSpan = document.getElementById('filterResults');
  if (resultsSpan) {
    resultsSpan.textContent = `Showing ${filtered.length} of ${purchaseDocuments.length} documents`;
  }
  
  console.log(`Filtered: ${filtered.length} of ${purchaseDocuments.length} documents`);
  console.log('Filter criteria:', { statusFilter, typeFilter, dateFromFilter, dateToFilter, searchFilter });
}

// Render filtered purchases
function renderFilteredPurchases(documents) {
  const tbody = document.querySelector('#purchasesTable tbody');
  tbody.innerHTML = '';
  
  if (!documents || documents.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 20px;">No documents match the filters</td></tr>';
    return;
  }
  
  documents.forEach(doc => {
    // Status badge styling
    const statusClass = `status-${doc.status.toLowerCase().replace(' ', '-')}`;
    const typeIcon = doc.purchase_type === 'Inventory' ? '📦' : '💰';
    
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${doc.document_number}</td>
      <td>
        <span class="type-badge type-${doc.document_type.toLowerCase().replace(' ', '-')}">
          ${doc.document_type}
        </span>
      </td>
      <td>${doc.suppliers?.name || 'Unknown'}</td>
      <td>${new Date(doc.document_date).toLocaleDateString()}</td>
      <td>${doc.due_date ? new Date(doc.due_date).toLocaleDateString() : '-'}</td>
      <td style="font-weight: bold; color: var(--zande-green);">R${doc.total_amount.toFixed(2)}</td>
      <td>
        <span class="purchase-type-badge">
          ${typeIcon} ${doc.purchase_type || 'Unknown'}
        </span>
      </td>
      <td>
        <span class="status-badge ${statusClass}">${doc.status}</span>
        ${doc.purchase_type === 'Inventory' && (doc.status === 'Received' || doc.status === 'Paid') ? 
         `<br><small style="color: #059669; font-size: 0.8em;">📦 Stock Updated</small>` : ''}
      </td>
      <td>
        <div class="action-buttons">
          <button onclick="viewPurchaseDocuments('${doc.id}')" class="modern-btn view-btn" title="View Documents" style="margin-right: 5px;">
            <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"></path>
              <path d="M14 2v6h6"></path>
              <path d="M16 13H8"></path>
              <path d="M16 17H8"></path>
              <path d="M10 9H8"></path>
            </svg>
          </button>
          <button onclick="viewPurchase('${doc.id}')" class="modern-btn view-btn" title="View Details">
            <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
          </button>
          <button onclick="editPurchase('${doc.id}')" class="modern-btn edit-btn" title="Edit">
            <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 00-3 3L12 9l-4 1 1-4 3.5-3.5z"></path>
            </svg>
          </button>
          <button onclick="updatePurchaseStatus('${doc.id}', '${doc.status}')" class="modern-btn status-btn" title="Update Status">
            <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 12l2 2 4-4"></path>
              <circle cx="12" cy="12" r="9"></circle>
            </svg>
          </button>
          <button onclick="deletePurchase('${doc.id}')" class="modern-btn delete-btn" title="Delete">
            <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 6h18"></path>
              <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"></path>
              <line x1="10" y1="11" x2="10" y2="17"></line>
              <line x1="14" y1="11" x2="14" y2="17"></line>
            </svg>
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(row);
  });
}

// Clear all filters
function clearPurchaseFilters() {
  // Reset all filter controls
  if (document.getElementById('filterStatus')) {
    document.getElementById('filterStatus').value = '';
  }
  if (document.getElementById('filterDocumentType')) {
    document.getElementById('filterDocumentType').value = '';
  }
  if (document.getElementById('filterDateFrom')) {
    document.getElementById('filterDateFrom').value = '';
  }
  if (document.getElementById('filterDateTo')) {
    document.getElementById('filterDateTo').value = '';
  }
  // Clear the universal search box
  if (document.getElementById('filterSearch')) {
    document.getElementById('filterSearch').value = '';
  }
  
  // Show all documents
  filteredPurchaseDocuments = [...purchaseDocuments];
  renderFilteredPurchases(purchaseDocuments);
  
  // Update results display
  const resultsSpan = document.getElementById('filterResults');
  if (resultsSpan) {
    resultsSpan.textContent = `Showing ${purchaseDocuments.length} of ${purchaseDocuments.length} documents`;
  }
}
// Working PDF Export Function
async function exportPurchasesPdf() {
  console.log('Exporting purchases to PDF...');
  
  try {
    // Get the data
    const { data, error } = await supabase
      .from('purchases')
      .select('*, suppliers(name, supplier_code)')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    if (!data || data.length === 0) {
      alert('No purchase documents to export');
      return;
    }
    
    // Check if jsPDF is available
    if (typeof window.jspdf === 'undefined') {
      alert('PDF library not loaded. Please refresh the page and try again.');
      return;
    }
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Add company header
    doc.setFontSize(20);
    doc.setTextColor(61, 190, 125); // Zande green
    doc.text('ZandeBooks - Purchase Documents', 14, 22);
    
    // Add date and summary
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 32);
    doc.text(`Total Documents: ${data.length}`, 14, 38);
    
    // Calculate totals
    const totalAmount = data.reduce((sum, doc) => sum + (doc.total_amount || 0), 0);
    doc.text(`Total Value: R${totalAmount.toFixed(2)}`, 14, 44);
    
    // Prepare table data
    const tableData = data.map(doc => [
      doc.document_number || 'N/A',
      doc.document_type || 'N/A',
      (doc.suppliers?.name || 'Unknown').substring(0, 20), // Truncate long names
      new Date(doc.document_date).toLocaleDateString(),
      doc.due_date ? new Date(doc.due_date).toLocaleDateString() : '-',
      `R${(doc.total_amount || 0).toFixed(2)}`,
      doc.status || 'Draft'
    ]);
    
    // Create table using autoTable
    doc.autoTable({
      head: [['Document #', 'Type', 'Supplier', 'Date', 'Due Date', 'Total', 'Status']],
      body: tableData,
      startY: 55,
      styles: { 
        fontSize: 9,
        cellPadding: 3,
        overflow: 'linebreak'
      },
      headStyles: { 
        fillColor: [61, 190, 125], // Zande green
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      alternateRowStyles: {
        fillColor: [249, 250, 251] // Light gray
      },
      columnStyles: {
        0: { cellWidth: 25 }, // Document #
        1: { cellWidth: 25 }, // Type
        2: { cellWidth: 30 }, // Supplier
        3: { cellWidth: 25 }, // Date
        4: { cellWidth: 25 }, // Due Date
        5: { cellWidth: 25 }, // Total
        6: { cellWidth: 20 }  // Status
      }
    });
    
    // Add footer with summary
    const finalY = doc.lastAutoTable.finalY + 15;
    doc.setFontSize(14);
    doc.setTextColor(61, 190, 125);
    doc.text(`Grand Total: R${totalAmount.toFixed(2)}`, 14, finalY);
    
    // Add page numbers
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(10);
      doc.setTextColor(107, 114, 128);
      doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.width - 30, doc.internal.pageSize.height - 10);
    }
    
    // Generate filename with timestamp
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `ZandeBooks_Purchases_${timestamp}.pdf`;
    
    // Save the PDF
    doc.save(filename);
    
    // Show success message
    showNotification('Purchase documents exported to PDF successfully!', 'success');
    console.log('PDF export completed successfully');
    
  } catch (error) {
    console.error('Error exporting to PDF:', error);
    alert('Error exporting to PDF: ' + error.message);
  }
}

// Working CSV Export Function
async function exportPurchasesCsv() {
  console.log('Exporting purchases to CSV...');
  
  try {
    // Get the data
    const { data, error } = await supabase
      .from('purchases')
      .select('*, suppliers(name, supplier_code)')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    if (!data || data.length === 0) {
      alert('No purchase documents to export');
      return;
    }
    
    // Prepare CSV headers
    const headers = [
      'Document Number',
      'Document Type',
      'Supplier Name',
      'Supplier Code',
      'Document Date',
      'Due Date',
      'Reference',
      'Subtotal',
      'VAT Amount',
      'Total Amount',
      'Status',
      'Notes',
      'Created Date'
    ];
    
    // Prepare CSV rows
    const csvRows = data.map(doc => [
      `"${doc.document_number || ''}"`,
      `"${doc.document_type || ''}"`,
      `"${doc.suppliers?.name || 'Unknown'}"`,
      `"${doc.suppliers?.supplier_code || ''}"`,
      `"${doc.document_date ? new Date(doc.document_date).toLocaleDateString() : ''}"`,
      `"${doc.due_date ? new Date(doc.due_date).toLocaleDateString() : ''}"`,
      `"${doc.reference || ''}"`,
      `${doc.subtotal || 0}`,
      `${doc.vat_amount || 0}`,
      `${doc.total_amount || 0}`,
      `"${doc.status || 'Draft'}"`,
      `"${(doc.notes || '').replace(/"/g, '""')}"`, // Escape quotes in notes
      `"${doc.created_at ? new Date(doc.created_at).toLocaleDateString() : ''}"`
    ]);
    
    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...csvRows.map(row => row.join(','))
    ].join('\n');
    
    // Add BOM for proper Excel encoding
    const BOM = '\uFEFF';
    const csvWithBOM = BOM + csvContent;
    
    // Create and download file
    const blob = new Blob([csvWithBOM], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `ZandeBooks_Purchases_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up
    URL.revokeObjectURL(url);
    
    // Show success message
    showNotification('Purchase documents exported to CSV successfully!', 'success');
    console.log('CSV export completed successfully');
    
  } catch (error) {
    console.error('Error exporting to CSV:', error);
    alert('Error exporting to CSV: ' + error.message);
  }
}

// Enhanced Excel Export Function (improved version)
async function exportPurchasesExcel() {
  console.log('Exporting purchases to Excel...');
  
  try {
    // Get the data
    const { data, error } = await supabase
      .from('purchases')
      .select('*, suppliers(name, supplier_code)')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    if (!data || data.length === 0) {
      alert('No purchase documents to export');
      return;
    }
    
    // Check if XLSX is available
    if (typeof XLSX === 'undefined') {
      alert('Excel library not loaded. Please refresh the page and try again.');
      return;
    }
    
    // Prepare data for Excel
    const excelData = data.map(doc => ({
      'Document Number': doc.document_number || '',
      'Document Type': doc.document_type || '',
      'Supplier Name': doc.suppliers?.name || 'Unknown',
      'Supplier Code': doc.suppliers?.supplier_code || '',
      'Document Date': doc.document_date ? new Date(doc.document_date).toLocaleDateString() : '',
      'Due Date': doc.due_date ? new Date(doc.due_date).toLocaleDateString() : '',
      'Reference': doc.reference || '',
      'Subtotal': doc.subtotal || 0,
      'VAT Amount': doc.vat_amount || 0,
      'Total Amount': doc.total_amount || 0,
      'Status': doc.status || 'Draft',
      'Notes': doc.notes || '',
      'Created Date': doc.created_at ? new Date(doc.created_at).toLocaleDateString() : ''
    }));
    
    // Create workbook and worksheet
    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Purchases');
    
    // Set column widths for better formatting
    const colWidths = [
      { wch: 18 }, // Document Number
      { wch: 15 }, // Document Type
      { wch: 25 }, // Supplier Name
      { wch: 15 }, // Supplier Code
      { wch: 12 }, // Document Date
      { wch: 12 }, // Due Date
      { wch: 15 }, // Reference
      { wch: 12 }, // Subtotal
      { wch: 12 }, // VAT Amount
      { wch: 12 }, // Total Amount
      { wch: 12 }, // Status
      { wch: 30 }, // Notes
      { wch: 12 }  // Created Date
    ];
    ws['!cols'] = colWidths;
    
    // Add some styling to headers
    const range = XLSX.utils.decode_range(ws['!ref']);
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
      if (!ws[cellAddress]) continue;
      ws[cellAddress].s = {
        font: { bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "3DBE7D" } } // Zande green
      };
    }
    
    // Generate filename with timestamp
    const timestamp = new Date().toISOString().split('T')[0];
    const fileName = `ZandeBooks_Purchases_${timestamp}.xlsx`;
    
    // Save file
    XLSX.writeFile(wb, fileName);
    
    // Show success message
    showNotification('Purchase documents exported to Excel successfully!', 'success');
    console.log('Excel export completed successfully');
    
  } catch (error) {
    console.error('Error exporting to Excel:', error);
    alert('Error exporting to Excel: ' + error.message);
  }
}

// Load suppliers
async function loadPurchaseSuppliers() {
  try {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .order('is_preferred', { ascending: false }) // 🆕 Preferred suppliers first
      .order('name');
      
    if (error) {
      console.error('Error loading suppliers:', error);
      return;
    }
    
    const supplierSelect = document.getElementById('purchaseSupplier');
    supplierSelect.innerHTML = '<option value="">Select Supplier</option>';
    
    // 🆕 Group suppliers by preference
    const preferredSuppliers = data.filter(s => s.is_preferred);
    const regularSuppliers = data.filter(s => !s.is_preferred);
    
    // Add preferred suppliers first
    if (preferredSuppliers.length > 0) {
      const preferredGroup = document.createElement('optgroup');
      preferredGroup.label = '⭐ Preferred Suppliers';
      
      preferredSuppliers.forEach(supplier => {
        const option = document.createElement('option');
        option.value = supplier.id;
        option.textContent = `${supplier.supplier_code} - ${supplier.name}`;
        // 🆕 Store supplier data for auto-fill
        option.dataset.defaultExpenseAccount = supplier.default_expense_account || '';
        option.dataset.paymentTerms = supplier.payment_terms || 30;
        option.dataset.currency = supplier.currency_code || 'ZAR';
        option.dataset.vatNumber = supplier.vat_number || '';
        preferredGroup.appendChild(option);
      });
      
      supplierSelect.appendChild(preferredGroup);
    }
    
    // Add regular suppliers
    if (regularSuppliers.length > 0) {
      const regularGroup = document.createElement('optgroup');
      regularGroup.label = '🏪 All Suppliers';
      
      regularSuppliers.forEach(supplier => {
        const option = document.createElement('option');
        option.value = supplier.id;
        option.textContent = `${supplier.supplier_code} - ${supplier.name}`;
        // 🆕 Store supplier data for auto-fill
        option.dataset.defaultExpenseAccount = supplier.default_expense_account || '';
        option.dataset.paymentTerms = supplier.payment_terms || 30;
        option.dataset.currency = supplier.currency_code || 'ZAR';
        option.dataset.vatNumber = supplier.vat_number || '';
        regularGroup.appendChild(option);
      });
      
      supplierSelect.appendChild(regularGroup);
    }
    
    console.log(`✅ Loaded ${data.length} suppliers (${preferredSuppliers.length} preferred)`);
    
  } catch (error) {
    console.error('Error loading suppliers:', error);
  }
}

// Load products
async function loadProductsForPurchases() {
  try {
    console.log('📦 Loading products for purchase line items...');
    
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true });
    
    if (error) {
      console.error('Error loading products for purchases:', error);
      return;
    }
    
    // Store globally for access in line items
    window.purchaseProducts = data;
    
    console.log(`✅ Loaded ${data.length} products for purchases`);
    
    // Update low stock alerts if modal is open
    if (document.getElementById('purchaseModal') && document.getElementById('purchaseModal').style.display === 'block') {
      checkAndShowLowStockAlerts();
    }
    
  } catch (error) {
    console.error('Error in loadProductsForPurchases:', error);
  }
}

// Keep the old function name as an alias for compatibility
const loadPurchaseProducts = loadProductsForPurchases;

// Open purchase modal
function openPurchaseModal(documentType, purchase = null) {
  purchaseLineItems = [];
  
  const modal = document.getElementById('purchaseModal');
  if (!modal) {
    console.error('Purchase modal not found!');
    return;
  }
  
  modal.style.display = 'block';
  document.getElementById('purchaseModalTitle').textContent = purchase ? `Edit ${documentType}` : `Create ${documentType}`;
  document.getElementById('purchaseForm').reset();
  document.getElementById('purchaseDocumentType').value = documentType;
  document.getElementById('purchaseDocumentDate').value = new Date().toISOString().split('T')[0];
  
  // Reset expense/inventory account field styling
  const expenseAccountField = document.getElementById('purchaseExpenseAccountField');
  const expenseAccountSelect = document.getElementById('purchaseExpenseAccount');
  
  if (expenseAccountField) {
    expenseAccountField.style.display = 'none';
  }
  
  if (expenseAccountSelect) {
    expenseAccountSelect.style.backgroundColor = '';
    expenseAccountSelect.style.cursor = '';
    expenseAccountSelect.innerHTML = '<option value="">Select Account</option>';
  }
  
  // Reset label text
  const label = expenseAccountField?.querySelector('label');
  if (label) {
    label.innerHTML = 'Account: <span style="color: red;">*</span>';
  }
  
  // Remove any existing supplier info panel
  const existingPanel = document.getElementById('supplierInfoPanel');
  if (existingPanel) {
    existingPanel.remove();
  }
  
  // 🆕 CLEAR AND INITIALIZE DOCUMENT UPLOAD ARRAYS
  purchaseUploadedDocuments = [];
  purchaseExistingDocuments = [];
  updatePurchaseDocumentPreview();

  // 🆕 SETUP DOCUMENT UPLOAD LISTENER
  const fileInput = document.getElementById('purchaseDocuments');
  if (fileInput) {
    fileInput.onchange = handlePurchaseDocumentUpload;
    console.log('✅ Document upload listener attached');
  } else {
    console.warn('⚠️ Purchase documents file input not found in HTML');
  }

  // 🆕 LOAD EXISTING DOCUMENTS IF EDITING
  if (purchase && purchase.id) {
    console.log('📁 Loading existing documents for purchase:', purchase.id);
    loadExistingPurchaseDocuments(purchase.id);
  }
  
  // Generate document number
  if (!purchase) {
    generatePurchaseNumber(documentType);
  } else {
    // Populate existing purchase data
    populateExistingPurchaseData(purchase);
  }
  
  // Add supplier change event listener
  const supplierSelect = document.getElementById('purchaseSupplier');
  if (supplierSelect) {
    supplierSelect.onchange = handlePurchaseSupplierChange;
  }
  
  // Add one line item
  addPurchaseLineItem();
  updatePurchaseTotals();
}


// Generate document number
function generatePurchaseNumber(type) {
  const prefix = { 'Purchase Order': 'PO', 'Bill': 'BILL', 'Credit Note': 'PCN' };
  const number = Date.now().toString().slice(-4);
  document.getElementById('purchaseDocumentNumber').value = `${prefix[type]}-${number}`;
}

// Add line item
function addPurchaseLineItem() {
  const lineItem = {
    product_id: '',
    description: '',
    quantity: 1,
    unit_cost: 0,
    tax_code: 'Standard',
    tax_rate: 15,
    line_total: 0
  };
  
  purchaseLineItems.push(lineItem);
  renderPurchaseLineItems();
}

// Render line items
function renderPurchaseLineItems() {
  const container = document.getElementById('purchaseLineItemsContainer');
  container.innerHTML = '';
  
  purchaseLineItems.forEach((item, index) => {
    // Get product info for display
    const product = window.purchaseProducts?.find(p => p.id === item.product_id);
    let productInfo = '';
    let stockWarning = '';
    
    if (product) {
      productInfo = `
        <small style="color: #059669; display: block; margin-top: 4px;">
          💰 Current Cost: R${(product.cost_price || 0).toFixed(2)} | 
          📦 Stock: ${product.stock_quantity || 0} ${product.unit_of_measure || 'units'}
          ${product.reorder_level ? ` | ⚠️ Reorder at: ${product.reorder_level}` : ''}
        </small>
      `;
      
      // Show stock status for inventory items
      if (product.category === 'Product') {
        const currentStock = product.stock_quantity || 0;
        const reorderLevel = product.reorder_level || 0;
        
        if (currentStock <= reorderLevel) {
          stockWarning = `
            <div style="background: #fef3c7; color: #92400e; padding: 4px 8px; border-radius: 4px; font-size: 0.8em; margin-top: 4px;">
              📢 Low Stock Alert! Current: ${currentStock}, Reorder at: ${reorderLevel}
            </div>
          `;
        }
      }
    }
    
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>
        <select class="product-select" onchange="selectPurchaseProduct(${index}, this.value)" style="width: 100%;">
          <option value="">Select Product/Service</option>
          ${window.purchaseProducts ? window.purchaseProducts.map(product => {
            // Show category and current cost in dropdown
            const categoryIcon = product.category === 'Product' ? '📦' : '🔧';
            const costInfo = product.cost_price ? ` - R${parseFloat(product.cost_price).toFixed(2)}` : '';
            const stockInfo = product.category === 'Product' && product.stock_quantity !== null ? 
              ` (Stock: ${product.stock_quantity})` : '';
            
            return `<option value="${product.id}" ${item.product_id === product.id ? 'selected' : ''}>
              ${categoryIcon} ${product.product_code} - ${product.name}${costInfo}${stockInfo}
            </option>`;
          }).join('') : ''}
        </select>
        ${productInfo}
        ${stockWarning}
      </td>
      <td>
        <input type="text" value="${item.description}" 
               onchange="updatePurchaseLineItem(${index}, 'description', this.value)"
               placeholder="Item description..." style="width: 100%;">
      </td>
      <td>
        <input type="number" value="${item.quantity}" min="0" step="0.01"
               onchange="updatePurchaseLineItem(${index}, 'quantity', this.value)"
               placeholder="Qty" style="width: 100%;">
      </td>
      <td>
        <input type="number" value="${item.unit_cost.toFixed(2)}" min="0" step="0.01"
               onchange="updatePurchaseLineItem(${index}, 'unit_cost', this.value)"
               placeholder="Unit Cost" style="width: 100%;">
        ${product ? `<small style="color: #666; display: block;">Suggested: R${(product.cost_price || 0).toFixed(2)}</small>` : ''}
      </td>
      <td>
        <select onchange="updatePurchaseLineItem(${index}, 'tax_code', this.value)" style="width: 100%;">
          <option value="Standard" ${item.tax_code === 'Standard' ? 'selected' : ''}>15%</option>
          <option value="Zero" ${item.tax_code === 'Zero' ? 'selected' : ''}>0%</option>
          <option value="Exempt" ${item.tax_code === 'Exempt' ? 'selected' : ''}>Exempt</option>
        </select>
      </td>
      <td style="text-align: right; font-weight: bold; color: var(--zande-green);">
        R${item.line_total.toFixed(2)}
      </td>
      <td>
        <button type="button" onclick="removePurchaseLineItem(${index})" 
                style="background: #dc2626; color: white; border: none; border-radius: 4px; padding: 5px 8px; cursor: pointer;">
          ×
        </button>
      </td>
    `;
    container.appendChild(row);
  });
}

// Select product
function selectPurchaseProduct(index, productId) {
  if (!productId) {
    // Clear product selection
    purchaseLineItems[index].product_id = '';
    purchaseLineItems[index].description = '';
    purchaseLineItems[index].unit_cost = 0;
    purchaseLineItems[index].tax_code = 'Standard';
    purchaseLineItems[index].product_info = null;
    calculatePurchaseLineTotal(index);
    renderPurchaseLineItems();
    updatePurchaseTotals();
    return;
  }
  
  const product = window.purchaseProducts.find(p => p.id === productId);
  if (product) {
    console.log('📦 Selected product for purchase:', product);
    
    // Auto-fill product details
    purchaseLineItems[index].product_id = productId;
    purchaseLineItems[index].description = product.name;
    
    // 🆕 Smart cost pricing logic
    let suggestedCost = parseFloat(product.cost_price) || 0;
    
    // If no cost price exists, suggest current sell price * 0.6 (40% markup)
    if (suggestedCost === 0 && product.sell_price) {
      suggestedCost = parseFloat(product.sell_price) * 0.6;
      console.log(`💡 No cost price found, suggesting R${suggestedCost.toFixed(2)} (60% of sell price)`);
    }
    
    purchaseLineItems[index].unit_cost = suggestedCost;
    purchaseLineItems[index].tax_code = product.tax_code || 'Standard';
    
    // Set tax rate
    const taxRates = { 'Standard': 15, 'Zero': 0, 'Exempt': 0 };
    purchaseLineItems[index].tax_rate = taxRates[product.tax_code] || 15;
    
    // Store product info for later use
    purchaseLineItems[index].product_info = {
      ...product,
      category: product.category,
      current_stock: product.stock_quantity || 0,
      reorder_level: product.reorder_level || 0,
      unit_of_measure: product.unit_of_measure || 'Each'
    };
    
    // Calculate line total
    calculatePurchaseLineTotal(index);
    
    // Show notification for low stock items
    if (product.category === 'Product') {
      const currentStock = product.stock_quantity || 0;
      const reorderLevel = product.reorder_level || 0;
      
      if (currentStock <= reorderLevel) {
        showNotification(`📢 "${product.name}" is below reorder level! Current: ${currentStock}, Reorder: ${reorderLevel}`, 'warning');
      }
    }
    
    // Re-render to show updated info
    renderPurchaseLineItems();
    updatePurchaseTotals();
  }
}

// Update line item
function updatePurchaseLineItem(index, field, value) {
  if (field === 'quantity' || field === 'unit_cost') {
    purchaseLineItems[index][field] = parseFloat(value) || 0;
  } else {
    purchaseLineItems[index][field] = value;
  }
  
  if (field === 'tax_code') {
    const taxRates = { 'Standard': 15, 'Zero': 0, 'Exempt': 0 };
    purchaseLineItems[index].tax_rate = taxRates[value] || 15;
  }
  
  calculatePurchaseLineTotal(index);
  renderPurchaseLineItems();
  updatePurchaseTotals();
}

// Calculate line total
function calculatePurchaseLineTotal(index) {
  const item = purchaseLineItems[index];
  item.line_total = (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_cost) || 0);
}

// Remove line item
function removePurchaseLineItem(index) {
  purchaseLineItems.splice(index, 1);
  renderPurchaseLineItems();
  updatePurchaseTotals();
}

// Update totals
function updatePurchaseTotals() {
  let subtotal = 0;
  let vatAmount = 0;
  
  purchaseLineItems.forEach(item => {
    const lineTotal = parseFloat(item.line_total) || 0;
    const taxRate = parseFloat(item.tax_rate) || 0;
    
    subtotal += lineTotal;
    vatAmount += (lineTotal * taxRate / 100);
  });
  
  const total = subtotal + vatAmount;
  
  document.getElementById('purchaseSubtotal').textContent = subtotal.toFixed(2);
  document.getElementById('purchaseVatAmount').textContent = vatAmount.toFixed(2);
  document.getElementById('purchaseTotalAmount').textContent = total.toFixed(2);
}

// Save purchase document
async function savePurchaseDocument(e) {
  e.preventDefault();
  
  if (purchaseLineItems.length === 0) {
    alert('Please add at least one line item');
    return;
  }
  
  const purchaseType = document.getElementById('purchaseType').value;
  const status = document.getElementById('purchaseStatus').value;
  
  if (!purchaseType) {
    alert('Please select a purchase type (Inventory or Expenditure)');
    return;
  }
  
  // Validate expense account for expenditure purchases
  let expenseAccount = null;
  if (purchaseType === 'Expenditure') {
    expenseAccount = document.getElementById('purchaseExpenseAccount').value;
    if (!expenseAccount) {
      alert('Please select an expense account for expenditure purchases');
      return;
    }
  }
  
  // Get supplier name for GL descriptions
  const supplierSelect = document.getElementById('purchaseSupplier');
  const supplierName = supplierSelect.options[supplierSelect.selectedIndex]?.text || 'Unknown Supplier';
  
  // 🆕 CHECK IF EDITING EXISTING PURCHASE
  const modal = document.getElementById('purchaseModal');
  const editId = modal?.getAttribute('data-edit-id');
  const isEditing = editId && editId !== 'null' && editId !== 'undefined';
  
  const purchaseData = {
    document_type: document.getElementById('purchaseDocumentType').value,
    document_number: document.getElementById('purchaseDocumentNumber').value,
    supplier_id: document.getElementById('purchaseSupplier').value,
    document_date: document.getElementById('purchaseDocumentDate').value,
    due_date: document.getElementById('purchaseDueDate').value || null,
    reference: document.getElementById('purchaseReference').value || null,
    purchase_type: purchaseType,
    expense_account: expenseAccount,
    subtotal: parseFloat(document.getElementById('purchaseSubtotal').textContent),
    vat_amount: parseFloat(document.getElementById('purchaseVatAmount').textContent),
    total_amount: parseFloat(document.getElementById('purchaseTotalAmount').textContent),
    status: status,
    notes: document.getElementById('purchaseNotes').value || null,
    supplier_name: supplierName
  };
  
  try {
    console.log('💾 Saving purchase document:', { isEditing, editId, purchaseData });
    showNotification('Saving purchase document...', 'info');
    
    let result;
    
    if (isEditing) {
      // 🆕 UPDATE EXISTING PURCHASE
      result = await supabase
        .from('purchases')
        .update(purchaseData)
        .eq('id', editId)
        .select()
        .single();
      
      if (result.error) throw result.error;
      
      console.log('✅ Purchase updated:', result.data);
      
      // Delete existing line items first
      await supabase
        .from('purchase_line_items')
        .delete()
        .eq('purchase_id', editId);
      
    } else {
      // 🆕 INSERT NEW PURCHASE
      result = await supabase
        .from('purchases')
        .insert([purchaseData])
        .select()
        .single();
      
      if (result.error) throw result.error;
      
      console.log('✅ Purchase created:', result.data);
    }
    
    const savedPurchase = result.data;
    const purchaseId = savedPurchase.id;
    
    // Save line items (same for both create and update)
    const lineItemsData = purchaseLineItems.map(item => ({
      purchase_id: purchaseId,
      product_id: item.product_id || null,
      description: item.description,
      quantity: item.quantity,
      unit_cost: item.unit_cost,
      tax_code: item.tax_code,
      tax_rate: item.tax_rate,
      line_total: item.line_total
    }));
    
    const { error: lineError } = await supabase
      .from('purchase_line_items')
      .insert(lineItemsData);
    
    if (lineError) throw lineError;
    
    console.log('✅ Line items saved successfully');
    
    // 🆕 SAVE DOCUMENT ASSOCIATIONS (for both create and update)
    if (purchaseUploadedDocuments.length > 0 || purchaseExistingDocuments.some(d => d.marked_for_deletion)) {
      await savePurchaseDocumentAssociations(purchaseId);
    }

    // Update the success message to include document count
    const fileCount = purchaseUploadedDocuments.length;
    const fileMessage = fileCount > 0 ? ` with ${fileCount} supporting document(s)` : '';
    const actionText = isEditing ? 'updated' : 'created';
    
    // Process status-dependent actions only for new purchases or status changes
    if ((status === 'Received' || status === 'Paid') && purchaseType === 'Inventory') {
      console.log('📦 Processing stock updates for inventory purchase...');
      try {
        await processPurchaseStockUpdates(savedPurchase, purchaseLineItems);
      } catch (stockError) {
        console.error('❌ Stock update error:', stockError);
        showNotification(`Purchase ${actionText} but stock update failed: ${stockError.message}`, 'warning');
      }
    }
    
    // POST TO GENERAL LEDGER ONLY FOR RECEIVED OR PAID STATUS
    if (status === 'Received' || status === 'Paid') {
      try {
        console.log('🔄 Posting purchase to General Ledger...');
        
        // Generate GL entries for the bill received
        const glEntries = GLEntryTemplates.purchaseBill(purchaseData);
        
        // Post to General Ledger
        const glResult = await postToGeneralLedger(glEntries, 'purchases', purchaseId);
        
        if (glResult.success) {
          console.log('✅ Purchase posted to General Ledger successfully');
          
          // If status is "Paid", also post the payment entry
          if (status === 'Paid') {
            const paymentGLEntries = GLEntryTemplates.purchasePayment({
              ...purchaseData,
              amount: purchaseData.total_amount,
              payment_date: purchaseData.document_date,
              bank_account_code: '1120',
              bank_account_name: 'Bank Account'
            });
            
            const paymentGLResult = await postToGeneralLedger(paymentGLEntries, 'purchases_payment', purchaseId);
            
            if (paymentGLResult.success) {
              console.log('✅ Purchase payment posted to GL successfully');
            }
          }
          
          // Enhanced success message with stock info
          let successMessage = `✅ Purchase ${actionText} and posted to General Ledger${fileMessage}!`;
          
          if (purchaseType === 'Inventory' && (status === 'Received' || status === 'Paid')) {
            const inventoryItemsCount = purchaseLineItems.filter(item => item.product_id).length;
            if (inventoryItemsCount > 0) {
              successMessage += ` Stock updated for ${inventoryItemsCount} item(s).`;
            }
          }
          
          showNotification(successMessage, 'success');
        } else {
          throw new Error('GL posting failed: ' + glResult.error);
        }
        
      } catch (glError) {
        console.error('❌ GL posting error:', glError);
        showNotification(`Purchase ${actionText} but failed to post to GL: ${glError.message}`, 'warning');
      }
    } else {
      // Enhanced message for draft/ordered status
      let statusMessage = `✅ Purchase ${purchaseData.document_type} ${actionText} as ${status}${fileMessage}!`;
      
      if (status === 'Draft' || status === 'Ordered') {
        statusMessage += ' Stock will be updated when status changes to Received/Paid.';
      }
      
      showNotification(statusMessage, 'success');
    }
    
    // Clear document arrays and edit state
    purchaseUploadedDocuments = [];
    purchaseExistingDocuments = [];
    
    // Clear edit mode
    if (modal) {
      modal.removeAttribute('data-edit-id');
    }
    
    // Cleanup and refresh
    closePurchaseModal();
    loadPurchaseDocuments();
    
    // Refresh related modules if user is viewing them
    if (document.getElementById('general-ledgerSection')?.style.display !== 'none') {
      loadGeneralLedgerData();
    }
    
    if (document.getElementById('productsSection')?.style.display !== 'none') {
      loadProducts(); // Refresh products to show updated stock levels
    }
    
  } catch (error) {
    console.error('❌ Error saving purchase:', error);
    showNotification('Error saving purchase: ' + error.message, 'error');
  }
}


// Process stock/expense updates based on purchase type
async function processPurchaseUpdates(purchaseDoc, lineItems, purchaseType) {
  if (purchaseDoc.status === 'Received' || purchaseDoc.status === 'Paid') {
    
    if (purchaseType === 'Inventory') {
      // Update stock levels for inventory items
      for (const item of lineItems) {
        if (item.product_id) {
          await updateProductStock(item.product_id, item.quantity);
        }
      }
      showNotification('✅ Stock levels updated for inventory items', 'success');
      
    } else if (purchaseType === 'Expenditure') {
      // Record as expense
      await recordExpense(purchaseDoc, lineItems);
      showNotification('✅ Expense recorded in accounting', 'success');
    }
  }
}

// Update product stock levels
async function updateProductStock(productId, quantity) {
  try {
    // Get current stock
    const { data: product } = await supabase
      .from('products')
      .select('stock_quantity')
      .eq('id', productId)
      .single();
    
    if (product) {
      const newStock = (product.stock_quantity || 0) + quantity;
      
      // Update stock
      await supabase
        .from('products')
        .update({ stock_quantity: newStock })
        .eq('id', productId);
      
      console.log(`Updated stock for product ${productId}: +${quantity} = ${newStock}`);
    }
  } catch (error) {
    console.error('Error updating stock:', error);
  }
}

// Record expense in accounting
async function recordExpense(purchaseDoc, lineItems) {
  try {
    // Create expense entries
    const expenseEntries = lineItems.map(item => ({
      date: purchaseDoc.document_date,
      description: `${purchaseDoc.document_type}: ${item.description}`,
      amount: item.line_total,
      category: 'Purchases',
      supplier_id: purchaseDoc.supplier_id,
      reference: `${purchaseDoc.document_number} - ${item.description}`,
      tax_amount: (item.line_total * item.tax_rate / 100),
      purchase_id: purchaseDoc.id
    }));
    
    // Save to expenses table (you'll need to create this table)
    const { error } = await supabase
      .from('expenses')
      .insert(expenseEntries);
    
    if (error) throw error;
    
    console.log(`Recorded ${expenseEntries.length} expense entries`);
  } catch (error) {
    console.error('Error recording expenses:', error);
  }
}

// Load purchase documents
async function loadPurchaseDocuments() {
  try {
    const { data, error } = await supabase
      .from('purchases')
      .select(`
        *,
        suppliers (name, supplier_code)
      `)
      .order('created_at', { ascending: false });
      
    if (error) {
      console.error('Error loading purchases:', error);
      return;
    }
    
    // Store all documents globally
    purchaseDocuments = data || [];
    
    // Initialize filtered documents with all documents
    filteredPurchaseDocuments = [...purchaseDocuments];
    
    // Use the SAME rendering function as the filters
    renderFilteredPurchases(purchaseDocuments);
    
    // Update results display
    const resultsSpan = document.getElementById('filterResults');
    if (resultsSpan) {
      resultsSpan.textContent = `Showing ${purchaseDocuments.length} of ${purchaseDocuments.length} documents`;
    }
    
    console.log(`✅ Loaded ${purchaseDocuments.length} purchase documents`);
    
  } catch (error) {
    console.error('Error loading purchases:', error);
    showNotification('Error loading purchases: ' + error.message, 'error');
  }
}

//  Update purchase status function
async function updatePurchaseStatus(purchaseId, currentStatus) {
  const statuses = ['Draft', 'Ordered', 'Received', 'Paid'];
  
  // Create a better status selection modal
  const statusOptions = statuses.map((status, index) => 
    `${index + 1}. ${status}${status === currentStatus ? ' (Current)' : ''}`
  ).join('\n');
  
  const newStatusNumber = prompt(
    `Select new status:\n\n${statusOptions}\n\nEnter number (1-4):`,
    (statuses.indexOf(currentStatus) + 1).toString()
  );
  
  if (!newStatusNumber || newStatusNumber < 1 || newStatusNumber > 4) {
    return; // User cancelled or invalid input
  }
  
  const selectedStatus = statuses[parseInt(newStatusNumber) - 1];
  
  if (selectedStatus === currentStatus) {
    showNotification('Status unchanged', 'info');
    return;
  }
  
  try {
    console.log(`🔄 Updating purchase ${purchaseId} status: ${currentStatus} → ${selectedStatus}`);
    
    // Update status in database
    const { error } = await supabase
      .from('purchases')
      .update({ status: selectedStatus })
      .eq('id', purchaseId);
    
    if (error) throw error;
    
    // 🆕 GET PURCHASE DETAILS FOR PROCESSING
    const { data: purchase, error: fetchError } = await supabase
      .from('purchases')
      .select(`
        *,
        suppliers (name, supplier_code),
        purchase_line_items (*)
      `)
      .eq('id', purchaseId)
      .single();
    
    if (fetchError) throw fetchError;
    
    // 🆕 PROCESS STOCK UPDATES when changing TO Received/Paid from Draft/Ordered
    const shouldProcessStock = (selectedStatus === 'Received' || selectedStatus === 'Paid') && 
                              (currentStatus === 'Draft' || currentStatus === 'Ordered') &&
                              purchase.purchase_type === 'Inventory';

    if (shouldProcessStock) {
      console.log('📦 Processing stock updates due to status change...');
      try {
        await processPurchaseStockUpdates(purchase, purchase.purchase_line_items);
      } catch (stockError) {
        console.error('❌ Stock update error:', stockError);
        showNotification(`Status updated but stock update failed: ${stockError.message}`, 'warning');
      }
    }
    
    // 🆕 POST TO GENERAL LEDGER if status changed to Received/Paid
    if ((selectedStatus === 'Received' || selectedStatus === 'Paid') && 
        (currentStatus === 'Draft' || currentStatus === 'Ordered')) {
      
      try {
        console.log('🔄 Posting status change to General Ledger...');
        
        // Add supplier name for GL descriptions
        purchase.supplier_name = purchase.suppliers?.name || 'Unknown Supplier';
        
        // Generate GL entries for the bill received
        const glEntries = GLEntryTemplates.purchaseBill(purchase);
        
        // Post to General Ledger
        const glResult = await postToGeneralLedger(glEntries, 'purchases', purchase.id);
        
        if (glResult.success) {
          console.log('✅ Purchase status change posted to GL successfully');
          
          // If status is "Paid", also post the payment entry
          if (selectedStatus === 'Paid') {
            const paymentGLEntries = GLEntryTemplates.purchasePayment({
              ...purchase,
              amount: purchase.total_amount,
              payment_date: new Date().toISOString().split('T')[0],
              bank_account_code: '1120',
              bank_account_name: 'Bank Account'
            });
            
            const paymentGLResult = await postToGeneralLedger(paymentGLEntries, 'purchases_payment', purchase.id);
            
            if (paymentGLResult.success) {
              console.log('✅ Purchase payment also posted to GL');
            }
          }
          
          // 🆕 Enhanced success message
          let successMessage = `✅ Status updated to ${selectedStatus} and posted to General Ledger!`;
          
          if (shouldProcessStock) {
            const inventoryItemsCount = purchase.purchase_line_items.filter(item => item.product_id).length;
            if (inventoryItemsCount > 0) {
              successMessage += ` Stock updated for ${inventoryItemsCount} item(s).`;
            }
          }
          
          showNotification(successMessage, 'success');
        } else {
          throw new Error('GL posting failed: ' + glResult.error);
        }
        
      } catch (glError) {
        console.error('❌ GL posting error:', glError);
        showNotification(`Status updated to ${selectedStatus} but failed to post to GL: ${glError.message}`, 'warning');
      }
    } else {
      // Simple status update without GL posting
      let successMessage = `✅ Status updated to ${selectedStatus}`;
      
      if (shouldProcessStock) {
        const inventoryItemsCount = purchase.purchase_line_items.filter(item => item.product_id).length;
        if (inventoryItemsCount > 0) {
          successMessage += `. Stock updated for ${inventoryItemsCount} item(s).`;
        }
      }
      
      showNotification(successMessage, 'success');
    }
    
    // Refresh the table using the same function as initial load
    loadPurchaseDocuments();
    
    // Refresh related modules if user is viewing them
    if (document.getElementById('general-ledgerSection')?.style.display !== 'none') {
      loadGeneralLedgerData();
    }
    
    if (document.getElementById('productsSection')?.style.display !== 'none') {
      loadProducts(); // Refresh products to show updated stock levels
    }
    
  } catch (error) {
    console.error('❌ Error updating status:', error);
    showNotification('Error updating status: ' + error.message, 'error');
  }
}

// Show low stock alerts when adding products to purchase
function checkAndShowLowStockAlerts() {
  const lowStockProducts = [];
  
  if (window.purchaseProducts) {
    window.purchaseProducts.forEach(product => {
      if (product.category === 'Product') {
        const currentStock = product.stock_quantity || 0;
        const reorderLevel = product.reorder_level || 0;
        
        if (currentStock <= reorderLevel) {
          lowStockProducts.push({
            code: product.product_code,
            name: product.name,
            currentStock: currentStock,
            reorderLevel: reorderLevel
          });
        }
      }
    });
  }
  
  if (lowStockProducts.length > 0) {
    const alertContainer = document.getElementById('lowStockAlertContainer');
    if (alertContainer) {
      const alertHTML = `
        <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
          <div style="display: flex; align-items: center; margin-bottom: 10px;">
            <span style="font-size: 24px; margin-right: 10px;">⚠️</span>
            <strong style="color: #92400e;">Low Stock Alert</strong>
          </div>
          <p style="margin-bottom: 10px; color: #92400e;">The following products are at or below their reorder level:</p>
          <div style="max-height: 120px; overflow-y: auto;">
            ${lowStockProducts.map(product => `
              <div style="margin-bottom: 5px; font-size: 0.9em;">
                📦 <strong>${product.code}</strong> - ${product.name}
                <span style="color: #dc2626;">
                  (Stock: ${product.currentStock}, Reorder: ${product.reorderLevel})
                </span>
              </div>
            `).join('')}
          </div>
          <p style="margin-top: 10px; font-size: 0.9em; color: #92400e;">
            <em>Consider purchasing these items to maintain adequate inventory levels.</em>
          </p>
        </div>
      `;
      
      alertContainer.innerHTML = alertHTML;
    }
  }
}

// Update your openPurchaseModal function to include low stock alerts
function openPurchaseModalEnhanced(documentType) {
  // ... existing openPurchaseModal code ...
  
  // 🆕 Add low stock alert container check after opening modal
  setTimeout(() => {
    checkAndShowLowStockAlerts();
  }, 100);
}

// Close modal
function closePurchaseModal() {
  document.getElementById('purchaseModal').style.display = 'none';
  purchaseLineItems = [];
}

// Placeholder functions
async function viewPurchase(id) {
  try {
    const { data: doc } = await supabase
      .from('purchases')
      .select('*, suppliers(name)')
      .eq('id', id)
      .single();
    
    const { data: lineItems } = await supabase
      .from('purchase_line_items')
      .select('*')
      .eq('purchase_id', id);
    
    let details = `PURCHASE DOCUMENT DETAILS\n\n`;
    details += `Document: ${doc.document_number}\n`;
    details += `Type: ${doc.document_type}\n`;
    details += `Supplier: ${doc.suppliers?.name || 'Unknown'}\n`;
    details += `Date: ${new Date(doc.document_date).toLocaleDateString()}\n`;
    details += `Total: R${doc.total_amount.toFixed(2)}\n`;
    details += `Status: ${doc.status}\n\n`;
    details += `LINE ITEMS:\n`;
    lineItems.forEach(item => {
      details += `- ${item.description}: ${item.quantity} × R${item.unit_cost} = R${item.line_total.toFixed(2)}\n`;
    });
    
    alert(details);
    
  } catch (error) {
    console.error('Error viewing purchase:', error);
    alert('Error loading purchase details');
  }
}

// NEW: Enhanced edit function
async function editPurchase(id) {
  try {
    console.log('📝 Loading purchase for edit:', id);
    
    const { data: purchase, error } = await supabase
      .from('purchases')
      .select(`
        *,
        purchase_line_items(*),
        suppliers(name)
      `)
      .eq('id', id)
      .single();
    
    if (error) throw error;
    
    // Load required data first
    await loadPurchaseSuppliers();
    await loadProductsForPurchases();
    
    // Open modal with purchase data
    openPurchaseModal(purchase.document_type, purchase);
    
    // Load line items
    if (purchase.purchase_line_items) {
      purchaseLineItems = purchase.purchase_line_items.map(item => ({
        product_id: item.product_id,
        description: item.description,
        quantity: item.quantity,
        unit_cost: item.unit_cost,
        tax_code: item.tax_code,
        tax_rate: item.tax_rate,
        line_total: item.line_total
      }));
    }
    
    renderPurchaseLineItems();
    updatePurchaseTotals();
    
    // 🆕 IMPORTANT: Store edit ID for update instead of insert
    const modal = document.getElementById('purchaseModal');
    if (modal) {
      modal.setAttribute('data-edit-id', id);
    }
    
    console.log('✅ Purchase loaded for editing');
    
  } catch (error) {
    console.error('❌ Error loading purchase for edit:', error);
    showNotification('Error loading purchase details: ' + error.message, 'error');
  }
}


async function deletePurchase(id) {
  if (!confirm('Are you sure you want to delete this purchase document?')) return;
  
  try {
    // Delete line items first
    await supabase.from('purchase_line_items').delete().eq('purchase_id', id);
    
    // Delete main document
    await supabase.from('purchases').delete().eq('id', id);
    
    alert('Purchase document deleted successfully!');
    loadPurchaseDocuments();
    
  } catch (error) {
    console.error('Error deleting purchase:', error);
    alert('Error deleting purchase: ' + error.message);
  }
}

// Populate existing purchase data when editing
function populateExistingPurchaseData(purchase) {
  document.getElementById('purchaseDocumentNumber').value = purchase.document_number || '';
  document.getElementById('purchaseSupplier').value = purchase.supplier_id || '';
  document.getElementById('purchaseDocumentDate').value = purchase.document_date || '';
  document.getElementById('purchaseDueDate').value = purchase.due_date || '';
  document.getElementById('purchaseReference').value = purchase.reference || '';
  document.getElementById('purchaseType').value = purchase.purchase_type || 'Inventory';
  document.getElementById('purchaseExpenseAccount').value = purchase.expense_account || '';
  document.getElementById('purchaseStatus').value = purchase.status || 'Draft';
  document.getElementById('purchaseNotes').value = purchase.notes || '';
  
  // Show expense account field if needed
  if (purchase.purchase_type === 'Expenditure') {
    const expenseAccountField = document.getElementById('purchaseExpenseAccountField');
    if (expenseAccountField) {
      expenseAccountField.style.display = 'block';
    }
  }
}

// Make function global
window.populateExistingPurchaseData = populateExistingPurchaseData;

// Handle purchase type change
function handlePurchaseTypeChange() {
  const purchaseType = document.getElementById('purchaseType').value;
  const expenseAccountField = document.getElementById('purchaseExpenseAccountField');
  
  if (purchaseType === 'Expenditure') {
    // Show expense account field for expenditure purchases
    expenseAccountField.style.display = 'block';
    document.getElementById('purchaseExpenseAccount').setAttribute('required', 'required');
    
    // Update field label and load expense accounts
    const label = expenseAccountField.querySelector('label');
    if (label) {
      label.innerHTML = 'Expense Account: <span style="color: red;">*</span>';
    }
    
    loadExpenseAccountsForPurchases();
    
    // Show guidance for expenditure purchases
    showNotification('💰 Expenditure purchases go directly to expense accounts', 'info');
    
  } else if (purchaseType === 'Inventory') {
    // Show inventory account field for inventory purchases
    expenseAccountField.style.display = 'block';
    document.getElementById('purchaseExpenseAccount').setAttribute('required', 'required');
    
    // Update field label and populate with inventory account
    const label = expenseAccountField.querySelector('label');
    if (label) {
      label.innerHTML = 'Inventory Account: <span style="color: red;">*</span>';
    }
    
    loadInventoryAccountForPurchases();
    
    // Show guidance for inventory purchases
    showNotification('📦 Inventory purchases update stock levels and go to inventory account', 'info');
    
  } else {
    // Hide account field if no purchase type selected
    expenseAccountField.style.display = 'none';
    document.getElementById('purchaseExpenseAccount').removeAttribute('required');
  }
  
  // 🆕 Filter product dropdown based on purchase type
  filterProductsByPurchaseType(purchaseType);
}

// Filter products based on purchase type
function filterProductsByPurchaseType(purchaseType) {
  if (!window.purchaseProducts) return;
  
  // Re-render line items to update product dropdowns
  renderPurchaseLineItems();
  
  // You could also filter the main product list here
  console.log(`🔍 Filtering products for ${purchaseType} purchases`);
}
// Load expense accounts from Chart of Accounts for purchases (same as expenses section)
async function loadExpenseAccountsForPurchases() {
  try {
    console.log('🗂️ Loading expense accounts from Chart of Accounts for purchases...');
    
    // Ensure Chart of Accounts is loaded
    await loadChartOfAccounts();
    
    // Get all expense accounts from COA (same logic as expenses)
    const expenseAccounts = (chartOfAccounts || chartOfAccountsData || [])
      .filter(account => account.account_type === 'Expense' && account.is_active !== false)
      .sort((a, b) => (a.account_code || a.code).localeCompare(b.account_code || b.code));
    
    const expenseAccountSelect = document.getElementById('purchaseExpenseAccount');
    if (expenseAccountSelect) {
      expenseAccountSelect.innerHTML = '<option value="">Select Expense Account</option>';
      
      // Group by category if available (same as expenses)
      const categories = [...new Set(expenseAccounts.map(acc => acc.account_category).filter(cat => cat))];
      
      if (categories.length > 0) {
        categories.forEach(category => {
          const categoryAccounts = expenseAccounts.filter(acc => acc.account_category === category);
          if (categoryAccounts.length > 0) {
            const optgroup = document.createElement('optgroup');
            optgroup.label = category;
            
            categoryAccounts.forEach(account => {
              const option = document.createElement('option');
              const accountCode = account.account_code || account.code;
              const accountName = account.account_name || account.name;
              option.value = accountCode;
              option.textContent = `${accountCode} - ${accountName}`;
              optgroup.appendChild(option);
            });
            
            expenseAccountSelect.appendChild(optgroup);
          }
        });
      }
      
      // Add accounts without categories
      const uncategorized = expenseAccounts.filter(acc => !acc.account_category);
      if (uncategorized.length > 0) {
        if (categories.length > 0) {
          const optgroup = document.createElement('optgroup');
          optgroup.label = 'Other Expenses';
          
          uncategorized.forEach(account => {
            const option = document.createElement('option');
            const accountCode = account.account_code || account.code;
            const accountName = account.account_name || account.name;
            option.value = accountCode;
            option.textContent = `${accountCode} - ${accountName}`;
            optgroup.appendChild(option);
          });
          
          expenseAccountSelect.appendChild(optgroup);
        } else {
          // No categories at all, just add all accounts
          uncategorized.forEach(account => {
            const option = document.createElement('option');
            const accountCode = account.account_code || account.code;
            const accountName = account.account_name || account.name;
            option.value = accountCode;
            option.textContent = `${accountCode} - ${accountName}`;
            expenseAccountSelect.appendChild(option);
          });
        }
      }
    }
    
    console.log(`✅ Loaded ${expenseAccounts.length} expense accounts for purchases`);
    
  } catch (error) {
    console.error('❌ Error loading expense accounts:', error);
    showNotification('Error loading expense accounts from COA', 'warning');
  }
}

// Load and pre-select inventory account for inventory purchases
async function loadInventoryAccountForPurchases() {
  try {
    console.log('🗂️ Loading inventory account for purchases...');
    
    // Ensure Chart of Accounts is loaded
    await loadChartOfAccounts();
    
    // Find the inventory account (1300)
    const inventoryAccount = (chartOfAccounts || chartOfAccountsData || [])
      .find(account => 
        (account.account_code === '1300' || account.code === '1300') && 
        account.is_active !== false
      );
    
    const expenseAccountSelect = document.getElementById('purchaseExpenseAccount');
    if (expenseAccountSelect && inventoryAccount) {
      // Clear and populate with inventory account only
      expenseAccountSelect.innerHTML = '';
      
      const option = document.createElement('option');
      const accountCode = inventoryAccount.account_code || inventoryAccount.code;
      const accountName = inventoryAccount.account_name || inventoryAccount.name;
      option.value = accountCode;
      option.textContent = `${accountCode} - ${accountName}`;
      option.selected = true; // Pre-select it
      expenseAccountSelect.appendChild(option);
      
      // Make it read-only by disabling it (but keep the value)
      expenseAccountSelect.style.backgroundColor = '#f9fafb';
      expenseAccountSelect.style.cursor = 'not-allowed';
      
      console.log(`✅ Pre-selected inventory account: ${accountCode} - ${accountName}`);
      
      // Add a help text
      const helpText = expenseAccountSelect.parentElement.querySelector('small');
      if (helpText) {
        helpText.textContent = 'Inventory purchases automatically go to the Inventory account (1300)';
        helpText.style.color = '#059669';
      }
      
    } else if (!inventoryAccount) {
      console.warn('⚠️ Inventory account (1300) not found in Chart of Accounts');
      
      // Create a fallback option
      expenseAccountSelect.innerHTML = `
        <option value="1300" selected>1300 - Inventory (Default)</option>
      `;
      expenseAccountSelect.style.backgroundColor = '#f9fafb';
      expenseAccountSelect.style.cursor = 'not-allowed';
      
      const helpText = expenseAccountSelect.parentElement.querySelector('small');
      if (helpText) {
        helpText.textContent = 'Using default Inventory account. Please add account 1300 to your Chart of Accounts.';
        helpText.style.color = '#ca8a04';
      }
    }
    
  } catch (error) {
    console.error('❌ Error loading inventory account:', error);
    showNotification('Error loading inventory account', 'warning');
  }
}

// Handle supplier selection in purchase modal - NEW FUNCTION
function handlePurchaseSupplierChange() {
  const supplierSelect = document.getElementById('purchaseSupplier');
  const selectedOption = supplierSelect.options[supplierSelect.selectedIndex];
  
  if (!selectedOption || !selectedOption.value) {
    // Clear auto-filled data when no supplier selected
    return;
  }
  
  console.log('🏪 Supplier selected, auto-filling data...');
  
  // 🆕 Auto-fill due date based on payment terms
  const paymentTerms = parseInt(selectedOption.dataset.paymentTerms) || 30;
  const dueDateField = document.getElementById('purchaseDueDate');
  if (dueDateField) {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + paymentTerms);
    dueDateField.value = dueDate.toISOString().split('T')[0];
    
    // Show notification about auto-fill
    const termsDays = paymentTerms === 1 ? '1 day' : `${paymentTerms} days`;
    showNotification(`📅 Due date set to ${termsDays} (supplier payment terms)`, 'info');
  }
  
  // 🆕 Auto-select default expense account (for expenditure purchases)
  const purchaseType = document.getElementById('purchaseType').value;
  if (purchaseType === 'Expenditure') {
    const defaultExpenseAccount = selectedOption.dataset.defaultExpenseAccount;
    if (defaultExpenseAccount) {
      const expenseAccountField = document.getElementById('purchaseExpenseAccount');
      if (expenseAccountField) {
        expenseAccountField.value = defaultExpenseAccount;
        showNotification(`💰 Default expense account selected (${defaultExpenseAccount})`, 'info');
      }
    }
  }
  
  // 🆕 Show supplier information panel
  showSupplierInfoPanel(selectedOption);
}


// Process stock updates when purchases are received
async function processPurchaseStockUpdates(purchaseDoc, lineItems) {
  console.log('📦 Processing stock updates for purchase:', purchaseDoc.document_number);
  console.log('Line items to process:', lineItems);
  
  if (purchaseDoc.purchase_type !== 'Inventory') {
    console.log('⏭️ Skipping stock update - not an inventory purchase');
    return;
  }
  
  try {
    const stockUpdates = [];
    
    for (const item of lineItems) {
      console.log('Processing line item:', item);
      
      if (!item.product_id) {
        console.log('⏭️ Skipping line item - no product_id:', item.description);
        continue;
      }
      
      if (!item.quantity || item.quantity <= 0) {
        console.log('⏭️ Skipping line item - invalid quantity:', item.quantity);
        continue;
      }
      
      // Get current product data
      const { data: currentProduct, error: productError } = await supabase
        .from('products')
        .select('stock_quantity, cost_price, product_code, name, category')
        .eq('id', item.product_id)
        .single();
      
      if (productError) {
        console.error('Error getting product data for ID:', item.product_id, productError);
        continue;
      }
      
      if (!currentProduct) {
        console.error('Product not found for ID:', item.product_id);
        continue;
      }
      
      // Only update stock for products (not services)
      if (currentProduct.category !== 'Product') {
        console.log('⏭️ Skipping stock update - not a product:', currentProduct.name);
        continue;
      }
      
      const currentStock = parseFloat(currentProduct.stock_quantity) || 0;
      const currentCostPrice = parseFloat(currentProduct.cost_price) || 0;
      const purchaseQuantity = parseFloat(item.quantity);
      const purchaseCost = parseFloat(item.unit_cost);
      
      // Calculate new stock level
      const newStockLevel = currentStock + purchaseQuantity;
      
      // Calculate weighted average cost
      let newCostPrice = purchaseCost;
      
      if (currentStock > 0 && currentCostPrice > 0) {
        const existingValue = currentStock * currentCostPrice;
        const newValue = purchaseQuantity * purchaseCost;
        newCostPrice = (existingValue + newValue) / newStockLevel;
      }
      
      console.log(`📊 Product ${currentProduct.product_code} stock update:`, {
        oldStock: currentStock,
        newStock: newStockLevel,
        oldCost: currentCostPrice.toFixed(2),
        newCost: newCostPrice.toFixed(2),
        purchaseQty: purchaseQuantity,
        purchaseCost: purchaseCost.toFixed(2)
      });
      
      // Update product stock and cost
      const { error: updateError } = await supabase
        .from('products')
        .update({
          stock_quantity: newStockLevel,
          cost_price: newCostPrice,
          updated_at: new Date().toISOString()
        })
        .eq('id', item.product_id);
      
      if (updateError) {
        console.error('Error updating product stock:', updateError);
        throw new Error(`Failed to update stock for ${currentProduct.name}: ${updateError.message}`);
      } else {
        stockUpdates.push({
          product_id: item.product_id,
          product_code: currentProduct.product_code,
          product_name: currentProduct.name,
          quantity_added: purchaseQuantity,
          old_stock: currentStock,
          new_stock_level: newStockLevel,
          old_cost_price: currentCostPrice,
          new_cost_price: newCostPrice,
          purchase_cost: purchaseCost
        });
        
        console.log(`✅ Updated stock for ${currentProduct.product_code}: ${currentStock} → ${newStockLevel}`);
      }
    }
    
    if (stockUpdates.length > 0) {
      console.log('✅ Stock updates completed:', stockUpdates);
      showStockUpdateSummary(stockUpdates);
      await logInventoryTransactions(purchaseDoc, stockUpdates);
    } else {
      console.log('ℹ️ No stock updates were performed');
      showNotification('ℹ️ No product stock was updated (check if products are selected in line items)', 'info');
    }
    
  } catch (error) {
    console.error('❌ Error processing stock updates:', error);
    showNotification('Stock update failed: ' + error.message, 'error');
    throw error;
  }
}

// Show detailed stock update summary
function showStockUpdateSummary(stockUpdates) {
  const totalItems = stockUpdates.length;
  const totalQuantity = stockUpdates.reduce((sum, update) => sum + update.quantity_added, 0);
  
  let summaryHTML = `
    <div style="background: #f0fdf4; border: 1px solid #22c55e; border-radius: 8px; padding: 15px; margin: 10px 0;">
      <div style="display: flex; align-items: center; margin-bottom: 10px;">
        <span style="font-size: 24px; margin-right: 10px;">📦</span>
        <strong style="color: #166534;">Stock Updated Successfully!</strong>
      </div>
      <p style="margin-bottom: 10px; color: #166534;">
        <strong>${totalItems} product(s)</strong> updated with <strong>${totalQuantity} units</strong> added to inventory.
      </p>
      <div style="max-height: 150px; overflow-y: auto; font-size: 0.9em;">
        ${stockUpdates.map(update => `
          <div style="margin-bottom: 8px; padding: 8px; background: white; border-radius: 4px; border-left: 3px solid #22c55e;">
            <div style="font-weight: 600; color: #111;">
              ${update.product_code} - ${update.product_name}
            </div>
            <div style="color: #666; font-size: 0.8em;">
              📊 Stock: ${update.old_stock} → <strong>${update.new_stock_level.toFixed(2)}</strong> (+${update.quantity_added})
            </div>
            <div style="color: #666; font-size: 0.8em;">
              💰 Cost: R${update.old_cost_price.toFixed(2)} → <strong>R${update.new_cost_price.toFixed(2)}</strong>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
  
  const modal = document.createElement('div');
  modal.className = 'zande-modal';
  modal.style.display = 'block';
  modal.innerHTML = `
    <div class="zande-modal-content" style="max-width: 600px;">
      <div class="modal-header">
        <h3>📦 Inventory Update Summary</h3>
        <span class="close" onclick="this.parentElement.parentElement.parentElement.remove()">&times;</span>
      </div>
      <div>${summaryHTML}</div>
      <div class="modal-footer">
        <button onclick="this.parentElement.parentElement.parentElement.remove()" class="zande-btn">Close</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  setTimeout(() => {
    if (modal.parentElement) {
      modal.remove();
    }
  }, 10000);
}

// Log inventory transactions for audit trail
async function logInventoryTransactions(purchaseDoc, stockUpdates) {
  try {
    const inventoryLogs = stockUpdates.map(update => ({
      product_id: update.product_id,
      transaction_type: 'Purchase Receipt',
      quantity_change: update.quantity_added,
      stock_before: update.old_stock,
      stock_after: update.new_stock_level,
      cost_price_before: update.old_cost_price,
      cost_price_after: update.new_cost_price,
      unit_cost: update.purchase_cost,
      reference_document: purchaseDoc.document_number,
      reference_id: purchaseDoc.id,
      transaction_date: purchaseDoc.document_date,
      notes: `Purchase from ${purchaseDoc.supplier_name || 'Supplier'} - ${purchaseDoc.document_type}`,
      created_at: new Date().toISOString()
    }));
    
    const existingLogs = JSON.parse(localStorage.getItem('inventory_transactions') || '[]');
    const allLogs = [...existingLogs, ...inventoryLogs];
    localStorage.setItem('inventory_transactions', JSON.stringify(allLogs));
    
    console.log('✅ Inventory transactions logged to localStorage');
    
  } catch (error) {
    console.error('Error logging inventory transactions:', error);
  }
}


// Show supplier information panel in purchase modal - NEW FUNCTION
function showSupplierInfoPanel(supplierOption) {
  // Check if info panel exists, create if not
  let infoPanel = document.getElementById('supplierInfoPanel');
  if (!infoPanel) {
    infoPanel = document.createElement('div');
    infoPanel.id = 'supplierInfoPanel';
    infoPanel.style.cssText = `
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 12px;
      margin-top: 10px;
      font-size: 0.9em;
    `;
    
    // Insert after supplier select field
    const supplierFieldGroup = document.getElementById('purchaseSupplier').closest('.sales-field-group');
    supplierFieldGroup.appendChild(infoPanel);
  }
  
  const paymentTerms = supplierOption.dataset.paymentTerms || '30';
  const currency = supplierOption.dataset.currency || 'ZAR';
  const vatNumber = supplierOption.dataset.vatNumber || 'Not provided';
  
  infoPanel.innerHTML = `
    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
      <span style="color: #059669; font-weight: 600;">📋 Supplier Information</span>
    </div>
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 0.85em;">
      <div><strong>Payment Terms:</strong> ${paymentTerms} days</div>
      <div><strong>Currency:</strong> ${currency}</div>
      <div style="grid-column: 1/-1;"><strong>VAT Number:</strong> ${vatNumber}</div>
    </div>
  `;
}

// Show purchase analysis for products
async function showPurchaseAnalysis() {
  try {
    console.log('📊 Loading purchase analysis...');
    
    // Get purchases with line items
    const { data: purchases, error } = await supabase
      .from('purchases')
      .select(`
        *,
        purchase_line_items (
          product_id,
          description,
          quantity,
          unit_cost,
          line_total,
          products (name, product_code, category)
        )
      `)
      .eq('purchase_type', 'Inventory')
      .order('document_date', { ascending: false });
    
    if (error) throw error;
    
    // Analyze by product
    const productAnalysis = {};
    
    purchases.forEach(purchase => {
      purchase.purchase_line_items.forEach(item => {
        if (item.product_id) {
          const productKey = item.product_id;
          
          if (!productAnalysis[productKey]) {
            productAnalysis[productKey] = {
              product_name: item.products?.name || item.description,
              product_code: item.products?.product_code || '',
              total_purchased: 0,
              total_cost: 0,
              purchase_count: 0,
              last_purchase_date: purchase.document_date,
              last_unit_cost: item.unit_cost
            };
          }
          
          productAnalysis[productKey].total_purchased += parseFloat(item.quantity) || 0;
          productAnalysis[productKey].total_cost += parseFloat(item.line_total) || 0;
          productAnalysis[productKey].purchase_count++;
          
          // Update if this is a more recent purchase
          if (new Date(purchase.document_date) > new Date(productAnalysis[productKey].last_purchase_date)) {
            productAnalysis[productKey].last_purchase_date = purchase.document_date;
            productAnalysis[productKey].last_unit_cost = item.unit_cost;
          }
        }
      });
    });
    
    // Display analysis
    console.log('📈 Purchase Analysis:', productAnalysis);
    showPurchaseAnalysisModal(productAnalysis);
    
  } catch (error) {
    console.error('Error in purchase analysis:', error);
    showNotification('Error loading purchase analysis', 'error');
  }
}

// Show purchase analysis modal
function showPurchaseAnalysisModal(analysis) {
  const modal = document.createElement('div');
  modal.className = 'zande-modal';
  modal.style.display = 'block';
  modal.innerHTML = `
    <div class="zande-modal-content" style="max-width: 900px;">
      <div class="modal-header">
        <h3>📊 Purchase Analysis - Inventory Items</h3>
        <span class="close" onclick="this.parentElement.parentElement.parentElement.remove()">&times;</span>
      </div>
      
      <div style="margin: 20px 0;">
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background: #f5f5f5;">
              <th style="padding: 12px; border: 1px solid #ddd; text-align: left;">Product</th>
              <th style="padding: 12px; border: 1px solid #ddd; text-align: right;">Total Qty</th>
              <th style="padding: 12px; border: 1px solid #ddd; text-align: right;">Total Cost</th>
              <th style="padding: 12px; border: 1px solid #ddd; text-align: right;">Avg Cost</th>
              <th style="padding: 12px; border: 1px solid #ddd; text-align: center;">Purchases</th>
              <th style="padding: 12px; border: 1px solid #ddd; text-align: center;">Last Purchase</th>
            </tr>
          </thead>
          <tbody>
            ${Object.values(analysis).map(item => {
              const avgCost = item.total_cost / item.total_purchased;
              return `
                <tr>
                  <td style="padding: 12px; border: 1px solid #ddd;">
                    <strong>${item.product_code}</strong><br>
                    <small style="color: #666;">${item.product_name}</small>
                  </td>
                  <td style="padding: 12px; border: 1px solid #ddd; text-align: right;">${item.total_purchased.toFixed(2)}</td>
                  <td style="padding: 12px; border: 1px solid #ddd; text-align: right;">R${item.total_cost.toFixed(2)}</td>
                  <td style="padding: 12px; border: 1px solid #ddd; text-align: right;">R${avgCost.toFixed(2)}</td>
                  <td style="padding: 12px; border: 1px solid #ddd; text-align: center;">${item.purchase_count}</td>
                  <td style="padding: 12px; border: 1px solid #ddd; text-align: center;">
                    ${new Date(item.last_purchase_date).toLocaleDateString()}<br>
                    <small>R${parseFloat(item.last_unit_cost).toFixed(2)}</small>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
      
      <div class="modal-footer">
        <button onclick="this.parentElement.parentElement.parentElement.remove()" class="zande-btn secondary">Close</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
}

// ========================================
// PURCHASE DOCUMENT MANAGEMENT
// ========================================

let purchaseUploadedDocuments = [];
let purchaseExistingDocuments = [];

// Handle purchase document upload
function handlePurchaseDocumentUpload() {
  const fileInput = document.getElementById('purchaseDocuments');
  const files = fileInput.files;
  
  if (files.length === 0) return;
  
  console.log(`📎 Selected ${files.length} document(s) for purchase`);
  
  // Validate files (same as expenses)
  const maxSize = 10 * 1024 * 1024; // 10MB
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'text/plain',
    'text/csv'
  ];
  
  const validFiles = [];
  const errors = [];
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    
    // Check file size
    if (file.size > maxSize) {
      errors.push(`${file.name}: File too large (max 10MB)`);
      continue;
    }
    
    // Check file type
    if (!allowedTypes.includes(file.type)) {
      errors.push(`${file.name}: Unsupported file type`);
      continue;
    }
    
    validFiles.push(file);
  }
  
  if (errors.length > 0) {
    alert('Some files were rejected:\n' + errors.join('\n'));
  }
  
  if (validFiles.length > 0) {
    uploadPurchaseDocuments(validFiles);
  }
}

// Upload purchase documents to Supabase Storage
async function uploadPurchaseDocuments(files) {
  const progressBar = document.getElementById('purchaseProgressBar');
  const uploadStatus = document.getElementById('purchaseUploadStatus');
  const uploadProgress = document.getElementById('purchaseUploadProgress');
  
  uploadProgress.style.display = 'block';
  uploadStatus.textContent = 'Preparing upload...';
  
  const category = document.getElementById('purchaseDocumentCategory').value || 'other';
  
  try {
    // 🆕 CHECK IF BUCKET EXISTS, CREATE IF NOT
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('Error listing buckets:', listError);
    }
    
    const bucketExists = buckets?.some(bucket => bucket.name === 'purchase-documents');
    
    if (!bucketExists) {
      console.log('Creating purchase-documents bucket...');
      const { error: createError } = await supabase.storage.createBucket('purchase-documents', {
        public: false,
        allowedMimeTypes: [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'image/jpeg',
          'image/png',
          'image/gif',
          'text/plain',
          'text/csv'
        ],
        fileSizeLimit: 10485760 // 10MB
      });
      
      if (createError) {
        console.error('Error creating bucket:', createError);
        throw new Error('Failed to create storage bucket. Please contact support.');
      }
      
      console.log('✅ Purchase documents bucket created successfully');
    }
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Update progress
      const progress = ((i + 1) / files.length) * 100;
      progressBar.style.width = `${progress}%`;
      uploadStatus.textContent = `Uploading ${file.name}... (${i + 1}/${files.length})`;
      
      // Generate unique filename
      const timestamp = Date.now();
      const fileExtension = file.name.split('.').pop();
      const uniqueFileName = `purchase_${timestamp}_${Math.random().toString(36).substr(2, 9)}.${fileExtension}`;
      
      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('purchase-documents')
        .upload(`documents/${uniqueFileName}`, file, {
          cacheControl: '3600',
          upsert: false
        });
      
      if (error) {
        console.error('Upload error for', file.name, ':', error);
        throw new Error(`Failed to upload ${file.name}: ${error.message}`);
      }
      
      // Store document information
      const documentInfo = {
        id: Math.random().toString(36).substr(2, 9), // Temporary ID
        file_name: file.name,
        file_path: data.path,
        file_size: file.size,
        file_type: file.type,
        document_category: category,
        uploaded_at: new Date().toISOString(),
        is_new: true // Flag for new uploads
      };
      
      purchaseUploadedDocuments.push(documentInfo);
      
      console.log('✅ Uploaded:', file.name, '→', data.path);
    }
    
    uploadStatus.textContent = 'Upload completed successfully!';
    setTimeout(() => {
      uploadProgress.style.display = 'none';
    }, 2000);
    
    // Update document preview
    updatePurchaseDocumentPreview();
    showNotification(`${files.length} document(s) uploaded successfully!`, 'success');
    
    // Clear form fields
    document.getElementById('purchaseDocumentCategory').value = '';
    
  } catch (error) {
    console.error('❌ Upload failed:', error);
    uploadStatus.textContent = 'Upload failed: ' + error.message;
    uploadStatus.style.color = '#dc2626';
    showNotification('Document upload failed: ' + error.message, 'error');
  }
}

// Update purchase document preview
function updatePurchaseDocumentPreview() {
  const documentPreview = document.getElementById('purchaseDocumentPreview');
  const documentList = document.getElementById('purchaseDocumentList');
  
  const allDocuments = [...purchaseExistingDocuments, ...purchaseUploadedDocuments];
  
  if (allDocuments.length === 0) {
    documentPreview.style.display = 'none';
    return;
  }
  
  documentPreview.style.display = 'block';
  documentList.innerHTML = '';
  
  allDocuments.forEach((doc, index) => {
    const documentItem = document.createElement('div');
    documentItem.style.cssText = `
      display: flex; 
      align-items: center; 
      justify-content: space-between; 
      padding: 12px; 
      border: 1px solid #e5e7eb; 
      border-radius: 8px; 
      margin-bottom: 8px; 
      background: ${doc.is_new ? '#f0fdf4' : '#ffffff'};
    `;
    
    const categoryIcon = getPurchaseDocumentIcon(doc.document_category);
    const fileIcon = getFileIcon(doc.file_type);
    const fileSize = formatFileSize(doc.file_size);
    
    documentItem.innerHTML = `
      <div style="display: flex; align-items: center;">
        <span style="font-size: 24px; margin-right: 12px;">${categoryIcon}${fileIcon}</span>
        <div>
          <div style="font-weight: 500; color: #111;">
            ${doc.file_name}
            ${doc.is_new ? '<span style="background: #059669; color: white; padding: 2px 6px; border-radius: 10px; font-size: 0.7em; margin-left: 8px;">NEW</span>' : ''}
          </div>
          <small style="color: #666;">
            ${getPurchaseCategoryDisplayName(doc.document_category)} • ${fileSize}
          </small>
        </div>
      </div>
      <div>
        ${!doc.is_new ? `
          <button onclick="downloadPurchaseDocument('${doc.file_path}', '${doc.file_name}')" 
                  style="padding: 6px 12px; margin-right: 8px; border: 1px solid #059669; background: white; color: #059669; border-radius: 6px; cursor: pointer; font-size: 0.8em;">
            📥 Download
          </button>
        ` : ''}
        <button onclick="removePurchaseDocument(${index}, ${doc.is_new ? 'true' : 'false'})" 
                style="padding: 6px 12px; border: 1px solid #dc2626; background: white; color: #dc2626; border-radius: 6px; cursor: pointer; font-size: 0.8em;">
          🗑️ Remove
        </button>
      </div>
    `;
    
    documentList.appendChild(documentItem);
  });
}

// Get purchase document category icon
function getPurchaseDocumentIcon(category) {
  const icons = {
    invoice: '🧾',
    receipt: '🧾',
    purchase_order: '📋',
    delivery_note: '📦',
    quote: '💰',
    contract: '📝',
    other: '📎'
  };
  return icons[category] || '📎';
}

// Get purchase category display name
function getPurchaseCategoryDisplayName(category) {
  const names = {
    invoice: 'Invoice',
    receipt: 'Receipt',
    purchase_order: 'Purchase Order',
    delivery_note: 'Delivery Note',
    quote: 'Quote',
    contract: 'Contract',
    other: 'Other Documents'
  };
  return names[category] || 'Document';
}

// Download purchase document
async function downloadPurchaseDocument(filePath, fileName) {
  try {
    // 🆕 CHECK IF BUCKET EXISTS FIRST
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(bucket => bucket.name === 'purchase-documents');
    
    if (!bucketExists) {
      showNotification('Storage bucket not found. Documents may have been moved.', 'error');
      return;
    }
    
    const { data, error } = await supabase.storage
      .from('purchase-documents')
      .download(filePath);
    
    if (error) {
      if (error.message.includes('Object not found')) {
        showNotification('Document file not found. It may have been deleted.', 'error');
      } else {
        throw error;
      }
      return;
    }
    
    // Create download link
    const url = URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showNotification(`Downloaded: ${fileName}`, 'success');
    
  } catch (error) {
    console.error('Download error:', error);
    showNotification('Download failed: ' + error.message, 'error');
  }
}

// Remove purchase document
function removePurchaseDocument(index, isNew) {
  if (isNew === 'true' || isNew === true) {
    // Remove from uploaded documents
    const docIndex = index - purchaseExistingDocuments.length;
    if (docIndex >= 0 && docIndex < purchaseUploadedDocuments.length) {
      const removedDoc = purchaseUploadedDocuments.splice(docIndex, 1)[0];
      console.log('🗑️ Removed uploaded document:', removedDoc.file_name);
      
      // Delete from storage immediately
      deletePurchaseDocumentFromStorage(removedDoc.file_path);
    }
  } else {
    // Mark existing document for deletion
    if (index < purchaseExistingDocuments.length) {
      purchaseExistingDocuments[index].marked_for_deletion = true;
      console.log('🗑️ Marked existing document for deletion:', purchaseExistingDocuments[index].file_name);
    }
  }
  
  updatePurchaseDocumentPreview();
}

// Delete document from storage
async function deletePurchaseDocumentFromStorage(filePath) {
  try {
    // 🆕 CHECK IF BUCKET EXISTS FIRST
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(bucket => bucket.name === 'purchase-documents');
    
    if (!bucketExists) {
      console.warn('Purchase documents bucket not found, skipping deletion');
      return;
    }
    
    const { error } = await supabase.storage
      .from('purchase-documents')
      .remove([filePath]);
    
    if (error) {
      console.error('Storage deletion error:', error);
    } else {
      console.log('✅ Deleted from storage:', filePath);
    }
  } catch (error) {
    console.error('Error deleting from storage:', error);
  }
}

// Load existing purchase documents
async function loadExistingPurchaseDocuments(purchaseId) {
  try {
    const { data, error } = await supabase
      .from('purchase_documents')
      .select('*')
      .eq('purchase_id', purchaseId)
      .order('uploaded_at', { ascending: false });
    
    if (error && error.code !== 'PGRST116') {
      console.error('Error loading existing documents:', error);
      return;
    }
    
    purchaseExistingDocuments = data || [];
    purchaseUploadedDocuments = []; // Clear uploaded documents when editing
    updatePurchaseDocumentPreview();
    
    console.log(`📁 Loaded ${purchaseExistingDocuments.length} existing documents for purchase ${purchaseId}`);
    
  } catch (error) {
    console.error('Error in loadExistingPurchaseDocuments:', error);
    purchaseExistingDocuments = [];
  }
}

// Save purchase document associations
async function savePurchaseDocumentAssociations(purchaseId) {
  try {
    console.log('💾 Saving document associations for purchase:', purchaseId);
    
    // Save new document uploads
    if (purchaseUploadedDocuments.length > 0) {
      const documentRecords = purchaseUploadedDocuments.map(doc => ({
        purchase_id: purchaseId,
        file_name: doc.file_name,
        file_path: doc.file_path,
        file_size: doc.file_size,
        file_type: doc.file_type,
        document_category: doc.document_category,
        uploaded_at: doc.uploaded_at,
        uploaded_by: 'Current User'
      }));
      
      const { error: insertError } = await supabase
        .from('purchase_documents')
        .insert(documentRecords);
      
      if (insertError) {
        console.error('Error saving document records:', insertError);
        showNotification('Purchase saved but document associations failed', 'warning');
      } else {
        console.log(`✅ Saved ${documentRecords.length} document associations`);
      }
    }
    
    // Handle document deletions
    const documentsToDelete = purchaseExistingDocuments.filter(doc => doc.marked_for_deletion);
    if (documentsToDelete.length > 0) {
      for (const doc of documentsToDelete) {
        // Delete from database
        await supabase
          .from('purchase_documents')
          .delete()
          .eq('id', doc.id);
        
        // Delete from storage
        await deletePurchaseDocumentFromStorage(doc.file_path);
      }
      
      console.log(`🗑️ Deleted ${documentsToDelete.length} documents`);
    }
    
  } catch (error) {
    console.error('Error saving document associations:', error);
    showNotification('Documents uploaded but associations may not be saved properly', 'warning');
  }
}

// View purchase documents
async function viewPurchaseDocuments(purchaseId) {
  try {
    const { data: purchase } = await supabase
      .from('purchases')
      .select('document_number, document_type')
      .eq('id', purchaseId)
      .single();
      
    const { data: documents, error } = await supabase
      .from('purchase_documents')
      .select('*')
      .eq('purchase_id', purchaseId)
      .order('uploaded_at', { ascending: false });
    
    if (error) {
      console.error('Error loading purchase documents:', error);
      showNotification('Error loading documents', 'error');
      return;
    }
    
    if (!documents || documents.length === 0) {
      showNotification('No documents found for this purchase', 'info');
      return;
    }
    
    showPurchaseDocumentsModal(documents, purchase);
    
  } catch (error) {
    console.error('Error in viewPurchaseDocuments:', error);
    showNotification('Error viewing documents', 'error');
  }
}

// Show purchase documents modal
function showPurchaseDocumentsModal(documents, purchase) {
  // Remove existing modal if any
  const existingModal = document.getElementById('purchaseDocumentsModal');
  if (existingModal) {
    existingModal.remove();
  }
  
  const modal = document.createElement('div');
  modal.id = 'purchaseDocumentsModal';
  modal.className = 'zande-modal';
  modal.style.display = 'block';
  modal.innerHTML = `
    <div class="zande-modal-content" style="max-width: 800px;">
      <div class="modal-header">
        <h3>📄 Documents for ${purchase.document_number || 'Purchase'}</h3>
        <span class="close" onclick="document.getElementById('purchaseDocumentsModal').remove()">&times;</span>
      </div>
      
      <div style="margin: 20px 0;">
        <p><strong>Found ${documents.length} document(s):</strong></p>
        
        <div style="display: grid; gap: 12px; margin-top: 15px; max-height: 400px; overflow-y: auto;">
          ${documents.map(doc => {
            const categoryIcon = getPurchaseDocumentIcon(doc.document_category);
            const fileIcon = getFileIcon(doc.file_type);
            
            return `
              <div style="display: flex; align-items: center; justify-content: space-between; padding: 15px; border: 1px solid #e5e7eb; border-radius: 8px; background: white;">
                <div style="display: flex; align-items: center;">
                  <span style="font-size: 32px; margin-right: 15px;">${categoryIcon}${fileIcon}</span>
                  <div>
                    <div style="font-weight: 600; color: #111;">${doc.file_name}</div>
                    <div style="color: #666; font-size: 0.9em; margin-top: 4px;">
                      ${getPurchaseCategoryDisplayName(doc.document_category)} • 
                      ${formatFileSize(doc.file_size)} • 
                      Uploaded ${new Date(doc.uploaded_at).toLocaleDateString()}
                      ${doc.uploaded_by ? ` by ${doc.uploaded_by}` : ''}
                    </div>
                  </div>
                </div>
                <button onclick="downloadPurchaseDocument('${doc.file_path}', '${doc.file_name}')" 
                        style="padding: 10px 20px; background: #059669; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500;">
                  📥 Download
                </button>
              </div>
            `;
          }).join('')}
        </div>
      </div>
      
      <div class="modal-footer">
        <button onclick="document.getElementById('purchaseDocumentsModal').remove()" class="zande-btn secondary">Close</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
}

// Make functions global
window.handlePurchaseDocumentUpload = handlePurchaseDocumentUpload;
window.uploadPurchaseDocuments = uploadPurchaseDocuments;
window.updatePurchaseDocumentPreview = updatePurchaseDocumentPreview;
window.downloadPurchaseDocument = downloadPurchaseDocument;
window.removePurchaseDocument = removePurchaseDocument;
window.deletePurchaseDocumentFromStorage = deletePurchaseDocumentFromStorage;
window.loadExistingPurchaseDocuments = loadExistingPurchaseDocuments;
window.savePurchaseDocumentAssociations = savePurchaseDocumentAssociations;
window.viewPurchaseDocuments = viewPurchaseDocuments;
window.showPurchaseDocumentsModal = showPurchaseDocumentsModal;
window.getPurchaseDocumentIcon = getPurchaseDocumentIcon;
window.getPurchaseCategoryDisplayName = getPurchaseCategoryDisplayName;

// Make functions global
window.selectPurchaseProduct = selectPurchaseProduct;
window.updatePurchaseLineItem = updatePurchaseLineItem;
window.removePurchaseLineItem = removePurchaseLineItem;
window.viewPurchase = viewPurchase;
window.deletePurchase = deletePurchase;
window.updatePurchaseStatus = updatePurchaseStatus;
window.editPurchase = editPurchase;
window.handlePurchaseTypeChange = handlePurchaseTypeChange;
window.loadPurchaseDocuments = loadPurchaseDocuments;
window.renderFilteredPurchases = renderFilteredPurchases;
window.applyPurchaseFilters = applyPurchaseFilters;
window.clearPurchaseFilters = clearPurchaseFilters;

// Make functions global
window.processPurchaseStockUpdates = processPurchaseStockUpdates;
window.showStockUpdateSummary = showStockUpdateSummary;
window.logInventoryTransactions = logInventoryTransactions;

//  Define the showNotification function
function showNotification(message, type = 'info') {
  // Create notification element
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  
  // Style the notification
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 20px;
    background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#007bff'};
    color: white;
    border-radius: 8px;
    z-index: 10000;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    font-weight: 500;
    max-width: 300px;
    word-wrap: break-word;
    animation: slideInRight 0.3s ease-out;
  `;
  
  // Add to page
  document.body.appendChild(notification);
  
  // Auto remove after 3 seconds
  setTimeout(() => {
    notification.style.animation = 'slideOutRight 0.3s ease-out';
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 300);
  }, 3000);
}

// Add CSS animations if not already present
if (!document.querySelector('#notificationStyles')) {
  const style = document.createElement('style');
  style.id = 'notificationStyles';
  style.textContent = `
    @keyframes slideInRight {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOutRight {
      from { transform: translateX(0); opacity: 1; }
      to { transform: translateX(100%); opacity: 0; }
    }
  `;
  document.head.appendChild(style);
}

// ========================================
// EXPENSES MODULE
// ========================================

let expenseDocuments = [];

// Initialize Expenses when section is clicked
document.addEventListener('DOMContentLoaded', function() {
  const expensesBtn = document.querySelector('[data-module="expenses"]');
  if (expensesBtn) {
    expensesBtn.addEventListener('click', function() {
      console.log('Expenses section clicked');
      loadExpenseSuppliers();
      loadExpenseDocuments();
      setupExpenseButtons();
    });
  }
});

// Setup button event listeners
function setupExpenseButtons() {
  const addBtn = document.getElementById('addExpenseBtn');
  const closeBtn = document.querySelector('#expenseModal .close');
  const form = document.getElementById('expenseForm');
  
  if (addBtn) addBtn.onclick = openExpenseModal;
  if (closeBtn) closeBtn.onclick = closeExpenseModal;
  if (form) form.onsubmit = saveExpenseDocument;
}

// Load suppliers for expense modal
async function loadExpenseSuppliers() {
  try {
    const { data, error } = await supabase
      .from('suppliers')
      .select('id, name, supplier_code')
      .order('name');
      
    const supplierSelect = document.getElementById('expenseSupplier');
    if (supplierSelect && data) {
      supplierSelect.innerHTML = '<option value="">Not from a supplier</option>';
      
      data.forEach(supplier => {
        const option = document.createElement('option');
        option.value = supplier.id;
        option.textContent = `${supplier.supplier_code} - ${supplier.name}`;
        supplierSelect.appendChild(option);
      });
    }
  } catch (error) {
    console.error('Error loading suppliers:', error);
  }
}

// Open expense modal
async function openExpenseModal(expense = null) {
  const modal = document.getElementById('expenseModal');
  const form = document.getElementById('expenseForm');
  
  if (!modal || !form) {
    console.error('Modal or form elements not found!');
    return;
  }
  
  modal.style.display = 'block';
  form.reset();
  
  // Clear previous file uploads
  uploadedFiles = [];
  existingFiles = [];
  updateFilePreview();
  
  // ALWAYS load accounts first
  showNotification('Loading accounts...', 'info');
  
  try {
    await Promise.all([
      loadExpenseAccountsFromCOA(),
      loadBankAccountsForExpenses()
    ]);
    
    await loadSuppliersForExpense();
    showNotification('Accounts loaded successfully!', 'success');
    
  } catch (error) {
    console.error('Error loading accounts:', error);
    showNotification('Error loading accounts', 'error');
  }
  
  if (expense) {
    // Editing existing expense
    console.log('Editing expense:', expense);
    document.getElementById('expenseModalTitle').textContent = 'Edit Expense';
    
    // Set form values
    const fields = {
      expenseId: expense.id || '',
      expenseDate: expense.date || '',
      expenseAmount: expense.amount || 0,
      expenseVATAmount: expense.tax_amount || 0,
      expenseAccount: expense.category || '',
      expensePaidFrom: expense.paid_from || '',
      expenseSupplier: expense.supplier_id || '',
      expenseDescription: expense.description || '',
      expenseReference: expense.reference || ''
    };
    
    Object.keys(fields).forEach(fieldId => {
      const field = document.getElementById(fieldId);
      if (field) {
        field.value = fields[fieldId];
      }
    });
    
    // Calculate VAT rate
    const amount = expense.amount || 0;
    const taxAmount = expense.tax_amount || 0;
    const vatRate = amount > 0 ? Math.round((taxAmount / amount) * 100) : 15;
    const vatRateField = document.getElementById('expenseVATRate');
    if (vatRateField) vatRateField.value = vatRate;
    
    calculateExpenseVAT();
    
    // 🆕 Load existing files
    if (expense.id) {
      await loadExistingExpenseFiles(expense.id);
    }
    
  } else {
    // New expense
    console.log('Creating new expense');
    document.getElementById('expenseModalTitle').textContent = 'Record Direct Expense';
    
    // Set defaults
    const expenseDateField = document.getElementById('expenseDate');
    const expenseVATRateField = document.getElementById('expenseVATRate');
    const expenseSupplierField = document.getElementById('expenseSupplier');
    
    if (expenseDateField) {
      expenseDateField.value = new Date().toISOString().split('T')[0];
    }
    if (expenseVATRateField) {
      expenseVATRateField.value = '15';
    }
    if (expenseSupplierField) {
      expenseSupplierField.value = '';
    }
  }
  
  // 🆕 Setup file upload listener
  const fileInput = document.getElementById('expenseFiles');
  if (fileInput) {
    fileInput.onchange = handleExpenseFileUpload;
  }
}

// Load expense accounts from Chart of Accounts
async function loadExpenseAccountsFromCOA() {
  try {
    console.log('🗂️ Loading expense accounts from Chart of Accounts...');
    
    // Ensure Chart of Accounts is loaded
    await loadChartOfAccounts();
    
    // Get all expense accounts from COA
    const expenseAccounts = (chartOfAccounts || chartOfAccountsData || [])
      .filter(account => account.account_type === 'Expense' && account.is_active !== false)
      .sort((a, b) => (a.account_code || a.code).localeCompare(b.account_code || b.code));
    
    const expenseAccountSelect = document.getElementById('expenseAccount');
    if (expenseAccountSelect) {
      expenseAccountSelect.innerHTML = '<option value="">Select Expense Account</option>';
      
      // Group by category if available
      const categories = [...new Set(expenseAccounts.map(acc => acc.account_category).filter(cat => cat))];
      
      if (categories.length > 0) {
        categories.forEach(category => {
          const categoryAccounts = expenseAccounts.filter(acc => acc.account_category === category);
          if (categoryAccounts.length > 0) {
            const optgroup = document.createElement('optgroup');
            optgroup.label = category;
            
            categoryAccounts.forEach(account => {
              const option = document.createElement('option');
              const accountCode = account.account_code || account.code;
              const accountName = account.account_name || account.name;
              option.value = accountCode;
              option.textContent = `${accountCode} - ${accountName}`;
              optgroup.appendChild(option);
            });
            
            expenseAccountSelect.appendChild(optgroup);
          }
        });
      }
      
      // Add accounts without categories
      const uncategorized = expenseAccounts.filter(acc => !acc.account_category);
      if (uncategorized.length > 0) {
        if (categories.length > 0) {
          const optgroup = document.createElement('optgroup');
          optgroup.label = 'Other Expenses';
          
          uncategorized.forEach(account => {
            const option = document.createElement('option');
            const accountCode = account.account_code || account.code;
            const accountName = account.account_name || account.name;
            option.value = accountCode;
            option.textContent = `${accountCode} - ${accountName}`;
            optgroup.appendChild(option);
          });
          
          expenseAccountSelect.appendChild(optgroup);
        } else {
          // No categories at all, just add all accounts
          uncategorized.forEach(account => {
            const option = document.createElement('option');
            const accountCode = account.account_code || account.code;
            const accountName = account.account_name || account.name;
            option.value = accountCode;
            option.textContent = `${accountCode} - ${accountName}`;
            expenseAccountSelect.appendChild(option);
          });
        }
      }
    }
    
    console.log(`✅ Loaded ${expenseAccounts.length} expense accounts`);
    
  } catch (error) {
    console.error('❌ Error loading expense accounts:', error);
    showNotification('Error loading expense accounts from COA', 'warning');
  }
}

// Load bank accounts for "Paid From" dropdown

async function loadBankAccountsForExpenses() {
  try {
    console.log('🏦 Loading bank accounts for expenses...');
    
    // First try to load from Supabase
    const { data: bankAccounts, error } = await supabase
      .from('bank_accounts')
      .select('id, account_name, account_type, current_balance, account_code')
      .eq('is_active', true)
      .order('account_name');
    
    const paidFromSelect = document.getElementById('expensePaidFrom');
    if (!paidFromSelect) {
      console.error('expensePaidFrom element not found');
      return;
    }
    
    paidFromSelect.innerHTML = '<option value="">Select Bank Account</option>';
    
    if (error || !bankAccounts || bankAccounts.length === 0) {
      console.log('No bank accounts found in database, using sample accounts');
      
      // Use sample bank accounts if none exist
      const sampleAccounts = [
        { id: 'sample_checking', account_name: 'Business Checking', account_type: 'Checking', current_balance: 25000, account_code: '1120' },
        { id: 'sample_savings', account_name: 'Business Savings', account_type: 'Savings', current_balance: 50000, account_code: '1125' },
        { id: 'sample_petty', account_name: 'Petty Cash', account_type: 'Petty Cash', current_balance: 2000, account_code: '1110' },
        { id: 'sample_credit', account_name: 'Business Credit Card', account_type: 'Credit Card', current_balance: -5000, account_code: '2100' }
      ];
      
      sampleAccounts.forEach(account => {
        const option = document.createElement('option');
        option.value = account.id;
        option.dataset.accountCode = account.account_code;
        option.dataset.accountName = account.account_name;
        const balance = parseFloat(account.current_balance || 0);
        const balanceDisplay = balance >= 0 ? `R${balance.toFixed(2)}` : `-R${Math.abs(balance).toFixed(2)}`;
        option.textContent = `${account.account_name} (${account.account_type}) - ${balanceDisplay}`;
        paidFromSelect.appendChild(option);
      });
      
      console.log('✅ Loaded 4 sample bank accounts');
      return;
    }
    
    // Group accounts by type for better UX
    const accountTypes = ['Checking', 'Savings', 'Petty Cash', 'Credit Card', 'Money Market'];
    
    accountTypes.forEach(type => {
      const accountsOfType = bankAccounts.filter(acc => acc.account_type === type);
      if (accountsOfType.length > 0) {
        const optgroup = document.createElement('optgroup');
        optgroup.label = `${type} Accounts`;
        
        accountsOfType.forEach(account => {
          const option = document.createElement('option');
          option.value = account.id;
          option.dataset.accountCode = account.account_code || '1120'; // Store account code for GL posting
          option.dataset.accountName = account.account_name;
          
          const balance = parseFloat(account.current_balance || 0);
          const balanceDisplay = balance >= 0 ? `R${balance.toFixed(2)}` : `-R${Math.abs(balance).toFixed(2)}`;
          option.textContent = `${account.account_name} - ${balanceDisplay}`;
          optgroup.appendChild(option);
        });
        
        paidFromSelect.appendChild(optgroup);
      }
    });
    
    // Add accounts without specific types
    const uncategorized = bankAccounts.filter(acc => !accountTypes.includes(acc.account_type));
    if (uncategorized.length > 0) {
      const optgroup = document.createElement('optgroup');
      optgroup.label = 'Other Accounts';
      
      uncategorized.forEach(account => {
        const option = document.createElement('option');
        option.value = account.id;
        option.dataset.accountCode = account.account_code || '1120';
        option.dataset.accountName = account.account_name;
        
        const balance = parseFloat(account.current_balance || 0);
        const balanceDisplay = balance >= 0 ? `R${balance.toFixed(2)}` : `-R${Math.abs(balance).toFixed(2)}`;
        option.textContent = `${account.account_name} (${account.account_type}) - ${balanceDisplay}`;
        optgroup.appendChild(option);
      });
      
      paidFromSelect.appendChild(optgroup);
    }
    
    console.log(`✅ Loaded ${bankAccounts.length} bank accounts for expenses`);
    
  } catch (error) {
    console.error('❌ Error loading bank accounts:', error);
    showNotification('Error loading bank accounts', 'warning');
  }
}

// Load suppliers for expense dropdown - CORRECTED NAME
async function loadSuppliersForExpense() {
  try {
    console.log('🏪 Loading suppliers for expenses...');
    
    const { data: suppliers, error } = await supabase
      .from('suppliers')
      .select('id, name, supplier_name')
      .order('name');
    
    const supplierSelect = document.getElementById('expenseSupplier');
    if (!supplierSelect) return;
    
    supplierSelect.innerHTML = '<option value="">Not from a supplier</option>';
    
    if (error || !suppliers || suppliers.length === 0) {
      console.log('No suppliers found');
      return;
    }
    
    suppliers.forEach(supplier => {
      const option = document.createElement('option');
      option.value = supplier.id;
      option.textContent = supplier.name || supplier.supplier_name;
      supplierSelect.appendChild(option);
    });
    
    console.log(`✅ Loaded ${suppliers.length} suppliers`);
    
  } catch (error) {
    console.error('❌ Error loading suppliers:', error);
  }
}

// Auto-refresh bank accounts when new accounts are added
function refreshBankAccountsInExpenseModal() {
  console.log('🔄 Auto-refreshing bank accounts in expense modal...');
  
  // Check if expense modal is open
  const modal = document.getElementById('expenseModal');
  if (modal && modal.style.display !== 'none') {
    loadBankAccountsForExpenses();
  }
}

// Close expense modal
function closeExpenseModal() {
  const modal = document.getElementById('expenseModal');
  if (modal) modal.style.display = 'none';
}

// Calculate VAT amount
function calculateExpenseVAT() {
  const amount = parseFloat(document.getElementById('expenseAmount').value) || 0;
  const vatRate = parseFloat(document.getElementById('expenseVATRate').value) || 0;
  
  const vatAmount = amount * (vatRate / 100);
  const totalAmount = amount + vatAmount;
  
  document.getElementById('expenseVATAmount').value = vatAmount.toFixed(2);
  document.getElementById('expenseTotalAmount').value = totalAmount.toFixed(2);
}

// Save expense document
async function saveExpenseDocument(e) {
  e.preventDefault();
  
  const expenseId = document.getElementById('expenseId').value;
  
  // Get all form values with proper null handling
  const supplierElement = document.getElementById('expenseSupplier');
  const supplierValue = supplierElement ? supplierElement.value : '';
  const supplierId = (supplierValue && supplierValue !== '' && supplierValue !== 'undefined') ? supplierValue : null;
  
  const expenseAccountElement = document.getElementById('expenseAccount');
  const paidFromElement = document.getElementById('expensePaidFrom');
  const descriptionElement = document.getElementById('expenseDescription');
  const referenceElement = document.getElementById('expenseReference');
  
  // Validate required fields exist
  if (!expenseAccountElement || !paidFromElement || !descriptionElement) {
    alert('Form elements are missing. Please refresh the page and try again.');
    return;
  }
  
  // Get selected bank account details for GL posting
  const paidFromBankId = paidFromElement.value;
  const selectedBankOption = paidFromElement.options[paidFromElement.selectedIndex];
  const bankAccountCode = selectedBankOption?.dataset.accountCode || '1120';
  
  const expenseData = {
    date: document.getElementById('expenseDate').value,
    description: descriptionElement.value,
    amount: parseFloat(document.getElementById('expenseAmount').value) || 0,
    category: expenseAccountElement.value,
    paid_from: paidFromBankId,
    supplier_id: supplierId,
    reference: referenceElement ? (referenceElement.value || null) : null,
    tax_amount: parseFloat(document.getElementById('expenseVATAmount').value) || 0
  };
  
  console.log('Final expense data to save:', expenseData);
  
  // Validate required fields have values
  if (!expenseData.description) {
    alert('Please enter a description for the expense');
    return;
  }
  
  if (!expenseData.category) {
    alert('Please select an expense account from the Chart of Accounts');
    return;
  }
  
  if (!expenseData.paid_from) {
    alert('Please select the bank account this expense was paid from');
    return;
  }
  
  if (expenseData.amount <= 0) {
    alert('Please enter a valid amount greater than 0');
    return;
  }
  
  try {
    let result;
    if (expenseId) {
      // Update existing expense
      console.log('Updating expense with ID:', expenseId);
      result = await supabase
        .from('expenses')
        .update(expenseData)
        .eq('id', expenseId)
        .select()
        .single();
    } else {
      // Insert new expense
      console.log('Inserting new expense');
      result = await supabase
        .from('expenses')
        .insert([expenseData])
        .select()
        .single();
    }
    
    console.log('Supabase result:', result);
    
    if (result.error) {
      console.error('Supabase error details:', result.error);
      throw result.error;
    }
    
    // 🆕 SAVE FILE ASSOCIATIONS
    if (uploadedFiles.length > 0 || existingFiles.some(f => f.marked_for_deletion)) {
      await saveExpenseFileAssociations(result.data.id);
    }
    
    // POST TO GENERAL LEDGER
    if (!expenseId) { // Only post to GL for new expenses
      try {
        console.log('🔄 Posting expense to General Ledger...');
        
        // Get account names for better GL descriptions
        const expenseAccount = (chartOfAccounts || chartOfAccountsData || [])
          .find(acc => (acc.account_code || acc.code) === expenseData.category);
        const expenseAccountName = expenseAccount ? (expenseAccount.account_name || expenseAccount.name) : 'Unknown Expense';
        
        // Get bank account name
        const bankAccountName = selectedBankOption?.dataset.accountName || 'Bank Account';
        
        // Prepare GL entries
        const glEntries = [
          // Debit: Expense Account (net amount)
          {
            account_code: expenseData.category,
            account_name: expenseAccountName,
            description: expenseData.description,
            reference: expenseData.reference || 'EXP',
            debit_amount: expenseData.amount - expenseData.tax_amount,
            credit_amount: 0,
            transaction_date: expenseData.date
          }
        ];
        
        // Add VAT Input if there's tax
        if (expenseData.tax_amount > 0) {
          glEntries.push({
            account_code: '1450',
            account_name: 'VAT Input',
            description: `${expenseData.description} - VAT Input`,
            reference: expenseData.reference || 'EXP',
            debit_amount: expenseData.tax_amount,
            credit_amount: 0,
            transaction_date: expenseData.date
          });
        }
        
        // Credit: Bank Account (total amount)
        glEntries.push({
          account_code: bankAccountCode,
          account_name: bankAccountName,
          description: expenseData.description,
          reference: expenseData.reference || 'EXP',
          debit_amount: 0,
          credit_amount: expenseData.amount,
          transaction_date: expenseData.date
        });
        
        // Post to General Ledger
        const glResult = await postToGeneralLedger(glEntries, 'expenses', result.data.id);
        
        if (glResult.success) {
          console.log('✅ Expense posted to General Ledger successfully');
          
          // Update bank account balance (only for real bank accounts, not sample ones)
          if (!expenseData.paid_from.startsWith('sample_')) {
            const { data: currentBankAccount } = await supabase
              .from('bank_accounts')
              .select('current_balance')
              .eq('id', paidFromBankId)
              .single();
            
            if (currentBankAccount) {
              const currentBalance = parseFloat(currentBankAccount.current_balance || 0);
              const newBalance = currentBalance - expenseData.amount;
              
              await supabase
                .from('bank_accounts')
                .update({ current_balance: newBalance })
                .eq('id', paidFromBankId);
              
              console.log(`💰 Updated bank balance: ${currentBalance} → ${newBalance}`);
            }
          }
          
          const fileCount = uploadedFiles.length;
          const fileMessage = fileCount > 0 ? ` with ${fileCount} supporting document(s)` : '';
          showNotification(`✅ Expense saved and posted to GL${fileMessage}!`, 'success');
        } else {
          throw new Error('GL posting failed: ' + glResult.error);
        }
        
      } catch (glError) {
        console.error('❌ GL posting error:', glError);
        showNotification('Expense saved but failed to post to GL: ' + glError.message, 'warning');
      }
    } else {
      const fileCount = uploadedFiles.length;
      const fileMessage = fileCount > 0 ? ` Files updated.` : '';
      showNotification(`Expense updated successfully!${fileMessage}`, 'success');
    }
    
    // Clear file arrays
    uploadedFiles = [];
    existingFiles = [];
    
    closeExpenseModal();
    loadExpenseDocuments();
    
    // Refresh banking and GL if user is viewing them
    if (document.getElementById('bankingSection')?.style.display !== 'none') {
      loadBankAccounts();
    }
    if (document.getElementById('general-ledgerSection')?.style.display !== 'none') {
      loadGeneralLedgerData();
    }
    
  } catch (error) {
    console.error('Error saving expense:', error);
    console.error('Error details:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code
    });
    alert('Error saving expense: ' + error.message);
  }
}

// Load expense documents
async function loadExpenseDocuments() {
  try {
    const { data, error } = await supabase
      .from('expenses')
      .select(`
        *,
        suppliers (name, supplier_code)
      `)
      .order('date', { ascending: false });

    if (error) throw error;

    expenseDocuments = data || [];
    renderExpenseTable(expenseDocuments);
    
  } catch (error) {
    console.error('Error loading expenses:', error);
  }
}

// Render expense table
function renderExpenseTable(documents) {
  const tbody = document.querySelector('#expensesTable tbody');
  if (!tbody) return;
  
  tbody.innerHTML = '';
  
  if (!documents || documents.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 20px;">No expenses found</td></tr>';
    return;
  }
  
  documents.forEach(expense => {
    const row = document.createElement('tr');
    
    // Get expense account name from COA
    const expenseAccount = (chartOfAccounts || chartOfAccountsData || [])
      .find(acc => (acc.account_code || acc.code) === expense.category);
    const expenseAccountName = expenseAccount ? 
      `${expense.category} - ${expenseAccount.account_name || expenseAccount.name}` : 
      (expense.category || 'Unknown Account');
    
    row.innerHTML = `
      <td>${new Date(expense.date).toLocaleDateString()}</td>
      <td>
        ${expense.description}
        <div id="fileIndicator_${expense.id}" style="margin-top: 4px;"></div>
      </td>
      <td>
        <span class="expense-account-badge" style="background: #fefce8; color: #ca8a04; padding: 4px 8px; border-radius: 12px; font-size: 0.85em; font-weight: 500;">
          ${expenseAccountName}
        </span>
      </td>
      <td style="font-weight: bold; color: var(--zande-green);">R${expense.amount.toFixed(2)}</td>
      <td>${expense.paid_from || '-'}</td>
      <td>${expense.suppliers?.name || '-'}</td>
      <td>
        <div class="action-buttons">
          <button onclick="viewExpenseFiles('${expense.id}')" class="modern-btn view-btn" title="View Files" style="margin-right: 5px;">
            <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"></path>
              <path d="M14 2v6h6"></path>
              <path d="M16 13H8"></path>
              <path d="M16 17H8"></path>
              <path d="M10 9H8"></path>
            </svg>
          </button>
          <button onclick="editExpense('${expense.id}')" class="modern-btn edit-btn" title="Edit">
            <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 00-3 3L12 9l-4 1 1-4 3.5-3.5z"></path>
            </svg>
          </button>
          <button onclick="deleteExpense('${expense.id}')" class="modern-btn delete-btn" title="Delete">
            <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 6h18"></path>
              <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"></path>
              <line x1="10" y1="11" x2="10" y2="17"></line>
              <line x1="14" y1="11" x2="14" y2="17"></line>
            </svg>
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(row);
    
    // 🆕 Load file count indicator
    loadFileIndicator(expense.id);
  });
}

// Load file count indicator for expense
async function loadFileIndicator(expenseId) {
  try {
    const { data, error } = await supabase
      .from('expense_documents')
      .select('id')
      .eq('expense_id', expenseId);
    
    const indicatorElement = document.getElementById(`fileIndicator_${expenseId}`);
    if (indicatorElement && data) {
      const fileCount = data.length;
      if (fileCount > 0) {
        indicatorElement.innerHTML = `
          <span style="background: #059669; color: white; padding: 2px 6px; border-radius: 10px; font-size: 0.75em;">
            📎 ${fileCount} file${fileCount > 1 ? 's' : ''}
          </span>
        `;
      }
    }
  } catch (error) {
    // Silently handle error - table might not exist yet
    console.log('File indicator load error (table may not exist):', error);
  }
}

// View expense files
async function viewExpenseFiles(expenseId) {
  try {
    const { data: files, error } = await supabase
      .from('expense_documents')
      .select('*')
      .eq('expense_id', expenseId)
      .order('uploaded_at', { ascending: false });
    
    if (error) {
      console.error('Error loading files:', error);
      showNotification('Error loading files', 'error');
      return;
    }
    
    if (!files || files.length === 0) {
      showNotification('No supporting documents found for this expense', 'info');
      return;
    }
    
    // Create and show file viewer modal
    showExpenseFilesModal(files, expenseId);
    
  } catch (error) {
    console.error('Error in viewExpenseFiles:', error);
    showNotification('Error viewing files', 'error');
  }
}

// Show expense files modal
function showExpenseFilesModal(files, expenseId) {
  // Remove existing modal if any
  const existingModal = document.getElementById('expenseFilesModal');
  if (existingModal) {
    existingModal.remove();
  }
  
  const modal = document.createElement('div');
  modal.id = 'expenseFilesModal';
  modal.className = 'zande-modal';
  modal.style.display = 'block';
  modal.innerHTML = `
    <div class="zande-modal-content" style="max-width: 600px;">
      <div class="modal-header">
        <h3>📎 Supporting Documents</h3>
        <span class="close" onclick="document.getElementById('expenseFilesModal').remove()">&times;</span>
      </div>
      
      <div style="margin: 20px 0;">
        <p><strong>Found ${files.length} supporting document(s):</strong></p>
        
        <div id="filesGrid" style="display: grid; gap: 10px; margin-top: 15px;">
          ${files.map(file => `
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px; border: 1px solid #e5e7eb; border-radius: 8px; background: white;">
              <div style="display: flex; align-items: center;">
                <span style="font-size: 24px; margin-right: 12px;">${getFileIcon(file.file_type)}</span>
                <div>
                  <div style="font-weight: 500; color: #111;">${file.file_name}</div>
                  <small style="color: #666;">
                    ${formatFileSize(file.file_size)} • 
                    Uploaded ${new Date(file.uploaded_at).toLocaleDateString()}
                    ${file.uploaded_by ? ` by ${file.uploaded_by}` : ''}
                  </small>
                </div>
              </div>
              <button onclick="downloadExpenseFile('${file.file_path}', '${file.file_name}')" 
                      style="padding: 8px 16px; background: #059669; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500;">
                📥 Download
              </button>
            </div>
          `).join('')}
        </div>
      </div>
      
      <div class="modal-footer">
        <button onclick="document.getElementById('expenseFilesModal').remove()" class="zande-btn secondary">Close</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
}

// Edit expense
async function editExpense(id) {
  try {
    const { data: expense, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    
    openExpenseModal(expense);
    
  } catch (error) {
    console.error('Error loading expense for edit:', error);
    alert('Error loading expense details');
  }
}

// Delete expense
async function deleteExpense(id) {
  if (!confirm('Are you sure you want to delete this expense?')) return;
  
  try {
    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    
    showNotification('Expense deleted successfully!', 'success');
    loadExpenseDocuments();
    
  } catch (error) {
    console.error('Error deleting expense:', error);
    alert('Error deleting expense: ' + error.message);
  }
}

// File upload and management for expenses
let uploadedFiles = []; // Store uploaded file information
let existingFiles = []; // Store existing files when editing

// Handle file selection
function handleExpenseFileUpload() {
  const fileInput = document.getElementById('expenseFiles');
  const files = fileInput.files;
  
  if (files.length === 0) return;
  
  console.log(`📎 Selected ${files.length} file(s) for upload`);
  
  // Validate files
  const maxSize = 10 * 1024 * 1024; // 10MB
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'text/plain',
    'text/csv'
  ];
  
  const validFiles = [];
  const errors = [];
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    
    // Check file size
    if (file.size > maxSize) {
      errors.push(`${file.name}: File too large (max 10MB)`);
      continue;
    }
    
    // Check file type
    if (!allowedTypes.includes(file.type)) {
      errors.push(`${file.name}: Unsupported file type`);
      continue;
    }
    
    validFiles.push(file);
  }
  
  if (errors.length > 0) {
    alert('Some files were rejected:\n' + errors.join('\n'));
  }
  
  if (validFiles.length > 0) {
    uploadExpenseFiles(validFiles);
  }
}

// Upload files to Supabase Storage
async function uploadExpenseFiles(files) {
  const progressBar = document.getElementById('progressBar');
  const uploadStatus = document.getElementById('uploadStatus');
  const uploadProgress = document.getElementById('uploadProgress');
  
  uploadProgress.style.display = 'block';
  uploadStatus.textContent = 'Preparing upload...';
  
  try {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Update progress
      const progress = ((i + 1) / files.length) * 100;
      progressBar.style.width = `${progress}%`;
      uploadStatus.textContent = `Uploading ${file.name}... (${i + 1}/${files.length})`;
      
      // Generate unique filename
      const timestamp = Date.now();
      const fileExtension = file.name.split('.').pop();
      const uniqueFileName = `expense_${timestamp}_${Math.random().toString(36).substr(2, 9)}.${fileExtension}`;
      
      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('expense-documents')
        .upload(`documents/${uniqueFileName}`, file, {
          cacheControl: '3600',
          upsert: false
        });
      
      if (error) {
        console.error('Upload error for', file.name, ':', error);
        throw new Error(`Failed to upload ${file.name}: ${error.message}`);
      }
      
      // Store file information
      const fileInfo = {
        id: Math.random().toString(36).substr(2, 9), // Temporary ID
        file_name: file.name,
        file_path: data.path,
        file_size: file.size,
        file_type: file.type,
        uploaded_at: new Date().toISOString(),
        is_new: true // Flag for new uploads
      };
      
      uploadedFiles.push(fileInfo);
      
      console.log('✅ Uploaded:', file.name, '→', data.path);
    }
    
    uploadStatus.textContent = 'Upload completed successfully!';
    setTimeout(() => {
      uploadProgress.style.display = 'none';
    }, 2000);
    
    // Update file preview
    updateFilePreview();
    showNotification(`${files.length} file(s) uploaded successfully!`, 'success');
    
  } catch (error) {
    console.error('❌ Upload failed:', error);
    uploadStatus.textContent = 'Upload failed: ' + error.message;
    uploadStatus.style.color = '#dc2626';
    showNotification('File upload failed: ' + error.message, 'error');
  }
}

// Update file preview display
function updateFilePreview() {
  const filePreview = document.getElementById('filePreview');
  const fileList = document.getElementById('fileList');
  
  const allFiles = [...existingFiles, ...uploadedFiles];
  
  if (allFiles.length === 0) {
    filePreview.style.display = 'none';
    return;
  }
  
  filePreview.style.display = 'block';
  fileList.innerHTML = '';
  
  allFiles.forEach((file, index) => {
    const fileItem = document.createElement('div');
    fileItem.style.cssText = `
      display: flex; 
      align-items: center; 
      justify-content: space-between; 
      padding: 8px; 
      border: 1px solid #e5e7eb; 
      border-radius: 6px; 
      margin-bottom: 5px; 
      background: white;
    `;
    
    const fileIcon = getFileIcon(file.file_type);
    const fileSize = formatFileSize(file.file_size);
    
    fileItem.innerHTML = `
      <div style="display: flex; align-items: center;">
        <span style="font-size: 20px; margin-right: 10px;">${fileIcon}</span>
        <div>
          <div style="font-weight: 500; color: #111;">${file.file_name}</div>
          <small style="color: #666;">${fileSize} • ${file.is_new ? 'New upload' : 'Existing file'}</small>
        </div>
      </div>
      <div>
        ${!file.is_new ? `<button onclick="downloadExpenseFile('${file.file_path}', '${file.file_name}')" 
                          style="padding: 4px 8px; margin-right: 5px; border: 1px solid #059669; background: white; color: #059669; border-radius: 4px; cursor: pointer; font-size: 0.8em;">
                          📥 Download
                        </button>` : ''}
        <button onclick="removeExpenseFile(${index}, ${file.is_new ? 'true' : 'false'})" 
                style="padding: 4px 8px; border: 1px solid #dc2626; background: white; color: #dc2626; border-radius: 4px; cursor: pointer; font-size: 0.8em;">
          🗑️ Remove
        </button>
      </div>
    `;
    
    fileList.appendChild(fileItem);
  });
}

// Get file icon based on file type
function getFileIcon(fileType) {
  if (fileType.includes('pdf')) return '📄';
  if (fileType.includes('word') || fileType.includes('document')) return '📝';
  if (fileType.includes('excel') || fileType.includes('spreadsheet')) return '📊';
  if (fileType.includes('image')) return '🖼️';
  if (fileType.includes('text')) return '📃';
  return '📎';
}

// Format file size for display
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Remove file from upload list
function removeExpenseFile(index, isNew) {
  if (isNew === 'true' || isNew === true) {
    // Remove from uploaded files
    const fileIndex = index - existingFiles.length;
    if (fileIndex >= 0 && fileIndex < uploadedFiles.length) {
      const removedFile = uploadedFiles.splice(fileIndex, 1)[0];
      console.log('🗑️ Removed uploaded file:', removedFile.file_name);
      
      // Optionally delete from storage immediately
      deleteFileFromStorage(removedFile.file_path);
    }
  } else {
    // Mark existing file for deletion
    if (index < existingFiles.length) {
      existingFiles[index].marked_for_deletion = true;
      console.log('🗑️ Marked existing file for deletion:', existingFiles[index].file_name);
    }
  }
  
  updateFilePreview();
}

// Download expense file
async function downloadExpenseFile(filePath, fileName) {
  try {
    const { data, error } = await supabase.storage
      .from('expense-documents')
      .download(filePath);
    
    if (error) throw error;
    
    // Create download link
    const url = URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showNotification(`Downloaded: ${fileName}`, 'success');
    
  } catch (error) {
    console.error('Download error:', error);
    showNotification('Download failed: ' + error.message, 'error');
  }
}

// Delete file from storage
async function deleteFileFromStorage(filePath) {
  try {
    const { error } = await supabase.storage
      .from('expense-documents')
      .remove([filePath]);
    
    if (error) {
      console.error('Storage deletion error:', error);
    } else {
      console.log('✅ Deleted from storage:', filePath);
    }
  } catch (error) {
    console.error('Error deleting from storage:', error);
  }
}

// Load existing files for expense (when editing)
async function loadExistingExpenseFiles(expenseId) {
  try {
    const { data, error } = await supabase
      .from('expense_documents')
      .select('*')
      .eq('expense_id', expenseId);
    
    if (error && error.code !== 'PGRST116') { // Ignore "table not found" error
      console.error('Error loading existing files:', error);
      return;
    }
    
    existingFiles = data || [];
    uploadedFiles = []; // Clear uploaded files when editing
    updateFilePreview();
    
    console.log(`📁 Loaded ${existingFiles.length} existing files for expense ${expenseId}`);
    
  } catch (error) {
    console.error('Error in loadExistingExpenseFiles:', error);
    existingFiles = [];
  }
}

// Save file associations to database
async function saveExpenseFileAssociations(expenseId) {
  try {
    console.log('💾 Saving file associations for expense:', expenseId);
    
    // Save new file uploads
    if (uploadedFiles.length > 0) {
      const fileRecords = uploadedFiles.map(file => ({
        expense_id: expenseId,
        file_name: file.file_name,
        file_path: file.file_path,
        file_size: file.file_size,
        file_type: file.file_type,
        uploaded_at: file.uploaded_at,
        uploaded_by: 'Current User'
      }));
      
      const { error: insertError } = await supabase
        .from('expense_documents')
        .insert(fileRecords);
      
      if (insertError) {
        console.error('Error saving file records:', insertError);
        // Don't throw error - expense was already saved
        showNotification('Expense saved but file associations failed to save', 'warning');
      } else {
        console.log(`✅ Saved ${fileRecords.length} file associations`);
      }
    }
    
    // Handle file deletions
    const filesToDelete = existingFiles.filter(file => file.marked_for_deletion);
    if (filesToDelete.length > 0) {
      for (const file of filesToDelete) {
        // Delete from database
        await supabase
          .from('expense_documents')
          .delete()
          .eq('id', file.id);
        
        // Delete from storage
        await deleteFileFromStorage(file.file_path);
      }
      
      console.log(`🗑️ Deleted ${filesToDelete.length} files`);
    }
    
  } catch (error) {
    console.error('Error saving file associations:', error);
    showNotification('Files uploaded but associations may not be saved properly', 'warning');
  }
}

// Make functions global
window.calculateExpenseVAT = calculateExpenseVAT;
window.editExpense = editExpense;
window.deleteExpense = deleteExpense;
window.closeExpenseModal = closeExpenseModal;

// ========================================
// BANKING MODULE
// ========================================

let bankAccounts = [];
let bankTransactions = [];
let bankTransfers = [];
let currentReconciliationAccount = null;

// Initialize Banking when section is clicked
document.addEventListener('DOMContentLoaded', function() {
  const bankingBtn = document.querySelector('[data-module="banking"]');
  if (bankingBtn) {
    bankingBtn.addEventListener('click', function() {
      console.log('Banking section clicked');
      loadBankAccounts();
      setupBankingButtons();
      showBankingTab('accounts'); // Default to accounts tab
    });
  }
});

// Setup button event listeners
function setupBankingButtons() {
  // Account buttons
  const addAccountBtn = document.getElementById('addBankAccountBtn');
  const refreshBalancesBtn = document.getElementById('refreshBalancesBtn');
  
  // Transaction buttons
  const addTransactionBtn = document.getElementById('addTransactionBtn');
  const importStatementsBtn = document.getElementById('importStatementsBtn'); // ADD THIS
  const applyTransactionFiltersBtn = document.getElementById('applyTransactionFilters');
  const clearTransactionFiltersBtn = document.getElementById('clearTransactionFilters');
  
  // Transfer buttons
  const addTransferBtn = document.getElementById('addTransferBtn');
  
  // Reconciliation buttons
  const startReconciliationBtn = document.getElementById('startReconciliationBtn');
  const reconcileSelectedBtn = document.getElementById('reconcileSelectedBtn');
  const finishReconciliationBtn = document.getElementById('finishReconciliationBtn');
  
  // Account forms
  const accountForm = document.getElementById('bankAccountForm');
  const transactionForm = document.getElementById('transactionForm');
  const transferForm = document.getElementById('transferForm');
  
  if (addAccountBtn) addAccountBtn.onclick = openBankAccountModal;
  if (refreshBalancesBtn) refreshBalancesBtn.onclick = refreshAccountBalances;
  if (addTransactionBtn) addTransactionBtn.onclick = openTransactionModal;
  if (importStatementsBtn) importStatementsBtn.onclick = importBankStatement; // ADD THIS
  if (addTransferBtn) addTransferBtn.onclick = openTransferModal;
  if (startReconciliationBtn) startReconciliationBtn.onclick = startReconciliation;
  if (reconcileSelectedBtn) reconcileSelectedBtn.onclick = reconcileSelectedTransactions;
  if (finishReconciliationBtn) finishReconciliationBtn.onclick = finishReconciliation;
  
  if (applyTransactionFiltersBtn) applyTransactionFiltersBtn.onclick = applyTransactionFilters;
  if (clearTransactionFiltersBtn) clearTransactionFiltersBtn.onclick = clearTransactionFilters;
  
  if (accountForm) accountForm.onsubmit = saveBankAccount;
  if (transactionForm) transactionForm.onsubmit = saveTransaction;
  if (transferForm) transferForm.onsubmit = saveTransfer;
}

// ========================================
// TAB MANAGEMENT
// ========================================

function showBankingTab(tabName) {
  // Hide all tab contents
  const allTabs = document.querySelectorAll('.banking-tab-content');
  const allTabButtons = document.querySelectorAll('.banking-tab');
  
  allTabs.forEach(tab => tab.classList.remove('active'));
  allTabButtons.forEach(btn => btn.classList.remove('active'));
  
  // Show selected tab
  const selectedTab = document.getElementById(tabName + 'TabContent');
  const selectedButton = document.getElementById(tabName + 'Tab');
  
  if (selectedTab) selectedTab.classList.add('active');
  if (selectedButton) selectedButton.classList.add('active');
  
  // Load data for the selected tab
  switch(tabName) {
    case 'accounts':
      loadBankAccounts();
      break;
    case 'transactions':
      loadBankTransactions();
      loadAccountsForFilters();
      break;
    case 'transfers':
      loadBankTransfers();
      break;
    case 'reconciliation':
      loadAccountsForReconciliation();
      break;
  }
}

// ========================================
// BANK ACCOUNTS MANAGEMENT
// ========================================

// Load bank accounts
async function loadBankAccounts() {
  try {
    const { data, error } = await supabase
      .from('bank_accounts')
      .select('*')
      .order('account_name');

    if (error) throw error;

    bankAccounts = data || [];
    renderBankAccountsTable(bankAccounts);
    updateAccountsSummary(bankAccounts);
    
  } catch (error) {
    console.error('Error loading bank accounts:', error);
    showNotification('Error loading bank accounts: ' + error.message, 'error');
  }
}

// Render bank accounts table
function renderBankAccountsTable(accounts) {
  const tbody = document.querySelector('#bankAccountsTable tbody');
  if (!tbody) return;
  
  tbody.innerHTML = '';
  
  if (!accounts || accounts.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 20px;">No bank accounts found</td></tr>';
    return;
  }
  
  accounts.forEach(account => {
    const row = document.createElement('tr');
    const balanceClass = account.current_balance >= 0 ? 'balance-positive' : 'balance-negative';
    const accountTypeClass = `account-type-${account.account_type.toLowerCase().replace(' ', '-')}`;
    
    row.innerHTML = `
      <td>
        <strong>${account.account_name}</strong>
        ${account.description ? `<br><small style="color: #666;">${account.description}</small>` : ''}
      </td>
      <td>
        <span class="account-type-badge ${accountTypeClass}">
          ${account.account_type}
        </span>
      </td>
      <td>${account.bank_name || '-'}</td>
      <td>${account.account_number || '-'}</td>
      <td class="${balanceClass}">R${parseFloat(account.current_balance).toFixed(2)}</td>
      <td>
        <span class="${account.is_active ? 'status-active' : 'status-inactive'}">
          ${account.is_active ? 'Active' : 'Inactive'}
        </span>
      </td>
      <td>
        <div class="action-buttons">
          <button onclick="viewAccountTransactions('${account.id}')" class="modern-btn view-btn" title="View Transactions">
            <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
          </button>
          <button onclick="editBankAccount('${account.id}')" class="modern-btn edit-btn" title="Edit">
            <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 00-3 3L12 9l-4 1 1-4 3.5-3.5z"></path>
            </svg>
          </button>
          <button onclick="toggleAccountStatus('${account.id}', ${account.is_active})" class="modern-btn status-btn" title="Toggle Status">
            <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 12l2 2 4-4"></path>
              <circle cx="12" cy="12" r="9"></circle>
            </svg>
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(row);
  });
}

// Update accounts summary cards
function updateAccountsSummary(accounts) {
  let totalCash = 0;
  let totalDebt = 0;
  
  accounts.forEach(account => {
    const balance = parseFloat(account.current_balance);
    if (account.account_type === 'Credit Card' && balance < 0) {
      totalDebt += Math.abs(balance);
    } else if (account.account_type !== 'Credit Card' && balance > 0) {
      totalCash += balance;
    }
  });
  
  const netWorth = totalCash - totalDebt;
  
  const totalCashEl = document.getElementById('totalCashAmount');
  const totalDebtEl = document.getElementById('totalDebtAmount');
  const netWorthEl = document.getElementById('netWorthAmount');
  
  if (totalCashEl) totalCashEl.textContent = `R${totalCash.toFixed(2)}`;
  if (totalDebtEl) totalDebtEl.textContent = `R${totalDebt.toFixed(2)}`;
  if (netWorthEl) {
    netWorthEl.textContent = `R${netWorth.toFixed(2)}`;
    netWorthEl.className = `amount ${netWorth >= 0 ? '' : 'debt'}`;
  }
}

// Open bank account modal
function openBankAccountModal(account = null) {
  const modal = document.getElementById('bankAccountModal');
  const form = document.getElementById('bankAccountForm');
  
  if (!modal || !form) return;
  
  modal.style.display = 'block';
  form.reset();
  
  if (account) {
    // Editing existing account
    document.getElementById('bankAccountModalTitle').textContent = 'Edit Bank Account';
    document.getElementById('bankAccountId').value = account.id;
    document.getElementById('accountName').value = account.account_name || '';
    document.getElementById('accountType').value = account.account_type || '';
    document.getElementById('bankName').value = account.bank_name || '';
    document.getElementById('accountNumber').value = account.account_number || '';
    document.getElementById('branchCode').value = account.branch_code || '';
    document.getElementById('openingDate').value = account.opening_date || '';
    document.getElementById('openingBalance').value = account.opening_balance || 0;
    document.getElementById('currentBalance').value = account.current_balance || 0;
    document.getElementById('accountDescription').value = account.description || '';
  } else {
    // New account
    document.getElementById('bankAccountModalTitle').textContent = 'Add Bank Account';
    document.getElementById('openingDate').value = new Date().toISOString().split('T')[0];
  }
}

// Close bank account modal
function closeBankAccountModal() {
  const modal = document.getElementById('bankAccountModal');
  if (modal) modal.style.display = 'none';
}

// Save bank account
async function saveBankAccount(e) {
  e.preventDefault();
  
  const accountId = document.getElementById('bankAccountId').value;
  const accountData = {
    account_name: document.getElementById('accountName').value,
    account_type: document.getElementById('accountType').value,
    bank_name: document.getElementById('bankName').value || null,
    account_number: document.getElementById('accountNumber').value || null,
    branch_code: document.getElementById('branchCode').value || null,
    opening_date: document.getElementById('openingDate').value,
    opening_balance: parseFloat(document.getElementById('openingBalance').value) || 0,
    current_balance: parseFloat(document.getElementById('currentBalance').value) || 0,
    description: document.getElementById('accountDescription').value || null
  };
  
  try {
    let result;
    if (accountId) {
      // Update existing account
      result = await supabase
        .from('bank_accounts')
        .update(accountData)
        .eq('id', accountId);
    } else {
      // Insert new account
      result = await supabase
        .from('bank_accounts')
        .insert([accountData]);
    }
    
    if (result.error) throw result.error;
    
    // After successful save
    showNotification('Bank account saved successfully!', 'success');
    closeBankAccountModal();
    loadBankAccounts(); // Refresh banking table
    
    // 🆕 Auto-refresh expense modal if it's open
    refreshBankAccountsInExpenseModal();
    
  } catch (error) {
    console.error('Error saving bank account:', error);
    alert('Error saving bank account: ' + error.message);
  }
}

// Edit bank account
async function editBankAccount(id) {
  try {
    const { data: account, error } = await supabase
      .from('bank_accounts')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    
    openBankAccountModal(account);
    
  } catch (error) {
    console.error('Error loading bank account for edit:', error);
    alert('Error loading bank account details');
  }
}

// Toggle account status
async function toggleAccountStatus(id, currentStatus) {
  const newStatus = !currentStatus;
  const action = newStatus ? 'activate' : 'deactivate';
  
  if (!confirm(`Are you sure you want to ${action} this account?`)) return;
  
  try {
    const { error } = await supabase
      .from('bank_accounts')
      .update({ is_active: newStatus })
      .eq('id', id);
    
    if (error) throw error;
    
    showNotification(`Account ${action}d successfully!`, 'success');
    loadBankAccounts();
    
  } catch (error) {
    console.error('Error updating account status:', error);
    alert('Error updating account status: ' + error.message);
  }
}

// Refresh account balances
async function refreshAccountBalances() {
  try {
    showNotification('Refreshing account balances...', 'info');
    
    // This would typically connect to bank APIs
    // For now, we'll just reload the accounts
    await loadBankAccounts();
    
    showNotification('Account balances refreshed!', 'success');
    
  } catch (error) {
    console.error('Error refreshing balances:', error);
    showNotification('Error refreshing balances: ' + error.message, 'error');
  }
}

// ========================================
// BANK TRANSACTIONS MANAGEMENT
// ========================================

// Load bank transactions
async function loadBankTransactions() {
  try {
    const { data, error } = await supabase
      .from('bank_transactions')
      .select(`
        *,
        bank_accounts (account_name, account_type)
      `)
      .order('transaction_date', { ascending: false })
      .limit(100);

    if (error) throw error;

    bankTransactions = data || [];
    renderBankTransactionsTable(bankTransactions);
    
  } catch (error) {
    console.error('Error loading bank transactions:', error);
    showNotification('Error loading transactions: ' + error.message, 'error');
  }
}

// Render bank transactions table
function renderBankTransactionsTable(transactions) {
  const tbody = document.querySelector('#bankTransactionsTable tbody');
  if (!tbody) return;
  
  tbody.innerHTML = '';
  
  if (!transactions || transactions.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 20px;">No transactions found</td></tr>';
    return;
  }
  
  transactions.forEach(transaction => {
    const row = document.createElement('tr');
    const typeClass = `transaction-type-${transaction.transaction_type.toLowerCase().replace(' ', '-')}`;
    const balanceClass = transaction.balance_after >= 0 ? 'balance-positive' : 'balance-negative';
    
    row.innerHTML = `
      <td>${new Date(transaction.transaction_date).toLocaleDateString()}</td>
      <td>
        <strong>${transaction.bank_accounts?.account_name}</strong>
        <br><small style="color: #666;">${transaction.bank_accounts?.account_type}</small>
      </td>
      <td>
        ${transaction.description}
        ${transaction.reference ? `<br><small style="color: #666;">Ref: ${transaction.reference}</small>` : ''}
      </td>
      <td>
        <span class="${typeClass}">
          ${transaction.transaction_type}
        </span>
      </td>
      <td style="text-align: right; font-weight: 600;">
        ${transaction.transaction_type.includes('Withdrawal') || transaction.transaction_type.includes('Transfer Out') ? '-' : '+'}R${parseFloat(transaction.amount).toFixed(2)}
      </td>
      <td class="${balanceClass}" style="text-align: right;">
        R${parseFloat(transaction.balance_after || 0).toFixed(2)}
      </td>
      <td>
        <span class="${transaction.is_reconciled ? 'reconciled-yes' : 'reconciled-no'}">
          ${transaction.is_reconciled ? 'Yes' : 'No'}
        </span>
      </td>
      <td>
        <div class="action-buttons">
          <button onclick="editTransaction('${transaction.id}')" class="modern-btn edit-btn" title="Edit">
            <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 00-3 3L12 9l-4 1 1-4 3.5-3.5z"></path>
            </svg>
          </button>
          <button onclick="deleteTransaction('${transaction.id}')" class="modern-btn delete-btn" title="Delete">
            <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 6h18"></path>
              <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"></path>
              <line x1="10" y1="11" x2="10" y2="17"></line>
              <line x1="14" y1="11" x2="14" y2="17"></line>
            </svg>
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(row);
  });
}

// Import bank statement functionality
// Enhanced import bank statement functionality with PDF support
function importBankStatement() {
  // Create file input dynamically
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = '.csv,.xlsx,.xls,.pdf'; // Added PDF support
  fileInput.style.display = 'none';
  
  fileInput.onchange = function(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Check file type
    const fileName = file.name.toLowerCase();
    const isCSV = fileName.endsWith('.csv');
    const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');
    const isPDF = fileName.endsWith('.pdf');
    
    if (!isCSV && !isExcel && !isPDF) {
      alert('Please select a CSV, Excel, or PDF file');
      return;
    }
    
    // Show processing message for PDF
    if (isPDF) {
      showNotification('Processing PDF... This may take a moment', 'info');
    }
    
    if (isCSV) {
      importCSVStatement(file);
    } else if (isExcel) {
      importExcelStatement(file);
    } else if (isPDF) {
      importPDFStatement(file);
    }
  };
  
  document.body.appendChild(fileInput);
  fileInput.click();
  document.body.removeChild(fileInput);
}

// NEW: Import PDF bank statement
function importPDFStatement(file) {
  // Check if PDF.js is available
  if (typeof pdfjsLib === 'undefined') {
    alert('PDF processing library not loaded. Please refresh the page and try again.');
    return;
  }
  
  const reader = new FileReader();
  reader.onload = function(e) {
    const typedArray = new Uint8Array(e.target.result);
    
    // Load PDF document
    pdfjsLib.getDocument(typedArray).promise.then(function(pdf) {
      console.log('PDF loaded, pages:', pdf.numPages);
      
      // Extract text from all pages
      const pagePromises = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        pagePromises.push(extractTextFromPage(pdf, i));
      }
      
      Promise.all(pagePromises).then(function(pagesText) {
        const fullText = pagesText.join('\n');
        console.log('Extracted PDF text:', fullText);
        
        // Parse transactions from text
        const transactions = parseBankStatementText(fullText);
        
        if (transactions.length === 0) {
          alert('No transactions found in PDF. Please ensure this is a valid bank statement.');
          return;
        }
        
        showImportPreview(transactions, 'PDF');
        
      }).catch(function(error) {
        console.error('Error extracting text from PDF:', error);
        alert('Error processing PDF: ' + error.message);
      });
      
    }).catch(function(error) {
      console.error('Error loading PDF:', error);
      alert('Error loading PDF file. Please ensure this is a valid PDF.');
    });
  };
  
  reader.readAsArrayBuffer(file);
}

// Extract text from a PDF page
async function extractTextFromPage(pdf, pageNumber) {
  try {
    const page = await pdf.getPage(pageNumber);
    const textContent = await page.getTextContent();
    
    // Combine text items with positioning
    let textItems = textContent.items.map(item => ({
      text: item.str,
      x: item.transform[4],
      y: item.transform[5]
    }));
    
    // Sort by Y position (top to bottom), then X position (left to right)
    textItems.sort((a, b) => {
      const yDiff = b.y - a.y; // Reverse Y (PDF coordinates are bottom-up)
      if (Math.abs(yDiff) > 5) return yDiff; // Different lines
      return a.x - b.x; // Same line, sort by X
    });
    
    // Group text items into lines
    const lines = [];
    let currentLine = [];
    let lastY = null;
    
    textItems.forEach(item => {
      if (lastY === null || Math.abs(item.y - lastY) <= 5) {
        // Same line
        currentLine.push(item.text);
      } else {
        // New line
        if (currentLine.length > 0) {
          lines.push(currentLine.join(' '));
        }
        currentLine = [item.text];
      }
      lastY = item.y;
    });
    
    // Add the last line
    if (currentLine.length > 0) {
      lines.push(currentLine.join(' '));
    }
    
    return lines.join('\n');
    
  } catch (error) {
    console.error('Error extracting text from page:', error);
    return '';
  }
}

// Parse bank statement text to extract transactions
function parseBankStatementText(text) {
  const transactions = [];
  const lines = text.split('\n');
  
  console.log('Parsing', lines.length, 'lines of text');
  
  // Common patterns for different banks
  const patterns = [
    // Standard Bank format: Date Description Amount Balance
    {
      regex: /(\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2})\s+(.+?)\s+([-]?[\d\s,]+\.?\d{0,2})\s+([-]?[\d\s,]+\.?\d{0,2})$/,
      groups: { date: 1, description: 2, amount: 3, balance: 4 }
    },
    // FNB format: Date Reference Description Debit Credit Balance
    {
      regex: /(\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2})\s+(\w+)?\s+(.+?)\s+([\d\s,]+\.?\d{0,2})?\s+([\d\s,]+\.?\d{0,2})?\s+([-]?[\d\s,]+\.?\d{0,2})$/,
      groups: { date: 1, reference: 2, description: 3, debit: 4, credit: 5, balance: 6 }
    },
    // ABSA format: Date Description Reference Debit Credit Balance
    {
      regex: /(\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2})\s+(.+?)\s+(\w+)\s+([\d\s,]+\.?\d{0,2})?\s+([\d\s,]+\.?\d{0,2})?\s+([-]?[\d\s,]+\.?\d{0,2})$/,
      groups: { date: 1, description: 2, reference: 3, debit: 4, credit: 5, balance: 6 }
    },
    // Nedbank format: Date Description Amount Balance
    {
      regex: /(\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2})\s+(.+?)\s+([-+]?[\d\s,]+\.?\d{0,2})\s+([-]?[\d\s,]+\.?\d{0,2})$/,
      groups: { date: 1, description: 2, amount: 3, balance: 4 }
    }
  ];
  
  lines.forEach((line, index) => {
    // Skip header lines and empty lines
    if (!line.trim() || 
        line.toLowerCase().includes('date') || 
        line.toLowerCase().includes('balance') ||
        line.toLowerCase().includes('statement') ||
        line.toLowerCase().includes('account') ||
        line.length < 20) {
      return;
    }
    
    // Try each pattern
    for (const pattern of patterns) {
      const match = line.match(pattern.regex);
      if (match) {
        console.log('Matched pattern on line', index + 1, ':', line);
        
        const transaction = parseTransactionFromMatch(match, pattern.groups);
        if (transaction) {
          transactions.push(transaction);
          break; // Found a match, no need to try other patterns
        }
      }
    }
  });
  
  console.log('Parsed', transactions.length, 'transactions');
  return transactions;
}

// Parse transaction data from regex match
function parseTransactionFromMatch(match, groups) {
  try {
    // Extract date
    let dateStr = match[groups.date];
    const date = parseStatementDate(dateStr);
    if (!date) return null;
    
    // Extract description
    let description = match[groups.description] || 'Transaction';
    description = description.trim().replace(/\s+/g, ' '); // Clean up whitespace
    
    // Extract amount
    let amount = 0;
    let transactionType = 'Deposit';
    
    if (groups.amount) {
      // Single amount column (positive/negative)
      const amountStr = match[groups.amount];
      amount = parseStatementAmount(amountStr);
      transactionType = amount < 0 ? 'Withdrawal' : 'Deposit';
      amount = Math.abs(amount);
    } else if (groups.debit && groups.credit) {
      // Separate debit/credit columns
      const debitStr = match[groups.debit] || '';
      const creditStr = match[groups.credit] || '';
      
      if (debitStr.trim()) {
        amount = parseStatementAmount(debitStr);
        transactionType = 'Withdrawal';
      } else if (creditStr.trim()) {
        amount = parseStatementAmount(creditStr);
        transactionType = 'Deposit';
      }
    }
    
    if (amount <= 0) return null; // Invalid amount
    
    // Extract reference if available
    let reference = '';
    if (groups.reference && match[groups.reference]) {
      reference = match[groups.reference].trim();
    }
    
    return {
      Date: date,
      Description: description,
      Amount: amount,
      Type: transactionType,
      Reference: reference
    };
    
  } catch (error) {
    console.error('Error parsing transaction:', error);
    return null;
  }
}

// Parse date from various formats
function parseStatementDate(dateStr) {
  if (!dateStr) return null;
  
  // Remove extra spaces
  dateStr = dateStr.trim();
  
  // Try different date formats
  const formats = [
    /(\d{1,2})\/(\d{1,2})\/(\d{4})/, // DD/MM/YYYY or D/M/YYYY
    /(\d{4})-(\d{2})-(\d{2})/, // YYYY-MM-DD
    /(\d{1,2})-(\d{1,2})-(\d{4})/, // DD-MM-YYYY
    /(\d{1,2})\.(\d{1,2})\.(\d{4})/ // DD.MM.YYYY
  ];
  
  for (const format of formats) {
    const match = dateStr.match(format);
    if (match) {
      let day, month, year;
      
      if (format.source.includes('\\d{4}') && format.source.indexOf('\\d{4}') === 1) {
        // YYYY-MM-DD format
        year = parseInt(match[1]);
        month = parseInt(match[2]);
        day = parseInt(match[3]);
      } else {
        // DD/MM/YYYY format
        day = parseInt(match[1]);
        month = parseInt(match[2]);
        year = parseInt(match[3]);
      }
      
      // Validate date
      if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 2000) {
        const date = new Date(year, month - 1, day);
        return date.toISOString().split('T')[0];
      }
    }
  }
  
  return null;
}

// Parse amount from various formats
function parseStatementAmount(amountStr) {
  if (!amountStr) return 0;
  
  // Remove spaces, commas, and currency symbols
  let cleanAmount = amountStr.toString()
    .replace(/[R$€£¥\s,]/g, '') // Remove currency symbols, spaces, commas
    .replace(/\s+/g, '') // Remove any remaining spaces
    .trim();
  
  // Handle negative amounts (brackets or minus sign)
  let isNegative = false;
  if (cleanAmount.includes('(') && cleanAmount.includes(')')) {
    isNegative = true;
    cleanAmount = cleanAmount.replace(/[()]/g, '');
  } else if (cleanAmount.startsWith('-')) {
    isNegative = true;
    cleanAmount = cleanAmount.substring(1);
  }
  
  // Parse the number
  const amount = parseFloat(cleanAmount);
  return isNaN(amount) ? 0 : (isNegative ? -amount : amount);
}

// Import CSV bank statement
function importCSVStatement(file) {
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const csv = e.target.result;
      const lines = csv.split('\n');
      
      if (lines.length < 2) {
        alert('CSV file appears to be empty or invalid');
        return;
      }
      
      // Parse CSV
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      const transactions = [];
      
      for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim()) {
          const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
          if (values.length === headers.length) {
            const transaction = {};
            headers.forEach((header, index) => {
              transaction[header] = values[index];
            });
            transactions.push(transaction);
          }
        }
      }
      
      showImportPreview(transactions, 'CSV');
      
    } catch (error) {
      console.error('Error parsing CSV:', error);
      alert('Error parsing CSV file: ' + error.message);
    }
  };
  
  reader.readAsText(file);
}

// Import Excel bank statement
function importExcelStatement(file) {
  if (typeof XLSX === 'undefined') {
    alert('Excel import not available. Please use CSV format instead.');
    return;
  }
  
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const transactions = XLSX.utils.sheet_to_json(worksheet);
      
      showImportPreview(transactions, 'Excel');
      
    } catch (error) {
      console.error('Error parsing Excel:', error);
      alert('Error parsing Excel file: ' + error.message);
    }
  };
  
  reader.readAsArrayBuffer(file);
}

// Show import preview modal
function showImportPreview(transactions, fileType) {
  if (!transactions || transactions.length === 0) {
    alert('No transactions found in the file');
    return;
  }
  
  // Create preview modal
  const modal = document.createElement('div');
  modal.className = 'zande-modal';
  modal.style.display = 'block';
  modal.innerHTML = `
    <div class="zande-modal-content" style="max-width: 800px;">
      <div class="modal-header">
        <h3>Import Preview - ${fileType} File</h3>
        <span class="close" onclick="this.parentElement.parentElement.parentElement.remove()">&times;</span>
      </div>
      
      <div style="margin: 20px 0;">
        <p><strong>Found ${transactions.length} transactions</strong></p>
        <p>Please select the account and map the columns:</p>
        
        <div style="margin: 15px 0;">
          <label>Import to Account:</label>
          <select id="importAccount" style="margin-left: 10px; padding: 8px;">
            <option value="">Select Account</option>
          </select>
        </div>
        
        <div style="margin: 15px 0;">
          <label>Column Mapping:</label>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 10px;">
            <div>
              <label>Date Column:</label>
              <select id="dateColumn" style="width: 100%; padding: 5px;"></select>
            </div>
            <div>
              <label>Description Column:</label>
              <select id="descriptionColumn" style="width: 100%; padding: 5px;"></select>
            </div>
            <div>
              <label>Amount Column:</label>
              <select id="amountColumn" style="width: 100%; padding: 5px;"></select>
            </div>
            <div>
              <label>Type Column (Optional):</label>
              <select id="typeColumn" style="width: 100%; padding: 5px;">
                <option value="">Auto-detect from amount</option>
              </select>
            </div>
          </div>
        </div>
      </div>
      
      <div style="max-height: 300px; overflow-y: auto; border: 1px solid #ddd; margin: 20px 0;">
        <table style="width: 100%; border-collapse: collapse;">
          <thead style="background: #f5f5f5; position: sticky; top: 0;">
            <tr id="previewHeaders"></tr>
          </thead>
          <tbody id="previewBody"></tbody>
        </table>
      </div>
      
      <div class="modal-footer">
        <button onclick="processImport()" class="zande-btn">Import Transactions</button>
        <button onclick="this.parentElement.parentElement.parentElement.remove()" class="zande-btn secondary">Cancel</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Load accounts for import
  loadAccountsForImport();
  
  // Populate column dropdowns
  const headers = Object.keys(transactions[0]);
  const columnSelects = ['dateColumn', 'descriptionColumn', 'amountColumn', 'typeColumn'];
  
  columnSelects.forEach(selectId => {
    const select = document.getElementById(selectId);
    select.innerHTML = '<option value="">Select Column</option>';
    headers.forEach(header => {
      const option = document.createElement('option');
      option.value = header;
      option.textContent = header;
      select.appendChild(option);
    });
  });
  
  // Auto-detect common column names
  autoDetectColumns(headers);
  
  // Show preview table
  const headerRow = document.getElementById('previewHeaders');
  const bodyElement = document.getElementById('previewBody');
  
  headers.forEach(header => {
    const th = document.createElement('th');
    th.textContent = header;
    th.style.cssText = 'padding: 8px; border: 1px solid #ddd; text-align: left;';
    headerRow.appendChild(th);
  });
  
  // Show first 10 transactions
  transactions.slice(0, 10).forEach(transaction => {
    const row = document.createElement('tr');
    headers.forEach(header => {
      const td = document.createElement('td');
      td.textContent = transaction[header] || '';
      td.style.cssText = 'padding: 8px; border: 1px solid #ddd;';
      row.appendChild(td);
    });
    bodyElement.appendChild(row);
  });
  
  // Store transactions globally for processing
  window.importTransactions = transactions;
}

// Load accounts for import dropdown
async function loadAccountsForImport() {
  try {
    const { data, error } = await supabase
      .from('bank_accounts')
      .select('id, account_name, account_type')
      .eq('is_active', true)
      .order('account_name');
      
    if (error) throw error;
    
    const select = document.getElementById('importAccount');
    if (select) {
      data.forEach(account => {
        const option = document.createElement('option');
        option.value = account.id;
        option.textContent = `${account.account_name} (${account.account_type})`;
        select.appendChild(option);
      });
    }
  } catch (error) {
    console.error('Error loading accounts:', error);
  }
}

// Auto-detect common column names
function autoDetectColumns(headers) {
  const mappings = {
    dateColumn: ['date', 'transaction_date', 'trans_date', 'posting_date'],
    descriptionColumn: ['description', 'details', 'narrative', 'reference'],
    amountColumn: ['amount', 'value', 'debit', 'credit', 'transaction_amount'],
    typeColumn: ['type', 'transaction_type', 'debit_credit', 'dr_cr']
  };
  
  Object.keys(mappings).forEach(selectId => {
    const select = document.getElementById(selectId);
    const keywords = mappings[selectId];
    
    for (const header of headers) {
      const lowerHeader = header.toLowerCase();
      if (keywords.some(keyword => lowerHeader.includes(keyword))) {
        select.value = header;
        break;
      }
    }
  });
}

// Process import
async function processImport() {
  const accountId = document.getElementById('importAccount').value;
  const dateColumn = document.getElementById('dateColumn').value;
  const descriptionColumn = document.getElementById('descriptionColumn').value;
  const amountColumn = document.getElementById('amountColumn').value;
  const typeColumn = document.getElementById('typeColumn').value;
  
  if (!accountId || !dateColumn || !descriptionColumn || !amountColumn) {
    alert('Please select account and map required columns (Date, Description, Amount)');
    return;
  }
  
  try {
    const transactions = window.importTransactions;
    const processedTransactions = [];
    
    // Get current account balance
    const { data: account } = await supabase
      .from('bank_accounts')
      .select('current_balance')
      .eq('id', accountId)
      .single();
      
    let runningBalance = parseFloat(account?.current_balance || 0);
    
    for (const transaction of transactions) {
      const dateValue = transaction[dateColumn];
      const descriptionValue = transaction[descriptionColumn];
      const amountValue = parseFloat(transaction[amountColumn]);
      
      if (!dateValue || !descriptionValue || isNaN(amountValue)) {
        console.log('Skipping invalid transaction:', transaction);
        continue;
      }
      
      // Parse date
      let transactionDate;
      try {
        transactionDate = new Date(dateValue).toISOString().split('T')[0];
      } catch {
        console.log('Invalid date format:', dateValue);
        continue;
      }
      
      // Determine transaction type
      let transactionType = 'Deposit';
      if (typeColumn && transaction[typeColumn]) {
        const typeValue = transaction[typeColumn].toLowerCase();
        if (typeValue.includes('debit') || typeValue.includes('withdrawal') || typeValue.includes('out')) {
          transactionType = 'Withdrawal';
        }
      } else {
        // Auto-detect from amount (negative = withdrawal)
        if (amountValue < 0) {
          transactionType = 'Withdrawal';
        }
      }
      
      // Calculate balance
      const absoluteAmount = Math.abs(amountValue);
      runningBalance += transactionType === 'Deposit' ? absoluteAmount : -absoluteAmount;
      
      const processedTransaction = {
        bank_account_id: accountId,
        transaction_date: transactionDate,
        description: descriptionValue,
        transaction_type: transactionType,
        amount: absoluteAmount,
        balance_after: runningBalance,
        category: 'Imported',
        reference: `Import ${new Date().toLocaleDateString()}`
      };
      
      processedTransactions.push(processedTransaction);
    }
    
    if (processedTransactions.length === 0) {
      alert('No valid transactions found to import');
      return;
    }
    
    // Insert transactions
    const { error: insertError } = await supabase
      .from('bank_transactions')
      .insert(processedTransactions);
      
    if (insertError) throw insertError;
    
    // Update account balance
    const { error: updateError } = await supabase
      .from('bank_accounts')
      .update({ current_balance: runningBalance })
      .eq('id', accountId);
      
    if (updateError) throw updateError;
    
    showNotification(`Successfully imported ${processedTransactions.length} transactions!`, 'success');
    
    // Close modal and refresh data
    document.querySelector('.zande-modal').remove();
    loadBankTransactions();
    loadBankAccounts();
    
  } catch (error) {
    console.error('Error importing transactions:', error);
    alert('Error importing transactions: ' + error.message);
  }
}

// Make function global
window.processImport = processImport;

// Load accounts for filters and forms
async function loadAccountsForFilters() {
  try {
    const { data, error } = await supabase
      .from('bank_accounts')
      .select('id, account_name, account_type, current_balance')
      .eq('is_active', true)
      .order('account_name');
      
    if (error) throw error;
    
    // Update filter dropdown
    const filterSelect = document.getElementById('filterBankAccount');
    if (filterSelect) {
      filterSelect.innerHTML = '<option value="">All Accounts</option>';
      data.forEach(account => {
        const option = document.createElement('option');
        option.value = account.id;
        option.textContent = `${account.account_name} (${account.account_type})`;
        filterSelect.appendChild(option);
      });
    }
    
    // Update transaction form dropdown
    const transactionSelect = document.getElementById('transactionBankAccount');
    if (transactionSelect) {
      transactionSelect.innerHTML = '<option value="">Select Account</option>';
      data.forEach(account => {
        const option = document.createElement('option');
        option.value = account.id;
        option.textContent = `${account.account_name} - R${parseFloat(account.current_balance).toFixed(2)}`;
        transactionSelect.appendChild(option);
      });
    }
    
    // Update transfer form dropdowns
    const fromAccountSelect = document.getElementById('fromAccount');
    const toAccountSelect = document.getElementById('toAccount');
    
    if (fromAccountSelect && toAccountSelect) {
      const accountOptions = data.map(account => ({
        value: account.id,
        text: `${account.account_name} - R${parseFloat(account.current_balance).toFixed(2)}`,
        balance: account.current_balance
      }));
      
      [fromAccountSelect, toAccountSelect].forEach(select => {
        select.innerHTML = '<option value="">Select Account</option>';
        accountOptions.forEach(opt => {
          const option = document.createElement('option');
          option.value = opt.value;
          option.textContent = opt.text;
          option.dataset.balance = opt.balance;
          select.appendChild(option);
        });
      });
    }
    
  } catch (error) {
    console.error('Error loading accounts for filters:', error);
  }
}

// Open transaction modal 
function openTransactionModal(transaction = null) {
  const modal = document.getElementById('transactionModal');
  const form = document.getElementById('transactionForm');
  
  if (!modal || !form) {
    console.error('Transaction modal or form not found');
    return;
  }
  
  modal.style.display = 'block';
  form.reset();
  
  // Load accounts for the form first
  loadAccountsForFilters();
  
  if (transaction) {
    // Editing existing transaction
    document.getElementById('transactionModalTitle').textContent = 'Edit Transaction';
    document.getElementById('transactionId').value = transaction.id || '';
    document.getElementById('transactionBankAccount').value = transaction.bank_account_id || '';
    document.getElementById('transactionDate').value = transaction.transaction_date || '';
    document.getElementById('transactionType').value = transaction.transaction_type || '';
    document.getElementById('transactionAmount').value = transaction.amount || '';
    document.getElementById('transactionDescription').value = transaction.description || '';
    document.getElementById('transactionReference').value = transaction.reference || '';
    document.getElementById('transactionCategory').value = transaction.category || '';
  } else {
    // New transaction
    document.getElementById('transactionModalTitle').textContent = 'Record Transaction';
    document.getElementById('transactionId').value = ''; // Make sure this is empty
    document.getElementById('transactionDate').value = new Date().toISOString().split('T')[0];
    
    // Set default values
    document.getElementById('transactionBankAccount').value = '';
    document.getElementById('transactionType').value = '';
    document.getElementById('transactionAmount').value = '';
    document.getElementById('transactionDescription').value = '';
    document.getElementById('transactionReference').value = '';
    document.getElementById('transactionCategory').value = '';
  }
}

// Close transaction modal
function closeTransactionModal() {
  const modal = document.getElementById('transactionModal');
  if (modal) modal.style.display = 'none';
}

// Handle transaction type change
function handleTransactionTypeChange() {
  const type = document.getElementById('transactionType').value;
  const amountField = document.getElementById('transactionAmount');
  
  if (type) {
    amountField.placeholder = type.includes('Deposit') || type.includes('Transfer In') ? 
      'Amount received' : 'Amount paid';
  }
}

// Save transaction
async function saveTransaction(e) {
  e.preventDefault();
  
  const transactionId = document.getElementById('transactionId').value;
  const bankAccountId = document.getElementById('transactionBankAccount').value;
  const amount = parseFloat(document.getElementById('transactionAmount').value);
  const transactionType = document.getElementById('transactionType').value;
  const description = document.getElementById('transactionDescription').value;
  
  // VALIDATION - Check all required fields
  if (!bankAccountId) {
    alert('Please select a bank account');
    return;
  }
  
  if (!amount || amount <= 0) {
    alert('Please enter a valid amount greater than 0');
    return;
  }
  
  if (!transactionType) {
    alert('Please select a transaction type');
    return;
  }
  
  if (!description || description.trim() === '') {
    alert('Please enter a description');
    return;
  }
  
  console.log('Transaction validation passed:', {
    bankAccountId,
    amount,
    transactionType,
    description
  });
  
  try {
    // Get current account balance and details
    const { data: account, error: accountError } = await supabase
      .from('bank_accounts')
      .select('current_balance, account_name')
      .eq('id', bankAccountId)
      .single();
      
    if (accountError) {
      console.error('Account error:', accountError);
      alert('Error getting account balance: ' + accountError.message);
      return;
    }
    
    if (!account) {
      alert('Selected account not found');
      return;
    }
    
    const currentBalance = parseFloat(account.current_balance || 0);
    
    // Calculate new balance
    let balanceChange = 0;
    if (transactionType === 'Deposit') {
      balanceChange = amount;
    } else if (transactionType === 'Withdrawal') {
      balanceChange = -amount;
    }
    
    const newBalance = currentBalance + balanceChange;
    
    // Prepare transaction data
    const transactionData = {
      bank_account_id: bankAccountId,
      transaction_date: document.getElementById('transactionDate').value,
      description: description.trim(),
      reference: document.getElementById('transactionReference').value?.trim() || null,
      transaction_type: transactionType,
      amount: amount,
      balance_after: newBalance,
      category: document.getElementById('transactionCategory').value || null,
      is_reconciled: false
    };
    
    console.log('Saving transaction data:', transactionData);
    
    let result;
    if (transactionId && transactionId.trim() !== '') {
      // Update existing transaction
      result = await supabase
        .from('bank_transactions')
        .update(transactionData)
        .eq('id', transactionId)
        .select()
        .single();
    } else {
      // Insert new transaction
      result = await supabase
        .from('bank_transactions')
        .insert([transactionData])
        .select()
        .single();
    }
    
    if (result.error) {
      console.error('Transaction save error:', result.error);
      throw result.error;
    }
    
    // Update account balance
    const { error: updateError } = await supabase
      .from('bank_accounts')
      .update({ current_balance: newBalance })
      .eq('id', bankAccountId);
      
    if (updateError) {
      console.error('Balance update error:', updateError);
      throw updateError;
    }
    
    // 🆕 AUTO-POST TO GENERAL LEDGER
    try {
      // Prepare data for GL posting
      const transactionForGL = {
        ...transactionData,
        bank_account_code: '1120', // Default - you might want to store this in bank_accounts table
        bank_account_name: account.account_name
      };
      
      // Generate GL entries for banking transaction
      const glEntries = GLEntryTemplates.bankingTransaction(transactionForGL);
      
      // Post to General Ledger
      await postToGeneralLedger(glEntries, 'banking', result.data.id);
      
      showNotification('Banking transaction saved and posted to General Ledger! ✅', 'success');
      
    } catch (glError) {
      console.error('GL posting error:', glError);
      // Don't fail the whole transaction, just warn user
      showNotification('Banking transaction saved but failed to post to GL: ' + glError.message, 'warning');
    }
    
    closeTransactionModal();
    
    // Refresh data
    loadBankTransactions();
    loadBankAccounts();
    
  } catch (error) {
    console.error('Error saving transaction:', error);
    alert('Error saving transaction: ' + error.message);
  }
}

// Edit transaction
async function editTransaction(id) {
  try {
    const { data: transaction, error } = await supabase
      .from('bank_transactions')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    
    openTransactionModal(transaction);
    
  } catch (error) {
    console.error('Error loading transaction for edit:', error);
    alert('Error loading transaction details');
  }
}

// Delete transaction
async function deleteTransaction(id) {
  if (!confirm('Are you sure you want to delete this transaction?')) return;
  
  try {
    const { error } = await supabase
      .from('bank_transactions')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    
    showNotification('Transaction deleted successfully!', 'success');
    loadBankTransactions();
    loadBankAccounts(); // Refresh account balances
    
  } catch (error) {
    console.error('Error deleting transaction:', error);
    alert('Error deleting transaction: ' + error.message);
  }
}

// Apply transaction filters
function applyTransactionFilters() {
  const accountFilter = document.getElementById('filterBankAccount').value;
  const typeFilter = document.getElementById('filterTransactionType').value;
  const dateFromFilter = document.getElementById('filterTransactionDateFrom').value;
  const dateToFilter = document.getElementById('filterTransactionDateTo').value;
  
  let filteredTransactions = [...bankTransactions];
  
  if (accountFilter) {
    filteredTransactions = filteredTransactions.filter(t => t.bank_account_id === accountFilter);
  }
  
  if (typeFilter) {
    filteredTransactions = filteredTransactions.filter(t => t.transaction_type === typeFilter);
  }
  
  if (dateFromFilter) {
    filteredTransactions = filteredTransactions.filter(t => t.transaction_date >= dateFromFilter);
  }
  
  if (dateToFilter) {
    filteredTransactions = filteredTransactions.filter(t => t.transaction_date <= dateToFilter);
  }
  
  renderBankTransactionsTable(filteredTransactions);
}

// Clear transaction filters
function clearTransactionFilters() {
  document.getElementById('filterBankAccount').value = '';
  document.getElementById('filterTransactionType').value = '';
  document.getElementById('filterTransactionDateFrom').value = '';
  document.getElementById('filterTransactionDateTo').value = '';
  
  renderBankTransactionsTable(bankTransactions);
}

// View account transactions
function viewAccountTransactions(accountId) {
  showBankingTab('transactions');
  
  // Set account filter and apply
  setTimeout(() => {
    const accountFilter = document.getElementById('filterBankAccount');
    if (accountFilter) {
      accountFilter.value = accountId;
      applyTransactionFilters();
    }
  }, 100);
}

// ========================================
// MONEY TRANSFERS
// ========================================

// Load bank transfers
async function loadBankTransfers() {
  try {
    const { data, error } = await supabase
      .from('bank_transfers')
      .select(`
        *,
        from_account:from_account_id (account_name),
        to_account:to_account_id (account_name)
      `)
      .order('transfer_date', { ascending: false });

    if (error) throw error;

    bankTransfers = data || [];
    renderBankTransfersTable(bankTransfers);
    
  } catch (error) {
    console.error('Error loading bank transfers:', error);
    showNotification('Error loading transfers: ' + error.message, 'error');
  }
}

// Render bank transfers table
function renderBankTransfersTable(transfers) {
  const tbody = document.querySelector('#bankTransfersTable tbody');
  if (!tbody) return;
  
  tbody.innerHTML = '';
  
  if (!transfers || transfers.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 20px;">No transfers found</td></tr>';
    return;
  }
  
  transfers.forEach(transfer => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${new Date(transfer.transfer_date).toLocaleDateString()}</td>
      <td>${transfer.from_account?.account_name}</td>
      <td>${transfer.to_account?.account_name}</td>
      <td style="font-weight: 600;">R${parseFloat(transfer.amount).toFixed(2)}</td>
      <td>${transfer.description}</td>
      <td>${transfer.reference || '-'}</td>
      <td>
        <div class="action-buttons">
          <button onclick="editTransfer('${transfer.id}')" class="modern-btn edit-btn" title="Edit">
            <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 00-3 3L12 9l-4 1 1-4 3.5-3.5z"></path>
            </svg>
          </button>
          <button onclick="deleteTransfer('${transfer.id}')" class="modern-btn delete-btn" title="Delete">
            <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 6h18"></path>
              <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"></path>
              <line x1="10" y1="11" x2="10" y2="17"></line>
              <line x1="14" y1="11" x2="14" y2="17"></line>
            </svg>
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(row);
  });
}

// Open transfer modal
function openTransferModal(transfer = null) {
  const modal = document.getElementById('transferModal');
  const form = document.getElementById('transferForm');
  
  if (!modal || !form) return;
  
  modal.style.display = 'block';
  form.reset();
  
  // Load accounts for the form
  loadAccountsForFilters();
  
  if (transfer) {
    // Editing existing transfer
    document.getElementById('fromAccount').value = transfer.from_account_id;
    document.getElementById('toAccount').value = transfer.to_account_id;
    document.getElementById('transferAmount').value = transfer.amount;
    document.getElementById('transferDate').value = transfer.transfer_date;
    document.getElementById('transferDescription').value = transfer.description;
    document.getElementById('transferReference').value = transfer.reference || '';
  } else {
    // New transfer
    document.getElementById('transferDate').value = new Date().toISOString().split('T')[0];
  }
}

// Close transfer modal
function closeTransferModal() {
  const modal = document.getElementById('transferModal');
  if (modal) modal.style.display = 'none';
}

// Update transfer balances display
function updateTransferBalances() {
  const fromSelect = document.getElementById('fromAccount');
  const toSelect = document.getElementById('toAccount');
  const fromBalanceEl = document.getElementById('fromAccountBalance');
  const toBalanceEl = document.getElementById('toAccountBalance');
  
  if (fromSelect && fromSelect.value && fromBalanceEl) {
    const selectedOption = fromSelect.options[fromSelect.selectedIndex];
    const balance = selectedOption.dataset.balance;
    fromBalanceEl.textContent = `Balance: R${parseFloat(balance || 0).toFixed(2)}`;
  }
  
  if (toSelect && toSelect.value && toBalanceEl) {
    const selectedOption = toSelect.options[toSelect.selectedIndex];
    const balance = selectedOption.dataset.balance;
    toBalanceEl.textContent = `Balance: R${parseFloat(balance || 0).toFixed(2)}`;
  }
}

// Save transfer
async function saveTransfer(e) {
  e.preventDefault();
  
  const fromAccountId = document.getElementById('fromAccount').value;
  const toAccountId = document.getElementById('toAccount').value;
  const amount = parseFloat(document.getElementById('transferAmount').value);
  
  if (fromAccountId === toAccountId) {
    alert('Cannot transfer to the same account');
    return;
  }
  
  const transferData = {
    from_account_id: fromAccountId,
    to_account_id: toAccountId,
    transfer_date: document.getElementById('transferDate').value,
    amount: amount,
    description: document.getElementById('transferDescription').value,
    reference: document.getElementById('transferReference').value || null
  };
  
  try {
    // Insert transfer record
    const { data: transferResult, error: transferError } = await supabase
      .from('bank_transfers')
      .insert([transferData])
      .select()
      .single();
    
    if (transferError) throw transferError;
    
    // Create withdrawal transaction for from account
    const withdrawalData = {
      bank_account_id: fromAccountId,
      transaction_date: transferData.transfer_date,
      description: `Transfer to ${document.querySelector(`#toAccount option[value="${toAccountId}"]`).textContent.split(' - ')[0]}`,
      reference: transferData.reference,
      transaction_type: 'Transfer Out',
      amount: amount,
      category: 'Transfer'
    };
    
    // Create deposit transaction for to account
    const depositData = {
      bank_account_id: toAccountId,
      transaction_date: transferData.transfer_date,
      description: `Transfer from ${document.querySelector(`#fromAccount option[value="${fromAccountId}"]`).textContent.split(' - ')[0]}`,
      reference: transferData.reference,
      transaction_type: 'Transfer In',
      amount: amount,
      category: 'Transfer'
    };
    
    // Get current balances
    const { data: accounts, error: balanceError } = await supabase
      .from('bank_accounts')
      .select('id, current_balance')
      .in('id', [fromAccountId, toAccountId]);
      
    if (balanceError) throw balanceError;
    
    const fromAccount = accounts.find(a => a.id === fromAccountId);
    const toAccount = accounts.find(a => a.id === toAccountId);
    
    // Calculate new balances
    const newFromBalance = parseFloat(fromAccount.current_balance) - amount;
    const newToBalance = parseFloat(toAccount.current_balance) + amount;
    
    withdrawalData.balance_after = newFromBalance;
    depositData.balance_after = newToBalance;
    
    // Insert both transactions
    const { error: transactionError } = await supabase
      .from('bank_transactions')
      .insert([withdrawalData, depositData]);
      
    if (transactionError) throw transactionError;
    
    // Update account balances
    const { error: updateError } = await supabase
      .from('bank_accounts')
      .upsert([
        { id: fromAccountId, current_balance: newFromBalance },
        { id: toAccountId, current_balance: newToBalance }
      ]);
      
    if (updateError) throw updateError;
    
    showNotification('Transfer completed successfully!', 'success');
    closeTransferModal();
    loadBankTransfers();
    loadBankAccounts(); // Refresh account balances
    
  } catch (error) {
    console.error('Error saving transfer:', error);
    alert('Error saving transfer: ' + error.message);
  }
}

// Edit transfer
async function editTransfer(id) {
  try {
    const { data: transfer, error } = await supabase
      .from('bank_transfers')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    
    openTransferModal(transfer);
    
  } catch (error) {
    console.error('Error loading transfer for edit:', error);
    alert('Error loading transfer details');
  }
}

// Delete transfer
async function deleteTransfer(id) {
  if (!confirm('Are you sure you want to delete this transfer? This will also remove the associated transactions.')) return;
  
  try {
    const { error } = await supabase
      .from('bank_transfers')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    
    showNotification('Transfer deleted successfully!', 'success');
    loadBankTransfers();
    
  } catch (error) {
    console.error('Error deleting transfer:', error);
    alert('Error deleting transfer: ' + error.message);
  }
}

// ========================================
// BANK RECONCILIATION
// ========================================

// Load accounts for reconciliation
async function loadAccountsForReconciliation() {
  try {
    const { data, error } = await supabase
      .from('bank_accounts')
      .select('id, account_name, account_type, current_balance')
      .eq('is_active', true)
      .order('account_name');
      
    if (error) throw error;
    
    const reconcileSelect = document.getElementById('reconcileAccountSelect');
    if (reconcileSelect) {
      reconcileSelect.innerHTML = '<option value="">Select Account to Reconcile</option>';
      data.forEach(account => {
        const option = document.createElement('option');
        option.value = account.id;
        option.textContent = `${account.account_name} (${account.account_type}) - R${parseFloat(account.current_balance).toFixed(2)}`;
        reconcileSelect.appendChild(option);
      });
    }
    
  } catch (error) {
    console.error('Error loading accounts for reconciliation:', error);
  }
}

// Start reconciliation
async function startReconciliation() {
  const accountId = document.getElementById('reconcileAccountSelect').value;
  if (!accountId) {
    alert('Please select an account to reconcile');
    return;
  }
  
  currentReconciliationAccount = accountId;
  
  try {
    // Get account details
    const { data: account, error: accountError } = await supabase
      .from('bank_accounts')
      .select('*')
      .eq('id', accountId)
      .single();
      
    if (accountError) throw accountError;
    
    // Get unreconciled transactions
    const { data: transactions, error: transactionsError } = await supabase
      .from('bank_transactions')
      .select('*')
      .eq('bank_account_id', accountId)
      .eq('is_reconciled', false)
      .order('transaction_date');
      
    if (transactionsError) throw transactionsError;
    
    // Show reconciliation area
    document.getElementById('reconciliationArea').style.display = 'block';
    document.getElementById('bookBalance').textContent = `R${parseFloat(account.current_balance).toFixed(2)}`;
    
    // Render unreconciled transactions
    renderUnreconciledTransactions(transactions);
    
  } catch (error) {
    console.error('Error starting reconciliation:', error);
    alert('Error starting reconciliation: ' + error.message);
  }
}

// Render unreconciled transactions
function renderUnreconciledTransactions(transactions) {
  const tbody = document.querySelector('#unreconciledTransactionsTable tbody');
  if (!tbody) return;
  
  tbody.innerHTML = '';
  
  if (!transactions || transactions.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px;">All transactions are reconciled</td></tr>';
    return;
  }
  
  transactions.forEach(transaction => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>
        <input type="checkbox" value="${transaction.id}" class="reconcile-checkbox">
      </td>
      <td>${new Date(transaction.transaction_date).toLocaleDateString()}</td>
      <td>${transaction.description}</td>
      <td>${transaction.transaction_type}</td>
      <td style="text-align: right;">
        ${transaction.transaction_type.includes('Withdrawal') || transaction.transaction_type.includes('Transfer Out') ? '-' : '+'}R${parseFloat(transaction.amount).toFixed(2)}
      </td>
    `;
    tbody.appendChild(row);
  });
  
  // Update statement balance change handler
  const statementBalanceField = document.getElementById('statementBalance');
  if (statementBalanceField) {
    statementBalanceField.oninput = calculateReconciliationDifference;
  }
}

// Calculate reconciliation difference
function calculateReconciliationDifference() {
  const statementBalance = parseFloat(document.getElementById('statementBalance').value) || 0;
  const bookBalanceText = document.getElementById('bookBalance').textContent;
  const bookBalance = parseFloat(bookBalanceText.replace('R', '')) || 0;
  
  const difference = statementBalance - bookBalance;
  const differenceEl = document.getElementById('reconciliationDifference');
  
  if (differenceEl) {
    differenceEl.textContent = `R${difference.toFixed(2)}`;
    differenceEl.style.color = difference === 0 ? '#059669' : '#dc2626';
  }
}

// Reconcile selected transactions
async function reconcileSelectedTransactions() {
  const checkboxes = document.querySelectorAll('.reconcile-checkbox:checked');
  const transactionIds = Array.from(checkboxes).map(cb => cb.value);
  
  if (transactionIds.length === 0) {
    alert('Please select transactions to reconcile');
    return;
  }
  
  try {
    const { error } = await supabase
      .from('bank_transactions')
      .update({ 
        is_reconciled: true, 
        reconciled_date: new Date().toISOString().split('T')[0] 
      })
      .in('id', transactionIds);
    
    if (error) throw error;
    
    showNotification(`${transactionIds.length} transactions reconciled successfully!`, 'success');
    
    // Refresh unreconciled transactions
    startReconciliation();
    
  } catch (error) {
    console.error('Error reconciling transactions:', error);
    alert('Error reconciling transactions: ' + error.message);
  }
}

// Finish reconciliation
function finishReconciliation() {
  const difference = document.getElementById('reconciliationDifference').textContent;
  
  if (difference !== 'R0.00') {
    if (!confirm('There is still a difference of ' + difference + '. Are you sure you want to finish reconciliation?')) {
      return;
    }
  }
  
  document.getElementById('reconciliationArea').style.display = 'none';
  currentReconciliationAccount = null;
  
  showNotification('Reconciliation completed!', 'success');
  loadBankAccounts(); // Refresh account data
}

// Make functions global
window.showBankingTab = showBankingTab;
window.openBankAccountModal = openBankAccountModal;
window.closeBankAccountModal = closeBankAccountModal;
window.editBankAccount = editBankAccount;
window.toggleAccountStatus = toggleAccountStatus;
window.viewAccountTransactions = viewAccountTransactions;
window.openTransactionModal = openTransactionModal;
window.closeTransactionModal = closeTransactionModal;
window.handleTransactionTypeChange = handleTransactionTypeChange;
window.saveTransaction = saveTransaction;
window.editTransaction = editTransaction;
window.deleteTransaction = deleteTransaction;
window.openTransferModal = openTransferModal;
window.closeTransferModal = closeTransferModal;
window.updateTransferBalances = updateTransferBalances;
window.editTransfer = editTransfer;
window.deleteTransfer = deleteTransfer;
window.startReconciliation = startReconciliation;
window.reconcileSelectedTransactions = reconcileSelectedTransactions;
window.finishReconciliation = finishReconciliation;

// ========================================
// MANUAL JOURNALS MODULE
// ========================================

let journalEntries = [];
let currentJournalLines = [];
let chartOfAccounts = [];

// Initialize Journals when section is clicked
document.addEventListener('DOMContentLoaded', function() {
  const journalsBtn = document.querySelector('[data-module="journals"]');
  if (journalsBtn) {
    journalsBtn.addEventListener('click', function() {
      console.log('Journals section clicked');
      initializeJournals();
    });
  }
});

// Initialize journals module
async function initializeJournals() {
  await loadChartOfAccounts();
  await loadJournalEntries();
  setupJournalButtons();
  updateJournalSummary();
}

// Setup button event listeners
function setupJournalButtons() {
  const addBtn = document.getElementById('addJournalBtn');
  const closeBtn = document.getElementById('closeJournalModal');
  const closeViewBtn = document.getElementById('closeViewJournalModal');
  const form = document.getElementById('journalForm');
  const addLineBtn = document.getElementById('addJournalLineBtn');
  const postBtn = document.getElementById('postJournalBtn');
  
  if (addBtn) addBtn.onclick = openJournalModal;
  if (closeBtn) closeBtn.onclick = closeJournalModal;
  if (closeViewBtn) closeViewBtn.onclick = closeViewJournalModal;
  if (form) form.onsubmit = saveJournalEntry;
  if (addLineBtn) addLineBtn.onclick = addJournalLine;
  if (postBtn) postBtn.onclick = saveAndPostJournal;
  
  // Filter buttons
  const applyFiltersBtn = document.getElementById('applyJournalFilters');
  const clearFiltersBtn = document.getElementById('clearJournalFilters');
  const referenceFilter = document.getElementById('filterJournalReference');
  
  if (applyFiltersBtn) applyFiltersBtn.onclick = applyJournalFilters;
  if (clearFiltersBtn) clearFiltersBtn.onclick = clearJournalFilters;
  if (referenceFilter) referenceFilter.oninput = applyJournalFilters;
  
  // Export buttons
  const excelBtn = document.getElementById('exportJournalsExcel');
  const pdfBtn = document.getElementById('exportJournalsPdf');
  
  if (excelBtn) excelBtn.onclick = exportJournalsExcel;
  if (pdfBtn) pdfBtn.onclick = exportJournalsPdf;
}

// Load chart of accounts for journal lines - ENHANCED VERSION
async function loadChartOfAccounts() {
  try {
    console.log('🗂️ Loading Chart of Accounts from database...');
    
    // First try to load from your actual COA table
    const { data: coaData, error } = await supabase
      .from('chart_of_accounts')
      .select('*')
      .eq('is_active', true)
      .order('account_code');
    
    if (error) {
      console.warn('⚠️ COA table not found, trying to create default accounts...');
      // If no table exists, create default accounts in the database
      await createDefaultCOAInDatabase();
      
      // Try loading again
      const { data: retryData, error: retryError } = await supabase
        .from('chart_of_accounts')
        .select('*')
        .eq('is_active', true)
        .order('account_code');
      
      if (retryError) {
        console.error('❌ Cannot load COA, using fallback');
        chartOfAccounts = getDefaultIFRSAccounts();
      } else {
        chartOfAccounts = retryData || [];
      }
    } else {
      chartOfAccounts = coaData || [];
    }
    
    // Store globally for all modules to use
    window.chartOfAccounts = chartOfAccounts;
    window.chartOfAccountsData = chartOfAccounts; // For compatibility
    
    console.log(`✅ Loaded ${chartOfAccounts.length} accounts from Chart of Accounts`);
    console.log('Sample accounts:', chartOfAccounts.slice(0, 5));
    
    return chartOfAccounts;
    
  } catch (error) {
    console.error('❌ Error loading chart of accounts:', error);
    chartOfAccounts = getDefaultIFRSAccounts();
    window.chartOfAccounts = chartOfAccounts;
    window.chartOfAccountsData = chartOfAccounts;
    return chartOfAccounts;
  }
}

// Create default Chart of Accounts in the database
async function createDefaultCOAInDatabase() {
  try {
    console.log('🔧 Creating default Chart of Accounts in database...');
    
    const defaultAccounts = getDefaultIFRSAccounts();
    
    // Map to database structure
    const accountsForDB = defaultAccounts.map(account => ({
      account_code: account.account_code,
      account_name: account.account_name,
      account_type: account.account_type,
      account_category: account.account_category,
      normal_balance: account.normal_balance,
      financial_statement: account.account_type === 'Asset' || account.account_type === 'Liability' || account.account_type === 'Equity' ? 'Balance Sheet' : 'Income Statement',
      display_order: parseInt(account.account_code),
      is_active: true,
      allow_manual_entries: true,
      is_system_account: false
    }));
    
    const { error } = await supabase
      .from('chart_of_accounts')
      .insert(accountsForDB);
    
    if (error) {
      console.error('❌ Error creating default COA:', error);
      throw error;
    }
    
    console.log('✅ Successfully created default Chart of Accounts in database');
    showNotification('✅ Default Chart of Accounts created in database!', 'success');
    
  } catch (error) {
    console.error('❌ Error in createDefaultCOAInDatabase:', error);
    showNotification('Could not create default accounts in database', 'warning');
  }
}

// Load journal entries
async function loadJournalEntries() {
  try {
    const { data, error } = await supabase
      .from('journal_entries')
      .select(`
        *,
        journal_lines (*)
      `)
      .order('journal_date', { ascending: false });

    if (error) {
      console.log('No journal entries table yet - will be created when first journal is saved');
      journalEntries = [];
    } else {
      journalEntries = data || [];
    }
    
    renderJournalEntriesTable(journalEntries);
    updateJournalSummary();
    
  } catch (error) {
    console.error('Error loading journal entries:', error);
    journalEntries = [];
    renderJournalEntriesTable([]);
  }
}

// Update the renderJournalEntriesTable function to add print button
function renderJournalEntriesTable(entries) {
  const tbody = document.querySelector('#journalsTable tbody');
  if (!tbody) return;
  
  tbody.innerHTML = '';
  
  if (!entries || entries.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 20px;">No journal entries found</td></tr>';
    return;
  }
  
  entries.forEach(entry => {
    const row = document.createElement('tr');
    const statusClass = `status-${entry.status.toLowerCase()}`;
    
    row.innerHTML = `
      <td>${new Date(entry.journal_date).toLocaleDateString()}</td>
      <td><strong>${entry.reference}</strong></td>
      <td>${entry.description}</td>
      <td style="font-weight: 600; color: var(--zande-green);">R${parseFloat(entry.total_amount || 0).toFixed(2)}</td>
      <td>
        <span class="status-badge ${statusClass}">
          ${entry.status === 'Posted' ? '✅' : entry.status === 'Draft' ? '📝' : '🔄'} ${entry.status}
        </span>
      </td>
      <td>${entry.created_by || 'System'}</td>
      <td>
        <div class="action-buttons">
          <button onclick="viewJournalEntry('${entry.id}')" class="modern-btn view-btn" title="View">
            <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
          </button>
          <button onclick="exportSingleJournalPdf('${entry.id}')" class="modern-btn print-btn" title="Print Journal">
            <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M6 9V2a1 1 0 011-1h4a1 1 0 011 1v7"></path>
              <path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"></path>
              <path d="M6 14h12v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4z"></path>
            </svg>
          </button>
          ${entry.status === 'Draft' ? `
            <button onclick="editJournalEntry('${entry.id}')" class="modern-btn edit-btn" title="Edit">
              <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 00-3 3L12 9l-4 1 1-4 3.5-3.5z"></path>
              </svg>
            </button>
            <button onclick="deleteJournalEntry('${entry.id}')" class="modern-btn delete-btn" title="Delete">
              <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 6h18"></path>
                <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"></path>
                <line x1="10" y1="11" x2="10" y2="17"></line>
                <line x1="14" y1="11" x2="14" y2="17"></line>
              </svg>
            </button>
          ` : `
            <button onclick="reverseJournalEntry('${entry.id}')" class="modern-btn status-btn" title="Reverse">
              <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M1 4l5-4 5 4"></path>
                <path d="M5 10v2a2 2 0 002 2h10"></path>
              </svg>
            </button>
          `}
        </div>
      </td>
    `;
    tbody.appendChild(row);
  });
}

// Make the new function global
window.exportSingleJournalPdf = exportSingleJournalPdf;

// Update journal summary cards
function updateJournalSummary() {
  const totalCount = journalEntries.length;
  const postedCount = journalEntries.filter(j => j.status === 'Posted').length;
  const draftCount = journalEntries.filter(j => j.status === 'Draft').length;
  const totalAmount = journalEntries.reduce((sum, j) => sum + (parseFloat(j.total_amount) || 0), 0);
  
  const totalCountEl = document.getElementById('totalJournalsCount');
  const postedCountEl = document.getElementById('postedJournalsCount');
  const draftCountEl = document.getElementById('draftJournalsCount');
  const totalAmountEl = document.getElementById('totalJournalAmount');
  
  if (totalCountEl) totalCountEl.textContent = totalCount;
  if (postedCountEl) postedCountEl.textContent = postedCount;
  if (draftCountEl) draftCountEl.textContent = draftCount;
  if (totalAmountEl) totalAmountEl.textContent = `R${totalAmount.toFixed(2)}`;
}

// Open journal modal - ENHANCED
async function openJournalModal(entry = null) {
  const modal = document.getElementById('journalModal');
  const form = document.getElementById('journalForm');
  
  if (!modal || !form) return;
  
  // FIRST: Ensure Chart of Accounts is loaded
  showNotification('Loading Chart of Accounts...', 'info');
  await loadChartOfAccounts();
  
  modal.style.display = 'block';
  form.reset();
  currentJournalLines = [];
  
  if (entry) {
    // Editing existing entry
    document.getElementById('journalModalTitle').textContent = 'Edit Journal Entry';
    document.getElementById('journalId').value = entry.id;
    document.getElementById('journalDate').value = entry.journal_date;
    document.getElementById('journalReference').value = entry.reference;
    document.getElementById('journalDescription').value = entry.description;
    document.getElementById('journalStatus').value = entry.status;
    
    // Load journal lines
    if (entry.journal_lines) {
      currentJournalLines = entry.journal_lines.map(line => ({
        account_code: line.account_code,
        account_name: line.account_name,
        description: line.description,
        debit_amount: line.debit_amount || 0,
        credit_amount: line.credit_amount || 0
      }));
    }
  } else {
    // New entry
    document.getElementById('journalModalTitle').textContent = 'New Journal Entry';
    document.getElementById('journalDate').value = new Date().toISOString().split('T')[0];
    
    // Generate unique reference asynchronously
    try {
      const reference = await generateJournalReference();
      document.getElementById('journalReference').value = reference;
    } catch (error) {
      console.error('Error generating reference:', error);
      const fallbackRef = `JE${Date.now().toString().slice(-8)}`;
      document.getElementById('journalReference').value = fallbackRef;
    }
    
    // Add two empty lines to start
    addJournalLine();
    addJournalLine();
  }
  
  renderJournalLines();
  calculateJournalTotals();
  
  showNotification(`✅ Ready! Choose from ${chartOfAccounts.length} accounts in your Chart of Accounts`, 'success');
}

// Close journal modal
function closeJournalModal() {
  const modal = document.getElementById('journalModal');
  if (modal) modal.style.display = 'none';
  currentJournalLines = [];
}

// Generate unique journal reference
async function generateJournalReference() {
  try {
    // Get current date components
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    
    // Get count of journals created today to ensure uniqueness
    const todayStart = `${year}-${month}-${day}`;
    const todayEnd = `${year}-${month}-${day}T23:59:59`;
    
    const { data: todayJournals, error } = await supabase
      .from('journal_entries')
      .select('reference')
      .gte('journal_date', todayStart)
      .lte('created_at', todayEnd)
      .order('created_at', { ascending: false });
    
    let sequence = 1;
    
    if (!error && todayJournals && todayJournals.length > 0) {
      // Find the highest sequence number for today
      const todaySequences = todayJournals
        .map(j => {
          const match = j.reference.match(/JE\d{8}(\d{3})$/);
          return match ? parseInt(match[1]) : 0;
        })
        .filter(seq => seq > 0);
      
      if (todaySequences.length > 0) {
        sequence = Math.max(...todaySequences) + 1;
      }
    }
    
    // Generate reference: JE + YYYYMMDD + sequence (3 digits)
    const sequenceStr = String(sequence).padStart(3, '0');
    const reference = `JE${year}${month}${day}${sequenceStr}`;
    
    console.log('Generated journal reference:', reference);
    return reference;
    
  } catch (error) {
    console.error('Error generating journal reference:', error);
    // Fallback to timestamp-based reference
    const timestamp = Date.now().toString().slice(-6);
    return `JE${new Date().getFullYear()}${timestamp}`;
  }
}

// Add journal line
function addJournalLine() {
  const newLine = {
    account_code: '',
    account_name: '',
    description: '',
    debit_amount: 0,
    credit_amount: 0
  };
  
  currentJournalLines.push(newLine);
  renderJournalLines();
}

// Remove journal line
function removeJournalLine(index) {
  if (currentJournalLines.length <= 2) {
    alert('Journal must have at least 2 lines (minimum one debit and one credit)');
    return;
  }
  
  currentJournalLines.splice(index, 1);
  renderJournalLines();
  calculateJournalTotals();
}

// Render journal lines with FULL Chart of Accounts
function renderJournalLines() {
  const container = document.getElementById('journalLinesContainer');
  if (!container) return;
  
  container.innerHTML = '';
  
  // Ensure we have accounts loaded
  if (!chartOfAccounts || chartOfAccounts.length === 0) {
    console.warn('⚠️ No Chart of Accounts loaded, loading now...');
    loadChartOfAccounts().then(() => {
      renderJournalLines(); // Re-render after loading
    });
    return;
  }
  
  currentJournalLines.forEach((line, index) => {
    const row = document.createElement('tr');
    
    // Build account options with organized structure
    let accountOptions = '<option value="">Select Account</option>';
    
    // Group accounts by type for better UX
    const accountTypes = ['Asset', 'Liability', 'Equity', 'Revenue', 'Expense'];
    
    accountTypes.forEach(type => {
      const accountsOfType = chartOfAccounts.filter(account => account.account_type === type);
      if (accountsOfType.length > 0) {
        accountOptions += `<optgroup label="📊 ${type} Accounts">`;
        accountsOfType.forEach(account => {
          // Handle both account_code and code formats
          const accountCode = account.account_code || account.code;
          const accountName = account.account_name || account.name;
          const selected = line.account_code === accountCode ? 'selected' : '';
          accountOptions += `
            <option value="${accountCode}" ${selected}>
              ${accountCode} - ${accountName}
              ${account.account_category ? ` (${account.account_category})` : ''}
            </option>
          `;
        });
        accountOptions += '</optgroup>';
      }
    });
    
    row.innerHTML = `
      <td>
        <select onchange="selectAccount(${index}, this.value)" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
          ${accountOptions}
        </select>
        ${line.account_code ? `<small style="color: #666; display: block; margin-top: 4px;">Normal Balance: ${getAccountNormalBalance(line.account_code)}</small>` : ''}
      </td>
      <td>
        <input type="text" value="${line.description}" 
               onchange="updateJournalLine(${index}, 'description', this.value)"
               placeholder="Line description..." 
               style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
      </td>
      <td>
        <input type="number" value="${line.debit_amount || ''}" min="0" step="0.01"
               onchange="updateJournalLine(${index}, 'debit_amount', this.value)"
               oninput="updateJournalLine(${index}, 'debit_amount', this.value)"
               placeholder="0.00" 
               style="width: 100%; text-align: right; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
      </td>
      <td>
        <input type="number" value="${line.credit_amount || ''}" min="0" step="0.01"
               onchange="updateJournalLine(${index}, 'credit_amount', this.value)"
               oninput="updateJournalLine(${index}, 'credit_amount', this.value)"
               placeholder="0.00" 
               style="width: 100%; text-align: right; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
      </td>
      <td>
        <button type="button" onclick="removeJournalLine(${index})" class="modern-btn delete-btn" title="Remove Line">
          <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 6h18"></path>
            <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"></path>
          </svg>
        </button>
      </td>
    `;
    container.appendChild(row);
  });
}

// Get account normal balance for display - CORRECTED
function getAccountNormalBalance(accountCode) {
  // Check both formats for compatibility
  const account = chartOfAccounts.find(a => 
    (a.account_code === accountCode) || (a.code === accountCode)
  );
  return account ? account.normal_balance : 'Unknown';
}

// Get account type for validation - CORRECTED
function getAccountType(accountCode) {
  // Check both formats for compatibility
  const account = chartOfAccounts.find(a => 
    (a.account_code === accountCode) || (a.code === accountCode)
  );
  return account ? account.account_type : 'Unknown';
}

// Enhanced select account function with account info - CORRECTED
function selectAccount(index, accountCode) {
  // Ensure we're working with journal lines, not other line items
  if (!currentJournalLines || !currentJournalLines[index]) {
    console.error('Invalid journal line index:', index);
    return;
  }
  
  if (!accountCode) {
    currentJournalLines[index].account_code = '';
    currentJournalLines[index].account_name = '';
    renderJournalLines(); // Re-render to update UI
    return;
  }
  
  // Check both formats for compatibility
  const account = chartOfAccounts.find(a => 
    (a.account_code === accountCode) || (a.code === accountCode)
  );
  
  if (account) {
    currentJournalLines[index].account_code = accountCode;
    currentJournalLines[index].account_name = account.account_name || account.name;
    
    console.log(`Selected account: ${accountCode} - ${account.account_name || account.name} (${account.account_type})`);
    
    // Re-render to show account info
    renderJournalLines();
  } else {
    console.error('Account not found:', accountCode);
    showNotification('Account not found in Chart of Accounts', 'error');
  }
}


// Update journal line
function updateJournalLine(index, field, value) {
  if (field === 'debit_amount' || field === 'credit_amount') {
    const numValue = parseFloat(value) || 0;
    currentJournalLines[index][field] = numValue;
    
    // Clear the opposite field when entering amount
    if (field === 'debit_amount' && numValue > 0) {
      currentJournalLines[index].credit_amount = 0;
    } else if (field === 'credit_amount' && numValue > 0) {
      currentJournalLines[index].debit_amount = 0;
    }
    
    // Re-render to update the fields
    renderJournalLines();
  } else {
    currentJournalLines[index][field] = value;
  }
  
  calculateJournalTotals();
}

// Calculate journal totals and check balance
function calculateJournalTotals() {
  let totalDebits = 0;
  let totalCredits = 0;
  
  currentJournalLines.forEach(line => {
    totalDebits += parseFloat(line.debit_amount) || 0;
    totalCredits += parseFloat(line.credit_amount) || 0;
  });
  
  const difference = totalDebits - totalCredits;
  const isBalanced = Math.abs(difference) < 0.01; // Allow for rounding errors
  
  // Update display
  const totalDebitsEl = document.getElementById('totalDebits');
  const totalCreditsEl = document.getElementById('totalCredits');
  const balanceStatusEl = document.getElementById('balanceStatus');
  const journalDifferenceEl = document.getElementById('journalDifference');
  
  if (totalDebitsEl) totalDebitsEl.textContent = `R${totalDebits.toFixed(2)}`;
  if (totalCreditsEl) totalCreditsEl.textContent = `R${totalCredits.toFixed(2)}`;
  if (journalDifferenceEl) journalDifferenceEl.textContent = `R${Math.abs(difference).toFixed(2)}`;
  
  if (balanceStatusEl) {
    if (isBalanced) {
      balanceStatusEl.innerHTML = '✅ Balanced';
      balanceStatusEl.style.color = '#059669';
    } else {
      balanceStatusEl.innerHTML = '⚠️ Out of Balance';
      balanceStatusEl.style.color = '#dc2626';
    }
  }
  
  return { totalDebits, totalCredits, difference, isBalanced };
}

// Save journal entry
async function saveJournalEntry(e) {
  e.preventDefault();
  
  console.log('Starting to save journal entry...');
  
  const { isBalanced } = calculateJournalTotals();
  
  if (!isBalanced) {
    alert('Journal is out of balance! Debits must equal Credits.');
    return;
  }
  
  if (currentJournalLines.length < 2) {
    alert('Journal must have at least 2 lines');
    return;
  }
  
  // Validate all lines have accounts and amounts
  const invalidLines = currentJournalLines.filter(line => 
    !line.account_code || (!line.debit_amount && !line.credit_amount)
  );
  
  if (invalidLines.length > 0) {
    alert('All journal lines must have an account selected and either a debit or credit amount');
    return;
  }
  
  const journalIdField = document.getElementById('journalId');
  const journalId = journalIdField && journalIdField.value && journalIdField.value !== 'undefined' ? journalIdField.value : null;
  
  const status = document.getElementById('journalStatus').value;
  
  const totalAmount = currentJournalLines.reduce((sum, line) => 
    sum + (parseFloat(line.debit_amount) || 0), 0
  );
  
  const journalData = {
    journal_date: document.getElementById('journalDate').value,
    reference: document.getElementById('journalReference').value,
    description: document.getElementById('journalDescription').value,
    status: status,
    total_amount: totalAmount,
    created_by: 'Current User'
  };
  
  console.log('Journal data to save:', journalData);
  
  try {
    let result;
    if (journalId) {
      // Update existing journal
      console.log('Updating existing journal with ID:', journalId);
      result = await supabase
        .from('journal_entries')
        .update(journalData)
        .eq('id', journalId)
        .select()
        .single();
    } else {
      // Insert new journal
      console.log('Inserting new journal entry');
      result = await supabase
        .from('journal_entries')
        .insert([journalData])
        .select()
        .single();
    }
    
    if (result.error) {
      throw new Error(`Journal save failed: ${result.error.message}`);
    }
    
    const savedJournal = result.data;
    console.log('Journal saved successfully:', savedJournal);
    
    // Save journal lines
    if (journalId) {
      // Delete existing lines first for updates
      await supabase
        .from('journal_lines')
        .delete()
        .eq('journal_entry_id', journalId);
    }
    
    const journalLinesData = currentJournalLines.map(line => ({
      journal_entry_id: savedJournal.id,
      account_code: line.account_code,
      account_name: line.account_name,
      description: line.description,
      debit_amount: parseFloat(line.debit_amount) || 0,
      credit_amount: parseFloat(line.credit_amount) || 0
    }));
    
    const linesResult = await supabase
      .from('journal_lines')
      .insert(journalLinesData);
    
    if (linesResult.error) {
      throw new Error(`Failed to save journal lines: ${linesResult.error.message}`);
    }
    
    // 🆕 POST TO GENERAL LEDGER IF STATUS IS "POSTED"
    if (status === 'Posted') {
      try {
        console.log('🔄 Posting journal to General Ledger...');
        
        // Convert journal lines to GL entries
        const glEntries = currentJournalLines.map(line => ({
          transaction_date: journalData.journal_date,
          account_code: line.account_code,
          account_name: line.account_name,
          description: line.description,
          reference: journalData.reference,
          debit_amount: parseFloat(line.debit_amount) || 0,
          credit_amount: parseFloat(line.credit_amount) || 0
        }));
        
        // Post to General Ledger
        const glResult = await postToGeneralLedger(glEntries, 'journal', savedJournal.id);
        
        if (glResult.success) {
          console.log('✅ Journal posted to General Ledger successfully');
          showNotification('Journal entry saved and posted to General Ledger! ✅', 'success');
        } else {
          throw new Error('GL posting returned failure');
        }
        
      } catch (glError) {
        console.error('❌ GL posting error:', glError);
        showNotification('Journal saved but failed to post to GL: ' + glError.message, 'warning');
      }
    } else {
      showNotification('Journal entry saved as draft!', 'success');
    }
    
    closeJournalModal();
    loadJournalEntries();
    
    // Refresh GL if user is viewing it
    if (document.getElementById('general-ledgerSection')?.style.display !== 'none') {
      loadGeneralLedgerData();
    }
    
  } catch (error) {
    console.error('Error saving journal entry:', error);
    alert('Error saving journal entry: ' + error.message);
  }
}



// Save and post journal
async function saveAndPostJournal() {
  // Set status to Posted before saving
  document.getElementById('journalStatus').value = 'Posted';
  
  // Trigger the save function
  const form = document.getElementById('journalForm');
  const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
  form.dispatchEvent(submitEvent);
}

// Apply journal filters
function applyJournalFilters() {
  const dateFrom = document.getElementById('filterJournalDateFrom').value;
  const dateTo = document.getElementById('filterJournalDateTo').value;
  const reference = document.getElementById('filterJournalReference').value.toLowerCase();
  const status = document.getElementById('filterJournalStatus').value;
  
  let filtered = [...journalEntries];
  
  if (dateFrom) {
    filtered = filtered.filter(j => j.journal_date >= dateFrom);
  }
  
  if (dateTo) {
    filtered = filtered.filter(j => j.journal_date <= dateTo);
  }
  
  if (reference) {
    filtered = filtered.filter(j => 
      j.reference.toLowerCase().includes(reference) ||
      j.description.toLowerCase().includes(reference)
    );
  }
  
  if (status) {
    filtered = filtered.filter(j => j.status === status);
  }
  
  renderJournalEntriesTable(filtered);
  
  const resultsEl = document.getElementById('journalFilterResults');
  if (resultsEl) {
    resultsEl.textContent = `Showing ${filtered.length} of ${journalEntries.length} entries`;
  }
}

// Clear journal filters
function clearJournalFilters() {
  document.getElementById('filterJournalDateFrom').value = '';
  document.getElementById('filterJournalDateTo').value = '';
  document.getElementById('filterJournalReference').value = '';
  document.getElementById('filterJournalStatus').value = '';
  
  renderJournalEntriesTable(journalEntries);
  
  const resultsEl = document.getElementById('journalFilterResults');
  if (resultsEl) {
    resultsEl.textContent = `Showing ${journalEntries.length} of ${journalEntries.length} entries`;
  }
}

// View journal entry
async function viewJournalEntry(id) {
  try {
    const { data: journal, error } = await supabase
      .from('journal_entries')
      .select(`
        *,
        journal_lines (*)
      `)
      .eq('id', id)
      .single();
    
    if (error) throw error;
    
    // Populate view modal
    document.getElementById('viewJournalReference').textContent = journal.reference;
    document.getElementById('viewJournalDate').textContent = new Date(journal.journal_date).toLocaleDateString();
    document.getElementById('viewJournalStatus').textContent = journal.status;
    document.getElementById('viewJournalDescription').textContent = journal.description;
    
    // Populate journal lines
    const linesContainer = document.getElementById('viewJournalLines');
    linesContainer.innerHTML = '';
    
    let totalDebits = 0;
    let totalCredits = 0;
    
    journal.journal_lines.forEach(line => {
      const row = document.createElement('tr');
      const debitAmount = parseFloat(line.debit_amount) || 0;
      const creditAmount = parseFloat(line.credit_amount) || 0;
      
      totalDebits += debitAmount;
      totalCredits += creditAmount;
      
      row.innerHTML = `
        <td>${line.account_code} - ${line.account_name}</td>
        <td>${line.description}</td>
        <td style="text-align: right;">${debitAmount > 0 ? `R${debitAmount.toFixed(2)}` : '-'}</td>
        <td style="text-align: right;">${creditAmount > 0 ? `R${creditAmount.toFixed(2)}` : '-'}</td>
      `;
      linesContainer.appendChild(row);
    });
    
    // Update totals
    document.getElementById('viewTotalDebits').textContent = `R${totalDebits.toFixed(2)}`;
    document.getElementById('viewTotalCredits').textContent = `R${totalCredits.toFixed(2)}`;
    
    // Show modal
    document.getElementById('viewJournalModal').style.display = 'block';
    
  } catch (error) {
    console.error('Error loading journal entry:', error);
    alert('Error loading journal entry details');
  }
}

// Close view journal modal
function closeViewJournalModal() {
  document.getElementById('viewJournalModal').style.display = 'none';
}

// Edit journal entry
async function editJournalEntry(id) {
  try {
    const { data: journal, error } = await supabase
      .from('journal_entries')
      .select(`
        *,
        journal_lines (*)
      `)
      .eq('id', id)
      .single();
    
    if (error) throw error;
    
    openJournalModal(journal);
    
  } catch (error) {
    console.error('Error loading journal entry for edit:', error);
    alert('Error loading journal entry details');
  }
}

// Delete journal entry
async function deleteJournalEntry(id) {
  if (!confirm('Are you sure you want to delete this journal entry? This action cannot be undone.')) return;
  
  try {
    // Delete journal lines first
    await supabase
      .from('journal_lines')
      .delete()
      .eq('journal_entry_id', id);
    
    // Delete journal entry
    const { error } = await supabase
      .from('journal_entries')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    
    showNotification('Journal entry deleted successfully!', 'success');
    loadJournalEntries();
    
  } catch (error) {
    console.error('Error deleting journal entry:', error);
    alert('Error deleting journal entry: ' + error.message);
  }
}

// Reverse journal entry
async function reverseJournalEntry(id) {
  if (!confirm('Are you sure you want to reverse this journal entry? This will create a reversing entry.')) return;
  
  try {
    const { data: originalJournal, error } = await supabase
      .from('journal_entries')
      .select(`
        *,
        journal_lines (*)
      `)
      .eq('id', id)
      .single();
    
    if (error) throw error;
    
    // Create reversing journal
    const reversingJournalData = {
      journal_date: new Date().toISOString().split('T')[0],
      reference: `REV-${originalJournal.reference}`,
      description: `Reversing entry for ${originalJournal.reference}: ${originalJournal.description}`,
      status: 'Posted',
      total_amount: originalJournal.total_amount,
      created_by: 'Current User'
    };
    
    const { data: reversingJournal, error: journalError } = await supabase
      .from('journal_entries')
      .insert([reversingJournalData])
      .select()
      .single();
    
    if (journalError) throw journalError;
    
    // Create reversing lines (swap debits and credits)
    const reversingLines = originalJournal.journal_lines.map(line => ({
      journal_entry_id: reversingJournal.id,
      account_code: line.account_code,
      account_name: line.account_name,
      description: `Reversing: ${line.description}`,
      debit_amount: parseFloat(line.credit_amount) || 0,
      credit_amount: parseFloat(line.debit_amount) || 0
    }));
    
    const { error: linesError } = await supabase
      .from('journal_lines')
      .insert(reversingLines);
    
    if (linesError) throw linesError;
    
    // Update original journal status
    await supabase
      .from('journal_entries')
      .update({ status: 'Reversed' })
      .eq('id', id);
    
    showNotification('Journal entry reversed successfully!', 'success');
    loadJournalEntries();
    
  } catch (error) {
    console.error('Error reversing journal entry:', error);
    alert('Error reversing journal entry: ' + error.message);
  }
}

// Enhanced Export functions with detailed journal lines
async function exportJournalsExcel() {
  if (typeof XLSX === 'undefined') {
    alert('Excel library not loaded. Please refresh the page and try again.');
    return;
  }
  
  try {
    // Get detailed journal data with lines
    const { data: journals, error } = await supabase
      .from('journal_entries')
      .select(`
        *,
        journal_lines (*)
      `)
      .order('journal_date', { ascending: false });
    
    if (error) throw error;
    
    if (!journals || journals.length === 0) {
      alert('No journal entries to export');
      return;
    }
    
    // Create workbook with multiple sheets
    const wb = XLSX.utils.book_new();
    
    // Sheet 1: Journal Summary
    const summaryData = journals.map(journal => ({
      'Date': new Date(journal.journal_date).toLocaleDateString(),
      'Reference': journal.reference,
      'Description': journal.description,
      'Total Amount': journal.total_amount,
      'Status': journal.status,
      'Created By': journal.created_by || 'System'
    }));
    
    const summaryWs = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, summaryWs, 'Journal Summary');
    
    // Sheet 2: Detailed Journal Lines
    const detailedData = [];
    journals.forEach(journal => {
      journal.journal_lines.forEach(line => {
        detailedData.push({
          'Journal Date': new Date(journal.journal_date).toLocaleDateString(),
          'Journal Reference': journal.reference,
          'Journal Description': journal.description,
          'Account Code': line.account_code,
          'Account Name': line.account_name,
          'Line Description': line.description,
          'Debit Amount': line.debit_amount || 0,
          'Credit Amount': line.credit_amount || 0,
          'Status': journal.status
        });
      });
    });
    
    const detailedWs = XLSX.utils.json_to_sheet(detailedData);
    XLSX.utils.book_append_sheet(wb, detailedWs, 'Journal Lines Detail');
    
    // Sheet 3: Trial Balance Format
    const trialBalanceData = [];
    const accountTotals = {};
    
    // Calculate account totals
    journals.forEach(journal => {
      if (journal.status === 'Posted') { // Only posted journals
        journal.journal_lines.forEach(line => {
          const accountKey = `${line.account_code} - ${line.account_name}`;
          if (!accountTotals[accountKey]) {
            accountTotals[accountKey] = {
              account_code: line.account_code,
              account_name: line.account_name,
              total_debits: 0,
              total_credits: 0
            };
          }
          accountTotals[accountKey].total_debits += parseFloat(line.debit_amount) || 0;
          accountTotals[accountKey].total_credits += parseFloat(line.credit_amount) || 0;
        });
      }
    });
    
    // Convert to array for trial balance
    Object.values(accountTotals).forEach(account => {
      const balance = account.total_debits - account.total_credits;
      trialBalanceData.push({
        'Account Code': account.account_code,
        'Account Name': account.account_name,
        'Total Debits': account.total_debits.toFixed(2),
        'Total Credits': account.total_credits.toFixed(2),
        'Net Balance': balance.toFixed(2),
        'Balance Type': balance >= 0 ? 'Debit' : 'Credit'
      });
    });
    
    const trialBalanceWs = XLSX.utils.json_to_sheet(trialBalanceData);
    XLSX.utils.book_append_sheet(wb, trialBalanceWs, 'Trial Balance');
    
    // Set column widths for better formatting
    [summaryWs, detailedWs, trialBalanceWs].forEach(ws => {
      const colWidths = Array(10).fill({ wch: 15 }); // Default width
      ws['!cols'] = colWidths;
    });
    
    // Generate filename
    const timestamp = new Date().toISOString().split('T')[0];
    const fileName = `ZandeBooks_Journals_Detailed_${timestamp}.xlsx`;
    
    // Save file
    XLSX.writeFile(wb, fileName);
    
    showNotification('Detailed journal entries exported to Excel successfully!', 'success');
    
  } catch (error) {
    console.error('Error exporting journals to Excel:', error);
    alert('Error exporting to Excel: ' + error.message);
  }
}

async function exportJournalsPdf() {
  if (typeof window.jspdf === 'undefined') {
    alert('PDF library not loaded. Please refresh the page and try again.');
    return;
  }
  
  try {
    // Get detailed journal data with lines
    const { data: journals, error } = await supabase
      .from('journal_entries')
      .select(`
        *,
        journal_lines (*)
      `)
      .order('journal_date', { ascending: false });
    
    if (error) throw error;
    
    if (!journals || journals.length === 0) {
      alert('No journal entries to export');
      return;
    }
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('landscape'); // Use landscape for better table fit
    
    // Header
    doc.setFontSize(18);
    doc.setTextColor(61, 190, 125);
    doc.text('ZandeBooks - Detailed Journal Entries', 14, 22);
    
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 32);
    doc.text(`Total Entries: ${journals.length}`, 14, 38);
    
    let yPosition = 50;
    
    // Process each journal entry
    journals.forEach((journal, journalIndex) => {
      // Check if we need a new page
      if (yPosition > 180) {
        doc.addPage();
        yPosition = 20;
      }
      
      // Journal header
      doc.setFontSize(14);
      doc.setTextColor(61, 190, 125);
      doc.text(`Journal Entry: ${journal.reference}`, 14, yPosition);
      yPosition += 8;
      
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.text(`Date: ${new Date(journal.journal_date).toLocaleDateString()}`, 14, yPosition);
      doc.text(`Status: ${journal.status}`, 100, yPosition);
      doc.text(`Total: R${parseFloat(journal.total_amount).toFixed(2)}`, 180, yPosition);
      yPosition += 6;
      
      doc.text(`Description: ${journal.description}`, 14, yPosition);
      yPosition += 10;
      
      // Journal lines table
      const tableData = journal.journal_lines.map(line => [
        line.account_code,
        line.account_name.substring(0, 25), // Truncate long names
        line.description.substring(0, 30), // Truncate long descriptions
        line.debit_amount > 0 ? `R${parseFloat(line.debit_amount).toFixed(2)}` : '-',
        line.credit_amount > 0 ? `R${parseFloat(line.credit_amount).toFixed(2)}` : '-'
      ]);
      
      // Calculate totals for this journal
      const totalDebits = journal.journal_lines.reduce((sum, line) => sum + (parseFloat(line.debit_amount) || 0), 0);
      const totalCredits = journal.journal_lines.reduce((sum, line) => sum + (parseFloat(line.credit_amount) || 0), 0);
      
      // Add totals row
      tableData.push([
        '', 'TOTALS:', '', 
        `R${totalDebits.toFixed(2)}`, 
        `R${totalCredits.toFixed(2)}`
      ]);
      
      doc.autoTable({
        head: [['Account Code', 'Account Name', 'Description', 'Debit', 'Credit']],
        body: tableData,
        startY: yPosition,
        styles: { 
          fontSize: 8,
          cellPadding: 2
        },
        headStyles: { 
          fillColor: [61, 190, 125],
          textColor: [255, 255, 255],
          fontStyle: 'bold'
        },
        columnStyles: {
          0: { cellWidth: 25 }, // Account Code
          1: { cellWidth: 60 }, // Account Name
          2: { cellWidth: 70 }, // Description
          3: { cellWidth: 30, halign: 'right' }, // Debit
          4: { cellWidth: 30, halign: 'right' }  // Credit
        },
        didParseCell: function(data) {
          // Style the totals row
          if (data.row.index === tableData.length - 1) {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [240, 240, 240];
          }
        }
      });
      
      yPosition = doc.lastAutoTable.finalY + 15;
      
      // Add a separator line between journal entries
      if (journalIndex < journals.length - 1) {
        doc.setDrawColor(200, 200, 200);
        doc.line(14, yPosition - 5, 280, yPosition - 5);
      }
    });
    
    // Add page numbers
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(10);
      doc.setTextColor(107, 114, 128);
      doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.width - 30, doc.internal.pageSize.height - 10);
    }
    
    // Generate filename
    const timestamp = new Date().toISOString().split('T')[0];
    const fileName = `ZandeBooks_Journals_Detailed_${timestamp}.pdf`;
    
    // Save file
    doc.save(fileName);
    
    showNotification('Detailed journal entries exported to PDF successfully!', 'success');
    
  } catch (error) {
    console.error('Error exporting journals to PDF:', error);
    alert('Error exporting to PDF: ' + error.message);
  }
}

// NEW: Export specific journal entry with full details
async function exportSingleJournalPdf(journalId) {
  if (typeof window.jspdf === 'undefined') {
    alert('PDF library not loaded. Please refresh the page and try again.');
    return;
  }
  
  try {
    const { data: journal, error } = await supabase
      .from('journal_entries')
      .select(`
        *,
        journal_lines (*)
      `)
      .eq('id', journalId)
      .single();
    
    if (error) throw error;
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Header with company info
    doc.setFontSize(20);
    doc.setTextColor(61, 190, 125);
    doc.text('ZandeBooks', 14, 22);
    
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text('JOURNAL VOUCHER', 14, 35);
    
    // Journal details box
    doc.setDrawColor(0, 0, 0);
    doc.rect(14, 45, 180, 30);
    
    doc.setFontSize(12);
    doc.text(`Reference: ${journal.reference}`, 20, 55);
    doc.text(`Date: ${new Date(journal.journal_date).toLocaleDateString()}`, 120, 55);
    doc.text(`Status: ${journal.status}`, 20, 65);
    doc.text(`Total Amount: R${parseFloat(journal.total_amount).toFixed(2)}`, 120, 65);
    
    // Description
    doc.setFontSize(10);
    doc.text('Description:', 20, 85);
    doc.text(journal.description, 20, 92);
    
    // Journal lines table
    const tableData = journal.journal_lines.map(line => [
      line.account_code,
      line.account_name,
      line.description,
      line.debit_amount > 0 ? parseFloat(line.debit_amount).toFixed(2) : '',
      line.credit_amount > 0 ? parseFloat(line.credit_amount).toFixed(2) : ''
    ]);
    
    // Calculate totals
    const totalDebits = journal.journal_lines.reduce((sum, line) => sum + (parseFloat(line.debit_amount) || 0), 0);
    const totalCredits = journal.journal_lines.reduce((sum, line) => sum + (parseFloat(line.credit_amount) || 0), 0);
    
    // Add totals row
    tableData.push(['', '', 'TOTALS:', totalDebits.toFixed(2), totalCredits.toFixed(2)]);
    
    doc.autoTable({
      head: [['Account Code', 'Account Name', 'Description', 'Debit (R)', 'Credit (R)']],
      body: tableData,
      startY: 100,
      styles: { 
        fontSize: 9,
        cellPadding: 3
      },
      headStyles: { 
        fillColor: [61, 190, 125],
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 60 },
        2: { cellWidth: 60 },
        3: { cellWidth: 25, halign: 'right' },
        4: { cellWidth: 25, halign: 'right' }
      },
      didParseCell: function(data) {
        if (data.row.index === tableData.length - 1) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [240, 240, 240];
        }
      }
    });
    
    // Signature section
    const finalY = doc.lastAutoTable.finalY + 20;
    doc.setFontSize(10);
    doc.text('Prepared by: ________________________', 14, finalY);
    doc.text('Date: ________________', 14, finalY + 15);
    doc.text('Approved by: ________________________', 120, finalY);
    doc.text('Date: ________________', 120, finalY + 15);
    
    // Save
    doc.save(`Journal_${journal.reference}_${new Date().toISOString().split('T')[0]}.pdf`);
    
    showNotification('Journal voucher exported successfully!', 'success');
    
  } catch (error) {
    console.error('Error exporting single journal:', error);
    alert('Error exporting journal: ' + error.message);
  }
}

// Print journal
function printJournal() {
  window.print();
}

// Make functions global
window.openJournalModal = openJournalModal;
window.closeJournalModal = closeJournalModal;
window.closeViewJournalModal = closeViewJournalModal;
window.addJournalLine = addJournalLine;
window.removeJournalLine = removeJournalLine;
window.selectAccount = selectAccount;
window.updateJournalLine = updateJournalLine;
window.saveAndPostJournal = saveAndPostJournal;
window.viewJournalEntry = viewJournalEntry;
window.editJournalEntry = editJournalEntry;
window.deleteJournalEntry = deleteJournalEntry;
window.reverseJournalEntry = reverseJournalEntry;
window.printJournal = printJournal;

// Add these functions at the end of your app.js file

// ========================================
// GENERAL LEDGER & CHART OF ACCOUNTS
// ========================================

// Global variables
let generalLedgerEntries = [];
let chartOfAccountsData = [];

// Initialize General Ledger module
async function initializeGeneralLedger() {
  console.log('🚀 Initializing General Ledger...');
  showNotification('Loading General Ledger...', 'info');
  
  try {
    await loadGeneralLedgerData();
    updateGLSummaryCards();
    setupGLEventListeners();
    console.log('✅ General Ledger initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing General Ledger:', error);
    showNotification('Error loading General Ledger', 'error');
  }
}

// Initialize Chart of Accounts module
async function initializeChartOfAccounts() {
  console.log('🚀 Initializing Chart of Accounts...');
  showNotification('Loading Chart of Accounts...', 'info');
  
  try {
    await loadChartOfAccountsData();
    updateCOASummaryCards();
    setupCOAEventListeners();
    console.log('✅ Chart of Accounts initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing Chart of Accounts:', error);
    showNotification('Error loading Chart of Accounts', 'error');
  }
}

// ========================================
// GENERAL LEDGER FUNCTIONS
// ========================================

// Load General Ledger data from Supabase
async function loadGeneralLedgerData() {
  try {
    console.log('📊 Loading General Ledger entries...');
    
    const { data: glData, error } = await supabase
      .from('general_ledger')
      .select('*')
      .order('transaction_date', { ascending: false })
      .limit(1000);
    
    if (error) {
      console.log('ℹ️ No GL table or data found, showing sample data');
      renderSampleGLData();
      // 🆕 Still load accounts even if no GL data
      await loadAccountsForGLFilters();
      return;
    }
    
    generalLedgerEntries = glData || [];
    filteredGLEntries = [...generalLedgerEntries]; // Initialize filtered data
    console.log(`📈 Loaded ${generalLedgerEntries.length} GL entries`);
    
    if (generalLedgerEntries.length === 0) {
      renderSampleGLData();
    } else {
      renderGeneralLedgerTable(filteredGLEntries);
    }
    
    // 🆕 ALWAYS load accounts for filtering (whether GL has data or not)
    await loadAccountsForGLFilters();
    
  } catch (error) {
    console.error('Error loading GL data:', error);
    renderSampleGLData();
    // 🆕 Still load accounts even on error
    await loadAccountsForGLFilters();
  }
}


// Render sample GL data when no real data exists
function renderSampleGLData() {
  const tbody = document.querySelector('#generalLedgerTable tbody');
  if (!tbody) return;
  
  // Show message that GL is ready for transactions
  tbody.innerHTML = `
    <tr>
      <td colspan="9" style="text-align: center; padding: 60px;">
        <div style="color: #666;">
          <div style="font-size: 48px; margin-bottom: 20px;">📈</div>
          <h3 style="color: #059669; margin-bottom: 10px;">General Ledger is Ready!</h3>
          <p style="margin-bottom: 20px;">Your General Ledger will automatically populate when you:</p>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; max-width: 800px; margin: 0 auto;">
            <div style="background: #f0fdf4; padding: 15px; border-radius: 8px;">
              <div style="font-size: 24px; margin-bottom: 5px;">💰</div>
              <strong>Post Journal Entries</strong>
              <small style="display: block; color: #666;">Manual journal entries</small>
            </div>
            <div style="background: #eff6ff; padding: 15px; border-radius: 8px;">
              <div style="font-size: 24px; margin-bottom: 5px;">🧾</div>
              <strong>Create Sales Invoices</strong>
              <small style="display: block; color: #666;">Customer transactions</small>
            </div>
            <div style="background: #fef3c7; padding: 15px; border-radius: 8px;">
              <div style="font-size: 24px; margin-bottom: 5px;">📋</div>
              <strong>Record Purchases</strong>
              <small style="display: block; color: #666;">Supplier transactions</small>
            </div>
            <div style="background: #f3e8ff; padding: 15px; border-radius: 8px;">
              <div style="font-size: 24px; margin-bottom: 5px;">🏦</div>
              <strong>Banking Transactions</strong>
              <small style="display: block; color: #666;">Bank deposits/withdrawals</small>
            </div>
          </div>
          <p style="margin-top: 20px; font-style: italic;">Start with the Journals module to create your first GL entries!</p>
        </div>
      </td>
    </tr>
  `;
}

// Render General Ledger table with real data
function renderGeneralLedgerTable(entries) {
  const tbody = document.querySelector('#generalLedgerTable tbody');
  if (!tbody) return;
  
  tbody.innerHTML = '';
  
  if (!entries || entries.length === 0) {
    renderSampleGLData();
    return;
  }
  
  entries.forEach(entry => {
    const row = document.createElement('tr');
    const debitAmount = parseFloat(entry.debit_amount) || 0;
    const creditAmount = parseFloat(entry.credit_amount) || 0;
    
    row.innerHTML = `
      <td>${new Date(entry.transaction_date).toLocaleDateString()}</td>
      <td>
        <strong style="color: #059669;">${entry.account_code}</strong><br>
        <small style="color: #666;">${entry.account_name || 'Unknown Account'}</small>
      </td>
      <td>${entry.description || '-'}</td>
      <td>${entry.reference || '-'}</td>
      <td style="text-align: right; color: ${debitAmount > 0 ? '#dc2626' : '#ccc'};">
        ${debitAmount > 0 ? `R${debitAmount.toFixed(2)}` : '-'}
      </td>
      <td style="text-align: right; color: ${creditAmount > 0 ? '#059669' : '#ccc'};">
        ${creditAmount > 0 ? `R${creditAmount.toFixed(2)}` : '-'}
      </td>
      <td style="text-align: right; font-weight: bold;">
        R${(debitAmount - creditAmount).toFixed(2)}
      </td>
      <td>
        <span style="padding: 4px 8px; border-radius: 12px; font-size: 0.8em; background: #f1f5f9; color: #475569;">
          ${entry.source_module || 'Manual'}
        </span>
      </td>
      <td>
        <button onclick="drillDownTransaction('${entry.id}')" class="zande-btn" style="padding: 4px 8px; font-size: 0.8em;">
          View
        </button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

// Update GL summary cards
function updateGLSummaryCards() {
  const totalEntries = generalLedgerEntries.length;
  let totalDebits = 0;
  let totalCredits = 0;
  const activeAccounts = new Set();
  
  generalLedgerEntries.forEach(entry => {
    totalDebits += parseFloat(entry.debit_amount) || 0;
    totalCredits += parseFloat(entry.credit_amount) || 0;
    activeAccounts.add(entry.account_code);
  });
  
  // Update the UI
  const totalEntriesEl = document.getElementById('totalGLEntries');
  const totalDebitsEl = document.getElementById('totalGLDebits');
  const totalCreditsEl = document.getElementById('totalGLCredits');
  const activeAccountsEl = document.getElementById('activeAccounts');
  
  if (totalEntriesEl) totalEntriesEl.textContent = totalEntries.toLocaleString();
  if (totalDebitsEl) totalDebitsEl.textContent = `R${totalDebits.toLocaleString('en-ZA', {minimumFractionDigits: 2})}`;
  if (totalCreditsEl) totalCreditsEl.textContent = `R${totalCredits.toLocaleString('en-ZA', {minimumFractionDigits: 2})}`;
  if (activeAccountsEl) activeAccountsEl.textContent = activeAccounts.size;
}

// Setup GL event listeners
function setupGLEventListeners() {
  // Refresh button
  const refreshBtn = document.getElementById('refreshGLBtn');
  if (refreshBtn) {
    refreshBtn.onclick = () => {
      showNotification('Refreshing General Ledger...', 'info');
      loadGeneralLedgerData();
    };
  }
  
  // 🆕 Export buttons with proper error handling
  const exportExcelBtn = document.getElementById('exportGLExcel');
  if (exportExcelBtn) {
    exportExcelBtn.onclick = exportGLToExcel;
    console.log('✅ Excel export button wired up');
  } else {
    console.warn('⚠️ Excel export button not found');
  }

  const exportPdfBtn = document.getElementById('exportGLPdf');
  if (exportPdfBtn) {
    exportPdfBtn.onclick = exportGLToPDF;
    console.log('✅ PDF export button wired up');
  } else {
    console.warn('⚠️ PDF export button not found');
  }

  // Filter buttons
  const applyFiltersBtn = document.querySelector('.gl-filter-actions button');
  if (applyFiltersBtn) {
    applyFiltersBtn.onclick = applyGLFilters;
  }

  const clearFiltersBtn = document.querySelector('.gl-filter-actions button.secondary');
  if (clearFiltersBtn) {
    clearFiltersBtn.onclick = clearGLFilters;
  }
  
  // Enhanced filter event listeners
  const filterIds = [
    'glAccountFilter',
    'glAccountTypeFilter',
    'glDateFromFilter', 
    'glDateToFilter',
    'glSourceFilter'
  ];
  
  // Add change event listeners to all select/date filters
  filterIds.forEach(id => {
    const element = document.getElementById(id);
    if (element) {
      element.addEventListener('change', applyGLFilters);
    }
  });
  
  // Add input event listener to search field for real-time search
  const searchFilter = document.getElementById('glSearchFilter');
  if (searchFilter) {
    searchFilter.addEventListener('input', debounce(applyGLFilters, 300));
  }
}

// Debounce function for search input
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}



// ========================================
// CHART OF ACCOUNTS FUNCTIONS
// ========================================

// Load Chart of Accounts data
async function loadChartOfAccountsData() {
  try {
    console.log('🗂️ Loading Chart of Accounts...');
    
    const { data: coaData, error } = await supabase
      .from('chart_of_accounts')
      .select('*')
      .order('account_code');
    
    if (error) {
      console.log('ℹ️ No COA table found, using default IFRS accounts');
      chartOfAccountsData = getDefaultIFRSAccounts();
    } else {
      chartOfAccountsData = coaData || getDefaultIFRSAccounts();
    }
    
    filteredCOAData = [...chartOfAccountsData]; // Initialize filtered data
    console.log(`📊 Loaded ${chartOfAccountsData.length} accounts`);
    renderChartOfAccountsTable(filteredCOAData);
    
  } catch (error) {
    console.error('Error loading COA data:', error);
    chartOfAccountsData = getDefaultIFRSAccounts();
    filteredCOAData = [...chartOfAccountsData];
    renderChartOfAccountsTable(filteredCOAData);
  }
}

// Get default IFRS for SMEs accounts
function getDefaultIFRSAccounts() {
  return [
    // ASSETS
    { account_code: '1100', account_name: 'Cash and Cash Equivalents', account_type: 'Asset', account_category: 'Current Assets', normal_balance: 'Debit', is_active: true },
    { account_code: '1110', account_name: 'Petty Cash', account_type: 'Asset', account_category: 'Current Assets', normal_balance: 'Debit', is_active: true },
    { account_code: '1120', account_name: 'Bank Account - Current', account_type: 'Asset', account_category: 'Current Assets', normal_balance: 'Debit', is_active: true },
    { account_code: '1130', account_name: 'Bank Account - Savings', account_type: 'Asset', account_category: 'Current Assets', normal_balance: 'Debit', is_active: true },
    { account_code: '1200', account_name: 'Accounts Receivable', account_type: 'Asset', account_category: 'Current Assets', normal_balance: 'Debit', is_active: true },
    { account_code: '1210', account_name: 'Allowance for Doubtful Debts', account_type: 'Asset', account_category: 'Current Assets', normal_balance: 'Credit', is_active: true },
    { account_code: '1300', account_name: 'Inventory', account_type: 'Asset', account_category: 'Current Assets', normal_balance: 'Debit', is_active: true },
    { account_code: '1400', account_name: 'Prepaid Expenses', account_type: 'Asset', account_category: 'Current Assets', normal_balance: 'Debit', is_active: true },
    { account_code: '1450', account_name: 'VAT Input', account_type: 'Asset', account_category: 'Current Assets', normal_balance: 'Debit', is_active: true },
    { account_code: '1500', account_name: 'Property, Plant & Equipment', account_type: 'Asset', account_category: 'Fixed Assets', normal_balance: 'Debit', is_active: true },
    { account_code: '1600', account_name: 'Accumulated Depreciation', account_type: 'Asset', account_category: 'Fixed Assets', normal_balance: 'Credit', is_active: true },
    
    // LIABILITIES
    { account_code: '2100', account_name: 'Accounts Payable', account_type: 'Liability', account_category: 'Current Liabilities', normal_balance: 'Credit', is_active: true },
    { account_code: '2150', account_name: 'VAT Output', account_type: 'Liability', account_category: 'Current Liabilities', normal_balance: 'Credit', is_active: true },
    { account_code: '2200', account_name: 'Accrued Expenses', account_type: 'Liability', account_category: 'Current Liabilities', normal_balance: 'Credit', is_active: true },
    { account_code: '2300', account_name: 'Short-term Loans', account_type: 'Liability', account_category: 'Current Liabilities', normal_balance: 'Credit', is_active: true },
    { account_code: '2400', account_name: 'Long-term Debt', account_type: 'Liability', account_category: 'Long-term Liabilities', normal_balance: 'Credit', is_active: true },
    { account_code: '2500', account_name: 'PAYE Payable', account_type: 'Liability', account_category: 'Current Liabilities', normal_balance: 'Credit', is_active: true },
    { account_code: '2510', account_name: 'UIF Payable', account_type: 'Liability', account_category: 'Current Liabilities', normal_balance: 'Credit', is_active: true },
    { account_code: '2520', account_name: 'SDL Payable', account_type: 'Liability', account_category: 'Current Liabilities', normal_balance: 'Credit', is_active: true },
    
    // EQUITY
    { account_code: '3100', account_name: 'Share Capital', account_type: 'Equity', account_category: 'Equity', normal_balance: 'Credit', is_active: true },
    { account_code: '3200', account_name: 'Retained Earnings', account_type: 'Equity', account_category: 'Equity', normal_balance: 'Credit', is_active: true },
    { account_code: '3300', account_name: 'Current Year Earnings', account_type: 'Equity', account_category: 'Equity', normal_balance: 'Credit', is_active: true },
    
    // REVENUE
    { account_code: '4100', account_name: 'Sales Revenue', account_type: 'Revenue', account_category: 'Operating Revenue', normal_balance: 'Credit', is_active: true },
    { account_code: '4200', account_name: 'Service Revenue', account_type: 'Revenue', account_category: 'Operating Revenue', normal_balance: 'Credit', is_active: true },
    { account_code: '4300', account_name: 'Other Income', account_type: 'Revenue', account_category: 'Other Revenue', normal_balance: 'Credit', is_active: true },
    { account_code: '4400', account_name: 'Interest Income', account_type: 'Revenue', account_category: 'Other Revenue', normal_balance: 'Credit', is_active: true },
    
    // EXPENSES
    { account_code: '5100', account_name: 'Cost of Goods Sold', account_type: 'Expense', account_category: 'Cost of Sales', normal_balance: 'Debit', is_active: true },
    { account_code: '5200', account_name: 'Salaries and Wages', account_type: 'Expense', account_category: 'Operating Expenses', normal_balance: 'Debit', is_active: true },
    { account_code: '5300', account_name: 'Rent Expense', account_type: 'Expense', account_category: 'Operating Expenses', normal_balance: 'Debit', is_active: true },
    { account_code: '5400', account_name: 'Utilities', account_type: 'Expense', account_category: 'Operating Expenses', normal_balance: 'Debit', is_active: true },
    { account_code: '5500', account_name: 'Depreciation Expense', account_type: 'Expense', account_category: 'Operating Expenses', normal_balance: 'Debit', is_active: true },
    { account_code: '5700', account_name: 'Interest Expense', account_type: 'Expense', account_category: 'Financial Expenses', normal_balance: 'Debit', is_active: true },
    { account_code: '5800', account_name: 'Office Expenses', account_type: 'Expense', account_category: 'Operating Expenses', normal_balance: 'Debit', is_active: true },
    { account_code: '6100', account_name: 'Bank Charges', account_type: 'Expense', account_category: 'Financial Expenses', normal_balance: 'Debit', is_active: true },
    { account_code: '6200', account_name: 'Insurance', account_type: 'Expense', account_category: 'Operating Expenses', normal_balance: 'Debit', is_active: true }
  ];
}

// Render Chart of Accounts table
function renderChartOfAccountsTable(accounts) {
  const tbody = document.querySelector('#chartOfAccountsTable tbody');
  if (!tbody) return;
  
  tbody.innerHTML = '';
  
  if (!accounts || accounts.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 40px;">
          <div style="color: #666;">No accounts found</div>
        </td>
      </tr>
    `;
    return;
  }
  
  accounts.forEach(account => {
    const row = document.createElement('tr');
    const isActive = account.is_active !== false;
    const accountType = account.account_type;
    const normalBalance = account.normal_balance;
    
    // Get type badge color
    const typeColors = {
      'Asset': 'background: #dcfce7; color: #166534;',
      'Liability': 'background: #fef2f2; color: #dc2626;',
      'Equity': 'background: #f0f9ff; color: #0369a1;',
      'Revenue': 'background: #f0fdf4; color: #15803d;',
      'Expense': 'background: #fefce8; color: #ca8a04;'
    };
    
    row.innerHTML = `
      <td><strong style="color: #059669; font-size: 1.1em;">${account.account_code}</strong></td>
      <td>
        <strong>${account.account_name}</strong>
        ${account.account_category ? `<br><small style="color: #666;">${account.account_category}</small>` : ''}
      </td>
      <td>
        <span style="padding: 4px 12px; border-radius: 16px; font-size: 0.85em; font-weight: 600; ${typeColors[accountType] || 'background: #f1f5f9; color: #475569;'}">
          ${accountType}
        </span>
      </td>
      <td>${account.account_category || '-'}</td>
      <td>
        <span style="padding: 2px 8px; border-radius: 8px; font-size: 0.8em; font-weight: 500; ${normalBalance === 'Debit' ? 'background: #fee2e2; color: #dc2626;' : 'background: #d1fae5; color: #059669;'}">
          ${normalBalance}
        </span>
      </td>
      <td>
        <span style="color: ${isActive ? '#059669' : '#6b7280'}; font-weight: 600;">
          ${isActive ? '✅ Active' : '❌ Inactive'}
        </span>
      </td>
      <td>
        <div class="action-buttons">
          <button onclick="viewAccount('${account.account_code}')" class="modern-btn view-btn" title="View">
            👁️
          </button>
          <button onclick="editAccount('${account.account_code}')" class="modern-btn edit-btn" title="Edit">
            ✏️
          </button>
          <button onclick="toggleAccountStatus('${account.account_code}', ${isActive})" class="modern-btn status-btn" title="Toggle Status">
            ${isActive ? '🔒' : '🔓'}
          </button>
          <button onclick="deleteAccount('${account.account_code}')" class="modern-btn delete-btn" title="Delete">
            🗑️
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(row);
  });
}


// Update COA summary cards
function updateCOASummaryCards() {
  const assetCount = chartOfAccountsData.filter(a => a.account_type === 'Asset').length;
  const liabilityCount = chartOfAccountsData.filter(a => a.account_type === 'Liability').length;
  const revenueCount = chartOfAccountsData.filter(a => a.account_type === 'Revenue').length;
  const expenseCount = chartOfAccountsData.filter(a => a.account_type === 'Expense').length;
  
  const totalAssetsEl = document.getElementById('totalAssets');
  const totalLiabilitiesEl = document.getElementById('totalLiabilities');
  const totalRevenueEl = document.getElementById('totalRevenue');
  const totalExpenseEl = document.getElementById('totalExpense');
  
  if (totalAssetsEl) totalAssetsEl.textContent = assetCount;
  if (totalLiabilitiesEl) totalLiabilitiesEl.textContent = liabilityCount;
  if (totalRevenueEl) totalRevenueEl.textContent = revenueCount;
  if (totalExpenseEl) totalExpenseEl.textContent = expenseCount;
}

// Setup COA event listeners
function setupCOAEventListeners() {
  // Add account button
  const addAccountBtn = document.getElementById('addAccountBtn');
  if (addAccountBtn) {
    addAccountBtn.onclick = () => {
      console.log('Add account clicked');
      showNotification('Add Account feature coming soon!', 'info');
    };
  }
  
  // Export buttons
  const exportExcelBtn = document.getElementById('exportCOAExcel');
  if (exportExcelBtn) {
    exportExcelBtn.onclick = exportCOAToExcel;
  }

  const exportPdfBtn = document.getElementById('exportCOAPdf');
  if (exportPdfBtn) {
    exportPdfBtn.onclick = exportCOAToPDF;
  }

  // Filter buttons (you'll need to add these to your HTML)
  const applyFiltersBtn = document.querySelector('.coa-filter-actions button');
  if (applyFiltersBtn) {
    applyFiltersBtn.onclick = applyCOAFilters;
  }

  const clearFiltersBtn = document.querySelector('.coa-filter-actions button.secondary');
  if (clearFiltersBtn) {
    clearFiltersBtn.onclick = clearCOAFilters;
  }
}
// ========================================
// UTILITY FUNCTIONS
// ========================================

// Export GL to Excel
function exportGLToExcel() {
  try {
    if (typeof XLSX === 'undefined') {
      showNotification('Excel library not loaded', 'error');
      return;
    }
    
    if (!generalLedgerEntries || generalLedgerEntries.length === 0) {
      showNotification('No data to export', 'warning');
      return;
    }
    
    const excelData = generalLedgerEntries.map(entry => ({
      'Date': new Date(entry.transaction_date).toLocaleDateString(),
      'Account Code': entry.account_code,
      'Account Name': entry.account_name,
      'Description': entry.description,
      'Reference': entry.reference,
      'Debit': entry.debit_amount || 0,
      'Credit': entry.credit_amount || 0,
      'Source': entry.source_module
    }));
    
    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'General Ledger');
    
    const fileName = `GeneralLedger_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
    
    showNotification('General Ledger exported successfully!', 'success');
  } catch (error) {
    console.error('Export error:', error);
    showNotification('Error exporting to Excel', 'error');
  }
}

// Export COA to Excel
function exportCOAToExcel() {
  try {
    if (typeof XLSX === 'undefined') {
      showNotification('Excel library not loaded', 'error');
      return;
    }
    
    const excelData = chartOfAccountsData.map(account => ({
      'Account Code': account.account_code,
      'Account Name': account.account_name,
      'Type': account.account_type,
      'Category': account.account_category,
      'Normal Balance': account.normal_balance,
      'Status': account.is_active ? 'Active' : 'Inactive'
    }));
    
    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Chart of Accounts');
    
    const fileName = `ChartOfAccounts_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
    
    showNotification('Chart of Accounts exported successfully!', 'success');
  } catch (error) {
    console.error('Export error:', error);
    showNotification('Error exporting to Excel', 'error');
  }
}

// Export General Ledger to PDF
function exportGLToPDF() {
  try {
    // Check if jsPDF is available
    if (typeof window.jspdf === 'undefined') {
      alert('PDF library not loaded. Please refresh the page and try again.');
      return;
    }

    // Use filtered entries if filters are applied, otherwise use all entries
    const entriesToExport = filteredGLEntries && filteredGLEntries.length > 0 ? 
                           filteredGLEntries : generalLedgerEntries;

    if (!entriesToExport || entriesToExport.length === 0) {
      alert('No General Ledger entries to export');
      return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('landscape'); // Use landscape for better table fit

    // Header with company branding
    doc.setFontSize(20);
    doc.setTextColor(61, 190, 125); // Zande green
    doc.text('ZandeBooks', 14, 22);
    
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text('General Ledger Report', 14, 32);
    
    // Report details
    doc.setFontSize(12);
    doc.setTextColor(102, 102, 102);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 42);
    doc.text(`Period: ${getFilterPeriodText()}`, 14, 48);
    doc.text(`Total Entries: ${entriesToExport.length}`, 200, 42);

    // Calculate totals
    const totalDebits = entriesToExport.reduce((sum, entry) => 
      sum + (parseFloat(entry.debit_amount) || 0), 0);
    const totalCredits = entriesToExport.reduce((sum, entry) => 
      sum + (parseFloat(entry.credit_amount) || 0), 0);
    
    doc.text(`Total Debits: R${totalDebits.toFixed(2)}`, 200, 48);

    // Prepare table data
    const tableData = entriesToExport.map(entry => {
      const debitAmount = parseFloat(entry.debit_amount) || 0;
      const creditAmount = parseFloat(entry.credit_amount) || 0;
      
      return [
        new Date(entry.transaction_date).toLocaleDateString(),
        entry.account_code || '',
        (entry.account_name || 'Unknown Account').substring(0, 20), // Truncate long names
        (entry.description || '-').substring(0, 25), // Truncate long descriptions
        entry.reference || '-',
        debitAmount > 0 ? `R${debitAmount.toFixed(2)}` : '-',
        creditAmount > 0 ? `R${creditAmount.toFixed(2)}` : '-',
        (debitAmount - creditAmount).toFixed(2),
        entry.source_module || 'Manual'
      ];
    });

    // Add totals row
    tableData.push([
      '', '', '', '', 'TOTALS:',
      `R${totalDebits.toFixed(2)}`,
      `R${totalCredits.toFixed(2)}`,
      `R${(totalDebits - totalCredits).toFixed(2)}`,
      ''
    ]);

    // Create table using autoTable
    doc.autoTable({
      head: [['Date', 'Code', 'Account', 'Description', 'Reference', 'Debit', 'Credit', 'Balance', 'Source']],
      body: tableData,
      startY: 60,
      styles: {
        fontSize: 8,
        cellPadding: 2,
        overflow: 'linebreak'
      },
      headStyles: {
        fillColor: [61, 190, 125], // Zande green
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9
      },
      alternateRowStyles: {
        fillColor: [249, 250, 251] // Light gray
      },
      columnStyles: {
        0: { cellWidth: 25 }, // Date
        1: { cellWidth: 20 }, // Code
        2: { cellWidth: 35 }, // Account
        3: { cellWidth: 45 }, // Description
        4: { cellWidth: 25 }, // Reference
        5: { cellWidth: 25, halign: 'right' }, // Debit
        6: { cellWidth: 25, halign: 'right' }, // Credit
        7: { cellWidth: 25, halign: 'right' }, // Balance
        8: { cellWidth: 20 } // Source
      },
      didParseCell: function(data) {
        // Style the totals row
        if (data.row.index === tableData.length - 1) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [230, 230, 230];
          data.cell.styles.textColor = [0, 0, 0];
        }
      }
    });

    // Add summary section
    const finalY = doc.lastAutoTable.finalY + 15;
    
    doc.setFontSize(12);
    doc.setTextColor(61, 190, 125);
    doc.text('Summary:', 14, finalY);
    
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(`Total Debit Entries: R${totalDebits.toLocaleString('en-ZA', {minimumFractionDigits: 2})}`, 14, finalY + 10);
    doc.text(`Total Credit Entries: R${totalCredits.toLocaleString('en-ZA', {minimumFractionDigits: 2})}`, 14, finalY + 18);
    doc.text(`Difference: R${(totalDebits - totalCredits).toLocaleString('en-ZA', {minimumFractionDigits: 2})}`, 14, finalY + 26);
    
    // Add account summary
    const accountSummary = {};
    entriesToExport.forEach(entry => {
      const accountKey = `${entry.account_code} - ${entry.account_name}`;
      if (!accountSummary[accountKey]) {
        accountSummary[accountKey] = { debits: 0, credits: 0 };
      }
      accountSummary[accountKey].debits += parseFloat(entry.debit_amount) || 0;
      accountSummary[accountKey].credits += parseFloat(entry.credit_amount) || 0;
    });
    
    doc.text(`Active Accounts: ${Object.keys(accountSummary).length}`, 14, finalY + 34);

    // Add page numbers
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(107, 114, 128);
      doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.width - 30, doc.internal.pageSize.height - 10);
      doc.text('ZandeBooks - Confidential', 14, doc.internal.pageSize.height - 10);
    }

    // Generate filename with current date and filter info
    const timestamp = new Date().toISOString().split('T')[0];
    const filterSuffix = filteredGLEntries.length !== generalLedgerEntries.length ? '_Filtered' : '';
    const fileName = `ZandeBooks_GeneralLedger${filterSuffix}_${timestamp}.pdf`;

    // Save the PDF
    doc.save(fileName);

    // Show success notification
    showNotification(`General Ledger exported to PDF successfully! (${entriesToExport.length} entries)`, 'success');
    console.log('✅ GL PDF export completed successfully');

  } catch (error) {
    console.error('❌ Error exporting GL to PDF:', error);
    alert('Error exporting to PDF: ' + error.message);
  }
}

// Export Chart of Accounts to PDF
function exportCOAToPDF() {
  try {
    if (typeof jsPDF === 'undefined') {
      showNotification('PDF library not loaded', 'error');
      return;
    }

    if (!chartOfAccountsData || chartOfAccountsData.length === 0) {
      showNotification('No data to export', 'warning');
      return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Add header
    doc.setFontSize(18);
    doc.setTextColor(11, 31, 58); // Zande Navy
    doc.text('ZandeBooks - Chart of Accounts', 20, 20);
    
    doc.setFontSize(12);
    doc.setTextColor(102, 102, 102);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, 30);
    doc.text(`IFRS for SMEs Compliant`, 20, 40);

    // Group accounts by type
    const accountsByType = {
      'Asset': [],
      'Liability': [],
      'Equity': [],
      'Revenue': [],
      'Expense': []
    };

    chartOfAccountsData.forEach(account => {
      if (accountsByType[account.account_type]) {
        accountsByType[account.account_type].push(account);
      }
    });

    let currentY = 50;

    // Add each account type section
    Object.keys(accountsByType).forEach(type => {
      if (accountsByType[type].length === 0) return;

      // Add section header
      doc.setFontSize(14);
      doc.setTextColor(5, 150, 105); // Zande Green
      doc.text(`${type} Accounts`, 20, currentY);
      currentY += 10;

      // Prepare table data for this type
      const tableData = accountsByType[type].map(account => [
        account.account_code,
        account.account_name,
        account.account_category || '',
        account.normal_balance,
        account.is_active !== false ? 'Active' : 'Inactive'
      ]);

      // Add table
      doc.autoTable({
        head: [['Code', 'Account Name', 'Category', 'Normal Balance', 'Status']],
        body: tableData,
        startY: currentY,
        styles: {
          fontSize: 9,
          cellPadding: 3
        },
        headStyles: {
          fillColor: [11, 31, 58], // Zande Navy
          textColor: [255, 255, 255],
          fontSize: 10,
          fontStyle: 'bold'
        },
        alternateRowStyles: {
          fillColor: [249, 250, 251]
        }
      });

      currentY = doc.lastAutoTable.finalY + 15;
    });

    // Add summary
    const totalAccounts = chartOfAccountsData.length;
    const activeAccounts = chartOfAccountsData.filter(a => a.is_active !== false).length;

    doc.setFontSize(10);
    doc.setTextColor(11, 31, 58);
    doc.text(`Total Accounts: ${totalAccounts}`, 20, currentY);
    doc.text(`Active Accounts: ${activeAccounts}`, 20, currentY + 10);

    // Save PDF
    const fileName = `ChartOfAccounts_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);

    showNotification('Chart of Accounts exported to PDF successfully!', 'success');
  } catch (error) {
    console.error('PDF export error:', error);
    showNotification('Error exporting to PDF', 'error');
  }
}
// Placeholder functions for future development
function drillDownTransaction(transactionId) {
  showNotification(`Drill down for transaction ${transactionId} - Coming soon!`, 'info');
}

function editAccount(accountCode) {
  showNotification(`Edit account ${accountCode} - Coming soon!`, 'info');
}

function viewAccountHistory(accountCode) {
  showNotification(`Account history for ${accountCode} - Coming soon!`, 'info');
}

// ========================================
// FILTER FUNCTIONS
// ========================================

// Global variables for filtered data
let filteredGLEntries = [];
let filteredCOAData = [];

// Apply General Ledger filters
function applyGLFilters() {
  console.log('🔍 Applying enhanced GL filters...');
  
  // Get all filter values
  const accountFilter = document.getElementById('glAccountFilter')?.value || '';
  const accountTypeFilter = document.getElementById('glAccountTypeFilter')?.value || '';
  const dateFromFilter = document.getElementById('glDateFromFilter')?.value || '';
  const dateToFilter = document.getElementById('glDateToFilter')?.value || '';
  const sourceFilter = document.getElementById('glSourceFilter')?.value || '';
  const searchFilter = document.getElementById('glSearchFilter')?.value?.toLowerCase() || '';

  let filtered = [...generalLedgerEntries];
  
  console.log('Applying filters:', {
    account: accountFilter,
    accountType: accountTypeFilter,
    dateFrom: dateFromFilter,
    dateTo: dateToFilter,
    source: sourceFilter,
    search: searchFilter
  });

  // Apply specific account filter
  if (accountFilter) {
    filtered = filtered.filter(entry => entry.account_code === accountFilter);
    console.log(`After account filter: ${filtered.length} entries`);
  }

  // Apply account type filter
  if (accountTypeFilter) {
    filtered = filtered.filter(entry => {
      // Get account type from chart of accounts
      const account = chartOfAccountsData.find(acc => acc.account_code === entry.account_code) ||
                     chartOfAccounts.find(acc => (acc.account_code || acc.code) === entry.account_code);
      return account && account.account_type === accountTypeFilter;
    });
    console.log(`After account type filter: ${filtered.length} entries`);
  }

  // Apply date from filter
  if (dateFromFilter) {
    filtered = filtered.filter(entry => {
      const entryDate = new Date(entry.transaction_date);
      const fromDate = new Date(dateFromFilter);
      return entryDate >= fromDate;
    });
    console.log(`After date from filter: ${filtered.length} entries`);
  }

  // Apply date to filter
  if (dateToFilter) {
    filtered = filtered.filter(entry => {
      const entryDate = new Date(entry.transaction_date);
      const toDate = new Date(dateToFilter);
      return entryDate <= toDate;
    });
    console.log(`After date to filter: ${filtered.length} entries`);
  }

  // Apply source filter
  if (sourceFilter) {
    filtered = filtered.filter(entry => 
      (entry.source_module || '').toLowerCase() === sourceFilter.toLowerCase()
    );
    console.log(`After source filter: ${filtered.length} entries`);
  }

  // Apply search filter (description or reference)
  if (searchFilter) {
    filtered = filtered.filter(entry => 
      (entry.description || '').toLowerCase().includes(searchFilter) ||
      (entry.reference || '').toLowerCase().includes(searchFilter) ||
      (entry.account_name || '').toLowerCase().includes(searchFilter)
    );
    console.log(`After search filter: ${filtered.length} entries`);
  }

  // Update the display
  filteredGLEntries = filtered;
  renderGeneralLedgerTable(filteredGLEntries);
  updateGLFilterResults(filteredGLEntries.length, generalLedgerEntries.length);
  
  // Show summary in notification
  const filterCount = [accountFilter, accountTypeFilter, dateFromFilter, dateToFilter, sourceFilter, searchFilter].filter(f => f).length;
  showNotification(`Applied ${filterCount} filter(s): ${filteredGLEntries.length} entries found`, 'info');
}

// Clear General Ledger filters
function clearGLFilters() {
  console.log('🧹 Clearing all GL filters...');
  
  // Clear all filter inputs
  const filterIds = [
    'glAccountFilter',
    'glAccountTypeFilter', 
    'glDateFromFilter',
    'glDateToFilter',
    'glSourceFilter',
    'glSearchFilter'
  ];
  
  filterIds.forEach(id => {
    const element = document.getElementById(id);
    if (element) {
      element.value = '';
    }
  });

  // Reset to show all entries
  filteredGLEntries = [...generalLedgerEntries];
  renderGeneralLedgerTable(filteredGLEntries);
  updateGLFilterResults(0, 0); // Clear results text
  
  showNotification('All filters cleared', 'info');
}

// Apply Chart of Accounts filters
function applyCOAFilters() {
  const accountTypeFilter = document.getElementById('coaAccountTypeFilter')?.value || '';
  const statusFilter = document.getElementById('coaStatusFilter')?.value || '';
  const searchFilter = document.getElementById('coaSearchFilter')?.value?.toLowerCase() || '';

  let filtered = [...chartOfAccountsData];

  // Apply account type filter
  if (accountTypeFilter) {
    filtered = filtered.filter(account => account.account_type === accountTypeFilter);
  }

  // Apply status filter
  if (statusFilter) {
    const isActive = statusFilter === 'active';
    filtered = filtered.filter(account => (account.is_active !== false) === isActive);
  }

  // Apply search filter
  if (searchFilter) {
    filtered = filtered.filter(account => 
      account.account_code.toLowerCase().includes(searchFilter) ||
      account.account_name.toLowerCase().includes(searchFilter) ||
      (account.account_category || '').toLowerCase().includes(searchFilter)
    );
  }

  filteredCOAData = filtered;
  renderChartOfAccountsTable(filteredCOAData);
  updateCOAFilterResults(filteredCOAData.length, chartOfAccountsData.length);
  
  showNotification(`Applied filters: ${filteredCOAData.length} accounts found`, 'info');
}

// Clear Chart of Accounts filters
function clearCOAFilters() {
  document.getElementById('coaAccountTypeFilter').value = '';
  document.getElementById('coaStatusFilter').value = '';
  document.getElementById('coaSearchFilter').value = '';

  filteredCOAData = [...chartOfAccountsData];
  renderChartOfAccountsTable(filteredCOAData);
  updateCOAFilterResults(0, 0); // Clear results text
  
  showNotification('Filters cleared', 'info');
}

// Update GL filter results display
function updateGLFilterResults(filteredCount, totalCount) {
  const resultsEl = document.getElementById('glFilterResults');
  if (resultsEl) {
    if (filteredCount === 0 && totalCount === 0) {
      resultsEl.textContent = '';
    } else if (filteredCount === totalCount) {
      resultsEl.textContent = `Showing all ${totalCount} entries`;
    } else {
      resultsEl.textContent = `Showing ${filteredCount} of ${totalCount} entries`;
    }
  }
}

// Update COA filter results display
function updateCOAFilterResults(filteredCount, totalCount) {
  const resultsEl = document.getElementById('coaFilterResults');
  if (resultsEl) {
    if (filteredCount === 0 && totalCount === 0) {
      resultsEl.textContent = '';
    } else if (filteredCount === totalCount) {
      resultsEl.textContent = `Showing all ${totalCount} accounts`;
    } else {
      resultsEl.textContent = `Showing ${filteredCount} of ${totalCount} accounts`;
    }
  }
}

// Get filter period text for PDF export
function getFilterPeriodText() {
  const dateFrom = document.getElementById('glDateFromFilter')?.value;
  const dateTo = document.getElementById('glDateToFilter')?.value;
  
  if (dateFrom && dateTo) {
    return `${new Date(dateFrom).toLocaleDateString()} to ${new Date(dateTo).toLocaleDateString()}`;
  } else if (dateFrom) {
    return `From ${new Date(dateFrom).toLocaleDateString()}`;
  } else if (dateTo) {
    return `Up to ${new Date(dateTo).toLocaleDateString()}`;
  } else {
    return 'All periods';
  }
}

// Load accounts for GL filtering
async function loadAccountsForGLFilters() {
  try {
    console.log('🗂️ Loading ALL accounts from Chart of Accounts for GL filters...');
    
    // Load ALL accounts from Chart of Accounts, not just those with GL entries
    await loadChartOfAccounts(); // Ensure COA is loaded
    
    // Get ALL accounts from Chart of Accounts
    const allAccounts = chartOfAccounts || chartOfAccountsData || [];
    
    if (!allAccounts || allAccounts.length === 0) {
      console.warn('⚠️ No Chart of Accounts found, loading default accounts...');
      window.chartOfAccounts = getDefaultIFRSAccounts();
      window.chartOfAccountsData = getDefaultIFRSAccounts();
    }
    
    const accountsWithDetails = (chartOfAccounts || chartOfAccountsData || []).map(account => ({
      code: account.account_code || account.code,
      name: account.account_name || account.name || 'Unknown Account',
      type: account.account_type || 'Unknown'
    }));
    
    // Sort by account code
    accountsWithDetails.sort((a, b) => a.code.localeCompare(b.code));
    
    // Populate the account filter dropdown
    const accountSelect = document.getElementById('glAccountFilter');
    if (accountSelect) {
      accountSelect.innerHTML = '<option value="">All Accounts</option>';
      
      // Group by account type for better UX
      const accountTypes = ['Asset', 'Liability', 'Equity', 'Revenue', 'Expense', 'Unknown'];
      
      accountTypes.forEach(type => {
        const accountsOfType = accountsWithDetails.filter(acc => acc.type === type);
        if (accountsOfType.length > 0) {
          const optgroup = document.createElement('optgroup');
          optgroup.label = `📊 ${type} Accounts`;
          
          accountsOfType.forEach(account => {
            const option = document.createElement('option');
            option.value = account.code;
            option.textContent = `${account.code} - ${account.name}`;
            optgroup.appendChild(option);
          });
          
          accountSelect.appendChild(optgroup);
        }
      });
    }
    
    console.log(`✅ Loaded ${accountsWithDetails.length} accounts from Chart of Accounts for filtering`);
    console.log('Account types loaded:', [...new Set(accountsWithDetails.map(a => a.type))]);
    
  } catch (error) {
    console.error('❌ Error loading accounts for GL filters:', error);
  }
}

// Quick filter functions
function quickFilterByType(accountType) {
  // Clear all filters first
  clearGLFilters();
  
  // Set the account type filter
  const accountTypeFilter = document.getElementById('glAccountTypeFilter');
  if (accountTypeFilter) {
    accountTypeFilter.value = accountType;
    applyGLFilters();
  }
}

function quickFilterBySource(source) {
  // Clear all filters first
  clearGLFilters();
  
  // Set the source filter
  const sourceFilter = document.getElementById('glSourceFilter');
  if (sourceFilter) {
    sourceFilter.value = source;
    applyGLFilters();
  }
}

// Add this function to integrate GL posting into all modules

// ========================================
// GL INTEGRATION FOR ALL MODULES
// ========================================

/**
 * Enhanced function to save sales document with GL posting
 */
async function saveSalesDocumentWithGL(salesDocument, lineItems) {
  console.log('💾 Saving sales document with GL integration...');
  
  try {
    // Save sales document first
    const { data: docData, error: docError } = await supabase
      .from('sales_documents')
      .insert([salesDocument])
      .select()
      .single();
    
    if (docError) throw new Error('Error saving sales document: ' + docError.message);
    
    // Save line items
    const lineItemsToSave = lineItems.map(item => ({
      sales_document_id: docData.id,
      product_id: item.product_id || null,
      description: item.description,
      quantity: parseFloat(item.quantity) || 0,
      unit_price: parseFloat(item.unit_price) || 0,
      tax_code: item.tax_code || 'Standard',
      tax_rate: parseFloat(item.tax_rate) || 15,
      line_total: parseFloat(item.line_total) || 0
    }));
    
    const { error: lineError } = await supabase
      .from('sales_line_items')
      .insert(lineItemsToSave);
    
    if (lineError) throw new Error('Error saving line items: ' + lineError.message);
    
    // POST TO GENERAL LEDGER (for Invoices only)
    if (salesDocument.document_type === 'Invoice') {
      const customerName = document.getElementById('salesCustomer').selectedOptions[0]?.text?.split(' - ')[1] || 'Customer';
      
      const invoiceDataForGL = {
        ...salesDocument,
        customer_name: customerName
      };
      
      const glEntries = GLEntryTemplates.salesInvoice(invoiceDataForGL, lineItems);
      const glResult = await postToGeneralLedger(glEntries, 'sales', docData.id);
      
      if (glResult.success) {
        // Update document to show it's posted to GL
        await supabase
          .from('sales_documents')
          .update({ status: 'Posted', posted_to_gl: true })
          .eq('id', docData.id);
        
        showNotification('✅ Sales invoice saved and posted to General Ledger!', 'success');
      } else {
        throw new Error('GL posting failed: ' + glResult.error);
      }
    } else {
      showNotification(`✅ ${salesDocument.document_type} saved successfully!`, 'success');
    }
    
    return { success: true, document: docData };
    
  } catch (error) {
    console.error('❌ Error saving sales document:', error);
    showNotification('Error: ' + error.message, 'error');
    return { success: false, error: error.message };
  }
}

/**
 * Enhanced function to save expense with GL posting
 */
async function saveExpenseWithGL(expenseData) {
  console.log('💾 Saving expense with GL integration...');
  
  try {
    // Save expense document
    const { data: expenseDoc, error: expenseError } = await supabase
      .from('expense_documents')
      .insert([expenseData])
      .select()
      .single();
    
    if (expenseError) throw new Error('Error saving expense: ' + expenseError.message);
    
    // POST TO GENERAL LEDGER
    const glEntries = GLEntryTemplates.directExpense(expenseData);
    const glResult = await postToGeneralLedger(glEntries, 'expenses', expenseDoc.id);
    
    if (glResult.success) {
      showNotification('✅ Expense saved and posted to General Ledger!', 'success');
    } else {
      console.warn('⚠️ Expense saved but GL posting failed:', glResult.error);
      showNotification('Expense saved but GL posting failed: ' + glResult.error, 'warning');
    }
    
    return { success: true, document: expenseDoc };
    
  } catch (error) {
    console.error('❌ Error saving expense:', error);
    showNotification('Error: ' + error.message, 'error');
    return { success: false, error: error.message };
  }
}

/**
 * Enhanced function to save bank transaction with GL posting
 */
async function saveBankTransactionWithGL(transactionData) {
  console.log('💾 Saving bank transaction with GL integration...');
  
  try {
    // Calculate new balance
    const currentBalance = await getCurrentAccountBalance(transactionData.bank_account_id);
    const amount = parseFloat(transactionData.amount);
    const isDeposit = transactionData.transaction_type === 'Deposit' || transactionData.transaction_type === 'Transfer In';
    const newBalance = isDeposit ? currentBalance + amount : currentBalance - amount;
    
    // Add balance to transaction data
    transactionData.balance_after = newBalance;
    
    // Save transaction
    const { data: transactionDoc, error: transactionError } = await supabase
      .from('bank_transactions')
      .insert([transactionData])
      .select()
      .single();
    
    if (transactionError) throw new Error('Error saving transaction: ' + transactionError.message);
    
    // Update account balance
    await supabase
      .from('bank_accounts')
      .update({ current_balance: newBalance })
      .eq('id', transactionData.bank_account_id);
    
    // POST TO GENERAL LEDGER
    const glEntries = GLEntryTemplates.bankingTransaction(transactionData);
    const glResult = await postToGeneralLedger(glEntries, 'banking', transactionDoc.id);
    
    if (glResult.success) {
      showNotification('✅ Transaction saved and posted to General Ledger!', 'success');
    } else {
      console.warn('⚠️ Transaction saved but GL posting failed:', glResult.error);
      showNotification('Transaction saved but GL posting failed: ' + glResult.error, 'warning');
    }
    
    return { success: true, transaction: transactionDoc };
    
  } catch (error) {
    console.error('❌ Error saving bank transaction:', error);
    showNotification('Error: ' + error.message, 'error');
    return { success: false, error: error.message };
  }
}

// Make these functions global
window.saveSalesDocumentWithGL = saveSalesDocumentWithGL;
window.saveExpenseWithGL = saveExpenseWithGL;
window.saveBankTransactionWithGL = saveBankTransactionWithGL;

/**
 * Generate standard GL entries for common transaction types
 */
const GLEntryTemplates = {
  // Sales Invoice: Debit A/R, Credit Sales Revenue, Credit VAT Output
  salesInvoice: (salesDoc, lineItems) => {
    const entries = [];
    const totalAmount = parseFloat(salesDoc.total_amount) || 0;
    const taxAmount = parseFloat(salesDoc.tax_amount) || 0;
    const subtotal = parseFloat(salesDoc.subtotal) || 0;
    
    // 1. DEBIT: Accounts Receivable (for credit sales)
    entries.push({
      account_code: '1200',
      account_name: 'Accounts Receivable',
      debit: totalAmount,
      credit: 0,
      description: `Credit sale to ${salesDoc.customer_name} - ${salesDoc.document_number}`,
      reference: salesDoc.document_number,
      transaction_date: salesDoc.document_date
    });
    
    // 2. CREDIT: Sales Revenue
    entries.push({
      account_code: '4000',
      account_name: 'Sales Revenue',
      debit: 0,
      credit: subtotal,
      description: `Sale to ${salesDoc.customer_name} - ${salesDoc.document_number}`,
      reference: salesDoc.document_number,
      transaction_date: salesDoc.document_date
    });
    
    // 3. CREDIT: VAT Output (if applicable)
    if (taxAmount > 0) {
      entries.push({
        account_code: '2200',
        account_name: 'VAT Output',
        debit: 0,
        credit: taxAmount,
        description: `VAT on sale to ${salesDoc.customer_name} - ${salesDoc.document_number}`,
        reference: salesDoc.document_number,
        transaction_date: salesDoc.document_date
      });
    }
    
    // 4. COST OF GOODS SOLD (COGS) entries for products
    const productLineItems = lineItems.filter(item => item.product_id);
    
    if (productLineItems.length > 0) {
      let totalCOGS = 0;
      
      productLineItems.forEach(item => {
        // You'll need to get the cost price from the product
        // For now, let's assume we have cost_price in the line item or fetch it
        const costPrice = item.cost_price || 0; // You'll need to get this from products table
        const quantity = parseFloat(item.quantity) || 0;
        const itemCOGS = costPrice * quantity;
        totalCOGS += itemCOGS;
      });
      
      if (totalCOGS > 0) {
        // DEBIT: Cost of Goods Sold
        entries.push({
          account_code: '5000',
          account_name: 'Cost of Goods Sold',
          debit: totalCOGS,
          credit: 0,
          description: `COGS for sale to ${salesDoc.customer_name} - ${salesDoc.document_number}`,
          reference: salesDoc.document_number,
          transaction_date: salesDoc.document_date
        });
        
        // CREDIT: Inventory
        entries.push({
          account_code: '1300',
          account_name: 'Inventory',
          debit: 0,
          credit: totalCOGS,
          description: `Inventory sold to ${salesDoc.customer_name} - ${salesDoc.document_number}`,
          reference: salesDoc.document_number,
          transaction_date: salesDoc.document_date
        });
      }
    }
    
    return entries;
  },
  
  /**
   * Cash Sale GL Entry
   */
  cashSale: (salesDoc, lineItems) => {
    const entries = [];
    const totalAmount = parseFloat(salesDoc.total_amount) || 0;
    const taxAmount = parseFloat(salesDoc.tax_amount) || 0;
    const subtotal = parseFloat(salesDoc.subtotal) || 0;
    
    // 1. DEBIT: Cash/Bank Account (for cash sales)
    entries.push({
      account_code: '1100',
      account_name: 'Cash and Cash Equivalents',
      debit: totalAmount,
      credit: 0,
      description: `Cash sale to ${salesDoc.customer_name} - ${salesDoc.document_number}`,
      reference: salesDoc.document_number,
      transaction_date: salesDoc.document_date
    });
    
    // 2. CREDIT: Sales Revenue
    entries.push({
      account_code: '4000',
      account_name: 'Sales Revenue',
      debit: 0,
      credit: subtotal,
      description: `Cash sale to ${salesDoc.customer_name} - ${salesDoc.document_number}`,
      reference: salesDoc.document_number,
      transaction_date: salesDoc.document_date
    });
    
    // 3. CREDIT: VAT Output (if applicable)
    if (taxAmount > 0) {
      entries.push({
        account_code: '2200',
        account_name: 'VAT Output',
        debit: 0,
        credit: taxAmount,
        description: `VAT on cash sale to ${salesDoc.customer_name} - ${salesDoc.document_number}`,
        reference: salesDoc.document_number,
        transaction_date: salesDoc.document_date
      });
    }
    
    // 4. COST OF GOODS SOLD entries (same as credit sales)
    const productLineItems = lineItems.filter(item => item.product_id);
    
    if (productLineItems.length > 0) {
      let totalCOGS = 0;
      
      productLineItems.forEach(item => {
        const costPrice = item.cost_price || 0;
        const quantity = parseFloat(item.quantity) || 0;
        const itemCOGS = costPrice * quantity;
        totalCOGS += itemCOGS;
      });
      
      if (totalCOGS > 0) {
        // DEBIT: Cost of Goods Sold
        entries.push({
          account_code: '5000',
          account_name: 'Cost of Goods Sold',
          debit: totalCOGS,
          credit: 0,
          description: `COGS for cash sale to ${salesDoc.customer_name} - ${salesDoc.document_number}`,
          reference: salesDoc.document_number,
          transaction_date: salesDoc.document_date
        });
        
        // CREDIT: Inventory
        entries.push({
          account_code: '1300',
          account_name: 'Inventory',
          debit: 0,
          credit: totalCOGS,
          description: `Inventory sold to ${salesDoc.customer_name} - ${salesDoc.document_number}`,
          reference: salesDoc.document_number,
          transaction_date: salesDoc.document_date
        });
      }
    }
    
    return entries;
  },
  
  /**
   * Customer Payment GL Entry (when customer pays)
   */
  customerPayment: (paymentData) => {
    const entries = [];
    const amount = parseFloat(paymentData.amount) || 0;
    
    // DEBIT: Bank Account
    entries.push({
      account_code: '1120',
      account_name: 'Bank Account',
      debit: amount,
      credit: 0,
      description: `Payment received from ${paymentData.customer_name} - ${paymentData.reference}`,
      reference: paymentData.reference,
      transaction_date: paymentData.payment_date
    });
    
    // CREDIT: Accounts Receivable
    entries.push({
      account_code: '1200',
      account_name: 'Accounts Receivable',
      debit: 0,
      credit: amount,
      description: `Payment from ${paymentData.customer_name} - ${paymentData.reference}`,
      reference: paymentData.reference,
      transaction_date: paymentData.payment_date
    });
    
    return entries;
  }
}
  
// Purchase Bill: Debit Expense/Inventory + VAT Input, Credit Accounts Payable - UPDATED
purchaseBill: (purchaseData) => {
  const entries = [];
  const totalAmount = parseFloat(purchaseData.total_amount) || 0;
  const vatAmount = parseFloat(purchaseData.vat_amount) || 0;
  const netAmount = totalAmount - vatAmount;
  const supplierName = purchaseData.supplier_name || 'Supplier';
  
  if (purchaseData.purchase_type === 'Expenditure') {
    // For Expenditure: Debit the selected expense account
    const expenseAccountCode = purchaseData.expense_account || '5800';
    const expenseAccount = (chartOfAccounts || chartOfAccountsData || [])
      .find(acc => (acc.account_code || acc.code) === expenseAccountCode);
    const expenseAccountName = expenseAccount ? 
      (expenseAccount.account_name || expenseAccount.name) : 'Expense Account';
    
    entries.push({
      account_code: expenseAccountCode,
      account_name: expenseAccountName,
      description: `${purchaseData.document_type} ${purchaseData.document_number} - ${supplierName}`,
      reference: purchaseData.document_number,
      debit_amount: netAmount,
      credit_amount: 0,
      transaction_date: purchaseData.document_date
    });
  } else {
    // For Inventory: Debit inventory account (1300)
    // 🆕 Use the expense_account field if it contains the inventory account, otherwise default to 1300
    const inventoryAccountCode = (purchaseData.expense_account === '1300') ? 
      purchaseData.expense_account : '1300';
    
    entries.push({
      account_code: inventoryAccountCode,
      account_name: 'Inventory',
      description: `${purchaseData.document_type} ${purchaseData.document_number} - ${supplierName}`,
      reference: purchaseData.document_number,
      debit_amount: netAmount,
      credit_amount: 0,
      transaction_date: purchaseData.document_date
    });
  }
  
  // Debit: VAT Input (if applicable)
  if (vatAmount > 0) {
    entries.push({
      account_code: '1450',
      account_name: 'VAT Input',
      description: `${purchaseData.document_type} ${purchaseData.document_number} - VAT Input`,
      reference: purchaseData.document_number,
      debit_amount: vatAmount,
      credit_amount: 0,
      transaction_date: purchaseData.document_date
    });
  }
  
  // Credit: Accounts Payable
  entries.push({
    account_code: '2100',
    account_name: 'Accounts Payable',
    description: `${purchaseData.document_type} ${purchaseData.document_number} - ${supplierName}`,
    reference: purchaseData.document_number,
    debit_amount: 0,
    credit_amount: totalAmount,
    transaction_date: purchaseData.document_date
  });
  
  return entries;
}
  
  // Purchase Payment: Debit Accounts Payable, Credit Bank Account
  purchasePayment: (paymentData) => {
    const amount = parseFloat(paymentData.amount) || 0;
    const supplierName = paymentData.supplier_name || 'Supplier';
    
    return [
      {
        account_code: '2100',
        account_name: 'Accounts Payable',
        description: `Payment to ${supplierName} - ${paymentData.reference || paymentData.document_number}`,
        reference: paymentData.reference || paymentData.document_number,
        debit_amount: amount,
        credit_amount: 0,
        transaction_date: paymentData.payment_date || paymentData.document_date
      },
      {
        account_code: paymentData.bank_account_code || '1120',
        account_name: paymentData.bank_account_name || 'Bank Account',
        description: `Payment to ${supplierName} - ${paymentData.reference || paymentData.document_number}`,
        reference: paymentData.reference || paymentData.document_number,
        debit_amount: 0,
        credit_amount: amount,
        transaction_date: paymentData.payment_date || paymentData.document_date
      }
    ];
  }

  
  // Banking Transaction: Debit/Credit Bank Account, Credit/Debit other account
  bankingTransaction: (transactionData) => {
    const amount = parseFloat(transactionData.amount) || 0;
    const isDeposit = transactionData.transaction_type === 'Deposit' || 
                     transactionData.transaction_type === 'Transfer In';
    
    const entries = [];
    
    // Bank account entry
    entries.push({
      account_code: transactionData.bank_account_code || '1120',
      description: transactionData.description,
      debit_amount: isDeposit ? amount : 0,
      credit_amount: isDeposit ? 0 : amount,
      transaction_date: transactionData.transaction_date,
      reference: transactionData.reference
    });
    
    // Contra account (this might need to be specified by user in future)
    const contraAccountCode = transactionData.category === 'Transfer' ? '1120' : '5800'; // Default to office expenses
    entries.push({
      account_code: contraAccountCode,
      description: transactionData.description,
      debit_amount: isDeposit ? 0 : amount,
      credit_amount: isDeposit ? amount : 0,
      transaction_date: transactionData.transaction_date,
      reference: transactionData.reference
    });
    
    return entries;
  }
  
// Direct Expense: Debit Expense, Credit Cash/Bank
directExpense: (expenseData) => {
  const amount = parseFloat(expenseData.amount) || 0;
  const vatAmount = parseFloat(expenseData.tax_amount) || 0;
  const netAmount = amount - vatAmount;
  
  const entries = [];
  
  // Debit: Expense
  if (netAmount > 0) {
    const expenseAccountCode = expenseData.category || '5800'; // 🆕 Use category field from your Supabase table
    entries.push({
      account_code: expenseAccountCode,
      description: expenseData.description,
      debit_amount: netAmount,
      credit_amount: 0,
      transaction_date: expenseData.date,
      reference: expenseData.reference
    });
  }
  
  // Debit: VAT Input
  if (vatAmount > 0) {
    entries.push({
      account_code: '1450',
      description: `${expenseData.description} - VAT Input`,
      debit_amount: vatAmount,
      credit_amount: 0,
      transaction_date: expenseData.date,
      reference: expenseData.reference
    });
  }
  
  // Credit: Cash/Bank
  const bankAccountCode = expenseData.paid_from_code || '1120';
  entries.push({
    account_code: bankAccountCode,
    description: expenseData.description,
    debit_amount: 0,
    credit_amount: amount,
    transaction_date: expenseData.date,
    reference: expenseData.reference
  });
  
  return entries;
}


/**
 * Helper function to map expense categories to account codes
 */
function getExpenseAccountCode(category) {
  const expenseMapping = {
    'office_supplies': '5800',
    'rent': '5300',
    'utilities': '5400',
    'salaries': '5200',
    'travel': '5800',
    'professional_fees': '5800',
    'insurance': '6200',
    'bank_charges': '6100',
    'depreciation': '5500',
    'interest': '5700',
    'other': '5800'
  };
  
  return expenseMapping[category] || '5800'; // Default to Office Expenses
}

/**
 * Main function to post entries to General Ledger
 */
async function postToGeneralLedger(glEntries, sourceModule, sourceDocumentId) {
  console.log('🔄 Posting to General Ledger...', { glEntries, sourceModule, sourceDocumentId });
  
  try {
    if (!glEntries || glEntries.length === 0) {
      console.warn('⚠️ No GL entries provided');
      return { success: false, error: 'No GL entries provided' };
    }
    
    // Validate entries
    for (const entry of glEntries) {
      if (!entry.account_code || !entry.transaction_date) {
        throw new Error('Invalid GL entry: missing account_code or transaction_date');
      }
      
      const debitAmount = parseFloat(entry.debit_amount) || 0;
      const creditAmount = parseFloat(entry.credit_amount) || 0;
      
      if (debitAmount === 0 && creditAmount === 0) {
        throw new Error('Invalid GL entry: must have either debit or credit amount');
      }
    }
    
    // Get current fiscal year and period
    const currentDate = new Date();
    const fiscalYear = currentDate.getFullYear();
    const fiscalPeriod = currentDate.getMonth() + 1;
    
    // Prepare GL entries for insertion - MATCH YOUR DATABASE STRUCTURE
    const glEntriesForDB = glEntries.map(entry => ({
      account_code: entry.account_code,
      account_name: entry.account_name || getAccountName(entry.account_code),
      transaction_date: entry.transaction_date,
      description: entry.description || '',
      reference: entry.reference || '',
      debit_amount: parseFloat(entry.debit_amount) || 0,
      credit_amount: parseFloat(entry.credit_amount) || 0,
      source_module: sourceModule || 'manual',
      source_document_id: sourceDocumentId || null,
      source_document_type: getDocumentType(sourceModule),
      posting_date: new Date().toISOString().split('T')[0],
      fiscal_year: fiscalYear,
      fiscal_period: fiscalPeriod,
      is_posted: true,
      created_at: new Date().toISOString(),
      created_by: 'Current User'
    }));
    
    console.log('📊 Inserting GL entries:', glEntriesForDB);
    
    // Insert into general_ledger table
    const { data, error } = await supabase
      .from('general_ledger')
      .insert(glEntriesForDB)
      .select();
    
    if (error) {
      console.error('❌ GL insertion error:', error);
      throw new Error('GL insertion failed: ' + error.message);
    }
    
    console.log('✅ GL entries posted successfully:', data);
    
    // Refresh GL data if user is viewing it
    if (document.getElementById('general-ledgerSection')?.style.display !== 'none') {
      await loadGeneralLedgerData();
    }
    
    return { success: true, data };
    
  } catch (error) {
    console.error('❌ Error posting to General Ledger:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get document type based on source module
 */
function getDocumentType(sourceModule) {
  const docTypes = {
    'sales': 'invoice',
    'purchases': 'purchase_order', 
    'banking': 'bank_transaction',
    'expenses': 'expense',
    'journals': 'journal_entry'
  };
  
  return docTypes[sourceModule] || 'transaction';
}

/**
 * Helper function to get account name from account code
 */
function getAccountName(accountCode) {
  const account = chartOfAccounts.find(acc => acc.code === accountCode) ||
                  chartOfAccountsData.find(acc => acc.account_code === accountCode);
  
  return account ? (account.name || account.account_name) : 'Unknown Account';
}

/**
 * Create the General Ledger table if it doesn't exist
 */
async function createGeneralLedgerTable() {
  try {
    console.log('🔧 Attempting to create General Ledger table...');
    
    // Try to insert a test entry to see if table exists
    const testEntry = {
      transaction_date: new Date().toISOString().split('T')[0],
      account_code: '1120',
      account_name: 'Bank Account - Current',
      description: 'Opening Balance',
      reference: 'OB001',
      debit_amount: 0,
      credit_amount: 0,
      source_module: 'setup',
      source_document_id: null,
      created_at: new Date().toISOString()
    };
    
    const { error } = await supabase
      .from('general_ledger')
      .insert([testEntry]);
    
    if (error) {
      console.error('❌ Cannot create table automatically:', error.message);
      showNotification('Please contact support to set up the General Ledger table', 'error');
      return false;
    }
    
    // Delete the test entry
    await supabase
      .from('general_ledger')
      .delete()
      .eq('reference', 'OB001')
      .eq('source_module', 'setup');
    
    console.log('✅ General Ledger table is ready');
    return true;
    
  } catch (error) {
    console.error('❌ Error in createGeneralLedgerTable:', error);
    return false;
  }
}

// Make functions globally accessible
window.postToGeneralLedger = postToGeneralLedger;
window.createGeneralLedgerTable = createGeneralLedgerTable;
window.getAccountName = getAccountName;
// Add this debug function after your existing GL functions (around line 7000)

// Debug function to check GL status
async function debugGLStatus() {
  console.log('=== GL DEBUG STATUS ===');
  
  try {
    // Check if general_ledger table exists and has data
    const { data: glData, error: glError } = await supabase
      .from('general_ledger')
      .select('*')
      .limit(5);
    
    console.log('1. GL Table Check:');
    console.log('   - Error:', glError);
    console.log('   - Data count:', glData?.length || 0);
    console.log('   - Sample data:', glData);
    
    // Check if journal_entries table has posted entries
    const { data: journalData, error: journalError } = await supabase
      .from('journal_entries')
      .select('*')
      .eq('status', 'Posted')
      .limit(5);
    
    console.log('2. Posted Journals Check:');
    console.log('   - Error:', journalError);
    console.log('   - Posted journals count:', journalData?.length || 0);
    console.log('   - Sample journals:', journalData);
    
    // Check sales documents with GL posting
    const { data: salesData, error: salesError } = await supabase
      .from('sales_documents')
      .select('*')
      .eq('posted_to_gl', true)
      .limit(5);
    
    console.log('3. Sales with GL Posting Check:');
    console.log('   - Error:', salesError);
    console.log('   - Sales posted to GL:', salesData?.length || 0);
    
    // Check banking transactions
    const { data: bankData, error: bankError } = await supabase
      .from('bank_transactions')
      .select('*')
      .limit(5);
    
    console.log('4. Banking Transactions Check:');
    console.log('   - Error:', bankError);
    console.log('   - Bank transactions count:', bankData?.length || 0);
    
    // Test GL posting function exists
    console.log('5. GL Functions Check:');
    console.log('   - postToGeneralLedger exists:', typeof window.postToGeneralLedger);
    console.log('   - GLEntryTemplates exists:', typeof window.GLEntryTemplates);
    
  } catch (error) {
    console.error('Debug error:', error);
  }
  
  console.log('=== END GL DEBUG ===');
}

// Make it globally accessible
window.debugGLStatus = debugGLStatus;

// Make functions globally available
window.postToGeneralLedger = postToGeneralLedger;
window.GLEntryTemplates = GLEntryTemplates;
// ========================================
// NAVIGATION INTEGRATION
// ========================================

// Update your existing navigation to include GL and COA
document.addEventListener('DOMContentLoaded', function() {
  // Update your existing navigation handler to include these cases
  document.querySelectorAll('[data-module]').forEach(item => {
    item.addEventListener('click', function() {
      const module = this.getAttribute('data-module');
      
      // Hide all sections
      document.querySelectorAll('.module-section').forEach(sec => sec.style.display = 'none');
      
      // Show selected section
      const sectionId = module + 'Section';
      const section = document.getElementById(sectionId);
      if (section) {
        section.style.display = '';
        
        // Initialize module-specific functionality
        if (module === 'general-ledger') {
          initializeGeneralLedger();
        } else if (module === 'chart-of-accounts') {
          initializeChartOfAccounts();
        }
        // ... your existing module handlers
      }
      
      // Update active state in sidebar
      document.querySelectorAll('[data-module]').forEach(link => link.classList.remove('active'));
      this.classList.add('active');
    });
  });
});

// Make functions global for the browser
window.initializeGeneralLedger = initializeGeneralLedger;
window.initializeChartOfAccounts = initializeChartOfAccounts;
window.exportGLToExcel = exportGLToExcel;
window.exportCOAToExcel = exportCOAToExcel;
window.drillDownTransaction = drillDownTransaction;
window.editAccount = editAccount;
window.viewAccountHistory = viewAccountHistory;
window.exportGLToPDF = exportGLToPDF;
window.exportCOAToPDF = exportCOAToPDF;
window.applyGLFilters = applyGLFilters;
window.clearGLFilters = clearGLFilters;
window.applyCOAFilters = applyCOAFilters;
window.clearCOAFilters = clearCOAFilters;
window.setupGLEventListeners = setupGLEventListeners;
// Add this at the very end of your file (after all other code)

// ========================================
// ENSURE ALL FUNCTIONS ARE GLOBALLY ACCESSIBLE
// ========================================

// Make sure selectProduct function exists
if (typeof selectProduct === 'undefined') {
  console.error('❌ selectProduct function not found! Adding it now...');
  
  // Add the selectProduct function if it's missing
  window.selectProduct = function(index, productId) {
    console.log(`Selecting product ${productId} for line ${index}`);
    
    // Ensure currentLineItems exists and has the right index
    if (!currentLineItems || !currentLineItems[index]) {
      console.error('Invalid line item index:', index);
      return;
    }
    
    if (!productId) {
      // Clear fields if no product selected
      currentLineItems[index].product_id = '';
      currentLineItems[index].description = '';
      currentLineItems[index].unit_price = 0;
      currentLineItems[index].tax_code = 'Standard';
      currentLineItems[index].tax_rate = 15;
      currentLineItems[index].product_info = null;
      calculateLineTotal(index);
      renderLineItems();
      updateTotals();
      return;
    }
    
    // Find the product in the loaded products
    const product = window.salesProducts?.find(p => p.id === productId);
    if (product) {
      console.log('Found product:', product);
      
      // Auto-fill all the details
      currentLineItems[index].product_id = productId;
      currentLineItems[index].description = product.name || '';
      currentLineItems[index].unit_price = parseFloat(product.sell_price) || 0;
      currentLineItems[index].tax_code = product.tax_code || 'Standard';
      
      // Set tax rate based on tax code
      const taxRates = { 'Standard': 15, 'Zero': 0, 'Exempt': 0, 'Reduced': 5 };
      currentLineItems[index].tax_rate = taxRates[product.tax_code] || 15;
      
      // Store product info for stock checking
      currentLineItems[index].product_info = product;
      
      // Calculate line total immediately
      calculateLineTotal(index);
      
      console.log('Updated line item:', currentLineItems[index]);
      
      // Re-render and update totals
      renderLineItems();
      updateTotals();
    } else {
      console.error('Product not found with ID:', productId);
      console.log('Available products:', window.salesProducts);
    }
  };
}

// Make all sales functions globally accessible
const salesFunctions = [
  'openSalesModal', 'closeSalesModal', 'addLineItem', 'removeLineItem', 
  'selectProduct', 'updateLineItem', 'calculateLineTotal', 'updateTotals', 
  'renderLineItems', 'setupLineItemEventListeners', 'loadCustomersForSales', 
  'loadProductsForSales', 'generateDocumentNumber'
];

salesFunctions.forEach(funcName => {
  if (typeof window[funcName] === 'undefined' && typeof eval(funcName) !== 'undefined') {
    window[funcName] = eval(funcName);
    console.log(`✅ Made ${funcName} globally accessible`);
  } else if (typeof window[funcName] === 'undefined') {
    console.warn(`⚠️ Function ${funcName} not found`);
  }
});

// Test if selectProduct is now accessible
console.log('selectProduct test:', typeof window.selectProduct);
console.log('updateLineItem test:', typeof window.updateLineItem);
console.log('calculateLineTotal test:', typeof window.calculateLineTotal);
console.log('updateTotals test:', typeof window.updateTotals);

// Make enhanced functions global
window.loadChartOfAccounts = loadChartOfAccounts;
window.createDefaultCOAInDatabase = createDefaultCOAInDatabase;
window.getAccountNormalBalance = getAccountNormalBalance;
window.getAccountType = getAccountType;
window.selectAccount = selectAccount;

// Make new GL filter functions global
window.loadAccountsForGLFilters = loadAccountsForGLFilters;
window.quickFilterByType = quickFilterByType;
window.quickFilterBySource = quickFilterBySource;
window.debounce = debounce;

// Make new expense functions global
window.loadExpenseAccountsFromCOA = loadExpenseAccountsFromCOA;
window.loadBankAccountsForExpenses = loadBankAccountsForExpenses;

// Make new functions global
window.loadSuppliersForExpense = loadSuppliersForExpense;
window.refreshBankAccountsInExpenseModal = refreshBankAccountsInExpenseModal;

// Make file upload functions global
window.handleExpenseFileUpload = handleExpenseFileUpload;
window.uploadExpenseFiles = uploadExpenseFiles;
window.updateFilePreview = updateFilePreview;
window.removeExpenseFile = removeExpenseFile;
window.downloadExpenseFile = downloadExpenseFile;
window.deleteFileFromStorage = deleteFileFromStorage;
window.loadExistingExpenseFiles = loadExistingExpenseFiles;
window.saveExpenseFileAssociations = saveExpenseFileAssociations;
window.getFileIcon = getFileIcon;
window.formatFileSize = formatFileSize;
window.loadFileIndicator = loadFileIndicator;
window.viewExpenseFiles = viewExpenseFiles;
window.showExpenseFilesModal = showExpenseFilesModal;

// Make purchase functions global
window.loadExpenseAccountsForPurchases = loadExpenseAccountsForPurchases;
window.handlePurchaseTypeChange = handlePurchaseTypeChange;
// Make new inventory function global
window.loadInventoryAccountForPurchases = loadInventoryAccountForPurchases;

// Make new supplier integration functions global
window.loadExpenseAccountsForSupplier = loadExpenseAccountsForSupplier;
window.handlePurchaseSupplierChange = handlePurchaseSupplierChange;
window.showSupplierInfoPanel = showSupplierInfoPanel;

// Make supplier document functions global
window.handleSupplierDocumentUpload = handleSupplierDocumentUpload;
window.uploadSupplierDocuments = uploadSupplierDocuments;
window.updateSupplierDocumentPreview = updateSupplierDocumentPreview;
window.downloadSupplierDocument = downloadSupplierDocument;
window.removeSupplierDocument = removeSupplierDocument;
window.viewSupplierDocuments = viewSupplierDocuments;
window.loadSupplierDocumentIndicator = loadSupplierDocumentIndicator;
window.getSupplierDocumentIcon = getSupplierDocumentIcon;
window.getCategoryDisplayName = getCategoryDisplayName;
window.checkDocumentExpiry = checkDocumentExpiry;

// Make new product-purchase integration functions global
window.processPurchaseStockUpdates = processPurchaseStockUpdates;
window.logInventoryTransactions = logInventoryTransactions;
window.filterProductsByPurchaseType = filterProductsByPurchaseType;
window.showPurchaseAnalysis = showPurchaseAnalysis;
window.showPurchaseAnalysisModal = showPurchaseAnalysisModal;

// Make enhanced purchase functions global
window.checkAndShowLowStockAlerts = checkAndShowLowStockAlerts;
window.openPurchaseModalEnhanced = openPurchaseModalEnhanced;

// Make loadProductsForPurchases globally accessible
window.loadProductsForPurchases = loadProductsForPurchases;
window.loadPurchaseProducts = loadPurchaseProducts; // For compatibility

// 📊 REPORTS MODULE - Core Engine
let currentReport = null;
let reportData = {};

// Initialize Reports Module
function initializeReportsModule() {
  console.log('🚀 Initializing Reports Module...');
  
  // Show reports section
  document.getElementById('reportsSection').style.display = 'block';
  
  // Setup report button event listeners
  setupReportButtonListeners();
  
  // Setup tab navigation if it exists
  setupReportsTabNavigation();
  
  console.log('✅ Reports Module initialized successfully');
}

// Setup Report Button Event Listeners
function setupReportButtonListeners() {
  // Financial Reports
  const reportButtons = [
    { id: 'profit-loss-btn', type: 'profit-loss' },
    { id: 'balance-sheet-btn', type: 'balance-sheet' },
    { id: 'trial-balance-btn', type: 'trial-balance' },
    { id: 'cash-flow-btn', type: 'cash-flow' },
    { id: 'equity-changes-btn', type: 'equity-changes' }
  ];
  
  reportButtons.forEach(({ id, type }) => {
    const button = document.getElementById(id);
    if (button) {
      button.onclick = () => generateReport(type);
      console.log(`✅ Wired up ${id} button`);
    } else {
      console.warn(`⚠️ Button ${id} not found in HTML`);
    }
  });
  
  // If no specific buttons found, setup generic report generation
  const reportLinks = document.querySelectorAll('[data-report]');
  reportLinks.forEach(link => {
    const reportType = link.getAttribute('data-report');
    link.addEventListener('click', (e) => {
      e.preventDefault();
      generateReport(reportType);
    });
    console.log(`✅ Wired up data-report: ${reportType}`);
  });
}

// Setup Reports Tab Navigation
function setupReportsTabNavigation() {
  const reportsTabs = document.querySelectorAll('.reports-tab');
  
  if (reportsTabs.length > 0) {
    reportsTabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        const tabId = e.target.getAttribute('data-tab');
        showReportsTab(tabId);
      });
    });
    console.log(`✅ Setup ${reportsTabs.length} report tabs`);
  } else {
    console.log('ℹ️ No report tabs found - using simple layout');
  }
}

// Setup Reports Navigation
function setupReportsNavigation() {
  const reportsTabs = document.querySelectorAll('.reports-tab');
  
  reportsTabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      const tabId = e.target.getAttribute('data-tab');
      showReportsTab(tabId);
    });
  });
}

// Show Reports Tab
function showReportsTab(tabId) {
  // Hide all tab contents
  document.querySelectorAll('.reports-tab-content').forEach(content => {
    content.classList.remove('active');
  });
  
  // Remove active class from all tabs
  document.querySelectorAll('.reports-tab').forEach(tab => {
    tab.classList.remove('active');
  });
  
  // Show selected tab content
  const selectedContent = document.getElementById(tabId);
  if (selectedContent) {
    selectedContent.classList.add('active');
  }
  
  // Add active class to clicked tab
  const selectedTab = document.querySelector(`[data-tab="${tabId}"]`);
  if (selectedTab) {
    selectedTab.classList.add('active');
  }
}

// Setup Report Filters
function setupReportFilters() {
  const periodFilter = document.getElementById('reportPeriodFilter');
  const compareFilter = document.getElementById('reportCompareFilter');
  const applyButton = document.getElementById('applyReportFilters');
  
  if (periodFilter) {
    periodFilter.addEventListener('change', handlePeriodChange);
  }
  
  if (applyButton) {
    applyButton.addEventListener('click', applyReportFilters);
  }
}

// Handle Period Change
function handlePeriodChange() {
  const periodFilter = document.getElementById('reportPeriodFilter');
  const customDateRange = document.getElementById('customDateRange');
  
  if (periodFilter.value === 'custom') {
    customDateRange.style.display = 'flex';
  } else {
    customDateRange.style.display = 'none';
  }
}

// Setup Report Actions
function setupReportActions() {
  const closeButton = document.getElementById('closeReport');
  const exportPdfButton = document.getElementById('exportReportPdf');
  const exportExcelButton = document.getElementById('exportReportExcel');
  const printButton = document.getElementById('printReport');
  
  if (closeButton) {
    closeButton.addEventListener('click', closeReport);
  }
  
  if (exportPdfButton) {
    exportPdfButton.addEventListener('click', exportReportPdf);
  }
  
  if (exportExcelButton) {
    exportExcelButton.addEventListener('click', exportReportExcel);
  }
  
  if (printButton) {
    printButton.addEventListener('click', printReport);
  }
}

// 🎯 MAIN REPORT GENERATION FUNCTION
async function generateReport(reportType) {
  console.log(`📊 Generating ${reportType} report...`);
  
  try {
    // Show loading state
    showReportLoading();
    
    // Store current report type
    currentReport = reportType;
    
    // Generate report based on type
    switch (reportType) {
      case 'profit-loss':
        await generateProfitLossReport();
        break;
      case 'balance-sheet':
        await generateBalanceSheetReport();
        break;
      case 'cash-flow':
        await generateCashFlowReport();
        break;
      case 'trial-balance':
        await generateTrialBalanceReport();
        break;
      case 'equity-changes':
        await generateEquityChangesReport();
        break;
      case 'sales-summary':
        await generateSalesSummaryReport();
        break;
      case 'customer-analysis':
        await generateCustomerAnalysisReport();
        break;
      case 'product-performance':
        await generateProductPerformanceReport();
        break;
      case 'ar-aging':
        await generateARAgingReport();
        break;
      case 'purchase-summary':
        await generatePurchaseSummaryReport();
        break;
      case 'supplier-analysis':
        await generateSupplierAnalysisReport();
        break;
      case 'inventory-valuation':
        await generateInventoryValuationReport();
        break;
      case 'ap-aging':
        await generateAPAgingReport();
        break;
      case 'stock-on-hand':
        await generateStockOnHandReport();
        break;
      case 'low-stock-alert':
        await generateLowStockAlertReport();
        break;
      case 'inventory-movement':
        await generateInventoryMovementReport();
        break;
      case 'costing-analysis':
        await generateCostingAnalysisReport();
        break;
      case 'bank-reconciliation':
        await generateBankReconciliationReport();
        break;
      case 'cash-position':
        await generateCashPositionReport();
        break;
      case 'transaction-analysis':
        await generateTransactionAnalysisReport();
        break;
      case 'executive-dashboard':
        await generateExecutiveDashboardReport();
        break;
      case 'kpi-scorecards':
        await generateKPIScorecardsReport();
        break;
      case 'trend-analysis':
        await generateTrendAnalysisReport();
        break;
      case 'variance-reports':
        await generateVarianceReportsReport();
        break;
      default:
        throw new Error(`Unknown report type: ${reportType}`);
    }
    
    // Show the report display area
    showReportDisplay();
    
  } catch (error) {
    console.error(`❌ Error generating ${reportType} report:`, error);
    showReportError(error.message);
  }
}

// 📊 FINANCIAL REPORTS
async function generateProfitLossReport() {
  console.log('📊 Generating Profit & Loss Report...');
  
  try {
    const dateRange = getReportDateRange();
    
    // Get GL data for the period
    const { data: glData, error } = await supabase
      .from('general_ledger')
      .select('*')
      .gte('transaction_date', dateRange.from.toISOString().split('T')[0])
      .lte('transaction_date', dateRange.to.toISOString().split('T')[0]);
    
    if (error) throw error;
    
    // Group by account type
    const revenue = {};
    const expenses = {};
    let totalRevenue = 0;
    let totalExpenses = 0;
    
    glData?.forEach(entry => {
      const account = (chartOfAccounts || chartOfAccountsData || [])
        .find(acc => (acc.account_code || acc.code) === entry.account_code);
      
      if (account) {
        const amount = (parseFloat(entry.credit_amount) || 0) - (parseFloat(entry.debit_amount) || 0);
        
        if (account.account_type === 'Revenue') {
          if (!revenue[entry.account_code]) {
            revenue[entry.account_code] = {
              name: entry.account_name,
              amount: 0
            };
          }
          revenue[entry.account_code].amount += amount;
          totalRevenue += amount;
        } else if (account.account_type === 'Expense') {
          if (!expenses[entry.account_code]) {
            expenses[entry.account_code] = {
              name: entry.account_name,
              amount: 0
            };
          }
          expenses[entry.account_code].amount += Math.abs(amount);
          totalExpenses += Math.abs(amount);
        }
      }
    });
    
    const netProfit = totalRevenue - totalExpenses;
    
    // Update report display
    updateReportTitle('Profit & Loss Statement', `${dateRange.from.toLocaleDateString()} to ${dateRange.to.toLocaleDateString()}`);
    
    const reportContent = document.getElementById('reportContent');
    reportContent.innerHTML = `
      <div class="financial-report">
        <table class="report-table">
          <thead>
            <tr>
              <th style="text-align: left;">Account</th>
              <th style="text-align: right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            <!-- REVENUE SECTION -->
            <tr class="section-header">
              <td><strong>REVENUE</strong></td>
              <td></td>
            </tr>
            ${Object.entries(revenue).map(([code, data]) => `
              <tr>
                <td style="padding-left: 20px;">${code} - ${data.name}</td>
                <td style="text-align: right;">${formatCurrency(data.amount)}</td>
              </tr>
            `).join('')}
            <tr class="subtotal">
              <td><strong>Total Revenue</strong></td>
              <td style="text-align: right;"><strong>${formatCurrency(totalRevenue)}</strong></td>
            </tr>
            
            <!-- EXPENSES SECTION -->
            <tr class="section-header">
              <td><strong>EXPENSES</strong></td>
              <td></td>
            </tr>
            ${Object.entries(expenses).map(([code, data]) => `
              <tr>
                <td style="padding-left: 20px;">${code} - ${data.name}</td>
                <td style="text-align: right;">${formatCurrency(data.amount)}</td>
              </tr>
            `).join('')}
            <tr class="subtotal">
              <td><strong>Total Expenses</strong></td>
              <td style="text-align: right;"><strong>${formatCurrency(totalExpenses)}</strong></td>
            </tr>
            
            <!-- NET PROFIT -->
            <tr class="total-line">
              <td><strong>NET PROFIT</strong></td>
              <td style="text-align: right; color: ${netProfit >= 0 ? '#059669' : '#dc2626'};"><strong>${formatCurrency(netProfit)}</strong></td>
            </tr>
          </tbody>
        </table>
      </div>
    `;
    
  } catch (error) {
    console.error('Error generating P&L report:', error);
    throw error;
  }
}

async function generateBalanceSheetReport() {
  console.log('📊 Generating Balance Sheet Report...');
  
  try {
    const dateRange = getReportDateRange();
    
    // Get GL data up to the end date
    const { data: glData, error } = await supabase
      .from('general_ledger')
      .select('*')
      .lte('transaction_date', dateRange.to.toISOString().split('T')[0]);
    
    if (error) throw error;
    
    // Calculate account balances
    const accountBalances = {};
    
    glData?.forEach(entry => {
      if (!accountBalances[entry.account_code]) {
        accountBalances[entry.account_code] = {
          name: entry.account_name,
          debit: 0,
          credit: 0,
          balance: 0
        };
      }
      
      accountBalances[entry.account_code].debit += parseFloat(entry.debit_amount) || 0;
      accountBalances[entry.account_code].credit += parseFloat(entry.credit_amount) || 0;
    });
    
    // Group by account type
    const assets = {};
    const liabilities = {};
    const equity = {};
    let totalAssets = 0;
    let totalLiabilities = 0;
    let totalEquity = 0;
    
    Object.entries(accountBalances).forEach(([code, data]) => {
      const account = (chartOfAccounts || chartOfAccountsData || [])
        .find(acc => (acc.account_code || acc.code) === code);
      
      if (account) {
        let balance = data.debit - data.credit;
        
        // Adjust for normal balance
        if (account.normal_balance === 'Credit') {
          balance = data.credit - data.debit;
        }
        
        if (account.account_type === 'Asset') {
          assets[code] = { name: data.name, balance };
          totalAssets += balance;
        } else if (account.account_type === 'Liability') {
          liabilities[code] = { name: data.name, balance };
          totalLiabilities += balance;
        } else if (account.account_type === 'Equity') {
          equity[code] = { name: data.name, balance };
          totalEquity += balance;
        }
      }
    });
    
    // Update report display
    updateReportTitle('Balance Sheet', `As at ${dateRange.to.toLocaleDateString()}`);
    
    const reportContent = document.getElementById('reportContent');
    reportContent.innerHTML = `
      <div class="financial-report">
        <table class="report-table">
          <thead>
            <tr>
              <th style="text-align: left;">Account</th>
              <th style="text-align: right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            <!-- ASSETS -->
            <tr class="section-header">
              <td><strong>ASSETS</strong></td>
              <td></td>
            </tr>
            ${Object.entries(assets).map(([code, data]) => `
              <tr>
                <td style="padding-left: 20px;">${code} - ${data.name}</td>
                <td style="text-align: right;">${formatCurrency(data.balance)}</td>
              </tr>
            `).join('')}
            <tr class="subtotal">
              <td><strong>Total Assets</strong></td>
              <td style="text-align: right;"><strong>${formatCurrency(totalAssets)}</strong></td>
            </tr>
            
            <!-- LIABILITIES -->
            <tr class="section-header">
              <td><strong>LIABILITIES</strong></td>
              <td></td>
            </tr>
            ${Object.entries(liabilities).map(([code, data]) => `
              <tr>
                <td style="padding-left: 20px;">${code} - ${data.name}</td>
                <td style="text-align: right;">${formatCurrency(data.balance)}</td>
              </tr>
            `).join('')}
            <tr class="subtotal">
              <td><strong>Total Liabilities</strong></td>
              <td style="text-align: right;"><strong>${formatCurrency(totalLiabilities)}</strong></td>
            </tr>
            
            <!-- EQUITY -->
            <tr class="section-header">
              <td><strong>EQUITY</strong></td>
              <td></td>
            </tr>
            ${Object.entries(equity).map(([code, data]) => `
              <tr>
                <td style="padding-left: 20px;">${code} - ${data.name}</td>
                <td style="text-align: right;">${formatCurrency(data.balance)}</td>
              </tr>
            `).join('')}
            <tr class="subtotal">
              <td><strong>Total Equity</strong></td>
              <td style="text-align: right;"><strong>${formatCurrency(totalEquity)}</strong></td>
            </tr>
            
            <!-- TOTAL -->
            <tr class="total-line">
              <td><strong>TOTAL LIABILITIES & EQUITY</strong></td>
              <td style="text-align: right;"><strong>${formatCurrency(totalLiabilities + totalEquity)}</strong></td>
            </tr>
          </tbody>
        </table>
      </div>
    `;
    
  } catch (error) {
    console.error('Error generating Balance Sheet:', error);
    throw error;
  }
}

async function generateTrialBalanceReport() {
  console.log('📊 Generating Trial Balance Report...');
  
  try {
    const dateRange = getReportDateRange();
    
    // Get GL data for the period
    const { data: glData, error } = await supabase
      .from('general_ledger')
      .select('*')
      .lte('transaction_date', dateRange.to.toISOString().split('T')[0]);
    
    if (error) throw error;
    
    // Calculate account balances
    const accountBalances = {};
    
    glData?.forEach(entry => {
      if (!accountBalances[entry.account_code]) {
        accountBalances[entry.account_code] = {
          name: entry.account_name,
          debit: 0,
          credit: 0
        };
      }
      
      accountBalances[entry.account_code].debit += parseFloat(entry.debit_amount) || 0;
      accountBalances[entry.account_code].credit += parseFloat(entry.credit_amount) || 0;
    });
    
    let totalDebits = 0;
    let totalCredits = 0;
    
    // Update report display
    updateReportTitle('Trial Balance', `As at ${dateRange.to.toLocaleDateString()}`);
    
    const reportContent = document.getElementById('reportContent');
    reportContent.innerHTML = `
      <div class="financial-report">
        <table class="report-table">
          <thead>
            <tr>
              <th style="text-align: left;">Account Code</th>
              <th style="text-align: left;">Account Name</th>
              <th style="text-align: right;">Debit</th>
              <th style="text-align: right;">Credit</th>
            </tr>
          </thead>
          <tbody>
            ${Object.entries(accountBalances).map(([code, data]) => {
              totalDebits += data.debit;
              totalCredits += data.credit;
              return `
                <tr>
                  <td>${code}</td>
                  <td>${data.name}</td>
                  <td style="text-align: right;">${data.debit > 0 ? formatCurrency(data.debit) : '-'}</td>
                  <td style="text-align: right;">${data.credit > 0 ? formatCurrency(data.credit) : '-'}</td>
                </tr>
              `;
            }).join('')}
            <tr class="total-line">
              <td colspan="2"><strong>TOTALS</strong></td>
              <td style="text-align: right;"><strong>${formatCurrency(totalDebits)}</strong></td>
              <td style="text-align: right;"><strong>${formatCurrency(totalCredits)}</strong></td>
            </tr>
          </tbody>
        </table>
        
        <div style="margin-top: 20px; padding: 15px; background: ${Math.abs(totalDebits - totalCredits) < 0.01 ? '#d1fae5' : '#fee2e2'}; border-radius: 8px;">
          <strong>Balance Check:</strong> 
          ${Math.abs(totalDebits - totalCredits) < 0.01 ? 
            '✅ Trial Balance is in balance' : 
            `❌ Out of balance by ${formatCurrency(Math.abs(totalDebits - totalCredits))}`
          }
        </div>
      </div>
    `;
    
  } catch (error) {
    console.error('Error generating Trial Balance:', error);
    throw error;
  }
}

// Add placeholder functions for other reports
async function generateCashFlowReport() {
  updateReportTitle('Cash Flow Statement', 'Coming Soon');
  document.getElementById('reportContent').innerHTML = `
    <div style="text-align: center; padding: 60px;">
      <div style="font-size: 48px; margin-bottom: 16px;">🚧</div>
      <h3>Cash Flow Statement</h3>
      <p style="color: #666;">This report is under development and will be available soon.</p>
    </div>
  `;
}

async function generateEquityChangesReport() {
  updateReportTitle('Statement of Changes in Equity', 'Coming Soon');
  document.getElementById('reportContent').innerHTML = `
    <div style="text-align: center; padding: 60px;">
      <div style="font-size: 48px; margin-bottom: 16px;">🚧</div>
      <h3>Statement of Changes in Equity</h3>
      <p style="color: #666;">This report is under development and will be available soon.</p>
    </div>
  `;
}

async function generateSalesSummaryReport() {
  updateReportTitle('Sales Summary Report', 'Coming Soon');
  document.getElementById('reportContent').innerHTML = `
    <div style="text-align: center; padding: 60px;">
      <div style="font-size: 48px; margin-bottom: 16px;">🚧</div>
      <h3>Sales Summary Report</h3>
      <p style="color: #666;">This report is under development and will be available soon.</p>
    </div>
  `;
}

async function generateCustomerAnalysisReport() {
  updateReportTitle('Customer Analysis Report', 'Coming Soon');
  document.getElementById('reportContent').innerHTML = `
    <div style="text-align: center; padding: 60px;">
      <div style="font-size: 48px; margin-bottom: 16px;">🚧</div>
      <h3>Customer Analysis Report</h3>
      <p style="color: #666;">This report is under development and will be available soon.</p>
    </div>
  `;
}

async function generateProductPerformanceReport() {
  updateReportTitle('Product Performance Report', 'Coming Soon');
  document.getElementById('reportContent').innerHTML = `
    <div style="text-align: center; padding: 60px;">
      <div style="font-size: 48px; margin-bottom: 16px;">🚧</div>
      <h3>Product Performance Report</h3>
      <p style="color: #666;">This report is under development and will be available soon.</p>
    </div>
  `;
}

async function generateARAgingReport() {
  updateReportTitle('Accounts Receivable Aging', 'Coming Soon');
  document.getElementById('reportContent').innerHTML = `
    <div style="text-align: center; padding: 60px;">
      <div style="font-size: 48px; margin-bottom: 16px;">🚧</div>
      <h3>Accounts Receivable Aging</h3>
      <p style="color: #666;">This report is under development and will be available soon.</p>
    </div>
  `;
}

async function generatePurchaseSummaryReport() {
  updateReportTitle('Purchase Summary Report', 'Coming Soon');
  document.getElementById('reportContent').innerHTML = `
    <div style="text-align: center; padding: 60px;">
      <div style="font-size: 48px; margin-bottom: 16px;">🚧</div>
      <h3>Purchase Summary Report</h3>
      <p style="color: #666;">This report is under development and will be available soon.</p>
    </div>
  `;
}

async function generateSupplierAnalysisReport() {
  updateReportTitle('Supplier Analysis Report', 'Coming Soon');
  document.getElementById('reportContent').innerHTML = `
    <div style="text-align: center; padding: 60px;">
      <div style="font-size: 48px; margin-bottom: 16px;">🚧</div>
      <h3>Supplier Analysis Report</h3>
      <p style="color: #666;">This report is under development and will be available soon.</p>
    </div>
  `;
}

async function generateInventoryValuationReport() {
  updateReportTitle('Inventory Valuation Report', 'Coming Soon');
  document.getElementById('reportContent').innerHTML = `
    <div style="text-align: center; padding: 60px;">
      <div style="font-size: 48px; margin-bottom: 16px;">🚧</div>
      <h3>Inventory Valuation Report</h3>
      <p style="color: #666;">This report is under development and will be available soon.</p>
    </div>
  `;
}

async function generateAPAgingReport() {
  updateReportTitle('Accounts Payable Aging', 'Coming Soon');
  document.getElementById('reportContent').innerHTML = `
    <div style="text-align: center; padding: 60px;">
      <div style="font-size: 48px; margin-bottom: 16px;">🚧</div>
      <h3>Accounts Payable Aging</h3>
      <p style="color: #666;">This report is under development and will be available soon.</p>
    </div>
  `;
}

async function generateStockOnHandReport() {
  updateReportTitle('Stock on Hand Report', 'Coming Soon');
  document.getElementById('reportContent').innerHTML = `
    <div style="text-align: center; padding: 60px;">
      <div style="font-size: 48px; margin-bottom: 16px;">🚧</div>
      <h3>Stock on Hand Report</h3>
      <p style="color: #666;">This report is under development and will be available soon.</p>
    </div>
  `;
}

async function generateLowStockAlertReport() {
  updateReportTitle('Low Stock Alert Report', 'Coming Soon');
  document.getElementById('reportContent').innerHTML = `
    <div style="text-align: center; padding: 60px;">
      <div style="font-size: 48px; margin-bottom: 16px;">🚧</div>
      <h3>Low Stock Alert Report</h3>
      <p style="color: #666;">This report is under development and will be available soon.</p>
    </div>
  `;
}

async function generateInventoryMovementReport() {
  updateReportTitle('Inventory Movement Report', 'Coming Soon');
  document.getElementById('reportContent').innerHTML = `
    <div style="text-align: center; padding: 60px;">
      <div style="font-size: 48px; margin-bottom: 16px;">🚧</div>
      <h3>Inventory Movement Report</h3>
      <p style="color: #666;">This report is under development and will be available soon.</p>
    </div>
  `;
}

async function generateCostingAnalysisReport() {
  updateReportTitle('Costing Analysis Report', 'Coming Soon');
  document.getElementById('reportContent').innerHTML = `
    <div style="text-align: center; padding: 60px;">
      <div style="font-size: 48px; margin-bottom: 16px;">🚧</div>
      <h3>Costing Analysis Report</h3>
      <p style="color: #666;">This report is under development and will be available soon.</p>
    </div>
  `;
}

async function generateBankReconciliationReport() {
  updateReportTitle('Bank Reconciliation Report', 'Coming Soon');
  document.getElementById('reportContent').innerHTML = `
    <div style="text-align: center; padding: 60px;">
      <div style="font-size: 48px; margin-bottom: 16px;">🚧</div>
      <h3>Bank Reconciliation Report</h3>
      <p style="color: #666;">This report is under development and will be available soon.</p>
    </div>
  `;
}

async function generateCashPositionReport() {
  updateReportTitle('Cash Position Report', 'Coming Soon');
  document.getElementById('reportContent').innerHTML = `
    <div style="text-align: center; padding: 60px;">
      <div style="font-size: 48px; margin-bottom: 16px;">🚧</div>
      <h3>Cash Position Report</h3>
      <p style="color: #666;">This report is under development and will be available soon.</p>
    </div>
  `;
}

async function generateTransactionAnalysisReport() {
  updateReportTitle('Transaction Analysis Report', 'Coming Soon');
  document.getElementById('reportContent').innerHTML = `
    <div style="text-align: center; padding: 60px;">
      <div style="font-size: 48px; margin-bottom: 16px;">🚧</div>
      <h3>Transaction Analysis Report</h3>
      <p style="color: #666;">This report is under development and will be available soon.</p>
    </div>
  `;
}

async function generateExecutiveDashboardReport() {
  updateReportTitle('Executive Dashboard', 'Coming Soon');
  document.getElementById('reportContent').innerHTML = `
    <div style="text-align: center; padding: 60px;">
      <div style="font-size: 48px; margin-bottom: 16px;">🚧</div>
      <h3>Executive Dashboard</h3>
      <p style="color: #666;">This report is under development and will be available soon.</p>
    </div>
  `;
}

async function generateKPIScorecardsReport() {
  updateReportTitle('KPI Scorecards', 'Coming Soon');
  document.getElementById('reportContent').innerHTML = `
    <div style="text-align: center; padding: 60px;">
      <div style="font-size: 48px; margin-bottom: 16px;">🚧</div>
      <h3>KPI Scorecards</h3>
      <p style="color: #666;">This report is under development and will be available soon.</p>
    </div>
  `;
}

async function generateTrendAnalysisReport() {
  updateReportTitle('Trend Analysis', 'Coming Soon');
  document.getElementById('reportContent').innerHTML = `
    <div style="text-align: center; padding: 60px;">
      <div style="font-size: 48px; margin-bottom: 16px;">🚧</div>
      <h3>Trend Analysis</h3>
      <p style="color: #666;">This report is under development and will be available soon.</p>
    </div>
  `;
}

async function generateVarianceReportsReport() {
  updateReportTitle('Variance Reports', 'Coming Soon');
  document.getElementById('reportContent').innerHTML = `
    <div style="text-align: center; padding: 60px;">
      <div style="font-size: 48px; margin-bottom: 16px;">🚧</div>
      <h3>Variance Reports</h3>
      <p style="color: #666;">This report is under development and will be available soon.</p>
    </div>
  `;
}

// Show Report Loading
function showReportLoading() {
  const reportContent = document.getElementById('reportContent');
  reportContent.innerHTML = `
    <div style="text-align: center; padding: 60px;">
      <div style="font-size: 48px; margin-bottom: 16px;">⏳</div>
      <h3>Generating Report...</h3>
      <p style="color: #666;">Please wait while we compile your data</p>
    </div>
  `;
  
  showReportDisplay();
}

// Show Report Display
function showReportDisplay() {
  const reportDisplayArea = document.getElementById('reportDisplayArea');
  reportDisplayArea.style.display = 'block';
  
  // Scroll to report
  reportDisplayArea.scrollIntoView({ behavior: 'smooth' });
}

// Show Report Error
function showReportError(message) {
  const reportContent = document.getElementById('reportContent');
  reportContent.innerHTML = `
    <div style="text-align: center; padding: 60px;">
      <div style="font-size: 48px; margin-bottom: 16px; color: #dc2626;">❌</div>
      <h3>Report Generation Failed</h3>
      <p style="color: #666;">${message}</p>
      <button onclick="generateReport('${currentReport}')" class="zande-btn" style="margin-top: 20px;">
        Try Again
      </button>
    </div>
  `;
}

// Close Report
function closeReport() {
  const reportDisplayArea = document.getElementById('reportDisplayArea');
  reportDisplayArea.style.display = 'none';
  currentReport = null;
}

// Apply Report Filters
function applyReportFilters() {
  if (currentReport) {
    generateReport(currentReport);
  }
}

// Export Report PDF
function exportReportPdf() {
  if (!currentReport) return;
  
  console.log('📄 Exporting report to PDF...');
  // PDF export implementation will be added
  showNotification('PDF export feature coming soon!', 'info');
}

// Export Report Excel
function exportReportExcel() {
  if (!currentReport) return;
  
  console.log('📊 Exporting report to Excel...');
  // Excel export implementation will be added
  showNotification('Excel export feature coming soon!', 'info');
}

// Print Report
function printReport() {
  if (!currentReport) return;
  
  console.log('🖨️ Printing report...');
  window.print();
}

// Get Report Date Range
function getReportDateRange() {
  const periodFilter = document.getElementById('reportPeriodFilter');
  const dateFrom = document.getElementById('reportDateFrom');
  const dateTo = document.getElementById('reportDateTo');
  
  const period = periodFilter.value;
  const today = new Date();
  let fromDate, toDate;
  
  switch (period) {
    case 'current-month':
      fromDate = new Date(today.getFullYear(), today.getMonth(), 1);
      toDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      break;
      
    case 'last-month':
      fromDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      toDate = new Date(today.getFullYear(), today.getMonth(), 0);
      break;
      
    case 'current-quarter':
      const quarter = Math.floor(today.getMonth() / 3);
      fromDate = new Date(today.getFullYear(), quarter * 3, 1);
      toDate = new Date(today.getFullYear(), (quarter + 1) * 3, 0);
      break;
      
    case 'last-quarter':
      const lastQuarter = Math.floor(today.getMonth() / 3) - 1;
      fromDate = new Date(today.getFullYear(), lastQuarter * 3, 1);
      toDate = new Date(today.getFullYear(), (lastQuarter + 1) * 3, 0);
      break;
      
    case 'current-year':
      fromDate = new Date(today.getFullYear(), 0, 1);
      toDate = new Date(today.getFullYear(), 11, 31);
      break;
      
    case 'last-year':
      fromDate = new Date(today.getFullYear() - 1, 0, 1);
      toDate = new Date(today.getFullYear() - 1, 11, 31);
      break;
      
    case 'custom':
      fromDate = dateFrom.value ? new Date(dateFrom.value) : new Date(today.getFullYear(), 0, 1);
      toDate = dateTo.value ? new Date(dateTo.value) : today;
      break;
      
    default:
      fromDate = new Date(today.getFullYear(), today.getMonth(), 1);
      toDate = today;
  }
  
  return {
    from: fromDate,
    to: toDate,
    period: period
  };
}

// Update Report Title and Meta
function updateReportTitle(title, subtitle = '') {
  const reportTitle = document.getElementById('reportTitle');
  const reportPeriod = document.getElementById('reportPeriod');
  const reportGenerated = document.getElementById('reportGenerated');
  
  if (reportTitle) {
    reportTitle.textContent = title;
  }
  
  if (reportPeriod) {
    reportPeriod.textContent = subtitle;
  }
  
  if (reportGenerated) {
    reportGenerated.textContent = `Generated: ${new Date().toLocaleDateString()}`;
  }
}

// Format Currency
function formatCurrency(amount) {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    minimumFractionDigits: 2
  }).format(amount || 0);
}

// Format Percentage
function formatPercentage(value) {
  return new Intl.NumberFormat('en-ZA', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  }).format(value || 0);
}

// Make reports functions globally available
window.initializeReportsModule = initializeReportsModule;
window.setupReportButtonListeners = setupReportButtonListeners;
window.setupReportsTabNavigation = setupReportsTabNavigation;
window.showReportLoading = showReportLoading;
window.showReportDisplay = showReportDisplay;
window.generateReport = generateReport;
window.showReportsTab = showReportsTab;
window.closeReport = closeReport;
window.applyReportFilters = applyReportFilters;
window.exportReportPdf = exportReportPdf;
window.exportReportExcel = exportReportExcel;
window.printReport = printReport;



// Add this to your app.js file

// Ensure reports module is properly initialized
document.addEventListener('DOMContentLoaded', function() {
  console.log('🚀 Setting up enhanced navigation...');
  
  // Setup navigation for all modules including reports
  document.querySelectorAll('[data-module]').forEach(item => {
    item.addEventListener('click', function() {
      const module = this.getAttribute('data-module');
      console.log('📍 Navigation clicked:', module);
      
      // Hide all sections
      document.querySelectorAll('.module-section').forEach(sec => {
        sec.style.display = 'none';
      });
      
      // Show selected section
      const sectionId = module === 'reports' ? 'reportsSection' : module + 'Section';
      console.log('🎯 Target section ID:', sectionId);
      
      const section = document.getElementById(sectionId);
      if (section) {
        section.style.display = 'block';
        console.log('✅ Section displayed:', sectionId);
        
        // Initialize module-specific functionality
        if (module === 'reports') {
          console.log('🔧 Initializing reports module...');
          
          // Make sure reports module is initialized
          if (typeof initializeReportsModule === 'function') {
            initializeReportsModule();
          }
          
          // DON'T assume a specific tab name - let the initialization handle it
          // The initializeReportsModule will find and show the first available tab
          
        } else if (module === 'general-ledger') {
          initializeGeneralLedger();
        } else if (module === 'chart-of-accounts') {
          initializeChartOfAccounts();
        }
      } else {
        console.error('❌ Section not found:', sectionId);
      }
      
      // Update active state in sidebar
      document.querySelectorAll('[data-module]').forEach(link => {
        link.classList.remove('active');
      });
      this.classList.add('active');
    });
  });
});

// Global function to show sections
function showSection(sectionId) {
  console.log('🔍 Attempting to show section:', sectionId);
  
  // Hide all sections
  const allSections = document.querySelectorAll('.module-section');
  console.log('📊 Found sections:', allSections.length);
  
  allSections.forEach(section => {
    section.style.display = 'none';
    console.log('🙈 Hiding section:', section.id);
  });
  
  // Show target section
  const targetSection = document.getElementById(sectionId);
  if (targetSection) {
    targetSection.style.display = 'block';
    console.log('✅ Section shown successfully:', sectionId);
    console.log('📏 Section content:', targetSection.innerHTML.length, 'characters');
    
    // Load data for the specific section
    loadSectionData(sectionId);
  } else {
    console.error('❌ Section not found:', sectionId);
  }
}

// Load data for specific sections
async function loadSectionData(sectionId) {
  console.log('📊 Loading data for section:', sectionId);
  
  // Check if Supabase is available
  if (!window.supabase) {
    console.error('❌ Supabase not available for data loading');
    return;
  }
  
  try {
    switch(sectionId) {
      case 'customersSection':
        if (typeof loadCustomers === 'function') {
          await loadCustomers();
          console.log('✅ Customers data loaded');
        } else {
          console.warn('⚠️ loadCustomers function not available');
        }
        break;
        
      case 'suppliersSection':
        if (typeof loadSuppliers === 'function') {
          await loadSuppliers();
          console.log('✅ Suppliers data loaded');
        } else {
          console.warn('⚠️ loadSuppliers function not available');
        }
        break;
        
      case 'productsSection':
        if (typeof loadProducts === 'function') {
          await loadProducts();
          console.log('✅ Products data loaded');
        } else {
          console.warn('⚠️ loadProducts function not available');
        }
        break;
        
      case 'salesSection':
        if (typeof loadSalesDocuments === 'function') {
          await loadSalesDocuments();
          console.log('✅ Sales data loaded');
        }
        if (typeof loadCustomersForSales === 'function') {
          await loadCustomersForSales();
          console.log('✅ Sales customers loaded');
        }
        break;
        
      case 'purchasesSection':
        if (typeof loadPurchases === 'function') {
          await loadPurchases();
          console.log('✅ Purchases data loaded');
        }
        if (typeof loadSuppliersForPurchases === 'function') {
          await loadSuppliersForPurchases();
          console.log('✅ Purchase suppliers loaded');
        }
        break;
        
      case 'expensesSection':
        if (typeof loadExpenses === 'function') {
          await loadExpenses();
          console.log('✅ Expenses data loaded');
        }
        if (typeof loadSuppliersForExpense === 'function') {
          await loadSuppliersForExpense();
          console.log('✅ Expense suppliers loaded');
        }
        break;
        
      case 'bankingSection':
        if (typeof loadBankAccounts === 'function') {
          await loadBankAccounts();
          console.log('✅ Bank accounts loaded');
        }
        if (typeof loadBankTransactions === 'function') {
          await loadBankTransactions();
          console.log('✅ Bank transactions loaded');
        }
        break;
        
      case 'reportsSection':
        if (typeof loadReports === 'function') {
          await loadReports();
          console.log('✅ Reports data loaded');
        }
        break;
        
      case 'chart-of-accountsSection':
        if (typeof loadChartOfAccounts === 'function') {
          await loadChartOfAccounts();
          console.log('✅ Chart of Accounts loaded');
        } else {
          console.warn('⚠️ loadChartOfAccounts function not available');
        }
        break;
        
      case 'dashboardSection':
        // Dashboard data is loaded by initializeDashboard()
        if (typeof initializeDashboard === 'function') {
          initializeDashboard();
          console.log('✅ Dashboard initialized');
        }
        break;
        
      default:
        console.log('ℹ️ No specific data loading for section:', sectionId);
    }
  } catch (error) {
    console.error('❌ Error loading section data:', error);
    showDashboardAlert('warning', `Failed to load ${sectionId} data. Please refresh and try again.`);
  }
}


// Make it globally available
window.showSection = showSection;

// ========================================
// MODERN DASHBOARD FUNCTIONS
// ========================================

// Refresh Dashboard Data
function refreshDashboard() {
  console.log('🔄 Refreshing dashboard data...');
  
  // Show loading state
  const refreshBtn = event.target;
  const originalText = refreshBtn.innerHTML;
  refreshBtn.innerHTML = '<span>⏳</span> Refreshing...';
  refreshBtn.disabled = true;
  
  // Simulate data refresh (replace with actual API calls)
  setTimeout(() => {
    // Update KPI values (these would come from your database)
    updateDashboardKPIs();
    updateRecentActivity();
    updateOutstandingItems();
    updateTopCustomers();
    updateFinancialSummary();
    
    // Reset button
    refreshBtn.innerHTML = originalText;
    refreshBtn.disabled = false;
    
    // Show success message
    showDashboardAlert('success', 'Dashboard data refreshed successfully!');
    
    console.log('✅ Dashboard refreshed successfully');
  }, 1500);
}

// Open Quick Actions Modal/Dropdown
function openQuickActions() {
  console.log('⚡ Opening quick actions...');
  
  // You can implement a modal or dropdown here
  // For now, let's show an alert
  const actions = [
    'Create Invoice - showSection("salesSection")',
    'Add Expense - showSection("expensesSection")',
    'Add Customer - showSection("customersSection")',
    'Add Product - showSection("productsSection")',
    'Bank Transaction - showSection("bankingSection")',
    'View Reports - showSection("reportsSection")'
  ];
  
  // Simple implementation - you can enhance this with a proper modal
  const choice = prompt('Quick Actions:\n' + actions.map((action, i) => `${i+1}. ${action.split(' - ')[0]}`).join('\n') + '\n\nEnter number (1-6):');
  
  if (choice && choice >= 1 && choice <= 6) {
    const sectionMappings = ['salesSection', 'expensesSection', 'customersSection', 'productsSection', 'bankingSection', 'reportsSection'];
    showSection(sectionMappings[choice - 1]);
  }
}

// Show Outstanding Tab (Invoices/Bills)
function showOutstandingTab(tabType) {
  console.log('📋 Switching to outstanding tab:', tabType);
  
  // Update tab buttons
  document.querySelectorAll('.outstanding-tab').forEach(tab => {
    tab.classList.remove('active');
  });
  event.target.classList.add('active');
  
  // Show/hide content
  document.getElementById('outstanding-invoices').style.display = tabType === 'invoices' ? 'block' : 'none';
  document.getElementById('outstanding-bills').style.display = tabType === 'bills' ? 'block' : 'none';
}

// Load Cash Flow Chart
function loadCashflowChart() {
  console.log('📊 Loading cash flow chart...');
  
  const chartContainer = document.getElementById('cashflowChart');
  const placeholder = chartContainer.querySelector('.chart-placeholder');
  
  // Show loading state
  placeholder.innerHTML = `
    <div class="chart-placeholder-icon">⏳</div>
    <div class="chart-placeholder-text">Loading chart data...</div>
  `;
  
  // Simulate chart loading (replace with actual chart library like Chart.js)
  setTimeout(() => {
    placeholder.innerHTML = `
      <div class="chart-placeholder-icon">📈</div>
      <div class="chart-placeholder-text">Cash flow chart loaded successfully!</div>
      <div style="margin-top: 20px; padding: 20px; background: var(--gray-100); border-radius: 8px;">
        <strong>Sample Data:</strong><br>
        Income: R 25,000 | Expenses: R 18,500 | Net: R 6,500
      </div>
      <button class="btn btn-sm btn-secondary" onclick="loadCashflowChart()" style="margin-top: 10px;">Refresh Chart</button>
    `;
    
    showDashboardAlert('success', 'Cash flow chart loaded successfully!');
  }, 2000);
}

// Update Dashboard KPIs
function updateDashboardKPIs() {
  // These would typically come from your database
  const kpis = {
    totalRevenue: 'R 125,750.00',
    outstandingInvoices: 'R 8,250.00',
    monthlyExpenses: 'R 45,200.00',
    netProfit: 'R 80,550.00'
  };
  
  Object.keys(kpis).forEach(kpi => {
    const element = document.getElementById(kpi);
    if (element) {
      element.textContent = kpis[kpi];
    }
  });
}

// Update Recent Activity
function updateRecentActivity() {
  const activities = [
    {
      icon: '📄',
      iconClass: 'bg-success-50',
      title: 'Invoice #INV-003 created',
      meta: 'Customer: New Corp • R 3,200.00',
      time: 'Just now'
    },
    {
      icon: '💳',
      iconClass: 'bg-error-50',
      title: 'Office supplies expense',
      meta: 'Staples • R 520.00',
      time: '1 hour ago'
    },
    {
      icon: '🏦',
      iconClass: 'bg-primary-50',
      title: 'Bank deposit received',
      meta: 'Standard Bank • R 7,500.00',
      time: '3 hours ago'
    }
  ];
  
  const activityContainer = document.getElementById('recentActivity');
  if (activityContainer) {
    activityContainer.innerHTML = activities.map(activity => `
      <div class="activity-item">
        <div class="activity-icon ${activity.iconClass}">${activity.icon}</div>
        <div class="activity-content">
          <div class="activity-title">${activity.title}</div>
          <div class="activity-meta">${activity.meta}</div>
          <div class="activity-time">${activity.time}</div>
        </div>
      </div>
    `).join('');
  }
}

// Update Outstanding Items
function updateOutstandingItems() {
  // Update counters in tabs
  const invoiceTab = document.querySelector('.outstanding-tab[onclick*="invoices"]');
  const billsTab = document.querySelector('.outstanding-tab[onclick*="bills"]');
  
  if (invoiceTab) invoiceTab.textContent = 'Invoices (5)';
  if (billsTab) billsTab.textContent = 'Bills (3)';
}

// Update Top Customers
function updateTopCustomers() {
  const customers = [
    { name: 'ABC Company', revenue: 'R 28,000.00', avatar: 'AB' },
    { name: 'XYZ Ltd', revenue: 'R 22,500.00', avatar: 'XY' },
    { name: 'QRS Corp', revenue: 'R 19,800.00', avatar: 'QR' }
  ];
  
  const customersContainer = document.getElementById('topCustomers');
  if (customersContainer) {
    customersContainer.innerHTML = customers.map(customer => `
      <div class="top-customer-item">
        <div class="customer-avatar">${customer.avatar}</div>
        <div class="customer-info">
          <div class="customer-name">${customer.name}</div>
          <div class="customer-revenue">${customer.revenue}</div>
        </div>
      </div>
    `).join('');
  }
}

// Update Financial Summary
function updateFinancialSummary() {
  const financials = {
    totalAssets: 'R 450,000.00',
    totalLiabilities: 'R 125,000.00',
    ownersEquity: 'R 325,000.00',
    workingCapital: 'R 85,000.00'
  };
  
  Object.keys(financials).forEach(item => {
    const element = document.getElementById(item);
    if (element) {
      element.textContent = financials[item];
    }
  });
}

// Show Dashboard Alert
function showDashboardAlert(type, message) {
  const alertsContainer = document.getElementById('dashboardAlerts');
  if (!alertsContainer) return;
  
  const alertId = 'alert_' + Date.now();
  const alertHTML = `
    <div class="dashboard-alert ${type}" id="${alertId}">
      <span>${type === 'success' ? '✅' : type === 'warning' ? '⚠️' : 'ℹ️'}</span>
      <span>${message}</span>
      <button onclick="document.getElementById('${alertId}').remove()" style="margin-left: auto; background: none; border: none; cursor: pointer; font-size: 1.2em;">×</button>
    </div>
  `;
  
  alertsContainer.insertAdjacentHTML('afterbegin', alertHTML);
  
  // Auto-remove after 5 seconds
  setTimeout(() => {
    const alert = document.getElementById(alertId);
    if (alert) alert.remove();
  }, 5000);
}

// Initialize Dashboard on Load
function initializeDashboard() {
  console.log('🚀 Initializing modern dashboard...');
  
  // Load initial data
  updateDashboardKPIs();
  updateRecentActivity();
  updateOutstandingItems();
  updateTopCustomers();
  updateFinancialSummary();
  
  // Show welcome message
  setTimeout(() => {
    showDashboardAlert('success', 'Welcome to your modern ZandeBooks dashboard!');
  }, 1000);
}

// ========================================
// ENHANCED GL POSTING SYSTEM
// ========================================

// Main GL Posting Function
async function postToGeneralLedger(transaction) {
  console.log('📝 Posting to General Ledger:', transaction);
  
  try {
    // Validate transaction
    if (!transaction.entries || transaction.entries.length === 0) {
      throw new Error('No journal entries provided');
    }
    
    // Check if debits equal credits
    const totalDebits = transaction.entries.reduce((sum, entry) => sum + (entry.debit_amount || 0), 0);
    const totalCredits = transaction.entries.reduce((sum, entry) => sum + (entry.credit_amount || 0), 0);
    
    if (Math.abs(totalDebits - totalCredits) > 0.01) {
      throw new Error(`Unbalanced entry: Debits ${totalDebits} ≠ Credits ${totalCredits}`);
    }
    
    // Create journal entry header
    const journalEntry = {
      journal_date: transaction.date,
      reference: transaction.reference,
      description: transaction.description,
      status: 'posted',
      total_amount: totalDebits,
      created_by: 'system', // You'll replace with actual user
      company_id: 'demo-company' // You'll replace with actual company_id
    };
    
    // Insert journal entry
    const { data: journalData, error: journalError } = await supabase
      .from('journal_entries')
      .insert([journalEntry])
      .select()
      .single();
    
    if (journalError) throw journalError;
    
    // Add journal_entry_id to each line
    const journalLines = transaction.entries.map(entry => ({
      ...entry,
      journal_entry_id: journalData.id
    }));
    
    // Insert journal lines
    const { data: linesData, error: linesError } = await supabase
      .from('journal_lines')
      .insert(journalLines)
      .select();
    
    if (linesError) throw linesError;
    
    // Post to General Ledger
    const glEntries = transaction.entries.map(entry => ({
      account_code: entry.account_code,
      account_name: entry.account_name,
      transaction_date: transaction.date,
      description: entry.description || transaction.description,
      reference: transaction.reference,
      debit_amount: entry.debit_amount || 0,
      credit_amount: entry.credit_amount || 0,
      source_module: transaction.source_module,
      source_document_id: transaction.source_document_id,
      source_document_type: transaction.source_document_type,
      posting_date: new Date().toISOString().split('T')[0],
      fiscal_year: new Date().getFullYear(),
      fiscal_period: new Date().getMonth() + 1,
      is_posted: true,
      created_by: 'system'
    }));
    
    const { data: glData, error: glError } = await supabase
      .from('general_ledger')
      .insert(glEntries)
      .select();
    
    if (glError) throw glError;
    
    console.log('✅ GL posting successful:', {
      journal_entry_id: journalData.id,
      lines_count: linesData.length,
      gl_entries_count: glData.length
    });
    
    return {
      success: true,
      journal_entry_id: journalData.id,
      gl_entries: glData
    };
    
  } catch (error) {
    console.error('❌ GL posting failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Sales Invoice GL Posting
async function postSalesInvoiceToGL(invoice) {
  const transaction = {
    date: invoice.document_date,
    reference: invoice.document_number,
    description: `Sales Invoice - ${invoice.customer_name}`,
    source_module: 'sales',
    source_document_id: invoice.id,
    source_document_type: 'invoice',
    entries: [
      {
        account_code: '1200',
        account_name: 'Accounts Receivable',
        description: `Invoice ${invoice.document_number} - ${invoice.customer_name}`,
        debit_amount: invoice.total_amount,
        credit_amount: 0
      },
      {
        account_code: '4000',
        account_name: 'Sales Revenue',
        description: `Invoice ${invoice.document_number} - ${invoice.customer_name}`,
        debit_amount: 0,
        credit_amount: invoice.subtotal
      }
    ]
  };
  
  // Add VAT entry if applicable
  if (invoice.tax_amount > 0) {
    transaction.entries.push({
      account_code: '2200',
      account_name: 'VAT Output',
      description: `VAT on Invoice ${invoice.document_number}`,
      debit_amount: 0,
      credit_amount: invoice.tax_amount
    });
  }
  
  return await postToGeneralLedger(transaction);
}

// Purchase GL Posting
async function postPurchaseToGL(purchase) {
  const transaction = {
    date: purchase.document_date,
    reference: purchase.document_number,
    description: `Purchase - ${purchase.supplier_name}`,
    source_module: 'purchases',
    source_document_id: purchase.id,
    source_document_type: 'purchase',
    entries: [
      {
        account_code: purchase.expense_account || '5000',
        account_name: 'Purchases',
        description: `Purchase ${purchase.document_number} - ${purchase.supplier_name}`,
        debit_amount: purchase.subtotal,
        credit_amount: 0
      },
      {
        account_code: '2100',
        account_name: 'Accounts Payable',
        description: `Purchase ${purchase.document_number} - ${purchase.supplier_name}`,
        debit_amount: 0,
        credit_amount: purchase.total_amount
      }
    ]
  };
  
  // Add VAT entry if applicable
  if (purchase.vat_amount > 0) {
    transaction.entries.push({
      account_code: '1300',
      account_name: 'VAT Input',
      description: `VAT on Purchase ${purchase.document_number}`,
      debit_amount: purchase.vat_amount,
      credit_amount: 0
    });
  }
  
  return await postToGeneralLedger(transaction);
}

// Expense GL Posting
async function postExpenseToGL(expense) {
  const transaction = {
    date: expense.date,
    reference: expense.reference || `EXP-${expense.id}`,
    description: expense.description,
    source_module: 'expenses',
    source_document_id: expense.id,
    source_document_type: 'expense',
    entries: [
      {
        account_code: expense.category === 'Office Supplies' ? '5100' : '5200',
        account_name: expense.category || 'General Expenses',
        description: expense.description,
        debit_amount: expense.amount - (expense.tax_amount || 0),
        credit_amount: 0
      },
      {
        account_code: expense.paid_from === 'petty_cash' ? '1100' : '1000',
        account_name: expense.paid_from === 'petty_cash' ? 'Petty Cash' : 'Bank Account',
        description: expense.description,
        debit_amount: 0,
        credit_amount: expense.amount
      }
    ]
  };
  
  // Add VAT entry if applicable
  if (expense.tax_amount > 0) {
    transaction.entries.push({
      account_code: '1300',
      account_name: 'VAT Input',
      description: `VAT on ${expense.description}`,
      debit_amount: expense.tax_amount,
      credit_amount: 0
    });
  }
  
  return await postToGeneralLedger(transaction);
}

// Bank Transaction GL Posting
async function postBankTransactionToGL(transaction_data) {
  const transaction = {
    date: transaction_data.transaction_date,
    reference: transaction_data.reference,
    description: transaction_data.description,
    source_module: 'banking',
    source_document_id: transaction_data.id,
    source_document_type: 'bank_transaction',
    entries: []
  };
  
  if (transaction_data.transaction_type === 'deposit') {
    transaction.entries = [
      {
        account_code: '1000',
        account_name: 'Bank Account',
        description: transaction_data.description,
        debit_amount: transaction_data.amount,
        credit_amount: 0
      },
      {
        account_code: transaction_data.category === 'sales' ? '4000' : '3000',
        account_name: transaction_data.category === 'sales' ? 'Sales Revenue' : 'Other Income',
        description: transaction_data.description,
        debit_amount: 0,
        credit_amount: transaction_data.amount
      }
    ];
  } else {
    transaction.entries = [
      {
        account_code: transaction_data.category === 'expense' ? '5000' : '6000',
        account_name: transaction_data.category === 'expense' ? 'Expenses' : 'Other Expenses',
        description: transaction_data.description,
        debit_amount: transaction_data.amount,
        credit_amount: 0
      },
      {
        account_code: '1000',
        account_name: 'Bank Account',
        description: transaction_data.description,
        debit_amount: 0,
        credit_amount: transaction_data.amount
      }
    ];
  }
  
  return await postToGeneralLedger(transaction);
}

// Auto-post functions that integrate with existing save functions
async function autoPostToGL(module, documentData) {
  if (!shouldAutoPostToGL(module)) {
    console.log(`🔄 Auto-posting disabled for ${module}`);
    return { success: true, message: 'Auto-posting disabled' };
  }
  
  try {
    let result;
    
    switch(module) {
      case 'sales':
        result = await postSalesInvoiceToGL(documentData);
        break;
      case 'purchases':
        result = await postPurchaseToGL(documentData);
        break;
      case 'expenses':
        result = await postExpenseToGL(documentData);
        break;
      case 'banking':
        result = await postBankTransactionToGL(documentData);
        break;
      default:
        throw new Error(`Unknown module: ${module}`);
    }
    
    if (result.success) {
      console.log(`✅ Auto-posted ${module} to GL:`, result.journal_entry_id);
      showDashboardAlert('success', `${module.charAt(0).toUpperCase() + module.slice(1)} posted to General Ledger successfully!`);
    } else {
      console.error(`❌ Auto-post failed for ${module}:`, result.error);
      showDashboardAlert('warning', `GL posting failed: ${result.error}`);
    }
    
    return result;
    
  } catch (error) {
    console.error(`❌ Auto-post error for ${module}:`, error);
    showDashboardAlert('error', `GL posting error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Make dashboard functions globally available
window.refreshDashboard = refreshDashboard;
window.openQuickActions = openQuickActions;
window.showOutstandingTab = showOutstandingTab;
window.loadCashflowChart = loadCashflowChart;
window.initializeDashboard = initializeDashboard;

// ========================================
// ADVANCED REPORTING SYSTEM
// ========================================

// Generate Trial Balance from GL
async function generateTrialBalance(asOfDate = null) {
  console.log('📊 Generating Trial Balance...');
  
  try {
    const endDate = asOfDate || new Date().toISOString().split('T')[0];
    
    // Get GL entries up to the specified date
    const { data: glEntries, error } = await supabase
      .from('general_ledger')
      .select('account_code, account_name, debit_amount, credit_amount')
      .lte('transaction_date', endDate)
      .eq('is_posted', true);
    
    if (error) throw error;
    
    // Group by account and calculate balances
    const accountBalances = {};
    
    glEntries.forEach(entry => {
      const key = entry.account_code;
      if (!accountBalances[key]) {
        accountBalances[key] = {
          account_code: entry.account_code,
          account_name: entry.account_name,
          debit_total: 0,
          credit_total: 0,
          balance: 0
        };
      }
      
      accountBalances[key].debit_total += entry.debit_amount || 0;
      accountBalances[key].credit_total += entry.credit_amount || 0;
    });
    
    // Calculate net balances
    const trialBalance = Object.values(accountBalances).map(account => {
      account.balance = account.debit_total - account.credit_total;
      return account;
    }).sort((a, b) => a.account_code.localeCompare(b.account_code));
    
    // Calculate totals
    const totals = trialBalance.reduce((sum, account) => ({
      total_debits: sum.total_debits + Math.max(account.balance, 0),
      total_credits: sum.total_credits + Math.abs(Math.min(account.balance, 0))
    }), { total_debits: 0, total_credits: 0 });
    
    console.log('✅ Trial Balance generated:', trialBalance.length, 'accounts');
    
    return {
      success: true,
      data: trialBalance,
      totals: totals,
      as_of_date: endDate
    };
    
  } catch (error) {
    console.error('❌ Trial Balance generation failed:', error);
    return { success: false, error: error.message };
  }
}

// Generate Profit & Loss Statement
async function generateProfitLoss(fromDate, toDate) {
  console.log('📈 Generating P&L Statement...');
  
  try {
    const { data: glEntries, error } = await supabase
      .from('general_ledger')
      .select('account_code, account_name, debit_amount, credit_amount')
      .gte('transaction_date', fromDate)
      .lte('transaction_date', toDate)
      .eq('is_posted', true);
    
    if (error) throw error;
    
    // Get chart of accounts for classification
    const { data: accounts, error: accountsError } = await supabase
      .from('chart_of_accounts')
      .select('account_code, account_name, account_type, account_category')
      .in('account_type', ['INCOME', 'EXPENSE']);
    
    if (accountsError) throw accountsError;
    
    // Create account lookup
    const accountLookup = {};
    accounts.forEach(acc => {
      accountLookup[acc.account_code] = acc;
    });
    
    // Group entries by account type
    const income = {};
    const expenses = {};
    
    glEntries.forEach(entry => {
      const account = accountLookup[entry.account_code];
      if (!account) return;
      
      const key = entry.account_code;
      const netAmount = (entry.credit_amount || 0) - (entry.debit_amount || 0);
      
      if (account.account_type === 'INCOME') {
        if (!income[key]) {
          income[key] = {
            account_code: entry.account_code,
            account_name: entry.account_name,
            amount: 0
          };
        }
        income[key].amount += netAmount;
      } else if (account.account_type === 'EXPENSE') {
        if (!expenses[key]) {
          expenses[key] = {
            account_code: entry.account_code,
            account_name: entry.account_name,
            amount: 0
          };
        }
        expenses[key].amount += Math.abs(netAmount);
      }
    });
    
    // Calculate totals
    const totalIncome = Object.values(income).reduce((sum, acc) => sum + acc.amount, 0);
    const totalExpenses = Object.values(expenses).reduce((sum, acc) => sum + acc.amount, 0);
    const netProfit = totalIncome - totalExpenses;
    
    const report = {
      period: { from: fromDate, to: toDate },
      income: Object.values(income).sort((a, b) => a.account_code.localeCompare(b.account_code)),
      expenses: Object.values(expenses).sort((a, b) => a.account_code.localeCompare(b.account_code)),
      totals: {
        total_income: totalIncome,
        total_expenses: totalExpenses,
        net_profit: netProfit
      }
    };
    
    console.log('✅ P&L Statement generated:', report);
    return { success: true, data: report };
    
  } catch (error) {
    console.error('❌ P&L generation failed:', error);
    return { success: false, error: error.message };
  }
}

// Generate Balance Sheet
async function generateBalanceSheet(asOfDate = null) {
  console.log('📊 Generating Balance Sheet...');
  
  try {
    const endDate = asOfDate || new Date().toISOString().split('T')[0];
    
    const { data: glEntries, error } = await supabase
      .from('general_ledger')
      .select('account_code, account_name, debit_amount, credit_amount')
      .lte('transaction_date', endDate)
      .eq('is_posted', true);
    
    if (error) throw error;
    
    // Get chart of accounts for classification
    const { data: accounts, error: accountsError } = await supabase
      .from('chart_of_accounts')
      .select('account_code, account_name, account_type, account_category')
      .in('account_type', ['ASSET', 'LIABILITY', 'EQUITY']);
    
    if (accountsError) throw accountsError;
    
    const accountLookup = {};
    accounts.forEach(acc => {
      accountLookup[acc.account_code] = acc;
    });
    
    // Group balances by type
    const assets = {};
    const liabilities = {};
    const equity = {};
    
    // Calculate account balances
    const accountBalances = {};
    glEntries.forEach(entry => {
      const key = entry.account_code;
      if (!accountBalances[key]) {
        accountBalances[key] = {
          account_code: entry.account_code,
          account_name: entry.account_name,
          balance: 0
        };
      }
      accountBalances[key].balance += (entry.debit_amount || 0) - (entry.credit_amount || 0);
    });
    
    // Classify balances
    Object.values(accountBalances).forEach(account => {
      const chartAccount = accountLookup[account.account_code];
      if (!chartAccount) return;
      
      const key = account.account_code;
      
      if (chartAccount.account_type === 'ASSET') {
        assets[key] = {
          account_code: account.account_code,
          account_name: account.account_name,
          amount: account.balance
        };
      } else if (chartAccount.account_type === 'LIABILITY') {
        liabilities[key] = {
          account_code: account.account_code,
          account_name: account.account_name,
          amount: Math.abs(account.balance)
        };
      } else if (chartAccount.account_type === 'EQUITY') {
        equity[key] = {
          account_code: account.account_code,
          account_name: account.account_name,
          amount: Math.abs(account.balance)
        };
      }
    });
    
    // Calculate totals
    const totalAssets = Object.values(assets).reduce((sum, acc) => sum + acc.amount, 0);
    const totalLiabilities = Object.values(liabilities).reduce((sum, acc) => sum + acc.amount, 0);
    const totalEquity = Object.values(equity).reduce((sum, acc) => sum + acc.amount, 0);
    
    const report = {
      as_of_date: endDate,
      assets: Object.values(assets).sort((a, b) => a.account_code.localeCompare(b.account_code)),
      liabilities: Object.values(liabilities).sort((a, b) => a.account_code.localeCompare(b.account_code)),
      equity: Object.values(equity).sort((a, b) => a.account_code.localeCompare(b.account_code)),
      totals: {
        total_assets: totalAssets,
        total_liabilities: totalLiabilities,
        total_equity: totalEquity,
        total_liabilities_equity: totalLiabilities + totalEquity
      }
    };
    
    console.log('✅ Balance Sheet generated:', report);
    return { success: true, data: report };
    
  } catch (error) {
    console.error('❌ Balance Sheet generation failed:', error);
    return { success: false, error: error.message };
  }
}

// Generate Age Analysis Report
async function generateAgeAnalysis(reportType = 'receivables') {
  console.log(`📊 Generating ${reportType} age analysis...`);
  
  try {
    const today = new Date();
    const table = reportType === 'receivables' ? 'sales_documents' : 'purchases';
    const amountField = 'total_amount';
    const dateField = reportType === 'receivables' ? 'due_date' : 'due_date';
    
    const { data: documents, error } = await supabase
      .from(table)
      .select('id, document_number, customer_name, supplier_name, total_amount, due_date, status')
      .eq('status', reportType === 'receivables' ? 'sent' : 'pending')
      .order('due_date', { ascending: true });
    
    if (error) throw error;
    
    const ageAnalysis = documents.map(doc => {
      const dueDate = new Date(doc.due_date);
      const daysDiff = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));
      
      let ageBucket;
      if (daysDiff <= 0) ageBucket = 'current';
      else if (daysDiff <= 30) ageBucket = '1-30';
      else if (daysDiff <= 60) ageBucket = '31-60';
      else if (daysDiff <= 90) ageBucket = '61-90';
      else ageBucket = '90+';
      
      return {
        ...doc,
        days_overdue: Math.max(daysDiff, 0),
        age_bucket: ageBucket,
        entity_name: doc.customer_name || doc.supplier_name
      };
    });
    
    // Group by age bucket
    const buckets = {
      current: { label: 'Current', amount: 0, count: 0, items: [] },
      '1-30': { label: '1-30 Days', amount: 0, count: 0, items: [] },
      '31-60': { label: '31-60 Days', amount: 0, count: 0, items: [] },
      '61-90': { label: '61-90 Days', amount: 0, count: 0, items: [] },
      '90+': { label: '90+ Days', amount: 0, count: 0, items: [] }
    };
    
    ageAnalysis.forEach(item => {
      const bucket = buckets[item.age_bucket];
      bucket.amount += item.total_amount;
      bucket.count += 1;
      bucket.items.push(item);
    });
    
    const totalAmount = Object.values(buckets).reduce((sum, bucket) => sum + bucket.amount, 0);
    
    console.log(`✅ ${reportType} age analysis generated:`, Object.keys(buckets).length, 'buckets');
    
    return {
      success: true,
      data: {
        report_type: reportType,
        as_of_date: today.toISOString().split('T')[0],
        buckets: buckets,
        total_amount: totalAmount,
        total_count: ageAnalysis.length
      }
    };
    
  } catch (error) {
    console.error(`❌ ${reportType} age analysis failed:`, error);
    return { success: false, error: error.message };
  }
}

// Make GL functions globally available
window.postToGeneralLedger = postToGeneralLedger;
window.postSalesInvoiceToGL = postSalesInvoiceToGL;
window.postPurchaseToGL = postPurchaseToGL;
window.postExpenseToGL = postExpenseToGL;
window.postBankTransactionToGL = postBankTransactionToGL;
window.autoPostToGL = autoPostToGL;

// Make reporting functions globally available
window.generateTrialBalance = generateTrialBalance;
window.generateProfitLoss = generateProfitLoss;
window.generateBalanceSheet = generateBalanceSheet;
window.generateAgeAnalysis = generateAgeAnalysis;

// Initialize Business Context
function initializeBusinessContext() {
  // This would typically come from your user's profile/company data
  const businessData = {
    name: "Demo Company Pty Ltd",
    type: "Retail Business", 
    initials: "DC",
    status: "active" // or "inactive"
  };
  
  // Update sidebar business info
  const businessInitials = document.getElementById('businessInitials');
  const businessNameSidebar = document.getElementById('businessNameSidebar');
  const businessType = document.getElementById('businessType');
  
  if (businessInitials) businessInitials.textContent = businessData.initials;
  if (businessNameSidebar) businessNameSidebar.textContent = businessData.name;
  if (businessType) businessType.textContent = businessData.type;
  
  // Update status indicator
  const statusIndicator = document.querySelector('.status-indicator');
  if (statusIndicator) {
    statusIndicator.className = `status-indicator ${businessData.status}`;
  }
  
  console.log('✅ Business context initialized:', businessData.name);
}

// Generate business initials from company name
function generateBusinessInitials(companyName) {
  return companyName
    .split(' ')
    .map(word => word.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');
}

// Initialize all section click handlers
function initializeSectionHandlers() {
  console.log('🔗 Initializing section handlers...');
  
  // Add click handlers to sidebar navigation
  const navItems = document.querySelectorAll('[data-module]');
  console.log('🔍 Found navigation items:', navItems.length);
  
  // Debug: List all found nav items
  navItems.forEach((item, index) => {
    const module = item.getAttribute('data-module');
    console.log(`📋 Nav item ${index + 1}:`, module, item);
  });
  
  navItems.forEach((item, index) => {
    console.log(`🔧 Adding click handler to item ${index + 1}:`, item.getAttribute('data-module'));
    
    item.addEventListener('click', function(event) {
      console.log('🎯 CLICK DETECTED on:', this.getAttribute('data-module'));
      event.preventDefault();
      event.stopPropagation();
      
      const module = this.getAttribute('data-module');
      
      // Map data-module to section ID - handle special cases
      let sectionId;
      switch(module) {
        case 'reports':
          sectionId = 'reportsSection';
          break;
        case 'general-ledger':
          sectionId = 'general-ledgerSection';
          break;
        case 'chart-of-accounts':
          sectionId = 'chart-of-accountsSection';
          break;
        default:
          sectionId = module + 'Section';
      }
      
      console.log('🚀 Navigation clicked:', module, '→', sectionId);
      
      // Update active nav item
      document.querySelectorAll('[data-module]').forEach(nav => nav.classList.remove('active'));
      this.classList.add('active');
      
      // Show section and load data
      showSection(sectionId);
    });
    
    // Also add a test click detector
    item.addEventListener('mousedown', function() {
      console.log('🖱️ MOUSEDOWN on:', this.getAttribute('data-module'));
    });
  });
  
  console.log('✅ Section handlers initialized for', navItems.length, 'items');
}

// Helper function for inline onclick handlers
window.navigateToSection = function(sectionId, moduleId) {
  console.log('🎯 navigateToSection called:', moduleId, '→', sectionId);
  
  // Update active nav item
  document.querySelectorAll('[data-module]').forEach(nav => nav.classList.remove('active'));
  const activeItem = document.querySelector(`[data-module="${moduleId}"]`);
  if (activeItem) {
    activeItem.classList.add('active');
  }
  
  // Show section and load data
  showSection(sectionId);
};

// Manual test function for debugging
window.testSidebar = function() {
  console.log('🧪 Testing sidebar functionality...');
  
  const navItems = document.querySelectorAll('[data-module]');
  console.log('Found nav items:', navItems.length);
  
  navItems.forEach((item, index) => {
    console.log(`Item ${index + 1}:`, item.getAttribute('data-module'), item);
  });
  
  if (navItems.length > 0) {
    console.log('🎯 Testing click on first item...');
    navItems[0].click();
  }
};

// Simple window.onload backup
window.addEventListener('load', function() {
  console.log('🔥 WINDOW LOAD - Initializing sidebar as backup...');
  
  setTimeout(() => {
    const navItems = document.querySelectorAll('[data-module]');
    console.log('🔥 WINDOW LOAD - Found', navItems.length, 'nav items');
    
    if (navItems.length > 0) {
      navItems.forEach((item) => {
        // Add distinctive class to identify our handlers
        if (!item.classList.contains('zb-handler-added')) {
          item.classList.add('zb-handler-added');
          
          item.addEventListener('click', function() {
            console.log('🔥 WINDOW LOAD HANDLER - Clicked:', this.getAttribute('data-module'));
            
            const module = this.getAttribute('data-module');
            let sectionId;
            
            switch(module) {
              case 'reports':
                sectionId = 'reportsSection';
                break;
              case 'general-ledger':
                sectionId = 'general-ledgerSection';
                break;
              case 'chart-of-accounts':
                sectionId = 'chart-of-accountsSection';
                break;
              default:
                sectionId = module + 'Section';
            }
            
            console.log('🔥 Navigating to:', sectionId);
            
            // Update active nav item
            document.querySelectorAll('[data-module]').forEach(nav => nav.classList.remove('active'));
            this.classList.add('active');
            
            // Show section
            showSection(sectionId);
          });
        }
      });
    }
  }, 1000);
});

// Auto-initialize everything when page loads
document.addEventListener('DOMContentLoaded', function() {
  console.log('🚀 ZandeBooks app initializing...');
  
  try {
    // Check if Supabase is available
    if (!window.supabase) {
      console.error('❌ Supabase not available');
      return;
    }
    console.log('✅ Supabase client available');
    
    // Initialize business context
    initializeBusinessContext();
    
    // Initialize customer modals
    if (typeof initializeCustomerModals === 'function') {
      initializeCustomerModals();
    }
    
    // Force a delay to ensure DOM is fully ready
    setTimeout(() => {
      console.log('🔧 Delayed initialization of section handlers...');
      initializeSectionHandlers();
      
      // Additional backup initialization
      setTimeout(() => {
        console.log('🔧 Backup initialization...');
        const navItems = document.querySelectorAll('[data-module]');
        if (navItems.length === 0) {
          console.error('❌ No navigation items found!');
        } else {
          console.log('✅ Found', navItems.length, 'navigation items for backup init');
          
          // Force click handlers again
          navItems.forEach((item, index) => {
            // Remove any existing handlers first
            const clone = item.cloneNode(true);
            item.parentNode.replaceChild(clone, item);
            
            // Add fresh handler
            clone.addEventListener('click', function() {
              console.log('🎯 BACKUP HANDLER - Clicked:', this.getAttribute('data-module'));
              
              const module = this.getAttribute('data-module');
              let sectionId;
              
              switch(module) {
                case 'reports':
                  sectionId = 'reportsSection';
                  break;
                case 'general-ledger':
                  sectionId = 'general-ledgerSection';
                  break;
                case 'chart-of-accounts':
                  sectionId = 'chart-of-accountsSection';
                  break;
                default:
                  sectionId = module + 'Section';
              }
              
              // Update active nav item
              document.querySelectorAll('[data-module]').forEach(nav => nav.classList.remove('active'));
              this.classList.add('active');
              
              // Show section
              showSection(sectionId);
            });
          });
        }
      }, 500);
    }, 100);
    
    // Show dashboard by default
    const dashboardSection = document.getElementById('dashboardSection');
    if (dashboardSection) {
      // Hide all sections first
      document.querySelectorAll('.module-section').forEach(section => {
        section.style.display = 'none';
      });
      
      // Show dashboard
      dashboardSection.style.display = 'block';
      
      // Initialize dashboard
      if (typeof initializeDashboard === 'function') {
        initializeDashboard();
      }
      
      // Load dashboard data
      loadSectionData('dashboardSection');
      
      console.log('✅ Dashboard shown and initialized');
    } else {
      console.error('❌ Dashboard section not found');
    }
    
    // Set dashboard as active in navigation
    const dashboardNav = document.querySelector('[data-module="dashboard"]');
    if (dashboardNav) {
      dashboardNav.classList.add('active');
    }
    
    console.log('✅ ZandeBooks app initialized successfully');
    
    // Show initialization success to user
    setTimeout(() => {
      if (typeof showDashboardAlert === 'function') {
        showDashboardAlert('success', 'ZandeBooks loaded successfully! Click any menu item to view your data.');
      }
    }, 1000);
    
  } catch (error) {
    console.error('❌ ZandeBooks initialization failed:', error);
    
    // Show error to user
    setTimeout(() => {
      if (typeof showDashboardAlert === 'function') {
        showDashboardAlert('error', 'ZandeBooks failed to initialize. Please refresh the page.');
      }
    }, 1000);
  }
});

// ========================================
// CHART OF ACCOUNTS LOADING
// ========================================

async function loadChartOfAccounts() {
  console.log('📊 Loading Chart of Accounts...');
  
  const tbody = document.querySelector('#chartOfAccountsTable tbody');
  if (!tbody) {
    console.error('❌ COA table tbody not found');
    return;
  }
  
  // Show loading state
  tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 40px;"><div class="loading-spinner">⏳ Loading Chart of Accounts...</div></td></tr>';
  
  try {
    // Get current user
    const { data: { user }, error: userError } = await window.supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('User not authenticated');
    }
    
    // Get user's profile to get company_id
    const { data: profile, error: profileError } = await window.supabase
      .from('profiles')
      .select('id, company_id, industry_type')
      .eq('id', user.id)
      .single();
    
    if (profileError) {
      console.error('Profile error:', profileError);
      throw new Error('Failed to load user profile');
    }
    
    const companyId = profile.company_id || profile.id;
    console.log('🏢 Loading COA for company:', companyId);
    
    // Try to load existing COA
    const { data: coaData, error: coaError } = await window.supabase
      .from('chart_of_accounts')
      .select('*')
      .eq('company_id', companyId)
      .order('account_code');
    
    if (coaError) {
      console.error('COA query error:', coaError);
      // Table might not exist yet, show demo data
      loadDemoChartOfAccounts();
      return;
    }
    
    if (!coaData || coaData.length === 0) {
      console.log('📝 No COA found for this company');
      
      // Try to load template using COA Engine if available
      if (window.coaEngine && typeof window.coaEngine.loadCOATemplate === 'function') {
        console.log('🔧 Loading COA template using COA Engine...');
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 40px;"><div class="loading-spinner">⚙️ Setting up your Chart of Accounts...</div></td></tr>';
        
        try {
          const industryType = profile.industry_type || 'GENERAL';
          const result = await window.coaEngine.loadCOATemplate(companyId, industryType, user.id);
          
          if (result.success) {
            console.log('✅ COA template loaded successfully:', result.accountsCreated, 'accounts');
            // Reload the data
            const { data: newCoaData } = await window.supabase
              .from('chart_of_accounts')
              .select('*')
              .eq('company_id', companyId)
              .order('account_code');
            
            if (newCoaData && newCoaData.length > 0) {
              displayCOAData(newCoaData);
              updateCOASummary(newCoaData);
              showSuccessNotification('✅ Chart of Accounts initialized with ' + industryType + ' template!');
            } else {
              throw new Error('Failed to reload COA after template load');
            }
          } else {
            throw new Error(result.error || 'Failed to load COA template');
          }
        } catch (templateError) {
          console.error('❌ Error loading COA template:', templateError);
          console.log('⚠️ Falling back to demo data');
          loadDemoChartOfAccounts(profile.industry_type);
        }
      } else {
        // COA Engine not available, show demo data
        console.log('⚠️ COA Engine not loaded, showing demo data');
        loadDemoChartOfAccounts(profile.industry_type);
      }
      return;
    }
    
    // Display actual COA data from database
    console.log('✅ Found', coaData.length, 'accounts in database');
    displayCOAData(coaData);
    updateCOASummary(coaData);
    
  } catch (error) {
    console.error('❌ Error loading COA:', error);
    // Fallback to demo data
    loadDemoChartOfAccounts();
  }
}

function loadDemoChartOfAccounts(industryType = 'GENERAL') {
  console.log('📋 Loading demo COA for industry:', industryType);
  
  // Demo Chart of Accounts - Basic IFRS for SMEs structure
  const demoCOA = [
    // ASSETS
    { code: '1000', name: 'ASSETS', type: 'Asset', category: 'Header', balance: 'Debit', status: 'Active' },
    { code: '1100', name: 'Current Assets', type: 'Asset', category: 'Header', balance: 'Debit', status: 'Active' },
    { code: '1110', name: 'Cash and Cash Equivalents', type: 'Asset', category: 'Bank', balance: 'Debit', status: 'Active' },
    { code: '1120', name: 'Accounts Receivable', type: 'Asset', category: 'Receivables', balance: 'Debit', status: 'Active' },
    { code: '1130', name: 'Inventory', type: 'Asset', category: 'Inventory', balance: 'Debit', status: 'Active' },
    { code: '1140', name: 'Prepaid Expenses', type: 'Asset', category: 'Other Current Assets', balance: 'Debit', status: 'Active' },
    { code: '1200', name: 'Non-Current Assets', type: 'Asset', category: 'Header', balance: 'Debit', status: 'Active' },
    { code: '1210', name: 'Property, Plant & Equipment', type: 'Asset', category: 'Fixed Assets', balance: 'Debit', status: 'Active' },
    { code: '1220', name: 'Accumulated Depreciation', type: 'Asset', category: 'Fixed Assets', balance: 'Credit', status: 'Active' },
    { code: '1230', name: 'Intangible Assets', type: 'Asset', category: 'Fixed Assets', balance: 'Debit', status: 'Active' },
    
    // LIABILITIES
    { code: '2000', name: 'LIABILITIES', type: 'Liability', category: 'Header', balance: 'Credit', status: 'Active' },
    { code: '2100', name: 'Current Liabilities', type: 'Liability', category: 'Header', balance: 'Credit', status: 'Active' },
    { code: '2110', name: 'Accounts Payable', type: 'Liability', category: 'Payables', balance: 'Credit', status: 'Active' },
    { code: '2120', name: 'VAT Payable', type: 'Liability', category: 'Tax Liabilities', balance: 'Credit', status: 'Active' },
    { code: '2130', name: 'Salaries Payable', type: 'Liability', category: 'Payables', balance: 'Credit', status: 'Active' },
    { code: '2140', name: 'Short-term Loans', type: 'Liability', category: 'Loans', balance: 'Credit', status: 'Active' },
    { code: '2200', name: 'Non-Current Liabilities', type: 'Liability', category: 'Header', balance: 'Credit', status: 'Active' },
    { code: '2210', name: 'Long-term Loans', type: 'Liability', category: 'Loans', balance: 'Credit', status: 'Active' },
    
    // EQUITY
    { code: '3000', name: 'EQUITY', type: 'Equity', category: 'Header', balance: 'Credit', status: 'Active' },
    { code: '3100', name: 'Share Capital', type: 'Equity', category: 'Capital', balance: 'Credit', status: 'Active' },
    { code: '3200', name: 'Retained Earnings', type: 'Equity', category: 'Retained Earnings', balance: 'Credit', status: 'Active' },
    { code: '3300', name: 'Current Year Earnings', type: 'Equity', category: 'Current Earnings', balance: 'Credit', status: 'Active' },
    
    // REVENUE
    { code: '4000', name: 'REVENUE', type: 'Revenue', category: 'Header', balance: 'Credit', status: 'Active' },
    { code: '4100', name: 'Sales Revenue', type: 'Revenue', category: 'Sales', balance: 'Credit', status: 'Active' },
    { code: '4200', name: 'Service Revenue', type: 'Revenue', category: 'Sales', balance: 'Credit', status: 'Active' },
    { code: '4300', name: 'Other Income', type: 'Revenue', category: 'Other Income', balance: 'Credit', status: 'Active' },
    { code: '4400', name: 'Interest Income', type: 'Revenue', category: 'Other Income', balance: 'Credit', status: 'Active' },
    
    // EXPENSES
    { code: '5000', name: 'COST OF SALES', type: 'Expense', category: 'Header', balance: 'Debit', status: 'Active' },
    { code: '5100', name: 'Cost of Goods Sold', type: 'Expense', category: 'Cost of Sales', balance: 'Debit', status: 'Active' },
    { code: '5200', name: 'Direct Labor', type: 'Expense', category: 'Cost of Sales', balance: 'Debit', status: 'Active' },
    
    { code: '6000', name: 'OPERATING EXPENSES', type: 'Expense', category: 'Header', balance: 'Debit', status: 'Active' },
    { code: '6100', name: 'Salaries and Wages', type: 'Expense', category: 'Payroll', balance: 'Debit', status: 'Active' },
    { code: '6200', name: 'Rent Expense', type: 'Expense', category: 'Occupancy', balance: 'Debit', status: 'Active' },
    { code: '6300', name: 'Utilities', type: 'Expense', category: 'Occupancy', balance: 'Debit', status: 'Active' },
    { code: '6400', name: 'Office Supplies', type: 'Expense', category: 'Administrative', balance: 'Debit', status: 'Active' },
    { code: '6500', name: 'Marketing & Advertising', type: 'Expense', category: 'Sales & Marketing', balance: 'Debit', status: 'Active' },
    { code: '6600', name: 'Depreciation Expense', type: 'Expense', category: 'Depreciation', balance: 'Debit', status: 'Active' },
    { code: '6700', name: 'Insurance', type: 'Expense', category: 'Administrative', balance: 'Debit', status: 'Active' },
    { code: '6800', name: 'Bank Charges', type: 'Expense', category: 'Financial', balance: 'Debit', status: 'Active' },
    { code: '6900', name: 'Interest Expense', type: 'Expense', category: 'Financial', balance: 'Debit', status: 'Active' },
  ];
  
  displayCOAData(demoCOA, true);
  updateCOASummary(demoCOA);
}

function displayCOAData(coaData, isDemo = false) {
  const tbody = document.querySelector('#chartOfAccountsTable tbody');
  if (!tbody) return;
  
  if (!coaData || coaData.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 40px;"><div style="color: #666;"><p>No accounts found</p><small>Click "Add Account" to create your first account</small></div></td></tr>';
    return;
  }
  
  let html = '';
  
  coaData.forEach(account => {
    const isHeader = account.category === 'Header';
    const rowClass = isHeader ? 'coa-header-row' : '';
    const statusBadge = account.status === 'Active' 
      ? '<span class="status-badge status-active">Active</span>' 
      : '<span class="status-badge status-inactive">Inactive</span>';
    
    html += `
      <tr class="${rowClass}">
        <td><strong>${account.code || account.account_code}</strong></td>
        <td>${isHeader ? '<strong>' + account.name + '</strong>' : account.name || account.account_name}</td>
        <td>${account.type || account.account_type}</td>
        <td>${account.category || account.sub_type || '-'}</td>
        <td>${account.balance || account.normal_balance || 'Debit'}</td>
        <td>${statusBadge}</td>
        <td>
          ${!isHeader ? `
            <button class="btn-icon" onclick="editAccount('${account.id || account.code}')" title="Edit">
              <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
            <button class="btn-icon" onclick="deleteAccount('${account.id || account.code}')" title="Delete">
              <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
              </svg>
            </button>
          ` : '<span style="color: #999;">—</span>'}
        </td>
      </tr>
    `;
  });
  
  tbody.innerHTML = html;
  console.log(`✅ Displayed ${coaData.length} accounts`);
}

function updateCOASummary(coaData) {
  const assetCount = coaData.filter(a => a.type === 'Asset' || a.account_type === 'Asset').length;
  const liabilityCount = coaData.filter(a => a.type === 'Liability' || a.account_type === 'Liability').length;
  const revenueCount = coaData.filter(a => a.type === 'Revenue' || a.account_type === 'Revenue').length;
  const expenseCount = coaData.filter(a => a.type === 'Expense' || a.account_type === 'Expense').length;
  
  const assetEl = document.getElementById('totalAssets');
  const liabilityEl = document.getElementById('totalLiabilities');
  const revenueEl = document.getElementById('totalRevenue');
  const expenseEl = document.getElementById('totalExpense');
  
  if (assetEl) assetEl.textContent = assetCount;
  if (liabilityEl) liabilityEl.textContent = liabilityCount;
  if (revenueEl) revenueEl.textContent = revenueCount;
  if (expenseEl) expenseEl.textContent = expenseCount;
}

// Success notification helper
function showSuccessNotification(message) {
  if (typeof showDashboardAlert === 'function') {
    showDashboardAlert('success', message);
  } else {
    console.log('✅', message);
  }
}

// Make COA functions globally available
window.loadChartOfAccounts = loadChartOfAccounts;
window.editAccount = function(accountId) {
  console.log('Edit account:', accountId);
  alert('Edit functionality coming soon!');
};
window.deleteAccount = function(accountId) {
  console.log('Delete account:', accountId);
  if (confirm('Are you sure you want to delete this account?')) {
    alert('Delete functionality coming soon!');
  }
};
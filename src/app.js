// Loaded via global script tag

// Global Application State
let currentUser = null;
let activePatients = [];
let activeVitals = [];
let selectedPatient = null;
let selectedTests = []; // Array of test IDs
let selectedAdvice = []; // Array of advice IDs
let financePeriod = 'day';
let currentBillItems = [];

// Doctor configuration state (local caches)
let doctorTemplates = [];
let doctorDrugs = [];
let doctorTests = [];
let doctorAdvice = [];
let doctorDrugCategories = [];

// Initialize Page
document.addEventListener('DOMContentLoaded', async () => {
  setupEventListeners();
  await checkDBStatus();
  restoreSession();
});

// Sync Database Connection Badge Status
async function checkDBStatus() {
  const badge = document.getElementById('db-status-badge');
  const dot = document.getElementById('db-status-dot');
  const text = document.getElementById('db-status-text');

  const cloudConnected = await DB.isCloudAvailable();
  if (cloudConnected) {
    dot.className = 'dot green';
    text.textContent = 'Netlify Cloud (Connected)';
  } else {
    dot.className = 'dot yellow';
    text.textContent = 'Local Storage DB (Active)';
  }
}

// Hashchange listener for secret admin path access
window.addEventListener('hashchange', () => {
  if (window.location.hash.includes('superadmin') && !currentUser && !portalAccount) {
    showView('view-login');
  }
});

// Session Router
function restoreSession() {
  const isSuperadminPath = 
    window.location.pathname.endsWith('/superadmin') || 
    window.location.pathname.endsWith('/superadmin/') || 
    window.location.hash.includes('superadmin') || 
    window.location.search.includes('superadmin');

  // Check for admin/staff/doctor session first
  const cachedUser = sessionStorage.getItem('mediflow_session');
  if (cachedUser) {
    currentUser = JSON.parse(cachedUser);
    loginSuccess(currentUser);
    return;
  }
  // Check for patient session
  const patientSession = sessionStorage.getItem('mediflow_patient_session');
  if (patientSession) {
    const account = JSON.parse(patientSession);
    portalSessionRestore(account);
    return;
  }

  if (isSuperadminPath) {
    showView('view-login');
  } else {
    // Default: show landing page
    showPortalView('view-landing');
  }
}

function showView(viewId) {
  // Hide all admin/staff/doctor screens
  ['view-login', 'view-admin', 'view-clinic-admin', 'view-staff', 'view-doctor'].forEach(id => {
    document.getElementById(id).classList.add('hidden');
  });
  // Also hide patient nav and patient views
  const patientNav = document.getElementById('patient-nav');
  if (patientNav) patientNav.classList.add('hidden');
  ['view-landing','view-patient-auth','view-clinic-selector','view-patient-booking','view-patient-dashboard'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
  });

  // Show target screen
  document.getElementById(viewId).classList.remove('fade-in');
  document.getElementById(viewId).classList.remove('hidden');
  void document.getElementById(viewId).offsetWidth;
  document.getElementById(viewId).classList.add('fade-in');

  // Toggle main navigation visibility
  const mainNav = document.getElementById('main-nav');
  if (viewId === 'view-login') {
    mainNav.classList.add('hidden');

    // Toggle visibility of Super Admin login button based on url path/hash/search
    const isSuperadminPath = 
      window.location.pathname.endsWith('/superadmin') || 
      window.location.pathname.endsWith('/superadmin/') || 
      window.location.hash.includes('superadmin') || 
      window.location.search.includes('superadmin');
    const adminBtn = document.getElementById('quick-role-admin');
    if (adminBtn) {
      if (isSuperadminPath) {
        adminBtn.classList.remove('hidden');
      } else {
        adminBtn.classList.add('hidden');
      }
    }
  } else {
    mainNav.classList.remove('hidden');
    document.body.className = '';
    if (currentUser) {
      if (currentUser.role === 'admin') document.body.className = 'role-admin';
      else if (currentUser.role === 'clinic_admin') document.body.className = 'role-cadmin';
      else if (currentUser.role === 'staff') document.body.className = 'role-staff';
      else if (currentUser.role === 'doctor') document.body.className = 'role-doctor';
    }
  }
}

// Show clinic admin login (hides all patient UI)
function showClinicLogin() {
  ['view-landing','view-patient-auth','view-clinic-selector','view-patient-booking','view-patient-dashboard'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
  });
  const patientNav = document.getElementById('patient-nav');
  if (patientNav) patientNav.classList.add('hidden');
  showView('view-login');
}

// -------------------------------------------------------------
// EVENT LISTENERS CONFIG
// -------------------------------------------------------------
function setupEventListeners() {
  // Auth
  document.getElementById('login-form').addEventListener('submit', handleLogin);
  document.getElementById('logout-btn').addEventListener('click', handleLogout);

  // Theme switch
  document.getElementById('theme-toggle-btn').addEventListener('click', toggleTheme);

  // Super Admin actions
  document.getElementById('admin-add-clinic-btn').addEventListener('click', () => openClinicModal());
  document.getElementById('clinic-form').addEventListener('submit', handleClinicSubmit);
  
  // Super Admin Clinic Admin actions
  document.getElementById('admin-add-cadmin-btn').addEventListener('click', () => {
    document.getElementById('cadmin-modal-title').textContent = 'Register New Clinic Administrator';
    document.getElementById('cadmin-form-username').removeAttribute('disabled');
    document.getElementById('cadmin-form-password').setAttribute('required', 'true');
    document.getElementById('cadmin-user-form').reset();
    populateModalDropdowns();
    openModal('modal-clinic-admin');
  });
  document.getElementById('cadmin-user-form').addEventListener('submit', handleClinicAdminSubmit);

  // Clinic Admin actions
  document.getElementById('cadmin-add-user-btn').addEventListener('click', () => openUserModal());
  document.getElementById('user-form').addEventListener('submit', handleUserSubmit);
  document.getElementById('user-form-role').addEventListener('change', toggleDoctorCustomFields);
  
  // Header Logo Upload (Netlify Blobs)
  const headerUpload = document.getElementById('clinic-header-upload');
  if (headerUpload) {
    headerUpload.addEventListener('change', handleClinicHeaderUpload);
  }

  // Staff actions
  document.getElementById('staff-add-patient-btn').addEventListener('click', () => openPatientModal());
  document.getElementById('patient-form').addEventListener('submit', handlePatientSubmit);
  document.getElementById('vitals-form').addEventListener('submit', handleVitalsSubmit);
  
  // Staff Patient Search (Real-time Instant Suggest)
  const staffSearchInput = document.getElementById('staff-patient-search-input');
  if (staffSearchInput) {
    staffSearchInput.addEventListener('input', searchStaffPatients);
  }
  
  // Staff Appointments
  document.getElementById('staff-book-apt-btn').addEventListener('click', () => {
    document.getElementById('appointment-modal-title').textContent = 'Book Patient Appointment';
    document.getElementById('appointment-form-id').value = '';
    document.getElementById('appointment-form').reset();
    populateModalDropdowns();
    openModal('modal-book-appointment');
  });
  document.getElementById('appointment-form').addEventListener('submit', handleAppointmentSubmit);

  // Staff Billing & Insurance
  document.getElementById('staff-add-bill-btn').addEventListener('click', () => {
    currentBillItems = [];
    document.getElementById('bill-items-container').innerHTML = '';
    document.getElementById('bill-form').reset();
    document.getElementById('bill-form-id').value = '';
    calculateBillTotals();
    populateModalDropdowns();
    openModal('modal-create-bill');
  });
  document.getElementById('bill-form').addEventListener('submit', handleBillSubmit);

  document.getElementById('staff-add-insurance-btn').addEventListener('click', () => {
    document.getElementById('insurance-form').reset();
    populateModalDropdowns();
    openModal('modal-patient-insurance');
  });
  document.getElementById('cell-edit-form').addEventListener('submit', handleCellEditSubmit);

  // Doctor actions
  document.getElementById('doc-patient-search').addEventListener('input', filterPatients);
  document.getElementById('specialty-selector').addEventListener('change', renderDoctorTemplates);
  document.getElementById('drug-category-selector').addEventListener('change', renderDoctorDrugs);
  document.getElementById('print-plain-paper-toggle').addEventListener('change', updatePrintLogoHeader);
  document.getElementById('doctor-print-btn').addEventListener('click', openPrescriptionPrintPreview);

  // Dynamic config CRUD buttons (Doctor)
  document.getElementById('add-template-btn').addEventListener('click', () => openDoctorItemModal('template'));
  document.getElementById('add-drug-btn').addEventListener('click', () => openDoctorItemModal('drug'));
  document.getElementById('add-test-btn').addEventListener('click', () => openDoctorItemModal('test'));
  document.getElementById('add-advice-btn').addEventListener('click', () => openDoctorItemModal('advice'));
  document.getElementById('doc-item-form').addEventListener('submit', handleDoctorItemSubmit);

  // Real-time canvas typing mirror to print paper preview
  const canvasIds = ['cc', 'signs', 'history', 'allergies', 'diagnosis', 'prescription'];
  canvasIds.forEach(id => {
    const el = document.getElementById(`canvas-${id}`);
    if (el) {
      el.addEventListener('input', syncCanvasToPrintPreview);
    }
  });

  // Cadmin Appointments & Billing Search Event Listeners
  const cadminAptSearch = document.getElementById('cadmin-apt-search-input');
  if (cadminAptSearch) {
    cadminAptSearch.addEventListener('input', renderCadminAppointments);
  }
  const cadminAptBillingSearch = document.getElementById('cadmin-apt-billing-search-input');
  if (cadminAptBillingSearch) {
    cadminAptBillingSearch.addEventListener('input', renderCadminAppointmentsBilling);
  }

  // Doctor Slots Config (Clinic Admin)
  const slotsForm = document.getElementById('doctor-slots-form');
  if (slotsForm) {
    slotsForm.addEventListener('submit', handleDoctorSlotsSubmit);
  }
  const s2Active = document.getElementById('slots-s2-active');
  if (s2Active) {
    s2Active.addEventListener('change', (e) => {
      const s2Row = document.getElementById('slots-s2-row');
      if (s2Row) {
        if (e.target.checked) {
          s2Row.classList.remove('hidden');
        } else {
          s2Row.classList.add('hidden');
        }
      }
    });
  }
}

// -------------------------------------------------------------
// THEME CONFIG
// -------------------------------------------------------------
function toggleTheme() {
  document.body.classList.toggle('light-theme');
  const isLight = document.body.classList.contains('light-theme');
  localStorage.setItem('mediflow_light_theme', isLight ? 'true' : 'false');
}

// Restore saved theme on startup
if (localStorage.getItem('mediflow_light_theme') === 'true') {
  document.body.classList.add('light-theme');
}

// -------------------------------------------------------------
// 1. AUTH / ROUTING CONTROL
// -------------------------------------------------------------
async function handleLogin(e) {
  e.preventDefault();
  const usernameInput = document.getElementById('login-username').value.trim();
  const passwordInput = document.getElementById('login-password').value;

  const users = await DB.request('getUsers');
  const user = users.find(u => u.username.toLowerCase() === usernameInput.toLowerCase() && u.password === passwordInput);

  if (user) {
    // Check if account status is Suspended
    if (user.status === 'Suspended') {
      alert('Access Denied: Your account has been suspended by the Super Admin.');
      return;
    }

    // Clinic Admin: log directly into their assigned clinic workspace
    if (user.role === 'clinic_admin') {
      if (!user.clinicId) {
        alert('Access Denied: No clinic has been assigned to this administrator. Please contact the Super Admin.');
        return;
      }
      const clinics = await DB.request('getClinics');
      const assignedClinic = clinics.find(c => c.id === user.clinicId);
      if (!assignedClinic) {
        alert('Access Denied: The assigned clinic does not exist in the system database.');
        return;
      }
      if (assignedClinic.subscription !== 'Active') {
        alert('Access Denied: The assigned clinic subscription is suspended or inactive. Please contact the Super Admin.');
        return;
      }

      currentUser = user;
      sessionStorage.setItem('mediflow_session', JSON.stringify(currentUser));
      loginSuccess(currentUser);
      return;
    }

    // Check if subscription active for Staff / Doctors
    if (user.clinicId) {
      const clinics = await DB.request('getClinics');
      const clinic = clinics.find(c => c.id === user.clinicId);
      if (!clinic || clinic.subscription !== 'Active') {
        alert('Access Denied: The clinic subscription is currently suspended or inactive. Please contact the Super Admin.');
        return;
      }
    }

    // Save attendance log for staff login
    if (user.role === 'staff') {
      const attId = `ATT-${Date.now()}`;
      const attendanceEntry = {
        id: attId,
        clinicId: user.clinicId,
        username: user.username,
        name: user.name,
        loginTime: new Date().toISOString(),
        logoutTime: null,
        date: new Date().toISOString().split('T')[0]
      };
      await DB.request('saveAttendance', attendanceEntry);
      sessionStorage.setItem('mediflow_attendance_id', attId);
    }

    currentUser = user;
    sessionStorage.setItem('mediflow_session', JSON.stringify(currentUser));
    loginSuccess(currentUser);
  } else {
    alert('Access Failed: Invalid Username or Password.');
  }
}

async function confirmClinicAdminLogin() {
  const dropdown = document.getElementById('login-clinic-dropdown');
  const selectedClinicId = dropdown.value;
  if (!selectedClinicId) {
    alert('Please select a clinic workspace.');
    return;
  }

  const user = window._tempLoginUser;
  if (!user) return;

  // Assign selected clinic workspace context
  user.clinicId = selectedClinicId;
  currentUser = user;
  sessionStorage.setItem('mediflow_session', JSON.stringify(currentUser));
  closeModal('modal-login-clinic-select');

  loginSuccess(currentUser);
  window._tempLoginUser = null;
}

async function handleLogout() {
  if (currentUser && currentUser.role === 'staff') {
    const attId = sessionStorage.getItem('mediflow_attendance_id');
    if (attId) {
      const logs = await DB.request('getAttendance', { clinicId: currentUser.clinicId });
      const entry = logs.find(l => l.id === attId);
      if (entry) {
        entry.logoutTime = new Date().toISOString();
        await DB.request('saveAttendance', entry);
      }
      sessionStorage.removeItem('mediflow_attendance_id');
    }
  }
  currentUser = null;
  selectedPatient = null;
  selectedTests = [];
  selectedAdvice = [];
  teardownClinicChat();
  sessionStorage.removeItem('mediflow_session');
  showView('view-login');
}

async function loginSuccess(user) {
  // Enforce database-assigned clinicId for non-superadmin users to prevent sessionStorage hijacking
  if (user.role !== 'admin') {
    const dbUsers = await DB.request('getUsers');
    const dbUser = dbUsers.find(u => u.username.toLowerCase() === user.username.toLowerCase());
    if (dbUser) {
      user.clinicId = dbUser.clinicId;
      currentUser = user;
      sessionStorage.setItem('mediflow_session', JSON.stringify(currentUser));
    } else {
      handleLogout();
      return;
    }
  }

  // Update header labels
  if (user.clinicId) {
    try {
      const clinics = await DB.request('getClinics');
      const clinic = clinics.find(c => c.id === user.clinicId);
      const clinicName = clinic ? clinic.name : 'Unknown';
      document.getElementById('nav-user-name').textContent = `${user.name} (${clinicName})`;
    } catch (e) {
      document.getElementById('nav-user-name').textContent = user.name;
    }
  } else if (user.role === 'admin') {
    document.getElementById('nav-user-name').textContent = `${user.name} (Super Admin)`;
  } else {
    document.getElementById('nav-user-name').textContent = user.name;
  }
  document.getElementById('nav-user-role').textContent = user.role.replace('_', ' ');

  // Toggle Weekly Schedule button visibility (hidden for Super Admin)
  const schedBtn = document.getElementById('view-schedule-btn');
  if (schedBtn) {
    if (user.role === 'admin') {
      schedBtn.classList.add('hidden');
    } else {
      schedBtn.classList.remove('hidden');
    }
  }

  // Direct to correct portal dashboard
  switch (user.role) {
    case 'admin':
      showView('view-admin');
      loadSuperAdminDashboard();
      break;
    case 'clinic_admin':
      showView('view-clinic-admin');
      loadClinicAdminDashboard();
      break;
    case 'staff':
      showView('view-staff');
      setupStaffTabs(user);
      break;
    case 'doctor':
      showView('view-doctor');
      loadDoctorDashboard();
      break;
  }
  initClinicChat();
}

// -------------------------------------------------------------
// 2. SUPER ADMIN MODULE
// -------------------------------------------------------------
async function loadSuperAdminDashboard() {
  const clinics = await DB.request('getClinics');
  const users = await DB.request('getUsers');
  
  // Count clinics and clinic admin profiles
  document.getElementById('stat-clinics-count').textContent = clinics.length;
  
  const cAdmins = users.filter(u => u.role === 'clinic_admin');
  document.getElementById('stat-admins-count').textContent = cAdmins.length;

  // Render Clinics
  const tbody = document.querySelector('#clinics-table tbody');
  tbody.innerHTML = '';
  clinics.forEach(clinic => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${clinic.id}</strong></td>
      <td>${clinic.name}</td>
      <td>${clinic.city || '—'}</td>
      <td>
        <span class="user-badge" style="background-color: ${clinic.subscription === 'Active' ? 'rgba(16,185,129,0.1)' : 'rgba(244,63,94,0.1)'}; color: ${clinic.subscription === 'Active' ? '#10b981' : '#f43f5e'}; border: 1px solid rgba(255,255,255,0.05);">
          ${clinic.subscription}
        </span>
      </td>
      <td>
        <button class="btn btn-secondary btn-sm" onclick="editClinic('${clinic.id}')">Edit</button>
        <button class="btn btn-secondary btn-sm btn-danger" onclick="deleteClinic('${clinic.id}')">Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // Render Clinic Admins
  const tbodyAdmins = document.querySelector('#admins-table tbody');
  if (tbodyAdmins) {
    tbodyAdmins.innerHTML = '';
    cAdmins.forEach(admin => {
      const clinic = clinics.find(c => c.id === admin.clinicId);
      const clinicName = clinic ? clinic.name : 'Unknown';
      const statusText = admin.status || 'Active';
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${admin.username}</strong></td>
        <td>${admin.name} <span class="text-muted" style="font-size:0.75rem;">(${clinicName})</span></td>
        <td>${clinicName} (${admin.clinicId})</td>
        <td>
          <span class="user-badge" style="background-color: ${statusText === 'Active' ? 'rgba(16,185,129,0.1)' : 'rgba(244,63,94,0.1)'}; color: ${statusText === 'Active' ? '#10b981' : '#f43f5e'}; border: 1px solid rgba(255,255,255,0.05);">
            ${statusText}
          </span>
        </td>
        <td>
          <button class="btn btn-secondary btn-sm" onclick="editClinicAdmin('${admin.username}', '${admin.name}', '${admin.clinicId}', '${statusText}')">Edit</button>
          <button class="btn btn-secondary btn-sm ${statusText === 'Active' ? 'btn-danger' : ''}" onclick="toggleSuspendClinicAdmin('${admin.username}')">
            ${statusText === 'Active' ? 'Suspend' : 'Activate'}
          </button>
          <button class="btn btn-secondary btn-sm btn-danger" onclick="deleteClinicAdmin('${admin.username}')">Delete</button>
        </td>
      `;
      tbodyAdmins.appendChild(tr);
    });
  }

  // Populate Clinic Admin Form Clinics Selector
  const clinicSelect = document.getElementById('cadmin-form-clinic');
  if (clinicSelect) {
    clinicSelect.innerHTML = clinics.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  }

  // Populate Clinic Payments table
  renderClinicPayments();

  // Populate Prospective inquiries
  renderSuperAdminInquiries();
}

window.editClinic = async function(id) {
  const clinics = await DB.request('getClinics');
  const clinic = clinics.find(c => c.id === id);
  if (!clinic) return;

  document.getElementById('clinic-modal-title').textContent = 'Modify Clinic Profile';
  document.getElementById('clinic-form-id').value = clinic.id;
  document.getElementById('clinic-form-name').value = clinic.name;
  document.getElementById('clinic-form-subscription').value = clinic.subscription;
  document.getElementById('clinic-form-city').value = clinic.city || '';
  document.getElementById('clinic-form-address').value = clinic.address || '';
  document.getElementById('clinic-form-phone').value = clinic.phone || '';
  document.getElementById('clinic-form-upi').value = clinic.upiId || '';
  document.getElementById('clinic-form-fee').value = clinic.consultationFee || 0;
  openModal('modal-clinic');
};

async function deleteClinic(id) {
  if (confirm('Are you sure you want to delete this clinic registry? This action will suspend access for all users belonging to this clinic.')) {
    await DB.request('deleteClinic', { id });
    loadSuperAdminDashboard();
  }
}

function openClinicModal() {
  document.getElementById('clinic-modal-title').textContent = 'Register New Clinic Profile';
  document.getElementById('clinic-form-id').value = '';
  document.getElementById('clinic-form').reset();
  openModal('modal-clinic');
}

async function handleClinicSubmit(e) {
  e.preventDefault();
  const id = document.getElementById('clinic-form-id').value || `clinic-${Date.now()}`;
  const name = document.getElementById('clinic-form-name').value.trim();
  const subscription = document.getElementById('clinic-form-subscription').value;
  const city = document.getElementById('clinic-form-city').value.trim();
  const address = document.getElementById('clinic-form-address').value.trim();
  const phone = document.getElementById('clinic-form-phone').value.trim();
  const upiId = document.getElementById('clinic-form-upi').value.trim();
  const consultationFee = parseFloat(document.getElementById('clinic-form-fee').value) || 0;

  await DB.request('saveClinic', { 
    id, 
    name, 
    subscription, 
    logoUrl: '',
    city,
    address,
    phone,
    upiId,
    consultationFee
  });
  closeModal('modal-clinic');
  loadSuperAdminDashboard();
}

// -------------------------------------------------------------
// 3. CLINIC ADMIN MODULE (FACILITY CONSOLE)
// -------------------------------------------------------------
async function loadClinicAdminDashboard() {
  await populateModalDropdowns();
  switchCadminTab('users');
}

async function loadClinicAdminDashboardCore() {
  const users = await DB.request('getUsers');
  const clinics = await DB.request('getClinics');
  
  // Find current clinic
  const clinic = clinics.find(c => c.id === currentUser.clinicId);
  document.getElementById('clinic-admin-title').textContent = clinic ? clinic.name : 'Clinic Control Center';
  document.getElementById('clinic-admin-subtitle').textContent = `Manager: ${currentUser.name} (Clinic ID: ${currentUser.clinicId})`;

  // Filter users scoped strictly to this clinic
  const clinicUsers = users.filter(u => u.clinicId === currentUser.clinicId);
  
  const tbody = document.querySelector('#clinic-users-table tbody');
  tbody.innerHTML = '';

  clinicUsers.forEach(user => {
    const tr = document.createElement('tr');
    const userStatus = user.status || 'Active';
    
    let statusBg = 'rgba(16,185,129,0.1)';
    let statusColor = '#10b981';
    if (userStatus === 'On Leave') {
      statusBg = 'rgba(245,158,11,0.1)';
      statusColor = '#f59e0b';
    }

    tr.innerHTML = `
      <td><strong>${user.username}</strong></td>
      <td>${user.name} <span class="text-muted" style="font-size:0.75rem;">(${clinic ? clinic.name : 'Unknown'})</span></td>
      <td>
        <span class="user-badge" style="background: ${user.role === 'doctor' ? 'rgba(56,189,248,0.1)' : 'rgba(129,140,248,0.1)'}; color: ${user.role === 'doctor' ? '#38bdf8' : '#818cf8'}; border: 1px solid rgba(255,255,255,0.05);">
          ${user.role.toUpperCase()}
        </span>
      </td>
      <td>
        <span class="user-badge" style="background: ${statusBg}; color: ${statusColor}; border: 1px solid rgba(255,255,255,0.05);">
          ${userStatus}
        </span>
      </td>
      <td>
        <div style="display:flex; gap:0.25rem;">
          <button class="btn btn-secondary btn-sm" onclick="editUser('${user.username}', '${user.name}', '${user.role}', '${user.qualification || ''}', '${user.designation || ''}')">Edit</button>
          ${user.role === 'doctor' ? `<button class="btn btn-secondary btn-sm" style="border-color:#38bdf8; color:#a5f3fc;" onclick="openDoctorSlotsModal('${user.username}', '${user.name.replace(/'/g, "\\'")}')">Slots</button>` : ''}
          <button class="btn btn-secondary btn-sm" style="background:${userStatus === 'Active' ? 'rgba(245,158,11,0.2)' : 'rgba(16,185,129,0.2)'}; color:${userStatus === 'Active' ? '#f59e0b' : '#10b981'};" onclick="toggleUserLeave('${user.username}')">
            ${userStatus === 'Active' ? 'Leave' : 'Active'}
          </button>
          <button class="btn btn-secondary btn-sm btn-danger" onclick="deleteUser('${user.username}')">Remove</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // Fetch logo header configuration
  const headerUrl = await DB.getClinicHeader(currentUser.clinicId);
  const previewImg = document.getElementById('clinic-header-preview');
  const emptyDiv = document.getElementById('clinic-header-empty');
  if (headerUrl) {
    previewImg.src = headerUrl;
    previewImg.classList.remove('hidden');
    emptyDiv.classList.add('hidden');
  } else {
    previewImg.classList.add('hidden');
    emptyDiv.classList.remove('hidden');
  }
}

async function populateUserFormSpecialityOptions() {
  const select = document.getElementById('user-form-speciality');
  if (!select) return;
  const specs = await DB.request('getSpecialities', { clinicId: currentUser.clinicId });
  select.innerHTML = '<option value="">— Select Speciality —</option>' +
    specs.map(s => `<option value="${s.name}">${s.name}</option>`).join('');
}

window.editUser = async function(username, name, role, qual, desig) {
  document.getElementById('user-modal-title').textContent = 'Modify User Profile';
  document.getElementById('user-form-username').value = username;
  document.getElementById('user-form-username').setAttribute('disabled', 'true');
  document.getElementById('user-form-password').removeAttribute('required');
  document.getElementById('user-form-name').value = name;
  document.getElementById('user-form-role').value = role;
  
  document.getElementById('user-form-qual').value = qual;
  document.getElementById('user-form-desig').value = desig;
  
  // Prefill permissions and speciality (need full user object)
  const users = await DB.request('getUsers');
  const user = users.find(u => u.username === username);
  const perms = (user && user.permissions) || [];
  document.getElementById('user-perm-reception').checked = perms.includes('reception');
  document.getElementById('user-perm-finance').checked = perms.includes('finance');
  
  await populateUserFormSpecialityOptions();
  const specialityEl = document.getElementById('user-form-speciality');
  if (specialityEl && user) specialityEl.value = user.speciality || '';

  toggleDoctorCustomFields();
  openModal('modal-user');
};

async function deleteUser(username) {
  if (currentUser.username === username) {
    alert('Invalid Operation: Cannot delete your own authenticated login session.');
    return;
  }
  if (confirm(`Remove access profile "${username}" from this clinic database?`)) {
    await DB.request('deleteUser', { username });
    loadClinicAdminDashboard();
  }
}

async function openUserModal() {
  document.getElementById('user-modal-title').textContent = 'Add Clinic User Profile';
  document.getElementById('user-form-username').removeAttribute('disabled');
  document.getElementById('user-form-password').setAttribute('required', 'true');
  document.getElementById('user-form').reset();
  
  await populateUserFormSpecialityOptions();
  
  // Default staff permissions checked
  document.getElementById('user-perm-reception').checked = true;
  document.getElementById('user-perm-finance').checked = true;

  toggleDoctorCustomFields();
  openModal('modal-user');
}

function toggleDoctorCustomFields() {
  const role = document.getElementById('user-form-role').value;
  const customFields = document.getElementById('doctor-custom-fields');
  const staffFields = document.getElementById('staff-permission-fields');
  if (role === 'doctor') {
    customFields.classList.remove('hidden');
    staffFields.classList.add('hidden');
  } else {
    customFields.classList.add('hidden');
    staffFields.classList.remove('hidden');
  }
}

async function handleUserSubmit(e) {
  e.preventDefault();
  const username = document.getElementById('user-form-username').value.trim();
  const name = document.getElementById('user-form-name').value.trim();
  const role = document.getElementById('user-form-role').value;
  const password = document.getElementById('user-form-password').value;
  
  const qualification = role === 'doctor' ? document.getElementById('user-form-qual').value.trim() : '';
  const designation = role === 'doctor' ? document.getElementById('user-form-desig').value.trim() : '';
  const speciality = role === 'doctor' ? (document.getElementById('user-form-speciality') ? document.getElementById('user-form-speciality').value.trim() : '') : '';

  // Gather permissions if staff
  const permissions = [];
  if (role === 'staff') {
    if (document.getElementById('user-perm-reception').checked) permissions.push('reception');
    if (document.getElementById('user-perm-finance').checked) permissions.push('finance');
  }

  const users = await DB.request('getUsers');
  const existingUser = users.find(u => u.username.toLowerCase() === username.toLowerCase());

  let finalPassword = password;
  if (document.getElementById('user-form-username').disabled) {
    if (!password && existingUser) {
      finalPassword = existingUser.password;
    }
  } else {
    if (existingUser) {
      alert('Error: Username already exists in the system database.');
      return;
    }
  }

  await DB.request('saveUser', {
    username,
    password: finalPassword,
    role,
    clinicId: currentUser.clinicId,
    name,
    qualification,
    designation,
    speciality,
    permissions
  });

  closeModal('modal-user');
  loadClinicAdminDashboard();
}

async function handleClinicHeaderUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  const previewImg = document.getElementById('clinic-header-preview');
  const emptyDiv = document.getElementById('clinic-header-empty');

  try {
    const dataUrl = await DB.uploadClinicHeader(currentUser.clinicId, file);
    previewImg.src = dataUrl;
    previewImg.classList.remove('hidden');
    emptyDiv.classList.add('hidden');
    alert('Success: Letterhead logo uploaded and connected.');
  } catch (err) {
    console.error(err);
    alert('Upload failed. Please check image properties.');
  }
}

// -------------------------------------------------------------
// 4. STAFF PORTAL (QUEUE INTAKE)
// -------------------------------------------------------------
function renderStaffPatientsList(list) {
  const tbody = document.querySelector('#patients-table tbody');
  if (!tbody) return;
  tbody.innerHTML = '';

  list.forEach(patient => {
    const tr = document.createElement('tr');
    
    // Check if vitals recorded
    const vitals = activeVitals.find(v => v.patientId === patient.id);
    const vitalsText = vitals 
      ? `<span class="user-badge" style="background: rgba(16,185,129,0.1); color: #10b981; border: 1px solid rgba(255,255,255,0.05); font-size: 0.7rem;">BP: ${vitals.bp} | HR: ${vitals.pulse}</span>`
      : `<span class="user-badge" style="background: rgba(245,158,11,0.1); color: #f59e0b; border: 1px solid rgba(255,255,255,0.05); font-size: 0.7rem;">No Vitals Recorded</span>`;

    tr.innerHTML = `
      <td><strong>${patient.id}</strong></td>
      <td>${patient.name}</td>
      <td>${patient.age} Yrs / ${patient.gender}</td>
      <td>${patient.mobile}</td>
      <td>${vitalsText}</td>
      <td>
        <button class="btn btn-secondary btn-sm" onclick="recordVitals('${patient.id}')">📝 Vitals</button>
        <button class="btn btn-secondary btn-sm" onclick="editPatient('${patient.id}', '${patient.name}', ${patient.age}, '${patient.gender}', '${patient.mobile}')">Edit Profile</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

async function loadStaffDashboard() {
  activePatients = await DB.request('getPatients', { clinicId: currentUser.clinicId });
  activeVitals = await DB.request('getVitals', { clinicId: currentUser.clinicId });
  renderStaffPatientsList(activePatients);
}

window.searchStaffPatients = async function() {
  const query = document.getElementById('staff-patient-search-input').value.toLowerCase().trim();
  activePatients = await DB.request('getPatients', { clinicId: currentUser.clinicId });
  activeVitals = await DB.request('getVitals', { clinicId: currentUser.clinicId });
  
  if (!query) {
    renderStaffPatientsList(activePatients);
    return;
  }
  
  const filtered = activePatients.filter(p => 
    p.id.toLowerCase().includes(query) || 
    p.name.toLowerCase().includes(query) || 
    p.mobile.includes(query)
  );
  
  renderStaffPatientsList(filtered);
};

window.resetStaffPatientsSearch = function() {
  document.getElementById('staff-patient-search-input').value = '';
  searchStaffPatients();
};

function openPatientModal() {
  document.getElementById('patient-modal-title').textContent = 'Register New Patient Profile';
  document.getElementById('patient-form-id').value = '';
  document.getElementById('patient-form').reset();
  openModal('modal-patient');
}

window.editPatient = function(id, name, age, gender, mobile) {
  document.getElementById('patient-modal-title').textContent = 'Modify Patient Profile';
  document.getElementById('patient-form-id').value = id;
  document.getElementById('patient-form-name').value = name;
  document.getElementById('patient-form-age').value = age;
  document.getElementById('patient-form-gender').value = gender;
  document.getElementById('patient-form-mobile').value = mobile;
  openModal('modal-patient');
};

async function handlePatientSubmit(e) {
  e.preventDefault();
  const id = document.getElementById('patient-form-id').value || `P-${1000 + Math.floor(Math.random() * 9000)}`;
  const name = document.getElementById('patient-form-name').value.trim();
  const age = parseInt(document.getElementById('patient-form-age').value);
  const gender = document.getElementById('patient-form-gender').value;
  const mobile = document.getElementById('patient-form-mobile').value.trim();

  await DB.request('savePatient', {
    id,
    clinicId: currentUser.clinicId,
    name,
    age,
    gender,
    mobile,
    registeredAt: new Date().toISOString().split('T')[0]
  });

  closeModal('modal-patient');
  loadStaffDashboard();
}

window.recordVitals = function(patientId) {
  document.getElementById('vitals-form-patient-id').value = patientId;
  document.getElementById('vitals-form').reset();
  
  // Pre-fill existing vitals if any
  const vitals = activeVitals.find(v => v.patientId === patientId);
  if (vitals) {
    document.getElementById('vitals-form-height').value = vitals.height;
    document.getElementById('vitals-form-weight').value = vitals.weight;
    document.getElementById('vitals-form-pulse').value = vitals.pulse;
    document.getElementById('vitals-form-bp').value = vitals.bp;
    document.getElementById('vitals-form-spo2').value = vitals.spo2;
  }
  
  openModal('modal-vitals');
};

async function handleVitalsSubmit(e) {
  e.preventDefault();
  const patientId = document.getElementById('vitals-form-patient-id').value;
  const height = document.getElementById('vitals-form-height').value.trim() || '-';
  const weight = document.getElementById('vitals-form-weight').value.trim() || '-';
  const pulse = document.getElementById('vitals-form-pulse').value.trim() || '-';
  const bp = document.getElementById('vitals-form-bp').value.trim() || '-';
  const spo2 = document.getElementById('vitals-form-spo2').value.trim() || '-';

  await DB.request('saveVitals', {
    patientId,
    clinicId: currentUser.clinicId,
    height,
    weight,
    pulse,
    bp,
    spo2,
    enteredBy: currentUser.username,
    updatedAt: new Date().toISOString()
  });

  closeModal('modal-vitals');
  loadStaffDashboard();
}

// -------------------------------------------------------------
// 5. DOCTOR WORKSPACE (CLINICAL COCKPIT)
// -------------------------------------------------------------
async function loadDoctorDashboard() {
  selectedPatient = null;
  selectedTests = [];
  selectedAdvice = [];

  // Reset textareas
  resetPrescriptionWorkspace();

  // Load patients and vitals (Intake view)
  activePatients = await DB.request('getPatients', { clinicId: currentUser.clinicId });
  activeVitals = await DB.request('getVitals', { clinicId: currentUser.clinicId });

  renderDoctorPatientQueue(activePatients);

  // Sync / load Config Lists (isolated by doctorUsername)
  await loadDoctorConfigs();
}

async function loadDoctorConfigs() {
  const reqArgs = { doctorUsername: currentUser.username, clinicId: currentUser.clinicId };
  
  doctorTemplates = await DB.request('getTemplates', reqArgs);
  doctorDrugs = await DB.request('getDrugs', reqArgs);
  doctorTests = await DB.request('getTests', reqArgs);
  doctorAdvice = await DB.request('getAdvice', reqArgs);
  doctorDrugCategories = await DB.request('getDrugCategories', reqArgs);

  populateDoctorDrugCategoryDropdowns();

  renderDoctorTemplates();
  renderDoctorDrugs();
  renderDoctorTests();
  renderDoctorAdvice();
}

function populateDoctorDrugCategoryDropdowns() {
  const selectFilter = document.getElementById('drug-category-selector');
  const selectModal = document.getElementById('doc-item-drug-category');
  
  if (selectFilter) {
    const prevVal = selectFilter.value;
    selectFilter.innerHTML = '<option value="All">All Categories</option>' +
      doctorDrugCategories.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
    if (doctorDrugCategories.some(c => c.name === prevVal)) {
      selectFilter.value = prevVal;
    } else {
      selectFilter.value = 'All';
    }
  }
  
  if (selectModal) {
    selectModal.innerHTML = doctorDrugCategories.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
  }
}

// Patient search queue
function renderDoctorPatientQueue(list) {
  const listContainer = document.getElementById('doc-patient-list');
  listContainer.innerHTML = '';

  if (list.length === 0) {
    listContainer.innerHTML = '<span class="text-muted" style="padding: 1rem; font-size:0.85rem;">No matching patient records.</span>';
    return;
  }

  list.forEach(patient => {
    const card = document.createElement('div');
    card.className = `interactive-card ${selectedPatient && selectedPatient.id === patient.id ? 'active' : ''}`;
    card.addEventListener('click', () => selectDoctorPatient(patient));

    const vitals = activeVitals.find(v => v.patientId === patient.id);
    const hasVitals = vitals ? '✓ Recorded' : 'Waiting Vitals';

    card.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <h4>${patient.name}</h4>
        <span class="user-badge" style="font-size:0.65rem; background:${vitals ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)'}; color:${vitals ? '#10b981' : '#f59e0b'};">${hasVitals}</span>
      </div>
      <p>ID: ${patient.id} | ${patient.age} Yrs / ${patient.gender} | Mob: ${patient.mobile}</p>
    `;
    listContainer.appendChild(card);
  });
}

function filterPatients() {
  const query = document.getElementById('doc-patient-search').value.toLowerCase().trim();
  if (!query) {
    renderDoctorPatientQueue(activePatients);
    return;
  }
  const filtered = activePatients.filter(p => 
    p.id.toLowerCase().includes(query) || 
    p.name.toLowerCase().includes(query) || 
    p.mobile.includes(query)
  );
  renderDoctorPatientQueue(filtered);
}

function selectDoctorPatient(patient) {
  selectedPatient = patient;
  
  // Highlight active card
  document.querySelectorAll('#doc-patient-list .interactive-card').forEach(card => {
    card.classList.remove('active');
  });
  // Find card in DOM and set active
  renderDoctorPatientQueue(activePatients);

  // Load vitals banner
  const vitals = activeVitals.find(v => v.patientId === patient.id);
  const vitalsContent = document.getElementById('doc-vitals-content');
  vitalsContent.innerHTML = '';

  if (vitals) {
    vitalsContent.innerHTML = `
      <div class="vital-item-span">Height<strong>${vitals.height}</strong></div>
      <div class="vital-item-span">Weight<strong>${vitals.weight}</strong></div>
      <div class="vital-item-span">Blood Pressure<strong>${vitals.bp}</strong></div>
      <div class="vital-item-span">Pulse<strong>${vitals.pulse}</strong></div>
      <div class="vital-item-span">SpO2<strong>${vitals.spo2}</strong></div>
    `;
  } else {
    vitalsContent.innerHTML = `
      <span style="color: var(--text-muted); font-size: 0.85rem; grid-column: span 2;">Vitals not recorded for this patient.</span>
      <button class="btn btn-secondary btn-sm" style="grid-column: span 3; font-size: 0.75rem;" onclick="recordVitals('${patient.id}'); loadDoctorDashboard();">Add Vitals</button>
    `;
  }

  // Update print preview demographics
  document.getElementById('print-patient-id').textContent = patient.id;
  document.getElementById('print-patient-name').textContent = patient.name;
  document.getElementById('print-patient-age-gender').textContent = `${patient.age} Years / ${patient.gender}`;
  document.getElementById('print-prescription-date').textContent = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  // Sync Vitals to print preview
  document.getElementById('print-v-height').textContent = vitals ? vitals.height : '-';
  document.getElementById('print-v-weight').textContent = vitals ? vitals.weight : '-';
  document.getElementById('print-v-bp').textContent = vitals ? vitals.bp : '-';
  document.getElementById('print-v-pulse').textContent = vitals ? vitals.pulse : '-';
  document.getElementById('print-v-spo2').textContent = vitals ? vitals.spo2 : '-';
}

function resetPrescriptionWorkspace() {
  document.getElementById('canvas-cc').value = '';
  document.getElementById('canvas-signs').value = '';
  document.getElementById('canvas-history').value = '';
  document.getElementById('canvas-allergies').value = '';
  document.getElementById('canvas-diagnosis').value = '';
  document.getElementById('canvas-prescription').value = '';
  selectedTests = [];
  selectedAdvice = [];
  
  // Clear print representations
  syncCanvasToPrintPreview();
  renderSelectedTests();
  renderSelectedAdvice();
}

// Render dynamic configuration toolboxes
function renderDoctorTemplates() {
  const selectedSpecialty = document.getElementById('specialty-selector').value;
  const listContainer = document.getElementById('toolbox-templates-list');
  listContainer.innerHTML = '';

  const templates = doctorTemplates.filter(t => t.specialty === selectedSpecialty);
  
  if (templates.length === 0) {
    listContainer.innerHTML = '<span class="text-muted" style="font-size:0.8rem;">No templates found.</span>';
    return;
  }

  templates.forEach(t => {
    const card = document.createElement('div');
    card.className = 'interactive-card';
    card.style.padding = '0.5rem';
    
    card.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <span style="font-weight:600; font-size:0.85rem;">${t.name}</span>
        <div style="display:flex; gap:0.25rem;">
          <button class="btn btn-secondary btn-sm" style="padding:0.1rem 0.3rem; font-size:0.7rem;" onclick="event.stopPropagation(); editDoctorItem('template', '${t.id}')">✏️</button>
          <button class="btn btn-secondary btn-sm btn-danger" style="padding:0.1rem 0.3rem; font-size:0.7rem;" onclick="event.stopPropagation(); deleteDoctorItem('template', '${t.id}')">🗑️</button>
        </div>
      </div>
    `;
    card.addEventListener('click', () => injectTemplate(t));
    listContainer.appendChild(card);
  });
}

function injectTemplate(template) {
  document.getElementById('canvas-cc').value = template.chiefComplaints || '';
  document.getElementById('canvas-signs').value = template.signsSymptoms || '';
  document.getElementById('canvas-history').value = template.medicalHistory || '';
  document.getElementById('canvas-allergies').value = template.allergies || '';
  document.getElementById('canvas-diagnosis').value = template.findingsDiagnosis || '';
  document.getElementById('canvas-prescription').value = template.prescriptionBody || '';
  
  syncCanvasToPrintPreview();
}

function renderDoctorDrugs() {
  const category = document.getElementById('drug-category-selector').value;
  const listContainer = document.getElementById('toolbox-drugs-list');
  listContainer.innerHTML = '';

  const drugs = category === 'All' ? doctorDrugs : doctorDrugs.filter(d => d.category === category);

  if (drugs.length === 0) {
    listContainer.innerHTML = '<span class="text-muted" style="font-size:0.8rem; padding: 0.25rem;">No drugs in this category.</span>';
    return;
  }

  drugs.forEach(d => {
    const pill = document.createElement('div');
    pill.className = 'pill-item';
    pill.innerHTML = `
      <span>${d.name}</span>
      <span class="pill-actions">
        <span class="pill-edit" onclick="event.stopPropagation(); editDoctorItem('drug', '${d.id}')">✏️</span>
        <span class="pill-delete" onclick="event.stopPropagation(); deleteDoctorItem('drug', '${d.id}')">&times;</span>
      </span>
    `;
    pill.addEventListener('click', () => appendDrugToPrescription(d));
    listContainer.appendChild(pill);
  });
}

function appendDrugToPrescription(d) {
  const rxArea = document.getElementById('canvas-prescription');
  const separator = rxArea.value.trim() === '' ? '' : '\n';
  
  let name, prefix, dose, freq;
  if (typeof d === 'string') {
    name = d;
    prefix = 'Tab.';
    dose = '1 tablet';
    freq = 'twice daily -- duration SOS';
  } else {
    name = d.name;
    prefix = d.prefix || 'Tab.';
    dose = d.dose || '1 tablet';
    freq = d.freq || 'twice daily -- duration SOS';
  }
  
  rxArea.value = rxArea.value + separator + `${prefix} ${name} -- ${dose} -- ${freq}`;
  syncCanvasToPrintPreview();
}

function renderDoctorTests() {
  const listContainer = document.getElementById('toolbox-tests-list');
  listContainer.innerHTML = '';

  if (doctorTests.length === 0) {
    listContainer.innerHTML = '<span class="text-muted" style="font-size:0.8rem;">No custom tests.</span>';
    return;
  }

  doctorTests.forEach(t => {
    const isSelected = selectedTests.includes(t.id);
    const pill = document.createElement('div');
    pill.className = `pill-item ${isSelected ? 'active' : ''}`;
    if (isSelected) pill.style.borderColor = 'var(--accent-color)';
    
    pill.innerHTML = `
      <span>${t.name}</span>
      <span class="pill-actions">
        <span class="pill-edit" onclick="event.stopPropagation(); editDoctorItem('test', '${t.id}')">✏️</span>
        <span class="pill-delete" onclick="event.stopPropagation(); deleteDoctorItem('test', '${t.id}')">&times;</span>
      </span>
    `;
    pill.addEventListener('click', () => toggleLabTest(t.id));
    listContainer.appendChild(pill);
  });
}

function toggleLabTest(testId) {
  const index = selectedTests.indexOf(testId);
  if (index > -1) {
    selectedTests.splice(index, 1);
  } else {
    selectedTests.push(testId);
  }
  renderDoctorTests();
  renderSelectedTests();
}

function renderSelectedTests() {
  const container = document.getElementById('selected-tests-list');
  container.innerHTML = '';

  const printList = document.getElementById('print-lab-orders');
  printList.innerHTML = '';

  const activeTestObjects = doctorTests.filter(t => selectedTests.includes(t.id));
  
  if (activeTestObjects.length === 0) {
    container.innerHTML = '<span class="text-muted" style="font-size:0.75rem;">None</span>';
    printList.innerHTML = '<li>No tests ordered.</li>';
    return;
  }

  activeTestObjects.forEach(t => {
    // Canvas Pill
    const pill = document.createElement('span');
    pill.className = 'pill-item';
    pill.style.fontSize = '0.75rem';
    pill.style.padding = '0.2rem 0.5rem';
    pill.textContent = t.name;
    container.appendChild(pill);

    // Print A4 Item
    const li = document.createElement('li');
    li.textContent = t.name;
    printList.appendChild(li);
  });
}

function renderDoctorAdvice() {
  const listContainer = document.getElementById('toolbox-advice-list');
  listContainer.innerHTML = '';

  if (doctorAdvice.length === 0) {
    listContainer.innerHTML = '<span class="text-muted" style="font-size:0.8rem;">No advice items.</span>';
    return;
  }

  doctorAdvice.forEach(a => {
    const isSelected = selectedAdvice.includes(a.id);
    const pill = document.createElement('div');
    pill.className = `pill-item ${isSelected ? 'active' : ''}`;
    if (isSelected) pill.style.borderColor = 'var(--accent-color)';

    pill.innerHTML = `
      <span>${a.name}</span>
      <span class="pill-actions">
        <span class="pill-edit" onclick="event.stopPropagation(); editDoctorItem('advice', '${a.id}')">✏️</span>
        <span class="pill-delete" onclick="event.stopPropagation(); deleteDoctorItem('advice', '${a.id}')">&times;</span>
      </span>
    `;
    pill.addEventListener('click', () => toggleAdvice(a.id));
    listContainer.appendChild(pill);
  });
}

function toggleAdvice(adviceId) {
  const index = selectedAdvice.indexOf(adviceId);
  if (index > -1) {
    selectedAdvice.splice(index, 1);
  } else {
    selectedAdvice.push(adviceId);
  }
  renderDoctorAdvice();
  renderSelectedAdvice();
}

function renderSelectedAdvice() {
  const container = document.getElementById('selected-advice-list');
  container.innerHTML = '';

  const printList = document.getElementById('print-special-advice');
  printList.innerHTML = '';

  const activeAdviceObjects = doctorAdvice.filter(a => selectedAdvice.includes(a.id));

  if (activeAdviceObjects.length === 0) {
    container.innerHTML = '<span class="text-muted" style="font-size:0.75rem;">None</span>';
    printList.innerHTML = '<li>No custom advice.</li>';
    return;
  }

  activeAdviceObjects.forEach(a => {
    // Canvas Pill
    const pill = document.createElement('span');
    pill.className = 'pill-item';
    pill.style.fontSize = '0.75rem';
    pill.style.padding = '0.2rem 0.5rem';
    pill.textContent = a.name;
    container.appendChild(pill);

    // Print A4 Item
    const li = document.createElement('li');
    li.innerHTML = `<strong>${a.name}:</strong> ${a.text}`;
    printList.appendChild(li);
  });
}

// -------------------------------------------------------------
// DYNAMIC DOCTOR CONFIG CRUD OPERATIONS
// -------------------------------------------------------------
function openDoctorItemModal(type) {
  document.getElementById('doc-item-type').value = type;
  document.getElementById('doc-item-id').value = '';
  document.getElementById('doc-item-form').reset();
  if (type === 'drug') {
    document.getElementById('doc-item-drug-prefix').value = 'Tab.';
    document.getElementById('doc-item-drug-dose').value = '1 tablet';
    document.getElementById('doc-item-drug-freq').value = 'twice daily -- duration SOS';
  }
  
  // Hide all sections first
  document.getElementById('doc-item-template-fields').classList.add('hidden');
  document.getElementById('doc-item-drug-fields').classList.add('hidden');
  document.getElementById('doc-item-advice-fields').classList.add('hidden');
  
  // Label updates
  const label = document.getElementById('doc-item-name-label');
  label.textContent = 'Name / Label';

  if (type === 'template') {
    document.getElementById('doc-item-title').textContent = 'Add Prescription Template';
    document.getElementById('doc-item-template-fields').classList.remove('hidden');
    label.textContent = 'Template Name';
  } else if (type === 'drug') {
    document.getElementById('doc-item-title').textContent = 'Add Drug Directory Entry';
    document.getElementById('doc-item-drug-fields').classList.remove('hidden');
    label.textContent = 'Drug Name & Strength';
  } else if (type === 'test') {
    document.getElementById('doc-item-title').textContent = 'Add Diagnostic Lab Order';
    label.textContent = 'Diagnostic Test Name';
  } else if (type === 'advice') {
    document.getElementById('doc-item-title').textContent = 'Add Special Advice Template';
    document.getElementById('doc-item-advice-fields').classList.remove('hidden');
    label.textContent = 'Advice Topic Label';
  }

  openModal('modal-doctor-item');
}

window.editDoctorItem = function(type, id) {
  openDoctorItemModal(type);
  document.getElementById('doc-item-id').value = id;

  if (type === 'template') {
    document.getElementById('doc-item-title').textContent = 'Edit Prescription Template';
    const t = doctorTemplates.find(item => item.id === id);
    if (t) {
      document.getElementById('doc-item-name').value = t.name;
      document.getElementById('doc-item-specialty').value = t.specialty;
      document.getElementById('doc-item-cc').value = t.chiefComplaints || '';
      document.getElementById('doc-item-signs').value = t.signsSymptoms || '';
      document.getElementById('doc-item-history').value = t.medicalHistory || '';
      document.getElementById('doc-item-allergies').value = t.allergies || '';
      document.getElementById('doc-item-diagnosis').value = t.findingsDiagnosis || '';
      document.getElementById('doc-item-rx').value = t.prescriptionBody || '';
    }
  } else if (type === 'drug') {
    document.getElementById('doc-item-title').textContent = 'Edit Drug Directory Entry';
    const d = doctorDrugs.find(item => item.id === id);
    if (d) {
      document.getElementById('doc-item-name').value = d.name;
      document.getElementById('doc-item-drug-category').value = d.category || '';
      document.getElementById('doc-item-drug-prefix').value = d.prefix || 'Tab.';
      document.getElementById('doc-item-drug-dose').value = d.dose || '1 tablet';
      document.getElementById('doc-item-drug-freq').value = d.freq || 'twice daily -- duration SOS';
    }
  } else if (type === 'test') {
    document.getElementById('doc-item-title').textContent = 'Edit Diagnostic Lab Order';
    const t = doctorTests.find(item => item.id === id);
    if (t) {
      document.getElementById('doc-item-name').value = t.name;
    }
  } else if (type === 'advice') {
    document.getElementById('doc-item-title').textContent = 'Edit Special Advice Template';
    const a = doctorAdvice.find(item => item.id === id);
    if (a) {
      document.getElementById('doc-item-name').value = a.name;
      document.getElementById('doc-item-advice-text').value = a.text || '';
    }
  }
};

window.openCategoriesModal = async function() {
  const reqArgs = { doctorUsername: currentUser.username, clinicId: currentUser.clinicId };
  doctorDrugCategories = await DB.request('getDrugCategories', reqArgs);
  
  const container = document.getElementById('categories-list-container');
  if (!container) return;
  
  container.innerHTML = '';
  if (doctorDrugCategories.length === 0) {
    container.innerHTML = '<div style="text-align:center; padding:1rem; color:var(--text-muted); font-style:italic;">No custom categories. Add one above!</div>';
  } else {
    doctorDrugCategories.forEach(cat => {
      const item = document.createElement('div');
      item.className = 'category-list-item';
      item.innerHTML = `
        <span>${cat.name}</span>
        <div class="category-item-actions">
          <button type="button" class="category-item-btn" onclick="editDrugCategory('${cat.id}', '${cat.name}')">✏️</button>
          <button type="button" class="category-item-btn" onclick="deleteDrugCategory('${cat.id}', '${cat.name}')">🗑️</button>
        </div>
      `;
      container.appendChild(item);
    });
  }
  
  openModal('modal-manage-categories');
};

window.handleCategoryAdd = async function(e) {
  e.preventDefault();
  const input = document.getElementById('new-category-name');
  const name = input.value.trim();
  if (!name) return;
  
  const reqArgs = {
    id: 'cat-' + Date.now(),
    doctorUsername: currentUser.username,
    clinicId: currentUser.clinicId,
    name
  };
  
  await DB.request('saveDrugCategory', reqArgs);
  input.value = '';
  
  await loadDoctorConfigs();
  window.openCategoriesModal();
};

window.editDrugCategory = async function(catId, oldName) {
  const newName = prompt("Enter new category name:", oldName);
  if (!newName || newName.trim() === '' || newName.trim() === oldName) return;
  
  await DB.request('saveDrugCategory', {
    id: catId,
    doctorUsername: currentUser.username,
    clinicId: currentUser.clinicId,
    name: newName.trim()
  });
  
  // Cascade category change to all drugs of this doctor
  const drugsToUpdate = doctorDrugs.filter(d => d.category === oldName);
  for (const d of drugsToUpdate) {
    d.category = newName.trim();
    await DB.request('saveDrug', d);
  }
  
  await loadDoctorConfigs();
  window.openCategoriesModal();
};

window.deleteDrugCategory = async function(catId, catName) {
  if (confirm(`Are you sure you want to delete category "${catName}"? Associated drugs will be uncategorized.`)) {
    await DB.request('deleteDrugCategory', { id: catId });
    
    // Cascade category deletion: update drugs to 'General' category
    const drugsToUpdate = doctorDrugs.filter(d => d.category === catName);
    for (const d of drugsToUpdate) {
      d.category = 'General';
      await DB.request('saveDrug', d);
    }
    
    await loadDoctorConfigs();
    window.openCategoriesModal();
  }
};

async function deleteDoctorItem(type, id) {
  if (confirm(`Are you sure you want to delete this configuration item?`)) {
    if (type === 'template') {
      await DB.request('deleteTemplate', { id });
    } else if (type === 'drug') {
      await DB.request('deleteDrug', { id });
    } else if (type === 'test') {
      await DB.request('deleteTest', { id });
      // Remove from selected list
      selectedTests = selectedTests.filter(t => t !== id);
    } else if (type === 'advice') {
      await DB.request('deleteAdvice', { id });
      selectedAdvice = selectedAdvice.filter(a => a !== id);
    }
    await loadDoctorConfigs();
  }
}

async function handleDoctorItemSubmit(e) {
  e.preventDefault();
  const type = document.getElementById('doc-item-type').value;
  const id = document.getElementById('doc-item-id').value || `${type.charAt(0)}-${Date.now()}`;
  const name = document.getElementById('doc-item-name').value.trim();

  const reqArgs = {
    id,
    doctorUsername: currentUser.username,
    clinicId: currentUser.clinicId
  };

  if (type === 'template') {
    await DB.request('saveTemplate', {
      ...reqArgs,
      name,
      specialty: document.getElementById('doc-item-specialty').value,
      chiefComplaints: document.getElementById('doc-item-cc').value.trim(),
      signsSymptoms: document.getElementById('doc-item-signs').value.trim(),
      medicalHistory: document.getElementById('doc-item-history').value.trim(),
      drugHistory: '',
      allergies: document.getElementById('doc-item-allergies').value.trim(),
      findingsDiagnosis: document.getElementById('doc-item-diagnosis').value.trim(),
      prescriptionBody: document.getElementById('doc-item-rx').value.trim()
    });
  } else if (type === 'drug') {
    await DB.request('saveDrug', {
      ...reqArgs,
      name,
      category: document.getElementById('doc-item-drug-category').value,
      prefix: document.getElementById('doc-item-drug-prefix').value,
      dose: document.getElementById('doc-item-drug-dose').value.trim(),
      freq: document.getElementById('doc-item-drug-freq').value.trim()
    });
  } else if (type === 'test') {
    await DB.request('saveTest', {
      id,
      doctorUsername: currentUser.username,
      name
    });
  } else if (type === 'advice') {
    await DB.request('saveAdvice', {
      id,
      doctorUsername: currentUser.username,
      name,
      text: document.getElementById('doc-item-advice-text').value.trim()
    });
  }

  closeModal('modal-doctor-item');
  await loadDoctorConfigs();
}

// -------------------------------------------------------------
// 6. REAL-TIME PRESCRIPTION COMPOSITION & SYNCHRONIZER
// -------------------------------------------------------------
function syncCanvasToPrintPreview() {
  // Read inputs from active workspace
  const cc = document.getElementById('canvas-cc').value || '-';
  const signs = document.getElementById('canvas-signs').value || '-';
  const history = document.getElementById('canvas-history').value || '-';
  const allergies = document.getElementById('canvas-allergies').value || '-';
  const diagnosis = document.getElementById('canvas-diagnosis').value || '-';
  const rx = document.getElementById('canvas-prescription').value || 'No medicines prescribed.';

  // Mirror directly into the on-screen prescription paper element
  document.getElementById('print-notes-cc').textContent = cc;
  document.getElementById('print-notes-signs').textContent = signs;
  document.getElementById('print-notes-history').textContent = history;
  document.getElementById('print-notes-allergies').textContent = allergies;
  document.getElementById('print-diagnosis').textContent = diagnosis;
  document.getElementById('print-rx-proper').textContent = rx;
}

// Plain Paper Toggle handler
async function updatePrintLogoHeader() {
  const isPlainPaper = document.getElementById('print-plain-paper-toggle').checked;
  const headerPlaceholder = document.getElementById('print-header-placeholder');
  const printHeaderImage = document.getElementById('print-header-image');
  const headerZone = document.getElementById('print-header-zone');

  if (isPlainPaper) {
    // Fetch and display logo
    const url = await DB.getClinicHeader(currentUser.clinicId);
    if (url) {
      printHeaderImage.src = url;
      printHeaderImage.classList.remove('hidden');
      headerPlaceholder.classList.add('hidden');
      headerZone.style.borderBottom = 'none'; // Clean header print output
    } else {
      // If no image, display fallbacks
      headerPlaceholder.textContent = 'Clinic Header (Netlify Blobs Logo Not Configured)';
      headerPlaceholder.classList.remove('hidden');
      printHeaderImage.classList.add('hidden');
      headerZone.style.borderBottom = '2px solid #cbd5e1';
    }
  } else {
    // Pad margins are blank
    headerPlaceholder.textContent = '4 cm Pad Letterhead Space (Blank by default for pre-printed pads)';
    headerPlaceholder.classList.remove('hidden');
    printHeaderImage.classList.add('hidden');
    headerZone.style.borderBottom = '2px solid #cbd5e1';
  }
}

async function openPrescriptionPrintPreview() {
  if (!selectedPatient) {
    alert('Invalid Operation: Please select a patient profile from the queue before printing.');
    return;
  }

  // Force a data refresh to make sure preview is fully synced
  syncCanvasToPrintPreview();
  renderSelectedTests();
  renderSelectedAdvice();
  
  // Set signature doctor information
  document.getElementById('print-doc-name').textContent = currentUser.name;
  document.getElementById('print-doc-qual').innerHTML = `${currentUser.qualification || ''}<br>${currentUser.designation || ''}`;
  
  // Prepare header logo
  await updatePrintLogoHeader();

  // Copy paper preview content to the hidden print driver viewport
  const sourcePaper = document.getElementById('screen-prescription-paper');
  const printContainer = document.getElementById('print-container');
  printContainer.innerHTML = sourcePaper.outerHTML;

  // Open Preview dialog
  openModal('modal-print-preview');
}

// =============================================================
// NEW FEATURES IMPLEMENTATION: SCHEDULING, BILLING, ANALYTICS
// =============================================================

// --- A. Super Admin Helpers ---
window.switchSuperAdminTab = function(tabName) {
  document.querySelectorAll('#view-admin .dashboard-tabs .btn').forEach(btn => btn.classList.remove('active'));
  document.getElementById('panel-admin-clinics').classList.add('hidden');
  document.getElementById('panel-admin-admins').classList.add('hidden');
  document.getElementById('panel-admin-payments').classList.add('hidden');
  const panelInq = document.getElementById('panel-admin-inquiries');
  if (panelInq) panelInq.classList.add('hidden');

  if (tabName === 'clinics') {
    document.getElementById('btn-admin-tab-clinics').classList.add('active');
    document.getElementById('panel-admin-clinics').classList.remove('hidden');
  } else if (tabName === 'admins') {
    document.getElementById('btn-admin-tab-admins').classList.add('active');
    document.getElementById('panel-admin-admins').classList.remove('hidden');
  } else if (tabName === 'payments') {
    document.getElementById('btn-admin-tab-payments').classList.add('active');
    document.getElementById('panel-admin-payments').classList.remove('hidden');
    renderClinicPayments();
  } else if (tabName === 'inquiries') {
    const btnInq = document.getElementById('btn-admin-tab-inquiries');
    if (btnInq) btnInq.classList.add('active');
    if (panelInq) {
      panelInq.classList.remove('hidden');
      renderSuperAdminInquiries();
    }
  }
};

window.editClinicAdmin = function(username, name, clinicId, status) {
  document.getElementById('cadmin-modal-title').textContent = 'Modify Clinic Administrator';
  document.getElementById('cadmin-form-username').value = username;
  document.getElementById('cadmin-form-username').setAttribute('disabled', 'true');
  document.getElementById('cadmin-form-password').removeAttribute('required');
  document.getElementById('cadmin-form-name').value = name;
  document.getElementById('cadmin-form-clinic').value = clinicId;
  document.getElementById('cadmin-form-status').value = status;
  openModal('modal-clinic-admin');
};

window.toggleSuspendClinicAdmin = async function(username) {
  const users = await DB.request('getUsers');
  const user = users.find(u => u.username === username);
  if (user) {
    user.status = user.status === 'Suspended' ? 'Active' : 'Suspended';
    await DB.request('saveUser', user);
    loadSuperAdminDashboard();
  }
};

window.deleteClinicAdmin = async function(username) {
  if (confirm(`Are you sure you want to delete clinic admin account: ${username}?`)) {
    await DB.request('deleteUser', { username });
    loadSuperAdminDashboard();
  }
};

async function handleClinicAdminSubmit(e) {
  e.preventDefault();
  const username = document.getElementById('cadmin-form-username').value.trim();
  const name = document.getElementById('cadmin-form-name').value.trim();
  const clinicId = document.getElementById('cadmin-form-clinic').value;
  const password = document.getElementById('cadmin-form-password').value;
  const status = document.getElementById('cadmin-form-status').value;

  const users = await DB.request('getUsers');
  const existingUser = users.find(u => u.username.toLowerCase() === username.toLowerCase());

  let finalPassword = password;
  if (document.getElementById('cadmin-form-username').disabled) {
    if (!password && existingUser) {
      finalPassword = existingUser.password;
    }
  } else {
    if (existingUser) {
      alert('Error: Username already exists in the system database.');
      return;
    }
  }

  await DB.request('saveUser', {
    username,
    password: finalPassword,
    role: 'clinic_admin',
    clinicId,
    name,
    status
  });

  closeModal('modal-clinic-admin');
  loadSuperAdminDashboard();
}

// --- B. Staff Desk Router & Tabs ---
function setupStaffTabs(user) {
  const perms = user.permissions || [];
  const tabContainer = document.getElementById('staff-tabs');
  
  if (perms.includes('reception') && perms.includes('finance')) {
    tabContainer.classList.remove('hidden');
    switchStaffTab('reception');
  } else {
    tabContainer.classList.add('hidden');
    if (perms.includes('reception')) {
      switchStaffTab('reception');
    } else if (perms.includes('finance')) {
      switchStaffTab('finance');
    }
  }
}

window.switchStaffTab = function(tabName) {
  document.querySelectorAll('#view-staff .dashboard-tabs .btn').forEach(btn => btn.classList.remove('active'));
  document.getElementById('panel-staff-reception').classList.add('hidden');
  document.getElementById('panel-staff-finance').classList.add('hidden');

  if (tabName === 'reception') {
    document.getElementById('btn-staff-tab-reception').classList.add('active');
    document.getElementById('panel-staff-reception').classList.remove('hidden');
    loadStaffDashboard();
    loadAppointments();
  } else {
    document.getElementById('btn-staff-tab-finance').classList.add('active');
    document.getElementById('panel-staff-finance').classList.remove('hidden');
    loadFinanceDashboard();
  }
};

// --- C. Appointment Desk Logic ---
async function loadAppointments() {
  const allAppointments = await DB.request('getAppointments', { clinicId: currentUser.clinicId });
  const doctorFilter = document.getElementById('staff-apt-doctor-filter').value;
  
  let filtered = allAppointments;
  if (doctorFilter !== 'All') {
    filtered = filtered.filter(a => a.doctorUsername === doctorFilter);
  }

  filtered.sort((a,b) => new Date(a.date + ' ' + a.time) - new Date(b.date + ' ' + b.time));

  const tbody = document.getElementById('staff-appointments-table').querySelector('tbody');
  tbody.innerHTML = '';

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="text-center">No appointments scheduled.</td></tr>';
    return;
  }

  filtered.forEach(apt => {
    const tr = document.createElement('tr');
    
    let badgeBg = 'rgba(245,158,11,0.1)';
    let badgeColor = '#f59e0b';
    if (apt.status === 'Scheduled') {
      badgeBg = 'rgba(129,140,248,0.1)'; // Indigo
      badgeColor = '#818cf8';
    } else if (apt.status === 'Confirmed') {
      badgeBg = 'rgba(168,85,247,0.1)'; // Purple
      badgeColor = '#a855f7';
    } else if (apt.status === 'Checked In') {
      badgeBg = 'rgba(56,189,248,0.1)';
      badgeColor = '#38bdf8';
    } else if (apt.status === 'Completed') {
      badgeBg = 'rgba(16,185,129,0.1)';
      badgeColor = '#10b981';
    } else if (apt.status === 'Cancelled') {
      badgeBg = 'rgba(244,63,94,0.1)';
      badgeColor = '#f43f5e';
    } else if (apt.status === 'Pending Confirmation') {
      badgeBg = 'rgba(245,158,11,0.1)';
      badgeColor = '#f59e0b';
    }

    tr.innerHTML = `
      <td><strong>${apt.id}</strong></td>
      <td>${apt.patientName} (${apt.patientId})</td>
      <td>${apt.doctorName}</td>
      <td>${apt.date} at ${apt.time}</td>
      <td>${apt.type}</td>
      <td>
        <span class="user-badge" style="background:${badgeBg}; color:${badgeColor}; border:1px solid rgba(255,255,255,0.05);">
          ${apt.status}
        </span>
      </td>
      <td>
        <div style="display:flex; gap:0.25rem;">
          ${apt.status === 'Pending Confirmation' ? `<button class="btn btn-secondary btn-sm" style="padding:0.2rem 0.4rem; font-size:0.75rem; background:rgba(16,185,129,0.2); color:#10b981; border-color:#10b981;" onclick="confirmPatientAppointment('${apt.id}')">✓ Accept</button>` : ''}
          ${(apt.status === 'Scheduled' || apt.status === 'Confirmed') ? `<button class="btn btn-secondary btn-sm" style="padding:0.2rem 0.4rem; font-size:0.75rem;" onclick="updateAptStatus('${apt.id}', 'Checked In')">📥 Check In</button>` : ''}
          ${apt.status === 'Checked In' ? `<button class="btn btn-secondary btn-sm" style="padding:0.2rem 0.4rem; font-size:0.75rem; background:rgba(16,185,129,0.2);" onclick="updateAptStatus('${apt.id}', 'Completed')">✓ Complete</button>` : ''}
          ${apt.status !== 'Completed' && apt.status !== 'Cancelled' ? `<button class="btn btn-secondary btn-sm btn-danger" style="padding:0.2rem 0.4rem; font-size:0.75rem;" onclick="updateAptStatus('${apt.id}', 'Cancelled')">Cancel</button>` : ''}
          <button class="btn btn-secondary btn-sm" style="padding:0.2rem 0.4rem; font-size:0.75rem;" onclick="editAppointment('${apt.id}')">✏️</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

window.updateAptStatus = async function(id, newStatus) {
  const list = await DB.request('getAppointments', { clinicId: currentUser.clinicId });
  const apt = list.find(a => a.id === id);
  if (apt) {
    apt.status = newStatus;
    await DB.request('saveAppointment', apt);
    loadAppointments();
  }
};

window.editAppointment = async function(id) {
  const list = await DB.request('getAppointments', { clinicId: currentUser.clinicId });
  const apt = list.find(a => a.id === id);
  if (apt) {
    document.getElementById('appointment-modal-title').textContent = 'Modify Appointment';
    document.getElementById('appointment-form-id').value = apt.id;
    await populateModalDropdowns();
    document.getElementById('appointment-form-patient').value = apt.patientId;
    document.getElementById('appointment-form-doctor').value = apt.doctorUsername;
    document.getElementById('appointment-form-date').value = apt.date;
    document.getElementById('appointment-form-time').value = apt.time;
    document.getElementById('appointment-form-type').value = apt.type;
    openModal('modal-book-appointment');
  }
};

async function handleAppointmentSubmit(e) {
  e.preventDefault();
  const id = document.getElementById('appointment-form-id').value || `APT-${1000 + Math.floor(Math.random() * 9000)}`;
  const patientId = document.getElementById('appointment-form-patient').value;
  const doctorUsername = document.getElementById('appointment-form-doctor').value;
  const date = document.getElementById('appointment-form-date').value;
  const time = document.getElementById('appointment-form-time').value;
  const type = document.getElementById('appointment-form-type').value;

  const patients = await DB.request('getPatients', { clinicId: currentUser.clinicId });
  const patient = patients.find(p => p.id === patientId);
  const patientName = patient ? patient.name : 'Unknown Patient';

  const users = await DB.request('getUsers');
  const doc = users.find(u => u.username === doctorUsername);
  const doctorName = doc ? doc.name : 'Unknown Doctor';

  const apt = {
    id,
    clinicId: currentUser.clinicId,
    patientId,
    patientName,
    doctorUsername,
    doctorName,
    date,
    time,
    type,
    status: 'Scheduled',
    createdBy: currentUser.username,
    createdAt: new Date().toISOString()
  };

  await DB.request('saveAppointment', apt);
  closeModal('modal-book-appointment');
  loadAppointments();
}

// --- D. Dropdown Builder Helper ---
async function populateModalDropdowns() {
  const patients = await DB.request('getPatients', { clinicId: currentUser.clinicId });
  const users = await DB.request('getUsers');
  const clinicUsers = users.filter(u => u.clinicId === currentUser.clinicId);
  const doctors = clinicUsers.filter(u => u.role === 'doctor');

  const aptPatientSelect = document.getElementById('appointment-form-patient');
  if (aptPatientSelect) {
    aptPatientSelect.innerHTML = patients.map(p => `<option value="${p.id}">${p.name} (ID: ${p.id})</option>`).join('');
  }

  const aptDocSelect = document.getElementById('appointment-form-doctor');
  if (aptDocSelect) {
    aptDocSelect.innerHTML = doctors.map(d => {
      const isLeave = d.status === 'On Leave';
      return `<option value="${d.username}" ${isLeave ? 'disabled' : ''}>${d.name}${isLeave ? ' (On Leave)' : ''}</option>`;
    }).join('');
  }

  const staffAptDocFilter = document.getElementById('staff-apt-doctor-filter');
  if (staffAptDocFilter) {
    staffAptDocFilter.innerHTML = '<option value="All">All Doctors</option>' + doctors.map(d => `<option value="${d.username}">${d.name}</option>`).join('');
  }

  const cadminAptDocFilter = document.getElementById('cadmin-apt-filter-doctor');
  if (cadminAptDocFilter) {
    cadminAptDocFilter.innerHTML = '<option value="All">All Doctors</option>' + doctors.map(d => `<option value="${d.username}">${d.name}</option>`).join('');
  }

  const billPatientSelect = document.getElementById('bill-form-patient');
  if (billPatientSelect) {
    billPatientSelect.innerHTML = patients.map(p => `<option value="${p.id}">${p.name} (ID: ${p.id})</option>`).join('');
  }
  const billDocSelect = document.getElementById('bill-form-doctor');
  if (billDocSelect) {
    billDocSelect.innerHTML = doctors.map(d => `<option value="${d.username}">${d.name}</option>`).join('');
  }

  const insPatientSelect = document.getElementById('insurance-form-patient');
  if (insPatientSelect) {
    insPatientSelect.innerHTML = patients.map(p => `<option value="${p.id}">${p.name} (ID: ${p.id})</option>`).join('');
  }
}

// --- E. Billing Operations & Insurance Center ---
async function loadFinanceDashboard() {
  await populateModalDropdowns();
  
  const bills = await DB.request('getBills', { clinicId: currentUser.clinicId });
  const billsTbody = document.getElementById('staff-bills-table').querySelector('tbody');
  billsTbody.innerHTML = '';
  
  if (bills.length === 0) {
    billsTbody.innerHTML = '<tr><td colspan="7" class="text-center">No invoice history found.</td></tr>';
  } else {
    bills.forEach(bill => {
      const tr = document.createElement('tr');
      const dateText = new Date(bill.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      
      let badgeBg = 'rgba(16,185,129,0.1)';
      let badgeColor = '#10b981';
      if (bill.paymentStatus === 'Pending') {
        badgeBg = 'rgba(244,63,94,0.1)';
        badgeColor = '#f43f5e';
      }

      tr.innerHTML = `
        <td><strong>${bill.id}</strong></td>
        <td>${bill.patientName} (${bill.patientId})</td>
        <td><strong>₹${bill.total}</strong></td>
        <td>
          <span class="user-badge" style="background:${badgeBg}; color:${badgeColor}; border:1px solid rgba(255,255,255,0.05);">
            ${bill.paymentStatus}
          </span>
        </td>
        <td>${bill.paymentMode}</td>
        <td>${dateText} by ${bill.doctorName}</td>
        <td>
          <div style="display:flex; gap:0.25rem;">
            <button class="btn btn-secondary btn-sm" onclick="viewReceipt('${bill.id}')">👁️ View</button>
            ${bill.paymentStatus === 'Pending' ? `<button class="btn btn-secondary btn-sm" style="background:var(--success); color:#000;" onclick="markBillPaid('${bill.id}')">💳 Mark Paid</button>` : ''}
          </div>
        </td>
      `;
      billsTbody.appendChild(tr);
    });
  }

  const policies = await DB.request('getInsurance', { clinicId: currentUser.clinicId });
  const insTbody = document.getElementById('staff-insurance-table').querySelector('tbody');
  insTbody.innerHTML = '';

  if (policies.length === 0) {
    insTbody.innerHTML = '<tr><td colspan="4" class="text-center">No insurance records.</td></tr>';
  } else {
    policies.forEach(pol => {
      const tr = document.createElement('tr');
      
      let claimText = '<em class="text-muted">No Claim Filed</em>';
      let claimStatusBadge = '';
      
      if (pol.claimId) {
        let badgeBg = 'rgba(245,158,11,0.1)';
        let badgeColor = '#f59e0b';
        if (pol.claimStatus === 'Approved') {
          badgeBg = 'rgba(16,185,129,0.1)';
          badgeColor = '#10b981';
        } else if (pol.claimStatus === 'Rejected') {
          badgeBg = 'rgba(244,63,94,0.1)';
          badgeColor = '#f43f5e';
        } else if (pol.claimStatus === 'Applied') {
          badgeBg = 'rgba(56,189,248,0.1)';
          badgeColor = '#38bdf8';
        }

        claimText = `Claim ID: <strong>${pol.claimId}</strong><br>Amount: <strong>₹${pol.claimAmount}</strong>`;
        claimStatusBadge = `
          <div style="display:flex; flex-direction:column; gap:0.35rem; align-items:center;">
            <span class="user-badge" style="background:${badgeBg}; color:${badgeColor}; border:1px solid rgba(255,255,255,0.05); font-size:0.7rem;">
              ${pol.claimStatus}
            </span>
            <div style="display:flex; gap:0.2rem; flex-wrap:wrap; justify-content:center;">
              <button class="btn btn-secondary btn-sm" style="padding:0.1rem 0.2rem; font-size:0.6rem; background:rgba(56,189,248,0.15); color:#38bdf8;" onclick="updateClaim('${pol.id}', 'Applied')" title="Set status to Applied">Apply</button>
              <button class="btn btn-secondary btn-sm" style="padding:0.1rem 0.2rem; font-size:0.6rem; background:rgba(245,158,11,0.15); color:#f59e0b;" onclick="updateClaim('${pol.id}', 'Pending Approval')" title="Set status to Pending">Pending</button>
              <button class="btn btn-secondary btn-sm" style="padding:0.1rem 0.2rem; font-size:0.6rem; background:rgba(16,185,129,0.15); color:#10b981;" onclick="updateClaim('${pol.id}', 'Approved')" title="Set status to Approved">Accept</button>
              <button class="btn btn-secondary btn-sm btn-danger" style="padding:0.1rem 0.2rem; font-size:0.6rem;" onclick="updateClaim('${pol.id}', 'Rejected')" title="Set status to Rejected">Reject</button>
            </div>
          </div>
        `;
      }

      tr.innerHTML = `
        <td><strong>${pol.patientId}</strong></td>
        <td>Provider: <strong>${pol.provider}</strong><br>Policy #: <strong>${pol.policyNumber}</strong><br>Max Limit: <strong>₹${pol.coverageAmount}</strong></td>
        <td>${claimText}</td>
        <td>${claimStatusBadge}</td>
      `;
      insTbody.appendChild(tr);
    });
  }
}

window.markBillPaid = async function(billId) {
  const bills = await DB.request('getBills', { clinicId: currentUser.clinicId });
  const bill = bills.find(b => b.id === billId);
  if (bill) {
    bill.paymentStatus = 'Paid';
    bill.amountPaid = bill.total;
    
    if (bill.insuranceClaimId) {
      const claims = await DB.request('getInsurance', { clinicId: currentUser.clinicId });
      const policy = claims.find(p => p.claimId === bill.insuranceClaimId);
      if (policy) {
        policy.claimStatus = 'Approved';
        await DB.request('saveInsurance', policy);
      }
    }

    await DB.request('saveBill', bill);
    loadFinanceDashboard();
  }
};

window.updateClaim = async function(policyId, status) {
  const list = await DB.request('getInsurance', { clinicId: currentUser.clinicId });
  const policy = list.find(p => p.id === policyId);
  if (policy) {
    policy.claimStatus = status;
    await DB.request('saveInsurance', policy);
    
    if (status === 'Approved' && policy.claimId) {
      const bills = await DB.request('getBills', { clinicId: currentUser.clinicId });
      const bill = bills.find(b => b.insuranceClaimId === policy.claimId);
      if (bill) {
        bill.paymentStatus = 'Paid';
        bill.amountPaid = bill.total;
        await DB.request('saveBill', bill);
      }
    } else if (policy.claimId) {
      // Revert bill status to Pending if status is changed to Applied, Pending, or Rejected
      const bills = await DB.request('getBills', { clinicId: currentUser.clinicId });
      const bill = bills.find(b => b.insuranceClaimId === policy.claimId);
      if (bill) {
        bill.paymentStatus = 'Pending';
        bill.amountPaid = 0;
        await DB.request('saveBill', bill);
      }
    }
    loadFinanceDashboard();
  }
};

window.addBillLineItem = function() {
  const descInput = document.getElementById('bill-item-desc');
  const amtInput = document.getElementById('bill-item-amt');
  
  const description = descInput.value.trim();
  const amount = parseFloat(amtInput.value);

  if (!description || isNaN(amount) || amount < 0) {
    alert('Please enter a valid description and positive amount.');
    return;
  }

  currentBillItems.push({ description, amount });
  
  descInput.value = '';
  amtInput.value = '';
  
  renderBillLineItems();
  calculateBillTotals();
};

window.removeBillLineItem = function(index) {
  currentBillItems.splice(index, 1);
  renderBillLineItems();
  calculateBillTotals();
};

function renderBillLineItems() {
  const container = document.getElementById('bill-items-container');
  container.innerHTML = '';
  currentBillItems.forEach((item, index) => {
    const row = document.createElement('div');
    row.className = 'bill-item-row';
    row.innerHTML = `
      <span>${item.description} - <strong>₹${item.amount}</strong></span>
      <span class="remove-item" onclick="removeBillLineItem(${index})">&times;</span>
    `;
    container.appendChild(row);
  });
}

window.calculateBillTotals = function() {
  const subtotal = currentBillItems.reduce((sum, item) => sum + item.amount, 0);
  const discount = parseFloat(document.getElementById('bill-form-discount').value) || 0;
  const tax = parseFloat(document.getElementById('bill-form-tax').value) || 0;
  
  const total = Math.max(0, subtotal - discount + tax);

  document.getElementById('bill-subtotal-disp').textContent = `₹${subtotal}`;
  document.getElementById('bill-total-disp').textContent = `₹${total}`;
};

window.onBillPatientChange = async function() {
  const patientId = document.getElementById('bill-form-patient').value;
  const policies = await DB.request('getInsurance', { clinicId: currentUser.clinicId });
  const policy = policies.find(p => p.patientId === patientId);
  const modeSelect = document.getElementById('bill-form-mode');
  
  if (policy && policy.provider && policy.policyNumber) {
    modeSelect.value = 'Insurance';
  } else {
    modeSelect.value = 'Cash';
  }
};

async function handleBillSubmit(e) {
  e.preventDefault();
  if (currentBillItems.length === 0) {
    alert('Please add at least one line item to the invoice.');
    return;
  }

  const patientId = document.getElementById('bill-form-patient').value;
  const doctorUsername = document.getElementById('bill-form-doctor').value;
  const discount = parseFloat(document.getElementById('bill-form-discount').value) || 0;
  const tax = parseFloat(document.getElementById('bill-form-tax').value) || 0;
  const paymentMode = document.getElementById('bill-form-mode').value;
  const paymentStatus = document.getElementById('bill-form-status').value;

  const patients = await DB.request('getPatients', { clinicId: currentUser.clinicId });
  const patient = patients.find(p => p.id === patientId);
  const patientName = patient ? patient.name : 'Unknown';

  const users = await DB.request('getUsers');
  const doctor = users.find(u => u.username === doctorUsername);
  const doctorName = doctor ? doctor.name : 'Unknown';

  const subtotal = currentBillItems.reduce((sum, item) => sum + item.amount, 0);
  const total = Math.max(0, subtotal - discount + tax);

  const billId = `INV-${1000 + Math.floor(Math.random() * 9000)}`;
  
  let claimId = null;
  if (paymentMode === 'Insurance') {
    claimId = `CLM-${1000 + Math.floor(Math.random() * 9000)}`;
    
    const policies = await DB.request('getInsurance', { clinicId: currentUser.clinicId });
    const policy = policies.find(p => p.patientId === patientId);
    if (policy) {
      policy.claimId = claimId;
      policy.claimAmount = total;
      policy.claimStatus = paymentStatus === 'Paid' ? 'Approved' : 'Pending Approval';
      policy.updatedAt = new Date().toISOString();
      await DB.request('saveInsurance', policy);
    } else {
      const newPolicy = {
        id: `INS-${Date.now()}`,
        clinicId: currentUser.clinicId,
        patientId,
        provider: 'Pending Provider Info',
        policyNumber: 'PENDING-001',
        coverageAmount: 100000,
        claimId,
        claimAmount: total,
        claimStatus: paymentStatus === 'Paid' ? 'Approved' : 'Pending Approval',
        updatedAt: new Date().toISOString()
      };
      await DB.request('saveInsurance', newPolicy);
    }
  }

  const bill = {
    id: billId,
    clinicId: currentUser.clinicId,
    patientId,
    patientName,
    doctorUsername,
    doctorName,
    items: [...currentBillItems],
    subtotal,
    discount,
    tax,
    total,
    amountPaid: paymentStatus === 'Paid' ? total : 0,
    paymentStatus,
    paymentMode,
    insuranceClaimId: claimId,
    createdBy: currentUser.username,
    createdAt: new Date().toISOString()
  };

  await DB.request('saveBill', bill);
  closeModal('modal-create-bill');
  loadFinanceDashboard();
}

async function handleInsuranceSubmit(e) {
  e.preventDefault();
  const patientId = document.getElementById('insurance-form-patient').value;
  const provider = document.getElementById('insurance-form-provider').value.trim();
  const policyNumber = document.getElementById('insurance-form-policy').value.trim();
  const coverageAmount = parseFloat(document.getElementById('insurance-form-coverage').value);

  const list = await DB.request('getInsurance', { clinicId: currentUser.clinicId });
  const existing = list.find(i => i.patientId === patientId);
  const id = existing ? existing.id : `INS-${Date.now()}`;

  const policy = {
    id,
    clinicId: currentUser.clinicId,
    patientId,
    provider,
    policyNumber,
    coverageAmount,
    claimId: existing ? existing.claimId : null,
    claimAmount: existing ? existing.claimAmount : 0,
    claimStatus: existing ? existing.claimStatus : null,
    updatedAt: new Date().toISOString()
  };

  await DB.request('saveInsurance', policy);
  closeModal('modal-patient-insurance');
  loadFinanceDashboard();
}

let activeBillToPrint = null;

window.viewReceipt = async function(billId) {
  const bills = await DB.request('getBills', { clinicId: currentUser.clinicId });
  const bill = bills.find(b => b.id === billId);
  if (bill) {
    activeBillToPrint = bill;
    const printArea = document.getElementById('invoice-receipt-print-area');
    const itemsHtml = bill.items.map(item => `
      <tr>
        <td>${item.description}</td>
        <td class="amount">₹${item.amount}</td>
      </tr>
    `).join('');

    printArea.innerHTML = `
      <h2>MEDIFLOW INVOICE RECEIPT</h2>
      <p style="text-align:center;">Clinic ID: ${bill.clinicId}</p>
      <div class="divider"></div>
      <p><strong>Receipt #:</strong> ${bill.id}</p>
      <p><strong>Date:</strong> ${new Date(bill.createdAt).toLocaleString('en-GB')}</p>
      <p><strong>Patient:</strong> ${bill.patientName} (${bill.patientId})</p>
      <p><strong>Doctor:</strong> ${bill.doctorName}</p>
      <p><strong>Processed By:</strong> ${bill.createdBy}</p>
      <div class="divider"></div>
      <table>
        <thead>
          <tr>
            <th>Description</th>
            <th class="amount">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>
      <div class="divider"></div>
      <p class="amount">Subtotal: ₹${bill.subtotal}</p>
      <p class="amount">Discount: -₹${bill.discount}</p>
      <p class="amount">Tax (GST): +₹${bill.tax}</p>
      <p class="amount" style="font-size:12pt; font-weight:bold;">Total Paid: ₹${bill.amountPaid}</p>
      <p class="amount">Outstanding Due: ₹${bill.total - bill.amountPaid}</p>
      <div class="divider"></div>
      <p>Payment Mode: <strong>${bill.paymentMode}</strong></p>
      <p>Status: <strong>${bill.paymentStatus.toUpperCase()}</strong></p>
      <div class="divider"></div>
      <p style="text-align:center; font-style:italic;">Thank you for using MediFlow Services.</p>
    `;
    openModal('modal-invoice-detail');
  }
};

window.printInvoiceReceipt = function() {
  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <html>
      <head>
        <title>Print Receipt - ${activeBillToPrint.id}</title>
        <style>
          body { font-family: monospace; font-size: 10pt; line-height: 1.4; padding: 2cm; max-width: 8cm; margin: 0 auto; color: #000; }
          h2 { text-align: center; font-size: 14pt; margin: 0 0 0.5rem 0; }
          p { margin: 0.25rem 0; }
          .divider { border-top: 1px dashed #000; margin: 0.5rem 0; }
          table { width: 100%; border-collapse: collapse; }
          th, td { text-align: left; padding: 0.25rem 0; }
          .amount { text-align: right; }
          @media print {
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        ${document.getElementById('invoice-receipt-print-area').innerHTML}
        <script>
          window.onload = function() {
            window.print();
            window.close();
          }
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
};

// --- F. Clinic Admin Sub-Tab & Dashboard Analytics Helpers ---
window.switchCadminTab = function(tabName) {
  document.querySelectorAll('#view-clinic-admin .dashboard-tabs .btn').forEach(btn => btn.classList.remove('active'));
  document.getElementById('panel-cadmin-users').classList.add('hidden');
  document.getElementById('panel-cadmin-apts').classList.add('hidden');
  document.getElementById('panel-cadmin-finance').classList.add('hidden');
  document.getElementById('panel-cadmin-attendance').classList.add('hidden');
  document.getElementById('panel-cadmin-performance').classList.add('hidden');
  document.getElementById('panel-cadmin-apt-billing').classList.add('hidden');
  document.getElementById('panel-cadmin-specialities').classList.add('hidden');

  if (tabName === 'users') {
    document.getElementById('btn-cadmin-tab-users').classList.add('active');
    document.getElementById('panel-cadmin-users').classList.remove('hidden');
    loadClinicAdminDashboardCore();
  } else if (tabName === 'apts') {
    document.getElementById('btn-cadmin-tab-apts').classList.add('active');
    document.getElementById('panel-cadmin-apts').classList.remove('hidden');
    renderCadminAppointments();
  } else if (tabName === 'finance') {
    document.getElementById('btn-cadmin-tab-finance').classList.add('active');
    document.getElementById('panel-cadmin-finance').classList.remove('hidden');
    setFinancePeriod(financePeriod);
  } else if (tabName === 'attendance') {
    document.getElementById('btn-cadmin-tab-attendance').classList.add('active');
    document.getElementById('panel-cadmin-attendance').classList.remove('hidden');
    renderCadminAttendance();
  } else if (tabName === 'performance') {
    document.getElementById('btn-cadmin-tab-performance').classList.add('active');
    document.getElementById('panel-cadmin-performance').classList.remove('hidden');
    renderCadminPerformance();
  } else if (tabName === 'apt-billing') {
    document.getElementById('btn-cadmin-tab-apt-billing').classList.add('active');
    document.getElementById('panel-cadmin-apt-billing').classList.remove('hidden');
    renderCadminAppointmentsBilling();
  } else if (tabName === 'specialities') {
    document.getElementById('btn-cadmin-tab-specialities').classList.add('active');
    document.getElementById('panel-cadmin-specialities').classList.remove('hidden');
    renderCadminSpecialities();
  }
};

window.renderCadminSpecialities = async function() {
  const tableBody = document.querySelector('#cadmin-specialities-table tbody');
  if (!tableBody) return;
  tableBody.innerHTML = '<tr><td colspan="3" style="text-align:center;">Loading...</td></tr>';
  
  const specs = await DB.request('getSpecialities', { clinicId: currentUser.clinicId });
  tableBody.innerHTML = '';
  
  if (specs.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="3" style="text-align:center; color:var(--text-muted);">No specialities configured. Add one to get started!</td></tr>';
    return;
  }
  
  specs.forEach(s => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="font-weight:600; color:var(--text-main);">${s.name}</td>
      <td style="font-size:1.5rem; text-align:center; width: 100px;">${s.icon}</td>
      <td style="width: 180px; text-align: right;">
        <button class="btn btn-secondary btn-sm" onclick="openEditSpecialityModal('${s.name}', '${s.icon}')" style="margin-right:0.25rem;">✏️ Edit</button>
        <button class="btn btn-secondary btn-sm btn-danger" onclick="deleteCadminSpeciality('${s.name}')">🗑️ Delete</button>
      </td>
    `;
    tableBody.appendChild(tr);
  });
};

window.openAddSpecialityModal = function() {
  document.getElementById('speciality-modal-title').textContent = 'Add New Speciality';
  document.getElementById('speciality-form-old-name').value = '';
  document.getElementById('speciality-form-name').value = '';
  document.getElementById('speciality-form-icon').value = '';
  openModal('modal-speciality');
};

window.openEditSpecialityModal = function(name, icon) {
  document.getElementById('speciality-modal-title').textContent = 'Modify Speciality';
  document.getElementById('speciality-form-old-name').value = name;
  document.getElementById('speciality-form-name').value = name;
  document.getElementById('speciality-form-icon').value = icon;
  openModal('modal-speciality');
};

window.handleSpecialitySubmit = async function(e) {
  e.preventDefault();
  const oldName = document.getElementById('speciality-form-old-name').value;
  const name = document.getElementById('speciality-form-name').value.trim();
  const icon = document.getElementById('speciality-form-icon').value.trim();
  
  if (!name || !icon) return;
  
  await DB.request('saveSpeciality', {
    clinicId: currentUser.clinicId,
    name,
    icon,
    oldName: oldName || null
  });
  
  closeModal('modal-speciality');
  renderCadminSpecialities();
};

window.deleteCadminSpeciality = async function(name) {
  if (confirm(`Are you sure you want to delete "${name}"? Doctors currently assigned to this speciality will be set to empty.`)) {
    await DB.request('deleteSpeciality', {
      clinicId: currentUser.clinicId,
      name
    });
    renderCadminSpecialities();
  }
};

window.renderCadminAppointments = async function() {
  const allAppointments = await DB.request('getAppointments', { clinicId: currentUser.clinicId });
  const dateFilter = document.getElementById('cadmin-apt-filter-date').value;
  const docFilter = document.getElementById('cadmin-apt-filter-doctor').value;
  const statusFilter = document.getElementById('cadmin-apt-filter-status').value;
  const searchInput = document.getElementById('cadmin-apt-search-input');
  const searchQuery = searchInput ? searchInput.value.toLowerCase().trim() : '';

  let filtered = allAppointments;
  if (dateFilter) {
    filtered = filtered.filter(a => a.date === dateFilter);
  }
  if (docFilter !== 'All') {
    filtered = filtered.filter(a => a.doctorUsername === docFilter);
  }
  if (statusFilter !== 'All') {
    filtered = filtered.filter(a => a.status === statusFilter);
  }
  if (searchQuery) {
    filtered = filtered.filter(a => 
      a.id.toLowerCase().includes(searchQuery) ||
      a.patientName.toLowerCase().includes(searchQuery) ||
      a.patientId.toLowerCase().includes(searchQuery) ||
      a.doctorName.toLowerCase().includes(searchQuery)
    );
  }

  filtered.sort((a,b) => new Date(a.date + ' ' + a.time) - new Date(b.date + ' ' + b.time));

  const tbody = document.getElementById('cadmin-apts-table').querySelector('tbody');
  tbody.innerHTML = '';

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center">No matching appointments found.</td></tr>';
    return;
  }

  filtered.forEach(apt => {
    const tr = document.createElement('tr');
    let badgeBg = 'rgba(245,158,11,0.1)';
    let badgeColor = '#f59e0b';
    if (apt.status === 'Scheduled') {
      badgeBg = 'rgba(129,140,248,0.1)'; // Indigo
      badgeColor = '#818cf8';
    } else if (apt.status === 'Confirmed') {
      badgeBg = 'rgba(168,85,247,0.1)'; // Purple
      badgeColor = '#a855f7';
    } else if (apt.status === 'Checked In') {
      badgeBg = 'rgba(56,189,248,0.1)';
      badgeColor = '#38bdf8';
    } else if (apt.status === 'Completed') {
      badgeBg = 'rgba(16,185,129,0.1)';
      badgeColor = '#10b981';
    } else if (apt.status === 'Cancelled') {
      badgeBg = 'rgba(244,63,94,0.1)';
      badgeColor = '#f43f5e';
    } else if (apt.status === 'Pending Confirmation') {
      badgeBg = 'rgba(245,158,11,0.1)';
      badgeColor = '#f59e0b';
    }

    tr.innerHTML = `
      <td><strong>${apt.id}</strong></td>
      <td>${apt.patientName} (${apt.patientId})</td>
      <td>${apt.doctorName}</td>
      <td>${apt.date} at ${apt.time}</td>
      <td>${apt.type}</td>
      <td>
        <span class="user-badge" style="background:${badgeBg}; color:${badgeColor}; border:1px solid rgba(255,255,255,0.05);">
          ${apt.status}
        </span>
      </td>
    `;
    tbody.appendChild(tr);
  });
};

window.setFinancePeriod = async function(period) {
  financePeriod = period;
  document.querySelectorAll('.period-selectors .btn').forEach(btn => btn.classList.remove('active'));
  
  const targetBtn = document.getElementById(`f-period-${period === 'all' ? 'all' : period}`);
  if (targetBtn) targetBtn.classList.add('active');

  const bills = await DB.request('getBills', { clinicId: currentUser.clinicId });
  const now = new Date();

  const matchesPeriod = (dateStr) => {
    const d = new Date(dateStr);
    const diffMs = now - d;
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    if (period === 'day') {
      return d.toDateString() === now.toDateString();
    } else if (period === 'week') {
      return diffDays <= 7;
    } else if (period === 'month') {
      return diffDays <= 30;
    } else if (period === 'year') {
      return d.getFullYear() === now.getFullYear();
    } else {
      return true;
    }
  };

  const filteredBills = bills.filter(b => matchesPeriod(b.createdAt));

  let totalBilled = 0;
  let totalCollected = 0;
  let totalOutstanding = 0;

  const paymentModes = { Cash: 0, Card: 0, UPI: 0, Insurance: 0 };
  const billingCategories = { Consultations: 0, Diagnostics: 0, Extras: 0 };

  filteredBills.forEach(b => {
    totalBilled += b.total;
    totalCollected += b.amountPaid;
    totalOutstanding += (b.total - b.amountPaid);

    if (paymentModes[b.paymentMode] !== undefined) {
      paymentModes[b.paymentMode] += b.amountPaid;
    }

    b.items.forEach(item => {
      const desc = item.description.toLowerCase();
      if (desc.includes('consult')) {
        billingCategories.Consultations += item.amount;
      } else if (desc.includes('test') || desc.includes('cbc') || desc.includes('blood') || desc.includes('scan') || desc.includes('x-ray') || desc.includes('diagnost')) {
        billingCategories.Diagnostics += item.amount;
      } else {
        billingCategories.Extras += item.amount;
      }
    });
  });

  document.getElementById('f-stat-billed').textContent = `₹${totalBilled.toLocaleString('en-IN')}`;
  document.getElementById('f-stat-collected').textContent = `₹${totalCollected.toLocaleString('en-IN')}`;
  document.getElementById('f-stat-outstanding').textContent = `₹${totalOutstanding.toLocaleString('en-IN')}`;

  const paymentContainer = document.getElementById('payment-mode-breakdown');
  paymentContainer.innerHTML = '';
  Object.keys(paymentModes).forEach(mode => {
    const val = paymentModes[mode];
    const pct = totalCollected > 0 ? (val / totalCollected) * 100 : 0;
    paymentContainer.innerHTML += `
      <div class="progress-bar-container">
        <div class="progress-bar-label">
          <span>${mode}</span>
          <strong>₹${val.toLocaleString('en-IN')} (${pct.toFixed(0)}%)</strong>
        </div>
        <div class="progress-bar-outer">
          <div class="progress-bar-inner" style="width: ${pct}%; background: ${mode === 'Cash' ? '#10b981' : mode === 'Card' ? '#38bdf8' : mode === 'UPI' ? '#818cf8' : '#f59e0b'};"></div>
        </div>
      </div>
    `;
  });

  const categoryContainer = document.getElementById('billing-type-breakdown');
  categoryContainer.innerHTML = '';
  const totalCatSum = billingCategories.Consultations + billingCategories.Diagnostics + billingCategories.Extras;
  Object.keys(billingCategories).forEach(cat => {
    const val = billingCategories[cat];
    const pct = totalCatSum > 0 ? (val / totalCatSum) * 100 : 0;
    categoryContainer.innerHTML += `
      <div class="progress-bar-container">
        <div class="progress-bar-label">
          <span>${cat}</span>
          <strong>₹${val.toLocaleString('en-IN')} (${pct.toFixed(0)}%)</strong>
        </div>
        <div class="progress-bar-outer">
          <div class="progress-bar-inner" style="width: ${pct}%; background: ${cat === 'Consultations' ? '#6366f1' : cat === 'Diagnostics' ? '#a855f7' : '#ec4899'};"></div>
        </div>
      </div>
    `;
  });
};

window.renderCadminAttendance = async function() {
  const logs = await DB.request('getAttendance', { clinicId: currentUser.clinicId });
  logs.sort((a,b) => new Date(b.loginTime) - new Date(a.loginTime));

  const tbody = document.getElementById('cadmin-attendance-table').querySelector('tbody');
  tbody.innerHTML = '';

  if (logs.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center">No attendance logs available.</td></tr>';
    return;
  }

  logs.forEach(log => {
    const tr = document.createElement('tr');
    const loginStr = new Date(log.loginTime).toLocaleString('en-GB');
    const logoutStr = log.logoutTime ? new Date(log.logoutTime).toLocaleString('en-GB') : '<span class="user-badge" style="background:rgba(16,185,129,0.1); color:#10b981;">Active Now</span>';
    
    let durationText = '-';
    if (log.logoutTime) {
      const activeMs = new Date(log.logoutTime) - new Date(log.loginTime);
      const hours = Math.floor(activeMs / (1000 * 60 * 60));
      const mins = Math.floor((activeMs % (1000 * 60 * 60)) / (1000 * 60));
      durationText = `${hours}h ${mins}m`;
    }

    tr.innerHTML = `
      <td><strong>${log.id}</strong></td>
      <td>${log.username}</td>
      <td>${log.name}</td>
      <td>${loginStr}</td>
      <td>${logoutStr}</td>
      <td><strong>${durationText}</strong></td>
    `;
    tbody.appendChild(tr);
  });
};

window.renderCadminPerformance = async function() {
  const users = await DB.request('getUsers');
  const appointments = await DB.request('getAppointments', { clinicId: currentUser.clinicId });
  const bills = await DB.request('getBills', { clinicId: currentUser.clinicId });

  const clinicUsers = users.filter(u => u.clinicId === currentUser.clinicId);
  const staffs = clinicUsers.filter(u => u.role === 'staff');
  const doctors = clinicUsers.filter(u => u.role === 'doctor');

  const tbodyStaff = document.getElementById('cadmin-staff-performance-table').querySelector('tbody');
  tbodyStaff.innerHTML = '';

  if (staffs.length === 0) {
    tbodyStaff.innerHTML = '<tr><td colspan="4" class="text-center">No staff profiles registered.</td></tr>';
  } else {
    staffs.forEach(st => {
      const aptsCount = appointments.filter(a => a.createdBy === st.username).length;
      const billsCount = bills.filter(b => b.createdBy === st.username).length;
      const totalAmount = bills.filter(b => b.createdBy === st.username).reduce((sum, b) => sum + b.total, 0);

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${st.name}</strong> (${st.username})</td>
        <td>${aptsCount} bookings</td>
        <td>${billsCount} invoices</td>
        <td><strong>₹${totalAmount.toLocaleString('en-IN')}</strong></td>
      `;
      tbodyStaff.appendChild(tr);
    });
  }

  const tbodyDoc = document.getElementById('cadmin-doc-performance-table').querySelector('tbody');
  tbodyDoc.innerHTML = '';

  if (doctors.length === 0) {
    tbodyDoc.innerHTML = '<tr><td colspan="5" class="text-center">No doctors registered.</td></tr>';
  } else {
    doctors.forEach(doc => {
      const completedApts = appointments.filter(a => a.doctorUsername === doc.username && a.status === 'Completed').length;
      const doctorBills = bills.filter(b => b.doctorUsername === doc.username);
      
      let consultSum = 0;
      let otherSum = 0;
      let totalSum = 0;

      doctorBills.forEach(b => {
        totalSum += b.total;
        b.items.forEach(item => {
          if (item.description.toLowerCase().includes('consult')) {
            consultSum += item.amount;
          } else {
            otherSum += item.amount;
          }
        });
      });

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${doc.name}</strong></td>
        <td>${completedApts} patients</td>
        <td>₹${consultSum.toLocaleString('en-IN')}</td>
        <td>₹${otherSum.toLocaleString('en-IN')}</td>
        <td><strong style="color:var(--accent-color);">₹${totalSum.toLocaleString('en-IN')}</strong></td>
      `;
      tbodyDoc.appendChild(tr);
    });
  }
};

// --- G. Clinic Payment Ratings & Invoicing Systems ---
function calculateClinicRating(payments) {
  if (!payments || payments.length === 0) return 5.0;
  const totalInvoices = payments.length;
  const paidInvoices = payments.filter(p => p.status === 'Paid').length;
  const score = (paidInvoices / totalInvoices) * 5;
  return parseFloat(score.toFixed(1));
}

function getRatingStars(score) {
  const fullStars = Math.round(score);
  const emptyStars = 5 - fullStars;
  return '⭐'.repeat(fullStars) + '☆'.repeat(emptyStars) + ` (${score}/5)`;
}

window.renderClinicPayments = async function() {
  const clinics = await DB.request('getClinics');
  const tbody = document.getElementById('clinic-payments-table').querySelector('tbody');
  if (!tbody) return;
  tbody.innerHTML = '';

  clinics.forEach(clinic => {
    const payments = clinic.payments || [];
    const ratingScore = calculateClinicRating(payments);
    const starsHtml = getRatingStars(ratingScore);

    const unpaidDues = payments
      .filter(p => p.status !== 'Paid')
      .reduce((sum, p) => sum + p.amountDue, 0);

    const modelLabel = clinic.billingModel === 'Subscription' ? 'Subscription' : 'Pay Per Patient';
    const rateLabel = clinic.billingModel === 'Subscription' ? `₹${clinic.rate}/mo` : `₹${clinic.rate}/patient`;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${clinic.name}</strong> (${clinic.id})</td>
      <td><span class="user-badge" style="background:rgba(56,189,248,0.1); color:#38bdf8; border:none;">${modelLabel}</span></td>
      <td>${rateLabel}</td>
      <td style="color:${unpaidDues > 0 ? 'var(--error)' : 'var(--success)'}; font-weight:600;">
        ₹${unpaidDues.toLocaleString('en-IN')}
      </td>
      <td style="color:var(--warning); font-weight:600;">${starsHtml}</td>
      <td>
        <button class="btn btn-secondary btn-sm" onclick="viewClinicPaymentHistory('${clinic.id}')">👁️ View History</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
};

window.viewClinicPaymentHistory = async function(clinicId) {
  const clinics = await DB.request('getClinics');
  const clinic = clinics.find(c => c.id === clinicId);
  if (!clinic) return;

  document.getElementById('clinic-payment-history-title').textContent = `${clinic.name} - Billing History`;
  document.getElementById('cpay-detail-model').textContent = clinic.billingModel === 'Subscription' ? 'Monthly Flat Rate' : 'Pay Per Patient Entry';
  document.getElementById('cpay-detail-rate').textContent = clinic.billingModel === 'Subscription' ? `₹${clinic.rate} / Month` : `₹${clinic.rate} / Patient Entry`;

  const payments = clinic.payments || [];
  const unpaidDues = payments.filter(p => p.status !== 'Paid').reduce((sum, p) => sum + p.amountDue, 0);
  const score = calculateClinicRating(payments);

  document.getElementById('cpay-detail-dues').textContent = `₹${unpaidDues.toLocaleString('en-IN')}`;
  document.getElementById('cpay-detail-rating').textContent = getRatingStars(score);

  const tbody = document.getElementById('clinic-invoices-table').querySelector('tbody');
  tbody.innerHTML = '';

  if (payments.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center">No billing invoice logs found.</td></tr>';
  } else {
    payments.forEach(pay => {
      const metricText = clinic.billingModel === 'Subscription' ? '-' : `${pay.patientCount} patients`;
      const dateText = new Date(pay.invoiceDate).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
      
      let badgeBg = 'rgba(16,185,129,0.1)';
      let badgeColor = '#10b981';
      if (pay.status === 'Overdue') {
        badgeBg = 'rgba(244,63,94,0.1)';
        badgeColor = '#f43f5e';
      }

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${dateText}</strong><br><small style="color:var(--text-muted);">${pay.invoiceDate}</small></td>
        <td>${metricText}</td>
        <td><strong>₹${pay.amountDue}</strong></td>
        <td>₹${pay.amountPaid}</td>
        <td>
          <span class="user-badge" style="background:${badgeBg}; color:${badgeColor}; border:1px solid rgba(255,255,255,0.05);">
            ${pay.status}
          </span>
        </td>
        <td>
          ${pay.status !== 'Paid' ? `<button class="btn btn-secondary btn-sm" style="background:var(--success); color:#000;" onclick="payClinicInvoice('${clinic.id}', '${pay.invoiceDate}')">💳 Record Pay</button>` : `<small style="color:var(--text-muted);">Paid on ${pay.paymentDate}</small>`}
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  openModal('modal-clinic-payment-history');
};

window.payClinicInvoice = async function(clinicId, invoiceDate) {
  const clinics = await DB.request('getClinics');
  const clinic = clinics.find(c => c.id === clinicId);
  if (clinic && clinic.payments) {
    const pay = clinic.payments.find(p => p.invoiceDate === invoiceDate);
    if (pay) {
      pay.status = 'Paid';
      pay.amountPaid = pay.amountDue;
      pay.paymentDate = new Date().toISOString().split('T')[0];
      await DB.request('saveClinic', clinic);
      
      viewClinicPaymentHistory(clinicId);
      loadSuperAdminDashboard();
    }
  }
};

// --- H. Cadmin Appointment Payments & Billing Dashboard ---
function getAppointmentPaymentStatus(apt, bills) {
  // Find bill corresponding to this appointment or patient on the same day
  const bill = bills.find(b => b.patientId === apt.patientId && b.doctorUsername === apt.doctorUsername && b.createdAt.split('T')[0] === apt.date);
  
  if (!bill) {
    return { status: 'Pending', total: 0, paid: 0, invoiceId: '-' };
  }

  let paymentLabel = 'Pending';
  if (bill.paymentStatus === 'Paid') {
    if (apt.status === 'Completed') {
      paymentLabel = 'Paid';
    } else {
      paymentLabel = 'Prepaid';
    }
  }

  return {
    status: paymentLabel,
    total: bill.total,
    paid: bill.amountPaid,
    invoiceId: bill.id
  };
}

window.renderCadminAppointmentsBilling = async function() {
  const allAppointments = await DB.request('getAppointments', { clinicId: currentUser.clinicId });
  const bills = await DB.request('getBills', { clinicId: currentUser.clinicId });
  const searchInput = document.getElementById('cadmin-apt-billing-search-input');
  const searchQuery = searchInput ? searchInput.value.toLowerCase().trim() : '';
  const paymentFilter = document.getElementById('cadmin-apt-billing-filter-payment').value;

  // Filter out Cancelled appointments
  let filtered = allAppointments.filter(a => a.status !== 'Cancelled');

  // Map to get payment statuses
  const mapped = filtered.map(apt => {
    const payInfo = getAppointmentPaymentStatus(apt, bills);
    return { ...apt, payInfo };
  });

  let finalFiltered = mapped;

  if (searchQuery) {
    finalFiltered = finalFiltered.filter(a => 
      a.id.toLowerCase().includes(searchQuery) ||
      a.patientName.toLowerCase().includes(searchQuery) ||
      a.patientId.toLowerCase().includes(searchQuery) ||
      a.doctorName.toLowerCase().includes(searchQuery)
    );
  }

  if (paymentFilter !== 'All') {
    finalFiltered = finalFiltered.filter(a => a.payInfo.status === paymentFilter);
  }

  finalFiltered.sort((a,b) => new Date(b.date + ' ' + b.time) - new Date(a.date + ' ' + a.time));

  const tbody = document.getElementById('cadmin-apt-billing-table').querySelector('tbody');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (finalFiltered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="text-center">No matching appointment payments found.</td></tr>';
    return;
  }

  finalFiltered.forEach(item => {
    const tr = document.createElement('tr');
    
    let badgeBg = 'rgba(244,63,94,0.1)';
    let badgeColor = '#f43f5e';
    if (item.payInfo.status === 'Paid') {
      badgeBg = 'rgba(16,185,129,0.1)';
      badgeColor = '#10b981';
    } else if (item.payInfo.status === 'Prepaid') {
      badgeBg = 'rgba(56,189,248,0.1)';
      badgeColor = '#38bdf8';
    }

    tr.innerHTML = `
      <td><strong>${item.id}</strong></td>
      <td>${item.patientName} (${item.patientId})</td>
      <td>${item.date} at ${item.time}</td>
      <td>${item.doctorName}</td>
      <td><strong>${item.payInfo.invoiceId}</strong></td>
      <td>₹${item.payInfo.total}</td>
      <td>₹${item.payInfo.paid}</td>
      <td>
        <span class="user-badge" style="background:${badgeBg}; color:${badgeColor}; border:1px solid rgba(255,255,255,0.05);">
          ${item.payInfo.status}
        </span>
      </td>
    `;
    tbody.appendChild(tr);
  });
};

// --- I. Cadmin Leave Management & Weekly Duty Schedule ---
window.toggleUserLeave = async function(username) {
  const users = await DB.request('getUsers');
  const user = users.find(u => u.username === username);
  if (user) {
    user.status = user.status === 'On Leave' ? 'Active' : 'On Leave';
    await DB.request('saveUser', user);
    loadClinicAdminDashboard();
  }
};

window.openViewScheduleModal = async function() {
  const clinics = await DB.request('getClinics');
  const clinic = clinics.find(c => c.id === currentUser.clinicId);
  if (!clinic) {
    alert("Error: Clinic not found.");
    return;
  }
  
  let scheduleData;
  if (clinic.dutySchedule) {
    try {
      scheduleData = JSON.parse(clinic.dutySchedule);
      if (!scheduleData || !scheduleData.columns || !scheduleData.rows) {
        throw new Error("Invalid structure");
      }
    } catch(e) {
      scheduleData = initializeDefaultSchedule();
    }
  } else {
    scheduleData = initializeDefaultSchedule();
  }
  
  renderScheduleCalendarGrid(scheduleData);
  openModal('modal-duty-schedule-view');
};

function initializeDefaultSchedule() {
  return {
    columns: ["Morning Shift", "Day Shift", "Night Shift"],
    rows: [
      { date: "2026-05-25 (Monday)", cells: {} },
      { date: "2026-05-26 (Tuesday)", cells: {} },
      { date: "2026-05-27 (Wednesday)", cells: {} },
      { date: "2026-05-28 (Thursday)", cells: {} },
      { date: "2026-05-29 (Friday)", cells: {} },
      { date: "2026-05-30 (Saturday)", cells: {} },
      { date: "2026-05-31 (Sunday)", cells: {} }
    ]
  };
}

window.renderScheduleCalendarGrid = function(scheduleData) {
  const isCadmin = currentUser && currentUser.role === 'clinic_admin';
  const table = document.getElementById('schedule-calendar-table');
  const thead = table.querySelector('thead');
  const tbody = table.querySelector('tbody');
  
  thead.innerHTML = '';
  tbody.innerHTML = '';
  
  // Toggle Admin Tools Visibility
  const tools = document.getElementById('cadmin-schedule-tools');
  if (isCadmin) {
    tools.classList.remove('hidden');
  } else {
    tools.classList.add('hidden');
  }
  
  // Generate Table Header
  const trHead = document.createElement('tr');
  const thDate = document.createElement('th');
  thDate.textContent = 'Date / Day';
  trHead.appendChild(thDate);
  
  scheduleData.columns.forEach(col => {
    const th = document.createElement('th');
    th.textContent = col;
    if (isCadmin) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn-col-delete';
      btn.innerHTML = '&times;';
      btn.title = 'Delete Shift Column';
      btn.onclick = (e) => {
        e.stopPropagation();
        deleteShiftColumn(col);
      };
      th.appendChild(btn);
    }
    trHead.appendChild(th);
  });
  
  if (isCadmin) {
    const thActions = document.createElement('th');
    thActions.textContent = 'Actions';
    trHead.appendChild(thActions);
  }
  thead.appendChild(trHead);
  
  // Generate Table Body
  scheduleData.rows.forEach((row, rowIndex) => {
    const tr = document.createElement('tr');
    
    // Date Cell
    const tdDate = document.createElement('td');
    tdDate.style.fontWeight = '600';
    tdDate.textContent = row.date;
    tr.appendChild(tdDate);
    
    // Shift Cells
    scheduleData.columns.forEach(col => {
      const td = document.createElement('td');
      td.className = 'calendar-cell-interactive';
      const rosterVal = row.cells[col] || '';
      
      td.innerHTML = `
        <div class="cell-content">
          <span class="cell-roster-text">${rosterVal ? rosterVal : '<em class="text-muted" style="font-size:0.75rem;">No one scheduled</em>'}</span>
        </div>
      `;
      
      td.onclick = () => {
        if (isCadmin) {
          openCellEditModal(rowIndex, col);
        } else {
          openCellViewModal(rowIndex, col);
        }
      };
      
      tr.appendChild(td);
    });
    
    // Row Actions for Cadmin
    if (isCadmin) {
      const tdActions = document.createElement('td');
      tdActions.innerHTML = `
        <div style="display:flex; gap:0.25rem;">
          <button type="button" class="btn btn-secondary btn-sm" onclick="editRowDate(${rowIndex})" style="padding:0.2rem 0.4rem; font-size:0.75rem;">✏️ Edit</button>
          <button type="button" class="btn btn-secondary btn-sm btn-danger" onclick="deleteDateRow(${rowIndex})" style="padding:0.2rem 0.4rem; font-size:0.75rem;">🗑️ Delete</button>
        </div>
      `;
      tr.appendChild(tdActions);
    }
    
    tbody.appendChild(tr);
  });
};

window.addNewShiftColumn = async function() {
  const shiftName = prompt("Enter new shift name (e.g. Evening Shift):");
  if (!shiftName) return;
  const nameTrimmed = shiftName.trim();
  if (!nameTrimmed) return;
  
  const clinics = await DB.request('getClinics');
  const clinic = clinics.find(c => c.id === currentUser.clinicId);
  if (!clinic) return;
  
  let scheduleData;
  try {
    scheduleData = JSON.parse(clinic.dutySchedule);
    if (!scheduleData || !scheduleData.columns) throw new Error();
  } catch(e) {
    scheduleData = initializeDefaultSchedule();
  }
  
  if (scheduleData.columns.includes(nameTrimmed)) {
    alert("Shift column already exists.");
    return;
  }
  
  scheduleData.columns.push(nameTrimmed);
  clinic.dutySchedule = JSON.stringify(scheduleData);
  await DB.request('saveClinic', clinic);
  renderScheduleCalendarGrid(scheduleData);
};

window.deleteShiftColumn = async function(colName) {
  if (!confirm(`Are you sure you want to delete the shift column "${colName}"? This will delete all rosters assigned to this shift.`)) {
    return;
  }
  
  const clinics = await DB.request('getClinics');
  const clinic = clinics.find(c => c.id === currentUser.clinicId);
  if (!clinic) return;
  
  let scheduleData;
  try {
    scheduleData = JSON.parse(clinic.dutySchedule);
    if (!scheduleData || !scheduleData.columns) throw new Error();
  } catch(e) {
    scheduleData = initializeDefaultSchedule();
  }
  
  scheduleData.columns = scheduleData.columns.filter(c => c !== colName);
  scheduleData.rows.forEach(row => {
    if (row.cells && row.cells[colName] !== undefined) {
      delete row.cells[colName];
    }
  });
  
  clinic.dutySchedule = JSON.stringify(scheduleData);
  await DB.request('saveClinic', clinic);
  renderScheduleCalendarGrid(scheduleData);
};

window.addNewDateRow = async function() {
  const clinics = await DB.request('getClinics');
  const clinic = clinics.find(c => c.id === currentUser.clinicId);
  if (!clinic) return;
  
  let scheduleData;
  try {
    scheduleData = JSON.parse(clinic.dutySchedule);
    if (!scheduleData || !scheduleData.rows) throw new Error();
  } catch(e) {
    scheduleData = initializeDefaultSchedule();
  }
  
  let defaultVal = "";
  if (scheduleData.rows.length > 0) {
    const lastDateText = scheduleData.rows[scheduleData.rows.length - 1].date;
    const match = lastDateText.match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) {
      const lastDate = new Date(match[1]);
      lastDate.setDate(lastDate.getDate() + 1);
      const yyyy = lastDate.getFullYear();
      const mm = String(lastDate.getMonth() + 1).padStart(2, '0');
      const dd = String(lastDate.getDate()).padStart(2, '0');
      const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const dayName = days[lastDate.getDay()];
      defaultVal = `${yyyy}-${mm}-${dd} (${dayName})`;
    }
  }
  
  const dateVal = prompt("Enter date or day text (e.g. 2026-06-01 (Monday)):", defaultVal);
  if (!dateVal) return;
  const valTrimmed = dateVal.trim();
  if (!valTrimmed) return;
  
  scheduleData.rows.push({
    date: valTrimmed,
    cells: {}
  });
  
  clinic.dutySchedule = JSON.stringify(scheduleData);
  await DB.request('saveClinic', clinic);
  renderScheduleCalendarGrid(scheduleData);
};

window.deleteDateRow = async function(rowIndex) {
  if (!confirm("Are you sure you want to delete this date row?")) {
    return;
  }
  
  const clinics = await DB.request('getClinics');
  const clinic = clinics.find(c => c.id === currentUser.clinicId);
  if (!clinic) return;
  
  let scheduleData;
  try {
    scheduleData = JSON.parse(clinic.dutySchedule);
    if (!scheduleData || !scheduleData.rows) throw new Error();
  } catch(e) {
    scheduleData = initializeDefaultSchedule();
  }
  
  scheduleData.rows.splice(rowIndex, 1);
  
  clinic.dutySchedule = JSON.stringify(scheduleData);
  await DB.request('saveClinic', clinic);
  renderScheduleCalendarGrid(scheduleData);
};

window.editRowDate = async function(rowIndex) {
  const clinics = await DB.request('getClinics');
  const clinic = clinics.find(c => c.id === currentUser.clinicId);
  if (!clinic) return;
  
  let scheduleData;
  try {
    scheduleData = JSON.parse(clinic.dutySchedule);
    if (!scheduleData || !scheduleData.rows) throw new Error();
  } catch(e) {
    scheduleData = initializeDefaultSchedule();
  }
  
  const oldDate = scheduleData.rows[rowIndex].date;
  const newDate = prompt("Edit date or day text:", oldDate);
  if (!newDate) return;
  const valTrimmed = newDate.trim();
  if (!valTrimmed) return;
  
  scheduleData.rows[rowIndex].date = valTrimmed;
  
  clinic.dutySchedule = JSON.stringify(scheduleData);
  await DB.request('saveClinic', clinic);
  renderScheduleCalendarGrid(scheduleData);
};

window.openCellViewModal = async function(rowIndex, colName) {
  const clinics = await DB.request('getClinics');
  const clinic = clinics.find(c => c.id === currentUser.clinicId);
  if (!clinic) return;
  
  let scheduleData;
  try {
    scheduleData = JSON.parse(clinic.dutySchedule);
  } catch(e) {
    scheduleData = initializeDefaultSchedule();
  }
  
  const row = scheduleData.rows[rowIndex];
  if (!row) return;
  
  document.getElementById('cell-view-date').textContent = row.date;
  document.getElementById('cell-view-shift').textContent = colName;
  
  const rosterText = row.cells[colName] || '';
  const rosterDiv = document.getElementById('cell-view-roster');
  if (rosterText) {
    rosterDiv.innerHTML = rosterText.split(',').map(name => `
      <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.4rem;">
        <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background-color:var(--accent-color);"></span>
        <span>${name.trim()}</span>
      </div>
    `).join('');
  } else {
    rosterDiv.innerHTML = '<em class="text-muted">No personnel scheduled for this shift.</em>';
  }
  
  openModal('modal-cell-view');
};

window.openCellEditModal = async function(rowIndex, colName) {
  const clinics = await DB.request('getClinics');
  const clinic = clinics.find(c => c.id === currentUser.clinicId);
  if (!clinic) return;
  
  let scheduleData;
  try {
    scheduleData = JSON.parse(clinic.dutySchedule);
  } catch(e) {
    scheduleData = initializeDefaultSchedule();
  }
  
  const row = scheduleData.rows[rowIndex];
  if (!row) return;
  
  document.getElementById('cell-edit-row-index').value = rowIndex;
  document.getElementById('cell-edit-shift-name').value = colName;
  document.getElementById('cell-edit-date-display').textContent = row.date;
  document.getElementById('cell-edit-shift-display').textContent = colName;
  
  const currentRosterVal = row.cells[colName] || '';
  
  // Load users
  const users = await DB.request('getUsers');
  const clinicUsers = users.filter(u => u.clinicId === currentUser.clinicId && u.role !== 'admin');
  
  // Filter out matching clinic users from currentRosterVal to isolate custom entries
  let customRosterVal = currentRosterVal;
  const escapeRegExp = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  clinicUsers.forEach(user => {
    const isAssigned = currentRosterVal.toLowerCase().includes(user.name.toLowerCase());
    if (isAssigned) {
      const regex = new RegExp('(,\\s*)?' + escapeRegExp(user.name) + '(,\\s*)?', 'gi');
      customRosterVal = customRosterVal.replace(regex, (match, p1, p2) => {
        return (p1 && p2) ? ', ' : '';
      });
    }
  });
  // Clean up punctuation
  customRosterVal = customRosterVal.replace(/,\s*,/g, ',').replace(/^[\s,]+|[\s,]+$/g, '').trim();
  
  document.getElementById('cell-edit-custom-roster').value = customRosterVal;
  
  const checklistContainer = document.getElementById('cell-edit-personnel-checklist');
  checklistContainer.innerHTML = '';
  
  if (clinicUsers.length === 0) {
    checklistContainer.innerHTML = '<em class="text-muted" style="font-size:0.8rem;">No clinic personnel found.</em>';
  } else {
    clinicUsers.forEach(user => {
      const div = document.createElement('div');
      div.style.display = 'flex';
      div.style.alignItems = 'center';
      div.style.gap = '0.5rem';
      
      const isLeave = user.status === 'On Leave';
      const isAssigned = currentRosterVal.toLowerCase().includes(user.name.toLowerCase());
      
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.value = user.name;
      checkbox.id = `roster-user-${user.username}`;
      checkbox.checked = isAssigned && !isLeave;
      if (isLeave) {
        checkbox.disabled = true;
      }
      
      const label = document.createElement('label');
      label.htmlFor = `roster-user-${user.username}`;
      label.style.fontSize = '0.9rem';
      label.style.cursor = isLeave ? 'not-allowed' : 'pointer';
      if (isLeave) {
        label.innerHTML = `<span style="color:var(--text-muted); text-decoration:line-through;">${user.name}</span> <span style="color:var(--error); font-size:0.75rem; font-weight:600;">(On Leave)</span>`;
      } else {
        label.textContent = `${user.name} (${user.role === 'clinic_admin' ? 'Admin' : user.role === 'doctor' ? 'Doctor' : 'Staff'})`;
      }
      
      div.appendChild(checkbox);
      div.appendChild(label);
      checklistContainer.appendChild(div);
    });
  }
  
  openModal('modal-cell-edit');
};

window.handleCellEditSubmit = async function(e) {
  e.preventDefault();
  
  const rowIndex = parseInt(document.getElementById('cell-edit-row-index').value);
  const shiftName = document.getElementById('cell-edit-shift-name').value;
  const customRosterText = document.getElementById('cell-edit-custom-roster').value.trim();
  
  const checklistContainer = document.getElementById('cell-edit-personnel-checklist');
  const checkedBoxes = Array.from(checklistContainer.querySelectorAll('input[type="checkbox"]:checked'));
  const checkedNames = checkedBoxes.map(cb => cb.value);
  
  // Combine checkedNames and custom entries
  const finalRosterParts = [...checkedNames];
  if (customRosterText) {
    customRosterText.split(',').forEach(item => {
      const trimmed = item.trim();
      if (trimmed && !finalRosterParts.includes(trimmed)) {
        finalRosterParts.push(trimmed);
      }
    });
  }
  
  const finalRosterText = finalRosterParts.join(', ');
  
  const clinics = await DB.request('getClinics');
  const clinic = clinics.find(c => c.id === currentUser.clinicId);
  if (!clinic) return;
  
  let scheduleData;
  try {
    scheduleData = JSON.parse(clinic.dutySchedule);
  } catch(e) {
    scheduleData = initializeDefaultSchedule();
  }
  
  if (scheduleData.rows[rowIndex]) {
    scheduleData.rows[rowIndex].cells[shiftName] = finalRosterText;
  }
  
  clinic.dutySchedule = JSON.stringify(scheduleData);
  await DB.request('saveClinic', clinic);
  
  closeModal('modal-cell-edit');
  renderScheduleCalendarGrid(scheduleData);
  alert("Success: Shift roster updated.");
};

window.openDoctorSlotsModal = async function(username, name) {
  // Set hidden inputs / title
  document.getElementById('slots-doc-username').value = username;
  document.getElementById('slots-doc-name-display').textContent = name;

  // Retrieve current configuration
  const slotConfig = await DB.request('getDoctorSlotConfig', {
    doctorUsername: username,
    clinicId: currentUser.clinicId
  });

  // Setup form fields with current config or default settings
  if (slotConfig) {
    document.getElementById('slots-duration').value = slotConfig.slotDuration || 30;
    
    // Checkboxes for workdays
    const workdaysArr = slotConfig.workDays || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
    document.querySelectorAll('#doctor-slots-form input[name="workdays"]').forEach(cb => {
      cb.checked = workdaysArr.includes(cb.value);
    });

    // Sessions
    const sessions = slotConfig.sessions || [];
    if (sessions.length > 0) {
      document.getElementById('slots-s1-start').value = sessions[0].start || '09:00';
      document.getElementById('slots-s1-end').value = sessions[0].end || '13:00';
    } else {
      document.getElementById('slots-s1-start').value = '09:00';
      document.getElementById('slots-s1-end').value = '13:00';
    }

    if (sessions.length > 1) {
      document.getElementById('slots-s2-active').checked = true;
      document.getElementById('slots-s2-row').classList.remove('hidden');
      document.getElementById('slots-s2-start').value = sessions[1].start || '17:00';
      document.getElementById('slots-s2-end').value = sessions[1].end || '20:00';
    } else {
      document.getElementById('slots-s2-active').checked = false;
      document.getElementById('slots-s2-row').classList.add('hidden');
      document.getElementById('slots-s2-start').value = '17:00';
      document.getElementById('slots-s2-end').value = '20:00';
    }
  } else {
    // Defaults
    document.getElementById('slots-duration').value = 30;
    document.querySelectorAll('#doctor-slots-form input[name="workdays"]').forEach(cb => {
      cb.checked = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].includes(cb.value);
    });
    document.getElementById('slots-s1-start').value = '09:00';
    document.getElementById('slots-s1-end').value = '13:00';
    
    document.getElementById('slots-s2-active').checked = false;
    document.getElementById('slots-s2-row').classList.add('hidden');
    document.getElementById('slots-s2-start').value = '17:00';
    document.getElementById('slots-s2-end').value = '20:00';
  }

  openModal('modal-doctor-slots');
};

window.handleDoctorSlotsSubmit = async function(e) {
  e.preventDefault();
  
  const username = document.getElementById('slots-doc-username').value;
  const slotDuration = parseInt(document.getElementById('slots-duration').value) || 30;
  
  // Workdays
  const checkedBoxes = document.querySelectorAll('#doctor-slots-form input[name="workdays"]:checked');
  const workDays = Array.from(checkedBoxes).map(cb => cb.value);
  
  if (workDays.length === 0) {
    alert("Please select at least one workday.");
    return;
  }
  
  // Sessions
  const s1Start = document.getElementById('slots-s1-start').value;
  const s1End = document.getElementById('slots-s1-end').value;
  
  if (!s1Start || !s1End) {
    alert("Please enter both start and end times for Session 1.");
    return;
  }
  
  const sessions = [
    { label: 'Morning', start: s1Start, end: s1End }
  ];
  
  const s2Active = document.getElementById('slots-s2-active').checked;
  if (s2Active) {
    const s2Start = document.getElementById('slots-s2-start').value;
    const s2End = document.getElementById('slots-s2-end').value;
    if (!s2Start || !s2End) {
      alert("Please enter both start and end times for Session 2.");
      return;
    }
    sessions.push({ label: 'Evening', start: s2Start, end: s2End });
  }
  
  const payload = {
    clinicId: currentUser.clinicId,
    doctorUsername: username,
    slotDuration,
    workDays,
    sessions
  };
  
  await DB.request('saveDoctorSlotConfig', payload);
  
  closeModal('modal-doctor-slots');
  showPortalToast('Doctor slot configuration saved successfully!', 'success');
};


// --- J. Clinic Internal Staff Room Chat & Audio Notifications ---
let activeChatInterval = null;
let chatOpen = false;
let chatSoundEnabled = localStorage.getItem('mediflow_chat_sound') !== 'false'; // default true
let lastSeenMessageId = null;
let isTabActive = true;

// Track tab focus
window.addEventListener('focus', () => { isTabActive = true; clearUnreadBadge(); });
window.addEventListener('blur', () => { isTabActive = false; });

window.toggleChatPanel = function() {
  const panel = document.getElementById('clinic-chat-panel');
  if (panel.classList.contains('hidden')) {
    panel.classList.remove('hidden');
    chatOpen = true;
    clearUnreadBadge();
    const container = document.getElementById('clinic-chat-messages');
    container.scrollTop = container.scrollHeight;
    document.getElementById('clinic-chat-input').focus();
  } else {
    panel.classList.add('hidden');
    chatOpen = false;
  }
};

window.toggleChatSound = function() {
  chatSoundEnabled = !chatSoundEnabled;
  localStorage.setItem('mediflow_chat_sound', chatSoundEnabled ? 'true' : 'false');
  updateChatSoundButton();
};

function updateChatSoundButton() {
  const btn = document.getElementById('chat-sound-toggle');
  if (btn) {
    btn.textContent = chatSoundEnabled ? '🔊' : '🔇';
    btn.title = chatSoundEnabled ? 'Mute Sound Alerts' : 'Unmute Sound Alerts';
  }
}

window.playChatAlertSound = function() {
  if (!chatSoundEnabled) return;
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    
    // Tone 1: C5
    const osc1 = audioCtx.createOscillator();
    const gain1 = audioCtx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
    gain1.gain.setValueAtTime(0.15, audioCtx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
    
    osc1.connect(gain1);
    gain1.connect(audioCtx.destination);
    osc1.start();
    osc1.stop(audioCtx.currentTime + 0.3);
    
    // Tone 2: E5 (played slightly later)
    setTimeout(() => {
      const osc2 = audioCtx.createOscillator();
      const gain2 = audioCtx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(659.25, audioCtx.currentTime); // E5
      gain2.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain2.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
      
      osc2.connect(gain2);
      gain2.connect(audioCtx.destination);
      osc2.start();
      osc2.stop(audioCtx.currentTime + 0.4);
    }, 120);
  } catch (err) {
    console.warn("Web Audio Context could not start:", err);
  }
};

window.playHazardAlertSound = function() {
  if (!chatSoundEnabled) return;
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    const playTone = (time, freq) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, time);
      gain.gain.setValueAtTime(0.2, time);
      gain.gain.exponentialRampToValueAtTime(0.01, time + 0.25);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(time);
      osc.stop(time + 0.3);
    };
    const now = audioCtx.currentTime;
    playTone(now, 880);
    playTone(now + 0.25, 660);
    playTone(now + 0.5, 880);
    playTone(now + 0.75, 660);
    playTone(now + 1.0, 880);
  } catch (err) {
    console.warn("Hazard Web Audio could not start:", err);
  }
};

window.triggerHazardAlert = async function() {
  const input = document.getElementById('clinic-chat-input');
  const text = input.value.trim();
  
  let confirmMsg = "⚠️ TRIGGER CLINIC-WIDE EMERGENCY HAZARD ALERT?\n\nThis will instantly flash an emergency alarm on all online staff screens and sound a warning siren.";
  if (text) {
    confirmMsg += `\n\nYour alert message: "${text}"`;
  } else {
    confirmMsg += `\n\n(No custom message entered. A default alarm message will be sent.)`;
  }
  
  if (!confirm(confirmMsg)) {
    return;
  }
  
  const clinicId = currentUser.clinicId;
  const chatsRaw = localStorage.getItem(`mediflow_chats_${clinicId}`) || '[]';
  let chats = [];
  try {
    chats = JSON.parse(chatsRaw);
  } catch(e) {
    chats = [];
  }
  
  const newMsg = {
    id: 'msg-hazard-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
    senderUsername: currentUser.username,
    senderName: currentUser.name,
    senderRole: currentUser.role,
    text: text ? `🚨 EMERGENCY: ${text}` : `🚨 EMERGENCY HAZARD ALERT TRIGGERED!`,
    timestamp: new Date().toISOString(),
    recipients: null, // Scopes to notify everyone
    isHazard: true
  };
  
  chats.push(newMsg);
  localStorage.setItem(`mediflow_chats_${clinicId}`, JSON.stringify(chats));
  
  input.value = '';
  syncClinicChats(false);
  
  const container = document.getElementById('clinic-chat-messages');
  if (container) {
    container.scrollTop = container.scrollHeight;
  }
};

window.initClinicChat = function() {
  if (activeChatInterval) {
    clearInterval(activeChatInterval);
    activeChatInterval = null;
  }
  
  const widget = document.getElementById('clinic-chat-widget');
  if (!currentUser || currentUser.role === 'admin' || !currentUser.clinicId) {
    if (widget) widget.classList.add('hidden');
    return;
  }
  
  if (widget) {
    widget.classList.remove('hidden');
  }
  updateChatSoundButton();
  populateChatRecipients();
  syncClinicChats(true);
  
  activeChatInterval = setInterval(() => {
    syncClinicChats(false);
  }, 2000);
};

window.teardownClinicChat = function() {
  if (activeChatInterval) {
    clearInterval(activeChatInterval);
    activeChatInterval = null;
  }
  const widget = document.getElementById('clinic-chat-widget');
  if (widget) {
    widget.classList.add('hidden');
  }
  const panel = document.getElementById('clinic-chat-panel');
  if (panel) {
    panel.classList.add('hidden');
  }
  chatOpen = false;
  lastSeenMessageId = null;
  const messagesDiv = document.getElementById('clinic-chat-messages');
  if (messagesDiv) {
    messagesDiv.innerHTML = '';
  }
};

window.syncClinicChats = function(isInitialLoad) {
  if (!currentUser || !currentUser.clinicId) return;
  
  const clinicId = currentUser.clinicId;
  const chatsRaw = localStorage.getItem(`mediflow_chats_${clinicId}`) || '[]';
  let chats = [];
  try {
    chats = JSON.parse(chatsRaw);
  } catch(e) {
    chats = [];
  }
  
  const container = document.getElementById('clinic-chat-messages');
  if (!container) return;
  
  const isScrolledToBottom = container.scrollHeight - container.clientHeight <= container.scrollTop + 30;
  
  container.innerHTML = '';
  
  if (chats.length === 0) {
    container.innerHTML = `<div style="text-align:center; color:var(--text-muted); font-size:0.85rem; margin-top:2rem; font-style:italic;">No messages in clinic room. Start the conversation!</div>`;
  } else {
    chats.forEach(msg => {
      // Filter visibility: only show if sender, or if recipients is null/all, or if current user is in recipients list
      const canSee = msg.senderUsername === currentUser.username || 
                     !msg.recipients || 
                     msg.recipients.includes(currentUser.username);
      if (!canSee) return;

      const bubble = document.createElement('div');
      const isSent = msg.senderUsername === currentUser.username;
      bubble.className = `chat-bubble ${isSent ? 'sent' : 'received'}`;
      
      const roleName = msg.senderRole.replace('clinic_admin', 'Admin').replace('doctor', 'Doctor').replace('staff', 'Staff');
      const roleClass = `badge-${msg.senderRole}`;
      const timeStr = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      bubble.innerHTML = `
        ${!isSent ? `<span class="chat-bubble-sender ${roleClass}">${msg.senderName} (${roleName})</span>` : ''}
        <span>${escapeHTML(msg.text)}</span>
        <span class="chat-bubble-meta">${timeStr}</span>
      `;
      
      container.appendChild(bubble);
    });
  }
  
  if (isInitialLoad || isScrolledToBottom) {
    container.scrollTop = container.scrollHeight;
  }
  
  if (chats.length > 0) {
    const latestMsg = chats[chats.length - 1];
    if (latestMsg.id !== lastSeenMessageId) {
      if (!isInitialLoad && latestMsg.senderUsername !== currentUser.username) {
        if (latestMsg.isHazard) {
          // Play urgent hazard sound
          playHazardAlertSound();
          
          // Open hazard overlay warning modal
          const senderRoleName = latestMsg.senderRole.replace('clinic_admin', 'Admin').replace('doctor', 'Doctor').replace('staff', 'Staff');
          document.getElementById('hazard-alert-title').innerHTML = `⚠️ Triggered by <strong style="color:var(--text-main);">${latestMsg.senderName}</strong> (${senderRoleName})`;
          document.getElementById('hazard-alert-msg').textContent = latestMsg.text;
          openModal('modal-hazard-alert');
          
          if (!chatOpen || !isTabActive) {
            incrementUnreadBadge();
          }
        } else {
          // Only trigger alerts if this user is explicitly chosen as recipient
          const isRecipient = !latestMsg.recipients || latestMsg.recipients.includes(currentUser.username);
          if (isRecipient) {
            playChatAlertSound();
            if (!chatOpen || !isTabActive) {
              incrementUnreadBadge();
            }
          }
        }
      }
      lastSeenMessageId = latestMsg.id;
    }
  }
};

function incrementUnreadBadge() {
  const badge = document.getElementById('clinic-chat-badge');
  if (badge) {
    const currentVal = parseInt(badge.textContent) || 0;
    badge.textContent = currentVal + 1;
    badge.classList.remove('hidden');
  }
}

function clearUnreadBadge() {
  const badge = document.getElementById('clinic-chat-badge');
  if (badge) {
    badge.textContent = '0';
    badge.classList.add('hidden');
  }
}

window.sendClinicChatMessage = async function(e) {
  e.preventDefault();
  if (!currentUser || !currentUser.clinicId) return;
  
  const input = document.getElementById('clinic-chat-input');
  const text = input.value.trim();
  if (!text) return;
  
  // Gather checked recipients
  const listContainer = document.getElementById('chat-recipients-list');
  let recipients = null;
  if (listContainer) {
    const checkedBoxes = Array.from(listContainer.querySelectorAll('input[type="checkbox"]:checked'));
    recipients = checkedBoxes.map(cb => cb.value);
  }
  
  const clinicId = currentUser.clinicId;
  const chatsRaw = localStorage.getItem(`mediflow_chats_${clinicId}`) || '[]';
  let chats = [];
  try {
    chats = JSON.parse(chatsRaw);
  } catch(e) {
    chats = [];
  }
  
  const newMsg = {
    id: 'msg-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
    senderUsername: currentUser.username,
    senderName: currentUser.name,
    senderRole: currentUser.role,
    text: text,
    timestamp: new Date().toISOString(),
    recipients: recipients // Scopes notifications to these usernames
  };
  
  chats.push(newMsg);
  localStorage.setItem(`mediflow_chats_${clinicId}`, JSON.stringify(chats));
  
  input.value = '';
  
  // Hide popover after sending
  const popover = document.getElementById('chat-recipients-popover');
  if (popover) {
    popover.classList.add('hidden');
  }
  
  syncClinicChats(false);
  
  const container = document.getElementById('clinic-chat-messages');
  if (container) {
    container.scrollTop = container.scrollHeight;
  }
};

function escapeHTML(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

window.populateChatRecipients = async function() {
  const users = await DB.request('getUsers');
  const otherUsers = users.filter(u => u.clinicId === currentUser.clinicId && u.username !== currentUser.username && u.role !== 'admin');
  
  const listContainer = document.getElementById('chat-recipients-list');
  if (!listContainer) return;
  
  listContainer.innerHTML = '';
  if (otherUsers.length === 0) {
    listContainer.innerHTML = '<em class="text-muted" style="font-size:0.75rem;">No other staff online.</em>';
  } else {
    otherUsers.forEach(user => {
      const label = document.createElement('label');
      label.style.display = 'flex';
      label.style.alignItems = 'center';
      label.style.gap = '0.5rem';
      label.style.fontSize = '0.8rem';
      label.style.cursor = 'pointer';
      label.style.color = 'var(--text-main)';
      
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.value = user.username;
      checkbox.className = 'chat-recipient-checkbox';
      checkbox.checked = true; // Default to notify everyone
      
      const roleName = user.role.replace('clinic_admin', 'Admin').replace('doctor', 'Doctor').replace('staff', 'Staff');
      label.appendChild(checkbox);
      label.appendChild(document.createTextNode(`${user.name} (${roleName})`));
      
      listContainer.appendChild(label);
    });
  }
};

window.toggleRecipientsPopover = function() {
  const popover = document.getElementById('chat-recipients-popover');
  if (popover) {
    popover.classList.toggle('hidden');
  }
};

window.toggleRecipientsAll = function(checkAll) {
  const listContainer = document.getElementById('chat-recipients-list');
  if (!listContainer) return;
  const checkboxes = listContainer.querySelectorAll('input[type="checkbox"]');
  checkboxes.forEach(cb => cb.checked = checkAll);
};

window.triggerChatAuditAuth = function() {
  const passwordInput = document.getElementById('cadmin-auth-password');
  if (passwordInput) {
    passwordInput.value = '';
  }
  const errorDiv = document.getElementById('cadmin-auth-error');
  if (errorDiv) {
    errorDiv.classList.add('hidden');
  }
  openModal('modal-cadmin-auth');
  setTimeout(() => {
    if (passwordInput) passwordInput.focus();
  }, 100);
};

window.verifyCadminChatPassword = async function(e) {
  e.preventDefault();
  if (!currentUser || currentUser.role !== 'clinic_admin') {
    alert("Unauthorized access.");
    return;
  }
  
  const passwordInput = document.getElementById('cadmin-auth-password');
  const enteredPw = passwordInput ? passwordInput.value : '';
  
  if (enteredPw === currentUser.password) {
    closeModal('modal-cadmin-auth');
    openModal('modal-cadmin-chat-audit');
    const searchInput = document.getElementById('chat-audit-search');
    if (searchInput) {
      searchInput.value = '';
    }
    renderChatAuditLog();
  } else {
    const errorDiv = document.getElementById('cadmin-auth-error');
    if (errorDiv) {
      errorDiv.classList.remove('hidden');
    }
    if (passwordInput) {
      passwordInput.focus();
      passwordInput.select();
    }
  }
};

window.renderChatAuditLog = async function() {
  if (!currentUser || !currentUser.clinicId) return;
  
  const searchInput = document.getElementById('chat-audit-search');
  const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
  
  const clinicId = currentUser.clinicId;
  const chatsRaw = localStorage.getItem(`mediflow_chats_${clinicId}`) || '[]';
  let chats = [];
  try {
    chats = JSON.parse(chatsRaw);
  } catch(e) {
    chats = [];
  }
  
  // Filter chats by query
  let filteredChats = chats;
  if (query) {
    filteredChats = chats.filter(msg => {
      return (msg.text && msg.text.toLowerCase().includes(query)) ||
             (msg.senderName && msg.senderName.toLowerCase().includes(query)) ||
             (msg.senderUsername && msg.senderUsername.toLowerCase().includes(query));
    });
  }
  
  // Sort descending by timestamp (newest first)
  filteredChats.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  
  // Load users to resolve display names for recipients
  const users = await DB.request('getUsers');
  const userMap = new Map();
  users.forEach(u => {
    userMap.set(u.username, u.name);
  });
  
  const tbody = document.querySelector('#chat-audit-table tbody');
  if (!tbody) return;
  tbody.innerHTML = '';
  
  if (filteredChats.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align:center; padding:2rem; color:var(--text-muted); font-style:italic;">
          No chat history found.
        </td>
      </tr>
    `;
    return;
  }
  
  filteredChats.forEach(msg => {
    const tr = document.createElement('tr');
    
    if (msg.isHazard) {
      tr.className = 'audit-row-hazard';
    }
    
    // Time formatting
    const timeStr = new Date(msg.timestamp).toLocaleString([], {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    // Sender formatting
    const roleName = msg.senderRole.replace('clinic_admin', 'Admin').replace('doctor', 'Doctor').replace('staff', 'Staff');
    const roleClass = `badge-${msg.senderRole}`;
    const senderHtml = `
      <div style="font-weight:600; color:var(--text-main);">${escapeHTML(msg.senderName)}</div>
      <div style="font-size:0.75rem;" class="${roleClass}">${roleName} (@${escapeHTML(msg.senderUsername)})</div>
    `;
    
    // Audience / Recipients formatting
    let audienceHtml = '';
    if (msg.recipients && Array.isArray(msg.recipients) && msg.recipients.length > 0) {
      const names = msg.recipients.map(username => {
        const displayName = userMap.get(username) || username;
        return displayName;
      });
      audienceHtml = `
        <span class="user-badge" style="background:rgba(56,189,248,0.1); color:var(--doctor-color); font-size:0.75rem;" title="${escapeHTML(msg.recipients.join(', '))}">
          🔔 Private (${names.length})
        </span>
        <div style="font-size:0.75rem; color:var(--text-muted); margin-top:0.25rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:180px;">
          ${escapeHTML(names.join(', '))}
        </div>
      `;
    } else {
      audienceHtml = `
        <span class="user-badge" style="background:rgba(129,140,248,0.1); color:var(--staff-color); font-size:0.75rem;">
          👥 Everyone
        </span>
      `;
    }
    
    // Message
    const msgText = escapeHTML(msg.text);
    
    // Alert badge
    let alertHtml = '';
    if (msg.isHazard) {
      alertHtml = `
        <span class="user-badge" style="background:rgba(244,63,94,0.15); color:var(--error); font-size:0.75rem; border:1px solid rgba(244,63,94,0.3);">
          🚨 Hazard
        </span>
      `;
    } else if (msg.recipients && msg.recipients.length > 0) {
      alertHtml = `
        <span class="user-badge" style="background:rgba(245,158,11,0.1); color:var(--warning); font-size:0.75rem;">
          Direct
        </span>
      `;
    } else {
      alertHtml = `
        <span class="user-badge" style="background:rgba(16,185,129,0.1); color:var(--success); font-size:0.75rem;">
          Info
        </span>
      `;
    }
    
    tr.innerHTML = `
      <td>${timeStr}</td>
      <td>${senderHtml}</td>
      <td>${audienceHtml}</td>
      <td style="white-space:pre-wrap; word-break:break-word; max-width:400px;">${msgText}</td>
      <td style="text-align:center;">${alertHtml}</td>
    `;
    
    tbody.appendChild(tr);
  });
};


// =============================================================
// PATIENT PUBLIC PORTAL MODULE
// =============================================================

// --- Portal State ---
let portalAccount = null;       // logged-in patient account
let portalClinic = null;        // selected clinic object
let bookingState = {            // booking wizard state
  step: 1,
  name: '', age: '', gender: '', phone: '', address: '', reason: '',
  speciality: '', doctorUsername: '', doctorName: '',
  date: '', time: '',
  currentDate: null
};
let currentUpiAppointmentId = null;

const SPECIALITY_ICONS = {
  'General Medicine': '🩺',
  'ENT': '👂',
  'Dental': '🦷',
  'Dermatology': '🧴',
  'Ophthalmology': '👁️',
  'Orthopaedics': '🦴',
  'Gynaecology': '👩‍⚕️',
  'Paediatrics': '👶',
  'Cardiology': '❤️',
  'Neurology': '🧠',
};

// --- Portal View Router ---
function showPortalView(viewId) {
  // Hide ALL admin views
  ['view-login','view-admin','view-clinic-admin','view-staff','view-doctor'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
  });
  document.getElementById('main-nav').classList.add('hidden');

  // Hide ALL patient portal views
  ['view-landing','view-patient-auth','view-clinic-selector','view-patient-booking','view-patient-dashboard'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
  });

  // Patient nav visibility
  const patientNav = document.getElementById('patient-nav');
  if (viewId === 'view-landing') {
    patientNav.classList.add('hidden');
  } else {
    patientNav.classList.remove('hidden');
    updatePatientNav();
  }

  // Show the requested view
  const target = document.getElementById(viewId);
  if (target) {
    target.classList.remove('hidden');
    window.scrollTo(0, 0);
  }
}

async function updatePatientNav() {
  const greeting = document.getElementById('patient-nav-greeting');
  const nameEl   = document.getElementById('patient-nav-name');
  const dashBtn  = document.getElementById('patient-dashboard-btn');
  const bookBtn  = document.getElementById('patient-book-btn');
  const settingsBtn = document.getElementById('patient-settings-btn');
  const logoutBtn= document.getElementById('patient-logout-btn');
  const signinBtn= document.getElementById('patient-signin-nav-btn');

  if (portalAccount) {
    greeting.classList.remove('hidden');
    
    let clinicName = '';
    if (portalAccount.clinicId) {
      try {
        const clinics = await DB.request('getClinics');
        const clinic = clinics.find(c => c.id === portalAccount.clinicId);
        if (clinic) {
          clinicName = ` (${clinic.name})`;
        }
      } catch (e) {
        console.warn(e);
      }
    }
    
    nameEl.textContent = portalAccount.name.split(' ')[0] + clinicName;
    dashBtn.classList.remove('hidden');
    bookBtn.classList.remove('hidden');
    if (settingsBtn) settingsBtn.classList.remove('hidden');
    logoutBtn.classList.remove('hidden');
    signinBtn.classList.add('hidden');
  } else {
    greeting.classList.add('hidden');
    dashBtn.classList.add('hidden');
    bookBtn.classList.add('hidden');
    if (settingsBtn) settingsBtn.classList.add('hidden');
    logoutBtn.classList.add('hidden');
    signinBtn.classList.remove('hidden');
  }
}

// --- Landing Page ---
function portalGoLanding() {
  showPortalView('view-landing');
  initLandingStats();
}

async function initLandingStats() {
  const clinics = await DB.request('getClinics');
  const users   = await DB.request('getUsers');
  const doctors = users.filter(u => u.role === 'doctor');
  const elC = document.getElementById('stat-clinics-hero');
  const elD = document.getElementById('stat-doctors-hero');
  if (elC) elC.textContent = clinics.length + '+';
  if (elD) elD.textContent = doctors.length + '+';
}

// --- Auth ---
function portalShowAuth(tab = 'signup') {
  showPortalView('view-patient-auth');
  switchAuthTab(tab);
}

function switchAuthTab(tab) {
  const signupForm = document.getElementById('patient-signup-form');
  const signinForm = document.getElementById('patient-signin-form');
  const tabSignup  = document.getElementById('auth-tab-signup');
  const tabSignin  = document.getElementById('auth-tab-signin');
  if (tab === 'signup') {
    signupForm.classList.remove('hidden');
    signinForm.classList.add('hidden');
    tabSignup.classList.add('active');
    tabSignin.classList.remove('active');
  } else {
    signupForm.classList.add('hidden');
    signinForm.classList.remove('hidden');
    tabSignup.classList.remove('active');
    tabSignin.classList.add('active');
  }
}

async function handlePatientSignup() {
  const name    = document.getElementById('signup-name').value.trim();
  const phone   = document.getElementById('signup-phone').value.trim();
  const pass    = document.getElementById('signup-password').value;
  const confirm = document.getElementById('signup-confirm-password').value;

  if (!name || !phone || !pass) { showPortalToast('Please fill all fields.', 'error'); return; }
  const disclaimerChecked = document.getElementById('signup-disclaimer').checked;
  if (!disclaimerChecked) { showPortalToast('Please accept the simulation disclaimer to sign up.', 'error'); return; }
  if (phone.length < 10) { showPortalToast('Enter a valid 10-digit mobile number.', 'error'); return; }
  if (pass !== confirm)  { showPortalToast('Passwords do not match.', 'error'); return; }

  const existing = await DB.request('getPatientAccountByPhone', { phone });
  if (existing) { showPortalToast('Account already exists. Please sign in.', 'error'); return; }

  const account = {
    id: `PA-${Date.now()}`,
    name, phone, password: pass,
    age: '', gender: '', address: '',
    clinicId: null, city: null,
    createdAt: new Date().toISOString()
  };
  await DB.request('savePatientAccount', account);
  portalAccount = account;
  sessionStorage.setItem('mediflow_patient_session', JSON.stringify(account));
  showPortalToast('Account created! Now choose your clinic.', 'success');
  setTimeout(() => showClinicSelector(false), 600);
}

async function handlePatientSignin() {
  const phone = document.getElementById('signin-phone').value.trim();
  const pass  = document.getElementById('signin-password').value;

  if (!phone || !pass) { showPortalToast('Please fill all fields.', 'error'); return; }
  const disclaimerChecked = document.getElementById('signin-disclaimer').checked;
  if (!disclaimerChecked) { showPortalToast('Please accept the simulation disclaimer to sign in.', 'error'); return; }

  const account = await DB.request('getPatientAccountByPhone', { phone });
  if (!account || account.password !== pass) {
    showPortalToast('Invalid mobile number or password.', 'error');
    return;
  }

  portalAccount = account;
  sessionStorage.setItem('mediflow_patient_session', JSON.stringify(account));
  showPortalToast('Signed in successfully!', 'success');
  setTimeout(() => {
    if (!account.clinicId) {
      showClinicSelector(false);
    } else {
      portalShowDashboard();
    }
  }, 500);
}

function portalLogout() {
  portalAccount = null;
  portalClinic  = null;
  sessionStorage.removeItem('mediflow_patient_session');
  portalGoLanding();
}

function portalSessionRestore(account) {
  portalAccount = account;
  if (!account.clinicId) {
    showClinicSelector(false);
  } else {
    portalShowDashboard();
  }
}

// --- Clinic Selector ---
async function showClinicSelector(allowSkip = false) {
  showPortalView('view-clinic-selector');
  const clinics = await DB.request('getClinics');

  // Populate city dropdown
  const citySelect = document.getElementById('selector-city');
  const cities = [...new Set(clinics.map(c => c.city).filter(Boolean))].sort();
  citySelect.innerHTML = '<option value="">— Choose a city —</option>' +
    cities.map(c => `<option value="${c}">${c}</option>`).join('');

  // Reset
  document.getElementById('selector-clinics-list').classList.add('hidden');
  document.getElementById('selector-confirm-btn').disabled = true;
  window._selectorClinics = clinics;
  window._selectorSelectedClinic = null;
}

async function onCitySelectorChange() {
  const city = document.getElementById('selector-city').value;
  const clinicsDiv = document.getElementById('selector-clinics-list');
  const optionsDiv = document.getElementById('selector-clinics-options');

  if (!city) { clinicsDiv.classList.add('hidden'); return; }

  const clinics = (window._selectorClinics || []).filter(c => c.city === city);
  clinicsDiv.classList.remove('hidden');
  window._selectorSelectedClinic = null;
  document.getElementById('selector-confirm-btn').disabled = true;

  optionsDiv.innerHTML = clinics.map(c => `
    <div class="clinic-option-card" id="clinic-opt-${c.id}" onclick="selectClinicOption('${c.id}')">
      <div class="clinic-icon">🏥</div>
      <div class="clinic-info">
        <h4>${c.name}</h4>
        <p>${c.address || city}</p>
      </div>
    </div>
  `).join('') || '<p style="color:var(--text-muted); font-size:0.875rem;">No clinics found in this city.</p>';
}

function selectClinicOption(clinicId) {
  document.querySelectorAll('.clinic-option-card').forEach(el => el.classList.remove('selected'));
  const card = document.getElementById(`clinic-opt-${clinicId}`);
  if (card) card.classList.add('selected');
  window._selectorSelectedClinic = (window._selectorClinics || []).find(c => c.id === clinicId);
  document.getElementById('selector-confirm-btn').disabled = false;
}

async function confirmClinicSelection() {
  const clinic = window._selectorSelectedClinic;
  if (!clinic) { showPortalToast('Please select a clinic.', 'error'); return; }

  portalAccount.clinicId = clinic.id;
  portalAccount.city = clinic.city;
  portalClinic = clinic;
  await DB.request('savePatientAccount', portalAccount);
  sessionStorage.setItem('mediflow_patient_session', JSON.stringify(portalAccount));
  showPortalToast('Clinic selected!', 'success');
  setTimeout(() => portalShowDashboard(), 500);
}

// --- Patient Dashboard ---
async function portalShowDashboard() {
  if (!portalAccount) { portalShowAuth('signin'); return; }

  // Load clinic info
  if (!portalClinic && portalAccount.clinicId) {
    const clinics = await DB.request('getClinics');
    portalClinic = clinics.find(c => c.id === portalAccount.clinicId) || null;
  }

  showPortalView('view-patient-dashboard');

  // Update profile bar
  const initials = portalAccount.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  document.getElementById('patient-avatar-initials').textContent = initials;
  document.getElementById('profile-display-name').textContent = portalAccount.name;
  document.getElementById('profile-display-sub').textContent =
    `📍 ${portalClinic ? portalClinic.name + ', ' + portalClinic.city : 'No clinic selected'} · 📱 ${portalAccount.phone}`;

  switchPatientDashTab('apts');
}

function switchPatientDashTab(tab) {
  ['apts','payments','rx'].forEach(t => {
    document.getElementById(`pdash-panel-${t}`).classList.toggle('hidden', t !== tab);
    document.getElementById(`pdash-tab-${t}`).classList.toggle('active', t === tab);
  });

  if (tab === 'apts')     renderPatientAppointments();
  if (tab === 'payments') renderPatientPayments();
  if (tab === 'rx')       renderPatientPrescriptions();
}

async function renderPatientAppointments() {
  const list = document.getElementById('patient-apts-list');
  list.innerHTML = '<p style="color:var(--text-muted); padding:1rem;">Loading...</p>';

  const all = await DB.request('getAppointmentsByPhone', { phone: portalAccount.phone });
  const clinics = await DB.request('getClinics');

  if (!all.length) {
    list.innerHTML = emptyState('📅', 'No appointments yet', 'Book your first appointment using the button above.');
    return;
  }

  const sorted = [...all].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  list.innerHTML = '';

  sorted.forEach(apt => {
    const clinic = clinics.find(c => c.id === apt.clinicId);
    const d = new Date(apt.date + 'T00:00');
    const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const statusClass = apt.status === 'Pending Confirmation' ? 'pending'
      : apt.status === 'Confirmed' ? 'confirmed'
      : apt.status === 'Scheduled' ? 'scheduled'
      : apt.status === 'Completed' ? 'completed'
      : 'cancelled';

    const ticketBtn = (apt.status === 'Confirmed' || apt.status === 'Completed')
      ? `<button class="btn btn-secondary btn-sm" onclick="showAppointmentTicket('${apt.id}')">🎫 Ticket</button>` : '';

    const payBtn = apt.paymentStatus === 'Pending' && (apt.status === 'Confirmed' || apt.status === 'Completed')
      ? `<button class="btn btn-secondary btn-sm" style="border-color:#6366f1; color:#a5b4fc;" onclick="openUpiPayment('${apt.id}')">💳 Pay</button>` : '';

    const item = document.createElement('div');
    item.className = 'appointment-history-item';
    item.innerHTML = `
      <div class="apt-date-block">
        <span class="adb-day">${dayNames[d.getDay()]}</span>
        <span class="adb-num">${d.getDate()}</span>
      </div>
      <div class="apt-info">
        <h4>${apt.doctorName} · ${apt.speciality || 'Consultation'}</h4>
        <p>${clinic ? clinic.name : apt.clinicId} · ${apt.time} · ${apt.date}</p>
        ${apt.reason ? `<p style="margin-top:0.2rem; font-style:italic;">"${apt.reason}"</p>` : ''}
      </div>
      <div class="apt-actions">
        <span class="status-badge ${statusClass}">${apt.status}</span>
        ${ticketBtn}
        ${payBtn}
      </div>
    `;
    list.appendChild(item);
  });
}

async function renderPatientPayments() {
  const list = document.getElementById('patient-payments-list');
  list.innerHTML = '<p style="color:var(--text-muted); padding:1rem;">Loading...</p>';

  const bills = await DB.request('getBillsByPhone', { phone: portalAccount.phone });
  const clinics = await DB.request('getClinics');

  if (!bills.length) {
    list.innerHTML = emptyState('💳', 'No payment records', 'Your billing history will appear here after appointments.');
    return;
  }

  const sorted = [...bills].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  list.innerHTML = '';
  sorted.forEach(bill => {
    const clinic = clinics.find(c => c.id === bill.clinicId);
    const isPaid = bill.paymentStatus === 'Paid';
    const item = document.createElement('div');
    item.className = 'appointment-history-item';
    item.innerHTML = `
      <div class="apt-date-block">
        <span class="adb-day">${new Date(bill.createdAt).toLocaleDateString('en-IN',{month:'short'})}</span>
        <span class="adb-num">${new Date(bill.createdAt).getDate()}</span>
      </div>
      <div class="apt-info">
        <h4>${bill.id} · ${bill.doctorName}</h4>
        <p>${clinic ? clinic.name : bill.clinicId} · ${bill.paymentMode || '—'}</p>
      </div>
      <div class="apt-actions">
        <span style="font-family:var(--font-heading); font-size:1.1rem; font-weight:700;">₹${bill.total}</span>
        <span class="status-badge ${isPaid ? 'paid' : 'pending'}">${bill.paymentStatus}</span>
        ${!isPaid ? `<button class="btn btn-secondary btn-sm" style="border-color:#6366f1; color:#a5b4fc;" onclick="openUpiPaymentForBill('${bill.id}')">💳 Pay Now</button>` : ''}
      </div>
    `;
    list.appendChild(item);
  });
}

async function renderPatientPrescriptions() {
  const list = document.getElementById('patient-rx-list');
  list.innerHTML = '<p style="color:var(--text-muted); padding:1rem;">Loading...</p>';

  const all = await DB.request('getPrescriptions', {
    clinicId: portalAccount.clinicId,
    patientId: portalAccount.linkedPatientId || ''
  });

  // Also search by phone in appointments to find linked patient IDs
  const apts = await DB.request('getAppointmentsByPhone', { phone: portalAccount.phone });
  const patientIds = [...new Set(apts.map(a => a.patientId).filter(Boolean))];

  const allRx = await DB.request('getPrescriptions', { clinicId: portalAccount.clinicId });
  const myRx = allRx.filter(rx => patientIds.includes(rx.patientId));

  if (!myRx.length) {
    list.innerHTML = emptyState('📋', 'No prescriptions yet', 'Your digital prescriptions will appear here after your doctor appointments.');
    return;
  }

  const sorted = [...myRx].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  list.innerHTML = '';
  sorted.forEach(rx => {
    const d = new Date(rx.createdAt);
    const card = document.createElement('div');
    card.className = 'prescription-record-card';
    card.innerHTML = `
      <div class="rx-header">
        <h4>Dr. ${rx.doctorName || '—'}</h4>
        <span class="rx-date-badge">${d.toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}</span>
      </div>
      ${rx.chiefComplaints ? `<div class="rx-field"><div class="rf-label">Chief Complaint</div><div class="rf-value">${rx.chiefComplaints}</div></div>` : ''}
      ${rx.findingsDiagnosis ? `<div class="rx-field"><div class="rf-label">Diagnosis</div><div class="rf-value">${rx.findingsDiagnosis}</div></div>` : ''}
      ${rx.prescriptionBody ? `<div class="rx-field"><div class="rf-label">Medicines Prescribed</div><div class="rx-medicines-box">${rx.prescriptionBody}</div></div>` : ''}
      <div style="margin-top:1rem; display:flex; gap:0.75rem; flex-wrap:wrap;">
        <a class="btn-whatsapp" style="font-size:0.8rem; padding:0.4rem 1rem;"
          href="${buildRxWhatsAppLink(rx)}" target="_blank">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
          Share via WhatsApp
        </a>
      </div>
    `;
    list.appendChild(card);
  });
}

function buildRxWhatsAppLink(rx) {
  const text = encodeURIComponent(
    `*MediFlow – My Prescription*\n\n` +
    `*Doctor:* ${rx.doctorName || '—'}\n` +
    `*Date:* ${new Date(rx.createdAt).toLocaleDateString('en-IN')}\n` +
    `*Complaint:* ${rx.chiefComplaints || '—'}\n` +
    `*Diagnosis:* ${rx.findingsDiagnosis || '—'}\n\n` +
    `*Medicines:*\n${rx.prescriptionBody || '—'}`
  );
  return `https://wa.me/?text=${text}`;
}

// --- Profile Edit ---
function openPatientProfileModal() {
  if (!portalAccount) return;
  document.getElementById('edit-profile-name').value    = portalAccount.name || '';
  document.getElementById('edit-profile-age').value     = portalAccount.age  || '';
  document.getElementById('edit-profile-gender').value  = portalAccount.gender || 'Male';
  document.getElementById('edit-profile-address').value = portalAccount.address || '';
  openModal('modal-patient-profile');
}

async function savePatientProfile() {
  portalAccount.name    = document.getElementById('edit-profile-name').value.trim()    || portalAccount.name;
  portalAccount.age     = document.getElementById('edit-profile-age').value            || portalAccount.age;
  portalAccount.gender  = document.getElementById('edit-profile-gender').value         || portalAccount.gender;
  portalAccount.address = document.getElementById('edit-profile-address').value.trim() || portalAccount.address;

  await DB.request('savePatientAccount', portalAccount);
  sessionStorage.setItem('mediflow_patient_session', JSON.stringify(portalAccount));
  closeModal('modal-patient-profile');
  showPortalToast('Profile updated!', 'success');
  portalShowDashboard();
}

// =============================================================
// BOOKING WIZARD
// =============================================================

async function portalStartBooking() {
  if (!portalAccount) { portalShowAuth('signup'); return; }
  if (!portalAccount.clinicId) { showClinicSelector(false); return; }

  // Load clinic
  if (!portalClinic) {
    const clinics = await DB.request('getClinics');
    portalClinic = clinics.find(c => c.id === portalAccount.clinicId);
  }

  // Reset state
  bookingState = {
    step: 1,
    name: portalAccount.name, age: portalAccount.age || '',
    gender: portalAccount.gender || '', phone: portalAccount.phone,
    address: portalAccount.address || '', reason: '',
    speciality: '', doctorUsername: '', doctorName: '',
    date: '', time: '', currentDate: null
  };

  showPortalView('view-patient-booking');
  renderBookingStep(1);
}

function renderBookingStep(step) {
  for (let i = 1; i <= 5; i++) {
    document.getElementById(`booking-panel-${i}`).classList.toggle('hidden', i !== step);
    const stepEl = document.getElementById(`bstep-${i}`);
    stepEl.classList.remove('active', 'completed');
    if (i === step) stepEl.classList.add('active');
    if (i < step)  stepEl.classList.add('completed');
    // Update step-dot checkmark for completed
    stepEl.querySelector('.step-dot').textContent = i < step ? '✓' : i;
  }

  if (step === 1) prefillBookingStep1();
  if (step === 2) renderSpecialityGrid();
  if (step === 3) renderDoctorCards();
  if (step === 4) renderSlotPicker();
  if (step === 5) renderBookingSummary();
}

async function bookingNext(fromStep) {
  if (fromStep === 1) {
    const name   = document.getElementById('bk-name').value.trim();
    const age    = document.getElementById('bk-age').value.trim();
    const gender = document.getElementById('bk-gender').value;
    const phone  = document.getElementById('bk-phone').value.trim();
    if (!name || !age || !gender || !phone) {
      showPortalToast('Please fill all required fields.', 'error'); return;
    }
    bookingState.name = name; bookingState.age = age;
    bookingState.gender = gender; bookingState.phone = phone;
    bookingState.address = document.getElementById('bk-address').value.trim();
    bookingState.reason  = document.getElementById('bk-reason').value.trim();
  }
  if (fromStep === 2 && !bookingState.speciality) {
    showPortalToast('Please choose a speciality.', 'error'); return;
  }
  if (fromStep === 3 && !bookingState.doctorUsername) {
    showPortalToast('Please select a doctor.', 'error'); return;
  }
  if (fromStep === 4) {
    if (!bookingState.date || !bookingState.time) {
      showPortalToast('Please select a date and time slot.', 'error'); return;
    }
  }
  bookingState.step = fromStep + 1;
  renderBookingStep(bookingState.step);
}

function bookingBack(fromStep) {
  bookingState.step = fromStep - 1;
  renderBookingStep(bookingState.step);
}

function prefillBookingStep1() {
  document.getElementById('bk-name').value   = bookingState.name   || '';
  document.getElementById('bk-age').value    = bookingState.age    || '';
  document.getElementById('bk-gender').value = bookingState.gender || '';
  document.getElementById('bk-phone').value  = bookingState.phone  || '';
  document.getElementById('bk-address').value= bookingState.address|| '';
  document.getElementById('bk-reason').value = bookingState.reason || '';
}

async function renderSpecialityGrid() {
  const grid = document.getElementById('speciality-grid');
  grid.innerHTML = '';

  // Load custom specialties and icons
  if (portalAccount && portalAccount.clinicId) {
    const specs = await DB.request('getSpecialities', { clinicId: portalAccount.clinicId });
    specs.forEach(s => {
      SPECIALITY_ICONS[s.name] = s.icon;
    });
  }

  const users = await DB.request('getUsers');
  const doctors = users.filter(u => u.role === 'doctor' && u.clinicId === portalAccount.clinicId);
  const specialities = [...new Set(doctors.map(d => d.speciality).filter(Boolean))];

  if (!specialities.length) {
    let debugInfo = '';
    if (!portalAccount) {
      debugInfo = ' (Error: No logged-in account found)';
    } else if (!portalAccount.clinicId) {
      debugInfo = ' (Error: No clinic selected for this account)';
    } else if (!users || users.length === 0) {
      debugInfo = ' (Error: Database users list is empty)';
    } else {
      const activeClinicDoctors = users.filter(u => u.role === 'doctor' && u.clinicId === portalAccount.clinicId);
      if (activeClinicDoctors.length === 0) {
        debugInfo = ` (Error: No doctors found in database for clinic "${portalAccount.clinicId}")`;
      } else {
        debugInfo = ` (Error: Doctors found in clinic "${portalAccount.clinicId}", but none have specialities set)`;
      }
    }
    grid.innerHTML = `<p style="color:var(--text-muted);">No specialities configured for this clinic yet. Ask the clinic admin to set doctor specialities.${debugInfo}</p>`;
    return;
  }

  specialities.forEach(sp => {
    const card = document.createElement('div');
    card.className = 'speciality-card' + (bookingState.speciality === sp ? ' selected' : '');
    card.onclick = () => {
      bookingState.speciality = sp;
      bookingState.doctorUsername = '';
      bookingState.doctorName = '';
      document.querySelectorAll('.speciality-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      setTimeout(() => {
        bookingNext(2);
      }, 300);
    };
    card.innerHTML = `
      <div class="sp-icon">${SPECIALITY_ICONS[sp] || '🏥'}</div>
      <div class="sp-name">${sp}</div>
    `;
    grid.appendChild(card);
  });
}

async function renderDoctorCards() {
  const list = document.getElementById('doctor-cards-list');
  list.innerHTML = '<p style="color:var(--text-muted);">Loading doctors...</p>';

  const users = await DB.request('getUsers');
  const doctors = users.filter(u =>
    u.role === 'doctor' &&
    u.clinicId === portalAccount.clinicId &&
    u.speciality === bookingState.speciality
  );

  if (!doctors.length) {
    list.innerHTML = '<p style="color:var(--text-muted);">No doctors found for this speciality.</p>';
    return;
  }

  list.innerHTML = '';
  doctors.forEach(doc => {
    const card = document.createElement('div');
    card.className = 'doctor-select-card' + (bookingState.doctorUsername === doc.username ? ' selected' : '');
    card.onclick = () => {
      bookingState.doctorUsername = doc.username;
      bookingState.doctorName = doc.name;
      document.querySelectorAll('.doctor-select-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      setTimeout(() => {
        bookingNext(3);
      }, 300);
    };
    card.innerHTML = `
      <div class="doctor-avatar">👨‍⚕️</div>
      <div class="doc-info">
        <h4>${doc.name}</h4>
        <p>${doc.qualification || ''} · ${doc.designation || ''}</p>
      </div>
      <div class="doc-next-slot">Available →</div>
    `;
    list.appendChild(card);
  });
}

async function renderSlotPicker() {
  const strip = document.getElementById('slot-date-strip');
  const container = document.getElementById('slot-sessions-container');
  strip.innerHTML = '';
  container.innerHTML = '';

  // Build 7-day date strip
  const today = new Date();
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    dates.push(d);
  }

  if (!bookingState.currentDate) {
    bookingState.currentDate = dates[0];
    bookingState.date = formatDate(dates[0]);
  }

  const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  dates.forEach(d => {
    const btn = document.createElement('div');
    btn.className = 'slot-date-btn' + (formatDate(d) === bookingState.date ? ' active' : '');
    btn.innerHTML = `<span class="date-day">${dayNames[d.getDay()]}</span><span class="date-num">${d.getDate()}</span>`;
    btn.onclick = () => {
      bookingState.currentDate = d;
      bookingState.date = formatDate(d);
      bookingState.time = '';
      document.querySelectorAll('.slot-date-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderSessionSlots();
    };
    strip.appendChild(btn);
  });

  await renderSessionSlots();
}

async function renderSessionSlots() {
  const container = document.getElementById('slot-sessions-container');
  container.innerHTML = '';

  const slotConfig = await DB.request('getDoctorSlotConfig', {
    doctorUsername: bookingState.doctorUsername,
    clinicId: portalAccount.clinicId
  });

  if (!slotConfig || !slotConfig.sessions || !slotConfig.sessions.length) {
    container.innerHTML = '<p style="color:var(--text-muted); padding:0.5rem 0;">No slots configured for this doctor. Please contact the clinic.</p>';
    return;
  }

  // Check workday
  const d = bookingState.currentDate || new Date();
  const dayShort = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()];
  if (!slotConfig.workDays.includes(dayShort)) {
    container.innerHTML = `<p style="color:var(--text-muted); padding:0.5rem 0;">Doctor is not available on ${dayShort}s.</p>`;
    return;
  }

  // Get existing booked slots for this doctor on this date
  const allApts = await DB.request('getAppointments', { clinicId: portalAccount.clinicId });
  const bookedSlots = allApts
    .filter(a => a.doctorUsername === bookingState.doctorUsername && a.date === bookingState.date && a.status !== 'Cancelled')
    .map(a => a.time);

  slotConfig.sessions.forEach(session => {
    const labelEl = document.createElement('div');
    labelEl.className = 'slot-session-label';
    labelEl.textContent = session.label;
    container.appendChild(labelEl);

    const slotsDiv = document.createElement('div');
    slotsDiv.className = 'slots-grid';

    const slots = generateTimeSlots(session.start, session.end, slotConfig.slotDuration || 30);
    slots.forEach(slot => {
      const isBooked   = bookedSlots.includes(slot);
      const isSelected = bookingState.time === slot;
      const btn = document.createElement('button');
      btn.className = `slot-btn ${isBooked ? 'booked' : isSelected ? 'selected' : 'free'}`;
      btn.textContent = slot;
      btn.disabled = isBooked;
      btn.onclick = () => {
        if (isBooked) {
          showPortalToast('⛔ This slot is already booked. Please choose another time.', 'warning');
          return;
        }
        bookingState.time = slot;
        document.querySelectorAll('.slot-btn').forEach(b => {
          b.className = `slot-btn ${bookedSlots.includes(b.textContent) ? 'booked' : 'free'}`;
        });
        btn.className = 'slot-btn selected';
        setTimeout(() => {
          bookingNext(4);
        }, 300);
      };
      slotsDiv.appendChild(btn);
    });

    container.appendChild(slotsDiv);
  });
}

function generateTimeSlots(start, end, durationMins) {
  const slots = [];
  let [h, m] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  while (h * 60 + m < eh * 60 + em) {
    const period = h < 12 ? 'AM' : 'PM';
    const hh = h % 12 === 0 ? 12 : h % 12;
    const mm = m.toString().padStart(2, '0');
    slots.push(`${hh}:${mm} ${period}`);
    m += durationMins;
    if (m >= 60) { h += Math.floor(m / 60); m = m % 60; }
  }
  return slots;
}

function renderBookingSummary() {
  const grid = document.getElementById('booking-summary-grid');
  grid.innerHTML = `
    <div class="summary-item"><span class="s-label">Patient Name</span><span class="s-value">${bookingState.name}</span></div>
    <div class="summary-item"><span class="s-label">Age / Gender</span><span class="s-value">${bookingState.age} yrs / ${bookingState.gender}</span></div>
    <div class="summary-item"><span class="s-label">Mobile</span><span class="s-value">${bookingState.phone}</span></div>
    <div class="summary-item"><span class="s-label">Clinic</span><span class="s-value">${portalClinic ? portalClinic.name : '—'}</span></div>
    <div class="summary-item"><span class="s-label">Speciality</span><span class="s-value">${bookingState.speciality}</span></div>
    <div class="summary-item"><span class="s-label">Doctor</span><span class="s-value">${bookingState.doctorName}</span></div>
    <div class="summary-item"><span class="s-label">Date</span><span class="s-value">${bookingState.date}</span></div>
    <div class="summary-item"><span class="s-label">Time</span><span class="s-value">${bookingState.time}</span></div>
    ${bookingState.reason ? `<div class="summary-item" style="grid-column:span 2;"><span class="s-label">Reason for Visit</span><span class="s-value">${bookingState.reason}</span></div>` : ''}
  `;
  document.getElementById('booking-review-content').classList.remove('hidden');
  document.getElementById('booking-confirmed-panel').classList.add('hidden');
  document.getElementById('booking-submit-panel').classList.remove('hidden');
}

async function submitBooking() {
  const btn = document.getElementById('confirm-booking-btn');
  btn.disabled = true;
  btn.textContent = 'Submitting...';

  // Double-check slot availability
  const allApts = await DB.request('getAppointments', { clinicId: portalAccount.clinicId });
  const conflict = allApts.find(a =>
    a.doctorUsername === bookingState.doctorUsername &&
    a.date === bookingState.date &&
    a.time === bookingState.time &&
    a.status !== 'Cancelled'
  );

  if (conflict) {
    showPortalToast('⛔ This slot was just booked by someone else! Please pick another time.', 'error');
    btn.disabled = false; btn.textContent = '✅ Confirm Booking';
    bookingBack(5);
    return;
  }

  // Ensure patient profile is registered in the clinic's demographics database
  try {
    const patients = await DB.request('getPatients', { clinicId: portalAccount.clinicId });
    const patientExists = patients.some(p => p.id === portalAccount.id || p.mobile === bookingState.phone);
    if (!patientExists) {
      const newPatient = {
        id: portalAccount.id,
        clinicId: portalAccount.clinicId,
        name: bookingState.name,
        age: parseInt(bookingState.age) || 0,
        gender: bookingState.gender,
        mobile: bookingState.phone,
        address: bookingState.address || '',
        registeredAt: new Date().toISOString().split('T')[0]
      };
      await DB.request('savePatient', newPatient);
    }
  } catch (err) {
    console.error('Error saving patient to demographics:', err);
  }

  const aptId = `APT-${Date.now()}`;
  const appointment = {
    id: aptId,
    clinicId: portalAccount.clinicId,
    patientId: portalAccount.id,
    patientName: bookingState.name,
    patientPhone: bookingState.phone,
    patientAge: bookingState.age,
    patientGender: bookingState.gender,
    patientAddress: bookingState.address,
    reason: bookingState.reason,
    doctorUsername: bookingState.doctorUsername,
    doctorName: bookingState.doctorName,
    speciality: bookingState.speciality,
    date: bookingState.date,
    time: bookingState.time,
    type: 'Consultation',
    status: 'Pending Confirmation',
    paymentStatus: 'Pending',
    createdBy: 'patient-portal',
    createdAt: new Date().toISOString()
  };

  await DB.request('saveAppointment', appointment);

  // Update patient profile with details
  portalAccount.age     = bookingState.age;
  portalAccount.gender  = bookingState.gender;
  portalAccount.address = bookingState.address;
  await DB.request('savePatientAccount', portalAccount);
  sessionStorage.setItem('mediflow_patient_session', JSON.stringify(portalAccount));

  document.getElementById('booking-review-content').classList.add('hidden');
  document.getElementById('booking-submit-panel').classList.add('hidden');
  document.getElementById('booking-confirmed-panel').classList.remove('hidden');
  showPortalToast('Booking submitted!', 'success');

  // Refresh cadmin appointment panels if they're visible
  if (typeof renderCadminAppointments === 'function') {
    try { renderCadminAppointments(); } catch(e) {}
  }
}

// =============================================================
// TICKET & PAYMENT
// =============================================================

async function showAppointmentTicket(aptId) {
  let allApts = [];
  if (portalAccount) {
    allApts = await DB.request('getAppointmentsByPhone', { phone: portalAccount.phone });
  } else if (currentUser && currentUser.clinicId) {
    allApts = await DB.request('getAppointments', { clinicId: currentUser.clinicId });
  } else {
    allApts = JSON.parse(localStorage.getItem('mediflow_appointments') || '[]');
  }
  const apt = allApts.find(a => a.id === aptId);
  if (!apt) return;

  const clinics = await DB.request('getClinics');
  const clinic = clinics.find(c => c.id === apt.clinicId);

  document.getElementById('ticket-apt-id').textContent      = apt.id;
  document.getElementById('ticket-patient-name').textContent= apt.patientName;
  document.getElementById('ticket-datetime').textContent    = `${apt.date} · ${apt.time}`;
  document.getElementById('ticket-doctor').textContent      = apt.doctorName;
  document.getElementById('ticket-speciality').textContent  = apt.speciality || '—';
  document.getElementById('ticket-clinic').textContent      = clinic ? `${clinic.name}, ${clinic.city}` : apt.clinicId;
  document.getElementById('ticket-payment').textContent     = apt.paymentMode || (apt.paymentStatus === 'Pending' ? 'Pending' : 'Paid');

  // Build WhatsApp deep link
  const waText = encodeURIComponent(
    `🏥 *MediFlow Appointment Ticket*\n\n` +
    `*Booking ID:* ${apt.id}\n` +
    `*Patient:* ${apt.patientName}\n` +
    `*Doctor:* ${apt.doctorName} (${apt.speciality || 'Consultation'})\n` +
    `*Clinic:* ${clinic ? clinic.name + ', ' + clinic.city : apt.clinicId}\n` +
    `*Date & Time:* ${apt.date} at ${apt.time}\n` +
    `*Status:* ✅ Confirmed\n\n` +
    `Please arrive 10 minutes early. Thank you!`
  );
  document.getElementById('ticket-whatsapp-btn').href = `https://wa.me/?text=${waText}`;

  openModal('modal-apt-ticket');
}

async function openUpiPayment(aptId) {
  let allApts = [];
  if (portalAccount) {
    allApts = await DB.request('getAppointmentsByPhone', { phone: portalAccount.phone });
  } else if (currentUser && currentUser.clinicId) {
    allApts = await DB.request('getAppointments', { clinicId: currentUser.clinicId });
  } else {
    allApts = JSON.parse(localStorage.getItem('mediflow_appointments') || '[]');
  }
  const apt = allApts.find(a => a.id === aptId);
  if (!apt) return;

  const clinics = await DB.request('getClinics');
  const clinic  = clinics.find(c => c.id === apt.clinicId);
  const amount  = clinic ? (clinic.consultationFee || 400) : 400;
  const upiId   = clinic ? (clinic.upiId || 'mediflow@upi') : 'mediflow@upi';

  currentUpiAppointmentId = aptId;
  await renderUpiQr(upiId, amount, apt.patientName, apt.id);
  openModal('modal-upi-payment');
}

async function openUpiPaymentForBill(billId) {
  let allBills = [];
  if (portalAccount) {
    allBills = await DB.request('getBillsByPhone', { phone: portalAccount.phone });
  } else if (currentUser && currentUser.clinicId) {
    allBills = await DB.request('getBills', { clinicId: currentUser.clinicId });
  } else {
    allBills = JSON.parse(localStorage.getItem('mediflow_bills') || '[]');
  }
  const bill = allBills.find(b => b.id === billId);
  if (!bill) return;

  const clinics = await DB.request('getClinics');
  const clinic  = clinics.find(c => c.id === bill.clinicId);
  const upiId   = clinic ? (clinic.upiId || 'mediflow@upi') : 'mediflow@upi';

  currentUpiAppointmentId = billId; // reuse for bill
  await renderUpiQr(upiId, bill.total, bill.patientName, bill.id);
  openModal('modal-upi-payment');
}

async function renderUpiQr(upiId, amount, patientName, refId) {
  document.getElementById('upi-payment-amount').textContent = `₹${amount}`;
  document.getElementById('upi-id-display').textContent = upiId;

  const upiUri = `upi://pay?pa=${upiId}&pn=MediFlow&am=${amount}&cu=INR&tn=${refId}`;
  const canvas = document.getElementById('upi-qr-canvas');

  if (typeof QRCode !== 'undefined' && QRCode.toCanvas) {
    try {
      await QRCode.toCanvas(canvas, upiUri, { width: 200, margin: 1, color: { dark: '#000000', light: '#ffffff' } });
    } catch(e) {
      canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
      console.warn('QR generation error:', e);
    }
  }
}

async function confirmUpiPayment() {
  if (!currentUpiAppointmentId) return;
  const txnRef = document.getElementById('upi-txn-ref').value.trim();

  // Try updating as appointment first, then bill
  let allApts = [];
  if (portalAccount) {
    allApts = await DB.request('getAppointmentsByPhone', { phone: portalAccount.phone });
  } else if (currentUser && currentUser.clinicId) {
    allApts = await DB.request('getAppointments', { clinicId: currentUser.clinicId });
  } else {
    allApts = JSON.parse(localStorage.getItem('mediflow_appointments') || '[]');
  }
  const apt = allApts.find(a => a.id === currentUpiAppointmentId);
  if (apt) {
    apt.paymentStatus = 'Paid';
    apt.paymentMode   = 'UPI';
    apt.upiTxnRef     = txnRef || '—';
    await DB.request('saveAppointment', apt);
  }

  let allBills = [];
  if (portalAccount) {
    allBills = await DB.request('getBillsByPhone', { phone: portalAccount.phone });
  } else if (currentUser && currentUser.clinicId) {
    allBills = await DB.request('getBills', { clinicId: currentUser.clinicId });
  } else {
    allBills = JSON.parse(localStorage.getItem('mediflow_bills') || '[]');
  }
  const bill = allBills.find(b => b.id === currentUpiAppointmentId);
  if (bill) {
    bill.paymentStatus = 'Paid';
    bill.paymentMode   = 'UPI';
    bill.amountPaid    = bill.total;
    await DB.request('saveBill', bill);
  }

  closeModal('modal-upi-payment');
  showPortalToast('✅ Payment recorded! Thank you.', 'success');
  currentUpiAppointmentId = null;
  document.getElementById('upi-txn-ref').value = '';

  // Refresh patient dashboard
  if (document.getElementById('pdash-tab-payments').classList.contains('active')) {
    renderPatientPayments();
  } else if (document.getElementById('pdash-tab-apts').classList.contains('active')) {
    renderPatientAppointments();
  }
}

// =============================================================
// STAFF / CADMIN — Confirm Pending Appointments
// =============================================================

// Patch into cadmin appointments render — add Confirm button for Pending Confirmation status
const _origRenderCadminAppointments = typeof renderCadminAppointments !== 'undefined' ? renderCadminAppointments : null;

window.confirmPatientAppointment = async function(aptId) {
  const clinicId = currentUser ? currentUser.clinicId : (portalAccount ? portalAccount.clinicId : null);
  if (!clinicId) return;
  const allApts = await DB.request('getAppointments', { clinicId });
  const apt = allApts.find(a => a.id === aptId);
  if (!apt) return;
  apt.status = 'Confirmed';
  await DB.request('saveAppointment', apt);
  showPortalToast('Appointment confirmed!', 'success');
  if (typeof renderCadminAppointments === 'function') renderCadminAppointments();
  if (typeof loadAppointments === 'function') loadAppointments();
};

// =============================================================
// UTILITIES
// =============================================================

function formatDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function showPortalToast(msg, type = 'success') {
  const toast = document.getElementById('portal-toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.className = `portal-toast ${type} show`;
  setTimeout(() => toast.classList.remove('show'), 3500);
}

function emptyState(icon, title, desc) {
  return `<div class="empty-state">
    <div class="es-icon">${icon}</div>
    <h4>${title}</h4>
    <p>${desc}</p>
  </div>`;
}

function openTutorialModal(role) {
  const modalTitle = document.getElementById('tutorial-modal-title');
  const modalBody = document.getElementById('tutorial-modal-body');
  if (!modalTitle || !modalBody) return;

  let title = 'Help & Tutorial Guide';
  let content = '';

  if (role === 'patient') {
    title = '❓ Patient Portal: How to Book Appointments';
    content = `
      <div class="tutorial-steps">
        <div class="tutorial-step">
          <h4>1. Personal & Intake Details</h4>
          <p>Confirm or enter your demographics (name, age, gender, phone) and outline the reason for your medical visit.</p>
        </div>
        <div class="tutorial-step">
          <h4>2. Pick Medical Specialty</h4>
          <p>Choose the relevant medical department (General Medicine, ENT, Dental, Dermatology, etc.) based on your symptoms.</p>
        </div>
        <div class="tutorial-step">
          <h4>3. Select Practitioner</h4>
          <p>Select your treating physician from the list of doctors registered at the clinic.</p>
        </div>
        <div class="tutorial-step">
          <h4>4. Reserve Time Slot</h4>
          <p>Choose your preferred appointment slot in the calendar. Free slots are highlighted in green, while booked slots are red.</p>
        </div>
        <div class="tutorial-step">
          <h4>5. Receive Whatsapp Ticket</h4>
          <p>Confirm the booking. Once checked by reception, complete payment and click "Share via WhatsApp" to get your digital ticket!</p>
        </div>
      </div>
    `;
  } else if (role === 'clinic_admin') {
    title = '🏥 Clinic Admin: Facility Configuration Guide';
    content = `
      <div class="tutorial-steps">
        <div class="tutorial-step">
          <h4>1. Manage Facility Users</h4>
          <p>Create, update, and manage accounts for clinic staff (nurses, receptionists) and doctors under the <strong>Users & Settings</strong> tab.</p>
        </div>
        <div class="tutorial-step">
          <h4>2. Netlify Blobs Logo Integration</h4>
          <p>Upload your official clinic letterhead logo. It is securely saved in Netlify Blobs and printed automatically on prescriptions.</p>
        </div>
        <div class="tutorial-step">
          <h4>3. Doctor Calendars & Shift Rosters</h4>
          <p>Define doctors' availability slots, working days, and coordinate the clinic's weekly duty shifts and emergency logs.</p>
        </div>
        <div class="tutorial-step">
          <h4>4. Revenue & Financial Reports</h4>
          <p>Review real-time financial metrics, check cash/UPI payment distributions, and monitor invoice dues and billing performance.</p>
        </div>
      </div>
    `;
  } else if (role === 'staff') {
    title = '📋 Clinic Staff: Reception & Billing Operations';
    content = `
      <div class="tutorial-steps">
        <div class="tutorial-step">
          <h4>1. Patient Intake Queue</h4>
          <p>Register new patients or search existing profiles in the reception desk queue to start their intake.</p>
        </div>
        <div class="tutorial-step">
          <h4>2. Record Nurse Vitals</h4>
          <p>Collect and save vital measurements (Height, Weight, BP, Pulse, SpO2) before assigning them to the doctor's consultation queue.</p>
        </div>
        <div class="tutorial-step">
          <h4>3. Schedule Appointments</h4>
          <p>Book walk-in appointments, verify patient-portal requests, and manage Checked In / Checked Out statuses.</p>
        </div>
        <div class="tutorial-step">
          <h4>4. Billing & Insurance Desk</h4>
          <p>Generate invoices, configure line items, record UPI/Cash collections, and file insurance co-pay claims.</p>
        </div>
      </div>
    `;
  } else if (role === 'doctor') {
    title = '🩺 Doctor Cockpit: Prescription & Queue Workflow';
    content = `
      <div class="tutorial-steps">
        <div class="tutorial-step">
          <h4>1. Patient Queue & Vitals Inspection</h4>
          <p>Select a patient from the registry to view their demographics and recorded intake vitals in real time.</p>
        </div>
        <div class="tutorial-step">
          <h4>2. Pre-configured Templates</h4>
          <p>Use the specialty dropdown and templates library to instantly pre-fill complaints, signs, and prescription plans.</p>
        </div>
        <div class="tutorial-step">
          <h4>3. Compose Prescription Proper</h4>
          <p>Draft diagnostic lab orders and advice instructions, and select/type medications in the Rx Canvas proper.</p>
        </div>
        <div class="tutorial-step">
          <h4>4. Plain Paper Print Presets</h4>
          <p>Toggle "Plain Paper" to automatically overlay the Netlify Blobs logo header, and click "Print" to print a clean A4 prescription.</p>
        </div>
      </div>
    `;
  }

  modalTitle.textContent = title;
  modalBody.innerHTML = content;
  openModal('modal-tutorial');
}

// Expose to global scope for HTML onclick handlers
window.portalGoLanding        = portalGoLanding;
window.portalShowAuth         = portalShowAuth;
window.portalShowDashboard    = portalShowDashboard;
window.portalStartBooking     = portalStartBooking;
window.portalLogout           = portalLogout;
window.switchAuthTab          = switchAuthTab;
window.handlePatientSignup    = handlePatientSignup;
window.handlePatientSignin    = handlePatientSignin;
window.showClinicSelector     = showClinicSelector;
window.onCitySelectorChange   = onCitySelectorChange;
window.selectClinicOption     = selectClinicOption;
window.confirmClinicSelection = confirmClinicSelection;
window.bookingNext            = bookingNext;
window.bookingBack            = bookingBack;
window.submitBooking          = submitBooking;
window.switchPatientDashTab   = switchPatientDashTab;
window.openPatientProfileModal= openPatientProfileModal;
window.savePatientProfile     = savePatientProfile;
window.showAppointmentTicket  = showAppointmentTicket;
window.openUpiPayment         = openUpiPayment;
window.openUpiPaymentForBill  = openUpiPaymentForBill;
window.confirmUpiPayment      = confirmUpiPayment;
window.showClinicLogin        = showClinicLogin;
window.confirmClinicAdminLogin = confirmClinicAdminLogin;
window.openTutorialModal      = openTutorialModal;

// --- PROFILE SETTINGS MODULE ---
function openProfileSettingsModal() {
  document.getElementById('profile-settings-form').reset();
  const errorDiv = document.getElementById('settings-error');
  if (errorDiv) errorDiv.classList.add('hidden');

  const idGroup = document.getElementById('settings-id-group');
  if (idGroup) {
    if (currentUser && currentUser.role === 'admin') {
      idGroup.classList.remove('hidden');
      document.getElementById('settings-username').value = currentUser.username;
      document.getElementById('settings-username').required = true;
    } else {
      idGroup.classList.add('hidden');
      document.getElementById('settings-username').required = false;
    }
  }

  openModal('modal-profile-settings');
}

async function handleProfileSettingsSubmit(e) {
  e.preventDefault();
  
  const currentPasswordInput = document.getElementById('settings-current-password').value;
  const newPasswordInput = document.getElementById('settings-new-password').value;
  const confirmPasswordInput = document.getElementById('settings-confirm-password').value;
  const errorDiv = document.getElementById('settings-error');
  
  if (newPasswordInput !== confirmPasswordInput) {
    errorDiv.textContent = "New passwords do not match!";
    errorDiv.classList.remove('hidden');
    return;
  }

  if (currentUser) {
    if (currentUser.password !== currentPasswordInput) {
      errorDiv.textContent = "Current password is incorrect!";
      errorDiv.classList.remove('hidden');
      return;
    }

    if (currentUser.role === 'admin') {
      const newUsername = document.getElementById('settings-username').value.trim();
      if (!newUsername) {
        errorDiv.textContent = "Username cannot be empty!";
        errorDiv.classList.remove('hidden');
        return;
      }
      
      const oldUsername = currentUser.username;
      const users = await DB.request('getUsers');
      
      if (newUsername.toLowerCase() !== oldUsername.toLowerCase()) {
        const usernameTaken = users.some(u => u.username.toLowerCase() === newUsername.toLowerCase());
        if (usernameTaken) {
          errorDiv.textContent = "That username/ID is already taken!";
          errorDiv.classList.remove('hidden');
          return;
        }
      }

      currentUser.username = newUsername;
      currentUser.password = newPasswordInput;

      if (newUsername !== oldUsername) {
        await DB.request('deleteUser', { username: oldUsername });
      }
      await DB.request('saveUser', currentUser);
      sessionStorage.setItem('mediflow_session', JSON.stringify(currentUser));
      
      // Update nav username
      document.getElementById('nav-user-name').textContent = `${currentUser.name} (Super Admin)`;
    } else {
      currentUser.password = newPasswordInput;
      await DB.request('saveUser', currentUser);
      sessionStorage.setItem('mediflow_session', JSON.stringify(currentUser));
    }

    closeModal('modal-profile-settings');
    alert("Settings updated successfully!");
  } else if (portalAccount) {
    if (portalAccount.password !== currentPasswordInput) {
      errorDiv.textContent = "Current password is incorrect!";
      errorDiv.classList.remove('hidden');
      return;
    }

    portalAccount.password = newPasswordInput;
    await DB.request('savePatientAccount', portalAccount);
    sessionStorage.setItem('mediflow_patient_session', JSON.stringify(portalAccount));

    closeModal('modal-profile-settings');
    showPortalToast("Password updated successfully!", "success");
  } else {
    closeModal('modal-profile-settings');
    alert("Error: No active session detected.");
  }
}

// =============================================================
// CLINIC PARTNER SHOWCASE MODAL & DEMO HANDLERS
// =============================================================
window.switchDemoSlide = function(slideIndex) {
  // Hide all slides
  document.getElementById('demo-slide-0').style.display = 'none';
  document.getElementById('demo-slide-1').style.display = 'none';
  document.getElementById('demo-slide-2').style.display = 'none';
  
  // Remove active-tab class from all buttons
  const buttons = document.querySelectorAll('.demo-nav-btn');
  buttons.forEach(btn => btn.classList.remove('active-tab'));
  buttons.forEach(btn => btn.style.color = 'var(--text-muted)');
  
  // Show target slide and set button active
  document.getElementById(`demo-slide-${slideIndex}`).style.display = 'block';
  if (buttons[slideIndex]) {
    buttons[slideIndex].classList.add('active-tab');
    buttons[slideIndex].style.color = 'var(--text-main)';
  }
  
  // If UPI QR slide, generate QR
  if (slideIndex === 2) {
    generateDemoUpiQR();
  }
};

window.updateDemoQueueStatus = function(select, badgeId) {
  const badge = document.getElementById(badgeId);
  if (!badge) return;
  const status = select.value;
  badge.textContent = status;
  
  if (status === 'Waiting') {
    badge.textContent = 'Waiting (25m)';
    badge.style.background = 'rgba(245,158,11,0.15)';
    badge.style.color = '#f59e0b';
  } else if (status === 'In Consultation') {
    badge.style.background = 'rgba(56,189,248,0.15)';
    badge.style.color = '#38bdf8';
  } else if (status === 'Completed') {
    badge.style.background = 'rgba(16,185,129,0.15)';
    badge.style.color = '#10b981';
  }
};

window.addDemoRx = function(medicationText) {
  const pad = document.getElementById('demo-prescription-textarea');
  if (!pad) return;
  const separator = pad.value.trim() === '' ? '' : '\n';
  pad.value = pad.value + separator + medicationText;
};

window.generateDemoUpiQR = async function() {
  const amountInput = document.getElementById('demo-billing-amount');
  const amount = parseFloat(amountInput.value || '0').toFixed(2);
  const upiId = 'mediflow@okhdfcbank';
  const displayVal = document.getElementById('demo-billing-text');
  if (displayVal) displayVal.textContent = `Amount: ₹${amount}`;

  const canvas = document.getElementById('demo-upi-qr-canvas');
  if (canvas && typeof QRCode !== 'undefined' && QRCode.toCanvas) {
    const upiUri = `upi://pay?pa=${upiId}&pn=MediFlowDemo&am=${amount}&cu=INR&tn=DEMO_${Date.now()}`;
    try {
      await QRCode.toCanvas(canvas, upiUri, { 
        width: 105, 
        margin: 1, 
        color: { dark: '#000000', light: '#ffffff' } 
      });
    } catch(e) {
      console.warn('Demo QR generation error:', e);
    }
  }
};

window.handleInquirySubmit = async function(e) {
  e.preventDefault();
  const clinicName = document.getElementById('inq-clinic-name').value.trim();
  const contactName = document.getElementById('inq-contact-name').value.trim();
  const email = document.getElementById('inq-email').value.trim();
  const phone = document.getElementById('inq-phone').value.trim();
  const city = document.getElementById('inq-city').value.trim();
  const message = document.getElementById('inq-message').value.trim();
  
  if (!clinicName || !contactName || !email || !phone || !city || !message) {
    alert("Please fill in all inquiry fields.");
    return;
  }
  
  const payload = {
    clinicName,
    contactName,
    email,
    phone,
    city,
    message,
    timestamp: new Date().toISOString()
  };
  
  await DB.request('saveInquiry', payload);
  
  // Reset form and close modal
  document.getElementById('inquiry-form').reset();
  closeModal('modal-learn-more');
  
  // Show custom toast if logged in or fallback alert
  if (typeof showPortalToast === 'function') {
    showPortalToast("Thank you! Your demo request has been sent to the Super Admin.", "success");
  } else {
    alert("Thank you! Your demo request has been submitted to the Super Admin. We will get in touch with you shortly.");
  }
};

// --- Inquiries Panel rendering in Super Admin ---
window.renderSuperAdminInquiries = async function() {
  const inquiries = await DB.request('getInquiries') || [];
  const tbody = document.querySelector('#inquiries-table tbody');
  if (!tbody) return;
  tbody.innerHTML = '';
  
  if (inquiries.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted);">No prospective clinic inquiries received yet.</td></tr>`;
    return;
  }
  
  inquiries.forEach(inq => {
    const tr = document.createElement('tr');
    const dateStr = inq.timestamp ? new Date(inq.timestamp).toLocaleString() : '—';
    tr.innerHTML = `
      <td>${dateStr}</td>
      <td><strong>${escapeHTML(inq.clinicName || '')}</strong></td>
      <td>${escapeHTML(inq.contactName || '')}</td>
      <td>
        <div style="font-size:0.8rem; color:var(--text-main);">📧 ${escapeHTML(inq.email || '')}</div>
        <div style="font-size:0.8rem; color:var(--text-main); margin-top:0.25rem;">📞 ${escapeHTML(inq.phone || '')}</div>
      </td>
      <td>${escapeHTML(inq.city || '')}</td>
      <td style="max-width: 250px; white-space: normal; word-wrap: break-word; font-size:0.8rem;">${escapeHTML(inq.message || '')}</td>
      <td>
        <button class="btn btn-secondary btn-sm btn-danger" onclick="deleteInquiry('${inq.id}')">Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
};

window.deleteInquiry = async function(id) {
  if (confirm('Are you sure you want to permanently delete this inquiry from the registry?')) {
    await DB.request('deleteInquiry', { id });
    renderSuperAdminInquiries();
  }
};

// Expose new window methods
window.openProfileSettingsModal = openProfileSettingsModal;
window.handleProfileSettingsSubmit = handleProfileSettingsSubmit;


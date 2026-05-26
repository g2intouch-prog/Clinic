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

// Session Router
function restoreSession() {
  const cachedUser = sessionStorage.getItem('mediflow_session');
  if (cachedUser) {
    currentUser = JSON.parse(cachedUser);
    loginSuccess(currentUser);
  } else {
    showView('view-login');
  }
}

function showView(viewId) {
  // Hide all screens
  ['view-login', 'view-admin', 'view-clinic-admin', 'view-staff', 'view-doctor'].forEach(id => {
    document.getElementById(id).classList.add('hidden');
  });
  
  // Show target screen
  document.getElementById(viewId).classList.remove('fade-in');
  document.getElementById(viewId).classList.remove('hidden');
  void document.getElementById(viewId).offsetWidth; // trigger reflow
  document.getElementById(viewId).classList.add('fade-in');

  // Toggle main navigation visibility
  const mainNav = document.getElementById('main-nav');
  if (viewId === 'view-login') {
    mainNav.classList.add('hidden');
  } else {
    mainNav.classList.remove('hidden');
    // Set theme class on body
    document.body.className = '';
    if (currentUser) {
      if (currentUser.role === 'admin') document.body.className = 'role-admin';
      else if (currentUser.role === 'clinic_admin') document.body.className = 'role-cadmin';
      else if (currentUser.role === 'staff') document.body.className = 'role-staff';
      else if (currentUser.role === 'doctor') document.body.className = 'role-doctor';
    }
  }
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

    // Check if subscription active for Clinic Admin / Staff / Doctors
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

function loginSuccess(user) {
  // Update header labels
  document.getElementById('nav-user-name').textContent = user.name;
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
      <td>
        <span class="user-badge" style="background-color: ${clinic.subscription === 'Active' ? 'rgba(16,185,129,0.1)' : 'rgba(244,63,94,0.1)'}; color: ${clinic.subscription === 'Active' ? '#10b981' : '#f43f5e'}; border: 1px solid rgba(255,255,255,0.05);">
          ${clinic.subscription}
        </span>
      </td>
      <td>
        <button class="btn btn-secondary btn-sm" onclick="editClinic('${clinic.id}', '${clinic.name}', '${clinic.subscription}')">Edit</button>
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
        <td>${admin.name}</td>
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
}

window.editClinic = function(id, name, subscription) {
  document.getElementById('clinic-modal-title').textContent = 'Modify Clinic Profile';
  document.getElementById('clinic-form-id').value = id;
  document.getElementById('clinic-form-name').value = name;
  document.getElementById('clinic-form-subscription').value = subscription;
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

  await DB.request('saveClinic', { id, name, subscription, logoUrl: '' });
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
      <td>${user.name}</td>
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

window.editUser = async function(username, name, role, qual, desig) {
  document.getElementById('user-modal-title').textContent = 'Modify User Profile';
  document.getElementById('user-form-username').value = username;
  document.getElementById('user-form-username').setAttribute('disabled', 'true');
  document.getElementById('user-form-password').removeAttribute('required');
  document.getElementById('user-form-name').value = name;
  document.getElementById('user-form-role').value = role;
  
  document.getElementById('user-form-qual').value = qual;
  document.getElementById('user-form-desig').value = desig;
  
  // Prefill permissions if staff
  const users = await DB.request('getUsers');
  const user = users.find(u => u.username === username);
  const perms = (user && user.permissions) || [];
  document.getElementById('user-perm-reception').checked = perms.includes('reception');
  document.getElementById('user-perm-finance').checked = perms.includes('finance');

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

function openUserModal() {
  document.getElementById('user-modal-title').textContent = 'Add Clinic User Profile';
  document.getElementById('user-form-username').removeAttribute('disabled');
  document.getElementById('user-form-password').setAttribute('required', 'true');
  document.getElementById('user-form').reset();
  
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

  renderDoctorTemplates();
  renderDoctorDrugs();
  renderDoctorTests();
  renderDoctorAdvice();
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
      <span class="pill-delete" onclick="event.stopPropagation(); deleteDoctorItem('drug', '${d.id}')">&times;</span>
    `;
    pill.addEventListener('click', () => appendDrugToPrescription(d.name));
    listContainer.appendChild(pill);
  });
}

function appendDrugToPrescription(drugName) {
  const rxArea = document.getElementById('canvas-prescription');
  const separator = rxArea.value.trim() === '' ? '' : '\n';
  rxArea.value = rxArea.value + separator + `Tab. ${drugName} -- 1 tablet -- duration SOS`;
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
      <span class="pill-delete" onclick="event.stopPropagation(); deleteDoctorItem('test', '${t.id}')">&times;</span>
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
      <span class="pill-delete" onclick="event.stopPropagation(); deleteDoctorItem('advice', '${a.id}')">&times;</span>
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
      category: document.getElementById('doc-item-drug-category').value
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
    if (apt.status === 'Checked In') {
      badgeBg = 'rgba(56,189,248,0.1)';
      badgeColor = '#38bdf8';
    } else if (apt.status === 'Completed') {
      badgeBg = 'rgba(16,185,129,0.1)';
      badgeColor = '#10b981';
    } else if (apt.status === 'Cancelled') {
      badgeBg = 'rgba(244,63,94,0.1)';
      badgeColor = '#f43f5e';
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
          ${apt.status === 'Scheduled' ? `<button class="btn btn-secondary btn-sm" style="padding:0.2rem 0.4rem; font-size:0.75rem;" onclick="updateAptStatus('${apt.id}', 'Checked In')">📥 Check In</button>` : ''}
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
    if (apt.status === 'Checked In') {
      badgeBg = 'rgba(56,189,248,0.1)';
      badgeColor = '#38bdf8';
    } else if (apt.status === 'Completed') {
      badgeBg = 'rgba(16,185,129,0.1)';
      badgeColor = '#10b981';
    } else if (apt.status === 'Cancelled') {
      badgeBg = 'rgba(244,63,94,0.1)';
      badgeColor = '#f43f5e';
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




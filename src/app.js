// Loaded via global script tag

// Global Application State
let currentUser = null;
let activePatients = [];
let activeVitals = [];
let selectedPatient = null;
let selectedTests = []; // Array of test IDs
let selectedAdvice = []; // Array of advice IDs

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
    // Check if subscription active for Clinic Admin / Staff / Doctors
    if (user.clinicId) {
      const clinics = await DB.request('getClinics');
      const clinic = clinics.find(c => c.id === user.clinicId);
      if (!clinic || clinic.subscription !== 'Active') {
        alert('Access Denied: The clinic subscription is currently suspended or inactive. Please contact the Super Admin.');
        return;
      }
    }

    currentUser = user;
    sessionStorage.setItem('mediflow_session', JSON.stringify(currentUser));
    loginSuccess(currentUser);
  } else {
    alert('Access Failed: Invalid Username or Password.');
  }
}

function handleLogout() {
  currentUser = null;
  selectedPatient = null;
  selectedTests = [];
  selectedAdvice = [];
  sessionStorage.removeItem('mediflow_session');
  showView('view-login');
}

function loginSuccess(user) {
  // Update header labels
  document.getElementById('nav-user-name').textContent = user.name;
  document.getElementById('nav-user-role').textContent = user.role.replace('_', ' ');

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
      loadStaffDashboard();
      break;
    case 'doctor':
      showView('view-doctor');
      loadDoctorDashboard();
      break;
  }
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

  const tbody = document.querySelector('#clinics-table tbody');
  tbody.innerHTML = '';

  clinics.forEach(clinic => {
    const tr = document.createElement('tr');
    
    // Find manager for clinic
    const manager = cAdmins.find(u => u.clinicId === clinic.id);
    const managerText = manager ? `${manager.name} (${manager.username})` : '<em class="text-muted">None Set</em>';

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
  const users = await DB.request('getUsers');
  const clinics = await DB.request('getClinics');
  
  // Find current clinic
  const clinic = clinics.find(c => c.id === currentUser.clinicId);
  document.getElementById('clinic-admin-title').textContent = clinic ? clinic.name : 'Clinic Control Center';
  document.getElementById('clinic-admin-subtitle').textContent = `Manager: ${currentUser.name} (Clinic ID: ${currentUser.clinicId})`;

  // Filter users scoped strictly to this clinic
  const clinicUsers = users.filter(u => u.clinicId === currentUser.clinicId);
  
  const docsCount = clinicUsers.filter(u => u.role === 'doctor').length;
  const staffCount = clinicUsers.filter(u => u.role === 'staff').length;

  document.getElementById('cadmin-stat-doctors').textContent = docsCount;
  document.getElementById('cadmin-stat-staff').textContent = staffCount;

  // Build table
  const tbody = document.querySelector('#clinic-users-table tbody');
  tbody.innerHTML = '';

  clinicUsers.forEach(user => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${user.username}</strong></td>
      <td>${user.name}</td>
      <td>
        <span class="user-badge" style="background: ${user.role === 'doctor' ? 'rgba(56,189,248,0.1)' : 'rgba(129,140,248,0.1)'}; color: ${user.role === 'doctor' ? '#38bdf8' : '#818cf8'}; border: 1px solid rgba(255,255,255,0.05);">
          ${user.role.toUpperCase()}
        </span>
      </td>
      <td>
        <button class="btn btn-secondary btn-sm" onclick="editUser('${user.username}', '${user.name}', '${user.role}', '${user.qualification || ''}', '${user.designation || ''}')">Edit</button>
        <button class="btn btn-secondary btn-sm btn-danger" onclick="deleteUser('${user.username}')">Remove</button>
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

window.editUser = function(username, name, role, qual, desig) {
  document.getElementById('user-modal-title').textContent = 'Modify User Profile';
  // Disable username edit
  document.getElementById('user-form-username').value = username;
  document.getElementById('user-form-username').setAttribute('disabled', 'true');
  document.getElementById('user-form-password').removeAttribute('required');
  document.getElementById('user-form-name').value = name;
  document.getElementById('user-form-role').value = role;
  
  document.getElementById('user-form-qual').value = qual;
  document.getElementById('user-form-desig').value = desig;
  
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
  toggleDoctorCustomFields();
  openModal('modal-user');
}

function toggleDoctorCustomFields() {
  const role = document.getElementById('user-form-role').value;
  const customFields = document.getElementById('doctor-custom-fields');
  if (role === 'doctor') {
    customFields.classList.remove('hidden');
  } else {
    customFields.classList.add('hidden');
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

  const users = await DB.request('getUsers');
  const existingUser = users.find(u => u.username.toLowerCase() === username.toLowerCase());

  // If modifying and password blank, keep old password
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
    designation
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
async function loadStaffDashboard() {
  activePatients = await DB.request('getPatients', { clinicId: currentUser.clinicId });
  activeVitals = await DB.request('getVitals', { clinicId: currentUser.clinicId });

  const tbody = document.querySelector('#patients-table tbody');
  tbody.innerHTML = '';

  activePatients.forEach(patient => {
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

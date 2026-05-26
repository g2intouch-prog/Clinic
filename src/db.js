// No import needed: loaded via global script

const IS_MOCK_MODE_KEY = 'mediflow_use_mock';

// Seed localStorage if empty or outdated
function initializeLocalStorage() {
  const currentSeedVersion = localStorage.getItem('mediflow_seed_version');
  if (!localStorage.getItem('mediflow_seeded') || currentSeedVersion !== 'v2') {
    localStorage.setItem('mediflow_clinics', JSON.stringify(window.INITIAL_CLINICS));
    localStorage.setItem('mediflow_users', JSON.stringify(window.INITIAL_USERS));
    localStorage.setItem('mediflow_patients', JSON.stringify(window.INITIAL_PATIENTS));
    localStorage.setItem('mediflow_vitals', JSON.stringify(window.INITIAL_VITALS));
    localStorage.setItem('mediflow_templates', JSON.stringify(window.INITIAL_TEMPLATES));
    localStorage.setItem('mediflow_drugs', JSON.stringify(window.INITIAL_DRUGS));
    localStorage.setItem('mediflow_tests', JSON.stringify(window.INITIAL_TESTS));
    localStorage.setItem('mediflow_advice', JSON.stringify(window.INITIAL_ADVICE));
    localStorage.setItem('mediflow_appointments', JSON.stringify(window.INITIAL_APPOINTMENTS || []));
    localStorage.setItem('mediflow_bills', JSON.stringify(window.INITIAL_BILLS || []));
    localStorage.setItem('mediflow_insurance', JSON.stringify(window.INITIAL_INSURANCE || []));
    localStorage.setItem('mediflow_attendance', JSON.stringify(window.INITIAL_ATTENDANCE || []));
    
    // Seed clinic headers with empty defaults
    localStorage.setItem('mediflow_headers', JSON.stringify({}));
    
    localStorage.setItem('mediflow_seed_version', 'v2');
    localStorage.setItem('mediflow_seeded', 'true');
    console.log('LocalStorage initialized with version v2 Indian mock data.');
  }
}

initializeLocalStorage();

// Helper to check server-side availability
async function checkServerConnection() {
  try {
    const res = await fetch('/api/health');
    return res.ok;
  } catch (e) {
    return false;
  }
}

class DB {
  static async isCloudAvailable() {
    // Check if we are running in production Netlify and server responds
    const conn = await checkServerConnection();
    return conn;
  }

  // Generic fetch wrapper that falls back to LocalStorage
  static async request(action, payload = {}) {
    const isCloud = await this.isCloudAvailable();
    if (isCloud) {
      try {
        const response = await fetch('/api/db', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action, payload })
        });
        if (response.ok) {
          const result = await response.json();
          return result.data;
        }
      } catch (err) {
        console.warn('Netlify Database function error, falling back to LocalStorage:', err);
      }
    }
    return this.localExecute(action, payload);
  }

  // Local Storage Execution Engine (Mock Database)
  static localExecute(action, payload) {
    const getList = (key) => JSON.parse(localStorage.getItem(key) || '[]');
    const saveList = (key, data) => localStorage.setItem(key, JSON.stringify(data));

    switch (action) {
      // --- Clinic CRUD ---
      case 'getClinics':
        return getList('mediflow_clinics');

      case 'saveClinic': {
        const clinics = getList('mediflow_clinics');
        const index = clinics.findIndex(c => c.id === payload.id);
        if (index > -1) {
          clinics[index] = { ...clinics[index], ...payload };
        } else {
          clinics.push(payload);
        }
        saveList('mediflow_clinics', clinics);
        return payload;
      }

      case 'deleteClinic': {
        const clinics = getList('mediflow_clinics');
        const filtered = clinics.filter(c => c.id !== payload.id);
        saveList('mediflow_clinics', filtered);
        return { success: true };
      }

      // --- User CRUD ---
      case 'getUsers':
        return getList('mediflow_users');

      case 'saveUser': {
        const users = getList('mediflow_users');
        const index = users.findIndex(u => u.username === payload.username);
        if (index > -1) {
          users[index] = { ...users[index], ...payload };
        } else {
          users.push(payload);
        }
        saveList('mediflow_users', users);
        return payload;
      }

      case 'deleteUser': {
        const users = getList('mediflow_users');
        const filtered = users.filter(u => u.username !== payload.username);
        saveList('mediflow_users', filtered);
        return { success: true };
      }

      // --- Patient Demographics CRUD ---
      case 'getPatients': {
        const patients = getList('mediflow_patients');
        // Scoped by clinicId
        return patients.filter(p => p.clinicId === payload.clinicId);
      }

      case 'savePatient': {
        const patients = getList('mediflow_patients');
        const index = patients.findIndex(p => p.id === payload.id && p.clinicId === payload.clinicId);
        if (index > -1) {
          patients[index] = { ...patients[index], ...payload };
        } else {
          patients.push(payload);
        }
        saveList('mediflow_patients', patients);
        return payload;
      }

      // --- Nurse Vitals CRUD ---
      case 'getVitals': {
        const vitals = getList('mediflow_vitals');
        return vitals.filter(v => v.clinicId === payload.clinicId);
      }

      case 'saveVitals': {
        const vitals = getList('mediflow_vitals');
        const index = vitals.findIndex(v => v.patientId === payload.patientId && v.clinicId === payload.clinicId);
        if (index > -1) {
          vitals[index] = { ...vitals[index], ...payload };
        } else {
          vitals.push(payload);
        }
        saveList('mediflow_vitals', vitals);
        return payload;
      }

      // --- Prescription Templates (Isolated by doctorUsername) ---
      case 'getTemplates': {
        const templates = getList('mediflow_templates');
        return templates.filter(t => t.doctorUsername === payload.doctorUsername && t.clinicId === payload.clinicId);
      }

      case 'saveTemplate': {
        const templates = getList('mediflow_templates');
        const index = templates.findIndex(t => t.id === payload.id);
        if (index > -1) {
          templates[index] = { ...templates[index], ...payload };
        } else {
          templates.push(payload);
        }
        saveList('mediflow_templates', templates);
        return payload;
      }

      case 'deleteTemplate': {
        const templates = getList('mediflow_templates');
        const filtered = templates.filter(t => t.id !== payload.id);
        saveList('mediflow_templates', filtered);
        return { success: true };
      }

      // --- Categorized Drug List (Isolated by doctorUsername) ---
      case 'getDrugs': {
        const drugs = getList('mediflow_drugs');
        return drugs.filter(d => d.doctorUsername === payload.doctorUsername && d.clinicId === payload.clinicId);
      }

      case 'saveDrug': {
        const drugs = getList('mediflow_drugs');
        const index = drugs.findIndex(d => d.id === payload.id);
        if (index > -1) {
          drugs[index] = { ...drugs[index], ...payload };
        } else {
          drugs.push(payload);
        }
        saveList('mediflow_drugs', drugs);
        return payload;
      }

      case 'deleteDrug': {
        const drugs = getList('mediflow_drugs');
        const filtered = drugs.filter(d => d.id !== payload.id);
        saveList('mediflow_drugs', filtered);
        return { success: true };
      }

      // --- Lab Test Picker List (Isolated by doctorUsername) ---
      case 'getTests': {
        const tests = getList('mediflow_tests');
        return tests.filter(t => t.doctorUsername === payload.doctorUsername);
      }

      case 'saveTest': {
        const tests = getList('mediflow_tests');
        const index = tests.findIndex(t => t.id === payload.id);
        if (index > -1) {
          tests[index] = { ...tests[index], ...payload };
        } else {
          tests.push(payload);
        }
        saveList('mediflow_tests', tests);
        return payload;
      }

      case 'deleteTest': {
        const tests = getList('mediflow_tests');
        const filtered = tests.filter(t => t.id !== payload.id);
        saveList('mediflow_tests', filtered);
        return { success: true };
      }

      // --- Disease-Specific Special Advice (Isolated by doctorUsername) ---
      case 'getAdvice': {
        const advice = getList('mediflow_advice');
        return advice.filter(a => a.doctorUsername === payload.doctorUsername);
      }

      case 'saveAdvice': {
        const advice = getList('mediflow_advice');
        const index = advice.findIndex(a => a.id === payload.id);
        if (index > -1) {
          advice[index] = { ...advice[index], ...payload };
        } else {
          advice.push(payload);
        }
        saveList('mediflow_advice', advice);
        return payload;
      }

      case 'deleteAdvice': {
        const advice = getList('mediflow_advice');
        const filtered = advice.filter(a => a.id !== payload.id);
        saveList('mediflow_advice', filtered);
        return { success: true };
      }

      // --- Netlify Blobs Mock Interface (Store Header Images) ---
      case 'getClinicHeader': {
        const headers = JSON.parse(localStorage.getItem('mediflow_headers') || '{}');
        return headers[payload.clinicId] || '';
      }

      case 'saveClinicHeader': {
        const headers = JSON.parse(localStorage.getItem('mediflow_headers') || '{}');
        headers[payload.clinicId] = payload.dataUrl;
        localStorage.setItem('mediflow_headers', JSON.stringify(headers));
        return { success: true };
      }

      // --- Appointments ---
      case 'getAppointments': {
        const appointments = getList('mediflow_appointments');
        return appointments.filter(a => a.clinicId === payload.clinicId);
      }

      case 'saveAppointment': {
        const appointments = getList('mediflow_appointments');
        const index = appointments.findIndex(a => a.id === payload.id);
        if (index > -1) {
          appointments[index] = { ...appointments[index], ...payload };
        } else {
          appointments.push(payload);
        }
        saveList('mediflow_appointments', appointments);
        return payload;
      }

      case 'deleteAppointment': {
        const appointments = getList('mediflow_appointments');
        const filtered = appointments.filter(a => a.id !== payload.id);
        saveList('mediflow_appointments', filtered);
        return { success: true };
      }

      // --- Bills ---
      case 'getBills': {
        const bills = getList('mediflow_bills');
        return bills.filter(b => b.clinicId === payload.clinicId);
      }

      case 'saveBill': {
        const bills = getList('mediflow_bills');
        const index = bills.findIndex(b => b.id === payload.id);
        if (index > -1) {
          bills[index] = { ...bills[index], ...payload };
        } else {
          bills.push(payload);
        }
        saveList('mediflow_bills', bills);
        return payload;
      }

      // --- Insurance ---
      case 'getInsurance': {
        const insurance = getList('mediflow_insurance');
        return insurance.filter(i => i.clinicId === payload.clinicId);
      }

      case 'saveInsurance': {
        const insurance = getList('mediflow_insurance');
        const index = insurance.findIndex(i => i.id === payload.id);
        if (index > -1) {
          insurance[index] = { ...insurance[index], ...payload };
        } else {
          insurance.push(payload);
        }
        saveList('mediflow_insurance', insurance);
        return payload;
      }

      // --- Attendance ---
      case 'getAttendance': {
        const attendance = getList('mediflow_attendance');
        return attendance.filter(a => a.clinicId === payload.clinicId);
      }

      case 'saveAttendance': {
        const attendance = getList('mediflow_attendance');
        const index = attendance.findIndex(a => a.id === payload.id);
        if (index > -1) {
          attendance[index] = { ...attendance[index], ...payload };
        } else {
          attendance.push(payload);
        }
        saveList('mediflow_attendance', attendance);
        return payload;
      }

      default:
        throw new Error(`Unknown Local Database operation: ${action}`);
    }
  }

  // Cloud Assets Store Wrapper (using serverless Netlify Blobs functions)
  static async uploadClinicHeader(clinicId, file) {
    // Convert file to base64 first for simple, library-free serverless transmission
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    const isCloud = await this.isCloudAvailable();
    if (isCloud) {
      try {
        const response = await fetch('/api/blobs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clinicId, dataUrl })
        });
        if (response.ok) {
          const result = await response.json();
          return result.url; // Netlify Blobs storage endpoint URL
        }
      } catch (err) {
        console.warn('Netlify Blobs upload failed, falling back to LocalStorage:', err);
      }
    }
    
    // LocalStorage Fallback
    this.localExecute('saveClinicHeader', { clinicId, dataUrl });
    return dataUrl;
  }

  static async getClinicHeader(clinicId) {
    const isCloud = await this.isCloudAvailable();
    if (isCloud) {
      try {
        const response = await fetch(`/api/blobs?clinicId=${clinicId}`);
        if (response.ok) {
          const result = await response.json();
          return result.url;
        }
      } catch (err) {
        console.warn('Netlify Blobs fetch failed, falling back to LocalStorage:', err);
      }
    }
    return this.localExecute('getClinicHeader', { clinicId });
  }
}

// Expose DB class globally for other scripts
window.DB = DB;

// No import needed: loaded via global script

const IS_MOCK_MODE_KEY = 'mediflow_use_mock';

// Seed localStorage if empty or outdated
function initializeLocalStorage() {
  const currentSeedVersion = localStorage.getItem('mediflow_seed_version');
  const usersSeeded = localStorage.getItem('mediflow_users');
  const clinicsSeeded = localStorage.getItem('mediflow_clinics');
  
  const needsSeed = !localStorage.getItem('mediflow_seeded') || 
                    currentSeedVersion !== 'v6' || 
                    !usersSeeded || 
                    !clinicsSeeded || 
                    JSON.parse(usersSeeded || '[]').length === 0;

  if (needsSeed) {
    localStorage.setItem('mediflow_clinics', JSON.stringify(window.INITIAL_CLINICS || []));
    localStorage.setItem('mediflow_users', JSON.stringify(window.INITIAL_USERS || []));
    localStorage.setItem('mediflow_patients', JSON.stringify(window.INITIAL_PATIENTS || []));
    localStorage.setItem('mediflow_vitals', JSON.stringify(window.INITIAL_VITALS || []));
    localStorage.setItem('mediflow_templates', JSON.stringify(window.INITIAL_TEMPLATES || []));
    localStorage.setItem('mediflow_drugs', JSON.stringify(window.INITIAL_DRUGS || []));
    localStorage.setItem('mediflow_tests', JSON.stringify(window.INITIAL_TESTS || []));
    localStorage.setItem('mediflow_advice', JSON.stringify(window.INITIAL_ADVICE || []));
    localStorage.setItem('mediflow_appointments', JSON.stringify(window.INITIAL_APPOINTMENTS || []));
    localStorage.setItem('mediflow_bills', JSON.stringify(window.INITIAL_BILLS || []));
    localStorage.setItem('mediflow_insurance', JSON.stringify(window.INITIAL_INSURANCE || []));
    localStorage.setItem('mediflow_attendance', JSON.stringify(window.INITIAL_ATTENDANCE || []));
    localStorage.setItem('mediflow_doctor_slots', JSON.stringify(window.INITIAL_DOCTOR_SLOTS || []));
    localStorage.setItem('mediflow_patient_accounts', JSON.stringify(window.INITIAL_PATIENT_ACCOUNTS || []));
    localStorage.setItem('mediflow_prescriptions', JSON.stringify([]));
    
    // Seed default categories
    const defaultCategories = [
      { id: 'cat-1', clinicId: 'clinic-1', doctorUsername: 'doctor1', name: 'Antibiotics' },
      { id: 'cat-2', clinicId: 'clinic-1', doctorUsername: 'doctor1', name: 'NSAIDs/Analgesics' },
      { id: 'cat-3', clinicId: 'clinic-1', doctorUsername: 'doctor1', name: 'Antihistamines' },
      { id: 'cat-4', clinicId: 'clinic-1', doctorUsername: 'doctor1', name: 'Derma' },
      { id: 'cat-5', clinicId: 'clinic-1', doctorUsername: 'doctor1', name: 'General' },
      { id: 'cat-6', clinicId: 'clinic-1', doctorUsername: 'doctor2', name: 'Antibiotics' },
      { id: 'cat-7', clinicId: 'clinic-1', doctorUsername: 'doctor2', name: 'General' },
      { id: 'cat-8', clinicId: 'clinic-2', doctorUsername: 'doctor3', name: 'Dental' }
    ];
    localStorage.setItem('mediflow_drug_categories', JSON.stringify(defaultCategories));

    // Seed default specialities
    const defaultSpecialities = [
      { clinicId: 'clinic-1', name: 'General Medicine', icon: '🩺' },
      { clinicId: 'clinic-1', name: 'ENT', icon: '👂' },
      { clinicId: 'clinic-1', name: 'Dental', icon: '🦷' },
      { clinicId: 'clinic-1', name: 'Dermatology', icon: '🧴' },
      { clinicId: 'clinic-1', name: 'Ophthalmology', icon: '👁️' },
      { clinicId: 'clinic-1', name: 'Orthopaedics', icon: '🦴' },
      { clinicId: 'clinic-1', name: 'Gynaecology', icon: '👩‍⚕️' },
      { clinicId: 'clinic-1', name: 'Paediatrics', icon: '👶' },
      { clinicId: 'clinic-1', name: 'Cardiology', icon: '❤️' },
      { clinicId: 'clinic-1', name: 'Neurology', icon: '🧠' },
      { clinicId: 'clinic-2', name: 'Dental', icon: '🦷' }
    ];
    localStorage.setItem('mediflow_specialities', JSON.stringify(defaultSpecialities));
    
    // Seed clinic headers with empty defaults
    localStorage.setItem('mediflow_headers', JSON.stringify({}));
    
    localStorage.setItem('mediflow_seed_version', 'v6');
    localStorage.setItem('mediflow_seeded', 'true');
    console.log('LocalStorage initialized with version v6 Indian mock data.');
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
    if (this._cloudAvailable !== undefined) return this._cloudAvailable;

    const conn = await checkServerConnection();
    if (!conn) {
      this._cloudAvailable = false;
      return false;
    }

    try {
      const response = await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'check' })
      });
      if (response.ok) {
        const result = await response.json();
        this._cloudAvailable = !!result.cloudActive;
        return this._cloudAvailable;
      }
    } catch (e) {
      console.warn('Error checking cloud availability, falling back to local storage:', e);
    }

    this._cloudAvailable = false;
    return false;
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
          if (result && result.data !== undefined) {
            return result.data;
          }
        }
      } catch (err) {
        console.warn('Netlify Database function error, falling back to LocalStorage:', err);
      }
    }
    return this.localExecute(action, payload);
  }

  // Local Storage Execution Engine (Mock Database)
  static localExecute(action, payload) {
    const getList = (key) => {
      try {
        return JSON.parse(localStorage.getItem(key) || '[]');
      } catch (e) {
        console.error(`Error parsing localStorage key "${key}":`, e);
        return [];
      }
    };
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

      // --- Patient Portal Accounts ---
      case 'getPatientAccounts': {
        return getList('mediflow_patient_accounts');
      }

      case 'getPatientAccountByPhone': {
        const accounts = getList('mediflow_patient_accounts');
        return accounts.find(a => a.phone === payload.phone) || null;
      }

      case 'savePatientAccount': {
        const accounts = getList('mediflow_patient_accounts');
        const index = accounts.findIndex(a => a.id === payload.id);
        if (index > -1) {
          accounts[index] = { ...accounts[index], ...payload };
        } else {
          accounts.push(payload);
        }
        saveList('mediflow_patient_accounts', accounts);
        return payload;
      }

      // --- Doctor Slot Configurations (set by Clinic Admin) ---
      case 'getDoctorSlots': {
        const slots = getList('mediflow_doctor_slots');
        return slots.filter(s => s.clinicId === payload.clinicId);
      }

      case 'getDoctorSlotConfig': {
        const slots = getList('mediflow_doctor_slots');
        return slots.find(s => s.doctorUsername === payload.doctorUsername && s.clinicId === payload.clinicId) || null;
      }

      case 'saveDoctorSlotConfig': {
        const slots = getList('mediflow_doctor_slots');
        const index = slots.findIndex(s => s.doctorUsername === payload.doctorUsername && s.clinicId === payload.clinicId);
        if (index > -1) {
          slots[index] = { ...slots[index], ...payload };
        } else {
          slots.push(payload);
        }
        saveList('mediflow_doctor_slots', slots);
        return payload;
      }

      // --- Saved Prescriptions (doctor saves for patient record) ---
      case 'getPrescriptions': {
        const prescriptions = getList('mediflow_prescriptions');
        if (payload.clinicId && payload.patientId) {
          return prescriptions.filter(p => p.clinicId === payload.clinicId && p.patientId === payload.patientId);
        }
        if (payload.clinicId) {
          return prescriptions.filter(p => p.clinicId === payload.clinicId);
        }
        return prescriptions;
      }

      case 'savePrescription': {
        const prescriptions = getList('mediflow_prescriptions');
        const index = prescriptions.findIndex(p => p.id === payload.id);
        if (index > -1) {
          prescriptions[index] = { ...prescriptions[index], ...payload };
        } else {
          prescriptions.push(payload);
        }
        saveList('mediflow_prescriptions', prescriptions);
        return payload;
      }

      // --- Patient appointments (cross-clinic by phone) ---
      case 'getAppointmentsByPhone': {
        const appointments = getList('mediflow_appointments');
        return appointments.filter(a => a.patientPhone === payload.phone);
      }

      // --- Patient bills (cross-clinic by phone) ---
      case 'getBillsByPhone': {
        const bills = getList('mediflow_bills');
        return bills.filter(b => b.patientPhone === payload.phone);
      }

      // --- Drug Categories ---
      case 'getDrugCategories': {
        const categories = getList('mediflow_drug_categories');
        return categories.filter(c => c.doctorUsername === payload.doctorUsername && c.clinicId === payload.clinicId);
      }

      case 'saveDrugCategory': {
        const categories = getList('mediflow_drug_categories');
        const index = categories.findIndex(c => c.id === payload.id);
        if (index > -1) {
          categories[index] = { ...categories[index], ...payload };
        } else {
          categories.push(payload);
        }
        saveList('mediflow_drug_categories', categories);
        return payload;
      }

      case 'deleteDrugCategory': {
        const categories = getList('mediflow_drug_categories');
        const filtered = categories.filter(c => c.id !== payload.id);
        saveList('mediflow_drug_categories', filtered);
        return { success: true };
      }

      // --- Specialities ---
      case 'getSpecialities': {
        const specs = getList('mediflow_specialities');
        return specs.filter(s => s.clinicId === payload.clinicId);
      }

      case 'saveSpeciality': {
        const specs = getList('mediflow_specialities');
        const { clinicId, name, icon, oldName } = payload;
        
        if (oldName) {
          const index = specs.findIndex(s => s.clinicId === clinicId && s.name.toLowerCase() === oldName.toLowerCase());
          if (index > -1) {
            specs[index] = { clinicId, name, icon };
          } else {
            specs.push({ clinicId, name, icon });
          }
          
          // Cascading update: update all doctors of this clinic who had oldName to name
          if (oldName.toLowerCase() !== name.toLowerCase()) {
            const users = getList('mediflow_users');
            let updated = false;
            users.forEach(u => {
              if (u.clinicId === clinicId && u.role === 'doctor' && u.speciality === oldName) {
                u.speciality = name;
                updated = true;
              }
            });
            if (updated) {
              saveList('mediflow_users', users);
            }
          }
        } else {
          const index = specs.findIndex(s => s.clinicId === clinicId && s.name.toLowerCase() === name.toLowerCase());
          if (index > -1) {
            specs[index] = { clinicId, name, icon };
          } else {
            specs.push({ clinicId, name, icon });
          }
        }
        saveList('mediflow_specialities', specs);
        return payload;
      }

      case 'deleteSpeciality': {
        const specs = getList('mediflow_specialities');
        const { clinicId, name } = payload;
        const filtered = specs.filter(s => !(s.clinicId === clinicId && s.name.toLowerCase() === name.toLowerCase()));
        saveList('mediflow_specialities', filtered);
        
        // Cascading deletion: set matching doctor specialties in this clinic to empty string
        const users = getList('mediflow_users');
        let updated = false;
        users.forEach(u => {
          if (u.clinicId === clinicId && u.role === 'doctor' && u.speciality === name) {
            u.speciality = '';
            updated = true;
          }
        });
        if (updated) {
          saveList('mediflow_users', users);
        }
        return { success: true };
      }

      // --- Inquiries (Prospective Clinic Inquiries) ---
      case 'getInquiries':
        return getList('mediflow_inquiries');

      case 'saveInquiry': {
        const inquiries = getList('mediflow_inquiries');
        if (!payload.id) {
          payload.id = 'inq-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        }
        if (!payload.timestamp) {
          payload.timestamp = new Date().toISOString();
        }
        inquiries.push(payload);
        saveList('mediflow_inquiries', inquiries);
        return payload;
      }

      case 'deleteInquiry': {
        const inquiries = getList('mediflow_inquiries');
        const filtered = inquiries.filter(i => i.id !== payload.id);
        saveList('mediflow_inquiries', filtered);
        return { success: true };
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
